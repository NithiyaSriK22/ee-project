import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { templateAdminApi } from '../api/template-admin.api';
import {
  AdminTemplate,
  InterviewSections,
  QuestionTypes,
  TemplateStatus,
} from '../types/template-admin.types';
import {
  FileCode2,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Archive,
  Layers,
  Send,
  ShieldCheck,
  Clock,
  Loader2,
} from 'lucide-react';

export const InterviewTemplateManagerPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddQuestionModal, setShowAddQuestionModal] = useState(false);

  // Form States for Template Creation
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateDesc, setNewTemplateDesc] = useState('');
  const [newTemplateVisitType, setNewTemplateVisitType] = useState('GENERAL_OPD');

  // Form States for Question Creation
  const [newQuestionSection, setNewQuestionSection] = useState<string>(InterviewSections.CHIEF_COMPLAINT);
  const [newQuestionPrompt, setNewQuestionPrompt] = useState('');
  const [newQuestionAudioHint, setNewQuestionAudioHint] = useState('');
  const [newQuestionType, setNewQuestionType] = useState<string>(QuestionTypes.YES_NO);
  const [newQuestionIsCritical, setNewQuestionIsCritical] = useState(false);
  const [newQuestionOptionsStr, setNewQuestionOptionsStr] = useState('');

  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // 1. Fetch templates
  const {
    data: templates,
    isLoading,
  } = useQuery<AdminTemplate[]>({
    queryKey: ['admin-interview-templates'],
    queryFn: templateAdminApi.listTemplates,
  });

  const selectedTemplate = templates?.find((t) => t.id === selectedTemplateId) || templates?.[0];

  // 2. Mutations
  const createTemplateMutation = useMutation({
    mutationFn: templateAdminApi.createTemplate,
    onSuccess: (newTmpl) => {
      queryClient.invalidateQueries({ queryKey: ['admin-interview-templates'] });
      setSelectedTemplateId(newTmpl.id);
      setShowCreateModal(false);
      setNewTemplateName('');
      setNewTemplateDesc('');
      setActionSuccess('Template created in DRAFT state');
    },
    onError: (err: any) => {
      setActionError(err.message || 'Failed to create template');
    },
  });

  const submitReviewMutation = useMutation({
    mutationFn: templateAdminApi.submitForReview,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-interview-templates'] });
      setActionSuccess('Template submitted for clinical review');
    },
    onError: (err: any) => {
      setActionError(err.message || 'Failed to submit template for review');
    },
  });

  const publishMutation = useMutation({
    mutationFn: templateAdminApi.publishTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-interview-templates'] });
      setActionSuccess('Template validated and PUBLISHED as ACTIVE for clinical intake');
    },
    onError: (err: any) => {
      setActionError(err.message || 'Publishing failed. Check data-quality validation rules.');
    },
  });

  const retireMutation = useMutation({
    mutationFn: templateAdminApi.retireTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-interview-templates'] });
      setActionSuccess('Template retired from active kiosk intake');
    },
    onError: (err: any) => {
      setActionError(err.message || 'Failed to retire template');
    },
  });

  const addQuestionMutation = useMutation({
    mutationFn: (data: any) => templateAdminApi.addQuestion(selectedTemplate!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-interview-templates'] });
      setShowAddQuestionModal(false);
      setNewQuestionPrompt('');
      setNewQuestionAudioHint('');
      setNewQuestionOptionsStr('');
      setActionSuccess('Question added to template');
    },
    onError: (err: any) => {
      setActionError(err.message || 'Failed to add question');
    },
  });

  const archiveQuestionMutation = useMutation({
    mutationFn: templateAdminApi.archiveQuestion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-interview-templates'] });
      setActionSuccess('Question archived (soft-deleted). Historical records preserved.');
    },
    onError: (err: any) => {
      setActionError(err.message || 'Failed to archive question');
    },
  });

  const handleCreateTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    createTemplateMutation.mutate({
      name: newTemplateName,
      description: newTemplateDesc,
      applicableVisitType: newTemplateVisitType,
    });
  };

  const handleAddQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);

    let answerOptions: any = undefined;
    if (
      newQuestionType === QuestionTypes.SINGLE_CHOICE ||
      newQuestionType === QuestionTypes.MULTI_CHOICE
    ) {
      answerOptions = newQuestionOptionsStr
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
    }

    addQuestionMutation.mutate({
      section: newQuestionSection,
      promptText: newQuestionPrompt,
      promptAudioHint: newQuestionAudioHint || undefined,
      questionType: newQuestionType,
      answerOptions,
      isCritical: newQuestionIsCritical,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case TemplateStatus.ACTIVE:
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> ACTIVE (Live at Kiosk)
          </span>
        );
      case TemplateStatus.PUBLISHED:
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-teal-100 text-teal-800 font-bold border border-teal-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" /> PUBLISHED
          </span>
        );
      case TemplateStatus.REVIEW:
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 font-bold border border-amber-300">
            <Clock className="w-3.5 h-3.5 text-amber-600" /> UNDER REVIEW
          </span>
        );
      case TemplateStatus.RETIRED:
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-slate-200 text-slate-700 font-bold border border-slate-300">
            <Archive className="w-3.5 h-3.5 text-slate-500" /> RETIRED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 font-bold border border-blue-300">
            <FileCode2 className="w-3.5 h-3.5 text-blue-600" /> DRAFT
          </span>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-500">
        <Loader2 className="w-10 h-10 text-teal-600 animate-spin mb-3" />
        <p className="font-medium text-sm">Loading Interview Question Bank...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Interview Templates & Question Bank
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
              Admin CMS
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Author, structure, review, and publish clinical intake questionnaires for patient kiosks.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-semibold text-sm shadow-sm transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Interview Template</span>
        </button>
      </div>

      {/* Notifications */}
      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button
            onClick={() => setActionSuccess(null)}
            className="text-xs text-emerald-600 underline font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {actionError && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button
            onClick={() => setActionError(null)}
            className="text-xs text-rose-600 underline font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Grid: Template List Sidebar + Questions Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Templates Sidebar */}
        <div className="lg:col-span-4 space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
            Available Templates ({templates?.length || 0})
          </h2>

          <div className="space-y-2">
            {templates?.map((tmpl) => {
              const isSelected = selectedTemplate?.id === tmpl.id;
              return (
                <button
                  key={tmpl.id}
                  onClick={() => {
                    setSelectedTemplateId(tmpl.id);
                    setActionError(null);
                    setActionSuccess(null);
                  }}
                  className={`w-full p-4 rounded-xl text-left border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-white border-teal-600 shadow-sm ring-2 ring-teal-600/20'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-slate-900 text-sm">{tmpl.name}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                      v{tmpl.version}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    {tmpl.description || 'General outpatient questionnaire'}
                  </p>

                  <div className="mt-3 flex items-center justify-between text-xs">
                    <div>{getStatusBadge(tmpl.status)}</div>
                    <span className="text-slate-400 font-medium">
                      {tmpl.questions?.length || 0} questions
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Template Details & Question Bank */}
        <div className="lg:col-span-8 space-y-6">
          {selectedTemplate ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6">
              {/* Template Meta & Lifecycle Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-slate-900">{selectedTemplate.name}</h2>
                    {getStatusBadge(selectedTemplate.status)}
                  </div>
                  <p className="text-xs text-slate-500">
                    Visit Type: <strong className="text-slate-700">{selectedTemplate.applicable_visit_type}</strong> • Version {selectedTemplate.version}
                  </p>
                </div>

                {/* Lifecycle Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  {selectedTemplate.status === TemplateStatus.DRAFT && (
                    <button
                      onClick={() => submitReviewMutation.mutate(selectedTemplate.id)}
                      className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Submit for Review</span>
                    </button>
                  )}

                  {(selectedTemplate.status === TemplateStatus.REVIEW ||
                    selectedTemplate.status === TemplateStatus.DRAFT) && (
                    <button
                      onClick={() => publishMutation.mutate(selectedTemplate.id)}
                      className="px-3.5 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Publish & Activate</span>
                    </button>
                  )}

                  {selectedTemplate.status === TemplateStatus.ACTIVE && (
                    <button
                      onClick={() => retireMutation.mutate(selectedTemplate.id)}
                      className="px-3.5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Archive className="w-3.5 h-3.5" />
                      <span>Retire Template</span>
                    </button>
                  )}

                  {selectedTemplate.status !== TemplateStatus.RETIRED && (
                    <button
                      onClick={() => setShowAddQuestionModal(true)}
                      className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Question</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Questions List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Layers className="w-4 h-4 text-teal-700" />
                    <span>Questions ({selectedTemplate.questions?.length || 0})</span>
                  </h3>
                  <span className="text-xs text-slate-400">
                    Organized into standard clinical sections
                  </span>
                </div>

                <div className="space-y-3">
                  {selectedTemplate.questions?.map((q, idx) => (
                    <div
                      key={q.id}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition-all flex items-start justify-between gap-4"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[11px] font-bold flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-200 text-slate-700">
                            {q.section}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-teal-50 text-teal-800 border border-teal-200 font-semibold">
                            {q.question_type}
                          </span>
                          {q.is_critical && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3" /> Critical Marker
                            </span>
                          )}
                        </div>

                        <p className="text-sm font-semibold text-slate-900">{q.prompt_text}</p>

                        {q.prompt_audio_hint && (
                          <p className="text-xs text-slate-500 italic">
                            Spoken Hint: "{q.prompt_audio_hint}"
                          </p>
                        )}

                        {q.answer_options && Array.isArray(q.answer_options) && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {q.answer_options.map((opt: any, optIdx: number) => (
                              <span
                                key={optIdx}
                                className="text-[11px] px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-600"
                              >
                                {typeof opt === 'object' ? opt.label : opt}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {selectedTemplate.status !== TemplateStatus.RETIRED && (
                        <button
                          onClick={() => archiveQuestionMutation.mutate(q.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Archive Question (Soft-delete)"
                        >
                          <Archive className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400">
              Select a template on the left to view questions.
            </div>
          )}
        </div>
      </div>

      {/* Modal: Create Template */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Create New Interview Template</h3>
            <form onSubmit={handleCreateTemplate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Template Name *
                </label>
                <input
                  type="text"
                  required
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  placeholder="e.g. Cardiology OPD Specialized Intake"
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-teal-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Applicable Visit Type
                </label>
                <input
                  type="text"
                  value={newTemplateVisitType}
                  onChange={(e) => setNewTemplateVisitType(e.target.value)}
                  placeholder="GENERAL_OPD, CARDIOLOGY, PEDIATRICS"
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-teal-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={newTemplateDesc}
                  onChange={(e) => setNewTemplateDesc(e.target.value)}
                  placeholder="Clinical purpose of this questionnaire..."
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-teal-600"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createTemplateMutation.isPending}
                  className="px-4 py-2 rounded-lg bg-teal-700 text-white text-xs font-semibold hover:bg-teal-800"
                >
                  Create DRAFT
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Question */}
      {showAddQuestionModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-900">Add Question to Template</h3>
            <form onSubmit={handleAddQuestion} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Section *
                  </label>
                  <select
                    value={newQuestionSection}
                    onChange={(e) => setNewQuestionSection(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-teal-600"
                  >
                    {Object.values(InterviewSections).map((sec) => (
                      <option key={sec} value={sec}>
                        {sec}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Question Type *
                  </label>
                  <select
                    value={newQuestionType}
                    onChange={(e) => setNewQuestionType(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-teal-600"
                  >
                    {Object.values(QuestionTypes).map((qt) => (
                      <option key={qt} value={qt}>
                        {qt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Question Prompt Text (Spoken & Displayed) *
                </label>
                <input
                  type="text"
                  required
                  value={newQuestionPrompt}
                  onChange={(e) => setNewQuestionPrompt(e.target.value)}
                  placeholder="e.g. Do you have chest pain or tightness?"
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-teal-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Audio Speech Hint (Optional)
                </label>
                <input
                  type="text"
                  value={newQuestionAudioHint}
                  onChange={(e) => setNewQuestionAudioHint(e.target.value)}
                  placeholder="e.g. Press YES or NO on the screen"
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-teal-600"
                />
              </div>

              {(newQuestionType === QuestionTypes.SINGLE_CHOICE ||
                newQuestionType === QuestionTypes.MULTI_CHOICE) && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Answer Options (one per line) *
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={newQuestionOptionsStr}
                    onChange={(e) => setNewQuestionOptionsStr(e.target.value)}
                    placeholder="Option 1&#10;Option 2&#10;Option 3"
                    className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm font-mono focus:outline-none focus:border-teal-600"
                  />
                </div>
              )}

              <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <input
                  type="checkbox"
                  id="isCriticalCheckbox"
                  checked={newQuestionIsCritical}
                  onChange={(e) => setNewQuestionIsCritical(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4"
                />
                <label htmlFor="isCriticalCheckbox" className="text-xs text-amber-900 font-medium">
                  <strong>Mark as Critical Medical Field</strong> (attached for downstream Module 6/7 priority review)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddQuestionModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addQuestionMutation.isPending}
                  className="px-4 py-2 rounded-lg bg-teal-700 text-white text-xs font-semibold hover:bg-teal-800"
                >
                  Add Question
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
