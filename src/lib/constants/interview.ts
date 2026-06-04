/**
 * 인터뷰 입력·요약 화면에서 공통으로 쓰는 상수.
 *
 * Step D-1 (ISSUE-17): 기존 `StepTaskWorkflowAnalysis.tsx` 로컬에 있던
 * AI 필요도(1~5) 라벨을 신규 RoadmapInterviewSummary 등 다수 컴포넌트가
 * 공유하기 위해 공용 상수 모듈로 추출.
 */

export const AI_NECESSITY_LABELS: Record<number, string> = {
  1: '매우 낮음',
  2: '낮음',
  3: '보통',
  4: '높음',
  5: '매우 높음',
};
