import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@/test/helpers/mock-next-link';

// =============================================================================
// 모킹
// =============================================================================

vi.mock('@/lib/utils/consultant-home', () => ({
  getActivityAction: (logType: string, content?: string) => {
    if (logType === 'pre_research') return '의 사전조사 메모를 작성했습니다.';
    if (logType === 'system_auto') return `의 ${content}`;
    return ` — ${content || ''}`;
  },
  getActivityTagInfo: (logType: string, content?: string) => {
    if (logType === 'pre_research') {
      return { label: '활동메모', bgColor: 'bg-emerald-50', textColor: 'text-emerald-700' };
    }
    if (logType === 'system_auto' && content?.includes('인터뷰')) {
      return { label: '인터뷰', bgColor: 'bg-blue-50', textColor: 'text-blue-700' };
    }
    if (logType === 'system_auto' && content?.includes('로드맵')) {
      return { label: '로드맵', bgColor: 'bg-purple-50', textColor: 'text-purple-700' };
    }
    return { label: '시스템', bgColor: 'bg-gray-50', textColor: 'text-gray-500' };
  },
}));

// =============================================================================
// Import
// =============================================================================

import { RecentActivity, type RecentActivityItem } from './RecentActivity';

// =============================================================================
// 테스트 데이터
// =============================================================================

function makeActivity(overrides: Partial<RecentActivityItem> = {}): RecentActivityItem {
  return {
    id: 'act-1',
    projectId: 'proj-1',
    companyName: '테스트기업',
    content: '사전조사 완료',
    logType: 'pre_research',
    relativeTime: '오늘 10:00',
    ...overrides,
  };
}

// =============================================================================
// 테스트
// =============================================================================

describe('RecentActivity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('빈 상태', () => {
    it('activities가 비어있으면 안내 메시지를 표시한다', () => {
      render(<RecentActivity activities={[]} />);
      expect(screen.getByText('최근 활동이 없습니다.')).toBeInTheDocument();
    });

    it('activities가 비어있으면 목록이 렌더링되지 않는다', () => {
      const { container } = render(<RecentActivity activities={[]} />);
      expect(container.querySelector('.divide-y')).not.toBeInTheDocument();
    });
  });

  describe('활동 아이템 렌더링', () => {
    it('기업명을 표시한다', () => {
      render(<RecentActivity activities={[makeActivity({ companyName: '삼성전자' })]} />);
      expect(screen.getByText('삼성전자')).toBeInTheDocument();
    });

    it('상대 시간을 표시한다', () => {
      render(<RecentActivity activities={[makeActivity({ relativeTime: '2일 전' })]} />);
      expect(screen.getByText('2일 전')).toBeInTheDocument();
    });

    it('활동 태그 라벨을 표시한다', () => {
      render(<RecentActivity activities={[makeActivity({ logType: 'pre_research' })]} />);
      expect(screen.getByText('활동메모')).toBeInTheDocument();
    });

    it('system_auto 인터뷰 로그는 인터뷰 태그를 표시한다', () => {
      render(
        <RecentActivity
          activities={[
            makeActivity({ logType: 'system_auto', content: '인터뷰가 저장되었습니다.' }),
          ]}
        />,
      );
      expect(screen.getByText('인터뷰')).toBeInTheDocument();
    });

    it('system_auto 로드맵 로그는 로드맵 태그를 표시한다', () => {
      render(
        <RecentActivity
          activities={[
            makeActivity({ logType: 'system_auto', content: '로드맵이 생성되었습니다.' }),
          ]}
        />,
      );
      expect(screen.getByText('로드맵')).toBeInTheDocument();
    });
  });

  describe('링크', () => {
    it('프로젝트 상세 링크가 올바른 href를 가진다', () => {
      render(<RecentActivity activities={[makeActivity({ projectId: 'proj-xyz' })]} />);
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', '/consultant/projects/proj-xyz');
    });

    it('여러 활동이 있을 때 각각 링크를 가진다', () => {
      const activities = [
        makeActivity({ id: 'a1', projectId: 'proj-1' }),
        makeActivity({ id: 'a2', projectId: 'proj-2' }),
      ];
      render(<RecentActivity activities={activities} />);
      const links = screen.getAllByRole('link');
      expect(links).toHaveLength(2);
      expect(links[0]).toHaveAttribute('href', '/consultant/projects/proj-1');
      expect(links[1]).toHaveAttribute('href', '/consultant/projects/proj-2');
    });
  });

  describe('여러 활동', () => {
    it('여러 활동을 모두 렌더링한다', () => {
      const activities = [
        makeActivity({ id: 'a1', companyName: '기업A' }),
        makeActivity({ id: 'a2', companyName: '기업B' }),
        makeActivity({ id: 'a3', companyName: '기업C' }),
      ];
      render(<RecentActivity activities={activities} />);
      expect(screen.getByText('기업A')).toBeInTheDocument();
      expect(screen.getByText('기업B')).toBeInTheDocument();
      expect(screen.getByText('기업C')).toBeInTheDocument();
    });
  });

  describe('TAG_ICON_MAP 폴백 분기', () => {
    it('TAG_ICON_MAP에 없는 label이면 FileText 아이콘으로 폴백된다', () => {
      // Line 38: TAG_ICON_MAP[tagInfo.label] || FileText → false 경로 커버
      // mock에서 system_auto + 비인터뷰/비로드맵 → label: '시스템' 반환 (map에 없음)
      const activity = makeActivity({
        logType: 'system_auto',
        content: '기타 활동', // 인터뷰/로드맵 아님
      });
      // 에러 없이 렌더링되고 '시스템' 태그가 표시됨
      expect(() => render(<RecentActivity activities={[activity]} />)).not.toThrow();
      expect(screen.getByText('시스템')).toBeInTheDocument();
    });
  });
});
