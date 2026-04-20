import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StepPBLHrdNecessity from './StepPBLHrdNecessity';
import type { PBLHrdNecessity } from '@/lib/schemas/interview-pbl';

function makeValue(partial: Partial<PBLHrdNecessity> = {}): PBLHrdNecessity {
  return {
    training_history: [],
    support_history: [],
    recommendations: [],
    course_development_necessity: '',
    ...partial,
  };
}

describe('StepPBLHrdNecessity', () => {
  it('Ⅱ-3 제목과 주요 섹션이 렌더링된다', () => {
    render(<StepPBLHrdNecessity value={makeValue()} onChange={vi.fn()} />);
    expect(screen.getByText('Ⅱ-3. AI 과정개발의 필요성')).toBeInTheDocument();
    expect(screen.getByText('훈련 실시 이력')).toBeInTheDocument();
    expect(screen.getByText('훈련 지원 이력')).toBeInTheDocument();
    expect(screen.getByText('추천훈련사업')).toBeInTheDocument();
    expect(screen.getByLabelText(/AI훈련과정 개발 필요성/)).toBeInTheDocument();
  });

  it('이력 추가 버튼 클릭 시 training_history 배열에 추가된다', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<StepPBLHrdNecessity value={makeValue()} onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: /이력 추가/ }));
    const last = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(last.training_history).toHaveLength(1);
    expect(last.training_history[0]).toMatchObject({
      seq: 0,
      program: '',
      course_name: '',
    });
  });

  it('연도 추가 및 삭제 버튼이 작동한다', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(
      <StepPBLHrdNecessity
        value={makeValue({
          support_history: [
            {
              id: 's1',
              year: '2025',
              annual_limit: 1000,
              supported: 600,
              ratio: '60%',
            },
          ],
        })}
        onChange={onChange}
      />
    );
    await user.click(screen.getByRole('button', { name: '지원 이력 1 삭제' }));
    const last = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(last.support_history).toHaveLength(0);
  });

  it('추천 추가 버튼은 3개까지만 허용된다', () => {
    render(
      <StepPBLHrdNecessity
        value={makeValue({
          recommendations: [
            { id: 'r1', rank: 1, program: 'A', proposal: '' },
            { id: 'r2', rank: 2, program: 'B', proposal: '' },
            { id: 'r3', rank: 3, program: 'C', proposal: '' },
          ],
        })}
        onChange={vi.fn()}
      />
    );
    const addBtn = screen.getByRole('button', { name: /추천 추가/ });
    expect(addBtn).toBeDisabled();
  });

  it('과정개발 필요성 textarea 입력 시 onChange 호출', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<StepPBLHrdNecessity value={makeValue()} onChange={onChange} />);
    await user.type(screen.getByLabelText(/AI훈련과정 개발 필요성/), '필');
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ course_development_necessity: '필' })
    );
  });

  // =====================================================================
  // 추가: 내부 함수 커버리지 확보
  // =====================================================================

  describe('훈련 이력(training_history) 수정·삭제', () => {
    it('훈련 이력 항목의 참여사업 필드 변경 시 updateTrainingHistory 호출', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(
        <StepPBLHrdNecessity
          value={makeValue({
            training_history: [
              {
                id: 'th1',
                seq: 1,
                program: '',
                course_name: '과정A',
                method: '집체',
                duration_days: 3,
              },
            ],
          })}
          onChange={onChange}
        />
      );
      // 참여사업 Input을 입력
      const programInput = screen.getByPlaceholderText('예: 재직자 향상훈련');
      await user.type(programInput, 'S');
      const last = onChange.mock.calls[onChange.mock.calls.length - 1][0];
      expect(last.training_history[0].program).toBe('S');
    });

    it('훈련 이력 항목의 훈련방법 필드 변경 시 onChange 호출', async () => {
      const onChange = vi.fn();
      render(
        <StepPBLHrdNecessity
          value={makeValue({
            training_history: [
              {
                id: 'th2',
                seq: 1,
                program: '향상',
                course_name: '과정B',
                method: '',
                duration_days: 0,
              },
            ],
          })}
          onChange={onChange}
        />
      );
      // fireEvent.change로 한글 IME 이슈 우회
      const methodInput = screen.getByPlaceholderText('예: 집체(대면)');
      fireEvent.change(methodInput, { target: { value: '집체' } });
      const last = onChange.mock.calls[onChange.mock.calls.length - 1][0];
      expect(last.training_history[0].method).toBe('집체');
    });

    it('훈련 이력 삭제 버튼 클릭 시 removeTrainingHistory 호출', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(
        <StepPBLHrdNecessity
          value={makeValue({
            training_history: [
              {
                id: 'th3',
                seq: 1,
                program: '향상',
                course_name: '과정C',
                method: '집체',
                duration_days: 2,
              },
            ],
          })}
          onChange={onChange}
        />
      );
      await user.click(screen.getByRole('button', { name: '훈련 이력 1 삭제' }));
      const last = onChange.mock.calls[onChange.mock.calls.length - 1][0];
      expect(last.training_history).toHaveLength(0);
    });
  });

  describe('지원 이력(support_history) 추가·수정', () => {
    it('연도 추가 버튼 클릭 시 addSupportHistory 호출', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<StepPBLHrdNecessity value={makeValue()} onChange={onChange} />);
      await user.click(screen.getByRole('button', { name: /연도 추가/ }));
      const last = onChange.mock.calls[onChange.mock.calls.length - 1][0];
      expect(last.support_history).toHaveLength(1);
    });

    it('지원 이력 연도 필드 변경 시 updateSupportHistory 호출', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(
        <StepPBLHrdNecessity
          value={makeValue({
            support_history: [
              { id: 'sh1', year: '', annual_limit: 0, supported: 0, ratio: '' },
            ],
          })}
          onChange={onChange}
        />
      );
      const yearInput = screen.getByPlaceholderText('예: 2025');
      await user.type(yearInput, '2');
      const last = onChange.mock.calls[onChange.mock.calls.length - 1][0];
      expect(last.support_history[0].year).toBe('2');
    });

    it('지원 이력 비율 필드 변경 시 onChange 호출', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(
        <StepPBLHrdNecessity
          value={makeValue({
            support_history: [
              { id: 'sh2', year: '2025', annual_limit: 1000, supported: 600, ratio: '' },
            ],
          })}
          onChange={onChange}
        />
      );
      const ratioInput = screen.getByPlaceholderText('예: 60%');
      await user.type(ratioInput, '5');
      const last = onChange.mock.calls[onChange.mock.calls.length - 1][0];
      expect(last.support_history[0].ratio).toBe('5');
    });
  });

  describe('추천훈련사업(recommendations) 추가·수정·삭제', () => {
    it('추천 추가 버튼 클릭 시 addRecommendation 호출', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<StepPBLHrdNecessity value={makeValue()} onChange={onChange} />);
      await user.click(screen.getByRole('button', { name: /추천 추가/ }));
      const last = onChange.mock.calls[onChange.mock.calls.length - 1][0];
      expect(last.recommendations).toHaveLength(1);
      expect(last.recommendations[0].rank).toBe(1);
    });

    it('추천 훈련사업명 변경 시 updateRecommendation 호출', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(
        <StepPBLHrdNecessity
          value={makeValue({
            recommendations: [{ id: 'rec1', rank: 1, program: '', proposal: '' }],
          })}
          onChange={onChange}
        />
      );
      const programInput = screen.getByPlaceholderText('예) 체계적 현장훈련(S-OJT)');
      await user.type(programInput, 'A');
      const last = onChange.mock.calls[onChange.mock.calls.length - 1][0];
      expect(last.recommendations[0].program).toBe('A');
    });

    it('추천 HRD 제안 textarea 변경 시 onChange 호출', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(
        <StepPBLHrdNecessity
          value={makeValue({
            recommendations: [{ id: 'rec2', rank: 1, program: 'S-OJT', proposal: '' }],
          })}
          onChange={onChange}
        />
      );
      const proposalTextarea = screen.getByPlaceholderText('제안 배경 및 기대효과');
      await user.type(proposalTextarea, 'X');
      const last = onChange.mock.calls[onChange.mock.calls.length - 1][0];
      expect(last.recommendations[0].proposal).toBe('X');
    });

    it('추천 삭제 버튼 클릭 시 removeRecommendation 호출', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(
        <StepPBLHrdNecessity
          value={makeValue({
            recommendations: [
              { id: 'rec3', rank: 1, program: 'A', proposal: '' },
              { id: 'rec4', rank: 2, program: 'B', proposal: '' },
            ],
          })}
          onChange={onChange}
        />
      );
      await user.click(screen.getByRole('button', { name: '추천 1 삭제' }));
      const last = onChange.mock.calls[onChange.mock.calls.length - 1][0];
      expect(last.recommendations).toHaveLength(1);
    });
  });

  describe('빈 상태 표시', () => {
    it('훈련 이력이 없으면 안내 메시지 표시', () => {
      render(<StepPBLHrdNecessity value={makeValue()} onChange={vi.fn()} />);
      expect(screen.getByText('등록된 훈련 이력이 없습니다.')).toBeInTheDocument();
    });

    it('지원 이력이 없으면 안내 메시지 표시', () => {
      render(<StepPBLHrdNecessity value={makeValue()} onChange={vi.fn()} />);
      expect(screen.getByText('등록된 지원 이력이 없습니다.')).toBeInTheDocument();
    });

    it('추천 과정이 없으면 안내 메시지 표시', () => {
      render(<StepPBLHrdNecessity value={makeValue()} onChange={vi.fn()} />);
      expect(screen.getByText('등록된 추천 과정이 없습니다.')).toBeInTheDocument();
    });
  });
});
