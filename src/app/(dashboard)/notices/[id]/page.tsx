import { notFound, redirect } from 'next/navigation';
import { Pin, Calendar, Eye, User } from 'lucide-react';
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
  // admin client: 조회수 RPC + users RLS 우회한 작성자 이름 해결
  const adminClient = createAdminClient();
  const notice = await getNotice(id, supabase, adminClient);
  if (!notice) notFound();

  // 조회수 증가 (실패해도 렌더링엔 영향 없음 — 서비스 내부에서 로깅)
  await incrementNoticeViewCount(notice.id, adminClient);

  const attachments = notice.notice_attachments ?? [];
  const authorName = notice.author_name ?? notice.author?.name ?? '-';

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        title={notice.title}
        backLink={{ href: '/notices', label: '공지 목록' }}
      />

      <div className="rounded-lg border bg-muted/30 p-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
          {notice.is_pinned && (
            <Badge variant="secondary" className="gap-1">
              <Pin className="h-3 w-3" /> 고정
            </Badge>
          )}
          <span className="inline-flex items-center gap-1.5">
            <User className="h-3.5 w-3.5" />
            {authorName}
          </span>
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <Calendar className="h-3.5 w-3.5" />
            {formatDateTime(notice.created_at)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Eye className="h-3.5 w-3.5" />
            {notice.view_count.toLocaleString()}
          </span>
        </div>
      </div>

      <article
        className="whitespace-pre-wrap text-sm leading-relaxed text-gray-900 min-h-[200px]"
        data-testid="notice-body"
      >
        {notice.body || (
          <span className="text-muted-foreground">본문이 없습니다.</span>
        )}
      </article>

      {attachments.length > 0 && (
        <>
          <Separator />
          <section className="space-y-3">
            <h2 className="text-sm font-semibold">
              첨부 파일{' '}
              <span className="text-muted-foreground font-normal">
                ({attachments.length})
              </span>
            </h2>
            <NoticeAttachmentDownloader attachments={attachments} />
          </section>
        </>
      )}
    </div>
  );
}
