import React, { useState, useEffect } from 'react';
import { WifiOff, AlertCircle } from 'lucide-react';
import { LocalAnswerStore } from './LocalAnswerStore';

interface OfflineIndicatorProps {
  visitId?: string;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ visitId }) => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [pendingCount, setPendingCount] = useState<number>(0);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check pending count
    if (visitId) {
      const items = LocalAnswerStore.getAnswersForVisit(visitId);
      setPendingCount(items.length);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [visitId]);

  if (isOnline && pendingCount === 0) {
    return null;
  }

  return (
    <div className="bg-amber-50 border-b-2 border-amber-300 px-6 py-2.5 text-amber-900 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-2 text-sm font-semibold">
      <div className="flex items-center gap-2.5">
        <WifiOff className="w-5 h-5 text-amber-700 flex-shrink-0" />
        <span>
          Working Offline — Your responses are saved securely on this kiosk and will sync automatically.
          {pendingCount > 0 && ` (${pendingCount} answers stored)`}
        </span>
      </div>

      <div className="flex items-center gap-2 text-xs text-amber-800 bg-amber-100/80 px-3 py-1 rounded-lg border border-amber-300">
        <AlertCircle className="w-4 h-4 text-amber-700" />
        <span>If you feel very unwell, please inform a hospital staff member immediately.</span>
      </div>
    </div>
  );
};
