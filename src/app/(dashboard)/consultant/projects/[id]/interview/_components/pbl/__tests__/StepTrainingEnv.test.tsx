import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { StepTrainingEnv } from '../StepTrainingEnv';
import type { PBLTrainingEnv } from '@/lib/schemas/interview-pbl';

function emptyEnv(): PBLTrainingEnv {
  return {
    properTrainingHours: '',
    internalPlace: '',
    externalPlace: '',
    internalInstructors: [],
    externalInstructors: [],
    aiInfrastructure: '',
  };
}

describe('StepTrainingEnv (R8 PBL-자체-02 — 12×7 정형 표 6 영역)', () => {
  it('FormSection 번호·제목이 노출된다', () => {
    render(<StepTrainingEnv value={emptyEnv()} onChange={vi.fn()} />);
    expect(
      screen.getByRole('heading', { name: '기업 훈련환경 분석', level: 2 }),
    ).toBeInTheDocument();
    expect(screen.getByText('Ⅱ-2')).toBeInTheDocument();
  });

  it('6 영역 라벨이 모두 노출된다 (적정 훈련시간 / 사내·사외 장소 / 사내·외부강사 / AI 인프라)', () => {
    render(<StepTrainingEnv value={emptyEnv()} onChange={vi.fn()} />);
    expect(screen.getByLabelText('적정 훈련시간')).toBeInTheDocument();
    expect(screen.getByLabelText('훈련장소 사내')).toBeInTheDocument();
    expect(screen.getByLabelText('훈련장소 사외')).toBeInTheDocument();
    expect(screen.getByText('사내강사')).toBeInTheDocument();
    expect(screen.getByText('외부강사')).toBeInTheDocument();
    expect(screen.getByLabelText('AI 인프라')).toBeInTheDocument();
  });

  it('적정 훈련시간 편집 시 onChange 가 객체로 호출된다', () => {
    const onChange = vi.fn();
    render(<StepTrainingEnv value={emptyEnv()} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('적정 훈련시간'), {
      target: { value: '회차당 4시간' },
    });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ properTrainingHours: '회차당 4시간' }),
    );
  });

  it('사내강사 추가 버튼 클릭 시 행 1개가 추가된다', () => {
    const onChange = vi.fn();
    render(<StepTrainingEnv value={emptyEnv()} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('사내강사 행 추가'));
    const next = onChange.mock.calls[0][0] as PBLTrainingEnv;
    expect(next.internalInstructors).toHaveLength(1);
    expect(next.internalInstructors[0]).toEqual({
      position: '',
      name: '',
      career: '',
      personalTraits: '',
    });
  });

  it('readOnly 이면 입력 필드가 disabled 이다', () => {
    render(<StepTrainingEnv value={emptyEnv()} onChange={vi.fn()} readOnly />);
    expect(screen.getByLabelText('적정 훈련시간')).toBeDisabled();
    expect(screen.getByLabelText('AI 인프라')).toBeDisabled();
  });
});
