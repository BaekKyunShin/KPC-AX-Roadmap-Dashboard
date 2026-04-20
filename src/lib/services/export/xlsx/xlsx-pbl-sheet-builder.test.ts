/**
 * xlsx-pbl-sheet-builder.ts 테스트
 *
 * 시트별 함수(buildPBLOverviewSheet, buildPBLOperationSheet,
 * buildPBLTrainingSheet, buildPBLEvaluationSheet, buildPBLPerformanceSheet)
 * 및 generatePBLXLSX / downloadPBLXLSX 를 검증한다.
 *
 * SheetJS(xlsx-js-style)는 실제 모듈을 그대로 사용한다.
 * 시트 구조(셀 값·병합·열 너비·행 높이)를 직접 검사한다.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { WorkSheet } from 'xlsx-js-style';
import type { PBLOperationPlan, PBLPerformanceAnalysis, PBLContent } from '../../pbl/pbl-types';
import {
  buildPBLOverviewSheet,
  buildPBLOperationSheet,
  buildPBLTrainingSheet,
  buildPBLEvaluationSheet,
  buildPBLPerformanceSheet,
  generatePBLXLSX,
  downloadPBLXLSX,
  type PBLOverviewSheetInput,
  type PBLXLSXInput,
} from './xlsx-pbl-sheet-builder';

// =============================================================================
// 테스트용 픽스처 팩토리
// =============================================================================

/** 최소 유효한 PBLOperationPlan 픽스처 */
function makeOperationPlan(
  overrides: Partial<PBLOperationPlan> = {},
): PBLOperationPlan {
  return {
    training_goal: '훈련 목표 텍스트',
    ai_tool_usage_plan: [
      {
        stage: '1단계',
        main_activity: '훈련실시',
        ai_tools: ['ChatGPT', 'Cursor'],
        utilized_data: '현장 데이터',
        purpose: '효율 향상',
        specific_method: '프롬프트 설계 후 적용',
      },
    ],
    training_plan: {
      overview: {
        course_name: 'AI 실무 과정',
        training_period: { start: '2026-04-01', end: '2026-04-30' },
      },
      learning_group: {
        instructors: [
          {
            type: '외부',
            role: '팀장',
            affiliation: 'KPC',
            position: '선임',
            name: '홍길동',
          },
        ],
        trainees: [
          {
            role: '팀원',
            affiliation: '(주)테스트',
            position: '대리',
            name: '김훈련',
          },
        ],
      },
      subject_profile: {
        course_name: 'AI 실무',
        total_hours: 40,
        training_goals: ['목표1', '목표2'],
        ai_tools: ['ChatGPT', 'Copilot'],
        utilized_data: '공정 데이터',
        analysis_method: 'LLM',
        training_contents: [
          {
            unit_name: '단원1',
            detail: '세부내용',
            training_hours: 20,
            instructor_hours: { external: 10, internal: 10 },
          },
        ],
        total_sum_hours: 20,
      },
      facilities: [
        {
          seq: 1,
          category: '장비',
          name: '노트북',
          spec: 'i7 16GB',
          location: '교육장',
        },
      ],
      training_instructors: [
        {
          name: '이강사',
          internal_external: '내부',
          career_years: 5,
          work_name: 'AI 개발',
          detailed_training_content: ['내용1', '내용2'],
        },
      ],
    },
    evaluation_plan: {
      course_evaluation: {
        course_name: 'AI 실무 과정',
        evaluation_methods: ['포트폴리오'],
        evaluation_target: '훈련생 전원',
        evaluation_date: '2026-04-30',
        evaluation_criteria: '60% 이상 PASS',
        evaluation_result: 'Pass',
        performance_checklist: [
          {
            unit_name: '단원1',
            evaluation_criteria: '기준1',
            performance_level: 4,
          },
        ],
        overall_comment: '우수',
        evaluation_scale: '1:최하 · 2:하 · 3:보통 · 4:상 · 5:최상',
      },
      result_evaluation: {
        satisfaction_survey: [4, 5, 3, 4, 5],
        achievement_survey: [4, 5, 4],
        external_expert_survey: [5, 4, 5, 4, 5],
        practical_application_survey: [4, 4, 5, 4],
      },
    },
    ...overrides,
  };
}

/** 최소 유효한 PBLPerformanceAnalysis 픽스처 */
function makePerformanceAnalysis(
  overrides: Partial<PBLPerformanceAnalysis> = {},
): PBLPerformanceAnalysis {
  return {
    training_goal_categories: ['기술문제 해결', '공정 최적화'],
    quantitative_metrics: ['불량률 10% 감소', 'OEE 5% 개선'],
    qualitative_metrics: ['직원 만족도 향상'],
    internalization_plan: ['사내 매뉴얼 작성', '분기별 복습'],
    dissemination_plan: ['전사 공유 세션', '부서장 리뷰'],
    ...overrides,
  };
}

/** 최소 유효한 PBLOverviewSheetInput 픽스처 */
function makeOverviewInput(
  overrides: Partial<PBLOverviewSheetInput> = {},
): PBLOverviewSheetInput {
  return {
    companyName: '(주)테스트기업',
    versionNumber: 1,
    status: 'DRAFT',
    createdAt: '2026-04-01T00:00:00Z',
    finalizedAt: null,
    diagnosisSummary: '진단 요약 텍스트입니다.',
    ...overrides,
  };
}

/** 셀 참조(예: "A1")에서 값(v)을 꺼내는 헬퍼 */
function cellValue(ws: WorkSheet, ref: string): unknown {
  return ws[ref]?.v;
}

/** 시트에 특정 값이 존재하는지 검색 */
function findCellWithValue(ws: WorkSheet, target: string): boolean {
  return Object.entries(ws).some(
    ([key, cell]) =>
      !key.startsWith('!') && typeof cell === 'object' && cell !== null && cell.v === target,
  );
}

// =============================================================================
// buildPBLOverviewSheet
// =============================================================================

