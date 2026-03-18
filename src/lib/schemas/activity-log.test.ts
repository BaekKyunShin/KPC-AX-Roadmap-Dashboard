import { describe, it, expect } from 'vitest';
import { createActivityLogSchema, updateActivityLogSchema } from './activity-log';
import { ACTIVITY_LOG_MAX_LENGTH, MANUAL_ACTIVITY_LOG_TYPES } from '@/lib/constants/activity-log';

describe('createActivityLogSchema', () => {
  const validData = {
    type: 'pre_research' as const,
    content: '기업 홈페이지와 산업 동향을 사전 조사했습니다.',
  };

  it('유효한 활동 일지 데이터를 허용한다', () => {
    const result = createActivityLogSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('모든 수동 활동 일지 유형을 허용한다', () => {
    MANUAL_ACTIVITY_LOG_TYPES.forEach((type) => {
      const result = createActivityLogSchema.safeParse({ ...validData, type });
      expect(result.success).toBe(true);
    });
  });

  it('system_auto 유형을 거부한다', () => {
    const result = createActivityLogSchema.safeParse({
      ...validData,
      type: 'system_auto',
    });
    expect(result.success).toBe(false);
  });

  it('잘못된 유형을 거부한다', () => {
    const result = createActivityLogSchema.safeParse({
      ...validData,
      type: 'invalid_type',
    });
    expect(result.success).toBe(false);
  });

  it('빈 내용을 거부한다', () => {
    const result = createActivityLogSchema.safeParse({
      ...validData,
      content: '',
    });
    expect(result.success).toBe(false);
  });

  it('최대 길이 초과 내용을 거부한다', () => {
    const result = createActivityLogSchema.safeParse({
      ...validData,
      content: 'A'.repeat(ACTIVITY_LOG_MAX_LENGTH + 1),
    });
    expect(result.success).toBe(false);
  });

  it('최대 길이의 내용을 허용한다', () => {
    const result = createActivityLogSchema.safeParse({
      ...validData,
      content: 'A'.repeat(ACTIVITY_LOG_MAX_LENGTH),
    });
    expect(result.success).toBe(true);
  });

  it('유형 누락을 거부한다', () => {
    const result = createActivityLogSchema.safeParse({
      content: '내용',
    });
    expect(result.success).toBe(false);
  });

  it('내용 누락을 거부한다', () => {
    const result = createActivityLogSchema.safeParse({
      type: 'field_note',
    });
    expect(result.success).toBe(false);
  });
});

describe('updateActivityLogSchema', () => {
  it('유효한 내용을 허용한다', () => {
    const result = updateActivityLogSchema.safeParse({
      content: '수정된 내용입니다.',
    });
    expect(result.success).toBe(true);
  });

  it('빈 내용을 거부한다', () => {
    const result = updateActivityLogSchema.safeParse({
      content: '',
    });
    expect(result.success).toBe(false);
  });

  it('최대 길이 초과 내용을 거부한다', () => {
    const result = updateActivityLogSchema.safeParse({
      content: 'A'.repeat(ACTIVITY_LOG_MAX_LENGTH + 1),
    });
    expect(result.success).toBe(false);
  });

  it('최대 길이의 내용을 허용한다', () => {
    const result = updateActivityLogSchema.safeParse({
      content: 'A'.repeat(ACTIVITY_LOG_MAX_LENGTH),
    });
    expect(result.success).toBe(true);
  });
});
