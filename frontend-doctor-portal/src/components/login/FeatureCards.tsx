import React from 'react';
import { FileText, ShieldPlus, Zap, Users } from 'lucide-react';

interface FeatureItemProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const FeatureItem: React.FC<FeatureItemProps> = ({ icon, title, description }) => {
  return (
    <li className="flex flex-row items-center gap-4 py-4 pr-6 pl-4 rounded-[40px] bg-white/70 backdrop-blur-md border border-[rgba(123,92,196,0.12)] shadow-[0_6px_24px_rgba(123,92,196,0.10)] hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(123,92,196,0.16)] transition-all duration-200 list-none">
      {/* Icon Badge: ~64px circle (52px below 1280px), linear gradient #EDE6FA to #FDEBDD */}
      <div
        className="w-[52px] h-[52px] xl:w-16 xl:h-16 rounded-full bg-[linear-gradient(135deg,#EDE6FA,#FDEBDD)] shadow-[0_4px_14px_rgba(123,92,196,0.18),inset_0_1px_0_rgba(255,255,255,0.8)] flex items-center justify-center shrink-0"
        aria-hidden="true"
      >
        {icon}
      </div>

      {/* Text block */}
      <div className="min-w-0 flex-1">
        <h3 className="font-body font-semibold text-[16px] xl:text-[17px] text-navy leading-tight">
          {title}
        </h3>
        <p className="font-body text-[14px] text-[#6B7280] leading-snug mt-0.5 line-clamp-2">
          {description}
        </p>
      </div>
    </li>
  );
};

export const FeatureCards: React.FC = () => {
  const features = [
    {
      title: 'AI-Powered Analysis',
      description: 'Extract key details from medical documents',
      icon: (
        <FileText
          className="w-6 h-6 xl:w-7 xl:h-7 text-[#5B4BB5]"
          strokeWidth={1.75}
          aria-hidden="true"
        />
      ),
    },
    {
      title: 'Secure & Compliant',
      description: 'Built with healthcare data security standards',
      icon: (
        <ShieldPlus
          className="w-6 h-6 xl:w-7 xl:h-7 text-[#5B4BB5]"
          strokeWidth={1.75}
          aria-hidden="true"
        />
      ),
    },
    {
      title: 'Faster Clinical Decisions',
      description: 'Get AI summaries and real-time alerts',
      icon: (
        <Zap
          className="w-6 h-6 xl:w-7 xl:h-7 text-[#5B4BB5]"
          strokeWidth={1.75}
          aria-hidden="true"
        />
      ),
    },
    {
      title: 'Trusted by Healthcare',
      description: 'Supporting doctors, patients and hospitals',
      icon: (
        <Users
          className="w-6 h-6 xl:w-7 xl:h-7 text-[#5B4BB5]"
          strokeWidth={1.75}
          aria-hidden="true"
        />
      ),
    },
  ];

  return (
    <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-[590px] mt-10 p-0 m-0 list-none">
      {features.map((feat) => (
        <FeatureItem
          key={feat.title}
          title={feat.title}
          description={feat.description}
          icon={feat.icon}
        />
      ))}
    </ul>
  );
};
