'use client';

import dynamic from 'next/dynamic';
import { Logo } from '@/components/ui/logo';

const LandingPage = dynamic(
  () => import('@/components/landing/LandingPage'),
  {
    loading: () => (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <Logo height={32} className="animate-pulse opacity-40" />
      </div>
    ),
  }
);

export default function LandingPageLoader() {
  return <LandingPage />;
}
