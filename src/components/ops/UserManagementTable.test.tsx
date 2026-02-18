import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import UserManagementTable from './UserManagementTable';
import type { User, ConsultantProfile } from '@/types/database';

// =============================================================================
// Mocks
// =============================================================================

const mockRefresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh, push: vi.fn(), back: vi.fn() }),
}));

const mockUpdateUserStatus = vi.fn();
vi.mock('@/app/(auth)/actions', () => ({
  updateUserStatus: (...args: unknown[]) => mockUpdateUserStatus(...args),
}));

// =============================================================================
// Test Data
// =============================================================================

interface UserWithProfile extends User {
  consultant_profile: ConsultantProfile | null;
}

function makeUser(overrides: Partial<UserWithProfile> = {}): UserWithProfile {
  return {
    id: 'user-1',
    name: '테스트 사용자',
    email: 'test@test.com',
    phone: undefined,
    role: 'CONSULTANT_APPROVED',
    status: 'ACTIVE',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    consultant_profile: null,
    ...overrides,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('UserManagementTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('액션 성공 후 users prop이 갱신될 때까지 "처리 중..." 상태를 유지한다', async () => {
    // Arrange: ACTIVE 상태의 CONSULTANT_APPROVED 사용자 → "정지" 버튼 표시
    let resolveAction!: (value: { success: true }) => void;
    mockUpdateUserStatus.mockReturnValue(
      new Promise((resolve) => {
        resolveAction = resolve;
      }),
    );

    const initialUsers = [makeUser()];
    const { rerender } = render(<UserManagementTable users={initialUsers} />);

    // "정지" 버튼이 보이는지 확인
    expect(screen.getByText('정지')).toBeInTheDocument();

    // Act: "정지" 버튼 클릭
    await act(async () => {
      screen.getByText('정지').click();
    });

    // Assert: "처리 중..." 표시
    expect(screen.getByText('처리 중...')).toBeInTheDocument();
    expect(screen.queryByText('정지')).not.toBeInTheDocument();

    // Act: Server Action 성공 반환
    await act(async () => {
      resolveAction({ success: true });
    });

    // Assert (핵심!): router.refresh() 완료 전이므로 여전히 "처리 중..." 상태
    // BUG: 현재 코드에서는 setIsLoading(null)이 먼저 호출되어 "정지"가 다시 나타남
    expect(screen.queryByText('정지')).not.toBeInTheDocument();

    // Act: users prop 갱신 (router.refresh() 완료를 시뮬레이션)
    const updatedUsers = [makeUser({ status: 'SUSPENDED' })];
    rerender(<UserManagementTable users={updatedUsers} />);

    // Assert: 이제 "활성화" 버튼이 표시됨
    expect(screen.getByText('활성화')).toBeInTheDocument();
    expect(screen.queryByText('처리 중...')).not.toBeInTheDocument();
  });

  it('액션 실패 시 즉시 로딩 상태를 해제하고 원래 버튼을 표시한다', async () => {
    // Arrange
    mockUpdateUserStatus.mockResolvedValue({
      success: false,
      error: '처리에 실패했습니다.',
    });

    render(<UserManagementTable users={[makeUser()]} />);

    // Act: "정지" 버튼 클릭
    await act(async () => {
      screen.getByText('정지').click();
    });

    // Assert: 실패 시 바로 "정지" 버튼이 다시 표시됨
    expect(screen.getByText('정지')).toBeInTheDocument();
    expect(screen.getByText('처리에 실패했습니다.')).toBeInTheDocument();
  });

  it('승인 액션 성공 후 users prop 갱신까지 "처리 중..." 유지한다', async () => {
    // Arrange: USER_PENDING 상태 → "승인" 버튼
    let resolveAction!: (value: { success: true }) => void;
    mockUpdateUserStatus.mockReturnValue(
      new Promise((resolve) => {
        resolveAction = resolve;
      }),
    );

    const pendingUser = makeUser({ role: 'USER_PENDING', status: 'ACTIVE' });
    const { rerender } = render(<UserManagementTable users={[pendingUser]} />);

    expect(screen.getByText('승인')).toBeInTheDocument();

    // Act: "승인" 클릭
    await act(async () => {
      screen.getByText('승인').click();
    });

    expect(screen.getByText('처리 중...')).toBeInTheDocument();

    // Act: 성공 반환
    await act(async () => {
      resolveAction({ success: true });
    });

    // Assert: 여전히 "처리 중..." (승인 버튼으로 깜빡이지 않음)
    expect(screen.queryByText('승인')).not.toBeInTheDocument();

    // Act: prop 갱신 (승인 완료 → CONSULTANT_APPROVED)
    const approvedUser = makeUser({ role: 'CONSULTANT_APPROVED', status: 'ACTIVE' });
    rerender(<UserManagementTable users={[approvedUser]} />);

    // Assert: 이제 "정지" 버튼 (ACTIVE 상태의 승인된 컨설턴트)
    expect(screen.getByText('정지')).toBeInTheDocument();
  });
});
