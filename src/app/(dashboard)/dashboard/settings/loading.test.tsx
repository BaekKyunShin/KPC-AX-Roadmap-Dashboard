import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// PageHeader 의 backLink useBack:true 가 BackButton (useRouter) 을 사용 → 테스트 환경에 router context 필요
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    back: vi.fn(),
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
    forward: vi.fn(),
  }),
  usePathname: () => '/dashboard/settings',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
  redirect: vi.fn(),
  notFound: vi.fn(),
}));

import Loading from './loading';

describe('dashboard/settings/loading.tsx', () => {
  it('실제 page.tsx와 동일한 헤더 제목·설명·backLink를 즉시 노출한다 (A안)', () => {
    const { container } = render(<Loading />);
    const text = container.textContent ?? '';
    expect(text).toContain('계정 설정');
    expect(text).toContain('비밀번호 변경 및 계정 관리');
    expect(text).toContain('대시보드'); // backLink label
  });

  it('animate-shimmer 본문 스켈레톤 요소를 포함한다', () => {
    const { container } = render(<Loading />);
    expect(container.querySelector('.animate-shimmer')).toBeInTheDocument();
  });
});
