/**
 * 인터뷰 입력·요약 화면에서 공통으로 쓰는 상수.
 *
 * Step D-1 (ISSUE-17): 기존 `StepTaskWorkflowAnalysis.tsx` 로컬에 있던
 * AI 필요도(1~5) 라벨을 신규 RoadmapInterviewSummary 등 다수 컴포넌트가
 * 공유하기 위해 공용 상수 모듈로 추출.
 */

export const AI_NECESSITY_OPTIONS = [1, 2, 3, 4, 5] as const;

export const AI_NECESSITY_LABELS: Record<number, string> = {
  1: '매우 낮음',
  2: '낮음',
  3: '보통',
  4: '높음',
  5: '매우 높음',
};

/** 등록되지 않은 점수가 들어와도 안전하게 라벨을 반환한다. */
export function aiNecessityLabel(score: number | null | undefined): string {
  if (score == null) return '-';
  return AI_NECESSITY_LABELS[score] ?? '-';
}
