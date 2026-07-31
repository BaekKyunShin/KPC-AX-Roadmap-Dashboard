import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// =============================================================================
// 모킹
// =============================================================================

// 클라이언트 helper (Storage 직접 업로드)
const mockUploadNoticeAttachmentDirect = vi.fn();

vi.mock('./upload-notice-attachment', () => ({
  uploadNoticeAttachmentDirect: (...args: unknown[]) => mockUploadNoticeAttachmentDirect(...args),
}));

// 토스트
const mockShowSuccessToast = vi.fn();
const mockShowErrorToast = vi.fn();

vi.mock('@/lib/utils/toast', () => ({
  showSuccessToast: (...args: unknown[]) => mockShowSuccessToast(...args),
  showErrorToast: (...args: unknown[]) => mockShowErrorToast(...args),
}));

// ALLOWED_ATTACHMENT_EXT와 크기 상한 상수 모킹
vi.mock('@/lib/schemas/notice', () => ({
  ALLOWED_ATTACHMENT_EXT: ['.pdf', '.docx', '.xlsx', '.hwpx', '.jpg', '.png'],
  MAX_ATTACHMENT_BYTES: 100 * 1024 * 1024, // 100MB
  MAX_ATTACHMENT_LABEL: '100MB',
  ATTACHMENT_TOO_LARGE_MESSAGE: '파일은 100MB 이하여야 합니다.',
}));

// =============================================================================
// 대상 컴포넌트 임포트
// =============================================================================

import { AttachmentUploader } from './AttachmentUploader';
import type { NoticeAttachment } from '@/types/database';

// =============================================================================
// 헬퍼
// =============================================================================

/**
 * 가짜 File 생성.
 * 실제 내용을 size 만큼 채우면 100MB 초과 케이스에서 메모리를 그대로 잡아먹으므로,
 * 내용은 1바이트만 두고 size 속성만 원하는 값으로 덮어쓴다.
 */
