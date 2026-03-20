/**
 * profile.ts 테스트
 *
 * updateConsultantProfile:
 *   - 세션 만료 → 에러
 *   - SUSPENDED 사용자 → 에러
 *   - WITHDRAWN 사용자 → 에러
 *   - ACTIVE + USER_PENDING → 수정 성공
 *   - ACTIVE + CONSULTANT_APPROVED → 수정 성공
 *
 * saveConsultantProfile:
 *   - 세션 만료 → 에러
 *   - Zod 검증 실패 → 에러
 *   - PG_UNIQUE_VIOLATION → 이미 프로필 등록됨
 *   - 기타 insert 에러 → 저장 실패
 *   - 성공
 *
 * fetchConsultantProfile:
 *   - 세션 만료 → 에러
 *   - 프로필 없음 (SUPABASE_NO_ROWS) → { profile: null }
 *   - DB 에러 → 에러
 *   - 정상 조회
 */

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
const mockInsert = vi.fn();
const mockSelectEq = vi.fn();
const mockSingle = vi.fn();
let insertReturnValue: { error: unknown } = { error: null };

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === 'consultant_profiles') {
        return {
          update: (...args: unknown[]) => {
            mockUpdate(...args);
            return { eq: mockEq };
          },
          insert: (...args: unknown[]) => {
            mockInsert(...args);
            return insertReturnValue;
          },
          select: () => ({
            eq: (...args: unknown[]) => {
              mockSelectEq(...args);
              return {
                single: () => mockSingle(),
              };
            },
          }),
        };
      }
      return {
        update: (...args: unknown[]) => {
          mockUpdate(...args);
          return { eq: mockEq };
        },
      };
    },
  }),
}));

vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
}));

const mockSafeParse = vi.fn();
vi.mock('@/lib/schemas/user', () => ({
  consultantProfileSchema: {
    safeParse: (...args: unknown[]) => mockSafeParse(...args),
  },
}));

// ─── Import ────────────────────────────────────────────────────────────────

import {
  updateConsultantProfile,
  saveConsultantProfile,
  fetchConsultantProfile,
} from './profile';
import { PG_UNIQUE_VIOLATION, SUPABASE_NO_ROWS } from '@/lib/constants/database';

// ─── 헬퍼 ──────────────────────────────────────────────────────────────────

const VALID_PARSED_DATA = {
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
};

function createMockFormData(): FormData {
  const fd = new FormData();
  fd.set('expertise_domains', '["AI"]');
  fd.set('available_industries', '["제조"]');
  fd.set('years_of_experience', '5');
  fd.set('affiliation', '테스트');
  fd.set('representative_experience', '경험');
  return fd;
}

function setupValidSafeParse() {
  mockSafeParse.mockReturnValue({
    success: true,
    data: VALID_PARSED_DATA,
  });
}

function setupInvalidSafeParse(errorMessage: string = '검증 오류') {
  mockSafeParse.mockReturnValue({
    success: false,
    error: { errors: [{ message: errorMessage }] },
  });
}

// ─── 테스트 ────────────────────────────────────────────────────────────────

describe('updateConsultantProfile', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockEq.mockReturnValue({ error: null });
    setupValidSafeParse();
    insertReturnValue = { error: null };
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

// ─── saveConsultantProfile ────────────────────────────────────────────────

describe('saveConsultantProfile', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setupValidSafeParse();
    insertReturnValue = { error: null };
  });

  it('세션 만료 → 에러 반환', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const result = await saveConsultantProfile(createMockFormData());

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('로그인');
    }
  });

  it('Zod 검증 실패 → 에러 반환', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    setupInvalidSafeParse('AI 적용 가능 업무를 최소 1개 이상 선택하세요.');

    const result = await saveConsultantProfile(createMockFormData());

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('AI 적용 가능 업무를 최소 1개 이상 선택하세요.');
    }
  });

  it('PG_UNIQUE_VIOLATION → 이미 프로필 등록됨', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    insertReturnValue = { error: { code: PG_UNIQUE_VIOLATION, message: 'duplicate' } };

    const result = await saveConsultantProfile(createMockFormData());

    expect(result).toEqual({
      success: false,
      error: '이미 프로필이 등록되어 있습니다.',
    });
  });

  it('기타 insert 에러 → 저장 실패', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    insertReturnValue = { error: { code: '99999', message: 'unknown' } };

    const result = await saveConsultantProfile(createMockFormData());

    expect(result).toEqual({
      success: false,
      error: '프로필 저장에 실패했습니다. 다시 시도해주세요.',
    });
  });

  it('전체 성공', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });

    const result = await saveConsultantProfile(createMockFormData());

    expect(result).toEqual({ success: true });
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        expertise_domains: ['AI'],
        sub_industries: [],
      }),
    );
  });
});

