import { Search } from 'lucide-react';
import { AuditLogTableSkeleton } from '@/components/ui/Skeleton';
import { PageHeader } from '@/components/ui/page-header';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function AuditLoading() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="감사로그"
        description="시스템 활동 내역을 확인합니다."
      />

      {/* 필터 */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          {/* 검색 */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="사용자명, 이메일, 대상ID 검색..."
              className="pl-9"
              disabled
            />
          </div>

          {/* 필터 드롭다운 + 날짜 */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
            <Select disabled>
              <SelectTrigger className="w-full sm:w-[130px]">
                <SelectValue placeholder="액션" />
              </SelectTrigger>
            </Select>

            <Select disabled>
              <SelectTrigger className="w-full sm:w-[130px]">
                <SelectValue placeholder="대상" />
              </SelectTrigger>
            </Select>

            <Select disabled>
              <SelectTrigger className="w-full sm:w-[130px]">
                <SelectValue placeholder="사용자" />
              </SelectTrigger>
            </Select>

            <Input
              type="date"
              className="w-full sm:w-[140px]"
              disabled
            />

            <Input
              type="date"
              className="w-full sm:w-[140px]"
              disabled
            />
          </div>
        </div>

        {/* 통계 및 액션 */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
          <div className="h-4 w-24 animate-shimmer rounded" />
          <div className="flex items-center gap-2">
            <div className="h-8 w-36 animate-shimmer rounded" />
            <div className="h-8 w-44 animate-shimmer rounded" />
          </div>
        </div>
      </div>

      <AuditLogTableSkeleton rows={10} />
    </div>
  );
}
