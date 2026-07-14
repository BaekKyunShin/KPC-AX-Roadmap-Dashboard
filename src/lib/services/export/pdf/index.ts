/**
 * PDF 내보내기 모듈 (산인공 공식 양식 v2)
 *
 * 구조:
 *   pdf-constants.ts           — 레이아웃/스타일 상수
 *   pdf-font-loader.ts         — 폰트 로딩
 *   pdf-helpers.ts             — 문서 헬퍼 함수
 *   pdf-cover-renderer.ts      — 표지 + 진단 요약
 *   pdf-coursespec-renderer.ts — Ⅲ. 훈련실시 계획 제안 (훈련과정 명세서)
 *   pdf-generator.ts           — generatePDF 메인 오케스트레이터
 */

// 메인 함수
export { generatePDF } from './pdf-generator';
export type { RoadmapExportData } from './pdf-generator';

// PBL 내보내기 (산인공 양식 2번 Ⅳ장)
export { generatePBLPDF } from './pdf-pbl-generator';
export type { PBLExportData } from './pdf-pbl-generator';
export { drawPBLOverviewPage } from './pdf-pbl-overview-renderer';
export { drawPBLRequirementsSection } from './pdf-pbl-requirements-renderer';
export { drawPBLOperationSection } from './pdf-pbl-operation-renderer';

// 섹션 렌더러 (테스트에서 import됨)
export { drawCoverPage } from './pdf-cover-renderer';
export { drawCourseSpecSection } from './pdf-coursespec-renderer';

// 문서 헬퍼 (테스트에서 import됨)
export { checkPageBreak, formatBulletList, getAutoTableStyles } from './pdf-helpers';
export type { DocContext } from './pdf-helpers';
