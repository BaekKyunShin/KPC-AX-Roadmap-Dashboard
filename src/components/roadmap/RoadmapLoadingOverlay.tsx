'use client';

import { useState, useEffect, useRef } from 'react';
import { Check, ExternalLink, Sparkles, X } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

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
  /** 취소 버튼 클릭 시 호출되는 콜백 */
  onCancel?: () => void;
  /** 생성 완료 여부 (true면 100%로 즉시 전환) */
  isCompleted?: boolean;
}

// =============================================================================
// 상수 정의
// =============================================================================

const STEPS: readonly Step[] = [
  { id: 1, label: '요구사항 분석' },
  { id: 2, label: '교육과정 설계' },
  { id: 3, label: '로드맵 구성' },
] as const;

/**
 * 각 단계별 소요 시간 (밀리초)
 * - 요구사항 분석: 36초
 * - 교육과정 설계: 51초
 * - 로드맵 구성: 43초
 * - 총 130초
 */
const STEP_DURATIONS_MS = [36000, 51000, 43000] as const;

const TOTAL_DURATION_MS = STEP_DURATIONS_MS.reduce<number>((a, b) => a + b, 0);

/** 팁 관련 타이밍 설정 (밀리초) */
const TIP_CONFIG = {
  /** 팁 전환 간격 */
  INTERVAL_MS: 9000,
  /** 팁 페이드 애니메이션 지속 시간 */
  FADE_DURATION_MS: 300,
} as const;

/** 프로그레스 업데이트 간격 (밀리초) */
const PROGRESS_UPDATE_INTERVAL_MS = 100;

/** 프로그레스 바 설정 */
const PROGRESS_CONFIG = {
  /** 진행 중 최대값 (완료 전까지 99%로 제한) */
  MAX_PERCENT: 99,
  /** 완료 시 값 */
  COMPLETED_PERCENT: 100,
  /** 완료 애니메이션 소요 시간 (밀리초) - 현재 진행률에서 100%까지 */
  COMPLETION_ANIMATION_MS: 1500,
  /** 후반부 속도 감소 설정 */
  EASING: {
    /** 속도 감소가 시작되는 진행률 (%) */
    THRESHOLD_PERCENT: 80,
    /** 해당 진행률에 도달하는 데 사용되는 시간 비율 (0~1) */
    THRESHOLD_TIME_RATIO: 0.6,
  },
} as const;

/** 100% 도달 후 오버레이 닫기 전 대기 시간 (밀리초) */
const COMPLETION_HOLD_MS = 500;

/** 완료 후 오버레이 닫기까지 총 딜레이 (애니메이션 + 대기) */
export const COMPLETION_DELAY_MS =
  PROGRESS_CONFIG.COMPLETION_ANIMATION_MS + COMPLETION_HOLD_MS;

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
  for (let i = 0; i < STEP_DURATIONS_MS.length; i++) {
    accumulatedTime += STEP_DURATIONS_MS[i];
    if (elapsedMs < accumulatedTime) {
      return i;
    }
  }
  return STEP_DURATIONS_MS.length - 1;
}

/**
 * 후반부 속도 감소가 적용된 진행률 계산
 *
 * 시간 비율에 따른 진행률을 비선형으로 계산하여
 * 후반부(80% 이후)에서 진행 속도가 느려지도록 함
 *
 * @param timeRatio 경과 시간 비율 (0~1)
 * @returns 진행률 (0~99)
 */
function calculateEasedProgress(timeRatio: number): number {
  const { THRESHOLD_PERCENT, THRESHOLD_TIME_RATIO } = PROGRESS_CONFIG.EASING;
  const clampedTimeRatio = Math.min(timeRatio, 1);

  if (clampedTimeRatio <= THRESHOLD_TIME_RATIO) {
    // 0~60% 시간 → 0~80% 진행 (빠른 구간)
    return (clampedTimeRatio / THRESHOLD_TIME_RATIO) * THRESHOLD_PERCENT;
  }

  // 60~100% 시간 → 80~99% 진행 (느린 구간)
  const remainingTimeRatio =
    (clampedTimeRatio - THRESHOLD_TIME_RATIO) / (1 - THRESHOLD_TIME_RATIO);
  return THRESHOLD_PERCENT + remainingTimeRatio * (PROGRESS_CONFIG.MAX_PERCENT - THRESHOLD_PERCENT);
}

/**
 * 선형 보간 (Linear Interpolation)
 * @param start 시작 값
 * @param end 종료 값
 * @param ratio 보간 비율 (0~1)
 */
function lerp(start: number, end: number, ratio: number): number {
  return start + (end - start) * ratio;
}