// ─── fetchConsultantProfile ───────────────────────────────────────────────

describe('fetchConsultantProfile', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('세션 만료 → 에러 반환', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    const result = await fetchConsultantProfile();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('로그인');
    }
  });

  it('프로필 없음 (SUPABASE_NO_ROWS) → { profile: null }', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockSingle.mockReturnValue({
      data: null,
      error: { code: SUPABASE_NO_ROWS, message: 'no rows' },
    });

    const result = await fetchConsultantProfile();

    expect(result).toEqual({
      success: true,
      data: { profile: null },
    });
  });

  it('DB 에러 → 에러 반환', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockSingle.mockReturnValue({
      data: null,
      error: { code: '99999', message: 'DB failure' },
    });

    const result = await fetchConsultantProfile();

    expect(result).toEqual({
      success: false,
      error: '프로필 조회에 실패했습니다.',
    });
  });

  it('정상 조회', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    const profileData = { user_id: 'user-1', expertise_domains: ['AI'], affiliation: '테스트' };
    mockSingle.mockReturnValue({ data: profileData, error: null });

    const result = await fetchConsultantProfile();

    expect(result).toEqual({
      success: true,
      data: { profile: profileData },
    });
    expect(mockSelectEq).toHaveBeenCalledWith('user_id', 'user-1');
  });
});

// ─── 에러/엣지 케이스 ─────────────────────────────────────────────────────

describe('updateConsultantProfile — 에러/엣지 케이스', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockEq.mockReturnValue({ error: null });
    setupValidSafeParse();
    insertReturnValue = { error: null };
  });

  it('Zod 검증 실패 → 에러 반환', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockGetCachedProfile.mockResolvedValue({ status: 'ACTIVE', role: 'CONSULTANT_APPROVED' });
    setupInvalidSafeParse('전문 분야를 선택해주세요.');

    const result = await updateConsultantProfile(createMockFormData());

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('전문 분야를 선택해주세요.');
    }
  });

  it('admin update 실패 → 에러 반환', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockGetCachedProfile.mockResolvedValue({ status: 'ACTIVE', role: 'CONSULTANT_APPROVED' });
    mockEq.mockReturnValue({ error: { message: 'update failed' } });

    const result = await updateConsultantProfile(createMockFormData());

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('수정');
    }
  });

  it('예외 발생 → catch 블록에서 에러 반환', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockGetCachedProfile.mockResolvedValue({ status: 'ACTIVE', role: 'CONSULTANT_APPROVED' });
    // update()가 throw하도록 설정
    mockUpdate.mockImplementation(() => {
      throw new Error('unexpected db error');
    });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await updateConsultantProfile(createMockFormData());

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('수정');
    }
    consoleSpy.mockRestore();
  });

  it('getCachedProfile이 null 반환 시 정상 수정 가능 (상태 체크 통과)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    mockGetCachedProfile.mockResolvedValue(null);
    // 이전 테스트에서 mockUpdate가 throw하도록 설정된 것을 해제
    mockUpdate.mockImplementation((..._args: unknown[]) => ({ eq: mockEq }));
    mockEq.mockReturnValue({ error: null });

    const result = await updateConsultantProfile(createMockFormData());

    expect(result.success).toBe(true);
    expect(mockUpdate).toHaveBeenCalled();
  });
});

describe('saveConsultantProfile — 에러/엣지 케이스', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setupValidSafeParse();
    insertReturnValue = { error: null };
  });

  it('getUser 에러 반환 시 → 세션 만료 에러', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'auth error' } });

    const result = await saveConsultantProfile(createMockFormData());

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('로그인');
    }
  });

  it('예외 발생 → catch 블록에서 에러 반환', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    // insert()가 throw하도록 설정
    mockInsert.mockImplementation(() => {
      throw new Error('unexpected error');
    });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await saveConsultantProfile(createMockFormData());

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('저장');
    }
    consoleSpy.mockRestore();
  });

  it('revalidateTag 호출 확인 (성공 시)', async () => {
    const { revalidateTag } = await import('next/cache');
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });

    await saveConsultantProfile(createMockFormData());

    expect(revalidateTag).toHaveBeenCalled();
  });
});

describe('fetchConsultantProfile — 에러/엣지 케이스', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('getUser 에러 반환 시 → 세션 만료 에러', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'session expired' } });

    const result = await fetchConsultantProfile();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('로그인');
    }
  });

  it('예외 발생 → catch 블록에서 에러 반환', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null });
    // single()이 throw하도록 설정
    mockSingle.mockImplementation(() => {
      throw new Error('unexpected error');
    });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await fetchConsultantProfile();

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('조회');
    }
    consoleSpy.mockRestore();
  });
});
