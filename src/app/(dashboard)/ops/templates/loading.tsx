import Link from 'next/link';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { TemplateTableSkeleton } from '@/components/ui/Skeleton';

export default function TemplatesLoading() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="자가진단 템플릿"
        description="자가진단 문항 템플릿을 관리합니다. 활성화된 템플릿이 새 자가진단에 사용됩니다."
        actions={
          <Button asChild>
            <Link href="/ops/templates/new">
              <Plus className="mr-2 h-4 w-4" />
              새 템플릿 생성
            </Link>
          </Button>
        }
      />
      <TemplateTableSkeleton rows={5} />
    </div>
  );
}
