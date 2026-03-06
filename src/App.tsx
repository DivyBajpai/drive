import { useState, useEffect } from 'react';
import { Share2, LogOut, Users, Files, UserCheck, BarChart3, Trash2 } from 'lucide-react';
import FileUpload from './components/FileUpload';
import FolderView from './components/FolderView';
import SharedFileView from './components/SharedFileView';
import SharedFolderView from './components/SharedFolderView';
import SharedWithMe from './components/SharedWithMe';
import Login from './components/Login';
import AdminPanel from './components/AdminPanel';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import StorageQuota from './components/StorageQuota';
import Search from './components/Search';
import TrashBin from './components/TrashBin';
import { AuthProvider, useAuth } from './contexts/AuthContext';

type TabType = 'files' | 'shared' | 'analytics' | 'trash' | 'admin';

function AppContent() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [folderToken, setFolderToken] = useState<string | null>(null);
  const [initialFolderId, setInitialFolderId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('files');
  const { user, loading, logout } = useAuth();

  useEffect(() => {
    console.log('Full URL:', window.location.href);
    console.log('Search params:', window.location.search);
    const params = new URLSearchParams(window.location.search);
    const shareParam = params.get('share');
    const folderParam = params.get('folder');
    const folderIdParam = params.get('folderId');
    console.log('Share token:', shareParam);
    console.log('Folder token:', folderParam);
    console.log('Folder ID:', folderIdParam);
    if (shareParam) {
      setShareToken(shareParam);
    }
    if (folderParam) {
      setFolderToken(folderParam);
    }
    if (folderIdParam) {
      setInitialFolderId(folderIdParam);
      setActiveTab('files');
    }
  }, []);

  const handleUploadComplete = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleLogout = async () => {
    await logout();
  };

  // Show shared file view if share token exists (public access)
  if (shareToken) {
    return <SharedFileView shareToken={shareToken} />;
  }

  // Show shared folder view if folder token exists (public access)
  if (folderToken) {
    return <SharedFolderView folderToken={folderToken} />;
  }

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show authentication screens if not logged in
  if (!user) {
    return <Login />;
  }

  // Main app content for authenticated users
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <header className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Share2 className="w-10 h-10 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-800">File Sharing</h1>
          </div>
          <p className="text-gray-600">Upload files and share them with anyone</p>
          
          <div className="mt-4 flex items-center justify-center gap-4">
            <span className="text-gray-700">Welcome, <strong>{user.name}</strong></span>
            {user.is_admin && (
              <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded">
                ADMIN
              </span>
            )}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>

          {/* Tabs */}
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <button
              onClick={() => setActiveTab('files')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
                activeTab === 'files'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Files className="w-4 h-4" />
              My Files
            </button>
            <button
              onClick={() => setActiveTab('shared')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
                activeTab === 'shared'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              Shared with Me
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
                activeTab === 'analytics'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Analytics
            </button>
            <button
              onClick={() => setActiveTab('trash')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
                activeTab === 'trash'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Trash2 className="w-4 h-4" />
              Trash
            </button>
            {user.is_admin && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors text-sm ${
                  activeTab === 'admin'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Users className="w-4 h-4" />
                Users
              </button>
            )}
          </div>

          {/* Search Bar */}
          <div className="mt-6 max-w-2xl mx-auto">
            <Search />
          </div>
        </header>

        {/* Storage Quota */}
        <div className="mb-6 max-w-md mx-auto">
          <StorageQuota refreshTrigger={refreshTrigger} />
        </div>

        {activeTab === 'files' ? (
          <div className="space-y-8">
            <section className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Upload File</h2>
              <FileUpload onUploadComplete={handleUploadComplete} />
            </section>

            <section className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Your Files</h2>
              <FolderView refreshTrigger={refreshTrigger} initialFolderId={initialFolderId} />
            </section>
          </div>
        ) : activeTab === 'shared' ? (
          <section className="bg-white rounded-lg shadow-lg p-6">
            <SharedWithMe />
          </section>
        ) : activeTab === 'analytics' ? (
          <section className="bg-white rounded-lg shadow-lg p-6">
            <AnalyticsDashboard isAdmin={user.is_admin === 1} />
          </section>
        ) : activeTab === 'trash' ? (
          <section className="bg-white rounded-lg shadow-lg p-6">
            <TrashBin />
          </section>
        ) : (
          <section className="bg-white rounded-lg shadow-lg p-6">
            <AdminPanel />
          </section>
        )}

        <footer className="text-center mt-12 text-gray-500 text-sm">
          <p>Securely share files with anyone using unique links</p>
        </footer>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
