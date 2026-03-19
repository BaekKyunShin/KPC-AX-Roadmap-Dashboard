/**
 * interview-guide.ts 테스트
 * - generateInterviewGuideData: LLM 호출, 입력 검증, 에러 처리
 */

import { describe, it, expect, vi, afterEach } from 'vitest';

// ─── 모킹 ─────────────────────────────────────────────────────────────────

vi.mock('./llm', () => ({
  callLLMForJSON: vi.fn(),
}));

import { generateInterviewGuideData } from './interview-guide';
import type { InterviewGuideInput } from './interview-guide';
import { callLLMForJSON } from './llm';
import type { GuideData } from '@/lib/schemas/interview-guide';

// ─── 테스트 데이터 헬퍼 ──────────────────────────────────────────────────────

function createTestInput(overrides: Partial<InterviewGuideInput> = {}): InterviewGuideInput {
  return {
    companyName: '테스트 기업',
    industry: 'IT',
    companySize: '50명',
    customerComment: '빠른 AI 도입 희망',
    scores: {
      total_score: 60,
      max_possible_score: 100,
      dimension_scores: [
        { dimension: 'AI 성숙도', score: 15, max_score: 20 },
        { dimension: '데이터 준비도', score: 5, max_score: 20 },
        { dimension: '인프라 준비도', score: 12, max_score: 20 },
        { dimension: '인력 준비도', score: 18, max_score: 20 },
        { dimension: '문제 명확성', score: 10, max_score: 20 },
      ],
    },
    answers: [
      { question_id: 'q1', answer_value: 4 },
      { question_id: 'q2', answer_value: 2 },
      { question_id: 'q3', answer_value: 3 },
    ],
    questions: [
      { id: 'q1', order: 1, dimension: 'AI 성숙도', question_text: 'AI 도입 경험이 있나요?', weight: 1 },
      { id: 'q2', order: 2, dimension: '데이터 준비도', question_text: '데이터 관리 체계가 있나요?', weight: 1 },
      { id: 'q3', order: 3, dimension: '인프라 준비도', question_text: 'GPU 서버가 있나요?', weight: 1 },
    ],
    ...overrides,
  };
}

const MOCK_GUIDE_DATA: GuideData = {
  company_summary: '테스트 기업은 IT 업종의 50명 규모 기업으로, AI 성숙도는 양호하나 데이터 준비도가 부족합니다.',
  key_points: [
    { dimension: 'AI 성숙도', score_percent: 75, status: 'good', insight: 'AI 도입 경험이 있어 기반이 탄탄합니다.' },
    { dimension: '데이터 준비도', score_percent: 25, status: 'critical', insight: '데이터 관리 체계가 미흡합니다.' },
    { dimension: '인프라 준비도', score_percent: 60, status: 'warning', insight: '기본 인프라는 갖추었으나 GPU 서버가 부족합니다.' },
    { dimension: '인력 준비도', score_percent: 90, status: 'good', insight: '인력 역량이 우수합니다.' },
    { dimension: '문제 명확성', score_percent: 50, status: 'warning', insight: '해결할 문제가 다소 불명확합니다.' },
  ],
  questions: [
    { id: 'q1', dimension: '데이터 준비도', question: '현재 데이터 수집 방식은?', intent: '데이터 파이프라인 파악', checked: true, is_custom: false },
    { id: 'q2', dimension: '인프라 준비도', question: '클라우드 서비스 사용 계획이 있나요?', intent: '인프라 확장 의향 확인', checked: true, is_custom: false },
  ],
  cautions: [
    'AI 성숙도는 높지만 데이터 준비도가 낮아 갭이 존재합니다.',
    '고객이 빠른 도입을 희망하므로 기대 관리가 필요합니다.',
  ],
};

// ─── 테스트 ────────────────────────────────────────────────────────────────

