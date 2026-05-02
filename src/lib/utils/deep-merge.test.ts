import { describe, it, expect } from 'vitest';

import { deepMerge } from './deep-merge';

describe('deepMerge', () => {
  it('얕은 객체에서 source 키만 덮어쓰고 나머지는 보존', () => {
    expect(deepMerge({ a: 1, b: 2 }, { b: 99 })).toEqual({ a: 1, b: 99 });
  });

  it('중첩 객체에서 부분 patch 가 다른 형제 키를 보존', () => {
    expect(
      deepMerge({ a: 1, b: { c: 2, d: 3 } }, { b: { c: 99 } }),
    ).toEqual({ a: 1, b: { c: 99, d: 3 } });
  });

  it('source 에 새 키가 있으면 추가', () => {
    expect(
      deepMerge({ a: 1, b: { c: 2 } }, { b: { d: 3 } }),
    ).toEqual({ a: 1, b: { c: 2, d: 3 } });
  });

  it('배열은 머지하지 않고 source 값으로 교체한다', () => {
    expect(deepMerge({ a: [1, 2, 3] }, { a: [9] })).toEqual({ a: [9] });
  });

  it('source 의 값이 undefined 이면 target 의 기존값을 보존 (skip)', () => {
    expect(deepMerge({ a: 1, b: 2 }, { a: undefined })).toEqual({ a: 1, b: 2 });
  });

  it('source 의 값이 null 이면 명시적 삭제 의도로 보고 null 보존', () => {
    expect(deepMerge({ a: 1 }, { a: null })).toEqual({ a: null });
  });

  it('빈 객체 patch 는 target 을 그대로 반환', () => {
    expect(deepMerge({ a: 1, b: { c: 2 } }, {})).toEqual({ a: 1, b: { c: 2 } });
  });

  it('depth 3 이상 중첩에서도 다른 가지를 보존', () => {
    const target = {
      companyRequirements: { status: 'X', problem: 'Y', will: 'W', outcomes: 'O' },
      otherSection: { foo: 'bar' },
    };
    const patch = { companyRequirements: { problem: 'NEW' } };
    expect(deepMerge(target, patch)).toEqual({
      companyRequirements: { status: 'X', problem: 'NEW', will: 'W', outcomes: 'O' },
      otherSection: { foo: 'bar' },
    });
  });

  it('target 이 plain object 가 아니면 source 가 그대로 반환된다', () => {
    expect(deepMerge(null as unknown as object, { a: 1 } as unknown as object)).toEqual({ a: 1 });
  });

  it('source 가 plain object 가 아니면 target 이 그대로 반환된다', () => {
    expect(deepMerge({ a: 1 }, null as unknown as object)).toEqual({ a: 1 });
  });

  it('원본 객체를 mutate 하지 않는다', () => {
    const target = { a: 1, b: { c: 2 } };
    const patch = { b: { c: 99 } };
    const result = deepMerge(target, patch);
    expect(target).toEqual({ a: 1, b: { c: 2 } });
    expect(patch).toEqual({ b: { c: 99 } });
    expect(result).not.toBe(target);
    expect(result.b).not.toBe(target.b);
  });
});
