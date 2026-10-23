import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  Filter,
  CheckCircle2,
  AlertCircle,
  FileCheck2,
  FileX,
  UserX,
  Volume2,
  WifiOff,
  Radio,
  ExternalLink,
  ShieldAlert,
  Settings,
} from 'lucide-react';
import { notificationsApi } from '../notifications.api';
import { OperationalNotification, NotificationType } from '../types';
import { NotificationPreferencesModal } from '../components/NotificationPreferencesModal';

export const NotificationListPage: React.FC = () => {
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('');
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery<OperationalNotification[]>({
    queryKey: ['notifications-list', unreadOnly, selectedType],
    queryFn: () =>
      notificationsApi.getNotifications({
        unreadOnly: unreadOnly ? true : undefined,
        type: selectedType || undefined,
        limit: 100,
      }),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-list'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-list'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });

  const getTypeIcon = (type: NotificationType) => {
    switch (type) {
      case 'SUMMARY_READY':
        return <FileCheck2 className="w-5 h-5 text-emerald-600" />;
      case 'SUMMARY_FAILED':
        return <FileX className="w-5 h-5 text-rose-600" />;
      case 'INTERVIEW_ABANDONED':
        return <UserX className="w-5 h-5 text-amber-600" />;
      case 'DOCUMENT_RESCAN_NEEDED':
        return <AlertCircle className="w-5 h-5 text-amber-600" />;
      case 'VOICE_ASSIST_SUGGESTED':
        return <Volume2 className="w-5 h-5 text-indigo-600" />;
      case 'KIOSK_OFFLINE':
      case 'KIOSK_ONLINE':
        return <WifiOff className="w-5 h-5 text-rose-600" />;
      default:
        return <Radio className="w-5 h-5 text-slate-500" />;
    }
  };

  const handleNotificationClick = (n: OperationalNotification) => {
    if (!n.isRead) {
      markReadMutation.mutate(n.id);
    }
    if (n.visitId) {
      navigate(`/review/${n.visitId}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Bell className="w-6 h-6 text-red-600" />
            <h1 className="text-xl font-bold text-slate-900">Operational Notifications</h1>
          </div>
          <p className="text-xs text-slate-500">
            Administrative, kiosk device, and workflow lifecycle events. Contains strictly non-clinical data.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsPreferencesOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 shadow-xs cursor-pointer"
          >
            <Settings className="w-4 h-4 text-slate-500" />
            Preferences
          </button>
          <button
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending || notifications.every((n) => n.isRead)}
            className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
          >
            <CheckCheck className="w-4 h-4" />
            Mark All Read
          </button>
        </div>
      </div>

      {/* Boundary Callout */}
      <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl flex items-start gap-3 text-xs text-amber-900">
        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold block mb-0.5">Clinical Boundary Protection</span>
          <span>
            Operational notifications are strictly administrative. They never contain symptoms, drugs, or diagnoses.
            Any clinical red-flags or urgent physiological warnings are displayed in the{' '}
            <Link to="/redflags" className="font-bold underline text-amber-800">
              Red-Flag Alerts
            </Link>{' '}
            triage board.
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 text-xs font-bold text-slate-600">
            <Filter className="w-3.5 h-3.5" /> Filter:
          </div>

          <button
            onClick={() => setUnreadOnly(!unreadOnly)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
              unreadOnly
                ? 'bg-red-50 text-red-700 border border-red-200'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {unreadOnly ? 'Showing Unread' : 'All Read States'}
          </button>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-red-500"
          >
            <option value="">All Categories</option>
            <option value="SUMMARY_READY">Summary Ready</option>
            <option value="SUMMARY_FAILED">Summary Failed</option>
            <option value="INTERVIEW_ABANDONED">Interview Abandoned</option>
            <option value="DOCUMENT_RESCAN_NEEDED">Document Rescan Needed</option>
            <option value="VOICE_ASSIST_SUGGESTED">Voice Assist Suggested</option>
            <option value="KIOSK_OFFLINE">Kiosk Offline</option>
            <option value="SYSTEM_ANNOUNCEMENT">System Announcements</option>
          </select>
        </div>

        <span className="text-xs text-slate-400 font-mono">
          {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Notifications List */}
      <div className="space-y-2.5">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading operational notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-xl border border-slate-200 shadow-xs">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-800">Inbox Clear</h3>
            <p className="text-xs text-slate-500 mt-1">No operational notifications matching your filter criteria.</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => handleNotificationClick(n)}
              className={`p-4 bg-white rounded-xl border transition-all cursor-pointer shadow-xs flex items-start gap-4 ${
                !n.isRead
                  ? 'border-red-200 bg-red-50/20 hover:border-red-300'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 shrink-0 mt-0.5">
                {getTypeIcon(n.type)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">{n.title}</span>
                    {!n.isRead && (
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-extrabold rounded-full">
                        NEW
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-400 shrink-0">
                    {new Date(n.createdAt).toLocaleString()}
                  </span>
                </div>

                <p className="text-xs text-slate-700 leading-relaxed">{n.message}</p>

                <div className="flex flex-wrap items-center gap-3 mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                  <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                    Channel: {n.channel}
                  </span>
                  {n.visitId && (
                    <span className="font-mono bg-red-50 text-red-700 px-2 py-0.5 rounded font-bold flex items-center gap-1">
                      Visit: {n.visitId} <ExternalLink className="w-3 h-3" />
                    </span>
                  )}
                  {n.kioskId && (
                    <span className="font-mono bg-slate-100 px-2 py-0.5 rounded">Kiosk: {n.kioskId}</span>
                  )}
                  {n.isRead && n.readAt && (
                    <span className="text-slate-400 text-[10px]">
                      Read {new Date(n.readAt).toLocaleTimeString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <NotificationPreferencesModal isOpen={isPreferencesOpen} onClose={() => setIsPreferencesOpen(false)} />
    </div>
  );
};
