import React, { useState } from 'react';
import { WorkspaceStatementItem } from '../types/doctor-review.types';
import {
  Cpu,
  MessageSquare,
  Edit3,
  PlusCircle,
  HelpCircle,
  Trash2,
  Check,
  X,
  History,
  Info,
} from 'lucide-react';

interface StatementRowProps {
  statement: WorkspaceStatementItem;
  isSelected: boolean;
  onSelect: (statement: WorkspaceStatementItem) => void;
  onEdit: (statementId: string, editedText: string) => Promise<void>;
  onRemove: (statementId: string) => Promise<void>;
}

export const StatementRow: React.FC<StatementRowProps> = ({
  statement,
  isSelected,
  onSelect,
  onEdit,
  onRemove,
}) => {
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editText, setEditText] = useState<string>(statement.text);
  const [showOriginal, setShowOriginal] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!editText.trim()) return;
    setIsSaving(true);
    try {
      await onEdit(statement.id, editText.trim());
      setIsEditing(false);
    } catch (err: any) {
      alert(err?.message || 'Failed to save statement edit');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditText(statement.text);
    setIsEditing(false);
  };

  const handleRemove = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Remove this statement from the confirmed record? (The original draft will be preserved in audit history)')) {
      await onRemove(statement.id);
    }
  };

  const isPlaceholder = statement.text.toLowerCase().includes('illegible') || statement.text.toLowerCase().includes('verify manually');
  const isConflict = statement.text.toLowerCase().includes('conflict');

  const getOriginBadge = () => {
    if (statement.isDoctorAdded || statement.origin === 'DOCTOR_ADDED') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
          <PlusCircle className="w-3 h-3" /> Doctor Added
        </span>
      );
    }
    if (statement.isEdited || statement.origin === 'DOCTOR_EDITED') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
          <Edit3 className="w-3 h-3" /> Doctor Edited
        </span>
      );
    }
    if (statement.origin === 'PATIENT_QUOTE') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200">
          <MessageSquare className="w-3 h-3" /> Patient Quote
        </span>
      );
    }
    if (isPlaceholder || statement.origin === 'CODE_TEMPLATE') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
          <HelpCircle className="w-3 h-3 text-amber-700" /> Placeholder — Verify Manually
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
        <Cpu className="w-3 h-3" /> AI Draft — Not Confirmed
      </span>
    );
  };

  return (
    <div
      onClick={() => onSelect(statement)}
      className={`group relative p-3 rounded-xl border text-sm transition-all cursor-pointer ${
        isSelected
          ? 'ring-2 ring-red-500 bg-white border-red-300 shadow-sm'
          : statement.isDoctorAdded
          ? 'bg-indigo-50/20 border-indigo-200 hover:border-indigo-300'
          : statement.isEdited
          ? 'bg-emerald-50/20 border-emerald-200 hover:border-emerald-300'
          : isConflict
          ? 'bg-rose-50/40 border-rose-200 hover:border-rose-300'
          : isPlaceholder
          ? 'bg-amber-50/30 border-amber-200 hover:border-amber-300'
          : 'bg-white border-slate-200 hover:border-slate-300'
      }`}
    >
      {/* Top Header of Statement */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-2">
          {getOriginBadge()}
          {statement.sources.length > 0 && (
            <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
              <Info className="w-3 h-3" /> {statement.sources.length} source{statement.sources.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
          {statement.originalDraftText && statement.isEdited && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowOriginal(!showOriginal);
              }}
              title="Toggle original AI draft"
              className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            >
              <History className="w-3.5 h-3.5" />
            </button>
          )}

          {!isEditing && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
              title="Edit statement"
              className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={handleRemove}
            title="Remove statement"
            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Content Text or Inline Editor */}
      {isEditing ? (
        <div className="mt-2 space-y-2" onClick={(e) => e.stopPropagation()}>
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            rows={2}
            className="w-full text-xs font-medium p-2 rounded-lg border border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleCancel}
              className="px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !editText.trim()}
              className="px-3 py-1 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded flex items-center gap-1"
            >
              <Check className="w-3 h-3" /> {isSaving ? 'Saving...' : 'Save Edit'}
            </button>
          </div>
        </div>
      ) : (
        <div>
          <p
            className={`text-xs leading-relaxed ${
              statement.origin === 'PATIENT_QUOTE'
                ? 'font-serif italic text-teal-950 font-medium'
                : isPlaceholder
                ? 'font-mono text-amber-900 font-bold bg-amber-50/60 p-2 rounded border border-amber-200'
                : isConflict
                ? 'font-semibold text-rose-950'
                : statement.isDoctorAdded
                ? 'text-indigo-950 font-medium'
                : statement.isEdited
                ? 'text-slate-900 font-medium'
                : 'text-slate-800'
            }`}
          >
            {statement.origin === 'PATIENT_QUOTE' ? `"${statement.text}"` : statement.text}
          </p>

          {/* Toggleable Original Draft Text */}
          {showOriginal && statement.originalDraftText && (
            <div className="mt-2 p-2 bg-slate-100 rounded border border-slate-200 text-[11px] text-slate-600">
              <span className="font-bold uppercase tracking-wider text-[10px] text-slate-400 block mb-0.5">
                Original Draft (Module 5):
              </span>
              "{statement.originalDraftText}"
            </div>
          )}
        </div>
      )}
    </div>
  );
};
