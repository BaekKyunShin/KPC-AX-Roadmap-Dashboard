import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Radix UI 컴포넌트가 ResizeObserver를 사용 — jsdom 폴리필
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// =============================================================================
// 모킹
// =============================================================================

const mockPush = vi.fn();
const mockRefresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

// Server Actions
const mockCreateNoticeAction = vi.fn();
const mockUpdateNoticeAction = vi.fn();
const mockUploadAttachmentAction = vi.fn();
const mockDeleteNoticeAction = vi.fn();
const mockGetAttachmentDownloadUrl = vi.fn();

vi.mock('@/app/(dashboard)/ops/notices/actions', () => ({
  createNoticeAction: (...args: unknown[]) => mockCreateNoticeAction(...args),
  updateNoticeAction: (...args: unknown[]) => mockUpdateNoticeAction(...args),
  uploadAttachmentAction: (...args: unknown[]) => mockUploadAttachmentAction(...args),
  deleteNoticeAction: (...args: unknown[]) => mockDeleteNoticeAction(...args),
}));

vi.mock('@/app/(dashboard)/notices/actions', () => ({
  getAttachmentDownloadUrl: (...args: unknown[]) => mockGetAttachmentDownloadUrl(...args),
}));

// 토스트
const mockShowSuccessToast = vi.fn();
const mockShowErrorToast = vi.fn();

vi.mock('@/lib/utils/toast', () => ({
  showSuccessToast: (...args: unknown[]) => mockShowSuccessToast(...args),
  showErrorToast: (...args: unknown[]) => mockShowErrorToast(...args),
}));

// 하위 컴포넌트 경량 모킹
vi.mock('@/components/notices/AttachmentUploader', () => ({
  AttachmentUploader: ({
    onFileSelected,
    onUploaded,
    noticeId,
  }: {
    onFileSelected?: (file: File) => void;
    onUploaded?: (att: unknown) => void;
    noticeId?: string;
  }) => (
    <div data-testid="attachment-uploader" data-notice-id={noticeId ?? ''}>
      <button
        type="button"
        data-testid="mock-select-file"
        onClick={() => {
          const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
          onFileSelected?.(file);
        }}
      >
        파일 선택 모킹
      </button>
      <button
        type="button"
        data-testid="mock-upload-file"
        onClick={() => {
          onUploaded?.({
            id: 'att-99',
            notice_id: noticeId ?? '',
            file_name: 'uploaded.pdf',
            storage_path: 'path/uploaded.pdf',
            mime_type: 'application/pdf',
            file_size: 1024,
            uploaded_at: '2024-01-01T00:00:00Z',
          });
        }}
      >
        업로드 완료 모킹
      </button>
    </div>
  ),
}));

vi.mock('@/components/notices/AttachmentList', () => ({
  AttachmentList: ({
    attachments,
    editable,
    onDeleted,
  }: {
    attachments: unknown[];
    editable?: boolean;
    onDeleted?: (id: string) => void;
  }) => (
    <div data-testid="attachment-list" data-count={attachments.length} data-editable={String(editable)}>
      {attachments.map((a: unknown) => {
        const att = a as { id: string; file_name: string };
        return (
          <div key={att.id} data-testid={`att-item-${att.id}`}>
            {att.file_name}
            {editable && onDeleted && (
              <button
                type="button"
                data-testid={`delete-att-${att.id}`}
                onClick={() => onDeleted(att.id)}
              >
                삭제
              </button>
            )}
          </div>
        );
      })}
    </div>
  ),
}));

vi.mock('@/components/ui/field-error', () => ({
  FieldError: ({ message }: { message?: string }) =>
    message ? <p role="alert" data-testid="field-error">{message}</p> : null,
}));

// =============================================================================
// 대상 컴포넌트 임포트
// =============================================================================

import { NoticeForm } from './NoticeForm';
import type { NoticeAttachment } from '@/types/database';

// =============================================================================
// 헬퍼
// =============================================================================

const defaultInitial = {
  id: 'notice-1',
  title: '기존 공지 제목',
  body: '기존 공지 본문',
  is_pinned: false,
  attachments: [] as NoticeAttachment[],
};

// =============================================================================
// 테스트
// =============================================================================

