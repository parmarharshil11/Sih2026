import React from 'react';
import { Spinner } from '@/components/Spinner';

export default function TrainerLoading() {
  return (
    <div className="flex-1 flex items-center justify-center h-full min-h-[400px]">
      <Spinner size="lg" label="Loading trainer studio..." />
    </div>
  );
}
