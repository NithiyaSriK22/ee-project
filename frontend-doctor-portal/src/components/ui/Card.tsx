import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  header?: React.ReactNode;
  footer?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  header,
  footer,
  ...props
}) => {
  return (
    <div
      className={twMerge(
        clsx('bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden', className)
      )}
      {...props}
    >
      {header && (
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/70 font-semibold text-slate-800 text-sm flex items-center justify-between">
          {header}
        </div>
      )}
      <div className="p-6">{children}</div>
      {footer && (
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50/70 text-xs text-slate-600">
          {footer}
        </div>
      )}
    </div>
  );
};
