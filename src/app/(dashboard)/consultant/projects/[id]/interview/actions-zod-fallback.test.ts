/**
 * #1 — 인터뷰 Server Action Zod 검증 fallback 메시지 테스트
 *
 * `validation.error.errors` 배열이 비어있거나 모든 message 가 공백/빈 문자열인
 * 엣지 케이스에서 fallback 메시지(`'필수 입력 항목을 확인해주세요.'`)가 반환되는지
 * 단독으로 검증한다.
 *
 * schema 모듈을 vi.mock factory 로 통째로 대체하므로, 같은 파일 내 다른
 * 테스트와 격리하기 위해 단독 파일로 분리되었다.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { saveRoadmapInterview } from './actions';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createMockSupabase } from '@/test/helpers/mock-supabase';

// roadmapInterviewSchema 의 safeParse 만 강제로 errors=[] 를 만든 실패 결과를 반환
vi.mock('@/lib/schemas/interview-roadmap', async (importOriginal) => {
  const actual: Record<string, unknown> = await importOriginal();
  return {
    ...actual,
    roadmapInterviewSchema: {
      safeParse: vi.fn(() => ({
        success: false,
        error: { errors: [] as Array<{ message: string }> },
      })),
    },
    // autoSave 경로는 사용하지 않지만 import 시 존재해야 함
    roadmapInterviewAutoSaveSchema: {
      safeParse: vi.fn(() => ({
        success: true,
        data: {},
      })),
    },
  };
});

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: vi.fn() }));
vi.mock('@/lib/services/audit', () => ({ createAuditLog: vi.fn() }));
vi.mock('@/lib/services/activity-log', () => ({ insertSystemActivityLog: vi.fn() }));
vi.mock('@/lib/services/notification', () => ({ createNotificationForAdmins: vi.fn() }));
vi.mock('@/lib/services/file-parser', () => ({
  extractTextFromAttachment: vi.fn(async () => ({ text: 'mocked' })),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/server', () => ({ after: vi.fn() }));

const USER_A = '550e8400-e29b-41d4-a716-446655440001';
const PROJECT_ID = '550e8400-e29b-41d4-a716-446655440020';

describe('saveRoadmapInterview — Zod errors=[] fallback (#1)', () => {
  let serverMock: ReturnType<typeof createMockSupabase>;
  let adminMock: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    serverMock = createMockSupabase({ authUser: { id: USER_A } });
    adminMock = createMockSupabase();
    vi.mocked(createClient).mockResolvedValue(serverMock.client as never);
    vi.mocked(createAdminClient).mockReturnValue(adminMock.client as never);
  });

  afterEach(() => vi.clearAllMocks());

  it('errors 배열이 비어있으면 fallback 메시지 반환', async () => {
    serverMock.addResult({ data: { role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }, error: null });
    serverMock.addResult({
      data: {
        id: PROJECT_ID,
        status: 'ASSIGNED',
        track: 'ROADMAP',
        assigned_consultant_id: USER_A,
        company_name: '테스트',
        is_test_mode: false,
      },
      error: null,
    });

    const r = await saveRoadmapInterview(PROJECT_ID, {} as never);

    expect(r.success).toBe(false);
    if (!r.success) {
      // fallback 워딩 — 빈 문자열이나 '\n' 만 반환되면 안 된다.
      expect(r.error).toMatch(/필수|확인/);
      expect(r.error.length).toBeGreaterThan(0);
    }
  });
});
