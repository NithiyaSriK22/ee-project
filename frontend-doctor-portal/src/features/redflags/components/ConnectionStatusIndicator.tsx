import React from 'react';
import { Wifi, RefreshCw } from 'lucide-react';

interface ConnectionStatusIndicatorProps {
  status: 'connected' | 'polling' | 'disconnected';
  onRefresh?: () => void;
}

export const ConnectionStatusIndicator: React.FC<ConnectionStatusIndicatorProps> = ({
  status,
  onRefresh,
}) => {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-slate-100 border border-slate-200">
        <span
          className={`w-2.5 h-2.5 rounded-full ${
            status === 'connected'
              ? 'bg-emerald-500 animate-pulse'
              : status === 'polling'
              ? 'bg-amber-500 animate-spin'
              : 'bg-rose-500'
          }`}
        />
        <span className="text-slate-700">
          {status === 'connected'
            ? 'Live Stream (SSE)'
            : status === 'polling'
            ? 'Polling Queue (10s)'
            : 'Connection Lost'}
        </span>
        <Wifi className="w-3.5 h-3.5 text-slate-400" />
      </div>

      {onRefresh && (
        <button
          onClick={onRefresh}
          title="Refresh Queue"
          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
