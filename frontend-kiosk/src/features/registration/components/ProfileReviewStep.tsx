import React from 'react';
import { useKioskSession } from '../hooks/useKioskSession';
import { useLanguage } from '../../language/useLanguage';
import {
  CheckCircle2,
  User,
  Phone,
  Globe,
  Users,
  ShieldCheck,
  LogOut,
  ArrowRight,
  Clock,
  Sparkles,
  FileText,
} from 'lucide-react';

interface ProfileReviewStepProps {
  onProceedToInterview?: () => void;
  onProceedToDocuments?: () => void;
  onEndSession: () => void;
}

export const ProfileReviewStep: React.FC<ProfileReviewStepProps> = ({
  onProceedToInterview,
  onProceedToDocuments,
  onEndSession,
}) => {
  const { patient, visitProfile, session, consents, completion } = useKioskSession();
  const { locale, currentLanguage } = useLanguage();

  if (!patient || !session) {
    return null;
  }

  const ageUnit = currentLanguage === 'ta' ? 'ஆண்டுகள்' : 'years';

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in pb-8">
      <div className="text-center">
        <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3 border border-emerald-200">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-semibold mb-2 border border-emerald-200">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
          <span>{locale.readyBadge} ({completion?.completionPercentage || 100}%)</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
          {locale.readyHeading}
        </h2>
        <p className="text-sm text-slate-600 mt-1">
          {locale.readySubtitle}
        </p>
      </div>

      <div className="bg-white p-6 sm:p-8 rounded-3xl border-2 border-slate-200 shadow-sm space-y-6">
        {/* Hospital Card Header */}
        <div className="p-5 bg-gradient-to-r from-teal-700 to-teal-900 text-white rounded-2xl shadow-md flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-teal-200 uppercase tracking-wider block">
              {locale.readyRegNumberLabel}
            </span>
            <span className="text-2xl sm:text-3xl font-mono font-extrabold tracking-wider">
              {patient.hospitalRegistrationNumber}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-teal-200 block">{locale.readyVisitIdLabel}</span>
            <span className="text-xs font-mono font-semibold text-white/90">{session.visitId}</span>
          </div>
        </div>

        {/* Structured Demographic Facts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
              <User className="w-3.5 h-3.5 text-teal-700" />
              <span>{locale.readyPatientNameLabel}</span>
            </div>
            <div className="text-base font-bold text-slate-900">{patient.fullName}</div>
            <div className="text-xs text-slate-600 mt-0.5">
              {patient.age ? `${patient.age} ${ageUnit}` : ''} • {patient.gender}
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
              <Phone className="w-3.5 h-3.5 text-teal-700" />
              <span>{locale.readyContactLabel}</span>
            </div>
            <div className="text-base font-bold text-slate-900">{patient.contactNumber}</div>
            <div className="text-xs text-slate-500 mt-0.5">{locale.readyContactDesc}</div>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
              <Globe className="w-3.5 h-3.5 text-teal-700" />
              <span>{locale.readyLanguageLabel}</span>
            </div>
            <div className="text-base font-bold text-slate-900 uppercase">
              {visitProfile?.preferredLanguage || patient.preferredLanguage}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">{locale.readyLanguageDesc}</div>
          </div>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
              <Users className="w-3.5 h-3.5 text-teal-700" />
              <span>{locale.readyAssistanceLabel}</span>
            </div>
            <div className="text-base font-bold text-slate-900">
              {visitProfile?.isCompanionAssisted ? locale.readyCompanionAssisted : locale.readySelfRegistered}
            </div>
            {visitProfile?.isCompanionAssisted && (
              <div className="text-xs text-slate-600 mt-0.5">
                {visitProfile.companionName} ({visitProfile.companionRelationship || 'Family'})
              </div>
            )}
          </div>
        </div>

        {/* Consents Record */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-teal-700" />
              <span>{locale.readyConsentsLabel} ({consents.filter((c) => c.granted).length})</span>
            </div>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              {locale.readyVerifiedBadge}
            </span>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            {consents.map((c, i) => (
              <span
                key={i}
                className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700"
              >
                ✓ {c.consentType.replace(/_/g, ' ')} ({c.grantedVia})
              </span>
            ))}
          </div>
        </div>

        {/* Session Expiry Notice */}
        <div className="flex items-center gap-2 text-xs text-slate-500 justify-center">
          <Clock className="w-3.5 h-3.5 text-teal-600" />
          <span>{locale.readyExpiryNotice}</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <button
          type="button"
          onClick={onEndSession}
          className="py-4 px-6 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 font-bold rounded-2xl text-base transition-colors flex items-center justify-center gap-2 cursor-pointer border border-slate-200"
          title="End session and return to welcome to register a new patient"
        >
          <LogOut className="w-4 h-4" />
          <span>{currentLanguage === 'ta' ? 'புதிய பதிவு / வெளியேறு' : 'New Registration / Exit'}</span>
        </button>

        {onProceedToDocuments && (
          <button
            type="button"
            onClick={onProceedToDocuments}
            className="py-4 px-6 bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold rounded-2xl text-base transition-colors flex items-center justify-center gap-2 border border-teal-200 cursor-pointer"
          >
            <FileText className="w-5 h-5 text-teal-700" />
            <span>{currentLanguage === 'ta' ? 'ஆவணங்கள் ஸ்கேன்' : 'Scan Documents'}</span>
          </button>
        )}

        <button
          type="button"
          onClick={onProceedToInterview}
          className="flex-1 py-4 px-6 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-2xl text-base transition-colors flex items-center justify-center gap-2 shadow-lg shadow-teal-800/20 cursor-pointer"
        >
          <span>{locale.readyStartInterviewButton}</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
