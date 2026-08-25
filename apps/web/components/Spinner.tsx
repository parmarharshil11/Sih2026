import React from 'react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}

export function Spinner({ size = 'md', label, className = '' }: SpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  };

  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <div
        className={`${sizeClasses[size]} border-blue-500 border-t-transparent rounded-full animate-spin`}
        role="status"
        aria-label={label || 'Loading'}
      />
      {label && <span className="text-sm font-semibold text-slate-400">{label}</span>}
    </div>
  );
}
