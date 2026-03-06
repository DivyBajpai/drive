import { useState, useEffect } from 'react';
import { Download, File, Folder, User, Eye } from 'lucide-react';
import FilePreview from './FilePreview';

const API_BASE = 'https://origincreativeagency.com/newcloud/api';

interface SharedFile {
  id: string;
  filename: string;
  file_size: number;
  mime_type: string;
  created_at: string;
  owner_name: string;
  owner_email: string;
  permission: 'view' | 'edit';
  shared_at: string;
}

interface SharedFolder {
  id: string;
  name: string;
  created_at: string;
  owner_name: string;
  owner_email: string;
  permission: 'view' | 'edit';
  shared_at: string;
  file_count: number;
}

export default function SharedWithMe() {
  const [files, setFiles] = useState<SharedFile[]>([]);
  const [folders, setFolders] = useState<SharedFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewFile, setPreviewFile] = useState<{ id: string, filename: string, mimeType: string } | null>(null);

  useEffect(() => {
    loadSharedItems();
  }, []);

  const loadSharedItems = async () => {
    try {
      const sessionToken = localStorage.getItem('session_token');
      const response = await fetch(`${API_BASE}/shared_with_me.php`, {
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setFiles(data.shared_files || []);
        setFolders(data.shared_folders || []);
      }
    } catch (error) {
      console.error('Error loading shared items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadFile = async (fileId: string, filename: string) => {
    try {
      const sessionToken = localStorage.getItem('session_token');
      const response = await fetch(`${API_BASE}/download.php?id=${fileId}`, {
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  const handleOpenFolder = (folderId: string) => {
    // Navigate to current URL with folderId parameter
    const url = new URL(window.location.href);
    url.search = `?folderId=${folderId}`;
    window.location.href = url.href;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const totalItems = files.length + folders.length;

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Shared with me</h1>
        <p className="text-gray-600">
          {totalItems === 0 
            ? 'No files or folders have been shared with you yet'
            : `${totalItems} ${totalItems === 1 ? 'item' : 'items'} shared with you`
          }
        </p>
      </div>

      {/* Folders Section */}
      {folders.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Folder className="w-5 h-5" />
            Folders ({folders.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {folders.map((folder) => (
              <div
                key={folder.id}
                onClick={() => handleOpenFolder(folder.id)}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <Folder className="w-6 h-6 text-yellow-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">{folder.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {folder.file_count} {folder.file_count === 1 ? 'item' : 'items'}
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                      <User className="w-3 h-3" />
                      <span className="truncate">{folder.owner_name}</span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-500 capitalize">
                        {folder.permission}
                      </span>
                      <span className="text-xs text-gray-500">
                        {formatDate(folder.shared_at)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Files Section */}
      {files.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <File className="w-5 h-5" />
            Files ({files.length})
          </h2>
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Owner
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Size
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Permission
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Shared
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {files.map((file) => (
                    <tr key={file.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <File className="w-5 h-5 text-gray-400 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {file.filename}
                            </div>
                            <div className="text-xs text-gray-500">
                              {file.mime_type}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{file.owner_name}</div>
                        <div className="text-xs text-gray-500">{file.owner_email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatFileSize(file.file_size)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 capitalize">
                          {file.permission}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(file.shared_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={() => setPreviewFile({ id: file.id, filename: file.filename, mimeType: file.mime_type })}
                            className="text-green-600 hover:text-green-900 inline-flex items-center gap-1"
                          >
                            <Eye className="w-4 h-4" />
                            Preview
                          </button>
                          <button
                            onClick={() => handleDownloadFile(file.id, file.filename)}
                            className="text-blue-600 hover:text-blue-900 inline-flex items-center gap-1"
                          >
                            <Download className="w-4 h-4" />
                            Download
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {totalItems === 0 && (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
            <User className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Nothing shared yet
          </h3>
          <p className="text-gray-600">
            Items that others share with you will appear here
          </p>
        </div>
      )}
      
      {/* File Preview Modal */}
      {previewFile && (
        <FilePreview
          fileId={previewFile.id}
          filename={previewFile.filename}
          mimeType={previewFile.mimeType}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </div>
  );
}
