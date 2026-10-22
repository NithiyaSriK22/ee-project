import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { redflagsApi } from '../api/redflags.api';
import { RedFlagAlert } from '../types/redflags.types';
import { AlertCard } from '../components/AlertCard';
import { AlertDetailPanel } from '../components/AlertDetailPanel';
import { ConnectionStatusIndicator } from '../components/ConnectionStatusIndicator';
import { AlertTriangle, Volume2, VolumeX, ShieldAlert, Filter } from 'lucide-react';

export const TriageQueuePage: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedAlert, setSelectedAlert] = useState<RedFlagAlert | null>(null);
  const [tierFilter, setTierFilter] = useState<string>('ALL');
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'polling' | 'disconnected'>('polling');

  // React Query with 10s polling fallback
  const { data: alerts = [], isLoading, refetch } = useQuery({
    queryKey: ['triage-alerts'],
    queryFn: () => redflagsApi.getAlerts(),
    refetchInterval: 10000,
  });

  // Setup Server-Sent Events (SSE) live stream
  useEffect(() => {
    let eventSource: EventSource | null = null;
    const token = localStorage.getItem('auth_token');

    try {
      // Connect to SSE stream
      eventSource = new EventSource(`/api/v1/triage/alerts/stream${token ? `?token=${token}` : ''}`);

      eventSource.onopen = () => {
        setConnectionStatus('connected');
      };

      eventSource.addEventListener('alert:raised', (e: MessageEvent) => {
        try {
          const newAlert: RedFlagAlert = JSON.parse(e.data);
          queryClient.invalidateQueries({ queryKey: ['triage-alerts'] });
          if (soundEnabled && newAlert.severityTier === 'IMMEDIATE') {
            playAlertSound();
          }
        } catch {}
      });

      eventSource.addEventListener('alert:updated', () => {
        queryClient.invalidateQueries({ queryKey: ['triage-alerts'] });
      });

      eventSource.addEventListener('alert:acknowledged', () => {
        queryClient.invalidateQueries({ queryKey: ['triage-alerts'] });
      });

      eventSource.addEventListener('alert:resolved', () => {
        queryClient.invalidateQueries({ queryKey: ['triage-alerts'] });
      });

      eventSource.addEventListener('alert:dismissed', () => {
        queryClient.invalidateQueries({ queryKey: ['triage-alerts'] });
      });

      eventSource.onerror = () => {
        setConnectionStatus('polling');
      };
    } catch {
      setConnectionStatus('polling');
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [queryClient, soundEnabled]);

  const playAlertSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      osc.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.3);
      gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.35);
    } catch {}
  };

  // Filter alerts
  const filteredAlerts = alerts.filter((a) => {
    if (tierFilter === 'ALL') return true;
    return a.severityTier === tierFilter;
  });

  // Keep selected alert synced with updated data
  useEffect(() => {
    if (selectedAlert) {
      const found = alerts.find((a) => a.id === selectedAlert.id);
      if (found) setSelectedAlert(found);
    } else if (alerts.length > 0) {
      setSelectedAlert(alerts[0]);
    }
  }, [alerts, selectedAlert]);

  return (
    <div className="space-y-6">
      {/* SECTION 24 MANDATORY CLINICAL DISCLAIMER */}
      <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-950 flex items-start gap-3 shadow-sm">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs sm:text-sm">
          <strong className="font-bold">Clinical Safety Notice:</strong> Alerts highlight patterns in what patients reported at the kiosk.
          Absence of an alert does <em>not</em> mean a patient is not in need of urgent care.
          Staff observation, bedside triage, and physician clinical judgment always take priority.
        </div>
      </div>

      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-3">
            <ShieldAlert className="w-7 h-7 text-rose-600" />
            <span>Emergency Triage Alert Queue</span>
          </h1>
          <p className="text-xs font-medium text-slate-500 mt-1">
            Real-time emergency detection and patient calls across all OPD kiosk stations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-bold transition-all ${
              soundEnabled
                ? 'bg-rose-100 border-rose-300 text-rose-800'
                : 'bg-slate-100 border-slate-300 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-rose-600" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
            <span>{soundEnabled ? 'Siren Audio ON' : 'Audio Muted'}</span>
          </button>

          <ConnectionStatusIndicator status={connectionStatus} onRefresh={() => refetch()} />
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-bold">
        <Filter className="w-4 h-4 text-slate-400 mr-1" />
        {['ALL', 'IMMEDIATE', 'MANUAL', 'URGENT', 'STAFF_CHECK'].map((tier) => (
          <button
            key={tier}
            onClick={() => setTierFilter(tier)}
            className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
              tierFilter === tier
                ? 'bg-slate-900 text-white shadow'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tier} {tier === 'ALL' ? `(${alerts.length})` : `(${alerts.filter((a) => a.severityTier === tier).length})`}
          </button>
        ))}
      </div>

      {/* Split Queue & Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[600px]">
        {/* Left: Alerts List */}
        <div className="lg:col-span-5 space-y-3 overflow-y-auto max-h-[750px] pr-1">
          {isLoading ? (
            <div className="p-8 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
              Loading active triage queue...
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
              <ShieldAlert className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <h4 className="font-bold text-slate-700">No Active Alerts</h4>
              <p className="text-xs text-slate-500 mt-1">No patients currently match emergency criteria in this filter view.</p>
            </div>
          ) : (
            filteredAlerts.map((alert) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                isSelected={selectedAlert?.id === alert.id}
                onSelect={(a) => setSelectedAlert(a)}
              />
            ))
          )}
        </div>

        {/* Right: Alert Detail & Actions Panel */}
        <div className="lg:col-span-7 h-[750px]">
          <AlertDetailPanel
            alert={selectedAlert}
            onAlertUpdated={(updated) => {
              setSelectedAlert(updated);
              queryClient.invalidateQueries({ queryKey: ['triage-alerts'] });
            }}
          />
        </div>
      </div>
    </div>
  );
};
