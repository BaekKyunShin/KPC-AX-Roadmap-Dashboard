import type {
  RoadmapCompetency,
  RoadmapTrainingStructureItem,
  TrainingLevel,
} from './roadmap-types';

// ============================================================================
// 훈련체계도 매트릭스 생성 — Ⅲ-2. 훈련체계도 (역량 × 수준) 테이블 구조
// ============================================================================

/** 매트릭스 셀: 특정 (역량, 수준) 조합에 대응하는 훈련 항목들 */
export interface TrainingStructureMatrixCell {
  competency_name: string;
  level: TrainingLevel;
  items: RoadmapTrainingStructureItem[];
}

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
function pushItem(
  row: TrainingStructureMatrixRow,
  item: RoadmapTrainingStructureItem,
): void {
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
  structure: RoadmapTrainingStructureItem[],
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
