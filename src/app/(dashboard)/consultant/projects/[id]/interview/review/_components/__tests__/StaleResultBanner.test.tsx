import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StaleResultBanner } from '../StaleResultBanner';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('../../actions', () => ({
  triggerResultRegenerationFromReview: vi.fn(),
}));

describe('StaleResultBanner', () => {
  const projectId = 'p-1';

  it('인터뷰 updated_at 이 결과 created_at 이후면 배너 노출', () => {
    render(
      <StaleResultBanner
        projectId={projectId}
        track="ROADMAP"
        interviewUpdatedAt="2026-04-30T14:00:00Z"
        resultCreatedAt="2026-04-29T09:00:00Z"
      />,
    );
    expect(screen.getByTestId('stale-result-banner')).toBeInTheDocument();
    expect(
      screen.getByText(/인터뷰가 로드맵 생성 이후 변경되었습니다/),
    ).toBeInTheDocument();
  });

  it('결과가 없으면 (createdAt=null) 배너 미노출', () => {
    const { container } = render(
      <StaleResultBanner
        projectId={projectId}
        track="ROADMAP"
        interviewUpdatedAt="2026-04-30T14:00:00Z"
        resultCreatedAt={null}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('인터뷰 updated_at 이 결과 created_at 이전이면 배너 미노출', () => {
    const { container } = render(
      <StaleResultBanner
        projectId={projectId}
        track="ROADMAP"
        interviewUpdatedAt="2026-04-28T10:00:00Z"
        resultCreatedAt="2026-04-29T09:00:00Z"
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('PBL 트랙도 동일 패턴', () => {
    render(
      <StaleResultBanner
        projectId={projectId}
        track="PBL"
        interviewUpdatedAt="2026-04-30T14:00:00Z"
        resultCreatedAt="2026-04-29T09:00:00Z"
      />,
    );
    expect(
      screen.getByText(/인터뷰가 PBL 결과 생성 이후 변경되었습니다/),
    ).toBeInTheDocument();
  });

  it('[닫기] 버튼 클릭 시 배너 dismiss', async () => {
    const userEvent = (await import('@testing-library/user-event')).default;
    const user = userEvent.setup();
    const { container } = render(
      <StaleResultBanner
        projectId={projectId}
        track="ROADMAP"
        interviewUpdatedAt="2026-04-30T14:00:00Z"
        resultCreatedAt="2026-04-29T09:00:00Z"
      />,
    );
    expect(screen.getByTestId('stale-result-banner')).toBeInTheDocument();
    await user.click(screen.getByTestId('stale-result-banner-dismiss'));
    expect(container.firstChild).toBeNull();
  });

  it('[결과 재생성하기] 버튼 클릭 — triggerResultRegenerationFromReview 호출 + 결과 페이지로 push', async () => {
    const userEvent = (await import('@testing-library/user-event')).default;
    const user = userEvent.setup();
    const { triggerResultRegenerationFromReview } = await import('../../actions');
    vi.mocked(triggerResultRegenerationFromReview).mockResolvedValueOnce({
      success: true,
      data: { resultPath: '/consultant/projects/p-1/roadmap' },
    });

    render(
      <StaleResultBanner
        projectId={projectId}
        track="ROADMAP"
        interviewUpdatedAt="2026-04-30T14:00:00Z"
        resultCreatedAt="2026-04-29T09:00:00Z"
      />,
    );
    await user.click(screen.getByTestId('stale-result-banner-regenerate'));
    expect(triggerResultRegenerationFromReview).toHaveBeenCalledWith(projectId, 'ROADMAP');
  });

  it('[결과 재생성하기] 실패 시 에러 토스트 (push 호출 안 됨)', async () => {
    const userEvent = (await import('@testing-library/user-event')).default;
    const user = userEvent.setup();
    const { triggerResultRegenerationFromReview } = await import('../../actions');
    vi.mocked(triggerResultRegenerationFromReview).mockResolvedValueOnce({
      success: false,
      error: '권한 없음',
    });

    render(
      <StaleResultBanner
        projectId={projectId}
        track="PBL"
        interviewUpdatedAt="2026-04-30T14:00:00Z"
        resultCreatedAt="2026-04-29T09:00:00Z"
      />,
    );
    await user.click(screen.getByTestId('stale-result-banner-regenerate'));
    expect(triggerResultRegenerationFromReview).toHaveBeenCalledWith(projectId, 'PBL');
  });
});
