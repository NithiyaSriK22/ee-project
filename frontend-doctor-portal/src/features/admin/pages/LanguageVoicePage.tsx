import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminConsoleApi } from '../api/admin-console.api';
import { Languages, Mic, Volume2, Eye, ShieldAlert } from 'lucide-react';

interface Props {
  preset: string;
}

export const LanguageVoicePage: React.FC<Props> = ({ preset }) => {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-language-voice', preset],
    queryFn: () => adminConsoleApi.getLanguageVoiceAnalytics({ preset }),
  });

  if (isLoading || !data) {
    return <div className="p-8 text-center text-xs text-slate-500 font-medium">Loading language & voice metrics...</div>;
  }

  const { languageDistribution, voiceInteraction, accessibilityUsage } = data;

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <h2 className="text-base font-bold text-slate-900">Language, Voice & Accessibility Analytics</h2>
        <p className="text-xs text-slate-500">
          Module 8 multilingual telemetry. Metrics are used to identify language readiness and UX bottlenecks. Fallback rates are UX transitions, never labeled "speech accuracy".
        </p>
      </div>

      {/* Voice & Speech Interaction KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
            <Mic className="w-3.5 h-3.5 text-indigo-600" />
            <span>Voice-First Usage</span>
          </span>
          <div className="text-2xl font-bold text-indigo-700 mt-1">
            {voiceInteraction.voiceUsageSharePercent}%
          </div>
          <span className="text-2xs text-slate-400">Share of intake answers</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
            <Languages className="w-3.5 h-3.5 text-amber-600" />
            <span>Voice-to-Touch Fallback</span>
          </span>
          <div className="text-2xl font-bold text-amber-700 mt-1">
            {voiceInteraction.voiceToTouchFallbackRatePercent}%
          </div>
          <span className="text-2xs text-slate-400">Switched to touchscreen mode</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5 text-blue-600" />
            <span>Read-Back Correction</span>
          </span>
          <div className="text-2xl font-bold text-slate-900 mt-1">
            {voiceInteraction.readbackCorrectionRatePercent}%
          </div>
          <span className="text-2xs text-slate-400">Patient corrected read-back prompt</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-purple-600" />
            <span>Accessibility Modes</span>
          </span>
          <div className="text-2xl font-bold text-purple-700 mt-1">
            {accessibilityUsage.highContrastCount + accessibilityUsage.largeFontCount}
          </div>
          <span className="text-2xs text-slate-400">High contrast & large font sessions</span>
        </div>
      </div>

      {/* Language Distribution Breakdown with Small-Number Privacy */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5">
        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-xs font-bold text-slate-900">Patient Sessions by Interaction Language</h3>
            <p className="text-2xs text-slate-500">Distribution across supported Indic schedule languages</p>
          </div>
          <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md text-2xs text-amber-800">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
            <span>Small-number privacy: counts &lt; 10 are masked</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {languageDistribution.map((item: any) => (
            <div key={item.languageCode} className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-center">
              <span className="text-xs font-bold text-slate-700 uppercase">{item.languageCode}</span>
              <div className="mt-1">
                {item.isSuppressed ? (
                  <span className="inline-block px-2 py-0.5 rounded bg-amber-100 text-amber-900 text-2xs font-semibold">
                    {item.displayValue}
                  </span>
                ) : (
                  <span className="text-lg font-extrabold text-slate-900">{item.value}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
