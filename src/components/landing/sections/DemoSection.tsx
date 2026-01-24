'use client';

import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Play, Monitor } from 'lucide-react';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export default function DemoSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const mockupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.fromTo(
      contentRef.current,
      { opacity: 0, y: 50 },
      {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 70%',
          toggleActions: 'play none none reverse',
        },
      }
    );

    gsap.fromTo(
      mockupRef.current,
      { opacity: 0, scale: 0.95 },
      {
        opacity: 1,
        scale: 1,
        duration: 1,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: sectionRef.current,
          start: 'top 60%',
          toggleActions: 'play none none reverse',
        },
      }
    );
  }, []);

  return (
    <section
      id="demo"
      ref={sectionRef}
      className="py-24 sm:py-32 px-4 bg-gray-900 relative overflow-hidden"
    >
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-gray-900 to-black" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Section Header */}
        <div ref={contentRef} className="text-center mb-16">
          <span className="inline-block px-4 py-1.5 bg-blue-500/10 text-blue-400 text-sm font-medium rounded-full mb-4 border border-blue-500/20">
            제품 데모
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-white mb-4">
            직접 경험해보세요
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            KPC AI 로드맵 대시보드가 어떻게 기업의 AI 교육을 혁신하는지 확인하세요
          </p>
        </div>

        {/* Mockup */}
        <div
          ref={mockupRef}
          className="relative max-w-5xl mx-auto"
        >
          {/* Browser Frame */}
          <div className="bg-gray-800 rounded-2xl overflow-hidden border border-gray-700 shadow-2xl">
            {/* Browser Header */}
            <div className="flex items-center gap-2 px-4 py-3 bg-gray-800 border-b border-gray-700">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
              </div>
              <div className="flex-1 flex justify-center">
                <div className="px-4 py-1 bg-gray-700 rounded-lg text-xs text-gray-400">
                  kpc-ai-roadmap.vercel.app
                </div>
              </div>
            </div>

            {/* Content Area */}
            <div className="bg-gray-100 aspect-video flex items-center justify-center">
              <div className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="p-4 bg-white rounded-2xl shadow-lg">
                    <Monitor className="h-16 w-16 text-gray-400" />
                  </div>
                </div>
                <p className="text-gray-500 text-sm">
                  대시보드 스크린샷 또는 데모 영상
                </p>
                <button
                  className="mt-4 inline-flex items-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-full hover:bg-gray-800 transition-colors"
                  data-cursor-hover
                >
                  <Play className="h-4 w-4" />
                  <span className="text-sm font-medium">데모 영상 보기</span>
                </button>
              </div>
            </div>
          </div>

          {/* Floating Elements */}
          <div className="absolute -left-4 top-1/4 bg-blue-500/10 backdrop-blur-sm border border-blue-500/20 rounded-xl p-4 hidden lg:block">
            <div className="text-blue-400 text-sm font-medium">AI 로드맵 생성</div>
            <div className="text-white text-2xl font-bold">98%</div>
            <div className="text-gray-400 text-xs">정확도</div>
          </div>

          <div className="absolute -right-4 top-1/3 bg-orange-500/10 backdrop-blur-sm border border-orange-500/20 rounded-xl p-4 hidden lg:block">
            <div className="text-orange-400 text-sm font-medium">컨설턴트 매칭</div>
            <div className="text-white text-2xl font-bold">24h</div>
            <div className="text-gray-400 text-xs">평균 매칭 시간</div>
          </div>
        </div>
      </div>
    </section>
  );
}
