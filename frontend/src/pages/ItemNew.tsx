import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { itemApi, binApi, transactionApi, Bin } from '../services/api';
import ScannerInput from '../components/ScannerInput';

export default function ItemNew() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [qrCode, setQrCode] = useState('');
  const [selectedBinId, setSelectedBinId] = useState('');
  const [loading, setLoading] = useState(false);
  const [existingNames, setExistingNames] = useState<string[]>([]);
  const [existingTypes, setExistingTypes] = useState<string[]>([]);
  const [bins, setBins] = useState<Bin[]>([]);
  const [loadingBins, setLoadingBins] = useState(true);
  const [showScannerInput, setShowScannerInput] = useState(false);
  const [showBinScanner, setShowBinScanner] = useState(false);
  const binSelectRef = useRef<HTMLSelectElement>(null);
  const qrCodeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadExistingData = async () => {
      try {
        const [itemsResponse, binsResponse] = await Promise.all([
          itemApi.getAll(),
          binApi.getAll(),
        ]);
        const items = itemsResponse.data;
        const names = [...new Set(items.map(item => item.name).filter(Boolean))] as string[];
        const types = [...new Set(items.map(item => item.type).filter(Boolean))] as string[];
        setExistingNames(names);
        setExistingTypes(types);
        setBins(binsResponse.data);
      } catch (error) {
        console.error('Error loading existing data:', error);
      } finally {
        setLoadingBins(false);
      }
    };
    loadExistingData();
  }, []);

  const focusBinField = () => {
    setTimeout(() => {
      if (binSelectRef.current) {
        binSelectRef.current.focus();
      }
    }, 100);
  };

  const handleQRScan = (scannedCode: string) => {
    setQrCode(scannedCode);
    setShowScannerInput(false);
    // Automatically focus the bin select field after scanning item QR code
    focusBinField();
  };

  const handleBinQRScan = (scannedCode: string) => {
    setShowBinScanner(false);
    try {
      // Parse bin QR code (JSON format: {"type":"bin","id":"...","operation":"checkin"})
      const parsed = JSON.parse(scannedCode);
      if (parsed.type === 'bin' && parsed.id) {
        // Check if this bin exists in our list
        const bin = bins.find(b => b.id === parsed.id);
        if (bin) {
          setSelectedBinId(parsed.id);
        } else {
          alert('Bin not found in the system. Please select from the dropdown instead.');
        }
      } else {
        alert('Invalid bin QR code format. Please select from the dropdown instead.');
      }
    } catch (e) {
      // Not JSON, try to find by QR code value
      const bin = bins.find(b => b.checkInQrCode === scannedCode || b.checkoutQrCode === scannedCode);
      if (bin) {
        setSelectedBinId(bin.id);
      } else {
        alert('Bin not found. Please select from the dropdown instead.');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Name is required');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', name);
      if (description) formData.append('description', description);
      if (type) formData.append('type', type);
      if (image) formData.append('image', image);

      const response = await itemApi.create(formData);
      const itemId = response.data.id;
      
      // If QR code was scanned, register it to the item
      if (qrCode.trim()) {
        try {
          await itemApi.registerQRCode(itemId, qrCode.trim());
        } catch (qrError: any) {
          console.error('Error registering QR code:', qrError);
          alert(`Item created, but QR code registration failed: ${qrError.response?.data?.error || qrError.message}`);
        }
      }

      // If a bin is selected, check the item into that bin
      if (selectedBinId) {
        try {
          // Get the bin to get its check-in QR code
          const bin = bins.find(b => b.id === selectedBinId);
          if (bin) {
            // Generate the bin QR code data for check-in
            const binQrCode = JSON.stringify({
              type: 'bin',
              id: bin.id,
              operation: 'checkin'
            });
            
            // Use the item's QR code (if registered) or the item ID
            const itemQrCode = qrCode.trim() || itemId;
            
            await transactionApi.checkIn({
              binQrCode: binQrCode,
              itemQrCode: itemQrCode,
            });
          }
        } catch (checkInError: any) {
          console.error('Error checking item into bin:', checkInError);
          alert(`Item created, but failed to check into bin: ${checkInError.response?.data?.error || checkInError.message}`);
        }
      }
      
      navigate(`/items/${itemId}`);
    } catch (error: any) {
      console.error('Error creating item:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to create item';
      alert(`Failed to create item: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4 py-6 sm:px-0">
      <button
        onClick={() => navigate('/items')}
        className="text-blue-600 hover:text-blue-800 mb-4"
      >
        ← Back to Items
      </button>

      <div className="bg-white rounded-lg shadow p-6 max-w-2xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Create New Item</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="itemName" className="block text-sm font-medium text-gray-700 mb-2">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="itemName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              list="existingNames"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              required
            />
            <datalist id="existingNames">
              {existingNames.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
          </div>

          <div>
            <label htmlFor="itemDescription" className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              id="itemDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              rows={3}
            />
          </div>

          <div>
            <label htmlFor="itemType" className="block text-sm font-medium text-gray-700 mb-2">
              Type
            </label>
            <input
              type="text"
              id="itemType"
              value={type}
              onChange={(e) => setType(e.target.value)}
              list="existingTypes"
              placeholder="e.g., cable, device, card"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
            <datalist id="existingTypes">
              {existingTypes.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </div>

          <div>
            <label htmlFor="itemQRCode" className="block text-sm font-medium text-gray-700 mb-2">
              QR Code
            </label>
            <div className="flex gap-2">
              <input
                ref={qrCodeInputRef}
                type="text"
                id="itemQRCode"
                value={qrCode}
                onChange={(e) => {
                  setQrCode(e.target.value);
                  // Focus bin field when QR code is entered
                  if (e.target.value.trim()) {
                    focusBinField();
                  }
                }}
                placeholder="Scan or enter QR code"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowScannerInput(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Scan
              </button>
            </div>
            {qrCode && (
              <p className="text-sm text-gray-500 mt-1">QR Code: {qrCode}</p>
            )}
          </div>

          <div>
            <label htmlFor="itemBin" className="block text-sm font-medium text-gray-700 mb-2">
              Check into Bin (optional)
            </label>
            {loadingBins ? (
              <div className="text-sm text-gray-500">Loading bins...</div>
            ) : bins.length === 0 ? (
              <div className="text-sm text-gray-500">
                No bins available. <a href="/bins/new" className="text-blue-600 hover:text-blue-800">Create a bin</a>
              </div>
            ) : (
              <div className="flex gap-2">
                <select
                  ref={binSelectRef}
                  id="itemBin"
                  value={selectedBinId}
                  onChange={(e) => setSelectedBinId(e.target.value)}
                  className={`flex-1 px-3 py-2 border rounded-lg focus:ring-blue-500 focus:border-blue-500 ${
                    qrCode.trim() && !selectedBinId
                      ? 'border-yellow-400 bg-yellow-50 ring-2 ring-yellow-400'
                      : 'border-gray-300'
                  }`}
                >
                  <option value="">-- Select a bin --</option>
                  {bins.map((bin) => (
                    <option key={bin.id} value={bin.id}>
                      {bin.name} ({bin.node?.name || 'Unknown node'})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowBinScanner(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Scan Bin
                </button>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="itemImage" className="block text-sm font-medium text-gray-700 mb-2">
              Image
            </label>
            <input
              type="file"
              id="itemImage"
              accept="image/*"
              onChange={(e) => setImage(e.target.files?.[0] || null)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={() => navigate('/items')}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating...' : 'Create Item'}
            </button>
          </div>
        </form>
      </div>

      {showScannerInput && (
        <ScannerInput
          onScan={handleQRScan}
          onClose={() => setShowScannerInput(false)}
        />
      )}
      {showBinScanner && (
        <ScannerInput
          onScan={handleBinQRScan}
          onClose={() => setShowBinScanner(false)}
        />
      )}
    </div>
  );
}
