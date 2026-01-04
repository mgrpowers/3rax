import { useEffect, useRef, useState } from "react";

interface ScannerInputProps {
  onScan: (qrCode: string) => void;
  onClose: () => void;
}

export default function ScannerInput({ onScan, onClose }: ScannerInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [scannedCode, setScannedCode] = useState("");

  useEffect(() => {
    // Focus the input when component mounts
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && scannedCode.trim()) {
      e.preventDefault();
      onScan(scannedCode.trim());
      setScannedCode("");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setScannedCode(e.target.value);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-bold mb-4">Scan with Scanner</h2>
        <p className="text-gray-600 mb-4 text-sm">
          Point your scanner at the QR code and scan. The code will be registered automatically.
        </p>
        <input
          ref={inputRef}
          type="text"
          value={scannedCode}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Scan QR code with your scanner..."
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-lg"
          autoFocus
        />
        <p className="text-gray-500 text-xs mt-2">
          Scanned code: {scannedCode || "(waiting for scan...)"}
        </p>
        <button
          onClick={onClose}
          className="mt-4 w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
        >
          Close
        </button>
      </div>
    </div>
  );
}

