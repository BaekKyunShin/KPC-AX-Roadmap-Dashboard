'use client';

import type { ReactNode } from 'react';

// =============================================================================
// 타입 정의
// =============================================================================

export interface SummarySectionProps {
  title: string;
  onEdit: () => void;
  children: ReactNode;
  isEmpty?: boolean;
  /** 테스트 전용 섹션 스타일 적용 */
  isTestSection?: boolean;
}

type SeverityLevel = 'HIGH' | 'MEDIUM' | 'LOW';

// =============================================================================
// 상수
// =============================================================================

const SEVERITY_STYLES: Record<SeverityLevel, string> = {
  HIGH: 'bg-red-100 text-red-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  LOW: 'bg-green-100 text-green-800',
};

const SEVERITY_LABELS: Record<SeverityLevel, string> = {
  HIGH: '높음',
  MEDIUM: '보통',
  LOW: '낮음',
};

// =============================================================================
// 유틸리티 함수
// =============================================================================

/**
 * 날짜 문자열을 한국어 형식으로 포맷팅
 */
export function formatKoreanDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

// =============================================================================
// 컴포넌트
// =============================================================================

/**
 * 심각도 배지 컴포넌트
 */
export function SeverityBadge({ severity }: { severity: string }) {
  const style = SEVERITY_STYLES[severity as SeverityLevel] || 'bg-gray-100';
  const label = SEVERITY_LABELS[severity as SeverityLevel] || severity;

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${style}`}>
      {label}
    </span>
  );
}

/**
 * 수정 버튼 아이콘
 */
function EditIcon() {
  return (
    <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
      />
    </svg>
  );
}

/**
 * 요약 섹션 래퍼 컴포넌트
 * - 일반 섹션과 테스트 전용 섹션 스타일 지원
 */
export function SummarySection({
  title,
  onEdit,
  children,
  isEmpty = false,
  isTestSection = false,
}: SummarySectionProps) {
  const borderClass = isTestSection ? 'border-amber-200' : 'border-gray-200';
  const headerBgClass = isTestSection ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200';

  return (
    <div className={`border rounded-lg overflow-hidden ${borderClass}`}>
      <div className={`flex items-center justify-between px-4 py-2 border-b ${headerBgClass}`}>
        <h3 className="text-sm font-medium text-gray-900">
          {title}
          {isTestSection && <span className="ml-2 text-xs text-amber-600">(테스트 전용)</span>}
        </h3>
        <button
          type="button"
          onClick={onEdit}
          className="text-xs text-blue-600 hover:text-blue-800 flex items-center"
        >
          <EditIcon />
          수정
        </button>
      </div>
      <div className={`p-4 ${isEmpty ? 'text-gray-400 text-sm' : ''}`}>
        {isEmpty ? '입력된 내용 없음' : children}
      </div>
    </div>
  );
}

/**
 * 정보 알림 박스 컴포넌트
 */
export function InfoBox({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-start">
        <svg className="w-5 h-5 text-blue-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
            clipRule="evenodd"
          />
        </svg>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-blue-800">{title}</h3>
          <div className="mt-1 text-sm text-blue-700">{children}</div>
        </div>
      </div>
    </div>
  );
}

/**
 * 통계 카드 컴포넌트
 */
export function StatCard({
  value,
  label,
  colorScheme,
}: {
  value: number;
  label: string;
  colorScheme: 'blue' | 'indigo' | 'red' | 'green';
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    red: 'bg-red-50 text-red-600',
    green: 'bg-green-50 text-green-600',
  };

  const classes = colorClasses[colorScheme];

  return (
    <div className={`${classes.split(' ')[0]} rounded-lg p-3 text-center`}>
      <div className={`text-2xl font-bold ${classes.split(' ')[1]}`}>{value}</div>
      <div className={`text-xs ${classes.split(' ')[1]}`}>{label}</div>
    </div>
  );
}
