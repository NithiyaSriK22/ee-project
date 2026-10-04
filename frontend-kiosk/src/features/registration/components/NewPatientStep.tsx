import React, { useState } from 'react';
import { User, Users, Volume2, AlertCircle } from 'lucide-react';
import { StartKioskSessionPayload } from '../types/registration.types';

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
  const [fullName, setFullName] = useState(initialData.fullName || '');
  const [age, setAge] = useState<string>(initialData.age ? String(initialData.age) : '');
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'OTHER' | 'PREFER_NOT_TO_SAY'>(
    initialData.gender || 'MALE'
  );
  const [contactNumber, setContactNumber] = useState(initialData.contactNumber || '');
  const [emergencyContact, setEmergencyContact] = useState(initialData.emergencyContact || '');

  // Companion Assistance fields
  const [isCompanionAssisted, setIsCompanionAssisted] = useState(
    initialData.isCompanionAssisted ?? false
  );
  const [companionName, setCompanionName] = useState(initialData.companionName || '');
  const [companionRelationship, setCompanionRelationship] = useState(
    initialData.companionRelationship || 'Family Member'
  );

  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || fullName.trim().length < 2) {
      setError('Please provide patient full name (at least 2 characters).');
      return;
    }

    const parsedAge = parseInt(age, 10);
    if (isNaN(parsedAge) || parsedAge < 0 || parsedAge > 130) {
      setError('Please provide a valid age between 0 and 130.');
      return;
    }

    if (!contactNumber.trim() || contactNumber.trim().length < 7) {
      setError('Please provide a valid contact phone number.');
      return;
    }

    if (isCompanionAssisted && !companionName.trim()) {
      setError('Please provide the assisting companion / staff attendant name.');
      return;
    }

    setError(null);
    onSubmit({
      fullName: fullName.trim(),
      age: parsedAge,
      gender,
      contactNumber: contactNumber.trim(),
      emergencyContact: emergencyContact.trim() || undefined,
      isCompanionAssisted,
      companionName: isCompanionAssisted ? companionName.trim() : undefined,
      companionRelationship: isCompanionAssisted ? companionRelationship.trim() : undefined,
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in pb-8">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-teal-50 text-teal-800 text-xs font-semibold mb-2 border border-teal-200">
          <User className="w-4 h-4" />
          <span>Patient Identity & Demographics</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
          Basic Patient Information
        </h2>
        <p className="text-sm text-slate-600 mt-1">
          Minimal essential details required to begin your hospital case intake.
        </p>

        {onSpeakPrompt && (
          <button
            type="button"
            onClick={() =>
              onSpeakPrompt('Please enter the patient full name, age, gender, and contact phone number.')
            }
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 px-3 py-1 rounded-lg border border-teal-200 transition-colors"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>Listen Voice Instructions</span>
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
              Full Name / நோயாளியின் பெயர் <span className="text-rose-500">*</span>
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
                Age (Years) / வயது <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="patient-age"
                  type="number"
                  min="0"
                  max="130"
                  required
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  placeholder="e.g. 52"
                  className="w-full text-lg py-3 px-4 bg-slate-50 border-2 border-slate-300 rounded-2xl text-slate-900 focus:outline-hidden focus:ring-4 focus:ring-teal-500/20 focus:border-teal-600"
                />
              </div>
            </div>

            {/* Gender */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Gender / பாலினம் <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['MALE', 'FEMALE', 'OTHER'] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGender(g)}
                    className={`py-3 px-2 text-xs sm:text-sm font-bold rounded-2xl border-2 transition-all cursor-pointer ${
                      gender === g
                        ? 'border-teal-600 bg-teal-50 text-teal-800'
                        : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {g === 'MALE' ? 'Male (ஆண்)' : g === 'FEMALE' ? 'Female (பெண்)' : 'Other (பிற)'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Contact Number */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="contact-num" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Phone Number / அலைபேசி எண் <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="contact-num"
                  type="tel"
                  required
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  placeholder="9876543210"
                  className="w-full text-lg py-3 px-4 bg-slate-50 border-2 border-slate-300 rounded-2xl text-slate-900 focus:outline-hidden focus:ring-4 focus:ring-teal-500/20 focus:border-teal-600"
                />
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Used for OPD slip and clinical queue SMS
              </span>
            </div>

            <div>
              <label htmlFor="emergency-contact" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Emergency Contact (Optional)
              </label>
              <div className="relative">
                <input
                  id="emergency-contact"
                  type="tel"
                  value={emergencyContact}
                  onChange={(e) => setEmergencyContact(e.target.value)}
                  placeholder="Optional relative phone"
                  className="w-full text-lg py-3 px-4 bg-slate-50 border-2 border-slate-300 rounded-2xl text-slate-900 focus:outline-hidden focus:ring-4 focus:ring-teal-500/20 focus:border-teal-600"
                />
              </div>
            </div>
          </div>

          {/* Companion Assistance Section */}
          <div className="pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-800">
                    Companion / Attendant Assisted Registration
                  </div>
                  <div className="text-xs text-slate-500">
                    Is a family member or hospital staff completing this for the patient?
                  </div>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isCompanionAssisted}
                  onChange={(e) => setIsCompanionAssisted(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600" />
              </label>
            </div>

            {isCompanionAssisted && (
              <div className="mt-4 p-4 bg-amber-50/60 rounded-2xl border border-amber-200/80 space-y-4 animate-in fade-in">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="companion-name" className="block text-xs font-semibold text-slate-700 mb-1">
                      Companion / Staff Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="companion-name"
                      type="text"
                      required={isCompanionAssisted}
                      value={companionName}
                      onChange={(e) => setCompanionName(e.target.value)}
                      placeholder="e.g. Ramesh (Son) or Staff Attendant"
                      className="w-full py-2.5 px-3.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-600"
                    />
                  </div>

                  <div>
                    <label htmlFor="companion-rel" className="block text-xs font-semibold text-slate-700 mb-1">
                      Relationship to Patient
                    </label>
                    <select
                      id="companion-rel"
                      value={companionRelationship}
                      onChange={(e) => setCompanionRelationship(e.target.value)}
                      className="w-full py-2.5 px-3.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-teal-600"
                    >
                      <option value="Son">Son</option>
                      <option value="Daughter">Daughter</option>
                      <option value="Spouse">Spouse (Husband/Wife)</option>
                      <option value="Parent">Parent</option>
                      <option value="Sibling">Brother / Sister</option>
                      <option value="Hospital Staff Attendant">Hospital Staff Attendant</option>
                      <option value="Other Relative">Other Relative / Friend</option>
                    </select>
                  </div>
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
            ← Back
          </button>
          <button
            type="submit"
            className="flex-2 py-4 px-6 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-2xl text-base transition-colors flex items-center justify-center gap-2 shadow-lg shadow-teal-800/20 cursor-pointer"
          >
            <span>Proceed to Language & Consent →</span>
          </button>
        </div>
      </form>
    </div>
  );
};
