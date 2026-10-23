import React from 'react';
import { CheckCircle2, Clock, X, ShieldAlert, Award } from 'lucide-react';

interface BuiltVsMockedPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BuiltVsMockedPanel: React.FC<BuiltVsMockedPanelProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white max-w-2xl w-full rounded-2xl shadow-2xl border border-[#e7e0d3] overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="built-mocked-title"
      >
        {/* Header */}
        <div className="bg-[#faf7f2] border-b border-[#e7e0d3] px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-[#b91c1c]/10 text-[#b91c1c]">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 id="built-mocked-title" className="text-lg font-bold text-[#1c1917] font-display">
                Built vs. Mocked Architecture
              </h2>
              <p className="text-xs text-[#78716c]">
                Honest engineering boundaries for the Thunai Hackathon Demo Slice
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#78716c] hover:bg-[#efe8dc] transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm">
          {/* Notice */}
          <div className="bg-[#fef2f2] border border-[#fecaca] rounded-xl p-3.5 flex items-start gap-3 text-[#7f1d1d]">
            <ShieldAlert className="w-5 h-5 flex-shrink-0 text-[#b91c1c] mt-0.5" />
            <div className="text-xs leading-relaxed">
              <strong className="font-semibold">Zero Invented Claims:</strong> Thunai is strictly an ASSISTIVE companion platform. 
              The deterministic validation gate governs truth; AI only organises verified facts; the licensed physician is the sole final authority.
            </div>
          </div>

          {/* Built Section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
              <h3 className="font-bold text-[#1c1917] text-xs uppercase tracking-wider">
                Fully Built in this Demo Slice (Functional Code)
              </h3>
            </div>
            <ul className="space-y-2.5 text-xs text-[#44403c]">
              <li className="flex items-start gap-2 bg-[#faf7f2] p-2.5 rounded-lg border border-[#e7e0d3]">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-[#1c1917]">Deterministic Validation Gate:</strong> Pure function algorithms enforce field trust states (<code className="bg-white px-1 py-0.5 rounded border border-[#e7e0d3]">VERIFIED</code>, <code className="bg-white px-1 py-0.5 rounded border border-[#e7e0d3]">UNVERIFIED</code>, <code className="bg-white px-1 py-0.5 rounded border border-[#e7e0d3]">UNREADABLE</code>, <code className="bg-white px-1 py-0.5 rounded border border-[#e7e0d3]">MISMATCH_FLAGGED</code>) with LASA safety margins.
                </div>
              </li>
              <li className="flex items-start gap-2 bg-[#faf7f2] p-2.5 rounded-lg border border-[#e7e0d3]">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-[#1c1917]">Uncertain Value Isolation:</strong> Code inserts explicit placeholders (<code className="text-[#b91c1c]">"Illegible in original document - verify manually"</code>). Uncertain text is never fed to language models.
                </div>
              </li>
              <li className="flex items-start gap-2 bg-[#faf7f2] p-2.5 rounded-lg border border-[#e7e0d3]">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-[#1c1917]">Server-Enforced Confirmation Gate:</strong> Doctor confirmation endpoint validates must-resolve items server-side and returns HTTP 409 if any unverified or flagged items remain unresolved.
                </div>
              </li>
              <li className="flex items-start gap-2 bg-[#faf7f2] p-2.5 rounded-lg border border-[#e7e0d3]">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-[#1c1917]">Immutable Records:</strong> Confirmed records are permanently locked against modifications via database triggers.
                </div>
              </li>
              <li className="flex items-start gap-2 bg-[#faf7f2] p-2.5 rounded-lg border border-[#e7e0d3]">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-[#1c1917]">Origin-Labelled Summary Lines:</strong> Every statement carries source references and origin tags (<code className="bg-white px-1 rounded">AUTO-INSERTED</code>, <code className="bg-white px-1 rounded">AI-PHRASED</code>, <code className="bg-white px-1 rounded">PATIENT QUOTE</code>, <code className="bg-white px-1 rounded">DOCTOR-EDITED</code>).
                </div>
              </li>
              <li className="flex items-start gap-2 bg-[#faf7f2] p-2.5 rounded-lg border border-[#e7e0d3]">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-[#1c1917]">Emergency Red-Flag 3-State Logic:</strong> Immediate alert on critical symptoms; unanswered critical questions trigger <code className="text-[#b45309]">STAFF_CHECK</code>, never silence.
                </div>
              </li>
              <li className="flex items-start gap-2 bg-[#faf7f2] p-2.5 rounded-lg border border-[#e7e0d3]">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-[#1c1917]">100% Offline Capability:</strong> Self-hosted @fontsource fonts, local SQLite, cached OCR fixtures, and synthetic seed datasets.
                </div>
              </li>
            </ul>
          </div>

          {/* Roadmap Only Section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <h3 className="font-bold text-[#1c1917] text-xs uppercase tracking-wider">
                Roadmap Only (Explicitly Not Built in this Demo Slice)
              </h3>
            </div>
            <ul className="space-y-2 text-xs text-[#78716c]">
              <li className="flex items-center gap-2 bg-amber-50/50 p-2 rounded-lg border border-amber-200/60">
                <Clock className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                <span>Live Tamil / multilingual voice input (speech-to-text models)</span>
              </li>
              <li className="flex items-center gap-2 bg-amber-50/50 p-2 rounded-lg border border-amber-200/60">
                <Clock className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                <span>Bidirectional Hospital EMR / HIS integration (HL7 / FHIR)</span>
              </li>
              <li className="flex items-center gap-2 bg-amber-50/50 p-2 rounded-lg border border-amber-200/60">
                <Clock className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                <span>Distributed multi-site offline database synchronization</span>
              </li>
              <li className="flex items-center gap-2 bg-amber-50/50 p-2 rounded-lg border border-amber-200/60">
                <Clock className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                <span>Custom OCR model calibration on handwritten government hospital slips</span>
              </li>
              <li className="flex items-center gap-2 bg-amber-50/50 p-2 rounded-lg border border-amber-200/60">
                <Clock className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                <span>Regulatory certifications (CDSCO / SaMD compliance)</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#faf7f2] border-t border-[#e7e0d3] px-6 py-3 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[#b91c1c] text-white hover:bg-[#991b1b] transition-colors font-medium text-xs shadow-xs"
          >
            Close Panel
          </button>
        </div>
      </div>
    </div>
  );
};
