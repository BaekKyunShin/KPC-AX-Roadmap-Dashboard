import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Loading from './loading';

describe('gallery/loading.tsx', () => {
  it('실제 page.tsx와 동일한 헤더 제목 "로드맵·PBL 갤러리"를 즉시 노출한다 (A안)', () => {
    const { container } = render(<Loading />);
    expect(container.textContent ?? '').toContain('로드맵·PBL 갤러리');
  });

  it('잘못된 헤더 텍스트 "로드맵 갤러리" (역할별 description 누락)는 노출하지 않는다', () => {
    // description 은 사용자 역할별로 다르므로 정적 노출 금지 — 회색 박스로 처리해야 함
    const { container } = render(<Loading />);
    const text = container.textContent ?? '';
    // page.tsx의 두 description 모두 정적 노출 금지 (사용자 역할별이라 알 수 없음)
    expect(text).not.toContain('모든 컨설턴트의 로드맵과 PBL 보고서를 열람');
    expect(text).not.toContain('다른 컨설턴트가 공유한 로드맵과 PBL 보고서를 탐색');
  });

  it('animate-shimmer 본문 스켈레톤 요소를 포함한다', () => {
    const { container } = render(<Loading />);
    expect(container.querySelector('.animate-shimmer')).toBeInTheDocument();
  });
});
