/**
 * interview/loading.tsx 의 searchParams.track 분기 회귀 가드.
 *
 * 실제 Roadmap 트랙은 8 스텝 (`ROADMAP_STEPS`, v2 개정), PBL 트랙은 10 스텝 (`PBL_STEPS`).
 * loading.tsx 가 트랙에 무관하게 6 스텝 고정으로 렌더하면 컨텐츠 진입 시
 * 스테퍼 자리가 2~4개 점프하므로, searchParams.track 값으로 분기되어야 함.
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

vi.mock('@/components/ui/Skeleton', () => ({
  InterviewFormSkeleton: ({ stepCount }: { stepCount?: number }) => (
    <div data-testid="mock-interview-skeleton" data-step-count={stepCount ?? 'default'} />
  ),
}));

import InterviewLoading from '../loading';

describe('interview/loading.tsx', () => {
  it('searchParams 없음 → stepCount=8 (Roadmap default, v2)', async () => {
    const ui = await InterviewLoading({ searchParams: Promise.resolve({}) });
    const { getByTestId } = render(ui);
    expect(getByTestId('mock-interview-skeleton').getAttribute('data-step-count')).toBe('8');
  });

  it('searchParams.track=PBL → stepCount=10', async () => {
    const ui = await InterviewLoading({ searchParams: Promise.resolve({ track: 'PBL' }) });
    const { getByTestId } = render(ui);
    expect(getByTestId('mock-interview-skeleton').getAttribute('data-step-count')).toBe('10');
  });

  it('searchParams.track=ROADMAP → stepCount=8 (v2)', async () => {
    const ui = await InterviewLoading({ searchParams: Promise.resolve({ track: 'ROADMAP' }) });
    const { getByTestId } = render(ui);
    expect(getByTestId('mock-interview-skeleton').getAttribute('data-step-count')).toBe('8');
  });
});
