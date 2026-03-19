/**
 * test-roadmap 스키마 테스트
 *
 * testInputSchema:
 *   - 유효한 전체 입력 허용
 *   - 회사명 경계값 (min 2, max 100)
 *   - 유효하지 않은 업종/기업 규모 enum 거부
 *   - 선택적 필드 누락 시 통과 확인 (sub_industries, constraints, notes 등)
 *   - 세부 업종 경계값 (maxTags 10, maxLength 50)
 *   - 빈 필수 배열 거부 (participants, job_tasks, pain_points, improvement_goals)
 *   - customer_requirements 최대 길이 (2000자)
 *   - stt_text 선택적 필드
 */

import { describe, it, expect } from 'vitest';
import { testInputSchema } from './test-roadmap';

// ─── 테스트 데이터 ─────────────────────────────────────────────────────────

/** testInputSchema를 통과하는 최소한의 유효 입력 */
const validInput = {
  company_name: '테스트 회사',
  industry: '제조업' as const,
  sub_industries: ['자동차'],
  company_size: '50-299' as const,
  interview_date: '2025-01-01',
  participants: [{ id: 'p-1', name: '홍길동', position: '팀장' }],
  company_details: {
    systems_and_tools: ['MS Office (Excel, Word, PPT)'],
    ai_experience: 'ChatGPT 사용 경험 있음',
  },
  job_tasks: [{ id: 'task-1', task_name: '업무1', task_description: '설명1' }],
  pain_points: [{ id: 'pain-1', description: '문제1', severity: 'HIGH' as const }],
  improvement_goals: [{ id: 'goal-1', goal_description: '목표1' }],
};

// ─── 기본 검증 ─────────────────────────────────────────────────────────────

describe('testInputSchema — 기본 검증', () => {
  it('유효한 전체 입력을 허용한다', () => {
    const result = testInputSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('모든 선택적 필드를 포함한 입력을 허용한다', () => {
    const fullInput = {
      ...validInput,
      constraints: [
        { id: 'c-1', type: 'DATA' as const, description: '제약1', severity: 'LOW' as const },
      ],
      notes: '추가 메모입니다.',
      customer_requirements: '고객 요구사항',
      stt_text: 'STT 녹취 텍스트',
    };
    const result = testInputSchema.safeParse(fullInput);
    expect(result.success).toBe(true);
  });
});

// ─── 회사명 경계값 ─────────────────────────────────────────────────────────

describe('testInputSchema — company_name 경계값', () => {
  it('1자 회사명을 거부한다 (min 2)', () => {
    const result = testInputSchema.safeParse({ ...validInput, company_name: 'A' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msg = result.error.errors[0].message;
      expect(msg).toContain('2자 이상');
    }
  });

  it('2자 회사명을 허용한다 (경계값 하한)', () => {
    const result = testInputSchema.safeParse({ ...validInput, company_name: 'AB' });
    expect(result.success).toBe(true);
  });

  it('100자 회사명을 허용한다 (경계값 상한)', () => {
    const result = testInputSchema.safeParse({ ...validInput, company_name: 'A'.repeat(100) });
    expect(result.success).toBe(true);
  });

  it('101자 회사명을 거부한다 (max 100 초과)', () => {
    const result = testInputSchema.safeParse({ ...validInput, company_name: 'A'.repeat(101) });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msg = result.error.errors[0].message;
      expect(msg).toContain('100자 이하');
    }
  });

  it('빈 회사명을 거부한다', () => {
    const result = testInputSchema.safeParse({ ...validInput, company_name: '' });
    expect(result.success).toBe(false);
  });
});

// ─── 업종/기업 규모 enum ───────────────────────────────────────────────────

describe('testInputSchema — enum 필드', () => {
  it('유효하지 않은 업종을 거부한다', () => {
    const result = testInputSchema.safeParse({ ...validInput, industry: '우주산업' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msg = result.error.errors[0].message;
      expect(msg).toContain('업종을 선택');
    }
  });

  it('모든 유효한 업종을 허용한다', () => {
    const industries = [
      '제조업', '서비스업', '유통/물류', 'IT/소프트웨어', '금융/보험',
      '건설/부동산', '의료/헬스케어', '에너지/환경', '농업/식품', '교육', '공공/정부', '기타',
    ] as const;
    for (const industry of industries) {
      const result = testInputSchema.safeParse({ ...validInput, industry });
      expect(result.success).toBe(true);
    }
  });

  it('유효하지 않은 기업 규모를 거부한다', () => {
    const result = testInputSchema.safeParse({ ...validInput, company_size: '2000+' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msg = result.error.errors[0].message;
      expect(msg).toContain('기업 규모를 선택');
    }
  });

  it('모든 유효한 기업 규모를 허용한다', () => {
    const sizes = ['1-9', '10-49', '50-299', '300-999', '1000+'] as const;
    for (const company_size of sizes) {
      const result = testInputSchema.safeParse({ ...validInput, company_size });
      expect(result.success).toBe(true);
    }
  });
});

// ─── 선택적 필드 누락 ─────────────────────────────────────────────────────

describe('testInputSchema — 선택적 필드 누락 시 기본값', () => {
  it('sub_industries 누락 시 통과한다', () => {
    const { sub_industries: _, ...input } = validInput;
    const result = testInputSchema.safeParse(input);
    expect(result.success).toBe(true);
  });

  it('constraints 누락 시 통과한다', () => {
    // constraints는 스키마에 없으므로 기본 validInput에도 없음
    const result = testInputSchema.safeParse(validInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.constraints).toBeUndefined();
    }
  });

  it('notes 누락 시 통과한다', () => {
    const result = testInputSchema.safeParse(validInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.notes).toBeUndefined();
    }
  });

  it('customer_requirements 누락 시 통과한다', () => {
    const result = testInputSchema.safeParse(validInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.customer_requirements).toBeUndefined();
    }
  });

  it('stt_text 누락 시 통과한다', () => {
    const result = testInputSchema.safeParse(validInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.stt_text).toBeUndefined();
    }
  });
});

