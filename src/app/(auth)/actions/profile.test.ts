import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockGetUser = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
  }),
}));

const mockGetCachedProfile = vi.fn();
vi.mock('@/lib/supabase/cached', () => ({
  getCachedProfile: () => mockGetCachedProfile(),
}));

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

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

vi.mock('@/lib/schemas/user', () => ({
  consultantProfileSchema: {
    safeParse: () => ({
      success: true,
      data: {
        expertise_domains: ['AI'],
        available_industries: ['제조'],
        sub_industries: [],
        teaching_levels: ['초급'],
        coaching_methods: ['강의'],
        skill_tags: [],
        years_of_experience: 5,
        affiliation: '테스트',
        representative_experience: '경험',
        portfolio: '',
        strengths_constraints: '',
      },
    }),
  },
}));

// ─── Import ────────────────────────────────────────────────────────────────

import { updateConsultantProfile } from './profile';

// ─── 헬퍼 ──────────────────────────────────────────────────────────────────

function createMockFormData(): FormData {
  const fd = new FormData();
  fd.set('expertise_domains', '["AI"]');
  fd.set('available_industries', '["제조"]');
  fd.set('years_of_experience', '5');
  fd.set('affiliation', '테스트');
  fd.set('representative_experience', '경험');
  return fd;
}

// ─── 테스트 ────────────────────────────────────────────────────────────────

describe('updateConsultantProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEq.mockReturnValue({ error: null });
  });

  it('세션 만료 → 에러 반환', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const result = await updateConsultantProfile(createMockFormData());

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('로그인');
    }
  });

  it('SUSPENDED 사용자 → 에러 반환', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockGetCachedProfile.mockResolvedValue({ status: 'SUSPENDED', role: 'CONSULTANT_APPROVED' });

    const result = await updateConsultantProfile(createMockFormData());

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('계정이 정지 또는 탈퇴 상태입니다.');
    }
  });

  it('WITHDRAWN 사용자 → 에러 반환', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockGetCachedProfile.mockResolvedValue({ status: 'WITHDRAWN', role: 'CONSULTANT_APPROVED' });

    const result = await updateConsultantProfile(createMockFormData());

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('계정이 정지 또는 탈퇴 상태입니다.');
    }
  });

  it('ACTIVE + USER_PENDING → 프로필 수정 성공 (승인 대기도 가능)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockGetCachedProfile.mockResolvedValue({ status: 'ACTIVE', role: 'USER_PENDING' });

    const result = await updateConsultantProfile(createMockFormData());

    expect(result.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalled();
  });

  it('ACTIVE + CONSULTANT_APPROVED → 프로필 수정 성공', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockGetCachedProfile.mockResolvedValue({ status: 'ACTIVE', role: 'CONSULTANT_APPROVED' });

    const result = await updateConsultantProfile(createMockFormData());

    expect(result.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalled();
  });
});
