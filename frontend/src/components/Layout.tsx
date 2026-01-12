import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useRef } from 'react';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [scannerValue, setScannerValue] = useState('');
  const scannerInputRef = useRef<HTMLInputElement>(null);

  const navItems = [
    { path: '/bins', label: 'Bins' },
    { path: '/nodes', label: 'Nodes' },
  ];

  const handleScannerKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && scannerValue.trim()) {
      e.preventDefault();
      const qrCode = scannerValue.trim();
      setScannerValue('');

      // Try to parse as JSON (for bin QR codes)
      try {
        const parsed = JSON.parse(qrCode);
        if (parsed.type === 'bin' && parsed.id && parsed.operation) {
          // This is a bin QR code - navigate to scanner with the bin QR code
          navigate('/scanner', { state: { binQrCode: qrCode, operation: parsed.operation } });
          return;
        }
      } catch (e) {
        // Not JSON, might be a plain QR code
      }

      // If not a bin QR code, just clear it
      setScannerValue('');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link to="/" className="text-xl font-bold text-gray-900 hover:text-gray-700 cursor-pointer">
                  Inventory System
                </Link>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      location.pathname === item.path
                        ? 'border-blue-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
            <div className="flex items-center">
              <input
                ref={scannerInputRef}
                type="text"
                value={scannerValue}
                onChange={(e) => setScannerValue(e.target.value)}
                onKeyDown={handleScannerKeyDown}
                placeholder="Scan QR code..."
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500 w-48"
              />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}

