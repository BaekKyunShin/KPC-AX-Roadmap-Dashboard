import { describe, it, expect } from 'vitest';

import { updateProjectByConsultantSchema } from './project-consultant-edit';

const validBaseInput = {
  company_name: '㈜KPC인재개발센터',
  industry: '교육서비스업',
  company_size: '50-299' as const,
  contact_name: '홍길동',
  contact_email: 'hong@kpc.or.kr',
};

describe('updateProjectByConsultantSchema', () => {
  describe('유효 입력', () => {
    it('필수 5필드만 있어도 통과한다', () => {
      const result = updateProjectByConsultantSchema.safeParse(validBaseInput);
      expect(result.success).toBe(true);
    });

    it('선택 필드 전부 채워도 통과한다', () => {
      const result = updateProjectByConsultantSchema.safeParse({
        ...validBaseInput,
        sub_industries: ['IT 교육', 'AI 컨설팅'],
        company_address: '서울시 종로구',
        contact_phone: '010-1234-5678',
        contact_position: '팀장',
        business_reg_no: '123-45-67890',
        industry_code: 'K85',
        training_address: '서울시 강남구',
        jurisdiction_branch: '서울지부',
        customer_comment: 'AI 도입을 위한 교육 의뢰',
        consultant_internal_note: '의사결정자 김상무 · 격주 화요일 회의',
      });
      expect(result.success).toBe(true);
    });

    it('선택 필드는 null 도 허용한다', () => {
      const result = updateProjectByConsultantSchema.safeParse({
        ...validBaseInput,
        contact_phone: null,
        company_address: null,
        consultant_internal_note: null,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('strict 모드 — 시스템 필드 거부', () => {
    it('status 가 포함되면 거부한다 (워크플로 우회 차단)', () => {
      const result = updateProjectByConsultantSchema.safeParse({
        ...validBaseInput,
        status: 'FINALIZED',
      });
      expect(result.success).toBe(false);
    });

    it('assigned_consultant_id 가 포함되면 거부한다 (배정 우회 차단)', () => {
      const result = updateProjectByConsultantSchema.safeParse({
        ...validBaseInput,
        assigned_consultant_id: '00000000-0000-0000-0000-000000000000',
      });
      expect(result.success).toBe(false);
    });

    it('track 이 포함되면 거부한다 (트랙 변경 차단)', () => {
      const result = updateProjectByConsultantSchema.safeParse({
        ...validBaseInput,
        track: 'PBL',
      });
      expect(result.success).toBe(false);
    });

    it('is_test_mode 가 포함되면 거부한다', () => {
      const result = updateProjectByConsultantSchema.safeParse({
        ...validBaseInput,
        is_test_mode: true,
      });
      expect(result.success).toBe(false);
    });

    it('정의되지 않은 임의 키도 거부한다', () => {
      const result = updateProjectByConsultantSchema.safeParse({
        ...validBaseInput,
        injected_field: 'evil',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('필수 필드 검증', () => {
    it('회사명이 비어 있으면 거부한다', () => {
      const result = updateProjectByConsultantSchema.safeParse({
        ...validBaseInput,
        company_name: '',
      });
      expect(result.success).toBe(false);
    });

    it('잘못된 이메일은 거부한다', () => {
      const result = updateProjectByConsultantSchema.safeParse({
        ...validBaseInput,
        contact_email: 'not-an-email',
      });
      expect(result.success).toBe(false);
    });

    it('담당자명이 1자 이하면 거부한다', () => {
      const result = updateProjectByConsultantSchema.safeParse({
        ...validBaseInput,
        contact_name: '홍',
      });
      expect(result.success).toBe(false);
    });

    it('company_size 가 정의된 값 외이면 거부한다', () => {
      const result = updateProjectByConsultantSchema.safeParse({
        ...validBaseInput,
        company_size: '99999',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('길이 제약', () => {
    it('consultant_internal_note 4000자 초과 시 거부한다', () => {
      const result = updateProjectByConsultantSchema.safeParse({
        ...validBaseInput,
        consultant_internal_note: 'a'.repeat(4001),
      });
      expect(result.success).toBe(false);
    });

    it('customer_comment 2000자 초과 시 거부한다', () => {
      const result = updateProjectByConsultantSchema.safeParse({
        ...validBaseInput,
        customer_comment: 'a'.repeat(2001),
      });
      expect(result.success).toBe(false);
    });
  });
});
