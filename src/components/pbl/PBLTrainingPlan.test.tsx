import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PBLTrainingPlan } from './PBLTrainingPlan';
import type { PBLTrainingPlan as PBLTrainingPlanType } from '@/lib/services/pbl';

function base(): PBLTrainingPlanType {
  return {
    overview: { course_name: '과정1', training_period: { start: '', end: '' } },
    learning_group: {
      instructors: [{ type: '외부', role: '팀장', affiliation: 'KPC', position: '수석', name: '홍' }],
      trainees: [{ role: '팀원', affiliation: '품질팀', position: '사원', name: '김' }],
    },
    subject_profile: {
      course_name: '과정1',
      total_hours: 16,
      training_goals: ['g'],
      ai_tools: ['ChatGPT'],
      utilized_data: 'd',
      analysis_method: 'LLM',
      training_contents: [
        { unit_name: 'u', detail: 'det', training_hours: 8, instructor_hours: { external: 4, internal: 4 } },
      ],
      total_sum_hours: 8,
    },
    facilities: [],
    training_instructors: [],
  };
}

describe('PBLTrainingPlan', () => {
  it('overview course_name 입력 시 onChange 호출', () => {
    const onChange = vi.fn();
    render(<PBLTrainingPlan canEdit={true} value={base()} onChange={onChange} />);
    const input = screen.getByLabelText('과정명') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '새과정' } });
    expect(onChange).toHaveBeenCalled();
    const next = onChange.mock.calls[0][0] as PBLTrainingPlanType;
    expect(next.overview.course_name).toBe('새과정');
  });

  it('훈련시간과 강사투입시간 불일치 시 경고 표시', () => {
    const v = base();
    v.subject_profile.training_contents[0]!.instructor_hours = { external: 2, internal: 2 }; // 합 4, training_hours 8
    render(<PBLTrainingPlan canEdit={false} value={v} onChange={() => {}} />);
    expect(screen.getByText(/강사 투입시간.*불일치|양식 가이드/)).toBeInTheDocument();
  });

  it('교과목 추가 클릭 시 onChange가 호출된다', () => {
    const onChange = vi.fn();
    render(<PBLTrainingPlan canEdit={true} value={base()} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /교과목 추가/ }));
    expect(onChange).toHaveBeenCalled();
  });

  it('canEdit=false이면 삭제 버튼은 표시되지 않는다', () => {
    render(<PBLTrainingPlan canEdit={false} value={base()} onChange={() => {}} />);
    expect(screen.queryByRole('button', { name: /교과목.*삭제/ })).not.toBeInTheDocument();
  });
});
