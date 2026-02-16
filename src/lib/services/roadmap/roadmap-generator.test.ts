/**
 * roadmap-generator.ts 테스트
 * - generateRoadmap: FINALIZED 프로젝트에서 역방향 상태 전이 방지 (#37)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── 모킹 ─────────────────────────────────────────────────────────────────

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(),
}));

vi.mock('../llm', () => ({
  callLLMForJSON: vi.fn(),
}));

vi.mock('../audit', () => ({
  createAuditLog: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../notification', () => ({
  createNotificationForAdmins: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../quota', () => ({
  checkAndRecordLLMUsage: vi.fn().mockResolvedValue({ exceeded: false }),
}));

vi.mock('./roadmap-prompts', () => ({
  buildSystemPrompt: vi.fn().mockReturnValue('system prompt'),
  buildUserPrompt: vi.fn().mockReturnValue('user prompt'),
}));

import { generateRoadmap } from './roadmap-generator';
import { createAdminClient } from '@/lib/supabase/admin';
import { callLLMForJSON } from '../llm';

// ─── 헬퍼: Supabase 체인 모킹 ─────────────────────────────────────────────

/** 프로젝트 상태 업데이트 호출을 추적하기 위한 모킹 */
function createMockSupabase(projectStatus: string) {
  const updateFn = vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue({ data: null, error: null }),
  });

  const mockClient = {
    from: vi.fn((table: string) => {
      if (table === 'projects') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: 'project-1',
                  status: projectStatus,
                  company_name: '테스트 기업',
                  assigned_consultant_id: 'consultant-1',
                },
                error: null,
              }),
              limit: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: null }),
              }),
            }),
          }),
          update: updateFn,
        };
      }

      if (table === 'self_assessments') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [{ id: 'sa-1', answers: {} }],
              error: null,
            }),
          }),
        };
      }

      if (table === 'interviews') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: [{ id: 'interview-1', stt_insights: { key_topics: [], pain_points: [] } }],
              error: null,
            }),
          }),
        };
      }

      if (table === 'consultant_profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { specialties: ['AI'], industries: ['IT'] },
                error: null,
              }),
            }),
          }),
        };
      }

      if (table === 'roadmap_versions') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { version_number: 1 },
                    error: null,
                  }),
                }),
              }),
            }),
          }),
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'roadmap-1' },
                error: null,
              }),
            }),
          }),
        };
      }

      // 기본 fallback
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      };
    }),
  };

  return { mockClient, updateFn };
}

// ─── LLM 응답 모킹 ──────────────────────────────────────────────────────

const MOCK_LLM_RESULT = {
  diagnosis_summary: '테스트 진단 요약',
  courses: [
    {
      name: 'AI 기초',
      description: '설명',
      category: 'AI',
      level: '입문',
      recommended_hours: 8,
      curriculum: [{ topic: '주제', hours: 8 }],
      tools: [{ name: '도구', is_free: true }],
    },
  ],
  pbl_course: {
    name: 'PBL',
    description: '설명',
    category: 'PBL',
    level: '중급',
    recommended_hours: 16,
    curriculum: [{ topic: '주제', hours: 16 }],
    tools: [],
  },
};

// ─── 테스트 ────────────────────────────────────────────────────────────────

describe('generateRoadmap — 프로젝트 상태 업데이트', () => {
  beforeEach(() => {
    vi.mocked(callLLMForJSON).mockResolvedValue(MOCK_LLM_RESULT);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    { status: 'INTERVIEWED', shouldUpdate: true, desc: '정상 전이' },
    { status: 'ROADMAP_DRAFTED', shouldUpdate: true, desc: '재생성 시 상태 유지' },
    { status: 'FINALIZED', shouldUpdate: false, desc: '역방향 전이 방지' },
  ])('$status → $desc (update=$shouldUpdate)', async ({ status, shouldUpdate }) => {
    const { mockClient, updateFn } = createMockSupabase(status);
    vi.mocked(createAdminClient).mockReturnValue(mockClient as never);

    await generateRoadmap('project-1', 'user-1', status === 'INTERVIEWED' ? undefined : '수정 요청', false);

    if (shouldUpdate) {
      expect(updateFn).toHaveBeenCalledWith({ status: 'ROADMAP_DRAFTED' });
    } else {
      expect(updateFn).not.toHaveBeenCalled();
    }
  });
});
