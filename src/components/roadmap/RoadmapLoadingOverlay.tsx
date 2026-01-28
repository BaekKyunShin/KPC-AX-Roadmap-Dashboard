'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Check, ExternalLink, Monitor } from 'lucide-react';
import Link from 'next/link';

// =============================================================================
// 타입 정의
// =============================================================================

interface Step {
  id: number;
  label: string;
}

interface Tip {
  message: string;
  hasProfileLink: boolean;
}

interface RoadmapLoadingOverlayProps {
  /** 테스트 로드맵인지 여부 */
  isTestMode: boolean;
  /** 실제 로드맵일 경우 회사명 */
  companyName?: string;
  /** 프로필 관리 페이지 경로 */
  profileHref?: string;
}

// =============================================================================
// 상수 정의
// =============================================================================

const STEPS: readonly Step[] = [
  { id: 1, label: '요구사항 분석' },
  { id: 2, label: '교육과정 설계' },
  { id: 3, label: '로드맵 구성' },
] as const;

/** 각 단계별 소요 시간 (밀리초) */
const STEP_DURATIONS_MS = {
  STEP_1: 25000,
  STEP_2: 35000,
  STEP_3: 30000,
} as const;

const STEP_DURATIONS = [
  STEP_DURATIONS_MS.STEP_1,
  STEP_DURATIONS_MS.STEP_2,
  STEP_DURATIONS_MS.STEP_3,
];

const TOTAL_DURATION_MS = STEP_DURATIONS.reduce((a, b) => a + b, 0);

/** 팁 전환 간격 (밀리초) */
const TIP_INTERVAL_MS = 9000;

/** 프로그레스 업데이트 간격 (밀리초) */
const PROGRESS_UPDATE_INTERVAL_MS = 100;

/** 팁 페이드 애니메이션 지속 시간 (밀리초) */
const TIP_FADE_DURATION_MS = 300;

/** 프로그레스 최대값 (완료 전까지 99%로 제한) */
const MAX_PROGRESS_PERCENT = 99;

// 단계별 상태 메시지 (테스트용)
const TEST_STEP_MESSAGES: readonly string[] = [
  '업무 환경과 개선 목표를 분석하고 있습니다...',
  '요구사항에 적합한 AI 교육과정을 설계하고 있습니다...',
  '단계별 AI 훈련 로드맵을 구성하고 있습니다...',
];

// 테스트 로드맵용 팁 메시지
const TEST_TIPS: readonly Tip[] = [
  {
    message: '산업별 강의/컨설팅 경험을 상세히 기록하면 해당 분야 프로젝트 매칭에 유리합니다.',
    hasProfileLink: true,
  },
  {
    message: '주요 수행 프로젝트를 구체적으로 기록하면 유사 프로젝트 배정에 도움이 됩니다.',
    hasProfileLink: true,
  },
  {
    message: '전문 교육 분야를 세분화하여 등록하면 더 정확한 프로젝트 매칭이 가능합니다.',
    hasProfileLink: true,
  },
  {
    message: '보유 자격증을 등록하면 관련 분야 프로젝트 배정 시 우선 고려됩니다.',
    hasProfileLink: true,
  },
];

// 실제 로드맵용 안내 메시지
const REAL_TIPS: readonly Tip[] = [
  {
    message:
      'AI 훈련 로드맵은 현장 인터뷰 결과와 기업의 개선 목표를 종합 분석하여 최적의 교육 경로를 제안합니다.',
    hasProfileLink: false,
  },
  {
    message: 'KPC AI 훈련 프로그램은 실무 적용을 위한 실습/프로젝트 기반 학습으로 구성됩니다.',
    hasProfileLink: false,
  },
  {
    message: '로드맵은 업무 특성에 맞는 단계별 교육과정과 예상 소요시간을 포함합니다.',
    hasProfileLink: false,
  },
  {
    message: '생성된 로드맵은 PDF 또는 Excel 형식으로 다운로드할 수 있습니다.',
    hasProfileLink: false,
  },
];

// =============================================================================
// 유틸리티 함수
// =============================================================================

/**
 * 실제 로드맵용 단계별 상태 메시지 생성
 */
function createRealStepMessages(companyName: string): string[] {
  return [
    `"${companyName}"의 업무 환경과 개선 목표를 분석하고 있습니다...`,
    `"${companyName}"의 요구사항에 적합한 AI 교육과정을 설계하고 있습니다...`,
    `"${companyName}" 맞춤형 AI 훈련 로드맵을 구성하고 있습니다...`,
  ];
}

/**
 * 경과 시간에 따른 현재 단계 계산
 */
function calculateCurrentStep(elapsedMs: number): number {
  let accumulatedTime = 0;
  for (let i = 0; i < STEP_DURATIONS.length; i++) {
    accumulatedTime += STEP_DURATIONS[i];
    if (elapsedMs < accumulatedTime) {
      return i;
    }
  }
  return STEP_DURATIONS.length - 1;
}

// =============================================================================
// 커스텀 훅
// =============================================================================

/**
 * 프로그레스 및 단계 상태 관리 훅
 */
