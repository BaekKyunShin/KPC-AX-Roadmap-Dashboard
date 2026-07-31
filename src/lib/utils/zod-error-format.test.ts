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
import { formatZodIssuesForToast, joinZodMessagesForToast } from './zod-error-format';

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
        { maxItems: 1 }
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
      const dupError = new z.ZodError([...result.error.issues, ...result.error.issues]);
      const message = formatZodIssuesForToast(dupError, LABEL_MAP);
      // companyName 라벨이 한 번만 등장해야 함
      const occurrences = message.split('Step Ⅰ. 기업명').length - 1;
      expect(occurrences).toBe(1);
    }
  });
});

describe('joinZodMessagesForToast', () => {
  // 서버 Action(V2 인터뷰 저장)의 인라인 join 블록을 추출한 유틸.
  // labelMap 없이 issue.message 원문만 join 한다 — 스키마가 이미 한국어
  // 메시지를 담고 있는 경로 전용 (formatZodIssuesForToast 와 역할이 다름).

  it('여러 이슈 메시지를 줄바꿈으로 join 한다', () => {
    const Schema = z.object({
      a: z.string().min(1, 'A를 입력해주세요.'),
      b: z.string().min(1, 'B를 입력해주세요.'),
      c: z.string().min(1, 'C를 입력해주세요.'),
    });
    const result = Schema.safeParse({ a: '', b: '', c: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(joinZodMessagesForToast(result.error)).toBe(
        'A를 입력해주세요.\nB를 입력해주세요.\nC를 입력해주세요.'
      );
    }
  });

  it('이슈가 1개면 1줄만 반환한다 (회귀: 단일 케이스도 동작)', () => {
    const Schema = z.object({
      a: z.string().min(1, 'A를 입력해주세요.'),
      b: z.string(),
    });
    const result = Schema.safeParse({ a: '', b: '정상' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const message = joinZodMessagesForToast(result.error);
      expect(message).toBe('A를 입력해주세요.');
      expect(message.split('\n')).toHaveLength(1);
    }
  });

  it('기본 maxItems=5 를 넘는 이슈는 잘라낸다', () => {
    const Schema = z.object({
      f1: z.string().min(1, '1번'),
      f2: z.string().min(1, '2번'),
      f3: z.string().min(1, '3번'),
      f4: z.string().min(1, '4번'),
      f5: z.string().min(1, '5번'),
      f6: z.string().min(1, '6번'),
      f7: z.string().min(1, '7번'),
    });
    const result = Schema.safeParse({ f1: '', f2: '', f3: '', f4: '', f5: '', f6: '', f7: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const lines = joinZodMessagesForToast(result.error).split('\n');
      expect(lines).toHaveLength(5);
      expect(lines).not.toContain('6번');
    }
  });

  it('공백뿐인 메시지는 걸러진다', () => {
    const Schema = z.object({
      blank: z.string().min(1, '   '),
      real: z.string().min(1, '실제 메시지'),
    });
    const result = Schema.safeParse({ blank: '', real: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(joinZodMessagesForToast(result.error)).toBe('실제 메시지');
    }
  });

  it('유효한 메시지가 하나도 없으면 fallback 문구를 반환한다', () => {
    const Schema = z.object({
      blank: z.string().min(1, ' '),
    });
    const result = Schema.safeParse({ blank: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      // V2 저장 Action 3곳이 쓰던 fallback 원문과 1:1 일치해야 한다 (P8 부록).
      expect(joinZodMessagesForToast(result.error)).toBe('필수 입력 항목을 확인해주세요.');
    }
  });
});
