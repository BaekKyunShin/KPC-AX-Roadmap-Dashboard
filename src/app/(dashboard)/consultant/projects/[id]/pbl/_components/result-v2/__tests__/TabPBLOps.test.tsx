import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import { TabPBLOps } from '../TabPBLOps';
import type { PBLReportRow } from '@/lib/services/pbl/pbl-crud';
import { createEmptyOutcomeAnalysis } from '@/lib/services/pbl/__fixtures__/empty-outcome-analysis';

function makeEmptyVersion(): PBLReportRow {
  return {
    id: 'v1',
    project_id: 'p1',
    version_number: 1,
    status: 'DRAFT',
    consultant_profile_snapshot: {},
    diagnosis_summary: '',
    pbl_content: {
      operation_plan: {
        training_goal: '',
        ai_tool_usage_plan: [],
        training_plan: {
          overview: { course_name: '', training_period: { start: '', end: '' } },
          learning_group: { instructors: [], trainees: [] },
          subject_profile: {
            course_name: '',
            total_hours: 0,
            training_goals: [],
            ai_tools: [],
            utilized_data: '',
            analysis_method: '',
            training_contents: [],
            total_sum_hours: 0,
          },
          facilities: [],
          training_instructors: [],
        },
        evaluation_plan: {
          course_evaluation: {
            course_name: '',
            evaluation_methods: [],
            evaluation_target: '',
            evaluation_date: '',
            evaluation_criteria: '',
            evaluation_result: '예정',
            performance_checklist: [],
            overall_comment: '',
            evaluation_scale: '',
          },
          result_evaluation: {
            satisfaction_survey: [],
            achievement_survey: [],
            external_expert_survey: [],
            practical_application_survey: [],
          },
        },
      },
      outcome_analysis: createEmptyOutcomeAnalysis(),
    },
    free_tool_validated: true,
    time_limit_validated: true,
    revision_prompt: null,
    is_shared: false,
    like_count: 0,
    created_by: 'u1',
    finalized_by: null,
    finalized_at: null,
    created_at: '2026-04-24T00:00:00Z',
    updated_at: '2026-04-24T00:00:00Z',
  };
}

describe('TabPBLOps (Ⅳ. AI 기반 운영계획)', () => {
  it('8개 하위 섹션 렌더 (Ⅳ-1 / Ⅳ-2 / Ⅳ-3-가 ~ Ⅳ-3-마 / Ⅳ-4-가)', () => {
    render(
      <TabPBLOps
        version={makeEmptyVersion()}
        interview={{}}
        readOnly
        onEdit={vi.fn()}
      />,
    );
    expect(screen.getByText(/Ⅳ-1\. 훈련 목표/)).toBeInTheDocument();
    expect(screen.getByText(/Ⅳ-2\. AI 도구 활용 계획/)).toBeInTheDocument();
    expect(screen.getByText(/Ⅳ-3-가\. 훈련과정 개요/)).toBeInTheDocument();
    expect(screen.getByText(/Ⅳ-3-나\. 학습그룹 구성/)).toBeInTheDocument();
    expect(screen.getByText(/Ⅳ-3-다\. 훈련 교과목 프로파일/)).toBeInTheDocument();
    expect(screen.getByText(/Ⅳ-3-라\. 시설·장비/)).toBeInTheDocument();
    expect(screen.getByText(/Ⅳ-3-마\. 훈련강사/)).toBeInTheDocument();
    expect(screen.getByText(/Ⅳ-4-가\. 과정평가 계획/)).toBeInTheDocument();
  });

  it('Ⅳ-4-나 결과평가 계획 [고정 양식·결과 화면 제외] — UI 에 렌더되지 않는다', () => {
    const { container } = render(
      <TabPBLOps
        version={makeEmptyVersion()}
        interview={{}}
        readOnly
        onEdit={vi.fn()}
      />,
    );
    const text = container.textContent ?? '';
    expect(text).not.toContain('결과평가');
    expect(text).not.toContain('Ⅳ-4-나');
  });

  it('고정 설문 라벨 (만족도/성취도/외부전문가/현업적용도) 이 렌더되지 않는다', () => {
    const { container } = render(
      <TabPBLOps
        version={makeEmptyVersion()}
        interview={{}}
        readOnly
        onEdit={vi.fn()}
      />,
    );
    const text = container.textContent ?? '';
    expect(text).not.toContain('만족도 조사');
    expect(text).not.toContain('성취도 조사');
    expect(text).not.toContain('외부전문가 만족도');
    expect(text).not.toContain('현업적용도');
  });

  it('LLM 결과가 비어 있을 때 각 섹션에 placeholder 표출', () => {
    render(
      <TabPBLOps
        version={makeEmptyVersion()}
        interview={{}}
        readOnly
        onEdit={vi.fn()}
      />,
    );
    const placeholders = screen.getAllByText(/아직 생성되지 않았습니다/);
    // Ⅳ-1 ~ Ⅳ-4-가 총 8 개 섹션 placeholder
    expect(placeholders.length).toBeGreaterThanOrEqual(8);
  });

  it('Ⅳ-1 훈련 목표 값이 있으면 placeholder 대신 텍스트 표시', () => {
    const v = makeEmptyVersion();
    v.pbl_content.operation_plan.training_goal = '품질 검사 AI 보조 역량 확보';
    render(
      <TabPBLOps version={v} interview={{}} readOnly onEdit={vi.fn()} />,
    );
    expect(
      screen.getByText('품질 검사 AI 보조 역량 확보'),
    ).toBeInTheDocument();
  });

  it('제외 라벨 ("결과보고서" / "수행일지" / "결과물 표지") 을 렌더하지 않음', () => {
    const { container } = render(
      <TabPBLOps
        version={makeEmptyVersion()}
        interview={{}}
        readOnly
        onEdit={vi.fn()}
      />,
    );
    const text = container.textContent ?? '';
    expect(text).not.toContain('결과보고서');
    expect(text).not.toContain('수행일지');
    expect(text).not.toContain('결과물 표지');
  });
});
