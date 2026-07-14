/**
 * XLSX 내보내기 서비스 — 하위 호환 re-export
 *
 * 실제 구현은 export/xlsx/ 디렉토리로 이동됨.
 * 기존 import 경로를 유지하기 위한 re-export 파일.
 */

export {
  generateXLSX,
  downloadXLSX,
  buildOverviewSheet,
  buildCourseSpecSheet,
} from './export/xlsx/xlsx-generator';

export {
  getStatusLabel,
  formatDate,
  getLevelLabel,
  formatHours,
  formatBulletLines,
  formatNcsUsed,
  sumSubjectHours,
  calcRowHeight,
} from './export/xlsx/xlsx-formatter';
