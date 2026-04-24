/**
 * 로드맵 인터뷰 V2 (양식 1:1 정합) 공용 타입.
 *
 * 각 Step 컴포넌트는 자신이 다루는 슬라이스(value)와 그 변경 콜백(onChange)만
 * 받는다. Server Action 호출과 Step 라우팅은 상위 ClientV2 가 담당한다.
 *
 * Task 2.3-a 에서는 Step 3건(Necessity / MainResult / HrdReportPdf) 만 사용한다.
 * Task 2.3-b / 2.3-c 가 추가될 때 동일 시그니처를 따르도록 일반화한다.
 */

/**
 * Step 컴포넌트의 표준 props 시그니처.
 *
 * - V: 해당 Step 이 다루는 데이터 슬라이스 타입 (예: string, RoadmapHrdReportPdf | null).
 * - readOnly: 결과 페이지에서 재사용할 가능성을 위해 옵션으로 둔다 (Task 2.3-a 에서는 미사용).
 */
export interface RoadmapV2StepProps<V> {
  value: V;
  onChange: (value: V) => void;
  readOnly?: boolean;
}
