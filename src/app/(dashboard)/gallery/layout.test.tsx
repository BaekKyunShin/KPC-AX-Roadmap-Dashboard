/**
 * gallery/layout.tsx 테스트 (#007 승인 대기 라우트 차단)
 *
 * 갤러리 서브트리(/gallery, /gallery/[id])는 승인 대기 사용자에게
 * 타 기업의 공유 FINAL 로드맵·PBL 보고서를 노출하므로 레이아웃에서 차단한다.
 * page 2곳에 각각 넣지 않고 layout 으로 두는 이유는 향후 gallery/* 라우트가
 * 추가돼도 자동으로 보호되게 하기 위함이다(ops/consultant 레이아웃과 동일 패턴).
 *
 * ── 이 저장소의 첫 layout 테스트라 패턴을 남긴다 ──
 * - Server Component layout 은 async 함수이므로 직접 await 호출해 단언한다.
 * - redirect() 는 실제 Next.js 와 동일하게 throw 하도록 모킹한다.
 *   그래야 "리다이렉트 이후 코드가 실행되지 않는다"는 성질까지 재현된다.
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

import GalleryLayout from './layout';
import { getCachedUser, getCachedProfile } from '@/lib/supabase/cached';
import { redirect } from 'next/navigation';

const CHILD = <div data-testid="gallery-child" />;

function setup(user: { id: string } | null, role: UserRole | null) {
  vi.mocked(getCachedUser).mockResolvedValue(user as never);
  vi.mocked(getCachedProfile).mockResolvedValue((role ? { role } : null) as never);
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── 특성화: 승인된 역할은 지금처럼 그대로 통과해야 한다 ──────────────────────

describe('GalleryLayout — 승인된 역할 통과', () => {
  it.each<UserRole>(['CONSULTANT_APPROVED', 'OPS_ADMIN', 'SYSTEM_ADMIN'])(
    '역할 "%s" 는 리다이렉트 없이 children 을 렌더한다',
    async (role) => {
      setup({ id: 'user-1' }, role);

      const result = await GalleryLayout({ children: CHILD });

      expect(redirect).not.toHaveBeenCalled();
      expect(result).toBeTruthy();
    }
  );
});

// ─── 신규: 승인 대기 역할 차단 ────────────────────────────────────────────────

describe('GalleryLayout — 승인 대기 역할 차단', () => {
  it.each<UserRole>(['USER_PENDING', 'OPS_ADMIN_PENDING'])(
    '역할 "%s" 는 /dashboard 로 리다이렉트된다',
    async (role) => {
      setup({ id: 'user-1' }, role);

      await expect(GalleryLayout({ children: CHILD })).rejects.toThrow('NEXT_REDIRECT:/dashboard');
      expect(redirect).toHaveBeenCalledWith('/dashboard');
    }
  );
});

// ─── 특성화: 미인증 처리는 기존 page.tsx 와 동일한 결과여야 한다 ───────────────

describe('GalleryLayout — 미인증 처리 (기존 page.tsx 동작 보존)', () => {
  it('user 가 없으면 /login 으로 리다이렉트된다', async () => {
    setup(null, null);

    await expect(GalleryLayout({ children: CHILD })).rejects.toThrow('NEXT_REDIRECT:/login');
    expect(redirect).toHaveBeenCalledWith('/login');
  });

  it('profile 이 없으면 /login 으로 리다이렉트된다', async () => {
    setup({ id: 'user-1' }, null);

    await expect(GalleryLayout({ children: CHILD })).rejects.toThrow('NEXT_REDIRECT:/login');
    expect(redirect).toHaveBeenCalledWith('/login');
  });
});
