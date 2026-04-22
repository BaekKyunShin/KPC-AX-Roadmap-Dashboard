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

  it('일반 string 항목은 ul.list-disc 안에 li 로 렌더된다', () => {
    render(<GuideNote items={['일반 항목']} />);
    const list = screen.getByRole('list');
    expect(list.tagName).toBe('UL');
    expect(list.className).toContain('list-disc');
    const item = screen.getByText('일반 항목');
    expect(item.tagName).toBe('LI');
    // 일반 항목은 부가설명 클래스가 없어야 함
    expect(item.className).not.toContain('list-none');
    expect(item.className).not.toContain('text-muted-foreground');
    expect(item.className).toContain('pl-1');
  });

  it('※ prefix string 항목은 작은 글자 + 회색 + bullet 제거 + 들여쓰기 클래스가 적용된다', () => {
    render(<GuideNote items={['※ 부가 설명']} />);
    const item = screen.getByText('※ 부가 설명');
    expect(item.tagName).toBe('LI');
    expect(item.className).toContain('text-xs');
    expect(item.className).toContain('text-muted-foreground');
    expect(item.className).toContain('list-none');
    expect(item.className).toContain('pl-3');
    expect(item.className).toContain('-ml-2');
  });

  it('※ 분기는 string 일 때만 동작 — ReactNode 항목은 일반 li 로 렌더된다', () => {
    render(
      <GuideNote
        items={[<span key="x">※ 가짜 prefix (ReactNode)</span>]}
      />
    );
    // ReactNode 자체에는 부가설명 클래스가 적용되지 않아야 함 → 부모 li 가 일반 클래스
    const item = screen.getByText('※ 가짜 prefix (ReactNode)').closest('li');
    expect(item).not.toBeNull();
    expect(item!.className).toContain('pl-1');
    expect(item!.className).not.toContain('list-none');
    expect(item!.className).not.toContain('text-muted-foreground');
  });
});
