'use client';

import Link from 'next/link';
import { ArrowLeft, FileOutput } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * PR5 (R6 spec) §5.3 — 검토 페이지 하단 CTA 영역.
 *
 * - "인터뷰 페이지로 돌아가기" — 표 행 추가/삭제 등 본격 편집 진입.
 * - "결과 페이지로 이동" — 재생성 없이 기존 결과 확인 (또는 EmptyState 진입).
 */
export interface ReviewActionsProps {
  projectId: string;
  track: 'ROADMAP' | 'PBL';
}

export function ReviewActions({ projectId, track }: ReviewActionsProps) {
  const resultPath =
    track === 'PBL'
      ? `/consultant/projects/${projectId}/pbl`
      : `/consultant/projects/${projectId}/roadmap`;

  return (
    <section
      aria-label="검토 후 다음 단계"
      className="flex flex-col gap-4 rounded-lg border bg-muted/20 p-5"
    >
      <div className="space-y-1">
        <h3 className="text-base font-semibold">검토를 마치셨나요?</h3>
        <p className="text-sm text-muted-foreground">
          표 행 추가·삭제 등 본격 편집은 인터뷰 페이지에서, 결과 확인은 결과 페이지에서
          진행할 수 있습니다.
        </p>
      </div>
      <div
        data-testid="review-cta-group"
        className="flex flex-col gap-2 sm:flex-row sm:justify-end"
      >
        <Button
          asChild
          type="button"
          variant="outline"
          size="sm"
          data-testid="review-cta-back-to-interview"
        >
          <Link href={`/consultant/projects/${projectId}/interview`}>
            <ArrowLeft className="mr-1 size-4" />
            인터뷰 페이지로 돌아가기
          </Link>
        </Button>
        <Button asChild type="button" size="sm" data-testid="review-cta-go-to-result">
          <Link href={resultPath}>
            <FileOutput className="mr-1 size-4" />
            결과 페이지로 이동
          </Link>
        </Button>
      </div>
    </section>
  );
}
