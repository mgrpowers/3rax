import { useState } from 'react';
import { searchApi } from '../services/api';
import { Link } from 'react-router-dom';

export default function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    try {
      const response = await searchApi.search(query);
      setResults(response.data.results);
      setSearched(true);
    } catch (error) {
      console.error('Search error:', error);
      alert('Failed to search items');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4 py-6 sm:px-0">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Search Items</h1>

      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for items (e.g., HDMI cable, micro USB)"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
      </form>

      {searched && (
        <div>
          <p className="text-gray-600 mb-4">
            Found {results.length} result{results.length !== 1 ? 's' : ''}
          </p>

          {results.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No items found</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {results.map((item) => (
                <Link
                  key={item.id}
                  to={`/items/${item.id}`}
                  className="bg-white rounded-lg shadow p-4 hover:shadow-lg transition-shadow"
                >
                  {item.imagePath && (
                    <img
                      src={`http://localhost:3001${item.imagePath}`}
                      alt={item.name}
                      className="w-full h-48 object-cover rounded mb-3"
                    />
                  )}
                  <h3 className="font-semibold text-lg mb-1">{item.name}</h3>
                  {item.description && <p className="text-gray-600 text-sm mb-2">{item.description}</p>}
                  {item.type && (
                    <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded mb-2">
                      {item.type}
                    </span>
                  )}
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      Total: {item.totalQuantity} in {item.locations.length} location{item.locations.length !== 1 ? 's' : ''}
                    </p>
                    {item.locations.length > 0 && (
                      <div className="mt-1 text-xs text-gray-400">
                        {item.locations.slice(0, 2).map((loc: any, idx: number) => (
                          <div key={idx}>
                            {loc.bin.node.name} - {loc.bin.name} ({loc.quantity})
                          </div>
                        ))}
                        {item.locations.length > 2 && <div>...</div>}
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

