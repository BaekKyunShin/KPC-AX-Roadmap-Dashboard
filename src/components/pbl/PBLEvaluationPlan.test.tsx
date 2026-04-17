import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PBLEvaluationPlan } from './PBLEvaluationPlan';
import {
  PBL_ACHIEVEMENT_SURVEY_LENGTH,
  PBL_EVALUATION_SCALE_DESCRIPTION,
  PBL_EXTERNAL_EXPERT_SURVEY_LENGTH,
  PBL_PRACTICAL_APPLICATION_SURVEY_LENGTH,
  PBL_SATISFACTION_SURVEY_LENGTH,
  type PBLEvaluationPlan as PBLEvaluationPlanType,
} from '@/lib/services/pbl';

function base(): PBLEvaluationPlanType {
  return {
    course_evaluation: {
      course_name: 'C',
      evaluation_methods: ['포트폴리오'],
      evaluation_target: 't',
      evaluation_date: '2026-05-01',
      evaluation_criteria: 'c',
      evaluation_result: '예정',
      performance_checklist: [
        { unit_name: 'u', evaluation_criteria: 'ec', performance_level: 4 },
      ],
      overall_comment: '',
      evaluation_scale: PBL_EVALUATION_SCALE_DESCRIPTION,
    },
    result_evaluation: {
      satisfaction_survey: Array(PBL_SATISFACTION_SURVEY_LENGTH).fill(null),
      achievement_survey: Array(PBL_ACHIEVEMENT_SURVEY_LENGTH).fill(null),
      external_expert_survey: Array(PBL_EXTERNAL_EXPERT_SURVEY_LENGTH).fill(null),
      practical_application_survey: Array(PBL_PRACTICAL_APPLICATION_SURVEY_LENGTH).fill(null),
    },
  };
}

describe('PBLEvaluationPlan', () => {
  it('평가 방법 3종 체크박스를 렌더', () => {
    render(<PBLEvaluationPlan canEdit={true} value={base()} onChange={() => {}} />);
    expect(screen.getByLabelText('포트폴리오')).toBeInTheDocument();
    expect(screen.getByLabelText('문제해결시나리오')).toBeInTheDocument();
    expect(screen.getByLabelText('작업장 평가')).toBeInTheDocument();
  });

  it('체크박스 클릭 시 evaluation_methods가 업데이트된다', () => {
    const onChange = vi.fn();
    render(<PBLEvaluationPlan canEdit={true} value={base()} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('작업장 평가'));
    expect(onChange).toHaveBeenCalled();
    const next = onChange.mock.calls[0][0] as PBLEvaluationPlanType;
    expect(next.course_evaluation.evaluation_methods).toContain('작업장 평가');
  });

  it('결과평가 설문 4종이 모두 렌더된다', () => {
    render(<PBLEvaluationPlan canEdit={true} value={base()} onChange={() => {}} />);
    // h3 제목은 survey title + (문항수) span이 함께 있어 부분 매칭
    expect(screen.getAllByText(/만족도 조사/).length).toBeGreaterThanOrEqual(2); // 만족도 + 외부전문가 만족도
    expect(screen.getByText(/성취도 조사/)).toBeInTheDocument();
    expect(screen.getByText(/외부전문가 만족도 조사/)).toBeInTheDocument();
    expect(screen.getByText(/현업적용도 조사/)).toBeInTheDocument();
  });

  it('수행수준 체크리스트 행의 라디오 1~5가 모두 렌더', () => {
    render(<PBLEvaluationPlan canEdit={true} value={base()} onChange={() => {}} />);
    // 수행수준 radiogroup은 "수행수준 선택" aria-label로 구분
    const performanceGroup = screen.getByRole('radiogroup', { name: /수행수준 선택/ });
    // 1~5 라디오 버튼이 존재해야 함
    const radios = performanceGroup.querySelectorAll('input[type="radio"]');
    expect(radios).toHaveLength(5);
  });
});
