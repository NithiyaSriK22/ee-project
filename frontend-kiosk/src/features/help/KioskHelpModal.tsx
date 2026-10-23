import React, { useState } from 'react';
import { BookOpen, Monitor, FileText, ArrowRight, PhoneCall, X, Volume2 } from 'lucide-react';
import { useLanguage } from '../language/useLanguage';

interface KioskHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSpeak?: (text: string) => void;
}

export const KioskHelpModal: React.FC<KioskHelpModalProps> = ({ isOpen, onClose, onSpeak }) => {
  const { bundle, currentLanguage } = useLanguage();
  const [selectedTopic, setSelectedTopic] = useState<string>('how_to_use');

  if (!isOpen) return null;

  const articles = bundle?.helpArticles || [
    {
      topic: 'how_to_use',
      title: 'How to use this kiosk',
      body: 'Read or listen to each question. Tap your answer on screen, or speak clearly when the microphone is active.',
    },
    {
      topic: 'document_scan',
      title: 'How to scan your old prescription',
      body: 'Place your prescription flat on the scanner tray below with writing facing up. Tap "Capture" and verify the image.',
    },
    {
      topic: 'what_next',
      title: 'What happens after finishing intake',
      body: 'Your intake answers and scanned documents will be prepared for your OPD doctor. Please take your token slip and wait in the lounge.',
    },
    {
      topic: 'call_staff',
      title: 'How to get staff help',
      body: 'Tap the red "I Need Help" button at the bottom right. A hospital attendant will come to your kiosk immediately.',
    },
  ];

  const activeArticle = articles.find((a) => a.topic === selectedTopic) || articles[0];

  const topicIcons: Record<string, React.ReactNode> = {
    how_to_use: <Monitor className="w-5 h-5 text-sky-600" />,
    document_scan: <FileText className="w-5 h-5 text-purple-600" />,
    what_next: <ArrowRight className="w-5 h-5 text-emerald-600" />,
    call_staff: <PhoneCall className="w-5 h-5 text-rose-600" />,
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border-4 border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-sky-100 flex items-center justify-center text-sky-700">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">
                {currentLanguage === 'ta' ? 'கியோஸ்க் பயன்பாட்டு வழிகாட்டி' : 'Kiosk Help & Instructions'}
              </h2>
              <p className="text-xs font-semibold text-slate-500">
                {currentLanguage === 'ta' ? 'மருத்துவமனை அங்கீகரித்த உதவி தகவல்கள்' : 'Hospital-approved patient guides'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
            aria-label="Close help guide"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Topic Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
          {articles.map((art) => {
            const isTab = selectedTopic === art.topic;
            return (
              <button
                key={art.topic}
                onClick={() => setSelectedTopic(art.topic)}
                className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                  isTab
                    ? 'bg-sky-50 border-sky-600 text-sky-900 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {topicIcons[art.topic] || <Monitor className="w-4 h-4" />}
                <span className="text-center line-clamp-1">{art.title}</span>
              </button>
            );
          })}
        </div>

        {/* Article Body */}
        {activeArticle && (
          <div className="mt-6 p-5 rounded-2xl bg-slate-50 border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-2">{activeArticle.title}</h3>
            <p className="text-sm font-medium text-slate-700 leading-relaxed">{activeArticle.body}</p>
          </div>
        )}

        <div className="mt-6 flex items-center justify-between pt-4 border-t border-slate-200">
          {activeArticle && onSpeak && (
            <button
              onClick={() => onSpeak(`${activeArticle.title}. ${activeArticle.body}`)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-sky-300 bg-white hover:bg-sky-50 text-sky-700 font-bold text-sm shadow-xs transition-colors cursor-pointer"
            >
              <Volume2 className="w-4 h-4" />
              <span>{currentLanguage === 'ta' ? 'வாசிக்கவும்' : 'Read Aloud'}</span>
            </button>
          )}

          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-sm transition-colors cursor-pointer ml-auto"
          >
            {currentLanguage === 'ta' ? 'முடிந்தது' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
