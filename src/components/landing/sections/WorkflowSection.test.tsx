import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================================================
// 모킹
// ============================================================================

vi.mock('gsap', () => ({
  default: {
    registerPlugin: vi.fn(),
    to: vi.fn(),
    fromTo: vi.fn(),
    set: vi.fn(),
    timeline: vi.fn(() => ({ to: vi.fn(), fromTo: vi.fn() })),
  },
  gsap: {
    registerPlugin: vi.fn(),
    to: vi.fn(),
  },
}));

vi.mock('gsap/ScrollTrigger', () => ({
  ScrollTrigger: { create: vi.fn() },
}));

import WorkflowSection from './WorkflowSection';

// ============================================================================
// 테스트
// ============================================================================

describe('WorkflowSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('섹션 기본 렌더링', () => {
    it('워크플로우 섹션이 렌더링된다', () => {
      render(<WorkflowSection />);
      const section = document.querySelector('#workflow');
      expect(section).toBeInTheDocument();
    });

    it('"워크플로우" 배지를 표시한다', () => {
      render(<WorkflowSection />);
      expect(screen.getByText('워크플로우')).toBeInTheDocument();
    });

    it('섹션 제목 텍스트를 표시한다', () => {
      render(<WorkflowSection />);
      expect(
        screen.getByText('4단계로 완성하는 맞춤형 AI 역량 강화 솔루션')
      ).toBeInTheDocument();
    });

    it('섹션 설명 텍스트를 표시한다', () => {
      render(<WorkflowSection />);
      expect(
        screen.getByText('체계적인 프로세스로 기업 맞춤형 AI 훈련 로드맵을 제공합니다.')
      ).toBeInTheDocument();
    });
  });

  describe('4개 워크플로우 스텝 렌더링', () => {
    it('기업 진단 스텝 제목이 표시된다', () => {
      render(<WorkflowSection />);
      expect(screen.getByText('기업 진단')).toBeInTheDocument();
    });

    it('최적 컨설턴트 매칭 스텝 제목이 표시된다', () => {
      render(<WorkflowSection />);
      expect(screen.getByText('최적 컨설턴트 매칭')).toBeInTheDocument();
    });

    it('심층 현장 인터뷰 스텝 제목이 표시된다', () => {
      render(<WorkflowSection />);
      expect(screen.getByText('심층 현장 인터뷰')).toBeInTheDocument();
    });

    it('맞춤형 AI 로드맵 도출 스텝 제목이 표시된다', () => {
      render(<WorkflowSection />);
      expect(screen.getByText('맞춤형 AI 로드맵 도출')).toBeInTheDocument();
    });
  });

  describe('스텝 설명 텍스트 렌더링', () => {
    it('기업 진단 설명을 표시한다', () => {
      render(<WorkflowSection />);
      expect(
        screen.getByText(/30문항 자가진단으로 기업의 AI 활용 역량/)
      ).toBeInTheDocument();
    });

    it('컨설턴트 매칭 설명을 표시한다', () => {
      render(<WorkflowSection />);
      expect(
        screen.getByText(/기업 특성에 맞는 최적의 컨설턴트를 AI 알고리즘으로/)
      ).toBeInTheDocument();
    });

    it('현장 인터뷰 설명을 표시한다', () => {
      render(<WorkflowSection />);
      expect(
        screen.getByText(/컨설턴트가 기업을 방문하여 심층 인터뷰를/)
      ).toBeInTheDocument();
    });

    it('로드맵 도출 설명을 표시한다', () => {
      render(<WorkflowSection />);
      expect(
        screen.getByText(/LLM 기반으로 맞춤형 AI 훈련 로드맵을/)
      ).toBeInTheDocument();
    });
  });

  describe('스텝 번호 렌더링', () => {
    it('4개의 스텝 번호(01~04)가 표시된다', () => {
      render(<WorkflowSection />);
      expect(screen.getByText('01')).toBeInTheDocument();
      expect(screen.getByText('02')).toBeInTheDocument();
      expect(screen.getByText('03')).toBeInTheDocument();
      expect(screen.getByText('04')).toBeInTheDocument();
    });
  });
});
