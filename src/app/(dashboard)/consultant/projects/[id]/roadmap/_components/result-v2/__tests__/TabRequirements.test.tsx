import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import { TabRequirements } from '../TabRequirements';
import type { ResultInterviewSnapshot } from '../types';

const interview: Partial<ResultInterviewSnapshot> = {
  hrdReportPdf: {
    fileName: 'HRD이음_진단보고서.pdf',
    url: 'https://example.com/hrd.pdf',
    size: 1024 * 512,
  },
  companyRequirements: {
    status: '제조 공정 자동화 일부 진행 중',
    problem: '품질 검사 편차 큼',
    will: '전사 AI 전환 드라이브',
    outcomes: '불량률 30% 감소',
  },
  taskAnalysis: [
    {
      domain: '품질관리',
      task: '외관 검사',
      asIs: '육안 검사',
      problem: '편차',
      dataTiming: '실시간 카메라',
      aiScore: 5,
    },
    {
      domain: '생산관리',
      task: '공정 모니터링',
      asIs: '수작업 집계',
      problem: '반영 지연',
      dataTiming: 'PLC 로그',
      aiScore: 4,
    },
  ],
  taskAnalysisNote: '핵심 과업 2건 병목 확인',
  taskAnalysisAttachment: {
    fileName: '분석노트.pdf',
    url: 'https://example.com/note.pdf',
  },
  targetTask: {
    name: '품질 검사 자동화',
    reason: '가장 큰 불량 원인',
    expectedAsIs: '수작업 3인 2시간',
    expectedToBe: '자동 검사 10분',
  },
};

