import Link from 'next/link';
import { Plus, FolderKanban, Search } from 'lucide-react';
import { ProjectTableSkeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function ProjectsLoading() {
  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
            <FolderKanban className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">프로젝트 관리</h1>
            <p className="text-base text-muted-foreground">
              기업 프로젝트를 생성하고 관리합니다
            </p>
          </div>
        </div>
        <Button asChild>
          <Link href="/ops/projects/new">
            <Plus className="mr-2 h-4 w-4" />
            새 프로젝트 생성
          </Link>
        </Button>
      </div>

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
