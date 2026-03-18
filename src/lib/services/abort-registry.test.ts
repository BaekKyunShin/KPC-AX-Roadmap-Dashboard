/**
 * abort-registry.ts 테스트
 * - registerAbort: AbortController 등록 (기존 키 자동 취소)
 * - cancelAbort: 등록된 AbortController 취소
 * - cleanupAbort: 완료된 AbortController 정리
 *
 * 모듈 레벨 Map 상태이므로 테스트 간 격리를 위해 afterEach에서 cleanupAbort 수행
 */

import { describe, it, expect, afterEach } from 'vitest';
import { registerAbort, cancelAbort, cleanupAbort } from './abort-registry';

// 테스트 간 격리를 위한 키 추적
const usedKeys: string[] = [];

afterEach(() => {
  // 사용한 모든 키를 정리
  for (const key of usedKeys) {
    cleanupAbort(key);
  }
  usedKeys.length = 0;
});

/** 키를 추적하면서 등록 */
function trackRegister(key: string) {
  usedKeys.push(key);
  return registerAbort(key);
}

// ─── registerAbort ──────────────────────────────────────────────────────────

describe('registerAbort', () => {
  it('새 키 등록 → AbortController 반환, signal.aborted === false', () => {
    const controller = trackRegister('user-1');

    expect(controller).toBeInstanceOf(AbortController);
    expect(controller.signal.aborted).toBe(false);
  });

  it('같은 키로 재등록 → 이전 controller의 signal.aborted === true (abort됨)', () => {
    const first = trackRegister('user-2');
    const second = trackRegister('user-2');

    // 이전 controller는 abort됨
    expect(first.signal.aborted).toBe(true);
    // 새 controller는 정상
    expect(second.signal.aborted).toBe(false);
    // 서로 다른 인스턴스
    expect(first).not.toBe(second);
  });

  it('다른 키로 등록 → 기존 키의 controller는 영향 없음', () => {
    const controllerA = trackRegister('user-a');
    const controllerB = trackRegister('user-b');

    // 두 controller 모두 aborted가 아님
    expect(controllerA.signal.aborted).toBe(false);
    expect(controllerB.signal.aborted).toBe(false);
  });
});

// ─── cancelAbort ────────────────────────────────────────────────────────────

describe('cancelAbort', () => {
  it('등록된 키 취소 → true 반환, signal.aborted === true', () => {
    const controller = trackRegister('user-3');

    const result = cancelAbort('user-3');

    expect(result).toBe(true);
    expect(controller.signal.aborted).toBe(true);
  });

  it('미등록 키 취소 → false 반환', () => {
    const result = cancelAbort('non-existent-key');

    expect(result).toBe(false);
  });
});

// ─── cleanupAbort ───────────────────────────────────────────────────────────

describe('cleanupAbort', () => {
  it('등록된 키 정리 후 cancelAbort → false (레지스트리에서 제거됨)', () => {
    trackRegister('user-4');

    cleanupAbort('user-4');

    // 레지스트리에서 제거되었으므로 cancelAbort는 false
    const result = cancelAbort('user-4');
    expect(result).toBe(false);
  });

  it('미등록 키 정리 → 에러 없이 완료', () => {
    // 존재하지 않는 키에 대해 에러가 발생하지 않아야 함
    expect(() => cleanupAbort('non-existent-key')).not.toThrow();
  });
});
