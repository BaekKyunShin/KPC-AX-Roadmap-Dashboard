import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StepPBLTrainingEnvironment from './StepPBLTrainingEnvironment';
import type { PBLTrainingEnvironment } from '@/lib/schemas/interview-pbl';

function makeValue(partial: Partial<PBLTrainingEnvironment> = {}): PBLTrainingEnvironment {
  return {
    proper_training_hours: 0,
    training_place: { types: [], location: '', special_notes: '' },
    internal_instructor: { used: false, name: '', position: '' },
    target_count: 0,
    target_characteristics: { career: '', level: '' },
    ai_infrastructure: {
      ai_tools: '가능',
      network: '양호',
      pc_count: 0,
      etc_equipment: '',
    },
    training_needs_analysis: '',
    expectation: { as_is: '', to_be: '' },
    ...partial,
  };
}

describe('StepPBLTrainingEnvironment', () => {
  it('Ⅱ-2 제목과 주요 섹션이 렌더링된다', () => {
    render(<StepPBLTrainingEnvironment value={makeValue()} onChange={vi.fn()} />);
    expect(screen.getByText('Ⅱ-2. 기업 훈련환경 분석')).toBeInTheDocument();
    expect(screen.getByText('훈련 여건')).toBeInTheDocument();
    expect(screen.getByText('사내 강사 활용 여부')).toBeInTheDocument();
    expect(screen.getByText('AI활용 가능 인프라')).toBeInTheDocument();
    expect(screen.getByText('훈련을 통한 기대효과')).toBeInTheDocument();
  });

  it('AI도구·네트워크 라디오 그룹과 훈련장소 체크박스가 모두 표시된다', () => {
    render(<StepPBLTrainingEnvironment value={makeValue()} onChange={vi.fn()} />);
    expect(
      screen.getByRole('radiogroup', { name: 'AI 도구 사용 가능 환경' })
    ).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: '네트워크 환경' })).toBeInTheDocument();
    // 훈련장소 체크박스 (사내/사외) 확인
    expect(screen.getByRole('checkbox', { name: '사내' })).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: '사외' })).toBeInTheDocument();
    // AI 도구 라디오 3개 확인
    ['가능', '제한적', '불가능'].forEach((label) => {
      expect(screen.getByRole('radio', { name: label })).toBeInTheDocument();
    });
  });

  it('훈련장소 체크박스 변경 시 onChange 호출 (복수 선택)', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<StepPBLTrainingEnvironment value={makeValue()} onChange={onChange} />);
    await user.click(screen.getByRole('checkbox', { name: '사외' }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        training_place: expect.objectContaining({ types: ['사외'] }),
      })
    );
  });

  it('사내강사 "활용" 선택 시에만 성명·직위 입력이 노출된다', () => {
    const { rerender } = render(
      <StepPBLTrainingEnvironment value={makeValue()} onChange={vi.fn()} />
    );
    expect(screen.queryByLabelText('성명')).not.toBeInTheDocument();
    rerender(
      <StepPBLTrainingEnvironment
        value={makeValue({ internal_instructor: { used: true, name: '', position: '' } })}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByLabelText('성명')).toBeInTheDocument();
    expect(screen.getByLabelText('직위')).toBeInTheDocument();
  });

  it('적정 훈련시간 숫자 입력 시 onChange 호출', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<StepPBLTrainingEnvironment value={makeValue()} onChange={onChange} />);
    await user.type(screen.getByLabelText(/적정 훈련시간/), '8');
    const last = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(last.proper_training_hours).toBe(8);
  });

  it('As-Is / To-Be textarea 입력이 반영된다', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<StepPBLTrainingEnvironment value={makeValue()} onChange={onChange} />);
    await user.type(screen.getByLabelText(/As-is \(현재 상황\)/), '수');
    const last = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(last.expectation.as_is).toBe('수');
  });

  // =====================================================================
  // 추가: 내부 헬퍼 함수 커버리지 확보
  // =====================================================================

  describe('updateInstructor — 사내강사 필드 변경', () => {
    it('"활용" 라디오 선택 시 internal_instructor.used=true로 onChange 호출', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<StepPBLTrainingEnvironment value={makeValue()} onChange={onChange} />);
      // '활용' 라디오 버튼 클릭
      const yesRadio = screen.getByRole('radio', { name: '활용' });
      await user.click(yesRadio);
      const last = onChange.mock.calls[onChange.mock.calls.length - 1][0];
      expect(last.internal_instructor.used).toBe(true);
    });

    it('사내강사 활용 상태에서 성명 변경 시 onChange 호출', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(
        <StepPBLTrainingEnvironment
          value={makeValue({ internal_instructor: { used: true, name: '', position: '' } })}
          onChange={onChange}
        />
      );
      const nameInput = screen.getByLabelText('성명');
      await user.type(nameInput, '김');
      const last = onChange.mock.calls[onChange.mock.calls.length - 1][0];
      expect(last.internal_instructor.name).toBe('김');
    });

    it('사내강사 직위 변경 시 onChange 호출', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(
        <StepPBLTrainingEnvironment
          value={makeValue({ internal_instructor: { used: true, name: '이름', position: '' } })}
          onChange={onChange}
        />
      );
      const posInput = screen.getByLabelText('직위');
      await user.type(posInput, '팀');
      const last = onChange.mock.calls[onChange.mock.calls.length - 1][0];
      expect(last.internal_instructor.position).toBe('팀');
    });
  });

  describe('updateCharacteristics — 훈련대상자 특성 필드 변경', () => {
    it('업무 경력 필드 변경 시 target_characteristics.career 반영', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<StepPBLTrainingEnvironment value={makeValue()} onChange={onChange} />);
      const careerInput = screen.getByPlaceholderText('예: 사원/대리급, 1~2년차');
      await user.type(careerInput, '사');
      const last = onChange.mock.calls[onChange.mock.calls.length - 1][0];
      expect(last.target_characteristics.career).toBe('사');
    });

    it('수준 필드 변경 시 target_characteristics.level 반영', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<StepPBLTrainingEnvironment value={makeValue()} onChange={onChange} />);
      const levelInput = screen.getByPlaceholderText('예: 기초 / 실무 / 심화');
      await user.type(levelInput, '기');
      const last = onChange.mock.calls[onChange.mock.calls.length - 1][0];
      expect(last.target_characteristics.level).toBe('기');
    });

    it('대상 인원 숫자 입력 시 target_count 반영', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<StepPBLTrainingEnvironment value={makeValue()} onChange={onChange} />);
      const countInput = screen.getByLabelText(/대상 인원/);
      await user.type(countInput, '5');
      const last = onChange.mock.calls[onChange.mock.calls.length - 1][0];
      expect(last.target_count).toBe(5);
    });
  });

  describe('updateInfrastructure — AI 인프라 필드 변경', () => {
    it('"제한적" AI 도구 라디오 선택 시 ai_tools 업데이트', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<StepPBLTrainingEnvironment value={makeValue()} onChange={onChange} />);
      await user.click(screen.getByRole('radio', { name: '제한적' }));
      const last = onChange.mock.calls[onChange.mock.calls.length - 1][0];
      expect(last.ai_infrastructure.ai_tools).toBe('제한적');
    });

    it('"보통" 네트워크 라디오 선택 시 network 업데이트', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<StepPBLTrainingEnvironment value={makeValue()} onChange={onChange} />);
      await user.click(screen.getByRole('radio', { name: '보통' }));
      const last = onChange.mock.calls[onChange.mock.calls.length - 1][0];
      expect(last.ai_infrastructure.network).toBe('보통');
    });

    it('PC 보유 현황 숫자 입력 시 pc_count 반영', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<StepPBLTrainingEnvironment value={makeValue()} onChange={onChange} />);
      const pcInput = screen.getByLabelText(/PC 보유 현황/);
      await user.type(pcInput, '3');
      const last = onChange.mock.calls[onChange.mock.calls.length - 1][0];
      expect(last.ai_infrastructure.pc_count).toBe(3);
    });

    it('기타 장비 현황 입력 시 etc_equipment 반영', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<StepPBLTrainingEnvironment value={makeValue()} onChange={onChange} />);
      const etcInput = screen.getByPlaceholderText('예: 프로젝터, 공용 GPU 워크스테이션');
      await user.type(etcInput, 'G');
      const last = onChange.mock.calls[onChange.mock.calls.length - 1][0];
      expect(last.ai_infrastructure.etc_equipment).toBe('G');
    });
  });

  describe('updateExpectation — 기대효과 To-Be 입력', () => {
    it('To-be textarea 입력 시 expectation.to_be 반영', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<StepPBLTrainingEnvironment value={makeValue()} onChange={onChange} />);
      await user.type(screen.getByLabelText(/To-be \(원하는 상황\)/), 'A');
      const last = onChange.mock.calls[onChange.mock.calls.length - 1][0];
      expect(last.expectation.to_be).toBe('A');
    });
  });

  describe('updatePlace — 훈련장소 텍스트 필드 변경', () => {
    it('훈련장소 구체적 위치 변경 시 training_place.location 반영', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<StepPBLTrainingEnvironment value={makeValue()} onChange={onChange} />);
      const locationInput = screen.getByPlaceholderText('예: 본사 3층 교육장');
      await user.type(locationInput, 'B');
      const last = onChange.mock.calls[onChange.mock.calls.length - 1][0];
      expect(last.training_place.location).toBe('B');
    });

    it('훈련 요구분석 결과 textarea 변경 시 training_needs_analysis 반영', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<StepPBLTrainingEnvironment value={makeValue()} onChange={onChange} />);
      const needsTextarea = screen.getByLabelText(/AI훈련 요구분석 결과/);
      await user.type(needsTextarea, 'N');
      const last = onChange.mock.calls[onChange.mock.calls.length - 1][0];
      expect(last.training_needs_analysis).toBe('N');
    });
  });
});