// =============================================================================
// 커스텀 훅
// =============================================================================

/**
 * 프로그레스 및 단계 상태 관리 훅
 *
 * 두 가지 모드로 동작:
 * 1. 일반 진행: 시간 기반으로 0% → 99%까지 easing 적용하여 진행
 * 2. 완료 애니메이션: isCompleted가 true가 되면 현재 값에서 100%까지 점진적 증가
 *
 * @param isCompleted 생성 완료 여부
 */
function useProgress(isCompleted: boolean) {
  const [stepIndex, setStepIndex] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);
  const [isAnimatingCompletion, setIsAnimatingCompletion] = useState(false);

  // 완료 애니메이션 시작 시점의 진행률 저장 (클로저 문제 방지)
  const animationStartProgressRef = useRef(0);

  // 일반 진행 (완료 전, 시간 기반 0% → 99%)
  useEffect(() => {
    if (isCompleted || isAnimatingCompletion) return;

    const startTime = Date.now();

    const tick = () => {
      const elapsed = Date.now() - startTime;
      setProgressPercent(calculateEasedProgress(elapsed / TOTAL_DURATION_MS));
      setStepIndex(calculateCurrentStep(elapsed));
    };

    const intervalId = setInterval(tick, PROGRESS_UPDATE_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [isCompleted, isAnimatingCompletion]);

  // 완료 애니메이션 (현재 진행률 → 100%)
  useEffect(() => {
    if (!isCompleted || isAnimatingCompletion) return;

    // 애니메이션 시작 시점의 진행률 캡처
    animationStartProgressRef.current = progressPercent;
    setIsAnimatingCompletion(true);

    const startTime = Date.now();
    const { COMPLETION_ANIMATION_MS, COMPLETED_PERCENT } = PROGRESS_CONFIG;

    const tick = () => {
      const elapsed = Date.now() - startTime;
      const ratio = Math.min(elapsed / COMPLETION_ANIMATION_MS, 1);
      const newProgress = lerp(animationStartProgressRef.current, COMPLETED_PERCENT, ratio);
      setProgressPercent(newProgress);
    };

    const intervalId = setInterval(tick, PROGRESS_UPDATE_INTERVAL_MS);
    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- progressPercent는 시작 시점에만 캡처
  }, [isCompleted, isAnimatingCompletion]);

  const lastStepIndex = STEPS.length - 1;
  const hasReachedComplete = progressPercent >= PROGRESS_CONFIG.COMPLETED_PERCENT;

  return {
    step: isCompleted ? lastStepIndex : stepIndex,
    progress: progressPercent,
    isAllStepsCompleted: isCompleted && hasReachedComplete,
  };
}

/**
 * 팁 순환 상태 관리 훅
 */
function useTipRotation(tipCount: number) {
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);

  const rotateTip = () => {
    setIsFading(true);
    setTimeout(() => {
      setCurrentTipIndex((prev) => (prev + 1) % tipCount);
      setIsFading(false);
    }, TIP_CONFIG.FADE_DURATION_MS);
  };

  useEffect(() => {
    const intervalId = setInterval(rotateTip, TIP_CONFIG.INTERVAL_MS);
    return () => clearInterval(intervalId);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- React Compiler가 메모이제이션 처리
  }, []);

  return { currentTipIndex, isFading };
}

// =============================================================================
// 하위 컴포넌트
// =============================================================================

interface StepIndicatorProps {
  steps: readonly Step[];
  currentStep: number;
  /** 모든 단계 완료 여부 (true면 모든 단계를 완료 상태로 표시) */
  isAllCompleted?: boolean;
}

