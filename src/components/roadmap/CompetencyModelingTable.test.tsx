import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { CompetencyModelingTable } from './CompetencyModelingTable';
import type { RoadmapCompetency } from '@/lib/services/roadmap/roadmap-types';

// ============================================================================
// 테스트 데이터 헬퍼
// ============================================================================

function makeCompetency(overrides: Partial<RoadmapCompetency> = {}): RoadmapCompetency {
  return {
    name: '데이터 분석 역량',
    definition: '데이터를 수집·분석하여 의사결정을 지원하는 역량',
    knowledge: ['통계 기초', 'SQL'],
    skills: ['Excel 활용', 'BI 도구 활용'],
    attitudes: ['데이터 기반 사고'],
    ...overrides,
  };
}

// ============================================================================
// 테스트
// ============================================================================

describe('CompetencyModelingTable', () => {
  describe('빈 상태', () => {
    it('competencies가 빈 배열이고 canEdit=false이면 EmptyState를 표시한다', () => {
      render(<CompetencyModelingTable competencies={[]} />);
      expect(screen.getByText('역량 모델링 정보가 없습니다.')).toBeInTheDocument();
    });

    it('competencies가 빈 배열이어도 canEdit=true이면 추가 버튼을 표시한다', () => {
      render(
        <CompetencyModelingTable competencies={[]} canEdit={true} onChange={vi.fn()} />,
      );
      expect(screen.getByRole('button', { name: /역량 추가/ })).toBeInTheDocument();
    });
  });

  describe('읽기 전용 모드', () => {
    it('역량명·정의·지식·기술·태도를 표시한다', () => {
      render(<CompetencyModelingTable competencies={[makeCompetency()]} />);
      expect(screen.getAllByText('데이터 분석 역량').length).toBeGreaterThanOrEqual(1);
      expect(
        screen.getAllByText('데이터를 수집·분석하여 의사결정을 지원하는 역량').length,
      ).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('통계 기초').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('SQL').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('Excel 활용').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('데이터 기반 사고').length).toBeGreaterThanOrEqual(1);
    });

    it('canEdit=false면 입력 필드가 없다', () => {
      render(<CompetencyModelingTable competencies={[makeCompetency()]} />);
      expect(screen.queryByRole('textbox', { name: /역량명/ })).not.toBeInTheDocument();
    });

    it('canEdit=false면 삭제 버튼이 없다', () => {
      render(<CompetencyModelingTable competencies={[makeCompetency()]} />);
      expect(screen.queryByRole('button', { name: /삭제/ })).not.toBeInTheDocument();
    });

    it('canEdit=false면 행 추가 버튼이 없다', () => {
      render(<CompetencyModelingTable competencies={[makeCompetency()]} />);
      expect(screen.queryByRole('button', { name: /역량 추가/ })).not.toBeInTheDocument();
    });
  });

  describe('편집 모드', () => {
    it('canEdit=true이면 입력 필드를 표시한다', () => {
      render(
        <CompetencyModelingTable
          competencies={[makeCompetency()]}
          canEdit={true}
          onChange={vi.fn()}
        />,
      );
      // 역량 1 역량명 입력이 있어야 함 (데스크톱 + 모바일이 모두 렌더되므로 getAllBy)
      const nameInputs = screen.getAllByLabelText(/역량 1 역량명/);
      expect(nameInputs.length).toBeGreaterThanOrEqual(1);
    });

    it('역량 추가 버튼 클릭 시 onChange가 빈 역량이 추가된 배열로 호출된다', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <CompetencyModelingTable
          competencies={[makeCompetency()]}
          canEdit={true}
          onChange={onChange}
        />,
      );

      const addButton = screen.getByRole('button', { name: /역량 추가/ });
      await user.click(addButton);

      expect(onChange).toHaveBeenCalledTimes(1);
      const arg = onChange.mock.calls[0][0] as RoadmapCompetency[];
      expect(arg).toHaveLength(2);
      expect(arg[1].name).toBe('');
      expect(arg[1].knowledge).toEqual([]);
    });

    it('삭제 버튼 클릭 시 onChange가 해당 행이 제거된 배열로 호출된다', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <CompetencyModelingTable
          competencies={[
            makeCompetency({ name: '역량 A' }),
            makeCompetency({ name: '역량 B' }),
          ]}
          canEdit={true}
          onChange={onChange}
        />,
      );

      const deleteButtons = screen.getAllByRole('button', { name: /역량 1 삭제/ });
      await user.click(deleteButtons[0]);

      expect(onChange).toHaveBeenCalledTimes(1);
      const arg = onChange.mock.calls[0][0] as RoadmapCompetency[];
      expect(arg).toHaveLength(1);
      expect(arg[0].name).toBe('역량 B');
    });

    it('역량명 입력 변경 시 onChange가 호출된다', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <CompetencyModelingTable
          competencies={[makeCompetency({ name: '' })]}
          canEdit={true}
          onChange={onChange}
        />,
      );

      const nameInputs = screen.getAllByLabelText(/역량 1 역량명/);
      await user.type(nameInputs[0], 'A');

      expect(onChange).toHaveBeenCalled();
      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1];
      const arg = lastCall[0] as RoadmapCompetency[];
      expect(arg[0].name).toBe('A');
    });

    it('지식 textarea 변경 시 줄바꿈 기준으로 배열이 파싱되어 onChange 호출된다', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <CompetencyModelingTable
          competencies={[makeCompetency({ knowledge: [] })]}
          canEdit={true}
          onChange={onChange}
        />,
      );

      const knowledgeInputs = screen.getAllByLabelText(/역량 1 지식/);
      // 첫 번째 textarea에 "A\nB" 입력 (한 번에 입력)
      await user.click(knowledgeInputs[0]);
      await user.paste('A\nB');

      expect(onChange).toHaveBeenCalled();
      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1];
      const arg = lastCall[0] as RoadmapCompetency[];
      expect(arg[0].knowledge).toEqual(['A', 'B']);
    });
  });
});

