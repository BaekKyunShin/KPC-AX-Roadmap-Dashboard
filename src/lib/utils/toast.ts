import { toast } from 'sonner';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ErrorToastOptions {
  action?: ToastAction;
  /**
   * 토스트 노출 시간 (밀리초). 생략 시 Sonner 기본값(4초) 사용.
   * 진단용 긴 에러 메시지를 사용자가 읽고 복사할 수 있도록 `Infinity` 등을 지정.
   */
  duration?: number;
}

/**
 * 에러 Toast 표시
 * @param title - Toast 제목
 * @param description - 상세 설명 (선택)
 * @param options - action, duration 등 부가 옵션 (선택)
 *
 * 하위 호환: 세 번째 인자가 `{label,onClick}` 형태인 ToastAction 도 받는다.
 */
export function showErrorToast(
  title: string,
  description?: string,
  options?: ErrorToastOptions | ToastAction,
) {
  const opts: { description?: string; action?: ToastAction; duration?: number } = {};
  if (description) opts.description = description;
  if (options) {
    // ToastAction (label+onClick) 직접 전달도 허용 (하위 호환).
    if ('label' in options && 'onClick' in options) {
      opts.action = options;
    } else {
      if (options.action) opts.action = options.action;
      if (options.duration !== undefined) opts.duration = options.duration;
    }
  }
  toast.error(title, Object.keys(opts).length > 0 ? opts : undefined);
}

/**
 * 성공 Toast 표시
 * @param title - Toast 제목
 * @param description - 상세 설명 (선택)
 */
export function showSuccessToast(title: string, description?: string) {
  toast.success(title, description ? { description } : undefined);
}
