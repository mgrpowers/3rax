import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { itemApi, Item } from '../services/api';
import QRCodeScanner from '../components/QRCodeScanner';
import QRCodeDisplay from '../components/QRCodeDisplay';

export default function ItemDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [item, setItem] = useState<Item | null>(null);
  const [loading, setLoading] = useState(true);
  const [showScanner, setShowScanner] = useState(false);
  const [showQR, setShowQR] = useState(false);

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
      setShowScanner(false);
      loadItem();
      alert('QR code registered successfully');
    } catch (error) {
      console.error('Error registering QR code:', error);
      alert('Failed to register QR code');
    }
  };

  const handlePrint = async () => {
    if (!id) return;
    try {
      await itemApi.printQRCode(id, {});
      alert('Print job sent');
    } catch (error) {
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
      <button
        onClick={() => navigate('/items')}
        className="text-blue-600 hover:text-blue-800 mb-4"
      >
        ← Back to Items
      </button>

      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            {item.imagePath && (
              <img
                src={`http://localhost:3001${item.imagePath}`}
                alt={item.name}
                className="w-full rounded-lg mb-4"
              />
            )}
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-4">{item.name}</h1>
            {item.description && <p className="text-gray-600 mb-4">{item.description}</p>}
            {item.type && (
              <span className="inline-block bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded mb-4">
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
                    onClick={() => setShowScanner(true)}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                  >
                    Register Custom QR
                  </button>
                  <button
                    onClick={() => setShowQR(!showQR)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {showQR ? 'Hide' : 'Show'} QR Code
                  </button>
                  <button
                    onClick={handlePrint}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Print Label
                  </button>
                </div>
                {showQR && (
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

      {showScanner && (
        <QRCodeScanner
          onScan={handleRegisterQR}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
}

