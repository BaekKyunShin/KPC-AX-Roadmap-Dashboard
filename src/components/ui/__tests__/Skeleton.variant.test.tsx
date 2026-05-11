/**
 * Roadmap/PBL 결과 페이지 4종 variant 스켈레톤 회귀 가드.
 *
 * 이전 `RoadmapVersionCardSkeleton` 이 옛 4탭 구조(`'역량 모델링', '훈련체계도',
 * '연간 훈련계획', '훈련과정 명세서'`)에 고정되어 있었고 실제 페이지는
 * Roadmap 3탭 / PBL 5탭으로 분리됨에 따라 loading → content 전환 시
 * 탭 자리 점프가 발생했음. 본 가드는 4종 variant 의 탭 개수·description·
 * regenerate accordion 슬롯·옛 라벨 부재를 명시적으로 검증한다.
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import {
  ConsultantRoadmapPageSkeleton,
  ConsultantPBLPageSkeleton,
  OpsRoadmapPageSkeleton,
  OpsPBLPageSkeleton,
} from '../Skeleton';

describe('ConsultantRoadmapPageSkeleton', () => {
  it('PageContainer 폭(max-w-5xl mx-auto px-4 sm:px-6 lg:px-8)을 미러한다', () => {
    const { container } = render(<ConsultantRoadmapPageSkeleton />);
    const root = container.firstChild as HTMLElement;
    expect(root.className).toContain('max-w-5xl');
    expect(root.className).toContain('mx-auto');
    expect(root.className).toContain('space-y-8');
  });

  it('탭 nav 안에 정확히 3개의 탭 자리가 렌더된다', () => {
    const { getByTestId } = render(<ConsultantRoadmapPageSkeleton />);
    const tabs = getByTestId('skeleton-version-card-tabs');
    expect(tabs.querySelectorAll('nav > div').length).toBe(3);
  });

  it('카드 컨테이너 (rounded-lg + bg-white + shadow + border 가 동시에 적용된) 가 없다 — ResultTabs 평탄 구조', () => {
    const { container } = render(<ConsultantRoadmapPageSkeleton />);
    // 결과 컨텐츠 영역에는 카드 wrapper (3종 모두) 가 없어야 함
    const allDivs = container.querySelectorAll('div');
    const cardLike = Array.from(allDivs).filter(
      (d) =>
        d.className.includes('rounded-lg') &&
        d.className.includes('bg-white') &&
        d.className.includes('shadow') &&
        d.className.includes('border'),
    );
    expect(cardLike.length).toBe(0);
  });

  it('description 자리 스켈레톤이 존재한다', () => {
    const { queryByTestId } = render(<ConsultantRoadmapPageSkeleton />);
    expect(queryByTestId('skeleton-page-description')).toBeInTheDocument();
  });

  it('RegenerateAccordion 자리가 존재한다 (consultant 전용)', () => {
    const { queryByTestId } = render(<ConsultantRoadmapPageSkeleton />);
    expect(queryByTestId('skeleton-regenerate-accordion')).toBeInTheDocument();
  });

  it('옛 4탭 라벨 텍스트가 부재한다', () => {
    const { queryByText } = render(<ConsultantRoadmapPageSkeleton />);
    expect(queryByText('역량 모델링')).not.toBeInTheDocument();
    expect(queryByText('훈련체계도')).not.toBeInTheDocument();
    expect(queryByText('연간 훈련계획')).not.toBeInTheDocument();
    expect(queryByText('훈련과정 명세서')).not.toBeInTheDocument();
  });
});

describe('ConsultantPBLPageSkeleton', () => {
  it('탭 nav 안에 정확히 5개의 탭 자리가 렌더된다', () => {
    const { getByTestId } = render(<ConsultantPBLPageSkeleton />);
    const tabs = getByTestId('skeleton-version-card-tabs');
    expect(tabs.querySelectorAll('nav > div').length).toBe(5);
  });

  it('description 자리 + regenerate accordion 자리가 모두 존재한다', () => {
    const { queryByTestId } = render(<ConsultantPBLPageSkeleton />);
    expect(queryByTestId('skeleton-page-description')).toBeInTheDocument();
    expect(queryByTestId('skeleton-regenerate-accordion')).toBeInTheDocument();
  });

  it('옛 4탭 라벨이 부재한다', () => {
    const { queryByText } = render(<ConsultantPBLPageSkeleton />);
    expect(queryByText('역량 모델링')).not.toBeInTheDocument();
    expect(queryByText('훈련체계도')).not.toBeInTheDocument();
  });
});

describe('OpsRoadmapPageSkeleton', () => {
  it('탭이 3개', () => {
    const { getByTestId } = render(<OpsRoadmapPageSkeleton />);
    expect(getByTestId('skeleton-version-card-tabs').querySelectorAll('nav > div').length).toBe(3);
  });

  it('description 자리는 있지만 RegenerateAccordion 은 없다', () => {
    const { queryByTestId } = render(<OpsRoadmapPageSkeleton />);
    expect(queryByTestId('skeleton-page-description')).toBeInTheDocument();
    expect(queryByTestId('skeleton-regenerate-accordion')).not.toBeInTheDocument();
  });
});

describe('OpsPBLPageSkeleton', () => {
  it('탭이 5개', () => {
    const { getByTestId } = render(<OpsPBLPageSkeleton />);
    expect(getByTestId('skeleton-version-card-tabs').querySelectorAll('nav > div').length).toBe(5);
  });

  it('description 있고 RegenerateAccordion 없다', () => {
    const { queryByTestId } = render(<OpsPBLPageSkeleton />);
    expect(queryByTestId('skeleton-page-description')).toBeInTheDocument();
    expect(queryByTestId('skeleton-regenerate-accordion')).not.toBeInTheDocument();
  });
});