describe('NoticeForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // 렌더링 — create 모드
  // ---------------------------------------------------------------------------
  describe('create 모드 렌더링', () => {
    it('data-testid="notice-form" form 요소가 렌더링된다', () => {
      render(<NoticeForm mode="create" />);
      expect(screen.getByTestId('notice-form')).toBeInTheDocument();
    });

    it('제목 입력창이 렌더링된다', () => {
      render(<NoticeForm mode="create" />);
      expect(screen.getByLabelText(/제목/)).toBeInTheDocument();
    });

    it('본문 textarea가 렌더링된다', () => {
      render(<NoticeForm mode="create" />);
      expect(screen.getByRole('textbox', { name: /본문/ })).toBeInTheDocument();
    });

    it('"작성" 제출 버튼이 렌더링된다', () => {
      render(<NoticeForm mode="create" />);
      expect(screen.getByRole('button', { name: '작성' })).toBeInTheDocument();
    });

    it('"취소" 버튼이 렌더링된다', () => {
      render(<NoticeForm mode="create" />);
      expect(screen.getByRole('button', { name: '취소' })).toBeInTheDocument();
    });

    it('첨부 파일 업로더가 표시된다', () => {
      render(<NoticeForm mode="create" />);
      expect(screen.getByTestId('attachment-uploader')).toBeInTheDocument();
    });

    it('상단 고정 체크박스가 렌더링된다', () => {
      render(<NoticeForm mode="create" />);
      expect(screen.getByLabelText('상단 고정')).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // 렌더링 — edit 모드
  // ---------------------------------------------------------------------------
  describe('edit 모드 렌더링', () => {
    it('"수정 저장" 제출 버튼이 렌더링된다', () => {
      render(<NoticeForm mode="edit" initial={defaultInitial} />);
      expect(screen.getByRole('button', { name: '수정 저장' })).toBeInTheDocument();
    });

    it('initial.title이 제목 입력창에 초기값으로 설정된다', () => {
      render(<NoticeForm mode="edit" initial={defaultInitial} />);
      expect(screen.getByDisplayValue('기존 공지 제목')).toBeInTheDocument();
    });

    it('initial.body가 본문 textarea에 초기값으로 설정된다', () => {
      render(<NoticeForm mode="edit" initial={defaultInitial} />);
      expect(screen.getByDisplayValue('기존 공지 본문')).toBeInTheDocument();
    });

    it('AttachmentList가 렌더링된다', () => {
      render(<NoticeForm mode="edit" initial={defaultInitial} />);
      expect(screen.getByTestId('attachment-list')).toBeInTheDocument();
    });

    it('edit 모드에서 AttachmentUploader에 noticeId가 전달된다', () => {
      render(<NoticeForm mode="edit" initial={defaultInitial} />);
      const uploader = screen.getByTestId('attachment-uploader');
      expect(uploader).toHaveAttribute('data-notice-id', 'notice-1');
    });
  });

  // ---------------------------------------------------------------------------
  // 클라이언트 측 유효성 검증
  // ---------------------------------------------------------------------------
  describe('클라이언트 유효성 검증', () => {
    it('제목이 빈 채로 제출하면 에러 메시지가 표시된다', async () => {
      render(<NoticeForm mode="create" />);

      // HTML5 required validation을 우회하기 위해 fireEvent.submit 사용
      await act(async () => {
        fireEvent.submit(screen.getByTestId('notice-form'));
      });

      await waitFor(() => {
        expect(screen.getByText('제목을 입력하세요.')).toBeInTheDocument();
      });
    });

    it('제목이 빈 채로 제출하면 Server Action이 호출되지 않는다', async () => {
      render(<NoticeForm mode="create" />);

      await act(async () => {
        fireEvent.submit(screen.getByTestId('notice-form'));
      });

      expect(mockCreateNoticeAction).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // create 모드 — 제출
  // ---------------------------------------------------------------------------
  describe('create 모드 제출', () => {
    it('성공 시 성공 토스트와 /ops/notices로 이동한다', async () => {
      const user = userEvent.setup();
      mockCreateNoticeAction.mockResolvedValue({
        success: true,
        data: { noticeId: 'new-notice-1' },
      });

      render(<NoticeForm mode="create" />);

      await user.type(screen.getByRole('textbox', { name: /제목/ }), '새 공지');
      await user.click(screen.getByRole('button', { name: '작성' }));

      await waitFor(() => {
        expect(mockShowSuccessToast).toHaveBeenCalledWith('공지가 작성되었습니다.');
        expect(mockPush).toHaveBeenCalledWith('/ops/notices');
      });
    });

    it('실패 시 에러 토스트가 표시된다', async () => {
      const user = userEvent.setup();
      mockCreateNoticeAction.mockResolvedValue({
        success: false,
        error: '작성 오류',
      });

      render(<NoticeForm mode="create" />);

      await user.type(screen.getByRole('textbox', { name: /제목/ }), '새 공지');
      await user.click(screen.getByRole('button', { name: '작성' }));

      await waitFor(() => {
        expect(mockShowErrorToast).toHaveBeenCalledWith('작성 실패', '작성 오류');
      });
    });

    it('파일을 선택하면 pending-attachments 목록에 표시된다', async () => {
      const user = userEvent.setup();
      render(<NoticeForm mode="create" />);

      await user.click(screen.getByTestId('mock-select-file'));

      await waitFor(() => {
        expect(screen.getByTestId('pending-attachments')).toBeInTheDocument();
        expect(screen.getByText('test.pdf')).toBeInTheDocument();
      });
    });

    it('pending 파일 제거 버튼 클릭 시 파일이 제거된다', async () => {
      const user = userEvent.setup();
      render(<NoticeForm mode="create" />);

      await user.click(screen.getByTestId('mock-select-file'));
      await waitFor(() => {
        expect(screen.getByText('test.pdf')).toBeInTheDocument();
      });

      await user.click(screen.getByLabelText('test.pdf 제거'));
      await waitFor(() => {
        expect(screen.queryByText('test.pdf')).not.toBeInTheDocument();
      });
    });

    it('파일 업로드가 있을 때 성공 시 해당 파일 개수가 포함된 토스트가 표시된다', async () => {
      const user = userEvent.setup();
      mockCreateNoticeAction.mockResolvedValue({
        success: true,
        data: { noticeId: 'new-notice-1' },
      });
      mockUploadAttachmentAction.mockResolvedValue({ success: true });

      render(<NoticeForm mode="create" />);

      // 파일 선택
      await user.click(screen.getByTestId('mock-select-file'));
      // 폼 제출
      await user.type(screen.getByRole('textbox', { name: /제목/ }), '새 공지');
      await user.click(screen.getByRole('button', { name: '작성' }));

      await waitFor(() => {
        expect(mockShowSuccessToast).toHaveBeenCalledWith(
          expect.stringContaining('첨부 1건 업로드 완료'),
        );
      });
    });

    // 회귀 #이슈1-C: 첨부 포함 정상 흐름에서 "저장 실패" 토스트가 발생해선 안 됨.
    // (이전 증상: 공지 + 첨부 등록 시 클라이언트 catch 블록에 도달해
    //  "저장 실패 - An unexpected response..." 토스트가 잘못 표시됨)
    it('첨부 포함 정상 흐름에서 "저장 실패" 토스트가 호출되지 않는다', async () => {
      const user = userEvent.setup();
      mockCreateNoticeAction.mockResolvedValue({
        success: true,
        data: { noticeId: 'new-notice-2' },
      });
      mockUploadAttachmentAction.mockResolvedValue({ success: true });

      render(<NoticeForm mode="create" />);

      await user.click(screen.getByTestId('mock-select-file'));
      await user.type(screen.getByRole('textbox', { name: /제목/ }), '공지');
      await user.click(screen.getByRole('button', { name: '작성' }));

      await waitFor(() => {
        expect(mockShowSuccessToast).toHaveBeenCalled();
      });

      // "저장 실패" 토스트는 단 한 번도 호출되어서는 안 됨
      const errorCalls = mockShowErrorToast.mock.calls.filter(
        (call) => call[0] === '저장 실패',
      );
      expect(errorCalls).toHaveLength(0);
    });
  });

  // ---------------------------------------------------------------------------
  // edit 모드 — 제출
  // ---------------------------------------------------------------------------
  describe('edit 모드 제출', () => {
    it('수정 성공 시 성공 토스트와 상세 페이지로 이동한다', async () => {
      const user = userEvent.setup();
      mockUpdateNoticeAction.mockResolvedValue({ success: true });

      render(<NoticeForm mode="edit" initial={defaultInitial} />);

      await user.click(screen.getByRole('button', { name: '수정 저장' }));

      await waitFor(() => {
        expect(mockShowSuccessToast).toHaveBeenCalledWith('공지가 수정되었습니다.');
        expect(mockPush).toHaveBeenCalledWith('/notices/notice-1');
      });
    });

    it('수정 실패 시 에러 토스트가 표시된다', async () => {
      const user = userEvent.setup();
      mockUpdateNoticeAction.mockResolvedValue({ success: false, error: '수정 오류' });

      render(<NoticeForm mode="edit" initial={defaultInitial} />);

      await user.click(screen.getByRole('button', { name: '수정 저장' }));

      await waitFor(() => {
        expect(mockShowErrorToast).toHaveBeenCalledWith('수정 실패', '수정 오류');
      });
    });
  });

  // ---------------------------------------------------------------------------
  // 취소 버튼
  // ---------------------------------------------------------------------------
  describe('취소 버튼', () => {
    it('취소 버튼 클릭 시 /ops/notices로 이동한다', async () => {
      const user = userEvent.setup();
      render(<NoticeForm mode="create" />);

      await user.click(screen.getByRole('button', { name: '취소' }));

      expect(mockPush).toHaveBeenCalledWith('/ops/notices');
    });
  });

  // ---------------------------------------------------------------------------
  // 클라이언트 유효성 — 경계값
  // ---------------------------------------------------------------------------
  describe('클라이언트 유효성 — 경계값', () => {
    it('제목 200자 초과 시 에러 메시지가 표시된다', async () => {
      render(<NoticeForm mode="create" />);

      const input = screen.getByRole('textbox', { name: /제목/ });
      // fireEvent.change로 201자 title 직접 설정
      fireEvent.change(input, { target: { value: 'A'.repeat(201) } });

      await act(async () => {
        fireEvent.submit(screen.getByTestId('notice-form'));
      });

      await waitFor(() => {
        expect(screen.getByText('제목은 200자 이하로 입력하세요.')).toBeInTheDocument();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // create 모드 — 일부 파일 업로드 실패
  // ---------------------------------------------------------------------------
  // 회귀 #이슈1-D: 원자성 보장
  // 첨부 업로드 실패 시 → 공지 row 자동 삭제(보상 트랜잭션) → 작성 페이지 머무름
  describe('create 모드 — 첨부 실패 시 원자성 보장', () => {
    it('첨부 업로드 실패 시 deleteNoticeAction(noticeId)가 호출된다', async () => {
      const user = userEvent.setup();
      mockCreateNoticeAction.mockResolvedValue({
        success: true,
        data: { noticeId: 'new-notice-fail' },
      });
      mockUploadAttachmentAction.mockResolvedValue({
        success: false,
        error: '업로드 실패',
      });
      mockDeleteNoticeAction.mockResolvedValue({ success: true });

      render(<NoticeForm mode="create" />);

      await user.click(screen.getByTestId('mock-select-file'));
      await user.type(screen.getByRole('textbox', { name: /제목/ }), '새 공지');
      await user.click(screen.getByRole('button', { name: '작성' }));

      await waitFor(() => {
        expect(mockDeleteNoticeAction).toHaveBeenCalledWith('new-notice-fail');
      });
    });

    it('첨부 업로드 실패 시 "공지 등록 실패" 토스트가 표시된다', async () => {
      const user = userEvent.setup();
      mockCreateNoticeAction.mockResolvedValue({
        success: true,
        data: { noticeId: 'new-notice-fail' },
      });
      mockUploadAttachmentAction.mockResolvedValue({
        success: false,
        error: '업로드 실패',
      });
      mockDeleteNoticeAction.mockResolvedValue({ success: true });

      render(<NoticeForm mode="create" />);

      await user.click(screen.getByTestId('mock-select-file'));
      await user.type(screen.getByRole('textbox', { name: /제목/ }), '새 공지');
      await user.click(screen.getByRole('button', { name: '작성' }));

      await waitFor(() => {
        expect(mockShowErrorToast).toHaveBeenCalledWith(
          '공지 등록 실패',
          expect.stringContaining('첨부 업로드 오류'),
        );
      });
      // 성공 토스트는 호출되지 않아야 함
      expect(mockShowSuccessToast).not.toHaveBeenCalled();
    });

    it('첨부 업로드 실패 시 router.push가 호출되지 않는다 (작성 페이지 머무름)', async () => {
      const user = userEvent.setup();
      mockCreateNoticeAction.mockResolvedValue({
        success: true,
        data: { noticeId: 'new-notice-fail' },
      });
      mockUploadAttachmentAction.mockResolvedValue({
        success: false,
        error: '업로드 실패',
      });
      mockDeleteNoticeAction.mockResolvedValue({ success: true });

      render(<NoticeForm mode="create" />);

      await user.click(screen.getByTestId('mock-select-file'));
      await user.type(screen.getByRole('textbox', { name: /제목/ }), '새 공지');
      await user.click(screen.getByRole('button', { name: '작성' }));

      await waitFor(() => {
        expect(mockDeleteNoticeAction).toHaveBeenCalled();
      });

      expect(mockPush).not.toHaveBeenCalled();
    });

    it('uploadAttachmentAction이 throw해도 보상 트랜잭션이 호출된다', async () => {
      const user = userEvent.setup();
      mockCreateNoticeAction.mockResolvedValue({
        success: true,
        data: { noticeId: 'new-notice-throw' },
      });
      mockUploadAttachmentAction.mockRejectedValue(new Error('네트워크 단절'));
      mockDeleteNoticeAction.mockResolvedValue({ success: true });

      render(<NoticeForm mode="create" />);

      await user.click(screen.getByTestId('mock-select-file'));
      await user.type(screen.getByRole('textbox', { name: /제목/ }), '새 공지');

      await act(async () => {
        fireEvent.submit(screen.getByTestId('notice-form'));
      });

      await waitFor(() => {
        expect(mockDeleteNoticeAction).toHaveBeenCalledWith('new-notice-throw');
      });

      // 작성 페이지에 머무름
      expect(mockPush).not.toHaveBeenCalled();
    });

    it('deleteNoticeAction 자체가 실패해도 사용자 토스트는 정상 표시된다', async () => {
      const user = userEvent.setup();
      mockCreateNoticeAction.mockResolvedValue({
        success: true,
        data: { noticeId: 'new-notice-rollback-fail' },
      });
      mockUploadAttachmentAction.mockResolvedValue({
        success: false,
        error: '업로드 실패',
      });
      mockDeleteNoticeAction.mockResolvedValue({
        success: false,
        error: '롤백 실패',
      });
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(<NoticeForm mode="create" />);

      await user.click(screen.getByTestId('mock-select-file'));
      await user.type(screen.getByRole('textbox', { name: /제목/ }), '새 공지');
      await user.click(screen.getByRole('button', { name: '작성' }));

      await waitFor(() => {
        expect(mockShowErrorToast).toHaveBeenCalledWith(
          '공지 등록 실패',
          expect.stringContaining('첨부 업로드 오류'),
        );
      });

      consoleSpy.mockRestore();
    });
  });

  describe('create 모드 — Server Action 예외', () => {
    it('createNoticeAction 예외 발생 시 catch 블록에서 에러 토스트가 표시된다', async () => {
      const user = userEvent.setup();
      mockCreateNoticeAction.mockRejectedValue(new Error('네트워크 예외'));

      render(<NoticeForm mode="create" />);

      await user.type(screen.getByRole('textbox', { name: /제목/ }), '새 공지');

      await act(async () => {
        fireEvent.submit(screen.getByTestId('notice-form'));
      });

      await waitFor(() => {
        expect(mockShowErrorToast).toHaveBeenCalledWith('저장 실패', '네트워크 예외');
      });
    });
  });

  // ---------------------------------------------------------------------------
  // edit 모드 — 첨부 파일 관리
  // ---------------------------------------------------------------------------
  describe('edit 모드 첨부 파일 관리', () => {
    it('첨부 파일 업로드 완료 시 목록에 추가된다', async () => {
      const user = userEvent.setup();

      const initialWithAtt = {
        ...defaultInitial,
        attachments: [
          {
            id: 'att-1',
            notice_id: 'notice-1',
            file_name: 'existing.pdf',
            storage_path: 'path/existing.pdf',
            mime_type: 'application/pdf',
            file_size: 512,
            uploaded_at: '2024-01-01T00:00:00Z',
          },
        ] as NoticeAttachment[],
      };

      render(<NoticeForm mode="edit" initial={initialWithAtt} />);

      // 초기 1개 확인
      expect(screen.getByTestId('attachment-list')).toHaveAttribute('data-count', '1');

      // 업로드 완료 트리거
      await user.click(screen.getByTestId('mock-upload-file'));

      // 2개로 증가
      await waitFor(() => {
        expect(screen.getByTestId('attachment-list')).toHaveAttribute('data-count', '2');
      });
    });

    it('첨부 파일 삭제 시 목록에서 제거된다', async () => {
      const user = userEvent.setup();

      const initialWithAtt = {
        ...defaultInitial,
        attachments: [
          {
            id: 'att-1',
            notice_id: 'notice-1',
            file_name: 'existing.pdf',
            storage_path: 'path/existing.pdf',
            mime_type: 'application/pdf',
            file_size: 512,
            uploaded_at: '2024-01-01T00:00:00Z',
          },
        ] as NoticeAttachment[],
      };

      render(<NoticeForm mode="edit" initial={initialWithAtt} />);

      // 초기 1개 확인
      expect(screen.getByTestId('attachment-list')).toHaveAttribute('data-count', '1');

      // 삭제 트리거
      await act(async () => {
        await user.click(screen.getByTestId('delete-att-att-1'));
      });

      // 0개로 감소
      await waitFor(() => {
        expect(screen.getByTestId('attachment-list')).toHaveAttribute('data-count', '0');
      });
    });
  });
});
