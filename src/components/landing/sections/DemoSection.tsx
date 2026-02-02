'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

const demoSlides = [
  {
    id: 'diagnosis',
    label: '기업 자가 진단',
    image: '/demo/diagnosis.png',
  },
  {
    id: 'interview',
    label: '인터뷰 기입',
    image: '/demo/matching.png', // TODO: interview.png로 교체
  },
  {
    id: 'curriculum',
    label: '과정 체계도',
    image: '/demo/roadmap.png', // TODO: curriculum.png로 교체
  },
  {
    id: 'course-detail',
    label: '과정 상세',
    image: '/demo/diagnosis.png', // TODO: course-detail.png로 교체
  },
  {
    id: 'pbl',
    label: 'PBL',
    image: '/demo/matching.png', // TODO: pbl.png로 교체
  },
];

const SLIDE_DURATION = 4000; // 4초마다 전환

export default function DemoSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const mockupRef = useRef<HTMLDivElement>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const goToSlide = useCallback((index: number) => {
    setCurrentIndex(index);
  }, []);

  // 자동 슬라이드 전환
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % demoSlides.length);
    }, SLIDE_DURATION);

    return () => clearInterval(interval);
  }, [isPaused]);

  // GSAP 애니메이션
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
        <div ref={contentRef} className="text-center mb-12">
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

        {/* Mockup with Slideshow */}
        <div
          ref={mockupRef}
          className="max-w-5xl mx-auto"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
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

            {/* Content Area - Slideshow */}
            <div className="bg-white relative" style={{ aspectRatio: '16/10' }}>
              {demoSlides.map((slide, index) => (
                <div
                  key={slide.id}
                  className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                    index === currentIndex ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  <Image
                    src={slide.image}
                    alt={slide.label}
                    fill
                    className="object-cover object-top"
                    unoptimized
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Slide Indicators */}
          <div className="flex justify-center items-center gap-3 mt-6">
            {demoSlides.map((slide, index) => (
              <button
                key={slide.id}
                onClick={() => goToSlide(index)}
                className="group flex flex-col items-center gap-2"
                data-cursor-hover
              >
                <span
                  className={`text-xs font-medium transition-colors ${
                    index === currentIndex ? 'text-blue-400' : 'text-gray-500 group-hover:text-gray-300'
                  }`}
                >
                  {slide.label}
                </span>
                <div
                  className={`h-1 rounded-full transition-all duration-300 ${
                    index === currentIndex
                      ? 'w-8 bg-blue-500'
                      : 'w-4 bg-gray-600 group-hover:bg-gray-500'
                  }`}
                />
              </button>
            ))}
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row justify-center gap-4 mt-12">
          <Link
            href="/demo"
            className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors font-medium"
            data-cursor-hover
          >
            샘플 데모 보기
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-transparent text-white rounded-full border border-gray-600 hover:bg-gray-800 transition-colors font-medium"
            data-cursor-hover
          >
            무료로 시작하기
          </Link>
        </div>
      </div>
    </section>
  );
}
