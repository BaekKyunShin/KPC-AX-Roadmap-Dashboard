import { describe, it, expect } from 'vitest';
import { createNotificationSchema } from './notification';

describe('createNotificationSchema', () => {
  const validInput = {
    user_id: '550e8400-e29b-41d4-a716-446655440000',
    type: 'assignment' as const,
    title: '새 프로젝트 배정',
    message: '(주)한국전자 프로젝트가 배정되었습니다.',
    link: '/consultant/projects/550e8400-e29b-41d4-a716-446655440000',
  };

  it('유효한 입력을 통과시킨다', () => {
    expect(createNotificationSchema.safeParse(validInput).success).toBe(true);
  });

  // #012 — 이동 대상이 없는 알림은 클릭해도 아무 화면도 열리지 않아 사용자가 클릭
  // 실패로 오해한다. 그래서 link 를 필수로 바꿨다(예전에는 optional 이었다).
  it('link가 없으면 실패한다', () => {
    const { link: _link, ...withoutLink } = validInput;
    expect(createNotificationSchema.safeParse(withoutLink).success).toBe(false);
  });

  it('link가 빈 문자열이면 실패한다', () => {
    const result = createNotificationSchema.safeParse({ ...validInput, link: '' });
    expect(result.success).toBe(false);
  });

  it('모든 알림 타입을 통과시킨다', () => {
    const types = [
      'assignment',
      'deadline',
      'status_change',
      'message',
      'system',
      'interview_complete',
      'roadmap_draft',
      'roadmap_finalized',
    ] as const;
    for (const type of types) {
      const result = createNotificationSchema.safeParse({ ...validInput, type });
      expect(result.success).toBe(true);
    }
  });

  it('잘못된 UUID를 거부한다', () => {
    const result = createNotificationSchema.safeParse({ ...validInput, user_id: 'invalid' });
    expect(result.success).toBe(false);
  });

  it('잘못된 type을 거부한다', () => {
    const result = createNotificationSchema.safeParse({ ...validInput, type: 'invalid' });
    expect(result.success).toBe(false);
  });

  it('빈 제목을 거부한다', () => {
    const result = createNotificationSchema.safeParse({ ...validInput, title: '' });
    expect(result.success).toBe(false);
  });

  it('빈 내용을 거부한다', () => {
    const result = createNotificationSchema.safeParse({ ...validInput, message: '' });
    expect(result.success).toBe(false);
  });

  it('200자 초과 제목을 거부한다', () => {
    const result = createNotificationSchema.safeParse({
      ...validInput,
      title: 'a'.repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it('500자 초과 내용을 거부한다', () => {
    const result = createNotificationSchema.safeParse({
      ...validInput,
      message: 'a'.repeat(501),
    });
    expect(result.success).toBe(false);
  });
});
