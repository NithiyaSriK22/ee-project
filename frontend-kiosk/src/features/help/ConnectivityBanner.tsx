import React, { useState, useEffect } from 'react';
import { WifiOff, AlertTriangle } from 'lucide-react';

export const ConnectivityBanner: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="bg-rose-600 text-white px-6 py-3 shadow-md flex items-center justify-between gap-4 font-semibold text-sm">
      <div className="flex items-center gap-3">
        <WifiOff className="w-5 h-5 flex-shrink-0 animate-bounce" />
        <span>
          <strong>Network Connection Offline:</strong> If you feel very unwell or need urgent care, please inform a hospital staff member immediately at Counter #1.
        </span>
      </div>
      <div className="hidden sm:flex items-center gap-2 text-xs bg-rose-700 px-3 py-1 rounded-lg">
        <AlertTriangle className="w-4 h-4 text-amber-300" />
        <span>உடனடி உதவிக்கு மருத்துவமனை பணியாளரை அணுகவும்</span>
      </div>
    </div>
  );
};
