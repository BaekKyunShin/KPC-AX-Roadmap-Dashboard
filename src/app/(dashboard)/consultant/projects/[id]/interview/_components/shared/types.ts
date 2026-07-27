/**
 * 인터뷰 Step 컴포넌트 공용 타입 (로드맵·PBL 공유).
 *
 * 각 Step 컴포넌트는 자신이 다루는 슬라이스(value)와 그 변경 콜백(onChange)만
 * 받는다. Server Action 호출과 Step 라우팅은 상위 Client 가 담당한다.
 * 로드맵·PBL 두 트랙이 동일 시그니처를 쓰므로 여기서 단일 정의한다.
 */

/**
 * Step 컴포넌트의 표준 props 시그니처.
 *
 * - V: 해당 Step 이 다루는 데이터 슬라이스 타입.
 * - readOnly: 결과 페이지·연계 뷰에서 읽기 전용으로 재사용하기 위한 플래그.
 */
export interface StepProps<V> {
  value: V;
  onChange: (value: V) => void;
  readOnly?: boolean;
}

/** @deprecated `StepProps` 를 쓸 것 — 로드맵 전용 별칭(하위 호환 유지). */
export type RoadmapStepProps<V> = StepProps<V>;
