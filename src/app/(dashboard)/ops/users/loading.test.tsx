import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Loading from './loading';

describe('ops/users/loading.tsx', () => {
  it('헤더 description이 실제 페이지와 일치한다', () => {
    const { container } = render(<Loading />);
    const text = container.textContent ?? '';
    // 실제 page.tsx의 PAGE_DESCRIPTION 과 동일해야 함
    expect(text).toContain('운영관리자·시스템관리자 본인 정보와 컨설턴트 승인/정지 상태를 관리합니다.');
  });

  it('잘못된 이전 description ("컨설턴트 승인/정지 및 상태를 관리합니다.")을 노출하지 않는다', () => {
    const { container } = render(<Loading />);
    expect(container.textContent ?? '').not.toContain(
      '컨설턴트 승인/정지 및 상태를 관리합니다.',
    );
  });

  it('animate-shimmer 스켈레톤 요소를 포함한다', () => {
    const { container } = render(<Loading />);
    expect(container.querySelector('.animate-shimmer')).toBeInTheDocument();
  });
});
