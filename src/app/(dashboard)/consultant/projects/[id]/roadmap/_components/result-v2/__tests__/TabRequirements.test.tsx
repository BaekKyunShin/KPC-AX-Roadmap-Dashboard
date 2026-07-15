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
      improvement: '편차 → 실시간 카메라 데이터로 Vision AI 검사 (필요도 높음)',
    },
    {
      domain: '생산관리',
      task: '공정 모니터링',
      asIs: '수작업 집계',
      improvement: '반영 지연 → PLC 로그로 실시간 모니터링',
    },
  ],
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
      <TabRequirements version={null} interview={interview} readOnly={false} onEdit={vi.fn()} />
    );
    expect(screen.getByText(/Ⅱ-1\. HRD이음 진단 보고서/)).toBeInTheDocument();
    expect(screen.getByText(/Ⅱ-2\. 기업 요구분석/)).toBeInTheDocument();
    expect(screen.getByText(/Ⅱ-3\. 과업·워크플로우 분석/)).toBeInTheDocument();
    // 양식 v2 — Ⅱ-4 명칭 "AI 적용 대상 과업(Task)·워크플로우 선정"
    expect(screen.getByText(/Ⅱ-4\. AI 적용 대상 과업\(Task\)·워크플로우 선정/)).toBeInTheDocument();
  });

  it('Ⅱ-1 HRD PDF 파일명 + iframe + 열기 링크 표시', () => {
    const { container } = render(
      <TabRequirements version={null} interview={interview} readOnly onEdit={vi.fn()} />
    );
    expect(screen.getByText('HRD이음_진단보고서.pdf')).toBeInTheDocument();
    const iframe = container.querySelector('iframe');
    expect(iframe).not.toBeNull();
    expect(iframe?.getAttribute('src')).toBe('https://example.com/hrd.pdf');
  });

  it('Ⅱ-2 기업 요구분석 4필드 값 표시', () => {
    render(<TabRequirements version={null} interview={interview} readOnly onEdit={vi.fn()} />);
    expect(screen.getByText('제조 공정 자동화 일부 진행 중')).toBeInTheDocument();
    expect(screen.getByText('품질 검사 편차 큼')).toBeInTheDocument();
    expect(screen.getByText('전사 AI 전환 드라이브')).toBeInTheDocument();
    expect(screen.getByText('불량률 30% 감소')).toBeInTheDocument();
  });

  it('Ⅱ-3 과업 분석 표 2행 + 개선점 + 첨부 파일 표시 (v2: 분석 메모 삭제)', () => {
    render(<TabRequirements version={null} interview={interview} readOnly onEdit={vi.fn()} />);
    expect(screen.getByText('품질관리')).toBeInTheDocument();
    expect(screen.getByText('생산관리')).toBeInTheDocument();
    expect(screen.getByText('외관 검사')).toBeInTheDocument();
    // v2: 개선점 및 AI 적용 가능성 (improvement) 컬럼
    expect(
      screen.getByText('편차 → 실시간 카메라 데이터로 Vision AI 검사 (필요도 높음)')
    ).toBeInTheDocument();
    // 분석 내용(메모) 섹션은 v2 에서 삭제됨
    expect(screen.queryByText('분석 내용')).not.toBeInTheDocument();
    expect(screen.getByText('분석노트.pdf')).toBeInTheDocument();
  });

  it('Ⅱ-4 AI 적용 대상 과업 4필드 값 표시', () => {
    render(<TabRequirements version={null} interview={interview} readOnly onEdit={vi.fn()} />);
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
      />
    );
    expect(screen.getByText(/HRD이음 진단 보고서 PDF 가 첨부되지 않았습니다/)).toBeInTheDocument();
    expect(container.querySelector('iframe')).toBeNull();
  });

  it('제외 라벨 3종 (결과물 표지 / 고정 참고자료 / 고정 양식·결과 화면 제외) 를 렌더하지 않음', () => {
    const { container } = render(
      <TabRequirements version={null} interview={interview} readOnly onEdit={vi.fn()} />
    );
    const text = container.textContent ?? '';
    expect(text).not.toContain('결과물 표지');
    expect(text).not.toContain('고정 참고자료');
    expect(text).not.toContain('고정 양식·결과 화면 제외');
  });

  // v2: Ⅱ-3 표는 4셀(직무·과업·현행·개선점) 모두 InlineEditField 로 편집 가능
  describe('Ⅱ-3 표 셀 편집 (v2 4열)', () => {
    it('readOnly=false 일 때 As-Is 셀이 InlineEditField 의 button role 로 렌더된다', () => {
      render(
        <TabRequirements version={null} interview={interview} readOnly={false} onEdit={vi.fn()} />
      );
      // InlineEditField 는 readOnly=false 일 때 role='button' 으로 렌더 (편집 트리거).
      // '육안 검사' 텍스트를 가진 button 요소가 존재해야 한다.
      const editTriggers = screen
        .getAllByRole('button')
        .filter((b) => b.textContent?.includes('육안 검사'));
      expect(editTriggers.length).toBeGreaterThan(0);
    });

    it('v2: 개선점 셀이 InlineEditField 로 렌더되고 AI 필요도 Select(combobox) 는 없다', () => {
      render(
        <TabRequirements version={null} interview={interview} readOnly={false} onEdit={vi.fn()} />
      );
      // 개선점 셀 편집 트리거 존재
      const improvementTriggers = screen
        .getAllByRole('button')
        .filter((b) => b.textContent?.includes('실시간 카메라 데이터로 Vision AI'));
      expect(improvementTriggers.length).toBeGreaterThan(0);
      // v2: AI 필요도 Select 는 삭제됨
      expect(screen.queryAllByRole('combobox')).toHaveLength(0);
    });

    it('Ⅱ-3 표 As-Is 편집 → onEdit 가 task_analysis 전체 배열 patch 로 호출된다', async () => {
      const user = (await import('@testing-library/user-event')).default.setup();
      const onEdit = vi.fn().mockResolvedValue(undefined);
      render(
        <TabRequirements version={null} interview={interview} readOnly={false} onEdit={onEdit} />
      );
      // 첫 행 As-Is '육안 검사' 셀 클릭 → 편집 모드 진입
      const trigger = screen
        .getAllByRole('button')
        .find((b) => b.textContent?.includes('육안 검사'));
      expect(trigger).toBeDefined();
      await user.click(trigger!);
      const editor = screen.getByRole('textbox');
      await user.clear(editor);
      await user.type(editor, '엑셀 매크로');
      await user.click(screen.getAllByRole('button', { name: '저장' })[0]);

      expect(onEdit).toHaveBeenCalledWith(
        expect.objectContaining({
          task_analysis: expect.arrayContaining([expect.objectContaining({ asIs: '엑셀 매크로' })]),
        })
      );
      // 다른 행은 보존
      const call = onEdit.mock.calls[0][0];
      expect(call.task_analysis).toHaveLength(2);
      expect(call.task_analysis[1].asIs).toBe('수작업 집계');
    });
  });
});
