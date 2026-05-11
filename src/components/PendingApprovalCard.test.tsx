import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@/test/helpers/mock-next-link';
import PendingApprovalCard from './PendingApprovalCard';

// =============================================================================
// 테스트
// =============================================================================

describe('PendingApprovalCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('공통 렌더링', () => {
    it('승인 대기 중 제목을 표시한다', () => {
      render(<PendingApprovalCard userName="테스트" userRole="CONSULTANT" />);
      expect(screen.getByText('승인 대기 중입니다')).toBeInTheDocument();
    });

    it('사용자 이름을 환영 메시지에 표시한다', () => {
      render(<PendingApprovalCard userName="홍길동" userRole="CONSULTANT" />);
      expect(screen.getByText('홍길동')).toBeInTheDocument();
    });

    it('도움말 카드를 표시한다', () => {
      render(<PendingApprovalCard userName="테스트" userRole="CONSULTANT" />);
      expect(screen.getByText('도움이 필요하신가요?')).toBeInTheDocument();
      expect(screen.getByText('ykkim@kpc.or.kr')).toBeInTheDocument();
      expect(screen.getByText('02-398-7667')).toBeInTheDocument();
    });

    it('운영 담당자 전화번호 tel: 링크를 표시한다', () => {
      render(<PendingApprovalCard userName="테스트" userRole="CONSULTANT" />);
      const links = screen.getAllByRole('link');
      const phoneLink = links.find((l) => l.getAttribute('href') === 'tel:02-398-7667');
      expect(phoneLink).toBeDefined();
    });

    it('예상 소요 시간 뱃지를 표시한다', () => {
      render(<PendingApprovalCard userName="테스트" userRole="OPS_ADMIN" />);
      expect(screen.getByText(/영업일 기준 2~3일 소요/)).toBeInTheDocument();
    });
  });

  describe('컨설턴트 역할', () => {
    it('컨설턴트 역할 뱃지를 표시한다', () => {
      render(<PendingApprovalCard userName="김컨설턴트" userRole="CONSULTANT" />);
      expect(screen.getByText('컨설턴트')).toBeInTheDocument();
    });

    it('프로필 검토 관련 설명을 표시한다', () => {
      render(<PendingApprovalCard userName="김컨설턴트" userRole="CONSULTANT" />);
      expect(screen.getByText('프로필 검토가 진행 중이에요')).toBeInTheDocument();
    });

    it('컨설턴트 진행 단계 4개를 표시한다', () => {
      render(<PendingApprovalCard userName="김컨설턴트" userRole="CONSULTANT" />);
      expect(screen.getByText('가입 완료')).toBeInTheDocument();
      expect(screen.getByText('프로필 검토')).toBeInTheDocument();
      expect(screen.getByText('승인 완료')).toBeInTheDocument();
      expect(screen.getByText('서비스 이용')).toBeInTheDocument();
    });

    it('진행 상태 제목을 표시한다', () => {
      render(<PendingApprovalCard userName="김컨설턴트" userRole="CONSULTANT" />);
      expect(screen.getByText('진행 상태')).toBeInTheDocument();
    });

    it('hasProfile이 true이면 프로필 수정 링크를 표시한다', () => {
      render(<PendingApprovalCard userName="김컨설턴트" userRole="CONSULTANT" hasProfile={true} />);
      // 여러 link가 존재 (이메일, 전화, 프로필 수정)하므로 href로 특정
      const links = screen.getAllByRole('link');
      const profileLink = links.find((l) => l.getAttribute('href') === '/dashboard/profile');
      expect(profileLink).toBeDefined();
    });

    it('hasProfile이 false이면 프로필 수정 링크를 표시하지 않는다', () => {
      render(
        <PendingApprovalCard userName="김컨설턴트" userRole="CONSULTANT" hasProfile={false} />,
      );
      const links = screen.getAllByRole('link');
      const profileLink = links.find((l) => l.getAttribute('href') === '/dashboard/profile');
      expect(profileLink).toBeUndefined();
    });

    it('hasProfile 기본값은 false이다', () => {
      render(<PendingApprovalCard userName="김컨설턴트" userRole="CONSULTANT" />);
      const links = screen.getAllByRole('link');
      const profileLink = links.find((l) => l.getAttribute('href') === '/dashboard/profile');
      expect(profileLink).toBeUndefined();
    });

    it('컨설턴트 안내 메시지를 표시한다', () => {
      render(<PendingApprovalCard userName="김컨설턴트" userRole="CONSULTANT" />);
      expect(
        screen.getByText(/AI 훈련 로드맵 생성 기능을 이용하실 수 있습니다/),
      ).toBeInTheDocument();
    });
  });

  describe('운영관리자 역할', () => {
    it('운영관리자 역할 뱃지를 표시한다', () => {
      render(<PendingApprovalCard userName="박관리자" userRole="OPS_ADMIN" />);
      expect(screen.getByText('운영관리자')).toBeInTheDocument();
    });

    it('관리자 승인 관련 설명을 표시한다', () => {
      render(<PendingApprovalCard userName="박관리자" userRole="OPS_ADMIN" />);
      expect(screen.getByText('관리자 승인이 진행 중이에요')).toBeInTheDocument();
    });

    it('운영관리자 진행 단계 3개를 표시한다', () => {
      render(<PendingApprovalCard userName="박관리자" userRole="OPS_ADMIN" />);
      expect(screen.getByText('가입 완료')).toBeInTheDocument();
      expect(screen.getByText('관리자 승인')).toBeInTheDocument();
      expect(screen.getByText('서비스 이용')).toBeInTheDocument();
    });

    it('운영관리자 안내 메시지를 표시한다', () => {
      render(<PendingApprovalCard userName="박관리자" userRole="OPS_ADMIN" />);
      expect(
        screen.getByText(/프로젝트 관리 및 사용자 관리 기능을 이용하실 수 있습니다/),
      ).toBeInTheDocument();
    });

    it('운영관리자에서는 프로필 수정 링크가 표시되지 않는다', () => {
      render(<PendingApprovalCard userName="박관리자" userRole="OPS_ADMIN" hasProfile={true} />);
      const links = screen.getAllByRole('link');
      const profileLink = links.find((l) => l.getAttribute('href') === '/dashboard/profile');
      expect(profileLink).toBeUndefined();
    });
  });
});
