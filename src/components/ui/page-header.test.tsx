import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// =============================================================================
// 모킹 (최상단에 배치)
// =============================================================================

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

vi.mock('@/components/ui/back-button', () => ({
  BackButton: ({
    label,
    fallbackHref,
  }: {
    label: string;
    fallbackHref: string;
  }) => (
    <button type="button" data-testid="back-button" data-fallback={fallbackHref}>
      {label}
    </button>
  ),
  BACK_LINK_STYLES: 'inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-2',
}));

vi.mock('lucide-react', () => ({
  ArrowLeft: () => <span data-testid="arrow-left-icon">←</span>,
}));

import { PageHeader } from './page-header';
import React from 'react';

// =============================================================================
// 테스트
// =============================================================================

describe('PageHeader', () => {
  describe('기본 렌더링', () => {
    it('title을 h1 태그로 렌더링한다', () => {
      render(<PageHeader title="프로젝트 관리" />);
      expect(screen.getByRole('heading', { level: 1, name: '프로젝트 관리' })).toBeInTheDocument();
    });

    it('h1 태그에 bold 스타일 클래스가 있다', () => {
      render(<PageHeader title="제목" />);
      const h1 = screen.getByRole('heading', { level: 1 });
      expect(h1.className).toContain('font-bold');
    });
  });

  describe('description 표시', () => {
    it('description이 있으면 표시한다', () => {
      render(<PageHeader title="제목" description="기업 프로젝트를 관리합니다" />);
      expect(screen.getByText('기업 프로젝트를 관리합니다')).toBeInTheDocument();
    });

    it('description이 없으면 설명 텍스트가 없다', () => {
      render(<PageHeader title="제목" />);
      // p 태그 없음 확인 (h1 제외)
      const paragraphs = document.querySelectorAll('p');
      expect(paragraphs.length).toBe(0);
    });

    it('description이 p 태그로 렌더링된다', () => {
      const { container } = render(<PageHeader title="제목" description="설명" />);
      expect(container.querySelector('p')).toBeInTheDocument();
    });
  });

  describe('actions 영역', () => {
    it('actions가 있으면 렌더링된다', () => {
      render(
        <PageHeader
          title="제목"
          actions={<button type="button">새 항목</button>}
        />,
      );
      expect(screen.getByRole('button', { name: '새 항목' })).toBeInTheDocument();
    });

    it('actions가 없으면 액션 컨테이너가 없다', () => {
      const { container } = render(<PageHeader title="제목" />);
      // flex-shrink-0 div가 없어야 함
      const flexShrinkDiv = container.querySelector('.flex-shrink-0');
      expect(flexShrinkDiv).toBeNull();
    });
  });

  describe('backLink 옵션', () => {
    it('backLink가 없으면 뒤로가기 요소가 없다', () => {
      render(<PageHeader title="제목" />);
      expect(screen.queryByTestId('back-button')).not.toBeInTheDocument();
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });

    it('backLink.useBack이 false이면 Link 컴포넌트를 렌더링한다', () => {
      render(
        <PageHeader
          title="제목"
          backLink={{ href: '/ops/projects', label: '프로젝트 목록' }}
        />,
      );
      const link = screen.getByRole('link', { name: /프로젝트 목록/ });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '/ops/projects');
    });

    it('backLink.useBack이 true이면 BackButton 컴포넌트를 렌더링한다', () => {
      render(
        <PageHeader
          title="제목"
          backLink={{ href: '/ops/projects', label: '프로젝트 목록', useBack: true }}
        />,
      );
      expect(screen.getByTestId('back-button')).toBeInTheDocument();
      expect(screen.getByText('프로젝트 목록')).toBeInTheDocument();
    });

    it('backLink.useBack이 true이면 BackButton에 fallbackHref가 전달된다', () => {
      render(
        <PageHeader
          title="제목"
          backLink={{ href: '/consultant/projects', label: '뒤로', useBack: true }}
        />,
      );
      const backButton = screen.getByTestId('back-button');
      expect(backButton).toHaveAttribute('data-fallback', '/consultant/projects');
    });

    it('Link backLink에 label 텍스트가 포함된다', () => {
      render(
        <PageHeader
          title="제목"
          backLink={{ href: '/dashboard', label: '대시보드로' }}
        />,
      );
      expect(screen.getByText('대시보드로')).toBeInTheDocument();
    });

    it('Link backLink에 ArrowLeft 아이콘이 포함된다', () => {
      render(
        <PageHeader
          title="제목"
          backLink={{ href: '/dashboard', label: '뒤로' }}
        />,
      );
      expect(screen.getByTestId('arrow-left-icon')).toBeInTheDocument();
    });
  });

  describe('전체 조합', () => {
    it('title + description + actions + backLink 모두 렌더링된다', () => {
      render(
        <PageHeader
          title="프로젝트 상세"
          description="프로젝트 정보를 확인합니다"
          actions={<button type="button">수정</button>}
          backLink={{ href: '/ops/projects', label: '목록으로' }}
        />,
      );
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('프로젝트 상세');
      expect(screen.getByText('프로젝트 정보를 확인합니다')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '수정' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /목록으로/ })).toBeInTheDocument();
    });
  });
});
