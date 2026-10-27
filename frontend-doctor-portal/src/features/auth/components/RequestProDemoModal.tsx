import React, { useState } from 'react';
import { X, Send, CheckCircle2, Sparkles } from 'lucide-react';
import { ThunaiHeartIcon } from '../../../components/ui/ThunaiLogo';

interface RequestProDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RequestProDemoModal: React.FC<RequestProDemoModalProps> = ({ isOpen, onClose }) => {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    hospitalName: '',
    contactName: '',
    workEmail: '',
    department: 'General Medicine / OPD',
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-[#FFFDF9] rounded-[32px] shadow-2xl border border-[#ECE2D8] w-full max-w-md p-7 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {submitted ? (
          <div className="py-6 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200 shadow-2xs">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-serif font-bold text-[#142B68]">
              Demo Request Received
            </h3>
            <p className="text-xs text-[#626A82] leading-relaxed max-w-xs mx-auto">
              Thank you for your interest in THUNAI Clinical Intelligence. Our clinical solutions specialist will reach out to <strong className="text-[#142B68]">{formData.workEmail || 'your institutional email'}</strong> within 24 business hours to schedule an executive demonstration.
            </p>
            <button
              onClick={() => {
                setSubmitted(false);
                onClose();
              }}
              className="mt-3 w-full py-3 px-5 bg-gradient-to-r from-[#7763C8] to-[#987FE0] hover:opacity-95 text-white rounded-full text-sm font-semibold shadow-md shadow-[#7763C8]/25 transition-all"
            >
              Return to Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-11 h-11 rounded-2xl bg-[#EDE6F8] flex items-center justify-center border border-[#DACCF0] shrink-0">
                <ThunaiHeartIcon size={30} />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-lg font-serif font-bold text-[#142B68]">
                    Request THUNAI Pro Demo
                  </h3>
                  <Sparkles className="w-4 h-4 text-[#7763C8]" />
                </div>
                <p className="text-xs text-[#626A82]">
                  Clinical Intelligence for Hospitals & Health Systems
                </p>
              </div>
            </div>

            <p className="text-xs text-[#626A82] leading-relaxed">
              Experience automated pre-consultation document extraction, triage red-flag detection, and AI clinical summaries in your OPD workflow.
            </p>

            <div>
              <label className="block text-xs font-semibold text-[#142B68] mb-1">
                Hospital or Clinic Name
              </label>
              <input
                type="text"
                required
                placeholder="Apollo Specialty Hospitals"
                value={formData.hospitalName}
                onChange={(e) => setFormData({ ...formData, hospitalName: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white border border-[#E3DAD1] rounded-xl text-sm text-[#142B68] placeholder:text-[#9AA2B8] focus:outline-hidden focus:ring-2 focus:ring-[#7763C8]/40 focus:border-[#7763C8]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#142B68] mb-1">
                Your Name & Clinical Role
              </label>
              <input
                type="text"
                required
                placeholder="Dr. Rajesh Kumar, Chief Medical Officer"
                value={formData.contactName}
                onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white border border-[#E3DAD1] rounded-xl text-sm text-[#142B68] placeholder:text-[#9AA2B8] focus:outline-hidden focus:ring-2 focus:ring-[#7763C8]/40 focus:border-[#7763C8]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#142B68] mb-1">
                Institutional Work Email
              </label>
              <input
                type="email"
                required
                placeholder="rajesh.kumar@hospital.org"
                value={formData.workEmail}
                onChange={(e) => setFormData({ ...formData, workEmail: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white border border-[#E3DAD1] rounded-xl text-sm text-[#142B68] placeholder:text-[#9AA2B8] focus:outline-hidden focus:ring-2 focus:ring-[#7763C8]/40 focus:border-[#7763C8]"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-xs font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 px-4 bg-gradient-to-r from-[#7763C8] to-[#987FE0] hover:opacity-95 text-white rounded-full text-xs font-bold shadow-md shadow-[#7763C8]/25 transition-all flex items-center justify-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit Request</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
