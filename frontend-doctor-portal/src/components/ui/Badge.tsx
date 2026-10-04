import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ClinicalFieldStatus } from '../../types/clinical.types';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'verified' | 'unverified' | 'unreadable' | 'urgent' | 'normal' | 'info';
  status?: ClinicalFieldStatus;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  className,
  variant,
  status,
  ...props
}) => {
  let resolvedVariant = variant || 'info';

  if (status === 'VERIFIED') resolvedVariant = 'verified';
  if (status === 'UNVERIFIED') resolvedVariant = 'unverified';
  if (status === 'UNREADABLE') resolvedVariant = 'unreadable';

  const variants = {
    verified: 'bg-emerald-50 text-emerald-700 border-emerald-300 ring-1 ring-emerald-200',
    unverified: 'bg-amber-50 text-amber-700 border-amber-300 ring-1 ring-amber-200',
    unreadable: 'bg-rose-50 text-rose-700 border-rose-300 ring-1 ring-rose-200',
    urgent: 'bg-red-100 text-red-800 border-red-400 font-bold',
    normal: 'bg-slate-100 text-slate-700 border-slate-300',
    info: 'bg-sky-50 text-sky-700 border-sky-300',
  };

  return (
    <span
      className={twMerge(
        clsx(
          'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border',
          variants[resolvedVariant],
          className
        )
      )}
      {...props}
    >
      {children || status}
    </span>
  );
};
