import React from 'react';
import { Headphones, X, Phone, Mail, Clock, ShieldCheck } from 'lucide-react';

interface SupportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupportModal: React.FC<SupportModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-800">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Physician Help & Support</h3>
              <p className="text-xs text-slate-500">MEDBRIEF Hospital IT & Clinical Operations Desk</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="p-4 rounded-xl bg-teal-50/60 border border-teal-200 text-xs text-teal-900 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-teal-950">
              <ShieldCheck className="w-4 h-4 text-teal-800" />
              <span>Priority Physician Support Line</span>
            </div>
            <p className="text-slate-600">
              For system technical assistance, document scanning issues, or kiosk connectivity escalation.
            </p>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-teal-300 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-teal-800/10 text-teal-800 flex items-center justify-center shrink-0">
                <Phone className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-slate-800">OPD Helpdesk Extension</p>
                <p className="text-slate-500 font-mono">Ext. 4022 / +91 (044) 2830-4022</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-teal-300 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-teal-800/10 text-teal-800 flex items-center justify-center shrink-0">
                <Mail className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-slate-800">Clinical Informatics Email</p>
                <p className="text-slate-500 font-mono">support@medbrief-health.internal</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-teal-300 transition-colors">
              <div className="w-8 h-8 rounded-lg bg-teal-800/10 text-teal-800 flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-slate-800">Operating Hours</p>
                <p className="text-slate-500">24/7 Clinical Emergency Support</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-teal-800 hover:bg-teal-900 text-white text-xs font-bold transition-all cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
