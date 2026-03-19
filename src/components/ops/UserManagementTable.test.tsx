import { render, screen, act, within } from '@testing-library/react';
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
// Helpers
// =============================================================================

/** Server Action이 수동으로 resolve 가능한 지연 Promise를 반환하도록 설정 */
function mockDeferredAction() {
  let resolve!: (value: { success: true }) => void;
  mockUpdateUserStatus.mockReturnValue(new Promise((r) => { resolve = r; }));
  return () => resolve({ success: true });
}

/**
 * 데스크톱 테이블 컨테이너를 반환한다.
 * 모바일 카드 뷰도 동시에 DOM에 렌더링되므로(jsdom은 CSS 미디어쿼리 미지원),
 * 쿼리 범위를 테이블로 제한하여 중복 요소 문제를 방지한다.
 */
function getTable() {
  return within(screen.getByRole('table'));
}

// =============================================================================
// Tests
// =============================================================================

describe('UserManagementTable', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('액션 성공 후 users prop이 갱신될 때까지 "처리 중..." 상태를 유지한다', async () => {
    // Arrange: ACTIVE 상태의 CONSULTANT_APPROVED 사용자 → "정지" 버튼 표시
    const resolveAction = mockDeferredAction();

    const initialUsers = [makeUser()];
    const { rerender } = render(<UserManagementTable users={initialUsers} />);

    // "정지" 버튼이 보이는지 확인
    expect(getTable().getByText('정지')).toBeInTheDocument();

    // Act: "정지" 버튼 클릭
    await act(async () => {
      getTable().getByText('정지').click();
    });

    // Assert: "처리 중..." 표시
    expect(getTable().getByText('처리 중...')).toBeInTheDocument();
    expect(getTable().queryByText('정지')).not.toBeInTheDocument();

    // Act: Server Action 성공 반환
    await act(async () => {
      resolveAction();
    });

    // Assert: router.refresh() 완료 전이므로 여전히 "처리 중..." 상태
    expect(getTable().queryByText('정지')).not.toBeInTheDocument();

    // Act: users prop 갱신 (router.refresh() 완료를 시뮬레이션)
    const updatedUsers = [makeUser({ status: 'SUSPENDED' })];
    rerender(<UserManagementTable users={updatedUsers} />);

    // Assert: 이제 "활성화" 버튼이 표시됨
    expect(getTable().getByText('활성화')).toBeInTheDocument();
    expect(getTable().queryByText('처리 중...')).not.toBeInTheDocument();
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
      getTable().getByText('정지').click();
    });

    // Assert: 실패 시 바로 "정지" 버튼이 다시 표시됨
    expect(getTable().getByText('정지')).toBeInTheDocument();
    // 에러 메시지는 테이블 밖에 렌더링되므로 screen으로 조회
    expect(screen.getByText('처리에 실패했습니다.')).toBeInTheDocument();
  });

  it('테이블 헤더에 올바른 칼럼명을 표시한다', () => {
    render(<UserManagementTable users={[makeUser()]} />);

    const table = getTable();
    expect(table.getByText('사용자')).toBeInTheDocument();
    expect(table.getByText('역할')).toBeInTheDocument();
    expect(table.getByText('상태')).toBeInTheDocument();
    expect(table.getByText('프로필')).toBeInTheDocument();
    expect(table.getByText('가입일')).toBeInTheDocument();
    expect(table.getByText('관리')).toBeInTheDocument();
  });

  it('역할에 따라 올바른 뱃지 라벨을 표시한다', () => {
    const users = [
      makeUser({ id: 'u1', role: 'CONSULTANT_APPROVED', name: '컨설턴트A' }),
      makeUser({ id: 'u2', role: 'USER_PENDING', name: '대기자B' }),
      makeUser({ id: 'u3', role: 'OPS_ADMIN_PENDING', name: '운영대기C' }),
      makeUser({ id: 'u4', role: 'OPS_ADMIN', name: '운영관리자D' }),
      makeUser({ id: 'u5', role: 'SYSTEM_ADMIN', name: '시스템관리자E' }),
    ];
    render(<UserManagementTable users={users} />);

    const table = getTable();
    expect(table.getByText('컨설턴트')).toBeInTheDocument();
    expect(table.getByText('컨설턴트 (승인 대기)')).toBeInTheDocument();
    expect(table.getByText('운영관리자 (승인 대기)')).toBeInTheDocument();
    expect(table.getByText('운영관리자')).toBeInTheDocument();
    expect(table.getByText('시스템관리자')).toBeInTheDocument();
  });

  it('승인 액션 성공 후 users prop 갱신까지 "처리 중..." 유지한다', async () => {
    // Arrange: USER_PENDING 상태 → "승인" 버튼
    const resolveAction = mockDeferredAction();

    const pendingUser = makeUser({ role: 'USER_PENDING', status: 'ACTIVE' });
    const { rerender } = render(<UserManagementTable users={[pendingUser]} />);

    expect(getTable().getByText('승인')).toBeInTheDocument();

    // Act: "승인" 클릭
    await act(async () => {
      getTable().getByText('승인').click();
    });

    expect(getTable().getByText('처리 중...')).toBeInTheDocument();

    // Act: 성공 반환
    await act(async () => {
      resolveAction();
    });

    // Assert: 여전히 "처리 중..." (승인 버튼으로 깜빡이지 않음)
    expect(getTable().queryByText('승인')).not.toBeInTheDocument();

    // Act: prop 갱신 (승인 완료 → CONSULTANT_APPROVED)
    const approvedUser = makeUser({ role: 'CONSULTANT_APPROVED', status: 'ACTIVE' });
    rerender(<UserManagementTable users={[approvedUser]} />);

    // Assert: 이제 "정지" 버튼 (ACTIVE 상태의 승인된 컨설턴트)
    expect(getTable().getByText('정지')).toBeInTheDocument();
  });
});
