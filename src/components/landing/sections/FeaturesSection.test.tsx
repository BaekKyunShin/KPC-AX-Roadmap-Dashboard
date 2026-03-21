import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================================================
// 모킹
// ============================================================================

// GSAP 동적 import mock
vi.mock('gsap', () => ({
  default: {
    to: vi.fn(),
    from: vi.fn(),
    fromTo: vi.fn(),
    registerPlugin: vi.fn(),
    timeline: vi.fn(() => ({
      to: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      fromTo: vi.fn().mockReturnThis(),
    })),
  },
  gsap: {
    to: vi.fn(),
    from: vi.fn(),
    registerPlugin: vi.fn(),
  },
}));

vi.mock('gsap/ScrollTrigger', () => ({
  ScrollTrigger: { create: vi.fn(), refresh: vi.fn() },
}));

// cn mock
vi.mock('@/lib/utils', () => ({
  cn: (...args: unknown[]) => args.filter(Boolean).join(' '),
}));

import FeaturesSection from './FeaturesSection';

// ============================================================================
// 테스트
// ============================================================================

describe('FeaturesSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('섹션 헤더', () => {
    it('섹션이 렌더링된다', () => {
      render(<FeaturesSection />);
      const section = document.querySelector('#features');
      expect(section).toBeInTheDocument();
    });

    it('"서비스 소개" 배지를 표시한다', () => {
      render(<FeaturesSection />);
      expect(screen.getByText('서비스 소개')).toBeInTheDocument();
    });

    it('섹션 제목 텍스트를 표시한다', () => {
      render(<FeaturesSection />);
      expect(
        screen.getByText('고객사 맞춤형 AX 교육 설계 올인원 플랫폼')
      ).toBeInTheDocument();
    });
  });

  describe('카드 렌더링', () => {
    it('두 개의 기능 카드를 렌더링한다', () => {
      render(<FeaturesSection />);
      // 두 카드의 카테고리 뱃지 확인
      expect(screen.getByText('전문가용')).toBeInTheDocument();
      expect(screen.getByText('관리자용')).toBeInTheDocument();
    });

    it('컨설턴트 카드 제목을 표시한다', () => {
      render(<FeaturesSection />);
      // whitespace-pre-line으로 줄바꿈 처리됨 → 두 줄을 포함하는 텍스트 검색
      expect(screen.getByText(/전문가와 함께하는/)).toBeInTheDocument();
    });

    it('운영관리자 카드 제목을 표시한다', () => {
      render(<FeaturesSection />);
      expect(screen.getByText(/효율적인/)).toBeInTheDocument();
    });

    it('컨설턴트 카드 설명을 표시한다', () => {
      render(<FeaturesSection />);
      expect(
        screen.getByText(/담당 프로젝트를 관리하고 현장 인터뷰를 통해/)
      ).toBeInTheDocument();
    });

    it('운영관리자 카드 설명을 표시한다', () => {
      render(<FeaturesSection />);
      expect(
        screen.getByText(/기업 프로젝트를 생성하고 최적의 컨설턴트를 매칭/)
      ).toBeInTheDocument();
    });
  });

  describe('기능 항목 렌더링', () => {
    it('컨설턴트 카드의 기능 항목들을 표시한다', () => {
      render(<FeaturesSection />);
      expect(screen.getByText('현장 인터뷰를 통한 기업진단')).toBeInTheDocument();
      expect(screen.getByText('최적화된 맞춤형 AI 로드맵 제공')).toBeInTheDocument();
      expect(screen.getByText('PBL 기반 솔루션 제시')).toBeInTheDocument();
    });

    it('운영관리자 카드의 기능 항목들을 표시한다', () => {
      render(<FeaturesSection />);
      expect(screen.getByText('고객사 프로젝트 관리')).toBeInTheDocument();
      expect(screen.getByText('요구사항을 반영한 최적 컨설턴트 매칭')).toBeInTheDocument();
      expect(screen.getByText('진행 상황 모니터링')).toBeInTheDocument();
    });
  });

  describe('CTA 링크', () => {
    it('컨설턴트 카드 CTA 텍스트를 표시한다', () => {
      render(<FeaturesSection />);
      expect(screen.getByText('로그인하여 시작하기')).toBeInTheDocument();
    });

    it('운영관리자 카드 CTA 텍스트를 표시한다', () => {
      render(<FeaturesSection />);
      expect(screen.getByText('관리자 로그인')).toBeInTheDocument();
    });

    it('두 CTA 링크가 모두 /login으로 연결된다', () => {
      render(<FeaturesSection />);
      const ctaLinks = screen
        .getAllByRole('link')
        .filter((link) => link.getAttribute('href') === '/login');
      expect(ctaLinks).toHaveLength(2);
    });
  });
});
