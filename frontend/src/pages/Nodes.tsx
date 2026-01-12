import { useState, useEffect } from 'react';
import { nodeApi, Node, Bin } from '../services/api';
import { Link } from 'react-router-dom';

interface NodeWithBins extends Node {
  bins?: Bin[];
}

export default function Nodes() {
  const [nodes, setNodes] = useState<NodeWithBins[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', description: '' });
  const [deletingNodeId, setDeletingNodeId] = useState<string | null>(null);

  useEffect(() => {
    loadNodes();
  }, []);

  const loadNodes = async () => {
    try {
      const response = await nodeApi.getAll();
      setNodes(response.data as NodeWithBins[]);
    } catch (error) {
      console.error('Error loading nodes:', error);
      alert('Failed to load nodes');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (node: NodeWithBins) => {
    setEditingNodeId(node.id);
    setEditForm({
      name: node.name,
      description: node.description || '',
    });
  };

  const handleCancelEdit = () => {
    setEditingNodeId(null);
    setEditForm({ name: '', description: '' });
  };

  const handleSaveEdit = async (nodeId: string) => {
    if (!editForm.name.trim()) {
      alert('Name is required');
      return;
    }

    try {
      await nodeApi.update(nodeId, {
        name: editForm.name.trim(),
        description: editForm.description.trim() || undefined,
      });
      setEditingNodeId(null);
      loadNodes();
    } catch (error: any) {
      console.error('Error updating node:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to update node';
      alert(`Failed to update node: ${errorMessage}`);
    }
  };

  const handleDelete = async (nodeId: string, nodeName: string) => {
    if (!confirm(`Are you sure you want to delete "${nodeName}"? This will also delete all bins in this node. This action cannot be undone.`)) {
      return;
    }

    setDeletingNodeId(nodeId);
    try {
      await nodeApi.delete(nodeId);
      loadNodes();
    } catch (error: any) {
      console.error('Error deleting node:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to delete node';
      alert(`Failed to delete node: ${errorMessage}`);
    } finally {
      setDeletingNodeId(null);
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

      <div className="space-y-4">
        {nodes.map((node) => (
          <div key={node.id} className="bg-white rounded-lg shadow">
            <div className="p-4">
              {editingNodeId === node.id ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Node name"
                  />
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    rows={2}
                    placeholder="Description (optional)"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleSaveEdit(node.id)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Save
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">{node.name}</h3>
                    {node.description && (
                      <p className="text-gray-600 text-sm mb-2">{node.description}</p>
                    )}
                    {node.bins && node.bins.length > 0 && (
                      <div className="mt-3 ml-4 border-l-2 border-gray-200 pl-4">
                        <p className="text-sm font-medium text-gray-700 mb-2">
                          Bins ({node.bins.length}):
                        </p>
                        <div className="space-y-1">
                          {node.bins.map((bin) => (
                            <Link
                              key={bin.id}
                              to={`/bins/${bin.id}`}
                              className="block text-sm text-gray-600 hover:text-blue-600"
                            >
                              • {bin.name}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleEdit(node)}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(node.id, node.name)}
                      disabled={deletingNodeId === node.id}
                      className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {nodes.length === 0 && (
        <div className="text-center py-12 text-gray-500">No nodes found</div>
      )}
    </div>
  );
}
