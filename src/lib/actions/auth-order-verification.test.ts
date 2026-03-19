/**
 * 인증 체크 → Zod 검증 순서 보장 테스트
 *
 * 보안 원칙:
 *   미인증 사용자에게 입력 유효성 오류 메시지가 노출되면 안 됩니다.
 *   인증 실패 시 "인증/로그인/권한" 관련 메시지가 반환되어야 하며,
 *   Zod 검증 에러("유효", "필수", "형식", "입력" 등)가 노출되어서는 안 됩니다.
 *
 * 테스트 대상 (~12개):
 *   1. createTemplate (ops/templates) — FormData, 인증 → Zod
 *   2. updateTemplate (ops/templates) — FormData, 인증 → Zod
 *   3. createProject (ops/projects/actions/crud) — FormData, 인증 → Zod
 *   4. createSelfAssessment (ops/projects/actions/crud) — FormData, 인증 → Zod
 *   5. assignConsultant (ops/projects/actions/crud) — FormData, 인증 → Zod
 *   6. updateQuota (ops/quota) — 인증 → Zod
 *   7. saveInterview (consultant/interview) — 인증 → Zod
 *   8. createActivityLog (consultant/projects/[id]) — 인증 → Zod
 *   9. updateActivityLog (consultant/projects/[id]) — 인증 → Zod
 *  10. sendMessage (messages) — 인증 → Zod
 *  11. createConversation (messages) — 인증 → Zod
 *  12. createTestRoadmap (test-roadmap) — 인증 → Zod
 *
 * 수정된 위반:
 *  - createRoadmap (consultant/roadmap): Zod가 인증보다 먼저 실행되던 문제
 *    → 인증을 Zod보다 먼저 실행하도록 수정 완료
 */

import { describe, it, expect, vi, afterEach } from 'vitest';

// ─── 공통 외부 모듈 모킹 ─────────────────────────────────────────────────────

// auth-helpers: 인증 실패를 반환하도록 mock
const mockRequireAuth = vi.fn();
const mockRequireAuthWithRole = vi.fn();
const mockRequireConsultantProjectAccess = vi.fn();

vi.mock('@/lib/actions/auth-helpers', () => ({
  requireAuth: (...args: unknown[]) => mockRequireAuth(...args),
  requireAuthWithRole: (...args: unknown[]) => mockRequireAuthWithRole(...args),
  requireConsultantProjectAccess: (...args: unknown[]) => mockRequireConsultantProjectAccess(...args),
}));

// supabase
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  })),
}));

// Next.js
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock('next/server', () => ({
  after: vi.fn(),
}));

// 서비스 모듈 (호출되지 않아야 하지만, import 실패 방지용)
vi.mock('@/lib/services/audit', () => ({
  createAuditLog: vi.fn(),
}));

vi.mock('@/lib/services/notification', () => ({
  createNotification: vi.fn(),
  createNotificationForAdmins: vi.fn(),
}));

vi.mock('@/lib/services/activity-log', () => ({
  insertSystemActivityLog: vi.fn(),
}));

vi.mock('@/lib/services/stt', () => ({
  extractInsightsFromStt: vi.fn(),
  validateSttTextSize: vi.fn(),
}));

vi.mock('@/lib/services/email', () => ({
  notifyRecipientByEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/services/calculate-scores', () => ({
  calculateScores: vi.fn(),
}));

vi.mock('@/lib/services/interview-guide', () => ({
  generateInterviewGuideData: vi.fn(),
}));

vi.mock('@/lib/services/quota', () => ({
  fetchAllUsersUsage: vi.fn(),
  updateUserQuota: vi.fn(),
  fetchUserUsage: vi.fn(),
  checkAndRecordLLMUsage: vi.fn(),
}));

vi.mock('@/lib/services/roadmap', () => ({
  generateRoadmap: vi.fn(),
  finalizeRoadmap: vi.fn(),
  fetchRoadmapVersions: vi.fn(),
  fetchRoadmapVersion: vi.fn(),
  updateRoadmapManually: vi.fn(),
  generateTestRoadmap: vi.fn(),
  reviseTestRoadmap: vi.fn(),
}));

vi.mock('@/lib/services/llm', () => ({
  getLLMUserFriendlyError: vi.fn(() => '알 수 없는 오류가 발생했습니다.'),
}));

vi.mock('@/lib/services/abort-registry', () => ({
  registerAbort: vi.fn(() => new AbortController()),
  cancelAbort: vi.fn(),
  cleanupAbort: vi.fn(),
}));

vi.mock('@/lib/constants/status', () => ({
  validateStatusTransition: vi.fn(),
  canManageUser: vi.fn(),
  ROADMAP_ELIGIBLE_STATUSES: ['INTERVIEWED', 'ROADMAP_DRAFTED'],
}));

vi.mock('@/lib/constants/cache', () => ({
  CACHE_TAG_PROJECT_FILTERS: 'project-filters',
  FILTER_CACHE_TTL_SECONDS: 300,
}));

vi.mock('@/lib/constants/database', () => ({
  NULL_UUID: '00000000-0000-0000-0000-000000000000',
}));

