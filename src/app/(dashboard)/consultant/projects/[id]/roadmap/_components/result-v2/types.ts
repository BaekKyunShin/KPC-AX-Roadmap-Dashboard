/**
 * 로드맵 결과 V2 (3탭) 공용 타입.
 *
 * Task 2.5 범위:
 *  - Ⅰ 개요 / Ⅱ 요구분석 — 인터뷰 입력값 기반 (읽기 전용 + DRAFT 인라인 편집)
 *  - Ⅲ 훈련체계 — Ⅲ-1 인터뷰값 + Ⅲ-2~Ⅲ-4 LLM 결과 (Task 2.9 생성)
 *
 * Server Action 실제 연결은 Task 2.8 이 담당한다. 본 Task 에서는 상위 페이지가
 * `onEdit` / `onGenerate` / `onDownload` / `onSelectVersion` 핸들러를 주입하는
 * props 외주 방식을 따른다 (PR #2 인터뷰 V2 Client 와 동일 패턴).
 */

import type {
  RoadmapAnnualPlan,
  RoadmapCompetency as LLMCompetency,
  RoadmapCourseSpec,
  RoadmapTrainingStructureItem,
} from '@/lib/services/roadmap';
import type {
  RoadmapCompetency as InterviewCompetency,
  RoadmapTaskAnalysisItem,
} from '@/lib/schemas/interview-roadmap';
import type { RoadmapVersionUI } from '@/types/roadmap-ui';

/**
 * 결과 페이지 인라인 편집 patch. Task 2.8 에서 Server Action 과 병합 시
 * 기존 `editRoadmapManually` 시그니처(snake_case 필드) 를 그대로 따르되,
 * V2 에서는 필요한 필드만 노출한다.
 *
 * Ⅰ 개요 / Ⅱ 요구분석 필드는 현재 `interviews` 행에 저장되어 있으므로
 * Task 2.8 에서 Server Action 을 별도로 추가할 계획. 본 Client 는
 * patch 형태로만 상위에 위임한다.
 */
export interface RoadmapResultEditPayload {
  // Ⅰ-1 수립 필요성 (DRAFT 편집 가능)
  setup_necessity?: string;
  // Ⅰ-3 수립 주요 결과 요약 (LLM 생성 summary, DRAFT 편집 가능)
  main_content?: string;

  // Ⅱ-2 기업 요구분석 (인터뷰 입력, DRAFT 편집 가능)
  company_requirements?: {
    status?: string;
    problem?: string;
    will?: string;
    outcomes?: string;
    /** 행별 비고 (#6 fix). 4 키 모두 옵셔널. */
    remarks?: {
      status?: string;
      problem?: string;
      will?: string;
      outcomes?: string;
    };
  };
  // Ⅱ-3 과업·워크플로우 분석표 (DRAFT 편집 가능, 행 단위 patch — 전체 배열 교체).
  // 행에 stable id 가 없으므로 클라이언트는 항상 전체 배열을 보내고 서버는
  // saveRoadmapInterviewV2 의 deepMerge 에서 taskAnalysis 키를 통째로 교체한다.
  task_analysis?: RoadmapTaskAnalysisItem[];
  // Ⅱ-3 분석 메모 텍스트
  task_analysis_note?: string;
  // Ⅱ-4 훈련대상 과업 선정
  target_task?: {
    name?: string;
    reason?: string;
    expectedAsIs?: string;
    expectedToBe?: string;
  };

  // Ⅲ-1 역량 모델링 (LLM 형, Task 2.8 에서 확장 서비스 호출 경유)
  competencies?: LLMCompetency[];
  ncs_used?: boolean;
  ncs_methodology?: string;
  ncs_derivation_method?: string;

  // Ⅲ-2 훈련체계도 수립 방법 텍스트
  training_structure_method?: string;
  // Ⅲ-2 훈련체계도 행 배열 (PR5 R6 — DRAFT/FINAL 편집 가능)
  training_structure?: RoadmapTrainingStructureItem[];
  // Ⅲ-3 연간 훈련계획 (PR5 R6 — DRAFT/FINAL 편집 가능)
  annual_plan?: RoadmapAnnualPlan;
  // Ⅲ-4 훈련과정 명세서 배열 (LLM 생성, DRAFT 편집 가능)
  course_specs?: RoadmapCourseSpec[];
}

/**
 * 3탭 공용 props 시그니처.
 *
 * 각 탭은 자신이 다루는 슬라이스만 전달받고, 편집 patch 는 상위가 처리한다.
 */
export interface TabCommonProps {
  /** 현재 선택된 버전. Ⅲ-2~Ⅲ-4 LLM 결과를 읽기 위해 필요. */
  version: RoadmapVersionUI | null;
  /** 인터뷰 원본값. Ⅰ·Ⅱ·Ⅲ-1 에서 참조. */
  interview?: Partial<ResultInterviewSnapshot>;
  /** DRAFT 가 아니면 true — 편집 금지 */
  readOnly: boolean;
  /** 섹션 편집 콜백. 상위가 Server Action 호출을 담당. */
  onEdit: (patch: RoadmapResultEditPayload) => Promise<void>;
}

/**
 * 결과 페이지에서 필요한 인터뷰 snapshot 필드 집합.
 *
 * `RoadmapInterviewStrict` 전부를 받지 않고, 결과 페이지 렌더에 쓰이는 서브셋만
 * 노출해 props 계약을 단순화한다. Task 2.8 에서 Server Action 이 interviews 행
 * 을 읽어 이 shape 으로 변환해 전달할 것이다.
 */
export interface ResultInterviewSnapshot {
  // Ⅰ 개요
  establishmentNecessity: string;
  performanceActivities: Array<{
    round: number;
    date: string;
    timeRange: string;
    content: string;
    method: string;
    pmName: string;
    expertName: string;
  }>;
  aiLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  selectedTask: string;

  // Ⅱ 요구분석
  hrdReportPdf: {
    fileName: string;
    url: string;
    size: number;
  } | null;
  companyRequirements: {
    status: string;
    problem: string;
    will: string;
    outcomes: string;
    /** 행별 비고 (#6 fix). */
    remarks?: {
      status?: string;
      problem?: string;
      will?: string;
      outcomes?: string;
    };
  };
  taskAnalysis: Array<{
    domain: string;
    task: string;
    asIs: string;
    problem: string;
    dataTiming: string;
    aiScore: number;
  }>;
  taskAnalysisNote: string;
  taskAnalysisAttachment: {
    fileName: string;
    url: string;
  } | null;
  targetTask: {
    name: string;
    reason: string;
    expectedAsIs: string;
    expectedToBe: string;
  };

  // Ⅲ-1 역량 모델링 (인터뷰 schema 의 단수 string 필드: knowledge/skill/attitude)
  competencies: InterviewCompetency[];
  ncsUsed: boolean;
  ncsMethodology?: string;
  ncsDerivationMethod?: string;
}