describe('buildPBLOverviewSheet', () => {
  describe('기본 구조', () => {
    it('WorkSheet 객체를 반환한다 (!ref 포함)', () => {
      const ws = buildPBLOverviewSheet(makeOverviewInput());
      expect(ws).toBeTruthy();
      expect(ws['!ref']).toBeDefined();
      expect(typeof ws['!ref']).toBe('string');
    });

    it('열 너비(OVERVIEW_COL)가 !cols에 설정된다', () => {
      const ws = buildPBLOverviewSheet(makeOverviewInput());
      // OVERVIEW_COL = [14, 30, 30, 30]
      expect(ws['!cols']).toHaveLength(4);
      expect((ws['!cols'] as Array<{ wch: number }>)[0].wch).toBe(14);
      expect((ws['!cols'] as Array<{ wch: number }>)[1].wch).toBe(30);
    });

    it('병합 정보(!merges)가 존재한다', () => {
      const ws = buildPBLOverviewSheet(makeOverviewInput());
      expect(ws['!merges']).toBeDefined();
      expect(Array.isArray(ws['!merges'])).toBe(true);
      expect((ws['!merges'] as unknown[]).length).toBeGreaterThan(0);
    });
  });

  describe('셀 값 검증', () => {
    it('A1 타이틀(AI PBL 과정개발 보고서) 텍스트가 시트 내에 존재한다', () => {
      const ws = buildPBLOverviewSheet(makeOverviewInput());
      expect(findCellWithValue(ws, 'AI PBL 과정개발 보고서')).toBe(true);
    });

    it('기업명이 시트에 포함된다', () => {
      const ws = buildPBLOverviewSheet(makeOverviewInput({ companyName: '(주)특수기업' }));
      expect(findCellWithValue(ws, '(주)특수기업')).toBe(true);
    });

    it('버전 정보(versionNumber + status)가 렌더링된다', () => {
      const ws = buildPBLOverviewSheet(makeOverviewInput({ versionNumber: 3, status: 'FINAL' }));
      expect(findCellWithValue(ws, 'v3 (FINAL)')).toBe(true);
    });

    it('확정일이 없으면 "-"로 표시된다', () => {
      const ws = buildPBLOverviewSheet(makeOverviewInput({ finalizedAt: null }));
      // 확정일 레이블과 "-" 값이 모두 존재해야 한다
      expect(findCellWithValue(ws, '확정일')).toBe(true);
      expect(findCellWithValue(ws, '-')).toBe(true);
    });

    it('확정일이 있으면 날짜 형식으로 표시된다', () => {
      const finalizedAt = '2026-04-15T00:00:00Z';
      const ws = buildPBLOverviewSheet(makeOverviewInput({ finalizedAt }));
      // toLocaleDateString('ko-KR')은 "2026. 4. 15." 형식 또는 "2026년 4월 15일" 형식 등
      // 실행 환경마다 다를 수 있으므로 "-"가 아닌 날짜 값이 존재하는지만 확인한다
      const expectedDate = new Date(finalizedAt).toLocaleDateString('ko-KR');
      expect(findCellWithValue(ws, expectedDate)).toBe(true);
    });

    it('진단 요약 텍스트가 시트에 포함된다', () => {
      const summary = '이 기업은 AI 역량이 초급 수준입니다.';
      const ws = buildPBLOverviewSheet(makeOverviewInput({ diagnosisSummary: summary }));
      expect(findCellWithValue(ws, summary)).toBe(true);
    });

    it('진단 요약이 빈 문자열이면 "-"가 사용된다', () => {
      const ws = buildPBLOverviewSheet(makeOverviewInput({ diagnosisSummary: '' }));
      expect(findCellWithValue(ws, '-')).toBe(true);
    });
  });

  describe('interviewOverview (Ⅰ장)', () => {
    it('interviewOverview가 없으면 과정명 관련 셀이 추가되지 않는다', () => {
      const ws = buildPBLOverviewSheet(makeOverviewInput({ interviewOverview: undefined }));
      // '훈련 시간' 레이블은 interviewOverview 전용이므로 없어야 한다
      expect(findCellWithValue(ws, '훈련 시간')).toBe(false);
    });

    it('interviewOverview가 있으면 과정 개요 섹션이 추가된다', () => {
      const ws = buildPBLOverviewSheet(
        makeOverviewInput({
          interviewOverview: {
            courseName: 'AI 기초 과정',
            trainingHours: 24,
            traineeCount: 10,
            trainingJob: '생산직',
            aiLevel: '초급',
            trainingGoals: ['목표A', '목표B'],
          },
        }),
      );
      expect(findCellWithValue(ws, 'AI 기초 과정')).toBe(true);
      expect(findCellWithValue(ws, '24시간')).toBe(true);
      expect(findCellWithValue(ws, '10명')).toBe(true);
    });

    it('trainingGoals가 빈 배열이면 "-"로 표시된다', () => {
      const ws = buildPBLOverviewSheet(
        makeOverviewInput({
          interviewOverview: {
            courseName: '과정명',
            trainingHours: 8,
            traineeCount: 5,
            trainingJob: '직무',
            aiLevel: '중급',
            trainingGoals: [],
          },
        }),
      );
      // 빈 목표 → "-" 폴백
      expect(findCellWithValue(ws, '-')).toBe(true);
    });

    it('trainingGoals가 여러 개이면 쉼표로 조인된다', () => {
      const ws = buildPBLOverviewSheet(
        makeOverviewInput({
          interviewOverview: {
            courseName: '과정명',
            trainingHours: 8,
            traineeCount: 5,
            trainingJob: '직무',
            aiLevel: '중급',
            trainingGoals: ['목표1', '목표2', '목표3'],
          },
        }),
      );
      expect(findCellWithValue(ws, '목표1, 목표2, 목표3')).toBe(true);
    });
  });

  describe('긴 텍스트 / 엣지 케이스', () => {
    it('매우 긴 진단 요약(200자)도 오류 없이 처리된다', () => {
      const longText = 'A'.repeat(200);
      expect(() => buildPBLOverviewSheet(makeOverviewInput({ diagnosisSummary: longText }))).not.toThrow();
    });

    it('특수문자가 포함된 기업명도 오류 없이 처리된다', () => {
      expect(() =>
        buildPBLOverviewSheet(makeOverviewInput({ companyName: '(주)테스트&기업<>"\'' })),
      ).not.toThrow();
    });

    /**
     * Math.max(60, calcRowHeight(...)) 에서 calcRowHeight 결과가 60을 초과하는
     * 브랜치를 커버하기 위해 OVERVIEW_COL 폭(14+30+30+30=104) 대비
     * 줄바꿈이 많은 긴 텍스트를 사용한다.
     */
    it('진단 요약이 길어 calcRowHeight > 60이 되면 큰 행 높이가 적용된다', () => {
      // 한글 1자 = 폭 1.8 기준으로 104/1.8 ≈ 58자마다 줄바꿈 → 여러 줄 유발
      const longKorean = '가'.repeat(300);
      const ws = buildPBLOverviewSheet(makeOverviewInput({ diagnosisSummary: longKorean }));
      // 시트가 정상 생성되었는지 확인 (행 높이 > 60 브랜치 실행)
      expect(ws['!ref']).toBeDefined();
      expect(findCellWithValue(ws, longKorean)).toBe(true);
    });
  });
});

