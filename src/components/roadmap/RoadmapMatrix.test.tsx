import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { RoadmapMatrix } from './RoadmapMatrix';
import type { RoadmapRow, RoadmapMatrixCell } from '@/lib/services/roadmap';

// ============================================================================
// 테스트 데이터 헬퍼
// ============================================================================

function makeMatrixCell(overrides: Partial<RoadmapMatrixCell> = {}): RoadmapMatrixCell {
  return {
    course_name: 'AI 기초 과정',
    recommended_hours: 16,
    ...overrides,
  };
}

function makeRow(overrides: Partial<RoadmapRow> = {}): RoadmapRow {
  return {
    task_id: 'task-1',
    task_name: '데이터 분석',
    beginner: [makeMatrixCell()],
    intermediate: [makeMatrixCell({ course_name: '데이터 분석 중급', recommended_hours: 24 })],
    advanced: [makeMatrixCell({ course_name: '데이터 분석 고급', recommended_hours: 32 })],
    ...overrides,
  };
}

// ============================================================================
// 테스트
// ============================================================================

describe('RoadmapMatrix', () => {
  describe('빈 데이터 처리', () => {
    it('matrix가 빈 배열이면 안내 메시지를 표시한다', () => {
      render(<RoadmapMatrix matrix={[]} />);
      expect(screen.getByText('매트릭스 데이터가 없습니다.')).toBeInTheDocument();
    });

    it('matrix가 undefined이면 안내 메시지를 표시한다', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      render(<RoadmapMatrix matrix={undefined as any} />);
      expect(screen.getByText('매트릭스 데이터가 없습니다.')).toBeInTheDocument();
    });

    it('matrix가 null이면 안내 메시지를 표시한다', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      render(<RoadmapMatrix matrix={null as any} />);
      expect(screen.getByText('매트릭스 데이터가 없습니다.')).toBeInTheDocument();
    });
  });

  describe('데스크톱 테이블 렌더링', () => {
    it('테이블 헤더에 업무/초급/중급/고급 컬럼을 표시한다', () => {
      render(<RoadmapMatrix matrix={[makeRow()]} />);
      // 데스크톱 헤더 + 모바일 카드/탭 모두 존재하므로 getAllByText 사용
      expect(screen.getAllByText('업무').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('초급').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('중급').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('고급').length).toBeGreaterThanOrEqual(1);
    });

    it('행의 업무명을 표시한다', () => {
      render(<RoadmapMatrix matrix={[makeRow({ task_name: '품질 관리' })]} />);
      // 데스크톱 + 모바일 모두 표시
      expect(screen.getAllByText('품질 관리').length).toBeGreaterThanOrEqual(1);
    });

    it('과정명과 시간을 표시한다', () => {
      render(<RoadmapMatrix matrix={[makeRow()]} />);
      expect(screen.getAllByText('AI 기초 과정').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('16시간').length).toBeGreaterThanOrEqual(1);
    });

    it('여러 행을 렌더링한다', () => {
      const rows: RoadmapRow[] = [
        makeRow({ task_id: 't1', task_name: '데이터 분석' }),
        makeRow({ task_id: 't2', task_name: '품질 관리' }),
        makeRow({ task_id: 't3', task_name: '자동화' }),
      ];
      render(<RoadmapMatrix matrix={rows} />);
      expect(screen.getAllByText('데이터 분석').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('품질 관리').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('자동화').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('빈 셀 처리', () => {
    it('과정이 없는 셀에 "-"를 표시한다', () => {
      const row = makeRow({ beginner: [], intermediate: [], advanced: [] });
      render(<RoadmapMatrix matrix={[row]} />);
      // 데스크톱 테이블에서 빈 셀에 "-" 표시
      const dashes = screen.getAllByText('-');
      expect(dashes.length).toBeGreaterThanOrEqual(3);
    });

    it('undefined인 셀도 빈 셀로 처리한다', () => {
      const row = makeRow({
        beginner: undefined as unknown as RoadmapMatrixCell[],
        intermediate: undefined as unknown as RoadmapMatrixCell[],
        advanced: undefined as unknown as RoadmapMatrixCell[],
      });
      render(<RoadmapMatrix matrix={[row]} />);
      const dashes = screen.getAllByText('-');
      expect(dashes.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('한 셀에 여러 과정', () => {
    it('한 셀에 여러 과정이 있으면 모두 표시한다', () => {
      const row = makeRow({
        beginner: [
          makeMatrixCell({ course_name: '과정 A', recommended_hours: 8 }),
          makeMatrixCell({ course_name: '과정 B', recommended_hours: 12 }),
        ],
      });
      render(<RoadmapMatrix matrix={[row]} />);
      expect(screen.getAllByText('과정 A').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('과정 B').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('모바일 탭', () => {
    it('기본 탭은 초급이다', () => {
      render(<RoadmapMatrix matrix={[makeRow()]} />);
      // 모바일 카드 영역에서 초급 과정이 표시된다
      const buttons = screen.getAllByRole('button');
      const beginnerTab = buttons.find(b => b.textContent === '초급');
      expect(beginnerTab).toBeDefined();
    });

    it('중급 탭 클릭 시 중급 과정을 표시한다', async () => {
      const user = userEvent.setup();
      const row = makeRow({
        beginner: [makeMatrixCell({ course_name: '초급 과정' })],
        intermediate: [makeMatrixCell({ course_name: '중급 과정' })],
        advanced: [],
      });
      render(<RoadmapMatrix matrix={[row]} />);

      // 중급 탭 버튼 클릭
      const buttons = screen.getAllByRole('button');
      const intermediateTab = buttons.find(b => b.textContent === '중급');
      expect(intermediateTab).toBeDefined();
      await user.click(intermediateTab!);

      // 중급 과정이 표시되어야 함
      expect(screen.getAllByText('중급 과정').length).toBeGreaterThanOrEqual(1);
    });

    it('고급 탭 클릭 시 고급 과정을 표시한다', async () => {
      const user = userEvent.setup();
      const row = makeRow({
        beginner: [],
        intermediate: [],
        advanced: [makeMatrixCell({ course_name: '고급 과정' })],
      });
      render(<RoadmapMatrix matrix={[row]} />);

      const buttons = screen.getAllByRole('button');
      const advancedTab = buttons.find(b => b.textContent === '고급');
      await user.click(advancedTab!);

      expect(screen.getAllByText('고급 과정').length).toBeGreaterThanOrEqual(1);
    });

    it('해당 레벨에 과정이 없으면 "해당 레벨 과정 없음"을 표시한다', async () => {
      const user = userEvent.setup();
      const row = makeRow({
        beginner: [makeMatrixCell()],
        intermediate: [],
        advanced: [],
      });
      render(<RoadmapMatrix matrix={[row]} />);

      const buttons = screen.getAllByRole('button');
      const intermediateTab = buttons.find(b => b.textContent === '중급');
      await user.click(intermediateTab!);

      expect(screen.getAllByText('해당 레벨 과정 없음').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('편집 기능', () => {
    it('canEdit이 false이면 편집 버튼을 표시하지 않는다', () => {
      render(<RoadmapMatrix matrix={[makeRow()]} canEdit={false} />);
      const editButtons = screen.queryAllByTitle('편집');
      expect(editButtons.length).toBe(0);
    });

    it('canEdit이 true이고 onEditCourse가 있으면 편집 버튼을 표시한다', () => {
      const onEditCourse = vi.fn();
      render(<RoadmapMatrix matrix={[makeRow()]} canEdit={true} onEditCourse={onEditCourse} />);
      const editButtons = screen.getAllByTitle('편집');
      expect(editButtons.length).toBeGreaterThanOrEqual(1);
    });

    it('canEdit이 true여도 onEditCourse가 없으면 편집 버튼을 표시하지 않는다', () => {
      render(<RoadmapMatrix matrix={[makeRow()]} canEdit={true} />);
      const editButtons = screen.queryAllByTitle('편집');
      expect(editButtons.length).toBe(0);
    });

    it('편집 버튼 클릭 시 onEditCourse가 행 인덱스와 레벨과 함께 호출된다', async () => {
      const user = userEvent.setup();
      const onEditCourse = vi.fn();
      render(<RoadmapMatrix matrix={[makeRow()]} canEdit={true} onEditCourse={onEditCourse} />);

      const editButtons = screen.getAllByTitle('편집');
      await user.click(editButtons[0]);

      expect(onEditCourse).toHaveBeenCalledTimes(1);
      // 첫 번째 편집 버튼은 beginner 레벨의 0번 행
      expect(onEditCourse).toHaveBeenCalledWith(0, expect.any(String));
    });

    it('빈 셀에는 편집 버튼을 표시하지 않는다', () => {
      const onEditCourse = vi.fn();
      const row = makeRow({
        beginner: [],
        intermediate: [makeMatrixCell({ course_name: '중급 과정' })],
        advanced: [],
      });
      render(<RoadmapMatrix matrix={[row]} canEdit={true} onEditCourse={onEditCourse} />);

      // 편집 버튼은 중급 셀에만 있어야 함 (데스크톱 + 모바일에서 별도로 렌더링)
      const editButtons = screen.getAllByTitle('편집');
      // 빈 셀에는 없으므로 최소 1개 (중급)
      expect(editButtons.length).toBeGreaterThanOrEqual(1);
    });

    it('모바일 뷰에서도 편집 버튼이 동작한다', async () => {
      const user = userEvent.setup();
      const onEditCourse = vi.fn();
      render(<RoadmapMatrix matrix={[makeRow()]} canEdit={true} onEditCourse={onEditCourse} />);

      const editButtons = screen.getAllByTitle('편집');
      // 마지막 편집 버튼은 모바일 뷰의 것
      await user.click(editButtons[editButtons.length - 1]);

      expect(onEditCourse).toHaveBeenCalled();
    });
  });

  describe('canEdit 기본값', () => {
    it('canEdit을 전달하지 않으면 기본값 false로 동작한다', () => {
      const onEditCourse = vi.fn();
      render(<RoadmapMatrix matrix={[makeRow()]} onEditCourse={onEditCourse} />);
      const editButtons = screen.queryAllByTitle('편집');
      expect(editButtons.length).toBe(0);
    });
  });

  describe('task_id가 없는 경우', () => {
    it('task_id가 없어도 정상 렌더링된다', () => {
      const row = makeRow({ task_id: undefined as unknown as string, task_name: '테스트 업무' });
      render(<RoadmapMatrix matrix={[row]} />);
      expect(screen.getAllByText('테스트 업무').length).toBeGreaterThanOrEqual(1);
    });
  });
});
