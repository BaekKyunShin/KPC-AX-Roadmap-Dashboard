import { describe, it, expect } from 'vitest';
import { matchingGenerateSchema } from './matching';

describe('matchingGenerateSchema', () => {
  const validUuid = '550e8400-e29b-41d4-a716-446655440000';

  it('유효한 projectId만 → 통과 (기본값 적용)', () => {
    const result = matchingGenerateSchema.safeParse({
      projectId: validUuid,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.topN).toBe(3);
      expect(result.data.preserveStatus).toBe(false);
    }
  });

  it('모든 필드 유효 → 통과', () => {
    const result = matchingGenerateSchema.safeParse({
      projectId: validUuid,
      topN: 5,
      preserveStatus: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.topN).toBe(5);
      expect(result.data.preserveStatus).toBe(true);
    }
  });

  it('projectId가 UUID 형식이 아님 → 실패', () => {
    const result = matchingGenerateSchema.safeParse({
      projectId: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('projectId 누락 → 실패', () => {
    const result = matchingGenerateSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('topN이 0 이하 → 실패', () => {
    const result = matchingGenerateSchema.safeParse({
      projectId: validUuid,
      topN: 0,
    });
    expect(result.success).toBe(false);
  });

  it('topN이 음수 → 실패', () => {
    const result = matchingGenerateSchema.safeParse({
      projectId: validUuid,
      topN: -999,
    });
    expect(result.success).toBe(false);
  });

  it('topN이 10 초과 → 실패', () => {
    const result = matchingGenerateSchema.safeParse({
      projectId: validUuid,
      topN: 11,
    });
    expect(result.success).toBe(false);
  });

  it('topN이 소수점 → 실패', () => {
    const result = matchingGenerateSchema.safeParse({
      projectId: validUuid,
      topN: 3.5,
    });
    expect(result.success).toBe(false);
  });

  it('preserveStatus가 boolean이 아님 → 실패', () => {
    const result = matchingGenerateSchema.safeParse({
      projectId: validUuid,
      preserveStatus: 'yes',
    });
    expect(result.success).toBe(false);
  });
});
