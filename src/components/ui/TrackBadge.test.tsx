import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TrackBadge } from './TrackBadge';

describe('TrackBadge', () => {
  it('ROADMAP 트랙 — 라벨 "로드맵" + blue 색상 클래스', () => {
    render(<TrackBadge track="ROADMAP" />);
    const badge = screen.getByTestId('track-badge');
    expect(badge).toHaveTextContent('로드맵');
    expect(badge.className).toMatch(/bg-blue-100/);
    expect(badge.className).toMatch(/text-blue-800/);
  });

  it('PBL 트랙 — 라벨 "PBL" + purple 색상 클래스', () => {
    render(<TrackBadge track="PBL" />);
    const badge = screen.getByTestId('track-badge');
    expect(badge).toHaveTextContent('PBL');
    expect(badge.className).toMatch(/bg-purple-100/);
    expect(badge.className).toMatch(/text-purple-800/);
  });

  it('data-track 속성으로 트랙 구분 가능', () => {
    const { rerender } = render(<TrackBadge track="ROADMAP" />);
    expect(screen.getByTestId('track-badge').getAttribute('data-track')).toBe('ROADMAP');
    rerender(<TrackBadge track="PBL" />);
    expect(screen.getByTestId('track-badge').getAttribute('data-track')).toBe('PBL');
  });

  it('size=sm 일 때 작은 텍스트 적용', () => {
    render(<TrackBadge track="ROADMAP" size="sm" />);
    const badge = screen.getByTestId('track-badge');
    expect(badge.className).toMatch(/text-\[10px\]/);
  });

  it('className prop 머지', () => {
    render(<TrackBadge track="ROADMAP" className="custom-x" />);
    expect(screen.getByTestId('track-badge').className).toMatch(/custom-x/);
  });
});
