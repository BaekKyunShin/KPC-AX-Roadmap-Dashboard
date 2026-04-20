import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SectionNumberBadge } from './SectionNumberBadge';

describe('SectionNumberBadge', () => {
  it('label과 index+1 형식으로 표시한다', () => {
    render(<SectionNumberBadge label="명세서" index={0} />);
    expect(screen.getByText('명세서 #1')).toBeInTheDocument();
  });

  it('index 1은 #2로 표시한다', () => {
    render(<SectionNumberBadge label="PBL 프로젝트" index={1} />);
    expect(screen.getByText('PBL 프로젝트 #2')).toBeInTheDocument();
  });

  it('기본 outline blue 스타일을 적용한다', () => {
    render(<SectionNumberBadge label="명세서" index={0} />);
    const badge = screen.getByText('명세서 #1');
    expect(badge).toHaveClass('bg-blue-50');
    expect(badge).toHaveClass('text-blue-700');
    expect(badge).toHaveClass('border-blue-200');
  });

  it('추가 className을 병합한다', () => {
    render(<SectionNumberBadge label="명세서" index={0} className="text-lg" />);
    const badge = screen.getByText('명세서 #1');
    expect(badge).toHaveClass('bg-blue-50');
    expect(badge).toHaveClass('text-lg');
  });
});