// ─── 테스트 헬퍼 ──────────────────────────────────────────────────────────────

const AUTH_FAILURE_MSG = '로그인이 필요합니다.';

/** 인증 에러를 나타내는 키워드 정규식 */
const AUTH_ERROR_PATTERN = /인증|로그인|권한/;

/** Zod 검증 에러를 나타내는 키워드 정규식 */
const ZOD_ERROR_PATTERN = /유효|필수|형식|이상|이하|최소|최대|선택|올바르지/;

/** requireAuth 인증 실패 설정 */
function setupAuthFailure() {
  mockRequireAuth.mockResolvedValue({ error: AUTH_FAILURE_MSG });
}

/** requireAuthWithRole 인증 실패 설정 */
function setupRoleAuthFailure() {
  mockRequireAuthWithRole.mockResolvedValue({ error: AUTH_FAILURE_MSG });
}

/** 잘못된 FormData 생성 (필수 필드 누락 or 잘못된 값) */
function createInvalidFormData(fields: Record<string, string> = {}): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.set(key, value);
  }
  return formData;
}

// ─── 테스트 본문 ──────────────────────────────────────────────────────────────

afterEach(() => {
  vi.restoreAllMocks();
});

describe('인증 체크 → Zod 검증 순서 보장', () => {
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ops/templates — createTemplate, updateTemplate
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  describe('createTemplate', () => {
    it('미인증 + 잘못된 입력 → 인증 에러 우선 반환 (Zod 에러 아님)', async () => {
      setupRoleAuthFailure();

      const { createTemplate } = await import(
        '@/app/(dashboard)/ops/templates/actions'
      );

      // 잘못된 FormData: name 1자 (min 2), questions 빈 배열
      const formData = createInvalidFormData({
        name: 'X',
        description: '',
        questions: '[]',
      });

      const result = await createTemplate(formData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toMatch(AUTH_ERROR_PATTERN);
        expect(result.error).not.toMatch(ZOD_ERROR_PATTERN);
      }
    });
  });

  describe('updateTemplate', () => {
    it('미인증 + 잘못된 입력 → 인증 에러 우선 반환 (Zod 에러 아님)', async () => {
      setupRoleAuthFailure();

      const { updateTemplate } = await import(
        '@/app/(dashboard)/ops/templates/actions'
      );

      // 잘못된 FormData: id가 UUID가 아님, name 1자
      const formData = createInvalidFormData({
        id: 'not-a-uuid',
        name: 'X',
        description: '',
        questions: '[]',
      });

      const result = await updateTemplate(formData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toMatch(AUTH_ERROR_PATTERN);
        expect(result.error).not.toMatch(ZOD_ERROR_PATTERN);
      }
    });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ops/projects/actions/crud — createProject, createSelfAssessment, assignConsultant
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  describe('createProject', () => {
    it('미인증 + 잘못된 입력 → 인증 에러 우선 반환 (Zod 에러 아님)', async () => {
      setupRoleAuthFailure();

      const { createProject } = await import(
        '@/app/(dashboard)/ops/projects/actions/crud'
      );

      // 필수 필드 누락 + 잘못된 값
      const formData = createInvalidFormData({
        company_name: '', // min 2
        industry: 'INVALID',
        company_size: '',
        contact_name: '',
        contact_email: 'not-email',
      });

      const result = await createProject(formData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toMatch(AUTH_ERROR_PATTERN);
        expect(result.error).not.toMatch(ZOD_ERROR_PATTERN);
      }
    });
  });

  describe('createSelfAssessment', () => {
    it('미인증 + 잘못된 입력 → 인증 에러 우선 반환 (Zod 에러 아님)', async () => {
      setupRoleAuthFailure();

      const { createSelfAssessment } = await import(
        '@/app/(dashboard)/ops/projects/actions/crud'
      );

      // 잘못된 FormData: answers가 유효하지 않은 JSON
      const formData = createInvalidFormData({
        project_id: '',
        template_id: '',
        answers: 'not-json',
      });

      const result = await createSelfAssessment(formData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toMatch(AUTH_ERROR_PATTERN);
        expect(result.error).not.toMatch(ZOD_ERROR_PATTERN);
      }
    });
  });

  describe('assignConsultant', () => {
    it('미인증 + 잘못된 입력 → 인증 에러 우선 반환 (Zod 에러 아님)', async () => {
      setupRoleAuthFailure();

      const { assignConsultant } = await import(
        '@/app/(dashboard)/ops/projects/actions/crud'
      );

      // 잘못된 FormData
      const formData = createInvalidFormData({
        project_id: '',
        consultant_id: '',
        assignment_reason: '',
      });

      const result = await assignConsultant(formData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toMatch(AUTH_ERROR_PATTERN);
        expect(result.error).not.toMatch(ZOD_ERROR_PATTERN);
      }
    });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // ops/quota — updateQuota
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  describe('updateQuota', () => {
    it('미인증 + 잘못된 입력 → 인증 에러 우선 반환 (Zod 에러 아님)', async () => {
      setupRoleAuthFailure();

      const { updateQuota } = await import(
        '@/app/(dashboard)/ops/quota/actions'
      );

      // 둘 다 undefined → Zod 실패 (최소 하나는 필요)
      const result = await updateQuota('not-uuid', undefined, undefined);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toMatch(AUTH_ERROR_PATTERN);
        expect(result.error).not.toMatch(ZOD_ERROR_PATTERN);
      }
    });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // consultant/interview — saveInterview
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  describe('saveInterview', () => {
    it('미인증 + 잘못된 입력 → 인증 에러 우선 반환 (Zod 에러 아님)', async () => {
      setupRoleAuthFailure();

      const { saveInterview } = await import(
        '@/app/(dashboard)/consultant/projects/[id]/interview/actions'
      );

      // 완전히 잘못된 인터뷰 데이터 (Zod 실패 확실)
      const invalidData = {
        interview_date: '',
        participants: [],
        company_details: {},
        job_tasks: [],
        pain_points: [],
        improvement_goals: [],
      };

      const result = await saveInterview('some-project-id', invalidData as never);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toMatch(AUTH_ERROR_PATTERN);
        expect(result.error).not.toMatch(ZOD_ERROR_PATTERN);
      }
    });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // consultant/projects/[id] — createActivityLog, updateActivityLog
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  describe('createActivityLog', () => {
    it('미인증 + 잘못된 입력 → 인증 에러 우선 반환 (Zod 에러 아님)', async () => {
      setupRoleAuthFailure();

      const { createActivityLog } = await import(
        '@/app/(dashboard)/consultant/projects/[id]/actions'
      );

      // type과 content가 잘못됨 (Zod 실패 확실)
      const result = await createActivityLog(
        'some-project-id',
        '' as never, // 빈 type
        '',          // 빈 content
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toMatch(AUTH_ERROR_PATTERN);
        expect(result.error).not.toMatch(ZOD_ERROR_PATTERN);
      }
    });
  });

  describe('updateActivityLog', () => {
    it('미인증 + 잘못된 입력 → 인증 에러 우선 반환 (Zod 에러 아님)', async () => {
      setupRoleAuthFailure();

      const { updateActivityLog } = await import(
        '@/app/(dashboard)/consultant/projects/[id]/actions'
      );

      // content가 빈 문자열 (Zod 실패 확실)
      const result = await updateActivityLog(
        'some-log-id',
        'some-project-id',
        '',
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toMatch(AUTH_ERROR_PATTERN);
        expect(result.error).not.toMatch(ZOD_ERROR_PATTERN);
      }
    });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // messages — sendMessage, createConversation
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  describe('sendMessage', () => {
    it('미인증 + 잘못된 입력 → 인증 에러 우선 반환 (Zod 에러 아님)', async () => {
      setupAuthFailure();

      const { sendMessage } = await import(
        '@/app/(dashboard)/dashboard/messages/actions'
      );

      // 빈 conversation_id + 빈 content (Zod 실패 확실)
      const result = await sendMessage('', '');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toMatch(AUTH_ERROR_PATTERN);
        expect(result.error).not.toMatch(ZOD_ERROR_PATTERN);
      }
    });
  });

  describe('createConversation', () => {
    it('미인증 + 잘못된 입력 → 인증 에러 우선 반환 (Zod 에러 아님)', async () => {
      setupAuthFailure();

      const { createConversation } = await import(
        '@/app/(dashboard)/dashboard/messages/actions'
      );

      // 빈 recipientId (Zod 실패 확실)
      const result = await createConversation('');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toMatch(AUTH_ERROR_PATTERN);
        expect(result.error).not.toMatch(ZOD_ERROR_PATTERN);
      }
    });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // test-roadmap — createTestRoadmap
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  describe('createTestRoadmap', () => {
    it('미인증 + 잘못된 입력 → 인증 에러 우선 반환 (Zod 에러 아님)', async () => {
      setupRoleAuthFailure();

      const { createTestRoadmap } = await import(
        '@/app/(dashboard)/test-roadmap/actions'
      );

      // 완전히 잘못된 입력 (Zod 실패 확실)
      const invalidInput = {
        company_name: '', // min 2
        industry: 'INVALID',
        company_size: '',
        job_tasks: [],
        pain_points: [],
        improvement_goals: [],
      };

      const result = await createTestRoadmap(invalidInput as never);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toMatch(AUTH_ERROR_PATTERN);
        expect(result.error).not.toMatch(ZOD_ERROR_PATTERN);
      }
    });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // consultant/roadmap — createRoadmap
  // (이전에 Zod가 인증보다 먼저 실행되는 위반이 있었으며, 수정 완료됨)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  describe('createRoadmap', () => {
    it('미인증 + 잘못된 입력 → 인증 에러 우선 반환 (Zod 에러 아님)', async () => {
      setupRoleAuthFailure();

      const { createRoadmap } = await import(
        '@/app/(dashboard)/consultant/projects/[id]/roadmap/actions'
      );

      // projectId를 빈 문자열로 전달 (Zod 실패 확실)
      const result = await createRoadmap('');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toMatch(AUTH_ERROR_PATTERN);
        expect(result.error).not.toMatch(ZOD_ERROR_PATTERN);
      }
    });
  });
});
