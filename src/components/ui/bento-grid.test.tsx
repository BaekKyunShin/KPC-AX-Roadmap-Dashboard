import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { BentoGrid, BentoGridItem } from './bento-grid';

// =============================================================================
// 테스트
// =============================================================================

describe('BentoGrid', () => {
  describe('기본 렌더링', () => {
    it('grid 컨테이너가 렌더링된다', () => {
      const { container } = render(<BentoGrid />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('children을 렌더링한다', () => {
      render(
        <BentoGrid>
          <div>아이템 1</div>
          <div>아이템 2</div>
        </BentoGrid>,
      );
      expect(screen.getByText('아이템 1')).toBeInTheDocument();
      expect(screen.getByText('아이템 2')).toBeInTheDocument();
    });

    it('기본 grid 클래스를 가진다', () => {
      const { container } = render(<BentoGrid />);
      const grid = container.firstChild as HTMLElement;
      expect(grid.className).toContain('grid');
    });

    it('max-w-7xl 클래스를 가진다', () => {
      const { container } = render(<BentoGrid />);
      const grid = container.firstChild as HTMLElement;
      expect(grid.className).toContain('max-w-7xl');
    });
  });

  describe('className 전달', () => {
    it('커스텀 className이 병합된다', () => {
      const { container } = render(<BentoGrid className="custom-class" />);
      const grid = container.firstChild as HTMLElement;
      expect(grid.className).toContain('custom-class');
    });

    it('기본 클래스와 커스텀 className이 함께 존재한다', () => {
      const { container } = render(<BentoGrid className="my-custom" />);
      const grid = container.firstChild as HTMLElement;
      expect(grid.className).toContain('grid');
      expect(grid.className).toContain('my-custom');
    });
  });
});

describe('BentoGridItem', () => {
  describe('기본 렌더링', () => {
    it('컨테이너 div가 렌더링된다', () => {
      const { container } = render(<BentoGridItem />);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('기본 border 클래스를 가진다', () => {
      const { container } = render(<BentoGridItem />);
      const item = container.firstChild as HTMLElement;
      expect(item.className).toContain('border');
    });

    it('rounded-xl 클래스를 가진다', () => {
      const { container } = render(<BentoGridItem />);
      const item = container.firstChild as HTMLElement;
      expect(item.className).toContain('rounded-xl');
    });
  });

  describe('props 렌더링', () => {
    it('title이 렌더링된다', () => {
      render(<BentoGridItem title="카드 제목" />);
      expect(screen.getByText('카드 제목')).toBeInTheDocument();
    });

    it('description이 렌더링된다', () => {
      render(<BentoGridItem description="카드 설명" />);
      expect(screen.getByText('카드 설명')).toBeInTheDocument();
    });

    it('header가 렌더링된다', () => {
      render(<BentoGridItem header={<div>헤더 콘텐츠</div>} />);
      expect(screen.getByText('헤더 콘텐츠')).toBeInTheDocument();
    });

    it('icon이 렌더링된다', () => {
      render(<BentoGridItem icon={<span>아이콘</span>} />);
      expect(screen.getByText('아이콘')).toBeInTheDocument();
    });

    it('title과 description이 함께 렌더링된다', () => {
      render(<BentoGridItem title="제목" description="설명" />);
      expect(screen.getByText('제목')).toBeInTheDocument();
      expect(screen.getByText('설명')).toBeInTheDocument();
    });

    it('ReactNode title을 지원한다', () => {
      render(<BentoGridItem title={<span>리액트 제목</span>} />);
      expect(screen.getByText('리액트 제목')).toBeInTheDocument();
    });

    it('ReactNode description을 지원한다', () => {
      render(<BentoGridItem description={<span>리액트 설명</span>} />);
      expect(screen.getByText('리액트 설명')).toBeInTheDocument();
    });
  });

  describe('className 전달', () => {
    it('커스텀 className이 병합된다', () => {
      const { container } = render(<BentoGridItem className="col-span-2" />);
      const item = container.firstChild as HTMLElement;
      expect(item.className).toContain('col-span-2');
    });

    it('기본 클래스와 커스텀 className이 함께 존재한다', () => {
      const { container } = render(<BentoGridItem className="extra-class" />);
      const item = container.firstChild as HTMLElement;
      expect(item.className).toContain('rounded-xl');
      expect(item.className).toContain('extra-class');
    });
  });
});
