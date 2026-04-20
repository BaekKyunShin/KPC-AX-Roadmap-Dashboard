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
    // "과정명"은 가. 훈련과정 개요와 다. 훈련 교과목 프로파일에 모두 존재 → 첫 번째(가. 훈련과정 개요) 선택
    const inputs = screen.getAllByLabelText('과정명') as HTMLInputElement[];
    fireEvent.change(inputs[0]!, { target: { value: '새과정' } });
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

  // =====================================================================
  // 추가: 학습그룹·시설·훈련강사 섹션 내부 함수 커버리지 확보
  // =====================================================================

  describe('LearningGroupSection — 학습그룹 추가·삭제', () => {
    it('강사 추가 버튼 클릭 시 onChange가 instructors.length+1 배열로 호출된다', () => {
      const onChange = vi.fn();
      render(<PBLTrainingPlan canEdit={true} value={base()} onChange={onChange} />);
      // "강사 추가" 버튼이 나.학습그룹과 마.훈련강사 두 곳에 존재 → 첫 번째(나. 섹션)
      const addButtons = screen.getAllByRole('button', { name: /강사 추가/ });
      fireEvent.click(addButtons[0]);
      expect(onChange).toHaveBeenCalled();
      const next = onChange.mock.calls[0][0] as PBLTrainingPlanType;
      expect(next.learning_group.instructors).toHaveLength(2);
    });

    it('강사 삭제 버튼 클릭 시 onChange가 instructors.length-1 배열로 호출된다', () => {
      const onChange = vi.fn();
      render(<PBLTrainingPlan canEdit={true} value={base()} onChange={onChange} />);
      // "강사 홍 삭제" (나. 학습그룹 첫 번째 행) — aria-label 정확히 사용
      const deleteButtons = screen.getAllByRole('button', { name: /강사.*삭제/ });
      fireEvent.click(deleteButtons[0]);
      expect(onChange).toHaveBeenCalled();
      const next = onChange.mock.calls[0][0] as PBLTrainingPlanType;
      expect(next.learning_group.instructors).toHaveLength(0);
    });

    it('훈련생 추가 버튼 클릭 시 onChange가 trainees.length+1 배열로 호출된다', () => {
      const onChange = vi.fn();
      render(<PBLTrainingPlan canEdit={true} value={base()} onChange={onChange} />);
      fireEvent.click(screen.getByRole('button', { name: /훈련생 추가/ }));
      expect(onChange).toHaveBeenCalled();
      const next = onChange.mock.calls[0][0] as PBLTrainingPlanType;
      expect(next.learning_group.trainees).toHaveLength(2);
    });

    it('훈련생 삭제 버튼 클릭 시 onChange가 trainees.length-1 배열로 호출된다', () => {
      const onChange = vi.fn();
      render(<PBLTrainingPlan canEdit={true} value={base()} onChange={onChange} />);
      fireEvent.click(screen.getByRole('button', { name: /훈련생.*삭제/ }));
      expect(onChange).toHaveBeenCalled();
      const next = onChange.mock.calls[0][0] as PBLTrainingPlanType;
      expect(next.learning_group.trainees).toHaveLength(0);
    });
  });

  describe('FacilitiesSection — 시설·장비 추가·삭제', () => {
    it('시설·장비 추가 버튼 클릭 시 onChange가 facilities.length+1 배열로 호출된다', () => {
      const onChange = vi.fn();
      render(<PBLTrainingPlan canEdit={true} value={base()} onChange={onChange} />);
      fireEvent.click(screen.getByRole('button', { name: /시설·장비 추가/ }));
      expect(onChange).toHaveBeenCalled();
      const next = onChange.mock.calls[0][0] as PBLTrainingPlanType;
      expect(next.facilities).toHaveLength(1);
    });

    it('빈 시설 목록에서는 "시설 또는 장비를 추가하세요." 안내가 표시된다', () => {
      render(<PBLTrainingPlan canEdit={true} value={base()} onChange={() => {}} />);
      expect(screen.getByText('시설 또는 장비를 추가하세요.')).toBeInTheDocument();
    });

    it('시설 추가 후 삭제 버튼 클릭 시 facilities.length-1 배열로 호출된다', () => {
      const onChange = vi.fn();
      const valueWithFacility: PBLTrainingPlanType = {
        ...base(),
        facilities: [
          { seq: 1, category: '시설', name: 'PC실', spec: 'GPU 서버', location: '3층' },
        ],
      };
      render(<PBLTrainingPlan canEdit={true} value={valueWithFacility} onChange={onChange} />);
      fireEvent.click(screen.getByRole('button', { name: /시설·장비.*삭제/ }));
      expect(onChange).toHaveBeenCalled();
      const next = onChange.mock.calls[0][0] as PBLTrainingPlanType;
      expect(next.facilities).toHaveLength(0);
    });
  });

  describe('InstructorsSection — 훈련강사(마) 추가·삭제', () => {
    it('훈련강사 추가 버튼 클릭 시 training_instructors.length+1로 호출된다', () => {
      const onChange = vi.fn();
      render(<PBLTrainingPlan canEdit={true} value={base()} onChange={onChange} />);
      fireEvent.click(screen.getByRole('button', { name: /훈련강사 추가/ }));
      expect(onChange).toHaveBeenCalled();
      const next = onChange.mock.calls[0][0] as PBLTrainingPlanType;
      expect(next.training_instructors).toHaveLength(1);
    });

    it('빈 훈련강사 목록에서는 "훈련강사를 추가하세요." 안내가 표시된다', () => {
      render(<PBLTrainingPlan canEdit={true} value={base()} onChange={() => {}} />);
      // InstructorsSection의 empty 메시지 (나. 섹션과 마. 섹션 모두 존재)
      const emptyMessages = screen.getAllByText('훈련강사를 추가하세요.');
      expect(emptyMessages.length).toBeGreaterThanOrEqual(1);
    });

    it('훈련강사 추가 후 삭제 버튼 클릭 시 training_instructors.length-1로 호출된다', () => {
      const onChange = vi.fn();
      const valueWithInstructor: PBLTrainingPlanType = {
        ...base(),
        // 나. 학습그룹 강사 제거해서 "강사 삭제" 버튼 중복 방지
        learning_group: { instructors: [], trainees: [] },
        training_instructors: [
          {
            name: '김강사',
            internal_external: '외부',
            career_years: 5,
            work_name: 'AI 교육',
            detailed_training_content: ['내용1'],
          },
        ],
      };
      render(<PBLTrainingPlan canEdit={true} value={valueWithInstructor} onChange={onChange} />);
      // 마. 섹션의 "강사 김강사 삭제"
      fireEvent.click(screen.getByRole('button', { name: /강사 김강사 삭제/ }));
      expect(onChange).toHaveBeenCalled();
      const next = onChange.mock.calls[0][0] as PBLTrainingPlanType;
      expect(next.training_instructors).toHaveLength(0);
    });
  });

  describe('SubjectProfileSection — 훈련 교과목 프로파일 업데이트', () => {
    it('교과목 삭제 버튼 클릭 시 training_contents.length-1로 호출된다', () => {
      const onChange = vi.fn();
      render(<PBLTrainingPlan canEdit={true} value={base()} onChange={onChange} />);
      fireEvent.click(screen.getByRole('button', { name: /교과목.*삭제/ }));
      expect(onChange).toHaveBeenCalled();
      const next = onChange.mock.calls[0][0] as PBLTrainingPlanType;
      expect(next.subject_profile.training_contents).toHaveLength(0);
    });

    it('훈련기간 시작일 변경 시 training_period.start가 반영된다', () => {
      const onChange = vi.fn();
      render(<PBLTrainingPlan canEdit={true} value={base()} onChange={onChange} />);
      fireEvent.change(screen.getByLabelText('훈련기간 시작'), { target: { value: '2026-05-01' } });
      expect(onChange).toHaveBeenCalled();
      const next = onChange.mock.calls[0][0] as PBLTrainingPlanType;
      expect(next.overview.training_period.start).toBe('2026-05-01');
    });

    it('훈련기간 종료일 변경 시 training_period.end가 반영된다', () => {
      const onChange = vi.fn();
      render(<PBLTrainingPlan canEdit={true} value={base()} onChange={onChange} />);
      fireEvent.change(screen.getByLabelText('훈련기간 종료'), { target: { value: '2026-06-30' } });
      expect(onChange).toHaveBeenCalled();
      const next = onChange.mock.calls[0][0] as PBLTrainingPlanType;
      expect(next.overview.training_period.end).toBe('2026-06-30');
    });
  });
});
