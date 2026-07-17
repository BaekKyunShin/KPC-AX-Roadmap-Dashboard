import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { StepTarget } from '../StepTarget';
import type { PBLTarget } from '@/lib/schemas/interview-pbl';
import type { RoadmapTaskAnalysisItem } from '@/lib/schemas/interview-roadmap';

function baseTarget(): PBLTarget {
  return { taskSelections: [], necessity: '', details: [] };
}

function roadmapTasks(): RoadmapTaskAnalysisItem[] {
  return [
    { domain: '품질검사', task: '외관 검사', asIs: '육안 검사', improvement: 'AI 비전 도입' },
    { domain: '공정개선', task: '데이터 분석', asIs: '수기 집계', improvement: 'BI 자동화' },
  ];
}

describe('StepTarget (Ⅲ-3 훈련대상 업무 — 로드맵 과업 연동)', () => {
  it('Ⅲ-3 가·나·다 heading 이 모두 노출되고 AI역량(Ⅲ-4) 블록은 없다', () => {
    render(<StepTarget value={baseTarget()} onChange={vi.fn()} roadmapTasks={roadmapTasks()} />);
    expect(screen.getByText('Ⅲ-3-가 훈련대상 과업 선정')).toBeInTheDocument();
    expect(screen.getByText('Ⅲ-3-나 AI기반 문제해결 필요성 (선정 사유)')).toBeInTheDocument();
    expect(screen.getByText('Ⅲ-3-다 훈련대상 업무 세부내용')).toBeInTheDocument();
    // Ⅲ-4 AI역량 진단 제거
    expect(screen.queryByText('Ⅲ-4-가 현재 AI역량 수준')).toBeNull();
    expect(screen.queryByText('Ⅲ-4-나 예상 AI역량 수준')).toBeNull();
  });

  it('roadmapTasks 가 비면 안내 문구를 노출하고 과업 입력 행이 없다', () => {
    render(<StepTarget value={baseTarget()} onChange={vi.fn()} roadmapTasks={[]} />);
    expect(screen.getByText('선행 로드맵 과업이 연결되지 않았습니다.')).toBeInTheDocument();
    expect(screen.queryByLabelText('과업 1 AI 도입·활용 필요도')).toBeNull();
  });

  it('roadmapTasks 를 4열(직무/과업/현행/개선점) 읽기 전용으로 렌더한다', () => {
    render(<StepTarget value={baseTarget()} onChange={vi.fn()} roadmapTasks={roadmapTasks()} />);
    expect(screen.getByText('품질검사')).toBeInTheDocument();
    expect(screen.getByText('외관 검사')).toBeInTheDocument();
    expect(screen.getByText('육안 검사')).toBeInTheDocument();
    expect(screen.getByText('AI 비전 도입')).toBeInTheDocument();
    expect(screen.getByText('공정개선')).toBeInTheDocument();
  });

  it('과업 행마다 ai_necessity(text) · training_selected(checkbox) 입력이 렌더된다', () => {
    render(<StepTarget value={baseTarget()} onChange={vi.fn()} roadmapTasks={roadmapTasks()} />);
    expect(screen.getByLabelText('과업 1 AI 도입·활용 필요도')).toBeInTheDocument();
    expect(screen.getByLabelText('과업 2 AI 도입·활용 필요도')).toBeInTheDocument();
    const cb = screen.getByLabelText('과업 1 훈련 선정') as HTMLInputElement;
    expect(cb.type).toBe('checkbox');
  });

  it('ai_necessity 편집 시 taskSelections 가 roadmapTasks 와 1:1 정렬로 갱신된다', () => {
    const onChange = vi.fn();
    render(<StepTarget value={baseTarget()} onChange={onChange} roadmapTasks={roadmapTasks()} />);
    fireEvent.change(screen.getByLabelText('과업 1 AI 도입·활용 필요도'), {
      target: { value: '높음 — 전원 공통 수행' },
    });
    const next = onChange.mock.calls[0][0] as PBLTarget;
    // 로드맵 과업 2개 → taskSelections 길이 2 로 정렬
    expect(next.taskSelections).toHaveLength(2);
    expect(next.taskSelections[0].ai_necessity).toBe('높음 — 전원 공통 수행');
    expect(next.taskSelections[0].training_selected).toBe(false);
    expect(next.taskSelections[1]).toEqual({ ai_necessity: '', training_selected: false });
  });

  it('training_selected 체크 시 해당 index 만 true 로 갱신된다', () => {
    const onChange = vi.fn();
    render(<StepTarget value={baseTarget()} onChange={onChange} roadmapTasks={roadmapTasks()} />);
    fireEvent.click(screen.getByLabelText('과업 2 훈련 선정'));
    const next = onChange.mock.calls[0][0] as PBLTarget;
    expect(next.taskSelections[1].training_selected).toBe(true);
    expect(next.taskSelections[0].training_selected).toBe(false);
  });

  it('기존 taskSelections 값이 입력란에 반영된다', () => {
    const value: PBLTarget = {
      taskSelections: [
        { ai_necessity: '중간', training_selected: true },
        { ai_necessity: '낮음', training_selected: false },
      ],
      necessity: '',
      details: [],
    };
    render(<StepTarget value={value} onChange={vi.fn()} roadmapTasks={roadmapTasks()} />);
    expect(screen.getByLabelText('과업 1 AI 도입·활용 필요도')).toHaveValue('중간');
    expect(screen.getByLabelText('과업 1 훈련 선정')).toBeChecked();
    expect(screen.getByLabelText('과업 2 훈련 선정')).not.toBeChecked();
  });

  it('선정 사유(necessity) 편집이 onChange.necessity 에 반영된다', () => {
    const onChange = vi.fn();
    render(<StepTarget value={baseTarget()} onChange={onChange} roadmapTasks={roadmapTasks()} />);
    fireEvent.change(screen.getByLabelText('훈련대상 업무 선정 사유'), {
      target: { value: 'AI 자동화로 개선 효과 최대' },
    });
    const next = onChange.mock.calls[0][0] as PBLTarget;
    expect(next.necessity).toBe('AI 자동화로 개선 효과 최대');
  });

  it('세부내용 업무명 편집이 onChange.details[0].title 에 반영된다', () => {
    const onChange = vi.fn();
    render(<StepTarget value={baseTarget()} onChange={onChange} roadmapTasks={roadmapTasks()} />);
    fireEvent.change(screen.getByLabelText('세부내용 1 업무명'), {
      target: { value: '데이터 전처리' },
    });
    const next = onChange.mock.calls[0][0] as PBLTarget;
    expect(next.details[0].title).toBe('데이터 전처리');
  });

  it('세부내용 행 추가 클릭 시 details 배열이 확장된다', () => {
    const onChange = vi.fn();
    render(<StepTarget value={baseTarget()} onChange={onChange} roadmapTasks={roadmapTasks()} />);
    fireEvent.click(screen.getByLabelText('세부내용 행 추가'));
    const next = onChange.mock.calls[0][0] as PBLTarget;
    expect(next.details.length).toBeGreaterThanOrEqual(2);
  });

  it('roadmapTasks 기본값([]) — prop 미지정 시에도 안전하게 안내를 노출한다', () => {
    render(<StepTarget value={baseTarget()} onChange={vi.fn()} />);
    expect(screen.getByText('선행 로드맵 과업이 연결되지 않았습니다.')).toBeInTheDocument();
  });
});
