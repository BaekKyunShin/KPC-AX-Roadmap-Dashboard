import { Check, Circle } from 'lucide-react';

import { checkPasswordPolicy } from '@/lib/utils/password-policy';
import { cn } from '@/lib/utils';

interface Props {
  password: string;
  className?: string;
}

const ITEMS: ReadonlyArray<{ key: 'minLength' | 'hasLetter' | 'hasNumber'; label: string }> = [
  { key: 'minLength', label: '8자 이상' },
  { key: 'hasLetter', label: '영문자 포함' },
  { key: 'hasNumber', label: '숫자 포함' },
];

export function PasswordPolicyChecklist({ password, className }: Props) {
  const result = checkPasswordPolicy(password);

  return (
    <ul
      role="list"
      className={cn('flex flex-wrap items-center gap-x-3 gap-y-1 text-xs', className)}
    >
      {ITEMS.map(({ key, label }) => {
        const met = result[key];
        return (
          <li
            key={key}
            data-met={met}
            className={cn(
              'inline-flex items-center gap-1',
              met ? 'text-emerald-600' : 'text-muted-foreground',
            )}
          >
            {met ? (
              <Check className="size-3.5" aria-hidden />
            ) : (
              <Circle className="size-3.5" aria-hidden />
            )}
            <span>{label}</span>
          </li>
        );
      })}
    </ul>
  );
}
