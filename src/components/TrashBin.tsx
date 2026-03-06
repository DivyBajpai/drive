import { useState, useEffect } from 'react';
import { Trash2, RotateCcw, XCircle, File, Folder, AlertTriangle } from 'lucide-react';

const API_BASE = '/api';

interface TrashedFile {
  id: string;
  filename: string;
  filesize: number;
  mimetype: string;
  deleted_at: string;
  uploaded_at: string;
}

interface TrashedFolder {
  id: string;
  name: string;
  deleted_at: string;
  created_at: string;
}

interface TrashData {
  files: TrashedFile[];
  folders: TrashedFolder[];
}

export default function TrashBin() {
  const [trash, setTrash] = useState<TrashData>({ files: [], folders: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTrash();
  }, []);

  const loadTrash = async () => {
    setLoading(true);
    try {
      const sessionToken = localStorage.getItem('session_token');
      const response = await fetch(`${API_BASE}/trash.php`, {
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTrash(data);
      }
    } catch (error) {
      console.error('Trash error:', error);
    } finally {
      setLoading(false);
    }
  };

  const restoreItem = async (type: 'file' | 'folder', id: string, name: string) => {
    if (!confirm(`Restore "${name}"?`)) return;

    try {
      const sessionToken = localStorage.getItem('session_token');
      const response = await fetch(`${API_BASE}/trash.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ type, id }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(`"${name}" restored successfully!`);
        loadTrash();
      } else {
        alert(data.error || 'Failed to restore');
      }
    } catch (error) {
      console.error('Restore error:', error);
      alert('Failed to restore item');
    }
  };

  const permanentlyDelete = async (type: 'file' | 'folder', id: string, name: string) => {
    if (!confirm(`Permanently delete "${name}"? This action cannot be undone!`)) return;

    try {
      const sessionToken = localStorage.getItem('session_token');
      const response = await fetch(`${API_BASE}/trash.php?type=${type}&id=${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        alert(`"${name}" permanently deleted`);
        loadTrash();
      } else {
        alert(data.error || 'Failed to delete');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete item');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const totalItems = trash.files.length + trash.folders.length;

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading trash...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Trash2 className="w-8 h-8 text-red-600" />
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Trash</h2>
            <p className="text-sm text-gray-500">
              {totalItems} item{totalItems !== 1 ? 's' : ''} in trash
            </p>
          </div>
        </div>
      </div>

      {totalItems === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <Trash2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">Trash is empty</p>
          <p className="text-gray-400 text-sm mt-2">Items deleted will appear here</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Warning Banner */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <strong>Note:</strong> Deleted items stay in trash. Permanently delete to free up storage space.
            </div>
          </div>

          {/* Trashed Folders */}
          {trash.folders.length > 0 && (
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-800">Folders ({trash.folders.length})</h3>
              </div>
              <div className="divide-y divide-gray-200">
                {trash.folders.map((folder) => (
                  <div key={folder.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Folder className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-700 truncate">{folder.name}</p>
                        <p className="text-sm text-gray-500">
                          Deleted {formatDate(folder.deleted_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => restoreItem('folder', folder.id, folder.name)}
                        className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors text-sm"
                        title="Restore folder"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Restore
                      </button>
                      <button
                        onClick={() => permanentlyDelete('folder', folder.id, folder.name)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Permanently delete"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trashed Files */}
          {trash.files.length > 0 && (
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-800">Files ({trash.files.length})</h3>
              </div>
              <div className="divide-y divide-gray-200">
                {trash.files.map((file) => (
                  <div key={file.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <File className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-700 truncate">{file.filename}</p>
                        <p className="text-sm text-gray-500">
                          {formatFileSize(file.filesize)} • Deleted {formatDate(file.deleted_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => restoreItem('file', file.id, file.filename)}
                        className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors text-sm"
                        title="Restore file"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Restore
                      </button>
                      <button
                        onClick={() => permanentlyDelete('file', file.id, file.filename)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Permanently delete"
                      >
                        <XCircle className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
