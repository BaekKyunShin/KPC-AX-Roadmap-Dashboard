import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GuideNote } from './guide-note';

describe('GuideNote', () => {
  it('기본 타이틀 "작성 가이드"와 번호 리스트를 렌더한다', () => {
    render(<GuideNote items={['가이드 항목 1', '가이드 항목 2']} />);
    expect(screen.getByText('작성 가이드')).toBeInTheDocument();
    expect(screen.getByText('가이드 항목 1')).toBeInTheDocument();
    expect(screen.getByText('가이드 항목 2')).toBeInTheDocument();
  });

  it('title prop이 있으면 커스텀 타이틀 렌더', () => {
    render(<GuideNote title="예시" items={['항목']} />);
    expect(screen.getByText('예시')).toBeInTheDocument();
  });

  it('items가 빈 배열이면 null 반환', () => {
    const { container } = render(<GuideNote items={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('role="note"와 aria-label 적용', () => {
    render(<GuideNote items={['x']} />);
    const note = screen.getByRole('note', { name: '작성 가이드' });
    expect(note).toBeInTheDocument();
  });
});
