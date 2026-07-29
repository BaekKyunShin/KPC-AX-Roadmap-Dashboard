/**
 * dashboard/settings/page.tsx 테스트 (#007 승인 대기 라우트 차단)
 *
 * 테스트 패턴 설명은 gallery/layout.test.tsx 주석 참고.
 *
 * ⚠️ 이 페이지는 profile 이 null 이어도 리다이렉트하지 않고 렌더한다
 * (이메일 알림 토글만 숨김). 가드를 추가하며 이 동작이 깨지지 않도록
 * 특성화 테스트로 먼저 고정한다.
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

vi.mock('@/components/auth/DeleteAccountSection', () => ({ default: () => null }));
vi.mock('@/app/(dashboard)/dashboard/profile/_components/EmailNotifyToggle', () => ({
  default: () => null,
}));
vi.mock('./_components/PasswordChangeSection', () => ({ default: () => null }));

import SettingsPage from './page';
import { getCachedUser, getCachedProfile } from '@/lib/supabase/cached';
import { redirect } from 'next/navigation';

function setup(user: { id: string } | null, role: UserRole | null) {
  vi.mocked(getCachedUser).mockResolvedValue(user as never);
  vi.mocked(getCachedProfile).mockResolvedValue(
    (role ? { role, email_notify_enabled: false } : null) as never
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('SettingsPage — 승인된 역할 통과', () => {
  it.each<UserRole>(['CONSULTANT_APPROVED', 'OPS_ADMIN', 'SYSTEM_ADMIN'])(
    '역할 "%s" 는 리다이렉트 없이 설정 화면을 렌더한다',
    async (role) => {
      setup({ id: 'user-1' }, role);

      const result = await SettingsPage();

      expect(redirect).not.toHaveBeenCalled();
      expect(result).toBeTruthy();
    }
  );
});

describe('SettingsPage — 승인 대기 역할 차단', () => {
  it.each<UserRole>(['USER_PENDING', 'OPS_ADMIN_PENDING'])(
    '역할 "%s" 는 /dashboard 로 리다이렉트된다',
    async (role) => {
      setup({ id: 'user-1' }, role);

      await expect(SettingsPage()).rejects.toThrow('NEXT_REDIRECT:/dashboard');
      expect(redirect).toHaveBeenCalledWith('/dashboard');
    }
  );
});

describe('SettingsPage — 기존 동작 보존', () => {
  it('user 가 없으면 /login 으로 리다이렉트된다', async () => {
    setup(null, null);

    await expect(SettingsPage()).rejects.toThrow('NEXT_REDIRECT:/login');
    expect(redirect).toHaveBeenCalledWith('/login');
  });

  it('profile 이 null 이어도 리다이렉트하지 않고 렌더한다', async () => {
    setup({ id: 'user-1' }, null);

    const result = await SettingsPage();

    expect(redirect).not.toHaveBeenCalled();
    expect(result).toBeTruthy();
  });
});
