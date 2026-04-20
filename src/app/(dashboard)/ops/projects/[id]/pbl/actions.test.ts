/**
 * ops/projects/[id]/pbl/actions.ts 테스트
 *
 * 테스트 대상:
 * - fetchPBLForOps: 운영자 PBL 보고서 단건 조회 (미인증/컨설턴트 거부/OPS_ADMIN/SYSTEM_ADMIN)
 * - listPBLVersionsForOps: 운영자 PBL 버전 목록 (미인증/컨설턴트 거부/OPS_ADMIN)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchPBLForOps, listPBLVersionsForOps } from './actions';
import { createClient } from '@/lib/supabase/server';
import { createMockSupabase } from '@/test/helpers/mock-supabase';

// ─── 외부 모듈 모킹 ───────────────────────────────────────────────────────────

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/services/pbl/pbl-crud', () => ({
  getPBLReport: vi.fn().mockResolvedValue(null),
  listVersions: vi.fn().mockResolvedValue([]),
}));

// ─── 테스트 상수 ──────────────────────────────────────────────────────────────

const USER_ID = '550e8400-e29b-41d4-a716-446655440001';
const PBL_ID = '550e8400-e29b-41d4-a716-446655440010';
const PROJECT_ID = '550e8400-e29b-41d4-a716-446655440020';

const MOCK_PBL_ROW = {
  id: PBL_ID,
  project_id: PROJECT_ID,
  version_number: 1,
  status: 'DRAFT',
  diagnosis_summary: '진단 요약',
};

// ─── fetchPBLForOps 테스트 ────────────────────────────────────────────────────

describe('fetchPBLForOps', () => {
  let serverMock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    serverMock = createMockSupabase({ authUser: { id: USER_ID } });
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('미인증 → null 반환', async () => {
    serverMock = createMockSupabase({ authUser: null });
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);

    const result = await fetchPBLForOps(PBL_ID);
    expect(result).toBeNull();
  });

  it('CONSULTANT_APPROVED 역할 → null 반환 (운영자 전용)', async () => {
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });

    const result = await fetchPBLForOps(PBL_ID);
    expect(result).toBeNull();
  });

  it('USER_PENDING 역할 → null 반환', async () => {
    serverMock.addResult({ data: { role: 'USER_PENDING', status: 'ACTIVE' }, error: null });

    const result = await fetchPBLForOps(PBL_ID);
    expect(result).toBeNull();
  });

  it('OPS_ADMIN → getPBLReport 호출 결과 반환', async () => {
    const { getPBLReport } = await import('@/lib/services/pbl/pbl-crud');
    vi.mocked(getPBLReport).mockResolvedValueOnce(MOCK_PBL_ROW as never);

    serverMock.addResult({ data: { role: 'OPS_ADMIN', status: 'ACTIVE' }, error: null });

    const result = await fetchPBLForOps(PBL_ID);
    expect(result).toMatchObject({ id: PBL_ID, status: 'DRAFT' });
    expect(getPBLReport).toHaveBeenCalledWith(PBL_ID);
  });

  it('SYSTEM_ADMIN → getPBLReport 호출 결과 반환', async () => {
    const { getPBLReport } = await import('@/lib/services/pbl/pbl-crud');
    vi.mocked(getPBLReport).mockResolvedValueOnce({ ...MOCK_PBL_ROW, status: 'FINAL' } as never);

    serverMock.addResult({ data: { role: 'SYSTEM_ADMIN', status: 'ACTIVE' }, error: null });

    const result = await fetchPBLForOps(PBL_ID);
    expect(result).toMatchObject({ id: PBL_ID, status: 'FINAL' });
  });

  it('OPS_ADMIN + getPBLReport null → null 반환', async () => {
    const { getPBLReport } = await import('@/lib/services/pbl/pbl-crud');
    vi.mocked(getPBLReport).mockResolvedValueOnce(null);

    serverMock.addResult({ data: { role: 'OPS_ADMIN', status: 'ACTIVE' }, error: null });

    const result = await fetchPBLForOps(PBL_ID);
    expect(result).toBeNull();
  });
});

// ─── listPBLVersionsForOps 테스트 ────────────────────────────────────────────

describe('listPBLVersionsForOps', () => {
  let serverMock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    serverMock = createMockSupabase({ authUser: { id: USER_ID } });
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('미인증 → 빈 배열 반환', async () => {
    serverMock = createMockSupabase({ authUser: null });
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);

    const result = await listPBLVersionsForOps(PROJECT_ID);
    expect(result).toEqual([]);
  });

  it('CONSULTANT_APPROVED 역할 → 빈 배열 반환 (운영자 전용)', async () => {
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });

    const result = await listPBLVersionsForOps(PROJECT_ID);
    expect(result).toEqual([]);
  });

  it('USER_PENDING 역할 → 빈 배열 반환', async () => {
    serverMock.addResult({ data: { role: 'USER_PENDING', status: 'ACTIVE' }, error: null });

    const result = await listPBLVersionsForOps(PROJECT_ID);
    expect(result).toEqual([]);
  });

  it('OPS_ADMIN → listVersions 호출 결과 반환', async () => {
    const { listVersions } = await import('@/lib/services/pbl/pbl-crud');
    const mockVersions = [
      { id: 'v1', status: 'DRAFT', version_number: 1 },
      { id: 'v2', status: 'FINAL', version_number: 2 },
    ];
    vi.mocked(listVersions).mockResolvedValueOnce(mockVersions as never);

    serverMock.addResult({ data: { role: 'OPS_ADMIN', status: 'ACTIVE' }, error: null });

    const result = await listPBLVersionsForOps(PROJECT_ID);
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ id: 'v1', status: 'DRAFT' });
    expect(result[1]).toMatchObject({ id: 'v2', status: 'FINAL' });
    expect(listVersions).toHaveBeenCalledWith(PROJECT_ID);
  });

  it('SYSTEM_ADMIN → listVersions 호출 결과 반환', async () => {
    const { listVersions } = await import('@/lib/services/pbl/pbl-crud');
    const mockVersions = [{ id: 'v1', status: 'FINAL', version_number: 1 }];
    vi.mocked(listVersions).mockResolvedValueOnce(mockVersions as never);

    serverMock.addResult({ data: { role: 'SYSTEM_ADMIN', status: 'ACTIVE' }, error: null });

    const result = await listPBLVersionsForOps(PROJECT_ID);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ status: 'FINAL' });
  });

  it('OPS_ADMIN + listVersions 빈 배열 → 빈 배열 반환', async () => {
    const { listVersions } = await import('@/lib/services/pbl/pbl-crud');
    vi.mocked(listVersions).mockResolvedValueOnce([]);

    serverMock.addResult({ data: { role: 'OPS_ADMIN', status: 'ACTIVE' }, error: null });

    const result = await listPBLVersionsForOps(PROJECT_ID);
    expect(result).toEqual([]);
  });
});
