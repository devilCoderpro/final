import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus.ts';
import { WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-20 md:bottom-4 left-4 right-4 md:right-auto md:max-w-md z-50 flex items-center gap-2.5 rounded-xl bg-amber-600/95 backdrop-blur-md px-4 py-2.5 text-xs font-semibold text-white shadow-xl shadow-amber-900/40 border border-amber-400/30 animate-in slide-in-from-bottom-2 duration-200">
      <WifiOff className="w-4 h-4 shrink-0 text-amber-100 animate-pulse" />
      <span className="flex-1">
        Offline Mode active — Showing cached data. Actions will sync when connection returns.
      </span>
    </div>
  );
};
