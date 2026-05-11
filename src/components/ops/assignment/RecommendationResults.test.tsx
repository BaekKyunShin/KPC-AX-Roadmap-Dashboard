import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================================================
// 모킹
// ============================================================================

// next/navigation 모킹
const mockRefresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    refresh: mockRefresh,
    prefetch: vi.fn(),
    forward: vi.fn(),
  }),
  usePathname: () => '/test',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

// Server Action 모킹
vi.mock('@/app/(dashboard)/ops/projects/actions', () => ({
  assignConsultant: vi.fn(),
}));

// toast util 모킹 (showErrorToast 호출 검증용)
const mockShowErrorToast = vi.fn();
vi.mock('@/lib/utils/toast', () => ({
  showErrorToast: (...args: unknown[]) => mockShowErrorToast(...args),
  showSuccessToast: vi.fn(),
}));

// assignment 인덱스 모킹 (AlertMessage, REASON_LENGTH, ASSIGN_BUTTON_STYLE)
vi.mock('./index', () => ({
  AlertMessage: ({ message, onDismiss }: { message: string; onDismiss?: () => void }) => (
    <div data-testid="alert-message">
      <span>{message}</span>
      {onDismiss && (
        <button onClick={onDismiss} data-testid="dismiss-button">
          닫기
        </button>
      )}
    </div>
  ),
  REASON_LENGTH: {
    MIN: 10,
    MAX: 500,
  },
  ASSIGN_BUTTON_STYLE: 'assign-button-style',
}));

// SelectableCard 모킹 (자체 테스트에서 별도 검증)
vi.mock('./SelectableCard', () => ({
  default: ({
    recommendation,
    isSelected,
    onSelect,
  }: {
    recommendation: { candidate_user_id: string; total_score: number; rank: number; rationale?: string | null; candidate: { name: string; email: string } };
    isSelected: boolean;
    onSelect: () => void;
  }) => (
    <button
      data-testid={`selectable-card-${recommendation.candidate_user_id}`}
      data-selected={isSelected}
      onClick={onSelect}
    >
      <span>{recommendation.candidate.name}</span>
      <span>{Math.round(recommendation.total_score)}점</span>
      {recommendation.rank === 1 && <span data-testid="top-rank-badge">AI 추천</span>}
      {isSelected && <span>선택됨</span>}
    </button>
  ),
}));

// utils 모킹
vi.mock('@/lib/utils', () => ({
  cn: (...args: (string | undefined | null | false)[]) => args.filter(Boolean).join(' '),
}));

// ============================================================================
// 테스트 대상 import
// ============================================================================

import RecommendationResults from './RecommendationResults';
import { assignConsultant } from '@/app/(dashboard)/ops/projects/actions';
import type { ValidRecommendation } from './utils';

// ============================================================================
// 테스트 데이터 팩토리
// ============================================================================

function makeValidRecommendation(overrides: Partial<ValidRecommendation> = {}): ValidRecommendation {
  return {
    id: 'rec-1',
    candidate_user_id: 'consultant-1',
    total_score: 85,
    rank: 1,
    rationale: {
      analysis: 'AI 분석: 제조업 전문성이 높습니다.',
      strengths: ['제조업 경험', 'AI 도입 역량'],
      considerations: ['일정 확인 필요'],
    },
    candidate: {
      id: 'consultant-1',
      name: '김컨설턴트',
      email: 'kim@test.com',
    },
    ...overrides,
  };
}

const defaultProps = {
  recommendations: [
    makeValidRecommendation(),
    makeValidRecommendation({
      id: 'rec-2',
      candidate_user_id: 'consultant-2',
      total_score: 72,
      rank: 2,
      rationale: null,
      candidate: {
        id: 'consultant-2',
        name: '이컨설턴트',
        email: 'lee@test.com',
      },
    }),
    makeValidRecommendation({
      id: 'rec-3',
      candidate_user_id: 'consultant-3',
      total_score: 60,
      rank: 3,
      rationale: null,
      candidate: {
        id: 'consultant-3',
        name: '박컨설턴트',
        email: 'park@test.com',
      },
    }),
  ],
  projectId: 'project-1',
  isGenerating: false,
  generateError: null,
  onDismissError: vi.fn(),
  onRecalculate: vi.fn(),
  hasAssignedConsultant: false,
};

