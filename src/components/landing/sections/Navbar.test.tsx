import { describe, it, expect } from 'vitest';
import { resolveDashboardHref } from './Navbar';

/**
 * Navbar 서버 컴포넌트의 역할별 대시보드 경로 분기 헬퍼 검증.
 *
 * 회귀 방지 컨텍스트: /dashboard 서버 redirect 체인이 Next.js 16 의 내부
 * Router 가 mpaNavigation 조건부 throw 로 hook 개수 mismatch 를 일으키는
 * 경로를 트리거할 수 있다. 역할이 확실한 사용자는 redirect 를 거치지 않고
 * 목적지로 직접 링크해야 한다.
 */
describe('resolveDashboardHref', () => {
  it('OPS_ADMIN 은 /ops/projects 로 직접 링크된다', () => {
    expect(resolveDashboardHref('OPS_ADMIN')).toBe('/ops/projects');
  });

  it('SYSTEM_ADMIN 은 /ops/projects 로 직접 링크된다', () => {
    expect(resolveDashboardHref('SYSTEM_ADMIN')).toBe('/ops/projects');
  });

  it('CONSULTANT_APPROVED 는 /consultant/home 으로 직접 링크된다', () => {
    expect(resolveDashboardHref('CONSULTANT_APPROVED')).toBe('/consultant/home');
  });

  it('USER_PENDING 은 /dashboard 로 링크된다 (PendingApprovalCard 렌더링 필요)', () => {
    expect(resolveDashboardHref('USER_PENDING')).toBe('/dashboard');
  });

  it('OPS_ADMIN_PENDING 은 /dashboard 로 링크된다 (PendingApprovalCard 렌더링 필요)', () => {
    expect(resolveDashboardHref('OPS_ADMIN_PENDING')).toBe('/dashboard');
  });

  it('profile 미조회(undefined) 시 안전 기본값 /dashboard 로 링크된다', () => {
    expect(resolveDashboardHref(undefined)).toBe('/dashboard');
  });

  it('profile.role 이 null 인 경우에도 안전 기본값 /dashboard 로 링크된다', () => {
    expect(resolveDashboardHref(null)).toBe('/dashboard');
  });

  it('알 수 없는 역할 문자열에도 안전 기본값 /dashboard 로 링크된다', () => {
    expect(resolveDashboardHref('UNKNOWN_FUTURE_ROLE')).toBe('/dashboard');
  });
});
