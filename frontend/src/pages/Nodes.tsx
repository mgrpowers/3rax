import { useState, useEffect } from 'react';
import { nodeApi, Node } from '../services/api';
import { Link } from 'react-router-dom';

export default function Nodes() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNodes();
  }, []);

  const loadNodes = async () => {
    try {
      const response = await nodeApi.getAll();
      setNodes(response.data);
    } catch (error) {
      console.error('Error loading nodes:', error);
      alert('Failed to load nodes');
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
        <h1 className="text-2xl font-bold text-gray-900">Nodes</h1>
        <Link
          to="/nodes/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Add Node
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {nodes.map((node) => (
          <div key={node.id} className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold text-lg mb-1">{node.name}</h3>
            {node.description && <p className="text-gray-600 text-sm">{node.description}</p>}
          </div>
        ))}
      </div>

      {nodes.length === 0 && (
        <div className="text-center py-12 text-gray-500">No nodes found</div>
      )}
    </div>
  );
}

