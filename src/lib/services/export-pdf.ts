/**
 * PDF 내보내기 서비스 — 하위 호환 re-export
 *
 * 실제 구현은 export/pdf/ 디렉토리로 이동됨.
 * 기존 import 경로를 유지하기 위한 re-export 파일.
 */

export { generatePDF } from './export/pdf/pdf-generator';
export type { RoadmapExportData } from './export/pdf/pdf-generator';

// v2 양식 개정으로 역량 모델링(Ⅲ-1)·훈련체계도(Ⅲ-2)·연간계획(Ⅲ-3) 렌더러가 삭제됨.
export { drawCoverPage, drawCourseSpecSection } from './export/pdf';

export { checkPageBreak, formatBulletList } from './export/pdf/pdf-helpers';
export type { DocContext } from './export/pdf/pdf-helpers';
