'use client';

import { AttachmentList } from '@/components/notices/AttachmentList';
import { getAttachmentDownloadUrl } from '@/app/(dashboard)/notices/actions';
import type { NoticeAttachment } from '@/types/database';

interface Props {
  attachments: NoticeAttachment[];
}

/**
 * 상세 페이지에서 첨부 다운로드를 처리하는 클라이언트 래퍼.
 * Server Action(getAttachmentDownloadUrl)을 AttachmentList의 onDownload로 주입.
 */
export function NoticeAttachmentDownloader({ attachments }: Props) {
  async function handleDownload(path: string): Promise<string | null> {
    const result = await getAttachmentDownloadUrl(path);
    return result.success ? result.data.url : null;
  }

  return (
    <AttachmentList
      attachments={attachments}
      editable={false}
      onDownload={handleDownload}
    />
  );
}
