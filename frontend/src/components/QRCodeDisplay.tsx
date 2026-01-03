import { useEffect, useState } from 'react';
import { itemApi, binApi } from '../services/api';

interface QRCodeDisplayProps {
  itemId?: string;
  binId?: string;
  operation?: 'checkin' | 'checkout';
}

export default function QRCodeDisplay({ itemId, binId, operation }: QRCodeDisplayProps) {
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);

  useEffect(() => {
    const loadQRCode = async () => {
      try {
        let response;
        if (itemId) {
          response = await itemApi.generateQRCode(itemId);
        } else if (binId && operation) {
          response = await binApi.generateQRCode(binId, operation);
        } else {
          return;
        }

        const blob = response.data;
        const url = URL.createObjectURL(blob);
        setQrImageUrl(url);

        return () => URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Error loading QR code:', error);
      }
    };

    loadQRCode();
  }, [itemId, binId, operation]);

  if (!qrImageUrl) {
    return <div className="text-gray-500">Loading QR code...</div>;
  }

  return (
    <div className="flex justify-center">
      <img src={qrImageUrl} alt="QR Code" className="w-48 h-48" />
    </div>
  );
}

