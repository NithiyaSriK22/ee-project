import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FileText,
  AlertTriangle,
  RefreshCw,
  Cpu,
  Layers,
  ShieldAlert,
  ArrowLeft,
  Hash,
} from 'lucide-react';
import { SummaryApi } from '../api/summary.api';
import {
  ClinicalSummaryDto,
  StatementOrigin,
  SummarySectionType,
} from '../types/summary.types';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';

const SECTION_DISPLAY_NAMES: Record<SummarySectionType, string> = {
  CHIEF_COMPLAINT: 'Chief Complaint',
  HISTORY_OF_PRESENT_ILLNESS: 'History of Present Illness',
  PAST_MEDICAL_HISTORY: 'Past Medical History',
  MEDICATIONS_AND_ALLERGIES: 'Medications & Allergies',
  FAMILY_AND_PERSONAL_HISTORY: 'Family & Personal History',
  REVIEW_OF_SYSTEMS: 'Review of Systems',
  PRIOR_INVESTIGATIONS: 'Prior Investigations',
};

export const SummaryPreviewPage: React.FC = () => {
  const { visitId } = useParams<{ visitId: string }>();
  const navigate = useNavigate();

  const [summary, setSummary] = useState<ClinicalSummaryDto | null>(null);
  const [versions, setVersions] = useState<ClinicalSummaryDto[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSummaryData = async () => {
    if (!visitId) return;
    setLoading(true);
    setError(null);
    try {
      const [latest, versionList] = await Promise.all([
        SummaryApi.getLatestSummary(visitId),
        SummaryApi.getSummaryVersions(visitId).catch(() => []),
      ]);
      setSummary(latest);
      setVersions(versionList);
      setSelectedVersion(latest.version);
    } catch (err: any) {
      setError(err?.message || 'Failed to load clinical summary draft');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummaryData();
  }, [visitId]);

  const handleVersionChange = async (verNumber: number) => {
    const matched = versions.find((v) => v.version === verNumber);
    if (matched) {
      setSummary(matched);
      setSelectedVersion(verNumber);
    }
  };

  const handleRegenerate = async () => {
    if (!visitId) return;
    setRegenerating(true);
    try {
      const regenerated = await SummaryApi.regenerateSummary(
        visitId,
        'Physician requested on-demand re-assembly'
      );
      setSummary(regenerated);
      setSelectedVersion(regenerated.version);
      const updatedVersions = await SummaryApi.getSummaryVersions(visitId).catch(() => []);
      setVersions(updatedVersions);
    } catch (err: any) {
      setError(err?.message || 'Failed to regenerate summary');
    } finally {
      setRegenerating(false);
    }
  };

  const getOriginBadge = (origin: StatementOrigin) => {
    switch (origin) {
      case 'MODEL':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
            <Cpu className="w-3 h-3" />
            Model Phrased
          </span>
        );
      case 'PATIENT_QUOTE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-teal-50 text-teal-700 border border-teal-200">
            Patient Quote
          </span>
        );
      case 'CODE_TEMPLATE':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
            Code Inserted
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] gap-3">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-slate-600 text-sm font-medium">Assembling and grounding clinical draft...</p>
      </div>
    );
  }

  if (error || !summary) {
    return (
      <div className="max-w-3xl mx-auto py-10 px-4">
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-rose-800">
          <div className="flex items-center gap-2 font-semibold mb-2 text-rose-900">
            <ShieldAlert className="w-5 h-5 text-rose-600" />
            Clinical Summary Unavailable
          </div>
          <p className="text-sm mb-4">{error || 'No summary could be loaded for this visit.'}</p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
            </Button>
            <Button variant="primary" onClick={fetchSummaryData}>
              Retry Intake Assembly
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              Clinical Summary Draft
              <span className="text-xs font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                Visit: {visitId}
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Version Selector */}
          {versions.length > 1 && (
            <div className="flex items-center gap-2 text-xs">
              <Layers className="w-4 h-4 text-slate-400" />
              <span className="text-slate-500 font-medium">Version:</span>
              <select
                value={selectedVersion || summary.version}
                onChange={(e) => handleVersionChange(Number(e.target.value))}
                className="bg-white border border-slate-300 rounded px-2.5 py-1 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {versions.map((v) => (
                  <option key={v.id} value={v.version}>
                    v{v.version} ({v.status}) {v.supersededBy ? '— Superseded' : '— Current'}
                  </option>
                ))}
              </select>
            </div>
          )}

          <Button
            variant="secondary"
            size="sm"
            onClick={handleRegenerate}
            disabled={regenerating}
            className="flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? 'animate-spin' : ''}`} />
            {regenerating ? 'Regenerating...' : 'Regenerate Draft'}
          </Button>
        </div>
      </div>

      {/* Safety Label Banner (Section 24 Requirement) */}
      <div className="mb-6 p-4 rounded-xl border border-amber-300 bg-amber-50/80 text-amber-950 flex items-start gap-3 shadow-sm">
        <AlertTriangle className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <div className="font-bold flex items-center gap-2">
            {summary.safetyLabel}
            <span className="text-xs font-normal text-amber-800">
              (Status: {summary.status})
            </span>
          </div>
          <p className="text-amber-800 text-xs mt-0.5">
            Foundation Preview Only. All statements are strictly grounded to intake answers and validated document fields.
            Physician review, editing, and confirmation will occur in Module 7.
          </p>
        </div>
      </div>

      {/* Draft Metadata Strip */}
      <Card className="p-4 mb-6 bg-slate-50/70 border-slate-200">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-500 block">Generation Mode</span>
            <span className="font-semibold text-slate-900 flex items-center gap-1.5 mt-0.5">
              {summary.generationMode === 'LLM' ? (
                <span className="text-blue-700 bg-blue-100 px-2 py-0.5 rounded font-mono font-medium">
                  LLM (Grounding Passed)
                </span>
              ) : (
                <span className="text-amber-800 bg-amber-100 px-2 py-0.5 rounded font-mono font-medium">
                  TEMPLATE_FALLBACK (Deterministic)
                </span>
              )}
            </span>
          </div>

          <div>
            <span className="text-slate-500 block">Input Integrity Hash</span>
            <span className="font-mono text-slate-700 flex items-center gap-1 mt-0.5">
              <Hash className="w-3 h-3 text-slate-400" />
              {summary.inputHash.substring(0, 12)}...
            </span>
          </div>

          <div>
            <span className="text-slate-500 block">Model & Prompt</span>
            <span className="font-mono text-slate-700 mt-0.5 block truncate">
              {summary.modelId || 'None'} @ {summary.promptTemplateVersion || 'baseline'}
            </span>
          </div>

          <div>
            <span className="text-slate-500 block">Generated At</span>
            <span className="text-slate-700 font-medium mt-0.5 block">
              {new Date(summary.generatedAt).toLocaleTimeString()} (v{summary.version})
            </span>
          </div>
        </div>
      </Card>

      {/* Structured Clinical Sections */}
      <div className="space-y-6">
        {summary.sections.map((section) => (
          <Card key={section.section} className="p-5 border-slate-200 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                {SECTION_DISPLAY_NAMES[section.section] || section.section}
              </h2>
              <span className="text-xs text-slate-400 font-mono">
                {section.statements.length} item{section.statements.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="space-y-3">
              {section.statements.map((stmt, idx) => (
                <div
                  key={stmt.id || idx}
                  className={`p-3 rounded-lg border text-sm transition-all ${
                    stmt.text.includes('Conflict')
                      ? 'bg-rose-50/70 border-rose-200'
                      : stmt.origin === 'PATIENT_QUOTE'
                      ? 'bg-teal-50/40 border-teal-200'
                      : stmt.origin === 'CODE_TEMPLATE'
                      ? 'bg-slate-50 border-slate-200'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2 mb-1.5">
                    <p
                      className={`text-sm ${
                        stmt.origin === 'PATIENT_QUOTE'
                          ? 'font-serif italic text-teal-950'
                          : stmt.text.includes('Conflict')
                          ? 'font-semibold text-rose-900'
                          : 'text-slate-900'
                      }`}
                    >
                      {stmt.text}
                    </p>
                    {getOriginBadge(stmt.origin)}
                  </div>

                  {/* Provenance Citations */}
                  {stmt.sources && stmt.sources.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                      <span className="font-medium text-slate-400">Sources:</span>
                      {stmt.sources.map((src, sIdx) => (
                        <span
                          key={sIdx}
                          className="font-mono bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-slate-600"
                        >
                          [{src.sourceType.toLowerCase()}: {src.sourceRef}]
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
