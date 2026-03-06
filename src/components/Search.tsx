import { useState, useEffect } from 'react';
import { Search as SearchIcon, File, Folder, Download, X, Loader } from 'lucide-react';

const API_BASE = '/api';

interface SearchResult {
  files: FileResult[];
  folders: FolderResult[];
  query: string;
}

interface FileResult {
  id: string;
  filename: string;
  filesize: number;
  mimetype: string;
  shared_token: string;
  uploaded_at: string;
  owner_name: string;
  access_type: 'owned' | 'shared';
}

interface FolderResult {
  id: string;
  name: string;
  user_id: string;
  shared_token: string;
  created_at: string;
  owner_name: string;
  access_type: 'owned' | 'shared';
}

export default function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults(null);
      return;
    }

    const delaySearch = setTimeout(() => {
      performSearch();
    }, 500); // Debounce search

    return () => clearTimeout(delaySearch);
  }, [query]);

  const performSearch = async () => {
    setLoading(true);
    try {
      const sessionToken = localStorage.getItem('session_token');
      const response = await fetch(`${API_BASE}/search.php?q=${encodeURIComponent(query)}`, {
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setResults(data);
      }
    } catch (error) {
      console.error('Search error:', error);
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

  const downloadFile = async (file: FileResult) => {
    try {
      const sessionToken = localStorage.getItem('session_token');
      const response = await fetch(`${API_BASE}/download.php?id=${file.id}`, {
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  const totalResults = (results?.files.length || 0) + (results?.folders.length || 0);

  return (
    <div className="relative">
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search files and folders..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setResults(null);
              setIsOpen(false);
            }}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Search Results Dropdown */}
      {isOpen && query.trim().length >= 2 && (
        <div className="absolute top-full mt-2 w-full bg-white rounded-lg shadow-lg border border-gray-200 max-h-96 overflow-auto z-50">
          {loading ? (
            <div className="p-4 text-center">
              <Loader className="w-6 h-6 animate-spin mx-auto text-blue-600" />
              <p className="text-sm text-gray-500 mt-2">Searching...</p>
            </div>
          ) : results ? (
            <div>
              {totalResults === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  No results found for "{results.query}"
                </div>
              ) : (
                <>
                  <div className="p-2 bg-gray-50 border-b text-sm text-gray-600 font-medium">
                    {totalResults} result{totalResults !== 1 ? 's' : ''} for "{results.query}"
                  </div>

                  {/* Folders */}
                  {results.folders.length > 0 && (
                    <div className="border-b">
                      <div className="px-3 py-2 bg-gray-50 text-xs font-semibold text-gray-600 uppercase">
                        Folders ({results.folders.length})
                      </div>
                      {results.folders.map((folder) => (
                        <button
                          key={folder.id}
                          onClick={() => {
                            window.location.href = `?folderId=${folder.id}`;
                          }}
                          className="w-full px-3 py-2 hover:bg-gray-50 flex items-center gap-3 text-left border-b last:border-b-0"
                        >
                          <Folder className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-800 truncate">{folder.name}</p>
                            <p className="text-xs text-gray-500">
                              {folder.access_type === 'owned' ? 'My Folder' : `Shared by ${folder.owner_name}`}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Files */}
                  {results.files.length > 0 && (
                    <div>
                      <div className="px-3 py-2 bg-gray-50 text-xs font-semibold text-gray-600 uppercase border-b">
                        Files ({results.files.length})
                      </div>
                      {results.files.map((file) => (
                        <div
                          key={file.id}
                          className="px-3 py-2 hover:bg-gray-50 flex items-center gap-3 border-b last:border-b-0"
                        >
                          <File className="w-5 h-5 text-blue-500 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-800 truncate">{file.filename}</p>
                            <p className="text-xs text-gray-500">
                              {formatFileSize(file.filesize)} • 
                              {file.access_type === 'owned' ? ' My File' : ` Shared by ${file.owner_name}`}
                            </p>
                          </div>
                          <button
                            onClick={() => downloadFile(file)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors flex-shrink-0"
                            title="Download"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        ></div>
      )}
    </div>
  );
}
