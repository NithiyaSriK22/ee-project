import React, { useState } from 'react';
import { VisitQueueEntryDTO } from '../types/doctor-review.types';
import {
  Users,
  AlertTriangle,
  Clock,
  ShieldAlert,
  UserCheck,
} from 'lucide-react';

interface QueuePanelProps {
  entries: VisitQueueEntryDTO[];
  selectedVisitId?: string;
  currentDoctorId?: string;
  onSelectVisit: (visitId: string, outOfQueueReason?: string) => void;
  onRefresh?: () => void;
}

export const QueuePanel: React.FC<QueuePanelProps> = ({
  entries,
  selectedVisitId,
  currentDoctorId,
  onSelectVisit,
  onRefresh,
}) => {
  const [filter, setFilter] = useState<'ALL' | 'ALERTS' | 'READY'>('ALL');
  const [outOfQueueModalVisit, setOutOfQueueModalVisit] = useState<VisitQueueEntryDTO | null>(null);
  const [outOfQueueReason, setOutOfQueueReason] = useState<string>('');

  const filteredEntries = entries.filter((e) => {
    if (filter === 'ALERTS') return e.hasOpenAlert;
    if (filter === 'READY') return e.queueStatus === 'READY_FOR_REVIEW';
    return true;
  });

  const handleEntryClick = (entry: VisitQueueEntryDTO) => {
    // If the visit is assigned to someone else or in a different department, prompt for reason
    if (entry.assignedDoctorId && currentDoctorId && entry.assignedDoctorId !== currentDoctorId) {
      setOutOfQueueModalVisit(entry);
      setOutOfQueueReason('');
      return;
    }
    onSelectVisit(entry.visitId);
  };

  const handleConfirmOutOfQueue = () => {
    if (!outOfQueueModalVisit) return;
    if (!outOfQueueReason.trim()) {
      alert('Please enter a clinical justification for out-of-queue access.');
      return;
    }
    onSelectVisit(outOfQueueModalVisit.visitId, outOfQueueReason.trim());
    setOutOfQueueModalVisit(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'READY_FOR_REVIEW':
        return (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
            Ready
          </span>
        );
      case 'IN_CONSULTATION':
        return (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
            In Consult
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
            Completed
          </span>
        );
      case 'WAITING':
      default:
        return (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
            Waiting
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-3.5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-red-600" />
          <h3 className="font-bold text-slate-900 text-sm">Patient Review Queue</h3>
          <span className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full font-bold border border-red-200">
            {entries.length}
          </span>
        </div>

        {onRefresh && (
          <button
            onClick={onRefresh}
            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
            title="Refresh queue"
          >
            <Clock className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex border-b border-slate-100 bg-slate-50 text-xs">
        <button
          onClick={() => setFilter('ALL')}
          className={`flex-1 py-1.5 font-semibold text-center transition-colors ${
            filter === 'ALL'
              ? 'text-red-700 border-b-2 border-red-600 bg-white font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          All ({entries.length})
        </button>
        <button
          onClick={() => setFilter('ALERTS')}
          className={`flex-1 py-1.5 font-semibold text-center transition-colors ${
            filter === 'ALERTS'
              ? 'text-red-700 border-b-2 border-red-600 bg-white font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Alerts ({entries.filter((e) => e.hasOpenAlert).length})
        </button>
        <button
          onClick={() => setFilter('READY')}
          className={`flex-1 py-1.5 font-semibold text-center transition-colors ${
            filter === 'READY'
              ? 'text-red-700 border-b-2 border-red-600 bg-white font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Ready ({entries.filter((e) => e.queueStatus === 'READY_FOR_REVIEW').length})
        </button>
      </div>

      {/* Queue List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
        {filteredEntries.map((entry) => {
          const isSelected = selectedVisitId === entry.visitId;
          const isAssignedToOther =
            entry.assignedDoctorId && currentDoctorId && entry.assignedDoctorId !== currentDoctorId;

          return (
            <div
              key={entry.id}
              onClick={() => handleEntryClick(entry)}
              className={`p-3 transition-colors cursor-pointer text-xs ${
                isSelected
                  ? 'bg-red-50/80 border-l-4 border-l-red-600 text-slate-900 font-medium'
                  : entry.hasOpenAlert
                  ? 'bg-rose-50/30 hover:bg-rose-50/60 border-l-2 border-l-rose-500'
                  : 'hover:bg-slate-50 text-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-900">
                  {entry.hasOpenAlert && (
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0 animate-pulse" />
                  )}
                  <span className="truncate max-w-[130px]">{entry.patientTokenOrName}</span>
                </div>
                {getStatusBadge(entry.queueStatus)}
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span className="font-mono">{entry.department}</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  {entry.readyAt
                    ? new Date(entry.readyAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : 'Intake'}
                </span>
              </div>

              {isAssignedToOther && (
                <div className="mt-1 text-[10px] text-amber-700 flex items-center gap-1 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                  <UserCheck className="w-3 h-3" /> Assigned to other physician
                </div>
              )}
            </div>
          );
        })}

        {filteredEntries.length === 0 && (
          <div className="p-6 text-center text-xs text-slate-400">
            No patients match the selected filter.
          </div>
        )}
      </div>

      {/* Out of queue access modal */}
      {outOfQueueModalVisit && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-amber-200 space-y-4">
            <div className="flex items-center gap-3 text-amber-800">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <ShieldAlert className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Out-of-Queue Access Audit</h3>
                <p className="text-xs text-slate-500">
                  This patient is assigned to another physician or department.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg text-xs space-y-1">
              <div>
                Patient: <strong>{outOfQueueModalVisit.patientTokenOrName}</strong>
              </div>
              <div>
                Department: <strong>{outOfQueueModalVisit.department}</strong>
              </div>
              <div>
                Visit ID: <code className="font-mono">{outOfQueueModalVisit.visitId}</code>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Typed Clinical Justification (Required & Audited):
              </label>
              <textarea
                value={outOfQueueReason}
                onChange={(e) => setOutOfQueueReason(e.target.value)}
                rows={3}
                placeholder="e.g. Covering for colleague on OPD break, urgent cross-consultation..."
                className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setOutOfQueueModalVisit(null)}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmOutOfQueue}
                disabled={!outOfQueueReason.trim()}
                className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50"
              >
                Proceed & Log Audit Event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
