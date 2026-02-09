import { describe, it, expect } from 'vitest';
import { createActivityLogSchema, updateActivityLogSchema } from './activity-log';
import { ACTIVITY_LOG_MAX_LENGTH, MANUAL_ACTIVITY_LOG_TYPES } from '@/lib/constants/activity-log';

describe('createActivityLogSchema', () => {
  const validData = {
    type: 'pre_research' as const,
    content: '기업 홈페이지와 산업 동향을 사전 조사했습니다.',
  };

  it('should accept valid activity log data', () => {
    const result = createActivityLogSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should accept all manual activity log types', () => {
    MANUAL_ACTIVITY_LOG_TYPES.forEach((type) => {
      const result = createActivityLogSchema.safeParse({ ...validData, type });
      expect(result.success).toBe(true);
    });
  });

  it('should reject system_auto type', () => {
    const result = createActivityLogSchema.safeParse({
      ...validData,
      type: 'system_auto',
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid type', () => {
    const result = createActivityLogSchema.safeParse({
      ...validData,
      type: 'invalid_type',
    });
    expect(result.success).toBe(false);
  });

  it('should reject empty content', () => {
    const result = createActivityLogSchema.safeParse({
      ...validData,
      content: '',
    });
    expect(result.success).toBe(false);
  });

  it('should reject content exceeding max length', () => {
    const result = createActivityLogSchema.safeParse({
      ...validData,
      content: 'A'.repeat(ACTIVITY_LOG_MAX_LENGTH + 1),
    });
    expect(result.success).toBe(false);
  });

  it('should accept content at max length', () => {
    const result = createActivityLogSchema.safeParse({
      ...validData,
      content: 'A'.repeat(ACTIVITY_LOG_MAX_LENGTH),
    });
    expect(result.success).toBe(true);
  });

  it('should reject missing type', () => {
    const result = createActivityLogSchema.safeParse({
      content: '내용',
    });
    expect(result.success).toBe(false);
  });

  it('should reject missing content', () => {
    const result = createActivityLogSchema.safeParse({
      type: 'field_note',
    });
    expect(result.success).toBe(false);
  });
});

describe('updateActivityLogSchema', () => {
  it('should accept valid content', () => {
    const result = updateActivityLogSchema.safeParse({
      content: '수정된 내용입니다.',
    });
    expect(result.success).toBe(true);
  });

  it('should reject empty content', () => {
    const result = updateActivityLogSchema.safeParse({
      content: '',
    });
    expect(result.success).toBe(false);
  });

  it('should reject content exceeding max length', () => {
    const result = updateActivityLogSchema.safeParse({
      content: 'A'.repeat(ACTIVITY_LOG_MAX_LENGTH + 1),
    });
    expect(result.success).toBe(false);
  });

  it('should accept content at max length', () => {
    const result = updateActivityLogSchema.safeParse({
      content: 'A'.repeat(ACTIVITY_LOG_MAX_LENGTH),
    });
    expect(result.success).toBe(true);
  });
});
