import type { ReactNode } from 'react';
import { Label } from '@/components/ui/label';
import { FieldError } from '@/components/ui/field-error';
import { cn } from '@/lib/utils';

interface FormFieldProps {
  /** 필드 라벨 (필수 항목인 경우 required=true 함께 전달) */
  label: string;
  /** 입력 요소의 id — 라벨 연결용 */
  htmlFor?: string;
  /** 필수 표시(*) 출력 여부 */
  required?: boolean;
  /** 라벨 아래 안내 문구 (선택) */
  hint?: string;
  /** 에러 메시지 (FieldError로 렌더) */
  error?: string;
  /** 필드 래퍼 커스텀 클래스 */
  className?: string;
  /** 입력 엘리먼트 */
  children: ReactNode;
}

/**
 * 인터뷰·폼 화면에서 Label + hint + Input + FieldError 조합을 일관된 간격으로 묶는 공용 컴포넌트.
 *
 * 기본 간격:
 * - Label → hint: 0.25rem (mt-1)
 * - hint → input: 0.5rem (mb-2 on hint)
 * - input → error: 0.25rem (FieldError 내부 mt-1.5)
 *
 * hint가 없으면 Label → input 간격은 mt-1로 자동 조정.
 */
export function FormField({
  label,
  htmlFor,
  required,
  hint,
  error,
  className,
  children,
}: FormFieldProps) {
  return (
    <div className={cn('space-y-0', className)}>
      <Label htmlFor={htmlFor} className="block">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {hint && (
        <p className="text-xs text-muted-foreground mt-1 mb-2 break-keep">{hint}</p>
      )}
      <div className={cn(hint ? '' : 'mt-1.5')}>{children}</div>
      <FieldError message={error} />
    </div>
  );
}
