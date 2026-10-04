import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'verified' | 'unverified' | 'unreadable' | 'info' | 'danger';
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  className,
  variant = 'info',
  ...props
}) => {
  const variants = {
    verified: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    unverified: 'bg-amber-100 text-amber-800 border-amber-300',
    unreadable: 'bg-rose-100 text-rose-800 border-rose-300',
    info: 'bg-sky-100 text-sky-800 border-sky-300',
    danger: 'bg-rose-100 text-rose-800 border-rose-300',
  };

  return (
    <span
      className={twMerge(
        clsx(
          'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold border',
          variants[variant],
          className
        )
      )}
      {...props}
    >
      {children}
    </span>
  );
};
