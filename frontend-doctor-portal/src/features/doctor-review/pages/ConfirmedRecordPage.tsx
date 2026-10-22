import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DoctorReviewApi } from '../api/doctor-review.api';
import { ConfirmedRecordDTO, ConfirmedStatementDTO } from '../types/doctor-review.types';
import { AmendDialog } from '../components/AmendDialog';
import {
  ShieldCheck,
  FileCheck2,
  FileEdit,
  History,
  Layers,
  ArrowLeft,
  Calendar,
  User,
  AlertCircle,
  PlusCircle,
  Edit3,
  Cpu,
  RefreshCw,
  Printer,
} from 'lucide-react';

export const ConfirmedRecordPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [record, setRecord] = useState<ConfirmedRecordDTO | null>(null);
  const [versions, setVersions] = useState<ConfirmedRecordDTO[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isAmendOpen, setIsAmendOpen] = useState<boolean>(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);

    Promise.all([
      DoctorReviewApi.getConfirmedRecordById(id),
      DoctorReviewApi.getConfirmedRecordVersions(id).catch(() => []),
    ])
      .then(([rec, vers]) => {
        setRecord(rec);
        setVersions(vers);
      })
      .catch((err) => {
        setError(err?.message || 'Failed to load physician confirmed record');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  const handleVersionChange = (newId: string) => {
    navigate(`/confirmed-records/${newId}`);
  };

  const getOriginBadge = (origin: string) => {
    switch (origin) {
      case 'AI_CONFIRMED_UNCHANGED':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
            <Cpu className="w-3 h-3" /> AI Confirmed Unchanged
          </span>
        );
      case 'DOCTOR_EDITED':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Edit3 className="w-3 h-3" /> Doctor Edited
          </span>
        );
      case 'DOCTOR_ADDED':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
            <PlusCircle className="w-3 h-3" /> Doctor Added
          </span>
        );
      case 'TO_CLARIFY':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-300">
            <AlertCircle className="w-3 h-3 text-amber-700" /> To Clarify with Patient
          </span>
        );
      case 'CODE_PLACEHOLDER_RESOLVED':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
            Placeholder Resolved
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] gap-3">
        <RefreshCw className="w-8 h-8 text-red-600 animate-spin" />
        <p className="text-slate-600 text-sm font-medium">Retrieving immutable clinical record...</p>
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="max-w-3xl mx-auto py-10 px-4">
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-rose-800">
          <div className="flex items-center gap-2 font-semibold mb-2 text-rose-900">
            <ShieldCheck className="w-5 h-5 text-rose-600" />
            Confirmed Record Not Found
          </div>
          <p className="text-sm mb-4">{error || 'Could not find the requested confirmed record.'}</p>
          <button
            onClick={() => navigate('/review')}
            className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700"
          >
            Return to Review Queue
          </button>
        </div>
      </div>
    );
  }

  // Group statements by section
  const statementsBySection = record.statements.reduce<Record<string, ConfirmedStatementDTO[]>>(
    (acc, stmt) => {
      if (!acc[stmt.section]) acc[stmt.section] = [];
      acc[stmt.section].push(stmt);
      return acc;
    },
    {}
  );

  return (
    <div className="max-w-5xl mx-auto py-6 px-4 space-y-6">
      {/* Top Header Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/review')}
            className="p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">Physician-Confirmed Clinical Record</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Immutable v{record.version}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Official hospital medical record entry confirmed by treating physician.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Version Selector */}
          {versions.length > 1 && (
            <div className="flex items-center gap-2 text-xs">
              <Layers className="w-4 h-4 text-slate-400" />
              <select
                value={record.id}
                onChange={(e) => handleVersionChange(e.target.value)}
                className="bg-white border border-slate-300 rounded px-2.5 py-1 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-red-500"
              >
                {versions.map((v) => (
                  <option key={v.id} value={v.id}>
                    Version v{v.version} ({new Date(v.confirmedAt).toLocaleDateString()})
                    {v.supersedesId ? ' — Amended' : ' — Original'}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={() => window.print()}
            className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1"
          >
            <Printer className="w-3.5 h-3.5" /> Print
          </button>

          <button
            onClick={() => setIsAmendOpen(true)}
            className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
          >
            <FileEdit className="w-3.5 h-3.5" /> Amend Record
          </button>
        </div>
      </div>

      {/* Amendment Notice Banner if record supersedes an older version */}
      {record.supersedesId && (
        <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-300 text-amber-950 text-xs flex items-center gap-2.5">
          <History className="w-4 h-4 text-amber-700 flex-shrink-0" />
          <div>
            <span className="font-bold">Record Amendment (Version v{record.version}): </span>
            <span>Reason: "{record.amendmentReason || 'Clinical update by physician'}"</span>
          </div>
        </div>
      )}

      {/* Official Clinical Metadata Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-400 font-bold uppercase block text-[10px]">Confirmed By</span>
            <span className="font-bold text-slate-900 flex items-center gap-1 mt-0.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              {record.confirmedByDoctorName || record.confirmedByDoctorId}
            </span>
          </div>

          <div>
            <span className="text-slate-400 font-bold uppercase block text-[10px]">Confirmed Timestamp</span>
            <span className="font-bold text-slate-900 flex items-center gap-1 mt-0.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              {new Date(record.confirmedAt).toLocaleString()}
            </span>
          </div>

          <div>
            <span className="text-slate-400 font-bold uppercase block text-[10px]">Attestation Version</span>
            <span className="font-mono text-slate-700 font-bold block mt-0.5">
              {record.attestationVersion}
            </span>
          </div>

          <div>
            <span className="text-slate-400 font-bold uppercase block text-[10px]">Review Policy Version</span>
            <span className="font-mono text-slate-700 font-bold block mt-0.5">
              {record.reviewPolicyVersion}
            </span>
          </div>
        </div>

        {record.attestationText && (
          <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500 italic bg-slate-50 p-2.5 rounded">
            <span className="font-bold not-italic text-slate-700">Attestation Signed: </span>
            "{record.attestationText}"
          </div>
        )}
      </div>

      {/* Structured Confirmed Sections */}
      <div className="space-y-4">
        {Object.entries(statementsBySection).map(([section, statements]) => (
          <div key={section} className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-emerald-600" />
                {section.replace(/_/g, ' ')}
              </h2>
              <span className="text-xs text-slate-400 font-mono">
                {statements.length} confirmed statement{statements.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="space-y-2.5">
              {statements.map((stmt, sIdx) => (
                <div
                  key={stmt.id || sIdx}
                  className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                    stmt.origin === 'TO_CLARIFY'
                      ? 'bg-amber-50/50 border-amber-200'
                      : stmt.origin === 'DOCTOR_EDITED'
                      ? 'bg-emerald-50/30 border-emerald-200'
                      : stmt.origin === 'DOCTOR_ADDED'
                      ? 'bg-indigo-50/30 border-indigo-200'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    {getOriginBadge(stmt.origin)}
                    {stmt.resolutionType && (
                      <span className="font-mono text-[10px] text-slate-500">
                        Resolution: {stmt.resolutionType}
                      </span>
                    )}
                  </div>

                  <p
                    className={`font-medium text-slate-900 leading-relaxed ${
                      stmt.origin === 'TO_CLARIFY' ? 'text-amber-950 font-semibold' : ''
                    }`}
                  >
                    {stmt.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Amendment Modal */}
      {isAmendOpen && (
        <AmendDialog
          record={record}
          isOpen={isAmendOpen}
          onClose={() => setIsAmendOpen(false)}
          onSuccess={(newRecord) => {
            setRecord(newRecord);
            setVersions((prev) => [newRecord, ...prev]);
            navigate(`/confirmed-records/${newRecord.id}`);
          }}
        />
      )}
    </div>
  );
};
