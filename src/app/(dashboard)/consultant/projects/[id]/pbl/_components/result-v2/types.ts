/**
 * PBL 결과 V2 (5탭) 공용 타입.
 *
 * Task 2.6 범위:
 *  - Ⅰ 개요           : 인터뷰 입력값 기반 (읽기 전용 + DRAFT 인라인 편집)
 *  - Ⅱ 요구분석       : 인터뷰 입력값 + HRD이음 PDF (읽기 전용 + DRAFT 편집)
 *  - Ⅲ 훈련과제 도출  : 인터뷰 입력값 (읽기 전용 + DRAFT 편집)
 *  - Ⅳ 운영계획       : LLM 결과 (Task 2.10 담당, 현 Task 는 placeholder)
 *    · Ⅳ-4-나 결과평가 계획 [고정 양식·결과 화면 제외] — 렌더 금지
 *  - Ⅴ 성과분석       : LLM 결과 (Task 2.10 담당, 현 Task 는 placeholder)
 *
 * Server Action 실제 연결은 Task 2.8 이 담당한다. 본 Task 에서는 상위 페이지가
 * `onEdit` / `onGenerate` / `onDownload` / `onSelectVersion` 핸들러를 주입하는
 * props 외주 방식을 따른다 (로드맵 결과 V2 / PBL 인터뷰 V2 와 동일 패턴).
 */

import type {
  PBLAILevel,
  PBLActivityRow,
  PBLAiLevelAssessment,
  PBLAnalysis,
  PBLMainWorkItem,
  PBLOrgTreeNode,
  PBLOverview,
  PBLPriority,
  PBLProblemDefinitionSheet,
  PBLTarget,
} from '@/lib/schemas/interview-pbl';
import type { PBLReportRow } from '@/lib/services/pbl/pbl-crud';
import type {
  PBLTrainingContent,
  PBLTrainingInstructor,
} from '@/lib/services/pbl/pbl-types';

/**
 * 결과 페이지 인라인 편집 patch. Task 2.8 에서 Server Action 과 병합 시
 * 기존 `editPBLManually` 시그니처를 따르되, V2 에서는 필요한 필드만 노출한다.
 *
 * Ⅰ·Ⅱ·Ⅲ 필드는 현재 `interviews` 행에 저장되어 있으므로 Task 2.8 에서
 * Server Action 을 별도로 추가할 계획. 본 Client 는 patch 형태로만 상위에 위임한다.
 */
export interface PBLResultEditPayload {
  // Ⅰ 개요 (인터뷰 입력, DRAFT 편집 가능)
  overview?: Partial<PBLOverview>;

  // Ⅱ 요구분석
  companyIssues?: string;
  organization?: {
    orgTree?: PBLOrgTreeNode[];
    mainWork?: PBLMainWorkItem[];
  };
  // R8 PBL-자체-02 — string → 정형 객체 (Partial 로 일부 필드만 patch 가능)
  trainingEnv?: Partial<import('@/lib/schemas/interview-pbl').PBLTrainingEnv>;
  courseNecessity?: string;

  // Ⅲ 훈련과제 도출
  activities?: PBLActivityRow[];
  /** R8 PBL-자체-04 — 4 정형 항목 (배경/핵심/범위/제약) 단일 세트 */
  problemDefinitionSheet?: Partial<PBLProblemDefinitionSheet>;
  priority?: Partial<PBLPriority>;
  target?: Partial<PBLTarget>;
  currentAiLevel?: Partial<PBLAiLevelAssessment>;
  expectedAiLevel?: Partial<PBLAiLevelAssessment>;

  // Ⅳ 운영계획 (LLM 결과 — pbl_reports.pbl_content 에 저장).
  // DB 트리(pbl_content.operation_plan.training_plan.*) 를 그대로 미러링하여
  // 향후 메타 필드(course_name, total_hours 등) 편집 확장에 친화적이도록 둔다.
  // 본 PR 범위 — Ⅳ-3-다 training_contents[i].detail / Ⅳ-3-마 training_instructors[i].detailed_training_content.
  operations?: {
    training_plan?: {
      subject_profile?: {
        training_contents?: PBLTrainingContent[];
      };
      training_instructors?: PBLTrainingInstructor[];
    };
  };
}

/**
 * 결과 페이지에서 필요한 인터뷰 snapshot 필드 집합.
 *
 * `PBLInterviewStrict` 전체를 받지 않고, 결과 페이지 렌더에 쓰이는 서브셋만
 * 노출해 props 계약을 단순화한다. Task 2.8 에서 Server Action 이 interviews 행
 * 을 읽어 이 shape 으로 변환해 전달할 것이다.
 */
export interface ResultPBLInterviewSnapshot {
  // Ⅰ 훈련과정 개요
  overview: PBLOverview;

  // Ⅱ 요구 분석
  analysis: PBLAnalysis;

  // Ⅲ 훈련과제 도출
  activities: PBLActivityRow[];
  /** R8 PBL-자체-04 — 4 정형 항목 단일 세트 */
  problemDefinitionSheet: PBLProblemDefinitionSheet;
  priority: PBLPriority;
  target: PBLTarget;
  currentAiLevel: PBLAiLevelAssessment;
  expectedAiLevel: PBLAiLevelAssessment;
}

/**
 * PBL 양식 Ⅰ. 신청서 자동표출 7필드 (마이그 071) — TabPBLOverview 표출용 메타.
 * `fetchPBLProjectInfo` 의 반환 형태와 동일.
 */
export interface PBLProjectMetaSnapshot {
  companyName: string;
  industry?: string;
  companyAddress?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  businessRegNo?: string;
  industryCode?: string;
  trainingAddress?: string;
  jurisdictionBranch?: string;
  contactPosition?: string;
}

/**
 * 5탭 공용 props 시그니처.
 *
 * 각 탭은 자신이 다루는 슬라이스만 전달받고, 편집 patch 는 상위가 처리한다.
 */
export interface TabPBLCommonProps {
  /** 현재 선택된 버전. Ⅳ·Ⅴ LLM 결과를 읽기 위해 필요. */
  version: PBLReportRow | null;
  /** 인터뷰 원본값. Ⅰ·Ⅱ·Ⅲ 에서 참조. */
  interview?: Partial<ResultPBLInterviewSnapshot>;
  /** PBL 양식 Ⅰ. 신청서 자동표출 7필드 (마이그 071). */
  projectMeta?: PBLProjectMetaSnapshot;
  /** DRAFT 가 아니면 true — 편집 금지 */
  readOnly: boolean;
  /** 섹션 편집 콜백. 상위가 Server Action 호출을 담당. */
  onEdit: (patch: PBLResultEditPayload) => Promise<void>;
}

/** 4등급 AI 역량 표시 라벨 맵 (UI 표출용). */
export const PBL_AI_LEVEL_LABEL_MAP: Record<PBLAILevel, { label: string; grade: string }> = {
  BASIC: { label: 'AI기초형', grade: '기초' },
  EXPLORER: { label: 'AI탐구형', grade: '초급' },
  USER: { label: 'AI활용형', grade: '중급' },
  LEADER: { label: 'AI선도형', grade: '고급' },
};
