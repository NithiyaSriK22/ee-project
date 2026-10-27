import React from 'react';
import { FileText, Zap, Users } from 'lucide-react';

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const ShieldCrossIcon: React.FC = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="w-5 h-5 text-[#7763C8]"
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

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description }) => {
  return (
    <div className="flex items-center gap-3.5 p-3 sm:p-3.5 bg-[#FFFDF9]/85 backdrop-blur-xs rounded-2xl border border-[#ECE2D8] shadow-[0_4px_16px_rgba(119,99,200,0.05)] hover:shadow-[0_6px_22px_rgba(119,99,200,0.09)] transition-all duration-200">
      <div className="w-11 h-11 rounded-full bg-[#EDE6F8] text-[#7763C8] flex items-center justify-center shrink-0 shadow-2xs">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <h4 className="text-[13px] font-bold text-[#142B68] leading-tight tracking-tight">
          {title}
        </h4>
        <p className="text-[11px] font-normal text-[#626A82] leading-snug mt-0.5 line-clamp-2">
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
      icon: <FileText className="w-5 h-5 text-[#7763C8]" />,
    },
    {
      title: 'Secure & Compliant',
      description: 'Built with healthcare data security standards',
      icon: <ShieldCrossIcon />,
    },
    {
      title: 'Faster Clinical Decisions',
      description: 'Get AI summaries and real-time alerts',
      icon: <Zap className="w-5 h-5 text-[#7763C8]" />,
    },
    {
      title: 'Trusted by Healthcare',
      description: 'Supporting doctors, patients and hospitals',
      icon: <Users className="w-5 h-5 text-[#7763C8]" />,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full max-w-[530px]">
      {features.map((feat) => (
        <FeatureCard
          key={feat.title}
          title={feat.title}
          description={feat.description}
          icon={feat.icon}
        />
      ))}
    </div>
  );
};
