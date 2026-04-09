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
