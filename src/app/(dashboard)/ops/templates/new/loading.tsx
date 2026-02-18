import { PageHeader } from '@/components/ui/page-header';
import { TemplateFormSkeleton } from '@/components/ui/Skeleton';

export default function NewTemplateLoading() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="새 템플릿 생성"
        description="자가진단 문항 템플릿을 생성합니다."
        backLink={{ href: '/ops/templates', label: '템플릿 목록으로' }}
      />
      <TemplateFormSkeleton questionCount={1} />
    </div>
  );
}
