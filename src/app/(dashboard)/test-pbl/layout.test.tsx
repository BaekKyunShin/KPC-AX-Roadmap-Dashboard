/**
 * test-pbl/layout.tsx 테스트 (#007 승인 대기 라우트 차단)
 *
 * 테스트 패턴 설명은 gallery/layout.test.tsx 주석 참고.
 * maxDuration 단언은 회귀 방지용 — 가드를 추가하며 이 export 가 사라지면
 * Vercel 에서 LLM 호출(최대 4분)이 기본 타임아웃에 걸린다.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { UserRole } from '@/types/database';

vi.mock('@/lib/supabase/cached', () => ({
  getCachedUser: vi.fn(),
  getCachedProfile: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn((target: string) => {
    throw new Error(`NEXT_REDIRECT:${target}`);
  }),
}));

import TestPBLLayout, { maxDuration } from './layout';
import { getCachedUser, getCachedProfile } from '@/lib/supabase/cached';
import { redirect } from 'next/navigation';

const CHILD = <div data-testid="test-pbl-child" />;

function setup(user: { id: string } | null, role: UserRole | null) {
  vi.mocked(getCachedUser).mockResolvedValue(user as never);
  vi.mocked(getCachedProfile).mockResolvedValue((role ? { role } : null) as never);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('TestPBLLayout — maxDuration 보존', () => {
  it('maxDuration 은 300 이다 (Vercel LLM 타임아웃 확장)', () => {
    expect(maxDuration).toBe(300);
  });
});

describe('TestPBLLayout — 승인된 역할 통과', () => {
  it.each<UserRole>(['CONSULTANT_APPROVED', 'OPS_ADMIN', 'SYSTEM_ADMIN'])(
    '역할 "%s" 는 리다이렉트 없이 children 을 렌더한다',
    async (role) => {
      setup({ id: 'user-1' }, role);

      const result = await TestPBLLayout({ children: CHILD });

      expect(redirect).not.toHaveBeenCalled();
      expect(result).toBeTruthy();
    }
  );
});

describe('TestPBLLayout — 승인 대기 역할 차단', () => {
  it.each<UserRole>(['USER_PENDING', 'OPS_ADMIN_PENDING'])(
    '역할 "%s" 는 /dashboard 로 리다이렉트된다',
    async (role) => {
      setup({ id: 'user-1' }, role);

      await expect(TestPBLLayout({ children: CHILD })).rejects.toThrow('NEXT_REDIRECT:/dashboard');
      expect(redirect).toHaveBeenCalledWith('/dashboard');
    }
  );

  it('user 가 없으면 /login 으로 리다이렉트된다', async () => {
    setup(null, null);

    await expect(TestPBLLayout({ children: CHILD })).rejects.toThrow('NEXT_REDIRECT:/login');
    expect(redirect).toHaveBeenCalledWith('/login');
  });
});
