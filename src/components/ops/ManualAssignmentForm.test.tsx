import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ManualAssignmentForm from './ManualAssignmentForm';
import type { ConsultantCandidate } from '@/app/(dashboard)/ops/projects/actions';

// ============================================================================
// 모킹
// ============================================================================

const mockPush = vi.fn();
const mockRefresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
  }),
  usePathname: () => '/ops/projects',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

const mockAssignConsultant = vi.fn();
vi.mock('@/app/(dashboard)/ops/projects/actions', () => ({
  assignConsultant: (...args: unknown[]) => mockAssignConsultant(...args),
  fetchConsultantCandidates: vi.fn().mockResolvedValue({
    consultants: [],
    total: 0,
    totalPages: 0,
    page: 1,
  }),
  fetchConsultantFilterOptions: vi.fn().mockResolvedValue({
    industries: [],
    skills: [],
  }),
}));

vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

// ConsultantSelector를 모킹하여 선택 동작을 시뮬레이션
let _mockOnSelect: ((consultant: ConsultantCandidate | null) => void) | null =
  null;
vi.mock('./ConsultantSelector', () => ({
  default: ({
    onSelect,
  }: {
    selectedConsultantId: string | null;
    onSelect: (consultant: ConsultantCandidate | null) => void;
  }) => {
    _mockOnSelect = onSelect;
    return (
      <div data-testid="consultant-selector">
        <button
          type="button"
          data-testid="select-consultant-btn"
          onClick={() =>
            onSelect({
              id: 'consultant-1',
              name: '김컨설턴트',
              email: 'kim@test.com',
              consultant_profile: null,
            })
          }
        >
          김컨설턴트 선택
        </button>
        <button
          type="button"
          data-testid="select-consultant-2-btn"
          onClick={() =>
            onSelect({
              id: 'consultant-2',
              name: '이컨설턴트',
              email: 'lee@test.com',
              consultant_profile: null,
            })
          }
        >
          이컨설턴트 선택
        </button>
        <button
          type="button"
          data-testid="deselect-consultant-btn"
          onClick={() => onSelect(null)}
        >
          선택 해제
        </button>
      </div>
    );
  },
}));

// window.location.reload 모킹
const mockReload = vi.fn();
Object.defineProperty(window, 'location', {
  value: { ...window.location, reload: mockReload },
  writable: true,
});

// ============================================================================
// 테스트 데이터
// ============================================================================

const defaultProps = {
  projectId: 'project-123',
};

// ============================================================================
// 헬퍼
// ============================================================================

function renderForm(overrides = {}) {
  return render(<ManualAssignmentForm {...defaultProps} {...overrides} />);
}

async function selectConsultant(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByTestId('select-consultant-btn'));
}

async function enterReason(
  user: ReturnType<typeof userEvent.setup>,
  text: string
) {
  const textarea = screen.getByPlaceholderText(
    '해당 컨설턴트를 배정하는 사유를 입력해주세요.'
  );
  await user.type(textarea, text);
}

// ============================================================================
// 테스트
// ============================================================================

