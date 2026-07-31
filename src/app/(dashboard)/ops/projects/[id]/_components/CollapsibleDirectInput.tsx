'use client';

import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import SelfAssessmentForm from './SelfAssessmentForm';

import type { Template } from '@/components/ops/self-assessment';

// ======================================================================
// CollapsibleDirectInput — 운영자 직접 입력 토글 영역
// ======================================================================

interface CollapsibleDirectInputProps {
  projectId: string;
  template: Template;
}

export default function CollapsibleDirectInput({
  projectId,
  template,
}: CollapsibleDirectInputProps) {
  const [isOpen, setIsOpen] = useState(false);

  // ---- 구분선 + 트리거 + 폼 ----
  return (
    <div className="space-y-4">
      <div className="relative">
        <Separator />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 text-xs text-gray-400">
          또는
        </span>
      </div>

      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-controls="direct-input-panel"
        className="flex w-full items-start gap-2 px-2 py-1.5 rounded-md text-left transition-colors hover:bg-gray-50"
      >
        <ChevronRight
          className={cn(
            'h-4 w-4 mt-0.5 shrink-0 text-gray-400 transition-transform duration-200',
            isOpen && 'rotate-90'
          )}
        />
        <div>
          <span className="text-sm text-gray-600">운영자가 직접 입력하기</span>
          <p className="text-xs text-gray-400">전화·대면 등 오프라인으로 답변받은 경우</p>
        </div>
      </button>

      {isOpen && (
        <div
          id="direct-input-panel"
          className="animate-in fade-in slide-in-from-top-1 duration-200"
        >
          <SelfAssessmentForm projectId={projectId} template={template} />
        </div>
      )}
    </div>
  );
}
