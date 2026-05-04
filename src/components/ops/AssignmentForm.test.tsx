import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================================================
// 모킹
// ============================================================================

const mockRefresh = vi.fn();
const mockSuccessToast = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

vi.mock('@/lib/utils/toast', () => ({
  showSuccessToast: (...args: unknown[]) => mockSuccessToast(...args),
  showErrorToast: vi.fn(),
}));

vi.mock('@/app/(dashboard)/ops/projects/actions', () => ({
  assignConsultant: vi.fn(),
}));

vi.mock('./assignment', () => ({
  ReasonLengthHint: ({ currentLength }: { currentLength: number }) => (
    <span data-testid="reason-length-hint" data-length={currentLength}>
      {currentLength}자
    </span>
  ),
  REASON_LENGTH: {
    MIN: 10,
    MAX: 500,
  },
}));

// ============================================================================
// 테스트 대상 import
// ============================================================================

import AssignmentForm from './AssignmentForm';
import { assignConsultant } from '@/app/(dashboard)/ops/projects/actions';

// ============================================================================
// 테스트 데이터
// ============================================================================

function makeRecommendation(overrides: Record<string, unknown> = {}) {
  return {
    id: 'rec-1',
    candidate_user_id: 'consultant-1',
    total_score: 0.85,
    rank: 1,
    candidate: {
      id: 'consultant-1',
      name: '김컨설턴트',
      email: 'kim@test.com',
    },
    ...overrides,
  };
}

const defaultProps = {
  projectId: 'project-1',
  recommendations: [
    makeRecommendation(),
    makeRecommendation({
      id: 'rec-2',
      candidate_user_id: 'consultant-2',
      total_score: 0.72,
      rank: 2,
      candidate: {
        id: 'consultant-2',
        name: '이컨설턴트',
        email: 'lee@test.com',
      },
    }),
  ],
};

const emptyProps = {
  projectId: 'project-1',
  recommendations: [],
};

// ============================================================================
// 헬퍼 — AlertDialog 단계 통합
// ============================================================================

async function selectAndSubmit(
  user: ReturnType<typeof userEvent.setup>,
  reason = '이 컨설턴트가 가장 적합합니다.',
  radioIndex = 0,
) {
  const radios = screen.getAllByRole('radio');
  fireEvent.click(radios[radioIndex]);
  const textarea = screen.getByRole('textbox', { name: /배정 사유/ });
  await user.type(textarea, reason);
  await user.click(screen.getByRole('button', { name: /컨설턴트 배정/ }));
}

async function confirmAssign(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: '배정 확인' }));
}

// ============================================================================
// 테스트
// ============================================================================