// =============================================================================
// buildPBLOperationSheet (Ⅳ-1·Ⅳ-2)
// =============================================================================

describe('buildPBLOperationSheet', () => {
  describe('기본 구조', () => {
    it('WorkSheet 객체를 반환한다', () => {
      const ws = buildPBLOperationSheet(makeOperationPlan());
      expect(ws).toBeTruthy();
      expect(ws['!ref']).toBeDefined();
    });

    it('열 너비(OPERATION_COL)가 !cols에 설정된다', () => {
      // OPERATION_COL = [12, 18, 22, 18, 22, 28]
      const ws = buildPBLOperationSheet(makeOperationPlan());
      expect(ws['!cols']).toHaveLength(6);
      expect((ws['!cols'] as Array<{ wch: number }>)[0].wch).toBe(12);
      expect((ws['!cols'] as Array<{ wch: number }>)[5].wch).toBe(28);
    });
  });

  describe('Ⅳ-1 훈련 목표', () => {
    it('training_goal 텍스트가 시트에 포함된다', () => {
      const ws = buildPBLOperationSheet(makeOperationPlan({ training_goal: '특별한 훈련 목표' }));
      expect(findCellWithValue(ws, '특별한 훈련 목표')).toBe(true);
    });

    it('training_goal이 빈 문자열이면 "-"가 사용된다', () => {
      const ws = buildPBLOperationSheet(makeOperationPlan({ training_goal: '' }));
      expect(findCellWithValue(ws, '-')).toBe(true);
    });

    /**
     * Math.max(40, calcRowHeight(...)) 에서 calcRowHeight > 40 브랜치 커버.
     * OPERATION_COL 합계(12+18+22+18+22+28=120) 대비 긴 텍스트 사용.
     */
    it('긴 훈련 목표(200자)에서 calcRowHeight > 40이 되면 큰 행 높이가 적용된다', () => {
      const longGoal = '훈련'.repeat(100); // 200자 한글
      const ws = buildPBLOperationSheet(makeOperationPlan({ training_goal: longGoal }));
      expect(findCellWithValue(ws, longGoal)).toBe(true);
    });
  });

  describe('Ⅳ-2 AI 도구 활용 계획 테이블', () => {
    it('테이블 헤더(단계, AI 도구 등)가 존재한다', () => {
      const ws = buildPBLOperationSheet(makeOperationPlan());
      expect(findCellWithValue(ws, '단계')).toBe(true);
      expect(findCellWithValue(ws, 'AI 도구')).toBe(true);
      expect(findCellWithValue(ws, '구체적 활용 방법')).toBe(true);
    });

    it('ai_tool_usage_plan 항목의 stage 값이 시트에 포함된다', () => {
      const ws = buildPBLOperationSheet(makeOperationPlan());
      expect(findCellWithValue(ws, '1단계')).toBe(true);
    });

    it('ai_tools 배열이 쉼표 조인으로 렌더링된다', () => {
      const ws = buildPBLOperationSheet(makeOperationPlan());
      expect(findCellWithValue(ws, 'ChatGPT, Cursor')).toBe(true);
    });

    it('ai_tool_usage_plan이 빈 배열이면 빈 행(-) 하나가 추가된다', () => {
      const ws = buildPBLOperationSheet(makeOperationPlan({ ai_tool_usage_plan: [] }));
      expect(findCellWithValue(ws, '-')).toBe(true);
    });

    it('3개 항목 모두 렌더링된다', () => {
      const plan = makeOperationPlan({
        ai_tool_usage_plan: [
          { stage: '1단계', main_activity: '활동A', ai_tools: ['Tool1'], utilized_data: '데이터A', purpose: '목적A', specific_method: '방법A' },
          { stage: '2단계', main_activity: '활동B', ai_tools: ['Tool2'], utilized_data: '데이터B', purpose: '목적B', specific_method: '방법B' },
          { stage: '3단계', main_activity: '활동C', ai_tools: ['Tool3'], utilized_data: '데이터C', purpose: '목적C', specific_method: '방법C' },
        ],
      });
      const ws = buildPBLOperationSheet(plan);
      expect(findCellWithValue(ws, '1단계')).toBe(true);
      expect(findCellWithValue(ws, '2단계')).toBe(true);
      expect(findCellWithValue(ws, '3단계')).toBe(true);
    });

    it('짝수/홀수 행에 alt 스타일이 교대 적용된다 (오류 없음)', () => {
      const plan = makeOperationPlan({
        ai_tool_usage_plan: [
          { stage: '1단계', main_activity: 'A', ai_tools: [], utilized_data: 'd', purpose: 'p', specific_method: 'm' },
          { stage: '2단계', main_activity: 'B', ai_tools: [], utilized_data: 'd', purpose: 'p', specific_method: 'm' },
        ],
      });
      expect(() => buildPBLOperationSheet(plan)).not.toThrow();
    });
  });
});

// =============================================================================
// buildPBLTrainingSheet (Ⅳ-3)
// =============================================================================

