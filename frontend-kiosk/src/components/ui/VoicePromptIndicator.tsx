import React from 'react';
import { Mic, Volume2 } from 'lucide-react';
import { clsx } from 'clsx';

export interface VoicePromptIndicatorProps {
  mode?: 'listening' | 'speaking' | 'idle';
  label?: string;
}

export const VoicePromptIndicator: React.FC<VoicePromptIndicatorProps> = ({
  mode = 'idle',
  label,
}) => {
  return (
    <div className="flex items-center gap-4 bg-white/90 backdrop-blur border-2 border-slate-200 rounded-full px-5 py-3 shadow-sm">
      <div className="relative flex items-center justify-center">
        {mode === 'listening' && (
          <span className="absolute inline-flex h-10 w-10 animate-ping rounded-full bg-rose-400 opacity-75"></span>
        )}
        {mode === 'speaking' && (
          <span className="absolute inline-flex h-10 w-10 animate-pulse rounded-full bg-sky-400 opacity-75"></span>
        )}
        <div
          className={clsx(
            'relative z-10 flex h-10 w-10 items-center justify-center rounded-full text-white',
            mode === 'listening' ? 'bg-rose-600' : mode === 'speaking' ? 'bg-sky-600' : 'bg-slate-400'
          )}
        >
          {mode === 'listening' ? (
            <Mic className="h-5 w-5 animate-pulse" />
          ) : mode === 'speaking' ? (
            <Volume2 className="h-5 w-5 animate-pulse" />
          ) : (
            <Mic className="h-5 w-5" />
          )}
        </div>
      </div>

      <div className="flex flex-col">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {mode === 'listening' ? 'Listening...' : mode === 'speaking' ? 'Audio Assistant Speaking' : 'Voice Assisted'}
        </span>
        <span className="text-sm font-medium text-slate-800">
          {label || (mode === 'listening' ? 'Speak clearly into the microphone' : 'Voice assistance active')}
        </span>
      </div>
    </div>
  );
};
