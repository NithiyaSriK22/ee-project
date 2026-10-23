import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CheckCircle2,
  AlertTriangle,
  Globe2,
  Check,
  X,
  ShieldCheck,
  Sparkles,
  Volume2,
  Lock,
} from 'lucide-react';
import { translationsApi } from '../translations.api';
import { SupportedLanguage, TranslationCoverageReport } from '../types';

export const TranslationCoveragePage: React.FC = () => {
  const [selectedLang, setSelectedLang] = useState<string>('ta');

  const { data: languages = [] } = useQuery<SupportedLanguage[]>({
    queryKey: ['admin-languages'],
    queryFn: () => translationsApi.getLanguages(),
  });

  const { data: coverage, isLoading: isCoverageLoading } = useQuery<TranslationCoverageReport | undefined>({
    queryKey: ['translation-coverage', selectedLang],
    queryFn: () => translationsApi.getCoverage(selectedLang),
    enabled: !!selectedLang,
  });

  return (
    <div className="space-y-6">
      {/* Informational Callout */}
      <div className="p-4 bg-red-50/70 border border-red-200 rounded-xl flex items-start gap-3 text-xs text-red-900">
        <ShieldCheck className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold block mb-0.5">Strict Clinical Governance Gating</span>
          <span>
            A language is served to kiosk patients <strong>only</strong> when 100% of questions and options are
            clinically reviewed and APPROVED, and UI string bundles are ready. Partially translated templates are gated
            from patient view to prevent comprehension risks.
          </span>
        </div>
      </div>

      {/* Language Selector Pills */}
      <div className="flex flex-wrap items-center gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mr-2">
          <Globe2 className="w-4 h-4 text-slate-700" /> Target Language:
        </span>
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => setSelectedLang(lang.code)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              selectedLang === lang.code
                ? 'bg-red-600 text-white shadow-xs'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <span>{lang.displayName}</span>
            <span
              className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                selectedLang === lang.code ? 'bg-red-700 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {lang.code.toUpperCase()}
            </span>
          </button>
        ))}
      </div>

      {/* Coverage Card */}
      {isCoverageLoading ? (
        <div className="p-8 text-center text-xs text-slate-400">Loading coverage metrics...</div>
      ) : coverage ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Status Card */}
          <div className="md:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>Template Coverage: General OPD Intake</span>
                  <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-normal">
                    v{coverage.templateVersion}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Language: {languages.find((l) => l.code === coverage.language)?.displayName} ({coverage.language})
                </p>
              </div>

              {coverage.isKioskReady ? (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Kiosk Ready</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold">
                  <Lock className="w-4 h-4 text-amber-600" />
                  <span>Gated (Incomplete)</span>
                </div>
              )}
            </div>

            {/* Question Coverage Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-700">
                <span>Clinical Question Translations</span>
                <span className="font-mono">
                  {coverage.approvedQuestions} / {coverage.totalQuestions} ({coverage.questionCoveragePct}%)
                </span>
              </div>
              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    coverage.questionCoveragePct === 100 ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                  style={{ width: `${coverage.questionCoveragePct}%` }}
                />
              </div>
            </div>

            {/* Option Coverage Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold text-slate-700">
                <span>Option Code & Synonym Translations</span>
                <span className="font-mono">
                  {coverage.approvedOptions} / {coverage.totalOptions} ({coverage.optionCoveragePct}%)
                </span>
              </div>
              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    coverage.optionCoveragePct === 100 ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                  style={{ width: `${coverage.optionCoveragePct}%` }}
                />
              </div>
            </div>

            {/* UI Strings Status */}
            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span className="font-bold text-slate-800">Kiosk UI Navigation & Button Strings</span>
              </div>
              {coverage.uiStringsApproved ? (
                <span className="flex items-center gap-1 text-emerald-700 font-bold">
                  <Check className="w-4 h-4" /> Approved
                </span>
              ) : (
                <span className="flex items-center gap-1 text-rose-600 font-bold">
                  <X className="w-4 h-4" /> Pending Approval
                </span>
              )}
            </div>

            {/* Missing Items if any */}
            {(coverage.missingQuestionCodes.length > 0 || coverage.missingOptionCodes.length > 0) && (
              <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200 text-xs space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Missing Approved Translations Required for Kiosk Deployment:</span>
                </div>
                {coverage.missingQuestionCodes.length > 0 && (
                  <div>
                    <span className="font-semibold text-slate-600 block">Questions:</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {coverage.missingQuestionCodes.map((q) => (
                        <span key={q} className="font-mono bg-white px-2 py-0.5 rounded border border-amber-200 text-[11px] text-amber-950">
                          {q}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {coverage.missingOptionCodes.length > 0 && (
                  <div className="mt-2">
                    <span className="font-semibold text-slate-600 block">Options:</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {coverage.missingOptionCodes.map((o) => (
                        <span key={o} className="font-mono bg-white px-2 py-0.5 rounded border border-amber-200 text-[11px] text-amber-950">
                          {o}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Voice Capabilities Card */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-red-600" /> Voice Capabilities
            </h4>
            <p className="text-xs text-slate-500 leading-normal">
              Voice interactions are allowed only if both STT recognition models and TTS audio playback adapters are certified.
            </p>

            <div className="space-y-3 pt-2">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                <span className="font-medium text-slate-700">Voice Input (STT):</span>
                <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {languages.find((l) => l.code === selectedLang)?.voiceInputStatus || 'SUPPORTED'}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                <span className="font-medium text-slate-700">Voice Output (TTS):</span>
                <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {languages.find((l) => l.code === selectedLang)?.voiceOutputStatus || 'SUPPORTED'}
                </span>
              </div>
            </div>

            <div className="p-3 bg-slate-100 rounded-lg text-[11px] text-slate-600 space-y-1">
              <span className="font-bold block text-slate-800">Touch-Only Fallback Policy:</span>
              <p>
                If voice services drop or noise is elevated, the kiosk gracefully degrades to touch-only mode without
                blocking the patient interview.
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