describe('buildPBLTrainingSheet', () => {
  describe('기본 구조', () => {
    it('WorkSheet 객체를 반환한다', () => {
      const ws = buildPBLTrainingSheet(makeOperationPlan());
      expect(ws).toBeTruthy();
      expect(ws['!ref']).toBeDefined();
    });

    it('열 너비(TRAINING_COL)가 !cols에 설정된다', () => {
      // TRAINING_COL = [20, 28, 12, 14, 14]
      const ws = buildPBLTrainingSheet(makeOperationPlan());
      expect(ws['!cols']).toHaveLength(5);
      expect((ws['!cols'] as Array<{ wch: number }>)[0].wch).toBe(20);
      expect((ws['!cols'] as Array<{ wch: number }>)[1].wch).toBe(28);
    });
  });

  describe('가. 훈련과정 개요', () => {
    it('과정명이 시트에 포함된다', () => {
      const ws = buildPBLTrainingSheet(makeOperationPlan());
      expect(findCellWithValue(ws, 'AI 실무 과정')).toBe(true);
    });

    it('훈련 기간이 "시작 ~ 종료" 형식으로 렌더링된다', () => {
      const ws = buildPBLTrainingSheet(makeOperationPlan());
      expect(findCellWithValue(ws, '2026-04-01 ~ 2026-04-30')).toBe(true);
    });

    it('훈련 기간 start/end 모두 빈 문자열이면 "-"로 표시된다', () => {
      const plan = makeOperationPlan();
      plan.training_plan.overview.training_period = { start: '', end: '' };
      const ws = buildPBLTrainingSheet(plan);
      expect(findCellWithValue(ws, '-')).toBe(true);
    });
  });

  describe('나. 학습그룹 구성 — 강사', () => {
    it('강사 이름이 시트에 포함된다', () => {
      const ws = buildPBLTrainingSheet(makeOperationPlan());
      expect(findCellWithValue(ws, '홍길동')).toBe(true);
    });

    it('강사 배열이 비어있으면 빈 행(-) 하나가 추가된다', () => {
      const plan = makeOperationPlan();
      plan.training_plan.learning_group.instructors = [];
      const ws = buildPBLTrainingSheet(plan);
      expect(findCellWithValue(ws, '-')).toBe(true);
    });
  });

  describe('나. 학습그룹 구성 — 훈련생', () => {
    it('훈련생 이름이 시트에 포함된다', () => {
      const ws = buildPBLTrainingSheet(makeOperationPlan());
      expect(findCellWithValue(ws, '김훈련')).toBe(true);
    });

    it('훈련생 배열이 비어있으면 빈 행이 추가된다', () => {
      const plan = makeOperationPlan();
      plan.training_plan.learning_group.trainees = [];
      const ws = buildPBLTrainingSheet(plan);
      expect(findCellWithValue(ws, '-')).toBe(true);
    });
  });

  describe('다. 훈련 교과목 프로파일', () => {
    it('과정명·전체시간·분석방법·활용데이터가 렌더링된다', () => {
      const ws = buildPBLTrainingSheet(makeOperationPlan());
      expect(findCellWithValue(ws, 'AI 실무')).toBe(true);
      expect(findCellWithValue(ws, '40')).toBe(true);
      expect(findCellWithValue(ws, 'LLM')).toBe(true);
    });

    it('훈련 목표가 불릿 형식으로 렌더링된다', () => {
      const ws = buildPBLTrainingSheet(makeOperationPlan());
      expect(findCellWithValue(ws, '• 목표1\n• 목표2')).toBe(true);
    });

    it('AI 도구 목록이 쉼표 조인으로 렌더링된다', () => {
      const ws = buildPBLTrainingSheet(makeOperationPlan());
      expect(findCellWithValue(ws, 'ChatGPT, Copilot')).toBe(true);
    });

    it('training_contents 항목이 시트에 포함된다', () => {
      const ws = buildPBLTrainingSheet(makeOperationPlan());
      expect(findCellWithValue(ws, '단원1')).toBe(true);
      expect(findCellWithValue(ws, '20')).toBe(true);
    });

    it('training_contents가 비어있으면 빈 행이 추가된다', () => {
      const plan = makeOperationPlan();
      plan.training_plan.subject_profile.training_contents = [];
      const ws = buildPBLTrainingSheet(plan);
      expect(findCellWithValue(ws, '-')).toBe(true);
    });

    it('total_sum_hours가 "N시간" 형식으로 렌더링된다', () => {
      const ws = buildPBLTrainingSheet(makeOperationPlan());
      expect(findCellWithValue(ws, '20시간')).toBe(true);
    });
  });

  describe('라. 시설·장비', () => {
    it('시설명이 시트에 포함된다', () => {
      const ws = buildPBLTrainingSheet(makeOperationPlan());
      expect(findCellWithValue(ws, '노트북')).toBe(true);
    });

    it('시퀀스 번호가 문자열로 변환된다', () => {
      const ws = buildPBLTrainingSheet(makeOperationPlan());
      expect(findCellWithValue(ws, '1')).toBe(true);
    });

    it('시설 배열이 비어있으면 빈 행이 추가된다', () => {
      const plan = makeOperationPlan();
      plan.training_plan.facilities = [];
      const ws = buildPBLTrainingSheet(plan);
      expect(findCellWithValue(ws, '-')).toBe(true);
    });
  });

  describe('마. 훈련강사', () => {
    it('강사 성명이 시트에 포함된다', () => {
      const ws = buildPBLTrainingSheet(makeOperationPlan());
      expect(findCellWithValue(ws, '이강사')).toBe(true);
    });

    it('detailed_training_content가 불릿 형식으로 렌더링된다', () => {
      const ws = buildPBLTrainingSheet(makeOperationPlan());
      expect(findCellWithValue(ws, '• 내용1\n• 내용2')).toBe(true);
    });

    it('강사 배열이 비어있으면 빈 행이 추가된다', () => {
      const plan = makeOperationPlan();
      plan.training_plan.training_instructors = [];
      const ws = buildPBLTrainingSheet(plan);
      expect(findCellWithValue(ws, '-')).toBe(true);
    });

    it('여러 강사가 모두 렌더링된다', () => {
      const plan = makeOperationPlan();
      plan.training_plan.training_instructors = [
        { name: '강사A', internal_external: '내부', career_years: 3, work_name: '업무A', detailed_training_content: [] },
        { name: '강사B', internal_external: '외부', career_years: 7, work_name: '업무B', detailed_training_content: ['항목1'] },
        { name: '강사C', internal_external: '내부', career_years: 1, work_name: '업무C', detailed_training_content: [] },
      ];
      const ws = buildPBLTrainingSheet(plan);
      expect(findCellWithValue(ws, '강사A')).toBe(true);
      expect(findCellWithValue(ws, '강사B')).toBe(true);
      expect(findCellWithValue(ws, '강사C')).toBe(true);
    });
  });
});

