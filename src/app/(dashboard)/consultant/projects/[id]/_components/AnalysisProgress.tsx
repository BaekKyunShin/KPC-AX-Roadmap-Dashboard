'use client';

import { useState, useEffect } from 'react';
import { Check, Loader2, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

const STEPS = [
  { label: '자가진단 데이터 수집', delay: 0 },
  { label: '5개 영역 교차 분석', delay: 5000 },
  { label: '업종 맥락에 맞는 질문 구성', delay: 15000 },
  { label: '인터뷰 전략 정리', delay: 30000 },
];

export function AnalysisProgress() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // 마운트 후 페이드인
    requestAnimationFrame(() => setIsVisible(true));

    const timers = STEPS.slice(1).map((step, index) =>
      setTimeout(() => setCurrentStep(index + 1), step.delay),
    );

    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300',
        isVisible ? 'bg-black/40 backdrop-blur-sm' : 'bg-transparent',
      )}
    >
      <div
        className={cn(
          'w-full max-w-sm rounded-2xl bg-white px-8 py-10 shadow-2xl transition-all duration-300',
          isVisible
            ? 'scale-100 translate-y-0 opacity-100'
            : 'scale-95 translate-y-4 opacity-0',
        )}
      >
        <p className="text-center text-sm font-medium text-gray-700">
          진단 데이터를 분석하고 있습니다
        </p>

        <div className="mt-8 space-y-3.5">
          {STEPS.map((step, index) => {
            const isComplete = index < currentStep;
            const isActive = index === currentStep;

            return (
              <div key={step.label} className="flex items-center gap-3">
                {isComplete ? (
                  <Check className="h-4 w-4 shrink-0 text-green-500" />
                ) : isActive ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-purple-500" />
                ) : (
                  <Circle className="h-4 w-4 shrink-0 text-gray-300" />
                )}
                <span
                  className={cn(
                    'text-sm',
                    isComplete && 'text-gray-400',
                    isActive && 'font-medium text-gray-900',
                    !isComplete && !isActive && 'text-gray-300',
                  )}
                >
                  {isActive ? `${step.label} 중...` : step.label}
                </span>
              </div>
            );
          })}
        </div>

        <p className="mt-8 text-center text-xs text-gray-400">
          분석 완료까지 약 40~60초 소요됩니다
        </p>
      </div>
    </div>
  );
}
