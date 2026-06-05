import { redirect } from 'next/navigation';
import { getCachedUser, getCachedProfile } from '@/lib/supabase/cached';
import { PageHeader } from '@/components/ui/page-header';
import { NoticeForm } from '@/components/notices/NoticeForm';
import { isOpsManager } from '@/lib/constants/status';

export const metadata = {
  title: '새 공지 작성',
};

export default async function NewNoticePage() {
  const user = await getCachedUser();
  if (!user) redirect('/login');

  const profile = await getCachedProfile();
  if (!profile || !isOpsManager(profile.role)) {
    redirect('/dashboard');
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        title="새 공지 작성"
        description="제목·본문을 작성하고 첨부 파일을 함께 업로드하세요."
        backLink={{ href: '/ops/notices', label: '공지 관리' }}
      />
      <NoticeForm mode="create" />
    </div>
  );
}