// ============================================================================
// 테스트
// ============================================================================

describe('RecommendationResults', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --------------------------------------------------------------------------
  // 1. 추천 카드 렌더링 (점수, 이유)
  // --------------------------------------------------------------------------
  describe('추천 카드 렌더링', () => {
    it('3개의 추천 카드를 렌더링한다', () => {
      render(<RecommendationResults {...defaultProps} />);
      expect(screen.getByTestId('selectable-card-consultant-1')).toBeInTheDocument();
      expect(screen.getByTestId('selectable-card-consultant-2')).toBeInTheDocument();
      expect(screen.getByTestId('selectable-card-consultant-3')).toBeInTheDocument();
    });

    it('각 카드에 컨설턴트 이름을 표시한다', () => {
      render(<RecommendationResults {...defaultProps} />);
      expect(screen.getByText('김컨설턴트')).toBeInTheDocument();
      expect(screen.getByText('이컨설턴트')).toBeInTheDocument();
      expect(screen.getByText('박컨설턴트')).toBeInTheDocument();
    });

    it('각 카드에 점수를 표시한다', () => {
      render(<RecommendationResults {...defaultProps} />);
      expect(screen.getByText('85점')).toBeInTheDocument();
      expect(screen.getByText('72점')).toBeInTheDocument();
      expect(screen.getByText('60점')).toBeInTheDocument();
    });

    it('1순위 카드에 "AI 추천" 뱃지를 표시한다', () => {
      render(<RecommendationResults {...defaultProps} />);
      expect(screen.getByTestId('top-rank-badge')).toBeInTheDocument();
    });

    it('초기에 카드가 선택되지 않은 상태이다', () => {
      render(<RecommendationResults {...defaultProps} />);
      const card = screen.getByTestId('selectable-card-consultant-1');
      expect(card).toHaveAttribute('data-selected', 'false');
    });
  });

  // --------------------------------------------------------------------------
  // 2. 빈 추천 목록
  // --------------------------------------------------------------------------
  describe('빈 추천 목록', () => {
    it('추천 목록이 비어있어도 에러 없이 렌더링된다', () => {
      const emptyProps = { ...defaultProps, recommendations: [] };
      expect(() => render(<RecommendationResults {...emptyProps} />)).not.toThrow();
    });

    it('빈 추천 목록 시 카드가 렌더링되지 않는다', () => {
      const emptyProps = { ...defaultProps, recommendations: [] };
      render(<RecommendationResults {...emptyProps} />);
      expect(screen.queryByTestId(/selectable-card-/)).not.toBeInTheDocument();
    });

    it('빈 추천 목록 시 매칭 재계산 버튼은 여전히 표시된다', () => {
      const emptyProps = { ...defaultProps, recommendations: [] };
      render(<RecommendationResults {...emptyProps} />);
      expect(screen.getByRole('button', { name: /매칭 재계산/ })).toBeInTheDocument();
    });
  });

  // --------------------------------------------------------------------------
  // 3. 선택 → 배정 사유 입력 UI 표시
  // --------------------------------------------------------------------------
  describe('카드 선택 시 배정 사유 UI', () => {
    it('카드 클릭 전에는 배정 사유 입력란이 없다', () => {
      render(<RecommendationResults {...defaultProps} />);
      expect(screen.queryByPlaceholderText(/해당 컨설턴트를 배정하는 사유/)).not.toBeInTheDocument();
    });

    it('카드 클릭 시 배정 사유 입력란이 나타난다', () => {
      render(<RecommendationResults {...defaultProps} />);
      fireEvent.click(screen.getByTestId('selectable-card-consultant-1'));
      expect(screen.getByPlaceholderText(/해당 컨설턴트를 배정하는 사유/)).toBeInTheDocument();
    });

    it('카드 클릭 시 배정하기 버튼이 나타난다', () => {
      render(<RecommendationResults {...defaultProps} />);
      fireEvent.click(screen.getByTestId('selectable-card-consultant-1'));
      expect(screen.getByRole('button', { name: /배정하기/ })).toBeInTheDocument();
    });

    it('카드 선택 시 해당 카드의 data-selected가 true가 된다', () => {
      render(<RecommendationResults {...defaultProps} />);
      const card = screen.getByTestId('selectable-card-consultant-1');
      fireEvent.click(card);
      expect(card).toHaveAttribute('data-selected', 'true');
    });

    it('배정 사유 미입력 시 배정하기 버튼이 비활성화된다', () => {
      render(<RecommendationResults {...defaultProps} />);
      fireEvent.click(screen.getByTestId('selectable-card-consultant-1'));
      expect(screen.getByRole('button', { name: /배정하기/ })).toBeDisabled();
    });

    it('배정 사유 10자 이상 입력 시 배정하기 버튼이 활성화된다', async () => {
      const user = userEvent.setup();
      render(<RecommendationResults {...defaultProps} />);

      fireEvent.click(screen.getByTestId('selectable-card-consultant-1'));

      const textarea = screen.getByPlaceholderText(/해당 컨설턴트를 배정하는 사유/);
      await user.type(textarea, '이 컨설턴트가 가장 적합합니다.');

      expect(screen.getByRole('button', { name: /배정하기/ })).not.toBeDisabled();
    });

    it('배정 사유 글자 수 카운터가 표시된다', async () => {
      const user = userEvent.setup();
      render(<RecommendationResults {...defaultProps} />);

      fireEvent.click(screen.getByTestId('selectable-card-consultant-1'));

      const textarea = screen.getByPlaceholderText(/해당 컨설턴트를 배정하는 사유/);
      await user.type(textarea, '안녕');

      // {현재길이}/{최대길이} 형식의 카운터
      expect(screen.getByText(/\/500/)).toBeInTheDocument();
    });

    it('10자 미달 시 나머지 글자 수를 표시한다', async () => {
      const user = userEvent.setup();
      render(<RecommendationResults {...defaultProps} />);

      fireEvent.click(screen.getByTestId('selectable-card-consultant-1'));

      const textarea = screen.getByPlaceholderText(/해당 컨설턴트를 배정하는 사유/);
      await user.type(textarea, '짧은'); // 3자

      // "n자 더" 텍스트: span 내에 "3/500 (7자 더)"처럼 합쳐진 텍스트로 렌더링됨
      // getByText 대신 DOM 전체에서 확인
      expect(document.body.textContent).toContain('자 더');
    });
  });

  // --------------------------------------------------------------------------
  // 4. 배정 제출 성공
  // --------------------------------------------------------------------------
  describe('배정 제출 성공', () => {
    it('배정 성공 시 router.refresh()를 호출한다', async () => {
      const user = userEvent.setup();
      vi.mocked(assignConsultant).mockResolvedValue({ success: true });

      render(<RecommendationResults {...defaultProps} />);

      fireEvent.click(screen.getByTestId('selectable-card-consultant-1'));

      const textarea = screen.getByPlaceholderText(/해당 컨설턴트를 배정하는 사유/);
      await user.type(textarea, '이 컨설턴트가 가장 적합합니다.');

      await user.click(screen.getByRole('button', { name: /배정하기/ }));

      await waitFor(() => {
        expect(mockRefresh).toHaveBeenCalledOnce();
      });
    });

    it('배정 시 assignConsultant에 올바른 FormData를 전달한다', async () => {
      const user = userEvent.setup();
      let capturedFormData: FormData | null = null;

      vi.mocked(assignConsultant).mockImplementation(async (formData) => {
        capturedFormData = formData;
        return { success: true };
      });

      render(<RecommendationResults {...defaultProps} />);

      fireEvent.click(screen.getByTestId('selectable-card-consultant-1'));

      const textarea = screen.getByPlaceholderText(/해당 컨설턴트를 배정하는 사유/);
      await user.type(textarea, '이 컨설턴트가 가장 적합합니다.');

      await user.click(screen.getByRole('button', { name: /배정하기/ }));

      await waitFor(() => {
        expect(capturedFormData).not.toBeNull();
        expect(capturedFormData!.get('project_id')).toBe('project-1');
        expect(capturedFormData!.get('consultant_id')).toBe('consultant-1');
        expect(capturedFormData!.get('assignment_reason')).toBe('이 컨설턴트가 가장 적합합니다.');
      });
    });

    it('배정 중에는 버튼 텍스트가 "배정 중..."으로 변경된다', async () => {
      const user = userEvent.setup();
      vi.mocked(assignConsultant).mockReturnValue(new Promise(() => {}));

      render(<RecommendationResults {...defaultProps} />);

      fireEvent.click(screen.getByTestId('selectable-card-consultant-1'));

      const textarea = screen.getByPlaceholderText(/해당 컨설턴트를 배정하는 사유/);
      await user.type(textarea, '이 컨설턴트가 가장 적합합니다.');

      await user.click(screen.getByRole('button', { name: /배정하기/ }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /배정 중/ })).toBeInTheDocument();
      });
    });
  });

  // --------------------------------------------------------------------------
  // 5. 배정 제출 실패
  // --------------------------------------------------------------------------
  describe('배정 제출 실패', () => {
    it('배정 실패 시 에러 메시지로 showErrorToast를 호출한다', async () => {
      const user = userEvent.setup();

      vi.mocked(assignConsultant).mockResolvedValue({
        success: false,
        error: '배정 권한이 없습니다.',
      });

      render(<RecommendationResults {...defaultProps} />);

      fireEvent.click(screen.getByTestId('selectable-card-consultant-1'));

      const textarea = screen.getByPlaceholderText(/해당 컨설턴트를 배정하는 사유/);
      await user.type(textarea, '이 컨설턴트가 가장 적합합니다.');

      await user.click(screen.getByRole('button', { name: /배정하기/ }));

      await waitFor(() => {
        expect(mockShowErrorToast).toHaveBeenCalledWith('배정 실패', '배정 권한이 없습니다.');
      });
    });

    it('배정 실패 시 에러 메시지가 없으면 기본 메시지로 showErrorToast를 호출한다', async () => {
      const user = userEvent.setup();

      vi.mocked(assignConsultant).mockResolvedValue({
        success: false,
        error: undefined as unknown as string,
      });

      render(<RecommendationResults {...defaultProps} />);

      fireEvent.click(screen.getByTestId('selectable-card-consultant-1'));

      const textarea = screen.getByPlaceholderText(/해당 컨설턴트를 배정하는 사유/);
      await user.type(textarea, '이 컨설턴트가 가장 적합합니다.');

      await user.click(screen.getByRole('button', { name: /배정하기/ }));

      await waitFor(() => {
        expect(mockShowErrorToast).toHaveBeenCalledWith('배정 실패', '배정 요청이 거부되었습니다.');
      });
    });

    it('예외 발생 시 네트워크 오류 메시지로 showErrorToast를 호출한다', async () => {
      const user = userEvent.setup();

      vi.mocked(assignConsultant).mockRejectedValue(new Error('Network Error'));

      render(<RecommendationResults {...defaultProps} />);

      fireEvent.click(screen.getByTestId('selectable-card-consultant-1'));

      const textarea = screen.getByPlaceholderText(/해당 컨설턴트를 배정하는 사유/);
      await user.type(textarea, '이 컨설턴트가 가장 적합합니다.');

      await user.click(screen.getByRole('button', { name: /배정하기/ }));

      await waitFor(() => {
        expect(mockShowErrorToast).toHaveBeenCalledWith(
          '배정 실패',
          expect.stringContaining('네트워크'),
        );
      });
    });

    it('배정 실패 후 isSubmitting이 false로 복구된다', async () => {
      const user = userEvent.setup();
      vi.mocked(assignConsultant).mockResolvedValue({ success: false, error: '실패' });

      render(<RecommendationResults {...defaultProps} />);

      fireEvent.click(screen.getByTestId('selectable-card-consultant-1'));

      const textarea = screen.getByPlaceholderText(/해당 컨설턴트를 배정하는 사유/);
      await user.type(textarea, '이 컨설턴트가 가장 적합합니다.');

      await user.click(screen.getByRole('button', { name: /배정하기/ }));

      await waitFor(() => {
        // 실패 후 버튼이 "배정하기"로 복구됨
        expect(screen.getByRole('button', { name: /배정하기/ })).toBeInTheDocument();
      });
    });
  });

  // --------------------------------------------------------------------------
  // 6. 에러 표시 (generateError)
  // --------------------------------------------------------------------------
  describe('generateError 표시', () => {
    it('generateError가 있으면 AlertMessage를 표시한다', () => {
      const props = { ...defaultProps, generateError: '매칭 계산에 실패했습니다.' };
      render(<RecommendationResults {...props} />);
      expect(screen.getByTestId('alert-message')).toBeInTheDocument();
      expect(screen.getByText('매칭 계산에 실패했습니다.')).toBeInTheDocument();
    });

    it('generateError가 null이면 AlertMessage를 표시하지 않는다', () => {
      render(<RecommendationResults {...defaultProps} />);
      expect(screen.queryByTestId('alert-message')).not.toBeInTheDocument();
    });

    it('AlertMessage의 dismiss 버튼 클릭 시 onDismissError를 호출한다', () => {
      const onDismissError = vi.fn();
      const props = {
        ...defaultProps,
        generateError: '에러 메시지',
        onDismissError,
      };
      render(<RecommendationResults {...props} />);

      fireEvent.click(screen.getByTestId('dismiss-button'));

      expect(onDismissError).toHaveBeenCalledOnce();
    });
  });

  // --------------------------------------------------------------------------
  // 7. onRecalculate 콜백 호출
  // --------------------------------------------------------------------------
  describe('onRecalculate 콜백', () => {
    it('매칭 재계산 버튼을 표시한다', () => {
      render(<RecommendationResults {...defaultProps} />);
      expect(screen.getByRole('button', { name: /매칭 재계산/ })).toBeInTheDocument();
    });

    it('매칭 재계산 버튼 클릭 시 onRecalculate 콜백이 호출된다', () => {
      const onRecalculate = vi.fn();
      const props = { ...defaultProps, onRecalculate };
      render(<RecommendationResults {...props} />);

      fireEvent.click(screen.getByRole('button', { name: /매칭 재계산/ }));

      expect(onRecalculate).toHaveBeenCalledOnce();
    });

    it('hasAssignedConsultant=true 시 매칭 재계산 클릭 시 ConfirmDialog가 열리고 onRecalculate는 즉시 호출되지 않는다', () => {
      const onRecalculate = vi.fn();
      const props = { ...defaultProps, onRecalculate, hasAssignedConsultant: true };
      render(<RecommendationResults {...props} />);

      fireEvent.click(screen.getByRole('button', { name: /매칭 재계산/ }));

      // ConfirmDialog 가 열리고 (제목 노출)
      expect(screen.getByText('매칭 추천을 재계산하시겠습니까?')).toBeInTheDocument();
      // 다이얼로그 확인 전이므로 콜백 미호출
      expect(onRecalculate).not.toHaveBeenCalled();
    });

    it('hasAssignedConsultant=true 시 ConfirmDialog의 "재계산" 클릭 시 onRecalculate가 호출된다', () => {
      const onRecalculate = vi.fn();
      const props = { ...defaultProps, onRecalculate, hasAssignedConsultant: true };
      render(<RecommendationResults {...props} />);

      fireEvent.click(screen.getByRole('button', { name: /매칭 재계산/ }));

      // ConfirmDialog 내 "재계산" 액션 버튼 클릭
      const confirmButton = screen.getByRole('button', { name: '재계산' });
      fireEvent.click(confirmButton);

      expect(onRecalculate).toHaveBeenCalledOnce();
    });

    it('isGenerating=true 시 매칭 재계산 버튼이 비활성화된다', () => {
      const props = { ...defaultProps, isGenerating: true };
      render(<RecommendationResults {...props} />);
      expect(screen.getByRole('button', { name: /매칭 재계산/ })).toBeDisabled();
    });

    it('isGenerating=false 시 매칭 재계산 버튼이 활성화된다', () => {
      render(<RecommendationResults {...defaultProps} />);
      expect(screen.getByRole('button', { name: /매칭 재계산/ })).not.toBeDisabled();
    });
  });

  // --------------------------------------------------------------------------
  // 8. hasAssignedConsultant
  // --------------------------------------------------------------------------
  describe('hasAssignedConsultant', () => {
    it('hasAssignedConsultant=true 시 안내 메시지를 표시한다', () => {
      const props = { ...defaultProps, hasAssignedConsultant: true };
      render(<RecommendationResults {...props} />);
      expect(screen.getByText('현재 배정은 변경되지 않습니다')).toBeInTheDocument();
    });

    it('hasAssignedConsultant=false 시 안내 메시지를 표시하지 않는다', () => {
      render(<RecommendationResults {...defaultProps} />);
      expect(screen.queryByText('현재 배정은 변경되지 않습니다')).not.toBeInTheDocument();
    });
  });
});
