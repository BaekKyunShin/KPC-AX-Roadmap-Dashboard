import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

import { StepCompanyIssues } from '../StepCompanyIssues';

describe('StepCompanyIssues', () => {
  it('작성 가이드 헤더(PBL 정본 라벨)를 표시한다', () => {
    render(<StepCompanyIssues value="" onChange={() => {}} />);
    expect(screen.getByText('작성 가이드')).toBeInTheDocument();
  });
});
