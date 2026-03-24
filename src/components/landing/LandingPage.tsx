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
        {/* Navbar를 main 밖에 배치하여 <header>가 banner landmark 역할을 가지도록 함 */}
        <Navbar />
        <main className="relative z-10">
          <HeroSection />
          <FeaturesSection />
          <WorkflowSection />
          <DemoSection />
        </main>
        {/* FooterSection을 main 밖에 배치하여 <footer>가 contentinfo landmark 역할을 가지도록 함 */}
        <FooterSection />
      </SmoothScroll>
    </div>
  );
}
