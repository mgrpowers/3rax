import { useState, useEffect } from 'react';
import { itemApi, Item } from '../services/api';
import { Link } from 'react-router-dom';

export default function Items() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      const response = await itemApi.getAll();
      setItems(response.data);
    } catch (error) {
      console.error('Error loading items:', error);
      alert('Failed to load items');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
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
              <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                {item.type}
              </span>
            )}
          </Link>
        ))}
      </div>

      {items.length === 0 && (
        <div className="text-center py-12 text-gray-500">No items found</div>
      )}
    </div>
  );
}

