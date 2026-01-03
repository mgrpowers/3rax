import { exec } from 'child_process';
import { promisify } from 'util';
import { QRCodeService } from './qrService';
import path from 'path';
import fs from 'fs';
import QRCode from 'qrcode';

const execAsync = promisify(exec);

export interface PrintOptions {
  printerName?: string;
  labelSize?: '1x1' | '2x1'; // inches
  title?: string;
  subtitle?: string;
}

export class PrintingService {
  /**
   * Generate a label PDF/image with QR code and text
   */
  static async generateLabel(
    qrData: string,
    options: PrintOptions = {}
  ): Promise<Buffer> {
    const { labelSize = '1x1', title, subtitle } = options;

    // Generate QR code image
    const qrBuffer = await QRCode.toBuffer(qrData, {
      errorCorrectionLevel: 'M',
      type: 'png',
      width: 200,
      margin: 1,
    });

    // For now, return the QR code buffer
    // In a full implementation, we would overlay text using a library like canvas or pdfkit
    // For simplicity, we'll return the QR code and handle text overlay in the print function
    return qrBuffer;
  }

  /**
   * Print a QR code label using CUPS
   */
  static async printLabel(
    qrData: string,
    options: PrintOptions = {}
  ): Promise<void> {
    const { printerName, labelSize = '1x1', title, subtitle } = options;

    try {
      // Generate label image
      const labelBuffer = await this.generateLabel(qrData, options);

      // Save temporary file
      const tempDir = path.join(__dirname, '../../tmp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const tempFile = path.join(tempDir, `label-${Date.now()}.png`);
      fs.writeFileSync(tempFile, labelBuffer);

      try {
        // Use lp command to print
        let command = 'lp';
        if (printerName) {
          command += ` -d ${printerName}`;
        }

        // Set label size options
        if (labelSize === '1x1') {
          command += ' -o media=Custom.1x1in';
        } else if (labelSize === '2x1') {
          command += ' -o media=Custom.2x1in';
        }

        command += ` "${tempFile}"`;

        await execAsync(command);

        // Clean up temp file after a delay
        setTimeout(() => {
          if (fs.existsSync(tempFile)) {
            fs.unlinkSync(tempFile);
          }
        }, 5000);
      } catch (printError) {
        // Clean up temp file on error
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile);
        }
        throw printError;
      }
    } catch (error: any) {
      console.error('Printing error:', error);
      throw new Error(`Failed to print label: ${error.message}`);
    }
  }

  /**
   * List available printers
   */
  static async listPrinters(): Promise<string[]> {
    try {
      const { stdout } = await execAsync('lpstat -p -d');
      const printers: string[] = [];
      const lines = stdout.split('\n');

      for (const line of lines) {
        const match = line.match(/^printer\s+(\S+)/);
        if (match) {
          printers.push(match[1]);
        }
      }

      return printers;
    } catch (error) {
      console.error('Error listing printers:', error);
      return [];
    }
  }

  /**
   * Get default printer
   */
  static async getDefaultPrinter(): Promise<string | null> {
    try {
      const { stdout } = await execAsync('lpstat -d');
      const match = stdout.match(/system default destination:\s*(\S+)/);
      return match ? match[1] : null;
    } catch (error) {
      console.error('Error getting default printer:', error);
      return null;
    }
  }
}

