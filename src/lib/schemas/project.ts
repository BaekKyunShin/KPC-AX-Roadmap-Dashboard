import { z } from 'zod';

import { COMPANY_SIZE_VALUES } from '@/lib/constants/company-size';
import { SUB_INDUSTRY_CONSTRAINTS } from '@/lib/constants/industry';

// 프로젝트 상태
export const projectStatusSchema = z.enum([
  'NEW',
  'DIAGNOSED',
  'MATCH_RECOMMENDED',
  'ASSIGNED',
  'INTERVIEWED',
  'ROADMAP_DRAFTED',
  'FINALIZED',
]);

// 프로젝트 생성 스키마
export const createProjectSchema = z.object({
  company_name: z.string().min(1, '회사명을 입력하세요.').max(100),
  industry: z.string().min(1, '업종을 선택하세요.'),
  sub_industries: z
    .array(z.string().max(SUB_INDUSTRY_CONSTRAINTS.maxLength))
    .max(SUB_INDUSTRY_CONSTRAINTS.maxTags)
    .optional(),
  company_size: z.enum(COMPANY_SIZE_VALUES, {
    errorMap: () => ({ message: '기업 규모를 선택하세요.' }),
  }),
  contact_name: z.string().min(2, '담당자명을 2자 이상 입력하세요.').max(50),
  contact_email: z.string().email('유효한 이메일 주소를 입력하세요.'),
  contact_phone: z.string().optional(),
  company_address: z.string().optional(),
  customer_comment: z.string().max(2000).optional(),
});

// 프로젝트 수정 스키마
export const updateProjectSchema = createProjectSchema.partial();

// 자가진단 응답 스키마
export const selfAssessmentAnswerSchema = z.object({
  question_id: z.string(),
  answer_value: z.union([z.string(), z.number()]),
});

// 자가진단 입력 스키마
export const createSelfAssessmentSchema = z.object({
  project_id: z.string().uuid('유효하지 않은 프로젝트 ID입니다.'),
  template_id: z.string().uuid('유효하지 않은 템플릿 ID입니다.'),
  answers: z
    .array(selfAssessmentAnswerSchema)
    .min(1, '최소 1개 이상의 응답이 필요합니다.'),
  summary_text: z.string().max(2000).optional(),
});

// 자가진단 수정 스키마
export const updateSelfAssessmentSchema = z.object({
  answers: z.array(selfAssessmentAnswerSchema).optional(),
  summary_text: z.string().max(2000).optional(),
});

// 배정 스키마
export const assignConsultantSchema = z.object({
  project_id: z.string().uuid('유효하지 않은 프로젝트 ID입니다.'),
  consultant_id: z.string().uuid('유효하지 않은 컨설턴트 ID입니다.'),
  assignment_reason: z
    .string()
    .min(10, '배정 사유를 10자 이상 입력하세요.')
    .max(500),
});

// 배정 변경 스키마
export const reassignConsultantSchema = z.object({
  project_id: z.string().uuid('유효하지 않은 프로젝트 ID입니다.'),
  new_consultant_id: z.string().uuid('유효하지 않은 컨설턴트 ID입니다.'),
  unassignment_reason: z
    .string()
    .min(10, '변경 사유를 10자 이상 입력하세요.')
    .max(500),
  assignment_reason: z
    .string()
    .min(10, '배정 사유를 10자 이상 입력하세요.')
    .max(500),
});

// 타입 추출
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type CreateSelfAssessmentInput = z.infer<typeof createSelfAssessmentSchema>;
export type UpdateSelfAssessmentInput = z.infer<typeof updateSelfAssessmentSchema>;
export type AssignConsultantInput = z.infer<typeof assignConsultantSchema>;
export type ReassignConsultantInput = z.infer<typeof reassignConsultantSchema>;
