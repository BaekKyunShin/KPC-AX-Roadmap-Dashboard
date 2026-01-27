'use client';

import SmoothScroll from './SmoothScroll';
import Navbar from './sections/Navbar';
import HeroSection from './sections/HeroSection';
import FeaturesSection from './sections/FeaturesSection';
import WorkflowSection from './sections/WorkflowSection';
import DemoSection from './sections/DemoSection';
import FooterSection from './sections/FooterSection';

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
