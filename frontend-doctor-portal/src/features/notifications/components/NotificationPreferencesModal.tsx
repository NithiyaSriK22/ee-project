import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Shield, Lock, Bell, Check, Smartphone, Monitor } from 'lucide-react';
import { notificationsApi } from '../notifications.api';
import { NotificationPreference, NotificationType } from '../types';

interface NotificationPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MANDATORY_TYPES: NotificationType[] = ['SYSTEM_ANNOUNCEMENT', 'KIOSK_OFFLINE'];

const NOTIFICATION_TYPE_META: { type: NotificationType; label: string; description: string }[] = [
  {
    type: 'SUMMARY_READY',
    label: 'Clinical Case Summary Ready',
    description: 'Alerts when a patient completes an interview and their draft summary is compiled for review.',
  },
  {
    type: 'SUMMARY_FAILED',
    label: 'Summary Generation Fallback',
    description: 'Alerts when AI compilation fails and raw interview transcripts should be inspected directly.',
  },
  {
    type: 'INTERVIEW_ABANDONED',
    label: 'Kiosk Interview Abandoned',
    description: 'Notifies staff when a patient leaves mid-interview or the session inactivity timeout triggers.',
  },
  {
    type: 'DOCUMENT_RESCAN_NEEDED',
    label: 'Document Rescan Needed',
    description: 'Notifies when an uploaded lab slip, prescription, or report failed OCR validation.',
  },
  {
    type: 'VOICE_ASSIST_SUGGESTED',
    label: 'Voice Recognition Assistance',
    description: 'Alerts when a patient experiences multiple voice recognition retries at a kiosk.',
  },
  {
    type: 'KIOSK_OFFLINE',
    label: 'Kiosk Device Offline (Mandatory)',
    description: 'Urgent operational notification when a kiosk misses scheduled heartbeats.',
  },
  {
    type: 'SYSTEM_ANNOUNCEMENT',
    label: 'System Maintenance & Announcements (Mandatory)',
    description: 'Hospital IT and clinical engineering maintenance alerts.',
  },
];

export const NotificationPreferencesModal: React.FC<NotificationPreferencesModalProps> = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const [preferences, setPreferences] = useState<Record<NotificationType, { inApp: boolean; sms: boolean }>>({} as any);

  const { data: serverPreferences = [] } = useQuery<NotificationPreference[]>({
    queryKey: ['notification-preferences'],
    queryFn: () => notificationsApi.getPreferences(),
    enabled: isOpen,
  });

  useEffect(() => {
    if (serverPreferences.length > 0) {
      const map: any = {};
      serverPreferences.forEach((pref) => {
        map[pref.notificationType] = {
          inApp: pref.inAppEnabled,
          sms: pref.smsEnabled,
        };
      });
      // Set defaults for any missing
      NOTIFICATION_TYPE_META.forEach((item) => {
        if (!map[item.type]) {
          map[item.type] = {
            inApp: true,
            sms: false,
          };
        }
      });
      setPreferences(map);
    } else {
      const initial: any = {};
      NOTIFICATION_TYPE_META.forEach((item) => {
        initial[item.type] = {
          inApp: true,
          sms: false,
        };
      });
      setPreferences(initial);
    }
  }, [serverPreferences]);

  const updateMutation = useMutation({
    mutationFn: ({ type, inApp, sms }: { type: NotificationType; inApp: boolean; sms: boolean }) =>
      notificationsApi.updatePreference(type, { inAppEnabled: inApp, smsEnabled: sms }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
    },
  });

  const handleToggle = (type: NotificationType, channel: 'inApp' | 'sms') => {
    const isMandatory = MANDATORY_TYPES.includes(type);
    if (isMandatory && channel === 'inApp') return; // Cannot disable mandatory in-app alerts

    const current = preferences[type] || { inApp: true, sms: false };
    const updated = {
      ...current,
      [channel]: !current[channel],
    };

    setPreferences((prev) => ({
      ...prev,
      [type]: updated,
    }));

    updateMutation.mutate({
      type,
      inApp: updated.inApp,
      sms: updated.sms,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
        {/* Header */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-red-600" />
            <div>
              <h3 className="text-base font-bold text-slate-900">Notification Preferences</h3>
              <p className="text-xs text-slate-500">Configure your operational notification channels and alerts.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Clinical Boundary Reminder */}
        <div className="p-3 bg-red-50/70 border-b border-red-100 flex items-start gap-2.5 text-xs text-red-900">
          <Shield className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <p>
            <strong>Operational Boundaries:</strong> Operational notifications convey administrative status only. They
            never include patient clinical facts, symptoms, or diagnoses. Emergency triage red-flags are routed
            exclusively through Module 6.
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="flex items-center justify-between px-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
            <span>Notification Category</span>
            <div className="flex items-center gap-8 mr-2">
              <span className="flex items-center gap-1">
                <Monitor className="w-3.5 h-3.5" /> In-App
              </span>
              <span className="flex items-center gap-1">
                <Smartphone className="w-3.5 h-3.5" /> SMS (Staff)
              </span>
            </div>
          </div>

          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
            {NOTIFICATION_TYPE_META.map((meta) => {
              const pref = preferences[meta.type] || { inApp: true, sms: false };
              const isMandatory = MANDATORY_TYPES.includes(meta.type);

              return (
                <div key={meta.type} className="p-3.5 bg-white hover:bg-slate-50/50 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-slate-900">{meta.label}</span>
                      {isMandatory && (
                        <span className="px-1.5 py-0.2 bg-slate-100 text-slate-600 text-[10px] font-bold rounded flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" /> Mandatory
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 leading-normal">{meta.description}</p>
                  </div>

                  <div className="flex items-center gap-8 shrink-0">
                    {/* In-App Toggle */}
                    <button
                      type="button"
                      disabled={isMandatory}
                      onClick={() => handleToggle(meta.type, 'inApp')}
                      className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                        pref.inApp ? 'bg-red-600' : 'bg-slate-200'
                      } ${isMandatory ? 'opacity-60 cursor-not-allowed' : ''}`}
                      title={isMandatory ? 'Mandatory system notification cannot be disabled' : 'Toggle in-app alert'}
                    >
                      <div
                        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                          pref.inApp ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>

                    {/* SMS Toggle */}
                    <button
                      type="button"
                      onClick={() => handleToggle(meta.type, 'sms')}
                      className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                        pref.sms ? 'bg-red-600' : 'bg-slate-200'
                      }`}
                      title="Toggle SMS notifications (requires verified hospital phone number)"
                    >
                      <div
                        className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                          pref.sms ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500 flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-emerald-600" /> Changes saved automatically
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