describe('2단 헤더 (양식 1번 Ⅲ-1)', () => {
  it('역량 데이터 있을 때 상위 "필요 지식·기술·태도" 헤더가 colspan=3', () => {
    render(
      <CompetencyModelingTable
        competencies={[{ name: 'A', definition: '정의', knowledge: [], skills: [], attitudes: [] }]}
        canEdit={false}
      />,
    );
    const groupHeader = screen.getByRole('columnheader', { name: /필요 지식.*기술.*태도/ });
    expect(groupHeader).toHaveAttribute('colspan', '3');
  });

  it('하위 지식·기술·태도 헤더', () => {
    render(
      <CompetencyModelingTable
        competencies={[{ name: 'A', definition: '정의', knowledge: [], skills: [], attitudes: [] }]}
        canEdit={false}
      />,
    );
    // 콘테너를 thead 스코프로 한정 (중복 text 방지)
    const thead = document.querySelector('thead')!;
    expect(within(thead).getByText(/^지식/)).toBeInTheDocument();
    expect(within(thead).getByText(/^기술/)).toBeInTheDocument();
    expect(within(thead).getByText(/^태도/)).toBeInTheDocument();
  });

  it('역량명·정의 헤더는 rowspan=2', () => {
    render(
      <CompetencyModelingTable
        competencies={[{ name: 'A', definition: '정의', knowledge: [], skills: [], attitudes: [] }]}
        canEdit={false}
      />,
    );
    expect(screen.getByRole('columnheader', { name: '역량명' })).toHaveAttribute('rowspan', '2');
    const defHeader = screen.getByRole('columnheader', { name: /역량 정의/ });
    expect(defHeader).toHaveAttribute('rowspan', '2');
  });
});

describe('셀 균일 높이 + 자동 줄바꿈', () => {
  it('각 td에 break-words 또는 break-keep 클래스 적용', () => {
    const { container } = render(
      <CompetencyModelingTable
        competencies={[{ name: 'A', definition: '정의', knowledge: [], skills: [], attitudes: [] }]}
        canEdit={false}
      />,
    );
    const tds = container.querySelectorAll('tbody td');
    expect(tds.length).toBeGreaterThan(0);
    tds.forEach((td) => {
      const cls = td.className;
      expect(cls).toMatch(/break-words|break-keep|align-top/);
    });
  });
});
