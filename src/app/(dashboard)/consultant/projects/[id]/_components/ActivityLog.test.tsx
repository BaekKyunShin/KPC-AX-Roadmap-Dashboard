import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// =============================================================================
// 모킹 (최상단)
// =============================================================================

const mockSetFilterType = vi.fn();
const mockSetIsFormOpen = vi.fn();
const mockSetNewType = vi.fn();
const mockSetNewContent = vi.fn();
const mockLoadMore = vi.fn();
const mockHandleSubmit = vi.fn();
const mockLoadInitial = vi.fn();

const defaultHookReturn = {
  logs: [] as unknown[],
  isLoading: false,
  isLoadingMore: false,
  isFormOpen: false,
  setIsFormOpen: mockSetIsFormOpen,
  isSubmitting: false,
  filterType: 'all',
  setFilterType: mockSetFilterType,
  newType: 'field_note' as const,
  setNewType: mockSetNewType,
  newContent: '',
  setNewContent: mockSetNewContent,
  loadInitial: mockLoadInitial,
  loadMore: mockLoadMore,
  handleSubmit: mockHandleSubmit,
  hasMore: false,
  total: 0,
};

const mockUseActivityLogs = vi.fn(() => defaultHookReturn);

vi.mock('./activity-log', () => ({
  useActivityLogs: (...args: unknown[]) => mockUseActivityLogs(...(args as [])),
  LogItem: ({ log }: { log: { id: string; content: string } }) => (
    <div data-testid={`log-item-${log.id}`}>{log.content}</div>
  ),
  FILTER_OPTIONS: [
    { value: 'all', label: '전체' },
    { value: 'pre_research', label: '사전조사' },
    { value: 'field_note', label: '현장메모' },
    { value: 'follow_up', label: '후속조치' },
    { value: 'client_feedback', label: '기업피드백' },
  ],
}));

vi.mock('./activity-log/helpers', () => ({
  groupLogsByDate: (logs: unknown[]) => {
    const map = new Map<string, unknown[]>();
    if (logs.length > 0) map.set('today', logs);
    return map;
  },
  formatDateLabel: () => '오늘',
}));

vi.mock('@/lib/constants/activity-log', () => ({
  ACTIVITY_LOG_TYPE_CONFIG: {
    pre_research: { label: '사전조사' },
    field_note: { label: '현장메모' },
    follow_up: { label: '후속조치' },
    client_feedback: { label: '기업피드백' },
    system_auto: { label: '시스템' },
  },
  MANUAL_ACTIVITY_LOG_TYPES: ['pre_research', 'field_note', 'follow_up', 'client_feedback'],
  ACTIVITY_LOG_MAX_LENGTH: 2000,
}));

// Select 컴포넌트 간단 모킹
vi.mock('@/components/ui/select', async () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  return {
    Select: ({ children, value, onValueChange }: {
      children: React.ReactNode;
      value?: string;
      onValueChange?: (v: string) => void;
    }) => <div data-testid="select" data-value={value} onClick={() => onValueChange?.('pre_research')}>{children}</div>,
    SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    SelectValue: () => <span>현장메모</span>,
    SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
      <button data-value={value}>{children}</button>
    ),
  };
});

// =============================================================================
// Import
// =============================================================================

import ActivityLog from './ActivityLog';
import type { ActivityLogItem } from '../actions';

// =============================================================================
// 헬퍼
// =============================================================================

