import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// =============================================================================
// 모킹
// =============================================================================

const mockUpdateActivityLog = vi.fn();
const mockDeleteActivityLog = vi.fn();
vi.mock('../../actions', () => ({
  updateActivityLog: (...args: unknown[]) => mockUpdateActivityLog(...args),
  deleteActivityLog: (...args: unknown[]) => mockDeleteActivityLog(...args),
}));

vi.mock('@/lib/utils/toast', () => ({
  showSuccessToast: vi.fn(),
  showErrorToast: vi.fn(),
}));

vi.mock('@/lib/constants/toast-messages', () => ({
  TOAST_ERROR: { NETWORK: '네트워크 오류' },
}));

vi.mock('@/lib/constants/activity-log', () => ({
  ACTIVITY_LOG_TYPE_CONFIG: {
    pre_research: { label: '사전조사', color: 'text-emerald-600', bgColor: 'bg-emerald-50', textColor: 'text-emerald-700' },
    field_note: { label: '현장메모', color: 'text-blue-600', bgColor: 'bg-blue-50', textColor: 'text-blue-700' },
    follow_up: { label: '후속조치', color: 'text-amber-600', bgColor: 'bg-amber-50', textColor: 'text-amber-700' },
    client_feedback: { label: '기업피드백', color: 'text-violet-600', bgColor: 'bg-violet-50', textColor: 'text-violet-700' },
    system_auto: { label: '시스템', color: 'text-gray-400', bgColor: 'bg-gray-50', textColor: 'text-gray-500' },
  },
  ACTIVITY_LOG_PREVIEW_LENGTH: 150,
  ACTIVITY_LOG_MAX_LENGTH: 2000,
}));

vi.mock('./constants', () => {
  const MockIcon = ({ className }: { className?: string }) => (
    <svg data-testid="mock-icon" className={className} />
  );
  return {
    ICON_MAP: {
      pre_research: MockIcon,
      field_note: MockIcon,
      follow_up: MockIcon,
      client_feedback: MockIcon,
      system_auto: MockIcon,
    },
  };
});

vi.mock('./helpers', () => ({
  formatRelativeTime: (dateStr: string) => `${dateStr} 시간`,
}));

// DropdownMenu를 간단한 mock으로 대체
vi.mock('@/components/ui/dropdown-menu', async () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');

  function DropdownMenu({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = React.useState(false);
    return (
      <div data-testid="dropdown-menu">
        {React.Children.map(children, (child: React.ReactElement) =>
          React.isValidElement(child)
            ? React.cloneElement(child as React.ReactElement<{ isOpen: boolean; setOpen: (v: boolean) => void }>, { isOpen: open, setOpen })
            : child,
        )}
      </div>
    );
  }

  function DropdownMenuTrigger({ children, asChild, isOpen, setOpen, ...props }: {
    children: React.ReactNode;
    asChild?: boolean;
    isOpen?: boolean;
    setOpen?: (v: boolean) => void;
    [key: string]: unknown;
  }) {
    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children as React.ReactElement<{ onClick: () => void }>, {
        onClick: () => setOpen?.(!isOpen),
      });
    }
    return <button onClick={() => setOpen?.(!isOpen)} {...props}>{children}</button>;
  }

  function DropdownMenuContent({ children, isOpen, ...props }: {
    children: React.ReactNode;
    isOpen?: boolean;
    [key: string]: unknown;
  }) {
    if (!isOpen) return null;
    return <div role="menu" {...props}>{children}</div>;
  }

  function DropdownMenuItem({ children, onClick, ...props }: {
    children: React.ReactNode;
    onClick?: () => void;
    [key: string]: unknown;
  }) {
    return <button role="menuitem" onClick={onClick} {...props}>{children}</button>;
  }

  return { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem };
});

// =============================================================================
// Import
// =============================================================================

import { LogItem } from './LogItem';
import type { ActivityLogType } from '@/lib/constants/activity-log';

// =============================================================================
// 테스트 데이터
// =============================================================================

interface TestLogItem {
  id: string;
  project_id: string;
  consultant_id: string;
  type: ActivityLogType;
  content: string;
  created_at: string;
  updated_at: string;
}

function makeLog(overrides: Partial<TestLogItem> = {}): TestLogItem {
  return {
    id: 'log-1',
    project_id: 'proj-1',
    consultant_id: 'con-1',
    type: 'field_note',
    content: '현장 방문 메모입니다.',
    created_at: '2026-03-19T10:00:00Z',
    updated_at: '2026-03-19T10:00:00Z',
    ...overrides,
  };
}

const longContent = 'A'.repeat(200);

// =============================================================================
// 테스트
// =============================================================================

