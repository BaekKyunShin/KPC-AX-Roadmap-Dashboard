import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PBLStatusBadge } from './PBLStatusBadge';

describe('PBLStatusBadge', () => {
  it('DRAFT + version 1 → "초안"', () => {
    render(<PBLStatusBadge status="DRAFT" versionNumber={1} />);
    expect(screen.getByText('초안')).toBeInTheDocument();
  });

  it('DRAFT + version 2 → "수정본"', () => {
    render(<PBLStatusBadge status="DRAFT" versionNumber={2} />);
    expect(screen.getByText('수정본')).toBeInTheDocument();
  });

  it('FINAL → "확정본"', () => {
    render(<PBLStatusBadge status="FINAL" />);
    expect(screen.getByText('확정본')).toBeInTheDocument();
  });

  it('ARCHIVED → "이전 확정본"', () => {
    render(<PBLStatusBadge status="ARCHIVED" />);
    expect(screen.getByText('이전 확정본')).toBeInTheDocument();
  });
});
