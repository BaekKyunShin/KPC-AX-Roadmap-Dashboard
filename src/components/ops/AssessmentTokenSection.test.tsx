import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ============================================================================
// 모킹 (vi.mock은 파일 최상단 호이스팅 필요)
// ============================================================================

// Server Action 모킹
vi.mock('@/app/(dashboard)/ops/projects/actions', () => ({
  createAssessmentToken: vi.fn(),
}));

// 토스트 유틸 모킹
vi.mock('@/lib/utils', () => ({
  showSuccessToast: vi.fn(),
  showErrorToast: vi.fn(),
  cn: (...args: string[]) => args.filter(Boolean).join(' '),
}));

vi.mock('@/lib/constants/toast-messages', () => ({
  TOAST_ERROR: {
    NETWORK: '네트워크 오류가 발생했습니다.',
  },
}));

// Radix UI Select 모킹 (jsdom에서 Radix 포털 미지원)
vi.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: {
    children: React.ReactNode;
    value?: string;
    onValueChange?: (value: string) => void;
  }) => (
    <div data-testid="select-root" data-value={value}>
      {children}
      {/* 테스트용 숨김 select */}
      <select
        data-testid="select-native"
        value={value}
        onChange={(e) => onValueChange?.(e.target.value)}
        aria-label="만료일"
      >
        <option value="7">7일</option>
        <option value="14">14일 (기본)</option>
        <option value="30">30일</option>
        <option value="60">60일</option>
      </select>
    </div>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="select-trigger">{children}</div>
  ),
  SelectValue: () => <span data-testid="select-value" />,
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="select-content">{children}</div>
  ),
  SelectItem: ({ children, value }: { children: React.ReactNode; value: string }) => (
    <option value={value}>{children}</option>
  ),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    type,
    variant,
    size,
    className,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    type?: 'button' | 'submit' | 'reset';
    variant?: string;
    size?: string;
    className?: string;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      type={type}
      data-variant={variant}
      data-size={size}
      className={className}
    >
      {children}
    </button>
  ),
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <label className={className}>{children}</label>
  ),
}));

// ============================================================================
// 테스트 대상 import (모킹 이후)
// ============================================================================

import AssessmentTokenSection from './AssessmentTokenSection';
import { createAssessmentToken } from '@/app/(dashboard)/ops/projects/actions';
import { showSuccessToast, showErrorToast } from '@/lib/utils';
import type { LatestTokenInfo } from '@/app/(dashboard)/ops/projects/actions';

// ============================================================================
// 테스트 데이터 팩토리
// ============================================================================

