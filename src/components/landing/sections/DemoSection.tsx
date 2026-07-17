'use client';

import { useRef, useEffect, useState } from 'react';
import Link from 'next/link';
import { Pause, Play } from 'lucide-react';
import { CoursesList } from '@/components/roadmap/CoursesList';
import { SAMPLE_ROADMAP_RESULT, SAMPLE_PBL_OPERATION } from '@/lib/data/demo-sample';
import { DemoPblOperation } from './DemoPblOperation';

// ============================================================================
// 타입 정의
// ============================================================================

type DemoSlideId = 'roadmap-specs' | 'pbl-ops';

interface DemoSlideConfig {
  id: DemoSlideId;
  /** 탭·뱃지 라벨 (트랙 프리픽스 포함). */
  label: string;
  description: string;
  duration: number;
  scrollStartPercent: number;
  scrollEndPercent: number;
  enableScroll: boolean;
}

// ============================================================================
// 상수
// ============================================================================

const PROGRESS_UPDATE_INTERVAL = 50; // ms
const CONTENT_HEIGHT = 340; // px
const DEMO_URL = 'kpc-ax-roadmap-dashboard.vercel.app';

/**
 * 데모 슬라이드 설정 — 2-트랙 데모(로드맵 + PBL).
 *
 * 산인공 양식 v2 개정으로 로드맵 Ⅲ장이 "훈련과정 명세서" 1섹션으로 축소되어
 * 로드맵 단일 슬라이드만으로는 캐러셀이 빈 껍데기였다. 이를 두 산출물 트랙
 * (① 로드맵 훈련과정 명세서 · ② PBL 운영계획)을 각 1슬라이드로 보여주는 구조로
 * 재설계했다(2026-07, 사용자 승인 완료). 슬라이드는 트랙-불가지(track-agnostic)하게
 * id·label·description 만 갖고, 콘텐츠는 renderSlideContent 가 id 로 분기한다.
 */
const DEMO_SLIDES: DemoSlideConfig[] = [
  {
    id: 'roadmap-specs',
    label: '[로드맵] 훈련과정 명세서',
    description: '훈련시기·훈련수준별 훈련과정 명세서 6종 (과정·교과목·시간)',
    duration: 8000,
    scrollStartPercent: 10,
    scrollEndPercent: 90,
    enableScroll: true,
  },
  {
    id: 'pbl-ops',
    label: '[PBL] 운영계획',
    description: '제조업 PBL 운영계획 — 훈련 목표·AI 도구 활용 계획·성과지표',
    duration: 9000,
    scrollStartPercent: 10,
    scrollEndPercent: 90,
    enableScroll: true,
  },
];

// ============================================================================
// 서브 컴포넌트
// ============================================================================

/** 브라우저 창 상단 헤더 */
function BrowserHeader() {
  return (
    <div className="flex items-center gap-2 px-4 py-3 bg-gray-800 border-b border-gray-700">
      <div className="flex gap-2">
        <div className="w-3 h-3 rounded-full bg-red-500" />
        <div className="w-3 h-3 rounded-full bg-yellow-500" />
        <div className="w-3 h-3 rounded-full bg-green-500" />
      </div>
      <div className="flex-1 flex justify-center">
        <div className="px-4 py-1.5 bg-gray-700 rounded-lg text-xs text-gray-400 flex items-center gap-2">
          <LockIcon />
          {DEMO_URL}
        </div>
      </div>
      <div className="w-[52px]" />
    </div>
  );
}

function LockIcon() {
  return (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
      />
    </svg>
  );
}

function NavigationArrow({
  direction,
  onClick,
}: {
  direction: 'prev' | 'next';
  onClick: () => void;
}) {
  const isPrev = direction === 'prev';
  const positionClass = isPrev ? 'left-2' : 'right-2';
  const ariaLabel = isPrev ? '이전 슬라이드' : '다음 슬라이드';
  const pathD = isPrev ? 'M15 19l-7-7 7-7' : 'M9 5l7 7-7 7';

  return (
    <button
      onClick={onClick}
      className={`absolute ${positionClass} top-1/2 -translate-y-1/2 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-gray-900/60 hover:bg-gray-900/80 transition-colors`}
      aria-label={ariaLabel}
    >
      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={pathD} />
      </svg>
    </button>
  );
}

function SlideCounter({ current, total }: { current: number; total: number }) {
  return (
    <div className="absolute top-4 right-4 z-10">
      <span className="px-3 py-1.5 bg-gray-900/70 backdrop-blur text-white text-xs font-medium rounded-full">
        {current} / {total}
      </span>
    </div>
  );
}

