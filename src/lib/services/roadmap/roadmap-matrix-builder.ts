import type {
  RoadmapCompetency,
  RoadmapTrainingStructureItem,
  TrainingLevel,
} from './roadmap-types';

// ============================================================================
// 훈련체계도 매트릭스 생성 — Ⅲ-2. 훈련체계도 (역량 × 수준) 테이블 구조
// ============================================================================

/** 매트릭스 행: 한 역량의 3수준(초/중/고) 셀 묶음 */
export interface TrainingStructureMatrixRow {
  competency_name: string;
  beginner: RoadmapTrainingStructureItem[];
  intermediate: RoadmapTrainingStructureItem[];
  advanced: RoadmapTrainingStructureItem[];
}

/** 빈 행 생성 */
function emptyRow(competency_name: string): TrainingStructureMatrixRow {
  return {
    competency_name,
    beginner: [],
    intermediate: [],
    advanced: [],
  };
}

/** 한 셀에 항목 추가 (level 분배) */
function pushItem(row: TrainingStructureMatrixRow, item: RoadmapTrainingStructureItem): void {
  switch (item.level) {
    case 'BEGINNER':
      row.beginner.push(item);
      break;
    case 'INTERMEDIATE':
      row.intermediate.push(item);
      break;
    case 'ADVANCED':
      row.advanced.push(item);
      break;
  }
}

/**
 * 훈련체계도 매트릭스 빌더.
 *
 * - competencies 순서대로 행 생성 (RoadmapCompetency.name 기준)
 * - training_structure[*]는 competency_name 기준으로 (역량, 수준) 셀에 분배
 * - 같은 (역량, 수준) 셀에 여러 항목이 올 수 있음 (배열 유지)
 * - training_structure에 있으나 competencies에 없는 역량은 매트릭스 끝에
 *   별도 행으로 추가 (UI에서 경고 표시 가능)
 * - 빈 셀은 빈 배열
 */
export function buildTrainingStructureMatrix(
  competencies: RoadmapCompetency[],
  structure: RoadmapTrainingStructureItem[]
): TrainingStructureMatrixRow[] {
  const rowMap = new Map<string, TrainingStructureMatrixRow>();
  const orderedNames: string[] = [];

  // 1. competencies 순서대로 빈 행 초기화
  for (const comp of competencies ?? []) {
    if (!rowMap.has(comp.name)) {
      rowMap.set(comp.name, emptyRow(comp.name));
      orderedNames.push(comp.name);
    }
  }

  // 2. training_structure 항목을 분배
  for (const item of structure ?? []) {
    let row = rowMap.get(item.competency_name);
    if (!row) {
      // 미참조 역량 → 끝에 추가
      row = emptyRow(item.competency_name);
      rowMap.set(item.competency_name, row);
      orderedNames.push(item.competency_name);
    }
    pushItem(row, item);
  }

  return orderedNames.map((name) => rowMap.get(name)!);
}

// ============================================================================
// 출력 전용 — 양식 1번 Ⅲ-2 훈련체계도 "단순 6열 표" 변환 함수 (HWPX/PDF 대응)
// ============================================================================

const LEVEL_LABEL: Record<TrainingLevel, '초급' | '중급' | '고급'> = {
  BEGINNER: '초급',
  INTERMEDIATE: '중급',
  ADVANCED: '고급',
};

const LEVEL_ORDER: Record<TrainingLevel, number> = {
  BEGINNER: 0,
  INTERMEDIATE: 1,
  ADVANCED: 2,
};

/** 단순 6열 표의 한 행 (역량명·훈련수준·훈련내용·훈련대상·훈련방법·훈련목표). */
export interface TrainingStructureTableRow {
  competency_name: string;
  level_label: '초급' | '중급' | '고급';
  content: string;
  target_audience: string;
  method: string;
  goal: string;
}

/**
 * 매트릭스(역량×수준) → 단순 6열 표 변환. 한 역량의 여러 수준이 여러 행으로 전개된다.
 * - competencies 순서 우선, 그 뒤 미참조 역량은 등장 순서대로 추가
 * - 각 역량 내부에서는 초/중/고 순서로 정렬
 * - 같은 (역량, 수준) 셀에 여러 항목이 있으면 여러 행으로 전개
 */
export function buildTrainingStructureTable(
  competencies: RoadmapCompetency[],
  structure: RoadmapTrainingStructureItem[]
): TrainingStructureTableRow[] {
  if (!structure || structure.length === 0) return [];

  const competencyOrder = new Map<string, number>();
  competencies?.forEach((c, i) => {
    if (!competencyOrder.has(c.name)) competencyOrder.set(c.name, i);
  });

  let unknownIndex = competencyOrder.size;
  for (const item of structure) {
    if (!competencyOrder.has(item.competency_name)) {
      competencyOrder.set(item.competency_name, unknownIndex++);
    }
  }

  return [...structure]
    .sort((a, b) => {
      const order =
        (competencyOrder.get(a.competency_name) ?? 0) -
        (competencyOrder.get(b.competency_name) ?? 0);
      if (order !== 0) return order;
      return LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level];
    })
    .map((item) => ({
      competency_name: item.competency_name,
      level_label: LEVEL_LABEL[item.level],
      content: item.content,
      target_audience: item.target_audience,
      method: item.method,
      goal: item.goal,
    }));
}
