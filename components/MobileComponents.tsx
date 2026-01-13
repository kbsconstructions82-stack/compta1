import React from 'react';
import { RefreshCw } from 'lucide-react';

interface PullToRefreshIndicatorProps {
  isRefreshing: boolean;
}

export const PullToRefreshIndicator: React.FC<PullToRefreshIndicatorProps> = ({
  isRefreshing,
}) => {
  if (!isRefreshing) return null;

  return (
    <div className="fixed top-16 left-1/2 transform -translate-x-1/2 z-50 bg-white/95 backdrop-blur-md rounded-full px-6 py-3 shadow-lg border border-white/50 animate-in fade-in slide-in-from-top">
      <div className="flex items-center gap-3">
        <RefreshCw size={20} className="text-indigo-600 animate-spin" />
        <span className="text-sm font-medium text-gray-700">
          Actualisation...
        </span>
      </div>
    </div>
  );
};

/**
 * Composant pour afficher un message toast sur mobile
 */
interface MobileToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
  duration?: number;
}

export const MobileToast: React.FC<MobileToastProps> = ({
  message,
  type = 'info',
  onClose,
  duration = 3000,
}) => {
  React.useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const bgColor = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
    info: 'bg-blue-50 border-blue-200',
  }[type];

  const textColor = {
    success: 'text-green-800',
    error: 'text-red-800',
    info: 'text-blue-800',
  }[type];

  return (
    <div
      className={`fixed bottom-24 left-4 right-4 lg:left-auto lg:right-4 lg:w-96 ${bgColor} backdrop-blur-md rounded-xl px-6 py-4 shadow-xl border z-50 animate-in fade-in slide-in-from-bottom`}
    >
      <p className={`text-sm font-medium ${textColor}`}>{message}</p>
    </div>
  );
};

/**
 * Loader fullscreen pour mobile
 */
interface MobileLoaderProps {
  message?: string;
}

export const MobileLoader: React.FC<MobileLoaderProps> = ({
  message = 'Chargement...',
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
        <p className="text-sm font-medium text-gray-700">{message}</p>
      </div>
    </div>
  );
};
