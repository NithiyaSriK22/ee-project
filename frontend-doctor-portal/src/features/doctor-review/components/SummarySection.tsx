import React, { useState } from 'react';
import { WorkspaceSectionItem, WorkspaceStatementItem, MustResolveItem, ResolutionType } from '../types/doctor-review.types';
import { StatementRow } from './StatementRow';
import { MustResolveCard } from './MustResolveCard';
import { FileText, Plus, Check, X } from 'lucide-react';

interface SummarySectionProps {
  section: WorkspaceSectionItem;
  selectedStatement: WorkspaceStatementItem | null;
  mustResolveItems: MustResolveItem[];
  reviewId: string | null;
  onSelectStatement: (statement: WorkspaceStatementItem) => void;
  onEditStatement: (statementId: string, editedText: string) => Promise<void>;
  onRemoveStatement: (statementId: string) => Promise<void>;
  onAddStatement: (section: string, statementText: string) => Promise<void>;
  onResolveItem: (itemRef: string, resolutionType: ResolutionType, correctedValue?: string, viewedSource?: boolean) => Promise<void>;
}

const SECTION_TITLES: Record<string, string> = {
  CHIEF_COMPLAINT: 'Chief Complaint & Presenting Symptoms',
  HISTORY_OF_PRESENT_ILLNESS: 'History of Present Illness (HPI)',
  PAST_MEDICAL_HISTORY: 'Past Medical & Surgical History',
  MEDICATIONS_AND_ALLERGIES: 'Current Medications & Drug Allergies',
  FAMILY_AND_PERSONAL_HISTORY: 'Family & Personal History',
  REVIEW_OF_SYSTEMS: 'Review of Systems (ROS)',
  PRIOR_INVESTIGATIONS: 'Prior Investigations & Diagnostic Reports',
};

export const SummarySection: React.FC<SummarySectionProps> = ({
  section,
  selectedStatement,
  mustResolveItems,
  reviewId,
  onSelectStatement,
  onEditStatement,
  onRemoveStatement,
  onAddStatement,
  onResolveItem,
}) => {
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [newText, setNewText] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const title = SECTION_TITLES[section.section] || section.section.replace(/_/g, ' ');

  // Filter must-resolve items that belong to this section
  const sectionMustResolves = mustResolveItems.filter((item) => {
    const s = section.section.toLowerCase();
    const t = (item.title + ' ' + item.description).toLowerCase();
    if (s.includes('medication') || s.includes('allerg')) {
      return t.includes('drug') || t.includes('medication') || t.includes('allergy') || t.includes('prescription');
    }
    if (s.includes('complaint')) {
      return t.includes('complaint') || t.includes('symptom');
    }
    if (s.includes('history')) {
      return t.includes('history') || t.includes('past') || t.includes('condition');
    }
    return false;
  });

  const handleSaveNew = async () => {
    if (!newText.trim()) return;
    setIsSaving(true);
    try {
      await onAddStatement(section.section, newText.trim());
      setNewText('');
      setIsAdding(false);
    } catch (err: any) {
      alert(err?.message || 'Failed to add statement');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 space-y-3">
      {/* Section Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-red-600" />
          <h3 className="font-bold text-slate-900 text-sm">{title}</h3>
          <span className="text-xs text-slate-400 font-mono">
            ({section.statements.length})
          </span>
        </div>

        {!isAdding && (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1 text-xs font-semibold text-red-600 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add Statement
          </button>
        )}
      </div>

      {/* Inline Section Must-Resolve Cards if any */}
      {sectionMustResolves.length > 0 && (
        <div className="space-y-2 mb-2">
          {sectionMustResolves.map((item) => (
            <MustResolveCard
              key={item.itemRef}
              item={item}
              reviewId={reviewId}
              onResolve={onResolveItem}
            />
          ))}
        </div>
      )}

      {/* Statements in Section */}
      <div className="space-y-2">
        {section.statements.map((statement) => (
          <StatementRow
            key={statement.id}
            statement={statement}
            isSelected={selectedStatement?.id === statement.id}
            onSelect={onSelectStatement}
            onEdit={onEditStatement}
            onRemove={onRemoveStatement}
          />
        ))}

        {section.statements.length === 0 && !isAdding && (
          <div className="p-3 text-center text-xs text-slate-400 bg-slate-50 rounded-lg">
            No statements documented for this section yet.
          </div>
        )}
      </div>

      {/* Doctor Add Statement Input */}
      {isAdding && (
        <div className="p-3 bg-indigo-50/40 rounded-xl border border-indigo-200 space-y-2">
          <div className="text-xs font-bold text-indigo-900">Add Physician Statement to {title}:</div>
          <textarea
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            rows={2}
            placeholder="Type clinical finding, observation, or instruction..."
            className="w-full text-xs font-medium p-2.5 rounded-lg border border-indigo-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setNewText('');
                setIsAdding(false);
              }}
              className="px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveNew}
              disabled={isSaving || !newText.trim()}
              className="px-3 py-1 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded flex items-center gap-1 shadow-xs"
            >
              <Check className="w-3 h-3" /> {isSaving ? 'Adding...' : 'Add to Record'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
