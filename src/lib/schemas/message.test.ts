import { describe, it, expect } from 'vitest';
import { sendMessageSchema, createConversationSchema } from './message';

describe('sendMessageSchema', () => {
  const validInput = {
    conversation_id: '550e8400-e29b-41d4-a716-446655440000',
    content: '안녕하세요, 인터뷰 일정 조율 부탁드립니다.',
  };

  it('유효한 입력을 통과시킨다', () => {
    expect(sendMessageSchema.safeParse(validInput).success).toBe(true);
  });

  it('잘못된 UUID를 거부한다', () => {
    const result = sendMessageSchema.safeParse({ ...validInput, conversation_id: 'invalid' });
    expect(result.success).toBe(false);
  });

  it('빈 내용을 거부한다', () => {
    const result = sendMessageSchema.safeParse({ ...validInput, content: '' });
    expect(result.success).toBe(false);
  });

  it('공백만 있는 내용을 거부한다', () => {
    const result = sendMessageSchema.safeParse({ ...validInput, content: '   ' });
    expect(result.success).toBe(false);
  });

  it('2000자 초과 내용을 거부한다', () => {
    const result = sendMessageSchema.safeParse({ ...validInput, content: 'a'.repeat(2001) });
    expect(result.success).toBe(false);
  });

  it('2000자 정확히는 통과한다', () => {
    const result = sendMessageSchema.safeParse({ ...validInput, content: 'a'.repeat(2000) });
    expect(result.success).toBe(true);
  });

  it('1자 내용은 통과한다', () => {
    const result = sendMessageSchema.safeParse({ ...validInput, content: '가' });
    expect(result.success).toBe(true);
  });
});

describe('createConversationSchema', () => {
  it('유효한 UUID를 통과시킨다', () => {
    const result = createConversationSchema.safeParse({
      recipient_id: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(result.success).toBe(true);
  });

  it('잘못된 UUID를 거부한다', () => {
    const result = createConversationSchema.safeParse({ recipient_id: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });

  it('빈 문자열을 거부한다', () => {
    const result = createConversationSchema.safeParse({ recipient_id: '' });
    expect(result.success).toBe(false);
  });
});
