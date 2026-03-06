import { useState, useEffect } from 'react';
import { X, Download, ExternalLink } from 'lucide-react';

const API_BASE = 'https://origincreativeagency.com/newcloud/api';

interface FilePreviewProps {
  fileId: string;
  filename: string;
  mimeType: string;
  onClose: () => void;
}

export default function FilePreview({ fileId, filename, mimeType, onClose }: FilePreviewProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPreview();
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [fileId]);

  const loadPreview = async () => {
    try {
      const sessionToken = localStorage.getItem('session_token');
      const response = await fetch(`${API_BASE}/preview.php?id=${fileId}`, {
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load preview');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      setLoading(false);
    } catch (err) {
      setError('Failed to load preview');
      setLoading(false);
    }
  };

  const handleDownload = async () => {
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

  const handleOpenNew = () => {
    if (previewUrl) {
      window.open(previewUrl, '_blank');
    }
  };

  const isImage = mimeType.startsWith('image/');
  const isPdf = mimeType === 'application/pdf';
  const isVideo = mimeType.startsWith('video/');
  const isAudio = mimeType.startsWith('audio/');
  const isText = mimeType.startsWith('text/') || mimeType === 'application/json';
  
  const canPreview = isImage || isPdf || isVideo || isAudio || isText;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">{filename}</h3>
            <p className="text-sm text-gray-500">{mimeType}</p>
          </div>
          <div className="flex items-center gap-2 ml-4">
            <button
              onClick={handleDownload}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
              title="Download"
            >
              <Download className="w-5 h-5" />
            </button>
            {canPreview && (
              <button
                onClick={handleOpenNew}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                title="Open in new tab"
              >
                <ExternalLink className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Preview Content */}
        <div className="flex-1 overflow-auto bg-gray-50 flex items-center justify-center p-4">
          {loading && (
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading preview...</p>
            </div>
          )}

          {error && (
            <div className="text-center">
              <div className="text-red-600 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-gray-700">{error}</p>
              <button
                onClick={handleDownload}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Download Instead
              </button>
            </div>
          )}

          {!loading && !error && previewUrl && (
            <>
              {isImage && (
                <img
                  src={previewUrl}
                  alt={filename}
                  className="max-w-full max-h-full object-contain"
                />
              )}

              {isPdf && (
                <iframe
                  src={previewUrl}
                  className="w-full h-full min-h-[600px]"
                  title={filename}
                />
              )}

              {isVideo && (
                <video
                  src={previewUrl}
                  controls
                  className="max-w-full max-h-full"
                >
                  Your browser does not support the video tag.
                </video>
              )}

              {isAudio && (
                <div className="text-center">
                  <div className="mb-4">
                    <svg className="w-24 h-24 text-blue-600 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                    </svg>
                  </div>
                  <audio src={previewUrl} controls className="mx-auto">
                    Your browser does not support the audio tag.
                  </audio>
                </div>
              )}

              {isText && (
                <iframe
                  src={previewUrl}
                  className="w-full h-full min-h-[600px] bg-white"
                  title={filename}
                />
              )}

              {!canPreview && (
                <div className="text-center">
                  <div className="text-gray-400 mb-4">
                    <svg className="w-24 h-24 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-gray-700 mb-4">Preview not available for this file type</p>
                  <button
                    onClick={handleDownload}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Download File
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
