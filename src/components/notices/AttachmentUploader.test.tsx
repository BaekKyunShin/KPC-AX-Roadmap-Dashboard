import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// =============================================================================
// 모킹
// =============================================================================

// 클라이언트 helper (Storage 직접 업로드)
const mockUploadNoticeAttachmentDirect = vi.fn();

vi.mock('@/lib/utils/upload-notice-attachment', () => ({
  uploadNoticeAttachmentDirect: (...args: unknown[]) => mockUploadNoticeAttachmentDirect(...args),
}));

// 토스트
const mockShowSuccessToast = vi.fn();
const mockShowErrorToast = vi.fn();

vi.mock('@/lib/utils/toast', () => ({
  showSuccessToast: (...args: unknown[]) => mockShowSuccessToast(...args),
  showErrorToast: (...args: unknown[]) => mockShowErrorToast(...args),
}));

// ALLOWED_ATTACHMENT_EXT와 MAX_ATTACHMENT_BYTES 모킹
vi.mock('@/lib/schemas/notice', () => ({
  ALLOWED_ATTACHMENT_EXT: ['.pdf', '.docx', '.xlsx', '.hwpx', '.jpg', '.png'],
  MAX_ATTACHMENT_BYTES: 30 * 1024 * 1024, // 30MB
}));

// =============================================================================
// 대상 컴포넌트 임포트
// =============================================================================

import { AttachmentUploader } from './AttachmentUploader';
import type { NoticeAttachment } from '@/types/database';

// =============================================================================
// 헬퍼
// =============================================================================

function makeFile(name: string, size: number, type = 'application/pdf'): File {
  return new File(['x'.repeat(size)], name, { type });
}

// =============================================================================
// 테스트
// =============================================================================

