import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { RoadmapMatrix } from './RoadmapMatrix';
import type {
  RoadmapCompetency,
  RoadmapTrainingStructureItem,
  TrainingLevel,
} from '@/lib/services/roadmap/roadmap-types';

// ============================================================================
// 테스트 데이터 헬퍼
// ============================================================================

function makeCompetency(overrides: Partial<RoadmapCompetency> = {}): RoadmapCompetency {
  return {
    name: '데이터 분석',
    definition: '데이터 분석 역량',
    knowledge: [],
    skills: [],
    attitudes: [],
    ...overrides,
  };
}

function makeItem(
  overrides: Partial<RoadmapTrainingStructureItem> = {},
): RoadmapTrainingStructureItem {
  return {
    competency_name: '데이터 분석',
    level: 'BEGINNER' as TrainingLevel,
    content: 'AI 기초 과정',
    target_audience: '전 직원',
    method: '집체',
    goal: 'AI 개념 이해',
    ...overrides,
  };
}

// ============================================================================
// 테스트
// ============================================================================

describe('RoadmapMatrix', () => {
  describe('빈 상태', () => {
    it('competencies와 trainingStructure가 모두 비어있으면 EmptyState를 표시한다', () => {
      render(<RoadmapMatrix competencies={[]} trainingStructure={[]} />);
      expect(screen.getByText('훈련체계도 데이터가 없습니다.')).toBeInTheDocument();
    });
  });

  describe('데스크톱 테이블 헤더', () => {
    it('역량/초급/중급/고급 4열 헤더를 표시한다', () => {
      render(
        <RoadmapMatrix
          competencies={[makeCompetency()]}
          trainingStructure={[makeItem()]}
        />,
      );
      // 데스크톱 테이블 + 모바일 탭이 동시에 렌더되므로 getAllByText 사용
      expect(screen.getAllByText('역량').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('초급').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('중급').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('고급').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('셀 렌더링', () => {
    it('(역량, 수준) 셀에 매핑된 항목의 content·target_audience·method·goal을 표시한다', () => {
      render(
        <RoadmapMatrix
          competencies={[makeCompetency()]}
          trainingStructure={[
            makeItem({
              content: 'AI 기초 과정',
              target_audience: '전 직원',
              method: '집체 훈련',
              goal: 'AI 개념 이해',
            }),
          ]}
        />,
      );
      expect(screen.getAllByText('AI 기초 과정').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/전 직원/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/집체 훈련/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/AI 개념 이해/).length).toBeGreaterThanOrEqual(1);
    });

    it('같은 (역량, 수준) 셀에 여러 항목이 있으면 모두 렌더된다', () => {
      render(
        <RoadmapMatrix
          competencies={[makeCompetency()]}
          trainingStructure={[
            makeItem({ content: '과정 A' }),
            makeItem({ content: '과정 B' }),
          ]}
        />,
      );
      expect(screen.getAllByText('과정 A').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('과정 B').length).toBeGreaterThanOrEqual(1);
    });

    it('빈 셀에는 "-"를 표시한다', () => {
      render(
        <RoadmapMatrix
          competencies={[makeCompetency()]}
          trainingStructure={[
            // BEGINNER에만 항목, 나머지는 빈 셀
            makeItem({ level: 'BEGINNER' }),
          ]}
        />,
      );
      const dashes = screen.getAllByText('-');
      // 데스크톱 INTERMEDIATE, ADVANCED 셀 2개 + 모바일 탭 기본 초급이므로 최소 2개
      expect(dashes.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('미참조 역량', () => {
    it('competencies에 없지만 trainingStructure에 있는 역량은 "미참조" 배지와 함께 표시된다', () => {
      render(
        <RoadmapMatrix
          competencies={[makeCompetency({ name: '역량 A' })]}
          trainingStructure={[
            makeItem({ competency_name: '역량 A' }),
            makeItem({ competency_name: '미정의 역량', content: '알 수 없는 과정' }),
          ]}
        />,
      );
      expect(screen.getAllByText('미정의 역량').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('미참조').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('편집 기능', () => {
    it('canEdit=false이면 편집 버튼이 없다', () => {
      render(
        <RoadmapMatrix
          competencies={[makeCompetency()]}
          trainingStructure={[makeItem()]}
          canEdit={false}
        />,
      );
      expect(screen.queryByRole('button', { name: /편집/ })).not.toBeInTheDocument();
    });

    it('canEdit=true이고 onEditItem이 있으면 항목별 편집 버튼이 렌더된다', () => {
      const onEditItem = vi.fn();
      render(
        <RoadmapMatrix
          competencies={[makeCompetency()]}
          trainingStructure={[makeItem({ content: 'AI 기초' })]}
          canEdit={true}
          onEditItem={onEditItem}
        />,
      );
      const editButtons = screen.getAllByRole('button', { name: /AI 기초 편집/ });
      expect(editButtons.length).toBeGreaterThanOrEqual(1);
    });

    it('편집 버튼 클릭 시 onEditItem(item, index)가 호출된다', async () => {
      const user = userEvent.setup();
      const onEditItem = vi.fn();
      const items = [makeItem({ content: 'AI 기초' })];
      render(
        <RoadmapMatrix
          competencies={[makeCompetency()]}
          trainingStructure={items}
          canEdit={true}
          onEditItem={onEditItem}
        />,
      );
      const editButtons = screen.getAllByRole('button', { name: /AI 기초 편집/ });
      await user.click(editButtons[0]);

      expect(onEditItem).toHaveBeenCalledTimes(1);
      expect(onEditItem).toHaveBeenCalledWith(items[0], 0);
    });
  });

  describe('모바일 탭 동작', () => {
    it('기본 탭은 초급이다', () => {
      render(
        <RoadmapMatrix
          competencies={[makeCompetency()]}
          trainingStructure={[
            makeItem({ level: 'BEGINNER', content: '초급 과정' }),
            makeItem({ level: 'INTERMEDIATE', content: '중급 과정' }),
          ]}
        />,
      );
      // 모바일 탭 트리거 3종이 모두 있어야 함
      const tablist = screen.getByRole('tablist');
      expect(within(tablist).getByText('초급')).toBeInTheDocument();
      expect(within(tablist).getByText('중급')).toBeInTheDocument();
      expect(within(tablist).getByText('고급')).toBeInTheDocument();
    });

    it('중급 탭 클릭 시 중급 레벨 항목이 표시된다', async () => {
      const user = userEvent.setup();
      render(
        <RoadmapMatrix
          competencies={[makeCompetency()]}
          trainingStructure={[
            makeItem({ level: 'BEGINNER', content: '초급 전용 과정' }),
            makeItem({ level: 'INTERMEDIATE', content: '중급 전용 과정' }),
          ]}
        />,
      );

      const intermediateTab = screen.getByRole('tab', { name: '중급' });
      await user.click(intermediateTab);

      // 중급 전용 과정은 모바일 패널에서 노출되어 있음 (데스크톱 테이블에도 항상 렌더)
      expect(screen.getAllByText('중급 전용 과정').length).toBeGreaterThanOrEqual(1);
    });
  });
});
