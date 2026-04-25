import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import { TabPBLOutcomes } from '../TabPBLOutcomes';

describe('TabPBLOutcomes (Ⅴ. 성과분석 및 확산 전략)', () => {
  it('Ⅴ-1 / Ⅴ-2 섹션 렌더', () => {
    render(
      <TabPBLOutcomes
        version={null}
        interview={{}}
        readOnly
        onEdit={vi.fn()}
      />,
    );
    expect(screen.getByText(/Ⅴ-1\. 성과분석 측정 지표/)).toBeInTheDocument();
    expect(screen.getByText(/Ⅴ-2\. 성과 확산 전략/)).toBeInTheDocument();
  });

  it('LLM placeholder 2개 표출 (Task 2.10 이전)', () => {
    render(
      <TabPBLOutcomes
        version={null}
        interview={{}}
        readOnly
        onEdit={vi.fn()}
      />,
    );
    const placeholders = screen.getAllByText(/아직 생성되지 않았습니다/);
    expect(placeholders.length).toBe(2);
  });

  it('제외 라벨 ("결과보고서" / "수행일지") 을 렌더하지 않음 (P-27~P-29 배제)', () => {
    const { container } = render(
      <TabPBLOutcomes
        version={null}
        interview={{}}
        readOnly
        onEdit={vi.fn()}
      />,
    );
    const text = container.textContent ?? '';
    expect(text).not.toContain('결과보고서');
    expect(text).not.toContain('수행일지');
    expect(text).not.toContain('별첨');
  });
});
