import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// utils mock — toast 함수만 stub, cn 등 나머지 export 는 그대로 유지
vi.mock('@/lib/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/utils')>();
  return {
    ...actual,
    showErrorToast: vi.fn(),
    showSuccessToast: vi.fn(),
  };
});

// uploadInterviewAttachment Server Action mock
const uploadInterviewAttachment = vi.fn();
vi.mock('../../../actions', () => ({
  uploadInterviewAttachment: (...args: unknown[]) => uploadInterviewAttachment(...args),
}));

import { StepHrdReportPdf } from '../StepHrdReportPdf';

describe('StepHrdReportPdf', () => {
  beforeEach(() => {
    uploadInterviewAttachment.mockReset();
  });

  it('value=null 이면 업로드 안내 영역을 표시한다', () => {
    render(<StepHrdReportPdf projectId="p1" value={null} onChange={() => {}} />);
    expect(screen.getByText(/PDF 파일을 드래그하거나 클릭하여 선택/)).toBeInTheDocument();
  });

  it('value 가 있으면 파일명과 크기를 표시한다', () => {
    render(
      <StepHrdReportPdf
        projectId="p1"
        value={{
          fileName: 'hrd-report.pdf',
          url: 'p1/note-uuid.pdf',
          size: 1024 * 200,
        }}
        onChange={() => {}}
      />
    );
    expect(screen.getByText('hrd-report.pdf')).toBeInTheDocument();
    expect(screen.getByText(/200\.0 KB/)).toBeInTheDocument();
  });

  it('parseError 가 있으면 안내 문구를 표시한다', () => {
    render(
      <StepHrdReportPdf
        projectId="p1"
        value={{
          fileName: 'hrd.pdf',
          url: 'p1/note-uuid.pdf',
          size: 1024,
          parseError: '파일이 암호화되어 있습니다',
        }}
        onChange={() => {}}
      />
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      'PDF 본문 자동 추출 실패: 파일이 암호화되어 있습니다'
    );
  });

  it('파일 선택 시 uploadInterviewAttachment 호출 후 camelCase 로 onChange 한다', async () => {
    uploadInterviewAttachment.mockResolvedValue({
      success: true,
      data: {
        storage_path: 'p1/note-uuid.pdf',
        file_name: 'hrd-report.pdf',
        mime_type: 'application/pdf',
        size: 4096,
        uploaded_at: '2026-04-24T00:00:00.000Z',
        extracted_text: '본문 텍스트',
      },
    });
    const onChange = vi.fn();
    const { container } = render(
      <StepHrdReportPdf projectId="proj-123" value={null} onChange={onChange} />
    );
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['dummy'], 'hrd-report.pdf', {
      type: 'application/pdf',
    });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(uploadInterviewAttachment).toHaveBeenCalledTimes(1));
    expect(uploadInterviewAttachment.mock.calls[0][0]).toBe('proj-123');
    expect(uploadInterviewAttachment.mock.calls[0][1]).toBeInstanceOf(FormData);

    await waitFor(() => expect(onChange).toHaveBeenCalledTimes(1));
    expect(onChange).toHaveBeenCalledWith({
      fileName: 'hrd-report.pdf',
      url: 'p1/note-uuid.pdf',
      size: 4096,
      extractedText: '본문 텍스트',
    });
  });

  it('업로드 실패 시 onChange 가 호출되지 않는다', async () => {
    uploadInterviewAttachment.mockResolvedValue({
      success: false,
      error: '파일이 너무 큽니다',
    });
    const onChange = vi.fn();
    const { container } = render(
      <StepHrdReportPdf projectId="p1" value={null} onChange={onChange} />
    );
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['x'], 'hrd.pdf', { type: 'application/pdf' });
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => expect(uploadInterviewAttachment).toHaveBeenCalledTimes(1));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('제거 버튼 클릭 시 onChange(null) 이 호출된다', () => {
    const onChange = vi.fn();
    render(
      <StepHrdReportPdf
        projectId="p1"
        value={{
          fileName: 'hrd.pdf',
          url: 'p1/note-uuid.pdf',
          size: 1024,
        }}
        onChange={onChange}
      />
    );
    fireEvent.click(screen.getByLabelText('첨부 제거'));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('작성 안내에 정본 원문(□·※)을 그대로 표시한다', () => {
    render(<StepHrdReportPdf projectId="p1" value={null} onChange={() => {}} />);
    fireEvent.click(screen.getByText('작성 안내'));
    expect(
      screen.getByText('□ 기업HRD이음컨설팅 보고서의 AI역량 진단 결과 내용 첨부(별도 작성 불요)')
    ).toBeInTheDocument();
    expect(
      screen.getByText('- (초급) AI기초형 / (중급) AI탐구형 / (고급) AI활용형·AI선도형')
    ).toBeInTheDocument();
    expect(
      screen.getByText('※ [별첨] 중소기업 AI역량 측정 진단도구 내용 참조')
    ).toBeInTheDocument();
  });

  it('섹션 제목이 정본 Ⅱ-1 "기업 AI 역량 수준 진단"과 일관된다', () => {
    render(<StepHrdReportPdf projectId="p1" value={null} onChange={() => {}} />);
    expect(screen.getByText('기업 AI 역량 수준 진단 (PDF 첨부)')).toBeInTheDocument();
  });
});
