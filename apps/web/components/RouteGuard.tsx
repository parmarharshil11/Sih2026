'use client';

import React, { useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { Spinner } from './Spinner';

interface RouteGuardProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

export function RouteGuard({ children, allowedRoles }: RouteGuardProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        // Redirect to landing page with a query param to trigger auth modal
        router.push('/?auth=true');
      } else if (allowedRoles && !allowedRoles.some(role => user.roles.includes(role))) {
        // Redirect to home if they don't have the right role
        router.push('/');
      }
    }
  }, [user, isLoading, router, allowedRoles]);

  if (isLoading || !user || (allowedRoles && !allowedRoles.some(role => user.roles.includes(role)))) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <Spinner size="lg" label="Verifying access..." />
      </div>
    );
  }

  return <>{children}</>;
}
