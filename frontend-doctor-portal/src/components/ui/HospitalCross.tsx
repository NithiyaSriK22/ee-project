import React from 'react';

export interface HospitalCrossProps {
  className?: string;
  fill?: string;
}

export const HospitalCross: React.FC<HospitalCrossProps> = ({
  className = 'w-6 h-6',
  fill = 'currentColor',
}) => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M8.5 2.5C8.5 2.22386 8.72386 2 9 2H15C15.2761 2 15.5 2.22386 15.5 2.5V8.5H21.5C21.7761 8.5 22 8.72386 22 9V15C22 15.2761 21.7761 15.5 21.5 15.5H15.5V21.5C15.5 21.7761 15.2761 22 15 22H9C8.72386 22 8.5 21.7761 8.5 21.5V15.5H2.5C2.22386 15.5 2 15.2761 2 15V9C2 8.72386 2.22386 8.5 2.5 8.5H8.5V2.5Z"
        fill={fill}
      />
    </svg>
  );
};
