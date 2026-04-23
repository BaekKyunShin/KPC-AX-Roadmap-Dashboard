/**
 * XLSX 내보내기 모듈
 *
 * 구조:
 *   xlsx-styles.ts         — 색상/테두리/폰트 스타일 상수
 *   xlsx-formatter.ts      — 포맷 유틸 (상태/날짜/레벨/시간/불릿/NCS/합계)
 *   xlsx-sheet-builder.ts  — SheetCtx + 시트 구성 헬퍼
 *   xlsx-generator.ts      — 5개 시트 빌더 + generateXLSX/downloadXLSX
 */

// 메인 함수
export {
  generateXLSX,
  downloadXLSX,
  buildOverviewSheet,
  buildCompetencySheet,
  buildStructureSheet,
  buildAnnualPlanSheet,
  buildCourseSpecSheet,
} from './xlsx-generator';

// PBL 내보내기 (산인공 양식 2번 Ⅳ장)
export {
  generatePBLXLSX,
  downloadPBLXLSX,
  buildPBLOverviewSheet,
  buildPBLOperationSheet,
  buildPBLTrainingSheet,
  buildPBLEvaluationSheet,
  type PBLXLSXInput,
  type PBLOverviewSheetInput,
} from './xlsx-pbl-sheet-builder';

// 포맷 헬퍼 (테스트에서 import됨)
export {
  getStatusLabel,
  formatDate,
  getLevelLabel,
  formatHours,
  formatBulletLines,
  formatNcsUsed,
  sumSubjectHours,
  calcRowHeight,
} from './xlsx-formatter';
