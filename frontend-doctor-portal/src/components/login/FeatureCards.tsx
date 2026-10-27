import React from 'react';
import { FileText, Zap, Users } from 'lucide-react';

const ShieldCrossIcon: React.FC = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="w-5 h-5 text-brand"
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
    <div className="flex items-center gap-3.5 p-3.5 bg-white/80 backdrop-blur-xs rounded-2xl border border-peach shadow-2xs hover:shadow-xs transition-all">
      <div className="w-11 h-11 rounded-full bg-lavender text-brand flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <h4 className="text-[13px] font-bold text-navy font-body leading-tight">
          {title}
        </h4>
        <p className="text-[11px] font-normal text-navysoft font-body leading-snug mt-0.5 line-clamp-2">
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
      icon: <FileText className="w-5 h-5 text-brand" />,
    },
    {
      title: 'Secure & Compliant',
      description: 'Built with healthcare data security standards',
      icon: <ShieldCrossIcon />,
    },
    {
      title: 'Faster Clinical Decisions',
      description: 'Get AI summaries and real-time alerts',
      icon: <Zap className="w-5 h-5 text-brand" />,
    },
    {
      title: 'Trusted by Healthcare',
      description: 'Supporting doctors, patients and hospitals',
      icon: <Users className="w-5 h-5 text-brand" />,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full max-w-[530px]">
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
