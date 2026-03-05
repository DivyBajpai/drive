import { useState, useEffect } from 'react';
import { File, Download, Copy, Check, Trash2 } from 'lucide-react';
import { supabase, FileRecord } from '../lib/supabase';

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
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setFiles(data || []);
    } catch (error) {
      console.error('Error loading files:', error);
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
    const shareUrl = `${window.location.origin}?share=${token}`;
    await navigator.clipboard.writeText(shareUrl);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const downloadFile = async (storedFilename: string, originalFilename: string, shareToken: string) => {
    try {
      await supabase
        .from('files')
        .update({ download_count: files.find(f => f.share_token === shareToken)!.download_count + 1 })
        .eq('share_token', shareToken);

      window.location.href = `/api/download.php?file=${storedFilename}&name=${originalFilename}`;

      loadFiles();
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  const deleteFile = async (id: string, storedFilename: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return;

    try {
      await fetch(`/api/delete.php?file=${storedFilename}`, {
        method: 'DELETE',
      });

      const { error } = await supabase
        .from('files')
        .delete()
        .eq('id', id);

      if (error) throw error;

      loadFiles();
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete file');
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
