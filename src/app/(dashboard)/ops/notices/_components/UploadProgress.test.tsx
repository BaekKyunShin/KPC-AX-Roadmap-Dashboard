import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { UploadProgress } from './UploadProgress';

describe('UploadProgress', () => {
  it('파일명을 표시한다', () => {
    render(
      <UploadProgress
        fileName="AI훈련_매뉴얼_v3.pdf"
        loaded={42 * 1024 * 1024}
        total={100 * 1024 * 1024}
      />
    );
    expect(screen.getByText('AI훈련_매뉴얼_v3.pdf')).toBeInTheDocument();
  });

  it('전송량을 "42.0 MB / 100.0 MB" 형태로 표시한다', () => {
    render(<UploadProgress fileName="a.pdf" loaded={42 * 1024 * 1024} total={100 * 1024 * 1024} />);
    expect(screen.getByText('42.0 MB / 100.0 MB')).toBeInTheDocument();
  });

  it('진행률(%)을 표시한다', () => {
    render(<UploadProgress fileName="a.pdf" loaded={42 * 1024 * 1024} total={100 * 1024 * 1024} />);
    expect(screen.getByText('42%')).toBeInTheDocument();
  });

  it('progressbar 역할과 aria-valuenow 로 진행률을 노출한다 (스크린리더)', () => {
    render(<UploadProgress fileName="a.pdf" loaded={42 * 1024 * 1024} total={100 * 1024 * 1024} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '42');
  });

  it('total 이 0 이면 0% 로 표시한다 (0 나누기 방지)', () => {
    render(<UploadProgress fileName="a.pdf" loaded={0} total={0} />);
    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  });

  it('완료 시 100% 로 표시한다', () => {
    render(
      <UploadProgress fileName="a.pdf" loaded={100 * 1024 * 1024} total={100 * 1024 * 1024} />
    );
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('퍼센트는 내림 처리한다 (99.9% → 99%, 완료 전 100% 오표시 방지)', () => {
    render(<UploadProgress fileName="a.pdf" loaded={999} total={1000} />);
    expect(screen.getByText('99%')).toBeInTheDocument();
  });
});
