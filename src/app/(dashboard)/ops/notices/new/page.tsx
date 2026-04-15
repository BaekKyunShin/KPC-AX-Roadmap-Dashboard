import { redirect } from 'next/navigation';
import { getCachedUser, getCachedProfile } from '@/lib/supabase/cached';
import { PageHeader } from '@/components/ui/page-header';
import { NoticeForm } from '@/components/notices/NoticeForm';

export const metadata = {
  title: '새 공지 작성',
};

export default async function NewNoticePage() {
  const user = await getCachedUser();
  if (!user) redirect('/login');

  const profile = await getCachedProfile();
  if (!profile || !['OPS_ADMIN', 'SYSTEM_ADMIN'].includes(profile.role)) {
    redirect('/dashboard');
  }

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title="새 공지 작성"
        description="제목과 본문을 작성하고, 저장 후 첨부 파일을 추가할 수 있습니다."
        backLink={{ href: '/ops/notices', label: '공지 관리' }}
      />
      <NoticeForm mode="create" />
    </div>
  );
}
