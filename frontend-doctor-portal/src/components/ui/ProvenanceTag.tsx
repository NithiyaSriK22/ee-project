import React from 'react';
import { FileText, CheckCircle2, AlertTriangle, HelpCircle } from 'lucide-react';
import { FieldProvenance } from '../../types/clinical.types';
import { Badge } from './Badge';

export interface ProvenanceTagProps {
  provenance: FieldProvenance;
  fieldName: string;
  fieldValue: string;
}

export const ProvenanceTag: React.FC<ProvenanceTagProps> = ({
  provenance,
  fieldName,
  fieldValue,
}) => {
  const getStatusIcon = () => {
    switch (provenance.status) {
      case 'VERIFIED':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'UNVERIFIED':
        return <AlertTriangle className="w-4 h-4 text-amber-600" />;
      case 'UNREADABLE':
        return <HelpCircle className="w-4 h-4 text-rose-600" />;
    }
  };

  return (
    <div
      className={`p-3.5 rounded-lg border text-sm transition-all ${
        provenance.status === 'VERIFIED'
          ? 'bg-emerald-50/40 border-emerald-200'
          : provenance.status === 'UNVERIFIED'
          ? 'bg-amber-50/40 border-amber-200'
          : 'bg-rose-50/40 border-rose-200'
      }`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className="font-semibold text-slate-900">{fieldName}</span>
        </div>
        <Badge status={provenance.status} />
      </div>

      <div className="font-mono text-sm font-medium text-slate-800 bg-white/80 px-2.5 py-1.5 rounded border border-slate-200 mb-2">
        {fieldValue}
      </div>

      <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
        <div className="flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-slate-400" />
          <span>Source: {provenance.sourceReference}</span>
        </div>
        <div className="flex items-center gap-2">
          {provenance.validationCheckApplied && (
            <span className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-[10px] text-slate-600">
              {provenance.validationCheckApplied}
            </span>
          )}
          <span className="font-medium text-slate-700">
            Conf: {Math.round(provenance.confidenceScore * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
};
