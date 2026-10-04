import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  selected?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  interactive = false,
  selected = false,
  ...props
}) => {
  return (
    <div
      className={twMerge(
        clsx(
          'kiosk-card bg-white rounded-3xl p-6 border-2 transition-all duration-200 shadow-sm',
          selected ? 'border-sky-500 bg-sky-50/50 ring-4 ring-sky-100 shadow-md' : 'border-slate-200',
          interactive && 'cursor-pointer hover:border-sky-400 hover:shadow-lg active:scale-[0.99]',
          className
        )
      )}
      {...props}
    >
      {children}
    </div>
  );
};
