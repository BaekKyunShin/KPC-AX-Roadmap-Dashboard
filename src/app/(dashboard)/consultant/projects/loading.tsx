import { PageHeader } from '@/components/ui/page-header';
import { ConsultantProjectTableSkeleton } from '@/components/ui/Skeleton';

export default function ConsultantProjectsLoading() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="담당 프로젝트"
        description="배정된 프로젝트 목록입니다."
      />
      <ConsultantProjectTableSkeleton rows={5} />
    </div>
  );
}
