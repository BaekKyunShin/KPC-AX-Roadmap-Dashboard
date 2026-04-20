'use client';

import { useState } from 'react';
import { Loader2, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface RegenerateAccordionProps {
  value: string;
  onChange: (next: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  disabled?: boolean;
}

export function RegenerateAccordion({
  value,
  onChange,
  onSubmit,
  isLoading,
  disabled,
}: RegenerateAccordionProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-border bg-background">
      <Button
        type="button"
        variant={open ? 'ghost' : 'default'}
        className="w-full justify-between rounded-lg"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        aria-expanded={open}
        aria-controls="regenerate-panel"
      >
        <span className="flex items-center gap-2">
          <Plus className="h-4 w-4" aria-hidden="true" />새 버전 생성
        </span>
        {open ? (
          <ChevronUp className="h-4 w-4" aria-hidden="true" />
        ) : (
          <ChevronDown className="h-4 w-4" aria-hidden="true" />
        )}
      </Button>
      {open && (
        <div
          id="regenerate-panel"
          role="region"
          aria-label="새 버전 생성"
          className="border-t border-border p-4 space-y-3"
        >
          <div>
            <Label htmlFor="regenerate-prompt" className="mb-2 block text-sm font-medium">
              수정 요청 사항 (선택)
            </Label>
            <Textarea
              id="regenerate-prompt"
              rows={8}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="예) 역량별로 초/중/고급 훈련과정을 각 1개 이상 추가해주세요. Canva AI를 활용한 과정을 포함해주세요."
              className="min-h-[200px]"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              취소
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={onSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" aria-hidden="true" />
                  AI 생성 중…
                </>
              ) : (
                '생성 시작'
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