function makeFile(name: string, size: number, type = 'application/pdf'): File {
  const file = new File(['x'], name, { type });
  Object.defineProperty(file, 'size', { value: size, configurable: true });
  return file;
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

    it('100MB 초과 파일을 선택하면 에러 메시지가 표시된다', async () => {
      render(<AttachmentUploader onFileSelected={mockOnFileSelected} />);

      const input = screen.getByTestId('attachment-input');
      const oversizedFile = makeFile('big.pdf', 100 * 1024 * 1024 + 1);

      await act(async () => {
        await userEvent.upload(input, oversizedFile);
      });

      await waitFor(() => {
        expect(screen.getByText('파일은 100MB 이하여야 합니다.')).toBeInTheDocument();
      });
    });

    it('100MB 초과 파일 선택 시 onFileSelected가 호출되지 않는다', async () => {
      render(<AttachmentUploader onFileSelected={mockOnFileSelected} />);

      const input = screen.getByTestId('attachment-input');
      const oversizedFile = makeFile('big.pdf', 100 * 1024 * 1024 + 1);

      await act(async () => {
        await userEvent.upload(input, oversizedFile);
      });

      expect(mockOnFileSelected).not.toHaveBeenCalled();
    });

    it('정확히 100MB 파일은 통과한다 (경계값)', async () => {
      render(<AttachmentUploader onFileSelected={mockOnFileSelected} />);

      const input = screen.getByTestId('attachment-input');
      const exactly100mb = makeFile('big.pdf', 100 * 1024 * 1024);

      await act(async () => {
        await userEvent.upload(input, exactly100mb);
      });

      expect(mockOnFileSelected).toHaveBeenCalledWith(exactly100mb);
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

      render(<AttachmentUploader noticeId="n-1" onUploaded={mockOnUploaded} />);

      const input = screen.getByTestId('attachment-input');
      const file = makeFile('report.pdf', 1024);

      await act(async () => {
        await userEvent.upload(input, file);
      });

      await waitFor(() => {
        expect(mockUploadNoticeAttachmentDirect).toHaveBeenCalledWith(
          'n-1',
          expect.any(File),
          expect.any(Function) // onProgress — 진행률 콜백
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

      render(<AttachmentUploader noticeId="n-1" onUploaded={mockOnUploaded} />);

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

      render(<AttachmentUploader noticeId="n-1" onUploaded={mockOnUploaded} />);

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

      render(<AttachmentUploader noticeId="n-1" onUploaded={mockOnUploaded} />);

      const input = screen.getByTestId('attachment-input');
      await act(async () => {
        await userEvent.upload(input, makeFile('report.pdf', 1024));
      });

      await waitFor(() => {
        expect(mockShowErrorToast).toHaveBeenCalledWith('업로드 실패', '네트워크 오류');
      });
    });
  });

  // ---------------------------------------------------------------------------
  // 업로드 진행률 (100MB 첨부는 수 분 소요 — 진행 상황을 반드시 보여준다)
  // ---------------------------------------------------------------------------
  describe('업로드 진행률', () => {
    const fakeAttachment: NoticeAttachment = {
      id: 'att-1',
      notice_id: 'n-1',
      file_name: 'big.pdf',
      storage_path: 'n-1/big.pdf',
      mime_type: 'application/pdf',
      file_size: 100 * 1024 * 1024,
      uploaded_at: '2026-01-01T00:00:00Z',
    };

    it('업로드 중에는 파일명·진행률·전송량이 표시된다', async () => {
      let finishUpload!: (v: unknown) => void;
      mockUploadNoticeAttachmentDirect.mockImplementation(
        (_noticeId: string, _file: File, onProgress?: (loaded: number, total: number) => void) => {
          onProgress?.(42 * 1024 * 1024, 100 * 1024 * 1024);
          return new Promise((resolve) => {
            finishUpload = resolve;
          });
        }
      );

      render(<AttachmentUploader noticeId="n-1" onUploaded={mockOnUploaded} />);

      const input = screen.getByTestId('attachment-input');
      await act(async () => {
        await userEvent.upload(input, makeFile('big.pdf', 100 * 1024 * 1024));
      });

      await waitFor(() => {
        expect(screen.getByText('big.pdf')).toBeInTheDocument();
        expect(screen.getByText('42%')).toBeInTheDocument();
        expect(screen.getByText('42.0 MB / 100.0 MB')).toBeInTheDocument();
        expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '42');
      });

      await act(async () => {
        finishUpload({ success: true, data: { attachment: fakeAttachment } });
      });
    });

    it('업로드 완료 후에는 진행률이 사라진다', async () => {
      mockUploadNoticeAttachmentDirect.mockImplementation(
        async (
          _noticeId: string,
          _file: File,
          onProgress?: (loaded: number, total: number) => void
        ) => {
          onProgress?.(100 * 1024 * 1024, 100 * 1024 * 1024);
          return { success: true, data: { attachment: fakeAttachment } };
        }
      );

      render(<AttachmentUploader noticeId="n-1" onUploaded={mockOnUploaded} />);

      const input = screen.getByTestId('attachment-input');
      await act(async () => {
        await userEvent.upload(input, makeFile('big.pdf', 100 * 1024 * 1024));
      });

      await waitFor(() => {
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
    });

    it('업로드 실패 후에도 진행률이 사라진다 (잔상 방지)', async () => {
      mockUploadNoticeAttachmentDirect.mockImplementation(
        async (
          _noticeId: string,
          _file: File,
          onProgress?: (loaded: number, total: number) => void
        ) => {
          onProgress?.(50 * 1024 * 1024, 100 * 1024 * 1024);
          return { success: false, error: '서버 오류' };
        }
      );

      render(<AttachmentUploader noticeId="n-1" onUploaded={mockOnUploaded} />);

      const input = screen.getByTestId('attachment-input');
      await act(async () => {
        await userEvent.upload(input, makeFile('big.pdf', 100 * 1024 * 1024));
      });

      await waitFor(() => {
        expect(mockShowErrorToast).toHaveBeenCalled();
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
      });
    });
  });
});
