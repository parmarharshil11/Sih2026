import React from 'react';

interface SkeletonCardProps {
  count?: number;
}

export function SkeletonCard({ count = 1 }: SkeletonCardProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass-card rounded-2xl p-5 border flex flex-col justify-between h-[120px] animate-pulse">
          <div className="flex items-center justify-between mb-3">
            <div className="h-3 w-1/3 bg-slate-700/50 rounded-full" />
            <div className="w-10 h-10 rounded-xl bg-slate-700/50" />
          </div>
          <div>
            <div className="h-6 w-1/4 bg-slate-700/50 rounded-lg mb-2" />
            <div className="h-3 w-1/2 bg-slate-700/50 rounded-full" />
          </div>
        </div>
      ))}
    </>
  );
}
