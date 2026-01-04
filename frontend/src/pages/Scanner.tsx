import { useState, useEffect, useRef } from 'react';
import { transactionApi } from '../services/api';
import QRCodeScanner from '../components/QRCodeScanner';

type ScanStep = 'bin' | 'item' | 'complete';

export default function Scanner() {
  const [step, setStep] = useState<ScanStep>('bin');
  const [operation, setOperation] = useState<'checkin' | 'checkout' | null>(null);
  const [binQrCode, setBinQrCode] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input for manual scanner when in bin or item step
  useEffect(() => {
    if ((step === 'bin' || step === 'item') && !showCamera && inputRef.current) {
      inputRef.current.focus();
    }
  }, [step, showCamera]);

  const handleBinScan = async (qrCode: string) => {
    try {
      // Try to parse as JSON (for bin QR codes)
      const parsed = JSON.parse(qrCode);
      if (parsed.type === 'bin' && parsed.id && parsed.operation) {
        // This is a bin QR code with operation - set operation from QR code
        setOperation(parsed.operation);
        setBinQrCode(qrCode); // Store full JSON for backend
        setStep('item');
        return;
      }
    } catch (e) {
      // Not JSON, treat as plain QR code value
    }

    // If not JSON or not a valid bin QR code, treat as plain value
    // This shouldn't happen for bin QR codes, but handle gracefully
    setBinQrCode(qrCode);
    setStep('item');
  };

  const handleItemScan = async (qrCode: string) => {
    if (!operation || !binQrCode) {
      setResult('Error: Bin not scanned properly. Please scan bin QR code again.');
      setStep('bin');
      return;
    }

    setLoading(true);

    try {
      if (operation === 'checkin') {
        const response = await transactionApi.checkIn({
          binQrCode: binQrCode,
          itemQrCode: qrCode,
        });
        setResult(response.data.message);
      } else {
        const response = await transactionApi.checkOut({
          binQrCode: binQrCode,
          itemQrCode: qrCode,
        });
        setResult(response.data.message);
      }
      setStep('complete');
    } catch (error: any) {
      setResult(`Error: ${error.response?.data?.error || 'Failed to process transaction'}`);
      setStep('complete');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, stepType: ScanStep) => {
    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
      e.preventDefault();
      const qrCode = e.currentTarget.value.trim();
      e.currentTarget.value = '';
      
      if (stepType === 'bin') {
        handleBinScan(qrCode);
      } else if (stepType === 'item') {
        handleItemScan(qrCode);
      }
    }
  };

  const reset = () => {
    setStep('bin');
    setOperation(null);
    setBinQrCode(null);
    setResult(null);
    setShowCamera(false);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  return (
    <div className="px-4 py-6 sm:px-0">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Scanner</h1>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        {step === 'bin' && (
          <div>
            <p className="text-lg mb-4 text-center">
              Scan the bin's QR code (check-in or check-out)
            </p>
            {!showCamera ? (
              <div>
                <input
                  ref={inputRef}
                  type="text"
                  onKeyDown={(e) => handleKeyDown(e, 'bin')}
                  placeholder="Scan bin QR code with your scanner..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-lg"
                  autoFocus
                />
                <p className="text-gray-500 text-xs mt-2 text-center">
                  Or{' '}
                  <button
                    onClick={() => setShowCamera(true)}
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    use camera
                  </button>
                </p>
              </div>
            ) : (
              <div>
                <QRCodeScanner onScan={handleBinScan} onClose={() => setShowCamera(false)} />
              </div>
            )}
          </div>
        )}

        {step === 'item' && (
          <div>
            <p className="text-lg mb-4 text-center">
              Bin scanned ({operation === 'checkin' ? 'check-in' : 'check-out'}). Now scan the item's QR code
            </p>
            {loading ? (
              <div className="text-gray-500 text-center">Processing...</div>
            ) : !showCamera ? (
              <div>
                <input
                  ref={inputRef}
                  type="text"
                  onKeyDown={(e) => handleKeyDown(e, 'item')}
                  placeholder="Scan item QR code with your scanner..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-lg"
                  autoFocus
                />
                <p className="text-gray-500 text-xs mt-2 text-center">
                  Or{' '}
                  <button
                    onClick={() => setShowCamera(true)}
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    use camera
                  </button>
                </p>
              </div>
            ) : (
              <div>
                <QRCodeScanner onScan={handleItemScan} onClose={() => setShowCamera(false)} />
              </div>
            )}
          </div>
        )}

        {step === 'complete' && (
          <div className="text-center">
            <p className={`text-lg mb-4 ${result?.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>
              {result}
            </p>
            <button
              onClick={reset}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Scan Another
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
