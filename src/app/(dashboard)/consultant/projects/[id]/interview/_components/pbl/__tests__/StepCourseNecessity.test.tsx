import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { StepCourseNecessity } from '../StepCourseNecessity';

describe('StepCourseNecessity', () => {
  it('작성 가이드 헤더(PBL 정본 라벨)와 정본 원문을 표시한다', () => {
    render(<StepCourseNecessity value="" onChange={() => {}} />);
    expect(screen.getByText('작성 가이드')).toBeInTheDocument();
    fireEvent.click(screen.getByText('작성 가이드'));
    expect(
      screen.getByText('1. 기업HRD이음컨설팅 및 AI훈련 로드맵 컨설팅 보고서 내용 자동 연계')
    ).toBeInTheDocument();
  });
});
