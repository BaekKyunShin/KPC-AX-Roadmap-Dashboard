import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Loading from './loading';

describe('assessment/[token]/loading.tsx', () => {
  it('실제 PublicAssessmentClient와 동일한 헤더 제목·설명을 즉시 노출한다 (A안)', () => {
    const { container } = render(<Loading />);
    const text = container.textContent ?? '';
    expect(text).toContain('AI 훈련 수준 자가진단');
    expect(text).toContain('귀사의 AI 활용 현황을 파악하기 위한 진단입니다.');
  });

  it('animate-shimmer 본문 스켈레톤 요소를 포함한다', () => {
    const { container } = render(<Loading />);
    expect(container.querySelector('.animate-shimmer')).toBeInTheDocument();
  });

  it('실제 페이지 레이아웃을 미러링하는 max-w-lg 컨테이너를 갖는다', () => {
    const { container } = render(<Loading />);
    expect(container.querySelector('.max-w-lg')).toBeInTheDocument();
  });
});
