// CRUD (변경 함수)
export { createProject, createSelfAssessment, assignConsultant } from './crud';

// 조회 함수
export { fetchProjects, fetchProjectTimeline, fetchProjectsWithTimeline } from './queries';
export type {
  ProjectListParams,
  ProjectListResult,
  ProjectTimelineStep,
  ProjectAssignmentHistory,
  ProjectTimeline,
  ProjectWithTimeline,
} from './queries';

// 대시보드 통계
export { fetchProjectStats, fetchMonthlyCompletions, fetchConsultantProgress, fetchStalledProjects } from './dashboard';
export type { ProjectStats, MonthlyCompletion, ConsultantProgress, StalledProject } from './dashboard';

// 필터
export { fetchProjectFilters, fetchConsultantCandidates, fetchConsultantFilterOptions } from './filters';
export type {
  ProjectFilterOptions,
  ConsultantCandidateParams,
  ConsultantCandidate,
  ConsultantCandidateListResult,
} from './filters';
