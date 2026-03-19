import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { RoadmapStatusBadge } from './RoadmapStatusBadge';

// ============================================================================
// 테스트
// ============================================================================

describe('RoadmapStatusBadge', () => {
  describe('상태별 라벨', () => {
    it('DRAFT 상태 (버전 1)는 "초안"으로 표시한다', () => {
      render(<RoadmapStatusBadge status="DRAFT" versionNumber={1} />);
      expect(screen.getByText('초안')).toBeInTheDocument();
    });

    it('DRAFT 상태 (버전 2)는 "수정본"으로 표시한다', () => {
      render(<RoadmapStatusBadge status="DRAFT" versionNumber={2} />);
      expect(screen.getByText('수정본')).toBeInTheDocument();
    });

    it('DRAFT 상태 (버전 3 이상)도 "수정본"으로 표시한다', () => {
      render(<RoadmapStatusBadge status="DRAFT" versionNumber={5} />);
      expect(screen.getByText('수정본')).toBeInTheDocument();
    });

    it('DRAFT 상태에서 versionNumber가 undefined이면 "초안"으로 표시한다', () => {
      render(<RoadmapStatusBadge status="DRAFT" />);
      expect(screen.getByText('초안')).toBeInTheDocument();
    });

    it('FINAL 상태는 "확정본"으로 표시한다', () => {
      render(<RoadmapStatusBadge status="FINAL" />);
      expect(screen.getByText('확정본')).toBeInTheDocument();
    });

    it('FINAL 상태는 versionNumber와 관계없이 "확정본"으로 표시한다', () => {
      render(<RoadmapStatusBadge status="FINAL" versionNumber={3} />);
      expect(screen.getByText('확정본')).toBeInTheDocument();
    });

    it('ARCHIVED 상태는 "이전 확정본"으로 표시한다', () => {
      render(<RoadmapStatusBadge status="ARCHIVED" />);
      expect(screen.getByText('이전 확정본')).toBeInTheDocument();
    });

    it('ARCHIVED 상태는 versionNumber와 관계없이 "이전 확정본"으로 표시한다', () => {
      render(<RoadmapStatusBadge status="ARCHIVED" versionNumber={1} />);
      expect(screen.getByText('이전 확정본')).toBeInTheDocument();
    });
  });

  describe('상태별 색상', () => {
    it('DRAFT 상태에 노란색 배지 스타일을 적용한다', () => {
      render(<RoadmapStatusBadge status="DRAFT" />);
      const badge = screen.getByText('초안');
      expect(badge).toHaveClass('bg-yellow-100');
      expect(badge).toHaveClass('text-yellow-800');
    });

    it('FINAL 상태에 녹색 배지 스타일을 적용한다', () => {
      render(<RoadmapStatusBadge status="FINAL" />);
      const badge = screen.getByText('확정본');
      expect(badge).toHaveClass('bg-green-100');
      expect(badge).toHaveClass('text-green-800');
    });

    it('ARCHIVED 상태에 회색 배지 스타일을 적용한다', () => {
      render(<RoadmapStatusBadge status="ARCHIVED" />);
      const badge = screen.getByText('이전 확정본');
      expect(badge).toHaveClass('bg-gray-100');
      expect(badge).toHaveClass('text-gray-800');
    });
  });
});
