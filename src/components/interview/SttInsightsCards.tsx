/**
 * SttInsightsCards — STT 인사이트 6 카테고리 카드 공용 컴포넌트.
 *
 * 사용처:
 *   - RoadmapInterviewSummary (프로젝트 상세 페이지 — consultant/ops)
 *   - PblInterviewSummary
 *   - InterviewReviewClient (인터뷰 검토 페이지 — 컨설턴트 제출 직전)
 *
 * 입력: `stt` (Partial<SttInsights> | undefined).
 *   - undefined 또는 6 필드가 모두 비어 있으면 컴포넌트 자체가 null 을 반환.
 *   - 비어 있는 카테고리는 카드 자체를 렌더하지 않음.
 *
 * 시각: 1열(모바일) → 2열(sm 이상) 반응형 grid. purple-200 border + purple-50/60 bg.
 */

import type { SttInsights } from '@/lib/schemas/interview-roadmap';

const SECTION_LABELS: Array<{
  key: keyof SttInsights;
  label: string;
  kind: 'list' | 'text';
}> = [
  { key: '추가_업무', label: '추가 업무', kind: 'list' },
  { key: '추가_페인포인트', label: '추가 페인포인트', kind: 'list' },
  { key: '숨은_니즈', label: '숨은 니즈', kind: 'list' },
  { key: '조직_맥락', label: '조직 맥락', kind: 'text' },
  { key: 'AI_태도', label: 'AI 태도', kind: 'text' },
  { key: '주요_인용', label: '주요 인용', kind: 'list' },
];

function isNonEmptyText(s: string | undefined | null): s is string {
  return typeof s === 'string' && s.trim() !== '';
}

function isNonEmptyList(v: unknown): v is string[] {
  return Array.isArray(v) && v.length > 0;
}

/**
 * STT 인사이트가 한 필드라도 채워져 있는지 빠르게 판정.
 * Summary/Review 의 hasStt gating 에 재사용한다.
 */
export function hasAnyStt(stt: Partial<SttInsights> | undefined): boolean {
  if (!stt) return false;
  return (
    isNonEmptyList(stt.추가_업무) ||
    isNonEmptyList(stt.추가_페인포인트) ||
    isNonEmptyList(stt.숨은_니즈) ||
    isNonEmptyText(stt.조직_맥락) ||
    isNonEmptyText(stt.AI_태도) ||
    isNonEmptyList(stt.주요_인용)
  );
}

export interface SttInsightsCardsProps {
  stt: Partial<SttInsights> | undefined;
}

export function SttInsightsCards({ stt }: SttInsightsCardsProps) {
  if (!hasAnyStt(stt)) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {SECTION_LABELS.map(({ key, label, kind }) => {
        const value = stt![key];
        if (kind === 'list') {
          if (!isNonEmptyList(value)) return null;
          return <SttCard key={key} title={label} items={value} />;
        }
        if (!isNonEmptyText(value as string | undefined)) return null;
        return <SttCard key={key} title={label} text={value as string} />;
      })}
    </div>
  );
}

function SttCard({
  title,
  items,
  text,
}: {
  title: string;
  items?: string[];
  text?: string;
}) {
  return (
    <div className="rounded-md border border-purple-200 bg-purple-50/60 p-3">
      <p className="text-xs font-medium text-purple-900">{title}</p>
      {items ? (
        <ul className="mt-1.5 list-disc list-inside space-y-1 text-sm text-gray-700">
          {items.map((item, idx) => (
            <li key={idx} className="whitespace-pre-line break-keep break-words">
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1.5 text-sm text-gray-700 whitespace-pre-line break-keep break-words">
          {text}
        </p>
      )}
    </div>
  );
}
