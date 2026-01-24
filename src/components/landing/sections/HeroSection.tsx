'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { Button } from '@/components/ui/button';
import { ChevronDown, Sparkles } from 'lucide-react';

export default function HeroSection() {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const scrollIndicatorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    tl.fromTo(
      titleRef.current,
      { opacity: 0, y: 50 },
      { opacity: 1, y: 0, duration: 1, delay: 0.3 }
    )
      .fromTo(
        subtitleRef.current,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.8 },
        '-=0.5'
      )
      .fromTo(
        ctaRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6 },
        '-=0.4'
      )
      .fromTo(
        scrollIndicatorRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.5 },
        '-=0.2'
      );

    // 스크롤 인디케이터 애니메이션
    gsap.to(scrollIndicatorRef.current, {
      y: 10,
      duration: 1.5,
      repeat: -1,
      yoyo: true,
      ease: 'power1.inOut',
    });
  }, []);

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-4 pt-16">
      {/* Logo Badge */}
      <div className="flex items-center gap-2 mb-8 px-4 py-2 bg-white/50 backdrop-blur-sm rounded-full border border-gray-200/50">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-blue-600 to-indigo-600">
          <Sparkles className="h-3.5 w-3.5 text-white" />
        </div>
        <span className="text-sm font-medium text-gray-700">KPC AI 훈련 로드맵</span>
      </div>

      {/* Main Title */}
      <h1
        ref={titleRef}
        className="text-center text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold text-gray-900 max-w-5xl leading-tight tracking-tight"
      >
        AI 교육의
        <br />
        새로운 기준
      </h1>

      {/* Subtitle */}
      <p
        ref={subtitleRef}
        className="mt-6 text-center text-lg sm:text-xl text-gray-600 max-w-2xl"
      >
        기업 진단부터 컨설턴트 매칭, 맞춤형 AI 훈련 로드맵까지
        <br className="hidden sm:block" />
        KPC가 제공하는 차세대 AI 교육 솔루션
      </p>

      {/* CTA Buttons */}
      <div ref={ctaRef} className="mt-10 flex flex-col sm:flex-row gap-4">
        <Link href="/register">
          <Button
            size="lg"
            className="bg-gray-900 hover:bg-gray-800 text-white px-8 py-6 text-base rounded-full"
            data-cursor-hover
          >
            무료로 시작하기
          </Button>
        </Link>
        <a href="#demo">
          <Button
            size="lg"
            variant="outline"
            className="px-8 py-6 text-base rounded-full border-gray-300 hover:bg-gray-50"
            data-cursor-hover
          >
            데모 살펴보기
          </Button>
        </a>
      </div>

      {/* Scroll Indicator */}
      <div
        ref={scrollIndicatorRef}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-gray-400"
      >
        <span className="text-xs">스크롤하여 더 알아보기</span>
        <ChevronDown className="h-5 w-5" />
      </div>
    </section>
  );
}
