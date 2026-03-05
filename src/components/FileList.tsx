import { useState, useEffect } from 'react';
import { File, Download, Copy, Check, Trash2 } from 'lucide-react';

interface FileRecord {
  id: string;
  filename: string;
  stored_filename: string;
  file_size: number;
  mime_type: string;
  share_token: string;
  download_count: number;
  uploaded_at: string;
  expires_at: string | null;
}

interface FileListProps {
  refreshTrigger: number;
}

export default function FileList({ refreshTrigger }: FileListProps) {
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  useEffect(() => {
    loadFiles();
  }, [refreshTrigger]);

  const loadFiles = async () => {
    setLoading(true);
    try {
      const response = await fetch('api/files.php');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load files');
      }

      setFiles(data || []);
    } catch (error) {
      console.error('Error loading files:', error);
      setFiles([]);
    } finally {
      setLoading(false);
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

  const copyShareLink = async (token: string) => {
    const baseUrl = window.location.origin + window.location.pathname;
    const shareUrl = `${baseUrl}?share=${token}`;
    await navigator.clipboard.writeText(shareUrl);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const downloadFile = async (storedFilename: string, originalFilename: string, shareToken: string) => {
    try {
      // Update download count
      await fetch('api/update.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ share_token: shareToken })
      });

      window.location.href = `api/download.php?file=${storedFilename}&name=${originalFilename}`;

      loadFiles();
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  const deleteFile = async (id: string, storedFilename: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return;

    try {
      const response = await fetch(`api/delete.php?id=${id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete file');
      }

      loadFiles();
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete file from database');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Loading files...</p>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="text-center py-12">
        <File className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">No files uploaded yet</p>
      </div>
    );
  }

  return (
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
                <h3 className="font-medium text-gray-900 truncate">{file.filename}</h3>
              </div>
              <div className="text-sm text-gray-500 space-y-1">
                <p>Size: {formatFileSize(file.file_size)}</p>
                <p>Uploaded: {formatDate(file.uploaded_at)}</p>
                <p>Downloads: {file.download_count}</p>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={() => copyShareLink(file.share_token)}
                className="flex items-center gap-2 px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm"
              >
                {copiedToken === file.share_token ? (
                  <>
                    <Check className="w-4 h-4" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Share
                  </>
                )}
              </button>

              <button
                onClick={() => downloadFile(file.stored_filename, file.filename, file.share_token)}
                className="flex items-center gap-2 px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors text-sm"
              >
                <Download className="w-4 h-4" />
                Download
              </button>

              <button
                onClick={() => deleteFile(file.id, file.stored_filename)}
                className="flex items-center gap-2 px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors text-sm"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