describe('AttachmentUploader', () => {
  const mockOnUploaded = vi.fn();
  const mockOnFileSelected = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // 렌더링
  // ---------------------------------------------------------------------------
  describe('렌더링', () => {
    it('"파일 선택" 버튼이 렌더링된다', () => {
      render(<AttachmentUploader />);
      expect(screen.getByRole('button', { name: /파일 선택/ })).toBeInTheDocument();
    });

    it('"파일 선택" 버튼 클릭 시 파일 입력창이 활성화된다', async () => {
      const user = userEvent.setup();
      render(<AttachmentUploader />);

      const input = screen.getByTestId('attachment-input');
      const clickSpy = vi.spyOn(input, 'click').mockImplementation(() => {});

      await user.click(screen.getByRole('button', { name: /파일 선택/ }));

      expect(clickSpy).toHaveBeenCalled();
      clickSpy.mockRestore();
    });

    it('숨겨진 파일 input이 렌더링된다', () => {
      render(<AttachmentUploader />);
      expect(screen.getByTestId('attachment-input')).toBeInTheDocument();
    });

    it('파일 input에 aria-label="첨부 파일 선택"이 있다', () => {
      render(<AttachmentUploader />);
      expect(screen.getByLabelText('첨부 파일 선택')).toBeInTheDocument();
    });

    it('허용 형식 안내 문구가 표시된다', () => {
      render(<AttachmentUploader />);
      expect(screen.getByText(/허용 형식/)).toBeInTheDocument();
    });

    it('초기 에러 메시지가 표시되지 않는다', () => {
      render(<AttachmentUploader />);
      // FieldError는 message가 없으면 렌더링되지 않는다
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('파일 없이 change 이벤트가 발생하면 아무것도 하지 않는다', async () => {
      render(<AttachmentUploader onFileSelected={mockOnFileSelected} />);

      const input = screen.getByTestId('attachment-input');

      await act(async () => {
        // files가 빈 배열 — 파일 없음
        Object.defineProperty(input, 'files', {
          value: [],
          configurable: true,
        });
        fireEvent.change(input);
      });

      expect(mockOnFileSelected).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // 지연 업로드 모드 (noticeId 없음)
  // ---------------------------------------------------------------------------
  describe('지연 업로드 모드', () => {
    it('올바른 파일 선택 시 onFileSelected(file)가 호출된다', async () => {
      render(<AttachmentUploader onFileSelected={mockOnFileSelected} />);

      const input = screen.getByTestId('attachment-input');
      const file = makeFile('report.pdf', 1024);

      await act(async () => {
        await userEvent.upload(input, file);
      });

      expect(mockOnFileSelected).toHaveBeenCalledWith(file);
    });

    it('지연 업로드 모드에서는 업로드 helper가 호출되지 않는다', async () => {
      render(<AttachmentUploader onFileSelected={mockOnFileSelected} />);

      const input = screen.getByTestId('attachment-input');
      const file = makeFile('report.pdf', 1024);

      await act(async () => {
        await userEvent.upload(input, file);
      });

      expect(mockUploadNoticeAttachmentDirect).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // 파일 검증
  // ---------------------------------------------------------------------------
  describe('파일 검증', () => {
    it('허용되지 않는 확장자 파일을 선택하면 에러 메시지가 표시된다', async () => {
      render(<AttachmentUploader onFileSelected={mockOnFileSelected} />);

      const input = screen.getByTestId('attachment-input');
      const file = makeFile('script.exe', 1024, 'application/octet-stream');

      await act(async () => {
        // jsdom에서 accept 제한을 우회하기 위해 fireEvent 사용
        Object.defineProperty(input, 'files', {
          value: [file],
          configurable: true,
        });
        fireEvent.change(input);
      });

      await waitFor(() => {
        expect(screen.getByText('허용되지 않는 파일 형식입니다.')).toBeInTheDocument();
      });
    });

    it('허용되지 않는 확장자 파일 선택 시 onFileSelected가 호출되지 않는다', async () => {
      render(<AttachmentUploader onFileSelected={mockOnFileSelected} />);

      const input = screen.getByTestId('attachment-input');
      const file = makeFile('script.exe', 1024, 'application/octet-stream');

      await act(async () => {
        Object.defineProperty(input, 'files', {
          value: [file],
          configurable: true,
        });
        fireEvent.change(input);
      });

      expect(mockOnFileSelected).not.toHaveBeenCalled();
    });

    it('30MB 초과 파일을 선택하면 에러 메시지가 표시된다', async () => {
      render(<AttachmentUploader onFileSelected={mockOnFileSelected} />);

      const input = screen.getByTestId('attachment-input');
      const oversizedFile = makeFile('big.pdf', 30 * 1024 * 1024 + 1);

      await act(async () => {
        await userEvent.upload(input, oversizedFile);
      });

      await waitFor(() => {
        expect(screen.getByText('파일은 30MB 이하여야 합니다.')).toBeInTheDocument();
      });
    });

    it('30MB 초과 파일 선택 시 onFileSelected가 호출되지 않는다', async () => {
      render(<AttachmentUploader onFileSelected={mockOnFileSelected} />);

      const input = screen.getByTestId('attachment-input');
      const oversizedFile = makeFile('big.pdf', 30 * 1024 * 1024 + 1);

      await act(async () => {
        await userEvent.upload(input, oversizedFile);
      });

      expect(mockOnFileSelected).not.toHaveBeenCalled();
    });

    it('유효한 파일 선택 후에는 에러 메시지가 사라진다', async () => {
      render(<AttachmentUploader onFileSelected={mockOnFileSelected} />);

      const input = screen.getByTestId('attachment-input');

      // 먼저 잘못된 파일로 에러 발생
      await act(async () => {
        const badFile = makeFile('bad.exe', 100, 'application/octet-stream');
        Object.defineProperty(input, 'files', {
          value: [badFile],
          configurable: true,
        });
        fireEvent.change(input);
      });

      await waitFor(() => {
        expect(screen.getByText('허용되지 않는 파일 형식입니다.')).toBeInTheDocument();
      });

      // 그 다음 올바른 파일 선택 — fireEvent로 직접 트리거해야 에러 상태가 리셋됨
      await act(async () => {
        const goodFile = makeFile('good.pdf', 100);
        Object.defineProperty(input, 'files', {
          value: [goodFile],
          configurable: true,
        });
        fireEvent.change(input);
      });

      await waitFor(() => {
        expect(screen.queryByText('허용되지 않는 파일 형식입니다.')).not.toBeInTheDocument();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // 즉시 업로드 모드 (noticeId 있음)
  // ---------------------------------------------------------------------------
  describe('즉시 업로드 모드', () => {
    it('올바른 파일 선택 시 uploadNoticeAttachmentDirect(noticeId, file)가 호출된다', async () => {
      const fakeAttachment: NoticeAttachment = {
        id: 'att-1',
        notice_id: 'n-1',
        file_name: 'report.pdf',
        storage_path: 'notices/n-1/report.pdf',
        mime_type: 'application/pdf',
        file_size: 1024,
        uploaded_at: '2024-01-01T00:00:00Z',
      };
      mockUploadNoticeAttachmentDirect.mockResolvedValue({
        success: true,
        data: { attachment: fakeAttachment },
      });

      render(
        <AttachmentUploader noticeId="n-1" onUploaded={mockOnUploaded} />,
      );

      const input = screen.getByTestId('attachment-input');
      const file = makeFile('report.pdf', 1024);

      await act(async () => {
        await userEvent.upload(input, file);
      });

      await waitFor(() => {
        expect(mockUploadNoticeAttachmentDirect).toHaveBeenCalledWith(
          'n-1',
          expect.any(File),
        );
      });
    });

    it('업로드 성공 시 성공 토스트와 onUploaded(attachment)가 호출된다', async () => {
      const fakeAttachment: NoticeAttachment = {
        id: 'att-1',
        notice_id: 'n-1',
        file_name: 'report.pdf',
        storage_path: 'notices/n-1/report.pdf',
        mime_type: 'application/pdf',
        file_size: 1024,
        uploaded_at: '2024-01-01T00:00:00Z',
      };
      mockUploadNoticeAttachmentDirect.mockResolvedValue({
        success: true,
        data: { attachment: fakeAttachment },
      });

      render(
        <AttachmentUploader noticeId="n-1" onUploaded={mockOnUploaded} />,
      );

      const input = screen.getByTestId('attachment-input');
      await act(async () => {
        await userEvent.upload(input, makeFile('report.pdf', 1024));
      });

      await waitFor(() => {
        expect(mockShowSuccessToast).toHaveBeenCalledWith('첨부 파일이 업로드되었습니다.');
        expect(mockOnUploaded).toHaveBeenCalledWith(fakeAttachment);
      });
    });

    it('업로드 실패 시 에러 토스트가 표시된다', async () => {
      mockUploadNoticeAttachmentDirect.mockResolvedValue({
        success: false,
        error: '서버 오류',
      });

      render(
        <AttachmentUploader noticeId="n-1" onUploaded={mockOnUploaded} />,
      );

      const input = screen.getByTestId('attachment-input');
      await act(async () => {
        await userEvent.upload(input, makeFile('report.pdf', 1024));
      });

      await waitFor(() => {
        expect(mockShowErrorToast).toHaveBeenCalledWith('업로드 실패', '서버 오류');
      });
    });

    it('예외 발생 시 에러 토스트가 표시된다', async () => {
      mockUploadNoticeAttachmentDirect.mockRejectedValue(new Error('네트워크 오류'));

      render(
        <AttachmentUploader noticeId="n-1" onUploaded={mockOnUploaded} />,
      );

      const input = screen.getByTestId('attachment-input');
      await act(async () => {
        await userEvent.upload(input, makeFile('report.pdf', 1024));
      });

      await waitFor(() => {
        expect(mockShowErrorToast).toHaveBeenCalledWith('업로드 실패', '네트워크 오류');
      });
    });
  });
});