describe('generateInterviewGuideData', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('LLM 정상 응답 시 인터뷰 가이드 데이터를 반환한다', async () => {
    vi.mocked(callLLMForJSON).mockResolvedValue(MOCK_GUIDE_DATA);

    const input = createTestInput();
    const result = await generateInterviewGuideData(input);

    expect(result.company_summary).toBe(
      '테스트 기업은 IT 업종의 50명 규모 기업으로, AI 성숙도는 양호하나 데이터 준비도가 부족합니다.',
    );
    expect(result.key_points).toHaveLength(5);
    expect(result.questions).toHaveLength(2);
    expect(result.cautions).toHaveLength(2);
  });

  it('callLLMForJSON에 system/user 메시지와 maxTokens 옵션을 전달한다', async () => {
    vi.mocked(callLLMForJSON).mockResolvedValue(MOCK_GUIDE_DATA);

    const input = createTestInput();
    await generateInterviewGuideData(input);

    expect(callLLMForJSON).toHaveBeenCalledOnce();
    const [messages, options] = vi.mocked(callLLMForJSON).mock.calls[0];
    expect(messages).toHaveLength(2);
    expect(messages[0]).toEqual({ role: 'system', content: expect.stringContaining('기업 AI 교육 진단 분석 전문가') });
    expect(messages[1]).toEqual({ role: 'user', content: expect.stringContaining('테스트 기업') });
    expect(options).toEqual({ maxTokens: 8000 });
  });

  it('user 프롬프트에 기업 정보가 포함된다', async () => {
    vi.mocked(callLLMForJSON).mockResolvedValue(MOCK_GUIDE_DATA);

    const input = createTestInput({
      companyName: '에이비씨 주식회사',
      industry: '제조',
      companySize: '200명',
      customerComment: '설비 자동화 관심',
    });
    await generateInterviewGuideData(input);

    const userMessage = vi.mocked(callLLMForJSON).mock.calls[0][0][1].content;
    expect(userMessage).toContain('에이비씨 주식회사');
    expect(userMessage).toContain('제조');
    expect(userMessage).toContain('200명');
    expect(userMessage).toContain('설비 자동화 관심');
  });

  it('user 프롬프트에 영역별 점수와 문항별 응답이 포함된다', async () => {
    vi.mocked(callLLMForJSON).mockResolvedValue(MOCK_GUIDE_DATA);

    const input = createTestInput();
    await generateInterviewGuideData(input);

    const userMessage = vi.mocked(callLLMForJSON).mock.calls[0][0][1].content;

    // 총점 정보
    expect(userMessage).toContain('60/100');
    expect(userMessage).toContain('60%');

    // 영역별 점수
    expect(userMessage).toContain('AI 성숙도');
    expect(userMessage).toContain('15/20');
    expect(userMessage).toContain('75%');
    expect(userMessage).toContain('데이터 준비도');
    expect(userMessage).toContain('5/20');
    expect(userMessage).toContain('25%');

    // 문항별 응답
    expect(userMessage).toContain('AI 도입 경험이 있나요?');
    expect(userMessage).toContain('4점');
  });

  it('customerComment가 null이면 고객 요청사항 줄이 프롬프트에 없다', async () => {
    vi.mocked(callLLMForJSON).mockResolvedValue(MOCK_GUIDE_DATA);

    const input = createTestInput({ customerComment: null });
    await generateInterviewGuideData(input);

    const userMessage = vi.mocked(callLLMForJSON).mock.calls[0][0][1].content;
    expect(userMessage).not.toContain('고객 요청사항');
  });

  it('LLM 호출 실패 시 에러가 전파된다', async () => {
    vi.mocked(callLLMForJSON).mockRejectedValue(new Error('LLM API 호출 실패: 500'));

    const input = createTestInput();

    await expect(generateInterviewGuideData(input)).rejects.toThrow('LLM API 호출 실패: 500');
  });

  it('빈 진단 결과(dimension_scores 빈 배열)로 호출해도 에러 없이 LLM을 호출한다', async () => {
    vi.mocked(callLLMForJSON).mockResolvedValue(MOCK_GUIDE_DATA);

    const input = createTestInput({
      scores: {
        total_score: 0,
        max_possible_score: 100,
        dimension_scores: [],
      },
      answers: [],
      questions: [],
    });

    const result = await generateInterviewGuideData(input);

    expect(callLLMForJSON).toHaveBeenCalledOnce();
    expect(result).toEqual(MOCK_GUIDE_DATA);
  });

  it('응답에서 미응답 문항은 "미응답"으로 표시된다', async () => {
    vi.mocked(callLLMForJSON).mockResolvedValue(MOCK_GUIDE_DATA);

    const input = createTestInput({
      // q3에 대한 답변 없음 → 미응답
      answers: [
        { question_id: 'q1', answer_value: 4 },
        { question_id: 'q2', answer_value: 2 },
      ],
      questions: [
        { id: 'q1', order: 1, dimension: 'AI 성숙도', question_text: 'AI 도입 경험이 있나요?', weight: 1 },
        { id: 'q2', order: 2, dimension: '데이터 준비도', question_text: '데이터 관리 체계가 있나요?', weight: 1 },
        { id: 'q3', order: 3, dimension: '인프라 준비도', question_text: 'GPU 서버가 있나요?', weight: 1 },
      ],
    });

    await generateInterviewGuideData(input);

    const userMessage = vi.mocked(callLLMForJSON).mock.calls[0][0][1].content;
    expect(userMessage).toContain('미응답');
  });
});
