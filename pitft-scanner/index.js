#!/usr/bin/env node

import axios from "axios";
import dotenv from "dotenv";
import { spawn } from "child_process";
import readline from "readline";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { existsSync } from "fs";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const API_URL = process.env.API_URL || "http://localhost:3001";

// State management
let scannedItem = null;
let scannedBin = null;
let processing = false;

// Display message on Mini PiTFT using Python script
async function displayMessage(text) {
  const displayScript = join(__dirname, "display.py");

  return new Promise((resolve) => {
    // Always log to console for debugging
    console.log(`[DISPLAY] ${text}`);
    
    if (existsSync(displayScript)) {
      // Pass text as argument (will be escaped by spawn)
      const python = spawn("python3", [displayScript, text]);
      let errorOutput = "";
      let stdoutOutput = "";

      python.stdout.on("data", (data) => {
        stdoutOutput += data.toString();
      });

      python.stderr.on("data", (data) => {
        errorOutput += data.toString();
      });

      python.on("close", (code) => {
        if (code !== 0) {
          console.error(`Display script exited with code ${code}`);
          if (errorOutput) {
            console.error("Display stderr:", errorOutput);
          }
          if (stdoutOutput) {
            console.log("Display stdout:", stdoutOutput);
          }
        }
        resolve();
      });
      
      python.on("error", (error) => {
        console.error("Failed to start display script:", error);
        resolve();
      });
    } else {
      console.warn(`Display script not found at ${displayScript}`);
      resolve();
    }
  });
}

// Parse QR code to determine type
function parseQRCode(qrCode) {
  try {
    const parsed = JSON.parse(qrCode);
    if (parsed.type === "bin" && parsed.id && parsed.operation) {
      return {
        type: "bin",
        id: parsed.id,
        operation: parsed.operation,
        raw: qrCode,
      };
    }
  } catch (e) {
    // Not JSON, might be an item QR code
  }

  // Assume it's an item QR code
  return {
    type: "item",
    qrCode: qrCode,
    raw: qrCode,
  };
}

// Process transaction
async function processTransaction() {
  if (processing) return;
  if (!scannedItem || !scannedBin) return;

  processing = true;

  try {
    if (scannedBin.operation === "checkin") {
      const response = await axios.post(`${API_URL}/api/transactions/checkin`, {
        binQrCode: scannedBin.raw,
        itemQrCode: scannedItem.qrCode,
      });

      const itemName = response.data.item?.name || "Item";
      const binName = response.data.itemBin?.bin?.name || "bin";

      await displayMessage(`${itemName} checked into ${binName}`);

      // Clear state after successful transaction
      setTimeout(() => {
        scannedItem = null;
        scannedBin = null;
        processing = false;
        displayMessage("Ready to scan...");
      }, 3000);
    } else if (scannedBin.operation === "checkout") {
      const response = await axios.post(
        `${API_URL}/api/transactions/checkout`,
        {
          binQrCode: scannedBin.raw,
          itemQrCode: scannedItem.qrCode,
        }
      );

      const itemName = response.data.transaction?.item?.name || "Item";
      const binName = response.data.transaction?.bin?.name || "bin";

      await displayMessage(`${itemName} checked out from ${binName}`);

      // Clear state after successful transaction
      setTimeout(() => {
        scannedItem = null;
        scannedBin = null;
        processing = false;
        displayMessage("Ready to scan...");
      }, 3000);
    }
  } catch (error) {
    console.error("Transaction error:", error);

    if (error.response?.status === 404) {
      if (
        error.response?.data?.error?.includes("bin") ||
        error.response?.data?.error?.includes("Bin")
      ) {
        await displayMessage("Error: Bin not found");
      } else {
        await displayMessage("Error: Item not found");
      }
    } else {
      const errorMsg =
        error.response?.data?.error || error.message || "Transaction failed";
      await displayMessage(`Error: ${errorMsg}`);
    }

    // Clear state on error
    setTimeout(() => {
      scannedItem = null;
      scannedBin = null;
      processing = false;
      displayMessage("Ready to scan...");
    }, 3000);
  }
}

// Handle scanned QR code
async function handleScan(qrCode) {
  if (processing) return;

  const parsed = parseQRCode(qrCode);

  if (parsed.type === "item") {
    scannedItem = parsed;

    // Try to get item name from API
    try {
      // Search for item by QR code
      const response = await axios.get(`${API_URL}/api/items`);
      const items = response.data;
      const item = items.find((i) => i.qrCode === parsed.qrCode);

      if (item) {
        await displayMessage(`${item.name} scanned...\nWaiting for bin scan`);
      } else {
        await displayMessage("Item scanned...\nWaiting for bin scan");
      }
    } catch (e) {
      console.error("Error fetching item:", e);
      await displayMessage("Item scanned...\nWaiting for bin scan");
    }

    // If we already have a bin, process immediately
    if (scannedBin) {
      await processTransaction();
    }
  } else if (parsed.type === "bin") {
    scannedBin = parsed;

    // Try to get bin name from API
    try {
      const response = await axios.get(`${API_URL}/api/bins/${parsed.id}`);
      const binName = response.data.name || "bin";
      const operation =
        parsed.operation === "checkin" ? "check-in" : "check-out";
      await displayMessage(
        `Bin: ${binName}\nOperation: ${operation}\nWaiting for item scan`
      );
    } catch (e) {
      console.error("Error fetching bin:", e);
      const operation =
        parsed.operation === "checkin" ? "check-in" : "check-out";
      await displayMessage(
        `Bin scanned\nOperation: ${operation}\nWaiting for item scan`
      );
    }

    // If we already have an item, process immediately
    if (scannedItem) {
      await processTransaction();
    }
  }
}

// Setup input from USB scanner (keyboard input)
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

// Handle scanner input (scanners typically send data followed by Enter)
rl.on("line", (line) => {
  const qrCode = line.trim();
  if (qrCode) {
    console.log(`Scanned: ${qrCode}`);
    handleScan(qrCode);
  }
});

// Initialize display
displayMessage("Scanner ready...\nWaiting for scan");

console.log("Scanner service started");
console.log(`API URL: ${API_URL}`);
console.log("Waiting for scans...");
