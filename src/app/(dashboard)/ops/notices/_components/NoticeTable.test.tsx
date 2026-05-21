import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// =============================================================================
// 모킹
// =============================================================================

// next/link
vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => React.createElement('a', { href, ...props }, children),
}));

// next/navigation (NoticeRowActions 내부에서 사용)
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

// Server Actions (NoticeRowActions 내부에서 사용)
vi.mock('@/app/(dashboard)/ops/notices/actions', () => ({
  togglePinAction: vi.fn(),
  deleteNoticeAction: vi.fn(),
}));

vi.mock('@/lib/utils/toast', () => ({
  showSuccessToast: vi.fn(),
  showErrorToast: vi.fn(),
}));

// useTransition (NoticeRowActions 내부에서 사용)
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return {
    ...actual,
    useTransition: () => [false, (fn: () => void) => fn()],
  };
});

// =============================================================================
// 대상 컴포넌트 임포트
// =============================================================================

import { NoticeTable } from './NoticeTable';
import type { NoticeWithMeta } from '@/lib/services/notice';

// =============================================================================
// 헬퍼
// =============================================================================

function makeNotice(overrides: Partial<NoticeWithMeta> = {}): NoticeWithMeta {
  return {
    id: 'notice-1',
    title: '테스트 공지',
    body: '공지 내용',
    is_pinned: false,
    view_count: 100,
    created_at: '2024-03-15T09:00:00Z',
    updated_at: '2024-03-15T09:00:00Z',
    author: { name: '홍길동' },
    author_name: null,
    attachment_count: 0,
    ...overrides,
  };
}

// =============================================================================
// 테스트
// =============================================================================

describe('NoticeTable', () => {
  // ---------------------------------------------------------------------------
  // 빈 상태
  // ---------------------------------------------------------------------------
  describe('빈 상태', () => {
    it('공지가 없을 때 emptyMessage가 표시된다', () => {
      render(
        <NoticeTable title="공지 목록" notices={[]} emptyMessage="공지가 없습니다." />,
      );
      expect(screen.getByText('공지가 없습니다.')).toBeInTheDocument();
    });

    it('공지가 없을 때 테이블 헤더는 표시된다', () => {
      render(
        <NoticeTable title="공지 목록" notices={[]} emptyMessage="공지가 없습니다." />,
      );
      expect(screen.getByText('제목')).toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // 렌더링
  // ---------------------------------------------------------------------------
  describe('렌더링', () => {
    it('title prop이 섹션 헤더로 표시된다', () => {
      render(
        <NoticeTable title="고정 공지" notices={[]} emptyMessage="-" />,
      );
      expect(screen.getByText('고정 공지')).toBeInTheDocument();
    });

    it('공지 목록의 제목이 링크로 표시된다', () => {
      const notices = [makeNotice()];
      render(
        <NoticeTable title="공지" notices={notices} emptyMessage="-" />,
      );
      const link = screen.getByRole('link', { name: '테스트 공지' });
      expect(link).toHaveAttribute('href', '/notices/notice-1');
    });

    it('공지 작성일이 한국식 점 포맷(KST)으로 표시된다', () => {
      // 2024-03-15T09:00:00Z == KST 2024-03-15 18:00 — 같은 날
      const notices = [makeNotice({ created_at: '2024-03-15T09:00:00Z' })];
      render(
        <NoticeTable title="공지" notices={notices} emptyMessage="-" />,
      );
      expect(screen.getByText('2024. 3. 15.')).toBeInTheDocument();
    });

    it('UTC 자정 경계 ISO를 KST 일자로 표시한다 (regression: timezone)', () => {
      // 2026-05-20T16:00:00Z == KST 2026-05-21 01:00
      // 서버(UTC) 환경에서 timezone 미적용 시 "2026-05-20"으로 잘못 표시되는 회귀를 잡는다.
      const notices = [makeNotice({ created_at: '2026-05-20T16:00:00Z' })];
      render(
        <NoticeTable title="공지" notices={notices} emptyMessage="-" />,
      );
      expect(screen.getByText('2026. 5. 21.')).toBeInTheDocument();
    });

    it('author.name이 있으면 작성자 셀에 표시된다', () => {
      const notices = [makeNotice({ author: { name: '김철수' } })];
      render(
        <NoticeTable title="공지" notices={notices} emptyMessage="-" />,
      );
      expect(screen.getByText('김철수')).toBeInTheDocument();
    });

    it('author_name 우선값이 있으면 author.name 대신 표시된다', () => {
      const notices = [
        makeNotice({ author: { name: '홍길동' }, author_name: '이영희' }),
      ];
      render(
        <NoticeTable title="공지" notices={notices} emptyMessage="-" />,
      );
      expect(screen.getByText('이영희')).toBeInTheDocument();
    });

    it('attachment_count가 0이면 첨부 셀에 "-"이 표시된다', () => {
      const notices = [makeNotice({ attachment_count: 0 })];
      render(
        <NoticeTable title="공지" notices={notices} emptyMessage="-" />,
      );
      // 헤더의 "-"와 셀의 "-" 모두 포함할 수 있으므로 적어도 1개 이상
      expect(screen.getAllByText('-').length).toBeGreaterThanOrEqual(1);
    });

    it('attachment_count가 있으면 "N개" 배지가 표시된다', () => {
      const notices = [makeNotice({ attachment_count: 3 })];
      render(
        <NoticeTable title="공지" notices={notices} emptyMessage="-" />,
      );
      expect(screen.getByText('3개')).toBeInTheDocument();
    });

    it('is_pinned가 true면 핀 아이콘에 aria-label="상단 고정"이 있다', () => {
      const notices = [makeNotice({ is_pinned: true })];
      render(
        <NoticeTable title="공지" notices={notices} emptyMessage="-" />,
      );
      expect(screen.getByLabelText('상단 고정')).toBeInTheDocument();
    });

    it('view_count가 숫자로 표시된다', () => {
      const notices = [makeNotice({ view_count: 1234 })];
      render(
        <NoticeTable title="공지" notices={notices} emptyMessage="-" />,
      );
      // toLocaleString 적용 → '1,234' or '1234'
      expect(screen.getByText(/1.234|1234/)).toBeInTheDocument();
    });

    it('여러 공지가 있을 때 모두 렌더링된다', () => {
      const notices = [
        makeNotice({ id: 'n-1', title: '첫 번째 공지' }),
        makeNotice({ id: 'n-2', title: '두 번째 공지' }),
        makeNotice({ id: 'n-3', title: '세 번째 공지' }),
      ];
      render(
        <NoticeTable title="공지" notices={notices} emptyMessage="-" />,
      );
      expect(screen.getByText('첫 번째 공지')).toBeInTheDocument();
      expect(screen.getByText('두 번째 공지')).toBeInTheDocument();
      expect(screen.getByText('세 번째 공지')).toBeInTheDocument();
    });
  });
});
