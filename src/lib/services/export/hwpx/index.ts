/**
 * HWPX 내보내기 모듈 (Step 7).
 *
 * 구조:
 *   hwpx-client.ts           — Python Functions POST 클라이언트 (공통)
 *   hwpx-payload-roadmap.ts  — 로드맵 데이터 → Python payload 변환기
 *
 * Step 10에서 `hwpx-payload-pbl.ts`가 추가될 예정.
 */
export { generateHwpx } from './hwpx-client';
export type { RoadmapHwpxPayload } from './hwpx-client';

export { buildRoadmapHwpxPayload } from './hwpx-payload-roadmap';
export type { RoadmapHwpxPayloadInputs } from './hwpx-payload-roadmap';
