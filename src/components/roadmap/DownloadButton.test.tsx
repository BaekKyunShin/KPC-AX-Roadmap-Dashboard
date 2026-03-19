import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { DownloadButton } from './DownloadButton';

// ============================================================================
// 테스트
// ============================================================================

describe('DownloadButton', () => {
  const defaultProps = {
    onClick: vi.fn(),
    loading: false,
    type: 'PDF' as const,
    disabled: false,
  };

  describe('타입별 렌더링', () => {
    it('type이 PDF이면 "PDF" 텍스트를 표시한다', () => {
      render(<DownloadButton {...defaultProps} type="PDF" />);
      expect(screen.getByText('PDF')).toBeInTheDocument();
    });

    it('type이 Excel이면 "Excel" 텍스트를 표시한다', () => {
      render(<DownloadButton {...defaultProps} type="Excel" />);
      expect(screen.getByText('Excel')).toBeInTheDocument();
    });

    it('기본 상태에서 Download 아이콘이 렌더링된다', () => {
      const { container } = render(<DownloadButton {...defaultProps} />);
      const svgs = container.querySelectorAll('svg');
      expect(svgs.length).toBe(1);
    });
  });

  describe('로딩 상태', () => {
    it('loading이 true이면 "다운로드 중..." 텍스트를 표시한다', () => {
      render(<DownloadButton {...defaultProps} loading={true} />);
      expect(screen.getByText('다운로드 중...')).toBeInTheDocument();
    });

    it('loading이 true이면 타입 텍스트를 표시하지 않는다', () => {
      render(<DownloadButton {...defaultProps} loading={true} type="PDF" />);
      expect(screen.queryByText('PDF')).not.toBeInTheDocument();
    });

    it('loading이 true이면 스피너 아이콘(animate-spin)이 렌더링된다', () => {
      const { container } = render(<DownloadButton {...defaultProps} loading={true} />);
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('loading이 false이면 "다운로드 중..."을 표시하지 않는다', () => {
      render(<DownloadButton {...defaultProps} loading={false} />);
      expect(screen.queryByText('다운로드 중...')).not.toBeInTheDocument();
    });
  });

  describe('disabled 상태', () => {
    it('disabled가 true이면 버튼이 비활성화된다', () => {
      render(<DownloadButton {...defaultProps} disabled={true} />);
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('disabled가 false이면 버튼이 활성화된다', () => {
      render(<DownloadButton {...defaultProps} disabled={false} />);
      expect(screen.getByRole('button')).toBeEnabled();
    });

    it('disabled가 true이면 opacity 스타일이 적용된다', () => {
      render(<DownloadButton {...defaultProps} disabled={true} />);
      expect(screen.getByRole('button')).toHaveClass('disabled:opacity-50');
    });
  });

  describe('클릭 이벤트', () => {
    it('클릭 시 onClick을 호출한다', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      render(<DownloadButton {...defaultProps} onClick={onClick} />);

      await user.click(screen.getByRole('button'));
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('disabled 상태에서는 클릭해도 onClick을 호출하지 않는다', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      render(<DownloadButton {...defaultProps} onClick={onClick} disabled={true} />);

      await user.click(screen.getByRole('button'));
      expect(onClick).not.toHaveBeenCalled();
    });
  });
});
