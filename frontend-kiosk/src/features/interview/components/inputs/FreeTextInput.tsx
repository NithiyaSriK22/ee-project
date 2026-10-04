import React, { useState, useEffect } from 'react';
import { Type, Sparkles } from 'lucide-react';

interface FreeTextInputProps {
  value: any;
  onChange: (val: any) => void;
  voiceTranscript?: string;
}

const commonSymptomPhrases = [
  'Mild fever since morning',
  'Severe cough and chest tightness',
  'Headache and dizziness',
  'Stomach pain after meals',
  'Body aches and fatigue',
  'No other symptoms to report',
];

export const FreeTextInput: React.FC<FreeTextInputProps> = ({
  value,
  onChange,
  voiceTranscript,
}) => {
  const initialText = typeof value === 'object' ? value?.value || '' : value || '';
  const [text, setText] = useState(initialText);

  // Sync voice transcript if updated externally
  useEffect(() => {
    if (voiceTranscript) {
      const merged = text ? `${text} ${voiceTranscript}` : voiceTranscript;
      setText(merged);
      onChange(merged);
    }
  }, [voiceTranscript]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);
    onChange(val);
  };

  const handleAppendPhrase = (phrase: string) => {
    const next = text ? `${text}, ${phrase}` : phrase;
    setText(next);
    onChange(next);
  };

  return (
    <div className="w-full max-w-2xl flex flex-col gap-4">
      <div className="relative">
        <textarea
          rows={4}
          value={text}
          onChange={handleChange}
          placeholder="Describe in your own words, or tap the voice button to speak..."
          className="w-full p-5 bg-slate-900 border-2 border-slate-700 rounded-3xl text-white placeholder-slate-500 focus:outline-none focus:border-teal-400 focus:ring-4 focus:ring-teal-500/20 text-lg leading-relaxed shadow-inner resize-none"
        />
        <div className="absolute right-4 bottom-4 flex items-center gap-1.5 text-xs text-slate-500">
          <Type className="w-3.5 h-3.5" />
          <span>{text.length} chars</span>
        </div>
      </div>

      {/* Suggested Quick Phrases */}
      <div className="space-y-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-teal-400" />
          Quick phrase suggestions:
        </span>
        <div className="flex flex-wrap gap-2">
          {commonSymptomPhrases.map((phrase) => (
            <button
              key={phrase}
              type="button"
              onClick={() => handleAppendPhrase(phrase)}
              className="px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-xs font-medium text-slate-300 hover:text-white border border-slate-700/60 transition-all active:scale-95"
            >
              + {phrase}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
