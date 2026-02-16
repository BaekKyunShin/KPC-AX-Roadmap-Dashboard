import { describe, expect, it } from 'vitest';
import { updateQuotaSchema } from './quota';

describe('updateQuotaSchema', () => {
  const validUuid = '550e8400-e29b-41d4-a716-446655440000';

  describe('유효한 입력', () => {
    it('dailyLimit만 있는 경우 통과', () => {
      const result = updateQuotaSchema.safeParse({
        userId: validUuid,
        dailyLimit: 100,
      });
      expect(result.success).toBe(true);
    });

    it('monthlyLimit만 있는 경우 통과', () => {
      const result = updateQuotaSchema.safeParse({
        userId: validUuid,
        monthlyLimit: 1000,
      });
      expect(result.success).toBe(true);
    });

    it('둘 다 있는 경우 통과', () => {
      const result = updateQuotaSchema.safeParse({
        userId: validUuid,
        dailyLimit: 50,
        monthlyLimit: 500,
      });
      expect(result.success).toBe(true);
    });

    it('경계값 최소 (1) 통과', () => {
      const result = updateQuotaSchema.safeParse({
        userId: validUuid,
        dailyLimit: 1,
        monthlyLimit: 1,
      });
      expect(result.success).toBe(true);
    });

    it('경계값 최대 (500, 10000) 통과', () => {
      const result = updateQuotaSchema.safeParse({
        userId: validUuid,
        dailyLimit: 500,
        monthlyLimit: 10000,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('유효하지 않은 입력', () => {
    it('userId가 UUID가 아니면 실패', () => {
      const result = updateQuotaSchema.safeParse({
        userId: 'not-a-uuid',
        dailyLimit: 50,
      });
      expect(result.success).toBe(false);
    });

    it('userId가 빈 문자열이면 실패', () => {
      const result = updateQuotaSchema.safeParse({
        userId: '',
        dailyLimit: 50,
      });
      expect(result.success).toBe(false);
    });

    it('dailyLimit가 0이면 실패', () => {
      const result = updateQuotaSchema.safeParse({
        userId: validUuid,
        dailyLimit: 0,
      });
      expect(result.success).toBe(false);
    });

    it('dailyLimit가 음수면 실패', () => {
      const result = updateQuotaSchema.safeParse({
        userId: validUuid,
        dailyLimit: -10,
      });
      expect(result.success).toBe(false);
    });

    it('dailyLimit가 소수면 실패', () => {
      const result = updateQuotaSchema.safeParse({
        userId: validUuid,
        dailyLimit: 50.5,
      });
      expect(result.success).toBe(false);
    });

    it('dailyLimit가 500 초과면 실패', () => {
      const result = updateQuotaSchema.safeParse({
        userId: validUuid,
        dailyLimit: 501,
      });
      expect(result.success).toBe(false);
    });

    it('monthlyLimit가 10000 초과면 실패', () => {
      const result = updateQuotaSchema.safeParse({
        userId: validUuid,
        monthlyLimit: 10001,
      });
      expect(result.success).toBe(false);
    });

    it('둘 다 없으면 실패 (최소 하나 필수)', () => {
      const result = updateQuotaSchema.safeParse({
        userId: validUuid,
      });
      expect(result.success).toBe(false);
    });
  });
});
