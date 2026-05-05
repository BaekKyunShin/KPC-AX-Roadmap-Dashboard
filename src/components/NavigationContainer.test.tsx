import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactElement } from 'react';

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockGetCachedProfile = vi.fn();
vi.mock('@/lib/supabase/cached', () => ({
  getCachedProfile: () => mockGetCachedProfile(),
}));

// Navigation 컴포넌트는 client component이고 의존성이 많아 mock으로 대체.
// NavigationContainer의 책임은 profile 분기와 prop 전달이므로 그 정도만 검증.
vi.mock('./Navigation', () => ({
  default: vi.fn((props: { user: unknown }) => ({
    type: 'Navigation',
    props,
  })),
}));

// ─── Import ─────────────────────────────────────────────────────────────────

import NavigationContainer from './NavigationContainer';

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('NavigationContainer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('profile이 null이면 null을 반환한다 (middleware가 redirect 처리)', async () => {
    mockGetCachedProfile.mockResolvedValue(null);
    const result = await NavigationContainer();
    expect(result).toBeNull();
  });

  it('profile이 있으면 Navigation 컴포넌트를 렌더한다', async () => {
    const mockProfile = {
      id: 'u1',
      name: 'Tester',
      email: 't@example.com',
      role: 'CONSULTANT_APPROVED',
      status: 'ACTIVE',
      email_notify_enabled: true,
      created_at: '2026-01-01',
      updated_at: '2026-01-01',
    };
    mockGetCachedProfile.mockResolvedValue(mockProfile);
    const result = (await NavigationContainer()) as ReactElement | null;
    expect(result).not.toBeNull();
    // Navigation의 props.user에 profile이 그대로 전달되는지 확인
    expect(result?.props).toEqual({ user: mockProfile });
  });

  it('getCachedProfile이 한 번만 호출된다 (React.cache 의존)', async () => {
    mockGetCachedProfile.mockResolvedValue(null);
    await NavigationContainer();
    expect(mockGetCachedProfile).toHaveBeenCalledTimes(1);
  });
});
