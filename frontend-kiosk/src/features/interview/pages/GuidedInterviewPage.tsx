import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { interviewApi } from '../api/interview.api';
import {
  InterviewSessionState,
  InterviewQuestionItem,
  InterviewSection,
  AnsweredVia,
  AnsweredViaType,
} from '../types/interview.types';
import { InterviewProgressBar } from '../components/InterviewProgressBar';
import { SectionTransitionBanner } from '../components/SectionTransitionBanner';
import { StaffCompanionToggle } from '../components/StaffCompanionToggle';
import { VoicePromptControl } from '../components/VoicePromptControl';
import { QuestionRenderer } from '../components/QuestionRenderer';
import { InterviewReviewScreen } from '../components/InterviewReviewScreen';
import { useVoiceInput } from '../hooks/useVoiceInput';
import { useLanguage } from '../../language/useLanguage';
import { ConfirmAnswerDialog } from '../../voice/ConfirmAnswerDialog';
import { KioskAssistantModal } from '../../help/KioskAssistantModal';
import { LocalAnswerStore } from '../../offline/LocalAnswerStore';
import { SyncManager } from '../../offline/SyncManager';
import { apiClient } from '../../../lib/api-client';
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  Home,
  RotateCcw,
  Bot,
  FileText,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { useKioskSession } from '../../registration/hooks/useKioskSession';

