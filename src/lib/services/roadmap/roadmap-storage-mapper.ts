import type {
  RoadmapAnnualPlan,
  RoadmapCompetency,
  RoadmapCourseSpec,
  RoadmapOutcomeSummary,
  RoadmapResult,
  RoadmapTrainingStructureItem,
} from './roadmap-types';

// ============================================================================
// DB 컬럼 ↔ 신규 RoadmapResult 매핑
// ----------------------------------------------------------------------------
// 본 Step(6.5)에서 roadmap_versions 테이블의 jsonb 컬럼명을 변경하지 않고
// (마이그 신설 금지) pbl_course 하위 구조만 확장한다:
//
//   legacy 컬럼명        │ 저장 의미
//   ─────────────────────┼──────────────────────────────────────────
//   roadmap_matrix jsonb │ training_structure: RoadmapTrainingStructureItem[]
//   pbl_course     jsonb │ {
//                         │   competencies,
//                         │   annual_plan,
//                         │   setup_necessity,              [Step 6.5 신규]
//                         │   outcome_summary,              [Step 6.5 신규]
//                         │   training_structure_method,    [Step 6.5 신규]
//                         │   ncs: { used, methodology?, derivation_method? }, [Step 6.5 신규]
//                         │   hrd_report_attachment_url?    [Step 6.5 신규]
//                         │ }
//   courses        jsonb │ course_specs: RoadmapCourseSpec[]
//   diagnosis_summary txt│ diagnosis_summary (그대로)
//
// legacy 데이터 승격: Step 6 당시 RoadmapCompetency에 있던 ncs_* 필드가
// 이 Step에서 표 전체 단위(루트)로 이동했으므로, 구 competency 데이터에서
// 첫 비어있지 않은 값을 루트로 승격한다.
// ============================================================================

