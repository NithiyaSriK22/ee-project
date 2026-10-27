import React from 'react';
import { FileText, Zap, Users } from 'lucide-react';

const ShieldCrossIcon: React.FC = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="w-7 h-7 text-[#7B5CC4]"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="M12 8v8" strokeWidth="2.2" />
    <path d="M8 12h8" strokeWidth="2.2" />
  </svg>
);

interface FeatureItemProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const FeatureItem: React.FC<FeatureItemProps> = ({ icon, title, description }) => {
  return (
    <div className="flex items-center gap-4 py-5 px-6 rounded-[40px] bg-white/70 backdrop-blur-md border border-[rgba(123,92,196,0.12)] shadow-[0_8px_24px_rgba(123,92,196,0.08)] hover:shadow-[0_12px_28px_rgba(123,92,196,0.14)] hover:bg-white/80 transition-all duration-300">
      {/* 64px Circular Badge with #EDE6FA to #FDEBDD gradient */}
      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#EDE6FA] to-[#FDEBDD] shadow-[0_4px_14px_rgba(123,92,196,0.12)] flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <h4 className="text-[17px] font-semibold text-navy font-body leading-tight">
          {title}
        </h4>
        <p className="text-[14px] font-normal text-navysoft font-body leading-snug mt-1 line-clamp-2">
          {description}
        </p>
      </div>
    </div>
  );
};

export const FeatureCards: React.FC = () => {
  const features = [
    {
      title: 'AI-Powered Analysis',
      description: 'Extract key details from medical documents',
      icon: <FileText className="w-7 h-7 text-[#7B5CC4]" strokeWidth={2} />,
    },
    {
      title: 'Secure & Compliant',
      description: 'Built with healthcare data security standards',
      icon: <ShieldCrossIcon />,
    },
    {
      title: 'Faster Clinical Decisions',
      description: 'Get AI summaries and real-time alerts',
      icon: <Zap className="w-7 h-7 text-[#7B5CC4]" strokeWidth={2} />,
    },
    {
      title: 'Trusted by Healthcare',
      description: 'Supporting doctors, patients and hospitals',
      icon: <Users className="w-7 h-7 text-[#7B5CC4]" strokeWidth={2} />,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-[590px]">
      {features.map((feat) => (
        <FeatureItem
          key={feat.title}
          title={feat.title}
          description={feat.description}
          icon={feat.icon}
        />
      ))}
    </div>
  );
};
