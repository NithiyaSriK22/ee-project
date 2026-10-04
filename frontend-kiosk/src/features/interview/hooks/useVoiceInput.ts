import { useState, useEffect, useRef, useCallback } from 'react';

// Web Speech API interface definitions
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: { transcript: string; confidence: number };
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

export interface VoiceInputState {
  isListening: boolean;
  isSpeaking: boolean;
  transcript: string;
  interimTranscript: string;
  confidence: number;
  isSpeechSupported: boolean;
  isRecognitionSupported: boolean;
  error: string | null;
  speak: (text: string, onEnd?: () => void) => void;
  stopSpeaking: () => void;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
}

export const useVoiceInput = (language: string = 'en-IN'): VoiceInputState => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const isSpeechSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const isRecognitionSupported =
    typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  // Initialize Speech Recognition
  useEffect(() => {
    if (!isRecognitionSupported) return;

    const SpeechRecognitionConstructor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    const recognition = new SpeechRecognitionConstructor();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = language === 'hi' ? 'hi-IN' : language === 'ta' ? 'ta-IN' : 'en-IN';

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let currentFinal = '';
      let currentInterim = '';
      let topConfidence = 0;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        if (res.isFinal) {
          currentFinal += res[0].transcript;
          topConfidence = res[0].confidence || 0.85;
        } else {
          currentInterim += res[0].transcript;
        }
      }

      if (currentFinal) {
        setTranscript(currentFinal.trim());
        setConfidence(topConfidence);
      }
      setInterimTranscript(currentInterim.trim());
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'no-speech') {
        setError('No speech detected. Please speak clearly or touch the options on screen.');
      } else if (event.error === 'audio-capture') {
        setError('Microphone not available. Please use touch input.');
      } else {
        setError(`Voice input error: ${event.error}`);
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [language, isRecognitionSupported]);

  // TTS Output
  const speak = useCallback(
    (text: string, onEnd?: () => void) => {
      if (!isSpeechSupported) return;

      window.speechSynthesis.cancel();

      // Safe clean text (strip HTML or markdown artifacts)
      const cleanText = text.replace(/[#*_`]/g, '').trim();
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = 0.9; // Reassuring, calm speed for patient clarity
      utterance.pitch = 1.0;
      utterance.lang = language === 'hi' ? 'hi-IN' : language === 'ta' ? 'ta-IN' : 'en-IN';

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => {
        setIsSpeaking(false);
        if (onEnd) onEnd();
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
      };

      window.speechSynthesis.speak(utterance);
    },
    [isSpeechSupported, language]
  );

  const stopSpeaking = useCallback(() => {
    if (isSpeechSupported) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [isSpeechSupported]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
      setError('Voice recognition is not supported in this browser.');
      return;
    }
    stopSpeaking();
    setTranscript('');
    setInterimTranscript('');
    setError(null);
    try {
      recognitionRef.current.start();
    } catch {
      // If already started, restart
      recognitionRef.current.abort();
      setTimeout(() => {
        try {
          recognitionRef.current.start();
        } catch (e) {
          console.error(e);
        }
      }, 100);
    }
  }, [stopSpeaking]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setConfidence(0);
    setError(null);
  }, []);

  return {
    isListening,
    isSpeaking,
    transcript,
    interimTranscript,
    confidence,
    isSpeechSupported,
    isRecognitionSupported,
    error,
    speak,
    stopSpeaking,
    startListening,
    stopListening,
    resetTranscript,
  };
};
