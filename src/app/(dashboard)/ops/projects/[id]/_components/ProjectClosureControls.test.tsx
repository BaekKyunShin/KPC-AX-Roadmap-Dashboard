/**
 * ProjectClosureControls 테스트
 *
 * - closedAt null → "프로젝트 종결" 버튼 + 사유 다이얼로그 (10자 게이트)
 * - closedAt 존재 → "종결 해제" 버튼 + 확인 다이얼로그
 * - 성공 시 액션 인자·토스트·router.refresh 확인
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Radix Tooltip(react-use-size)이 요구하는 ResizeObserver — jsdom 미제공 폴리필
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', ResizeObserverMock);

const mockCloseProject = vi.fn();
const mockReopenProject = vi.fn();
vi.mock('../../actions', () => ({
  closeProject: (...args: unknown[]) => mockCloseProject(...args),
  reopenProject: (...args: unknown[]) => mockReopenProject(...args),
}));

const mockRefresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));

const mockSuccessToast = vi.fn();
const mockErrorToast = vi.fn();
vi.mock('@/lib/utils/toast', () => ({
  showSuccessToast: (...args: unknown[]) => mockSuccessToast(...args),
  showErrorToast: (...args: unknown[]) => mockErrorToast(...args),
}));

import { ProjectClosureControls } from './ProjectClosureControls';

const PROJECT_ID = '550e8400-e29b-41d4-a716-446655440010';
const COMPANY_NAME = '테스트 주식회사';
const VALID_REASON = '코치가 오프라인으로 작업을 완료하여 행정 종결 처리합니다.';

describe('ProjectClosureControls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('미종결(closedAt null)이면 "프로젝트 종결" 버튼만 노출한다', () => {
    render(
      <ProjectClosureControls projectId={PROJECT_ID} companyName={COMPANY_NAME} closedAt={null} />
    );
    expect(screen.getByRole('button', { name: '프로젝트 종결' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '종결 해제' })).not.toBeInTheDocument();
  });

  it('종결 상태(closedAt 존재)면 "종결 해제" 버튼만 노출한다', () => {
    render(
      <ProjectClosureControls
        projectId={PROJECT_ID}
        companyName={COMPANY_NAME}
        closedAt="2026-07-29T00:00:00Z"
      />
    );
    expect(screen.getByRole('button', { name: '종결 해제' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '프로젝트 종결' })).not.toBeInTheDocument();
  });

  it('종결 다이얼로그: 안내문에 회사명 포함 + 사유 10자 미만이면 확정 버튼 비활성', () => {
    render(
      <ProjectClosureControls projectId={PROJECT_ID} companyName={COMPANY_NAME} closedAt={null} />
    );
    fireEvent.click(screen.getByRole('button', { name: '프로젝트 종결' }));

    expect(screen.getByText(new RegExp(COMPANY_NAME))).toBeInTheDocument();

    const confirmButton = screen.getByRole('button', { name: '종결' });
    expect(confirmButton).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/종결 사유/), { target: { value: '짧은 사유' } });
    expect(confirmButton).toBeDisabled();
  });

  it('사유 10자 이상 입력 후 종결 확정 → closeProject 호출 + 성공 토스트 + refresh', async () => {
    mockCloseProject.mockResolvedValue({ success: true });
    render(
      <ProjectClosureControls projectId={PROJECT_ID} companyName={COMPANY_NAME} closedAt={null} />
    );

    fireEvent.click(screen.getByRole('button', { name: '프로젝트 종결' }));
    fireEvent.change(screen.getByLabelText(/종결 사유/), { target: { value: VALID_REASON } });

    const confirmButton = screen.getByRole('button', { name: '종결' });
    expect(confirmButton).not.toBeDisabled();
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(mockCloseProject).toHaveBeenCalledWith({
        project_id: PROJECT_ID,
        reason: VALID_REASON,
      });
    });
    await waitFor(() => expect(mockSuccessToast).toHaveBeenCalled());
    expect(mockRefresh).toHaveBeenCalled();
    expect(mockErrorToast).not.toHaveBeenCalled();
  });

  it('closeProject 실패 → 에러 토스트 표시, refresh 미호출', async () => {
    mockCloseProject.mockResolvedValue({ success: false, error: '이미 종결된 프로젝트입니다.' });
    render(
      <ProjectClosureControls projectId={PROJECT_ID} companyName={COMPANY_NAME} closedAt={null} />
    );

    fireEvent.click(screen.getByRole('button', { name: '프로젝트 종결' }));
    fireEvent.change(screen.getByLabelText(/종결 사유/), { target: { value: VALID_REASON } });
    fireEvent.click(screen.getByRole('button', { name: '종결' }));

    await waitFor(() => expect(mockErrorToast).toHaveBeenCalled());
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it('종결 해제 확인 → reopenProject 호출 + 성공 토스트 + refresh', async () => {
    mockReopenProject.mockResolvedValue({ success: true });
    render(
      <ProjectClosureControls
        projectId={PROJECT_ID}
        companyName={COMPANY_NAME}
        closedAt="2026-07-29T00:00:00Z"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '종결 해제' }));
    fireEvent.click(screen.getByRole('button', { name: '해제 확정' }));

    await waitFor(() => {
      expect(mockReopenProject).toHaveBeenCalledWith({ project_id: PROJECT_ID });
    });
    await waitFor(() => expect(mockSuccessToast).toHaveBeenCalled());
    expect(mockRefresh).toHaveBeenCalled();
  });
});
