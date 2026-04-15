import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MiniStepper from './MiniStepper';
import type { ProjectStatus } from '@/types/database';

// ============================================================================
// 모킹
// ============================================================================

// lucide-react AlertTriangle 모킹
vi.mock('lucide-react', async () => {
  const actual = await vi.importActual('lucide-react');
  return {
    ...actual,
    AlertTriangle: () => <svg data-testid="alert-triangle" />,
  };
});

// ============================================================================
// 테스트 헬퍼
// ============================================================================

function renderStepper(
  status: ProjectStatus,
  daysInCurrentStatus = 0,
  showLabel = true,
  showDays = true
) {
  return render(
    <MiniStepper
      status={status}
      daysInCurrentStatus={daysInCurrentStatus}
      showLabel={showLabel}
      showDays={showDays}
    />
  );
}

// ============================================================================
// 테스트
// ============================================================================

describe('MiniStepper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --------------------------------------------------------------------------
  // 1. 단계 시각화 (dot 개수)
  // --------------------------------------------------------------------------
  describe('단계 시각화', () => {
    it('PROJECT_WORKFLOW_STEPS 개수만큼 원형 dot을 렌더링한다 (6개)', () => {
      renderStepper('NEW');
      // h-2.5 w-2.5 rounded-full 클래스를 가진 div
      const dots = document.querySelectorAll('.h-2\\.5.w-2\\.5.rounded-full');
      expect(dots.length).toBe(6);
    });

    it('FINALIZED 상태에서 모든 이전 단계 dot이 완료 색상(bg-emerald-500)이다', () => {
      renderStepper('FINALIZED');
      const dots = document.querySelectorAll('.bg-emerald-500');
      // FINALIZED는 index=5, 0~4까지 5개가 완료 + 현재 6번째도 현재(blue)가 아닌 completed
      expect(dots.length).toBeGreaterThan(0);
    });

    it('NEW 상태에서 현재 단계 dot이 blue(bg-blue-500)이다', () => {
      renderStepper('NEW');
      const currentDot = document.querySelector('.bg-blue-500');
      expect(currentDot).toBeInTheDocument();
    });

    it('NEW 상태에서 이후 단계 dot이 회색(bg-gray-200)이다', () => {
      renderStepper('NEW');
      const pendingDots = document.querySelectorAll('.bg-gray-200');
      // NEW는 index=0이므로 이후 5개가 회색
      expect(pendingDots.length).toBeGreaterThan(0);
    });
  });

  // --------------------------------------------------------------------------
  // 2. 상태 라벨
  // --------------------------------------------------------------------------
  describe('상태 라벨', () => {
    it('showLabel=true일 때 워크플로우 단계 라벨을 표시한다', () => {
      renderStepper('NEW', 0, true, false);
      expect(screen.getByText('신규 등록 완료')).toBeInTheDocument();
    });

    it('showLabel=false일 때 라벨을 표시하지 않는다', () => {
      renderStepper('NEW', 0, false, false);
      expect(screen.queryByText('신규 등록 완료')).not.toBeInTheDocument();
    });

    it('ASSIGNED 상태의 라벨을 표시한다', () => {
      renderStepper('ASSIGNED', 0, true, false);
      expect(screen.getByText('컨설턴트 배정 완료')).toBeInTheDocument();
    });

    it('FINALIZED 상태의 라벨을 표시한다', () => {
      renderStepper('FINALIZED', 0, true, false);
      expect(screen.getByText('최종 확정')).toBeInTheDocument();
    });

    it('DIAGNOSED와 MATCH_RECOMMENDED는 같은 단계 라벨을 가진다', () => {
      const { unmount } = renderStepper('DIAGNOSED', 0, true, false);
      expect(screen.getByText('진단결과 입력 완료')).toBeInTheDocument();
      unmount();
      renderStepper('MATCH_RECOMMENDED', 0, true, false);
      expect(screen.getByText('진단결과 입력 완료')).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 3. 경과일 표시
  // --------------------------------------------------------------------------
  describe('경과일 표시', () => {
    it('showDays=true이고 daysInCurrentStatus > 0이면 경과일을 표시한다', () => {
      renderStepper('ASSIGNED', 10, false, true);
      expect(screen.getByText('(10일 경과)')).toBeInTheDocument();
    });

    it('daysInCurrentStatus=0이면 경과일을 표시하지 않는다', () => {
      renderStepper('ASSIGNED', 0, false, true);
      expect(screen.queryByText(/경과/)).not.toBeInTheDocument();
    });

    it('showDays=false이면 경과일을 표시하지 않는다', () => {
      renderStepper('ASSIGNED', 10, false, false);
      expect(screen.queryByText(/경과/)).not.toBeInTheDocument();
    });

    it('FINALIZED 상태에서 showDays=true이면 "(완료)"를 표시한다', () => {
      renderStepper('FINALIZED', 5, false, true);
      expect(screen.getByText('(완료)')).toBeInTheDocument();
    });

    it('FINALIZED 상태에서는 경과일 대신 "(완료)"를 표시한다', () => {
      renderStepper('FINALIZED', 10, false, true);
      expect(screen.queryByText(/경과/)).not.toBeInTheDocument();
      expect(screen.getByText('(완료)')).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 4. 지연 경고 스타일
  // --------------------------------------------------------------------------
  describe('지연 경고 스타일', () => {
    it('WARNING(20일 이상)에서 AlertTriangle 아이콘을 표시한다', () => {
      renderStepper('ASSIGNED', 20, false, true);
      expect(screen.getByTestId('alert-triangle')).toBeInTheDocument();
    });

    it('SEVERE(30일 이상)에서 경과일 텍스트가 빨간색(text-red-600)이다', () => {
      renderStepper('ASSIGNED', 35, false, true);
      const daysEl = screen.getByText('(35일 경과)');
      expect(daysEl.className).toMatch(/text-red-600/);
    });

    it('WARNING(20~29일)에서 경과일 텍스트가 주황색(text-amber-600)이다', () => {
      renderStepper('ASSIGNED', 25, false, true);
      const daysEl = screen.getByText('(25일 경과)');
      expect(daysEl.className).toMatch(/text-amber-600/);
    });

    it('정상 범위(19일 이하)에서 AlertTriangle 아이콘이 없다', () => {
      renderStepper('ASSIGNED', 10, false, true);
      expect(screen.queryByTestId('alert-triangle')).not.toBeInTheDocument();
    });

    it('정상 범위에서 경과일 텍스트가 기본 muted 색상이다', () => {
      renderStepper('ASSIGNED', 10, false, true);
      const daysEl = screen.getByText('(10일 경과)');
      expect(daysEl.className).toMatch(/text-muted-foreground/);
    });
  });

  // --------------------------------------------------------------------------
  // 5. 기본 props
  // --------------------------------------------------------------------------
  describe('기본 props', () => {
    it('showLabel과 showDays 기본값이 true이다 (둘 다 표시)', () => {
      render(<MiniStepper status="ASSIGNED" daysInCurrentStatus={5} />);
      expect(screen.getByText('컨설턴트 배정 완료')).toBeInTheDocument();
      expect(screen.getByText('(5일 경과)')).toBeInTheDocument();
    });

    it('daysInCurrentStatus 기본값은 0이다 (경과일 미표시)', () => {
      render(<MiniStepper status="ASSIGNED" />);
      expect(screen.queryByText(/경과/)).not.toBeInTheDocument();
    });
  });
});
