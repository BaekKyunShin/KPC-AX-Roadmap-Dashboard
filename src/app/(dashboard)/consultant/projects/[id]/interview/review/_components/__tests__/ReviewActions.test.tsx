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

  // #4 — 분리 카드형 레이아웃: 헤딩(h3) + 설명(p) + 우측 정렬 CTA 그룹
  it('헤딩과 설명이 분리되어 있고 CTA 그룹이 우측 정렬 컨테이너에 묶인다', () => {
    render(<ReviewActions projectId="p-1" track="ROADMAP" />);
    expect(
      screen.getByRole('heading', { level: 3, name: /검토를 마치셨나요/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/표 행 추가·삭제 등 본격 편집은 인터뷰 페이지에서/),
    ).toBeInTheDocument();
    const ctaGroup = screen.getByTestId('review-cta-group');
    expect(ctaGroup.className).toMatch(/justify-end/);
    expect(ctaGroup).toContainElement(
      screen.getByTestId('review-cta-back-to-interview'),
    );
    expect(ctaGroup).toContainElement(
      screen.getByTestId('review-cta-go-to-result'),
    );
  });
});
