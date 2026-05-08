import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { StepPerformanceActivities } from '../StepPerformanceActivities';
import type { RoadmapPerformanceActivity } from '@/lib/schemas/interview-roadmap';

function emptyActivity(
  over: Partial<RoadmapPerformanceActivity> = {},
): RoadmapPerformanceActivity {
  return {
    round: 1,
    date: '',
    timeRange: '',
    content: '',
    method: 'ONSITE',
    pmName: '',
    expertName: '',
    ...over,
  };
}

describe('StepPerformanceActivities', () => {
  it('섹션 머리글(Ⅰ-2 · [인터뷰 입력])을 표시한다', () => {
    render(<StepPerformanceActivities value={[]} onChange={() => {}} />);
    expect(screen.getByText('Ⅰ-2')).toBeInTheDocument();
    expect(screen.getByText('주요 활동')).toBeInTheDocument();
    expect(screen.getByText('[인터뷰 입력]')).toBeInTheDocument();
  });

  it('빈 배열일 때 기본 3차수(1·2·3차)를 렌더한다', () => {
    render(<StepPerformanceActivities value={[]} onChange={() => {}} />);
    expect(screen.getByText('1차')).toBeInTheDocument();
    expect(screen.getByText('2차')).toBeInTheDocument();
    expect(screen.getByText('3차')).toBeInTheDocument();
  });

  it('각 차수 셀(차수·일시·내용·방법)은 rowSpan=2 로 병합된다', () => {
    render(<StepPerformanceActivities value={[]} onChange={() => {}} />);
    const round = screen.getByText('1차');
    expect(round.tagName).toBe('TH');
    expect(round.getAttribute('rowspan')).toBe('2');
  });

  it('각 차수는 참석자 2명(PM · 내부전문가)을 별도 행으로 렌더한다', () => {
    render(<StepPerformanceActivities value={[]} onChange={() => {}} />);
    // 3 차수 × 2 역할(PM·내부전문가) = 6 셀
    expect(screen.getAllByText('컨설팅책임자(PM)')).toHaveLength(3);
    expect(screen.getAllByText('기업 내부전문가')).toHaveLength(3);
  });

  it('value 가 주어지면 해당 차수 개수만 렌더한다 (기본 프리필 덮어쓰기 금지)', () => {
    render(
      <StepPerformanceActivities
        value={[
          emptyActivity({ round: 1, pmName: '홍길동' }),
          emptyActivity({ round: 2, pmName: '김철수' }),
        ]}
        onChange={() => {}}
      />,
    );
    expect(screen.getByText('1차')).toBeInTheDocument();
    expect(screen.getByText('2차')).toBeInTheDocument();
    expect(screen.queryByText('3차')).not.toBeInTheDocument();
    expect(screen.getByLabelText('1차 PM 성명')).toHaveValue('홍길동');
    expect(screen.getByLabelText('2차 PM 성명')).toHaveValue('김철수');
  });

  it('"차수 추가" 클릭 시 +1 차수 append 된 상태로 onChange 가 호출된다', () => {
    const onChange = vi.fn();
    render(
      <StepPerformanceActivities
        value={[emptyActivity({ round: 1 })]}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByLabelText('차수 추가'));
    expect(onChange).toHaveBeenCalledTimes(1);
    const call = onChange.mock.calls[0][0] as RoadmapPerformanceActivity[];
    expect(call).toHaveLength(2);
    expect(call[1].round).toBe(2);
  });

  it('기본 프리필 3차수 상태에서도 "차수 추가" 클릭 시 4차가 추가된다 (#4 RED — MAX_ROUNDS=5)', () => {
    const onChange = vi.fn();
    render(<StepPerformanceActivities value={[]} onChange={onChange} />);
    // value=[] → defaultRows() 가 1·2·3차 prefill 한 채 표시. 사용자가 "+ 차수 추가"
    // 클릭 시 4차가 append 되어 onChange 가 호출돼야 한다 (양식 prefill 보존 + 5차 한계).
    fireEvent.click(screen.getByLabelText('차수 추가'));
    expect(onChange).toHaveBeenCalledTimes(1);
    const call = onChange.mock.calls[0][0] as RoadmapPerformanceActivity[];
    expect(call).toHaveLength(4);
    expect(call[3].round).toBe(4);
  });

  it('4차 상태에서는 "차수 추가" 버튼이 여전히 활성화된다 (5차 한계)', () => {
    const fourRounds = [1, 2, 3, 4].map((r) => emptyActivity({ round: r }));
    render(
      <StepPerformanceActivities value={fourRounds} onChange={() => {}} />,
    );
    expect(screen.getByLabelText('차수 추가')).not.toBeDisabled();
  });

  it('5차까지 찼으면 "차수 추가" 버튼이 비활성화된다 (스키마 max(5))', () => {
    const fiveRounds = [1, 2, 3, 4, 5].map((r) => emptyActivity({ round: r }));
    render(
      <StepPerformanceActivities value={fiveRounds} onChange={() => {}} />,
    );
    expect(screen.getByLabelText('차수 추가')).toBeDisabled();
  });

  it('"차수 삭제" 클릭 → AlertDialog "삭제" 확인 후 onChange 호출 (#1 H5·H3 비가역 보호)', () => {
    const onChange = vi.fn();
    render(
      <StepPerformanceActivities
        value={[
          emptyActivity({ round: 1, pmName: 'A' }),
          emptyActivity({ round: 2, pmName: 'B' }),
          emptyActivity({ round: 3, pmName: 'C' }),
        ]}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByLabelText('차수 삭제 2'));
    // AlertDialog 노출 검증 + 삭제 확인
    expect(screen.getByText(/2차 행을 삭제하시겠습니까/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '삭제' }));
    const call = onChange.mock.calls[0][0] as RoadmapPerformanceActivity[];
    expect(call).toHaveLength(2);
    expect(call.map((r) => r.pmName)).toEqual(['A', 'C']);
  });

  it('"차수 삭제" → AlertDialog "취소" 클릭 시 onChange 미호출 (행 보존)', () => {
    const onChange = vi.fn();
    render(
      <StepPerformanceActivities
        value={[
          emptyActivity({ round: 1, pmName: 'A' }),
          emptyActivity({ round: 2, pmName: 'B' }),
        ]}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByLabelText('차수 삭제 2'));
    fireEvent.click(screen.getByRole('button', { name: '취소' }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('마지막 1차수만 남으면 "차수 삭제" 버튼이 비활성화된다', () => {
    render(
      <StepPerformanceActivities
        value={[emptyActivity({ round: 1 })]}
        onChange={() => {}}
      />,
    );
    expect(screen.getByLabelText('차수 삭제 1')).toBeDisabled();
  });

  it('PM 성명 입력 시 해당 차수만 갱신된 onChange 가 호출된다', () => {
    const onChange = vi.fn();
    render(
      <StepPerformanceActivities
        value={[
          emptyActivity({ round: 1 }),
          emptyActivity({ round: 2 }),
        ]}
        onChange={onChange}
      />,
    );
    fireEvent.change(screen.getByLabelText('2차 PM 성명'), {
      target: { value: '이영희' },
    });
    const call = onChange.mock.calls[0][0] as RoadmapPerformanceActivity[];
    expect(call[0].pmName).toBe('');
    expect(call[1].pmName).toBe('이영희');
  });

  it('수행 방법 select 는 4개 옵션(ONSITE/VIDEO/WORKSHOP/OTHER) 을 제공한다', () => {
    render(
      <StepPerformanceActivities
        value={[emptyActivity({ round: 1 })]}
        onChange={() => {}}
      />,
    );
    const select = screen.getByLabelText('1차 수행 방법') as HTMLSelectElement;
    expect(select.tagName).toBe('SELECT');
    const values = Array.from(select.options).map((o) => o.value);
    expect(values).toEqual(['ONSITE', 'VIDEO', 'WORKSHOP', 'OTHER']);
  });

  it('수행 방법 변경 시 onChange 가 method 필드를 갱신한다', () => {
    const onChange = vi.fn();
    render(
      <StepPerformanceActivities
        value={[emptyActivity({ round: 1, method: 'ONSITE' })]}
        onChange={onChange}
      />,
    );
    fireEvent.change(screen.getByLabelText('1차 수행 방법'), {
      target: { value: 'VIDEO' },
    });
    const call = onChange.mock.calls[0][0] as RoadmapPerformanceActivity[];
    expect(call[0].method).toBe('VIDEO');
  });

  it('readOnly 이면 차수 추가·삭제 버튼과 입력 필드가 비활성화된다', () => {
    render(
      <StepPerformanceActivities
        value={[emptyActivity({ round: 1 })]}
        onChange={() => {}}
        readOnly
      />,
    );
    expect(screen.getByLabelText('차수 추가')).toBeDisabled();
    expect(screen.getByLabelText('차수 삭제 1')).toBeDisabled();
    expect(screen.getByLabelText('1차 PM 성명')).toBeDisabled();
  });
});
