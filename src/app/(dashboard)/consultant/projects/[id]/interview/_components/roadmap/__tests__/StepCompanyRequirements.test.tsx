import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { StepCompanyRequirements } from '../StepCompanyRequirements';
import type { RoadmapCompanyRequirements } from '@/lib/schemas/interview-roadmap';

function makeValue(
  over: Partial<RoadmapCompanyRequirements> = {},
): RoadmapCompanyRequirements {
  return { status: '', problem: '', will: '', outcomes: '', ...over };
}

describe('StepCompanyRequirements', () => {
  it('섹션 번호 / 제목 / 라벨 / 설명을 표시한다', () => {
    render(<StepCompanyRequirements value={makeValue()} onChange={() => {}} />);
    expect(screen.getByText('Ⅱ-2')).toBeInTheDocument();
    expect(screen.getByText('기업 요구분석')).toBeInTheDocument();
    expect(screen.getByText('[인터뷰 입력]')).toBeInTheDocument();
    expect(screen.getByText(/기업의 내부전문가와 면담/)).toBeInTheDocument();
  });

  it('4개 구분 행(기업 현황·주요 문제·추진 의지·기대 성과)을 모두 렌더한다', () => {
    render(<StepCompanyRequirements value={makeValue()} onChange={() => {}} />);
    expect(screen.getByRole('rowheader', { name: '기업 현황' })).toBeInTheDocument();
    expect(screen.getByRole('rowheader', { name: '주요 문제' })).toBeInTheDocument();
    expect(screen.getByRole('rowheader', { name: '추진 의지' })).toBeInTheDocument();
    expect(screen.getByRole('rowheader', { name: '기대 성과' })).toBeInTheDocument();
  });

  it('헤더 행(구분 | 확인 내용 | 비고)이 렌더된다', () => {
    render(<StepCompanyRequirements value={makeValue()} onChange={() => {}} />);
    expect(screen.getByRole('columnheader', { name: '구분' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: '확인 내용' })).toBeInTheDocument();
    expect(
      screen.getByRole('columnheader', { name: /비고/ }),
    ).toBeInTheDocument();
  });

  it('value 의 각 필드가 해당 aria-label 의 textarea 에 반영된다', () => {
    render(
      <StepCompanyRequirements
        value={makeValue({
          status: '제조업',
          problem: '검사 지연',
          will: '전사 도입',
          outcomes: '불량률 감소',
        })}
        onChange={() => {}}
      />,
    );
    expect(screen.getByLabelText('기업 현황')).toHaveValue('제조업');
    expect(screen.getByLabelText('주요 문제')).toHaveValue('검사 지연');
    expect(screen.getByLabelText('추진 의지')).toHaveValue('전사 도입');
    expect(screen.getByLabelText('기대 성과')).toHaveValue('불량률 감소');
  });

  it('기업 현황 입력 시 onChange 가 status 필드만 갱신한 객체로 호출된다', () => {
    const onChange = vi.fn();
    render(
      <StepCompanyRequirements value={makeValue()} onChange={onChange} />,
    );
    fireEvent.change(screen.getByLabelText('기업 현황'), {
      target: { value: '반도체 제조' },
    });
    expect(onChange).toHaveBeenCalledWith({
      status: '반도체 제조',
      problem: '',
      will: '',
      outcomes: '',
    });
  });

  it('기대 성과 입력 시 기존 필드(status/problem/will) 를 보존한다', () => {
    const onChange = vi.fn();
    render(
      <StepCompanyRequirements
        value={makeValue({ status: 'A', problem: 'B', will: 'C' })}
        onChange={onChange}
      />,
    );
    fireEvent.change(screen.getByLabelText('기대 성과'), {
      target: { value: 'D' },
    });
    expect(onChange).toHaveBeenCalledWith({
      status: 'A',
      problem: 'B',
      will: 'C',
      outcomes: 'D',
    });
  });

  it('readOnly 이면 4개 textarea 가 모두 비활성화된다', () => {
    render(
      <StepCompanyRequirements value={makeValue()} onChange={() => {}} readOnly />,
    );
    expect(screen.getByLabelText('기업 현황')).toBeDisabled();
    expect(screen.getByLabelText('주요 문제')).toBeDisabled();
    expect(screen.getByLabelText('추진 의지')).toBeDisabled();
    expect(screen.getByLabelText('기대 성과')).toBeDisabled();
  });

  it('비고 입력란 4개를 렌더하고 입력 시 onChange.remarks 가 갱신된다 (#6 RED)', () => {
    const onChange = vi.fn();
    render(
      <StepCompanyRequirements value={makeValue()} onChange={onChange} />,
    );
    // 양식 비고 칼럼 = 사용자 입력란. 행마다 1개씩 총 4개.
    const statusRemarks = screen.getByLabelText('기업 현황 비고');
    expect(statusRemarks).toHaveValue('');
    fireEvent.change(statusRemarks, { target: { value: '특이사항-A' } });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        remarks: expect.objectContaining({ status: '특이사항-A' }),
      }),
    );

    expect(screen.getByLabelText('주요 문제 비고')).toBeInTheDocument();
    expect(screen.getByLabelText('추진 의지 비고')).toBeInTheDocument();
    expect(screen.getByLabelText('기대 성과 비고')).toBeInTheDocument();
  });

  it('value.remarks 가 주어지면 비고 textarea 에 반영된다', () => {
    render(
      <StepCompanyRequirements
        value={makeValue({
          remarks: {
            status: 'r-status',
            problem: 'r-problem',
            will: 'r-will',
            outcomes: 'r-outcomes',
          },
        })}
        onChange={() => {}}
      />,
    );
    expect(screen.getByLabelText('기업 현황 비고')).toHaveValue('r-status');
    expect(screen.getByLabelText('주요 문제 비고')).toHaveValue('r-problem');
    expect(screen.getByLabelText('추진 의지 비고')).toHaveValue('r-will');
    expect(screen.getByLabelText('기대 성과 비고')).toHaveValue('r-outcomes');
  });

  it('readOnly 이면 비고 textarea 4개도 비활성화된다', () => {
    render(
      <StepCompanyRequirements value={makeValue()} onChange={() => {}} readOnly />,
    );
    expect(screen.getByLabelText('기업 현황 비고')).toBeDisabled();
    expect(screen.getByLabelText('주요 문제 비고')).toBeDisabled();
    expect(screen.getByLabelText('추진 의지 비고')).toBeDisabled();
    expect(screen.getByLabelText('기대 성과 비고')).toBeDisabled();
  });
});
