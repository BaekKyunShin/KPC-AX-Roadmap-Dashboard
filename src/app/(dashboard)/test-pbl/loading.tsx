import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/Skeleton';

/**
 * PBL 테스트 페이지 로딩 스켈레톤 — TestPBLClient 실제 마크업 미러.
 *
 * 실제 페이지 구조:
 *  헤더(돌아가기 + 제목 + 샘플 데이터 채우기)
 *  → 안내 Alert
 *  → 기업 정보 행
 *  → InterviewStepper 가로 띠
 *  → 단일 단계 폼 영역 (min-h-[400px])
 *  → 하단 고정 네비게이션
 *
 * 헤더 텍스트는 TestPBLClient 의 PageHeader 와 일치해야 함.
 * backLink 는 사용자 역할에 따라 동적이라 loading 에서는 표시하지 않음.
 */
const PAGE_TITLE = 'PBL 테스트';
const PAGE_DESCRIPTION =
  '산인공 양식 2번 V2 기반 PBL 인터뷰 연습 — 입력 내용은 저장되지 않습니다.';

export default function TestPBLLoading() {
  return (
    // PageContainer 와 동일한 마크업 — 좌우 폭 (max-w-5xl) + 패딩 + 섹션 간격을 실제와 일치
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      {/* 헤더 — backLink 자리 + PageHeader (제목·설명 즉시 노출) + 샘플 데이터 버튼 */}
      <div>
        <Skeleton className="h-3.5 w-24 mb-2 opacity-70" />
        <PageHeader
          title={PAGE_TITLE}
          description={PAGE_DESCRIPTION}
          actions={<Skeleton className="h-9 w-36 rounded-md" />}
        />
      </div>

      {/* 안내 Alert */}
      <div className="rounded-lg border bg-card p-4 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-5/6 opacity-70" />
        <Skeleton className="h-3 w-3/4 opacity-70" />
      </div>

      {/* 기업 정보 행 */}
      <div className="bg-muted/30 border border-border rounded-lg p-4 flex items-center gap-3 flex-wrap">
        <Skeleton className="h-4 w-4" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-7 w-32 rounded" />
        <Skeleton className="h-7 w-32 rounded" />
        <Skeleton className="h-7 w-28 rounded" />
      </div>

      {/* InterviewStepper 가로 띠 */}
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center justify-between">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2 flex-1">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-3 w-16 opacity-70" />
            </div>
          ))}
        </div>
      </div>

      {/* 단일 단계 폼 영역 */}
      <div className="rounded-lg border bg-card p-6 min-h-[400px] space-y-4">
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-4 w-2/3 opacity-70" />
        <div className="space-y-4 pt-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      </div>

      {/* 하단 고정 네비게이션 */}
      <div className="flex justify-between items-center">
        <Skeleton className="h-10 w-20" />
        <Skeleton className="h-10 w-32" />
      </div>
    </div>
  );
}
