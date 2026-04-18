import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PBLOperationGoal } from './PBLOperationGoal';

describe('PBLOperationGoal', () => {
  it('읽기 모드에서는 값을 일반 텍스트로 노출', () => {
    render(<PBLOperationGoal canEdit={false} value="공정 불량률 감소" onChange={() => {}} />);
    expect(screen.getByText('공정 불량률 감소')).toBeInTheDocument();
  });

  it('읽기 모드 + 빈 값 → "-"', () => {
    render(<PBLOperationGoal canEdit={false} value="" onChange={() => {}} />);
    expect(screen.getByText('-')).toBeInTheDocument();
  });

  it('편집 모드에서는 textarea 노출 + onChange 콜백', () => {
    const onChange = vi.fn();
    render(<PBLOperationGoal canEdit={true} value="목표" onChange={onChange} />);
    const ta = screen.getByLabelText('훈련 목표') as HTMLTextAreaElement;
    fireEvent.change(ta, { target: { value: '새 목표' } });
    expect(onChange).toHaveBeenCalledWith('새 목표');
  });
});
