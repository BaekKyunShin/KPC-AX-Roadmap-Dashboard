import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PdfUploadField } from '../PdfUploadField';

describe('PdfUploadField', () => {
  it('file 이 null 이면 업로드 안내 영역을 표시한다', () => {
    render(
      <PdfUploadField
        file={null}
        onFileSelect={() => {}}
        onRemove={() => {}}
      />,
    );
    expect(
      screen.getByText(/PDF 파일을 드래그하거나 클릭하여 선택/),
    ).toBeInTheDocument();
  });

  it('file 이 있으면 파일명과 크기를 표시한다', () => {
    render(
      <PdfUploadField
        file={{ name: 'report.pdf', size: 1024 * 500 }}
        onFileSelect={() => {}}
        onRemove={() => {}}
      />,
    );
    expect(screen.getByText('report.pdf')).toBeInTheDocument();
    // 500 KB (500.0 KB)
    expect(screen.getByText(/500\.0 KB/)).toBeInTheDocument();
  });

  it('file.url 이 있으면 "미리보기" 링크를 표시한다', () => {
    render(
      <PdfUploadField
        file={{
          name: 'report.pdf',
          size: 2048,
          url: 'https://example.com/file.pdf',
        }}
        onFileSelect={() => {}}
        onRemove={() => {}}
      />,
    );
    const link = screen.getByRole('link', { name: '미리보기' });
    expect(link).toHaveAttribute('href', 'https://example.com/file.pdf');
    expect(link).toHaveAttribute('target', '_blank');
  });

  it('제거 버튼 클릭 시 onRemove 가 호출된다', () => {
    const onRemove = vi.fn();
    render(
      <PdfUploadField
        file={{ name: 'report.pdf', size: 2048 }}
        onFileSelect={() => {}}
        onRemove={onRemove}
      />,
    );
    fireEvent.click(screen.getByLabelText('첨부 제거'));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('disabled 이면 제거 버튼이 비활성화된다', () => {
    render(
      <PdfUploadField
        file={{ name: 'report.pdf', size: 2048 }}
        onFileSelect={() => {}}
        onRemove={() => {}}
        disabled
      />,
    );
    expect(screen.getByLabelText('첨부 제거')).toBeDisabled();
  });

  it('accept prop 이 .hwp 이면 input 의 accept 속성도 .hwp 로 전파된다', () => {
    const { container } = render(
      <PdfUploadField
        file={null}
        onFileSelect={() => {}}
        onRemove={() => {}}
        accept=".hwp"
      />,
    );
    const input = container.querySelector(
      'input[type="file"]',
    ) as HTMLInputElement;
    expect(input).toHaveAttribute('accept', '.hwp');
  });
});
