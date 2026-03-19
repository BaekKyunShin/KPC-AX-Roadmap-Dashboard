/**
 * /api/matching/generate Route Handler 테스트
 *
 * 테스트 대상: POST 핸들러
 * - 인증 검사 (401)
 * - 역할 검사 (403)
 * - 입력 검증 (400)
 * - 정상 응답 (200, JSON)
 * - 프로젝트/LLM 서비스 에러 처리 (500)
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';
import { createClient } from '@/lib/supabase/server';
import { generateLLMMatchingRecommendations } from '@/lib/services/matching';
import { createMockSupabase } from '@/test/helpers/mock-supabase';

// ─── 외부 모듈 모킹 ────────────────────────────────────────────────────────

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/services/matching', () => ({
  generateLLMMatchingRecommendations: vi.fn(),
}));

// ─── 테스트 헬퍼 ────────────────────────────────────────────────────────────

const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440001';
const TEST_PROJECT_ID = '550e8400-e29b-41d4-a716-446655440002';

const API_URL = 'http://localhost:3000/api/matching/generate';

/** POST 요청용 NextRequest 생성 */
function makeRequest(body: unknown): NextRequest {
  return new NextRequest(API_URL, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

/** 인증된 사용자 mock 설정 */
function setupAuthenticatedUser(role: 'OPS_ADMIN' | 'SYSTEM_ADMIN' = 'OPS_ADMIN') {
  const mock = createMockSupabase({ authUser: { id: TEST_USER_ID } });
  mock.addResult({ data: { role }, error: null });
  vi.mocked(createClient).mockResolvedValue(mock.client as never);
  return mock;
}

/** 매칭 결과 샘플 */
const MOCK_RECOMMENDATIONS = [
  {
    userId: '550e8400-e29b-41d4-a716-446655440010',
    totalScore: 92,
    rationale: {
      analysis: '제조업 AI 도입 경험이 풍부한 컨설턴트',
      strengths: ['제조업 전문성', 'AI 교육 경력 5년'],
      considerations: ['현재 프로젝트 2건 진행 중'],
    },
  },
  {
    userId: '550e8400-e29b-41d4-a716-446655440011',
    totalScore: 85,
    rationale: {
      analysis: '데이터 분석 역량이 뛰어난 컨설턴트',
      strengths: ['데이터 분석 전문', '높은 고객 만족도'],
      considerations: ['제조업 경험 제한적'],
    },
  },
];

// ─── 테스트 ────────────────────────────────────────────────────────────────

afterEach(() => {
  vi.restoreAllMocks();
});

describe('POST /api/matching/generate', () => {
  // ─── 인증 ────────────────────────────────────────────────────────────────

  it('인증되지 않은 요청 → 401 응답', async () => {
    const mock = createMockSupabase({ authUser: null });
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    const req = makeRequest({ projectId: TEST_PROJECT_ID });
    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.error).toBe('인증되지 않은 사용자입니다.');
  });

  // ─── 역할 권한 ──────────────────────────────────────────────────────────

  it('권한 없는 역할(CONSULTANT_APPROVED) → 403 응답', async () => {
    const mock = createMockSupabase({ authUser: { id: TEST_USER_ID } });
    mock.addResult({ data: { role: 'CONSULTANT_APPROVED' }, error: null });
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    const req = makeRequest({ projectId: TEST_PROJECT_ID });
    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.success).toBe(false);
    expect(body.error).toBe('권한이 없습니다.');
  });

  it('역할 조회 실패(null) → 403 응답', async () => {
    const mock = createMockSupabase({ authUser: { id: TEST_USER_ID } });
    mock.addResult({ data: null, error: null });
    vi.mocked(createClient).mockResolvedValue(mock.client as never);

    const req = makeRequest({ projectId: TEST_PROJECT_ID });
    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.success).toBe(false);
  });

  // ─── 입력 검증 ──────────────────────────────────────────────────────────

  it('유효하지 않은 요청 바디(projectId 누락) → 400 응답', async () => {
    setupAuthenticatedUser();

    const req = makeRequest({});
    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toBe('입력 데이터가 올바르지 않습니다.');
  });

  it('유효하지 않은 projectId 형식(UUID 아님) → 400 응답', async () => {
    setupAuthenticatedUser();

    const req = makeRequest({ projectId: 'not-a-uuid' });
    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
  });

  // ─── 정상 플로우 ────────────────────────────────────────────────────────

  it('정상 요청 시 매칭 결과 포함 200 응답', async () => {
    setupAuthenticatedUser();
    vi.mocked(generateLLMMatchingRecommendations).mockResolvedValue(MOCK_RECOMMENDATIONS);

    const req = makeRequest({ projectId: TEST_PROJECT_ID });
    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');
    expect(body.success).toBe(true);
    expect(body.data.recommendations).toEqual(MOCK_RECOMMENDATIONS);
    expect(body.data.recommendations).toHaveLength(2);
  });

  it('SYSTEM_ADMIN 역할도 정상 접근 가능', async () => {
    setupAuthenticatedUser('SYSTEM_ADMIN');
    vi.mocked(generateLLMMatchingRecommendations).mockResolvedValue(MOCK_RECOMMENDATIONS);

    const req = makeRequest({ projectId: TEST_PROJECT_ID });
    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
  });

  it('정상 요청 시 LLM 서비스에 올바른 인자 전달', async () => {
    setupAuthenticatedUser();
    vi.mocked(generateLLMMatchingRecommendations).mockResolvedValue([]);

    const req = makeRequest({
      projectId: TEST_PROJECT_ID,
      topN: 5,
      preserveStatus: true,
    });
    await POST(req);

    expect(generateLLMMatchingRecommendations).toHaveBeenCalledWith(
      TEST_PROJECT_ID,
      TEST_USER_ID,
      { topN: 5, preserveStatus: true },
    );
  });

  // ─── 에러 처리 ──────────────────────────────────────────────────────────

  it('LLM 서비스 호출 실패 시 500 응답', async () => {
    setupAuthenticatedUser();
    vi.mocked(generateLLMMatchingRecommendations).mockRejectedValue(
      new Error('LLM API 호출 실패'),
    );

    const req = makeRequest({ projectId: TEST_PROJECT_ID });
    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error).toBe('매칭 추천 생성 중 오류가 발생했습니다.');
  });
});
