'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { RoadmapMatrix } from '@/components/roadmap/RoadmapMatrix';
import { CoursesList } from '@/components/roadmap/CoursesList';
import { PBLCourseView } from '@/components/roadmap/PBLCourseView';
import { ROADMAP_TABS } from '@/types/roadmap-ui';
import type { RoadmapTabKey } from '@/types/roadmap-ui';
import {
  SAMPLE_MATRIX,
  SAMPLE_COURSE_SINGLE,
  SAMPLE_PBL,
} from '@/lib/data/demo-sample';

// GSAP 플러그인 등록 (브라우저 환경에서만)
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

// ============================================================================
// 타입 정의
// ============================================================================

interface DemoSlideConfig {
  key: RoadmapTabKey;
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
 * 데모 슬라이드 설정
 * - ROADMAP_TABS와 동일한 순서: 과정 체계도 → 과정 상세 → PBL 과정
 * - duration: 총 노출 시간 (ms)
 * - scrollStartPercent/scrollEndPercent: 스크롤 구간 (0~100%)
 */
const DEMO_SLIDES: DemoSlideConfig[] = [
  {
    key: 'matrix',
    description: '세부직무별 초급/중급/고급 AI 교육 과정 매트릭스',
    duration: 3300,
    scrollStartPercent: 0,
    scrollEndPercent: 100,
    enableScroll: false,
  },
  {
    key: 'courses',
    description: '각 과정별 커리큘럼, 실습, 도구, 기대효과 상세 정보',
    duration: 8000, // 1초 상단 + 6초 스크롤 + 1초 하단
    scrollStartPercent: 12.5,
    scrollEndPercent: 87.5,
    enableScroll: true,
  },
  {
    key: 'pbl',
    description: '프로젝트 기반 학습 커리큘럼 및 실습 계획',
    duration: 11000, // 1초 상단 + 9초 스크롤 + 1초 하단
    scrollStartPercent: 9.09,
    scrollEndPercent: 90.91,
    enableScroll: true,
  },
];

// ============================================================================
// 서브 컴포넌트
// ============================================================================

/** 브라우저 창 상단 헤더 (트래픽 라이트 + URL 바) */
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

/** 자물쇠 아이콘 */
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

/** 슬라이드 네비게이션 화살표 버튼 */
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

/** 슬라이드 카운터 (예: 1/3) */
function SlideCounter({ current, total }: { current: number; total: number }) {
  return (
    <div className="absolute top-4 right-4 z-10">
      <span className="px-3 py-1.5 bg-gray-900/70 backdrop-blur text-white text-xs font-medium rounded-full">
        {current} / {total}
      </span>
    </div>
  );
}

/** 하단 진행률 인디케이터 */
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
    <div className="flex justify-center items-center gap-6 mt-6">
      {slides.map((slide, index) => {
        const tab = ROADMAP_TABS.find((t) => t.key === slide.key);
        const isActive = index === currentIndex;
        const isPast = index < currentIndex;

        return (
          <button
            key={slide.key}
            onClick={() => onSlideSelect(index)}
            className="group flex flex-col items-center gap-2"
            data-cursor-hover
          >
            <span
              className={`text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                isActive ? 'text-purple-400' : 'text-gray-500 group-hover:text-gray-300'
              }`}
            >
              {tab?.label}
            </span>
            <div className="w-20 h-1 rounded-full bg-gray-700 overflow-hidden">
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
  // Refs
  const sectionRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const mockupRef = useRef<HTMLDivElement>(null);
  const slideScrollRefs = useRef<(HTMLDivElement | null)[]>([]);

  // State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);

  // 현재 슬라이드 정보
  const currentSlide = DEMO_SLIDES[currentIndex];
  const currentTab = ROADMAP_TABS.find((tab) => tab.key === currentSlide.key);
  const currentLabel = currentTab?.label ?? '';

  // ============================================================================
  // 슬라이드 네비게이션 핸들러
  // ============================================================================

  const goToSlide = useCallback((index: number) => {
    setCurrentIndex(index);
    setProgress(0);
  }, []);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % DEMO_SLIDES.length);
    setProgress(0);
  }, []);

  const goToPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + DEMO_SLIDES.length) % DEMO_SLIDES.length);
    setProgress(0);
  }, []);

  // ============================================================================
  // Effects
  // ============================================================================

  // 현재 슬라이드의 duration
  const currentDuration = currentSlide.duration;

  // 자동 진행률 업데이트
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

  // progress가 100에 도달하면 다음 슬라이드로 전환
  // 이 패턴은 progress 기반 슬라이드 전환에 필요하며, 의도된 동작임
  useEffect(() => {
    if (progress >= 100) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrentIndex((prev) => (prev + 1) % DEMO_SLIDES.length);
      setProgress(0);
    }
  }, [progress]);

  // 자동 스크롤에 필요한 설정값 추출
  const { enableScroll, scrollStartPercent, scrollEndPercent } = currentSlide;

  // 자동 스크롤 처리
  useEffect(() => {
    if (!enableScroll) return;

    const scrollContainer = slideScrollRefs.current[currentIndex];
    if (!scrollContainer) return;

    const maxScroll = scrollContainer.scrollHeight - scrollContainer.clientHeight;
    if (maxScroll <= 0) return;

    // 스크롤 위치 계산
    let targetScroll: number;
    if (progress <= scrollStartPercent) {
      targetScroll = 0;
    } else if (progress >= scrollEndPercent) {
      targetScroll = maxScroll;
    } else {
      const scrollProgress = (progress - scrollStartPercent) / (scrollEndPercent - scrollStartPercent);
      targetScroll = scrollProgress * maxScroll;
    }

    scrollContainer.scrollTop = targetScroll;
  }, [progress, currentIndex, enableScroll, scrollStartPercent, scrollEndPercent]);

  // 슬라이드 변경 시 스크롤 위치 초기화
  useEffect(() => {
    slideScrollRefs.current.forEach((ref) => {
      if (ref) ref.scrollTop = 0;
    });
  }, [currentIndex]);

  // GSAP 진입 애니메이션
  useEffect(() => {
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
  }, []);

  // ============================================================================
  // 슬라이드 컨텐츠 렌더링
  // ============================================================================

  const renderSlideContent = (slideKey: RoadmapTabKey) => {
    switch (slideKey) {
      case 'matrix':
        return <RoadmapMatrix matrix={SAMPLE_MATRIX} />;
      case 'courses':
        return <CoursesList courses={[SAMPLE_COURSE_SINGLE]} />;
      case 'pbl':
        return <PBLCourseView course={SAMPLE_PBL} />;
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

  // ============================================================================
  // 렌더링
  // ============================================================================

  return (
    <section
      id="demo"
      ref={sectionRef}
      className="py-12 sm:py-14 px-4 bg-gray-900 relative overflow-hidden"
    >
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-gray-900 to-black" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Section Header */}
        <div ref={contentRef} className="text-center mb-6">
          <span className="inline-block px-4 py-1.5 bg-purple-500/10 text-purple-400 text-sm font-medium rounded-full mb-4 border border-purple-500/20">
            제품 데모
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-semibold text-white mb-4">
            직접 경험해보세요
          </h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            AI가 기업 맞춤형 교육 로드맵을 자동으로 생성합니다
          </p>
        </div>

        {/* Mockup Container */}
        <div
          ref={mockupRef}
          className="max-w-5xl mx-auto"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Browser Frame */}
          <div className="bg-gray-800 rounded-2xl overflow-hidden border border-gray-700 shadow-2xl">
            <BrowserHeader />

            {/* Content Area */}
            <div
              className="relative bg-white overflow-hidden"
              style={{ height: CONTENT_HEIGHT }}
            >
              <NavigationArrow direction="prev" onClick={goToPrev} />
              <NavigationArrow direction="next" onClick={goToNext} />

              {/* Slides */}
              {DEMO_SLIDES.map((slide, index) => (
                <div
                  key={slide.key}
                  className={`absolute inset-0 transition-all duration-500 ease-out ${getSlideClassName(index)}`}
                >
                  <div
                    ref={(el) => { slideScrollRefs.current[index] = el; }}
                    className="w-full h-full overflow-y-auto p-4 sm:p-6"
                  >
                    {renderSlideContent(slide.key)}
                  </div>
                </div>
              ))}

              <SlideCounter current={currentIndex + 1} total={DEMO_SLIDES.length} />

              {/* Bottom Gradient Overlay */}
              <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent pointer-events-none" />
            </div>

            {/* Description Bar */}
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
                <p className="text-gray-600 text-sm sm:hidden">
                  {currentSlide.description}
                </p>
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

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row justify-center gap-4 mt-6">
          <Link
            href="/demo"
            className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-purple-600 text-white text-base rounded-full hover:bg-purple-700 transition-all font-medium"
            data-cursor-hover
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
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
