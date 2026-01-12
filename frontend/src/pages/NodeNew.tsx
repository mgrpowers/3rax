import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { nodeApi } from "../services/api";

export default function NodeNew() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (!name.trim()) {
      alert("Name is required");
      return;
    }

    setLoading(true);
    try {
      await nodeApi.create({
        name: name.trim(),
        description: description.trim() || undefined,
      });
      navigate("/nodes");
    } catch (error: any) {
      console.error("Error creating node:", error);
      const errorMessage =
        error.response?.data?.error || error.message || "Failed to create node";
      alert(`Failed to create node: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4 py-6 sm:px-0">
      <button
        onClick={() => navigate("/nodes")}
        className="text-blue-600 hover:text-blue-800 mb-4"
      >
        ← Back to Nodes
      </button>

      <div className="bg-white rounded-lg shadow p-6 max-w-2xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Create New Node
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="node-name-input"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="node-name-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label
              htmlFor="node-description-input"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Description
            </label>
            <textarea
              id="node-description-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              rows={3}
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={() => navigate("/nodes")}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creating..." : "Create Node"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
