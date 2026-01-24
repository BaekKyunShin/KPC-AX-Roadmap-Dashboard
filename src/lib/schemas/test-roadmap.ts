import { z } from 'zod';

// 업종 목록 (기존 case.ts와 동일)
export const industryOptions = [
  '제조업',
  '서비스업',
  'IT/소프트웨어',
  '유통/물류',
  '금융/보험',
  '건설/부동산',
  '의료/헬스케어',
  '교육',
  '공공/정부',
  '기타',
] as const;

// 기업 규모 목록
export const companySizeOptions = ['1-10', '11-50', '51-100', '101-500', '500+'] as const;

// 세부 업무 스키마
export const testJobTaskSchema = z.object({
  task_name: z.string().min(1, '업무명을 입력하세요.').max(100),
  task_description: z.string().min(1, '업무 설명을 입력하세요.').max(500),
});

// 페인포인트 스키마
export const testPainPointSchema = z.object({
  description: z.string().min(1, '페인포인트 설명을 입력하세요.').max(500),
  severity: z.enum(['HIGH', 'MEDIUM', 'LOW'], {
    errorMap: () => ({ message: '심각도를 선택하세요.' }),
  }),
});

// 개선 목표 스키마
export const testImprovementGoalSchema = z.object({
  goal_description: z.string().min(1, '개선 목표를 입력하세요.').max(500),
});

// 테스트 입력 데이터 스키마
export const testInputSchema = z.object({
  // 기업 기본정보 (필수)
  company_name: z
    .string()
    .min(2, '회사명을 2자 이상 입력하세요.')
    .max(100, '회사명은 100자 이하로 입력하세요.'),
  industry: z.enum(industryOptions, {
    errorMap: () => ({ message: '업종을 선택하세요.' }),
  }),
  company_size: z.enum(companySizeOptions, {
    errorMap: () => ({ message: '기업 규모를 선택하세요.' }),
  }),

  // 간소화된 업무/페인포인트 (필수)
  job_tasks: z
    .array(testJobTaskSchema)
    .min(1, '최소 1개의 업무를 입력하세요.')
    .max(10, '업무는 최대 10개까지 입력할 수 있습니다.'),

  pain_points: z
    .array(testPainPointSchema)
    .min(1, '최소 1개의 페인포인트를 입력하세요.')
    .max(10, '페인포인트는 최대 10개까지 입력할 수 있습니다.'),

  improvement_goals: z
    .array(testImprovementGoalSchema)
    .min(1, '최소 1개의 개선 목표를 입력하세요.')
    .max(10, '개선 목표는 최대 10개까지 입력할 수 있습니다.'),

  // 선택적
  customer_requirements: z.string().max(2000).optional(),
});

// 타입 추출
export type TestInputData = z.infer<typeof testInputSchema>;
export type TestJobTask = z.infer<typeof testJobTaskSchema>;
export type TestPainPoint = z.infer<typeof testPainPointSchema>;
export type TestImprovementGoal = z.infer<typeof testImprovementGoalSchema>;
