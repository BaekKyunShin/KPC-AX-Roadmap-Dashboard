import { render, screen, act, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import UserManagementTable from './UserManagementTable';
import type { User, ConsultantProfile } from '@/types/database';

// =============================================================================
// Mocks
// =============================================================================

const mockRefresh = vi.fn();
const mockReplace = vi.fn();
const mockSearchParams = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh, replace: mockReplace, push: vi.fn(), back: vi.fn() }),
  useSearchParams: () => mockSearchParams,
  usePathname: () => '/ops/users',
}));

// 디바운스를 우회 — 입력 즉시 반영되어 테스트 단순화 (실제 동작은 300ms)
vi.mock('@/hooks/useDebounce', () => ({
  useDebounce: <T,>(value: T) => value,
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

  // #003 회귀 — 본인이 목록에 표시되며, 본인 행은 액션 버튼 대신 "본인" 뱃지를 노출.
  describe('#003 — 본인 행 표시 + 액션 가드', () => {
    it('currentUserId 와 일치하는 행은 액션 버튼 대신 "본인" 뱃지가 노출된다', () => {
      const me = makeUser({
        id: 'me-1',
        role: 'OPS_ADMIN',
        status: 'ACTIVE',
        name: '나운영',
      });
      const other = makeUser({
        id: 'other-1',
        role: 'CONSULTANT_APPROVED',
        status: 'ACTIVE',
        name: '다른컨설턴트',
      });
      render(<UserManagementTable users={[me, other]} currentUserId="me-1" />);

      const table = getTable();
      // 본인 행에 "본인" 뱃지
      expect(table.getByTestId('self-row-marker')).toBeInTheDocument();
      // 본인 액션 버튼이 노출되지 않아야 함 (정지·승인·활성화 모두)
      // — getAllByText('정지') 는 다른 사용자에게서 1번 등장 가능, 본인 행에 0건이 핵심.
      const meRow = table.getByText('나운영').closest('tr');
      expect(meRow).not.toBeNull();
      expect(within(meRow as HTMLElement).queryByText('정지')).toBeNull();
      expect(within(meRow as HTMLElement).queryByText('승인')).toBeNull();
      expect(within(meRow as HTMLElement).queryByText('활성화')).toBeNull();
    });

    it('currentUserId 미지정 시 기존 동작 유지 (모든 사용자에 액션 버튼 표시)', () => {
      render(
        <UserManagementTable users={[makeUser({ role: 'CONSULTANT_APPROVED' })]} />,
      );
      // 정지 버튼이 정상 노출 (currentUserId 없음 → self 가드 미적용)
      expect(getTable().getByText('정지')).toBeInTheDocument();
      expect(screen.queryByTestId('self-row-marker')).toBeNull();
    });

    it('본인이 SYSTEM_ADMIN 일 때도 액션 버튼이 숨겨진다', () => {
      const sysadmin = makeUser({
        id: 'sys-1',
        role: 'SYSTEM_ADMIN',
        name: '시스템관리자',
      });
      render(<UserManagementTable users={[sysadmin]} currentUserId="sys-1" />);
      const table = getTable();
      expect(table.getByTestId('self-row-marker')).toBeInTheDocument();
      expect(table.queryByText('정지')).toBeNull();
    });
  });

  // #006 회귀 — 데스크톱 셀의 긴 이메일이 단어 단위로 줄바꿈되어 임의 위치에서
  // 끊어지지 않도록 break-all 클래스 적용.
  it('#006: 데스크톱 이메일 셀에 break-all 클래스가 적용된다', () => {
    render(
      <UserManagementTable
        users={[makeUser({ email: 'audit-c-20260428@test.com' })]}
      />,
    );
    const desktopEmail = getTable().getByTestId('user-email-desktop');
    expect(desktopEmail).toHaveClass('break-all');
    expect(desktopEmail).toHaveTextContent('audit-c-20260428@test.com');
  });

  // #4 — 운영관리 빈 목록 EmptyState 통일
  describe('빈 상태 EmptyState (#4)', () => {
    it('users 배열이 비었을 때 EmptyState 제목·설명을 노출하고 액션 링크는 없어야 한다', () => {
      render(<UserManagementTable users={[]} currentUserId="x" />);
      // 제목·설명은 EmptyState 가 데스크톱·모바일 양쪽에 렌더링됨 (jsdom 미디어쿼리 미지원)
      const titles = screen.getAllByText('등록된 사용자가 없습니다');
      expect(titles.length).toBeGreaterThan(0);
      const descs = screen.getAllByText(/사용자가 회원가입을 완료하면/);
      expect(descs.length).toBeGreaterThan(0);
      // 사용자 추가 흐름은 도메인과 불일치 — 액션 링크 없어야 함
      expect(screen.queryByRole('link', { name: /사용자 추가|새 사용자/ })).not.toBeInTheDocument();
    });
  });

  // =============================================================================
  // #1 — 검색 · 역할/상태 필터 · 페이지네이션 (Nielsen H6 · H7)
  // =============================================================================
  describe('검색 · 필터 · 페이지네이션 (#1)', () => {
    function makeUsers(): UserWithProfile[] {
      return [
        makeUser({ id: 'u1', name: '박철수', email: 'park@test.com', role: 'CONSULTANT_APPROVED', status: 'ACTIVE' }),
        makeUser({ id: 'u2', name: '김영희', email: 'kim@test.com', role: 'USER_PENDING', status: 'ACTIVE' }),
        makeUser({ id: 'u3', name: '이민수', email: 'lee@test.com', role: 'CONSULTANT_APPROVED', status: 'SUSPENDED' }),
        makeUser({ id: 'u4', name: '최지영', email: 'choi@test.com', role: 'OPS_ADMIN', status: 'ACTIVE' }),
      ];
    }

    it('검색 input·역할 select·상태 select 가 헤더에 노출된다', () => {
      render(<UserManagementTable users={makeUsers()} />);
      expect(screen.getByPlaceholderText(/이름·이메일·전화번호/)).toBeInTheDocument();
      expect(screen.getByLabelText(/역할 필터/)).toBeInTheDocument();
      expect(screen.getByLabelText(/상태 필터/)).toBeInTheDocument();
    });

    it('이름 검색 시 매칭 사용자만 노출된다', async () => {
      const user = (await import('@testing-library/user-event')).default.setup();
      render(<UserManagementTable users={makeUsers()} />);
      await user.type(screen.getByPlaceholderText(/이름·이메일·전화번호/), '박');
      expect(getTable().getByText('박철수')).toBeInTheDocument();
      expect(getTable().queryByText('김영희')).not.toBeInTheDocument();
      expect(getTable().queryByText('이민수')).not.toBeInTheDocument();
    });

    it('이메일 일부로 검색 시 매칭 사용자만 노출', async () => {
      const user = (await import('@testing-library/user-event')).default.setup();
      render(<UserManagementTable users={makeUsers()} />);
      await user.type(screen.getByPlaceholderText(/이름·이메일·전화번호/), 'kim@');
      expect(getTable().getByText('김영희')).toBeInTheDocument();
      expect(getTable().queryByText('박철수')).not.toBeInTheDocument();
    });

    it('11번째 사용자는 첫 페이지에 노출되지 않는다 (페이지당 10건)', () => {
      const many: UserWithProfile[] = Array.from({ length: 12 }, (_, i) =>
        makeUser({ id: `u${i + 1}`, name: `사용자${String(i + 1).padStart(2, '0')}`, email: `u${i + 1}@t.com` }),
      );
      render(<UserManagementTable users={many} />);
      expect(getTable().getByText('사용자01')).toBeInTheDocument();
      expect(getTable().getByText('사용자10')).toBeInTheDocument();
      expect(getTable().queryByText('사용자11')).not.toBeInTheDocument();
      expect(getTable().queryByText('사용자12')).not.toBeInTheDocument();
    });

    it('검색 결과 0건일 때 검색 결과 EmptyState 가 노출된다', async () => {
      const user = (await import('@testing-library/user-event')).default.setup();
      render(<UserManagementTable users={makeUsers()} />);
      await user.type(screen.getByPlaceholderText(/이름·이메일·전화번호/), '존재하지않는검색어ZZZ');
      expect(screen.getAllByText(/검색 결과가 없습니다/).length).toBeGreaterThan(0);
    });

    it('총 사용자 수 캡션이 페이지 정보와 함께 노출된다', () => {
      const many: UserWithProfile[] = Array.from({ length: 12 }, (_, i) =>
        makeUser({ id: `u${i + 1}`, name: `사용자${i + 1}`, email: `u${i + 1}@t.com` }),
      );
      render(<UserManagementTable users={many} />);
      // 예: "총 12명" 또는 "총 12명 중 1~10"
      expect(screen.getByText(/총\s*12\s*명/)).toBeInTheDocument();
    });
  });
});
