import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@/test/helpers/mock-next-link';

// =============================================================================
// 모킹
// =============================================================================

vi.mock('@/lib/constants/status', () => ({
  CONSULTANT_PROJECT_STATUS_CONFIG: {
    ASSIGNED: { label: '인터뷰 대기', color: 'bg-blue-100 text-blue-800' },
    INTERVIEWED: { label: '인터뷰 완료', color: 'bg-amber-100 text-amber-800' },
    ROADMAP_DRAFTED: { label: '로드맵 작성 중', color: 'bg-purple-100 text-purple-800' },
    FINALIZED: { label: '로드맵 완료', color: 'bg-green-100 text-green-800' },
  },
}));

// =============================================================================
// Import
// =============================================================================

import { RecentProjects, type RecentProjectItem } from './RecentProjects';

// =============================================================================
// 테스트 데이터
// =============================================================================

function makeProject(overrides: Partial<RecentProjectItem> = {}): RecentProjectItem {
  return {
    id: 'proj-1',
    companyName: '테스트기업',
    industry: '제조업',
    companySizeLabel: '중소기업',
    status: 'ASSIGNED',
    relativeTime: '오늘 14:30',
    ...overrides,
  };
}

// =============================================================================
// 테스트
// =============================================================================

describe('RecentProjects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('빈 상태', () => {
    it('projects가 비어있으면 안내 메시지를 표시한다', () => {
      render(<RecentProjects projects={[]} />);
      expect(screen.getByText('최근 작업한 프로젝트가 없습니다.')).toBeInTheDocument();
    });

    it('projects가 비어있으면 테이블 헤더가 표시되지 않는다', () => {
      render(<RecentProjects projects={[]} />);
      expect(screen.queryByText('기업명')).not.toBeInTheDocument();
    });
  });

  describe('프로젝트 목록 렌더링', () => {
    it('프로젝트가 있으면 열 제목을 표시한다', () => {
      render(<RecentProjects projects={[makeProject()]} />);
      expect(screen.getByText('기업명')).toBeInTheDocument();
      expect(screen.getByText('상태')).toBeInTheDocument();
      expect(screen.getByText('최근 활동')).toBeInTheDocument();
    });

    it('기업명을 표시한다', () => {
      render(<RecentProjects projects={[makeProject({ companyName: '삼성전자' })]} />);
      expect(screen.getByText('삼성전자')).toBeInTheDocument();
    });

    it('상태 배지를 표시한다', () => {
      render(<RecentProjects projects={[makeProject({ status: 'ASSIGNED' })]} />);
      expect(screen.getByText('인터뷰 대기')).toBeInTheDocument();
    });

    it('상대 시간을 표시한다', () => {
      render(<RecentProjects projects={[makeProject({ relativeTime: '3일 전' })]} />);
      expect(screen.getByText('3일 전')).toBeInTheDocument();
    });

    it('업종을 표시한다', () => {
      render(<RecentProjects projects={[makeProject({ industry: 'IT/소프트웨어' })]} />);
      expect(screen.getByText('IT/소프트웨어')).toBeInTheDocument();
    });

    it('기업 규모를 표시한다', () => {
      render(<RecentProjects projects={[makeProject({ companySizeLabel: '대기업' })]} />);
      expect(screen.getByText('대기업')).toBeInTheDocument();
    });
  });

  describe('링크', () => {
    it('프로젝트 상세 링크가 올바른 href를 가진다', () => {
      render(<RecentProjects projects={[makeProject({ id: 'proj-abc' })]} />);
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', '/consultant/projects/proj-abc');
    });

    it('여러 프로젝트가 있을 때 각각 링크를 가진다', () => {
      const projects = [
        makeProject({ id: 'proj-1', companyName: '기업A' }),
        makeProject({ id: 'proj-2', companyName: '기업B' }),
        makeProject({ id: 'proj-3', companyName: '기업C' }),
      ];
      render(<RecentProjects projects={projects} />);
      const links = screen.getAllByRole('link');
      expect(links).toHaveLength(3);
      expect(links[0]).toHaveAttribute('href', '/consultant/projects/proj-1');
      expect(links[1]).toHaveAttribute('href', '/consultant/projects/proj-2');
      expect(links[2]).toHaveAttribute('href', '/consultant/projects/proj-3');
    });
  });

  describe('다양한 상태', () => {
    it('FINALIZED 상태 배지를 표시한다', () => {
      render(<RecentProjects projects={[makeProject({ status: 'FINALIZED' })]} />);
      expect(screen.getByText('로드맵 완료')).toBeInTheDocument();
    });

    it('ROADMAP_DRAFTED 상태 배지를 표시한다', () => {
      render(<RecentProjects projects={[makeProject({ status: 'ROADMAP_DRAFTED' })]} />);
      expect(screen.getByText('로드맵 작성 중')).toBeInTheDocument();
    });

    it('알 수 없는 상태는 원본 값을 표시한다', () => {
      render(<RecentProjects projects={[makeProject({ status: 'UNKNOWN_STATUS' })]} />);
      expect(screen.getByText('UNKNOWN_STATUS')).toBeInTheDocument();
    });
  });

  describe('여러 프로젝트', () => {
    it('여러 프로젝트를 모두 렌더링한다', () => {
      const projects = [
        makeProject({ id: 'p1', companyName: '기업A' }),
        makeProject({ id: 'p2', companyName: '기업B' }),
      ];
      render(<RecentProjects projects={projects} />);
      expect(screen.getByText('기업A')).toBeInTheDocument();
      expect(screen.getByText('기업B')).toBeInTheDocument();
    });
  });
});
