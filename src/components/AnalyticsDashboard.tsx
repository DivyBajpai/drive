import { useState, useEffect } from 'react';
import { BarChart3, Users, Files, HardDrive, Download, TrendingUp, Activity } from 'lucide-react';

const API_BASE = '/api';

interface SystemAnalytics {
  total_users: number;
  active_users: number;
  total_files: number;
  files_this_month: number;
  total_storage: number;
  total_downloads: number;
}

interface PersonalAnalytics {
  total_files: number;
  total_folders: number;
  storage_used: number;
  total_downloads: number;
  files_this_month: number;
  shared_by_me: number;
  shared_with_me: number;
}

interface FileType {
  mime_type: string;
  count: number;
}

interface AnalyticsData {
  system?: {
    total_users: number;
    active_users: number;
    total_files: number;
    files_this_month: number;
    total_storage: number;
    total_downloads: number;
  };
  personal?: PersonalAnalytics;
  top_file_types?: FileType[];
  file_types?: FileType[];
}

interface AnalyticsDashboardProps {
  isAdmin: boolean;
}

export default function AnalyticsDashboard({ isAdmin }: AnalyticsDashboardProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const sessionToken = localStorage.getItem('session_token');
      const response = await fetch(`${API_BASE}/analytics.php`, {
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
        },
      });

      if (response.ok) {
        const analytics = await response.json();
        setData(analytics);
      }
    } catch (error) {
      console.error('Analytics error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatMimeType = (mime: string) => {
    const parts = mime.split('/');
    return parts[0] || mime;
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading analytics...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Failed to load analytics</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <BarChart3 className="w-8 h-8 text-blue-600" />
        <h2 className="text-2xl font-bold text-gray-800">
          {isAdmin ? 'System Analytics' : 'My Analytics'}
        </h2>
      </div>

      {/* Admin: System Stats */}
      {isAdmin && data.system && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">Total Users</p>
                  <p className="text-3xl font-bold text-gray-800 mt-1">{data.system.total_users}</p>
                  <p className="text-sm text-green-600 mt-1">
                    {data.system.active_users} active this month
                  </p>
                </div>
                <Users className="w-12 h-12 text-blue-500 opacity-50" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">Total Files</p>
                  <p className="text-3xl font-bold text-gray-800 mt-1">{data.system.total_files.toLocaleString()}</p>
                  <p className="text-sm text-green-600 mt-1">
                    +{data.system.files_this_month} this month
                  </p>
                </div>
                <Files className="w-12 h-12 text-purple-500 opacity-50" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">Total Storage</p>
                  <p className="text-3xl font-bold text-gray-800 mt-1">
                    {formatFileSize(data.system.total_storage)}
                  </p>
                  <p className="text-sm text-blue-600 mt-1">
                    {data.system.total_downloads.toLocaleString()} downloads
                  </p>
                </div>
                <HardDrive className="w-12 h-12 text-green-500 opacity-50" />
              </div>
            </div>
          </div>

          {/* File Types Chart */}
          {data.top_file_types && data.top_file_types.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Top File Types</h3>
              <div className="space-y-3">
                {data.top_file_types.map((type, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-32 text-sm text-gray-600 capitalize">
                      {formatMimeType(type.mime_type)}
                    </div>
                    <div className="flex-1 bg-gray-200 rounded-full h-6 overflow-hidden">
                      <div
                        className="bg-blue-500 h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min((type.count / data.top_file_types![0].count) * 100, 100)}%`
                        }}
                      ></div>
                    </div>
                    <div className="w-16 text-sm text-gray-800 font-semibold text-right">
                      {type.count}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Regular User: Personal Stats */}
      {!isAdmin && data.personal && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">My Files</p>
                  <p className="text-2xl font-bold text-gray-800 mt-1">{data.personal.total_files}</p>
                </div>
                <Files className="w-10 h-10 text-blue-500 opacity-50" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">Storage Used</p>
                  <p className="text-2xl font-bold text-gray-800 mt-1">
                    {formatFileSize(data.personal.storage_used)}
                  </p>
                </div>
                <HardDrive className="w-10 h-10 text-green-500 opacity-50" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">Total Downloads</p>
                  <p className="text-2xl font-bold text-gray-800 mt-1">{data.personal.total_downloads}</p>
                </div>
                <Download className="w-10 h-10 text-purple-500 opacity-50" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm">This Month</p>
                  <p className="text-2xl font-bold text-gray-800 mt-1">{data.personal.files_this_month}</p>
                </div>
                <TrendingUp className="w-10 h-10 text-orange-500 opacity-50" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-500 text-sm">Folders</p>
              <p className="text-3xl font-bold text-gray-800 mt-2">{data.personal.total_folders}</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-500 text-sm">Shared by Me</p>
              <p className="text-3xl font-bold text-gray-800 mt-2">{data.personal.shared_by_me}</p>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-500 text-sm">Shared with Me</p>
              <p className="text-3xl font-bold text-gray-800 mt-2">{data.personal.shared_with_me}</p>
            </div>
          </div>

          {/* My File Types */}
          {data.file_types && data.file_types.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">My File Types</h3>
              <div className="space-y-3">
                {data.file_types.map((type, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-32 text-sm text-gray-600 capitalize">
                      {formatMimeType(type.mime_type)}
                    </div>
                    <div className="flex-1 bg-gray-200 rounded-full h-6 overflow-hidden">
                      <div
                        className="bg-purple-500 h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.min((type.count / data.file_types![0].count) * 100, 100)}%`
                        }}
                      ></div>
                    </div>
                    <div className="w-16 text-sm text-gray-800 font-semibold text-right">
                      {type.count}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
