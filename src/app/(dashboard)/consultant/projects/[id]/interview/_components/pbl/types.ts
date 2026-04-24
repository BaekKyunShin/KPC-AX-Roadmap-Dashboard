/**
 * PBL 인터뷰 V2 (양식 2:1 정합) 공용 타입.
 *
 * 각 Step 컴포넌트는 자신이 다루는 슬라이스(value)와 그 변경 콜백(onChange)만
 * 받는다. Server Action 호출과 Step 라우팅은 상위 ClientV2 가 담당한다.
 *
 * 로드맵 V2 의 `RoadmapV2StepProps<V>` 와 동일 시그니처 (일관성 유지).
 */

/**
 * Step 컴포넌트의 표준 props 시그니처.
 *
 * - V: 해당 Step 이 다루는 데이터 슬라이스 타입.
 * - readOnly: 결과 페이지에서 재사용할 가능성을 위해 옵션으로 둔다.
 */
export interface PBLV2StepProps<V> {
  value: V;
  onChange: (value: V) => void;
  readOnly?: boolean;
}
