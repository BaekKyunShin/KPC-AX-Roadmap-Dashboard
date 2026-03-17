/**
 * ops/projects/[id]/roadmap/actions.ts 테스트
 *
 * 테스트 대상:
 * - fetchRoadmapVersionsForOps: OPS_ADMIN용 로드맵 버전 목록 조회
 * - fetchRoadmapVersionForOps: OPS_ADMIN용 특정 로드맵 버전 조회
 */

import { describe, it, expect, vi, afterEach } from 'vitest';

// ─── 외부 모듈 모킹 ────────────────────────────────────────────────────────

const mockAuthResult = vi.fn();
vi.mock('@/lib/actions/auth-helpers', () => ({
  requireAuthWithRole: (...args: unknown[]) => mockAuthResult(...args),
}));

const mockFetchRoadmapVersions = vi.fn();
const mockFetchRoadmapVersion = vi.fn();
vi.mock('@/lib/services/roadmap', () => ({
  fetchRoadmapVersions: (...args: unknown[]) => mockFetchRoadmapVersions(...args),
  fetchRoadmapVersion: (...args: unknown[]) => mockFetchRoadmapVersion(...args),
}));

// ─── 테스트 대상 import ──────────────────────────────────────────────────────

import {
  fetchRoadmapVersionsForOps,
  fetchRoadmapVersionForOps,
} from './actions';

// ─── 상수 ────────────────────────────────────────────────────────────────────

const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440001';
const TEST_PROJECT_ID = '550e8400-e29b-41d4-a716-446655440002';
const TEST_ROADMAP_ID = '550e8400-e29b-41d4-a716-446655440010';

// ─── fetchRoadmapVersionsForOps ──────────────────────────────────────────────

describe('fetchRoadmapVersionsForOps', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('인증 실패 → 빈 배열 반환', async () => {
    mockAuthResult.mockResolvedValue({ error: '권한이 없습니다.' });

    const result = await fetchRoadmapVersionsForOps(TEST_PROJECT_ID);

    expect(result).toEqual([]);
    expect(mockFetchRoadmapVersions).not.toHaveBeenCalled();
  });

  it('정상 조회 → 로드맵 버전 목록 반환', async () => {
    mockAuthResult.mockResolvedValue({
      user: { id: TEST_USER_ID, email: 'admin@test.com' },
      supabase: {},
      role: 'OPS_ADMIN',
      status: 'ACTIVE',
    });

    const mockVersions = [
      { id: 'v1', version_number: 2, status: 'DRAFT' },
      { id: 'v2', version_number: 1, status: 'FINAL' },
    ];
    mockFetchRoadmapVersions.mockResolvedValue(mockVersions);

    const result = await fetchRoadmapVersionsForOps(TEST_PROJECT_ID);

    expect(result).toEqual(mockVersions);
    expect(mockFetchRoadmapVersions).toHaveBeenCalledWith(TEST_PROJECT_ID);
  });

  it('서비스 함수 에러 → 빈 배열 반환 (try-catch)', async () => {
    mockAuthResult.mockResolvedValue({
      user: { id: TEST_USER_ID, email: 'admin@test.com' },
      supabase: {},
      role: 'OPS_ADMIN',
      status: 'ACTIVE',
    });

    mockFetchRoadmapVersions.mockRejectedValue(new Error('DB error'));

    const result = await fetchRoadmapVersionsForOps(TEST_PROJECT_ID);

    expect(result).toEqual([]);
  });
});

// ─── fetchRoadmapVersionForOps ───────────────────────────────────────────────

describe('fetchRoadmapVersionForOps', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('인증 실패 → null 반환', async () => {
    mockAuthResult.mockResolvedValue({ error: '권한이 없습니다.' });

    const result = await fetchRoadmapVersionForOps(TEST_ROADMAP_ID);

    expect(result).toBeNull();
    expect(mockFetchRoadmapVersion).not.toHaveBeenCalled();
  });

  it('정상 조회 → 로드맵 버전 반환', async () => {
    mockAuthResult.mockResolvedValue({
      user: { id: TEST_USER_ID, email: 'admin@test.com' },
      supabase: {},
      role: 'OPS_ADMIN',
      status: 'ACTIVE',
    });

    const mockVersion = {
      id: TEST_ROADMAP_ID,
      version_number: 1,
      status: 'FINAL',
      diagnosis_summary: '테스트 진단',
      roadmap_matrix: [],
    };
    mockFetchRoadmapVersion.mockResolvedValue(mockVersion);

    const result = await fetchRoadmapVersionForOps(TEST_ROADMAP_ID);

    expect(result).toEqual(mockVersion);
    expect(mockFetchRoadmapVersion).toHaveBeenCalledWith(TEST_ROADMAP_ID);
  });

  it('서비스 함수 에러 → null 반환 (try-catch)', async () => {
    mockAuthResult.mockResolvedValue({
      user: { id: TEST_USER_ID, email: 'admin@test.com' },
      supabase: {},
      role: 'OPS_ADMIN',
      status: 'ACTIVE',
    });

    mockFetchRoadmapVersion.mockRejectedValue(new Error('DB error'));

    const result = await fetchRoadmapVersionForOps(TEST_ROADMAP_ID);

    expect(result).toBeNull();
  });
});
