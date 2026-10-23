import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminConsoleApi } from '../api/admin-console.api';
import { HardDrive, Camera, Mic, Volume2, Wifi, WifiOff, Clock } from 'lucide-react';

export const KioskFleetPage: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-kiosk-fleet'],
    queryFn: () => adminConsoleApi.getKioskFleet(),
    refetchInterval: 15000,
  });

  if (isLoading || !data) {
    return <div className="p-8 text-center text-xs text-slate-500 font-medium">Loading kiosk hardware fleet telemetry...</div>;
  }

  const { kiosks } = data;

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <HardDrive className="w-5 h-5 text-indigo-600" />
          <span>Kiosk Hardware Fleet & Peripheral Health</span>
        </h2>
        <p className="text-xs text-slate-500">
          Telemetry for deployed hospital kiosk terminals. Offline transitions raise automated operational notifications. Patient data is never displayed here.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {kiosks.map((kiosk: any) => {
          const isOnline = kiosk.status === 'ONLINE';
          return (
            <div key={kiosk.deviceCode} className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-sm font-mono">{kiosk.deviceCode}</span>
                  <span
                    className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-2xs font-bold ${
                      isOnline ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                    <span>{kiosk.status}</span>
                  </span>
                </div>

                <div className="mt-2 text-xs text-slate-600 font-medium">
                  {kiosk.facilityName}
                </div>
                <div className="text-2xs text-slate-400">
                  {kiosk.locationDescription}
                </div>

                {/* Peripherals Status */}
                <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-3 gap-2 text-center text-2xs">
                  <div className="p-2 bg-slate-50 rounded-lg">
                    <Camera className="w-3.5 h-3.5 mx-auto mb-1 text-slate-500" />
                    <span className="text-slate-500 block text-3xs">Camera</span>
                    <span className="font-bold text-emerald-600">{kiosk.cameraStatus}</span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-lg">
                    <Mic className="w-3.5 h-3.5 mx-auto mb-1 text-slate-500" />
                    <span className="text-slate-500 block text-3xs">Mic</span>
                    <span className="font-bold text-emerald-600">{kiosk.microphoneStatus}</span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-lg">
                    <Volume2 className="w-3.5 h-3.5 mx-auto mb-1 text-slate-500" />
                    <span className="text-slate-500 block text-3xs">Speaker</span>
                    <span className="font-bold text-emerald-600">{kiosk.speakerStatus}</span>
                  </div>
                </div>

                {/* Software and Queued Sessions */}
                <div className="mt-3 text-2xs text-slate-500 space-y-1">
                  <div className="flex justify-between">
                    <span>Software Version:</span>
                    <span className="font-mono text-slate-700">{kiosk.softwareVersion || 'v2.4.1'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cache Template:</span>
                    <span className="font-mono text-slate-700">{kiosk.cacheVersion || 'v1.0.8'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Queued Offline Visits:</span>
                    <span className="font-bold text-slate-700">{kiosk.offlineSessionsQueued}</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-2 border-t border-slate-100 flex items-center justify-between text-3xs text-slate-400">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>Last Heartbeat:</span>
                </span>
                <span>{new Date(kiosk.lastHeartbeatAt).toLocaleTimeString()}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