export interface RoadmapVersionColumns {
  diagnosis_summary: string;
  /** legacy 컬럼명. 실제 저장 데이터는 training_structure. */
  roadmap_matrix: RoadmapTrainingStructureItem[];
  /** legacy 컬럼명. 실제 저장 데이터는 {competencies, annual_plan, 신규 필드들}. */
  pbl_course: {
    competencies: RoadmapCompetency[];
    annual_plan: RoadmapAnnualPlan;
    setup_necessity: string;
    outcome_summary: RoadmapOutcomeSummary;
    training_structure_method: string;
    ncs: {
      used: boolean;
      methodology: string;
      derivation_method: string;
    };
    hrd_report_attachment_url?: string;
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
      setup_necessity: result.setup_necessity ?? '',
      outcome_summary: result.outcome_summary ?? {
        ai_competency_level: 'BEGINNER',
        selected_tasks: '',
        main_content: '',
      },
      training_structure_method: result.training_structure_method ?? '',
      ncs: {
        used: result.ncs_used ?? false,
        methodology: result.ncs_methodology ?? '',
        derivation_method: result.ncs_derivation_method ?? '',
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

function asFilteredArray<T>(v: unknown, isValid: (item: unknown) => boolean): T[] {
  if (!Array.isArray(v)) return [];
  return v.filter(isValid) as T[];
}

/**
 * 신규 Competency (ncs_* 필드 없음). legacy 데이터에 ncs_* 잔존 시에도 허용 -
 * Type guard 통과 후 sanitizeCompetency에서 ncs_* 필드를 제거한다.
 */
function isCompetency(v: unknown): boolean {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return typeof o.name === 'string' && typeof o.definition === 'string';
}

function sanitizeCompetency(v: unknown): RoadmapCompetency {
  const o = v as Record<string, unknown>;
  return {
    name: asString(o.name),
    definition: asString(o.definition),
    knowledge: Array.isArray(o.knowledge) ? (o.knowledge.filter((x) => typeof x === 'string') as string[]) : [],
    skills: Array.isArray(o.skills) ? (o.skills.filter((x) => typeof x === 'string') as string[]) : [],
    attitudes: Array.isArray(o.attitudes) ? (o.attitudes.filter((x) => typeof x === 'string') as string[]) : [],
  };
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

function parseOutcomeSummary(v: unknown): RoadmapOutcomeSummary {
  const o = asRecord(v);
  const level = o.ai_competency_level;
  const validLevel: RoadmapOutcomeSummary['ai_competency_level'] =
    level === 'BEGINNER' || level === 'INTERMEDIATE' || level === 'ADVANCED'
      ? level
      : 'BEGINNER';
  return {
    ai_competency_level: validLevel,
    selected_tasks: asString(o.selected_tasks),
    main_content: asString(o.main_content),
  };
}

interface LegacyCompetencyNcs {
  ncs_used?: unknown;
  ncs_methodology?: unknown;
  ncs_derivation_method?: unknown;
}

/**
 * Legacy (Step 6) 개별 역량 ncs_* 필드 → 루트 신규 필드 승격.
 * 여러 역량에 값이 분산되어 있으면 첫 번째 비어있지 않은 값을 채택하고 경고 로그.
 */
function promoteLegacyNcs(
  rawCompetencies: unknown,
  rootNcs: Record<string, unknown>,
): { used: boolean; methodology: string; derivation_method: string } {
  // 루트 ncs가 이미 있으면 우선 적용
  const rootUsed = typeof rootNcs.used === 'boolean' ? rootNcs.used : undefined;
  const rootMethodology = asString(rootNcs.methodology);
  const rootDerivation = asString(rootNcs.derivation_method);
  if (rootUsed !== undefined && (rootMethodology || rootDerivation)) {
    return {
      used: rootUsed,
      methodology: rootMethodology,
      derivation_method: rootDerivation,
    };
  }

  if (!Array.isArray(rawCompetencies)) {
    return {
      used: rootUsed ?? false,
      methodology: rootMethodology,
      derivation_method: rootDerivation,
    };
  }

  let firstUsed: boolean | undefined;
  let firstMethodology: string | undefined;
  let firstDerivation: string | undefined;
  let divergent = false;

  for (const raw of rawCompetencies) {
    if (!raw || typeof raw !== 'object') continue;
    const c = raw as LegacyCompetencyNcs;
    if (typeof c.ncs_used === 'boolean') {
      if (firstUsed === undefined) firstUsed = c.ncs_used;
      else if (firstUsed !== c.ncs_used) divergent = true;
    }
    if (typeof c.ncs_methodology === 'string' && c.ncs_methodology.length > 0) {
      if (firstMethodology === undefined) firstMethodology = c.ncs_methodology;
      else if (firstMethodology !== c.ncs_methodology) divergent = true;
    }
    if (typeof c.ncs_derivation_method === 'string' && c.ncs_derivation_method.length > 0) {
      if (firstDerivation === undefined) firstDerivation = c.ncs_derivation_method;
      else if (firstDerivation !== c.ncs_derivation_method) divergent = true;
    }
  }

  if (divergent) {
    console.warn(
      '[fromRoadmapVersionColumns] legacy 역량별 NCS 값이 다수 분산되어 있어 첫 비어있지 않은 값만 루트로 승격합니다.',
    );
  }

  return {
    used: rootUsed ?? firstUsed ?? false,
    methodology: rootMethodology || firstMethodology || '',
    derivation_method: rootDerivation || firstDerivation || '',
  };
}

/** DB legacy 컬럼 구조 → 신규 RoadmapResult
 *
 * 방어 코딩: 잘못된 row 데이터(null, 누락 필드, 구버전 PBL/매트릭스 데이터)는
 * type guard로 필터링되어 빈 배열로 안전 변환. UI 컴포넌트가 항상 유효한
 * 신규 구조만 받는다. Step 6 legacy 역량별 NCS 값은 루트로 승격.
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
    usage_plan: asString(annualPlanRaw.usage_plan),
  };

  const rawCompetencies = pbl.competencies;
  const validCompetencies = asFilteredArray<unknown>(rawCompetencies, isCompetency).map(
    sanitizeCompetency,
  );

  const rootNcs = asRecord(pbl.ncs);
  const ncs = promoteLegacyNcs(rawCompetencies, rootNcs);

  return {
    diagnosis_summary: asString(row.diagnosis_summary),
    setup_necessity: asString(pbl.setup_necessity),
    outcome_summary: parseOutcomeSummary(pbl.outcome_summary),
    competencies: validCompetencies,
    ncs_used: ncs.used,
    ncs_methodology: ncs.methodology,
    ncs_derivation_method: ncs.derivation_method,
    training_structure: asFilteredArray<RoadmapTrainingStructureItem>(row.roadmap_matrix, isStructureItem),
    training_structure_method: asString(pbl.training_structure_method),
    annual_plan: annualPlan,
    course_specs: asFilteredArray<RoadmapCourseSpec>(row.courses, isCourseSpec),
  };
}
