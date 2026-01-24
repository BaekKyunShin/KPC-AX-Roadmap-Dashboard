'use client';

import dynamic from 'next/dynamic';
import SmoothScroll from './SmoothScroll';
import CustomCursor from './CustomCursor';
import Navbar from './sections/Navbar';
import HeroSection from './sections/HeroSection';
import FeaturesSection from './sections/FeaturesSection';
import WorkflowSection from './sections/WorkflowSection';
import DemoSection from './sections/DemoSection';
import FooterSection from './sections/FooterSection';

// ParticleCanvas를 동적으로 로드 (SSR 비활성화)
const ParticleCanvas = dynamic(() => import('./ParticleCanvas'), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 z-0 bg-gradient-to-b from-gray-50 to-white" />
  ),
});

export default function LandingPage() {
  return (
    <div className="landing-page">
      <SmoothScroll>
        {/* 커스텀 커서 */}
        <CustomCursor />

        {/* 파티클 배경 */}
        <ParticleCanvas />

        {/* 메인 콘텐츠 */}
        <main className="relative z-10">
          <Navbar />
          <HeroSection />
          <FeaturesSection />
          <WorkflowSection />
          <DemoSection />
          <FooterSection />
        </main>
      </SmoothScroll>
    </div>
  );
}
