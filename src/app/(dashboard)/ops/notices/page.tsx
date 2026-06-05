import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { getCachedUser, getCachedProfile } from '@/lib/supabase/cached';
import { createClient } from '@/lib/supabase/server';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { listNotices } from '@/lib/services/notice';
import { isOpsManager } from '@/lib/constants/status';
import { NoticeTable } from './_components/NoticeTable';
import { PAGE_TITLE, PAGE_DESCRIPTION } from './_meta';

export const metadata = {
  title: PAGE_TITLE,
};

export default async function OpsNoticesPage() {
  const user = await getCachedUser();
  if (!user) redirect('/login');

  const profile = await getCachedProfile();
  if (!profile || !isOpsManager(profile.role)) {
    redirect('/dashboard');
  }

  const supabase = await createClient();
  // 운영자는 모든 공지 (고정·일반 분리 렌더링). per_page=50으로 한 번에 조회.
  const result = await listNotices({ filter_by: 'title', page: 1, per_page: 50 }, supabase);

  const pinned = result.items.filter((n) => n.is_pinned);
  const normal = result.items.filter((n) => !n.is_pinned);

  return (
    <div className="space-y-6">
      <PageHeader
        title={PAGE_TITLE}
        description={PAGE_DESCRIPTION}
        actions={
          <Button asChild>
            <Link href="/ops/notices/new">
              <Plus className="mr-2 h-4 w-4" />새 공지 작성
            </Link>
          </Button>
        }
      />

      <NoticeTable title="상단 고정" notices={pinned} emptyMessage="고정된 공지가 없습니다." />
      <NoticeTable title="일반 공지" notices={normal} emptyMessage="작성된 공지가 없습니다." />
    </div>
  );
}
