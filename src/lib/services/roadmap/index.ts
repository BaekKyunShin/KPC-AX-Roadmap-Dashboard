// ============================================================================
// 로드맵 서비스 — 공개 API re-export (산인공 공식 양식 v2 기반)
//   Ⅰ장(인터뷰 입력) + Ⅲ 훈련과정 명세서(LLM 생성 6개)
//   v1 의 역량 모델링·NCS·훈련체계도·연간 훈련계획은 양식에서 삭제됨
// ============================================================================

// 타입
export type {
  TrainingLevel,
  RoadmapOutcomeSummary,
  RoadmapCourseSubject,
  RoadmapCourseSpec,
  LLMRoadmapResult,
  RoadmapResult,
  ValidationResult,
} from './roadmap-types';

// 상수
export { TRAINING_LEVEL_LABEL, ROADMAP_COURSE_SPEC_COUNT } from './roadmap-types';

// 검증
export { validateRoadmap } from './roadmap-validator';

// 빈 행 자동 정리 (저장 직전 호출)
export { isEmptyCourseSubject, isEmptyCourseSpec, sanitizeRoadmapResult } from './roadmap-sanitize';

// 프롬프트 빌더
export { buildSystemPrompt, buildUserPrompt } from './roadmap-prompts';

// 시간 유틸
export { sumModuleHours, normalizeRoadmapHours } from './roadmap-time-utils';

// 생성 함수
export {
  generateRoadmap,
  generateTestRoadmap,
  reviseTestRoadmap,
  RoadmapStorageError,
  RoadmapPersistError,
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
export { toRoadmapVersionColumns, fromRoadmapVersionColumns } from './roadmap-storage-mapper';
export type { RoadmapVersionColumns } from './roadmap-storage-mapper';

// STT 포맷터
export {
  isSttInsights,
  hasItems,
  toMarkdownList,
  formatSttInsights,
  buildSttInsightsSection,
} from './roadmap-stt-formatter';
