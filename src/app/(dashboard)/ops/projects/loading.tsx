import Link from 'next/link';
import { Plus, Search } from 'lucide-react';
import { ProjectTableSkeleton } from '@/components/ui/Skeleton';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function ProjectsLoading() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="프로젝트 관리"
        description="기업 프로젝트를 생성하고 관리합니다."
        actions={
          <Button asChild>
            <Link href="/ops/projects/new">
              <Plus className="mr-2 h-4 w-4" />
              새 프로젝트 생성
            </Link>
          </Button>
        }
      />

      {/* 필터 및 테이블 영역 */}
      <div className="space-y-4">
        {/* 검색 및 필터 */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="회사명 또는 이메일 검색..."
                  className="pl-9"
                  disabled
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <Select disabled>
                  <SelectTrigger className="w-full sm:w-[140px]">
                    <SelectValue placeholder="모든 상태" />
                  </SelectTrigger>
                </Select>

                <Select disabled>
                  <SelectTrigger className="w-full sm:w-[140px]">
                    <SelectValue placeholder="모든 업종" />
                  </SelectTrigger>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 결과 요약 스켈레톤 */}
        <div className="flex items-center justify-between text-base text-muted-foreground">
          <span className="h-5 w-32 bg-gray-200 rounded animate-pulse" />
          <span className="h-5 w-24 bg-gray-200 rounded animate-pulse" />
        </div>

        {/* 테이블 스켈레톤 */}
        <ProjectTableSkeleton rows={5} />
      </div>
    </div>
  );
}
