/**
 * 로드맵 결과 V2 (3탭) 공용 타입 — 산인공 공식 양식 v2 (2026-07-13 개정).
 *
 *  - Ⅰ 개요 / Ⅱ 요구분석 — 인터뷰 입력값 기반 (읽기 전용 + 인라인 편집)
 *  - Ⅲ 훈련실시 계획 제안 — LLM 이 생성한 훈련과정 명세서 6개
 *
 * v1 대비 삭제 (양식에서 표가 통째로 사라짐):
 *   Ⅲ-1 역량 모델링 + NCS 박스 · Ⅲ-2 훈련체계도 · Ⅲ-3 연간 훈련계획
 *
 * Server Action 연결은 상위 페이지가 담당한다. 각 탭은 `onEdit` / `onGenerate` /
 * `onDownload` / `onSelectVersion` 핸들러를 props 로 주입받는 외주 방식을 따른다.
 */

import type { RoadmapCourseSpec } from '@/lib/services/roadmap';
import type { RoadmapTaskAnalysisItem } from '@/lib/schemas/interview-roadmap';
import type { RoadmapVersionUI } from '@/types/roadmap-ui';

/**
 * 결과 페이지 인라인 편집 patch.
 *
 * 두 종류의 필드가 섞여 있고, Server Action(`editRoadmapV2`) 이 이를 분리해
 * 각각 다른 테이블로 위임한다.
 *  - Roadmap 소유 (roadmap_versions): `setup_necessity` · `main_content` · `course_specs`
 *  - Interview 원본 (interviews): `company_requirements` · `task_analysis*` · `target_task`
 */
export interface RoadmapResultEditPayload {
  // Ⅰ-1 수립 배경 (인터뷰 입력값 복사본, 편집 가능)
  setup_necessity?: string;
  // Ⅰ-3 수립 주요 결과 요약 (LLM 생성 — outcome_summary.main_content 하위 필드)
  main_content?: string;

  // Ⅱ-2 기업 요구분석 (인터뷰 입력, 편집 가능)
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
  // Ⅱ-3 과업·워크플로우 분석표 (행 단위 patch — 전체 배열 교체).
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

  // Ⅲ 훈련실시 계획 제안 — 훈련과정 명세서 6개 (LLM 생성, 편집 가능)
  course_specs?: RoadmapCourseSpec[];
}

/**
 * 3탭 공용 props 시그니처.
 *
 * 각 탭은 자신이 다루는 슬라이스만 전달받고, 편집 patch 는 상위가 처리한다.
 */
export interface TabCommonProps {
  /** 현재 선택된 버전. Ⅲ 명세서(LLM 결과) 를 읽기 위해 필요. */
  version: RoadmapVersionUI | null;
  /** 인터뷰 원본값. Ⅰ·Ⅱ 에서 참조. */
  interview?: Partial<ResultInterviewSnapshot>;
  /** ARCHIVED 이거나 열람 전용 역할이면 true — 편집 금지 */
  readOnly: boolean;
  /** 섹션 편집 콜백. 상위가 Server Action 호출을 담당. */
  onEdit: (patch: RoadmapResultEditPayload) => Promise<void>;
}

/**
 * 결과 페이지에서 필요한 인터뷰 snapshot 필드 집합.
 *
 * `RoadmapInterviewStrict` 전부를 받지 않고, 결과 페이지 렌더에 쓰이는 서브셋만
 * 노출해 props 계약을 단순화한다. Server Action 이 interviews 행을 읽어 이 shape
 * 으로 변환해 전달한다.
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
}
