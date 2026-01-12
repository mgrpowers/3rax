import { useState, useEffect } from 'react';
import { binApi, Bin, Node, nodeApi } from '../services/api';
import { Link } from 'react-router-dom';

interface NodeWithBins extends Node {
  bins?: Bin[];
}

export default function Bins() {
  const [nodes, setNodes] = useState<NodeWithBins[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingBinId, setEditingBinId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', description: '' });
  const [deletingBinId, setDeletingBinId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [nodesResponse, binsResponse] = await Promise.all([
        nodeApi.getAll(),
        binApi.getAll(),
      ]);
      // Group bins by node
      const nodesWithBins = nodesResponse.data.map((node: Node) => ({
        ...node,
        bins: binsResponse.data.filter((bin: Bin) => bin.nodeId === node.id),
      }));
      setNodes(nodesWithBins as NodeWithBins[]);
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (bin: Bin) => {
    setEditingBinId(bin.id);
    setEditForm({
      name: bin.name,
      description: bin.description || '',
    });
  };

  const handleCancelEdit = () => {
    setEditingBinId(null);
    setEditForm({ name: '', description: '' });
  };

  const handleSaveEdit = async (binId: string) => {
    if (!editForm.name.trim()) {
      alert('Name is required');
      return;
    }

    try {
      await binApi.update(binId, {
        name: editForm.name.trim(),
        description: editForm.description.trim() || undefined,
      });
      setEditingBinId(null);
      loadData();
    } catch (error: any) {
      console.error('Error updating bin:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to update bin';
      alert(`Failed to update bin: ${errorMessage}`);
    }
  };

  const handleDelete = async (binId: string, binName: string) => {
    if (!confirm(`Are you sure you want to delete "${binName}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingBinId(binId);
    try {
      await binApi.delete(binId);
      loadData();
    } catch (error: any) {
      console.error('Error deleting bin:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to delete bin';
      alert(`Failed to delete bin: ${errorMessage}`);
    } finally {
      setDeletingBinId(null);
    }
  };

  if (loading) {
    return <div className="px-4 py-6">Loading...</div>;
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Bins</h1>
        <Link
          to="/bins/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Add Bin
        </Link>
      </div>

      <div className="space-y-4">
        {nodes.map((node) => (
          <div key={node.id} className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <h2 className="font-semibold text-lg text-gray-900">{node.name}</h2>
              {node.description && (
                <p className="text-sm text-gray-600 mt-1">{node.description}</p>
              )}
            </div>
            {node.bins && node.bins.length > 0 ? (
              <div className="p-4 pt-0">
                <div className="mt-4 space-y-3">
                  {node.bins.map((bin) => (
                    <div key={bin.id} className="border-l-4 border-blue-500 pl-4 py-2">
                      {editingBinId === bin.id ? (
                        <div className="space-y-3">
                          <input
                            type="text"
                            value={editForm.name}
                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Bin name"
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
                              onClick={() => handleSaveEdit(bin.id)}
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
                          <Link to={`/bins/${bin.id}`} className="flex-1 hover:text-blue-600">
                            <h3 className="font-medium text-gray-900">{bin.name}</h3>
                            {bin.description && (
                              <p className="text-sm text-gray-600 mt-1">{bin.description}</p>
                            )}
                            {bin.itemBins && (
                              <p className="text-xs text-gray-500 mt-1">
                                {bin.itemBins.length} item{bin.itemBins.length !== 1 ? 's' : ''}
                              </p>
                            )}
                          </Link>
                          <div className="flex gap-2 ml-4">
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                handleEdit(bin);
                              }}
                              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                            >
                              Edit
                            </button>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                handleDelete(bin.id, bin.name);
                              }}
                              disabled={deletingBinId === bin.id}
                              className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm disabled:opacity-50"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-4 pt-0">
                <p className="text-sm text-gray-500 italic">No bins in this node</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {nodes.length === 0 && (
        <div className="text-center py-12 text-gray-500">No nodes found</div>
      )}
    </div>
  );
}
