import React, { useState } from 'react';
import { useLanguage } from './useLanguage';
import { AccessibilityMode } from './types';
import {
  Sliders,
  Eye,
  Mic,
  Subtitles,
  Minimize2,
  Clock,
  Check,
  X,
} from 'lucide-react';

interface AccessibilityModePickerProps {
  onClose?: () => void;
}

export const AccessibilityModePicker: React.FC<AccessibilityModePickerProps> = ({ onClose }) => {
  const { accessibilityMode, setAccessibilityMode, locale } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const modes: Array<{
    id: AccessibilityMode;
    title: string;
    description: string;
    icon: React.ReactNode;
    badge?: string;
  }> = [
    {
      id: 'STANDARD',
      title: locale.a11yStandardTitle,
      description: locale.a11yStandardDesc,
      icon: <Sliders className="w-6 h-6 text-sky-600" />,
    },
    {
      id: 'HIGH_CONTRAST_LARGE',
      title: locale.a11yHighContrastTitle,
      description: locale.a11yHighContrastDesc,
      icon: <Eye className="w-6 h-6 text-amber-500" />,
      badge: locale.a11yHighContrastBadge,
    },
    {
      id: 'VOICE_FIRST',
      title: locale.a11yVoiceFirstTitle,
      description: locale.a11yVoiceFirstDesc,
      icon: <Mic className="w-6 h-6 text-emerald-600" />,
      badge: locale.a11yVoiceFirstBadge,
    },
    {
      id: 'TOUCH_CAPTIONS',
      title: locale.a11yTouchCaptionsTitle,
      description: locale.a11yTouchCaptionsDesc,
      icon: <Subtitles className="w-6 h-6 text-purple-600" />,
      badge: locale.a11yTouchCaptionsBadge,
    },
    {
      id: 'SIMPLIFIED',
      title: locale.a11ySimplifiedTitle,
      description: locale.a11ySimplifiedDesc,
      icon: <Minimize2 className="w-6 h-6 text-teal-600" />,
      badge: locale.a11ySimplifiedBadge,
    },
    {
      id: 'SLOWER_PACE',
      title: locale.a11ySlowerPaceTitle,
      description: locale.a11ySlowerPaceDesc,
      icon: <Clock className="w-6 h-6 text-indigo-600" />,
      badge: locale.a11ySlowerPaceBadge,
    },
  ];

  const handleSelect = (mode: AccessibilityMode) => {
    setAccessibilityMode(mode);
    if (onClose) onClose();
    setIsOpen(false);
  };

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-slate-300 bg-white hover:bg-slate-50 text-slate-800 font-bold text-sm shadow-xs transition-all cursor-pointer"
        aria-label={locale.accessibilityButton}
      >
        <Eye className="w-5 h-5 text-sky-600" />
        <span>{locale.accessibilityButton}</span>
      </button>

      {/* Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border-4 border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-sky-100 flex items-center justify-center text-sky-700">
                  <Sliders className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900">{locale.a11yModalTitle}</h2>
                  <p className="text-sm font-medium text-slate-500">
                    {locale.a11yModalSubtitle}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Mode Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-6 max-h-[60vh] overflow-y-auto pr-1">
              {modes.map((m) => {
                const isSelected = accessibilityMode === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => handleSelect(m.id)}
                    className={`relative p-4 rounded-2xl border-3 text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-sky-50 border-sky-600 shadow-md ring-2 ring-sky-200'
                        : 'bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-white'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          {m.icon}
                          <span className="font-extrabold text-slate-900 text-base">{m.title}</span>
                        </div>
                        {isSelected && (
                          <div className="w-6 h-6 rounded-full bg-sky-600 text-white flex items-center justify-center">
                            <Check className="w-4 h-4 stroke-[3]" />
                          </div>
                        )}
                      </div>

                      <p className="text-xs font-medium text-slate-600 mt-2 leading-relaxed">
                        {m.description}
                      </p>
                    </div>

                    {m.badge && (
                      <div className="mt-3">
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 shadow-2xs">
                          {m.badge}
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Bottom Actions */}
            <div className="mt-6 pt-4 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setIsOpen(false)}
                className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-md transition-colors cursor-pointer"
              >
                {locale.a11yDoneButton}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