/**
 * #008 — 명시적 자동 전환 일시정지·재생 토글.
 *
 * 호버 시 일시정지는 이미 동작하지만(`onMouseEnter/Leave`), 사용자가 표·문구가
 * 긴 슬라이드를 끝까지 읽도록 명시적 컨트롤 추가.
 */
function PlayPauseToggle({ isPaused, onToggle }: { isPaused: boolean; onToggle: () => void }) {
  return (
    <div className="absolute top-4 right-20 z-10">
      <button
        type="button"
        onClick={onToggle}
        className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-900/70 backdrop-blur text-white hover:bg-gray-900/90 transition-colors"
        aria-label={isPaused ? '자동 전환 재생' : '자동 전환 일시정지'}
        data-cursor-hover
      >
        {isPaused ? (
          <Play className="w-3.5 h-3.5" aria-hidden="true" />
        ) : (
          <Pause className="w-3.5 h-3.5" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}

function ProgressIndicator({
  slides,
  currentIndex,
  progress,
  onSlideSelect,
}: {
  slides: DemoSlideConfig[];
  currentIndex: number;
  progress: number;
  onSlideSelect: (index: number) => void;
}) {
  return (
    <div className="flex justify-center items-center gap-4 sm:gap-6 mt-6 flex-wrap">
      {slides.map((slide, index) => {
        const isActive = index === currentIndex;
        const isPast = index < currentIndex;

        return (
          <button
            key={slide.id}
            onClick={() => onSlideSelect(index)}
            className="group flex flex-col items-center gap-2"
            data-cursor-hover
          >
            <span
              className={`text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                isActive ? 'text-purple-400' : 'text-gray-500 group-hover:text-gray-300'
              }`}
            >
              {slide.label}
            </span>
            <div className="w-16 sm:w-20 h-1 rounded-full bg-gray-700 overflow-hidden">
              <div
                className="h-full rounded-full bg-purple-500 transition-all duration-100 ease-linear"
                style={{
                  width: isActive ? `${progress}%` : isPast ? '100%' : '0%',
                  opacity: isActive || isPast ? 1 : 0.3,
                }}
              />
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export default function DemoSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const mockupRef = useRef<HTMLDivElement>(null);
  const slideScrollRefs = useRef<(HTMLDivElement | null)[]>([]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);

  const currentSlide = DEMO_SLIDES[currentIndex];
  const currentLabel = currentSlide.label;

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
    setProgress(0);
  };
  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % DEMO_SLIDES.length);
    setProgress(0);
  };
  const goToPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + DEMO_SLIDES.length) % DEMO_SLIDES.length);
    setProgress(0);
  };

  const currentDuration = currentSlide.duration;

  useEffect(() => {
    if (isPaused) return;

    const incrementPerTick = 100 / (currentDuration / PROGRESS_UPDATE_INTERVAL);

    const intervalId = setInterval(() => {
      setProgress((prev) => {
        const next = prev + incrementPerTick;
        return next > 100 ? 100 : next;
      });
    }, PROGRESS_UPDATE_INTERVAL);

    return () => clearInterval(intervalId);
  }, [isPaused, currentDuration]);

  useEffect(() => {
    if (progress >= 100) {
      setCurrentIndex((prev) => (prev + 1) % DEMO_SLIDES.length);
      setProgress(0);
    }
  }, [progress]);

  const { enableScroll, scrollStartPercent, scrollEndPercent } = currentSlide;

  useEffect(() => {
    if (!enableScroll) return;

    const scrollContainer = slideScrollRefs.current[currentIndex];
    if (!scrollContainer) return;

    const maxScroll = scrollContainer.scrollHeight - scrollContainer.clientHeight;
    if (maxScroll <= 0) return;

    let targetScroll: number;
    if (progress <= scrollStartPercent) {
      targetScroll = 0;
    } else if (progress >= scrollEndPercent) {
      targetScroll = maxScroll;
    } else {
      const scrollProgress =
        (progress - scrollStartPercent) / (scrollEndPercent - scrollStartPercent);
      targetScroll = scrollProgress * maxScroll;
    }

    scrollContainer.scrollTop = targetScroll;
  }, [progress, currentIndex, enableScroll, scrollStartPercent, scrollEndPercent]);

  useEffect(() => {
    slideScrollRefs.current.forEach((ref) => {
      if (ref) ref.scrollTop = 0;
    });
  }, [currentIndex]);

  useEffect(() => {
    let cancelled = false;

    async function animate() {
      const [{ default: gsap }, { ScrollTrigger }] = await Promise.all([
        import('gsap'),
        import('gsap/ScrollTrigger'),
      ]);
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);

      const commonScrollTriggerConfig = {
        trigger: sectionRef.current,
        toggleActions: 'play none none reverse' as const,
      };

      gsap.fromTo(
        contentRef.current,
        { opacity: 0, y: 50 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: 'power3.out',
          scrollTrigger: { ...commonScrollTriggerConfig, start: 'top 70%' },
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
          scrollTrigger: { ...commonScrollTriggerConfig, start: 'top 60%' },
        }
      );
    }

    animate();
    return () => {
      cancelled = true;
    };
  }, []);

  // ============================================================================
  // 슬라이드 컨텐츠 렌더링 (2-트랙: 로드맵 명세서 · PBL 운영계획)
  // ============================================================================

  const renderSlideContent = (slideId: DemoSlideId) => {
    switch (slideId) {
      case 'roadmap-specs':
        return <CoursesList specs={SAMPLE_ROADMAP_RESULT.course_specs} canEdit={false} />;
      case 'pbl-ops':
        return <DemoPblOperation operation={SAMPLE_PBL_OPERATION} />;
      default:
        return null;
    }
  };

  const getSlideClassName = (index: number) => {
    if (index === currentIndex) {
      return 'opacity-100 translate-x-0';
    }
    if (index < currentIndex) {
      return 'opacity-0 -translate-x-8 pointer-events-none';
    }
    return 'opacity-0 translate-x-8 pointer-events-none';
  };

  return (
    <section
      id="demo"
      ref={sectionRef}
      className="py-12 sm:py-14 px-4 bg-gray-900 relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-gray-900 to-black" />

      <div className="max-w-7xl mx-auto relative z-10">
        <div ref={contentRef} className="text-center mb-6 opacity-0">
          <span className="inline-block px-4 py-1.5 bg-purple-500/10 text-purple-400 text-sm font-medium rounded-full mb-4 border border-purple-500/20">
            제품 데모
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-white mb-4">
            직접 경험해보세요
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            AI가 산인공 공식 양식에 맞춘 기업 맞춤형 교육 로드맵을 자동으로 생성합니다.
          </p>
        </div>

        <div
          ref={mockupRef}
          className="max-w-5xl mx-auto opacity-0"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div className="bg-gray-800 rounded-2xl overflow-hidden border border-gray-700 shadow-2xl">
            <BrowserHeader />

            <div className="relative bg-white overflow-hidden" style={{ height: CONTENT_HEIGHT }}>
              <NavigationArrow direction="prev" onClick={goToPrev} />
              <NavigationArrow direction="next" onClick={goToNext} />

              {DEMO_SLIDES.map((slide, index) => (
                <div
                  key={slide.id}
                  className={`absolute inset-0 transition-all duration-500 ease-out ${getSlideClassName(index)}`}
                >
                  <div
                    ref={(el) => {
                      slideScrollRefs.current[index] = el;
                    }}
                    className="w-full h-full overflow-y-auto p-4 sm:p-6"
                  >
                    {renderSlideContent(slide.id)}
                  </div>
                </div>
              ))}

              <SlideCounter current={currentIndex + 1} total={DEMO_SLIDES.length} />
              <PlayPauseToggle isPaused={isPaused} onToggle={() => setIsPaused((prev) => !prev)} />

              <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent pointer-events-none" />
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-2 px-3 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                    {currentLabel}
                  </span>
                  <p className="text-gray-600 text-sm hidden sm:block">
                    {currentSlide.description}
                  </p>
                </div>
                <p className="text-gray-600 text-sm sm:hidden">{currentSlide.description}</p>
              </div>
            </div>
          </div>

          <ProgressIndicator
            slides={DEMO_SLIDES}
            currentIndex={currentIndex}
            progress={progress}
            onSlideSelect={goToSlide}
          />
        </div>

        <div className="flex flex-col sm:flex-row justify-center gap-4 mt-6">
          <Link
            href="/demo"
            className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-purple-600 text-white text-base rounded-full hover:bg-purple-700 transition-all font-medium"
            data-cursor-hover
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
            샘플 데모 보기
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-transparent text-white text-base rounded-full border border-gray-600 hover:bg-gray-800 hover:border-gray-500 transition-all font-medium"
            data-cursor-hover
          >
            무료로 시작하기
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
