import type {
  RoadmapAnnualPlan,
  RoadmapCompetency,
  RoadmapCourseSpec,
  RoadmapResult,
  RoadmapTrainingStructureItem,
} from './roadmap-types';

// ============================================================================
// DB 컬럼 ↔ 신규 4섹션 RoadmapResult 매핑
// ----------------------------------------------------------------------------
// 본 Task 시점에는 roadmap_versions 테이블의 jsonb 컬럼명을 변경하지 않고
// (마이그 신설 금지) 기존 컬럼을 재용도한다:
//
//   legacy 컬럼명        │ 저장 의미 (신규)
//   ─────────────────────┼──────────────────────────────────────────
//   roadmap_matrix jsonb │ training_structure: RoadmapTrainingStructureItem[]
//   pbl_course     jsonb │ { competencies, annual_plan }
//   courses        jsonb │ course_specs: RoadmapCourseSpec[]
//   diagnosis_summary txt│ diagnosis_summary (그대로)
//
// 다음 Task(Step 12)에서 컬럼명을 training_structure / competencies_and_plan /
// course_specs 로 변경할 예정이므로, 이 매퍼만 교체하면 호출부는 영향 없음.
// ============================================================================

export interface RoadmapVersionColumns {
  diagnosis_summary: string;
  /** legacy 컬럼명. 실제 저장 데이터는 training_structure. */
  roadmap_matrix: RoadmapTrainingStructureItem[];
  /** legacy 컬럼명. 실제 저장 데이터는 competencies + annual_plan. */
  pbl_course: {
    competencies: RoadmapCompetency[];
    annual_plan: RoadmapAnnualPlan;
  };
  /** legacy 컬럼명. 실제 저장 데이터는 course_specs. */
  courses: RoadmapCourseSpec[];
}

/** 신규 RoadmapResult → DB legacy 컬럼 구조 */
export function toRoadmapVersionColumns(result: RoadmapResult): RoadmapVersionColumns {
  return {
    diagnosis_summary: result.diagnosis_summary ?? '',
    roadmap_matrix: result.training_structure ?? [],
    pbl_course: {
      competencies: result.competencies ?? [],
      annual_plan: result.annual_plan ?? { items: [], usage_plan: '' },
    },
    courses: result.course_specs ?? [],
  };
}

// ─── 방어적 파싱 헬퍼 ────────────────────────────────────────────────────

/** 배열이면 그대로, 아니면 빈 배열 */
function asArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

/** object이면 그대로, 아니면 빈 객체 */
function asRecord(v: unknown): Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
}

/** DB legacy 컬럼 구조 → 신규 RoadmapResult
 *
 * 방어 코딩: 잘못된 row 데이터(null, 누락 필드, 구버전 데이터)를
 * 빈 배열/빈 객체로 안전 변환. 스키마 검증은 상위 호출자에서 수행.
 */
export function fromRoadmapVersionColumns(row: {
  diagnosis_summary?: string | null;
  roadmap_matrix?: unknown;
  pbl_course?: unknown;
  courses?: unknown;
}): RoadmapResult {
  const pbl = asRecord(row.pbl_course);
  const annualPlanRaw = asRecord(pbl.annual_plan);
  const annualPlan: RoadmapAnnualPlan = {
    items: asArray<RoadmapAnnualPlan['items'][number]>(annualPlanRaw.items),
    usage_plan:
      typeof annualPlanRaw.usage_plan === 'string' ? (annualPlanRaw.usage_plan as string) : '',
  };

  return {
    diagnosis_summary: typeof row.diagnosis_summary === 'string' ? row.diagnosis_summary : '',
    competencies: asArray<RoadmapCompetency>(pbl.competencies),
    training_structure: asArray<RoadmapTrainingStructureItem>(row.roadmap_matrix),
    annual_plan: annualPlan,
    course_specs: asArray<RoadmapCourseSpec>(row.courses),
  };
}