function makeLog(overrides: Partial<ActivityLogItem> = {}): ActivityLogItem {
  return {
    id: 'log-1',
    project_id: 'proj-1',
    consultant_id: 'con-1',
    type: 'field_note',
    content: '테스트 로그 내용',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

// =============================================================================
// 테스트
// =============================================================================

describe('ActivityLog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseActivityLogs.mockReturnValue({ ...defaultHookReturn });
  });

  describe('기본 렌더링', () => {
    it('"활동 일지" 제목이 표시된다', () => {
      render(<ActivityLog projectId="proj-1" />);
      expect(screen.getByText('활동 일지')).toBeInTheDocument();
    });

    it('필터 버튼이 렌더링된다', () => {
      render(<ActivityLog projectId="proj-1" />);
      expect(screen.getByText('전체')).toBeInTheDocument();
      expect(screen.getByText('사전조사')).toBeInTheDocument();
      expect(screen.getByText('현장메모')).toBeInTheDocument();
    });
  });

  describe('로딩 상태', () => {
    it('로딩 중일 때 스피너가 표시된다', () => {
      mockUseActivityLogs.mockReturnValue({ ...defaultHookReturn, isLoading: true });
      const { container } = render(<ActivityLog projectId="proj-1" />);
      // Loader2 아이콘이 있는 div
      expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    });
  });

  describe('빈 상태', () => {
    it('로그가 없을 때 빈 상태 메시지를 표시한다', () => {
      mockUseActivityLogs.mockReturnValue({ ...defaultHookReturn, logs: [], isLoading: false });
      render(<ActivityLog projectId="proj-1" />);
      expect(screen.getByText('아직 활동 기록이 없습니다.')).toBeInTheDocument();
    });
  });

  describe('로그 목록', () => {
    it('로그가 있을 때 LogItem을 렌더링한다', () => {
      const logs = [makeLog({ id: 'log-1', content: '첫 번째 로그' })];
      mockUseActivityLogs.mockReturnValue({
        ...defaultHookReturn,
        logs,
        isLoading: false,
      });

      render(<ActivityLog projectId="proj-1" />);
      expect(screen.getByTestId('log-item-log-1')).toBeInTheDocument();
    });

    it('날짜 구분 레이블이 표시된다', () => {
      const logs = [makeLog()];
      mockUseActivityLogs.mockReturnValue({
        ...defaultHookReturn,
        logs,
        isLoading: false,
      });

      render(<ActivityLog projectId="proj-1" />);
      expect(screen.getByText('오늘')).toBeInTheDocument();
    });
  });

  describe('필터', () => {
    it('필터 버튼 클릭 시 setFilterType이 호출된다', async () => {
      const user = userEvent.setup();
      render(<ActivityLog projectId="proj-1" />);

      await user.click(screen.getByText('사전조사'));

      expect(mockSetFilterType).toHaveBeenCalledWith('pre_research');
    });

    it('현재 선택된 필터가 강조 표시된다', () => {
      mockUseActivityLogs.mockReturnValue({ ...defaultHookReturn, filterType: 'pre_research' });
      render(<ActivityLog projectId="proj-1" />);

      const preResearchBtn = screen.getByText('사전조사');
      expect(preResearchBtn.className).toContain('bg-gray-900');
    });
  });

  describe('새 기록 추가 폼', () => {
    it('"기록 추가" 버튼 클릭 시 setIsFormOpen(true)가 호출된다', async () => {
      const user = userEvent.setup();
      render(<ActivityLog projectId="proj-1" />);

      await user.click(screen.getByText('기록 추가'));

      expect(mockSetIsFormOpen).toHaveBeenCalledWith(true);
    });

    it('isFormOpen=true일 때 텍스트 입력 폼이 표시된다', () => {
      mockUseActivityLogs.mockReturnValue({ ...defaultHookReturn, isFormOpen: true });
      render(<ActivityLog projectId="proj-1" />);

      expect(screen.getByPlaceholderText('활동 내용을 입력하세요...')).toBeInTheDocument();
    });

    it('isFormOpen=true일 때 저장 버튼이 표시된다', () => {
      mockUseActivityLogs.mockReturnValue({ ...defaultHookReturn, isFormOpen: true });
      render(<ActivityLog projectId="proj-1" />);

      expect(screen.getByRole('button', { name: '저장' })).toBeInTheDocument();
    });

    it('저장 버튼 클릭 시 handleSubmit이 호출된다', async () => {
      const user = userEvent.setup();
      mockUseActivityLogs.mockReturnValue({
        ...defaultHookReturn,
        isFormOpen: true,
        newContent: '입력된 내용',
      });
      render(<ActivityLog projectId="proj-1" />);

      await user.click(screen.getByRole('button', { name: '저장' }));

      expect(mockHandleSubmit).toHaveBeenCalled();
    });

    it('폼 닫기(X) 버튼 클릭 시 setIsFormOpen(false)가 호출된다', async () => {
      const user = userEvent.setup();
      mockUseActivityLogs.mockReturnValue({ ...defaultHookReturn, isFormOpen: true });
      render(<ActivityLog projectId="proj-1" />);

      // X 버튼
      const closeButtons = screen.getAllByRole('button');
      const xButton = closeButtons.find((btn) => btn.querySelector('svg'));
      if (xButton) await user.click(xButton);

      expect(mockSetIsFormOpen).toHaveBeenCalledWith(false);
    });
  });

  describe('더 보기', () => {
    it('hasMore=true일 때 "이전 기록 더 보기" 버튼이 표시된다', () => {
      const logs = [makeLog()];
      mockUseActivityLogs.mockReturnValue({
        ...defaultHookReturn,
        logs,
        isLoading: false,
        hasMore: true,
      });

      render(<ActivityLog projectId="proj-1" />);
      expect(screen.getByText('이전 기록 더 보기')).toBeInTheDocument();
    });

    it('"이전 기록 더 보기" 클릭 시 loadMore가 호출된다', async () => {
      const user = userEvent.setup();
      const logs = [makeLog()];
      mockUseActivityLogs.mockReturnValue({
        ...defaultHookReturn,
        logs,
        isLoading: false,
        hasMore: true,
      });

      render(<ActivityLog projectId="proj-1" />);

      await user.click(screen.getByText('이전 기록 더 보기'));

      await waitFor(() => {
        expect(mockLoadMore).toHaveBeenCalled();
      });
    });

    it('hasMore=false일 때 "이전 기록 더 보기" 버튼이 표시되지 않는다', () => {
      const logs = [makeLog()];
      mockUseActivityLogs.mockReturnValue({
        ...defaultHookReturn,
        logs,
        isLoading: false,
        hasMore: false,
      });

      render(<ActivityLog projectId="proj-1" />);
      expect(screen.queryByText('이전 기록 더 보기')).not.toBeInTheDocument();
    });
  });
});