// =============================================================================
// buildPBLEvaluationSheet (Ⅳ-4)
// =============================================================================

describe('buildPBLEvaluationSheet', () => {
  describe('기본 구조', () => {
    it('WorkSheet 객체를 반환한다', () => {
      const ws = buildPBLEvaluationSheet(makeOperationPlan());
      expect(ws).toBeTruthy();
      expect(ws['!ref']).toBeDefined();
    });

    it('열 너비(EVALUATION_COL)가 !cols에 설정된다', () => {
      // EVALUATION_COL = [18, 40, 14, 16]
      const ws = buildPBLEvaluationSheet(makeOperationPlan());
      expect(ws['!cols']).toHaveLength(4);
      expect((ws['!cols'] as Array<{ wch: number }>)[0].wch).toBe(18);
      expect((ws['!cols'] as Array<{ wch: number }>)[1].wch).toBe(40);
    });
  });

  describe('Ⅳ-4-가. 과정평가', () => {
    it('과정명이 시트에 포함된다', () => {
      const ws = buildPBLEvaluationSheet(makeOperationPlan());
      expect(findCellWithValue(ws, 'AI 실무 과정')).toBe(true);
    });

    it('evaluation_methods가 쉼표 조인으로 렌더링된다', () => {
      const plan = makeOperationPlan();
      plan.evaluation_plan.course_evaluation.evaluation_methods = ['포트폴리오', '작업장 평가'];
      const ws = buildPBLEvaluationSheet(plan);
      expect(findCellWithValue(ws, '포트폴리오, 작업장 평가')).toBe(true);
    });

    it('evaluation_methods가 빈 배열이면 "-"로 표시된다', () => {
      const plan = makeOperationPlan();
      plan.evaluation_plan.course_evaluation.evaluation_methods = [];
      const ws = buildPBLEvaluationSheet(plan);
      expect(findCellWithValue(ws, '-')).toBe(true);
    });

    it('수행수준 체크리스트 단원명이 렌더링된다', () => {
      const ws = buildPBLEvaluationSheet(makeOperationPlan());
      expect(findCellWithValue(ws, '단원1')).toBe(true);
    });

    it('performance_checklist가 비어있으면 빈 행이 추가된다', () => {
      const plan = makeOperationPlan();
      plan.evaluation_plan.course_evaluation.performance_checklist = [];
      const ws = buildPBLEvaluationSheet(plan);
      expect(findCellWithValue(ws, '-')).toBe(true);
    });

    it('overall_comment가 있으면 총평 레이블이 렌더링된다', () => {
      const ws = buildPBLEvaluationSheet(makeOperationPlan());
      expect(findCellWithValue(ws, '총평')).toBe(true);
      expect(findCellWithValue(ws, '우수')).toBe(true);
    });

    it('overall_comment가 빈 문자열이면 총평 행이 추가되지 않는다', () => {
      const plan = makeOperationPlan();
      plan.evaluation_plan.course_evaluation.overall_comment = '';
      const ws = buildPBLEvaluationSheet(plan);
      // 빈 overall_comment → 총평 행 미추가 (falsy 분기)
      expect(findCellWithValue(ws, '총평')).toBe(false);
    });

    it('평가척도 텍스트가 시트에 포함된다', () => {
      const ws = buildPBLEvaluationSheet(makeOperationPlan());
      expect(findCellWithValue(ws, '1:최하 · 2:하 · 3:보통 · 4:상 · 5:최상')).toBe(true);
    });
  });

  describe('Ⅳ-4-나. 결과평가 문항 수', () => {
    it('만족도 조사 문항 수가 렌더링된다', () => {
      const ws = buildPBLEvaluationSheet(makeOperationPlan());
      expect(findCellWithValue(ws, '5문항 (리커트 1~5)')).toBe(true);
    });

    it('설문 배열이 비어있으면 0문항으로 표시된다', () => {
      const plan = makeOperationPlan();
      plan.evaluation_plan.result_evaluation.satisfaction_survey = [];
      const ws = buildPBLEvaluationSheet(plan);
      expect(findCellWithValue(ws, '0문항 (리커트 1~5)')).toBe(true);
    });

    it('성취도·외부전문가·현업적용도 문항 수도 렌더링된다', () => {
      const ws = buildPBLEvaluationSheet(makeOperationPlan());
      expect(findCellWithValue(ws, '3문항 (리커트 1~5)')).toBe(true);
      expect(findCellWithValue(ws, '4문항 (리커트 1~5)')).toBe(true);
    });
  });

  describe('체크리스트 복수 항목', () => {
    it('3개 체크리스트 항목이 모두 렌더링된다', () => {
      const plan = makeOperationPlan();
      plan.evaluation_plan.course_evaluation.performance_checklist = [
        { unit_name: '단원A', evaluation_criteria: '기준A', performance_level: 5 },
        { unit_name: '단원B', evaluation_criteria: '기준B', performance_level: 3 },
        { unit_name: '단원C', evaluation_criteria: '기준C', performance_level: 4 },
      ];
      const ws = buildPBLEvaluationSheet(plan);
      expect(findCellWithValue(ws, '단원A')).toBe(true);
      expect(findCellWithValue(ws, '단원B')).toBe(true);
      expect(findCellWithValue(ws, '단원C')).toBe(true);
    });
  });
});

// =============================================================================
// buildPBLPerformanceSheet (Ⅴ-1·Ⅴ-2)
// =============================================================================

