'use client';

import * as React from 'react';
import { X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
  maxLength?: number;
  className?: string;
  disabled?: boolean;
}

function TagInput({
  value = [],
  onChange,
  placeholder = '입력 후 Enter 또는 추가 버튼',
  maxTags = 10,
  maxLength = 50,
  className,
  disabled = false,
}: TagInputProps) {
  const [inputValue, setInputValue] = React.useState('');
  const [isComposing, setIsComposing] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const addTag = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    if (value.length >= maxTags) return;
    if (value.includes(trimmed)) {
      setInputValue('');
      return;
    }
    onChange([...value, trimmed]);
    setInputValue('');
  };

  const removeTag = (tagToRemove: string) => {
    onChange(value.filter((tag) => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // IME 조합 중일 때는 Enter 키 무시 (한글 입력 문제 방지)
    if (isComposing) return;

    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  };

  // IME 조합 시작 (한글, 일본어 등 조합형 문자 입력 시작)
  const handleCompositionStart = () => {
    setIsComposing(true);
  };

  // IME 조합 종료 (조합형 문자 입력 완료)
  const handleCompositionEnd = () => {
    setIsComposing(false);
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value.slice(0, maxLength))}
          onKeyDown={handleKeyDown}
          onCompositionStart={handleCompositionStart}
          onCompositionEnd={handleCompositionEnd}
          placeholder={value.length >= maxTags ? `최대 ${maxTags}개까지 입력 가능` : placeholder}
          disabled={disabled || value.length >= maxTags}
          className={cn(
            'file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
            'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]'
          )}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addTag}
          disabled={disabled || !inputValue.trim() || value.length >= maxTags}
          className="h-9 px-3 shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span className="ml-1">추가</span>
        </Button>
      </div>

      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-md bg-blue-100 px-2.5 py-1 text-sm font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
            >
              {tag}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="ml-1 rounded-full p-0.5 hover:bg-blue-200 dark:hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label={`${tag} 삭제`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {value.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {value.length}/{maxTags}개 입력됨
        </p>
      )}
    </div>
  );
}

export { TagInput };
