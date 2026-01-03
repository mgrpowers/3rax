import { useState, useEffect } from 'react';
import { binApi, Bin } from '../services/api';
import { Link } from 'react-router-dom';

export default function Bins() {
  const [bins, setBins] = useState<Bin[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBins();
  }, []);

  const loadBins = async () => {
    try {
      const response = await binApi.getAll();
      setBins(response.data);
    } catch (error) {
      console.error('Error loading bins:', error);
      alert('Failed to load bins');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="px-4 py-6">Loading...</div>;
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Bins</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {bins.map((bin) => (
          <Link
            key={bin.id}
            to={`/bins/${bin.id}`}
            className="bg-white rounded-lg shadow p-4 hover:shadow-lg transition-shadow"
          >
            <h3 className="font-semibold text-lg mb-1">{bin.name}</h3>
            {bin.description && <p className="text-gray-600 text-sm mb-2">{bin.description}</p>}
            {bin.node && (
              <p className="text-sm text-gray-500">
                {bin.node.name}
              </p>
            )}
            {bin.itemBins && (
              <p className="text-sm text-gray-500 mt-2">
                {bin.itemBins.length} item{bin.itemBins.length !== 1 ? 's' : ''}
              </p>
            )}
          </Link>
        ))}
      </div>

      {bins.length === 0 && (
        <div className="text-center py-12 text-gray-500">No bins found</div>
      )}
    </div>
  );
}

