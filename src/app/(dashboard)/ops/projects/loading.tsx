import Link from 'next/link';
import { Plus, Search, List, BarChart3 } from 'lucide-react';
import { ProjectTableSkeleton, Skeleton } from '@/components/ui/Skeleton';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

/** 통계 요약 카드 스켈레톤 (StatsSummaryCards 미러링) */
function StatsSummaryCardsSkeleton() {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory sm:grid sm:grid-cols-4 lg:grid-cols-7 sm:overflow-visible sm:pb-0">
      {Array.from({ length: 7 }, (_, i) => (
        <div
          key={i}
          className="min-w-[120px] flex-shrink-0 snap-start sm:min-w-0 sm:flex-shrink rounded-lg border p-3 space-y-2"
        >
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 animate-shimmer rounded-md" />
            <Skeleton className="h-3.5 w-14" />
          </div>
          <Skeleton className="h-7 w-10" />
        </div>
      ))}
    </div>
  );
}

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

      {/* 요약 카드 */}
      <StatsSummaryCardsSkeleton />

      {/* 탭 */}
      <Tabs defaultValue="list" className="space-y-4">
        <TabsList className="gap-1 p-1">
          <TabsTrigger value="list" className="gap-2 px-4">
            <List className="h-4 w-4" />
            프로젝트 목록
          </TabsTrigger>
          <TabsTrigger value="dashboard" className="gap-2 px-4">
            <BarChart3 className="h-4 w-4" />
            진행 현황 대시보드
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list">
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
                        <SelectValue placeholder="상태" />
                      </SelectTrigger>
                    </Select>

                    <Select disabled>
                      <SelectTrigger className="w-full sm:w-[140px]">
                        <SelectValue placeholder="업종" />
                      </SelectTrigger>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 결과 요약 스켈레톤 */}
            <div className="flex items-center justify-between text-base text-muted-foreground">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-24" />
            </div>

            {/* 테이블 스켈레톤 */}
            <ProjectTableSkeleton rows={5} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
