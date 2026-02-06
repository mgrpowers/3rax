import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { binApi, Bin } from '../services/api';
import ScannerInput from '../components/ScannerInput';
import QRCodeDisplay from '../components/QRCodeDisplay';
import { useRealtimeEvents } from '../hooks/useRealtimeEvents';

export default function BinDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [bin, setBin] = useState<Bin | null>(null);
  const [loading, setLoading] = useState(true);
  const [showScannerInput, setShowScannerInput] = useState(false);

  // Re-fetch bin data when a check-in or check-out happens
  useRealtimeEvents(
    useCallback(() => {
      if (id) loadBin();
    }, [id]),
    ['checkin', 'checkout']
  );

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

  const handleRegisterQR = async (qrCode: string) => {
    if (!id) return;
    try {
      await binApi.registerQRCode(id, qrCode, 'checkin');
      setShowScannerInput(false);
      loadBin();
      alert('QR code registered successfully');
    } catch (error: any) {
      console.error('Error registering QR code:', error);
      alert('Failed to register QR code');
    }
  };

  const handlePrintCheckIn = async () => {
    if (!id) return;
    try {
      await binApi.printQRCode(id, { operation: 'checkin' });
      alert('Check-in QR code print job sent');
    } catch (error: any) {
      console.error('Error printing check-in QR code:', error);
      alert('Failed to print check-in QR code');
    }
  };

  const handlePrintCheckOut = async () => {
    if (!id) return;
    try {
      await binApi.printQRCode(id, { operation: 'checkout' });
      alert('Check-out QR code print job sent');
    } catch (error: any) {
      console.error('Error printing check-out QR code:', error);
      alert('Failed to print check-out QR code');
    }
  };

  if (loading) {
    return <div className="px-4 py-6">Loading...</div>;
  }

  if (!bin) {
    return <div className="px-4 py-6">Bin not found</div>;
  }

  // Group items by name and sum quantities
  const groupedItems = bin.itemBins?.reduce((acc, itemBin) => {
    const itemName = itemBin.item?.name || 'Unknown Item';
    if (acc[itemName]) {
      acc[itemName].quantity += itemBin.quantity;
    } else {
      acc[itemName] = {
        ...itemBin,
        quantity: itemBin.quantity,
      };
    }
    return acc;
  }, {} as Record<string, { id: string; item?: { id: string; name: string }; quantity: number }>) || {};

  const groupedItemsArray = Object.values(groupedItems);

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
            <QRCodeDisplay binId={bin.id} operation="checkin" />
            <button
              onClick={handlePrintCheckIn}
              className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Print Check-In QR Code
            </button>
          </div>
          <div>
            <h2 className="text-xl font-semibold mb-4">Check-Out QR Code</h2>
            <QRCodeDisplay binId={bin.id} operation="checkout" />
            <button
              onClick={handlePrintCheckOut}
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Print Check-Out QR Code
            </button>
          </div>
        </div>

        {groupedItemsArray.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Items in Bin</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {groupedItemsArray.map((itemBin, index) => (
                <div key={itemBin.item?.id || index} className="border rounded-lg p-4">
                  <p className="font-semibold">{itemBin.item?.name || 'Unknown Item'}</p>
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
