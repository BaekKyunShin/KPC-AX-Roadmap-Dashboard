import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { StepIndicator } from './StepIndicator';

// ============================================================================
// 테스트 헬퍼
// ============================================================================

function renderIndicator(overrides: Partial<Parameters<typeof StepIndicator>[0]> = {}) {
  const defaultProps = {
    steps: ['데이터', '인프라', '인재'],
    currentStep: 0,
    completedSteps: new Set<number>(),
    onStepClick: vi.fn(),
    ...overrides,
  };
  return { ...render(<StepIndicator {...defaultProps} />), props: defaultProps };
}

// ============================================================================
// 테스트
// ============================================================================

describe('StepIndicator', () => {
  describe('스텝 수 표시', () => {
    it('전달된 스텝 이름을 모두 렌더링한다', () => {
      renderIndicator();
      // 데스크톱 + 모바일 양쪽에 존재할 수 있으므로 getAllByText 사용
      expect(screen.getAllByText('데이터').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('인프라').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('인재').length).toBeGreaterThanOrEqual(1);
    });

    it('스텝 수만큼 데스크톱 버튼을 렌더링한다', () => {
      renderIndicator({ steps: ['A', 'B', 'C', 'D'] });
      const buttons = screen.getAllByRole('button');
      // 데스크톱 4개 + 모바일 진행 바 4개 = 8개
      expect(buttons.length).toBe(8);
    });

    it('스텝이 1개일 때도 렌더링된다', () => {
      renderIndicator({ steps: ['유일 스텝'] });
      expect(screen.getAllByText('유일 스텝').length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('현재 스텝 하이라이트', () => {
    it('현재 스텝 번호를 표시한다', () => {
      renderIndicator({ currentStep: 1 });
      // 모바일 영역에서 "2 / 3" 텍스트
      expect(screen.getByText('2 / 3')).toBeInTheDocument();
    });

    it('현재 스텝 이름을 모바일 영역에 표시한다', () => {
      renderIndicator({ currentStep: 2 });
      // 데스크톱 + 모바일 양쪽에 "인재" 텍스트 존재
      const matches = screen.getAllByText('인재');
      expect(matches.length).toBeGreaterThanOrEqual(1);
      // 모바일 영역의 span (font-medium text-indigo-900)
      const mobileLabel = matches.find(el => el.classList.contains('font-medium'));
      expect(mobileLabel).toBeTruthy();
    });

    it('첫 번째 스텝이 현재일 때 "1 / N"을 표시한다', () => {
      renderIndicator({ currentStep: 0, steps: ['A', 'B'] });
      expect(screen.getByText('1 / 2')).toBeInTheDocument();
    });
  });

  describe('완료된 스텝 표시', () => {
    it('완료된 스텝에는 번호 대신 체크 아이콘이 표시된다', () => {
      const { container } = renderIndicator({
        completedSteps: new Set([0]),
        currentStep: 1,
      });
      // 완료된 스텝의 Check 아이콘 (lucide-react는 svg를 렌더)
      const svgs = container.querySelectorAll('svg');
      expect(svgs.length).toBeGreaterThanOrEqual(1);
    });

    it('완료되지 않은 스텝에는 번호가 표시된다', () => {
      renderIndicator({ completedSteps: new Set([0]), currentStep: 1 });
      // 스텝 인덱스 2 (인재)는 미완료이므로 "3"이 표시됨
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  describe('클릭 콜백', () => {
    it('데스크톱 스텝 버튼 클릭 시 onStepClick이 호출된다', async () => {
      const user = userEvent.setup();
      const { props } = renderIndicator();

      // 데스크톱 버튼들 (truncate 클래스를 가진 텍스트의 부모 버튼)
      const buttons = screen.getAllByRole('button');
      // 첫 번째 버튼 (데스크톱 영역)
      await user.click(buttons[0]);
      expect(props.onStepClick).toHaveBeenCalledWith(0);
    });

    it('두 번째 스텝 클릭 시 인덱스 1로 호출된다', async () => {
      const user = userEvent.setup();
      const { props } = renderIndicator();

      const buttons = screen.getAllByRole('button');
      await user.click(buttons[1]);
      expect(props.onStepClick).toHaveBeenCalledWith(1);
    });

    it('모바일 진행 바 버튼 클릭 시 onStepClick이 호출된다', async () => {
      const user = userEvent.setup();
      const { props } = renderIndicator();

      const buttons = screen.getAllByRole('button');
      // 모바일 진행 바 버튼은 데스크톱 버튼 뒤에 위치 (인덱스 3, 4, 5)
      await user.click(buttons[3]);
      expect(props.onStepClick).toHaveBeenCalledWith(0);
    });

    it('여러 번 클릭 시 각각 호출된다', async () => {
      const user = userEvent.setup();
      const { props } = renderIndicator();

      const buttons = screen.getAllByRole('button');
      await user.click(buttons[0]);
      await user.click(buttons[2]);
      expect(props.onStepClick).toHaveBeenCalledTimes(2);
    });
  });
});
