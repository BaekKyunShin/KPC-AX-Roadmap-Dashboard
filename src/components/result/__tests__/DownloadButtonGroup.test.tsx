import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DownloadButtonGroup } from '../DownloadButtonGroup';

describe('DownloadButtonGroup', () => {
  it('PDF · XLSX · HWPX 3개 버튼을 렌더한다', () => {
    render(<DownloadButtonGroup onDownload={() => {}} />);
    expect(screen.getByRole('button', { name: /PDF/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Excel/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /HWPX/ })).toBeInTheDocument();
  });

  it('라벨은 Excel 로 표시되지만 onDownload 에는 XLSX 로 전달한다', async () => {
    const user = userEvent.setup();
    const onDownload = vi.fn();
    render(<DownloadButtonGroup onDownload={onDownload} />);
    await user.click(screen.getByRole('button', { name: /Excel/ }));
    expect(onDownload).toHaveBeenCalledWith('XLSX');
  });

  it('PDF 버튼 클릭 시 onDownload("PDF") 를 호출한다', async () => {
    const user = userEvent.setup();
    const onDownload = vi.fn();
    render(<DownloadButtonGroup onDownload={onDownload} />);
    await user.click(screen.getByRole('button', { name: /PDF/ }));
    expect(onDownload).toHaveBeenCalledWith('PDF');
  });

  it('HWPX 버튼 클릭 시 onDownload("HWPX") 를 호출한다', async () => {
    const user = userEvent.setup();
    const onDownload = vi.fn();
    render(<DownloadButtonGroup onDownload={onDownload} />);
    await user.click(screen.getByRole('button', { name: /HWPX/ }));
    expect(onDownload).toHaveBeenCalledWith('HWPX');
  });

  it('loading 상태일 때 해당 버튼에 spinner 를 표시한다', () => {
    render(<DownloadButtonGroup onDownload={() => {}} loading="PDF" />);
    const pdfButton = screen.getByRole('button', { name: /PDF/ });
    // Loader2 는 animate-spin 클래스로 식별
    expect(pdfButton.querySelector('.animate-spin')).toBeTruthy();
  });

  it('loading 중에는 모든 버튼이 disabled 다', () => {
    render(<DownloadButtonGroup onDownload={() => {}} loading="PDF" />);
    expect(screen.getByRole('button', { name: /PDF/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Excel/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /HWPX/ })).toBeDisabled();
  });

  it('disabled prop=true 이면 3버튼 모두 disabled 다', () => {
    render(<DownloadButtonGroup onDownload={() => {}} disabled />);
    expect(screen.getByRole('button', { name: /PDF/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Excel/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /HWPX/ })).toBeDisabled();
  });

  it('className props 가 컨테이너에 cn() 합성된다', () => {
    const { container } = render(
      <DownloadButtonGroup onDownload={() => {}} className="justify-end" />,
    );
    const root = container.firstChild as HTMLElement;
    expect(root.className).toMatch(/flex/);
    expect(root.className).toMatch(/gap-2/);
    expect(root.className).toMatch(/justify-end/);
  });

  it('errorType="HWPX" 일 때 HWPX 버튼 옆에 ⚠ 아이콘(text-amber-500)이 노출된다', () => {
    render(<DownloadButtonGroup onDownload={() => {}} errorType="HWPX" />);
    const hwpxButton = screen.getByRole('button', { name: /HWPX/ });
    expect(hwpxButton.querySelector('.text-amber-500')).toBeTruthy();

    const pdfButton = screen.getByRole('button', { name: /PDF/ });
    expect(pdfButton.querySelector('.text-amber-500')).toBeFalsy();
  });

  it('errorType=null 이면 어떤 버튼에도 ⚠ 아이콘이 노출되지 않는다', () => {
    render(<DownloadButtonGroup onDownload={() => {}} errorType={null} />);
    expect(
      screen.getByRole('button', { name: /PDF/ }).querySelector('.text-amber-500'),
    ).toBeFalsy();
    expect(
      screen.getByRole('button', { name: /HWPX/ }).querySelector('.text-amber-500'),
    ).toBeFalsy();
  });
});
