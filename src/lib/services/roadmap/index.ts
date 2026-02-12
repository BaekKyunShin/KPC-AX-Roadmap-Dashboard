// ============================================================================
// 로드맵 서비스 — 공개 API re-export
// ============================================================================

// 타입
export type {
  CurriculumModule,
  RoadmapCell,
  RoadmapMatrixCell,
  RoadmapRow,
  PBLCurriculumModule,
  PBLCourse,
  RoadmapResult,
  ValidationResult,
} from './roadmap-types';

// 생성 함수
export { generateRoadmap, generateTestRoadmap, reviseTestRoadmap } from './roadmap-generator';
export type { TestRoadmapInput } from './roadmap-generator';

// CRUD 함수
export { finalizeRoadmap, getRoadmapVersions, getRoadmapVersion, updateRoadmapManually } from './roadmap-crud';

// 순수 유틸리티
export { sumModuleHours, normalizeCoursesHours, normalizePBLHours, normalizeRoadmapHours } from './roadmap-time-utils';
export { buildRoadmapMatrixFromCourses } from './roadmap-matrix-builder';

// STT 포맷터
export { isSttInsights, hasItems, toMarkdownList, formatSttInsights, buildSttInsightsSection } from './roadmap-stt-formatter';

// 검증
export { validateRoadmap } from './roadmap-validator';

// 프롬프트 빌더
export { buildSystemPrompt, buildUserPrompt } from './roadmap-prompts';
