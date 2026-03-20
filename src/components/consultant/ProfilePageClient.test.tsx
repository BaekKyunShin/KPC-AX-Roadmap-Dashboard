import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockFetchConsultantProfile = vi.fn();

vi.mock('@/app/(auth)/actions', () => ({
  fetchConsultantProfile: (...args: unknown[]) =>
    mockFetchConsultantProfile(...args),
}));

vi.mock('@/components/consultant/ProfileForm', () => ({
  default: (props: {
    profile: unknown;
    backUrl: string;
    successRedirectUrl: string;
    backLabel: string;
  }) => (
    <div data-testid="profile-form">
      <span data-testid="back-url">{props.backUrl}</span>
      <span data-testid="success-redirect-url">{props.successRedirectUrl}</span>
      <span data-testid="back-label">{props.backLabel}</span>
    </div>
  ),
}));

vi.mock('@/components/ui/Skeleton', () => ({
  ProfileFormSkeleton: () => <div data-testid="profile-form-skeleton" />,
}));

// ─── SUT ─────────────────────────────────────────────────────────────────────

import ProfilePageClient from './ProfilePageClient';

// ─── 테스트 ──────────────────────────────────────────────────────────────────

const defaultProps = {
  backUrl: '/consultant/home',
  successRedirectUrl: '/consultant/home',
  backLabel: '홈으로',
};

describe('ProfilePageClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('로딩 상태', () => {
    it('fetchConsultantProfile이 아직 완료되지 않으면 스켈레톤을 표시한다', () => {
      // 영원히 resolve하지 않는 Promise로 로딩 상태 유지
      mockFetchConsultantProfile.mockReturnValue(new Promise(() => {}));

      render(<ProfilePageClient {...defaultProps} />);

      expect(screen.getByTestId('profile-form-skeleton')).toBeInTheDocument();
    });
  });

  describe('성공 상태', () => {
    it('프로필 조회 성공 시 ProfileForm을 렌더링한다', async () => {
      const mockProfile = {
        id: 'profile-1',
        user_id: 'user-1',
        display_name: '테스트 컨설턴트',
      };

      mockFetchConsultantProfile.mockResolvedValue({
        success: true,
        data: { profile: mockProfile },
      });

      render(<ProfilePageClient {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('profile-form')).toBeInTheDocument();
      });

      expect(screen.getByTestId('back-url')).toHaveTextContent(
        '/consultant/home'
      );
      expect(screen.getByTestId('success-redirect-url')).toHaveTextContent(
        '/consultant/home'
      );
      expect(screen.getByTestId('back-label')).toHaveTextContent('홈으로');
    });

    it('프로필이 null이어도 ProfileForm을 렌더링한다', async () => {
      mockFetchConsultantProfile.mockResolvedValue({
        success: true,
        data: { profile: null },
      });

      render(<ProfilePageClient {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByTestId('profile-form')).toBeInTheDocument();
      });
    });

    it('backLabel 기본값은 "돌아가기"이다', async () => {
      mockFetchConsultantProfile.mockResolvedValue({
        success: true,
        data: { profile: null },
      });

      render(
        <ProfilePageClient
          backUrl="/consultant/home"
          successRedirectUrl="/consultant/home"
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('back-label')).toHaveTextContent('돌아가기');
      });
    });
  });

  describe('에러 상태', () => {
    it('서버 액션이 실패를 반환하면 에러 메시지를 표시한다', async () => {
      mockFetchConsultantProfile.mockResolvedValue({
        success: false,
        error: '프로필 조회 권한이 없습니다.',
      });

      render(<ProfilePageClient {...defaultProps} />);

      await waitFor(() => {
        expect(
          screen.getByText('프로필 조회 권한이 없습니다.')
        ).toBeInTheDocument();
      });

      // 스켈레톤과 ProfileForm은 표시되지 않아야 함
      expect(screen.queryByTestId('profile-form-skeleton')).not.toBeInTheDocument();
      expect(screen.queryByTestId('profile-form')).not.toBeInTheDocument();
    });

    it('예외 발생 시 기본 에러 메시지를 표시한다', async () => {
      mockFetchConsultantProfile.mockRejectedValue(new Error('Network error'));

      render(<ProfilePageClient {...defaultProps} />);

      await waitFor(() => {
        expect(
          screen.getByText('프로필을 불러오는데 실패했습니다.')
        ).toBeInTheDocument();
      });
    });
  });
});
