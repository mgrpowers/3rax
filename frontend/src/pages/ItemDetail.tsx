import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { itemApi, Item } from '../services/api';
import ScannerInput from '../components/ScannerInput';
import QRCodeDisplay from '../components/QRCodeDisplay';

export default function ItemDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [showScannerInput, setShowScannerInput] = useState(false);

  useEffect(() => {
    if (id) {
      loadItem();
    }
  }, [id]);

  const loadItem = async () => {
    try {
      const response = await itemApi.getById(id!);
      setItem(response.data);
    } catch (error) {
      console.error('Error loading item:', error);
      alert('Failed to load item');
      navigate('/items');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterQR = async (qrCode: string) => {
    if (!id) return;
    try {
      await itemApi.registerQRCode(id, qrCode);
      setShowScannerInput(false);
      loadItem();
      alert('QR code registered successfully');
    } catch (error: any) {
      console.error('Error registering QR code:', error);
      alert('Failed to register QR code');
    }
  };

  const handlePrint = async () => {
    if (!id) return;
    try {
      await itemApi.printQRCode(id, {
        printerName: 'EPSON5D4FE9',
        labelSize: 'avery5267',
      });
      alert('Print job sent');
    } catch (error: any) {
      console.error('Error printing:', error);
      alert('Failed to print');
    }
  };

  if (loading) {
    return <div className="px-4 py-6">Loading...</div>;
  }

  if (!item) {
    return <div className="px-4 py-6">Item not found</div>;
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="flex gap-4 items-center mb-4">
        <button
          onClick={() => navigate('/items')}
          className="text-blue-600 hover:text-blue-800"
        >
          ← Back to Items
        </button>
        <button
          onClick={() => navigate('/items/new')}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          Add Another Item
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex gap-6">
          {item.imagePath && (
            <div className="flex-shrink-0">
              <img
                src={item.imagePath}
                alt={item.name}
                className="w-48 h-48 object-cover rounded-lg"
              />
            </div>
          )}
          <div className="flex-grow">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{item.name}</h1>
            {item.description && (
              <p className="text-gray-600 mb-4">{item.description}</p>
            )}
            {item.type && (
              <span className="inline-block px-3 py-1 bg-gray-200 text-gray-700 rounded-full text-sm">
                {item.type}
              </span>
            )}

            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  QR Code
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowScannerInput(true)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Register Custom QR Code
                  </button>
                  <button
                    onClick={handlePrint}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Print Label
                  </button>
                </div>
                {item.qrCode && (
                  <div className="mt-4">
                    <QRCodeDisplay itemId={item.id} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {item.itemBins && item.itemBins.length > 0 && (
          <div className="mt-6">
            <h2 className="text-xl font-semibold mb-4">Locations</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {item.itemBins.map((itemBin) => (
                <div key={itemBin.id} className="border rounded-lg p-4">
                  <p className="font-semibold">{itemBin.bin?.name}</p>
                  <p className="text-sm text-gray-600">{itemBin.bin?.node?.name}</p>
                  <p className="text-lg mt-2">Quantity: {itemBin.quantity}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showScannerInput && (
        <ScannerInput
          onScan={handleRegisterQR}
          onClose={() => setShowScannerInput(false)}
        />
      )}
    </div>
  );
}
