import { useState } from 'react';
import { transactionApi } from '../services/api';
import QRCodeScanner from '../components/QRCodeScanner';

type ScanStep = 'bin' | 'item' | 'complete';
type Operation = 'checkin' | 'checkout';

export default function Scanner() {
  const [step, setStep] = useState<ScanStep>('bin');
  const [operation, setOperation] = useState<Operation>('checkin');
  const [binQrCode, setBinQrCode] = useState<string | null>(null);
  const [itemQrCode, setItemQrCode] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  const handleBinScan = (qrCode: string) => {
    setBinQrCode(qrCode);
    setShowScanner(false);
    setStep('item');
  };

  const handleItemScan = async (qrCode: string) => {
    setItemQrCode(qrCode);
    setLoading(true);

    try {
      if (operation === 'checkin') {
        const response = await transactionApi.checkIn({
          binQrCode: binQrCode!,
          itemQrCode: qrCode,
        });
        setResult(response.data.message);
      } else {
        const response = await transactionApi.checkOut({
          binQrCode: binQrCode!,
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

  const reset = () => {
    setStep('bin');
    setBinQrCode(null);
    setItemQrCode(null);
    setResult(null);
    setShowScanner(false);
  };

  return (
    <div className="px-4 py-6 sm:px-0">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Scanner</h1>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => {
              setOperation('checkin');
              reset();
              setShowScanner(false);
            }}
            className={`flex-1 px-4 py-2 rounded-lg ${
              operation === 'checkin'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Check In
          </button>
          <button
            onClick={() => {
              setOperation('checkout');
              reset();
              setShowScanner(false);
            }}
            className={`flex-1 px-4 py-2 rounded-lg ${
              operation === 'checkout'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Check Out
          </button>
        </div>

        {step === 'bin' && !showScanner && (
          <div className="text-center">
            <p className="text-lg mb-4">
              Scan the bin's {operation === 'checkin' ? 'check-in' : 'checkout'} QR code
            </p>
            <button
              onClick={() => setShowScanner(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Start Scanning
            </button>
          </div>
        )}

        {step === 'bin' && showScanner && (
          <QRCodeScanner onScan={handleBinScan} onClose={() => setShowScanner(false)} />
        )}

        {step === 'item' && (
          <div className="text-center">
            <p className="text-lg mb-4">Bin scanned. Now scan the item's QR code</p>
            {loading ? (
              <div className="text-gray-500">Processing...</div>
            ) : (
              <QRCodeScanner onScan={handleItemScan} onClose={() => setStep('bin')} />
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

