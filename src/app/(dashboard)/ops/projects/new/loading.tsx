import { Skeleton } from '@/components/ui/Skeleton';
import { PageHeader } from '@/components/ui/page-header';

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
        {/* 프로젝트 트랙 선택 (라디오 2개) */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-64 opacity-70" />
          <div role="radiogroup" className="grid gap-2 md:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div
                key={i}
                role="radio"
                aria-checked="false"
                className="flex items-center gap-3 rounded-md border border-gray-200 p-3"
              >
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </div>

        {/* 회사명, 기업 규모 */}
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>

        {/* 업종 + 세부 업종 */}
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>

        {/* 담당자 정보 */}
        <div className="border-t pt-6 space-y-4">
          <Skeleton className="h-6 w-28" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>

        {/* 회사 주소 */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-full" />
        </div>

        {/* 신청서 자동표출 정보 (PBL 양식 Ⅰ. — 5필드, 모두 선택 입력) */}
        <fieldset
          data-testid="skeleton-autofill-fieldset"
          className="border border-gray-200 rounded-md p-4 space-y-4"
        >
          <legend className="px-2">
            <Skeleton className="h-4 w-48" />
          </legend>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </fieldset>

        {/* 고객 코멘트 */}
        <div className="space-y-2">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-24 w-full" />
        </div>

        {/* 버튼 */}
        <div className="flex justify-end gap-4">
          <Skeleton className="h-10 w-16" />
          <Skeleton className="h-10 w-28" />
        </div>
      </div>
    </div>
  );
}