function useProgress() {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const startTime = Date.now();

    const updateProgress = () => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min((elapsed / TOTAL_DURATION_MS) * 100, MAX_PROGRESS_PERCENT);

      setProgress(newProgress);
      setCurrentStep(calculateCurrentStep(elapsed));
    };

    const intervalId = setInterval(updateProgress, PROGRESS_UPDATE_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, []);

  return { currentStep, progress };
}

/**
 * 팁 순환 상태 관리 훅
 */
function useTipRotation(tipCount: number) {
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);

  const rotateTip = useCallback(() => {
    setIsFading(true);
    setTimeout(() => {
      setCurrentTipIndex((prev) => (prev + 1) % tipCount);
      setIsFading(false);
    }, TIP_FADE_DURATION_MS);
  }, [tipCount]);

  useEffect(() => {
    const intervalId = setInterval(rotateTip, TIP_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [rotateTip]);

  return { currentTipIndex, isFading };
}

// =============================================================================
// 하위 컴포넌트
// =============================================================================

interface StepIndicatorProps {
  steps: readonly Step[];
  currentStep: number;
}

function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center mb-8">
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isActive = index === currentStep;
        const isPending = index > currentStep;

        return (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isCompleted
                    ? 'bg-purple-600 text-white'
                    : isActive
                      ? 'bg-purple-600 text-white ring-4 ring-purple-200 animate-pulse'
                      : 'bg-gray-200 text-gray-500'
                }`}
              >
                {isCompleted ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <span className="text-sm font-medium">{step.id}</span>
                )}
              </div>
              <span
                className={`mt-2 text-xs font-medium ${
                  isPending ? 'text-gray-400' : 'text-purple-600'
                }`}
              >
                {step.label}
              </span>
            </div>

            {index < steps.length - 1 && (
              <div
                className={`w-16 h-0.5 mx-2 mb-6 transition-colors duration-300 ${
                  isCompleted ? 'bg-purple-600' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

interface ProgressBarProps {
  message: string;
  progress: number;
}

function ProgressBar({ message, progress }: ProgressBarProps) {
  return (
    <div className="bg-gray-50 rounded-lg p-6 mb-6">
      <p className="text-sm text-gray-700 text-center mb-4">{message}</p>
      <div className="relative">
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-purple-600 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="absolute right-0 -top-6 text-xs text-gray-500">
          {Math.round(progress)}%
        </span>
      </div>
    </div>
  );
}

interface TipCardProps {
  tip: Tip;
  title: string;
  isFading: boolean;
  showProfileLink: boolean;
  profileHref: string;
}

function TipCard({ tip, title, isFading, showProfileLink, profileHref }: TipCardProps) {
  const fadeClass = isFading ? 'opacity-0' : 'opacity-100';

  return (
    <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
      <div className="flex items-start gap-3">
        <span className="text-lg flex-shrink-0">💡</span>
        <div className="flex-1 min-h-[60px]">
          <p className="text-xs font-medium text-purple-800 mb-1">{title}</p>
          <p className={`text-sm text-purple-700 transition-opacity duration-300 ${fadeClass}`}>
            {tip.message}
          </p>
          {showProfileLink && tip.hasProfileLink && (
            <Link
              href={profileHref}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-1 mt-2 text-sm text-purple-600 hover:text-purple-800 hover:underline transition-opacity duration-300 ${fadeClass}`}
            >
              <span>👉</span>
              <span>프로필 관리</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

interface TipIndicatorProps {
  totalCount: number;
  currentIndex: number;
}

function TipIndicator({ totalCount, currentIndex }: TipIndicatorProps) {
  return (
    <div className="flex justify-center gap-1.5 mt-4">
      {Array.from({ length: totalCount }).map((_, index) => (
        <div
          key={index}
          className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
            index === currentIndex ? 'bg-purple-600' : 'bg-gray-300'
          }`}
        />
      ))}
    </div>
  );
}

// =============================================================================
// 메인 컴포넌트
// =============================================================================

export default function RoadmapLoadingOverlay({
  isTestMode,
  companyName = '',
  profileHref = '/consultant/profile',
}: RoadmapLoadingOverlayProps) {
  const { currentStep, progress } = useProgress();

  const tips = isTestMode ? TEST_TIPS : REAL_TIPS;
  const { currentTipIndex, isFading } = useTipRotation(tips.length);

  const stepMessages = useMemo(
    () => (isTestMode ? TEST_STEP_MESSAGES : createRealStepMessages(companyName)),
    [isTestMode, companyName]
  );

  const currentTip = tips[currentTipIndex];
  const tipTitle = isTestMode ? '컨설턴트 Tip' : '안내';

  return (
    <div className="fixed inset-0 bg-white/95 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="max-w-lg w-full mx-4">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-100 mb-4">
            <Monitor className="w-8 h-8 text-purple-600 animate-pulse" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">AI 로드맵 생성 중</h2>
        </div>

        <StepIndicator steps={STEPS} currentStep={currentStep} />

        <ProgressBar message={stepMessages[currentStep]} progress={progress} />

        <TipCard
          tip={currentTip}
          title={tipTitle}
          isFading={isFading}
          showProfileLink={isTestMode}
          profileHref={profileHref}
        />

        <TipIndicator totalCount={tips.length} currentIndex={currentTipIndex} />
      </div>
    </div>
  );
}
