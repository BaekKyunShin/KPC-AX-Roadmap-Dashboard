import { showErrorToast, showSuccessToast } from '@/lib/utils/toast';
import type { ActionResult, SimpleActionResult } from '@/lib/types/action-result';

/**
 * Server Action 응답을 받아 success/error 토스트 + 콜백을 표준 처리한다.
 *
 * - silent fail 차단: `result.error` 가 falsy 해도 `errorFallback` 으로 토스트 보장.
 * - 정상 silent (예: 사용자 취소): `isSilent` 로 판별해 토스트 억제.
 * - `onSuccess` 콜백은 success path 에서만 실행. await 됨.
 *
 * @returns success 여부. 호출자는 boolean 으로 후속 분기 (router.push 등) 판단.
 */
export interface HandleActionResultOptions<T> {
  /** 성공 시 토스트. 미지정 시 토스트 미표시 (조용한 성공). */
  successMessage?: { title: string; description?: string };
  /** 실패 토스트 제목 (필수). */
  errorTitle: string;
  /** `result.error` 가 falsy 일 때 표시할 fallback 메시지 (필수). */
  errorFallback: string;
  /** 추가로 silent 처리할 에러 메시지 판별. true 반환 시 토스트 미표시. */
  isSilent?: (errorMessage?: string) => boolean;
  /** 성공 시 콜백. await 됨. */
  onSuccess?: (data: T) => void | Promise<void>;
}

export async function handleActionResult<T>(
  result: ActionResult<T>,
  options: HandleActionResultOptions<T>,
): Promise<boolean> {
  if (result.success) {
    if (options.successMessage) {
      showSuccessToast(options.successMessage.title, options.successMessage.description);
    }
    if (options.onSuccess) await options.onSuccess(result.data);
    return true;
  }
  if (options.isSilent?.(result.error)) return false;
  const message = result.error?.trim() ? result.error : options.errorFallback;
  showErrorToast(options.errorTitle, message);
  return false;
}

/**
 * `SimpleActionResult` (data 없는 액션) 용. `handleActionResult` 와 동일 보장.
 */
export interface HandleSimpleActionResultOptions {
  successMessage?: { title: string; description?: string };
  errorTitle: string;
  errorFallback: string;
  isSilent?: (errorMessage?: string) => boolean;
  onSuccess?: () => void | Promise<void>;
}

export async function handleSimpleActionResult(
  result: SimpleActionResult,
  options: HandleSimpleActionResultOptions,
): Promise<boolean> {
  if (result.success) {
    if (options.successMessage) {
      showSuccessToast(options.successMessage.title, options.successMessage.description);
    }
    if (options.onSuccess) await options.onSuccess();
    return true;
  }
  if (options.isSilent?.(result.error)) return false;
  const message = result.error?.trim() ? result.error : options.errorFallback;
  showErrorToast(options.errorTitle, message);
  return false;
}
