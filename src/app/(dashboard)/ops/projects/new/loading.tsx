import { Skeleton } from '@/components/ui/Skeleton';
import { PageHeader } from '@/components/ui/page-header';

/**
 * 새 프로젝트 생성 페이지 로딩 스켈레톤.
 *
 * 실제 page.tsx 의 폼 구조를 1:1 미러:
 *   1. 프로젝트 트랙 라디오 (sm:grid-cols-2, gap-3, items-start)
 *   2. 회사명·기업 규모 (md:grid-cols-2)
 *   3. 업종 (md:w-1/2) + 세부 업종 (pl-4 border-l-2, TagInput 미러)
 *   4. 담당자 정보 섹션 (border-t, 3필드)
 *   5. 회사 주소 (단일)
 *   6. 신청서 자동표출 fieldset (5필드: 2+1+2 grid 레이아웃)
 *   7. 고객 코멘트 (textarea)
 *   8. 취소·생성 버튼
 */
export default function NewProjectLoading() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <PageHeader
          title="새 프로젝트 생성"
          description="기업 기본 정보를 입력하여 프로젝트를 생성합니다."
          backLink={{ href: '/ops/projects', label: '프로젝트 목록으로' }}
        />
      </div>

      <div className="bg-white shadow rounded-lg p-6 space-y-6">
        {/* 1. 프로젝트 트랙 라디오 (sm:grid-cols-2, gap-3, items-start, border-l) */}
        <div>
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-64 opacity-70 mt-1 mb-2" />
          <div
            role="radiogroup"
            aria-label="프로젝트 트랙"
            className="grid gap-3 sm:grid-cols-2"
          >
            {Array.from({ length: 2 }).map((_, i) => (
              <div
                key={i}
                role="radio"
                aria-checked="false"
                className="flex items-start gap-3 rounded-md border border-gray-300 px-4 py-3"
              >
                <Skeleton className="h-4 w-4 rounded-full mt-0.5 shrink-0" />
                <Skeleton className="h-4 w-32" />
              </div>
            ))}
          </div>
        </div>

        {/* 2. 회사명·기업 규모 (md:grid-cols-2) */}
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i}>
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full mt-1" />
            </div>
          ))}
        </div>

        {/* 3. 업종 (md:w-1/2) + 세부 업종 (pl-4 border-l-2, TagInput) */}
        <div className="space-y-4">
          <div>
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-10 w-full md:w-1/2 mt-1" />
          </div>
          <div className="pl-4 border-l-2 border-gray-200">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-64 opacity-70 mt-1 mb-2" />
            {/* TagInput 미러: 입력 필드 + 추가 버튼 */}
            <div className="flex gap-2">
              <Skeleton className="h-9 flex-1" />
              <Skeleton className="h-9 w-16" />
            </div>
          </div>
        </div>

        {/* 4. 담당자 정보 섹션 (border-t pt-6, 3필드) */}
        <div className="border-t pt-6">
          <Skeleton className="h-6 w-28 mb-4" />
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i}>
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full mt-1" />
              </div>
            ))}
          </div>
        </div>

        {/* 5. 회사 주소 */}
        <div>
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-full mt-1" />
        </div>

        {/* 6. 신청서 자동표출 fieldset (PBL 양식 Ⅰ. — 5필드: 2+1+2 grid) */}
        <fieldset
          data-testid="skeleton-autofill-fieldset"
          className="border border-gray-200 rounded-md p-4 space-y-4"
        >
          <legend className="px-2">
            <Skeleton className="h-4 w-56" />
          </legend>
          {/* 1행: 사업장관리번호 + 업종 코드 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i}>
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-10 w-full mt-1" />
              </div>
            ))}
          </div>
          {/* 2행: 훈련 실시 주소 (full) */}
          <div>
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-full mt-1" />
          </div>
          {/* 3행: 관할 지부·지사 + 담당자 직위 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i}>
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-10 w-full mt-1" />
              </div>
            ))}
          </div>
        </fieldset>

        {/* 7. 고객 코멘트 (textarea rows=4) */}
        <div>
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-24 w-full mt-1" />
        </div>

        {/* 8. 취소·프로젝트 생성 버튼 */}
        <div className="flex justify-end space-x-4">
          <Skeleton className="h-10 w-16" />
          <Skeleton className="h-10 w-28" />
        </div>
      </div>
    </div>
  );
}
