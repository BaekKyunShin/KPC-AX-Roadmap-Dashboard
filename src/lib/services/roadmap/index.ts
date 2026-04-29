// ============================================================================
// 로드맵 서비스 — 공개 API re-export (산인공 공식 양식 기반 4섹션 구조)
// ============================================================================

// 타입
export type {
  TrainingLevel,
  RoadmapCompetency,
  RoadmapOutcomeSummary,
  RoadmapTrainingStructureItem,
  RoadmapAnnualPlanItem,
  RoadmapAnnualPlan,
  RoadmapCourseSubject,
  RoadmapCourseSpec,
  LLMRoadmapResult,
  RoadmapResult,
  ValidationResult,
} from './roadmap-types';

// 상수
export { TRAINING_LEVEL_LABEL } from './roadmap-types';

// 검증
export { validateRoadmap } from './roadmap-validator';

// 빈 행 자동 정리 (저장 직전 호출)
export {
  isEmptyCompetency,
  isEmptyAnnualPlanItem,
  isEmptyCourseSubject,
  isEmptyCourseSpec,
  sanitizeRoadmapResult,
} from './roadmap-sanitize';

// 프롬프트 빌더
export { buildSystemPrompt, buildUserPrompt } from './roadmap-prompts';

// 훈련체계도 매트릭스 빌더
export {
  buildTrainingStructureMatrix,
  buildTrainingStructureTable,
} from './roadmap-matrix-builder';
export type {
  TrainingStructureMatrixCell,
  TrainingStructureMatrixRow,
  TrainingStructureTableRow,
} from './roadmap-matrix-builder';

// 시간 유틸
export { sumModuleHours, normalizeRoadmapHours } from './roadmap-time-utils';

// 생성 함수
export {
  generateRoadmap,
  generateTestRoadmap,
  reviseTestRoadmap,
  RoadmapStorageError,
} from './roadmap-generator';
export type { TestRoadmapInput } from './roadmap-generator';

// CRUD
export {
  finalizeRoadmap,
  fetchRoadmapVersions,
  fetchRoadmapVersion,
  updateRoadmapManually,
} from './roadmap-crud';

// Storage Mapper (DB legacy 컬럼 ↔ 신규 4섹션)
export {
  toRoadmapVersionColumns,
  fromRoadmapVersionColumns,
} from './roadmap-storage-mapper';
export type { RoadmapVersionColumns } from './roadmap-storage-mapper';

// STT 포맷터
export {
  isSttInsights,
  hasItems,
  toMarkdownList,
  formatSttInsights,
  buildSttInsightsSection,
} from './roadmap-stt-formatter';
