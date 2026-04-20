import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { RoadmapOverviewSummary } from './RoadmapOverviewSummary';

describe('RoadmapOverviewSummary', () => {
  it('필드가 모두 비었으면 렌더되지 않음', () => {
    const { container } = render(
      <RoadmapOverviewSummary
        setupNecessity=""
        outcomeSummary={{ ai_competency_level: 'BEGINNER', selected_tasks: '', main_content: '' }}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('모든 필드 세로 stack (grid-cols-2 미사용)', () => {
    const { container } = render(
      <RoadmapOverviewSummary
        setupNecessity="필요성"
        outcomeSummary={{
          ai_competency_level: 'INTERMEDIATE',
          selected_tasks: '과업',
          main_content: '주요내용',
        }}
      />,
    );
    const dl = container.querySelector('dl');
    expect(dl).toBeInTheDocument();
    expect(dl?.className ?? '').not.toMatch(/grid-cols-2|md:grid-cols-2/);
  });

  it('AI 역량 수준 뱃지가 중급 + AI탐구형', () => {
    render(
      <RoadmapOverviewSummary
        setupNecessity="x"
        outcomeSummary={{ ai_competency_level: 'INTERMEDIATE', selected_tasks: '', main_content: '' }}
      />,
    );
    expect(screen.getByText(/중급/)).toBeInTheDocument();
    expect(screen.getByText(/AI탐구형/)).toBeInTheDocument();
  });

  it('3개 라벨·값을 모두 표시', () => {
    render(
      <RoadmapOverviewSummary
        setupNecessity="필요성 내용"
        outcomeSummary={{
          ai_competency_level: 'BEGINNER',
          selected_tasks: '선정 과업 내용',
          main_content: '수립 주요내용 내용',
        }}
      />,
    );
    expect(screen.getByText('필요성 내용')).toBeInTheDocument();
    expect(screen.getByText('선정 과업 내용')).toBeInTheDocument();
    expect(screen.getByText('수립 주요내용 내용')).toBeInTheDocument();
    // 라벨(dt)은 exact match로 확인 — 값 텍스트와 겹치지 않도록
    expect(screen.getByText('수립 필요성')).toBeInTheDocument();
    expect(screen.getByText('선정 과업')).toBeInTheDocument();
    expect(screen.getByText('수립 주요내용 요약')).toBeInTheDocument();
  });

  it('setupNecessity만 있고 selected_tasks가 공백이면 렌더된다', () => {
    // binary-expr: selected_tasks && selected_tasks.trim() !== '' → false 분기 커버 (id 1 index 3)
    const { container } = render(
      <RoadmapOverviewSummary
        setupNecessity="필요성 존재"
        outcomeSummary={{
          ai_competency_level: 'BEGINNER',
          selected_tasks: '   ', // 공백 → trim()이 '' → false
          main_content: '',
        }}
      />,
    );
    // setupNecessity가 있으므로 hasAny=true → 렌더됨
    expect(container.firstChild).not.toBeNull();
  });

  it('main_content만 있고 setupNecessity/selected_tasks가 빈 문자열이면 렌더된다', () => {
    // binary-expr: main_content && main_content.trim() !== '' → true 분기 + selected_tasks false 분기 커버 (id 1 index 5)
    const { container } = render(
      <RoadmapOverviewSummary
        setupNecessity=""
        outcomeSummary={{
          ai_competency_level: 'BEGINNER',
          selected_tasks: '',
          main_content: '주요 내용 존재',
        }}
      />,
    );
    expect(container.firstChild).not.toBeNull();
  });
});
