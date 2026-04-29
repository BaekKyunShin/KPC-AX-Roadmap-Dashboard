import { describe, it, expect, vi } from 'vitest';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';

import { TabOverview } from '../TabOverview';
import type { ResultInterviewSnapshot } from '../types';

const interview: Partial<ResultInterviewSnapshot> = {
  establishmentNecessity: '제조업 AI 전환을 위한 훈련 수립이 필요합니다.',
  performanceActivities: [
    {
      round: 1,
      date: '26.01.15',
      timeRange: '10:00~12:00',
      content: '경영진 인터뷰',
      method: 'ONSITE',
      pmName: '김컨설',
      expertName: '박팀장',
    },
    {
      round: 2,
      date: '26.01.22',
      timeRange: '14:00~16:00',
      content: '워크숍',
      method: 'WORKSHOP',
      pmName: '김컨설',
      expertName: '박팀장',
    },
  ],
  aiLevel: 'INTERMEDIATE',
  selectedTask: '품질 검사 워크플로우 AI 도입',
};

describe('TabOverview (Ⅰ. 개요)', () => {
  it('섹션 3개 — Ⅰ-1 · Ⅰ-2 · Ⅰ-3 — 모두 렌더', () => {
    render(
      <TabOverview
        version={null}
        interview={interview}
        readOnly={false}
        onEdit={vi.fn()}
      />,
    );
    expect(screen.getByText(/Ⅰ-1\. 수립 필요성/)).toBeInTheDocument();
    expect(screen.getByText(/Ⅰ-2\. 주요 활동/)).toBeInTheDocument();
    expect(screen.getByText(/Ⅰ-3\. 수립 주요 결과/)).toBeInTheDocument();
  });

  it('Ⅰ-1 수립 필요성 값을 표시', () => {
    render(
      <TabOverview
        version={null}
        interview={interview}
        readOnly
        onEdit={vi.fn()}
      />,
    );
    expect(
      screen.getByText(/제조업 AI 전환을 위한 훈련 수립이 필요합니다/),
    ).toBeInTheDocument();
  });

  it('Ⅰ-2 주요 활동 2차수 행을 표시', () => {
    render(
      <TabOverview
        version={null}
        interview={interview}
        readOnly
        onEdit={vi.fn()}
      />,
    );
    expect(screen.getByText('1차')).toBeInTheDocument();
    expect(screen.getByText('2차')).toBeInTheDocument();
    expect(screen.getByText('경영진 인터뷰')).toBeInTheDocument();
    expect(screen.getByText('워크숍')).toBeInTheDocument();
  });

  it('Ⅰ-3 AI 역량 수준 라벨 + 선정 과업 표시', () => {
    render(
      <TabOverview
        version={null}
        interview={interview}
        readOnly
        onEdit={vi.fn()}
      />,
    );
    expect(screen.getByText('중급')).toBeInTheDocument();
    expect(screen.getByText('(AI탐구형)')).toBeInTheDocument();
    expect(
      screen.getByText('품질 검사 워크플로우 AI 도입'),
    ).toBeInTheDocument();
  });

  it('DRAFT (readOnly=false) 에서 Ⅰ-1 InlineEditField 편집 가능', () => {
    const onEdit = vi.fn().mockResolvedValue(undefined);
    render(
      <TabOverview
        version={null}
        interview={interview}
        readOnly={false}
        onEdit={onEdit}
      />,
    );
    // 편집 활성화: 값을 클릭하면 textarea 로 진입. 여기서는 role=button 으로 판정.
    const buttons = screen.getAllByRole('button');
    // InlineEditField 의 view 모드 wrapper 가 role="button" 이 되어야 함
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('FINAL (readOnly=true) 에서 InlineEditField 가 role=button 없음 — 편집 금지', () => {
    render(
      <TabOverview
        version={null}
        interview={interview}
        readOnly
        onEdit={vi.fn()}
      />,
    );
    // readOnly 이면 InlineEditField 는 role 을 부여하지 않는다.
    // 즉 수립 필요성 값이 role="button" 이 아니어야 한다.
    const necessity = screen.getByText(
      /제조업 AI 전환을 위한 훈련 수립이 필요합니다/,
    );
    expect(necessity.closest('[role="button"]')).toBeNull();
  });

  it('제외 라벨 3종 (결과물 표지 / 고정 참고자료 / 고정 양식·결과 화면 제외) 를 렌더하지 않음', () => {
    const { container } = render(
      <TabOverview
        version={null}
        interview={interview}
        readOnly
        onEdit={vi.fn()}
      />,
    );
    const text = container.textContent ?? '';
    expect(text).not.toContain('결과물 표지');
    expect(text).not.toContain('고정 참고자료');
    expect(text).not.toContain('AI역량 수준별 훈련내용 예시');
    expect(text).not.toContain('고정 양식·결과 화면 제외');
  });

  it('활동이 없을 때 안내 메시지 표시', () => {
    render(
      <TabOverview
        version={null}
        interview={{ ...interview, performanceActivities: [] }}
        readOnly
        onEdit={vi.fn()}
      />,
    );
    expect(
      screen.getByText(/등록된 주요 활동이 없습니다/),
    ).toBeInTheDocument();
  });

  // R2 #14 — Ⅰ-3 양식 정합 표 형태 (3행) 회귀 차단
  it('Ⅰ-3 수립 주요 결과가 3행 표(table)로 렌더된다', () => {
    const { container } = render(
      <TabOverview
        version={null}
        interview={interview}
        readOnly
        onEdit={vi.fn()}
      />,
    );
    // Ⅰ-3 SectionCard 안의 caption "수립 주요 결과" 가 sr-only 로 존재
    const captions = container.querySelectorAll('caption');
    const i3Caption = Array.from(captions).find(
      (c) => c.textContent === '수립 주요 결과',
    );
    expect(i3Caption).toBeDefined();
    // 같은 table 의 행 라벨 (헤더 셀) 3종 모두 노출
    expect(screen.getByText('기업 AI 역량 수준')).toBeInTheDocument();
    expect(screen.getByText('선정 과업')).toBeInTheDocument();
    expect(
      screen.getByText('AI훈련로드맵 수립 주요내용 (요약)'),
    ).toBeInTheDocument();
  });

  // R2 #14 — main_content 셀의 InlineEditField 편집 기능 보존
  it('Ⅰ-3 표의 요약 셀에서 main_content InlineEditField 편집이 readOnly=false 시 가능', async () => {
    const onEdit = vi.fn().mockResolvedValue(undefined);
    render(
      <TabOverview
        version={
          {
            id: 'v1',
            outcome_summary: {
              ai_competency_level: 'INTERMEDIATE',
              selected_tasks: '품질 검사 워크플로우',
              main_content: '기존 요약',
            },
          } as never
        }
        interview={interview}
        readOnly={false}
        onEdit={onEdit}
      />,
    );
    const summary = screen.getByText('기존 요약');
    const trigger = summary.closest('[role="button"]');
    expect(trigger).not.toBeNull();
    await act(async () => {
      fireEvent.click(trigger as HTMLElement);
    });
    const textareas = screen.getAllByRole('textbox');
    const summaryTextarea = textareas.find(
      (t) => (t as HTMLTextAreaElement).value === '기존 요약',
    );
    expect(summaryTextarea).toBeDefined();
    await act(async () => {
      fireEvent.change(summaryTextarea as HTMLElement, {
        target: { value: '수정된 요약' },
      });
      fireEvent.keyDown(summaryTextarea as HTMLElement, {
        key: 'Enter',
        ctrlKey: true,
      });
    });
    await waitFor(() =>
      expect(onEdit).toHaveBeenCalledWith({ main_content: '수정된 요약' }),
    );
  });

  it('Ⅰ-1 편집 후 onEdit 가 setup_necessity patch 로 호출된다', async () => {
    const onEdit = vi.fn().mockResolvedValue(undefined);
    render(
      <TabOverview
        version={null}
        interview={interview}
        readOnly={false}
        onEdit={onEdit}
      />,
    );
    // 수립 필요성 value 클릭 → 편집 모드 진입
    const necessityView = screen.getByText(
      /제조업 AI 전환을 위한 훈련 수립이 필요합니다/,
    );
    const trigger = necessityView.closest('[role="button"]');
    expect(trigger).not.toBeNull();
    await act(async () => {
      fireEvent.click(trigger as HTMLElement);
    });
    // textarea 로 전환됨 — value 변경 후 Ctrl+Enter 로 저장
    const textareas = screen.getAllByRole('textbox');
    expect(textareas.length).toBeGreaterThan(0);
    await act(async () => {
      fireEvent.change(textareas[0], { target: { value: '수정된 필요성' } });
      fireEvent.keyDown(textareas[0], { key: 'Enter', ctrlKey: true });
    });
    await waitFor(() =>
      expect(onEdit).toHaveBeenCalledWith({ setup_necessity: '수정된 필요성' }),
    );
  });
});
