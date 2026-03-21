import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@/test/helpers/mock-next-link';
import ProjectManagementTabs from './ProjectManagementTabs';

// ============================================================================
// 모킹
// ============================================================================

// StatsSummaryCards: Server Action 의존성 제거용 모킹
vi.mock('./StatsSummaryCards', () => ({
  default: ({
    onStatusFilter,
    activeStatuses,
  }: {
    onStatusFilter?: (statuses: string[] | null) => void;
    activeStatuses?: string[] | null;
  }) => (
    <div data-testid="stats-summary-cards" data-active={JSON.stringify(activeStatuses)}>
      <button onClick={() => onStatusFilter?.(['NEW'])}>신규 등록 필터</button>
      <button onClick={() => onStatusFilter?.(null)}>전체 필터</button>
    </div>
  ),
}));

// ProjectList: 복잡한 의존성 제거용 모킹
vi.mock('./ProjectList', () => ({
  default: ({ statusFilter }: { statusFilter: string[] | null }) => (
    <div data-testid="project-list" data-filter={JSON.stringify(statusFilter)}>
      프로젝트 목록
    </div>
  ),
}));

// ProjectDashboard: next/dynamic lazy import 모킹
vi.mock('./ProjectDashboard', () => ({
  default: () => <div data-testid="project-dashboard">진행 현황 대시보드</div>,
}));

// next/dynamic: 모킹된 컴포넌트를 즉시 반환
vi.mock('next/dynamic', () => ({
  default: (_importFn: () => Promise<{ default: React.ComponentType }>) => {
    // dynamic import를 동기적으로 처리 — 실제 모킹된 모듈 반환
    const Component = vi.fn().mockImplementation(() => (
      <div data-testid="project-dashboard">진행 현황 대시보드</div>
    ));
    return Component;
  },
}));

// ============================================================================
// 테스트
// ============================================================================

describe('ProjectManagementTabs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --------------------------------------------------------------------------
  // 1. 기본 렌더링
  // --------------------------------------------------------------------------
  describe('기본 렌더링', () => {
    it('StatsSummaryCards를 항상 렌더링한다', () => {
      render(<ProjectManagementTabs />);
      expect(screen.getByTestId('stats-summary-cards')).toBeInTheDocument();
    });

    it('"프로젝트 목록" 탭 트리거를 표시한다', () => {
      render(<ProjectManagementTabs />);
      // role="tab" 으로 특정 (탭 버튼만 조회)
      expect(screen.getByRole('tab', { name: /프로젝트 목록/ })).toBeInTheDocument();
    });

    it('"진행 현황 대시보드" 탭 트리거를 표시한다', () => {
      render(<ProjectManagementTabs />);
      expect(screen.getByRole('tab', { name: /진행 현황 대시보드/ })).toBeInTheDocument();
    });

    it('기본적으로 "프로젝트 목록" 탭 콘텐츠(ProjectList)가 표시된다', () => {
      render(<ProjectManagementTabs />);
      expect(screen.getByTestId('project-list')).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 2. 탭 전환
  // --------------------------------------------------------------------------
  describe('탭 전환', () => {
    it('"진행 현황 대시보드" 탭 클릭 시 해당 tabpanel이 활성화된다', () => {
      render(<ProjectManagementTabs />);
      fireEvent.click(screen.getByRole('tab', { name: /진행 현황 대시보드/ }));
      // Radix TabsContent의 data-state가 active인 panel 확인
      const panels = screen.getAllByRole('tabpanel');
      const activePanel = panels.find(p => p.getAttribute('data-state') === 'active');
      expect(activePanel).toBeInTheDocument();
    });

    it('"프로젝트 목록" 탭으로 다시 전환하면 목록 콘텐츠 panel이 활성화된다', () => {
      render(<ProjectManagementTabs />);
      // 대시보드 탭으로 전환 후 다시 목록으로 전환
      fireEvent.click(screen.getByRole('tab', { name: /진행 현황 대시보드/ }));
      fireEvent.click(screen.getByRole('tab', { name: /프로젝트 목록/ }));
      const panels = screen.getAllByRole('tabpanel');
      const activePanel = panels.find(p => p.getAttribute('data-state') === 'active');
      // list panel에 project-list가 포함됨
      expect(activePanel).toContainElement(screen.getByTestId('project-list'));
    });
  });

  // --------------------------------------------------------------------------
  // 3. 상태 필터 연동
  // --------------------------------------------------------------------------
  describe('상태 필터 연동', () => {
    it('StatsSummaryCards에서 특정 상태 필터 클릭 시 목록 tabpanel이 활성화된다', () => {
      render(<ProjectManagementTabs />);

      // 먼저 대시보드 탭으로 이동
      fireEvent.click(screen.getByRole('tab', { name: /진행 현황 대시보드/ }));

      // 상태 필터 클릭 → 자동으로 목록 탭으로 이동
      fireEvent.click(screen.getByText('신규 등록 필터'));
      const panels = screen.getAllByRole('tabpanel');
      const activePanel = panels.find(p => p.getAttribute('data-state') === 'active');
      expect(activePanel).toContainElement(screen.getByTestId('project-list'));
    });

    it('StatsSummaryCards에서 상태 필터 선택 시 ProjectList에 filter가 전달된다', () => {
      render(<ProjectManagementTabs />);

      fireEvent.click(screen.getByText('신규 등록 필터'));

      const projectList = screen.getByTestId('project-list');
      expect(projectList.dataset.filter).toBe(JSON.stringify(['NEW']));
    });

    it('전체 필터 클릭 시 ProjectList의 statusFilter가 null이 된다', () => {
      render(<ProjectManagementTabs />);

      // 먼저 신규 등록 필터 선택
      fireEvent.click(screen.getByText('신규 등록 필터'));
      // 전체 필터로 초기화
      fireEvent.click(screen.getByText('전체 필터'));

      const projectList = screen.getByTestId('project-list');
      expect(projectList.dataset.filter).toBe(JSON.stringify(null));
    });

    it('전체 필터 클릭 시 탭 전환이 발생하지 않는다 (현재 탭 유지)', () => {
      render(<ProjectManagementTabs />);

      // 처음에는 목록 탭
      fireEvent.click(screen.getByText('전체 필터'));

      // 목록 탭 유지
      expect(screen.getByTestId('project-list')).toBeInTheDocument();
    });

    it('StatsSummaryCards에 activeStatuses prop이 전달된다', () => {
      render(<ProjectManagementTabs />);

      fireEvent.click(screen.getByText('신규 등록 필터'));

      const statsCards = screen.getByTestId('stats-summary-cards');
      expect(statsCards.dataset.active).toBe(JSON.stringify(['NEW']));
    });
  });

  // --------------------------------------------------------------------------
  // 4. 초기 상태
  // --------------------------------------------------------------------------
  describe('초기 상태', () => {
    it('초기 statusFilter는 null이다', () => {
      render(<ProjectManagementTabs />);
      const projectList = screen.getByTestId('project-list');
      expect(projectList.dataset.filter).toBe(JSON.stringify(null));
    });

    it('초기 activeStatuses는 null로 전달된다', () => {
      render(<ProjectManagementTabs />);
      const statsCards = screen.getByTestId('stats-summary-cards');
      expect(statsCards.dataset.active).toBe(JSON.stringify(null));
    });
  });
});
