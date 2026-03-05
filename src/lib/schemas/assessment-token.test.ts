import { describe, it, expect } from 'vitest';

import {
  createAssessmentTokenSchema,
  publicSelfAssessmentSchema,
} from './assessment-token';

describe('createAssessmentTokenSchema', () => {
  const validData = {
    project_id: '550e8400-e29b-41d4-a716-446655440000',
    expires_in_days: 14,
  };

  it('유효한 데이터를 허용해야 한다', () => {
    const result = createAssessmentTokenSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('expires_in_days 기본값이 14일이어야 한다', () => {
    const result = createAssessmentTokenSchema.safeParse({
      project_id: validData.project_id,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.expires_in_days).toBe(14);
    }
  });

  it('문자열 expires_in_days를 숫자로 변환해야 한다', () => {
    const result = createAssessmentTokenSchema.safeParse({
      ...validData,
      expires_in_days: '30',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.expires_in_days).toBe(30);
    }
  });

  it('유효하지 않은 project_id를 거부해야 한다', () => {
    const result = createAssessmentTokenSchema.safeParse({
      ...validData,
      project_id: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('0일 이하 만료일을 거부해야 한다', () => {
    const result = createAssessmentTokenSchema.safeParse({
      ...validData,
      expires_in_days: 0,
    });
    expect(result.success).toBe(false);
  });

  it('60일 초과 만료일을 거부해야 한다', () => {
    const result = createAssessmentTokenSchema.safeParse({
      ...validData,
      expires_in_days: 61,
    });
    expect(result.success).toBe(false);
  });
});

describe('publicSelfAssessmentSchema', () => {
  const validData = {
    token: 'abc123def456',
    submitted_by_name: '홍길동',
    submitted_by_title: '부장',
    submitted_by_email: 'hong@company.com',
    template_id: '550e8400-e29b-41d4-a716-446655440000',
    answers: [{ question_id: 'q1', answer_value: 3 }],
  };

  it('유효한 데이터를 허용해야 한다', () => {
    const result = publicSelfAssessmentSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('빈 토큰을 거부해야 한다', () => {
    const result = publicSelfAssessmentSchema.safeParse({
      ...validData,
      token: '',
    });
    expect(result.success).toBe(false);
  });

  it('이름이 2자 미만이면 거부해야 한다', () => {
    const result = publicSelfAssessmentSchema.safeParse({
      ...validData,
      submitted_by_name: '홍',
    });
    expect(result.success).toBe(false);
  });

  it('이름이 50자 초과이면 거부해야 한다', () => {
    const result = publicSelfAssessmentSchema.safeParse({
      ...validData,
      submitted_by_name: '가'.repeat(51),
    });
    expect(result.success).toBe(false);
  });

  it('빈 직책을 거부해야 한다', () => {
    const result = publicSelfAssessmentSchema.safeParse({
      ...validData,
      submitted_by_title: '',
    });
    expect(result.success).toBe(false);
  });

  it('유효하지 않은 이메일을 거부해야 한다', () => {
    const result = publicSelfAssessmentSchema.safeParse({
      ...validData,
      submitted_by_email: 'not-email',
    });
    expect(result.success).toBe(false);
  });

  it('유효하지 않은 template_id를 거부해야 한다', () => {
    const result = publicSelfAssessmentSchema.safeParse({
      ...validData,
      template_id: 'bad-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('빈 answers 배열을 거부해야 한다', () => {
    const result = publicSelfAssessmentSchema.safeParse({
      ...validData,
      answers: [],
    });
    expect(result.success).toBe(false);
  });

  it('여러 응답을 허용해야 한다', () => {
    const result = publicSelfAssessmentSchema.safeParse({
      ...validData,
      answers: [
        { question_id: 'q1', answer_value: 1 },
        { question_id: 'q2', answer_value: 5 },
        { question_id: 'q3', answer_value: 3 },
      ],
    });
    expect(result.success).toBe(true);
  });
});
