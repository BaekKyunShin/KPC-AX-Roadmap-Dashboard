import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { StepOverview } from '../StepOverview';
import type { PBLOverview } from '@/lib/schemas/interview-pbl';

function makeValue(over: Partial<PBLOverview> = {}): PBLOverview {
  return {
    companyName: '',
    courseName: '',
    trainingHours: 0,
    trainingTarget: '',
    trainingForm: '',
    trainingPeriod: '',
    businessIssues: '',
    ...over,
  };
}

describe('StepOverview', () => {
  it('작성 가이드 헤더(PBL 정본 라벨)와 정본 ☞ 원문을 표시한다', () => {
    render(<StepOverview value={makeValue()} onChange={() => {}} />);
    expect(screen.getByText('작성 가이드')).toBeInTheDocument();
    fireEvent.click(screen.getByText('작성 가이드'));
    expect(
      screen.getByText(
        '☞ (기업명/사업장관리번호/주요 업종/주소/훈련실시주소/관할 지부·지사) 신청서 기준으로 자동 불러옴 처리되며, 내용 수정이 불가'
      )
    ).toBeInTheDocument();
  });
});
