import { describe, it, expect, vi, beforeEach } from 'vitest';

// requireAuthWithRole 모킹
const mockRequireAuthWithRole = vi.fn();
vi.mock('@/lib/actions/auth-helpers', () => ({
  requireAuthWithRole: (...args: unknown[]) => mockRequireAuthWithRole(...args),
}));

// admin client 모킹
const mockUpdate = vi.fn();
const mockEq = vi.fn().mockReturnValue({ error: null });
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      update: (...args: unknown[]) => {
        mockUpdate(...args);
        return { eq: mockEq };
      },
    }),
  }),
}));

import { updateEmailNotifySetting } from './actions';

describe('updateEmailNotifySetting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEq.mockReturnValue({ error: null });
  });

  it('인증 실패 → error 반환', async () => {
    mockRequireAuthWithRole.mockResolvedValue({ error: '로그인이 필요합니다.' });
    const result = await updateEmailNotifySetting(true);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('로그인이 필요합니다.');
  });

  it('SUSPENDED 사용자 → error 반환 (requireAuthWithRole이 차단)', async () => {
    mockRequireAuthWithRole.mockResolvedValue({ error: '이 기능을 사용할 수 없는 역할입니다.' });
    const result = await updateEmailNotifySetting(true);
    expect(result.success).toBe(false);
  });

  it('허용되지 않은 역할 → error 반환', async () => {
    mockRequireAuthWithRole.mockResolvedValue({ error: '이 기능을 사용할 수 없는 역할입니다.' });
    const result = await updateEmailNotifySetting(false);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('이 기능을 사용할 수 없는 역할입니다.');
  });

  it('ACTIVE + 허용 역할 → 설정 변경 성공', async () => {
    mockRequireAuthWithRole.mockResolvedValue({
      user: { id: 'user-1', email: 'test@test.com' },
      supabase: {},
      role: 'CONSULTANT_APPROVED',
      status: 'ACTIVE',
    });
    const result = await updateEmailNotifySetting(true);
    expect(result.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith({ email_notify_enabled: true });
  });

  it('DB 에러 시 실패 반환', async () => {
    mockRequireAuthWithRole.mockResolvedValue({
      user: { id: 'user-1', email: 'test@test.com' },
      supabase: {},
      role: 'OPS_ADMIN',
      status: 'ACTIVE',
    });
    mockEq.mockReturnValue({ error: { message: 'DB error' } });
    const result = await updateEmailNotifySetting(true);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toBe('설정 변경에 실패했습니다.');
  });

  it('requireAuthWithRole에 올바른 역할 목록과 에러 메시지를 전달한다', async () => {
    mockRequireAuthWithRole.mockResolvedValue({ error: '권한이 없습니다.' });
    await updateEmailNotifySetting(true);
    const [roles, options] = mockRequireAuthWithRole.mock.calls[0];
    expect(roles).toContain('SYSTEM_ADMIN');
    expect(roles).toContain('OPS_ADMIN');
    expect(roles).toContain('CONSULTANT_APPROVED');
    expect(options?.roleError).toBe('이 기능을 사용할 수 없는 역할입니다.');
  });
});
