import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Pin, Paperclip, FileText, Eye } from 'lucide-react';
import { getCachedUser, getCachedProfile } from '@/lib/supabase/cached';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { listNotices } from '@/lib/services/notice';
import { noticeSearchSchema } from '@/lib/schemas/notice';
import { NoticeSearchBar } from './_components/NoticeSearchBar';
import { NoticePagination } from './_components/NoticePagination';
import { cn } from '@/lib/utils';
import { PAGE_TITLE, PAGE_DESCRIPTION } from './_meta';

export const metadata = {
  title: PAGE_TITLE,
};

const ALLOWED_ROLES = ['CONSULTANT_APPROVED', 'OPS_ADMIN', 'SYSTEM_ADMIN'];

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  } catch {
    return iso;
  }
}

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function NoticesPage({ searchParams }: Props) {
  const user = await getCachedUser();
  if (!user) redirect('/login');

  const profile = await getCachedProfile();
  if (!profile || !ALLOWED_ROLES.includes(profile.role)) {
    redirect('/dashboard');
  }

  const params = await searchParams;
  const parsedSearch = noticeSearchSchema.safeParse(params);
  const search = parsedSearch.success
    ? parsedSearch.data
    : { filter_by: 'title' as const, page: 1, per_page: 10, q: undefined };

  const supabase = await createClient();
  // users 테이블 RLS로 컨설턴트는 작성자 row를 못 읽으므로 adminClient로 이름 해결
  const adminClient = createAdminClient();
  const result = await listNotices(search, supabase, adminClient);

  return (
    <div className="space-y-6">
      <PageHeader title={PAGE_TITLE} description={PAGE_DESCRIPTION} />

      <NoticeSearchBar />

      {result.items.length === 0 ? (
        <EmptyState
          icon={<FileText className="mx-auto h-10 w-10 text-gray-400" />}
          title="공지가 없습니다"
          description={
            search.q
              ? '검색 조건에 맞는 공지가 없습니다.'
              : '아직 등록된 공지가 없습니다.'
          }
        />
      ) : (
        <div className="rounded-md border bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[48px]"></TableHead>
                  <TableHead className="min-w-[240px] text-left">제목</TableHead>
                  <TableHead className="hidden md:table-cell w-[140px]">
                    작성자
                  </TableHead>
                  <TableHead className="hidden lg:table-cell w-[100px] text-right">
                    조회수
                  </TableHead>
                  <TableHead className="hidden sm:table-cell w-[130px] whitespace-nowrap">
                    작성일
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.items.map((notice) => (
                  <TableRow
                    key={notice.id}
                    className={cn(
                      'group h-12 [&>td]:align-middle [&>td]:py-2 transition-colors',
                      notice.is_pinned
                        ? 'bg-amber-50/60 hover:bg-amber-100/70'
                        : 'hover:bg-muted/40',
                    )}
                  >
                    <TableCell className="text-center">
                      {notice.is_pinned && (
                        <Pin
                          className="mx-auto h-4 w-4 fill-amber-500 text-amber-500"
                          aria-label="상단 고정"
                        />
                      )}
                    </TableCell>
                    <TableCell className="text-left">
                      <Link
                        href={`/notices/${notice.id}`}
                        className={cn(
                          'flex items-center gap-2 hover:underline',
                          notice.is_pinned
                            ? 'font-semibold text-foreground'
                            : 'font-medium text-foreground',
                        )}
                      >
                        {notice.is_pinned && (
                          <Badge
                            className="shrink-0 bg-amber-100 text-amber-900 border-amber-200 hover:bg-amber-100"
                            aria-label="상단 고정 공지"
                          >
                            공지
                          </Badge>
                        )}
                        <span className="truncate">{notice.title}</span>
                        {notice.attachment_count &&
                        notice.attachment_count > 0 ? (
                          <Badge
                            variant="secondary"
                            className="shrink-0 gap-1"
                            aria-label={`첨부 ${notice.attachment_count}개`}
                          >
                            <Paperclip className="h-3 w-3" />
                            {notice.attachment_count}
                          </Badge>
                        ) : null}
                      </Link>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {notice.author_name ?? '-'}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-sm tabular-nums text-right text-muted-foreground">
                      <span className="inline-flex items-center justify-end gap-1">
                        <Eye className="h-3.5 w-3.5" />
                        {notice.view_count.toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm text-muted-foreground tabular-nums whitespace-nowrap">
                      {formatDate(notice.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {result.totalPages > 1 && (
            <div className="border-t">
              <NoticePagination
                currentPage={result.page}
                totalPages={result.totalPages}
                totalItems={result.total}
                itemsPerPage={result.perPage}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