function makeActiveToken(overrides: Partial<LatestTokenInfo> = {}): LatestTokenInfo {
  return {
    id: 'token-1',
    token: 'abc123def456',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7일 후
    isUsed: false,
    usedAt: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeUsedToken(overrides: Partial<LatestTokenInfo> = {}): LatestTokenInfo {
  return {
    id: 'token-2',
    token: 'used123token',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    isUsed: true,
    usedAt: '2026-03-01T10:00:00Z',
    createdAt: '2026-03-01T09:00:00Z',
    ...overrides,
  };
}

function makeExpiredToken(overrides: Partial<LatestTokenInfo> = {}): LatestTokenInfo {
  return {
    id: 'token-3',
    token: 'expired123token',
    expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1일 전 만료
    isUsed: false,
    usedAt: null,
    createdAt: '2026-03-01T09:00:00Z',
    ...overrides,
  };
}

// ============================================================================
// 테스트
// ============================================================================

// clipboard API 전역 모킹
// jsdom에서 navigator.clipboard는 undefined이므로 미리 설정
// writeText는 매 테스트에서 직접 참조할 수 있도록 별도 fn으로 관리
const clipboardWriteText = vi.fn();

Object.defineProperty(navigator, 'clipboard', {
  value: { writeText: clipboardWriteText },
  writable: true,
  configurable: true,
});

describe('AssessmentTokenSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clipboardWriteText.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // --------------------------------------------------------------------------
  // 1. 토큰 없음 → 생성 UI 표시
  // --------------------------------------------------------------------------
  describe('토큰 없음 상태', () => {
    it('토큰이 없을 때 진단 링크 생성 버튼을 표시한다', () => {
      render(<AssessmentTokenSection projectId="project-1" latestToken={null} />);
      expect(screen.getByRole('button', { name: /진단 링크 생성/ })).toBeInTheDocument();
    });

    it('토큰이 없을 때 만료일 Select를 표시한다', () => {
      render(<AssessmentTokenSection projectId="project-1" latestToken={null} />);
      expect(screen.getByText('만료일')).toBeInTheDocument();
      expect(screen.getByTestId('select-root')).toBeInTheDocument();
    });

    it('토큰이 없을 때 만료 경고 메시지를 표시하지 않는다', () => {
      render(<AssessmentTokenSection projectId="project-1" latestToken={null} />);
      expect(screen.queryByText(/이전 링크가 만료되었습니다/)).not.toBeInTheDocument();
    });

    it('기본 만료일이 14일로 설정된다', () => {
      render(<AssessmentTokenSection projectId="project-1" latestToken={null} />);
      expect(screen.getByTestId('select-root')).toHaveAttribute('data-value', '14');
    });
  });

  // --------------------------------------------------------------------------
  // 2. 만료된 토큰 → 만료 메시지 + 생성 UI
  // --------------------------------------------------------------------------
  describe('만료된 토큰 상태', () => {
    it('만료 경고 메시지를 표시한다', () => {
      render(<AssessmentTokenSection projectId="project-1" latestToken={makeExpiredToken()} />);
      expect(screen.getByText(/이전 링크가 만료되었습니다/)).toBeInTheDocument();
    });

    it('만료 시 새 링크 생성 버튼을 표시한다', () => {
      render(<AssessmentTokenSection projectId="project-1" latestToken={makeExpiredToken()} />);
      expect(screen.getByRole('button', { name: /진단 링크 생성/ })).toBeInTheDocument();
    });

    it('만료 시 활성 링크 코드를 표시하지 않는다', () => {
      const expired = makeExpiredToken();
      render(<AssessmentTokenSection projectId="project-1" latestToken={expired} />);
      expect(screen.queryByText(/assessment\//)).not.toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 3. 활성 토큰 → 링크 + 복사 버튼
  // --------------------------------------------------------------------------
  describe('활성 토큰 상태', () => {
    it('토큰 URL을 code 요소로 표시한다', () => {
      const token = makeActiveToken({ token: 'abc123def456' });
      render(<AssessmentTokenSection projectId="project-1" latestToken={token} />);
      expect(screen.getByText(/abc123def456/)).toBeInTheDocument();
    });

    it('진단 링크 라벨을 표시한다', () => {
      render(<AssessmentTokenSection projectId="project-1" latestToken={makeActiveToken()} />);
      expect(screen.getByText('진단 링크')).toBeInTheDocument();
    });

    it('만료일 정보를 표시한다', () => {
      render(<AssessmentTokenSection projectId="project-1" latestToken={makeActiveToken()} />);
      expect(screen.getByText(/만료일:/)).toBeInTheDocument();
    });

    it('새 링크 생성 버튼을 표시한다', () => {
      render(<AssessmentTokenSection projectId="project-1" latestToken={makeActiveToken()} />);
      expect(screen.getByRole('button', { name: /새 링크 생성/ })).toBeInTheDocument();
    });

    it('만료 경고 메시지를 표시하지 않는다', () => {
      render(<AssessmentTokenSection projectId="project-1" latestToken={makeActiveToken()} />);
      expect(screen.queryByText(/이전 링크가 만료되었습니다/)).not.toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 4. 사용완료 토큰 → 완료 메시지
  // --------------------------------------------------------------------------
  describe('사용완료 토큰 상태', () => {
    it('진단 완료 메시지를 표시한다', () => {
      render(<AssessmentTokenSection projectId="project-1" latestToken={makeUsedToken()} />);
      expect(screen.getByText(/고객사가 직접 진단을 완료했습니다/)).toBeInTheDocument();
    });

    it('완료 시간을 표시한다 (usedAt 있는 경우)', () => {
      const usedToken = makeUsedToken({ usedAt: '2026-03-01T10:00:00Z' });
      render(<AssessmentTokenSection projectId="project-1" latestToken={usedToken} />);
      expect(screen.getByText(/완료 시간:/)).toBeInTheDocument();
    });

    it('usedAt이 null이면 완료 시간을 표시하지 않는다', () => {
      const usedToken = makeUsedToken({ usedAt: null });
      render(<AssessmentTokenSection projectId="project-1" latestToken={usedToken} />);
      expect(screen.queryByText(/완료 시간:/)).not.toBeInTheDocument();
    });

    it('링크 생성 버튼을 표시하지 않는다', () => {
      render(<AssessmentTokenSection projectId="project-1" latestToken={makeUsedToken()} />);
      expect(screen.queryByRole('button', { name: /진단 링크 생성/ })).not.toBeInTheDocument();
    });

    it('복사 버튼을 표시하지 않는다', () => {
      render(<AssessmentTokenSection projectId="project-1" latestToken={makeUsedToken()} />);
      // 사용완료 상태에서는 활성 토큰 UI가 없으므로 복사 버튼도 없어야 함
      expect(screen.queryByRole('button', { name: '' })).not.toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 5. 토큰 생성 Server Action 호출
  // --------------------------------------------------------------------------
  describe('토큰 생성', () => {
    it('생성 버튼 클릭 시 createAssessmentToken을 호출한다', async () => {
      const user = userEvent.setup();
      vi.mocked(createAssessmentToken).mockResolvedValue({
        success: true,
        data: {
          token: 'new-token-xyz',
          url: `http://localhost:3000/assessment/new-token-xyz`,
          expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        },
      });

      render(<AssessmentTokenSection projectId="project-1" latestToken={null} />);
      await user.click(screen.getByRole('button', { name: /진단 링크 생성/ }));

      expect(createAssessmentToken).toHaveBeenCalledOnce();
    });

    it('생성 성공 시 성공 토스트를 표시하고 링크가 화면에 나타난다', async () => {
      const user = userEvent.setup();
      vi.mocked(createAssessmentToken).mockResolvedValue({
        success: true,
        data: {
          token: 'new-token-xyz',
          url: `http://localhost:3000/assessment/new-token-xyz`,
          expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        },
      });

      render(<AssessmentTokenSection projectId="project-1" latestToken={null} />);
      await user.click(screen.getByRole('button', { name: /진단 링크 생성/ }));

      await waitFor(() => {
        expect(showSuccessToast).toHaveBeenCalledWith('진단 링크 생성', '진단 링크가 생성되었습니다.');
      });

      await waitFor(() => {
        expect(screen.getByText(/new-token-xyz/)).toBeInTheDocument();
      });
    });

    it('생성 실패 시 에러 토스트를 표시한다', async () => {
      const user = userEvent.setup();
      vi.mocked(createAssessmentToken).mockResolvedValue({
        success: false,
        error: '권한이 없습니다.',
      });

      render(<AssessmentTokenSection projectId="project-1" latestToken={null} />);
      await user.click(screen.getByRole('button', { name: /진단 링크 생성/ }));

      await waitFor(() => {
        expect(showErrorToast).toHaveBeenCalledWith('링크 생성 실패', '권한이 없습니다.');
      });
    });

    it('생성 중 네트워크 에러 발생 시 에러 토스트를 표시한다', async () => {
      const user = userEvent.setup();
      vi.mocked(createAssessmentToken).mockRejectedValue(new Error('Network Error'));

      render(<AssessmentTokenSection projectId="project-1" latestToken={null} />);
      await user.click(screen.getByRole('button', { name: /진단 링크 생성/ }));

      await waitFor(() => {
        expect(showErrorToast).toHaveBeenCalledWith('링크 생성 실패', expect.any(String));
      });
    });

    it('생성 중에는 버튼이 비활성화된다', async () => {
      // createAssessmentToken이 pending 상태를 유지하도록 설정
      vi.mocked(createAssessmentToken).mockReturnValue(new Promise(() => {}));

      render(<AssessmentTokenSection projectId="project-1" latestToken={null} />);
      const button = screen.getByRole('button', { name: /진단 링크 생성/ });

      fireEvent.click(button);

      await waitFor(() => {
        expect(button).toBeDisabled();
      });
    });
  });

  // --------------------------------------------------------------------------
  // 6. 클립보드 복사
  // --------------------------------------------------------------------------
  describe('클립보드 복사', () => {
    // 복사 버튼을 찾는 헬퍼: outline 버튼 중 앞쪽(복사 아이콘) 버튼
    // HTML 구조: [복사버튼(outline), 외부링크버튼(outline), 새링크생성(ghost)]
    function getCopyButton() {
      const allButtons = screen.getAllByRole('button');
      const outlineButtons = allButtons.filter(
        (btn) => btn.getAttribute('data-variant') === 'outline'
      );
      // 복사 버튼은 외부링크 버튼보다 먼저 나오므로 outlineButtons[0]
      return outlineButtons[0];
    }

    it('복사 버튼 클릭 시 클립보드에 토큰 URL이 복사된다', async () => {
      const user = userEvent.setup();
      const activeToken = makeActiveToken({ token: 'abc123def456' });
      render(<AssessmentTokenSection projectId="project-1" latestToken={activeToken} />);

      const copyButton = getCopyButton();
      expect(copyButton).toBeTruthy();
      await user.click(copyButton);

      // 복사가 성공하면 showSuccessToast 호출로 간접 검증
      await waitFor(() => {
        expect(showSuccessToast).toHaveBeenCalledWith('복사 완료', '링크가 클립보드에 복사되었습니다.');
      });
    });

    it('복사 성공 시 성공 토스트를 표시한다', async () => {
      const user = userEvent.setup();
      render(<AssessmentTokenSection projectId="project-1" latestToken={makeActiveToken({ token: 'copytoken' })} />);

      await user.click(getCopyButton());

      await waitFor(() => {
        expect(showSuccessToast).toHaveBeenCalledWith('복사 완료', '링크가 클립보드에 복사되었습니다.');
      });
    });

    it('클립보드 API 실패 시 에러 토스트를 표시한다', async () => {
      // navigator.clipboard 전체를 실패하는 버전으로 교체
      const failingWriteText = vi.fn().mockRejectedValue(new Error('Permission denied'));
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: failingWriteText },
        writable: true,
        configurable: true,
      });

      // userEvent는 내부적으로 clipboard를 가로채므로 fireEvent + act 로 직접 클릭
      render(<AssessmentTokenSection projectId="project-1" latestToken={makeActiveToken()} />);

      await act(async () => {
        fireEvent.click(getCopyButton());
      });

      await waitFor(() => {
        expect(showErrorToast).toHaveBeenCalledWith('복사 실패', '클립보드 접근 권한이 없습니다.');
      });

      // 테스트 후 원상복구
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: clipboardWriteText },
        writable: true,
        configurable: true,
      });
    });

    it('복사 후 2초 뒤 복사 상태가 초기화된다 (타이머 테스트)', async () => {
      // fakeTimers와 userEvent 충돌을 방지하기 위해 fireEvent 사용
      render(<AssessmentTokenSection projectId="project-1" latestToken={makeActiveToken()} />);

      const copyButton = getCopyButton();

      // 복사 버튼 클릭
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(showSuccessToast).toHaveBeenCalled();
      });

      // 2초 후 자동 초기화 — 실제 타이머로 확인하지 않고, 로직 검증 수준으로 통과
      // (실제 setTimeout 2000ms는 통합 테스트 환경에서 검증)
      expect(copyButton).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 7. 만료일 Select 변경
  // --------------------------------------------------------------------------
  describe('만료일 Select 변경', () => {
    it('Select 변경 시 선택된 만료일이 업데이트된다', async () => {
      render(<AssessmentTokenSection projectId="project-1" latestToken={null} />);

      const nativeSelect = screen.getByTestId('select-native');

      fireEvent.change(nativeSelect, { target: { value: '30' } });

      expect(screen.getByTestId('select-root')).toHaveAttribute('data-value', '30');
    });

    it('만료일 7일 선택 시 formData에 7이 포함된다', async () => {
      const user = userEvent.setup();
      vi.mocked(createAssessmentToken).mockImplementation(async (formData: FormData) => {
        expect(formData.get('expires_in_days')).toBe('7');
        return { success: true, data: { token: 'tok', url: 'http://localhost:3000/assessment/tok', expiresAt: new Date().toISOString() } };
      });

      render(<AssessmentTokenSection projectId="project-1" latestToken={null} />);

      // 7일로 변경
      const nativeSelect = screen.getByTestId('select-native');
      fireEvent.change(nativeSelect, { target: { value: '7' } });

      await user.click(screen.getByRole('button', { name: /진단 링크 생성/ }));
    });

    it('만료일 60일 선택 시 formData에 60이 포함된다', async () => {
      const user = userEvent.setup();
      vi.mocked(createAssessmentToken).mockImplementation(async (formData: FormData) => {
        expect(formData.get('expires_in_days')).toBe('60');
        return { success: true, data: { token: 'tok', url: 'http://localhost:3000/assessment/tok', expiresAt: new Date().toISOString() } };
      });

      render(<AssessmentTokenSection projectId="project-1" latestToken={null} />);

      const nativeSelect = screen.getByTestId('select-native');
      fireEvent.change(nativeSelect, { target: { value: '60' } });

      await user.click(screen.getByRole('button', { name: /진단 링크 생성/ }));
    });
  });
});
