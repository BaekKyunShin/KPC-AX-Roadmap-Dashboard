/**
 * LLM 호출 취소를 위한 AbortController 레지스트리
 *
 * 사용자가 로드맵 생성을 취소할 때 진행 중인 LLM API 호출을 중단합니다.
 * 키는 userId로, 한 사용자당 하나의 활성 생성만 허용합니다.
 *
 * 주의: 모듈 레벨 상태이므로 단일 서버 인스턴스에서만 정상 동작합니다.
 * Vercel 서버리스 환경에서는 cancel 요청이 다른 인스턴스로 갈 수 있어
 * 취소가 보장되지 않습니다 (UI 취소는 정상 동작).
 */

const registry = new Map<string, AbortController>();

/**
 * 새로운 AbortController를 등록하고 반환
 * 기존에 진행 중인 생성이 있으면 먼저 취소합니다.
 */
export function registerAbort(key: string): AbortController {
  const existing = registry.get(key);
  if (existing) existing.abort();

  const controller = new AbortController();
  registry.set(key, controller);
  return controller;
}

/**
 * 등록된 AbortController를 취소
 * @returns 취소 성공 여부
 */
export function cancelAbort(key: string): boolean {
  const controller = registry.get(key);
  if (controller) {
    controller.abort();
    registry.delete(key);
    return true;
  }
  return false;
}

/**
 * 완료된 생성의 AbortController를 정리
 */
export function cleanupAbort(key: string): void {
  registry.delete(key);
}
