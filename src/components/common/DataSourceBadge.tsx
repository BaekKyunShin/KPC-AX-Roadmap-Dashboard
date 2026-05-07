import { cn } from '@/lib/utils';

/**
 * 결과 페이지의 각 큰 섹션 헤더 옆에 표시되는 데이터 출처 배지.
 *
 * - `user` — 사용자(고객·컨설턴트)가 진단/인터뷰에서 직접 입력한 값
 * - `ai`   — LLM 이 생성한 값
 * - `mixed` — 사용자 입력 + AI 보강이 함께 들어간 섹션
 *
 * 시각: 작고 차분한 pill. 색상에만 의존하지 않도록 텍스트 라벨이 의미를 그대로 담는다.
 */

export type DataSourceKind = 'user' | 'ai' | 'mixed';

interface DataSourceBadgeProps {
  kind: DataSourceKind;
  className?: string;
}

const STYLES: Record<DataSourceKind, { label: string; className: string }> = {
  user: {
    label: '사용자 입력',
    className: 'bg-slate-50 text-slate-600 border-slate-200',
  },
  ai: {
    label: 'AI 생성',
    className: 'bg-indigo-50 text-indigo-600 border-indigo-200',
  },
  mixed: {
    label: '혼합',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
};

export function DataSourceBadge({ kind, className }: DataSourceBadgeProps) {
  const { label, className: kindClassName } = STYLES[kind];
  return (
    <span
      aria-label={`데이터 출처: ${label}`}
      className={cn(
        'inline-flex items-center rounded border px-1.5 py-0.5 text-[11px] font-medium leading-none',
        kindClassName,
        className,
      )}
    >
      {label}
    </span>
  );
}
