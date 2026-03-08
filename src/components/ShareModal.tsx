import { useState, useEffect } from 'react';
import { X, UserPlus, Mail, Trash2 } from 'lucide-react';
import { API_BASE } from '../config/api';

interface ShareModalProps {
  resourceType: 'file' | 'folder';
  resourceId: string;
  resourceName: string;
  onClose: () => void;
}

interface Share {
  id: string;
  user_id: string;
  email: string;
  name: string;
  permission: 'view' | 'edit';
  created_at: string;
}

export default function ShareModal({ resourceType, resourceId, resourceName, onClose }: ShareModalProps) {
  const [email, setEmail] = useState('');
  const [emails, setEmails] = useState<string[]>([]);
  const [shares, setShares] = useState<Share[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    loadShares();
  }, []);

  const loadShares = async () => {
    try {
      const sessionToken = localStorage.getItem('session_token');
      const response = await fetch(
        `${API_BASE}/shares.php?resource_type=${resourceType}&resource_id=${resourceId}`,
        {
          headers: {
            'Authorization': `Bearer ${sessionToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setShares(data);
      }
    } catch (error) {
      console.error('Error loading shares:', error);
    }
  };

  const handleAddEmail = () => {
    const trimmedEmail = email.trim().toLowerCase();
    
    if (!trimmedEmail) return;
    
    // Simple email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setMessage({ type: 'error', text: 'Invalid email format' });
      return;
    }
    
    if (emails.includes(trimmedEmail)) {
      setMessage({ type: 'error', text: 'Email already added' });
      return;
    }
    
    setEmails([...emails, trimmedEmail]);
    setEmail('');
    setMessage(null);
  };

  const handleRemoveEmail = (emailToRemove: string) => {
    setEmails(emails.filter(e => e !== emailToRemove));
  };

  const handleShare = async () => {
    if (emails.length === 0) {
      setMessage({ type: 'error', text: 'Please add at least one email' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const sessionToken = localStorage.getItem('session_token');
      const response = await fetch(`${API_BASE}/shares.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          resource_type: resourceType,
          resource_id: resourceId,
          emails: emails,
          permission: 'view',
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ 
          type: 'success', 
          text: `Shared with ${data.shared_with} user(s)${data.errors.length > 0 ? '. Some errors occurred.' : ''}` 
        });
        setEmails([]);
        loadShares(); // Reload the shares list
        
        if (data.errors.length > 0) {
          console.log('Share errors:', data.errors);
        }
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to share' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error occurred' });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveShare = async (shareId: string) => {
    if (!confirm('Remove this user\'s access?')) return;

    try {
      const sessionToken = localStorage.getItem('session_token');
      const response = await fetch(`${API_BASE}/shares.php?id=${shareId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
        },
      });

      if (response.ok) {
        loadShares();
        setMessage({ type: 'success', text: 'Access removed' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to remove access' });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddEmail();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-gray-800">Share "{resourceName}"</h3>
              <p className="text-sm text-gray-600 mt-1">
                Share this {resourceType} with other users by email
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Add users section */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Add people
            </label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Enter email address"
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={handleAddEmail}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Add
              </button>
            </div>

            {/* Email list */}
            {emails.length > 0 && (
              <div className="mt-3 space-y-2">
                {emails.map((e) => (
                  <div key={e} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded">
                    <span className="text-sm text-gray-700">{e}</span>
                    <button
                      onClick={() => handleRemoveEmail(e)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Share button */}
            {emails.length > 0 && (
              <button
                onClick={handleShare}
                disabled={loading}
                className="mt-3 w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Sharing...' : `Share with ${emails.length} ${emails.length === 1 ? 'person' : 'people'}`}
              </button>
            )}
          </div>

          {/* Message */}
          {message && (
            <div className={`mb-4 p-3 rounded-lg ${
              message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}>
              {message.text}
            </div>
          )}

          {/* People with access */}
          {shares.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">
                People with access ({shares.length})
              </h4>
              <div className="space-y-2">
                {shares.map((share) => (
                  <div key={share.id} className="flex items-center justify-between bg-gray-50 px-4 py-3 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{share.name}</p>
                      <p className="text-sm text-gray-600">{share.email}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-gray-600 capitalize">{share.permission}</span>
                      <button
                        onClick={() => handleRemoveShare(share.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Remove access"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
