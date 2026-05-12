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
    targetCharacteristics: { career: '', level: '' },
    aiInfraDetail: { toolCapacity: 'AVAILABLE' as const, networkStatus: 'GOOD' as const, pcCount: 0 },
    trainingNeedsAnalysis: '',
    expectationAsIs: '',
    expectationToBe: '',
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

  // R8 분기 cover
  it('value undefined 시 빈 객체로 fallback (ensureValue 분기)', () => {
    render(
      <StepTrainingEnv
        value={undefined as unknown as PBLTrainingEnv}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByLabelText('적정 훈련시간')).toBeInTheDocument();
  });

  it('사내강사 추가 후 4 필드 (직위/이름/경력/특성) 편집 가능', () => {
    const onChange = vi.fn();
    const initial: PBLTrainingEnv = {
      ...emptyEnv(),
      internalInstructors: [
        { position: '', name: '', career: '', personalTraits: '' },
      ],
    };
    render(<StepTrainingEnv value={initial} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('사내강사 1 직위'), { target: { value: '팀장' } });
    fireEvent.change(screen.getByLabelText('사내강사 1 이름'), { target: { value: '홍길동' } });
    fireEvent.change(screen.getByLabelText('사내강사 1 직무경력'), { target: { value: '12년' } });
    fireEvent.change(screen.getByLabelText('사내강사 1 인적특성'), { target: { value: '데이터 친화' } });
    const calls = onChange.mock.calls;
    expect((calls[0][0] as PBLTrainingEnv).internalInstructors[0].position).toBe('팀장');
    expect((calls[1][0] as PBLTrainingEnv).internalInstructors[0].name).toBe('홍길동');
    expect((calls[2][0] as PBLTrainingEnv).internalInstructors[0].career).toBe('12년');
    expect((calls[3][0] as PBLTrainingEnv).internalInstructors[0].personalTraits).toBe('데이터 친화');
  });

  it('외부강사 추가 + 삭제 분기 cover', () => {
    const onChange = vi.fn();
    const initial: PBLTrainingEnv = {
      ...emptyEnv(),
      externalInstructors: [
        { position: '', name: '', career: '', personalTraits: '' },
      ],
    };
    render(<StepTrainingEnv value={initial} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText('외부강사 1 삭제'));
    const next = onChange.mock.calls[0][0] as PBLTrainingEnv;
    expect(next.externalInstructors).toHaveLength(0);
  });

  it('사내강사 max(5) 도달 시 추가 버튼 disabled (분기 cover)', () => {
    const filled: PBLTrainingEnv = {
      ...emptyEnv(),
      internalInstructors: Array.from({ length: 5 }, () => ({
        position: '',
        name: '',
        career: '',
        personalTraits: '',
      })),
    };
    render(<StepTrainingEnv value={filled} onChange={vi.fn()} />);
    expect(screen.getByLabelText('사내강사 행 추가')).toBeDisabled();
  });

  it('사내장소·사외장소·AI인프라 편집 onChange 분기 cover', () => {
    const onChange = vi.fn();
    render(<StepTrainingEnv value={emptyEnv()} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('훈련장소 사내'), { target: { value: '본사 3층' } });
    fireEvent.change(screen.getByLabelText('훈련장소 사외'), { target: { value: '외부센터' } });
    fireEvent.change(screen.getByLabelText('AI 인프라'), { target: { value: 'PC 30대' } });
    const calls = onChange.mock.calls;
    expect((calls[0][0] as PBLTrainingEnv).internalPlace).toBe('본사 3층');
    expect((calls[1][0] as PBLTrainingEnv).externalPlace).toBe('외부센터');
    expect((calls[2][0] as PBLTrainingEnv).aiInfrastructure).toBe('PC 30대');
  });
});
