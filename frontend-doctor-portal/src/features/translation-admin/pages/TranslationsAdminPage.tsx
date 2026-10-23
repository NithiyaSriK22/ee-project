import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Globe2,
  FileCheck2,
  ListOrdered,
  PlusCircle,
  Clock,
  CheckCircle2,
  Archive,
  Volume2,
  Settings,
  Send,
  Sparkles,
} from 'lucide-react';
import { translationsApi } from '../translations.api';
import { SupportedLanguage, QuestionTranslation, OptionTranslation } from '../types';
import { TranslationCoveragePage } from '../components/TranslationCoveragePage';
import { TranslationReviewQueue } from '../components/TranslationReviewQueue';

export const TranslationsAdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'coverage' | 'reviews' | 'editor' | 'languages'>('coverage');
  const [selectedLang, setSelectedLang] = useState<string>('ta');
  const [newTransType, setNewTransType] = useState<'question' | 'option'>('question');
  const [isDraftModalOpen, setIsDraftModalOpen] = useState(false);
  const [draftData, setDraftData] = useState<any>({
    language: 'ta',
    questionCode: '',
    optionCode: '',
    promptText: '',
    label: '',
    spokenSynonyms: '',
    helpText: '',
  });

  const queryClient = useQueryClient();

  const { data: languages = [] } = useQuery<SupportedLanguage[]>({
    queryKey: ['admin-languages'],
    queryFn: () => translationsApi.getLanguages(),
  });

  const { data: translations = [], isLoading: isTransLoading } = useQuery<(QuestionTranslation | OptionTranslation)[]>({
    queryKey: ['admin-translations-list', selectedLang],
    queryFn: () => translationsApi.getTranslations({ lang: selectedLang }),
    enabled: activeTab === 'editor',
  });

  const submitReviewMutation = useMutation({
    mutationFn: (id: string) => translationsApi.submitForReview(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-translations-list'] });
      queryClient.invalidateQueries({ queryKey: ['translations-in-review'] });
    },
  });

  const retireMutation = useMutation({
    mutationFn: (id: string) => translationsApi.retireTranslation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-translations-list'] });
      queryClient.invalidateQueries({ queryKey: ['translation-coverage'] });
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => translationsApi.createTranslation(data),
    onSuccess: () => {
      setIsDraftModalOpen(false);
      setDraftData({
        language: selectedLang,
        questionCode: '',
        optionCode: '',
        promptText: '',
        label: '',
        spokenSynonyms: '',
        helpText: '',
      });
      queryClient.invalidateQueries({ queryKey: ['admin-translations-list'] });
      queryClient.invalidateQueries({ queryKey: ['translation-coverage'] });
    },
  });

  const handleDraftSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTransType === 'question') {
      createMutation.mutate({
        type: 'question',
        language: draftData.language || selectedLang,
        questionCode: draftData.questionCode,
        templateVersion: '1.0.0',
        promptText: draftData.promptText,
        helpText: draftData.helpText,
      });
    } else {
      createMutation.mutate({
        type: 'option',
        language: draftData.language || selectedLang,
        optionCode: draftData.optionCode,
        label: draftData.label,
        spokenSynonyms: draftData.spokenSynonyms
          .split(',')
          .map((s: string) => s.trim())
          .filter(Boolean),
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Approved
          </span>
        );
      case 'IN_REVIEW':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
            <Clock className="w-3 h-3" /> In Review
          </span>
        );
      case 'DRAFT':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            Draft
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-400">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Globe2 className="w-6 h-6 text-red-600" />
            <h1 className="text-xl font-bold text-slate-900">Multilingual & Translation Governance</h1>
          </div>
          <p className="text-xs text-slate-500">
            Clinician-reviewed interview translations, spoken synonym mappings, and strict kiosk release gating.
          </p>
        </div>

        <button
          onClick={() => setIsDraftModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <PlusCircle className="w-4 h-4" />
          Draft New Translation
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setActiveTab('coverage')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === 'coverage'
              ? 'border-red-600 text-red-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Coverage & Kiosk Readiness
        </button>
        <button
          onClick={() => setActiveTab('reviews')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === 'reviews'
              ? 'border-red-600 text-red-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileCheck2 className="w-4 h-4" />
          Clinical Review Queue
        </button>
        <button
          onClick={() => setActiveTab('editor')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === 'editor'
              ? 'border-red-600 text-red-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ListOrdered className="w-4 h-4" />
          Translation Catalog
        </button>
        <button
          onClick={() => setActiveTab('languages')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === 'languages'
              ? 'border-red-600 text-red-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Settings className="w-4 h-4" />
          Language Matrix
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'coverage' && <TranslationCoveragePage />}

      {activeTab === 'reviews' && <TranslationReviewQueue />}

      {activeTab === 'editor' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-slate-200">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
              <span>Filter Language:</span>
              {languages.map((l) => (
                <button
                  key={l.code}
                  onClick={() => setSelectedLang(l.code)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                    selectedLang === l.code
                      ? 'bg-red-50 text-red-700 border border-red-200'
                      : 'bg-slate-50 text-slate-600 border border-slate-200'
                  }`}
                >
                  {l.displayName} ({l.code})
                </button>
              ))}
            </div>
            <span className="text-xs text-slate-400 font-mono">{translations.length} items</span>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Code / Reference</th>
                    <th className="py-3 px-4">Translated Prompt / Label</th>
                    <th className="py-3 px-4">Version</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isTransLoading ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        Loading translations...
                      </td>
                    </tr>
                  ) : translations.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        No translations registered for {selectedLang}.
                      </td>
                    </tr>
                  ) : (
                    translations.map((item) => {
                      const isQ = 'questionCode' in item;
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/50">
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">
                            {isQ ? (item as QuestionTranslation).questionCode : (item as OptionTranslation).optionCode}
                          </td>
                          <td className="py-3 px-4 max-w-md">
                            <span className="font-medium text-slate-900">
                              {isQ ? (item as QuestionTranslation).promptText : (item as OptionTranslation).label}
                            </span>
                            {!isQ && (item as OptionTranslation).spokenSynonyms?.length > 0 && (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {(item as OptionTranslation).spokenSynonyms.map((s, i) => (
                                  <span key={i} className="text-[10px] bg-slate-100 px-1.5 py-0.2 rounded font-mono">
                                    "{s}"
                                  </span>
                                ))}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono text-slate-500">v{item.version}</td>
                          <td className="py-3 px-4">{getStatusBadge(item.status)}</td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {item.status === 'DRAFT' && (
                                <button
                                  onClick={() => submitReviewMutation.mutate(item.id)}
                                  className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded border border-amber-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                                  title="Submit for clinical dual-review"
                                >
                                  <Send className="w-3 h-3" /> Submit
                                </button>
                              )}
                              {item.status === 'APPROVED' && (
                                <button
                                  onClick={() => retireMutation.mutate(item.id)}
                                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                                  title="Retire version"
                                >
                                  <Archive className="w-3 h-3" /> Retire
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'languages' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-4">
          <h3 className="text-base font-bold text-slate-900">Configured Hospital Languages</h3>
          <p className="text-xs text-slate-500">
            Manage supported languages, voice adapters, and display names. Note: Language availability at kiosks is
            strictly governed by 100% translation coverage.
          </p>

          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden mt-4">
            {languages.map((l) => (
              <div key={l.code} className="p-4 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">{l.displayName}</span>
                    <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                      {l.code.toUpperCase()}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        l.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {l.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                    <span>Direction: {l.textDirection.toUpperCase()}</span>
                    <span>UI Status: {l.uiStatus}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono bg-slate-50 px-2.5 py-1 rounded border border-slate-200 flex items-center gap-1 text-slate-700">
                    <Volume2 className="w-3.5 h-3.5 text-indigo-600" /> STT: {l.voiceInputStatus} | TTS:{' '}
                    {l.voiceOutputStatus}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Draft New Translation Modal */}
      {isDraftModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4 animate-in fade-in duration-200">
            <h3 className="text-base font-bold text-slate-900">Draft Clinical Translation</h3>
            <p className="text-xs text-slate-500">
              Draft question or option translation. New translations require human review before serving to patients.
            </p>

            <form onSubmit={handleDraftSubmit} className="space-y-3">
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="type"
                    checked={newTransType === 'question'}
                    onChange={() => setNewTransType('question')}
                  />
                  Question Prompt
                </label>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="type"
                    checked={newTransType === 'option'}
                    onChange={() => setNewTransType('option')}
                  />
                  Option Code & Synonyms
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Target Language</label>
                <select
                  value={draftData.language}
                  onChange={(e) => setDraftData({ ...draftData, language: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                >
                  {languages.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.displayName} ({l.code})
                    </option>
                  ))}
                </select>
              </div>

              {newTransType === 'question' ? (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Question Code</label>
                    <input
                      type="text"
                      placeholder="e.g. CHIEF_COMPLAINT_PRIMARY"
                      value={draftData.questionCode}
                      onChange={(e) => setDraftData({ ...draftData, questionCode: e.target.value })}
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Translated Prompt Text</label>
                    <textarea
                      placeholder="Prompt text in target language script..."
                      value={draftData.promptText}
                      onChange={(e) => setDraftData({ ...draftData, promptText: e.target.value })}
                      required
                      rows={3}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Plain Help Text (Optional)</label>
                    <input
                      type="text"
                      placeholder="Simple neutral explanation for patients..."
                      value={draftData.helpText}
                      onChange={(e) => setDraftData({ ...draftData, helpText: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Option Code</label>
                    <input
                      type="text"
                      placeholder="e.g. YES, NO, DURATION_LT_24H"
                      value={draftData.optionCode}
                      onChange={(e) => setDraftData({ ...draftData, optionCode: e.target.value })}
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Translated Label</label>
                    <input
                      type="text"
                      placeholder="Label shown on kiosk button..."
                      value={draftData.label}
                      onChange={(e) => setDraftData({ ...draftData, label: e.target.value })}
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Spoken Synonyms (comma-separated)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. ஆம், சரி, ஆமாம்"
                      value={draftData.spokenSynonyms}
                      onChange={(e) => setDraftData({ ...draftData, spokenSynonyms: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                </>
              )}

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsDraftModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  Save Draft
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
