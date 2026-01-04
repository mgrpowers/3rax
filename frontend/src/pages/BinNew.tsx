import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { binApi, nodeApi, Node } from '../services/api';

export default function BinNew() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState('');
  const [nodes, setNodes] = useState<Node[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadNodes = async () => {
      try {
        const response = await nodeApi.getAll();
        setNodes(response.data);
        if (response.data.length > 0) {
          setSelectedNodeId(response.data[0].id);
        }
      } catch (error: any) {
        console.error('Error loading nodes:', error);
        const errorMessage = error.response?.data?.error || error.message || 'Failed to load nodes';
        alert(`Failed to load nodes: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    };
    loadNodes();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !selectedNodeId) {
      alert('Name and Node are required');
      return;
    }

    setSubmitting(true);
    try {
      const response = await binApi.create({
        nodeId: selectedNodeId,
        name,
        description,
      });
      navigate(`/bins/${response.data.id}`);
    } catch (error: any) {
      console.error('Error creating bin:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to create bin';
      alert(`Failed to create bin: ${errorMessage}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="px-4 py-6">Loading nodes...</div>;
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <button
        onClick={() => navigate('/bins')}
        className="text-blue-600 hover:text-blue-800 mb-4"
      >
        ← Back to Bins
      </button>

      <div className="bg-white rounded-lg shadow p-6 max-w-2xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Create New Bin</h1>

        {nodes.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="mb-4">No nodes found. Please create a node first.</p>
            <button
              onClick={() => navigate('/nodes/new')}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Create Node
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="binName" className="block text-sm font-medium text-gray-700 mb-2">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="binName"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label htmlFor="binDescription" className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                id="binDescription"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                rows={3}
              />
            </div>

            <div>
              <label htmlFor="nodeSelect" className="block text-sm font-medium text-gray-700 mb-2">
                Node <span className="text-red-500">*</span>
              </label>
              <select
                id="nodeSelect"
                value={selectedNodeId}
                onChange={(e) => setSelectedNodeId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                required
              >
                {nodes.map((node) => (
                  <option key={node.id} value={node.id}>
                    {node.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={() => navigate('/bins')}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Creating...' : 'Create Bin'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

