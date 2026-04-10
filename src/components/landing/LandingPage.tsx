import { Suspense } from 'react';
import SmoothScroll from './SmoothScroll';
import Navbar from './sections/Navbar';
import HeroSection from './sections/HeroSection';
import FeaturesSection from './sections/FeaturesSection';
import WorkflowSection from './sections/WorkflowSection';
import DemoSection from './sections/DemoSection';
import FooterSection from './sections/FooterSection';

/** Navbar PPR fallback — auth 체크 완료 전 빈 nav 영역 */
function NavbarFallback() {
  return (
    <header>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between" />
        </div>
      </nav>
    </header>
  );
}

export default function LandingPage() {
  return (
    <div className="landing-page">
      <SmoothScroll>
        {/* Navbar: async Server Component → Suspense로 감싸 PPR 정적/동적 분리 */}
        <Suspense fallback={<NavbarFallback />}>
          <Navbar />
        </Suspense>
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