describe('ManualAssignmentForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAssignConsultant.mockResolvedValue({ success: true });
    _mockOnSelect = null;
  });

  // --------------------------------------------------------------------------
  // 초기 렌더링
  // --------------------------------------------------------------------------

  describe('초기 렌더링', () => {
    it('컨설턴트 선택 라벨이 표시된다', () => {
      renderForm();
      expect(
        screen.getByText(/배정할 컨설턴트 선택/)
      ).toBeInTheDocument();
    });

    it('ConsultantSelector가 렌더링된다', () => {
      renderForm();
      expect(screen.getByTestId('consultant-selector')).toBeInTheDocument();
    });

    it('컨설턴트 미선택 시 배정 사유 입력이 숨겨진다', () => {
      renderForm();
      expect(
        screen.queryByPlaceholderText(
          '해당 컨설턴트를 배정하는 사유를 입력해주세요.'
        )
      ).not.toBeInTheDocument();
    });

    it('초기에 에러 메시지가 없다', () => {
      renderForm();
      expect(
        screen.queryByText('배정할 컨설턴트를 선택하세요.')
      ).not.toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 컨설턴트 선택
  // --------------------------------------------------------------------------

  describe('컨설턴트 선택', () => {
    it('컨설턴트 선택 시 배정 사유 입력이 나타난다', async () => {
      const user = userEvent.setup();
      renderForm();

      await selectConsultant(user);

      expect(
        screen.getByPlaceholderText(
          '해당 컨설턴트를 배정하는 사유를 입력해주세요.'
        )
      ).toBeInTheDocument();
    });

    it('컨설턴트 선택 시 배정하기 버튼이 나타난다', async () => {
      const user = userEvent.setup();
      renderForm();

      await selectConsultant(user);

      expect(
        screen.getByRole('button', { name: '배정하기' })
      ).toBeInTheDocument();
    });

    it('다른 컨설턴트를 선택하면 에러가 초기화된다', async () => {
      const user = userEvent.setup();
      renderForm();

      await selectConsultant(user);

      // 에러가 없는 상태 확인
      expect(
        screen.queryByText('배정할 컨설턴트를 선택하세요.')
      ).not.toBeInTheDocument();
    });

    it('컨설턴트 선택 해제 시 배정 사유 입력이 사라진다', async () => {
      const user = userEvent.setup();
      renderForm();

      await selectConsultant(user);
      expect(
        screen.getByPlaceholderText(
          '해당 컨설턴트를 배정하는 사유를 입력해주세요.'
        )
      ).toBeInTheDocument();

      await user.click(screen.getByTestId('deselect-consultant-btn'));

      expect(
        screen.queryByPlaceholderText(
          '해당 컨설턴트를 배정하는 사유를 입력해주세요.'
        )
      ).not.toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 배정 사유 입력
  // --------------------------------------------------------------------------

  describe('배정 사유 입력', () => {
    it('배정 사유를 입력할 수 있다', async () => {
      const user = userEvent.setup();
      renderForm();

      await selectConsultant(user);
      await enterReason(user, '이 컨설턴트가 적합합니다.');

      const textarea = screen.getByPlaceholderText(
        '해당 컨설턴트를 배정하는 사유를 입력해주세요.'
      );
      expect(textarea).toHaveValue('이 컨설턴트가 적합합니다.');
    });

    it('글자수 카운터가 표시된다', async () => {
      const user = userEvent.setup();
      renderForm();

      await selectConsultant(user);

      // 초기: 0/500
      expect(screen.getByText(/0\/500/)).toBeInTheDocument();
    });

    it('최소 글자수 미만이면 안내 메시지가 표시된다', async () => {
      const user = userEvent.setup();
      renderForm();

      await selectConsultant(user);
      await enterReason(user, '짧은');

      // "N자 더" 표시
      expect(screen.getByText(/자 더/)).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 검증
  // --------------------------------------------------------------------------

  describe('검증', () => {
    it('배정 사유가 최소 글자수 미만이면 버튼이 비활성화된다', async () => {
      const user = userEvent.setup();
      renderForm();

      await selectConsultant(user);
      await enterReason(user, '짧은사유');

      const submitButton = screen.getByRole('button', { name: '배정하기' });
      expect(submitButton).toBeDisabled();
    });

    it('배정 사유가 10자 이상이면 버튼이 활성화된다', async () => {
      const user = userEvent.setup();
      renderForm();

      await selectConsultant(user);
      await enterReason(user, '이 컨설턴트는 해당 프로젝트에 매우 적합합니다.');

      const submitButton = screen.getByRole('button', { name: '배정하기' });
      expect(submitButton).not.toBeDisabled();
    });
  });

  // --------------------------------------------------------------------------
  // 제출
  // --------------------------------------------------------------------------

  describe('제출', () => {
    it('성공적으로 배정하면 페이지가 리로드된다', async () => {
      const user = userEvent.setup();
      renderForm();

      await selectConsultant(user);
      await enterReason(user, '이 컨설턴트는 제조업 AI 전문가로 적합합니다.');

      const submitButton = screen.getByRole('button', { name: '배정하기' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockAssignConsultant).toHaveBeenCalledTimes(1);
      });

      await waitFor(() => {
        expect(mockReload).toHaveBeenCalledTimes(1);
      });
    });

    it('제출 시 FormData에 올바른 값이 전달된다', async () => {
      const user = userEvent.setup();
      renderForm();

      await selectConsultant(user);
      await enterReason(user, '이 컨설턴트는 해당 분야에 전문 경험이 풍부합니다.');

      const submitButton = screen.getByRole('button', { name: '배정하기' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockAssignConsultant).toHaveBeenCalledTimes(1);
      });

      const formData = mockAssignConsultant.mock.calls[0][0] as FormData;
      expect(formData.get('project_id')).toBe('project-123');
      expect(formData.get('consultant_id')).toBe('consultant-1');
      expect(formData.get('assignment_reason')).toBe(
        '이 컨설턴트는 해당 분야에 전문 경험이 풍부합니다.'
      );
    });

    it('제출 실패 시 에러 메시지가 표시된다', async () => {
      mockAssignConsultant.mockResolvedValue({
        success: false,
        error: '이미 배정된 프로젝트입니다.',
      });

      const user = userEvent.setup();
      renderForm();

      await selectConsultant(user);
      await enterReason(user, '이 컨설턴트는 해당 분야에 전문 경험이 풍부합니다.');

      const submitButton = screen.getByRole('button', { name: '배정하기' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText('이미 배정된 프로젝트입니다.')
        ).toBeInTheDocument();
      });
    });

    it('제출 실패 시 에러 메시지가 없으면 기본 메시지를 표시한다', async () => {
      mockAssignConsultant.mockResolvedValue({
        success: false,
      });

      const user = userEvent.setup();
      renderForm();

      await selectConsultant(user);
      await enterReason(user, '이 컨설턴트는 해당 분야에 전문 경험이 풍부합니다.');

      const submitButton = screen.getByRole('button', { name: '배정하기' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText('배정에 실패했습니다.')
        ).toBeInTheDocument();
      });
    });

    it('제출 중 예외 발생 시 에러 메시지가 표시된다', async () => {
      mockAssignConsultant.mockRejectedValue(new Error('Network error'));

      const user = userEvent.setup();
      renderForm();

      await selectConsultant(user);
      await enterReason(user, '이 컨설턴트는 해당 분야에 전문 경험이 풍부합니다.');

      const submitButton = screen.getByRole('button', { name: '배정하기' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText(
            '배정 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
          )
        ).toBeInTheDocument();
      });
    });

    it('제출 중에는 버튼이 비활성화되고 로딩 텍스트가 표시된다', async () => {
      // 제출을 지연시키기 위해 Promise를 pending 상태로 유지
      let resolvePromise: (value: unknown) => void;
      mockAssignConsultant.mockReturnValue(
        new Promise((resolve) => {
          resolvePromise = resolve;
        })
      );

      const user = userEvent.setup();
      renderForm();

      await selectConsultant(user);
      await enterReason(user, '이 컨설턴트는 해당 분야에 전문 경험이 풍부합니다.');

      const submitButton = screen.getByRole('button', { name: '배정하기' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('배정 중...')).toBeInTheDocument();
      });

      // Promise 해제
      resolvePromise!({ success: true });
    });
  });

  // --------------------------------------------------------------------------
  // 에러 닫기
  // --------------------------------------------------------------------------

  describe('에러 닫기', () => {
    it('에러 메시지의 닫기 버튼을 클릭하면 에러가 사라진다', async () => {
      mockAssignConsultant.mockResolvedValue({
        success: false,
        error: '배정 실패',
      });

      const user = userEvent.setup();
      renderForm();

      await selectConsultant(user);
      await enterReason(user, '이 컨설턴트는 해당 분야에 전문 경험이 풍부합니다.');

      const submitButton = screen.getByRole('button', { name: '배정하기' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('배정 실패')).toBeInTheDocument();
      });

      // AlertMessage의 닫기 버튼 클릭 (CloseIcon 버튼)
      const closeButton = screen
        .getByText('배정 실패')
        .closest('div')!
        .querySelector('button')!;
      await user.click(closeButton);

      expect(screen.queryByText('배정 실패')).not.toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 컨설턴트 변경
  // --------------------------------------------------------------------------

  describe('컨설턴트 변경', () => {
    it('다른 컨설턴트를 선택하면 이전 선택이 교체된다', async () => {
      const user = userEvent.setup();
      renderForm();

      await selectConsultant(user);
      await enterReason(user, '이 컨설턴트는 해당 분야에 전문 경험이 풍부합니다.');

      // 다른 컨설턴트 선택
      await user.click(screen.getByTestId('select-consultant-2-btn'));

      const submitButton = screen.getByRole('button', { name: '배정하기' });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockAssignConsultant).toHaveBeenCalledTimes(1);
      });

      const formData = mockAssignConsultant.mock.calls[0][0] as FormData;
      expect(formData.get('consultant_id')).toBe('consultant-2');
    });
  });
});
