import { toast } from 'sonner';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

/**
 * 에러 Toast 표시
 * @param title - Toast 제목
 * @param description - 상세 설명 (선택)
 * @param action - 사용자에게 즉시 재시도 등 단축 동선을 제공하는 옵션 (선택)
 */
export function showErrorToast(title: string, description?: string, action?: ToastAction) {
  const options: { description?: string; action?: ToastAction } = {};
  if (description) options.description = description;
  if (action) options.action = action;
  toast.error(title, Object.keys(options).length > 0 ? options : undefined);
}

/**
 * 성공 Toast 표시
 * @param title - Toast 제목
 * @param description - 상세 설명 (선택)
 */
export function showSuccessToast(title: string, description?: string) {
  toast.success(title, description ? { description } : undefined);
}