describe('LogItem', () => {
  const onUpdated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // confirm 모킹
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  describe('시스템 자동 기록', () => {
    it('시스템 기록을 간결한 스타일로 표시한다', () => {
      render(
        <LogItem
          log={makeLog({ type: 'system_auto', content: '프로젝트가 생성되었습니다.' })}
          projectId="proj-1"
          onUpdated={onUpdated}
        />,
      );
      expect(screen.getByText('프로젝트가 생성되었습니다.')).toBeInTheDocument();
    });

    it('시스템 기록에 타임스탬프를 표시한다', () => {
      render(
        <LogItem
          log={makeLog({ type: 'system_auto' })}
          projectId="proj-1"
          onUpdated={onUpdated}
        />,
      );
      expect(screen.getByText(/시간/)).toBeInTheDocument();
    });

    it('시스템 기록에는 더보기 메뉴가 표시되지 않는다', () => {
      render(
        <LogItem
          log={makeLog({ type: 'system_auto' })}
          projectId="proj-1"
          onUpdated={onUpdated}
        />,
      );
      expect(screen.queryByTestId('more-actions-button')).not.toBeInTheDocument();
    });
  });

  describe('수동 기록 렌더링', () => {
    it('타입별 라벨을 표시한다', () => {
      render(
        <LogItem log={makeLog({ type: 'field_note' })} projectId="proj-1" onUpdated={onUpdated} />,
      );
      expect(screen.getByText('현장메모')).toBeInTheDocument();
    });

    it('내용을 표시한다', () => {
      render(
        <LogItem log={makeLog()} projectId="proj-1" onUpdated={onUpdated} />,
      );
      expect(screen.getByText('현장 방문 메모입니다.')).toBeInTheDocument();
    });

    it('타임스탬프를 표시한다', () => {
      render(
        <LogItem log={makeLog()} projectId="proj-1" onUpdated={onUpdated} />,
      );
      expect(screen.getByText(/시간/)).toBeInTheDocument();
    });

    it('수정된 기록에 "(수정됨)" 표시가 있다', () => {
      render(
        <LogItem
          log={makeLog({ updated_at: '2026-03-19T11:00:00Z' })}
          projectId="proj-1"
          onUpdated={onUpdated}
        />,
      );
      expect(screen.getByText('(수정됨)')).toBeInTheDocument();
    });

    it('수정되지 않은 기록에는 "(수정됨)" 표시가 없다', () => {
      render(
        <LogItem log={makeLog()} projectId="proj-1" onUpdated={onUpdated} />,
      );
      expect(screen.queryByText('(수정됨)')).not.toBeInTheDocument();
    });

    it('아이콘을 표시한다', () => {
      render(
        <LogItem log={makeLog()} projectId="proj-1" onUpdated={onUpdated} />,
      );
      expect(screen.getAllByTestId('mock-icon').length).toBeGreaterThan(0);
    });
  });

  describe('긴 내용 펼치기/접기', () => {
    it('내용이 150자 초과 시 잘라서 표시한다', () => {
      render(
        <LogItem
          log={makeLog({ content: longContent })}
          projectId="proj-1"
          onUpdated={onUpdated}
        />,
      );
      expect(screen.getByText(/\.\.\.$/)).toBeInTheDocument();
      expect(screen.getByText('더 보기')).toBeInTheDocument();
    });

    it('"더 보기" 클릭 시 전체 내용을 표시한다', async () => {
      const user = userEvent.setup();
      render(
        <LogItem
          log={makeLog({ content: longContent })}
          projectId="proj-1"
          onUpdated={onUpdated}
        />,
      );

      await user.click(screen.getByText('더 보기'));
      expect(screen.getByText(longContent)).toBeInTheDocument();
      expect(screen.getByText('접기')).toBeInTheDocument();
    });

    it('"접기" 클릭 시 다시 잘라서 표시한다', async () => {
      const user = userEvent.setup();
      render(
        <LogItem
          log={makeLog({ content: longContent })}
          projectId="proj-1"
          onUpdated={onUpdated}
        />,
      );

      await user.click(screen.getByText('더 보기'));
      await user.click(screen.getByText('접기'));
      expect(screen.getByText(/\.\.\.$/)).toBeInTheDocument();
    });
  });

  describe('수정 기능', () => {
    it('더보기 메뉴에서 수정을 선택하면 편집 모드로 전환된다', async () => {
      const user = userEvent.setup();
      render(
        <LogItem log={makeLog()} projectId="proj-1" onUpdated={onUpdated} />,
      );

      await user.click(screen.getByTestId('more-actions-button'));
      await user.click(screen.getByText('수정'));

      expect(screen.getByRole('textbox')).toBeInTheDocument();
      expect(screen.getByText('저장')).toBeInTheDocument();
      expect(screen.getByText('취소')).toBeInTheDocument();
    });

    it('취소 버튼 클릭 시 편집 모드가 해제된다', async () => {
      const user = userEvent.setup();
      render(
        <LogItem log={makeLog()} projectId="proj-1" onUpdated={onUpdated} />,
      );

      await user.click(screen.getByTestId('more-actions-button'));
      await user.click(screen.getByText('수정'));
      await user.click(screen.getByText('취소'));

      expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    });

    it('저장 성공 시 onUpdated가 호출된다', async () => {
      mockUpdateActivityLog.mockResolvedValue({ success: true });
      const user = userEvent.setup();
      render(
        <LogItem log={makeLog()} projectId="proj-1" onUpdated={onUpdated} />,
      );

      await user.click(screen.getByTestId('more-actions-button'));
      await user.click(screen.getByText('수정'));
      await user.click(screen.getByText('저장'));

      await waitFor(() => {
        expect(onUpdated).toHaveBeenCalled();
      });
    });
  });

  describe('삭제 기능', () => {
    it('삭제 성공 시 onUpdated가 호출된다', async () => {
      mockDeleteActivityLog.mockResolvedValue({ success: true });
      const user = userEvent.setup();
      render(
        <LogItem log={makeLog()} projectId="proj-1" onUpdated={onUpdated} />,
      );

      await user.click(screen.getByTestId('more-actions-button'));
      await user.click(screen.getByText('삭제'));

      await waitFor(() => {
        expect(mockDeleteActivityLog).toHaveBeenCalledWith('log-1', 'proj-1');
        expect(onUpdated).toHaveBeenCalled();
      });
    });

    it('confirm 취소 시 삭제가 실행되지 않는다', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);
      const user = userEvent.setup();
      render(
        <LogItem log={makeLog()} projectId="proj-1" onUpdated={onUpdated} />,
      );

      await user.click(screen.getByTestId('more-actions-button'));
      await user.click(screen.getByText('삭제'));

      expect(mockDeleteActivityLog).not.toHaveBeenCalled();
    });
  });
});
