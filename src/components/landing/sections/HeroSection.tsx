'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { Button } from '@/components/ui/button';
import { ChevronDown } from 'lucide-react';
import { AuroraBackground } from '../AuroraBackground';
import { LogoBadge } from '@/components/ui/logo';

// ============================================================================
// 상수
// ============================================================================

const TITLE_TEXT = 'AI 훈련의 새로운 기준';
const TYPING_INTERVAL_MS = 150;

// ============================================================================
// 커스텀 훅
// ============================================================================

/**
 * 타이핑 효과 훅
 * @param text - 타이핑할 텍스트
 * @param intervalMs - 타이핑 간격 (ms)
 */
function useTypingEffect(text: string, intervalMs: number = TYPING_INTERVAL_MS) {
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    let currentIndex = 0;

    const typingInterval = setInterval(() => {
      if (currentIndex < text.length) {
        setDisplayedText(text.slice(0, currentIndex + 1));
        currentIndex++;
      } else {
        clearInterval(typingInterval);
        setIsComplete(true);
      }
    }, intervalMs);

    return () => clearInterval(typingInterval);
  }, [text, intervalMs]);

  return { displayedText, isComplete };
}

/**
 * 요소 등장 애니메이션 훅
 * @param isActive - 애니메이션 활성화 여부
 * @param refs - 애니메이션 대상 요소 refs
 */
function useEntranceAnimation(
  isActive: boolean,
  refs: {
    subtitle: React.RefObject<HTMLParagraphElement | null>;
    cta: React.RefObject<HTMLDivElement | null>;
    scrollIndicator: React.RefObject<HTMLDivElement | null>;
  }
) {
  useEffect(() => {
    if (!isActive) return;

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    tl.fromTo(
      refs.subtitle.current,
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 0.8 }
    )
      .fromTo(
        refs.cta.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6 },
        '-=0.4'
      )
      .fromTo(
        refs.scrollIndicator.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.5 },
        '-=0.2'
      );

    // 스크롤 인디케이터 반복 애니메이션
    gsap.to(refs.scrollIndicator.current, {
      y: 10,
      duration: 1.5,
      repeat: -1,
      yoyo: true,
      ease: 'power1.inOut',
    });
  }, [isActive, refs]);
}

// ============================================================================
// 서브 컴포넌트
// ============================================================================

function HeroLogoBadge() {
  return (
    <div className="relative mb-20">
      <LogoBadge />
    </div>
  );
}

interface TitleProps {
  text: string;
  showCursor: boolean;
}

function Title({ text, showCursor }: TitleProps) {
  return (
    <h1 className="relative text-center text-5xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-bold max-w-6xl leading-[1.1] tracking-tight whitespace-nowrap text-gray-800">
      {text}
      {showCursor && (
        <span className="inline-block w-[4px] h-[0.85em] bg-gray-800 ml-1 align-middle animate-blink" />
      )}
    </h1>
  );
}

interface SubtitleProps {
  ref: React.RefObject<HTMLParagraphElement | null>;
}

const Subtitle = ({ ref }: SubtitleProps) => (
  <p
    ref={ref}
    className="relative mt-6 text-center text-lg sm:text-xl text-gray-600 max-w-2xl opacity-0"
  >
    기업 진단부터 컨설턴트 매칭, 맞춤형 AI 훈련 로드맵까지
    <br className="hidden sm:block" />
    KPC가 제공하는 차세대 AI 교육 솔루션
  </p>
);

interface CTAButtonsProps {
  ref: React.RefObject<HTMLDivElement | null>;
}

const CTAButtons = ({ ref }: CTAButtonsProps) => (
  <div ref={ref} className="relative mt-24 flex flex-col sm:flex-row gap-4 opacity-0">
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
        className="px-8 py-6 text-base rounded-full border-gray-300 hover:bg-gray-50 bg-white/80"
        data-cursor-hover
      >
        데모 살펴보기
      </Button>
    </a>
  </div>
);

interface ScrollIndicatorProps {
  ref: React.RefObject<HTMLDivElement | null>;
}

const ScrollIndicator = ({ ref }: ScrollIndicatorProps) => (
  <div
    ref={ref}
    className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-gray-400 opacity-0"
  >
    <span className="text-xs">스크롤하여 더 알아보기</span>
    <ChevronDown className="h-5 w-5" />
  </div>
);

// ============================================================================
// 메인 컴포넌트
// ============================================================================

/**
 * 랜딩 페이지 Hero 섹션
 *
 * - 타이핑 효과로 제목 표시
 * - 타이핑 완료 후 Aurora 배경 및 나머지 요소 페이드인
 */
export default function HeroSection() {
  const { displayedText, isComplete: isTypingComplete } = useTypingEffect(TITLE_TEXT);

  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const scrollIndicatorRef = useRef<HTMLDivElement>(null);

  useEntranceAnimation(isTypingComplete, {
    subtitle: subtitleRef,
    cta: ctaRef,
    scrollIndicator: scrollIndicatorRef,
  });

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-4 pt-16 pb-32 overflow-hidden bg-white isolate">
      <AuroraBackground visible={isTypingComplete} />

      <HeroLogoBadge />
      <Title text={displayedText} showCursor={!isTypingComplete} />
      <Subtitle ref={subtitleRef} />
      <CTAButtons ref={ctaRef} />
      <ScrollIndicator ref={scrollIndicatorRef} />
    </section>
  );
}
