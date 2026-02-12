/**
 * PDF 내보내기 모듈
 *
 * 구조:
 *   pdf-constants.ts       — 레이아웃/스타일 상수
 *   pdf-font-loader.ts     — 폰트 로딩
 *   pdf-helpers.ts         — 문서 헬퍼 함수
 *   pdf-course-renderer.ts — 과정 상세 렌더링 + PBL 데이터 추출
 *   pdf-generator.ts       — generatePDF 메인 오케스트레이터
 */

// 메인 함수
export { generatePDF } from './pdf-generator';
export type { RoadmapExportData } from './pdf-generator';

// PBL 데이터 추출 헬퍼 + 타입
export {
  extractPBLExtendedFields,
  extractModuleDeliverables,
} from './pdf-course-renderer';
export type {
  PBLExtendedFields,
  PBLModuleExtended,
} from './pdf-course-renderer';

// 문서 헬퍼 (테스트에서 import됨)
export { checkPageBreak, formatBulletList } from './pdf-helpers';
export type { DocContext } from './pdf-helpers';
