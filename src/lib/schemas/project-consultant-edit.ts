import { z } from 'zod';

import { SUB_INDUSTRY_CONSTRAINTS } from '@/lib/constants/industry';

// 컨설턴트가 담당 프로젝트의 기업 정보를 편집할 때 허용되는 필드 화이트리스트.
// .strict() 로 정의되지 않은 키(status, assigned_consultant_id, track,
// is_test_mode 등 시스템 필드 + 임의 주입 키) 를 거부한다.
//
// DB 레이어에서도 mig 073 의 RLS 정책과 BEFORE UPDATE 트리거가 2차 가드.
export const updateProjectByConsultantSchema = z
  .object({
    // 기업 기본
    company_name: z.string().min(1, '회사명을 입력하세요.').max(100),
    industry: z.string().min(1, '업종을 선택하세요.'),
    sub_industries: z
      .array(z.string().max(SUB_INDUSTRY_CONSTRAINTS.maxLength))
      .max(SUB_INDUSTRY_CONSTRAINTS.maxTags)
      .optional(),
    // company_size — 운영 historical 데이터에 enum 외 값(예: '10-50명')이
    // 존재할 수 있어 string 으로 완화. 신규 입력 시는 UI Select 가 enum 강제.
    company_size: z.string().min(1, '기업 규모를 선택하세요.').max(30),
    company_address: z.string().max(300).optional().nullable(),
    // 담당자
    contact_name: z.string().min(2, '담당자명을 2자 이상 입력하세요.').max(50),
    contact_email: z.string().email('유효한 이메일 주소를 입력하세요.'),
    contact_phone: z.string().max(30).optional().nullable(),
    contact_position: z.string().max(50).optional().nullable(),
    // PBL 행정 (마이그 071)
    business_reg_no: z.string().max(50).optional().nullable(),
    industry_code: z.string().max(20).optional().nullable(),
    training_address: z.string().max(300).optional().nullable(),
    jurisdiction_branch: z.string().max(100).optional().nullable(),
    // 메타
    customer_comment: z.string().max(2000).optional().nullable(),
    consultant_internal_note: z.string().max(4000).optional().nullable(),
  })
  .strict();

export type UpdateProjectByConsultantInput = z.infer<
  typeof updateProjectByConsultantSchema
>;

// 변경 추적 대상 필드 (audit_logs.meta.changed_fields 비교용)
export const CONSULTANT_EDITABLE_PROJECT_FIELDS = [
  'company_name',
  'industry',
  'sub_industries',
  'company_size',
  'company_address',
  'contact_name',
  'contact_email',
  'contact_phone',
  'contact_position',
  'business_reg_no',
  'industry_code',
  'training_address',
  'jurisdiction_branch',
  'customer_comment',
  'consultant_internal_note',
] as const satisfies ReadonlyArray<keyof UpdateProjectByConsultantInput>;

// PBL 행정 필드 — audit_logs.meta.sensitive_change 플래그용
export const CONSULTANT_EDITABLE_SENSITIVE_FIELDS = [
  'business_reg_no',
  'industry_code',
  'training_address',
  'jurisdiction_branch',
] as const satisfies ReadonlyArray<keyof UpdateProjectByConsultantInput>;
