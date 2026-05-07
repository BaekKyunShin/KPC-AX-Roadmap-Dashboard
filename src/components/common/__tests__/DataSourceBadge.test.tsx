import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { DataSourceBadge } from '../DataSourceBadge';

describe('DataSourceBadge', () => {
  it('kind="user" 면 "사용자 입력" 텍스트와 slate 톤 색상', () => {
    const { container } = render(<DataSourceBadge kind="user" />);
    expect(screen.getByText('사용자 입력')).toBeInTheDocument();
    const badge = container.firstElementChild as HTMLElement;
    expect(badge.className).toContain('slate');
  });

  it('kind="ai" 면 "AI 생성" 텍스트와 indigo 톤 색상', () => {
    const { container } = render(<DataSourceBadge kind="ai" />);
    expect(screen.getByText('AI 생성')).toBeInTheDocument();
    const badge = container.firstElementChild as HTMLElement;
    expect(badge.className).toContain('indigo');
  });

  it('kind="mixed" 면 "혼합" 텍스트와 amber 톤 색상', () => {
    const { container } = render(<DataSourceBadge kind="mixed" />);
    expect(screen.getByText('혼합')).toBeInTheDocument();
    const badge = container.firstElementChild as HTMLElement;
    expect(badge.className).toContain('amber');
  });

  it('aria-label 로 데이터 출처를 명시한다 (스크린 리더 접근성)', () => {
    render(<DataSourceBadge kind="user" />);
    expect(screen.getByLabelText(/사용자 입력/)).toBeInTheDocument();
  });

  it('추가 className 을 합성한다', () => {
    const { container } = render(<DataSourceBadge kind="ai" className="ml-2" />);
    const badge = container.firstElementChild as HTMLElement;
    expect(badge.className).toContain('ml-2');
  });

  it('작은 폰트 크기(text-[10px] 또는 text-[11px]) 를 가진다 (요구 — "너무 크지 않게")', () => {
    const { container } = render(<DataSourceBadge kind="user" />);
    const badge = container.firstElementChild as HTMLElement;
    expect(/text-\[1[01]px\]/.test(badge.className)).toBe(true);
  });
});