export const GuidedInterviewPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentLanguage, getQuestionPrompt, isCaptionsMode } = useLanguage();
  const { endSession } = useKioskSession();

  // Core Session State
  const [sessionState, setSessionState] = useState<InterviewSessionState | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<InterviewQuestionItem | null>(null);
  const [currentAnswerValue, setCurrentAnswerValue] = useState<any>('');
  const [answeredMode, setAnsweredMode] = useState<AnsweredViaType>(AnsweredVia.TOUCH);

  // UI Flow States
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showReviewScreen, setShowReviewScreen] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const maxRetries = 3;

  // Guardian Mode Verification State for Minors
  const [isGuardianNeeded, setIsGuardianNeeded] = useState(false);
  const [guardianNameInput, setGuardianNameInput] = useState('');
  const [guardianRelInput, setGuardianRelInput] = useState('Parent');
  const [isSubmittingGuardian, setIsSubmittingGuardian] = useState(false);

  // Section Transition State
  const [transitioningSection, setTransitioningSection] = useState<InterviewSection | null>(null);
  const previousSectionRef = useRef<InterviewSection | null>(null);

  // Read-Back Confirmation Modal State for Critical Questions
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    promptText: string;
    confirmedValueLabel: string;
    candidateValue: any;
    isCritical: boolean;
  }>({
    isOpen: false,
    promptText: '',
    confirmedValueLabel: '',
    candidateValue: null,
    isCritical: false,
  });

  // Assistant & Voice Fallback Tracking
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [voiceFailuresCount, setVoiceFailuresCount] = useState(0);

  // Voice Hook
  const {
    isListening,
    isSpeaking,
    transcript,
    interimTranscript,
    error: voiceError,
    speak,
    stopSpeaking,
    startListening,
    stopListening,
    resetTranscript,
  } = useVoiceInput(currentLanguage);

  // Helper to load a question and speak translated prompt if not in captions-only mode
  const loadQuestion = useCallback((
    q: InterviewQuestionItem,
    stateObj: InterviewSessionState
  ) => {
    setCurrentQuestion(q);

    // Look up if an answer already exists for this question
    const existingAnswer = stateObj.answers.find((a) => a.questionId === q.id);
    if (existingAnswer) {
      setCurrentAnswerValue(existingAnswer.answerValue);
      setAnsweredMode(existingAnswer.answeredVia);
    } else {
      setCurrentAnswerValue('');
    }

    // Check for section change
    if (previousSectionRef.current && previousSectionRef.current !== q.section) {
      setTransitioningSection(q.section);
    }
    previousSectionRef.current = q.section;

    // Speak question audio in patient's language
    resetTranscript();
    if (!isCaptionsMode) {
      const translated = getQuestionPrompt(q.questionCode, q.promptText);
      speak(translated);
    }
  }, [getQuestionPrompt, isCaptionsMode, resetTranscript, speak]);

  // 1. Initialize or Resume Interview Session
  const initInterview = useCallback(async (isRetryAction = false) => {
    if (isRetryAction) {
      setIsRetrying(true);
    } else {
      setIsLoading(true);
    }
    setErrorMessage(null);

    try {
      const state = await interviewApi.startInterview();
      setSessionState(state);
      setRetryCount(0);

      // Sync any offline answers if reconnecting
      if (state.session.visitId) {
        SyncManager.syncPendingAnswers(state.session.visitId);
      }

      if (state.session.status === 'COMPLETED') {
        setIsCompleted(true);
        setShowReviewScreen(true);
      } else if (state.currentQuestion) {
        loadQuestion(state.currentQuestion, state);
      } else {
        setShowReviewScreen(true);
      }
    } catch (err: any) {
      if (isRetryAction) {
        setRetryCount((prev) => prev + 1);
      }

      const rawMsg = err.message || '';
      let friendlyMsg = rawMsg;

      const isMinorOrGuardian =
        rawMsg.toLowerCase().includes('minor') ||
        rawMsg.toLowerCase().includes('guardian');

      if (isMinorOrGuardian) {
        setIsGuardianNeeded(true);
        friendlyMsg =
          currentLanguage === 'ta'
            ? 'நோயாளி 18 வயதுக்குட்பட்டவர் (இளையவர்). மருத்துவ நேர்காணலைத் தொடங்க பெற்றோர் அல்லது பாதுகாவலரின் ஒப்புதல் தேவை.'
            : rawMsg || 'Patient is a minor. An adult guardian must provide verified consent before clinical intake.';
      } else if (err.status === 401 || rawMsg.toLowerCase().includes('token') || rawMsg.toLowerCase().includes('session')) {
        friendlyMsg =
          currentLanguage === 'ta'
            ? 'உங்கள் வருகை அமர்வு காணப்படவில்லை அல்லது காலாவதியாகிவிட்டது. தயவுசெய்து பதிவு மற்றும் ஒப்புதலை முடிக்கவும்.'
            : 'Your kiosk session was not found or has expired. Please complete registration and consent first.';
      } else if (err.status === 403 || rawMsg.toLowerCase().includes('consent')) {
        friendlyMsg =
          currentLanguage === 'ta'
            ? 'நேர்காணலைத் தொடங்க வருகைத் தரவு சேகரிப்பு ஒப்புதல் தேவை. தயவுசெய்து ஒப்புதல் படியை முடிக்கவும்.'
            : 'Patient consent for visit data collection is required before starting the clinical interview. Please complete the consent step.';
      } else if (!friendlyMsg) {
        friendlyMsg =
          currentLanguage === 'ta'
            ? 'நேர்காணல் அமர்வைத் தொடங்க முடியவில்லை. தயவுசெய்து பதிவு மற்றும் ஒப்புதலைச் சரிபார்க்கவும்.'
            : 'Failed to start interview session. Please verify registration and consent.';
      }

      setErrorMessage(friendlyMsg);
    } finally {
      setIsLoading(false);
      setIsRetrying(false);
    }
  }, [currentLanguage, loadQuestion]);

  useEffect(() => {
    initInterview(false);

    return () => {
      stopSpeaking();
      stopListening();
    };
  }, [initInterview, stopListening, stopSpeaking]);

  // Voice transcript processing with deterministic backend synonym mapping
  useEffect(() => {
    if (!transcript || !currentQuestion) return;

    const handleVoiceMapping = async () => {
      try {
        const res = await apiClient.post<{
          success: boolean;
          data: {
            matchedOptionCode?: string;
            canonicalValue?: any;
            confirmedDisplayLabel?: string;
            requiresReadBackConfirmation: boolean;
            readBackPrompt?: string;
            fallbackToTouch: boolean;
            isPreferNotToAnswer: boolean;
          };
        }>('/kiosk/voice/map-answer', {
          transcript,
          confidence: 0.95,
          questionCode: currentQuestion.questionCode,
          questionType: currentQuestion.questionType,
          language: currentLanguage,
          isCritical: currentQuestion.isCritical,
          permittedOptions: currentQuestion.answerOptions,
        });

        const mapping = res.data?.data;
        if (!mapping) return;

        if (mapping.fallbackToTouch) {
          setVoiceFailuresCount((prev) => {
            const next = prev + 1;
            if (next >= 3) {
              setErrorMessage(
                'Voice recognition is encountering background noise. Please tap your answer on screen, or tap "I Need Help" for staff assistance.'
              );
            }
            return next;
          });
        } else if (mapping.isPreferNotToAnswer) {
          handleSkipQuestion();
        } else if (mapping.requiresReadBackConfirmation) {
          // Read-back confirmation required for critical question
          setConfirmDialog({
            isOpen: true,
            promptText: mapping.readBackPrompt || `You said: "${mapping.confirmedDisplayLabel}". Is that correct?`,
            confirmedValueLabel: mapping.confirmedDisplayLabel || String(mapping.canonicalValue),
            candidateValue: mapping.canonicalValue,
            isCritical: currentQuestion.isCritical,
          });
          speak(mapping.readBackPrompt || `You said: ${mapping.confirmedDisplayLabel}. Is that correct?`);
        } else if (mapping.canonicalValue !== undefined) {
          setCurrentAnswerValue(mapping.canonicalValue);
          setAnsweredMode(AnsweredVia.VOICE);
          if (voiceFailuresCount > 0) setVoiceFailuresCount(0);
        }
      } catch {
        // Fallback to touch
      }
    };

    handleVoiceMapping();
  }, [transcript]);

  // 2. Submit Answer (with offline fallback and sync resilience)
  const handleSaveAndContinue = async (overrideValue?: any) => {
    if (!currentQuestion) return;

    const valToSave = overrideValue !== undefined ? overrideValue : currentAnswerValue;
    setIsSubmitting(true);
    setErrorMessage(null);
    stopSpeaking();
    stopListening();

    const modeToSubmit = isListening || transcript ? AnsweredVia.VOICE : answeredMode;

    try {
      const result = await interviewApi.submitAnswer({
        questionId: currentQuestion.id,
        answerValue: valToSave,
        answeredVia: modeToSubmit,
        languageUsed: currentLanguage,
        isSkipped: false,
      });

      if (result.sessionState) {
        setSessionState(result.sessionState);

        if (result.isFinished || !result.nextQuestionId) {
          setShowReviewScreen(true);
        } else {
          const nextQ = result.sessionState.allQuestions.find(
            (q) => q.id === result.nextQuestionId
          );
          if (nextQ) {
            loadQuestion(nextQ, result.sessionState);
          } else {
            setShowReviewScreen(true);
          }
        }
      } else {
        setShowReviewScreen(true);
      }
    } catch (err: any) {
      // OFFLINE RESILIENCE: Save locally in session store and continue
      if (sessionState?.session.visitId) {
        LocalAnswerStore.saveAnswer(sessionState.session.visitId, {
          questionId: currentQuestion.id,
          questionCode: currentQuestion.questionCode,
          answerValue: valToSave,
          answeredVia: modeToSubmit,
          languageUsed: currentLanguage,
          isCritical: currentQuestion.isCritical,
          isSkipped: false,
          answeredAt: new Date().toISOString(),
        });

        // Find next sequential question locally
        const nextQ = sessionState.allQuestions.find((q) => q.order > currentQuestion.order);
        if (nextQ) {
          loadQuestion(nextQ, sessionState);
        } else {
          setShowReviewScreen(true);
        }
        return;
      }
      setErrorMessage(err.message || 'Failed to save answer. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Skip Question
  const handleSkipQuestion = async () => {
    if (!currentQuestion) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    stopSpeaking();
    stopListening();

    try {
      const result = await interviewApi.submitAnswer({
        questionId: currentQuestion.id,
        answerValue: null,
        answeredVia: answeredMode,
        languageUsed: currentLanguage,
        isSkipped: true,
      });

      if (result.sessionState) {
        setSessionState(result.sessionState);
        if (result.isFinished || !result.nextQuestionId) {
          setShowReviewScreen(true);
        } else {
          const nextQ = result.sessionState.allQuestions.find(
            (q) => q.id === result.nextQuestionId
          );
          if (nextQ) {
            loadQuestion(nextQ, result.sessionState);
          } else {
            setShowReviewScreen(true);
          }
        }
      }
    } catch {
      // Offline skip fallback
      if (sessionState?.session.visitId) {
        LocalAnswerStore.saveAnswer(sessionState.session.visitId, {
          questionId: currentQuestion.id,
          questionCode: currentQuestion.questionCode,
          answerValue: null,
          answeredVia: answeredMode,
          languageUsed: currentLanguage,
          isCritical: currentQuestion.isCritical,
          isSkipped: true,
          answeredAt: new Date().toISOString(),
        });
        const nextQ = sessionState.allQuestions.find((q) => q.order > currentQuestion.order);
        if (nextQ) {
          loadQuestion(nextQ, sessionState);
        } else {
          setShowReviewScreen(true);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Confirm read-back critical answer
  const handleConfirmCriticalAnswer = () => {
    const val = confirmDialog.candidateValue;
    setConfirmDialog({ ...confirmDialog, isOpen: false });
    handleSaveAndContinue(val);
  };

  const handleRejectCriticalAnswer = () => {
    setConfirmDialog({ ...confirmDialog, isOpen: false });
    resetTranscript();
    // Switch to touch fallback
    setAnsweredMode(AnsweredVia.TOUCH);
  };

  // Edit specific question from review screen
  const handleEditQuestion = (questionId: string) => {
    if (!sessionState) return;
    const targetQ = sessionState.allQuestions.find((q) => q.id === questionId);
    if (targetQ) {
      setShowReviewScreen(false);
      loadQuestion(targetQ, sessionState);
    }
  };

  // Complete Entire Interview
  const handleFinalComplete = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      // If any pending offline answers remain, sync them first
      if (sessionState?.session.visitId) {
        await SyncManager.syncPendingAnswers(sessionState.session.visitId);
      }
      await interviewApi.completeInterview();
      setIsCompleted(true);
      if (!isCaptionsMode) {
        speak(
          currentLanguage === 'ta'
            ? 'நன்றி. உங்கள் மருத்துவ பரிசோதனை கேள்விகள் நிறைவடைந்தன. தயவுசெய்து காத்திருப்பு அறைக்கு செல்லவும்.'
            : 'Thank you. Your clinical intake is complete. Please proceed to the waiting area or doctor consultation.'
        );
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to complete interview.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render: Loading Screen
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white p-6">
        <Loader2 className="w-12 h-12 text-teal-400 animate-spin mb-4" />
        <h2 className="text-xl font-bold">
          {currentLanguage === 'ta' ? 'கேள்விகள் ஏற்றப்படுகின்றன...' : 'Preparing Your Guided Intake...'}
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          {currentLanguage === 'ta' ? 'மருத்துவ கேள்வி வங்கி' : 'Loading clinical question bank'}
        </p>
      </div>
    );
  }

  // Render: Completed Success Screen
  if (isCompleted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white p-6 animate-fadeIn">
        <div className="max-w-md w-full bg-slate-900 border border-teal-500/40 rounded-3xl p-8 text-center shadow-2xl space-y-6">
          <div className="w-20 h-20 rounded-full bg-teal-500/20 border-2 border-teal-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-12 h-12 text-teal-400" />
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold text-white">
              {currentLanguage === 'ta' ? 'பதிவு நிறைவடைந்தது' : 'Intake Completed'}
            </h1>
            <p className="text-sm text-slate-300">
              {currentLanguage === 'ta'
                ? 'உங்கள் பதில்கள் பதிவு செய்யப்பட்டுள்ளன. மருத்துவர் பரிசீலனைக்கு இவை தயாராக உள்ளன.'
                : "Your medical history has been recorded. All details have been structured and will be available for the doctor's review."}
            </p>
          </div>

          <div className="pt-4 flex flex-col gap-3">
            <button
              onClick={() => navigate('/documents/scan')}
              className="w-full py-4 px-6 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-base shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
            >
              <FileText className="w-5 h-5" />
              <span>{currentLanguage === 'ta' ? 'மருத்துவ ஆவணங்களை ஸ்கேன் செய்க' : 'Scan Prescriptions & Documents'}</span>
            </button>

            <button
              onClick={() => navigate('/')}
              className="w-full py-3.5 px-6 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm border border-slate-700 flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
            >
              <Home className="w-4 h-4 text-slate-400" />
              <span>{currentLanguage === 'ta' ? 'முகப்புக்குச் செல்' : 'Return to Kiosk Welcome'}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Handler to verify guardian consent when minor intake is blocked
  const handleVerifyGuardianConsent = async () => {
    if (!guardianNameInput.trim()) return;
    setIsSubmittingGuardian(true);
    try {
      await apiClient.post('/kiosk/interview/mode/guardian', {
        guardianName: guardianNameInput.trim(),
        guardianRelationship: guardianRelInput,
        guardianConsentVerified: true,
        minorAssentObtained: true,
      });
      setIsGuardianNeeded(false);
      setErrorMessage(null);
      await initInterview(true);
    } catch (err: any) {
      setErrorMessage(
        err.message || 'Failed to record guardian consent. Please ask hospital staff for assistance.'
      );
    } finally {
      setIsSubmittingGuardian(false);
    }
  };

  const handleGoToRegistration = async () => {
    try {
      await endSession();
    } catch {}
    navigate('/register');
  };

  // Render: Error / Blocked State
  if (errorMessage && !sessionState) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white p-6">
        <div className="max-w-md w-full bg-slate-900 border border-rose-500/40 rounded-3xl p-8 text-center shadow-2xl space-y-6">
          <AlertCircle className="w-14 h-14 text-rose-400 mx-auto" />
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white">
              {currentLanguage === 'ta' ? 'நேர்காணலைத் தொடங்க முடியவில்லை' : 'Cannot Begin Interview'}
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">{errorMessage}</p>
            {retryCount >= maxRetries && (
              <p className="text-xs text-amber-400 pt-1 font-medium">
                {currentLanguage === 'ta'
                  ? 'அதிகபட்ச முயற்சிகள் முடிவடைந்தது. தயவுசெய்து பதிவு மற்றும் ஒப்புதலுக்குச் செல்லவும் அல்லது ஊழியர்களை அணுகவும்.'
                  : 'Maximum retry attempts reached. Please proceed to Registration & Consent or contact hospital assistance.'}
              </p>
            )}
          </div>

          {/* Quick Guardian Consent Verification for Minors */}
          {isGuardianNeeded && (
            <div className="p-4 bg-slate-800/80 rounded-2xl border border-indigo-500/40 text-left space-y-3">
              <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
                <span>
                  {currentLanguage === 'ta' ? 'பெற்றோர் / பாதுகாவலர் ஒப்புதல்' : 'Parent / Guardian Consent'}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                {currentLanguage === 'ta'
                  ? 'நோயாளி 18 வயதுக்குட்பட்டவர். தொடர பெற்றோர் அல்லது பாதுகாவலர் பெயர் வழங்கவும்:'
                  : 'Patient is under 18. An accompanying parent, legal guardian, or staff attendant must confirm consent:'}
              </p>
              <div className="space-y-2">
                <input
                  type="text"
                  value={guardianNameInput}
                  onChange={(e) => setGuardianNameInput(e.target.value)}
                  placeholder={
                    currentLanguage === 'ta'
                      ? 'பெற்றோர் அல்லது பாதுகாவலர் பெயர்'
                      : 'Parent or Guardian Full Name'
                  }
                  className="w-full py-2.5 px-3 text-sm bg-slate-900 border border-slate-700 rounded-xl text-white placeholder:text-slate-500 focus:outline-hidden focus:border-indigo-500"
                />
                <select
                  value={guardianRelInput}
                  onChange={(e) => setGuardianRelInput(e.target.value)}
                  className="w-full py-2.5 px-3 text-sm bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-hidden focus:border-indigo-500"
                >
                  <option value="Parent">{currentLanguage === 'ta' ? 'பெற்றோர் (Parent)' : 'Parent'}</option>
                  <option value="Legal Guardian">
                    {currentLanguage === 'ta' ? 'சட்டப்பூர்வ பாதுகாவலர் (Legal Guardian)' : 'Legal Guardian'}
                  </option>
                  <option value="Hospital Staff">
                    {currentLanguage === 'ta' ? 'மருத்துவமனை பணியாளர் (Staff Attendant)' : 'Hospital Staff Attendant'}
                  </option>
                </select>
              </div>
              <button
                type="button"
                disabled={!guardianNameInput.trim() || isSubmittingGuardian}
                onClick={handleVerifyGuardianConsent}
                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
              >
                {isSubmittingGuardian ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{currentLanguage === 'ta' ? 'சரிபார்க்கிறது...' : 'Verifying...'}</span>
                  </>
                ) : (
                  <span>
                    {currentLanguage === 'ta'
                      ? 'ஒப்புதலை உறுதிசெய்து நேர்காணலைத் தொடங்கு'
                      : 'Confirm Consent & Begin Interview →'}
                  </span>
                )}
              </button>
            </div>
          )}

          <div className="flex flex-col gap-3 pt-2">
            <button
              id="btn-goto-registration"
              onClick={handleGoToRegistration}
              className="w-full py-3.5 px-6 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-lg shadow-teal-500/20"
            >
              <UserCheck className="w-4 h-4" />
              <span>
                {currentLanguage === 'ta'
                  ? 'பதிவு மற்றும் ஒப்புதலுக்குச் செல்'
                  : 'Start Fresh Registration & Consent'}
              </span>
            </button>
            <button
              id="btn-retry-interview"
              onClick={() => initInterview(true)}
              disabled={isRetrying || retryCount >= maxRetries}
              className="w-full py-3 px-6 rounded-2xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-300 text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors"
            >
              {isRetrying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-teal-400" />
                  <span>{currentLanguage === 'ta' ? 'மீண்டும் முயற்சிக்கிறது...' : 'Retrying...'}</span>
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4" />
                  <span>
                    {currentLanguage === 'ta' ? 'மீண்டும் முயற்சி செய்க' : 'Retry'}
                    {retryCount > 0 && retryCount < maxRetries ? ` (${retryCount}/${maxRetries})` : ''}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render: Review Screen
  if (showReviewScreen && sessionState) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col">
        <InterviewReviewScreen
          answers={sessionState.answers}
          allQuestions={sessionState.allQuestions}
          onEditQuestion={handleEditQuestion}
          onFinalSubmit={handleFinalComplete}
          isSubmitting={isSubmitting}
          onBackToInterview={
            currentQuestion ? () => setShowReviewScreen(false) : undefined
          }
        />
      </div>
    );
  }

  // Render: Active Question Screen
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between">
      {/* Section Transition Pop-over */}
      {transitioningSection && (
        <SectionTransitionBanner
          section={transitioningSection}
          onContinue={() => setTransitioningSection(null)}
        />
      )}

      {/* Top Header & Progress */}
      <header className="w-full">
        {sessionState && (
          <InterviewProgressBar
            currentQuestionIndex={sessionState.progress.currentQuestionIndex}
            totalQuestions={sessionState.progress.totalQuestions}
            percentage={sessionState.progress.percentage}
            currentSection={currentQuestion?.section}
            isCritical={currentQuestion?.isCritical}
          />
        )}

        <div className="max-w-4xl mx-auto px-6 py-3 flex items-center justify-between">
          <StaffCompanionToggle
            currentMode={answeredMode}
            onChange={setAnsweredMode}
          />

          <div className="flex items-center gap-3">
            {/* Assistant Trigger */}
            <button
              type="button"
              onClick={() => setIsAssistantOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-600 text-sky-400 text-xs font-bold transition-colors cursor-pointer"
            >
              <Bot className="w-4 h-4" />
              <span>{currentLanguage === 'ta' ? 'உதவியாளர்' : 'Ask Assistant'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowReviewScreen(true)}
              className="text-xs font-semibold text-teal-400 hover:text-teal-300 underline cursor-pointer"
            >
              {currentLanguage === 'ta' ? 'பதில்களைப் பார்க்க' : 'Preview Answers'} ({sessionState?.answers.length || 0})
            </button>
          </div>
        </div>
      </header>

      {/* Main Question Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-4 flex flex-col items-center justify-center gap-6">
        {errorMessage && (
          <div className="w-full max-w-xl p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-2">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Voice Playback and Speak Controls */}
        {currentQuestion && (
          <VoicePromptControl
            isSpeaking={isSpeaking}
            isListening={isListening}
            onRepeatAudio={() => {
              const text = getQuestionPrompt(currentQuestion.questionCode, currentQuestion.promptText);
              speak(text);
            }}
            onToggleListen={() => {
              if (isListening) stopListening();
              else startListening();
            }}
            voiceError={voiceError}
            transcript={transcript}
            interimTranscript={interimTranscript}
          />
        )}

        {/* Interactive Question Renderer */}
        {currentQuestion && (
          <QuestionRenderer
            key={currentQuestion.id || currentQuestion.questionCode}
            question={currentQuestion}
            value={currentAnswerValue}
            onChange={setCurrentAnswerValue}
            onSubmit={() => handleSaveAndContinue()}
            onSkip={handleSkipQuestion}
            isSubmitting={isSubmitting}
            voiceTranscript={transcript}
            onSpeak={(txt) => speak(txt)}
          />
        )}
      </main>

      {/* Read-Back Confirmation Modal for Critical Spoken Questions */}
      <ConfirmAnswerDialog
        isOpen={confirmDialog.isOpen}
        promptText={confirmDialog.promptText}
        confirmedValueLabel={confirmDialog.confirmedValueLabel}
        isCritical={confirmDialog.isCritical}
        onConfirm={handleConfirmCriticalAnswer}
        onReject={handleRejectCriticalAnswer}
        onRepeatAudio={() => speak(confirmDialog.promptText)}
      />

      {/* Constrained Kiosk Assistant Modal */}
      <KioskAssistantModal
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
        currentQuestionCode={currentQuestion?.questionCode}
        visitId={sessionState?.session.visitId}
      />

      {/* Footer info */}
      <footer className="w-full border-t border-slate-900 py-3 text-center text-xs text-slate-500">
        MEDBRIEF • Multilingual & Accessible Case-Taking • All answers stored language-independently
      </footer>
    </div>
  );
};
