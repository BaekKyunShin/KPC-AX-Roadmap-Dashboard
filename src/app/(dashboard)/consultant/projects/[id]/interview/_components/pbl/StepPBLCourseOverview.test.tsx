import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StepPBLCourseOverview from './StepPBLCourseOverview';
import type { PBLCourseOverview } from '@/lib/schemas/interview-pbl';

function makeValue(partial: Partial<PBLCourseOverview> = {}): PBLCourseOverview {
  return {
    company_name: '',
    business_registration_no: '',
    industry_code: '',
    industry_main: '',
    address: '',
    training_address: '',
    jurisdiction_office: '',
    contact: { position: '', name: '', phone: '', email: '' },
    course_name: '',
    ncs_code: '',
    training_hours: 0,
    trainee_count: 0,
    training_job: '',
    ai_level: 'AI기초형',
    training_goals: [],
    ...partial,
  };
}

describe('StepPBLCourseOverview', () => {
  it('모든 Ⅰ장 섹션 제목이 렌더링된다', () => {
    render(<StepPBLCourseOverview value={makeValue()} onChange={vi.fn()} />);
    expect(screen.getByText('Ⅰ. 훈련과정 개요')).toBeInTheDocument();
    expect(screen.getByText('기업 기본정보')).toBeInTheDocument();
    expect(screen.getByText('담당자 연락처')).toBeInTheDocument();
    expect(screen.getByText('훈련 과정 정보')).toBeInTheDocument();
  });

  it('AI역량수준 라디오 4개가 모두 표시된다 (등급 병기)', () => {
    render(<StepPBLCourseOverview value={makeValue()} onChange={vi.fn()} />);
    const radioGroup = screen.getByRole('radiogroup', { name: 'AI역량 수준' });
    expect(radioGroup).toBeInTheDocument();
    const radios = screen.getAllByRole('radio', { name: /AI(기초|탐구|활용|선도)형\((기초|초급|중급|고급)\)/ });
    expect(radios).toHaveLength(4);
  });

  it('AI역량수준 라디오 변경 시 onChange 호출', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<StepPBLCourseOverview value={makeValue()} onChange={onChange} />);
    await user.click(screen.getByRole('radio', { name: 'AI탐구형(초급)' }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ ai_level: 'AI탐구형' }));
  });

  it('훈련목표 체크박스 5개가 렌더링된다', () => {
    render(<StepPBLCourseOverview value={makeValue()} onChange={vi.fn()} />);
    ['기술문제 해결', '공정 최적화', '불량률 감소', '기술 매뉴얼 개발', '기타'].forEach((label) => {
      expect(screen.getByRole('checkbox', { name: label })).toBeInTheDocument();
    });
  });

  it('훈련목표 체크박스 복수 선택 시 배열에 추가', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(
      <StepPBLCourseOverview value={makeValue({ training_goals: ['공정 최적화'] })} onChange={onChange} />
    );
    await user.click(screen.getByRole('checkbox', { name: '불량률 감소' }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        training_goals: expect.arrayContaining(['공정 최적화', '불량률 감소']),
      })
    );
    // 중복 선택 해제
    rerender(
      <StepPBLCourseOverview
        value={makeValue({ training_goals: ['공정 최적화', '불량률 감소'] })}
        onChange={onChange}
      />
    );
    await user.click(screen.getByRole('checkbox', { name: '공정 최적화' }));
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(lastCall.training_goals).toEqual(['불량률 감소']);
  });

  it('훈련시간 숫자 입력 시 onChange 호출', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<StepPBLCourseOverview value={makeValue()} onChange={onChange} />);
    const hoursInput = screen.getByLabelText(/훈련시간/);
    await user.type(hoursInput, '4');
    const last = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(last.training_hours).toBe(4);
  });

  it('에러 메시지가 표시된다', () => {
    render(
      <StepPBLCourseOverview
        value={makeValue()}
        onChange={vi.fn()}
        errors={{ course_name: '과정명을 입력하세요.' }}
      />
    );
    expect(screen.getByText('과정명을 입력하세요.')).toBeInTheDocument();
  });
});
