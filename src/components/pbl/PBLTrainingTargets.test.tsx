import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PBLTrainingTargets } from './PBLTrainingTargets';

describe('PBLTrainingTargets', () => {
  it('요구분석/선정사유/세부내용 표를 렌더', () => {
    render(
      <PBLTrainingTargets
        trainingNeedsAnalysis="공정 데이터 분석 역량 부족"
        selectionReason="불량률 감소 최우선"
        details={[
          {
            id: '1',
            task_name: '데이터 수집',
            as_is: '엑셀 수작업',
            to_be: 'AI 자동 수집',
            required_knowledge: '공정 데이터',
            required_skill: 'Python',
          },
        ]}
      />,
    );
    expect(screen.getByText('공정 데이터 분석 역량 부족')).toBeInTheDocument();
    expect(screen.getByText('불량률 감소 최우선')).toBeInTheDocument();
    expect(screen.getByText('데이터 수집')).toBeInTheDocument();
    expect(screen.getByText('AI 자동 수집')).toBeInTheDocument();
  });

  it('details가 없으면 placeholder 메시지 표시', () => {
    render(
      <PBLTrainingTargets
        trainingNeedsAnalysis=""
        selectionReason=""
        details={[]}
      />,
    );
    expect(screen.getByText(/인터뷰에 세부내용이 없습니다/)).toBeInTheDocument();
  });
});
