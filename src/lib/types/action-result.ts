/**
 * 서버 액션의 공통 반환 타입
 */
export type ActionResult<T = void> = { success: true; data: T } | { success: false; error: string };

/**
 * 데이터가 없는 단순 성공/실패 결과
 */
export type SimpleActionResult = { success: true } | { success: false; error: string };

/**
 * ActionResult 헬퍼 함수
 */
export function successResult<T>(data: T): ActionResult<T> {
  return { success: true, data };
}

export function errorResult(error: string): { success: false; error: string } {
  return { success: false, error };
}

export function simpleSuccess(): SimpleActionResult {
  return { success: true };
}
