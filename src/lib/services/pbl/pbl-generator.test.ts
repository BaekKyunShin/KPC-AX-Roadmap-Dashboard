import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PBLContent } from './pbl-types';
import sampleLLMResponse from './__fixtures__/sample-llm-response.json';

const callLLMForJSONMock = vi.fn();
vi.mock('../llm', () => ({
  callLLMForJSON: (...args: unknown[]) => callLLMForJSONMock(...args),
}));

// 동적 import (mock 설정 이후)
import { generatePBLContent, PBLGenerationError } from './pbl-generator';

function createValidPBLContent(): PBLContent {
  return structuredClone(sampleLLMResponse) as PBLContent;
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

    expect(result.content.operation_plan.training_goal).toContain('불량');
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
