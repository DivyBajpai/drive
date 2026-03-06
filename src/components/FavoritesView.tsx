import React, { useState, useEffect } from 'react';
import {
  Star,
  Folder,
  File,
  Download,
  Eye,
  Share2,
  Users,
  Copy,
  Check,
  Tag,
} from 'lucide-react';
import FilePreview from './FilePreview';
import ShareModal from './ShareModal';
import TagAssignment from './TagAssignment';

const API_URL = '/api';

interface TagItem {
  id: string;
  name: string;
  color: string;
}

interface FavoriteFile {
  id: string;
  filename: string;
  filesize: number;
  mimetype: string;
  shared_token: string;
  uploaded_at: string;
  is_favorite: number;
  tags?: TagItem[];
}

interface FavoriteFolder {
  id: string;
  name: string;
  shared_token: string | null;
  created_at: string;
  is_favorite: number;
}

interface FavoritesViewProps {
  onNavigateToFolder: (folderId: string) => void;
}

const FavoritesView: React.FC<FavoritesViewProps> = ({ onNavigateToFolder }) => {
  const [files, setFiles] = useState<FavoriteFile[]>([]);
  const [folders, setFolders] = useState<FavoriteFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Modals
  const [previewFile, setPreviewFile] = useState<{
    id: string;
    filename: string;
    mimetype: string;
  } | null>(null);
  const [shareItem, setShareItem] = useState<{
    type: 'file' | 'folder';
    id: string;
    name: string;
  } | null>(null);
  const [tagAssignmentFile, setTagAssignmentFile] = useState<{
    id: string;
    name: string;
  } | null>(null);

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/favorites.php`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load favorites');
      }

      const data = await response.json();
      
      // Load tags for each file
      const filesWithTags = await Promise.all(
        (data.files || []).map(async (file: FavoriteFile) => {
          try {
            const tagResponse = await fetch(`${API_URL}/tags.php?file_id=${file.id}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (tagResponse.ok) {
              file.tags = await tagResponse.json();
            }
          } catch (err) {
            file.tags = [];
          }
          return file;
        })
      );
      
      setFiles(filesWithTags);
      setFolders(data.folders || []);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load favorites');
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async (type: 'file' | 'folder', id: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/favorites.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          resource_type: type,
          resource_id: id,
          is_favorite: false, // Remove from favorites
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to unfavorite');
      }

      await loadFavorites();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unfavorite');
    }
  };

  const copyShareLink = async (token: string, isFolder: boolean = false) => {
    const baseUrl = window.location.origin + window.location.pathname;
    const shareUrl = isFolder
      ? `${baseUrl}?folder=${token}`
      : `${baseUrl}?share=${token}`;
    await navigator.clipboard.writeText(shareUrl);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 2000);
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

  const downloadFile = (fileId: string, filename: string) => {
    const token = localStorage.getItem('token');
    const url = `${API_URL}/download.php?id=${fileId}`;
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    // Add authorization header via fetch and create blob URL
    fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => response.blob())
      .then((blob) => {
        const blobUrl = URL.createObjectURL(blob);
        link.href = blobUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      })
      .catch((err) => {
        console.error('Download failed:', err);
        alert('Failed to download file');
      });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Loading favorites...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2 bg-white p-4 rounded-lg shadow">
        <Star className="w-6 h-6 text-yellow-500 fill-yellow-500" />
        <h2 className="text-xl font-semibold text-gray-900">Starred Files & Folders</h2>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {/* Favorite Folders */}
      {folders.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-600">FAVORITE FOLDERS</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {folders.map((folder) => (
              <div
                key={folder.id}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow group"
              >
                <div className="flex items-start justify-between">
                  <button
                    onClick={() => onNavigateToFolder(folder.id)}
                    className="flex items-center gap-2 flex-1 text-left"
                  >
                    <Folder className="w-6 h-6 text-yellow-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">
                        {folder.name}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {formatDate(folder.created_at)}
                      </p>
                    </div>
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleFavorite('folder', folder.id)}
                      className="p-1.5 text-yellow-600 hover:bg-yellow-50 rounded transition-colors"
                      title="Remove from favorites"
                    >
                      <Star className="w-4 h-4 fill-yellow-500" />
                    </button>
                    {folder.shared_token && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyShareLink(folder.shared_token!, true);
                        }}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Copy public link"
                      >
                        {copiedToken === folder.shared_token ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Favorite Files */}
      {files.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-600">FAVORITE FILES</h3>
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
                      <h3 className="font-medium text-gray-900 truncate">
                        {file.filename}
                      </h3>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-2">
                      <span>{formatFileSize(file.filesize)}</span>
                      <span>{formatDate(file.uploaded_at)}</span>
                    </div>
                    {file.tags && file.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {file.tags.map((tag) => (
                          <span
                            key={tag.id}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white"
                            style={{ backgroundColor: tag.color }}
                          >
                            <Tag className="w-3 h-3" />
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() =>
                        setPreviewFile({
                          id: file.id,
                          filename: file.filename,
                          mimetype: file.mimetype,
                        })
                      }
                      className="p-2 text-green-600 hover:bg-green-50 rounded transition-colors"
                      title="Preview file"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() =>
                        setTagAssignmentFile({ id: file.id, name: file.filename })
                      }
                      className="p-2 text-pink-600 hover:bg-pink-50 rounded transition-colors"
                      title="Manage tags"
                    >
                      <Tag className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() =>
                        setShareItem({ type: 'file', id: file.id, name: file.filename })
                      }
                      className="p-2 text-purple-600 hover:bg-purple-50 rounded transition-colors"
                      title="Share with users"
                    >
                      <Users className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => copyShareLink(file.shared_token)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Copy public link"
                    >
                      {copiedToken === file.shared_token ? (
                        <Check className="w-5 h-5 text-green-600" />
                      ) : (
                        <Copy className="w-5 h-5" />
                      )}
                    </button>
                    <button
                      onClick={() => downloadFile(file.id, file.filename)}
                      className="p-2 text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                      title="Download file"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => toggleFavorite('file', file.id)}
                      className="p-2 text-yellow-600 hover:bg-yellow-50 rounded transition-colors"
                      title="Remove from favorites"
                    >
                      <Star className="w-5 h-5 fill-yellow-500" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {folders.length === 0 && files.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <Star className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-2">No favorites yet</p>
          <p className="text-sm text-gray-400">
            Star files and folders to see them here
          </p>
        </div>
      )}

      {/* File Preview Modal */}
      {previewFile && (
        <FilePreview
          fileId={previewFile.id}
          filename={previewFile.filename}
          mimeType={previewFile.mimetype}
          onClose={() => setPreviewFile(null)}
        />
      )}

      {/* Share Modal */}
      {shareItem && (
        <ShareModal
          resourceType={shareItem.type}
          resourceId={shareItem.id}
          resourceName={shareItem.name}
          onClose={() => setShareItem(null)}
        />
      )}

      {/* Tag Assignment Modal */}
      {tagAssignmentFile && (
        <TagAssignment
          fileId={tagAssignmentFile.id}
          fileName={tagAssignmentFile.name}
          onClose={() => setTagAssignmentFile(null)}
          onTagsUpdated={loadFavorites}
        />
      )}
    </div>
  );
};

export default FavoritesView;
