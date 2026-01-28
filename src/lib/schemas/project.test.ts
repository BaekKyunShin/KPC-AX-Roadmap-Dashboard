import { describe, it, expect } from 'vitest';

import { COMPANY_SIZE_VALUES } from '@/lib/constants/company-size';
import {
  projectStatusSchema,
  createProjectSchema,
  createSelfAssessmentSchema,
  assignConsultantSchema,
  reassignConsultantSchema,
} from './project';

describe('projectStatusSchema', () => {
  const validStatuses = [
    'NEW',
    'DIAGNOSED',
    'MATCH_RECOMMENDED',
    'ASSIGNED',
    'INTERVIEWED',
    'ROADMAP_DRAFTED',
    'FINALIZED',
  ];

  it('should accept valid project statuses', () => {
    validStatuses.forEach((status) => {
      expect(projectStatusSchema.safeParse(status).success).toBe(true);
    });
  });

  it('should reject invalid statuses', () => {
    expect(projectStatusSchema.safeParse('INVALID').success).toBe(false);
    expect(projectStatusSchema.safeParse('new').success).toBe(false);
    expect(projectStatusSchema.safeParse('').success).toBe(false);
  });
});

describe('createProjectSchema', () => {
  const validProject = {
    company_name: '테스트 기업',
    industry: '제조업',
    company_size: '50-299' as const,
    contact_name: '홍길동',
    contact_email: 'hong@test.com',
  };

  it('should accept valid project data', () => {
    const result = createProjectSchema.safeParse(validProject);
    expect(result.success).toBe(true);
  });

  it('should accept project with optional fields', () => {
    const result = createProjectSchema.safeParse({
      ...validProject,
      contact_phone: '010-1234-5678',
      company_address: '서울시 강남구',
      customer_comment: '추가 요청사항입니다.',
    });
    expect(result.success).toBe(true);
  });

  it('should reject short company name', () => {
    const result = createProjectSchema.safeParse({ ...validProject, company_name: '테' });
    expect(result.success).toBe(false);
  });

  it('should reject empty industry', () => {
    const result = createProjectSchema.safeParse({ ...validProject, industry: '' });
    expect(result.success).toBe(false);
  });

  it('should reject invalid company size', () => {
    const result = createProjectSchema.safeParse({ ...validProject, company_size: '10000+' });
    expect(result.success).toBe(false);
  });

  it('should accept all valid company sizes', () => {
    COMPANY_SIZE_VALUES.forEach((size) => {
      const result = createProjectSchema.safeParse({ ...validProject, company_size: size });
      expect(result.success).toBe(true);
    });
  });

  it('should reject invalid email', () => {
    const result = createProjectSchema.safeParse({ ...validProject, contact_email: 'invalid' });
    expect(result.success).toBe(false);
  });

  it('should reject short contact name', () => {
    const result = createProjectSchema.safeParse({ ...validProject, contact_name: '홍' });
    expect(result.success).toBe(false);
  });
});

describe('createSelfAssessmentSchema', () => {
  const validAssessment = {
    project_id: '123e4567-e89b-12d3-a456-426614174000',
    template_id: '123e4567-e89b-12d3-a456-426614174001',
    answers: [
      { question_id: 'q1', answer_value: 3 },
      { question_id: 'q2', answer_value: 4 },
    ],
  };

  it('should accept valid self assessment', () => {
    const result = createSelfAssessmentSchema.safeParse(validAssessment);
    expect(result.success).toBe(true);
  });

  it('should accept assessment with summary text', () => {
    const result = createSelfAssessmentSchema.safeParse({
      ...validAssessment,
      summary_text: '진단 요약입니다.',
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid project_id UUID', () => {
    const result = createSelfAssessmentSchema.safeParse({
      ...validAssessment,
      project_id: 'invalid',
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid template_id UUID', () => {
    const result = createSelfAssessmentSchema.safeParse({
      ...validAssessment,
      template_id: 'invalid',
    });
    expect(result.success).toBe(false);
  });

  it('should reject empty answers array', () => {
    const result = createSelfAssessmentSchema.safeParse({
      ...validAssessment,
      answers: [],
    });
    expect(result.success).toBe(false);
  });

  it('should accept string answer values', () => {
    const result = createSelfAssessmentSchema.safeParse({
      ...validAssessment,
      answers: [{ question_id: 'q1', answer_value: 'text answer' }],
    });
    expect(result.success).toBe(true);
  });
});

describe('assignConsultantSchema', () => {
  const validAssignment = {
    project_id: '123e4567-e89b-12d3-a456-426614174000',
    consultant_id: '123e4567-e89b-12d3-a456-426614174001',
    assignment_reason: '제조업 전문성과 교육 경험이 풍부하여 배정합니다.',
  };

  it('should accept valid assignment', () => {
    const result = assignConsultantSchema.safeParse(validAssignment);
    expect(result.success).toBe(true);
  });

  it('should reject invalid project_id', () => {
    const result = assignConsultantSchema.safeParse({
      ...validAssignment,
      project_id: 'invalid',
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid consultant_id', () => {
    const result = assignConsultantSchema.safeParse({
      ...validAssignment,
      consultant_id: 'invalid',
    });
    expect(result.success).toBe(false);
  });

  it('should reject short assignment reason', () => {
    const result = assignConsultantSchema.safeParse({
      ...validAssignment,
      assignment_reason: '짧음',
    });
    expect(result.success).toBe(false);
  });

  it('should reject assignment reason over 500 characters', () => {
    const result = assignConsultantSchema.safeParse({
      ...validAssignment,
      assignment_reason: 'a'.repeat(501),
    });
    expect(result.success).toBe(false);
  });
});

describe('reassignConsultantSchema', () => {
  const validReassignment = {
    project_id: '123e4567-e89b-12d3-a456-426614174000',
    new_consultant_id: '123e4567-e89b-12d3-a456-426614174002',
    unassignment_reason: '기존 컨설턴트 일정 충돌로 인한 변경입니다.',
    assignment_reason: '새로운 컨설턴트는 해당 업종 경험이 풍부합니다.',
  };

  it('should accept valid reassignment', () => {
    const result = reassignConsultantSchema.safeParse(validReassignment);
    expect(result.success).toBe(true);
  });

  it('should reject short unassignment reason', () => {
    const result = reassignConsultantSchema.safeParse({
      ...validReassignment,
      unassignment_reason: '짧음',
    });
    expect(result.success).toBe(false);
  });

  it('should reject short assignment reason', () => {
    const result = reassignConsultantSchema.safeParse({
      ...validReassignment,
      assignment_reason: '짧음',
    });
    expect(result.success).toBe(false);
  });
});
