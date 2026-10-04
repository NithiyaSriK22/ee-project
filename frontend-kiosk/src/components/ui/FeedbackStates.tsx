import React from 'react';
import { clsx } from 'clsx';

export const Spinner: React.FC<{ size?: 'sm' | 'md' | 'lg'; className?: string }> = ({
  size = 'md',
  className,
}) => {
  const sizes = {
    sm: 'h-5 w-5 border-2',
    md: 'h-8 w-8 border-3',
    lg: 'h-12 w-12 border-4',
  };

  return (
    <div
      className={clsx(
        'animate-spin rounded-full border-sky-600 border-t-transparent',
        sizes[size],
        className
      )}
      role="status"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
};

export const Skeleton: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <div
      className={clsx('animate-pulse bg-slate-200 rounded-2xl', className)}
      aria-hidden="true"
    />
  );
};

export const EmptyState: React.FC<{
  title: string;
  description: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}> = ({ title, description, action, icon }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center rounded-3xl bg-slate-50 border-2 border-dashed border-slate-200">
      {icon && <div className="mb-4 text-slate-400">{icon}</div>}
      <h3 className="text-kiosk-lg font-bold text-slate-800 mb-2">{title}</h3>
      <p className="text-kiosk-base text-slate-600 max-w-md mb-6">{description}</p>
      {action && <div>{action}</div>}
    </div>
  );
};

export const ErrorState: React.FC<{
  title?: string;
  message: string;
  onRetry?: () => void;
}> = ({ title = 'Something went wrong', message, onRetry }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center rounded-3xl bg-rose-50 border-2 border-rose-200">
      <h3 className="text-kiosk-lg font-bold text-rose-900 mb-2">{title}</h3>
      <p className="text-kiosk-base text-rose-700 max-w-md mb-6">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-6 py-3 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-xl text-kiosk-base shadow"
        >
          Try Again
        </button>
      )}
    </div>
  );
};