function StepIndicator({ steps, currentStep, isAllCompleted = false }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center mb-6">
      {steps.map((step, index) => {
        const isCompleted = isAllCompleted || index < currentStep;
        const isActive = !isAllCompleted && index === currentStep;
        const isPending = !isAllCompleted && index > currentStep;

        return (
          <div key={step.id} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isCompleted
                    ? 'bg-purple-600 text-white'
                    : isActive
                      ? 'bg-purple-600 text-white ring-4 ring-purple-100'
                      : 'bg-gray-100 text-gray-400'
                }`}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4" />
                ) : isActive ? (
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                ) : (
                  <span className="text-xs font-medium">{step.id}</span>
                )}
              </div>
              <span
                className={`mt-1.5 text-xs font-medium whitespace-nowrap ${
                  isPending ? 'text-gray-400' : 'text-purple-600'
                }`}
              >
                {step.label}
              </span>
            </div>

            {index < steps.length - 1 && (
              <div
                className={`w-12 h-0.5 mx-1.5 mb-5 transition-colors duration-300 ${
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
    <div className="bg-gray-50 rounded-xl p-5 mb-5">
      <p className="text-sm text-gray-600 text-center mb-3">{message}</p>
      <div className="relative pt-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-purple-600">진행률</span>
          <span className="text-xs font-medium text-purple-600">{Math.round(progress)}%</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
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
    <div className="bg-purple-50/70 rounded-xl p-4 border border-purple-100">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
          <span className="text-sm">💡</span>
        </div>
        <div className="flex-1 min-h-[52px]">
          <p className="text-xs font-semibold text-purple-700 mb-1">{title}</p>
          <p
            className={`text-sm text-gray-600 leading-relaxed transition-opacity duration-300 ${fadeClass}`}
          >
            {tip.message}
          </p>
          {showProfileLink && tip.hasProfileLink && (
            <Link
              href={profileHref}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-1 mt-2 text-xs font-medium text-purple-600 hover:text-purple-800 transition-all duration-300 ${fadeClass}`}
            >
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
    <div className="flex justify-center gap-1.5 mt-3">
      {Array.from({ length: totalCount }).map((_, index) => (
        <div
          key={index}
          className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
            index === currentIndex ? 'bg-purple-500' : 'bg-gray-300'
          }`}
        />
      ))}
    </div>
  );
}

interface CancelConfirmDialogProps {
  onConfirm: () => void;
  onDismiss: () => void;
}

function CancelConfirmDialog({ onConfirm, onDismiss }: CancelConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/30">
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full animate-in fade-in zoom-in-95 duration-200">
        <h3 className="text-base font-semibold text-gray-900 mb-2">생성을 취소하시겠습니까?</h3>
        <p className="text-sm text-gray-500 mb-5">
          진행 중인 로드맵 생성이 중단되며, 입력한 내용은 유지됩니다.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onDismiss} className="flex-1">
            계속 생성
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            className="flex-1 bg-red-500 hover:bg-red-600"
          >
            생성 취소
          </Button>
        </div>
      </div>
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
  onCancel,
  isCompleted = false,
}: RoadmapLoadingOverlayProps) {
  const { step, progress, isAllStepsCompleted } = useProgress(isCompleted);
  const [isVisible, setIsVisible] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const tips = isTestMode ? TEST_TIPS : REAL_TIPS;
  const { currentTipIndex, isFading } = useTipRotation(tips.length);

  const stepMessages = isTestMode ? TEST_STEP_MESSAGES : createRealStepMessages(companyName);

  // 마운트 시 애니메이션
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  const currentTip = tips[currentTipIndex];
  const tipTitle = isTestMode ? '컨설턴트 Tip' : '안내';

  const handleCancelClick = () => {
    setShowCancelConfirm(true);
  };

  const handleConfirmCancel = () => {
    setIsVisible(false);
    setTimeout(() => {
      onCancel?.();
    }, 200);
  };

  const handleCancelDismiss = () => {
    setShowCancelConfirm(false);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${
        isVisible ? 'bg-black/40 backdrop-blur-sm' : 'bg-transparent'
      }`}
    >
      {/* 모달 카드 */}
      <div
        className={`relative w-full max-w-md bg-white rounded-2xl shadow-2xl transition-all duration-300 ${
          isVisible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'
        }`}
      >
        {/* 닫기 버튼 (우측 상단) */}
        {onCancel && (
          <button
            onClick={handleCancelClick}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors z-10"
            aria-label="취소"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        )}

        <div className="p-6 pt-8">
          {/* 헤더 */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 mb-4 shadow-lg shadow-purple-200">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <h2 className="text-lg font-bold text-gray-900">AI 로드맵 생성 중</h2>
            <p className="text-sm text-gray-500 mt-1">잠시만 기다려 주세요</p>
          </div>

          <StepIndicator steps={STEPS} currentStep={step} isAllCompleted={isAllStepsCompleted} />

          <ProgressBar message={stepMessages[step]} progress={progress} />

          <TipCard
            tip={currentTip}
            title={tipTitle}
            isFading={isFading}
            showProfileLink={isTestMode}
            profileHref={profileHref}
          />

          <TipIndicator totalCount={tips.length} currentIndex={currentTipIndex} />

          {/* 취소 버튼 */}
          {onCancel && (
            <div className="mt-6 pt-4 border-t border-gray-100">
              <Button
                variant="ghost"
                onClick={handleCancelClick}
                className="w-full text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              >
                생성 취소
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* 취소 확인 다이얼로그 */}
      {showCancelConfirm && (
        <CancelConfirmDialog onConfirm={handleConfirmCancel} onDismiss={handleCancelDismiss} />
      )}
    </div>
  );
}
