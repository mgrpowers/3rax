import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { binApi, Bin } from '../services/api';
import QRCodeDisplay from '../components/QRCodeDisplay';

export default function BinDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [bin, setBin] = useState<Bin | null>(null);
  const [loading, setLoading] = useState(true);
  const [showQR, setShowQR] = useState<'checkin' | 'checkout' | null>(null);

  useEffect(() => {
    if (id) {
      loadBin();
    }
  }, [id]);

  const loadBin = async () => {
    try {
      const response = await binApi.getById(id!);
      setBin(response.data);
    } catch (error) {
      console.error('Error loading bin:', error);
      alert('Failed to load bin');
      navigate('/bins');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="px-4 py-6">Loading...</div>;
  }

  if (!bin) {
    return <div className="px-4 py-6">Bin not found</div>;
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <button
        onClick={() => navigate('/bins')}
        className="text-blue-600 hover:text-blue-800 mb-4"
      >
        ← Back to Bins
      </button>

      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">{bin.name}</h1>
        {bin.description && <p className="text-gray-600 mb-4">{bin.description}</p>}
        {bin.node && (
          <p className="text-gray-500 mb-6">Location: {bin.node.name}</p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">Check-In QR Code</h2>
            <button
              onClick={() => setShowQR(showQR === 'checkin' ? null : 'checkin')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 mb-4"
            >
              {showQR === 'checkin' ? 'Hide' : 'Show'} QR Code
            </button>
            {showQR === 'checkin' && <QRCodeDisplay binId={bin.id} operation="checkin" />}
          </div>
          <div>
            <h2 className="text-xl font-semibold mb-4">Check-Out QR Code</h2>
            <button
              onClick={() => setShowQR(showQR === 'checkout' ? null : 'checkout')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 mb-4"
            >
              {showQR === 'checkout' ? 'Hide' : 'Show'} QR Code
            </button>
            {showQR === 'checkout' && <QRCodeDisplay binId={bin.id} operation="checkout" />}
          </div>
        </div>

        {bin.itemBins && bin.itemBins.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Items in Bin</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bin.itemBins.map((itemBin) => (
                <div key={itemBin.id} className="border rounded-lg p-4">
                  <p className="font-semibold">{itemBin.item?.name}</p>
                  <p className="text-lg mt-2">Quantity: {itemBin.quantity}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

