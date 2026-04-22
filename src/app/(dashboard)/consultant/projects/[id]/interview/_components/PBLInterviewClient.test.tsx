import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PBLInterviewClient from './PBLInterviewClient';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock('../actions', () => ({
  savePBLInterview: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('../_hooks/useInterviewAutoSave', () => ({
  useInterviewAutoSave: () => ({ isAutoSaving: false, lastSaved: null, autoSaveError: null }),
}));

// Partial mock — cn 등 기타 export 유지하되 부수효과 함수만 spy
vi.mock('@/lib/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/utils')>();
  return {
    ...actual,
    showSuccessToast: vi.fn(),
    showErrorToast: vi.fn(),
    scrollToPageTop: vi.fn(),
  };
});

describe('PBLInterviewClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('페이지 헤더와 PBL 9스텝 스텝퍼가 렌더링된다', async () => {
    render(<PBLInterviewClient projectId="p-1" initialData={{}} />);
    expect(await screen.findByText('현장 인터뷰 (PBL)')).toBeInTheDocument();
  });

  it('이전 버튼이 첫 스텝에서 비활성화된다', async () => {
    render(<PBLInterviewClient projectId="p-1" initialData={{}} />);
    await screen.findByText('현장 인터뷰 (PBL)');
    const prevBtn = screen.getByRole('button', { name: /이전/ });
    expect(prevBtn).toBeDisabled();
  });

  it('"다음" 클릭 시 scrollToPageTop이 호출된다 (ISSUE-15)', async () => {
    const { scrollToPageTop } = await import('@/lib/utils');
    render(<PBLInterviewClient projectId="p-1" initialData={{}} />);
    await screen.findByText('현장 인터뷰 (PBL)');
    await userEvent.click(screen.getByRole('button', { name: /^다음$/ }));
    expect(scrollToPageTop).toHaveBeenCalled();
  });
});
