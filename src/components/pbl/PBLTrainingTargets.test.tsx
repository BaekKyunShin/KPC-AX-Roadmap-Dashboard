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

  // =====================================================================
  // 추가: 내부 렌더링 경로 및 조건 분기 커버리지 확보
  // =====================================================================

  it('trainingNeedsAnalysis, selectionReason이 비어있으면 "-"를 표시한다', () => {
    render(
      <PBLTrainingTargets
        trainingNeedsAnalysis=""
        selectionReason=""
        details={[]}
      />,
    );
    // 빈 값은 '-'로 표시
    const dashes = screen.getAllByText('-');
    expect(dashes.length).toBeGreaterThanOrEqual(2);
  });

  it('여러 details 행이 각각 렌더링된다', () => {
    render(
      <PBLTrainingTargets
        trainingNeedsAnalysis="요구분석"
        selectionReason="선정사유"
        details={[
          {
            id: 'd1',
            task_name: '업무1',
            as_is: '현재1',
            to_be: '목표1',
            required_knowledge: '지식1',
            required_skill: '기술1',
          },
          {
            id: 'd2',
            task_name: '업무2',
            as_is: '현재2',
            to_be: '목표2',
            required_knowledge: '지식2',
            required_skill: '기술2',
          },
        ]}
      />,
    );
    expect(screen.getByText('업무1')).toBeInTheDocument();
    expect(screen.getByText('업무2')).toBeInTheDocument();
    expect(screen.getByText('현재1')).toBeInTheDocument();
    expect(screen.getByText('목표2')).toBeInTheDocument();
    expect(screen.getByText('지식1')).toBeInTheDocument();
    expect(screen.getByText('기술2')).toBeInTheDocument();
  });

  it('테이블 헤더 5개가 표시된다', () => {
    render(
      <PBLTrainingTargets
        trainingNeedsAnalysis="분석"
        selectionReason="사유"
        details={[]}
      />,
    );
    expect(screen.getByText('업무명')).toBeInTheDocument();
    expect(screen.getByText('As-Is')).toBeInTheDocument();
    expect(screen.getByText('To-Be')).toBeInTheDocument();
    expect(screen.getByText('요구 지식')).toBeInTheDocument();
    expect(screen.getByText('요구 기술')).toBeInTheDocument();
  });
});
