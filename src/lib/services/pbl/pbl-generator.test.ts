import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PBLContent } from './pbl-types';
import { PBL_EVALUATION_SCALE_DESCRIPTION } from './pbl-types';

const callLLMForJSONMock = vi.fn();
vi.mock('../llm', () => ({
  callLLMForJSON: (...args: unknown[]) => callLLMForJSONMock(...args),
}));

// 동적 import (mock 설정 이후)
import { generatePBLContent, PBLGenerationError } from './pbl-generator';

function createValidPBLContent(): PBLContent {
  return {
    operation_plan: {
      training_goal: '공정 불량률을 감소시키는 AI 활용 역량 확보',
      ai_tool_usage_plan: [
        {
          stage: '1단계',
          main_activity: '훈련실시',
          ai_tools: ['ChatGPT'],
          utilized_data: '공정 로그',
          purpose: '실습 데이터 분석',
          specific_method: 'AI 도구로 데이터 분석',
        },
        {
          stage: '2단계',
          main_activity: '리뷰',
          ai_tools: ['Cursor'],
          utilized_data: '실습 결과물',
          purpose: '피드백',
          specific_method: '결과 리뷰',
        },
        {
          stage: '3단계',
          main_activity: '평가',
          ai_tools: ['ChatGPT'],
          utilized_data: '평가 데이터',
          purpose: '성과 측정',
          specific_method: '최종 평가',
        },
      ],
      training_plan: {
        overview: {
          course_name: 'AI 기반 품질관리 과정',
          training_period: { start: '2026-05-01', end: '2026-06-30' },
        },
        learning_group: {
          instructors: [
            {
              type: '외부',
              role: '팀장',
              affiliation: 'KPC',
              position: '수석',
              name: '홍길동',
            },
          ],
          trainees: [
            {
              role: '팀원',
              affiliation: '품질팀',
              position: '사원',
              name: '김철수',
            },
          ],
        },
        subject_profile: {
          course_name: 'AI 기반 품질관리 과정',
          total_hours: 16,
          training_goals: ['AI 활용'],
          ai_tools: ['ChatGPT'],
          utilized_data: '공정 로그',
          analysis_method: 'LLM',
          training_contents: [
            {
              unit_name: '데이터 수집',
              detail: '공정 데이터 수집 실습',
              training_hours: 16,
              instructor_hours: { external: 8, internal: 8 },
            },
          ],
          total_sum_hours: 16,
        },
        facilities: [],
        training_instructors: [],
      },
      evaluation_plan: {
        course_evaluation: {
          course_name: 'AI 기반 품질관리 과정',
          evaluation_methods: ['포트폴리오'],
          evaluation_target: '훈련생 전원',
          evaluation_date: '2026-06-25',
          evaluation_criteria: '60% 이상 PASS',
          evaluation_result: '예정',
          performance_checklist: [
            {
              unit_name: '데이터 수집',
              evaluation_criteria: '절차 이해',
              performance_level: 4,
            },
          ],
          overall_comment: '',
          evaluation_scale: PBL_EVALUATION_SCALE_DESCRIPTION,
        },
        result_evaluation: {
          satisfaction_survey: [null, null, null, null, null],
          achievement_survey: [null, null, null],
          external_expert_survey: [null, null, null, null, null],
          practical_application_survey: [null, null, null, null],
        },
      },
    },
    performance_analysis: {
      training_goal_categories: ['불량률 감소'],
      quantitative_metrics: ['훈련 후 불량발생률 15% 감소'],
      qualitative_metrics: ['현장 문제 해결 역량 향상'],
      internalization_plan: ['매뉴얼 제작'],
      dissemination_plan: ['성과 발표회'],
    },
  };
}

describe('generatePBLContent', () => {
  beforeEach(() => {
    callLLMForJSONMock.mockReset();
  });

  it('LLM이 유효한 PBLContent를 반환하면 그대로 리턴한다', async () => {
    const valid = createValidPBLContent();
    callLLMForJSONMock.mockResolvedValueOnce(valid);

    const result = await generatePBLContent({
      interview: {},
      project: { company_name: 'X' },
      consultantProfile: null,
      diagnosisSummary: '요약',
    });

    expect(result.content.operation_plan.training_goal).toContain('불량률');
    expect(result.validation.isValid).toBe(true);
    expect(callLLMForJSONMock).toHaveBeenCalledTimes(1);
  });

  it('LLM이 스키마 위반 응답을 주면 재시도 후 유효한 응답을 받아 성공한다', async () => {
    const invalid = { operation_plan: { training_goal: '' } }; // 구조 불일치
    const valid = createValidPBLContent();

    callLLMForJSONMock
      .mockResolvedValueOnce(invalid)
      .mockResolvedValueOnce(valid);

    const result = await generatePBLContent({
      interview: {},
      project: {},
      consultantProfile: null,
      diagnosisSummary: '요약',
    });

    expect(result.content).toBeDefined();
    expect(callLLMForJSONMock).toHaveBeenCalledTimes(2);
  });

  it('LLM이 3회 연속 스키마 위반이면 PBLGenerationError를 throw', async () => {
    callLLMForJSONMock.mockResolvedValue({ foo: 'bar' });

    await expect(
      generatePBLContent({
        interview: {},
        project: {},
        consultantProfile: null,
        diagnosisSummary: '요약',
      }),
    ).rejects.toThrow(PBLGenerationError);

    expect(callLLMForJSONMock).toHaveBeenCalledTimes(3);
  });

  it('LLM이 네트워크 오류를 던지면 재시도하고, 마지막에 성공하면 반환한다', async () => {
    const valid = createValidPBLContent();
    callLLMForJSONMock
      .mockRejectedValueOnce(new Error('network'))
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValueOnce(valid);

    const result = await generatePBLContent({
      interview: {},
      project: {},
      consultantProfile: null,
      diagnosisSummary: '요약',
    });
    expect(result.content).toBeDefined();
    expect(callLLMForJSONMock).toHaveBeenCalledTimes(3);
  });

  it('revisionPrompt가 전달되면 user 프롬프트에 포함된다', async () => {
    const valid = createValidPBLContent();
    callLLMForJSONMock.mockResolvedValueOnce(valid);

    await generatePBLContent({
      interview: {},
      project: {},
      consultantProfile: null,
      diagnosisSummary: '요약',
      revisionPrompt: 'AI 도구를 더 추가해줘',
    });

    const callArgs = callLLMForJSONMock.mock.calls[0]?.[0] as Array<{ role: string; content: string }>;
    const userMessage = callArgs.find((m) => m.role === 'user')?.content ?? '';
    expect(userMessage).toContain('AI 도구를 더 추가해줘');
    expect(userMessage).toMatch(/수정\s*요청/);
  });
});
