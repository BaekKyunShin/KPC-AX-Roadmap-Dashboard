'use client';

import dynamic from 'next/dynamic';
import SmoothScroll from './SmoothScroll';
import Navbar from './sections/Navbar';
import HeroSection from './sections/HeroSection';

// 스크롤 아래 섹션 — 코드 분할 (초기 번들에서 제외)
const FeaturesSection = dynamic(() => import('./sections/FeaturesSection'));
const WorkflowSection = dynamic(() => import('./sections/WorkflowSection'));
const DemoSection = dynamic(() => import('./sections/DemoSection'));
const FooterSection = dynamic(() => import('./sections/FooterSection'));

export default function LandingPage() {
  return (
    <div className="landing-page">
      <SmoothScroll>
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
