import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// =============================================================================
// 모킹
// =============================================================================

// 토스트
const mockShowSuccessToast = vi.fn();
const mockShowErrorToast = vi.fn();

vi.mock('@/lib/utils/toast', () => ({
  showSuccessToast: (...args: unknown[]) => mockShowSuccessToast(...args),
  showErrorToast: (...args: unknown[]) => mockShowErrorToast(...args),
}));

// useTransition: 즉시 실행
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return {
    ...actual,
    useTransition: () => [false, (fn: () => void | Promise<void>) => fn()],
  };
});

// =============================================================================
// 대상 컴포넌트 임포트
// =============================================================================

import { AttachmentList } from './AttachmentList';
import type { NoticeAttachment } from '@/types/database';

// =============================================================================
// 헬퍼
// =============================================================================

function makeAttachment(overrides: Partial<NoticeAttachment> = {}): NoticeAttachment {
  return {
    id: 'att-1',
    notice_id: 'notice-1',
    file_name: 'test-file.pdf',
    storage_path: 'notices/notice-1/test-file.pdf',
    mime_type: 'application/pdf',
    file_size: 1024 * 50, // 50 KB
    uploaded_at: '2024-03-15T09:00:00Z',
    ...overrides,
  };
}

// =============================================================================
// 테스트
// =============================================================================

