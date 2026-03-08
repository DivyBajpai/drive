import { useState, useEffect } from 'react';
import { HardDrive, AlertTriangle } from 'lucide-react';
import { API_BASE } from '../config/api';

interface StorageQuotaProps {
  refreshTrigger?: number;
}

interface StorageData {
  quota: number;
  used: number;
  available: number;
  percentage: number;
}

export default function StorageQuota({ refreshTrigger = 0 }: StorageQuotaProps) {
  const [storage, setStorage] = useState<StorageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStorage();
  }, [refreshTrigger]);

  const loadStorage = async () => {
    try {
      const sessionToken = localStorage.getItem('session_token');
      const response = await fetch(`${API_BASE}/storage.php`, {
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStorage(data);
      }
    } catch (error) {
      console.error('Storage error:', error);
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

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-orange-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  if (loading || !storage) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-gray-100 flex items-center justify-center">
            <HardDrive className="w-5 h-5 text-gray-500" />
          </div>
          <span className="text-sm font-medium text-gray-500">Loading storage...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-blue-50 flex items-center justify-center">
            <HardDrive className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <span className="block text-sm font-semibold text-gray-900">Storage</span>
            <span className="block text-xs text-gray-500">Current usage overview</span>
          </div>
        </div>
        {storage.percentage >= 90 && (
          <AlertTriangle className="w-5 h-5 text-red-500" />
        )}
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-end text-sm">
          <span className="font-medium text-gray-900">{formatFileSize(storage.used)} used</span>
          <span className="text-gray-600">Unlimited total</span>
        </div>

        <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${getProgressColor(storage.percentage)}`}
            style={{ width: `${Math.min(storage.percentage, 100)}%` }}
          ></div>
        </div>

        <div className="flex justify-between text-xs text-gray-500">
          <span>{storage.percentage.toFixed(1)}% used</span>
          <span>Unlimited available</span>
        </div>

        {storage.percentage >= 90 && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 leading-relaxed">
            <strong className="font-semibold">Warning:</strong> You're running low on storage space. Consider deleting unused files.
          </div>
        )}
      </div>
    </div>
  );
}
