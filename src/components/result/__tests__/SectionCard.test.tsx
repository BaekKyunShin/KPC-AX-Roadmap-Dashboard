import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SectionCard } from '../SectionCard';

describe('SectionCard', () => {
  it('title 과 children 을 렌더한다', () => {
    render(<SectionCard title="Ⅰ-1 수립 필요성">컨텐츠</SectionCard>);
    expect(
      screen.getByRole('heading', { name: 'Ⅰ-1 수립 필요성' }),
    ).toBeInTheDocument();
    expect(screen.getByText('컨텐츠')).toBeInTheDocument();
  });

  it('description 이 있으면 부제로 렌더된다', () => {
    render(
      <SectionCard title="제목" description="부제 설명">
        x
      </SectionCard>,
    );
    expect(screen.getByText('부제 설명')).toBeInTheDocument();
  });

  it('actions slot 을 우측 상단에 렌더한다', () => {
    render(
      <SectionCard title="제목" actions={<button>재생성</button>}>
        x
      </SectionCard>,
    );
    expect(
      screen.getByRole('button', { name: '재생성' }),
    ).toBeInTheDocument();
  });

  it('className 이 root 에 cn() 으로 합성된다', () => {
    const { container } = render(
      <SectionCard title="x" className="bg-red-100">
        y
      </SectionCard>,
    );
    const root = container.firstChild as HTMLElement;
    expect(root.className).toMatch(/rounded-lg/);
    expect(root.className).toMatch(/border/);
    expect(root.className).toMatch(/p-6/);
    expect(root.className).toMatch(/bg-red-100/);
  });
});
