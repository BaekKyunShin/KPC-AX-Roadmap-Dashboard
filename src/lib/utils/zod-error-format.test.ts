/**
 * Zod 검증 에러 메시지를 토스트용 다중 라인 문자열로 변환하는 헬퍼 테스트.
 *
 * 사용자 경험 목표:
 * - 어느 Step·필드가 비었는지 path → 사람용 라벨로 변환해 노출
 * - 여러 누락은 줄바꿈으로 구분
 * - 너무 많은 에러는 5건까지만 (토스트 가독성 보호)
 */
import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { formatZodIssuesForToast } from './zod-error-format';

const TestSchema = z.object({
  companyName: z.string().min(1),
  trainingHours: z.number().int().positive(),
  organization: z.object({
    orgTree: z.array(z.string()).min(1),
  }),
  target: z.object({
    code: z.string().min(1),
    name: z.string().min(1),
  }),
});

const LABEL_MAP: Record<string, string> = {
  companyName: 'Step Ⅰ. 기업명',
  trainingHours: 'Step Ⅰ. 훈련시간',
  'organization.orgTree': 'Step Ⅱ-1-나. 조직도',
  'target.code': 'Step Ⅲ-3·4. 훈련대상 NCS 코드',
  'target.name': 'Step Ⅲ-3·4. 훈련대상 직무명',
};

describe('formatZodIssuesForToast', () => {
  it('단일 누락 필드는 한 줄로 변환된다', () => {
    const result = TestSchema.safeParse({
      companyName: '',
      trainingHours: 40,
      organization: { orgTree: ['IT'] },
      target: { code: 'X1', name: '직무' },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const message = formatZodIssuesForToast(result.error, LABEL_MAP);
      expect(message).toContain('Step Ⅰ. 기업명');
    }
  });

  it('다중 누락은 줄바꿈으로 구분된 여러 라인으로 출력', () => {
    const result = TestSchema.safeParse({
      companyName: '',
      trainingHours: 0,
      organization: { orgTree: [] },
      target: { code: '', name: '' },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const message = formatZodIssuesForToast(result.error, LABEL_MAP);
      const lines = message.split('\n');
      expect(lines.length).toBeGreaterThanOrEqual(2);
      // 각 라인에 적어도 하나의 사람용 라벨이 들어가야 함
      expect(message).toContain('Step Ⅰ. 기업명');
      expect(message).toContain('Step Ⅲ-3·4. 훈련대상 NCS 코드');
    }
  });

  it('5개 초과 에러는 5개까지만 + "외 N건" 안내', () => {
    const ManySchema = z.object({
      a: z.string().min(1),
      b: z.string().min(1),
      c: z.string().min(1),
      d: z.string().min(1),
      e: z.string().min(1),
      f: z.string().min(1),
      g: z.string().min(1),
    });
    const result = ManySchema.safeParse({
      a: '',
      b: '',
      c: '',
      d: '',
      e: '',
      f: '',
      g: '',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const labels: Record<string, string> = {
        a: '필드A',
        b: '필드B',
        c: '필드C',
        d: '필드D',
        e: '필드E',
        f: '필드F',
        g: '필드G',
      };
      const message = formatZodIssuesForToast(result.error, labels);
      expect(message).toMatch(/외 \d+건 더 있음/);
      const lines = message.split('\n');
      expect(lines.length).toBeLessThanOrEqual(6); // 5개 + 1줄 안내
    }
  });

  it('라벨 사전에 없는 path 는 path 문자열을 fallback 으로 사용', () => {
    const result = TestSchema.safeParse({
      companyName: '',
      trainingHours: 40,
      organization: { orgTree: ['IT'] },
      target: { code: 'X1', name: '직무' },
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const message = formatZodIssuesForToast(result.error, {});
      // companyName 이라는 path 자체가 라인에 노출되어야 함
      expect(message).toContain('companyName');
    }
  });

  it('errors 가 비어 있으면 빈 문자열 반환', () => {
    const empty = new z.ZodError([]);
    const message = formatZodIssuesForToast(empty, LABEL_MAP);
    expect(message).toBe('');
  });

  it('path 가 빈 배열(루트)인 issue 는 "(루트)" 로 출력', () => {
    const rootError = new z.ZodError([
      {
        code: z.ZodIssueCode.custom,
        path: [],
        message: '루트 검증 실패',
      },
    ]);
    const message = formatZodIssuesForToast(rootError, {});
    expect(message).toContain('(루트): 루트 검증 실패');
  });

  it('message 가 빈 문자열인 issue 는 "필수 입력입니다." fallback 으로 출력', () => {
    const emptyMsgError = new z.ZodError([
      {
        code: z.ZodIssueCode.custom,
        path: ['someField'],
        message: '',
      },
    ]);
    const message = formatZodIssuesForToast(emptyMsgError, {
      someField: '어떤 필드',
    });
    expect(message).toBe('어떤 필드: 필수 입력입니다.');
  });

  it('배열 index(number) 가 포함된 path 는 "*" 로 정규화', () => {
    const arrayError = new z.ZodError([
      {
        code: z.ZodIssueCode.custom,
        path: ['items', 0, 'name'],
        message: '항목 이름 필수',
      },
    ]);
    const message = formatZodIssuesForToast(arrayError, {
      'items.*.name': '항목 이름',
    });
    expect(message).toBe('항목 이름: 항목 이름 필수');
  });

  it('options.maxItems 를 명시적으로 지정하면 그 값을 사용', () => {
    const ManySchema = z.object({
      a: z.string().min(1),
      b: z.string().min(1),
      c: z.string().min(1),
    });
    const result = ManySchema.safeParse({ a: '', b: '', c: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const message = formatZodIssuesForToast(
        result.error,
        { a: 'A', b: 'B', c: 'C' },
        { maxItems: 1 },
      );
      const lines = message.split('\n');
      expect(lines.length).toBe(2); // 1 + 외 N건
      expect(message).toMatch(/외 2건 더 있음/);
    }
  });

  it('같은 path 의 중복 에러는 한 번만 출력', () => {
    // 동일 path 가 여러 error 로 떨어지는 케이스 시뮬레이션 (Refine + min 동시)
    const result = TestSchema.safeParse({
      companyName: '',
      trainingHours: 0,
      organization: { orgTree: ['IT'] },
      target: { code: 'X1', name: '직무' },
    });
    if (!result.success) {
      // 같은 companyName 으로 가짜 에러 추가
      const dupError = new z.ZodError([
        ...result.error.issues,
        ...result.error.issues,
      ]);
      const message = formatZodIssuesForToast(dupError, LABEL_MAP);
      // companyName 라벨이 한 번만 등장해야 함
      const occurrences = message.split('Step Ⅰ. 기업명').length - 1;
      expect(occurrences).toBe(1);
    }
  });
});
