import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import {
  StepCompetencyModeling,
  type StepCompetencyModelingValue,
} from '../StepCompetencyModeling';
import type { RoadmapCompetency } from '@/lib/schemas/interview-roadmap';

function emptyCompetency(
  over: Partial<RoadmapCompetency> = {},
): RoadmapCompetency {
  return {
    name: '',
    definition: '',
    knowledge: '',
    skill: '',
    attitude: '',
    ...over,
  };
}

function makeValue(
  over: Partial<StepCompetencyModelingValue> = {},
): StepCompetencyModelingValue {
  return {
    competencies: [],
    ncsUsed: false,
    ncsMethodology: undefined,
    ncsDerivationMethod: undefined,
    ...over,
  };
}

describe('StepCompetencyModeling', () => {
  it('섹션 머리글(Ⅲ-1 · [인터뷰 입력 → 결과 페이지])을 표시한다', () => {
    render(<StepCompetencyModeling value={makeValue()} onChange={() => {}} />);
    expect(screen.getByText('Ⅲ-1')).toBeInTheDocument();
    expect(screen.getByText('역량 모델링')).toBeInTheDocument();
    expect(screen.getByText('[인터뷰 입력 → 결과 페이지]')).toBeInTheDocument();
  });

  it('competencies 가 빈 배열이면 기본 4행을 렌더한다', () => {
    render(<StepCompetencyModeling value={makeValue()} onChange={() => {}} />);
    for (let i = 1; i <= 4; i += 1) {
      expect(screen.getByLabelText(`역량명 ${i}`)).toBeInTheDocument();
    }
  });

  it('value.competencies 가 있으면 해당 행만 렌더한다', () => {
    render(
      <StepCompetencyModeling
        value={makeValue({
          competencies: [
            emptyCompetency({ name: 'AI 리터러시' }),
            emptyCompetency({ name: '데이터 분석' }),
          ],
        })}
        onChange={() => {}}
      />,
    );
    expect(screen.getByLabelText('역량명 1')).toHaveValue('AI 리터러시');
    expect(screen.getByLabelText('역량명 2')).toHaveValue('데이터 분석');
    expect(screen.queryByLabelText('역량명 3')).not.toBeInTheDocument();
  });

  it('"역량 추가" 클릭 시 +1 행이 append 된 상태로 onChange 가 호출된다', () => {
    const onChange = vi.fn();
    render(
      <StepCompetencyModeling
        value={makeValue({
          competencies: [emptyCompetency({ name: 'A' })],
        })}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByLabelText('역량 추가'));
    const call = onChange.mock.calls[0][0] as StepCompetencyModelingValue;
    expect(call.competencies).toHaveLength(2);
    expect(call.competencies[0].name).toBe('A');
  });

  it('"역량 삭제" 클릭 시 해당 행이 제거된 상태로 onChange 가 호출된다', () => {
    const onChange = vi.fn();
    render(
      <StepCompetencyModeling
        value={makeValue({
          competencies: [
            emptyCompetency({ name: 'A' }),
            emptyCompetency({ name: 'B' }),
            emptyCompetency({ name: 'C' }),
          ],
        })}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByLabelText('역량 삭제 2'));
    const call = onChange.mock.calls[0][0] as StepCompetencyModelingValue;
    expect(call.competencies).toHaveLength(2);
    expect(call.competencies.map((c) => c.name)).toEqual(['A', 'C']);
  });

  it('마지막 1행만 남으면 "역량 삭제" 버튼이 비활성화된다 (스키마 min(1))', () => {
    render(
      <StepCompetencyModeling
        value={makeValue({
          competencies: [emptyCompetency({ name: '유일' })],
        })}
        onChange={() => {}}
      />,
    );
    expect(screen.getByLabelText('역량 삭제 1')).toBeDisabled();
  });

  it('역량 셀 입력 시 해당 셀만 갱신된 onChange 가 호출된다', () => {
    const onChange = vi.fn();
    render(
      <StepCompetencyModeling
        value={makeValue({
          competencies: [emptyCompetency(), emptyCompetency()],
        })}
        onChange={onChange}
      />,
    );
    fireEvent.change(screen.getByLabelText('역량 정의 2'), {
      target: { value: 'AI 활용 수행준거' },
    });
    const call = onChange.mock.calls[0][0] as StepCompetencyModelingValue;
    expect(call.competencies[0].definition).toBe('');
    expect(call.competencies[1].definition).toBe('AI 활용 수행준거');
  });

  it('ncsUsed=false 기본값일 때 "역량별 도출 방법" 박스를 렌더한다', () => {
    render(<StepCompetencyModeling value={makeValue()} onChange={() => {}} />);
    expect(screen.getByLabelText('역량별 도출 방법')).toBeInTheDocument();
    expect(screen.queryByLabelText('NCS 활용 방법')).not.toBeInTheDocument();
  });

  it('ncsUsed=true 일 때 "NCS 활용 방법" 박스를 렌더한다', () => {
    render(
      <StepCompetencyModeling
        value={makeValue({ ncsUsed: true })}
        onChange={() => {}}
      />,
    );
    expect(screen.getByLabelText('NCS 활용 방법')).toBeInTheDocument();
    expect(screen.queryByLabelText('역량별 도출 방법')).not.toBeInTheDocument();
  });

  it('NCS 활용 토글 클릭 시 ncsUsed=true 로 변경되고 ncsDerivationMethod 는 undefined 로 리셋된다', () => {
    const onChange = vi.fn();
    render(
      <StepCompetencyModeling
        value={makeValue({
          ncsUsed: false,
          ncsDerivationMethod: '기존 서술',
        })}
        onChange={onChange}
      />,
    );
    // FormCheckbox 는 label text 가 <span> 으로 렌더되므로 getByText 사용
    fireEvent.click(screen.getByText('NCS 활용'));
    const call = onChange.mock.calls[0][0] as StepCompetencyModelingValue;
    expect(call.ncsUsed).toBe(true);
    expect(call.ncsDerivationMethod).toBeUndefined();
  });

  it('NCS 미활용 토글 클릭 시 ncsUsed=false 로 변경되고 ncsMethodology 는 undefined 로 리셋된다', () => {
    const onChange = vi.fn();
    render(
      <StepCompetencyModeling
        value={makeValue({
          ncsUsed: true,
          ncsMethodology: '기존 NCS 활용 방법',
        })}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByText('NCS 미활용'));
    const call = onChange.mock.calls[0][0] as StepCompetencyModelingValue;
    expect(call.ncsUsed).toBe(false);
    expect(call.ncsMethodology).toBeUndefined();
  });

  it('ncsUsed=true 일 때 NCS 활용 방법 입력 시 ncsMethodology 만 갱신된다', () => {
    const onChange = vi.fn();
    render(
      <StepCompetencyModeling
        value={makeValue({ ncsUsed: true })}
        onChange={onChange}
      />,
    );
    fireEvent.change(screen.getByLabelText('NCS 활용 방법'), {
      target: { value: 'NCS 2001070605 를 참고하여...' },
    });
    const call = onChange.mock.calls[0][0] as StepCompetencyModelingValue;
    expect(call.ncsMethodology).toBe('NCS 2001070605 를 참고하여...');
    expect(call.ncsDerivationMethod).toBeUndefined();
  });

  it('ncsUsed=false 일 때 역량별 도출 방법 입력 시 ncsDerivationMethod 만 갱신된다', () => {
    const onChange = vi.fn();
    render(
      <StepCompetencyModeling
        value={makeValue({ ncsUsed: false })}
        onChange={onChange}
      />,
    );
    fireEvent.change(screen.getByLabelText('역량별 도출 방법'), {
      target: { value: '현장 인터뷰 기반 도출' },
    });
    const call = onChange.mock.calls[0][0] as StepCompetencyModelingValue;
    expect(call.ncsDerivationMethod).toBe('현장 인터뷰 기반 도출');
    expect(call.ncsMethodology).toBeUndefined();
  });

  it('readOnly 이면 행 추가·삭제 버튼, 역량 입력, NCS 토글이 모두 비활성화된다', () => {
    render(
      <StepCompetencyModeling
        value={makeValue({ competencies: [emptyCompetency()] })}
        onChange={() => {}}
        readOnly
      />,
    );
    expect(screen.getByLabelText('역량 추가')).toBeDisabled();
    expect(screen.getByLabelText('역량 삭제 1')).toBeDisabled();
    expect(screen.getByLabelText('역량명 1')).toBeDisabled();
    expect(screen.getByLabelText('역량별 도출 방법')).toBeDisabled();
  });
});