// ─── 세부 업종(sub_industries) 경계값 ──────────────────────────────────────

describe('testInputSchema — sub_industries 경계값', () => {
  it('10개 세부 업종을 허용한다 (maxTags 경계)', () => {
    const result = testInputSchema.safeParse({
      ...validInput,
      sub_industries: Array.from({ length: 10 }, (_, i) => `업종${i + 1}`),
    });
    expect(result.success).toBe(true);
  });

  it('11개 세부 업종을 거부한다 (maxTags 초과)', () => {
    const result = testInputSchema.safeParse({
      ...validInput,
      sub_industries: Array.from({ length: 11 }, (_, i) => `업종${i + 1}`),
    });
    expect(result.success).toBe(false);
  });

  it('50자 세부 업종명을 허용한다 (maxLength 경계)', () => {
    const result = testInputSchema.safeParse({
      ...validInput,
      sub_industries: ['A'.repeat(50)],
    });
    expect(result.success).toBe(true);
  });

  it('51자 세부 업종명을 거부한다 (maxLength 초과)', () => {
    const result = testInputSchema.safeParse({
      ...validInput,
      sub_industries: ['A'.repeat(51)],
    });
    expect(result.success).toBe(false);
  });

  it('빈 배열을 허용한다', () => {
    const result = testInputSchema.safeParse({
      ...validInput,
      sub_industries: [],
    });
    expect(result.success).toBe(true);
  });
});

// ─── 필수 배열 검증 ────────────────────────────────────────────────────────

describe('testInputSchema — 필수 배열 최소 개수', () => {
  it('빈 participants 배열을 거부한다', () => {
    const result = testInputSchema.safeParse({ ...validInput, participants: [] });
    expect(result.success).toBe(false);
  });

  it('빈 job_tasks 배열을 거부한다', () => {
    const result = testInputSchema.safeParse({ ...validInput, job_tasks: [] });
    expect(result.success).toBe(false);
  });

  it('빈 pain_points 배열을 거부한다', () => {
    const result = testInputSchema.safeParse({ ...validInput, pain_points: [] });
    expect(result.success).toBe(false);
  });

  it('빈 improvement_goals 배열을 거부한다', () => {
    const result = testInputSchema.safeParse({ ...validInput, improvement_goals: [] });
    expect(result.success).toBe(false);
  });
});

// ─── customer_requirements 경계값 ──────────────────────────────────────────

describe('testInputSchema — customer_requirements 최대 길이', () => {
  it('2000자 고객 요구사항을 허용한다 (경계값 상한)', () => {
    const result = testInputSchema.safeParse({
      ...validInput,
      customer_requirements: 'A'.repeat(2000),
    });
    expect(result.success).toBe(true);
  });

  it('2001자 고객 요구사항을 거부한다 (max 초과)', () => {
    const result = testInputSchema.safeParse({
      ...validInput,
      customer_requirements: 'A'.repeat(2001),
    });
    expect(result.success).toBe(false);
  });
});

// ─── 하위 스키마 조건부 검증 ───────────────────────────────────────────────

describe('testInputSchema — 하위 스키마 필드 검증', () => {
  it('참석자 이름이 빈 문자열이면 거부한다', () => {
    const result = testInputSchema.safeParse({
      ...validInput,
      participants: [{ id: 'p-1', name: '', position: '팀장' }],
    });
    expect(result.success).toBe(false);
  });

  it('업무 설명이 빈 문자열이면 거부한다', () => {
    const result = testInputSchema.safeParse({
      ...validInput,
      job_tasks: [{ id: 'task-1', task_name: '업무', task_description: '' }],
    });
    expect(result.success).toBe(false);
  });

  it('페인포인트 severity가 유효하지 않은 값이면 거부한다', () => {
    const result = testInputSchema.safeParse({
      ...validInput,
      pain_points: [{ id: 'pain-1', description: '문제', severity: 'CRITICAL' }],
    });
    expect(result.success).toBe(false);
  });

  it('제약사항의 type이 유효하지 않은 값이면 거부한다', () => {
    const result = testInputSchema.safeParse({
      ...validInput,
      constraints: [
        { id: 'c-1', type: 'BUDGET', description: '예산 부족', severity: 'HIGH' },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('company_details의 ai_experience가 빈 문자열이면 거부한다', () => {
    const result = testInputSchema.safeParse({
      ...validInput,
      company_details: {
        systems_and_tools: ['ERP'],
        ai_experience: '',
      },
    });
    expect(result.success).toBe(false);
  });

  it('interview_date가 빈 문자열이면 거부한다', () => {
    const result = testInputSchema.safeParse({
      ...validInput,
      interview_date: '',
    });
    expect(result.success).toBe(false);
  });
});
