import React from 'react';
import { Volume2, VolumeX, Mic, MicOff, AlertCircle } from 'lucide-react';

interface VoicePromptControlProps {
  isSpeaking: boolean;
  isListening: boolean;
  onRepeatAudio: () => void;
  onToggleListen: () => void;
  voiceError?: string | null;
  transcript?: string;
  interimTranscript?: string;
}

export const VoicePromptControl: React.FC<VoicePromptControlProps> = ({
  isSpeaking,
  isListening,
  onRepeatAudio,
  onToggleListen,
  voiceError,
  transcript,
  interimTranscript,
}) => {
  return (
    <div className="w-full flex flex-col items-center gap-3">
      <div className="flex flex-wrap items-center justify-center gap-4">
        {/* Play question audio */}
        <button
          type="button"
          onClick={onRepeatAudio}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl border font-semibold text-sm transition-all shadow-sm active:scale-95 ${
            isSpeaking
              ? 'bg-teal-500/20 border-teal-500 text-teal-300 ring-2 ring-teal-500/40 animate-pulse'
              : 'bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-800 hover:border-slate-600'
          }`}
          aria-label="Repeat spoken question"
        >
          {isSpeaking ? <VolumeX className="w-5 h-5 text-teal-400" /> : <Volume2 className="w-5 h-5 text-teal-400" />}
          <span>{isSpeaking ? 'Playing Voice Question...' : 'Listen / Repeat Question'}</span>
        </button>

        {/* Speak answer toggle */}
        <button
          type="button"
          onClick={onToggleListen}
          className={`flex items-center gap-2.5 px-6 py-3 rounded-2xl border font-semibold text-sm transition-all shadow-md active:scale-95 ${
            isListening
              ? 'bg-rose-500/20 border-rose-500 text-rose-300 ring-4 ring-rose-500/30 animate-pulse'
              : 'bg-gradient-to-r from-teal-600 to-sky-600 hover:from-teal-500 hover:to-sky-500 border-teal-500/50 text-white'
          }`}
          aria-label={isListening ? 'Stop listening' : 'Tap to speak your answer'}
        >
          {isListening ? <MicOff className="w-5 h-5 text-rose-400" /> : <Mic className="w-5 h-5 text-white" />}
          <span>{isListening ? 'Listening (Speak Now)...' : 'Speak Your Answer'}</span>
        </button>
      </div>

      {/* Real-time transcribed text display */}
      {(transcript || interimTranscript) && (
        <div className="w-full max-w-xl p-3 bg-slate-900/90 border border-teal-500/40 rounded-2xl text-center text-sm text-teal-200 animate-fadeIn">
          <span className="text-xs text-slate-400 block mb-0.5">Heard:</span>
          <p className="font-medium text-white italic">
            "{transcript || interimTranscript}"
          </p>
        </div>
      )}

      {/* Voice error/fallback message */}
      {voiceError && (
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
          <span>{voiceError}</span>
        </div>
      )}
    </div>
  );
};
