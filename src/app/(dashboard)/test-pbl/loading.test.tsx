import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Loading from './loading';

describe('test-pbl/loading.tsx', () => {
  it('잘못된 안내 문구 ("샘플 PBL 인터뷰 데이터로 PBL 보고서 생성을 연습합니다")를 노출하지 않는다', () => {
    const { container } = render(<Loading />);
    expect(container.textContent ?? '').not.toContain(
      '샘플 PBL 인터뷰 데이터로 PBL 보고서 생성을 연습합니다',
    );
  });

  it('"테스트 모드 안내" 정적 텍스트를 노출하지 않는다 (실제 페이지 안내문과 다름)', () => {
    const { container } = render(<Loading />);
    expect(container.textContent ?? '').not.toContain('테스트 모드 안내');
  });

  it('animate-shimmer 스켈레톤 요소를 포함한다', () => {
    const { container } = render(<Loading />);
    expect(container.querySelector('.animate-shimmer')).toBeInTheDocument();
  });

  it('인터뷰 폼 단일 단계 영역(min-h-[400px])을 미러링한다', () => {
    const { container } = render(<Loading />);
    expect(container.querySelector('.min-h-\\[400px\\]')).toBeInTheDocument();
  });
});
