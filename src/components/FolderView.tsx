import { useState, useEffect } from 'react';
import { 
  Folder, 
  File, 
  Copy, 
  Check, 
  Trash2, 
  Edit2, 
  FolderPlus, 
  Home,
  ChevronRight,
  Share2,
  Users,
  Eye,
  Tag,
  Star
} from 'lucide-react';
import ShareModal from './ShareModal';
import FilePreview from './FilePreview';
import TagAssignment from './TagAssignment';

const API_BASE = '/api';

interface TagItem {
  id: string;
  name: string;
  color: string;
}

interface FileRecord {
  id: string;
  filename: string;
  filesize: number;
  mimetype: string;
  shared_token: string;
  uploaded_at: string;
  is_favorite?: number;
  tags?: TagItem[];
}

interface FolderRecord {
  id: string;
  name: string;
  user_id: string;
  parent_folder_id: string | null;
  shared_token: string | null;
  created_at: string;
  is_favorite?: number;
}

interface Breadcrumb {
  id: string;
  name: string;
}

interface FolderViewProps {
  refreshTrigger: number;
  initialFolderId?: string | null;
}

export default function FolderView({ refreshTrigger, initialFolderId }: FolderViewProps) {
  const [folders, setFolders] = useState<FolderRecord[]>([]);
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(initialFolderId || null);
  const [loading, setLoading] = useState(true);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  
  // Modals
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [showRenameFolder, setShowRenameFolder] = useState<FolderRecord | null>(null);
  const [folderName, setFolderName] = useState('');
  
  // Internal sharing
  const [shareItem, setShareItem] = useState<{ type: 'file' | 'folder', id: string, name: string } | null>(null);
  
  // File preview
  const [previewFile, setPreviewFile] = useState<{ id: string, filename: string, mimetype: string } | null>(null);
  
  // Tag assignment
  const [tagAssignmentFile, setTagAssignmentFile] = useState<{ id: string, name: string } | null>(null);

  // Update currentFolderId if initialFolderId changes
  useEffect(() => {
    if (initialFolderId !== undefined) {
      setCurrentFolderId(initialFolderId);
    }
  }, [initialFolderId]);

  useEffect(() => {
    loadFolderContents(currentFolderId);
  }, [currentFolderId, refreshTrigger]);

  const loadFolderContents = async (folderId: string | null) => {
    setLoading(true);
    try {
      const sessionToken = localStorage.getItem('session_token');
      const url = folderId 
        ? `${API_BASE}/folders.php?folder_id=${folderId}`
        : `${API_BASE}/folders.php`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load folder contents');
      }

      const data = await response.json();
      setFolders(data.folders || []);
      
      // Load tags for each file
      const filesWithTags = await Promise.all(
        (data.files || []).map(async (file: FileRecord) => {
          try {
            const tagResponse = await fetch(`${API_BASE}/tags.php?file_id=${file.id}`, {
              headers: { 'Authorization': `Bearer ${sessionToken}` },
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
      setBreadcrumbs(data.breadcrumbs || []);
    } catch (error) {
      console.error('Error loading folder:', error);
      setFolders([]);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  const navigateToFolder = (folderId: string | null) => {
    setCurrentFolderId(folderId);
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) return;

    try {
      const sessionToken = localStorage.getItem('session_token');
      const response = await fetch(`${API_BASE}/folders.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          name: folderName,
          parent_folder_id: currentFolderId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create folder');
      }

      setShowCreateFolder(false);
      setFolderName('');
      loadFolderContents(currentFolderId);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to create folder');
    }
  };

  const handleRenameFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showRenameFolder || !folderName.trim()) return;

    try {
      const sessionToken = localStorage.getItem('session_token');
      const response = await fetch(`${API_BASE}/folders.php`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          id: showRenameFolder.id,
          name: folderName,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to rename folder');
      }

      setShowRenameFolder(null);
      setFolderName('');
      loadFolderContents(currentFolderId);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to rename folder');
    }
  };

  const handleDeleteFolder = async (folder: FolderRecord) => {
    if (!confirm(`Delete "${folder.name}" and all its contents?`)) return;

    try {
      const sessionToken = localStorage.getItem('session_token');
      const response = await fetch(`${API_BASE}/folders.php?id=${folder.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete folder');
      }

      loadFolderContents(currentFolderId);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to delete folder');
    }
  };

  const handleShareFolder = async (folder: FolderRecord) => {
    try {
      const sessionToken = localStorage.getItem('session_token');
      
      // Generate share token if doesn't exist
      if (!folder.shared_token) {
        const response = await fetch(`${API_BASE}/share_folder.php`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionToken}`,
          },
          body: JSON.stringify({
            folder_id: folder.id,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to generate share link');
        }

        const data = await response.json();
        folder.shared_token = data.share_token;
      }

      // Copy share link
      const baseUrl = window.location.origin + window.location.pathname;
      const shareUrl = `${baseUrl}?folder=${folder.shared_token}`;
      await navigator.clipboard.writeText(shareUrl);
      setCopiedToken(folder.shared_token);
      setTimeout(() => setCopiedToken(null), 2000);
      
      // Refresh to show updated folder with share token
      loadFolderContents(currentFolderId);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to share folder');
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return;

    try {
      const sessionToken = localStorage.getItem('session_token');
      const response = await fetch(`${API_BASE}/delete.php?id=${fileId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete file');
      }

      loadFolderContents(currentFolderId);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to delete file');
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
  
  const toggleFavorite = async (type: 'file' | 'folder', id: string, currentValue: boolean) => {
    try {
      const sessionToken = localStorage.getItem('session_token');
      const response = await fetch(`${API_BASE}/favorites.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          resource_type: type,
          resource_id: id,
          is_favorite: !currentValue,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update favorite');
      }

      loadFolderContents(currentFolderId);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to update favorite');
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

  const openRenameModal = (folder: FolderRecord) => {
    setShowRenameFolder(folder);
    setFolderName(folder.name);
  };

  // Export current folder ID for FileUpload component
  useEffect(() => {
    // Store in a global context or pass via props
    window.currentFolderId = currentFolderId;
  }, [currentFolderId]);

  if (loading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-sm">
        <button
          onClick={() => navigateToFolder(null)}
          className="flex items-center gap-1 px-3 py-1.5 rounded hover:bg-gray-100 transition-colors"
        >
          <Home className="w-4 h-4" />
          <span>My Files</span>
        </button>
        {breadcrumbs.map((crumb) => (
          <div key={crumb.id} className="flex items-center gap-2">
            <ChevronRight className="w-4 h-4 text-gray-400" />
            <button
              onClick={() => navigateToFolder(crumb.id)}
              className="px-3 py-1.5 rounded hover:bg-gray-100 transition-colors"
            >
              {crumb.name}
            </button>
          </div>
        ))}
      </div>

      {/* New Folder Button */}
      <button
        onClick={() => setShowCreateFolder(true)}
        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
      >
        <FolderPlus className="w-4 h-4" />
        New Folder
      </button>

      {/* Folders */}
      {folders.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-600">FOLDERS</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {folders.map((folder) => (
              <div
                key={folder.id}
                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow group"
              >
                <div className="flex items-start justify-between">
                  <button
                    onClick={() => navigateToFolder(folder.id)}
                    className="flex items-center gap-2 flex-1 text-left"
                  >
                    <Folder className="w-6 h-6 text-yellow-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">{folder.name}</h3>
                      <p className="text-xs text-gray-500">{formatDate(folder.created_at)}</p>
                    </div>
                  </button>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite('folder', folder.id, !!folder.is_favorite);
                      }}
                      className="p-1.5 text-yellow-600 hover:bg-yellow-50 rounded transition-colors"
                      title={folder.is_favorite ? "Remove from favorites" : "Add to favorites"}
                    >
                      <Star className={`w-4 h-4 ${folder.is_favorite ? 'fill-yellow-500' : ''}`} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShareItem({ type: 'folder', id: folder.id, name: folder.name });
                      }}
                      className="p-1.5 text-purple-600 hover:bg-purple-50 rounded transition-colors"
                      title="Share with users"
                    >
                      <Users className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShareFolder(folder);
                      }}
                      className="p-1.5 text-green-600 hover:bg-green-50 rounded transition-colors"
                      title="Copy public link"
                    >
                      {copiedToken === folder.shared_token ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Share2 className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => openRenameModal(folder)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Rename"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteFolder(folder)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Files */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-600">FILES</h3>
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
                      onClick={() => setPreviewFile({ id: file.id, filename: file.filename, mimetype: file.mimetype })}
                      className="p-2 text-green-600 hover:bg-green-50 rounded transition-colors"
                      title="Preview file"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setTagAssignmentFile({ id: file.id, name: file.filename })}
                      className="p-2 text-pink-600 hover:bg-pink-50 rounded transition-colors"
                      title="Manage tags"
                    >
                      <Tag className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setShareItem({ type: 'file', id: file.id, name: file.filename })}
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
                      onClick={() => toggleFavorite('file', file.id, !!file.is_favorite)}
                      className="p-2 text-yellow-600 hover:bg-yellow-50 rounded transition-colors"
                      title={file.is_favorite ? "Remove from favorites" : "Add to favorites"}
                    >
                      <Star className={`w-5 h-5 ${file.is_favorite ? 'fill-yellow-500' : ''}`} />
                    </button>
                    <button
                      onClick={() => handleDeleteFile(file.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Delete file"
                    >
                      <Trash2 className="w-5 h-5" />
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
        <div className="text-center py-12">
          <Folder className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">This folder is empty</p>
        </div>
      )}

      {/* Create Folder Modal */}
      {showCreateFolder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Create New Folder</h3>
            <form onSubmit={handleCreateFolder}>
              <input
                type="text"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder="Folder name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateFolder(false);
                    setFolderName('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rename Folder Modal */}
      {showRenameFolder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Rename Folder</h3>
            <form onSubmit={handleRenameFolder}>
              <input
                type="text"
                value={folderName}
                onChange={(e) => setFolderName(e.target.value)}
                placeholder="Folder name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Rename
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowRenameFolder(null);
                    setFolderName('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
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
      
      {/* File Preview Modal */}
      {previewFile && (
        <FilePreview
          fileId={previewFile.id}
          filename={previewFile.filename}
          mimeType={previewFile.mimetype}
          onClose={() => setPreviewFile(null)}
        />
      )}
      
      {/* Tag Assignment Modal */}
      {tagAssignmentFile && (
        <TagAssignment
          fileId={tagAssignmentFile.id}
          fileName={tagAssignmentFile.name}
          onClose={() => setTagAssignmentFile(null)}
          onTagsUpdated={() => loadFolderContents(currentFolderId)}
        />
      )}
    </div>
  );
}

// Make current folder ID available globally for FileUpload
declare global {
  interface Window {
    currentFolderId: string | null;
  }
}
