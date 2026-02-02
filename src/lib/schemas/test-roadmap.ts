import { z } from 'zod';

import { COMPANY_SIZE_VALUES } from '@/lib/constants/company-size';
import { PROJECT_INDUSTRIES, SUB_INDUSTRY_CONSTRAINTS } from '@/lib/constants/industry';
import {
  interviewParticipantSchema,
  jobTaskSchema,
  painPointSchema,
  constraintSchema,
  improvementGoalSchema,
  companyDetailsSchema,
  type InterviewParticipant,
  type JobTask,
  type PainPoint,
  type Constraint,
  type ImprovementGoal,
  type CompanyDetails,
} from './interview';

// 업종 목록 - 공통 상수에서 re-export
export const industryOptions = PROJECT_INDUSTRIES;

// 기업 규모 목록 - 공통 상수에서 re-export
export const companySizeOptions = COMPANY_SIZE_VALUES;

// 세부 업종 스키마 (재사용 가능)
const subIndustriesSchema = z
  .array(z.string().max(SUB_INDUSTRY_CONSTRAINTS.maxLength))
  .max(SUB_INDUSTRY_CONSTRAINTS.maxTags)
  .optional();

// 테스트 입력 데이터 스키마 (실제 인터뷰와 동일한 구조 + 기업 기본정보)
export const testInputSchema = z.object({
  // ===== 기업 기본정보 (테스트 전용 - 실제에서는 프로젝트에서 가져옴) =====
  company_name: z
    .string()
    .min(2, '회사명을 2자 이상 입력하세요.')
    .max(100, '회사명은 100자 이하로 입력하세요.'),
  industry: z.enum(industryOptions, {
    errorMap: () => ({ message: '업종을 선택하세요.' }),
  }),
  sub_industries: subIndustriesSchema,
  company_size: z.enum(companySizeOptions, {
    errorMap: () => ({ message: '기업 규모를 선택하세요.' }),
  }),

  // ===== 인터뷰 데이터 (실제 인터뷰와 동일) =====
  // Step 1: 기본 정보
  interview_date: z.string().min(1, '인터뷰 날짜를 입력하세요.'),
  participants: z.array(interviewParticipantSchema).min(1, '최소 1명 이상의 참석자를 입력하세요.'),

  // Step 2: 시스템/AI 활용 경험
  company_details: companyDetailsSchema,

  // Step 3: 세부업무
  job_tasks: z.array(jobTaskSchema).min(1, '최소 1개 이상의 세부업무를 입력하세요.'),

  // Step 4: 페인포인트
  pain_points: z.array(painPointSchema).min(1, '최소 1개 이상의 페인포인트를 입력하세요.'),

  // Step 5: 목표/제약
  constraints: z.array(constraintSchema).optional(),
  improvement_goals: z.array(improvementGoalSchema).min(1, '최소 1개 이상의 개선 목표를 입력하세요.'),
  notes: z.string().optional(),
  customer_requirements: z.string().max(2000).optional(),

  // STT 텍스트 (선택) - 인터뷰 녹취록
  stt_text: z.string().optional(),
});

// 타입 추출
export type TestInputData = z.infer<typeof testInputSchema>;

// 인터뷰 관련 타입 re-export
export type {
  InterviewParticipant,
  JobTask,
  PainPoint,
  Constraint,
  ImprovementGoal,
  CompanyDetails,
};
