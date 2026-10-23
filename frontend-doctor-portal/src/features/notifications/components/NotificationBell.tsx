import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  Settings,
  AlertCircle,
  FileCheck2,
  FileX,
  UserX,
  Volume2,
  WifiOff,
  Radio,
  ExternalLink,
} from 'lucide-react';
import { notificationsApi } from '../notifications.api';
import { OperationalNotification, NotificationType } from '../types';

interface NotificationBellProps {
  onOpenPreferences?: () => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ onOpenPreferences }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Periodic poll for unread count
  const { data: unreadCount = 0 } = useQuery<number>({
    queryKey: ['notifications-unread-count'],
    queryFn: () => notificationsApi.getUnreadCount(),
    refetchInterval: 15000,
  });

  const { data: recentNotifications = [] } = useQuery<OperationalNotification[]>({
    queryKey: ['notifications-recent'],
    queryFn: () => notificationsApi.getNotifications({ limit: 5 }),
    enabled: isOpen,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationsApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-recent'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-list'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-recent'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-list'] });
    },
  });

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const getTypeIcon = (type: NotificationType) => {
    switch (type) {
      case 'SUMMARY_READY':
        return <FileCheck2 className="w-4 h-4 text-emerald-600" />;
      case 'SUMMARY_FAILED':
        return <FileX className="w-4 h-4 text-rose-600" />;
      case 'INTERVIEW_ABANDONED':
        return <UserX className="w-4 h-4 text-amber-600" />;
      case 'DOCUMENT_RESCAN_NEEDED':
        return <AlertCircle className="w-4 h-4 text-amber-600" />;
      case 'VOICE_ASSIST_SUGGESTED':
        return <Volume2 className="w-4 h-4 text-indigo-600" />;
      case 'KIOSK_OFFLINE':
      case 'KIOSK_ONLINE':
        return <WifiOff className="w-4 h-4 text-rose-600" />;
      default:
        return <Radio className="w-4 h-4 text-slate-500" />;
    }
  };

  const handleNotificationClick = (n: OperationalNotification) => {
    if (!n.isRead) {
      markReadMutation.mutate(n.id);
    }
    setIsOpen(false);
    if (n.visitId) {
      navigate(`/review/${n.visitId}`);
    } else {
      navigate('/notifications');
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
        title="Operational Notifications"
        aria-label="Operational Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow-xs">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-xl border border-slate-200 z-50 text-slate-800 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-red-600" />
              <span className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                Operational Notifications
              </span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.2 bg-red-100 text-red-700 text-[10px] font-bold rounded">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllReadMutation.mutate()}
                disabled={markAllReadMutation.isPending}
                className="text-[11px] font-bold text-slate-600 hover:text-red-600 flex items-center gap-1 cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* Non-Clinical Safeguard Notice */}
          <div className="px-3.5 py-2 bg-amber-50/70 border-b border-amber-100 text-[10px] text-amber-900 font-medium">
            Operational facts only (no clinical PHI). Emergency red-flags are managed in{' '}
            <Link to="/redflags" onClick={() => setIsOpen(false)} className="font-bold underline text-amber-800">
              Triage Alerts
            </Link>
            .
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {recentNotifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400">No recent notifications</div>
            ) : (
              recentNotifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`p-3 hover:bg-slate-50 cursor-pointer transition-colors flex items-start gap-3 ${
                    !n.isRead ? 'bg-red-50/20' : ''
                  }`}
                >
                  <div className="mt-0.5 p-1.5 bg-slate-100 rounded-lg shrink-0">{getTypeIcon(n.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="text-xs font-bold text-slate-900 truncate">{n.title}</span>
                      {!n.isRead && <span className="w-2 h-2 rounded-full bg-red-600 shrink-0" />}
                    </div>
                    <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">{n.message}</p>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                      <span>{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      {n.visitId && <span className="font-mono bg-slate-100 px-1 rounded">Visit: {n.visitId.substring(0, 8)}</span>}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
            <Link
              to="/notifications"
              onClick={() => setIsOpen(false)}
              className="text-red-700 hover:text-red-800 font-bold flex items-center gap-1 px-2 py-1 rounded hover:bg-red-50"
            >
              <span>View All</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
            {onOpenPreferences && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  onOpenPreferences();
                }}
                className="text-slate-600 hover:text-slate-900 flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-200/50 cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Preferences</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
