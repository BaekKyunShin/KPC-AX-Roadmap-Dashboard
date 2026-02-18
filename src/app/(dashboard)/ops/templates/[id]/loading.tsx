import { Skeleton, TemplateFormSkeleton, TemplatePreviewSkeleton } from '@/components/ui/Skeleton';
import { PageHeader } from '@/components/ui/page-header';

export default function TemplateDetailLoading() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="템플릿 상세"
        backLink={{ href: '/ops/templates', label: '템플릿 목록으로' }}
        actions={
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-12 rounded-full" />
            <Skeleton className="h-4 w-24" />
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <Skeleton className="h-6 w-24 mb-4" />
          <TemplateFormSkeleton questionCount={3} />
        </div>
        <div>
          <Skeleton className="h-6 w-20 mb-4" />
          <TemplatePreviewSkeleton />
        </div>
      </div>
    </div>
  );
}
