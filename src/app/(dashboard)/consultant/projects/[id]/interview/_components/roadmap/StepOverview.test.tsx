import { render, screen, within, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import StepOverview from './StepOverview';
import type { Overview } from '@/lib/schemas/interview-roadmap';

// =============================================================================
// 모킹
// =============================================================================

vi.mock('@/lib/utils/toast', () => ({
  showErrorToast: vi.fn(),
  showSuccessToast: vi.fn(),
}));

const EMPTY: Overview = {
  establishment_necessity: '',
  ai_competency_level: 'BEGINNER',
  selected_tasks_summary: '',
  roadmap_summary: '',
};

const WITH_ATTACHMENT: Overview = {
  ...EMPTY,
  hrd_report_attachment: {
    storage_path: 'p1/abc.pdf',
    file_name: '진단보고서.pdf',
    mime_type: 'application/pdf',
    size: 102400, // 100 KB
  },
};

// =============================================================================
// 테스트
// =============================================================================

describe('StepOverview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('수립 필요성 · 선정 과업 · 수립 주요내용 요약 textarea 렌더', () => {
    render(<StepOverview value={EMPTY} onChange={vi.fn()} />);
    expect(screen.getByLabelText(/수립 필요성/)).toBeInTheDocument();
    expect(screen.getByLabelText(/선정 과업/)).toBeInTheDocument();
    expect(screen.getByLabelText(/수립 주요내용/)).toBeInTheDocument();
  });

  it('AI 역량 수준 라디오 3개 + 각 부제 렌더', () => {
    render(<StepOverview value={EMPTY} onChange={vi.fn()} />);

    const radiogroup = screen.getByRole('radiogroup', { name: /AI 역량 수준/ });
    expect(radiogroup).toBeInTheDocument();

    expect(within(radiogroup).getByText('초급')).toBeInTheDocument();
    expect(within(radiogroup).getByText('(AI기초형)')).toBeInTheDocument();
    expect(within(radiogroup).getByText('중급')).toBeInTheDocument();
    expect(within(radiogroup).getByText('(AI탐구형)')).toBeInTheDocument();
    expect(within(radiogroup).getByText('고급')).toBeInTheDocument();
    expect(within(radiogroup).getByText('(AI활용형·선도형)')).toBeInTheDocument();
  });

  it('선택된 AI 역량 수준 라디오가 checked 상태', () => {
    render(
      <StepOverview value={{ ...EMPTY, ai_competency_level: 'INTERMEDIATE' }} onChange={vi.fn()} />,
    );
    const radios = screen.getAllByRole('radio');
    const intermediate = radios.find((r) => (r as HTMLInputElement).value === 'INTERMEDIATE');
    expect(intermediate).toBeChecked();
  });

  it('라디오 변경 시 ai_competency_level onChange 호출', async () => {
    const onChange = vi.fn();
    render(<StepOverview value={EMPTY} onChange={onChange} />);

    await userEvent.click(screen.getByLabelText(/^중급/));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ ai_competency_level: 'INTERMEDIATE' }),
    );
  });

  it('textarea 입력 시 해당 key로 onChange', async () => {
    const onChange = vi.fn();
    render(<StepOverview value={EMPTY} onChange={onChange} />);

    await userEvent.type(screen.getByLabelText(/수립 필요성/), 'X');
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ establishment_necessity: 'X' }),
    );
  });

  it('HRD이음 첨부 미존재 시 "파일 선택" 버튼 표시', () => {
    render(
      <StepOverview
        value={EMPTY}
        onChange={vi.fn()}
        onUploadHrdReport={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: /파일 선택/ })).toBeInTheDocument();
  });

  it('HRD이음 첨부가 있으면 파일명·삭제 버튼 표시', () => {
    render(
      <StepOverview
        value={WITH_ATTACHMENT}
        onChange={vi.fn()}
        onRemoveHrdReport={vi.fn()}
      />,
    );
    expect(screen.getByText('진단보고서.pdf')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /삭제/ })).toBeInTheDocument();
  });

  it('errors prop으로 필드 에러 메시지 표시', () => {
    render(
      <StepOverview
        value={EMPTY}
        onChange={vi.fn()}
        errors={{ establishment_necessity: '필수 입력' }}
      />,
    );
    expect(screen.getByText('필수 입력')).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // formatBytes 분기
  // ---------------------------------------------------------------------------
  describe('formatBytes — 파일 크기 표시', () => {
    it('size=0이면 크기 포맷 텍스트가 비어있어 구분자가 렌더링되지 않는다', () => {
      const value: Overview = {
        ...EMPTY,
        hrd_report_attachment: {
          storage_path: 'p/a.pdf',
          file_name: 'test.pdf',
          mime_type: 'application/pdf',
          size: 0,
        },
      };
      const { container } = render(<StepOverview value={value} onChange={vi.fn()} />);
      // size=0 → formatBytes 반환값 '' → ` · ` 분기를 타지 않음
      // 첨부 파일 설명 줄에 " · " 구분자(공백 포함)가 없는지 확인
      const mimeLines = container.querySelectorAll('.text-xs.text-muted-foreground');
      // 첨부 파일 크기 줄은 "application/pdf" 만 표시 (· 없음)
      const attachmentMimeLine = Array.from(mimeLines).find(
        (el) => el.textContent?.includes('application/pdf') && !el.textContent?.includes('기초형'),
      );
      expect(attachmentMimeLine?.textContent).toBe('application/pdf');
    });

    it('size=undefined이면 MIME 타입만 표시된다', () => {
      const value: Overview = {
        ...EMPTY,
        hrd_report_attachment: {
          storage_path: 'p/a.pdf',
          file_name: 'test.pdf',
          mime_type: 'application/pdf',
          size: undefined,
        },
      };
      render(<StepOverview value={value} onChange={vi.fn()} />);
      expect(screen.getByText('application/pdf')).toBeInTheDocument();
    });

    it('size=5(B 단위, 10 미만)이면 소수점 1자리로 표시된다', () => {
      // v=5 < 10 → toFixed(1) → "5.0 B"
      const value: Overview = {
        ...EMPTY,
        hrd_report_attachment: {
          storage_path: 'p/a.pdf',
          file_name: 'test.pdf',
          mime_type: 'application/pdf',
          size: 5,
        },
      };
      const { container } = render(<StepOverview value={value} onChange={vi.fn()} />);
      const mimeLines = container.querySelectorAll('.text-xs.text-muted-foreground');
      const attachmentMimeLine = Array.from(mimeLines).find(
        (el) => el.textContent?.includes('5.0 B'),
      );
      expect(attachmentMimeLine).toBeTruthy();
    });

    it('size=500B이면 정수로 "500 B" 형식으로 표시된다', () => {
      // v=500 >= 10 → toFixed(0) → "500 B"
      const value: Overview = {
        ...EMPTY,
        hrd_report_attachment: {
          storage_path: 'p/a.pdf',
          file_name: 'test.pdf',
          mime_type: 'application/pdf',
          size: 500,
        },
      };
      const { container } = render(<StepOverview value={value} onChange={vi.fn()} />);
      const mimeLines = container.querySelectorAll('.text-xs.text-muted-foreground');
      const attachmentMimeLine = Array.from(mimeLines).find(
        (el) => el.textContent?.includes('500 B'),
      );
      expect(attachmentMimeLine).toBeTruthy();
    });

    it('size=102400(100KB)이면 "100 KB"로 표시된다', () => {
      render(<StepOverview value={WITH_ATTACHMENT} onChange={vi.fn()} />);
      // 102400 / 1024 = 100 KB, 100 >= 10 → toFixed(0) = "100 KB"
      expect(screen.getByText(/application\/pdf · 100 KB/)).toBeInTheDocument();
    });

    it('mime_type=undefined이면 "파일" 텍스트를 표시한다', () => {
      const value: Overview = {
        ...EMPTY,
        hrd_report_attachment: {
          storage_path: 'p/a.pdf',
          file_name: 'test.pdf',
          mime_type: undefined,
          size: 102400,
        },
      };
      render(<StepOverview value={value} onChange={vi.fn()} />);
      // mime_type ?? '파일' → "파일"
      expect(screen.getByText(/파일 · 100 KB/)).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // 파일 업로드 분기
  // ---------------------------------------------------------------------------
  describe('handleFileSelect 분기', () => {
    it('onUploadHrdReport 없으면 파일 선택 버튼이 비활성화된다', () => {
      render(<StepOverview value={EMPTY} onChange={vi.fn()} />);
      const btn = screen.getByRole('button', { name: /파일 선택/ });
      expect(btn).toBeDisabled();
    });

    it('업로드 성공 시 onChange 호출 + 성공 토스트', async () => {
      const { showSuccessToast } = await import('@/lib/utils/toast');
      const onChange = vi.fn();
      const onUpload = vi.fn().mockResolvedValue({
        success: true,
        data: {
          storage_path: 'path/to/file.pdf',
          file_name: 'file.pdf',
          mime_type: 'application/pdf',
          size: 1024,
        },
      });

      render(<StepOverview value={EMPTY} onChange={onChange} onUploadHrdReport={onUpload} />);

      const fileInput = screen.getByLabelText(/HRD이음/);
      const file = new File(['content'], 'file.pdf', { type: 'application/pdf' });
      await userEvent.upload(fileInput, file);

      await waitFor(() => {
        expect(onChange).toHaveBeenCalled();
        expect(showSuccessToast).toHaveBeenCalled();
      });
    });

    it('업로드 실패 시 에러 토스트 호출', async () => {
      const { showErrorToast } = await import('@/lib/utils/toast');
      const onUpload = vi.fn().mockResolvedValue({
        success: false,
        error: '업로드 오류',
      });

      render(<StepOverview value={EMPTY} onChange={vi.fn()} onUploadHrdReport={onUpload} />);

      const fileInput = screen.getByLabelText(/HRD이음/);
      const file = new File(['content'], 'fail.pdf', { type: 'application/pdf' });
      await userEvent.upload(fileInput, file);

      await waitFor(() => {
        expect(showErrorToast).toHaveBeenCalledWith('업로드 실패', '업로드 오류');
      });
    });

    it('업로드 예외 발생 시 에러 토스트 호출', async () => {
      const { showErrorToast } = await import('@/lib/utils/toast');
      const onUpload = vi.fn().mockRejectedValue(new Error('네트워크'));

      render(<StepOverview value={EMPTY} onChange={vi.fn()} onUploadHrdReport={onUpload} />);

      const fileInput = screen.getByLabelText(/HRD이음/);
      const file = new File(['content'], 'err.pdf', { type: 'application/pdf' });
      await userEvent.upload(fileInput, file);

      await waitFor(() => {
        expect(showErrorToast).toHaveBeenCalledWith('업로드 실패', expect.any(String));
      });
    });
  });

  // ---------------------------------------------------------------------------
  // 첨부 삭제 분기
  // ---------------------------------------------------------------------------
  describe('handleRemoveAttachment 분기', () => {
    it('confirm=false이면 삭제 로직이 실행되지 않는다', async () => {
      const onRemove = vi.fn();
      vi.spyOn(window, 'confirm').mockReturnValue(false);

      render(
        <StepOverview
          value={WITH_ATTACHMENT}
          onChange={vi.fn()}
          onRemoveHrdReport={onRemove}
        />,
      );

      await userEvent.click(screen.getByRole('button', { name: /삭제/ }));
      expect(onRemove).not.toHaveBeenCalled();
    });

    it('삭제 성공 시 onChange로 hrd_report_attachment=undefined', async () => {
      const { showSuccessToast } = await import('@/lib/utils/toast');
      const onChange = vi.fn();
      const onRemove = vi.fn().mockResolvedValue({ success: true });
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      render(
        <StepOverview
          value={WITH_ATTACHMENT}
          onChange={onChange}
          onRemoveHrdReport={onRemove}
        />,
      );

      await userEvent.click(screen.getByRole('button', { name: /삭제/ }));
      await waitFor(() => {
        expect(onChange).toHaveBeenCalledWith(
          expect.objectContaining({ hrd_report_attachment: undefined }),
        );
        expect(showSuccessToast).toHaveBeenCalled();
      });
    });

    it('삭제 실패 시 에러 토스트 호출', async () => {
      const { showErrorToast } = await import('@/lib/utils/toast');
      const onRemove = vi.fn().mockResolvedValue({ success: false, error: '삭제 실패' });
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      render(
        <StepOverview
          value={WITH_ATTACHMENT}
          onChange={vi.fn()}
          onRemoveHrdReport={onRemove}
        />,
      );

      await userEvent.click(screen.getByRole('button', { name: /삭제/ }));
      await waitFor(() => {
        expect(showErrorToast).toHaveBeenCalledWith('삭제 실패', '삭제 실패');
      });
    });

    it('삭제 실패 시 error가 없으면 기본 메시지로 에러 토스트 호출', async () => {
      const { showErrorToast } = await import('@/lib/utils/toast');
      const onRemove = vi.fn().mockResolvedValue({ success: false });
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      render(
        <StepOverview
          value={WITH_ATTACHMENT}
          onChange={vi.fn()}
          onRemoveHrdReport={onRemove}
        />,
      );

      await userEvent.click(screen.getByRole('button', { name: /삭제/ }));
      await waitFor(() => {
        expect(showErrorToast).toHaveBeenCalledWith('삭제 실패', '서버 오류가 발생했습니다.');
      });
    });
  });

  // ---------------------------------------------------------------------------
  // 첨부 다운로드 분기
  // ---------------------------------------------------------------------------
  describe('handleDownload 분기', () => {
    it('다운로드 성공 시 window.open 호출', async () => {
      const windowOpen = vi.spyOn(window, 'open').mockImplementation(() => null);
      const onDownload = vi.fn().mockResolvedValue({ url: 'https://example.com/file.pdf' });

      render(
        <StepOverview
          value={WITH_ATTACHMENT}
          onChange={vi.fn()}
          onRemoveHrdReport={vi.fn()}
          onDownloadHrdReport={onDownload}
        />,
      );

      await userEvent.click(screen.getByRole('button', { name: /다운로드/ }));
      await waitFor(() => {
        expect(windowOpen).toHaveBeenCalledWith(
          'https://example.com/file.pdf',
          '_blank',
          'noopener,noreferrer',
        );
      });
    });

    it('다운로드 URL이 없으면 에러 토스트 호출', async () => {
      const { showErrorToast } = await import('@/lib/utils/toast');
      const onDownload = vi.fn().mockResolvedValue(null);

      render(
        <StepOverview
          value={WITH_ATTACHMENT}
          onChange={vi.fn()}
          onRemoveHrdReport={vi.fn()}
          onDownloadHrdReport={onDownload}
        />,
      );

      await userEvent.click(screen.getByRole('button', { name: /다운로드/ }));
      await waitFor(() => {
        expect(showErrorToast).toHaveBeenCalledWith(
          '다운로드 실패',
          '미리보기 URL을 가져오지 못했습니다.',
        );
      });
    });

    it('onDownloadHrdReport 없으면 다운로드 버튼이 표시되지 않는다', () => {
      render(
        <StepOverview
          value={WITH_ATTACHMENT}
          onChange={vi.fn()}
          onRemoveHrdReport={vi.fn()}
        />,
      );
      expect(screen.queryByRole('button', { name: /다운로드/ })).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // handleFileSelect — 파일이 없는 경우
  // ---------------------------------------------------------------------------
  describe('handleFileSelect — 파일 없음', () => {
    it('파일을 선택하지 않으면 onUploadHrdReport를 호출하지 않는다', async () => {
      const onUpload = vi.fn();
      render(<StepOverview value={EMPTY} onChange={vi.fn()} onUploadHrdReport={onUpload} />);

      const fileInput = screen.getByLabelText(/HRD이음/);
      // 빈 파일 목록 — files가 없는 상태
      fireEvent.change(fileInput, { target: { files: [] } });

      expect(onUpload).not.toHaveBeenCalled();
    });
  });
});
