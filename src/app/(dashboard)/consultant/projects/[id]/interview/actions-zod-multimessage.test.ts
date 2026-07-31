/**
 * #1 — 인터뷰 Server Action Zod 다중 메시지 테스트
 *
 * 대상 2개 함수의 Zod 검증 실패 시 에러 메시지 직렬화 동작:
 *   - saveRoadmapInterviewV2    (v2 / camelCase strict)
 *   - savePBLInterviewV2        (v2 / camelCase strict)
 *
 * (v1 계열은 P8 legacy 제거로 함수·테스트 모두 삭제. "단일 필드 1줄"·"빈
 *  errors fallback" 엣지는 zod-error-format.test.ts 의 join 유틸 케이스가 고정.)
 *
 * 기대 동작:
 *   - 다수 필드 누락 시: Zod 이슈의 모든 메시지를 `\n` 으로 join 하여
 *     한 번에 반환 (최대 5줄, slice(0, 5))
 *
 * mock 큐 패턴은 인접 actions-v2.test.ts 의 setup 을 그대로 미러링한다.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { saveRoadmapInterviewV2, savePBLInterviewV2 } from './actions';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createMockSupabase } from '@/test/helpers/mock-supabase';

// ─── 외부 모듈 모킹 ────────────────────────────────────────────────────────

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }));
vi.mock('@/lib/services/audit', () => ({ createAuditLog: vi.fn() }));
vi.mock('@/lib/services/activity-log', () => ({ insertSystemActivityLog: vi.fn() }));
vi.mock('@/lib/services/notification', () => ({ createNotificationForAdmins: vi.fn() }));
vi.mock('@/lib/supabase/cached', () => ({
  getCachedUser: vi.fn(),
  getCachedProfile: vi.fn(),
}));
vi.mock('@/lib/services/file-parser', () => ({
  extractTextFromAttachment: vi.fn(async () => ({ text: 'mocked' })),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/server', () => ({ after: vi.fn() }));

// ─── 공통 상수 ──────────────────────────────────────────────────────────────

const USER_A = '550e8400-e29b-41d4-a716-446655440001';
const PROJECT_ID = '550e8400-e29b-41d4-a716-446655440020';

/**
 * V2 헬퍼: requireAuth 가 캐시에서 user/profile 을 읽으므로
 * cached 모듈을 모킹한다.
 */
async function mockCachedAuth({
  authed = true,
  role = 'CONSULTANT_APPROVED',
  status = 'ACTIVE',
}: { authed?: boolean; role?: string | null; status?: string | null } = {}) {
  const cached = await import('@/lib/supabase/cached');
  vi.mocked(cached.getCachedUser).mockResolvedValue(
    (authed ? { id: USER_A, email: 'consultant@example.com' } : null) as never
  );
  vi.mocked(cached.getCachedProfile).mockResolvedValue(
    (authed ? { id: USER_A, role, status } : null) as never
  );
}

/** V2 — requireConsultantProjectAccess 의 server side projects select */
function mockProjectAssignmentCheck(
  serverMock: ReturnType<typeof createMockSupabase>,
  { assigned = true }: { assigned?: boolean } = {}
) {
  serverMock.addResult({
    data: assigned ? { id: PROJECT_ID } : null,
    error: null,
  });
}

/** V2 — fetchProjectMetaForInterview 의 admin side projects select */
function mockProjectMeta(
  adminMock: ReturnType<typeof createMockSupabase>,
  meta: {
    track?: 'ROADMAP' | 'PBL';
    status?: string;
    company_name?: string;
    is_test_mode?: boolean;
  } = {}
) {
  adminMock.addResult({
    data: {
      id: PROJECT_ID,
      status: meta.status ?? 'ASSIGNED',
      track: meta.track ?? 'ROADMAP',
      company_name: meta.company_name ?? '테스트',
      is_test_mode: meta.is_test_mode ?? false,
    },
    error: null,
  });
}

// ─── 테스트 ─────────────────────────────────────────────────────────────────

describe('Server Action Zod 다중 메시지 (#1)', () => {
  let serverMock: ReturnType<typeof createMockSupabase>;
  let adminMock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    serverMock = createMockSupabase({ authUser: { id: USER_A } });
    adminMock = createMockSupabase();
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);
    vi.mocked(createAdminClient).mockReturnValue(adminMock.client as never);
  });

  afterEach(() => vi.clearAllMocks());

  // ────────────────────────────────────────────────────────────────────────
  // saveRoadmapInterviewV2 (v2 / camelCase strict)
  // ────────────────────────────────────────────────────────────────────────
  it('saveRoadmapInterviewV2 — 필수 필드 3개 이상 비우면 모든 메시지가 줄바꿈으로 반환', async () => {
    await mockCachedAuth();
    mockProjectAssignmentCheck(serverMock);
    mockProjectMeta(adminMock, { track: 'ROADMAP' });

    // strict 스키마에 빈 객체 전달 → 다수 필드 누락
    const r = await saveRoadmapInterviewV2(PROJECT_ID, {});
    expect(r.success).toBe(false);
    if (!r.success) {
      const lines = r.error.split('\n');
      expect(lines.length).toBeGreaterThanOrEqual(3);
      expect(lines.length).toBeLessThanOrEqual(5);
      for (const line of lines) {
        expect(line.trim().length).toBeGreaterThan(0);
      }
    }
  });

  // ────────────────────────────────────────────────────────────────────────
  // savePBLInterviewV2 (v2 / camelCase strict)
  // ────────────────────────────────────────────────────────────────────────
  it('savePBLInterviewV2 — 필수 필드 3개 이상 비우면 모든 메시지가 줄바꿈으로 반환', async () => {
    await mockCachedAuth();
    mockProjectAssignmentCheck(serverMock);
    mockProjectMeta(adminMock, { track: 'PBL' });

    // PBLInterviewStrictSchema 에 빈 객체 → 다수 필드 누락
    const r = await savePBLInterviewV2(PROJECT_ID, {});
    expect(r.success).toBe(false);
    if (!r.success) {
      const lines = r.error.split('\n');
      expect(lines.length).toBeGreaterThanOrEqual(3);
      expect(lines.length).toBeLessThanOrEqual(5);
      for (const line of lines) {
        expect(line.trim().length).toBeGreaterThan(0);
      }
    }
  });
});
