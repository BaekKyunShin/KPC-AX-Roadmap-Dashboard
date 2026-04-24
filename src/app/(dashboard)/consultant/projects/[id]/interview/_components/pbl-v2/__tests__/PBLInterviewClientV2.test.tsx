import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('@/lib/utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/utils')>();
  return {
    ...actual,
    showErrorToast: vi.fn(),
    showSuccessToast: vi.fn(),
  };
});

const routerPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: routerPush,
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

const savePBLInterviewV2 = vi.fn();
const submitPBLInterviewV2 = vi.fn();
const uploadInterviewAttachment = vi.fn();
vi.mock('../../../actions', () => ({
  savePBLInterviewV2: (...args: unknown[]) => savePBLInterviewV2(...args),
  submitPBLInterviewV2: (...args: unknown[]) => submitPBLInterviewV2(...args),
  uploadInterviewAttachment: (...args: unknown[]) =>
    uploadInterviewAttachment(...args),
}));

import {
  PBLInterviewClientV2,
  PBL_V2_STEPS,
} from '../PBLInterviewClientV2';

describe('PBLInterviewClientV2', () => {
  beforeEach(() => {
    savePBLInterviewV2.mockReset();
    submitPBLInterviewV2.mockReset();
    uploadInterviewAttachment.mockReset();
    routerPush.mockReset();
  });

  it('PageHeader 와 첫 스텝(Ⅰ 훈련과정 개요) 본문을 렌더한다', () => {
    render(<PBLInterviewClientV2 projectId="p1" initial={{}} />);
    expect(
      screen.getByRole('heading', {
        name: /AI PBL 인터뷰/,
        level: 1,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: '훈련과정 개요', level: 2 }),
    ).toBeInTheDocument();
  });

  it('9개 스텝이 모두 정의되어 있고 양식 번호를 노출한다', () => {
    render(<PBLInterviewClientV2 projectId="p1" initial={{}} />);
    expect(PBL_V2_STEPS).toHaveLength(9);
    for (const s of PBL_V2_STEPS) {
      expect(screen.getAllByText(s.name).length).toBeGreaterThanOrEqual(1);
    }
  });

  it('Ⅱ-1-가 companyIssues 스텝 진입 시 해당 textarea 가 렌더된다', () => {
    render(<PBLInterviewClientV2 projectId="p1" initial={{}} />);
    fireEvent.click(screen.getByText('기업 경영 이슈'));
    expect(
      screen.getByRole('heading', { name: '기업 경영 이슈', level: 2 }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('기업 경영 이슈')).toBeInTheDocument();
  });

  it('Ⅰ Overview 에서 기업명 입력 후 수동 저장 시 Server Action 에 companyName 이 포함된다', async () => {
    savePBLInterviewV2.mockResolvedValue({ success: true });
    render(<PBLInterviewClientV2 projectId="p1" initial={{}} />);
    fireEvent.change(screen.getByLabelText('기업명'), {
      target: { value: '한국생산성본부' },
    });
    fireEvent.click(screen.getByLabelText('수동 저장'));
    await waitFor(() =>
      expect(savePBLInterviewV2).toHaveBeenCalledTimes(1),
    );
    const payload = savePBLInterviewV2.mock.calls[0][1];
    expect(payload.companyName).toBe('한국생산성본부');
  });

  it('Ⅱ-1-가 companyIssues 편집 시 저장 payload 에 포함된다', async () => {
    savePBLInterviewV2.mockResolvedValue({ success: true });
    render(<PBLInterviewClientV2 projectId="p1" initial={{}} />);
    fireEvent.click(screen.getByText('기업 경영 이슈'));
    fireEvent.change(screen.getByLabelText('기업 경영 이슈'), {
      target: { value: '원가 압박' },
    });
    fireEvent.click(screen.getByLabelText('수동 저장'));
    await waitFor(() =>
      expect(savePBLInterviewV2).toHaveBeenCalledTimes(1),
    );
    const payload = savePBLInterviewV2.mock.calls[0][1];
    expect(payload.companyIssues).toBe('원가 압박');
  });

  it('Ⅱ-3-나 courseNecessity 편집 시 저장 payload 에 포함된다', async () => {
    savePBLInterviewV2.mockResolvedValue({ success: true });
    render(<PBLInterviewClientV2 projectId="p1" initial={{}} />);
    fireEvent.click(screen.getByText('AI훈련과정 개발 필요성'));
    fireEvent.change(screen.getByLabelText('AI훈련과정 개발 필요성'), {
      target: { value: '현장 AI 리터러시 확보 필요' },
    });
    fireEvent.click(screen.getByLabelText('수동 저장'));
    await waitFor(() =>
      expect(savePBLInterviewV2).toHaveBeenCalledTimes(1),
    );
    const payload = savePBLInterviewV2.mock.calls[0][1];
    expect(payload.courseNecessity).toBe('현장 AI 리터러시 확보 필요');
  });

  it('첫 스텝에서 "이전" 버튼은 비활성화된다', () => {
    render(<PBLInterviewClientV2 projectId="p1" initial={{}} />);
    expect(screen.getByLabelText('이전 스텝')).toBeDisabled();
  });

  it('initial.companyName 이 Overview input 에 반영된다', () => {
    render(
      <PBLInterviewClientV2
        projectId="p1"
        initial={{ companyName: '기존값' }}
      />,
    );
    expect(screen.getByLabelText('기업명')).toHaveValue('기존값');
  });

  it('data 가 변경되면 500ms 후 자동저장 Action 이 호출된다 (debounce)', async () => {
    vi.useFakeTimers();
    try {
      savePBLInterviewV2.mockResolvedValue({ success: true });
      render(<PBLInterviewClientV2 projectId="p1" initial={{}} />);
      await act(async () => {
        fireEvent.change(screen.getByLabelText('기업명'), {
          target: { value: '자동저장' },
        });
      });
      expect(savePBLInterviewV2).not.toHaveBeenCalled();
      await act(async () => {
        vi.advanceTimersByTime(500);
        await vi.runAllTimersAsync();
      });
      expect(savePBLInterviewV2).toHaveBeenCalledTimes(1);
      expect(savePBLInterviewV2).toHaveBeenCalledWith(
        'p1',
        expect.objectContaining({ companyName: '자동저장' }),
        { autoSave: true },
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it('저장 실패 시 saveIndicator 에 "저장 실패" 가 표시된다', async () => {
    savePBLInterviewV2.mockResolvedValue({
      success: false,
      error: '권한이 없습니다',
    });
    render(<PBLInterviewClientV2 projectId="p1" initial={{}} />);
    fireEvent.click(screen.getByLabelText('수동 저장'));
    await waitFor(() =>
      expect(screen.getByText('저장 실패')).toBeInTheDocument(),
    );
  });

  it('strict 검증 실패 시 submit Action 은 호출되지 않는다 (빈 초기 데이터)', async () => {
    submitPBLInterviewV2.mockResolvedValue({ success: true });
    render(<PBLInterviewClientV2 projectId="p1" initial={{}} />);
    for (let i = 0; i < PBL_V2_STEPS.length - 1; i += 1) {
      fireEvent.click(screen.getByLabelText('다음 스텝'));
    }
    fireEvent.click(screen.getByRole('button', { name: '최종 제출' }));
    await new Promise((r) => setTimeout(r, 50));
    expect(submitPBLInterviewV2).not.toHaveBeenCalled();
    expect(routerPush).not.toHaveBeenCalled();
  });
});
