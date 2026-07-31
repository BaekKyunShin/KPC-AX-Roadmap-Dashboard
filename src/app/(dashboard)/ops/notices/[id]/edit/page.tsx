import { notFound, redirect } from 'next/navigation';
import { getCachedUser, getCachedProfile } from '@/lib/supabase/cached';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/page-header';
import { NoticeForm } from '../../_components/NoticeForm';
import { getNotice } from '@/lib/services/notice';
import { isOpsManager } from '@/lib/constants/status';

export const metadata = {
  title: '공지 수정',
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditNoticePage({ params }: Props) {
  const user = await getCachedUser();
  if (!user) redirect('/login');

  const profile = await getCachedProfile();
  if (!profile || !isOpsManager(profile.role)) {
    redirect('/dashboard');
  }

  const { id } = await params;
  const supabase = await createClient();
  const notice = await getNotice(id, supabase);
  if (!notice) notFound();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        title="공지 수정"
        description="제목·본문·상단 고정 여부를 변경하고, 첨부 파일을 관리합니다."
        backLink={{ href: '/ops/notices', label: '공지 관리' }}
      />
      <NoticeForm
        mode="edit"
        initial={{
          id: notice.id,
          title: notice.title,
          body: notice.body,
          is_pinned: notice.is_pinned,
          attachments: notice.notice_attachments ?? [],
        }}
      />
    </div>
  );
}
