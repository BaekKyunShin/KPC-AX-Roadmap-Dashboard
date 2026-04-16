import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Next.js router
const mockPush = vi.fn();
const mockRefresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
}));

// Partial mock — cn 등 기타 export 유지
vi.mock('@/lib/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/utils')>();
  return {
    ...actual,
    showSuccessToast: vi.fn(),
    showErrorToast: vi.fn(),
    scrollToPageTop: vi.fn(),
  };
});

// Mock server actions
const saveRoadmapInterview = vi.fn();
vi.mock('../actions', () => ({
  saveRoadmapInterview: (...args: unknown[]) => saveRoadmapInterview(...args),
}));

import RoadmapInterviewClient from './RoadmapInterviewClient';

describe('RoadmapInterviewClient', () => {
  beforeEach(() => {
    saveRoadmapInterview.mockReset();
    mockPush.mockReset();
    mockRefresh.mockReset();
  });

  it('초기 렌더 시 Step 1 (개요) 표시', () => {
    render(<RoadmapInterviewClient projectId="p1" initialData={{}} />);
    expect(screen.getByRole('heading', { name: /^개요$/ })).toBeInTheDocument();
  });

  it('"다음" 버튼 클릭 시 Step 2 (기본 정보)로 전환', async () => {
    render(<RoadmapInterviewClient projectId="p1" initialData={{}} />);
    await userEvent.click(screen.getByRole('button', { name: /^다음$/ }));
    expect(screen.getByRole('heading', { name: /기본 정보/ })).toBeInTheDocument();
  });

  it('마지막 스텝(확인)까지 이동하면 제출 버튼 노출', async () => {
    render(<RoadmapInterviewClient projectId="p1" initialData={{}} />);
    for (let i = 0; i < 5; i++) {
      await userEvent.click(screen.getByRole('button', { name: /^다음$/ }));
    }
    expect(screen.getByRole('heading', { name: /확인.*제출/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^저장$/ })).toBeInTheDocument();
  });

  it('필수 미완료 상태에서 제출 시 에러 토스트 + 이동', async () => {
    const { showErrorToast } = await import('@/lib/utils');
    render(<RoadmapInterviewClient projectId="p1" initialData={{}} />);
    for (let i = 0; i < 5; i++) {
      await userEvent.click(screen.getByRole('button', { name: /^다음$/ }));
    }
    await userEvent.click(screen.getByRole('button', { name: /^저장$/ }));
    expect(showErrorToast).toHaveBeenCalled();
    expect(saveRoadmapInterview).not.toHaveBeenCalled();
  });
});
