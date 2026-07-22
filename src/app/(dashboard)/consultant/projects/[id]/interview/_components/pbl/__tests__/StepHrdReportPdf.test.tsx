import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('@/lib/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/utils')>();
  return {
    ...actual,
    showErrorToast: vi.fn(),
    showSuccessToast: vi.fn(),
  };
});

const uploadInterviewAttachment = vi.fn();
vi.mock('../../../actions', () => ({
  uploadInterviewAttachment: (...args: unknown[]) => uploadInterviewAttachment(...args),
}));

import { StepHrdReportPdf } from '../StepHrdReportPdf';

describe('StepHrdReportPdf (PBL V2)', () => {
  beforeEach(() => {
    uploadInterviewAttachment.mockReset();
  });

  it('FormSection 번호·제목이 노출된다', () => {
    render(<StepHrdReportPdf projectId="p1" value={null} onChange={vi.fn()} />);
    // R3 #10(PBL) — 양식 정확 명칭으로 정정됨
    expect(
      screen.getByRole('heading', {
        name: /기업HRD이음컨설팅 결과 \(PDF 첨부\)/,
        level: 2,
      })
    ).toBeInTheDocument();
    expect(screen.getByText('Ⅱ-1-가')).toBeInTheDocument();
  });

  it('작성 가이드 헤더(PBL 정본 라벨)를 표시한다', () => {
    render(<StepHrdReportPdf projectId="p1" value={null} onChange={vi.fn()} />);
    expect(screen.getByText('작성 가이드')).toBeInTheDocument();
  });

  it('업로드 성공 시 onChange 에 camelCase 메타가 전달된다', async () => {
    uploadInterviewAttachment.mockResolvedValue({
      success: true,
      data: {
        file_name: '보고서.pdf',
        storage_path: 'projects/p1/보고서.pdf',
        size: 12345,
        extracted_text: '본문...',
        parse_error: null,
      },
    });
    const onChange = vi.fn();
    render(<StepHrdReportPdf projectId="p1" value={null} onChange={onChange} />);
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['dummy'], '보고서.pdf', { type: 'application/pdf' });
    fireEvent.change(fileInput, { target: { files: [file] } });
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    const meta = onChange.mock.calls[0][0];
    expect(meta.fileName).toBe('보고서.pdf');
    expect(meta.url).toBe('projects/p1/보고서.pdf');
    expect(meta.size).toBe(12345);
    expect(meta.extractedText).toBe('본문...');
  });

  it('제거 버튼 클릭 시 onChange(null) 호출', () => {
    const onChange = vi.fn();
    render(
      <StepHrdReportPdf
        projectId="p1"
        value={{
          fileName: 'a.pdf',
          url: 'https://example.com/a.pdf',
          size: 100,
        }}
        onChange={onChange}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /첨부 제거/ }));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('parseError 가 있을 때 경고 메시지를 노출한다', () => {
    render(
      <StepHrdReportPdf
        projectId="p1"
        value={{
          fileName: 'a.pdf',
          url: 'x',
          size: 10,
          parseError: '암호화된 PDF',
        }}
        onChange={vi.fn()}
      />
    );
    expect(screen.getByText(/PDF 본문 자동 추출 실패: 암호화된 PDF/)).toBeInTheDocument();
  });
});
