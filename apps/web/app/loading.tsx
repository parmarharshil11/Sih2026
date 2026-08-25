import React from 'react';
import { Spinner } from '@/components/Spinner';

export default function Loading() {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-4rem)]">
      <Spinner size="lg" label="Loading workspace..." />
    </div>
  );
}