describe('AttachmentList', () => {
  const mockOnDownload = vi.fn();
  const mockOnDeleted = vi.fn();
  // P7 단계 5: 삭제 Server Action 도 onDownload 와 동일하게 prop 으로 주입한다.
  const mockOnDelete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // 빈 상태
  // ---------------------------------------------------------------------------
  describe('빈 상태', () => {
    it('attachments가 빈 배열이면 "첨부 파일이 없습니다." 메시지가 표시된다', () => {
      render(<AttachmentList attachments={[]} onDownload={mockOnDownload} />);
      expect(screen.getByText('첨부 파일이 없습니다.')).toBeInTheDocument();
    });

    it('attachments가 undefined이면 빈 상태 메시지가 표시된다', () => {
      render(
        // @ts-expect-error: 의도적 잘못된 값 테스트
        <AttachmentList attachments={undefined} onDownload={mockOnDownload} />
      );
      expect(screen.getByText('첨부 파일이 없습니다.')).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // 렌더링
  // ---------------------------------------------------------------------------
  describe('렌더링', () => {
    it('data-testid="attachment-list" ul 요소가 렌더링된다', () => {
      const attachments = [makeAttachment()];
      render(<AttachmentList attachments={attachments} onDownload={mockOnDownload} />);
      expect(screen.getByTestId('attachment-list')).toBeInTheDocument();
    });

    it('파일 이름이 표시된다', () => {
      const attachments = [makeAttachment({ file_name: 'document.pdf' })];
      render(<AttachmentList attachments={attachments} onDownload={mockOnDownload} />);
      expect(screen.getByText('document.pdf')).toBeInTheDocument();
    });

    it('파일 크기가 KB 단위로 표시된다', () => {
      const attachments = [makeAttachment({ file_size: 1024 * 50 })]; // 50KB
      render(<AttachmentList attachments={attachments} onDownload={mockOnDownload} />);
      expect(screen.getByText('50.0 KB')).toBeInTheDocument();
    });

    it('파일 크기가 MB 단위로 표시된다', () => {
      const attachments = [makeAttachment({ file_size: 1024 * 1024 * 2.5 })]; // 2.5MB
      render(<AttachmentList attachments={attachments} onDownload={mockOnDownload} />);
      expect(screen.getByText('2.5 MB')).toBeInTheDocument();
    });

    it('파일 크기가 B 단위로 표시된다', () => {
      const attachments = [makeAttachment({ file_size: 512 })];
      render(<AttachmentList attachments={attachments} onDownload={mockOnDownload} />);
      expect(screen.getByText('512 B')).toBeInTheDocument();
    });

    it('다운로드 버튼이 렌더링된다', () => {
      const attachments = [makeAttachment()];
      render(<AttachmentList attachments={attachments} onDownload={mockOnDownload} />);
      expect(screen.getByRole('button', { name: /다운로드/ })).toBeInTheDocument();
    });

    it('editable=false이면 삭제 버튼이 표시되지 않는다', () => {
      const attachments = [makeAttachment()];
      render(
        <AttachmentList attachments={attachments} onDownload={mockOnDownload} editable={false} />
      );
      expect(screen.queryByLabelText(/삭제/)).not.toBeInTheDocument();
    });

    it('editable=true이면 삭제 버튼이 표시된다', () => {
      const attachments = [makeAttachment({ file_name: 'file.pdf' })];
      render(
        <AttachmentList
          attachments={attachments}
          onDownload={mockOnDownload}
          editable={true}
          onDelete={mockOnDelete}
          onDeleted={mockOnDeleted}
        />
      );
      expect(screen.getByLabelText('file.pdf 삭제')).toBeInTheDocument();
    });

    it('여러 첨부 파일이 있을 때 모두 렌더링된다', () => {
      const attachments = [
        makeAttachment({ id: 'a-1', file_name: 'file1.pdf' }),
        makeAttachment({ id: 'a-2', file_name: 'file2.docx' }),
      ];
      render(<AttachmentList attachments={attachments} onDownload={mockOnDownload} />);
      expect(screen.getByText('file1.pdf')).toBeInTheDocument();
      expect(screen.getByText('file2.docx')).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // 다운로드
  // ---------------------------------------------------------------------------
  describe('다운로드', () => {
    it('다운로드 버튼 클릭 시 onDownload(storagePath)가 호출된다', async () => {
      const user = userEvent.setup();
      mockOnDownload.mockResolvedValue('https://example.com/download');

      // document.createElement('a').click 모킹
      const createElementSpy = vi
        .spyOn(document, 'createElement')
        .mockImplementation((tagName: string) => {
          if (tagName === 'a') {
            return {
              href: '',
              download: '',
              target: '',
              rel: '',
              click: vi.fn(),
            } as unknown as HTMLAnchorElement;
          }
          return document.createElementNS('http://www.w3.org/1999/xhtml', tagName) as HTMLElement;
        });

      const attachments = [makeAttachment({ storage_path: 'notices/n1/file.pdf' })];
      render(<AttachmentList attachments={attachments} onDownload={mockOnDownload} />);

      await user.click(screen.getByRole('button', { name: /다운로드/ }));

      await waitFor(() => {
        expect(mockOnDownload).toHaveBeenCalledWith('notices/n1/file.pdf');
      });

      createElementSpy.mockRestore();
    });

    it('다운로드 URL이 null이면 에러 토스트가 표시된다', async () => {
      const user = userEvent.setup();
      mockOnDownload.mockResolvedValue(null);

      const attachments = [makeAttachment()];
      render(<AttachmentList attachments={attachments} onDownload={mockOnDownload} />);

      await user.click(screen.getByRole('button', { name: /다운로드/ }));

      await waitFor(() => {
        expect(mockShowErrorToast).toHaveBeenCalledWith('다운로드 링크 생성 실패');
      });
    });

    it('onDownload가 예외를 throw하면 에러 토스트가 표시된다', async () => {
      const user = userEvent.setup();
      mockOnDownload.mockRejectedValue(new Error('네트워크 오류'));

      const attachments = [makeAttachment()];
      render(<AttachmentList attachments={attachments} onDownload={mockOnDownload} />);

      await user.click(screen.getByRole('button', { name: /다운로드/ }));

      await waitFor(() => {
        expect(mockShowErrorToast).toHaveBeenCalledWith('다운로드 실패', '네트워크 오류');
      });
    });
  });

  // ---------------------------------------------------------------------------
  // 삭제 (ConfirmDialog 흐름)
  // ---------------------------------------------------------------------------
  describe('삭제', () => {
    it('휴지통 트리거 클릭 시 ConfirmDialog 가 열린다', async () => {
      const user = userEvent.setup();

      const attachments = [makeAttachment({ file_name: 'file.pdf' })];
      render(
        <AttachmentList
          attachments={attachments}
          onDownload={mockOnDownload}
          editable={true}
          onDelete={mockOnDelete}
          onDeleted={mockOnDeleted}
        />
      );

      // 다이얼로그가 열리기 전에는 제목이 노출되지 않는다
      expect(screen.queryByText('첨부 파일을 삭제하시겠습니까?')).not.toBeInTheDocument();

      // 트리거(휴지통 아이콘 버튼) 클릭
      await user.click(screen.getByLabelText('file.pdf 삭제'));

      // 다이얼로그 제목이 노출된다
      expect(await screen.findByText('첨부 파일을 삭제하시겠습니까?')).toBeInTheDocument();
    });

    it('다이얼로그 취소 시 onDelete가 호출되지 않는다', async () => {
      const user = userEvent.setup();

      const attachments = [makeAttachment({ file_name: 'file.pdf' })];
      render(
        <AttachmentList
          attachments={attachments}
          onDownload={mockOnDownload}
          editable={true}
          onDelete={mockOnDelete}
          onDeleted={mockOnDeleted}
        />
      );

      // 트리거 클릭 → 다이얼로그 오픈
      await user.click(screen.getByLabelText('file.pdf 삭제'));

      // 다이얼로그 안의 "취소" 버튼 클릭
      const cancelButton = await screen.findByRole('button', { name: '취소' });
      await user.click(cancelButton);

      expect(mockOnDelete).not.toHaveBeenCalled();
    });

    it('다이얼로그 "삭제" 확인 후 onDelete(att.id)가 호출된다', async () => {
      const user = userEvent.setup();
      mockOnDelete.mockResolvedValue({ success: true });

      const attachments = [makeAttachment({ id: 'att-123', file_name: 'file.pdf' })];
      render(
        <AttachmentList
          attachments={attachments}
          onDownload={mockOnDownload}
          editable={true}
          onDelete={mockOnDelete}
          onDeleted={mockOnDeleted}
        />
      );

      // 트리거 클릭 → 다이얼로그 오픈
      await act(async () => {
        await user.click(screen.getByLabelText('file.pdf 삭제'));
      });

      // 다이얼로그 안의 "삭제" 액션 버튼 클릭
      const confirmButton = await screen.findByRole('button', { name: '삭제' });
      await act(async () => {
        await user.click(confirmButton);
      });

      await waitFor(() => {
        expect(mockOnDelete).toHaveBeenCalledWith('att-123');
      });
    });

    it('삭제 성공 시 성공 토스트와 onDeleted(id)가 호출된다', async () => {
      const user = userEvent.setup();
      mockOnDelete.mockResolvedValue({ success: true });

      const attachments = [makeAttachment({ id: 'att-123', file_name: 'file.pdf' })];
      render(
        <AttachmentList
          attachments={attachments}
          onDownload={mockOnDownload}
          editable={true}
          onDelete={mockOnDelete}
          onDeleted={mockOnDeleted}
        />
      );

      await act(async () => {
        await user.click(screen.getByLabelText('file.pdf 삭제'));
      });

      const confirmButton = await screen.findByRole('button', { name: '삭제' });
      await act(async () => {
        await user.click(confirmButton);
      });

      await waitFor(() => {
        expect(mockShowSuccessToast).toHaveBeenCalledWith('첨부가 삭제되었습니다.');
        expect(mockOnDeleted).toHaveBeenCalledWith('att-123');
      });
    });

    it('삭제 실패 시 에러 토스트가 호출된다', async () => {
      const user = userEvent.setup();
      mockOnDelete.mockResolvedValue({ success: false, error: '삭제 불가' });

      const attachments = [makeAttachment({ id: 'att-123', file_name: 'file.pdf' })];
      render(
        <AttachmentList
          attachments={attachments}
          onDownload={mockOnDownload}
          editable={true}
          onDelete={mockOnDelete}
          onDeleted={mockOnDeleted}
        />
      );

      await act(async () => {
        await user.click(screen.getByLabelText('file.pdf 삭제'));
      });

      const confirmButton = await screen.findByRole('button', { name: '삭제' });
      await act(async () => {
        await user.click(confirmButton);
      });

      await waitFor(() => {
        expect(mockShowErrorToast).toHaveBeenCalledWith('삭제 실패', '삭제 불가');
      });
    });
  });
});
