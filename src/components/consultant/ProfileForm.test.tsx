import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ProfileForm from './ProfileForm';
import type { ConsultantProfile } from '@/types/database';

// =============================================================================
// Mocks
// =============================================================================

const mockPush = vi.fn();
const mockReplace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, back: vi.fn(), refresh: vi.fn() }),
}));

const mockSaveConsultantProfile = vi.fn();
const mockUpdateConsultantProfile = vi.fn();
vi.mock('@/app/(auth)/actions', () => ({
  saveConsultantProfile: (...args: unknown[]) => mockSaveConsultantProfile(...args),
  updateConsultantProfile: (...args: unknown[]) => mockUpdateConsultantProfile(...args),
}));

vi.mock('@/lib/utils', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/lib/utils');
  return {
    ...actual,
    showErrorToast: vi.fn(),
    showSuccessToast: vi.fn(),
    scrollToElement: vi.fn(),
    scrollToFirstError: vi.fn(),
  };
});

// =============================================================================
// 테스트 데이터
// =============================================================================

function makeProfile(overrides: Partial<ConsultantProfile> = {}): ConsultantProfile {
  return {
    id: 'profile-1',
    user_id: 'user-1',
    affiliation: 'ABC컨설팅',
    expertise_domains: ['생산/제조', '품질관리'],
    available_industries: ['제조업'],
    sub_industries: ['반도체'],
    teaching_levels: ['BEGINNER', 'INTERMEDIATE'],
    coaching_methods: ['PBL', 'WORKSHOP'],
    skill_tags: ['프롬프트 엔지니어링', '워크플로우 설계'],
    years_of_experience: 5,
    representative_experience: '삼성전자 품질관리팀 5년 근무. AI 기반 불량 예측 시스템 구축 경험이 다수 있으며 제조업에 특화되어 있습니다.',
    portfolio: 'AI 활용 업무자동화 워크숍 (16시간) 다수 진행. 중소기업 AI 도입 컨설팅 3건 수행 완료.',
    strengths_constraints: '제조업 품질관리 분야에 강점이 있습니다. 비전공자 대상 실습 중심 교육에 특히 강점이 있으며 경험이 풍부합니다.',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

/**
 * 교육 대상 수준 뱃지를 title 속성으로 찾는다.
 * (showOptionDescriptions가 true이면 "입문" 등의 텍스트가 뱃지와 설명 양쪽에 있으므로 title로 구분)
 */
function getTeachingLevelBadge(title: string) {
  return screen.getByTitle(title);
}

/** 모든 필수 선택 항목을 클릭하여 제출 버튼을 활성화 */
async function selectAllRequiredBadges(user: ReturnType<typeof userEvent.setup>) {
  // 2. AI 훈련 가능 산업 - 제조업
  await user.click(screen.getByText('제조업'));
  // 3. AI 적용 가능 업무 - 생산/제조
  await user.click(screen.getByText('생산/제조'));
  // 4. 교육 대상 수준 - 입문 (title 속성으로 구분)
  await user.click(getTeachingLevelBadge('AI 개념 이해, 비사용자 대상 기초 교육'));
  // 5. 선호 교육 방식 - PBL (프로젝트 기반)
  await user.click(screen.getByText('PBL (프로젝트 기반)'));
  // 6. 보유 역량 - 프롬프트 엔지니어링
  await user.click(screen.getByText('프롬프트 엔지니어링'));
}

/** 모든 필수 텍스트 필드를 채움 */
async function fillAllRequiredTextFields(user: ReturnType<typeof userEvent.setup>) {
  const affiliationInput = screen.getByLabelText(/소속/);
  await user.clear(affiliationInput);
  await user.type(affiliationInput, 'ABC컨설팅');

  const yearsInput = screen.getByLabelText(/AI 교육\/컨설팅 경력/);
  await user.clear(yearsInput);
  await user.type(yearsInput, '5');

  const longText = 'A'.repeat(50); // 최소 50자 요구사항 충족

  const experienceInput = screen.getByLabelText(/경력 사항/);
  await user.clear(experienceInput);
  await user.type(experienceInput, longText);

  const portfolioInput = screen.getByLabelText(/강의\/컨설팅 포트폴리오/);
  await user.clear(portfolioInput);
  await user.type(portfolioInput, longText);

  const strengthsInput = screen.getByLabelText(/강점\/제약/);
  await user.clear(strengthsInput);
  await user.type(strengthsInput, longText);
}

const defaultProps = {
  profile: null,
  backUrl: '/consultant/profile',
  successRedirectUrl: '/consultant/home',
};

// =============================================================================
// 테스트
// =============================================================================

describe('ProfileForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ---------------------------------------------------------------------------
  // 기본 렌더링
  // ---------------------------------------------------------------------------
  describe('기본 렌더링', () => {
    it('모든 필수 필드 라벨을 렌더링한다', () => {
      render(<ProfileForm {...defaultProps} />);

      expect(screen.getByText(/1\. 소속/)).toBeInTheDocument();
      expect(screen.getByText(/2\. AI 훈련 가능 산업/)).toBeInTheDocument();
      expect(screen.getByText(/3\. AI 적용 가능 업무/)).toBeInTheDocument();
      expect(screen.getByText(/4\. 교육 대상 수준/)).toBeInTheDocument();
      expect(screen.getByText(/5\. 선호 교육 방식/)).toBeInTheDocument();
      expect(screen.getByText(/6\. 보유 역량/)).toBeInTheDocument();
      expect(screen.getByText(/7\. AI 교육\/컨설팅 경력/)).toBeInTheDocument();
      expect(screen.getByText(/8\. 경력 사항/)).toBeInTheDocument();
      expect(screen.getByText(/9\. 강의\/컨설팅 포트폴리오/)).toBeInTheDocument();
      expect(screen.getByText(/10\. 강점\/제약/)).toBeInTheDocument();
    });

    it('프로필이 없을 때 "프로필 등록" 제목을 표시한다', () => {
      render(<ProfileForm {...defaultProps} />);

      expect(screen.getByText('컨설턴트 프로필 등록')).toBeInTheDocument();
    });

    it('프로필이 있을 때 "컨설턴트 프로필" 제목을 표시한다', () => {
      render(<ProfileForm {...defaultProps} profile={makeProfile()} />);

      expect(screen.getByText('컨설턴트 프로필')).toBeInTheDocument();
    });

    it('기존 프로필 데이터가 필드에 표시된다', () => {
      const profile = makeProfile();
      render(<ProfileForm {...defaultProps} profile={profile} />);

      // 텍스트 입력 필드
      expect(screen.getByDisplayValue('ABC컨설팅')).toBeInTheDocument();
      expect(screen.getByDisplayValue('5')).toBeInTheDocument();
      expect(screen.getByDisplayValue(profile.representative_experience)).toBeInTheDocument();
      expect(screen.getByDisplayValue(profile.portfolio)).toBeInTheDocument();
      expect(screen.getByDisplayValue(profile.strengths_constraints)).toBeInTheDocument();
    });

    it('돌아가기 버튼을 렌더링한다', () => {
      render(<ProfileForm {...defaultProps} />);

      expect(screen.getByText('돌아가기')).toBeInTheDocument();
    });

    it('backLabel prop으로 돌아가기 버튼 텍스트를 변경할 수 있다', () => {
      render(<ProfileForm {...defaultProps} backLabel="프로필로 돌아가기" />);

      expect(screen.getByText('프로필로 돌아가기')).toBeInTheDocument();
    });

    it('취소 버튼을 렌더링한다', () => {
      render(<ProfileForm {...defaultProps} />);

      expect(screen.getByText('취소')).toBeInTheDocument();
    });

    it('프로필이 없을 때 제출 버튼에 "프로필 등록" 텍스트를 표시한다', () => {
      render(<ProfileForm {...defaultProps} />);

      expect(screen.getByRole('button', { name: /프로필 등록/ })).toBeInTheDocument();
    });

    it('프로필이 있을 때 제출 버튼에 "저장" 텍스트를 표시한다', () => {
      render(<ProfileForm {...defaultProps} profile={makeProfile()} />);

      expect(screen.getByRole('button', { name: /저장/ })).toBeInTheDocument();
    });

    it('필수 선택 항목 미선택 시 미선택 안내 메시지를 표시한다', () => {
      render(<ProfileForm {...defaultProps} />);

      // 5개 필수 선택 항목 미선택
      expect(screen.getByText(/필수 선택 항목 5개 미선택/)).toBeInTheDocument();
    });

    it('제출 버튼은 필수 선택 항목 미완료 시 비활성화된다', () => {
      render(<ProfileForm {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: /프로필 등록/ });
      expect(submitButton).toBeDisabled();
    });
  });

  // ---------------------------------------------------------------------------
  // registration variant
  // ---------------------------------------------------------------------------
  describe('registration variant', () => {
    it('회원가입 모드에서 돌아가기 버튼을 숨긴다', () => {
      render(<ProfileForm {...defaultProps} variant="registration" />);

      expect(screen.queryByText('돌아가기')).not.toBeInTheDocument();
    });

    it('회원가입 모드에서 취소 버튼을 숨긴다', () => {
      render(<ProfileForm {...defaultProps} variant="registration" />);

      expect(screen.queryByText('취소')).not.toBeInTheDocument();
    });

    it('회원가입 모드에서 제출 버튼에 "가입 완료" 텍스트를 표시한다', () => {
      render(<ProfileForm {...defaultProps} variant="registration" />);

      expect(screen.getByRole('button', { name: /가입 완료/ })).toBeInTheDocument();
    });

    it('회원가입 모드에서 헤더(프로필 등록 타이틀)를 숨긴다', () => {
      render(<ProfileForm {...defaultProps} variant="registration" />);

      // 페이지 타이틀(h1)은 표시되지 않지만 카드 내부 CardTitle은 표시
      expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
    });

    it('showRegistrationAlert가 true일 때 가입 안내 알림을 표시한다', () => {
      render(<ProfileForm {...defaultProps} variant="registration" showRegistrationAlert />);

      expect(screen.getByText(/기본 정보 등록이 완료되었습니다/)).toBeInTheDocument();
    });

    it('showRegistrationAlert가 false일 때 가입 안내 알림을 표시하지 않는다', () => {
      render(<ProfileForm {...defaultProps} variant="registration" />);

      expect(screen.queryByText(/기본 정보 등록이 완료되었습니다/)).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // BadgeSelector 통합
  // ---------------------------------------------------------------------------
  describe('BadgeSelector 통합', () => {
    it('산업 뱃지를 클릭하여 선택/해제할 수 있다', async () => {
      const user = userEvent.setup();
      render(<ProfileForm {...defaultProps} />);

      const badge = screen.getByText('제조업');
      await user.click(badge);
      // 선택 시 클래스에 selected 색상이 적용됨
      expect(badge).toHaveClass('bg-blue-600');

      // 다시 클릭하면 해제
      await user.click(badge);
      expect(badge).not.toHaveClass('bg-blue-600');
    });

    it('전문분야 뱃지를 클릭하여 선택할 수 있다', async () => {
      const user = userEvent.setup();
      render(<ProfileForm {...defaultProps} />);

      const badge = screen.getByText('품질관리');
      await user.click(badge);
      expect(badge).toHaveClass('bg-indigo-600');
    });

    it('교육레벨 뱃지를 클릭하여 선택할 수 있다', async () => {
      const user = userEvent.setup();
      render(<ProfileForm {...defaultProps} />);

      const badge = getTeachingLevelBadge('AI 개념 이해, 비사용자 대상 기초 교육');
      await user.click(badge);
      expect(badge).toHaveClass('bg-emerald-600');
    });

    it('교육 방식 뱃지를 클릭하여 선택할 수 있다', async () => {
      const user = userEvent.setup();
      render(<ProfileForm {...defaultProps} />);

      const badge = screen.getByText('워크숍');
      await user.click(badge);
      expect(badge).toHaveClass('bg-purple-600');
    });

    it('보유 역량 뱃지를 클릭하여 선택할 수 있다', async () => {
      const user = userEvent.setup();
      render(<ProfileForm {...defaultProps} />);

      const badge = screen.getByText('프롬프트 엔지니어링');
      await user.click(badge);
      expect(badge).toHaveClass('bg-amber-600');
    });

    it('복수 뱃지를 선택할 수 있다', async () => {
      const user = userEvent.setup();
      render(<ProfileForm {...defaultProps} />);

      await user.click(screen.getByText('제조업'));
      await user.click(screen.getByText('서비스업'));

      expect(screen.getByText('제조업')).toHaveClass('bg-blue-600');
      expect(screen.getByText('서비스업')).toHaveClass('bg-blue-600');
    });

    it('기존 프로필의 선택 값이 뱃지에 반영된다', () => {
      render(<ProfileForm {...defaultProps} profile={makeProfile()} />);

      // available_industries: ['제조업']
      expect(screen.getByText('제조업')).toHaveClass('bg-blue-600');
      // expertise_domains: ['생산/제조', '품질관리']
      expect(screen.getByText('생산/제조')).toHaveClass('bg-indigo-600');
      expect(screen.getByText('품질관리')).toHaveClass('bg-indigo-600');
      // teaching_levels: ['BEGINNER', 'INTERMEDIATE'] - title 속성으로 구분
      expect(getTeachingLevelBadge('AI 개념 이해, 비사용자 대상 기초 교육')).toHaveClass('bg-emerald-600');
      expect(getTeachingLevelBadge('AI 도구 활용, 현업 적용, 프롬프트 설계')).toHaveClass('bg-emerald-600');
    });

    it('모든 필수 선택 항목을 선택하면 미선택 안내가 사라진다', async () => {
      const user = userEvent.setup();
      render(<ProfileForm {...defaultProps} />);

      expect(screen.getByText(/필수 선택 항목 5개 미선택/)).toBeInTheDocument();

      await selectAllRequiredBadges(user);

      expect(screen.queryByText(/필수 선택 항목.*미선택/)).not.toBeInTheDocument();
    });

    it('모든 필수 선택 항목 완료 후 제출 버튼이 활성화된다', async () => {
      const user = userEvent.setup();
      render(<ProfileForm {...defaultProps} />);

      const submitButton = screen.getByRole('button', { name: /프로필 등록/ });
      expect(submitButton).toBeDisabled();

      await selectAllRequiredBadges(user);

      expect(submitButton).toBeEnabled();
    });
  });

  // ---------------------------------------------------------------------------
  // 교육 대상 수준 설명 표시
  // ---------------------------------------------------------------------------
  describe('교육 대상 수준 설명 표시', () => {
    it('교육 대상 수준 섹션에 옵션 설명이 표시된다', () => {
      render(<ProfileForm {...defaultProps} />);

      expect(screen.getByText(/AI 개념 이해, 비사용자 대상 기초 교육/)).toBeInTheDocument();
      expect(screen.getByText(/AI 도구 활용, 현업 적용, 프롬프트 설계/)).toBeInTheDocument();
      expect(screen.getByText(/워크플로우 구축, 자동화 도구 제작/)).toBeInTheDocument();
      expect(screen.getByText(/AI 전략 수립, 조직 내재화/)).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // Zod 검증 (클라이언트)
  // ---------------------------------------------------------------------------
  describe('Zod 검증', () => {
    it('소속 미입력 시 에러 메시지를 표시한다', async () => {
      const user = userEvent.setup();
      render(<ProfileForm {...defaultProps} />);

      await selectAllRequiredBadges(user);

      // 소속을 비워두고 나머지 필수 텍스트 필드만 입력
      const longText = 'A'.repeat(50);
      const yearsInput = screen.getByLabelText(/AI 교육\/컨설팅 경력/);
      await user.clear(yearsInput);
      await user.type(yearsInput, '5');

      await user.type(screen.getByLabelText(/경력 사항/), longText);
      await user.type(screen.getByLabelText(/강의\/컨설팅 포트폴리오/), longText);
      await user.type(screen.getByLabelText(/강점\/제약/), longText);

      const submitButton = screen.getByRole('button', { name: /프로필 등록/ });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('소속을 입력하세요.')).toBeInTheDocument();
      });
    });

    it('경력 사항이 50자 미만이면 에러 메시지를 표시한다', async () => {
      const user = userEvent.setup();
      render(<ProfileForm {...defaultProps} />);

      await selectAllRequiredBadges(user);
      await user.type(screen.getByLabelText(/소속/), 'ABC');
      const yearsInput = screen.getByLabelText(/AI 교육\/컨설팅 경력/);
      await user.clear(yearsInput);
      await user.type(yearsInput, '5');

      await user.type(screen.getByLabelText(/경력 사항/), '짧은 경력');
      await user.type(screen.getByLabelText(/강의\/컨설팅 포트폴리오/), 'A'.repeat(50));
      await user.type(screen.getByLabelText(/강점\/제약/), 'A'.repeat(50));

      await user.click(screen.getByRole('button', { name: /프로필 등록/ }));

      await waitFor(() => {
        expect(screen.getByText('경력 사항을 최소 50자 이상 작성하세요.')).toBeInTheDocument();
      });
    });

    it('포트폴리오가 50자 미만이면 에러 메시지를 표시한다', async () => {
      const user = userEvent.setup();
      render(<ProfileForm {...defaultProps} />);

      await selectAllRequiredBadges(user);
      await user.type(screen.getByLabelText(/소속/), 'ABC');
      const yearsInput = screen.getByLabelText(/AI 교육\/컨설팅 경력/);
      await user.clear(yearsInput);
      await user.type(yearsInput, '5');

      await user.type(screen.getByLabelText(/경력 사항/), 'A'.repeat(50));
      await user.type(screen.getByLabelText(/강의\/컨설팅 포트폴리오/), '짧은 포트폴리오');
      await user.type(screen.getByLabelText(/강점\/제약/), 'A'.repeat(50));

      await user.click(screen.getByRole('button', { name: /프로필 등록/ }));

      await waitFor(() => {
        expect(screen.getByText('강의/컨설팅 포트폴리오를 최소 50자 이상 작성하세요.')).toBeInTheDocument();
      });
    });

    it('강점/제약이 50자 미만이면 에러 메시지를 표시한다', async () => {
      const user = userEvent.setup();
      render(<ProfileForm {...defaultProps} />);

      await selectAllRequiredBadges(user);
      await user.type(screen.getByLabelText(/소속/), 'ABC');
      const yearsInput = screen.getByLabelText(/AI 교육\/컨설팅 경력/);
      await user.clear(yearsInput);
      await user.type(yearsInput, '5');

      await user.type(screen.getByLabelText(/경력 사항/), 'A'.repeat(50));
      await user.type(screen.getByLabelText(/강의\/컨설팅 포트폴리오/), 'A'.repeat(50));
      await user.type(screen.getByLabelText(/강점\/제약/), '짧은 제약');

      await user.click(screen.getByRole('button', { name: /프로필 등록/ }));

      await waitFor(() => {
        expect(screen.getByText('강점/제약을 최소 50자 이상 작성하세요.')).toBeInTheDocument();
      });
    });

    it('Server Action은 검증 실패 시 호출되지 않는다', async () => {
      const user = userEvent.setup();
      render(<ProfileForm {...defaultProps} />);

      await selectAllRequiredBadges(user);
      // 소속만 입력, 나머지 서술 필드 비움
      await user.type(screen.getByLabelText(/소속/), 'ABC');
      const yearsInput = screen.getByLabelText(/AI 교육\/컨설팅 경력/);
      await user.clear(yearsInput);
      await user.type(yearsInput, '5');

      await user.click(screen.getByRole('button', { name: /프로필 등록/ }));

      await waitFor(() => {
        // 서술 필드 3개 모두 빈 상태이므로 에러가 여러 개 표시됨
        const errors = screen.getAllByText(/최소 50자 이상 작성하세요/);
        expect(errors.length).toBeGreaterThanOrEqual(1);
      });

      expect(mockSaveConsultantProfile).not.toHaveBeenCalled();
      expect(mockUpdateConsultantProfile).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // 제출 (생성 모드)
  // ---------------------------------------------------------------------------
  describe('제출 - 생성 모드', () => {
    it('유효한 데이터로 제출 시 saveConsultantProfile을 호출한다', async () => {
      const user = userEvent.setup();
      mockSaveConsultantProfile.mockResolvedValue({ success: true });

      render(<ProfileForm {...defaultProps} />);

      await selectAllRequiredBadges(user);
      await fillAllRequiredTextFields(user);

      await user.click(screen.getByRole('button', { name: /프로필 등록/ }));

      await waitFor(() => {
        expect(mockSaveConsultantProfile).toHaveBeenCalledTimes(1);
      });
    });

    it('제출 중 로딩 상태를 표시한다', async () => {
      const user = userEvent.setup();
      let resolveAction!: (value: { success: boolean }) => void;
      mockSaveConsultantProfile.mockReturnValue(
        new Promise((r) => { resolveAction = r; })
      );

      render(<ProfileForm {...defaultProps} />);

      await selectAllRequiredBadges(user);
      await fillAllRequiredTextFields(user);

      await user.click(screen.getByRole('button', { name: /프로필 등록/ }));

      await waitFor(() => {
        expect(screen.getByText('등록 중...')).toBeInTheDocument();
      });

      // 해결하여 로딩 종료
      resolveAction({ success: true });
    });

    it('저장 성공 시 성공 메시지를 표시한다', async () => {
      const user = userEvent.setup();
      mockSaveConsultantProfile.mockResolvedValue({ success: true });

      render(<ProfileForm {...defaultProps} />);

      await selectAllRequiredBadges(user);
      await fillAllRequiredTextFields(user);

      await user.click(screen.getByRole('button', { name: /프로필 등록/ }));

      await waitFor(() => {
        expect(screen.getByText('프로필이 성공적으로 등록되었습니다.')).toBeInTheDocument();
      });
    });

    it('저장 성공 시 successRedirectUrl로 이동한다', async () => {
      const user = userEvent.setup();
      mockSaveConsultantProfile.mockResolvedValue({ success: true });

      render(<ProfileForm {...defaultProps} />);

      await selectAllRequiredBadges(user);
      await fillAllRequiredTextFields(user);

      await user.click(screen.getByRole('button', { name: /프로필 등록/ }));

      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/consultant/home');
      });
    });

    it('저장 실패 시 에러 메시지를 표시한다', async () => {
      const user = userEvent.setup();
      mockSaveConsultantProfile.mockResolvedValue({
        success: false,
        error: '서버에서 거부됨',
      });

      render(<ProfileForm {...defaultProps} />);

      await selectAllRequiredBadges(user);
      await fillAllRequiredTextFields(user);

      await user.click(screen.getByRole('button', { name: /프로필 등록/ }));

      await waitFor(() => {
        expect(screen.getByText('서버에서 거부됨')).toBeInTheDocument();
      });
    });

    it('저장 실패 시 기본 에러 메시지를 표시한다', async () => {
      const user = userEvent.setup();
      mockSaveConsultantProfile.mockResolvedValue({ success: false });

      render(<ProfileForm {...defaultProps} />);

      await selectAllRequiredBadges(user);
      await fillAllRequiredTextFields(user);

      await user.click(screen.getByRole('button', { name: /프로필 등록/ }));

      await waitFor(() => {
        expect(screen.getByText('프로필 등록에 실패했습니다.')).toBeInTheDocument();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // 제출 - 수정 모드
  // ---------------------------------------------------------------------------
  describe('제출 - 수정 모드', () => {
    it('프로필이 있으면 updateConsultantProfile을 호출한다', async () => {
      const user = userEvent.setup();
      mockUpdateConsultantProfile.mockResolvedValue({ success: true });

      render(<ProfileForm {...defaultProps} profile={makeProfile()} />);

      await user.click(screen.getByRole('button', { name: /저장/ }));

      await waitFor(() => {
        expect(mockUpdateConsultantProfile).toHaveBeenCalledTimes(1);
      });
    });

    it('수정 중 "저장 중..." 상태를 표시한다', async () => {
      const user = userEvent.setup();
      let resolveAction!: (value: { success: boolean }) => void;
      mockUpdateConsultantProfile.mockReturnValue(
        new Promise((r) => { resolveAction = r; })
      );

      render(<ProfileForm {...defaultProps} profile={makeProfile()} />);

      await user.click(screen.getByRole('button', { name: /저장/ }));

      await waitFor(() => {
        expect(screen.getByText('저장 중...')).toBeInTheDocument();
      });

      resolveAction({ success: true });
    });

    it('수정 성공 시 성공 메시지를 표시한다', async () => {
      const user = userEvent.setup();
      mockUpdateConsultantProfile.mockResolvedValue({ success: true });

      render(<ProfileForm {...defaultProps} profile={makeProfile()} />);

      await user.click(screen.getByRole('button', { name: /저장/ }));

      await waitFor(() => {
        expect(screen.getByText('프로필이 성공적으로 수정되었습니다.')).toBeInTheDocument();
      });
    });

    it('수정 실패 시 기본 에러 메시지를 표시한다', async () => {
      const user = userEvent.setup();
      mockUpdateConsultantProfile.mockResolvedValue({ success: false });

      render(<ProfileForm {...defaultProps} profile={makeProfile()} />);

      await user.click(screen.getByRole('button', { name: /저장/ }));

      await waitFor(() => {
        expect(screen.getByText('프로필 수정에 실패했습니다.')).toBeInTheDocument();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // 제출 - 회원가입 모드
  // ---------------------------------------------------------------------------
  describe('제출 - 회원가입 모드', () => {
    it('회원가입 모드 성공 시 가입 완료 메시지를 표시한다', async () => {
      const user = userEvent.setup();
      mockSaveConsultantProfile.mockResolvedValue({ success: true });

      render(<ProfileForm {...defaultProps} variant="registration" />);

      await selectAllRequiredBadges(user);
      await fillAllRequiredTextFields(user);

      await user.click(screen.getByRole('button', { name: /가입 완료/ }));

      await waitFor(() => {
        expect(screen.getByText(/가입이 완료되었습니다/)).toBeInTheDocument();
      });
    });

    it('회원가입 모드 성공 시 router.replace를 사용한다', async () => {
      const user = userEvent.setup();
      mockSaveConsultantProfile.mockResolvedValue({ success: true });

      render(<ProfileForm {...defaultProps} variant="registration" />);

      await selectAllRequiredBadges(user);
      await fillAllRequiredTextFields(user);

      await user.click(screen.getByRole('button', { name: /가입 완료/ }));

      await waitFor(() => {
        expect(mockReplace).toHaveBeenCalledWith('/consultant/home');
      });
    });
  });

  // ---------------------------------------------------------------------------
  // 에러 상태
  // ---------------------------------------------------------------------------
  describe('에러 상태', () => {
    it('서버 예외 발생 시 서버 오류 메시지를 표시한다', async () => {
      const user = userEvent.setup();
      mockSaveConsultantProfile.mockRejectedValue(new Error('네트워크 오류'));

      render(<ProfileForm {...defaultProps} />);

      await selectAllRequiredBadges(user);
      await fillAllRequiredTextFields(user);

      await user.click(screen.getByRole('button', { name: /프로필 등록/ }));

      await waitFor(() => {
        expect(screen.getByText('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')).toBeInTheDocument();
      });
    });

    it('서버 오류 후 폼 상태가 idle로 복원된다', async () => {
      const user = userEvent.setup();
      mockSaveConsultantProfile.mockRejectedValue(new Error('네트워크 오류'));

      render(<ProfileForm {...defaultProps} />);

      await selectAllRequiredBadges(user);
      await fillAllRequiredTextFields(user);

      await user.click(screen.getByRole('button', { name: /프로필 등록/ }));

      await waitFor(() => {
        // 로딩 상태가 아닌 idle 상태로 복원되어 제출 버튼이 원래 텍스트로 돌아옴
        expect(screen.getByRole('button', { name: /프로필 등록/ })).toBeEnabled();
      });
    });

    it('실패 후 재제출이 가능하다', async () => {
      const user = userEvent.setup();
      mockSaveConsultantProfile
        .mockResolvedValueOnce({ success: false, error: '첫 번째 실패' })
        .mockResolvedValueOnce({ success: true });

      render(<ProfileForm {...defaultProps} />);

      await selectAllRequiredBadges(user);
      await fillAllRequiredTextFields(user);

      // 첫 번째 제출 실패
      await user.click(screen.getByRole('button', { name: /프로필 등록/ }));
      await waitFor(() => {
        expect(screen.getByText('첫 번째 실패')).toBeInTheDocument();
      });

      // 두 번째 제출 성공
      await user.click(screen.getByRole('button', { name: /프로필 등록/ }));
      await waitFor(() => {
        expect(screen.getByText('프로필이 성공적으로 등록되었습니다.')).toBeInTheDocument();
      });
    });
  });

  // ---------------------------------------------------------------------------
  // 네비게이션
  // ---------------------------------------------------------------------------
  describe('네비게이션', () => {
    it('돌아가기 버튼 클릭 시 backUrl로 이동한다', async () => {
      const user = userEvent.setup();
      render(<ProfileForm {...defaultProps} />);

      await user.click(screen.getByText('돌아가기'));

      expect(mockPush).toHaveBeenCalledWith('/consultant/profile');
    });

    it('취소 버튼 클릭 시 backUrl로 이동한다', async () => {
      const user = userEvent.setup();
      render(<ProfileForm {...defaultProps} />);

      await user.click(screen.getByText('취소'));

      expect(mockPush).toHaveBeenCalledWith('/consultant/profile');
    });
  });

  // ---------------------------------------------------------------------------
  // cardClassName prop
  // ---------------------------------------------------------------------------
  describe('cardClassName', () => {
    it('Card 컴포넌트에 cardClassName이 전달된다', () => {
      const { container } = render(
        <ProfileForm {...defaultProps} cardClassName="custom-card-class" />
      );

      // Card 최상위 div에 적용되는지 확인
      const card = container.querySelector('.custom-card-class');
      expect(card).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // 미저장 이탈 경고 (useBeforeUnloadGuard) — Nielsen H3·H4·H5
  // 같은 시스템 운영자 템플릿 편집(TemplateForm)과 동일 보호 패턴 적용
  // ---------------------------------------------------------------------------
  describe('미저장 이탈 경고 (useBeforeUnloadGuard)', () => {
    it('초기 상태(create 모드, 입력 없음)에서는 beforeunload 리스너가 등록되지 않는다', () => {
      const addSpy = vi.spyOn(window, 'addEventListener');
      render(<ProfileForm {...defaultProps} />);
      expect(
        addSpy.mock.calls.some((call) => call[0] === 'beforeunload'),
      ).toBe(false);
    });

    it('텍스트 input 한 글자 입력 시 beforeunload 리스너가 등록된다', () => {
      const addSpy = vi.spyOn(window, 'addEventListener');
      render(<ProfileForm {...defaultProps} />);

      const affiliationInput = screen.getByLabelText(/소속/);
      // 폼의 onInput 핸들러로 isDirty=true 진입
      fireEvent.input(affiliationInput, { target: { value: 'KPC' } });

      expect(
        addSpy.mock.calls.some((call) => call[0] === 'beforeunload'),
      ).toBe(true);
    });

    it('다중 선택 뱃지 클릭 시 beforeunload 리스너가 등록된다', async () => {
      const user = userEvent.setup();
      const addSpy = vi.spyOn(window, 'addEventListener');
      render(<ProfileForm {...defaultProps} />);

      // AI 훈련 가능 산업 첫 옵션 클릭으로 selectedIndustries 변경
      await user.click(screen.getByText('제조업'));

      await waitFor(() => {
        expect(
          addSpy.mock.calls.some((call) => call[0] === 'beforeunload'),
        ).toBe(true);
      });
    });

    it('edit 모드에서 초기값과 동일한 상태면 isDirty=false 로 리스너 미등록', () => {
      const addSpy = vi.spyOn(window, 'addEventListener');
      const baseProfile = makeProfile();
      render(<ProfileForm {...defaultProps} profile={baseProfile} />);

      expect(
        addSpy.mock.calls.some((call) => call[0] === 'beforeunload'),
      ).toBe(false);
    });
  });
});
