/**
 * dashboard/messages/page.tsx 테스트 (#007 승인 대기 라우트 차단)
 *
 * 테스트 패턴 설명은 gallery/layout.test.tsx 주석 참고.
 * 이 페이지는 leaf 라우트라 layout 을 새로 만들지 않고 page 에서 검사한다
 * (notices/page.tsx 의 화이트리스트 선례와 동일 계층).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { UserRole } from '@/types/database';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/supabase/cached', () => ({
  getCachedProfile: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn((target: string) => {
    throw new Error(`NEXT_REDIRECT:${target}`);
  }),
}));

vi.mock('./_components/MessagesClient', () => ({
  default: () => null,
}));

import MessagesPage from './page';
import { createClient } from '@/lib/supabase/server';
import { getCachedProfile } from '@/lib/supabase/cached';
import { redirect } from 'next/navigation';

function setup(user: { id: string } | null, role: UserRole | null) {
  vi.mocked(createClient).mockResolvedValue({
    auth: { getUser: async () => ({ data: { user } }) },
  } as never);
  vi.mocked(getCachedProfile).mockResolvedValue((role ? { role } : null) as never);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('MessagesPage — 승인된 역할 통과', () => {
  it.each<UserRole>(['CONSULTANT_APPROVED', 'OPS_ADMIN', 'SYSTEM_ADMIN'])(
    '역할 "%s" 는 리다이렉트 없이 메시지 화면을 렌더한다',
    async (role) => {
      setup({ id: 'user-1' }, role);

      const result = await MessagesPage();

      expect(redirect).not.toHaveBeenCalled();
      expect(result).toBeTruthy();
    }
  );
});

describe('MessagesPage — 승인 대기 역할 차단', () => {
  it.each<UserRole>(['USER_PENDING', 'OPS_ADMIN_PENDING'])(
    '역할 "%s" 는 /dashboard 로 리다이렉트된다',
    async (role) => {
      setup({ id: 'user-1' }, role);

      await expect(MessagesPage()).rejects.toThrow('NEXT_REDIRECT:/dashboard');
      expect(redirect).toHaveBeenCalledWith('/dashboard');
    }
  );
});

describe('MessagesPage — 미인증 처리 (기존 동작 보존)', () => {
  it('user 가 없으면 /login 으로 리다이렉트된다', async () => {
    setup(null, null);

    await expect(MessagesPage()).rejects.toThrow('NEXT_REDIRECT:/login');
    expect(redirect).toHaveBeenCalledWith('/login');
  });
});
