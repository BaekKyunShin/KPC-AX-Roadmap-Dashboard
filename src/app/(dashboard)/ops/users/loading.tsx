import { UserTableSkeleton } from '@/components/ui/Skeleton';
import { PageHeader } from '@/components/ui/page-header';

/**
 * 페이지 설명 — page.tsx 의 PAGE_DESCRIPTION 과 일치해야 함.
 * (page.tsx 변경 시 본 텍스트도 함께 갱신할 것)
 */
const PAGE_DESCRIPTION =
  '운영관리자·시스템관리자 본인 정보와 컨설턴트 승인/정지 상태를 관리합니다.';

export default function UsersLoading() {
  return (
    <div className="space-y-6">
      <PageHeader title="사용자 관리" description={PAGE_DESCRIPTION} />
      <UserTableSkeleton rows={5} />
    </div>
  );
}
