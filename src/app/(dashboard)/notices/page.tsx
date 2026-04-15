import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Pin, Paperclip, FileText } from 'lucide-react';
import { getCachedUser, getCachedProfile } from '@/lib/supabase/cached';
import { createClient } from '@/lib/supabase/server';
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

export const metadata = {
  title: '공지사항',
};

const ALLOWED_ROLES = ['CONSULTANT_APPROVED', 'OPS_ADMIN', 'SYSTEM_ADMIN'];

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(iso));
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
  const result = await listNotices(search, supabase);

  return (
    <div className="space-y-6">
      <PageHeader
        title="공지사항"
        description="운영자가 공유한 공지와 양식 파일을 확인합니다."
      />

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
        <div className="overflow-x-auto rounded-md border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[48px]"></TableHead>
                <TableHead className="min-w-[240px]">제목</TableHead>
                <TableHead className="hidden md:table-cell w-[140px]">
                  작성자
                </TableHead>
                <TableHead className="hidden lg:table-cell w-[100px]">
                  조회수
                </TableHead>
                <TableHead className="hidden sm:table-cell w-[120px]">
                  작성일
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {result.items.map((notice) => (
                <TableRow key={notice.id}>
                  <TableCell>
                    {notice.is_pinned && (
                      <Pin
                        className="h-4 w-4 text-primary"
                        aria-label="상단 고정"
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/notices/${notice.id}`}
                      className="flex items-center gap-2 font-medium hover:underline"
                    >
                      <span>{notice.title}</span>
                      {notice.attachment_count &&
                      notice.attachment_count > 0 ? (
                        <Badge variant="secondary" className="gap-1">
                          <Paperclip className="h-3 w-3" />
                          {notice.attachment_count}
                        </Badge>
                      ) : null}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {notice.author?.name ?? '-'}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm tabular-nums">
                    {notice.view_count.toLocaleString()}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-muted-foreground tabular-nums">
                    {formatDate(notice.created_at)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {result.totalPages > 1 && (
            <NoticePagination
              currentPage={result.page}
              totalPages={result.totalPages}
              totalItems={result.total}
              itemsPerPage={result.perPage}
            />
          )}
        </div>
      )}
    </div>
  );
}
