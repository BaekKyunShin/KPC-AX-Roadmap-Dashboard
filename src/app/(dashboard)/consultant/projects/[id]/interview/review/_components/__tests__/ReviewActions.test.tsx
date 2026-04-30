import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReviewActions } from '../ReviewActions';

describe('ReviewActions', () => {
  it('로드맵 트랙 — "결과 페이지로 이동" 링크가 /roadmap 으로 향한다', () => {
    render(<ReviewActions projectId="p-1" track="ROADMAP" />);
    const goToResult = screen.getByTestId('review-cta-go-to-result');
    expect(goToResult).toHaveAttribute('href', '/consultant/projects/p-1/roadmap');
  });

  it('PBL 트랙 — "결과 페이지로 이동" 링크가 /pbl 으로 향한다', () => {
    render(<ReviewActions projectId="p-2" track="PBL" />);
    const goToResult = screen.getByTestId('review-cta-go-to-result');
    expect(goToResult).toHaveAttribute('href', '/consultant/projects/p-2/pbl');
  });

  it('"인터뷰 페이지로 돌아가기" 링크가 /interview 로 향한다 (트랙 무관)', () => {
    render(<ReviewActions projectId="p-3" track="ROADMAP" />);
    const back = screen.getByTestId('review-cta-back-to-interview');
    expect(back).toHaveAttribute('href', '/consultant/projects/p-3/interview');
  });
});
