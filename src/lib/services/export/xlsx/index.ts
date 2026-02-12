/**
 * XLSX 내보내기 모듈
 *
 * 구조:
 *   xlsx-styles.ts         — 색상/테두리/폰트 스타일 상수
 *   xlsx-formatter.ts      — 포맷 유틸 8개 함수
 *   xlsx-sheet-builder.ts  — SheetCtx + 시트 구성 헬퍼
 *   xlsx-generator.ts      — 시트 생성 + generateXLSX/downloadXLSX
 */

// 메인 함수
export { generateXLSX, downloadXLSX } from './xlsx-generator';

// 포맷 헬퍼 (테스트에서 import됨)
export {
  getStatusLabel,
  formatDate,
  buildCourseNumberMap,
  formatMatrixCell,
  sumMatrixHours,
  formatTools,
  calcRowHeight,
  formatHours,
} from './xlsx-formatter';
