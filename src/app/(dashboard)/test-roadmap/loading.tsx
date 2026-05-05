import { Skeleton } from '@/components/ui/Skeleton';

/**
 * 로드맵 테스트 페이지 로딩 스켈레톤 — TestRoadmapClient 실제 마크업 미러.
 *
 * 실제 페이지 구조:
 *  헤더(돌아가기 + 제목 + 샘플 데이터 채우기)
 *  → 안내 Alert
 *  → 기업 정보 행 (기업명/업종/규모)
 *  → InterviewStepper 가로 띠
 *  → 단일 단계 폼 영역 (min-h-[400px])
 *  → 하단 고정 네비게이션
 *
 * 결함 B: 이전 로딩은 5개 폼 카드 + 탭 + 잘못된 안내 문구를 노출하여 실제 화면과 완전히 달랐음.
 */
export default function TestRoadmapLoading() {
  return (
    // PageContainer 와 동일한 마크업 — 좌우 폭 (max-w-5xl) + 패딩 + 섹션 간격을 실제와 일치
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
      {/* 헤더: 뒤로가기 + 제목 + 샘플 데이터 채우기 버튼 — 정적 텍스트 노출 금지 */}
      <div>
        <Skeleton className="h-3.5 w-24 mb-2 opacity-70" />
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-7 w-1/3" />
            <Skeleton className="h-4 w-2/3 opacity-70" />
          </div>
          <Skeleton className="h-9 w-36 rounded-md" />
        </div>
      </div>

      {/* 안내 Alert */}
      <div className="rounded-lg border bg-card p-4 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-5/6 opacity-70" />
        <Skeleton className="h-3 w-3/4 opacity-70" />
      </div>

      {/* 기업 정보 행 (기업명/업종/규모) */}
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
