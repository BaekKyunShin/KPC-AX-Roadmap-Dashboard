import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PBLPerformanceMetrics } from './PBLPerformanceMetrics';
import type { PBLPerformanceAnalysis } from '@/lib/services/pbl';

function base(): PBLPerformanceAnalysis {
  return {
    training_goal_categories: ['불량률 감소'],
    quantitative_metrics: ['불량률 15% 감소'],
    qualitative_metrics: ['문제해결 역량 향상'],
    internalization_plan: ['매뉴얼 제작'],
    dissemination_plan: ['성과 발표회'],
  };
}

describe('PBLPerformanceMetrics', () => {
  it('훈련 목표 분류 5종 체크박스 표시', () => {
    render(<PBLPerformanceMetrics canEdit={true} value={base()} onChange={() => {}} />);
    for (const label of [
      '기술문제 해결',
      '공정 최적화',
      '불량률 감소',
      '기술 매뉴얼 개발',
      '기타',
    ]) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
  });

  it('체크박스 클릭 시 training_goal_categories 업데이트', () => {
    const onChange = vi.fn();
    render(<PBLPerformanceMetrics canEdit={true} value={base()} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('공정 최적화'));
    expect(onChange).toHaveBeenCalled();
    const next = onChange.mock.calls[0][0] as PBLPerformanceAnalysis;
    expect(next.training_goal_categories).toContain('공정 최적화');
  });

  it('정량 textarea 편집 시 bullet 배열로 반환', () => {
    const onChange = vi.fn();
    render(<PBLPerformanceMetrics canEdit={true} value={base()} onChange={onChange} />);
    const textarea = screen.getByLabelText('정량') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: '불량률 20% 감소\n처리시간 30% 단축' } });
    const next = onChange.mock.calls[0][0] as PBLPerformanceAnalysis;
    expect(next.quantitative_metrics).toEqual(['불량률 20% 감소', '처리시간 30% 단축']);
  });

  it('canEdit=false이면 체크박스 클릭 시 onChange가 호출되지 않는다', () => {
    // Line 61: if (!canEdit) return → true 분기 커버
    const onChange = vi.fn();
    render(<PBLPerformanceMetrics canEdit={false} value={base()} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('공정 최적화'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('이미 선택된 카테고리를 체크 해제하면 목록에서 제거된다', () => {
    // Line 62: checked=false → filter() 분기 커버
    const onChange = vi.fn();
    // base()에는 '불량률 감소'가 이미 포함됨
    render(<PBLPerformanceMetrics canEdit={true} value={base()} onChange={onChange} />);
    // '불량률 감소'를 클릭하면 체크 해제 (이미 선택된 상태이므로 unchecked)
    fireEvent.click(screen.getByLabelText('불량률 감소'));
    expect(onChange).toHaveBeenCalled();
    const next = onChange.mock.calls[0][0] as PBLPerformanceAnalysis;
    expect(next.training_goal_categories).not.toContain('불량률 감소');
  });
});
