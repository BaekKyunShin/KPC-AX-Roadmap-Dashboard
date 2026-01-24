import { AlertCircle } from 'lucide-react';

interface FieldErrorProps {
  message?: string;
}

/**
 * 폼 필드 인라인 에러 메시지 컴포넌트
 * - 입력 필드 아래에 에러 메시지를 표시
 */
export function FieldError({ message }: FieldErrorProps) {
  if (!message) return null;

  return (
    <p className="text-sm font-medium text-destructive mt-1.5 flex items-center gap-1">
      <AlertCircle className="h-3.5 w-3.5" />
      {message}
    </p>
  );
}
