import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PBLToolUsagePlan } from './PBLToolUsagePlan';

const threeStages = [
  { stage: '1단계', main_activity: '훈련', ai_tools: ['ChatGPT'], utilized_data: 'd', purpose: 'p', specific_method: 'm' },
  { stage: '2단계', main_activity: '리뷰', ai_tools: ['Cursor'], utilized_data: 'd', purpose: 'p', specific_method: 'm' },
  { stage: '3단계', main_activity: '평가', ai_tools: ['ChatGPT'], utilized_data: 'd', purpose: 'p', specific_method: 'm' },
];

describe('PBLToolUsagePlan', () => {
  it('3단계 이상이면 경고 배너를 보이지 않는다', () => {
    render(<PBLToolUsagePlan canEdit={false} value={threeStages} onChange={() => {}} />);
    expect(screen.queryByText(/최소 3단계/)).not.toBeInTheDocument();
  });

  it('2단계 이하이면 경고 배너 표시', () => {
    render(<PBLToolUsagePlan canEdit={true} value={threeStages.slice(0, 2)} onChange={() => {}} />);
    expect(screen.getByText(/최소 3단계/)).toBeInTheDocument();
  });

  it('canEdit=true이면 "단계 추가" 버튼 클릭 시 onChange 호출', () => {
    const onChange = vi.fn();
    render(<PBLToolUsagePlan canEdit={true} value={threeStages} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /단계 추가/ }));
    expect(onChange).toHaveBeenCalled();
    const next = onChange.mock.calls[0][0] as unknown[];
    expect(next.length).toBe(4);
  });

  it('삭제 버튼 클릭 시 해당 행 제거', () => {
    const onChange = vi.fn();
    render(<PBLToolUsagePlan canEdit={true} value={threeStages} onChange={onChange} />);
    const deleteButton = screen.getAllByRole('button', { name: /삭제/ })[0];
    fireEvent.click(deleteButton);
    expect(onChange).toHaveBeenCalled();
    const next = onChange.mock.calls[0][0] as unknown[];
    expect(next.length).toBe(2);
  });
});
