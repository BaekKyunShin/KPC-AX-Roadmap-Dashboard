import type {
  RoadmapCourseSpec,
  RoadmapCourseSubject,
  RoadmapOutcomeSummary,
  RoadmapResult,
  TrainingLevel,
} from './roadmap-types';

// ============================================================================
// DB 컬럼 ↔ RoadmapResult(v2) 매핑
// ----------------------------------------------------------------------------
// roadmap_versions 의 jsonb 컬럼명은 변경하지 않는다 (마이그 신설 금지 정책).
// 컬럼명은 내용과 무관한 레거시명이며, 실제 저장 의미는 아래와 같다:
//
//   legacy 컬럼명        │ v2 저장 의미
//   ─────────────────────┼──────────────────────────────────────────
//   roadmap_matrix jsonb │ (미사용 — 항상 [] 로 저장. v1 훈련체계도 자리)
//   pbl_course     jsonb │ { setup_necessity, outcome_summary,
//                         │   hrd_report_attachment_url? }
//   courses        jsonb │ course_specs: RoadmapCourseSpec[]
//   diagnosis_summary txt│ diagnosis_summary (그대로)
//
// 하위호환 (운영 DB 에 v1 FINAL 확정본 실재):
//   - v1 orphan 키(competencies·annual_plan·ncs·training_structure)는 읽기 시 무시
//   - v1 course_specs 의 `format` → v2 `training_method` 로 승격
//   - v2 신규 필드(training_period·training_level)는 없으면 기본값 backfill
// ============================================================================

export interface RoadmapVersionColumns {
  diagnosis_summary: string;
  /** legacy 컬럼. v2 에서 미사용 (v1 훈련체계도 자리) — 항상 빈 배열. */
  roadmap_matrix: never[];
  /** legacy 컬럼명. 실제 저장 데이터는 Ⅰ장 필드들. */
  pbl_course: {
    setup_necessity: string;
    outcome_summary: RoadmapOutcomeSummary;
    hrd_report_attachment_url?: string;
  };
  /** legacy 컬럼명. 실제 저장 데이터는 course_specs. */
  courses: RoadmapCourseSpec[];
}

/** RoadmapResult(v2) → DB legacy 컬럼 구조 */
export function toRoadmapVersionColumns(result: RoadmapResult): RoadmapVersionColumns {
  return {
    diagnosis_summary: result.diagnosis_summary ?? '',
    roadmap_matrix: [],
    pbl_course: {
      setup_necessity: result.setup_necessity ?? '',
      outcome_summary: result.outcome_summary ?? {
        ai_competency_level: 'BEGINNER',
        selected_tasks: '',
        main_content: '',
      },
    },
    courses: result.course_specs ?? [],
  };
}

// ─── 방어적 파싱 헬퍼 ────────────────────────────────────────────────────

function asRecord(v: unknown): Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
}

function asString(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

function asTrainingLevel(v: unknown): TrainingLevel {
  return v === 'BEGINNER' || v === 'INTERMEDIATE' || v === 'ADVANCED' ? v : 'BEGINNER';
}

function isCourseSpec(v: unknown): boolean {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return typeof o.course_name === 'string' && Array.isArray(o.subjects);
}

function parseSubjects(v: unknown): RoadmapCourseSubject[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((s) => s !== null && typeof s === 'object')
    .map((s) => {
      const o = s as Record<string, unknown>;
      return {
        name: asString(o.name),
        details: asString(o.details),
        hours: typeof o.hours === 'number' ? o.hours : 0,
      };
    });
}

/**
 * v1 → v2 명세서 승격.
 *
 * v1 구조에는 `format` 만 있고 `training_method`·`training_period`·`training_level`
 * 이 없다. 신규 키가 있으면 우선하고, 없으면 legacy `format` 을 승격하거나
 * 기본값으로 backfill 한다. (interview-pbl.ts 의 z.preprocess 승격 패턴과 동일 시맨틱)
 */
function parseCourseSpec(v: unknown): RoadmapCourseSpec {
  const o = asRecord(v);
  return {
    training_period: asString(o.training_period),
    training_level: asTrainingLevel(o.training_level),
    course_name: asString(o.course_name),
    // v2 training_method 우선, 없으면 v1 format 승격
    training_method: asString(o.training_method) || asString(o.format),
    recommended_program: asString(o.recommended_program),
    goal: asString(o.goal),
    main_content: asString(o.main_content),
    target_audience: asString(o.target_audience),
    subjects: parseSubjects(o.subjects),
  };
}

function parseOutcomeSummary(v: unknown): RoadmapOutcomeSummary {
  const o = asRecord(v);
  return {
    ai_competency_level: asTrainingLevel(o.ai_competency_level),
    selected_tasks: asString(o.selected_tasks),
    main_content: asString(o.main_content),
  };
}

/**
 * DB legacy 컬럼 구조 → RoadmapResult(v2)
 *
 * 방어 코딩: 잘못된 row 데이터(null, 누락 필드, v1 구버전 데이터)는 type guard 로
 * 필터링되어 안전 변환된다. v1 orphan 키(competencies·annual_plan·ncs·
 * training_structure)는 결과 객체에 포함되지 않으므로 UI 는 항상 v2 구조만 받는다.
 * 삭제 SQL 없이도 앱이 정상 동작하며, 다음 저장 시 자연 수렴한다.
 */
export function fromRoadmapVersionColumns(row: {
  diagnosis_summary?: string | null;
  roadmap_matrix?: unknown;
  pbl_course?: unknown;
  courses?: unknown;
}): RoadmapResult {
  const pbl = asRecord(row.pbl_course);

  const courseSpecs = Array.isArray(row.courses)
    ? row.courses.filter(isCourseSpec).map(parseCourseSpec)
    : [];

  return {
    diagnosis_summary: asString(row.diagnosis_summary),
    setup_necessity: asString(pbl.setup_necessity),
    outcome_summary: parseOutcomeSummary(pbl.outcome_summary),
    course_specs: courseSpecs,
  };
}
