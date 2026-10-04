import React, { useState, useEffect, useRef } from 'react';
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
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  Home,
  RotateCcw,
} from 'lucide-react';

export const GuidedInterviewPage: React.FC = () => {
  const navigate = useNavigate();

  // Core Session State
  const [sessionState, setSessionState] = useState<InterviewSessionState | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<InterviewQuestionItem | null>(null);
  const [currentAnswerValue, setCurrentAnswerValue] = useState<any>('');
  const [answeredMode, setAnsweredMode] = useState<AnsweredViaType>(AnsweredVia.TOUCH);
  const languageUsed = 'en';

  // UI Flow States
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showReviewScreen, setShowReviewScreen] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  // Section Transition State
  const [transitioningSection, setTransitioningSection] = useState<InterviewSection | null>(null);
  const previousSectionRef = useRef<InterviewSection | null>(null);

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
  } = useVoiceInput(languageUsed);

  // 1. Initialize or Resume Interview Session on Mount
  useEffect(() => {
    let isMounted = true;

    const initInterview = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const state = await interviewApi.startInterview();
        if (!isMounted) return;

        setSessionState(state);
        if (state.session.status === 'COMPLETED') {
          setIsCompleted(true);
          setShowReviewScreen(true);
        } else if (state.currentQuestion) {
          loadQuestion(state.currentQuestion, state);
        } else {
          // If no current question, show review screen
          setShowReviewScreen(true);
        }
      } catch (err: any) {
        if (!isMounted) return;
        setErrorMessage(
          err.message || 'Failed to start interview session. Please verify registration and consent.'
        );
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    initInterview();

    return () => {
      isMounted = false;
      stopSpeaking();
      stopListening();
    };
  }, []);

  // Helper to load a question, trigger section transition if needed, and speak prompt
  const loadQuestion = (
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

    // Speak question audio
    resetTranscript();
    speak(q.promptText);
  };

  // 2. Submit Answer
  const handleSaveAndContinue = async () => {
    if (!currentQuestion) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    stopSpeaking();
    stopListening();

    try {
      const modeToSubmit = isListening || transcript ? AnsweredVia.VOICE : answeredMode;

      const result = await interviewApi.submitAnswer({
        questionId: currentQuestion.id,
        answerValue: currentAnswerValue,
        answeredVia: modeToSubmit,
        languageUsed,
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
        languageUsed,
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
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to skip question.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. Edit specific question from review screen
  const handleEditQuestion = (questionId: string) => {
    if (!sessionState) return;
    const targetQ = sessionState.allQuestions.find((q) => q.id === questionId);
    if (targetQ) {
      setShowReviewScreen(false);
      loadQuestion(targetQ, sessionState);
    }
  };

  // 5. Complete Entire Interview
  const handleFinalComplete = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await interviewApi.completeInterview();
      setIsCompleted(true);
      speak('Thank you. Your clinical intake is complete. Please proceed to the waiting area or doctor consultation.');
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
        <h2 className="text-xl font-bold">Preparing Your Guided Intake...</h2>
        <p className="text-sm text-slate-400 mt-1">Loading clinical question bank</p>
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
            <h1 className="text-3xl font-extrabold text-white">Intake Completed</h1>
            <p className="text-sm text-slate-300">
              Your medical history has been recorded. All details have been structured and will be available for the doctor's review.
            </p>
          </div>

          <div className="pt-4 flex flex-col gap-3">
            <button
              onClick={() => navigate('/')}
              className="w-full py-4 px-6 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-base shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <Home className="w-5 h-5" />
              <span>Return to Kiosk Welcome</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render: Error / Blocked State
  if (errorMessage && !sessionState) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white p-6">
        <div className="max-w-md w-full bg-slate-900 border border-rose-500/40 rounded-3xl p-8 text-center shadow-2xl space-y-6">
          <AlertCircle className="w-14 h-14 text-rose-400 mx-auto" />
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white">Cannot Begin Interview</h2>
            <p className="text-sm text-slate-300">{errorMessage}</p>
          </div>
          <div className="flex flex-col gap-3 pt-2">
            <button
              onClick={() => navigate('/register')}
              className="w-full py-3.5 px-6 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2"
            >
              <span>Go to Registration & Consent</span>
            </button>
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 px-6 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Retry</span>
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

          <button
            type="button"
            onClick={() => setShowReviewScreen(true)}
            className="text-xs font-semibold text-teal-400 hover:text-teal-300 underline"
          >
            Preview Answers ({sessionState?.answers.length || 0})
          </button>
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
            onRepeatAudio={() => speak(currentQuestion.promptText)}
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
            question={currentQuestion}
            value={currentAnswerValue}
            onChange={setCurrentAnswerValue}
            onSubmit={handleSaveAndContinue}
            onSkip={handleSkipQuestion}
            isSubmitting={isSubmitting}
            voiceTranscript={transcript}
          />
        )}
      </main>

      {/* Footer info */}
      <footer className="w-full border-t border-slate-900 py-3 text-center text-xs text-slate-500">
        MediKiosk • AI-Assisted Clinical Intake Platform • All data encrypted and session-isolated
      </footer>
    </div>
  );
};
