import { useState, useEffect } from 'react';
import { Download, File, Loader2 } from 'lucide-react';
import { API_BASE } from '../config/api';

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

interface SharedFileViewProps {
  shareToken: string;
}

export default function SharedFileView({ shareToken }: SharedFileViewProps) {
  const [file, setFile] = useState<FileRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    console.log('SharedFileView received token:', shareToken);
    loadFile();
  }, [shareToken]);

  const loadFile = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/files.php?share_token=${shareToken}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load file');
      }

      setFile(data && data.length > 0 ? data[0] : null);
    } catch (error) {
      console.error('Error loading file:', error);
      setFile(null);
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

  const downloadFile = async () => {
    if (!file) return;

    setDownloading(true);
    try {
      await fetch(`${API_BASE}/update.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ share_token: shareToken })
      });

      window.location.href = `${API_BASE}/download.php?file=${file.stored_filename}&name=${file.filename}`;
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download file');
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading file...</p>
        </div>
      </div>
    );
  }

  if (!file) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <File className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">File Not Found</h2>
          <p className="text-gray-600">This file does not exist or has been deleted.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-6">
          <File className="w-16 h-16 text-blue-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Shared File</h2>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <p className="text-sm text-gray-500 mb-1">Filename</p>
            <p className="font-medium text-gray-900 break-all">{file.filename}</p>
          </div>

          <div>
            <p className="text-sm text-gray-500 mb-1">Size</p>
            <p className="font-medium text-gray-900">{formatFileSize(file.file_size)}</p>
          </div>

          <div>
            <p className="text-sm text-gray-500 mb-1">Downloads</p>
            <p className="font-medium text-gray-900">{file.download_count}</p>
          </div>
        </div>

        <button
          onClick={downloadFile}
          disabled={downloading}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {downloading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Downloading...
            </>
          ) : (
            <>
              <Download className="w-5 h-5" />
              Download File
            </>
          )}
        </button>
      </div>
    </div>
  );
}
