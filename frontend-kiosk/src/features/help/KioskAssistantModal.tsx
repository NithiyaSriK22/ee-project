import React, { useState } from 'react';
import { Bot, Send, AlertTriangle, X, User } from 'lucide-react';
import { useLanguage } from '../language/useLanguage';
import { apiClient } from '../../lib/api-client';

interface KioskAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentQuestionCode?: string;
  visitId?: string;
}

interface MessageItem {
  sender: 'assistant' | 'user';
  text: string;
  intent?: string;
  isEmergency?: boolean;
}

export const KioskAssistantModal: React.FC<KioskAssistantModalProps> = ({
  isOpen,
  onClose,
  currentQuestionCode,
  visitId,
}) => {
  const { currentLanguage } = useLanguage();
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<MessageItem[]>([
    {
      sender: 'assistant',
      text:
        currentLanguage === 'ta'
          ? 'வணக்கம்! நான் உங்கள் கியோஸ்க் வழிகாட்டி. கேள்வியை விளக்கக் கேட்கலாம், கியோஸ்க் பயன்பாட்டை அறியலாம், அல்லது மருத்துவமனை ஊழியரின் உதவியைப் பெறலாம். நான் மருத்துவ ஆலோசனைகளை வழங்க மாட்டேன்.'
          : 'Hello! I am your kiosk assistant. You can ask me to explain questions, ask how to use the kiosk, or request a staff member. I do not provide medical advice.',
    },
  ]);

  if (!isOpen) return null;

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isLoading) return;

    const userMsg: MessageItem = { sender: 'user', text };
    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const res = await apiClient.post<{
        success: boolean;
        data: {
          intent: string;
          replyText: string;
          emergencyAlertRaised: boolean;
          staffHelpOffered: boolean;
        };
      }>('/kiosk/assistant/message', {
        message: text,
        language: currentLanguage,
        currentQuestionCode,
        visitId,
      });

      if (res.data?.data) {
        const reply = res.data.data;
        const assistantMsg: MessageItem = {
          sender: 'assistant',
          text: reply.replyText,
          intent: reply.intent,
          isEmergency: reply.emergencyAlertRaised,
        };
        setMessages((prev) => [...prev, assistantMsg]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text:
            currentLanguage === 'ta'
              ? 'தகவல் தொடர்பில் பிழை ஏற்பட்டது. கீழே உள்ள "உதவி தேவை" பொத்தானை அழுத்தி ஊழியரை அழைக்கவும்.'
              : 'Connection error. Please tap the red "I Need Help" button below to call a hospital staff member.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickPrompts = [
    {
      label: currentLanguage === 'ta' ? 'இந்த கேள்வியை விளக்கு' : 'Explain this question',
      query: 'Please explain what this question is asking',
    },
    {
      label: currentLanguage === 'ta' ? 'கியோஸ்க்கை பயன்படுத்துவது எப்படி?' : 'How to use kiosk?',
      query: 'How to use this kiosk',
    },
    {
      label: currentLanguage === 'ta' ? 'ஊழியரை அழைக்கவும்' : 'Call staff member',
      query: 'Please call a hospital staff member to help me',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border-4 border-slate-200 flex flex-col h-[580px] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-100 flex items-center justify-center text-sky-700">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">
                {currentLanguage === 'ta' ? 'கியோஸ்க் வழிகாட்டி' : 'Kiosk Help Assistant'}
              </h3>
              <p className="text-[11px] font-semibold text-slate-500">
                {currentLanguage === 'ta'
                  ? 'வழிகாட்டுதல் மட்டுமே — மருத்துவ ஆலோசனை கிடையாது'
                  : 'Operational guidance only — No medical advice'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Close assistant"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chat Messages Log */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-1">
          {messages.map((m, idx) => {
            const isUser = m.sender === 'user';
            return (
              <div key={idx} className={`flex items-start gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}>
                {!isUser && (
                  <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`p-3.5 rounded-2xl text-sm leading-relaxed max-w-[85%] font-medium ${
                    isUser
                      ? 'bg-sky-600 text-white rounded-br-xs'
                      : m.isEmergency
                      ? 'bg-rose-50 border-2 border-rose-400 text-rose-950 font-bold rounded-bl-xs'
                      : 'bg-slate-100 text-slate-800 rounded-bl-xs'
                  }`}
                >
                  {m.isEmergency && (
                    <div className="flex items-center gap-1.5 text-rose-700 text-xs font-extrabold uppercase mb-1">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Emergency Alert Dispatched</span>
                    </div>
                  )}
                  {m.text}
                </div>

                {isUser && (
                  <div className="w-7 h-7 rounded-lg bg-slate-200 text-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}

          {isLoading && (
            <div className="flex items-center gap-2 text-slate-400 text-xs italic pl-9">
              <Bot className="w-4 h-4 animate-spin" />
              <span>Thinking...</span>
            </div>
          )}
        </div>

        {/* Quick Suggested Prompts */}
        <div className="flex flex-wrap gap-1.5 pt-2 pb-3 border-t border-slate-100">
          {quickPrompts.map((qp, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(qp.query)}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
            >
              {qp.label}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2 pt-2 border-t border-slate-200"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              currentLanguage === 'ta'
                ? 'உங்கள் கேள்வியை உள்ளிடவும்...'
                : 'Type your question or request here...'
            }
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 font-medium"
          />

          <button
            type="submit"
            disabled={!inputText.trim() || isLoading}
            className="p-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Send message"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
};
