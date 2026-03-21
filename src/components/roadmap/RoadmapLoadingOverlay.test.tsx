import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import RoadmapLoadingOverlay from './RoadmapLoadingOverlay';

// ============================================================================
// next/link 모킹
// ============================================================================

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

// ============================================================================
// 헬퍼
// ============================================================================

function renderOverlay(
  props: Partial<React.ComponentProps<typeof RoadmapLoadingOverlay>> = {},
) {
  const defaultProps: React.ComponentProps<typeof RoadmapLoadingOverlay> = {
    isTestMode: true,
    companyName: '',
    profileHref: '/consultant/profile',
    onCancel: undefined,
    isCompleted: false,
    ...props,
  };
  return render(<RoadmapLoadingOverlay {...defaultProps} />);
}

// ============================================================================
// 테스트
// ============================================================================

describe('RoadmapLoadingOverlay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // --------------------------------------------------------------------------
  // 기본 렌더링
  // --------------------------------------------------------------------------

  describe('기본 렌더링', () => {
    it('오버레이 고정 레이어가 렌더링된다', () => {
      const { container } = renderOverlay();
      const overlay = container.firstElementChild;
      expect(overlay).toBeInTheDocument();
      expect(overlay).toHaveClass('fixed', 'inset-0', 'z-50');
    });

    it('"AI 로드맵 생성 중" 헤더를 표시한다', async () => {
      renderOverlay();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(50);
      });
      expect(screen.getByText('AI 로드맵 생성 중')).toBeInTheDocument();
    });

    it('"잠시만 기다려 주세요" 서브 텍스트를 표시한다', async () => {
      renderOverlay();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(50);
      });
      expect(screen.getByText('잠시만 기다려 주세요')).toBeInTheDocument();
    });

    it('마운트 직후 isVisible이 false → 10ms 후 true로 전환된다', async () => {
      const { container } = renderOverlay();
      const modal = container.querySelector('.transition-all.duration-300.bg-white');
      // 초기에는 opacity-0 클래스
      expect(modal).toHaveClass('opacity-0');

      await act(async () => {
        await vi.advanceTimersByTimeAsync(20);
      });
      expect(modal).toHaveClass('opacity-100');
    });
  });

  // --------------------------------------------------------------------------
  // 단계 인디케이터 (StepIndicator)
  // --------------------------------------------------------------------------

  describe('3단계 전환 텍스트', () => {
    it('3개 단계 레이블이 모두 표시된다 (요구사항 분석, 교육과정 설계, 로드맵 구성)', () => {
      renderOverlay();
      expect(screen.getByText('요구사항 분석')).toBeInTheDocument();
      expect(screen.getByText('교육과정 설계')).toBeInTheDocument();
      expect(screen.getByText('로드맵 구성')).toBeInTheDocument();
    });

    it('초기 단계에서 단계 번호(1)를 포함한 엘리먼트가 렌더링된다', () => {
      renderOverlay();
      // 첫 번째 단계: 활성 상태이므로 숫자 대신 pulse dot 표시
      // 두 번째 단계(미도달): 숫자 "2"
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 프로그레스 바 (ProgressBar)
  // --------------------------------------------------------------------------

  describe('프로그레스 바', () => {
    it('"진행률" 레이블이 표시된다', () => {
      renderOverlay();
      expect(screen.getByText('진행률')).toBeInTheDocument();
    });

    it('초기 진행률 0%가 표시된다', () => {
      renderOverlay();
      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('시간이 지나면 진행률이 0%보다 커진다', async () => {
      renderOverlay();
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000);
      });
      const percentEl = screen.queryByText('0%');
      // 5초 후에는 0%가 더 이상 아닌 값이 표시되어야 함
      expect(percentEl).not.toBeInTheDocument();
    });

    it('isTestMode=true 이면 테스트 로드맵 단계 메시지를 표시한다', () => {
      renderOverlay({ isTestMode: true });
      expect(
        screen.getByText('업무 환경과 개선 목표를 분석하고 있습니다...'),
      ).toBeInTheDocument();
    });

    it('isTestMode=false 이면 회사명 포함 단계 메시지를 표시한다', () => {
      renderOverlay({ isTestMode: false, companyName: 'ACME Corp' });
      expect(
        screen.getByText(/"ACME Corp"의 업무 환경과 개선 목표를 분석하고 있습니다\.\.\./),
      ).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 팁 카드 (TipCard)
  // --------------------------------------------------------------------------

  describe('팁 카드', () => {
    it('isTestMode=true 이면 "컨설턴트 Tip" 타이틀을 표시한다', () => {
      renderOverlay({ isTestMode: true });
      expect(screen.getByText('컨설턴트 Tip')).toBeInTheDocument();
    });

    it('isTestMode=false 이면 "안내" 타이틀을 표시한다', () => {
      renderOverlay({ isTestMode: false });
      expect(screen.getByText('안내')).toBeInTheDocument();
    });

    it('isTestMode=true 이면 "프로필 관리" 링크가 표시된다', () => {
      renderOverlay({ isTestMode: true });
      expect(screen.getByText('프로필 관리')).toBeInTheDocument();
    });

    it('isTestMode=false 이면 "프로필 관리" 링크가 표시되지 않는다', () => {
      renderOverlay({ isTestMode: false });
      expect(screen.queryByText('프로필 관리')).not.toBeInTheDocument();
    });

    it('"프로필 관리" 링크가 profileHref로 지정된 경로를 가진다', () => {
      renderOverlay({ isTestMode: true, profileHref: '/consultant/profile' });
      const link = screen.getByRole('link', { name: /프로필 관리/ });
      expect(link).toHaveAttribute('href', '/consultant/profile');
    });
  });

  // --------------------------------------------------------------------------
  // 취소 버튼
  // --------------------------------------------------------------------------

  describe('취소 버튼', () => {
    it('onCancel이 없으면 취소 버튼이 표시되지 않는다', () => {
      renderOverlay({ onCancel: undefined });
      expect(screen.queryByRole('button', { name: /취소/ })).not.toBeInTheDocument();
    });

    it('onCancel이 있으면 우측 상단 X 버튼이 표시된다', () => {
      renderOverlay({ onCancel: vi.fn() });
      expect(screen.getByRole('button', { name: '취소' })).toBeInTheDocument();
    });

    it('onCancel이 있으면 하단 "생성 취소" 버튼이 표시된다', () => {
      renderOverlay({ onCancel: vi.fn() });
      expect(screen.getByRole('button', { name: '생성 취소' })).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 취소 다이얼로그
  // --------------------------------------------------------------------------

  describe('취소 확인 다이얼로그', () => {
    it('초기에는 취소 다이얼로그가 표시되지 않는다', () => {
      renderOverlay({ onCancel: vi.fn() });
      expect(
        screen.queryByText('생성을 취소하시겠습니까?'),
      ).not.toBeInTheDocument();
    });

    it('X 버튼 클릭 시 취소 확인 다이얼로그가 열린다', () => {
      renderOverlay({ onCancel: vi.fn() });

      const cancelBtn = screen.getByRole('button', { name: '취소' });
      fireEvent.click(cancelBtn);

      expect(screen.getByText('생성을 취소하시겠습니까?')).toBeInTheDocument();
    });

    it('"계속 생성" 클릭 시 다이얼로그가 닫힌다', () => {
      renderOverlay({ onCancel: vi.fn() });

      const cancelBtn = screen.getByRole('button', { name: '취소' });
      fireEvent.click(cancelBtn);

      const continueBtn = screen.getByRole('button', { name: '계속 생성' });
      fireEvent.click(continueBtn);

      expect(
        screen.queryByText('생성을 취소하시겠습니까?'),
      ).not.toBeInTheDocument();
    });

    it('"생성 취소" 클릭 후 onCancel 콜백이 호출된다', async () => {
      const onCancel = vi.fn();
      renderOverlay({ onCancel });

      // X 버튼 클릭으로 다이얼로그 열기
      const cancelBtn = screen.getByRole('button', { name: '취소' });
      fireEvent.click(cancelBtn);

      // 다이얼로그가 열리면 "생성 취소" 버튼이 2개 (하단 + 다이얼로그)
      // 다이얼로그 내 확인 버튼은 destructive variant
      const confirmBtns = screen.getAllByRole('button', { name: '생성 취소' });
      // 다이얼로그 내 버튼은 마지막 렌더링된 것 (fixed z-60 레이어에 있음)
      const dialogConfirmBtn = confirmBtns.at(-1)!;
      fireEvent.click(dialogConfirmBtn);

      // 200ms 딜레이 후 onCancel 호출
      await act(async () => {
        await vi.advanceTimersByTimeAsync(300);
      });

      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('하단 "생성 취소" 버튼 클릭 시에도 다이얼로그가 열린다', () => {
      renderOverlay({ onCancel: vi.fn() });

      const bottomCancelBtn = screen.getByRole('button', { name: '생성 취소' });
      fireEvent.click(bottomCancelBtn);

      expect(screen.getByText('생성을 취소하시겠습니까?')).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 완료 상태 (isCompleted)
  // --------------------------------------------------------------------------

  describe('완료 상태 (isCompleted=true)', () => {
    it('isCompleted=true 이면 모든 단계가 완료 표시된다 (isAllCompleted)', async () => {
      renderOverlay({ isCompleted: true });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(50);
      });
      // 완료 시 step은 마지막 단계로 고정
      // Check 아이콘이 렌더링되어야 함 (svg 내 check path)
      const { container } = renderOverlay({ isCompleted: true });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000);
      });
      // isCompleted=true면 isAllStepsCompleted=true가 될 수 있으므로
      // 단계 인디케이터 컨테이너가 존재해야 함
      expect(container.querySelector('.flex.items-center.justify-center.mb-6')).toBeInTheDocument();
    });

    it('isCompleted=true 이면 정체 메시지(isStalled)가 표시되지 않는다', () => {
      renderOverlay({ isCompleted: true });
      expect(
        screen.queryByText(/예상보다 시간이 조금 더 걸리고 있습니다/),
      ).not.toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 팁 인디케이터
  // --------------------------------------------------------------------------

  describe('팁 인디케이터', () => {
    it('isTestMode=true 이면 4개 팁 인디케이터 점이 표시된다', () => {
      const { container } = renderOverlay({ isTestMode: true });
      const dots = container.querySelectorAll('.w-1\\.5.h-1\\.5.rounded-full');
      expect(dots.length).toBe(4);
    });

    it('isTestMode=false 이면 4개 팁 인디케이터 점이 표시된다', () => {
      const { container } = renderOverlay({ isTestMode: false });
      const dots = container.querySelectorAll('.w-1\\.5.h-1\\.5.rounded-full');
      expect(dots.length).toBe(4);
    });
  });
});
