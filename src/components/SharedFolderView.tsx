import { useState, useEffect } from 'react';
import { Folder, File, Download, Loader2 } from 'lucide-react';

const API_BASE = 'https://origincreativeagency.com/newcloud/api';

interface FileRecord {
  id: string;
  filename: string;
  filesize: number;
  mimetype: string;
  shared_token: string;
  uploaded_at: string;
  folder_path?: string;
}

interface SharedFolderViewProps {
  folderToken: string;
}

export default function SharedFolderView({ folderToken }: SharedFolderViewProps) {
  const [folderName, setFolderName] = useState('');
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSharedFolder();
  }, [folderToken]);

  const loadSharedFolder = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE}/share_folder.php?token=${folderToken}`);
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to load shared folder');
      }

      const data = await response.json();
      setFolderName(data.folder.name);
      setFiles(data.files || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load folder');
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = (file: FileRecord) => {
    window.location.href = `${API_BASE}/download.php?token=${file.shared_token}`;
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading shared folder...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Folder className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Folder Not Found</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Folder className="w-8 h-8 text-yellow-500" />
            <h1 className="text-2xl font-bold text-gray-900">{folderName}</h1>
          </div>
          <p className="text-gray-600">Shared folder • {files.length} file{files.length !== 1 ? 's' : ''}</p>
        </div>

        {files.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <File className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">This folder is empty</p>
          </div>
        ) : (
          <div className="space-y-3">
            {files.map((file) => (
              <div
                key={file.id}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <File className="w-5 h-5 text-blue-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 truncate">{file.filename}</h3>
                        {file.folder_path && (
                          <p className="text-xs text-gray-500">{file.folder_path}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                      <span>{formatFileSize(file.filesize)}</span>
                      <span>{formatDate(file.uploaded_at)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => downloadFile(file)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex-shrink-0"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
