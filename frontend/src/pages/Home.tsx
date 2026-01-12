import { useState, useEffect } from 'react';
import { itemApi, Item, searchApi } from '../services/api';
import { Link } from 'react-router-dom';

export default function Home() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      const response = await itemApi.getAll();
      setItems(response.data);
    } catch (error: any) {
      console.error('Error loading items:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to load items';
      alert(`Failed to load items: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      // If search is empty, show all items
      loadItems();
      setIsSearching(false);
      return;
    }

    setLoading(true);
    setIsSearching(true);
    try {
      const response = await searchApi.search(searchQuery);
      setItems(response.data.results);
    } catch (error: any) {
      console.error('Search error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to search items';
      alert(`Search failed: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setIsSearching(false);
    loadItems();
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingId(id);
    try {
      await itemApi.delete(id);
      // Remove item from list
      setItems(items.filter(item => item.id !== id));
    } catch (error: any) {
      console.error('Error deleting item:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to delete item';
      alert(`Failed to delete item: ${errorMessage}`);
    } finally {
      setDeletingId(null);
    }
  };

  // Get API URL for images (same logic as api.ts)
  const API_URL = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' 
    ? (window.location.hostname === 'localhost' 
      ? 'http://localhost:3001'
      : `http://${window.location.hostname}:${window.location.port === '3000' ? '3001' : window.location.port}`)
    : 'http://localhost:3001');

  if (loading && !isSearching) {
    return <div className="px-4 py-6">Loading...</div>;
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Items</h1>
        <Link
          to="/items/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Add Item
        </Link>
      </div>

      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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
          {isSearching && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Clear
            </button>
          )}
        </div>
      </form>

      {isSearching && items.length > 0 && (
        <p className="text-sm text-gray-600 mb-4">
          Found {items.length} result{items.length !== 1 ? 's' : ''} for "{searchQuery}"
        </p>
      )}

      {loading && isSearching ? (
        <div className="text-center py-12 text-gray-500">Searching...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-lg shadow p-4 hover:shadow-lg transition-shadow relative"
              >
                <Link to={`/items/${item.id}`} className="block">
                  {item.imagePath && (
                    <img
                      src={`${API_URL}${item.imagePath}`}
                      alt={item.name}
                      className="w-full h-48 object-cover rounded mb-3"
                    />
                  )}
                  <h3 className="font-semibold text-lg mb-1">{item.name}</h3>
                  {item.description && <p className="text-gray-600 text-sm mb-2">{item.description}</p>}
                  {item.type && (
                    <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                      {item.type}
                    </span>
                  )}
                </Link>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleDelete(item.id, item.name);
                  }}
                  disabled={deletingId === item.id}
                  className="absolute top-2 right-2 bg-red-600 text-white rounded-full p-2 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Delete item"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          {items.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              {isSearching ? `No items found for "${searchQuery}"` : 'No items found'}
            </div>
          )}
        </>
      )}
    </div>
  );
}

