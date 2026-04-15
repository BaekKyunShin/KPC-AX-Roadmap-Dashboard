import Link from 'next/link';
import { Pin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { NoticeRowActions } from './NoticeRowActions';
import type { NoticeWithMeta } from '@/lib/services/notice';

interface NoticeTableProps {
  title: string;
  notices: NoticeWithMeta[];
  emptyMessage: string;
}

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

export function NoticeTable({ title, notices, emptyMessage }: NoticeTableProps) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold text-muted-foreground">{title}</h2>
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[48px]"></TableHead>
              <TableHead className="min-w-[240px] text-left">제목</TableHead>
              <TableHead className="hidden md:table-cell w-[140px]">
                작성자
              </TableHead>
              <TableHead className="hidden md:table-cell w-[100px]">
                첨부
              </TableHead>
              <TableHead className="hidden lg:table-cell w-[100px]">
                조회
              </TableHead>
              <TableHead className="hidden sm:table-cell w-[130px] whitespace-nowrap">
                작성일
              </TableHead>
              <TableHead className="w-[160px] text-right">관리</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {notices.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-sm text-muted-foreground">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              notices.map((notice) => (
                <TableRow key={notice.id} className="h-12 [&>td]:align-middle [&>td]:py-2">
                  <TableCell className="text-center">
                    {notice.is_pinned && (
                      <Pin
                        className="mx-auto h-4 w-4 text-primary"
                        aria-label="상단 고정"
                      />
                    )}
                  </TableCell>
                  <TableCell className="font-medium text-left">
                    <Link
                      href={`/notices/${notice.id}`}
                      className="hover:underline"
                    >
                      {notice.title}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {notice.author_name ?? notice.author?.name ?? '-'}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm">
                    {notice.attachment_count && notice.attachment_count > 0 ? (
                      <Badge variant="secondary">
                        {notice.attachment_count}개
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm tabular-nums">
                    {notice.view_count.toLocaleString()}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-muted-foreground tabular-nums whitespace-nowrap">
                    {formatDate(notice.created_at)}
                  </TableCell>
                  <TableCell>
                    <NoticeRowActions
                      noticeId={notice.id}
                      isPinned={notice.is_pinned}
                      title={notice.title}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
