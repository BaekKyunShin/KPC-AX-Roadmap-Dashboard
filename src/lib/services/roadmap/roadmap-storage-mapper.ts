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

/** object이면 그대로, 아니면 빈 객체 */
function asRecord(v: unknown): Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
}

/** 배열을 신규 형식 type guard로 필터링. legacy 구버전 데이터(RoadmapRow/RoadmapCell)는 신규 키가 없어 자동 제외. */
function asFilteredArray<T>(v: unknown, isValid: (item: unknown) => boolean): T[] {
  if (!Array.isArray(v)) return [];
  return v.filter(isValid) as T[];
}

function isCompetency(v: unknown): boolean {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return typeof o.name === 'string' && typeof o.definition === 'string';
}

function isStructureItem(v: unknown): boolean {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return typeof o.competency_name === 'string' && typeof o.level === 'string';
}

function isAnnualPlanItem(v: unknown): boolean {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return typeof o.competency_name === 'string' && typeof o.course_name === 'string';
}

function isCourseSpec(v: unknown): boolean {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return typeof o.course_name === 'string' && Array.isArray(o.subjects);
}

/** DB legacy 컬럼 구조 → 신규 RoadmapResult
 *
 * 방어 코딩: 잘못된 row 데이터(null, 누락 필드, 구버전 PBL/매트릭스 데이터)는
 * type guard로 필터링되어 빈 배열로 안전 변환. UI 컴포넌트가 항상 유효한
 * 신규 4섹션 구조만 받는다.
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
    items: asFilteredArray<RoadmapAnnualPlan['items'][number]>(annualPlanRaw.items, isAnnualPlanItem),
    usage_plan:
      typeof annualPlanRaw.usage_plan === 'string' ? (annualPlanRaw.usage_plan as string) : '',
  };

  return {
    diagnosis_summary: typeof row.diagnosis_summary === 'string' ? row.diagnosis_summary : '',
    competencies: asFilteredArray<RoadmapCompetency>(pbl.competencies, isCompetency),
    training_structure: asFilteredArray<RoadmapTrainingStructureItem>(row.roadmap_matrix, isStructureItem),
    annual_plan: annualPlan,
    course_specs: asFilteredArray<RoadmapCourseSpec>(row.courses, isCourseSpec),
  };
}
