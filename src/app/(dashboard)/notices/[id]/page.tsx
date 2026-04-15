import { notFound, redirect } from 'next/navigation';
import { Pin } from 'lucide-react';
import { getCachedUser, getCachedProfile } from '@/lib/supabase/cached';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { PageHeader } from '@/components/ui/page-header';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  getNotice,
  incrementNoticeViewCount,
} from '@/lib/services/notice';
import { NoticeAttachmentDownloader } from './_components/NoticeAttachmentDownloader';

export const metadata = {
  title: '공지 상세',
};

const ALLOWED_ROLES = ['CONSULTANT_APPROVED', 'OPS_ADMIN', 'SYSTEM_ADMIN'];

interface Props {
  params: Promise<{ id: string }>;
}

function formatDateTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default async function NoticeDetailPage({ params }: Props) {
  const user = await getCachedUser();
  if (!user) redirect('/login');

  const profile = await getCachedProfile();
  if (!profile || !ALLOWED_ROLES.includes(profile.role)) {
    redirect('/dashboard');
  }

  const { id } = await params;
  const supabase = await createClient();
  const notice = await getNotice(id, supabase);
  if (!notice) notFound();

  // 조회수 증가 (실패해도 렌더링엔 영향 없음 — 서비스 내부에서 로깅)
  // admin client로 RPC 호출 — increment_notice_view_count는 auth.uid() 확인 후 SECURITY DEFINER로 업데이트
  const adminClient = createAdminClient();
  await incrementNoticeViewCount(notice.id, adminClient);

  const attachments = notice.notice_attachments ?? [];

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        title={notice.title}
        backLink={{ href: '/notices', label: '공지 목록' }}
      />

      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        {notice.is_pinned && (
          <Badge variant="secondary" className="gap-1">
            <Pin className="h-3 w-3" /> 고정
          </Badge>
        )}
        <span>작성자: {notice.author?.name ?? '-'}</span>
        <span>·</span>
        <span>{formatDateTime(notice.created_at)}</span>
        <span>·</span>
        <span>조회 {notice.view_count.toLocaleString()}</span>
      </div>

      <Separator />

      <article
        className="whitespace-pre-wrap text-sm leading-relaxed text-gray-900"
        data-testid="notice-body"
      >
        {notice.body || (
          <span className="text-muted-foreground">본문이 없습니다.</span>
        )}
      </article>

      <Separator />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">첨부 파일</h2>
        <NoticeAttachmentDownloader attachments={attachments} />
      </section>
    </div>
  );
}
