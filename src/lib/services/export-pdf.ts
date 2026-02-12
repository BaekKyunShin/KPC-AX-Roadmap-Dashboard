/**
 * PDF 내보내기 서비스 — 하위 호환 re-export
 *
 * 실제 구현은 export/pdf/ 디렉토리로 이동됨.
 * 기존 import 경로를 유지하기 위한 re-export 파일.
 */

export { generatePDF } from './export/pdf/pdf-generator';
export type { RoadmapExportData } from './export/pdf/pdf-generator';

export {
  extractPBLExtendedFields,
  extractModuleDeliverables,
} from './export/pdf/pdf-course-renderer';
export type {
  PBLExtendedFields,
  PBLModuleExtended,
} from './export/pdf/pdf-course-renderer';

export { checkPageBreak, formatBulletList } from './export/pdf/pdf-helpers';
export type { DocContext } from './export/pdf/pdf-helpers';
