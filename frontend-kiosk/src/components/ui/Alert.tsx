import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { AlertCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
}

export const Alert: React.FC<AlertProps> = ({
  children,
  className,
  variant = 'info',
  title,
  ...props
}) => {
  const styles = {
    info: {
      bg: 'bg-sky-50 border-sky-300 text-sky-900',
      icon: <Info className="w-6 h-6 text-sky-600 flex-shrink-0" />,
    },
    success: {
      bg: 'bg-emerald-50 border-emerald-300 text-emerald-900',
      icon: <CheckCircle className="w-6 h-6 text-emerald-600 flex-shrink-0" />,
    },
    warning: {
      bg: 'bg-amber-50 border-amber-300 text-amber-900',
      icon: <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0" />,
    },
    error: {
      bg: 'bg-rose-50 border-rose-300 text-rose-900',
      icon: <AlertCircle className="w-6 h-6 text-rose-600 flex-shrink-0" />,
    },
  };

  const current = styles[variant];

  return (
    <div
      role="alert"
      className={twMerge(
        clsx(
          'flex gap-4 p-5 rounded-2xl border-2 text-kiosk-base',
          current.bg,
          className
        )
      )}
      {...props}
    >
      <div className="mt-0.5">{current.icon}</div>
      <div className="flex-1">
        {title && <h4 className="font-bold text-kiosk-lg mb-1">{title}</h4>}
        <div className="leading-relaxed">{children}</div>
      </div>
    </div>
  );
};