describe('TabRequirements (Ⅱ. 요구분석)', () => {
  it('섹션 4개 — Ⅱ-1 · Ⅱ-2 · Ⅱ-3 · Ⅱ-4 — 모두 렌더', () => {
    render(
      <TabRequirements
        version={null}
        interview={interview}
        readOnly={false}
        onEdit={vi.fn()}
      />,
    );
    expect(screen.getByText(/Ⅱ-1\. HRD이음 진단 보고서/)).toBeInTheDocument();
    expect(screen.getByText(/Ⅱ-2\. 기업 요구분석/)).toBeInTheDocument();
    expect(screen.getByText(/Ⅱ-3\. 과업·워크플로우 분석/)).toBeInTheDocument();
    // R3 #12 — 양식 정확 명칭 "훈련대상 과업(Task)·워크플로우 선정"
    expect(
      screen.getByText(/Ⅱ-4\. 훈련대상 과업\(Task\)·워크플로우 선정/),
    ).toBeInTheDocument();
  });

  it('Ⅱ-1 HRD PDF 파일명 + iframe + 열기 링크 표시', () => {
    const { container } = render(
      <TabRequirements
        version={null}
        interview={interview}
        readOnly
        onEdit={vi.fn()}
      />,
    );
    expect(screen.getByText('HRD이음_진단보고서.pdf')).toBeInTheDocument();
    const iframe = container.querySelector('iframe');
    expect(iframe).not.toBeNull();
    expect(iframe?.getAttribute('src')).toBe('https://example.com/hrd.pdf');
  });

  it('Ⅱ-2 기업 요구분석 4필드 값 표시', () => {
    render(
      <TabRequirements
        version={null}
        interview={interview}
        readOnly
        onEdit={vi.fn()}
      />,
    );
    expect(
      screen.getByText('제조 공정 자동화 일부 진행 중'),
    ).toBeInTheDocument();
    expect(screen.getByText('품질 검사 편차 큼')).toBeInTheDocument();
    expect(screen.getByText('전사 AI 전환 드라이브')).toBeInTheDocument();
    expect(screen.getByText('불량률 30% 감소')).toBeInTheDocument();
  });

  it('Ⅱ-3 과업 분석 표 2행 + 분석 메모 + 첨부 파일 표시', () => {
    render(
      <TabRequirements
        version={null}
        interview={interview}
        readOnly
        onEdit={vi.fn()}
      />,
    );
    expect(screen.getByText('품질관리')).toBeInTheDocument();
    expect(screen.getByText('생산관리')).toBeInTheDocument();
    expect(screen.getByText('외관 검사')).toBeInTheDocument();
    expect(screen.getByText('핵심 과업 2건 병목 확인')).toBeInTheDocument();
    expect(screen.getByText('분석노트.pdf')).toBeInTheDocument();
  });

  it('Ⅱ-4 훈련대상 과업 4필드 값 표시', () => {
    render(
      <TabRequirements
        version={null}
        interview={interview}
        readOnly
        onEdit={vi.fn()}
      />,
    );
    expect(screen.getByText('품질 검사 자동화')).toBeInTheDocument();
    expect(screen.getByText('가장 큰 불량 원인')).toBeInTheDocument();
    expect(screen.getByText('수작업 3인 2시간')).toBeInTheDocument();
    expect(screen.getByText('자동 검사 10분')).toBeInTheDocument();
  });

  it('HRD PDF 가 null 이면 안내 메시지 표시 + iframe 없음', () => {
    const { container } = render(
      <TabRequirements
        version={null}
        interview={{ ...interview, hrdReportPdf: null }}
        readOnly
        onEdit={vi.fn()}
      />,
    );
    expect(
      screen.getByText(/HRD이음 진단 보고서 PDF 가 첨부되지 않았습니다/),
    ).toBeInTheDocument();
    expect(container.querySelector('iframe')).toBeNull();
  });

  it('제외 라벨 3종 (결과물 표지 / 고정 참고자료 / 고정 양식·결과 화면 제외) 를 렌더하지 않음', () => {
    const { container } = render(
      <TabRequirements
        version={null}
        interview={interview}
        readOnly
        onEdit={vi.fn()}
      />,
    );
    const text = container.textContent ?? '';
    expect(text).not.toContain('결과물 표지');
    expect(text).not.toContain('고정 참고자료');
    expect(text).not.toContain('고정 양식·결과 화면 제외');
  });

  // #2 (사용자 보고): Ⅱ-3 표 6셀 모두 편집 가능
  describe('Ⅱ-3 표 셀 편집 (#2)', () => {
    it('readOnly=false 일 때 As-Is 셀이 InlineEditField 의 button role 로 렌더된다', () => {
      render(
        <TabRequirements
          version={null}
          interview={interview}
          readOnly={false}
          onEdit={vi.fn()}
        />,
      );
      // InlineEditField 는 readOnly=false 일 때 role='button' 으로 렌더 (편집 트리거).
      // '육안 검사' 텍스트를 가진 button 요소가 존재해야 한다.
      const editTriggers = screen.getAllByRole('button').filter((b) =>
        b.textContent?.includes('육안 검사'),
      );
      expect(editTriggers.length).toBeGreaterThan(0);
    });

    it('readOnly=false 일 때 AI 필요도 셀이 Select(combobox) 로 렌더된다', () => {
      render(
        <TabRequirements
          version={null}
          interview={interview}
          readOnly={false}
          onEdit={vi.fn()}
        />,
      );
      // shadcn Select 는 role='combobox' 의 trigger button 으로 렌더된다.
      const aiSelects = screen.getAllByRole('combobox').filter((c) =>
        /AI 필요도/.test(c.getAttribute('aria-label') ?? ''),
      );
      expect(aiSelects.length).toBe(2); // taskAnalysis 2행
    });

    it('readOnly=true 일 때 AI 필요도가 단순 텍스트로 렌더된다 (Select 미노출)', () => {
      render(
        <TabRequirements
          version={null}
          interview={interview}
          readOnly
          onEdit={vi.fn()}
        />,
      );
      const aiSelects = screen.queryAllByRole('combobox').filter((c) =>
        /AI 필요도/.test(c.getAttribute('aria-label') ?? ''),
      );
      expect(aiSelects).toHaveLength(0);
    });

    it('Ⅱ-3 표 As-Is 편집 → onEdit 가 task_analysis 전체 배열 patch 로 호출된다', async () => {
      const user = (await import('@testing-library/user-event')).default.setup();
      const onEdit = vi.fn().mockResolvedValue(undefined);
      render(
        <TabRequirements
          version={null}
          interview={interview}
          readOnly={false}
          onEdit={onEdit}
        />,
      );
      // 첫 행 As-Is '육안 검사' 셀 클릭 → 편집 모드 진입
      const trigger = screen.getAllByRole('button').find((b) =>
        b.textContent?.includes('육안 검사'),
      );
      expect(trigger).toBeDefined();
      await user.click(trigger!);
      const editor = screen.getByRole('textbox');
      await user.clear(editor);
      await user.type(editor, '엑셀 매크로');
      await user.click(screen.getAllByRole('button', { name: '저장' })[0]);

      expect(onEdit).toHaveBeenCalledWith(
        expect.objectContaining({
          task_analysis: expect.arrayContaining([
            expect.objectContaining({ asIs: '엑셀 매크로' }),
          ]),
        }),
      );
      // 다른 행은 보존
      const call = onEdit.mock.calls[0][0];
      expect(call.task_analysis).toHaveLength(2);
      expect(call.task_analysis[1].asIs).toBe('수작업 집계');
    });
  });
});