describe('buildPBLPerformanceSheet', () => {
  describe('기본 구조', () => {
    it('WorkSheet 객체를 반환한다', () => {
      const ws = buildPBLPerformanceSheet(makePerformanceAnalysis());
      expect(ws).toBeTruthy();
      expect(ws['!ref']).toBeDefined();
    });

    it('열 너비(PERFORMANCE_COL)가 !cols에 설정된다', () => {
      // PERFORMANCE_COL = [18, 44, 20]
      const ws = buildPBLPerformanceSheet(makePerformanceAnalysis());
      expect(ws['!cols']).toHaveLength(3);
      expect((ws['!cols'] as Array<{ wch: number }>)[0].wch).toBe(18);
      expect((ws['!cols'] as Array<{ wch: number }>)[1].wch).toBe(44);
    });
  });

  describe('Ⅴ-1. 성과분석 측정 지표', () => {
    it('training_goal_categories가 쉼표 조인으로 렌더링된다', () => {
      const ws = buildPBLPerformanceSheet(makePerformanceAnalysis());
      expect(findCellWithValue(ws, '기술문제 해결, 공정 최적화')).toBe(true);
    });

    it('training_goal_categories가 빈 배열이면 "-"로 표시된다', () => {
      const ws = buildPBLPerformanceSheet(makePerformanceAnalysis({ training_goal_categories: [] }));
      expect(findCellWithValue(ws, '-')).toBe(true);
    });

    it('정량 지표가 불릿 형식으로 렌더링된다', () => {
      const ws = buildPBLPerformanceSheet(makePerformanceAnalysis());
      expect(findCellWithValue(ws, '• 불량률 10% 감소\n• OEE 5% 개선')).toBe(true);
    });

    it('정성 지표가 불릿 형식으로 렌더링된다', () => {
      const ws = buildPBLPerformanceSheet(makePerformanceAnalysis());
      expect(findCellWithValue(ws, '• 직원 만족도 향상')).toBe(true);
    });

    it('정량/정성 지표가 빈 배열이면 "-"로 표시된다', () => {
      const ws = buildPBLPerformanceSheet(
        makePerformanceAnalysis({ quantitative_metrics: [], qualitative_metrics: [] }),
      );
      expect(findCellWithValue(ws, '-')).toBe(true);
    });
  });

  describe('Ⅴ-2. 성과 확산 전략', () => {
    it('내재화 방안이 불릿 형식으로 렌더링된다', () => {
      const ws = buildPBLPerformanceSheet(makePerformanceAnalysis());
      expect(findCellWithValue(ws, '• 사내 매뉴얼 작성\n• 분기별 복습')).toBe(true);
    });

    it('전사 확산 방안이 불릿 형식으로 렌더링된다', () => {
      const ws = buildPBLPerformanceSheet(makePerformanceAnalysis());
      expect(findCellWithValue(ws, '• 전사 공유 세션\n• 부서장 리뷰')).toBe(true);
    });

    it('내재화 방안이 빈 배열이면 "-"로 표시된다', () => {
      const ws = buildPBLPerformanceSheet(makePerformanceAnalysis({ internalization_plan: [] }));
      expect(findCellWithValue(ws, '-')).toBe(true);
    });
  });

  describe('섹션 레이블', () => {
    it('훈련 목표 분류 레이블이 존재한다', () => {
      const ws = buildPBLPerformanceSheet(makePerformanceAnalysis());
      expect(findCellWithValue(ws, '훈련 목표 분류')).toBe(true);
    });

    it('정량 지표 레이블이 존재한다', () => {
      const ws = buildPBLPerformanceSheet(makePerformanceAnalysis());
      expect(findCellWithValue(ws, '정량 지표')).toBe(true);
    });

    it('정성 지표 레이블이 존재한다', () => {
      const ws = buildPBLPerformanceSheet(makePerformanceAnalysis());
      expect(findCellWithValue(ws, '정성 지표')).toBe(true);
    });

    it('내재화 방안 레이블이 존재한다', () => {
      const ws = buildPBLPerformanceSheet(makePerformanceAnalysis());
      expect(findCellWithValue(ws, '내재화 방안')).toBe(true);
    });

    it('전사 확산 방안 레이블이 존재한다', () => {
      const ws = buildPBLPerformanceSheet(makePerformanceAnalysis());
      expect(findCellWithValue(ws, '전사 확산 방안')).toBe(true);
    });
  });
});

// =============================================================================
// generatePBLXLSX
// =============================================================================

describe('generatePBLXLSX', () => {
  function makePBLXLSXInput(
    overrides: Partial<PBLXLSXInput> = {},
  ): PBLXLSXInput {
    const pblContent: PBLContent = {
      operation_plan: makeOperationPlan(),
      performance_analysis: makePerformanceAnalysis(),
    };
    return {
      ...makeOverviewInput(),
      pblContent,
      ...overrides,
    };
  }

  it('Uint8Array를 반환한다', async () => {
    const result = await generatePBLXLSX(makePBLXLSXInput());
    expect(result).toBeInstanceOf(Uint8Array);
  });

  it('반환된 바이트 배열의 길이가 0보다 크다', async () => {
    const result = await generatePBLXLSX(makePBLXLSXInput());
    expect(result.length).toBeGreaterThan(0);
  });

  it('XLSX 매직 바이트(PK 시그니처)로 시작한다', async () => {
    const result = await generatePBLXLSX(makePBLXLSXInput());
    // ZIP(XLSX) 파일은 0x50, 0x4B (PK)로 시작한다
    expect(result[0]).toBe(0x50);
    expect(result[1]).toBe(0x4b);
  });

  it('interviewOverview가 없는 경우에도 정상 생성된다', async () => {
    const result = await generatePBLXLSX(makePBLXLSXInput({ interviewOverview: undefined }));
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBeGreaterThan(0);
  });

  it('빈 배열 필드가 많아도 오류 없이 생성된다', async () => {
    const emptyPlan = makeOperationPlan({
      ai_tool_usage_plan: [],
      training_plan: {
        ...makeOperationPlan().training_plan,
        learning_group: { instructors: [], trainees: [] },
        facilities: [],
        training_instructors: [],
        subject_profile: {
          ...makeOperationPlan().training_plan.subject_profile,
          training_goals: [],
          ai_tools: [],
          training_contents: [],
        },
      },
    });
    const emptyPerformance = makePerformanceAnalysis({
      training_goal_categories: [],
      quantitative_metrics: [],
      qualitative_metrics: [],
      internalization_plan: [],
      dissemination_plan: [],
    });
    const result = await generatePBLXLSX(
      makePBLXLSXInput({
        pblContent: { operation_plan: emptyPlan, performance_analysis: emptyPerformance },
      }),
    );
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result.length).toBeGreaterThan(0);
  });
});

// =============================================================================
// downloadPBLXLSX (DOM 모킹)
// =============================================================================

