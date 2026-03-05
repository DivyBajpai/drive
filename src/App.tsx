import { useState, useEffect } from 'react';
import { Share2 } from 'lucide-react';
import FileUpload from './components/FileUpload';
import FileList from './components/FileList';
import SharedFileView from './components/SharedFileView';

function App() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [shareToken, setShareToken] = useState<string | null>(null);

  useEffect(() => {
    console.log('Full URL:', window.location.href);
    console.log('Search params:', window.location.search);
    const params = new URLSearchParams(window.location.search);
    const token = params.get('share');
    console.log('Share token:', token);
    if (token) {
      setShareToken(token);
    }
  }, []);

  const handleUploadComplete = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  if (shareToken) {
    return <SharedFileView shareToken={shareToken} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <header className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Share2 className="w-10 h-10 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-800">File Sharing</h1>
          </div>
          <p className="text-gray-600">Upload files and share them with anyone</p>
        </header>

        <div className="space-y-8">
          <section className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Upload File</h2>
            <FileUpload onUploadComplete={handleUploadComplete} />
          </section>

          <section className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Your Files</h2>
            <FileList refreshTrigger={refreshTrigger} />
          </section>
        </div>

        <footer className="text-center mt-12 text-gray-500 text-sm">
          <p>Securely share files with anyone using unique links</p>
        </footer>
      </div>
    </div>
  );
}

export default App;
