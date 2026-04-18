/**
 * HWPX 내보내기 모듈 (Step 7 + Step 10).
 *
 * 구조:
 *   hwpx-client.ts           — Python Functions POST 공통 클라이언트
 *                              generateRoadmapHwpx / generatePBLHwpx
 *   hwpx-payload-roadmap.ts  — 로드맵 → Python payload 변환기
 *   hwpx-payload-pbl.ts      — PBL → Python payload 변환기 (Step 10)
 */
export { generateRoadmapHwpx, generatePBLHwpx, resolveBaseUrl } from './hwpx-client';
export type {
  RoadmapHwpxPayload,
  PBLHwpxPayload,
  HwpxPayload,
  GenerateHwpxOptions,
} from './hwpx-client';

export { buildRoadmapHwpxPayload } from './hwpx-payload-roadmap';
export type { RoadmapHwpxPayloadInputs } from './hwpx-payload-roadmap';

export { buildPBLHwpxPayload } from './hwpx-payload-pbl';
export type { PBLHwpxPayloadInputs } from './hwpx-payload-pbl';