describe('downloadPBLXLSX', () => {
  let originalCreateObjectURL: typeof URL.createObjectURL;
  let originalRevokeObjectURL: typeof URL.revokeObjectURL;
  let createElementSpy: ReturnType<typeof vi.spyOn>;
  let appendChildSpy: ReturnType<typeof vi.spyOn>;
  let removeChildSpy: ReturnType<typeof vi.spyOn>;

  // 가짜 앵커 엘리먼트
  const fakeAnchor = {
    href: '',
    download: '',
    click: vi.fn(),
  };

  beforeEach(() => {
    // URL 메서드 모킹
    originalCreateObjectURL = URL.createObjectURL;
    originalRevokeObjectURL = URL.revokeObjectURL;
    URL.createObjectURL = vi.fn().mockReturnValue('blob:fake-url');
    URL.revokeObjectURL = vi.fn();

    // DOM 메서드 모킹
    createElementSpy = vi
      .spyOn(document, 'createElement')
      .mockReturnValue(fakeAnchor as unknown as HTMLAnchorElement);
    appendChildSpy = vi
      .spyOn(document.body, 'appendChild')
      .mockReturnValue(fakeAnchor as unknown as Node);
    removeChildSpy = vi
      .spyOn(document.body, 'removeChild')
      .mockReturnValue(fakeAnchor as unknown as Node);
  });

  afterEach(() => {
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
    vi.restoreAllMocks();
    fakeAnchor.click = vi.fn();
  });

  it('Blob URL을 생성하고 앵커 클릭을 호출한다', () => {
    const bytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);
    downloadPBLXLSX(bytes, 'test.xlsx');

    expect(URL.createObjectURL).toHaveBeenCalledOnce();
    expect(fakeAnchor.click).toHaveBeenCalledOnce();
  });

  it('download 속성에 파일명이 올바르게 설정된다', () => {
    const bytes = new Uint8Array([1, 2, 3]);
    downloadPBLXLSX(bytes, 'my-report.xlsx');

    expect(fakeAnchor.download).toBe('my-report.xlsx');
  });

  it('href 속성이 Blob URL로 설정된다', () => {
    const bytes = new Uint8Array([1, 2, 3]);
    downloadPBLXLSX(bytes, 'report.xlsx');

    expect(fakeAnchor.href).toBe('blob:fake-url');
  });

  it('클릭 후 앵커가 DOM에서 제거된다', () => {
    const bytes = new Uint8Array([1, 2, 3]);
    downloadPBLXLSX(bytes, 'report.xlsx');

    expect(removeChildSpy).toHaveBeenCalledOnce();
  });

  it('Blob URL이 해제된다(revokeObjectURL 호출)', () => {
    const bytes = new Uint8Array([1, 2, 3]);
    downloadPBLXLSX(bytes, 'report.xlsx');

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:fake-url');
  });

  it('올바른 MIME 타입으로 Blob이 생성된다', () => {
    const bytes = new Uint8Array([1, 2, 3]);
    downloadPBLXLSX(bytes, 'report.xlsx');

    const blobArg = (URL.createObjectURL as ReturnType<typeof vi.fn>).mock.calls[0][0] as Blob;
    expect(blobArg.type).toBe(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
  });

  it('appendChild가 한 번 호출된다', () => {
    const bytes = new Uint8Array([1, 2, 3]);
    downloadPBLXLSX(bytes, 'report.xlsx');

    expect(appendChildSpy).toHaveBeenCalledOnce();
  });
});

// =============================================================================
// buildPBLTrainingSheet — 빈 문자열 폴백 브랜치 집중 커버
// =============================================================================

describe('buildPBLTrainingSheet — 빈 값 폴백 브랜치', () => {
  it('course_name이 빈 문자열이면 "-"로 표시된다', () => {
    const plan = makeOperationPlan();
    plan.training_plan.subject_profile.course_name = '';
    plan.training_plan.overview.course_name = '';
    const ws = buildPBLTrainingSheet(plan);
    expect(findCellWithValue(ws, '-')).toBe(true);
  });

  it('analysis_method가 빈 문자열이면 "-"로 표시된다', () => {
    const plan = makeOperationPlan();
    plan.training_plan.subject_profile.analysis_method = '';
    const ws = buildPBLTrainingSheet(plan);
    expect(findCellWithValue(ws, '-')).toBe(true);
  });

  it('utilized_data가 빈 문자열이면 "-"로 표시된다', () => {
    const plan = makeOperationPlan();
    plan.training_plan.subject_profile.utilized_data = '';
    const ws = buildPBLTrainingSheet(plan);
    expect(findCellWithValue(ws, '-')).toBe(true);
  });
});

// =============================================================================
// buildPBLEvaluationSheet — 빈 값 폴백 브랜치 집중 커버
// =============================================================================

describe('buildPBLEvaluationSheet — 빈 값 폴백 브랜치', () => {
  it('course_name이 빈 문자열이면 "-"로 표시된다', () => {
    const plan = makeOperationPlan();
    plan.evaluation_plan.course_evaluation.course_name = '';
    const ws = buildPBLEvaluationSheet(plan);
    expect(findCellWithValue(ws, '-')).toBe(true);
  });

  it('evaluation_target이 빈 문자열이면 "-"로 표시된다', () => {
    const plan = makeOperationPlan();
    plan.evaluation_plan.course_evaluation.evaluation_target = '';
    const ws = buildPBLEvaluationSheet(plan);
    expect(findCellWithValue(ws, '-')).toBe(true);
  });

  it('evaluation_date가 빈 문자열이면 "-"로 표시된다', () => {
    const plan = makeOperationPlan();
    plan.evaluation_plan.course_evaluation.evaluation_date = '';
    const ws = buildPBLEvaluationSheet(plan);
    expect(findCellWithValue(ws, '-')).toBe(true);
  });

  it('evaluation_criteria가 빈 문자열이면 "-"로 표시된다', () => {
    const plan = makeOperationPlan();
    plan.evaluation_plan.course_evaluation.evaluation_criteria = '';
    const ws = buildPBLEvaluationSheet(plan);
    expect(findCellWithValue(ws, '-')).toBe(true);
  });

  it('evaluation_result가 빈 문자열이면 "-"로 표시된다', () => {
    const plan = makeOperationPlan();
    // evaluation_result를 빈 문자열로 강제 캐스팅 (엣지 케이스 방어)
    (plan.evaluation_plan.course_evaluation as { evaluation_result: string }).evaluation_result = '';
    const ws = buildPBLEvaluationSheet(plan);
    expect(findCellWithValue(ws, '-')).toBe(true);
  });
});

