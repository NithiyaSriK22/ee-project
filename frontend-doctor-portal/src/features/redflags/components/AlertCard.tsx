import React from 'react';
import { RedFlagAlert } from '../types/redflags.types';
import { AlertCircle, Clock, MapPin, HandMetal, AlertTriangle, CheckSquare } from 'lucide-react';

interface AlertCardProps {
  alert: RedFlagAlert;
  isSelected?: boolean;
  onSelect: (alert: RedFlagAlert) => void;
}

export const AlertCard: React.FC<AlertCardProps> = ({ alert, isSelected = false, onSelect }) => {
  const getTierConfig = (tier: string) => {
    switch (tier) {
      case 'IMMEDIATE':
        return {
          badgeBg: 'bg-rose-100 text-rose-800 border-rose-300',
          indicator: 'bg-rose-600',
          icon: <AlertCircle className="w-5 h-5 text-rose-600 animate-bounce" />,
          label: 'IMMEDIATE / Assess Now',
        };
      case 'MANUAL':
        return {
          badgeBg: 'bg-purple-100 text-purple-800 border-purple-300',
          indicator: 'bg-purple-600',
          icon: <HandMetal className="w-5 h-5 text-purple-600" />,
          label: 'MANUAL HELP / Patient Call',
        };
      case 'URGENT':
        return {
          badgeBg: 'bg-amber-100 text-amber-800 border-amber-300',
          indicator: 'bg-amber-600',
          icon: <AlertTriangle className="w-5 h-5 text-amber-600" />,
          label: 'URGENT / Ahead of Queue',
        };
      case 'STAFF_CHECK':
      default:
        return {
          badgeBg: 'bg-sky-100 text-sky-800 border-sky-300',
          indicator: 'bg-sky-600',
          icon: <CheckSquare className="w-5 h-5 text-sky-600" />,
          label: 'STAFF CHECK / Verify Detail',
        };
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'RAISED':
        return 'bg-rose-50 text-rose-700 border-rose-200 font-black';
      case 'ACKNOWLEDGED':
        return 'bg-amber-50 text-amber-700 border-amber-200 font-semibold';
      case 'IN_ASSESSMENT':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200 font-semibold';
      case 'ESCALATED':
        return 'bg-red-50 text-red-800 border-red-300 font-black animate-pulse';
      case 'RESOLVED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'DISMISSED':
        return 'bg-slate-100 text-slate-500 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const tier = getTierConfig(alert.severityTier);
  const timeWaiting = getTimeWaiting(alert.raisedAt);

  return (
    <div
      onClick={() => onSelect(alert)}
      className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
        isSelected
          ? 'border-sky-600 bg-sky-50/50 shadow-md ring-2 ring-sky-200'
          : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/80 shadow-sm'
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          {tier.icon}
          <span className={`text-xs font-black px-2.5 py-1 rounded-md border ${tier.badgeBg}`}>
            {tier.label}
          </span>
        </div>

        <span className={`text-xs px-2.5 py-0.5 rounded-full border ${getStatusBadge(alert.status)}`}>
          {alert.status}
        </span>
      </div>

      <div className="space-y-1.5 my-2">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <MapPin className="w-4 h-4 text-slate-500 flex-shrink-0" />
          <span>{alert.kioskLocation}</span>
        </div>

        <p className="text-xs font-medium text-slate-600 line-clamp-2">
          {alert.ruleDescription || 'Clinical triage pattern matched'}
        </p>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100 mt-2">
        <div className="flex items-center gap-1 font-mono">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>{timeWaiting}</span>
        </div>

        {alert.escalationLevel > 0 && (
          <span className="text-red-600 font-bold bg-red-100 px-2 py-0.5 rounded text-[11px]">
            Escalation L{alert.escalationLevel}
          </span>
        )}

        <span className="font-mono text-[11px] text-slate-400">
          {alert.ruleCode ? `${alert.ruleCode} (v${alert.ruleVersion || 1})` : 'MANUAL'}
        </span>
      </div>
    </div>
  );
};

function getTimeWaiting(raisedAt: string): string {
  const diffSec = Math.floor((Date.now() - new Date(raisedAt).getTime()) / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  return `${diffHours}h ago`;
}
