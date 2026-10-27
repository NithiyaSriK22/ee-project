import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useKioskSession } from '../hooks/useKioskSession';
import { StartKioskSessionPayload, SupportedLanguage } from '../types/registration.types';
import { WelcomeStep } from '../components/WelcomeStep';
import { ReturningPatientStep } from '../components/ReturningPatientStep';
import { NewPatientStep } from '../components/NewPatientStep';
import { LanguageSelectionStep } from '../components/LanguageSelectionStep';
import { ConsentStep } from '../components/ConsentStep';
import { ProfileReviewStep } from '../components/ProfileReviewStep';
import { Volume2, HelpCircle, AlertCircle } from 'lucide-react';
import { useLanguage } from '../../language/useLanguage';

type WizardStep = 'welcome' | 'returning-lookup' | 'new-patient' | 'language' | 'consent' | 'review';

export const KioskRegistrationPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { startSession, endSession, isSessionActive, isLoading, error } = useKioskSession();
  const { currentLanguage, locale, l } = useLanguage();

  const [step, setStep] = useState<WizardStep>(isSessionActive ? 'review' : 'welcome');
  const [formData, setFormData] = useState<Partial<StartKioskSessionPayload>>({
    preferredLanguage: currentLanguage as SupportedLanguage,
    isCompanionAssisted: false,
  });

  // Handle explicit reset request (from error screens or query parameters)
  useEffect(() => {
    if (location.search.includes('reset') || (location.state as any)?.resetSession) {
      endSession().then(() => setStep('welcome'));
    }
  }, [location, endSession]);

  // Keep step aligned if session ends
  useEffect(() => {
    if (!isSessionActive && step === 'review') {
      setStep('welcome');
    }
  }, [isSessionActive, step]);

  // Keep form language aligned with active language
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      preferredLanguage: currentLanguage as SupportedLanguage,
    }));
  }, [currentLanguage]);

  const [audioFeedback, setAudioFeedback] = useState<string | null>(null);

  const speakText = (text: string) => {
    setAudioFeedback(text);
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleSelectFlow = (flow: 'new' | 'returning') => {
    if (flow === 'new') {
      setStep('new-patient');
    } else {
      setStep('returning-lookup');
    }
  };

  const handleReturningSubmit = async (regNumber: string) => {
    const updatedData: StartKioskSessionPayload = {
      ...formData,
      hospitalRegistrationNumber: regNumber,
    };
    setFormData(updatedData);
    setStep('language');
  };

  const handleNewPatientSubmit = (patientData: Partial<StartKioskSessionPayload>) => {
    setFormData((prev) => ({ ...prev, ...patientData }));
    setStep('language');
  };

  const handleLanguageSelect = (lang: SupportedLanguage) => {
    setFormData((prev) => ({ ...prev, preferredLanguage: lang }));
    setStep('consent');
  };

  const handleConsentComplete = async (consentData: {
    consentGranted: boolean;
    consentGrantedVia: 'patient' | 'companion' | 'staff_assisted';
  }) => {
    const fullPayload: StartKioskSessionPayload = {
      ...formData,
      consentGranted: consentData.consentGranted,
      consentGrantedVia: consentData.consentGrantedVia,
    };

    try {
      await startSession(fullPayload);
      setStep('review');
    } catch {
      // Error handled in session context
    }
  };

  const handleEndSession = async () => {
    await endSession();
    setFormData({ preferredLanguage: 'en', isCompanionAssisted: false });
    setStep('welcome');
  };

  const handleProceedToInterview = () => {
    navigate('/interview');
  };

  const handleProceedToDocuments = () => {
    navigate('/documents/scan');
  };

  const stepLabels = [
    { id: 'welcome', label: locale.stepWelcome },
    { id: 'patient-info', label: locale.stepIdentity },
    { id: 'language', label: locale.stepLanguage },
    { id: 'consent', label: locale.stepConsent },
    { id: 'review', label: locale.stepReady },
  ];

  const getActiveStepIndex = () => {
    switch (step) {
      case 'welcome':
        return 0;
      case 'returning-lookup':
      case 'new-patient':
        return 1;
      case 'language':
        return 2;
      case 'consent':
        return 3;
      case 'review':
        return 4;
    }
  };

  return (
    <div className="space-y-6">
      {/* Kiosk Accessibility Header / Progress Tracker */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-1 sm:gap-2">
          {stepLabels.map((s, idx) => {
            const activeIdx = getActiveStepIndex();
            const isCurrent = idx === activeIdx;
            const isCompleted = idx < activeIdx;

            return (
              <div key={s.id} className="flex items-center gap-1 sm:gap-2">
                <span
                  className={`text-xs sm:text-sm font-bold px-2.5 py-1 rounded-xl transition-all ${
                    isCurrent
                      ? 'bg-teal-700 text-white shadow-xs'
                      : isCompleted
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {s.label}
                </span>
                {idx < stepLabels.length - 1 && (
                  <span className="text-slate-300 font-bold hidden sm:inline">→</span>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              speakText(
                l(
                  'Assistance is available. Hospital staff attendants can assist at any step.',
                  'உதவி வசதி உள்ளது. எந்த நிலையிலும் மருத்துவமனை பணியாளர்களின் உதவியைப் பெறலாம்.'
                )
              )
            }
            className="p-2 text-slate-500 hover:text-teal-700 hover:bg-teal-50 rounded-xl transition-colors"
            title={l('Assistance Information', 'உதவி விவரம்')}
          >
            <HelpCircle className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Audio Announcement Bar (if triggered) */}
      {audioFeedback && (
        <div className="p-3 bg-teal-50/80 border border-teal-200 rounded-xl flex items-center justify-between text-xs text-teal-900 animate-in fade-in">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-teal-700 shrink-0" />
            <span className="font-medium">
              {l('Voice Guidance', 'குரல் வழிகாட்டுதல்')}: "{audioFeedback}"
            </span>
          </div>
          <button
            onClick={() => setAudioFeedback(null)}
            className="text-teal-700 font-bold text-xs hover:underline cursor-pointer"
          >
            {l('Dismiss', 'மூடு')}
          </button>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2 text-xs text-rose-700 font-medium">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Step Renderers */}
      {step === 'welcome' && (
        <WelcomeStep onSelectFlow={handleSelectFlow} onSpeakPrompt={speakText} />
      )}

      {step === 'returning-lookup' && (
        <ReturningPatientStep
          initialRegNumber={formData.hospitalRegistrationNumber}
          onSubmit={handleReturningSubmit}
          onBack={() => setStep('welcome')}
          isLoading={isLoading}
          onSpeakPrompt={speakText}
        />
      )}

      {step === 'new-patient' && (
        <NewPatientStep
          initialData={formData}
          onSubmit={handleNewPatientSubmit}
          onBack={() => setStep('welcome')}
          onSpeakPrompt={speakText}
        />
      )}

      {step === 'language' && (
        <div className="max-w-2xl mx-auto">
          <LanguageSelectionStep
            selectedLanguage={formData.preferredLanguage || 'en'}
            onSelectLanguage={handleLanguageSelect}
            onSpeakPrompt={speakText}
          />
          <div className="pt-4 flex justify-center">
            <button
              type="button"
              onClick={() =>
                setStep(formData.hospitalRegistrationNumber ? 'returning-lookup' : 'new-patient')
              }
              className="py-3 px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm cursor-pointer"
            >
              {locale.languageBack}
            </button>
          </div>
        </div>
      )}

      {step === 'consent' && (
        <ConsentStep
          isCompanionAssisted={formData.isCompanionAssisted || false}
          companionName={formData.companionName}
          onConsentComplete={handleConsentComplete}
          onBack={() => setStep('language')}
          isLoading={isLoading}
          onSpeakPrompt={speakText}
        />
      )}

      {step === 'review' && (
        <ProfileReviewStep
          onProceedToInterview={handleProceedToInterview}
          onProceedToDocuments={handleProceedToDocuments}
          onEndSession={handleEndSession}
        />
      )}
    </div>
  );
};
