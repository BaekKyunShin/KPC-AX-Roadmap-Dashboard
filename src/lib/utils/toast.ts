import { toast } from 'sonner';

/**
 * 에러 Toast 표시
 * @param title - Toast 제목
 * @param description - 상세 설명 (선택)
 */
export function showErrorToast(title: string, description?: string) {
  toast.error(title, description ? { description } : undefined);
}

/**
 * 성공 Toast 표시
 * @param title - Toast 제목
 * @param description - 상세 설명 (선택)
 */
export function showSuccessToast(title: string, description?: string) {
  toast.success(title, description ? { description } : undefined);
}
