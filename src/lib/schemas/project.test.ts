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

  it('유효한 프로젝트 상태를 허용한다', () => {
    validStatuses.forEach((status) => {
      expect(projectStatusSchema.safeParse(status).success).toBe(true);
    });
  });

  it('잘못된 상태를 거부한다', () => {
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

  it('유효한 프로젝트 데이터를 허용한다', () => {
    const result = createProjectSchema.safeParse(validProject);
    expect(result.success).toBe(true);
  });

  it('선택 필드가 포함된 프로젝트를 허용한다', () => {
    const result = createProjectSchema.safeParse({
      ...validProject,
      contact_phone: '010-1234-5678',
      company_address: '서울시 강남구',
      customer_comment: '추가 요청사항입니다.',
    });
    expect(result.success).toBe(true);
  });

  it('PBL 양식 Ⅰ. 신청서 자동표출 5필드를 허용한다 (마이그 071)', () => {
    const result = createProjectSchema.safeParse({
      ...validProject,
      business_reg_no: '123-45-67890',
      industry_code: 'C26',
      training_address: '서울시 강남구 테헤란로 123',
      jurisdiction_branch: '한국산업인력공단 서울지역본부',
      contact_position: '인사팀 대리',
    });
    expect(result.success).toBe(true);
  });

  it('PBL 5필드는 모두 옵셔널 — 누락해도 통과한다', () => {
    const result = createProjectSchema.safeParse(validProject);
    expect(result.success).toBe(true);
  });

  it('빈 회사명을 거부한다', () => {
    const result = createProjectSchema.safeParse({ ...validProject, company_name: '' });
    expect(result.success).toBe(false);
  });

  it('빈 업종을 거부한다', () => {
    const result = createProjectSchema.safeParse({ ...validProject, industry: '' });
    expect(result.success).toBe(false);
  });

  it('잘못된 기업 규모를 거부한다', () => {
    const result = createProjectSchema.safeParse({ ...validProject, company_size: '10000+' });
    expect(result.success).toBe(false);
  });

  it('모든 유효한 기업 규모를 허용한다', () => {
    COMPANY_SIZE_VALUES.forEach((size) => {
      const result = createProjectSchema.safeParse({ ...validProject, company_size: size });
      expect(result.success).toBe(true);
    });
  });

  it('잘못된 이메일을 거부한다', () => {
    const result = createProjectSchema.safeParse({ ...validProject, contact_email: 'invalid' });
    expect(result.success).toBe(false);
  });

  it('짧은 담당자명을 거부한다', () => {
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

  it('유효한 자가진단 데이터를 허용한다', () => {
    const result = createSelfAssessmentSchema.safeParse(validAssessment);
    expect(result.success).toBe(true);
  });

  it('잘못된 project_id UUID를 거부한다', () => {
    const result = createSelfAssessmentSchema.safeParse({
      ...validAssessment,
      project_id: 'invalid',
    });
    expect(result.success).toBe(false);
  });

  it('잘못된 template_id UUID를 거부한다', () => {
    const result = createSelfAssessmentSchema.safeParse({
      ...validAssessment,
      template_id: 'invalid',
    });
    expect(result.success).toBe(false);
  });

  it('빈 답변 배열을 거부한다', () => {
    const result = createSelfAssessmentSchema.safeParse({
      ...validAssessment,
      answers: [],
    });
    expect(result.success).toBe(false);
  });

  it('문자열 답변 값을 거부한다 (5점 척도 고정)', () => {
    const result = createSelfAssessmentSchema.safeParse({
      ...validAssessment,
      answers: [{ question_id: 'q1', answer_value: 'text answer' }],
    });
    expect(result.success).toBe(false);
  });
});

describe('assignConsultantSchema', () => {
  const validAssignment = {
    project_id: '123e4567-e89b-12d3-a456-426614174000',
    consultant_id: '123e4567-e89b-12d3-a456-426614174001',
    assignment_reason: '제조업 전문성과 교육 경험이 풍부하여 배정합니다.',
  };

  it('유효한 배정 데이터를 허용한다', () => {
    const result = assignConsultantSchema.safeParse(validAssignment);
    expect(result.success).toBe(true);
  });

  it('잘못된 project_id를 거부한다', () => {
    const result = assignConsultantSchema.safeParse({
      ...validAssignment,
      project_id: 'invalid',
    });
    expect(result.success).toBe(false);
  });

  it('잘못된 consultant_id를 거부한다', () => {
    const result = assignConsultantSchema.safeParse({
      ...validAssignment,
      consultant_id: 'invalid',
    });
    expect(result.success).toBe(false);
  });

  it('짧은 배정 사유를 거부한다', () => {
    const result = assignConsultantSchema.safeParse({
      ...validAssignment,
      assignment_reason: '짧음',
    });
    expect(result.success).toBe(false);
  });

  it('500자 초과 배정 사유를 거부한다', () => {
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

  it('유효한 재배정 데이터를 허용한다', () => {
    const result = reassignConsultantSchema.safeParse(validReassignment);
    expect(result.success).toBe(true);
  });

  it('짧은 해제 사유를 거부한다', () => {
    const result = reassignConsultantSchema.safeParse({
      ...validReassignment,
      unassignment_reason: '짧음',
    });
    expect(result.success).toBe(false);
  });

  it('짧은 배정 사유를 거부한다', () => {
    const result = reassignConsultantSchema.safeParse({
      ...validReassignment,
      assignment_reason: '짧음',
    });
    expect(result.success).toBe(false);
  });
});
