import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { TemplateTableSkeleton } from '@/components/ui/Skeleton';

export default function TemplatesLoading() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="자가진단 템플릿 관리"
        description="자가진단 문항 템플릿을 관리합니다. 활성화된 템플릿이 새 자가진단에 사용됩니다."
        actions={
          <Link
            href="/ops/templates/new"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            + 새 템플릿 생성
          </Link>
        }
      />
      <TemplateTableSkeleton rows={5} />
    </div>
  );
}
