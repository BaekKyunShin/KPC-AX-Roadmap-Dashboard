'use client';

import { ChevronLeft, ChevronRight, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface StickyFormNavProps {
  /** 이전 버튼 클릭 핸들러. 첫 스텝이면 undefined → 이전 버튼 비활성/숨김. */
  onPrev?: () => void;
  /** 다음 버튼 클릭 핸들러. 마지막 스텝이면 undefined → 다음 버튼 비활성/숨김. */
  onNext?: () => void;
  /** 수동 저장 버튼 클릭 핸들러. 항상 필수. */
  onSave: () => void;
  /** 첫 스텝 여부 (이전 버튼 비활성). 기본 false */
  isFirstStep?: boolean;
  /** 마지막 스텝 여부 (다음 버튼 비활성, 제출 버튼으로 교체 가능). 기본 false */
  isLastStep?: boolean;
  /** 저장 중 상태 (저장 버튼 spinner). 기본 false */
  isSaving?: boolean;
  /** 저장 상태 인디케이터 텍스트 (예: "자동 저장됨", "저장 실패"). optional */
  saveIndicator?: React.ReactNode;
  /** 마지막 스텝일 때 다음 버튼 대신 사용할 '제출' 버튼 레이블·핸들러. 있으면 onNext 무시 */
  submit?: {
    label: string;
    onSubmit: () => void;
    disabled?: boolean;
    /**
     * disabled=true 일 때 노출할 사유. 브라우저 native tooltip(title 속성)으로 표시되어
     * 마우스 hover 시 사용자에게 차단 이유를 안내한다. disabled=false 면 무시된다.
     * (#2 Nielsen H5 — 자동저장 'error' 상태에서 제출 차단 사유 노출)
     */
    disabledReason?: string;
  };
  /** className 합성 */
  className?: string;
}

/**
 * StickyFormNav — 인터뷰 스테퍼 하단 고정 네비게이션 바.
 *
 * 좌측 '이전', 우측 '다음'/'제출' + '저장' 버튼 + 저장 상태 인디케이터 구성.
 * 스테퍼의 스텝 이동 및 수동 저장을 한 곳에 묶어 제공한다.
 *
 * 제약: PageContainer (또는 동일한 px-4 sm:px-6 lg:px-8 패딩 래퍼) 내부에서만 사용할 것.
 * negative margin (-mx-4 sm:-mx-6 lg:-mx-8) 로 좌우 패딩을 취소하여 전폭 배경을 그린다.
 */
export function StickyFormNav({
  onPrev,
  onNext,
  onSave,
  isFirstStep = false,
  isLastStep = false,
  isSaving = false,
  saveIndicator,
  submit,
  className,
}: StickyFormNavProps) {
  return (
    <div
      className={cn(
        'sticky bottom-0 z-10 -mx-4 sm:-mx-6 lg:-mx-8 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3 px-4 sm:px-6 lg:px-8 py-3">
        {/* 좌측: 이전 버튼 */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onPrev}
          disabled={isFirstStep || !onPrev || isSaving}
          aria-label="이전 스텝"
          className="disabled:opacity-40"
        >
          <ChevronLeft className="mr-1.5 size-4" />
          이전
        </Button>

        {/* 중앙: 저장 인디케이터 + 저장 버튼 */}
        <div className="flex items-center gap-3">
          {saveIndicator && <span className="text-xs text-muted-foreground">{saveIndicator}</span>}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onSave}
            disabled={isSaving}
            aria-label="수동 저장"
            className="disabled:opacity-40"
          >
            {isSaving ? (
              <Loader2 className="mr-1.5 size-4 animate-spin" />
            ) : (
              <Save className="mr-1.5 size-4" />
            )}
            저장
          </Button>
        </div>

        {/* 우측: 다음 또는 제출 버튼 */}
        {isLastStep && submit ? (
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={submit.onSubmit}
            disabled={submit.disabled || isSaving}
            aria-label={submit.label}
            title={submit.disabled && submit.disabledReason ? submit.disabledReason : undefined}
            className="disabled:opacity-40"
          >
            {submit.label}
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onNext}
            disabled={isLastStep || !onNext || isSaving}
            aria-label="다음 스텝"
            className="disabled:opacity-40"
          >
            다음
            <ChevronRight className="ml-1.5 size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
