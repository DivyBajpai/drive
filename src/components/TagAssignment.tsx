import React, { useState, useEffect } from 'react';
import { Tag, X, Check } from 'lucide-react';

const API_URL = 'https://origincreativeagency.com/newcloud/api';

interface TagItem {
  id: string;
  name: string;
  color: string;
}

interface TagAssignmentProps {
  fileId: string;
  fileName: string;
  onClose: () => void;
  onTagsUpdated?: () => void;
}

const TagAssignment: React.FC<TagAssignmentProps> = ({ fileId, fileName, onClose, onTagsUpdated }) => {
  const [allTags, setAllTags] = useState<TagItem[]>([]);
  const [fileTags, setFileTags] = useState<TagItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadTags();
    loadFileTags();
  }, [fileId]);

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
      setAllTags(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tags');
    }
  };

  const loadFileTags = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/tags.php?file_id=${fileId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load file tags');
      }

      const data = await response.json();
      setFileTags(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load file tags');
    } finally {
      setLoading(false);
    }
  };

  const isTagAssigned = (tagId: string) => {
    return fileTags.some((t) => t.id === tagId);
  };

  const assignTag = async (tagId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/tags.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          file_id: fileId,
          tag_id: tagId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to assign tag');
      }

      await loadFileTags();
      if (onTagsUpdated) onTagsUpdated();
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign tag');
    }
  };

  const removeTag = async (tagId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/tags.php?id=${tagId}&file_id=${fileId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to remove tag');
      }

      await loadFileTags();
      if (onTagsUpdated) onTagsUpdated();
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove tag');
    }
  };

  const toggleTag = (tagId: string) => {
    if (isTagAssigned(tagId)) {
      removeTag(tagId);
    } else {
      assignTag(tagId);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-gray-700" />
            <h3 className="text-lg font-semibold text-gray-900">
              Manage Tags
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* File Name */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
          <p className="text-sm text-gray-600 truncate">
            <span className="font-medium">File:</span> {fileName}
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading tags...</div>
          ) : allTags.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Tag className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No tags available. Create tags first in the Tags Manager.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700 mb-3">
                Click to assign or remove tags:
              </p>
              {allTags.map((tag) => {
                const assigned = isTagAssigned(tag.id);
                return (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(tag.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                      assigned
                        ? 'border-gray-900 bg-gray-50'
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full flex-shrink-0"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span className="font-medium text-gray-900">{tag.name}</span>
                    </div>
                    {assigned && (
                      <Check className="w-5 h-5 text-green-600" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TagAssignment;
