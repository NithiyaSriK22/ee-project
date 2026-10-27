import React, { useState } from 'react';
import { User, Users, Volume2, AlertCircle } from 'lucide-react';
import { StartKioskSessionPayload } from '../types/registration.types';
import { useLanguage } from '../../language/useLanguage';

interface NewPatientStepProps {
  initialData: Partial<StartKioskSessionPayload>;
  onSubmit: (data: Partial<StartKioskSessionPayload>) => void;
  onBack: () => void;
  onSpeakPrompt?: (text: string) => void;
}

export const NewPatientStep: React.FC<NewPatientStepProps> = ({
  initialData,
  onSubmit,
  onBack,
  onSpeakPrompt,
}) => {
  const { locale } = useLanguage();
  const [fullName, setFullName] = useState(initialData.fullName || '');
  const [age, setAge] = useState<string>(initialData.age ? String(initialData.age) : '');
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY'>(
    initialData.gender || 'MALE'
  );
  const [contactNumber, setContactNumber] = useState(initialData.contactNumber || '');
  const [emergencyContact] = useState(initialData.emergencyContact || '');

  // Companion Assistance fields
  const [isCompanionAssisted, setIsCompanionAssisted] = useState(
    initialData.isCompanionAssisted ?? false
  );
  const [companionName, setCompanionName] = useState(initialData.companionName || '');
  const [companionRelationship, setCompanionRelationship] = useState(
    initialData.companionRelationship || 'Family Member'
  );

  const [error, setError] = useState<string | null>(null);

  const parsedAgeNum = parseInt(age, 10);
  const isMinor = !isNaN(parsedAgeNum) && parsedAgeNum < 18;

  const handleAgeChange = (val: string) => {
    setAge(val);
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed < 18) {
      setIsCompanionAssisted(true);
      if (!companionRelationship || companionRelationship === 'Family Member') {
        setCompanionRelationship('Parent');
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || fullName.trim().length < 2) {
      setError(locale.newPatientErrorName);
      return;
    }

    const parsedAge = parseInt(age, 10);
    if (isNaN(parsedAge) || parsedAge < 0 || parsedAge > 130) {
      setError(locale.newPatientErrorAge);
      return;
    }

    if (!contactNumber.trim() || contactNumber.trim().length < 7) {
      setError(locale.newPatientErrorPhone);
      return;
    }

    if (parsedAge < 18 && (!isCompanionAssisted || !companionName.trim())) {
      setIsCompanionAssisted(true);
      setError('Parent or Legal Guardian name is required for minor patients under 18.');
      return;
    }

    if (isCompanionAssisted && !companionName.trim()) {
      setError(locale.newPatientErrorCompanion);
      return;
    }

    setError(null);
    onSubmit({
      fullName: fullName.trim(),
      age: parsedAge,
      gender,
      contactNumber: contactNumber.trim(),
      emergencyContact: emergencyContact.trim() || undefined,
      isCompanionAssisted: isCompanionAssisted || parsedAge < 18,
      companionName: companionName.trim() || undefined,
      companionRelationship: companionRelationship.trim() || (parsedAge < 18 ? 'Parent' : undefined),
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in pb-8">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-50 text-teal-800 text-xs font-semibold mb-2 border border-teal-200">
          <User className="w-4 h-4" />
          <span>{locale.newPatientBadge}</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
          {locale.newPatientHeading}
        </h2>
        <p className="text-sm text-slate-600 mt-1">
          {locale.newPatientSubtitle}
        </p>

        {onSpeakPrompt && (
          <button
            type="button"
            onClick={() => onSpeakPrompt(locale.newPatientSubtitle)}
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 px-3 py-1 rounded-lg border border-teal-200 transition-colors cursor-pointer"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>{locale.newPatientAudioButton}</span>
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2 text-xs text-rose-700 font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="bg-white p-6 sm:p-8 rounded-3xl border-2 border-slate-200 shadow-sm space-y-5">
          {/* Full Name */}
          <div>
            <label htmlFor="patient-name" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              {locale.newPatientFullName} <span className="text-rose-500">*</span>
            </label>
            <input
              id="patient-name"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Meenakshi Sundaram"
              className="w-full text-lg py-3 px-4 bg-slate-50 border-2 border-slate-300 rounded-2xl text-slate-900 focus:outline-hidden focus:ring-4 focus:ring-teal-500/20 focus:border-teal-600"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Age */}
            <div>
              <label htmlFor="patient-age" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                {locale.newPatientAge} <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="patient-age"
                  type="number"
                  min="0"
                  max="130"
                  required
                  value={age}
                  onChange={(e) => handleAgeChange(e.target.value)}
                  placeholder="e.g. 52"
                  className="w-full text-lg py-3 px-4 bg-slate-50 border-2 border-slate-300 rounded-2xl text-slate-900 focus:outline-hidden focus:ring-4 focus:ring-teal-500/20 focus:border-teal-600"
                />
              </div>
              {isMinor && (
                <div className="mt-2 text-[11px] font-semibold text-indigo-700 flex items-center gap-1.5 animate-in fade-in">
                  <span>ℹ️ Patient is under 18 — Parent / Guardian details required below</span>
                </div>
              )}
            </div>

            {/* Gender */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                {locale.newPatientGender} <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { value: 'MALE', label: locale.newPatientGenderMale },
                    { value: 'FEMALE', label: locale.newPatientGenderFemale },
                    { value: 'OTHER', label: locale.newPatientGenderOther },
                    { value: 'PREFER_NOT_TO_SAY', label: locale.newPatientGenderPreferNot },
                  ] as const
                ).map((g) => (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => setGender(g.value)}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      gender === g.value
                        ? 'border-teal-600 bg-teal-50 text-teal-800 ring-2 ring-teal-500/20'
                        : 'border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Contact Phone Number */}
          <div>
            <label htmlFor="contact-phone" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              {locale.newPatientPhone} <span className="text-rose-500">*</span>
            </label>
            <input
              id="contact-phone"
              type="tel"
              required
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value)}
              placeholder="e.g. 9876543210"
              className="w-full text-lg py-3 px-4 bg-slate-50 border-2 border-slate-300 rounded-2xl text-slate-900 focus:outline-hidden focus:ring-4 focus:ring-teal-500/20 focus:border-teal-600"
            />
          </div>

          {/* Optional Companion Assistance Details */}
          <div className="pt-3 border-t border-slate-200">
            <div
              onClick={() => setIsCompanionAssisted(!isCompanionAssisted)}
              className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100 rounded-2xl cursor-pointer border border-slate-200 select-none transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">
                    {locale.newPatientCompanionToggle}
                  </div>
                  <div className="text-xs text-slate-500">
                    {locale.newPatientCompanionDesc}
                  </div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={isCompanionAssisted}
                onChange={(e) => setIsCompanionAssisted(e.target.checked)}
                className="w-5 h-5 text-teal-600 rounded-md focus:ring-teal-500 pointer-events-none"
              />
            </div>

            {isCompanionAssisted && (
              <div className="mt-4 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 space-y-4 animate-in fade-in">
                <div>
                  <label htmlFor="companion-name" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    {locale.newPatientCompanionName} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="companion-name"
                    type="text"
                    required={isCompanionAssisted}
                    value={companionName}
                    onChange={(e) => setCompanionName(e.target.value)}
                    placeholder="e.g. Ramesh (Son)"
                    className="w-full text-sm py-2.5 px-3.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label htmlFor="companion-rel" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    {locale.newPatientCompanionRel}
                  </label>
                  <select
                    id="companion-rel"
                    value={companionRelationship}
                    onChange={(e) => setCompanionRelationship(e.target.value)}
                    className="w-full text-sm py-2.5 px-3.5 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="Spouse">{locale.newPatientRelSpouse}</option>
                    <option value="Parent">{locale.newPatientRelParent}</option>
                    <option value="Child">{locale.newPatientRelChild}</option>
                    <option value="Sibling">{locale.newPatientRelSibling}</option>
                    <option value="Other Relative">{locale.newPatientRelOther}</option>
                    <option value="Hospital Staff">{locale.newPatientRelStaff}</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-4 pt-2">
          <button
            type="button"
            onClick={onBack}
            className="flex-1 py-4 px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-base transition-colors cursor-pointer"
          >
            {locale.newPatientBack}
          </button>
          <button
            type="submit"
            className="flex-2 py-4 px-6 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-2xl text-base transition-colors flex items-center justify-center gap-2 shadow-lg shadow-teal-800/20 cursor-pointer"
          >
            <span>{locale.newPatientContinue}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
