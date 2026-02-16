'use client';

import dynamic from 'next/dynamic';

const LandingPage = dynamic(
  () => import('@/components/landing/LandingPage'),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-lg text-gray-300 animate-pulse">로딩 중…</div>
      </div>
    ),
  }
);

export default function LandingPageLoader() {
  return <LandingPage />;
}
