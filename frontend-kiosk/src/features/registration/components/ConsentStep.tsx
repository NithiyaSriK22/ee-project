import React, { useState } from 'react';
import { ShieldCheck, Volume2, CheckCircle2, Bot, FileText, Stethoscope } from 'lucide-react';

interface ConsentStepProps {
  isCompanionAssisted: boolean;
  companionName?: string;
  onConsentComplete: (consents: {
    consentGranted: boolean;
    consentGrantedVia: 'patient' | 'companion' | 'staff_assisted';
  }) => void;
  onBack: () => void;
  isLoading?: boolean;
  onSpeakPrompt?: (text: string) => void;
}

export const ConsentStep: React.FC<ConsentStepProps> = ({
  isCompanionAssisted,
  companionName,
  onConsentComplete,
  onBack,
  isLoading = false,
  onSpeakPrompt,
}) => {
  const [agreeAll, setAgreeAll] = useState(true);
  const [grantedVia, setGrantedVia] = useState<'patient' | 'companion' | 'staff_assisted'>(
    isCompanionAssisted ? 'companion' : 'patient'
  );

  const consentPoints = [
    {
      icon: <FileText className="w-5 h-5 text-teal-700" />,
      title: 'OPD Visit Data Collection / வெளிநோயாளி பதிவு',
      description:
        'We collect your basic demographics and symptom answers to create your clinical intake record for today’s hospital visit.',
    },
    {
      icon: <Bot className="w-5 h-5 text-teal-700" />,
      title: 'AI Clinical Case-Taking Assistant / செயற்கை நுண்ணறிவு உதவி',
      description:
        'An AI assistant will organize your symptoms into a structured draft for the doctor. The AI does not diagnose or prescribe medicine.',
    },
    {
      icon: <Stethoscope className="w-5 h-5 text-teal-700" />,
      title: 'Doctor Sharing & Review / மருத்துவரிடம் பகிர்தல்',
      description:
        'Your answers will be securely transferred to your treating OPD physician who will verify and confirm all medical decisions.',
    },
  ];

  const handleAgree = () => {
    onConsentComplete({
      consentGranted: true,
      consentGrantedVia: grantedVia,
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in pb-8">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-50 text-teal-800 text-xs font-semibold mb-2 border border-teal-200">
          <ShieldCheck className="w-4 h-4" />
          <span>Patient Consent & Privacy / ஒப்புதல்</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
          Consent for Case-Taking & Care
        </h2>
        <p className="text-sm text-slate-600 mt-1">
          Simple and transparent consent for your outpatient visit and clinical assistance.
        </p>

        {onSpeakPrompt && (
          <button
            type="button"
            onClick={() =>
              onSpeakPrompt(
                'Please review the clinical intake consent. Your data is strictly used for your hospital care and shared only with your treating doctor.'
              )
            }
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 px-3 py-1 rounded-lg border border-teal-200 transition-colors"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>Read Aloud / வாசித்து கேட்கவும்</span>
          </button>
        )}
      </div>

      <div className="bg-white p-6 sm:p-8 rounded-3xl border-2 border-slate-200 shadow-sm space-y-5">
        <div className="space-y-4">
          {consentPoints.map((pt, i) => (
            <div
              key={i}
              className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-start gap-4"
            >
              <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center shrink-0">
                {pt.icon}
              </div>
              <div className="space-y-0.5">
                <div className="text-sm font-bold text-slate-900">{pt.title}</div>
                <p className="text-xs text-slate-600 leading-relaxed">{pt.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Who is granting consent? */}
        <div className="pt-4 border-t border-slate-200">
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Consent Provided By / ஒப்புதல் அளிப்பவர்:
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setGrantedVia('patient')}
              className={`p-3 rounded-xl border-2 text-left text-xs font-bold transition-all cursor-pointer ${
                grantedVia === 'patient'
                  ? 'border-teal-600 bg-teal-50 text-teal-800 ring-2 ring-teal-500/20'
                  : 'border-slate-200 bg-slate-50 text-slate-600'
              }`}
            >
              Patient Themselves (நோயாளி நேரடியாக)
            </button>
            <button
              type="button"
              onClick={() => setGrantedVia(isCompanionAssisted ? 'companion' : 'staff_assisted')}
              className={`p-3 rounded-xl border-2 text-left text-xs font-bold transition-all cursor-pointer ${
                grantedVia !== 'patient'
                  ? 'border-teal-600 bg-teal-50 text-teal-800 ring-2 ring-teal-500/20'
                  : 'border-slate-200 bg-slate-50 text-slate-600'
              }`}
            >
              {isCompanionAssisted
                ? `Companion / Family: ${companionName || 'Assisting Person'}`
                : 'Hospital Staff / Attendant on Behalf'}
            </button>
          </div>
        </div>

        {/* Big accessible confirmation checkbox */}
        <div
          onClick={() => setAgreeAll(!agreeAll)}
          className="p-4 bg-teal-50/70 border-2 border-teal-200 rounded-2xl flex items-center gap-3 cursor-pointer select-none"
        >
          <div
            className={`w-6 h-6 rounded-lg flex items-center justify-center transition-colors ${
              agreeAll ? 'bg-teal-700 text-white' : 'border-2 border-slate-300 bg-white'
            }`}
          >
            {agreeAll && <CheckCircle2 className="w-4 h-4" />}
          </div>
          <div className="text-xs sm:text-sm font-semibold text-slate-800">
            I understand and give consent to proceed with this OPD intake session.
          </div>
        </div>
      </div>

      <div className="flex gap-4 pt-2">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 py-4 px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-base transition-colors cursor-pointer"
        >
          ← Back
        </button>
        <button
          type="button"
          disabled={isLoading || !agreeAll}
          onClick={handleAgree}
          className="flex-2 py-4 px-6 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-2xl text-base transition-colors flex items-center justify-center gap-2 shadow-lg shadow-teal-800/20 disabled:opacity-50 cursor-pointer"
        >
          <span>{isLoading ? 'Creating Session...' : 'I Agree & Start Visit →'}</span>
        </button>
      </div>
    </div>
  );
};
