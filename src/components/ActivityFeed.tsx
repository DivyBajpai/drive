import React, { useState, useEffect } from 'react';
import { Activity, Download, Upload, Eye, Share2, Trash2, FolderPlus, Tag, Star, Filter } from 'lucide-react';

const API_URL = '/api';

interface ActivityItem {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  action_type: string;
  resource_type: 'file' | 'folder';
  resource_id: string;
  resource_name: string;
  details: string | null;
  created_at: string;
}

interface ActivityFeedProps {
  limit?: number;
}

const ActivityFeed: React.FC<ActivityFeedProps> = ({ limit = 50 }) => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('');
  const [resourceFilter, setResourceFilter] = useState<string>('');
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const actionIcons: { [key: string]: JSX.Element } = {
    upload: <Upload className="w-4 h-4 text-blue-500" />,
    download: <Download className="w-4 h-4 text-green-500" />,
    preview: <Eye className="w-4 h-4 text-purple-500" />,
    share: <Share2 className="w-4 h-4 text-indigo-500" />,
    delete: <Trash2 className="w-4 h-4 text-red-500" />,
    rename: <Activity className="w-4 h-4 text-orange-500" />,
    move: <Activity className="w-4 h-4 text-yellow-500" />,
    create_folder: <FolderPlus className="w-4 h-4 text-blue-500" />,
    delete_folder: <Trash2 className="w-4 h-4 text-red-500" />,
    rename_folder: <Activity className="w-4 h-4 text-orange-500" />,
    favorite: <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />,
    unfavorite: <Star className="w-4 h-4 text-gray-400" />,
    tag: <Tag className="w-4 h-4 text-pink-500" />,
    untag: <Tag className="w-4 h-4 text-gray-400" />,
  };

  const actionLabels: { [key: string]: string } = {
    upload: 'uploaded',
    download: 'downloaded',
    preview: 'previewed',
    share: 'shared',
    delete: 'deleted',
    rename: 'renamed',
    move: 'moved',
    create_folder: 'created folder',
    delete_folder: 'deleted folder',
    rename_folder: 'renamed folder',
    favorite: 'starred',
    unfavorite: 'unstarred',
    tag: 'tagged',
    untag: 'untagged',
  };

  useEffect(() => {
    loadActivities(0, true);
  }, [actionFilter, resourceFilter]);

  const loadActivities = async (currentOffset: number, reset: boolean = false) => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: currentOffset.toString(),
      });
      
      if (actionFilter) params.append('action_type', actionFilter);
      if (resourceFilter) params.append('resource_type', resourceFilter);

      const response = await fetch(`${API_URL}/activity.php?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load activity feed');
      }

      const data = await response.json();
      
      if (reset) {
        setActivities(data.activities || []);
      } else {
        setActivities(prev => [...prev, ...(data.activities || [])]);
      }
      
      setHasMore((data.activities || []).length === limit);
      setOffset(currentOffset);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load activities');
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    const newOffset = offset + limit;
    loadActivities(newOffset, false);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 7) {
      return date.toLocaleDateString();
    } else if (days > 0) {
      return `${days}d ago`;
    } else if (hours > 0) {
      return `${hours}h ago`;
    } else if (minutes > 0) {
      return `${minutes}m ago`;
    } else {
      return 'Just now';
    }
  };

  if (loading && activities.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">Loading activity...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-4 items-center bg-white p-4 rounded-lg shadow">
        <Filter className="w-5 h-5 text-gray-400" />
        
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All actions</option>
          <option value="upload">Uploads</option>
          <option value="download">Downloads</option>
          <option value="preview">Previews</option>
          <option value="share">Shares</option>
          <option value="delete">Deletes</option>
          <option value="favorite">Favorites</option>
          <option value="tag">Tags</option>
        </select>

        <select
          value={resourceFilter}
          onChange={(e) => setResourceFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All resources</option>
          <option value="file">Files</option>
          <option value="folder">Folders</option>
        </select>
      </div>

      {/* Activity List */}
      <div className="bg-white rounded-lg shadow">
        {error && (
          <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
            {error}
          </div>
        )}

        {activities.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Activity className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No activity yet</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {activities.map((activity) => (
              <div key={activity.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    {actionIcons[activity.action_type] || <Activity className="w-4 h-4 text-gray-400" />}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">{activity.user_name}</span>
                      {' '}
                      <span className="text-gray-600">{actionLabels[activity.action_type] || activity.action_type}</span>
                      {' '}
                      <span className="font-medium text-blue-600">{activity.resource_name}</span>
                    </p>
                    
                    {activity.details && (
                      <p className="mt-1 text-xs text-gray-500">{activity.details}</p>
                    )}
                    
                    <p className="mt-1 text-xs text-gray-400">
                      {formatTime(activity.created_at)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Load More */}
        {hasMore && activities.length > 0 && (
          <div className="p-4 border-t border-gray-100">
            <button
              onClick={loadMore}
              className="w-full px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
            >
              Load more
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityFeed;
