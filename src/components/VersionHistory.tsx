import React, { useState, useEffect } from 'react';
import { Clock, Download, X, Upload, RotateCcw, User } from 'lucide-react';
import { API_BASE as API_URL } from '../config/api';

interface FileVersion {
  id: string;
  file_id: string;
  version_number: number;
  stored_filename: string;
  file_size: number;
  uploaded_by: string;
  uploaded_by_name: string;
  uploaded_by_email: string;
  comment: string | null;
  created_at: string;
}

interface VersionHistoryProps {
  fileId: string;
  fileName: string;
  onClose: () => void;
  onVersionRestored?: () => void;
}

const VersionHistory: React.FC<VersionHistoryProps> = ({
  fileId,
  fileName,
  onClose,
  onVersionRestored,
}) => {
  const [versions, setVersions] = useState<FileVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [comment, setComment] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadVersions();
  }, [fileId]);

  const loadVersions = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('session_token');
      const response = await fetch(`${API_URL}/versions.php?file_id=${fileId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load version history');
      }

      const data = await response.json();
      setVersions(data);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load versions');
    } finally {
      setLoading(false);
    }
  };

  const uploadNewVersion = async () => {
    if (!uploadFile) return;

    setUploading(true);
    try {
      const token = localStorage.getItem('session_token');
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('file_id', fileId);
      if (comment) {
        formData.append('comment', comment);
      }

      const response = await fetch(`${API_URL}/versions.php`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to upload version');
      }

      await loadVersions();
      setShowUploadModal(false);
      setUploadFile(null);
      setComment('');
      setError('');
      
      if (onVersionRestored) {
        onVersionRestored();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload version');
    } finally {
      setUploading(false);
    }
  };

  const downloadVersion = async (versionId: string, versionNumber: number) => {
    try {
      const token = localStorage.getItem('session_token');
      const url = `${API_URL}/versions.php?file_id=${fileId}&version_id=${versionId}`;
      
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to download version');
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${fileName}_v${versionNumber}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download version');
    }
  };

  const deleteVersion = async (versionId: string) => {
    if (!confirm('Delete this version? This cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('session_token');
      const response = await fetch(
        `${API_URL}/versions.php?file_id=${fileId}&version_id=${versionId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete version');
      }

      await loadVersions();
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete version');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-700" />
            <h3 className="text-lg font-semibold text-gray-900">Version History</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* File Name */}
        <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
          <p className="text-sm text-gray-600 truncate">
            <span className="font-medium">File:</span> {fileName}
          </p>
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Upload New Version
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm rounded">
            {error}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading versions...</div>
          ) : versions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No version history available.</p>
              <p className="text-sm mt-2">Upload a new version to start tracking changes.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {versions.map((version, index) => (
                <div
                  key={version.id}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    index === 0
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg font-semibold text-gray-900">
                          Version {version.version_number}
                        </span>
                        {index === 0 && (
                          <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-medium rounded-full">
                            Current
                          </span>
                        )}
                      </div>
                      <div className="space-y-1 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4" />
                          <span>{version.uploaded_by_name}</span>
                          <span className="text-gray-400">({version.uploaded_by_email})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span>{formatDate(version.created_at)}</span>
                        </div>
                        <div className="text-gray-500">
                          Size: {formatFileSize(version.file_size)}
                        </div>
                        {version.comment && (
                          <div className="mt-2 p-2 bg-gray-50 rounded text-gray-700 italic">
                            "{version.comment}"
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => downloadVersion(version.id, version.version_number)}
                        className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
                        title="Download this version"
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </button>
                      {index !== 0 && (
                        <button
                          onClick={() => deleteVersion(version.id)}
                          className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                          title="Delete this version"
                        >
                          <X className="w-4 h-4" />
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* Upload New Version Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-lg font-semibold text-gray-900">Upload New Version</h4>
              <button
                onClick={() => {
                  setShowUploadModal(false);
                  setUploadFile(null);
                  setComment('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select File
                </label>
                <input
                  type="file"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Comment (optional)
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Describe the changes in this version..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={uploadNewVersion}
                  disabled={!uploadFile || uploading}
                  className={`flex-1 px-4 py-2 bg-blue-600 text-white rounded-md transition-colors ${
                    !uploadFile || uploading
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:bg-blue-700'
                  }`}
                >
                  {uploading ? 'Uploading...' : 'Upload Version'}
                </button>
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    setUploadFile(null);
                    setComment('');
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

export default VersionHistory;