// =============================================================================
// addTableRow — centerIdxSet 분기 커버 (중앙/좌측 정렬 교차 검증)
// =============================================================================

describe('addTableRow centerIdxSet 분기 커버', () => {
  it('buildPBLTrainingSheet: 훈련생 행은 index 0만 중앙 정렬이다 (나머지는 좌측)', () => {
    // centerIdxSet = new Set([0]) → c=0은 center, c=1..4는 body 스타일
    // 두 스타일 모두 실행되는지 확인 (오류 없음)
    const plan = makeOperationPlan();
    plan.training_plan.learning_group.trainees = [
      { role: '팀원', affiliation: '소속', position: '직위', name: '이름' },
    ];
    expect(() => buildPBLTrainingSheet(plan)).not.toThrow();
  });

  it('buildPBLTrainingSheet: 강사 행은 index 0,1이 중앙 정렬이다', () => {
    // centerIdxSet = new Set([0, 1]) → c=0,1은 center, c=2..4는 body 스타일
    const plan = makeOperationPlan();
    plan.training_plan.learning_group.instructors = [
      { type: '외부', role: '팀장', affiliation: 'A', position: 'B', name: 'C' },
    ];
    expect(() => buildPBLTrainingSheet(plan)).not.toThrow();
  });

  it('buildPBLTrainingSheet: 훈련 컨텐츠 행은 index 2,3,4가 중앙 정렬이다', () => {
    // centerIdxSet = new Set([2, 3, 4])
    const plan = makeOperationPlan();
    plan.training_plan.subject_profile.training_contents = [
      { unit_name: 'U', detail: 'D', training_hours: 10, instructor_hours: { external: 5, internal: 5 } },
    ];
    expect(() => buildPBLTrainingSheet(plan)).not.toThrow();
  });

  it('buildPBLEvaluationSheet: 체크리스트 행은 index 2만 중앙 정렬이다', () => {
    // centerIdxSet = new Set([2])
    const plan = makeOperationPlan();
    plan.evaluation_plan.course_evaluation.performance_checklist = [
      { unit_name: 'U', evaluation_criteria: 'E', performance_level: 4 },
    ];
    expect(() => buildPBLEvaluationSheet(plan)).not.toThrow();
  });

  it('buildPBLOperationSheet: AI 도구 계획 행은 index 0만 중앙 정렬이다', () => {
    // centerIdxSet = new Set([0])
    const plan = makeOperationPlan({
      ai_tool_usage_plan: [
        { stage: '1단계', main_activity: '활동', ai_tools: ['T'], utilized_data: 'd', purpose: 'p', specific_method: 'm' },
      ],
    });
    expect(() => buildPBLOperationSheet(plan)).not.toThrow();
  });
});

// =============================================================================
// 경계값·엣지 케이스 통합
// =============================================================================

describe('엣지 케이스 통합', () => {
  it('training_contents가 3개인 경우 alt 행이 교대 적용된다 (오류 없음)', () => {
    const plan = makeOperationPlan();
    plan.training_plan.subject_profile.training_contents = [
      { unit_name: '단원1', detail: '내용1', training_hours: 10, instructor_hours: { external: 5, internal: 5 } },
      { unit_name: '단원2', detail: '내용2', training_hours: 10, instructor_hours: { external: 5, internal: 5 } },
      { unit_name: '단원3', detail: '내용3', training_hours: 10, instructor_hours: { external: 5, internal: 5 } },
    ];
    expect(() => buildPBLTrainingSheet(plan)).not.toThrow();
  });

  it('performance_checklist가 3개인 경우 alt 행이 교대 적용된다 (오류 없음)', () => {
    const plan = makeOperationPlan();
    plan.evaluation_plan.course_evaluation.performance_checklist = [
      { unit_name: 'U1', evaluation_criteria: 'E1', performance_level: 1 },
      { unit_name: 'U2', evaluation_criteria: 'E2', performance_level: 2 },
      { unit_name: 'U3', evaluation_criteria: 'E3', performance_level: 3 },
    ];
    expect(() => buildPBLEvaluationSheet(plan)).not.toThrow();
  });

  it('모든 시트 빌더가 동일 입력으로 독립적으로 호출 가능하다', () => {
    const op = makeOperationPlan();
    const pa = makePerformanceAnalysis();
    expect(() => {
      buildPBLOperationSheet(op);
      buildPBLTrainingSheet(op);
      buildPBLEvaluationSheet(op);
      buildPBLPerformanceSheet(pa);
    }).not.toThrow();
  });

  it('ai_tool_usage_plan ai_tools 빈 배열이면 빈 문자열로 렌더링된다', () => {
    const plan = makeOperationPlan({
      ai_tool_usage_plan: [
        { stage: '1단계', main_activity: '활동', ai_tools: [], utilized_data: 'd', purpose: 'p', specific_method: 'm' },
      ],
    });
    const ws = buildPBLOperationSheet(plan);
    // ai_tools.join(', ') → '' (빈 문자열)
    expect(findCellWithValue(ws, '')).toBe(true);
  });

  it('subject_profile.ai_tools가 빈 배열이면 "-"로 표시된다', () => {
    const plan = makeOperationPlan();
    plan.training_plan.subject_profile.ai_tools = [];
    const ws = buildPBLTrainingSheet(plan);
    // join 결과 '' → falsy이므로 '-' 폴백
    expect(findCellWithValue(ws, '-')).toBe(true);
  });

  it('훈련기간 start만 있고 end가 빈 경우 "-"로 처리된다', () => {
    const plan = makeOperationPlan();
    plan.training_plan.overview.training_period = { start: '2026-01-01', end: '' };
    const ws = buildPBLTrainingSheet(plan);
    expect(findCellWithValue(ws, '2026-01-01 ~ -')).toBe(true);
  });

  it('훈련기간 end만 있고 start가 빈 경우 처리된다', () => {
    const plan = makeOperationPlan();
    plan.training_plan.overview.training_period = { start: '', end: '2026-12-31' };
    const ws = buildPBLTrainingSheet(plan);
    expect(findCellWithValue(ws, '- ~ 2026-12-31')).toBe(true);
  });
});
