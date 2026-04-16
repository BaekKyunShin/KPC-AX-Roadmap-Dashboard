import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { AnnualTrainingPlanTable } from './AnnualTrainingPlanTable';
import type {
  RoadmapAnnualPlan,
  RoadmapAnnualPlanItem,
} from '@/lib/services/roadmap/roadmap-types';

// ============================================================================
// 테스트 데이터
// ============================================================================

function makeItem(overrides: Partial<RoadmapAnnualPlanItem> = {}): RoadmapAnnualPlanItem {
  return {
    competency_name: '데이터 분석',
    course_name: '데이터 리터러시 기초',
    format: '집체',
    hours: 16,
    notes: '전 사원 대상',
    ...overrides,
  };
}

function makePlan(overrides: Partial<RoadmapAnnualPlan> = {}): RoadmapAnnualPlan {
  return {
    items: [makeItem()],
    usage_plan: '부서별 순환 교육으로 활용',
    ...overrides,
  };
}

// ============================================================================
// 테스트
// ============================================================================

describe('AnnualTrainingPlanTable', () => {
  describe('빈 상태', () => {
    it('빈 items + canEdit=false이면 안내 문구를 표시한다', () => {
      render(
        <AnnualTrainingPlanTable plan={{ items: [], usage_plan: '' }} canEdit={false} />,
      );
      // 데스크톱 또는 모바일 영역에 "없습니다" 문구
      const emptyMessages = screen.getAllByText(/연간 훈련계획 항목이 없습니다/);
      expect(emptyMessages.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('읽기 전용 모드', () => {
    it('5열 데이터(역량명/훈련과정명/형태/시간/비고)를 렌더링한다', () => {
      render(<AnnualTrainingPlanTable plan={makePlan()} canEdit={false} />);
      expect(screen.getAllByText('데이터 분석').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('데이터 리터러시 기초').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('집체').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('16H').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('전 사원 대상').length).toBeGreaterThanOrEqual(1);
    });

    it('usage_plan이 있으면 표시한다', () => {
      render(<AnnualTrainingPlanTable plan={makePlan()} canEdit={false} />);
      expect(screen.getByText('부서별 순환 교육으로 활용')).toBeInTheDocument();
    });

    it('usage_plan이 비어있으면 "(미작성)"을 표시한다', () => {
      render(
        <AnnualTrainingPlanTable
          plan={{ items: [makeItem()], usage_plan: '' }}
          canEdit={false}
        />,
      );
      expect(screen.getByText('(미작성)')).toBeInTheDocument();
    });

    it('canEdit=false면 Input/Textarea/버튼이 없다', () => {
      render(<AnnualTrainingPlanTable plan={makePlan()} canEdit={false} />);
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /훈련과정 추가/ })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /삭제/ })).not.toBeInTheDocument();
    });
  });

  describe('편집 모드', () => {
    it('canEdit=true이면 훈련과정 추가 버튼이 표시된다', () => {
      render(
        <AnnualTrainingPlanTable plan={makePlan()} canEdit={true} onChange={vi.fn()} />,
      );
      expect(
        screen.getByRole('button', { name: /훈련과정 추가/ }),
      ).toBeInTheDocument();
    });

    it('훈련과정 추가 버튼 클릭 시 onChange가 items.length+1 배열로 호출된다', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <AnnualTrainingPlanTable plan={makePlan()} canEdit={true} onChange={onChange} />,
      );

      await user.click(screen.getByRole('button', { name: /훈련과정 추가/ }));

      expect(onChange).toHaveBeenCalledTimes(1);
      const arg = onChange.mock.calls[0][0] as RoadmapAnnualPlan;
      expect(arg.items).toHaveLength(2);
      expect(arg.items[1].competency_name).toBe('');
      expect(arg.items[1].hours).toBe(0);
    });

    it('삭제 버튼 클릭 시 onChange가 items.length-1 배열로 호출된다', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <AnnualTrainingPlanTable
          plan={{
            items: [makeItem({ course_name: 'A' }), makeItem({ course_name: 'B' })],
            usage_plan: '',
          }}
          canEdit={true}
          onChange={onChange}
        />,
      );

      const deleteButtons = screen.getAllByRole('button', { name: /연간계획 1 삭제/ });
      await user.click(deleteButtons[0]);

      expect(onChange).toHaveBeenCalledTimes(1);
      const arg = onChange.mock.calls[0][0] as RoadmapAnnualPlan;
      expect(arg.items).toHaveLength(1);
      expect(arg.items[0].course_name).toBe('B');
    });

    it('역량명 Input 변경 시 onChange가 호출된다', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <AnnualTrainingPlanTable
          plan={{ items: [makeItem({ competency_name: '' })], usage_plan: '' }}
          canEdit={true}
          onChange={onChange}
        />,
      );

      const inputs = screen.getAllByLabelText(/연간계획 1 역량명/);
      await user.type(inputs[0], 'X');

      expect(onChange).toHaveBeenCalled();
      const lastArg = onChange.mock.calls[onChange.mock.calls.length - 1][0] as RoadmapAnnualPlan;
      expect(lastArg.items[0].competency_name).toBe('X');
    });

    it('활용방안 Textarea 변경 시 onChange가 호출된다', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <AnnualTrainingPlanTable
          plan={{ items: [makeItem()], usage_plan: '' }}
          canEdit={true}
          onChange={onChange}
        />,
      );

      const usageInput = screen.getByLabelText('활용방안');
      await user.type(usageInput, 'Z');

      expect(onChange).toHaveBeenCalled();
      const lastArg = onChange.mock.calls[onChange.mock.calls.length - 1][0] as RoadmapAnnualPlan;
      expect(lastArg.usage_plan).toBe('Z');
    });

    it('훈련시간 Input 변경 시 숫자로 저장된다', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <AnnualTrainingPlanTable
          plan={{ items: [makeItem({ hours: 0 })], usage_plan: '' }}
          canEdit={true}
          onChange={onChange}
        />,
      );

      const hoursInputs = screen.getAllByLabelText(/연간계획 1 훈련시간/);
      // controlled component이므로 단일 문자 입력으로 onChange 호출 및 숫자 변환 확인
      await user.type(hoursInputs[0], '2');

      expect(onChange).toHaveBeenCalled();
      const lastArg = onChange.mock.calls[onChange.mock.calls.length - 1][0] as RoadmapAnnualPlan;
      expect(lastArg.items[0].hours).toBe(2);
      expect(typeof lastArg.items[0].hours).toBe('number');
    });
  });
});
