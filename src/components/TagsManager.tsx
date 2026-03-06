import React, { useState, useEffect } from 'react';
import { Tag, Plus, Edit2, Trash2, X, Check } from 'lucide-react';

const API_URL = 'https://origincreativeagency.com/newcloud/api';

interface TagItem {
  id: string;
  name: string;
  color: string;
  file_count: number;
}

const TagsManager: React.FC = () => {
  const [tags, setTags] = useState<TagItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTag, setEditingTag] = useState<TagItem | null>(null);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3B82F6');

  const predefinedColors = [
    '#3B82F6', // blue
    '#10B981', // green
    '#F59E0B', // yellow
    '#EF4444', // red
    '#8B5CF6', // purple
    '#EC4899', // pink
    '#06B6D4', // cyan
    '#F97316', // orange
    '#6366F1', // indigo
    '#14B8A6', // teal
  ];

  useEffect(() => {
    loadTags();
  }, []);

  const loadTags = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/tags.php`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load tags');
      }

      const data = await response.json();
      setTags(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tags');
    } finally {
      setLoading(false);
    }
  };

  const createTag = async () => {
    if (!newTagName.trim()) {
      setError('Tag name is required');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/tags.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newTagName.trim(),
          color: newTagColor,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create tag');
      }

      await loadTags();
      setShowCreateModal(false);
      setNewTagName('');
      setNewTagColor('#3B82F6');
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create tag');
    }
  };

  const updateTag = async (tagId: string, name: string, color: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/tags.php?id=${tagId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, color }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update tag');
      }

      await loadTags();
      setEditingTag(null);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update tag');
    }
  };

  const deleteTag = async (tagId: string, tagName: string) => {
    if (!confirm(`Delete tag "${tagName}"? This will remove it from all files.`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/tags.php?id=${tagId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete tag');
      }

      await loadTags();
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete tag');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Loading tags...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow">
        <div className="flex items-center gap-2">
          <Tag className="w-5 h-5 text-gray-700" />
          <h2 className="text-lg font-semibold text-gray-900">Tags</h2>
          <span className="text-sm text-gray-500">({tags.length})</span>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Tag
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {/* Tags Grid */}
      <div className="bg-white rounded-lg shadow p-4">
        {tags.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Tag className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No tags yet. Create your first tag to organize your files.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {tags.map((tag) => (
              <div
                key={tag.id}
                className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
              >
                {editingTag?.id === tag.id ? (
                  <div className="flex-1 space-y-2">
                    <input
                      type="text"
                      value={editingTag.name}
                      onChange={(e) => setEditingTag({ ...editingTag, name: e.target.value })}
                      className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                    <div className="flex gap-2 items-center">
                      {predefinedColors.map((color) => (
                        <button
                          key={color}
                          onClick={() => setEditingTag({ ...editingTag, color })}
                          className={`w-6 h-6 rounded-full border-2 ${
                            editingTag.color === color ? 'border-gray-900' : 'border-gray-300'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateTag(editingTag.id, editingTag.name, editingTag.color)}
                        className="flex items-center gap-1 px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                      >
                        <Check className="w-3 h-3" />
                        Save
                      </button>
                      <button
                        onClick={() => setEditingTag(null)}
                        className="flex items-center gap-1 px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
                      >
                        <X className="w-3 h-3" />
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 flex-1">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span className="font-medium text-gray-900">{tag.name}</span>
                      <span className="text-xs text-gray-500">
                        ({tag.file_count} {tag.file_count === 1 ? 'file' : 'files'})
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setEditingTag(tag)}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Edit tag"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteTag(tag.id, tag.name)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Delete tag"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Tag Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Create New Tag</h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewTagName('');
                  setNewTagColor('#3B82F6');
                  setError('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tag Name
                </label>
                <input
                  type="text"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="e.g., Important, Work, Personal"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tag Color
                </label>
                <div className="flex gap-2 flex-wrap">
                  {predefinedColors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setNewTagColor(color)}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${
                        newTagColor === color ? 'border-gray-900 scale-110' : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={createTag}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Create Tag
                </button>
                <button
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewTagName('');
                    setNewTagColor('#3B82F6');
                    setError('');
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TagsManager;
