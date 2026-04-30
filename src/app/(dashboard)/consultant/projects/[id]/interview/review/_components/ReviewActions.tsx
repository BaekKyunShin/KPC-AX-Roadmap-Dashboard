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
    <div className="flex flex-col items-stretch justify-between gap-3 rounded-lg border bg-muted/20 p-4 sm:flex-row sm:items-center">
      <p className="text-sm text-muted-foreground">
        검토를 마치셨나요? 표 행 추가·삭제 등 본격 편집은 인터뷰 페이지에서, 결과 확인은 결과
        페이지에서 진행할 수 있습니다.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button asChild type="button" variant="outline" size="sm" data-testid="review-cta-back-to-interview">
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
    </div>
  );
}
