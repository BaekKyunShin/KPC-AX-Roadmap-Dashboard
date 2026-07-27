import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { StepExpectations } from '../StepExpectations';
import type { PBLTrainingEnv } from '@/lib/schemas/interview-pbl';

function emptyEnv(): PBLTrainingEnv {
  return {
    properTrainingHours: '',
    internalPlace: '',
    externalPlace: '',
    internalInstructors: [],
    externalInstructors: [],
    aiInfrastructure: '',
    targetCharacteristics: { career: '', level: '' },
    aiInfraDetail: { toolCapacity: 'AVAILABLE', networkStatus: 'GOOD', pcCount: 0 },
    trainingNeedsAnalysis: '',
    expectationAsIs: '',
    expectationToBe: '',
    targetTraineeCount: 0,
    internalInstructorUsage: 'NO',
    internalInstructorPrimary: { name: '', position: '' },
    otherEquipment: '',
  };
}

describe('StepExpectations (Ⅱ-3-b 기대효과·요구분석)', () => {
  it('작성 가이드 헤더로 안내를 표시한다', () => {
    render(<StepExpectations value={emptyEnv()} onChange={vi.fn()} />);
    expect(screen.getByText('작성 가이드')).toBeInTheDocument();
  });

  it('작성 가이드에 정본 기대효과 원문(3.)을 그대로 표시한다', () => {
    render(<StepExpectations value={emptyEnv()} onChange={vi.fn()} />);
    fireEvent.click(screen.getByText('작성 가이드'));
    expect(
      screen.getByText(
        '3. ‘훈련을 통한 기대효과’는 업무수행 시 애로사항(As-is)과 해당 업무를 우수하게 수행하기 위해 요구되는 수준(To-be)을 작성(gap 분석)하고, 이를 훈련 목표 및 내용에 연계'
      )
    ).toBeInTheDocument();
  });
});