describe('AssignmentForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRefresh.mockClear();
    mockSuccessToast.mockClear();
  });

  // --------------------------------------------------------------------------
  // 1. 기본 렌더링
  // --------------------------------------------------------------------------
  describe('기본 렌더링', () => {
    it('배정할 컨설턴트 선택 라벨을 표시한다', () => {
      render(<AssignmentForm {...defaultProps} />);
      expect(screen.getByText(/배정할 컨설턴트 선택/)).toBeInTheDocument();
    });

    it('배정 사유 textarea를 표시한다', () => {
      render(<AssignmentForm {...defaultProps} />);
      expect(screen.getByRole('textbox', { name: /배정 사유/ })).toBeInTheDocument();
    });

    it('컨설턴트 배정 버튼을 표시한다', () => {
      render(<AssignmentForm {...defaultProps} />);
      expect(screen.getByRole('button', { name: /컨설턴트 배정/ })).toBeInTheDocument();
    });

    it('추천 컨설턴트 목록을 렌더링한다', () => {
      render(<AssignmentForm {...defaultProps} />);
      expect(screen.getByText('김컨설턴트')).toBeInTheDocument();
      expect(screen.getByText('이컨설턴트')).toBeInTheDocument();
    });

    it('컨설턴트 이메일을 표시한다', () => {
      render(<AssignmentForm {...defaultProps} />);
      expect(screen.getByText('(kim@test.com)')).toBeInTheDocument();
      expect(screen.getByText('(lee@test.com)')).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 2. 빈 컨설턴트 목록
  // --------------------------------------------------------------------------
  describe('빈 컨설턴트 목록', () => {
    it('추천 목록이 비어있어도 폼 구조는 렌더링된다', () => {
      render(<AssignmentForm {...emptyProps} />);
      expect(screen.getByRole('textbox', { name: /배정 사유/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /컨설턴트 배정/ })).toBeInTheDocument();
    });

    it('빈 목록 시 radio 입력이 없다', () => {
      render(<AssignmentForm {...emptyProps} />);
      expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    });

    it('빈 목록 시 제출 버튼이 비활성화된다', () => {
      render(<AssignmentForm {...emptyProps} />);
      expect(screen.getByRole('button', { name: /컨설턴트 배정/ })).toBeDisabled();
    });
  });

  // --------------------------------------------------------------------------
  // 3. 컨설턴트 선택
  // --------------------------------------------------------------------------
  describe('컨설턴트 선택', () => {
    it('radio 입력으로 컨설턴트를 선택할 수 있다', () => {
      render(<AssignmentForm {...defaultProps} />);
      const radios = screen.getAllByRole('radio');
      expect(radios).toHaveLength(2);

      fireEvent.click(radios[0]);
      expect(radios[0]).toBeChecked();
    });

    it('컨설턴트 선택 시 선택한 컨설턴트 요약이 표시된다', () => {
      render(<AssignmentForm {...defaultProps} />);
      const radios = screen.getAllByRole('radio');
      fireEvent.click(radios[0]);

      const summaryLabel = screen.getByText(/선택한 컨설턴트:/);
      const summaryContainer = summaryLabel.closest('div');
      expect(within(summaryContainer!).getByText(/김컨설턴트/)).toBeInTheDocument();
    });

    it('컨설턴트 선택 시 매칭 점수가 요약에 표시된다', () => {
      render(<AssignmentForm {...defaultProps} />);
      const radios = screen.getAllByRole('radio');
      fireEvent.click(radios[0]);

      const summaryLabel = screen.getByText(/선택한 컨설턴트:/);
      const summaryContainer = summaryLabel.closest('div');
      expect(within(summaryContainer!).getByText(/매칭 점수: 85점/)).toBeInTheDocument();
    });

    it('1순위 추천에 "추천" 뱃지가 표시된다', () => {
      render(<AssignmentForm {...defaultProps} />);
      expect(screen.getByText('추천')).toBeInTheDocument();
    });

    it('두 번째 컨설턴트 선택 시 요약이 업데이트된다', () => {
      render(<AssignmentForm {...defaultProps} />);
      const radios = screen.getAllByRole('radio');

      fireEvent.click(radios[0]);
      const summaryAfterFirst = screen.getByText(/선택한 컨설턴트:/).closest('div');
      expect(within(summaryAfterFirst!).getByText(/김컨설턴트/)).toBeInTheDocument();

      fireEvent.click(radios[1]);
      const summaryAfterSecond = screen.getByText(/선택한 컨설턴트:/).closest('div');
      expect(within(summaryAfterSecond!).getByText(/이컨설턴트/)).toBeInTheDocument();
    });

    it('컨설턴트 라벨 클릭으로도 선택 가능하다', () => {
      render(<AssignmentForm {...defaultProps} />);
      fireEvent.click(screen.getByText('김컨설턴트'));

      expect(screen.getByText(/선택한 컨설턴트:/)).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 4. 배정 사유 유효성 검사
  // --------------------------------------------------------------------------
  describe('배정 사유 유효성 검사', () => {
    it('초기에는 제출 버튼이 비활성화된다', () => {
      render(<AssignmentForm {...defaultProps} />);
      expect(screen.getByRole('button', { name: /컨설턴트 배정/ })).toBeDisabled();
    });

    it('컨설턴트는 선택했지만 사유 미입력 시 버튼이 비활성화된다', () => {
      render(<AssignmentForm {...defaultProps} />);
      const radios = screen.getAllByRole('radio');
      fireEvent.click(radios[0]);

      expect(screen.getByRole('button', { name: /컨설턴트 배정/ })).toBeDisabled();
    });

    it('사유를 10자 미만으로 입력하면 버튼이 비활성화된다', async () => {
      const user = userEvent.setup();
      render(<AssignmentForm {...defaultProps} />);

      const radios = screen.getAllByRole('radio');
      fireEvent.click(radios[0]);

      const textarea = screen.getByRole('textbox', { name: /배정 사유/ });
      await user.type(textarea, '짧은');

      expect(screen.getByRole('button', { name: /컨설턴트 배정/ })).toBeDisabled();
    });

    it('사유를 정확히 10자 입력하면 버튼이 활성화된다', async () => {
      const user = userEvent.setup();
      render(<AssignmentForm {...defaultProps} />);

      const radios = screen.getAllByRole('radio');
      fireEvent.click(radios[0]);

      const textarea = screen.getByRole('textbox', { name: /배정 사유/ });
      await user.type(textarea, '적합합니다배정합니다'); // 10자

      expect(screen.getByRole('button', { name: /컨설턴트 배정/ })).not.toBeDisabled();
    });

    it('사유를 10자 이상 입력하면 버튼이 활성화된다', async () => {
      const user = userEvent.setup();
      render(<AssignmentForm {...defaultProps} />);

      const radios = screen.getAllByRole('radio');
      fireEvent.click(radios[0]);

      const textarea = screen.getByRole('textbox', { name: /배정 사유/ });
      await user.type(textarea, '이 컨설턴트가 제조업 경험이 풍부하여 배정이 적합합니다.');

      expect(screen.getByRole('button', { name: /컨설턴트 배정/ })).not.toBeDisabled();
    });

    it('컨설턴트 미선택 시 충분한 사유를 입력해도 버튼이 비활성화된다', async () => {
      const user = userEvent.setup();
      render(<AssignmentForm {...defaultProps} />);

      const textarea = screen.getByRole('textbox', { name: /배정 사유/ });
      await user.type(textarea, '이 컨설턴트가 제조업 경험이 풍부합니다.');

      expect(screen.getByRole('button', { name: /컨설턴트 배정/ })).toBeDisabled();
    });

    it('ReasonLengthHint 컴포넌트에 현재 글자 수가 전달된다', async () => {
      const user = userEvent.setup();
      render(<AssignmentForm {...defaultProps} />);

      const textarea = screen.getByRole('textbox', { name: /배정 사유/ });
      await user.type(textarea, '테스트');

      const hint = screen.getByTestId('reason-length-hint');
      expect(hint).toHaveAttribute('data-length', '3');
    });
  });

  // --------------------------------------------------------------------------
  // 5. AlertDialog 사전 차단 (#3 신규)
  // --------------------------------------------------------------------------
  describe('AlertDialog 사전 차단 (#3)', () => {
    it('"컨설턴트 배정" 클릭 시 AlertDialog 노출 — 즉시 assignConsultant 미호출', async () => {
      const user = userEvent.setup();
      vi.mocked(assignConsultant).mockResolvedValue({ success: true });

      render(<AssignmentForm {...defaultProps} />);
      await selectAndSubmit(user);

      expect(
        await screen.findByText(/김컨설턴트컨설턴트를 이 프로젝트에 배정하시겠습니까\?/),
      ).toBeInTheDocument();
      expect(vi.mocked(assignConsultant)).not.toHaveBeenCalled();
    });

    it('AlertDialog "취소" 시 폼 유지 + assignConsultant·refresh 미호출', async () => {
      const user = userEvent.setup();
      render(<AssignmentForm {...defaultProps} />);
      await selectAndSubmit(user);
      await user.click(screen.getByRole('button', { name: '취소' }));

      expect(vi.mocked(assignConsultant)).not.toHaveBeenCalled();
      expect(mockRefresh).not.toHaveBeenCalled();
    });
  });

  // --------------------------------------------------------------------------
  // 6. 폼 제출 성공 (router.refresh 패턴)
  // --------------------------------------------------------------------------
  describe('폼 제출 성공', () => {
    it('"배정 확인" 후 router.refresh + 성공 토스트 (window.location.reload 미사용)', async () => {
      const user = userEvent.setup();
      vi.mocked(assignConsultant).mockResolvedValue({ success: true });

      render(<AssignmentForm {...defaultProps} />);
      await selectAndSubmit(user, '제조업 전문성이 높고 일정 조율이 가능합니다.');
      await confirmAssign(user);

      await waitFor(() => {
        expect(mockRefresh).toHaveBeenCalledTimes(1);
        expect(mockSuccessToast).toHaveBeenCalledWith(
          '배정 완료',
          expect.stringContaining('김컨설턴트'),
        );
      });
    });

    it('제출 시 assignConsultant에 올바른 FormData를 전달한다', async () => {
      const user = userEvent.setup();
      let capturedFormData: FormData | null = null;

      vi.mocked(assignConsultant).mockImplementation(async (formData) => {
        capturedFormData = formData;
        return { success: true };
      });

      render(<AssignmentForm {...defaultProps} />);
      await selectAndSubmit(user, '이 컨설턴트가 적합합니다.');
      await confirmAssign(user);

      await waitFor(() => {
        expect(capturedFormData).not.toBeNull();
        expect(capturedFormData!.get('project_id')).toBe('project-1');
        expect(capturedFormData!.get('consultant_id')).toBe('consultant-1');
        expect(capturedFormData!.get('assignment_reason')).toBe('이 컨설턴트가 적합합니다.');
      });
    });
  });

  // --------------------------------------------------------------------------
  // 7. 폼 제출 실패 (에러 메시지)
  // --------------------------------------------------------------------------
  describe('폼 제출 실패', () => {
    it('컨설턴트 미선택 제출 시 에러 메시지를 표시한다', async () => {
      const user = userEvent.setup();
      render(<AssignmentForm {...defaultProps} />);

      const textarea = screen.getByRole('textbox', { name: /배정 사유/ });
      await user.type(textarea, '배정 사유 충분히 길게 입력합니다.');

      // 버튼 disabled 우회: form 직접 submit
      fireEvent.submit(screen.getByRole('button', { name: /컨설턴트 배정/ }).closest('form')!);

      await waitFor(() => {
        expect(screen.getByText('배정할 컨설턴트를 선택하세요.')).toBeInTheDocument();
      });
    });

    it('사유 미달 제출 시 에러 메시지를 표시한다', async () => {
      const user = userEvent.setup();
      render(<AssignmentForm {...defaultProps} />);

      const radios = screen.getAllByRole('radio');
      fireEvent.click(radios[0]);

      const textarea = screen.getByRole('textbox', { name: /배정 사유/ });
      await user.type(textarea, '짧음');

      fireEvent.submit(screen.getByRole('button', { name: /컨설턴트 배정/ }).closest('form')!);

      await waitFor(() => {
        expect(screen.getByText(/배정 사유를 10자 이상 입력하세요/)).toBeInTheDocument();
      });
    });

    it('Server Action 실패 시 에러 메시지 표시 — refresh·토스트 미호출', async () => {
      const user = userEvent.setup();
      vi.mocked(assignConsultant).mockResolvedValue({
        success: false,
        error: '배정 가능한 상태가 아닙니다.',
      });

      render(<AssignmentForm {...defaultProps} />);
      await selectAndSubmit(user, '이 컨설턴트가 가장 적합합니다.');
      await confirmAssign(user);

      await waitFor(() => {
        expect(screen.getByText('배정 가능한 상태가 아닙니다.')).toBeInTheDocument();
      });
      expect(mockRefresh).not.toHaveBeenCalled();
      expect(mockSuccessToast).not.toHaveBeenCalled();
    });

    it('Server Action 실패 시 에러 메시지가 없으면 기본 메시지를 표시한다', async () => {
      const user = userEvent.setup();
      vi.mocked(assignConsultant).mockResolvedValue({ success: false, error: '' });

      render(<AssignmentForm {...defaultProps} />);
      await selectAndSubmit(user);
      await confirmAssign(user);

      await waitFor(() => {
        expect(screen.getByText('배정에 실패했습니다.')).toBeInTheDocument();
      });
    });

    it('예외 발생 시 에러 메시지를 표시한다', async () => {
      const user = userEvent.setup();
      vi.mocked(assignConsultant).mockRejectedValue(new Error('Unknown error'));

      render(<AssignmentForm {...defaultProps} />);
      await selectAndSubmit(user);
      await confirmAssign(user);

      await waitFor(() => {
        expect(
          screen.getByText('배정 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'),
        ).toBeInTheDocument();
      });
    });
  });

  // --------------------------------------------------------------------------
  // 8. 제출 중 로딩 상태
  // --------------------------------------------------------------------------
  describe('제출 중 로딩 상태', () => {
    it('제출 중에는 버튼 텍스트가 "배정 중..."으로 변경된다', async () => {
      const user = userEvent.setup();
      vi.mocked(assignConsultant).mockReturnValue(new Promise(() => {})); // 영구 pending

      render(<AssignmentForm {...defaultProps} />);
      await selectAndSubmit(user);
      await confirmAssign(user);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /배정 중/ })).toBeInTheDocument();
      });
    });
  });
});
