/**
 * useHwpxDownload 훅 단위 테스트.
 *
 * HWPX 다운로드는 PDF/XLSX 대비 수~수십 초가 소요되므로,
 * Sonner persistent 진행 토스트(showProgressToast)로 단계 라벨·점 애니메이션·취소 버튼을 제공한다.
 * 본 훅은 download/isLoading/error 외부 시그니처를 유지하면서 내부적으로 진행 토스트를 운영한다.
 */
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ActionResult } from '@/lib/types/action-result';
import {
  type HwpxDownloadPayload,
  useHwpxDownload,
} from './useHwpxDownload';

const mockHandle = {
  success: vi.fn(),
  error: vi.fn(),
  dismiss: vi.fn(),
};

vi.mock('@/lib/utils/toast', () => ({
  showSuccessToast: vi.fn(),
  showErrorToast: vi.fn(),
  showProgressToast: vi.fn(() => mockHandle),
}));

import { showErrorToast, showProgressToast, showSuccessToast } from '@/lib/utils/toast';

describe('useHwpxDownload', () => {
  const origCreateElement = document.createElement.bind(document);
  const origCreateObjectURL = URL.createObjectURL;
  const origRevokeObjectURL = URL.revokeObjectURL;
  const origAtob = globalThis.atob;
  const clickSpy = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockHandle.success.mockClear();
    mockHandle.error.mockClear();
    mockHandle.dismiss.mockClear();

    URL.createObjectURL = vi.fn(() => 'blob:fake');
    URL.revokeObjectURL = vi.fn();
    globalThis.atob = (s: string) => Buffer.from(s, 'base64').toString('binary');

    document.createElement = vi.fn((tag: string) => {
      if (tag === 'a') {
        const el = origCreateElement(tag);
        el.click = clickSpy;
        return el;
      }
      return origCreateElement(tag);
    }) as typeof document.createElement;
  });

  afterEach(() => {
    document.createElement = origCreateElement;
    URL.createObjectURL = origCreateObjectURL;
    URL.revokeObjectURL = origRevokeObjectURL;
    globalThis.atob = origAtob;
  });

  it('초기 상태: isLoading=false, error=null', () => {
    const { result } = renderHook(() => useHwpxDownload({ action: vi.fn() }));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('download() 호출 즉시 showProgressToast 가 stages·onCancel 과 함께 호출된다', async () => {
    const action = vi.fn().mockResolvedValue({
      success: true,
      data: {
        fileName: 'roadmap.hwpx',
        contentBase64: Buffer.from('x').toString('base64'),
        mimeType: 'application/vnd.hancom.hwpx',
      },
    });

    const { result } = renderHook(() => useHwpxDownload({ action }));

    await act(async () => {
      await result.current.download();
    });

    expect(showProgressToast).toHaveBeenCalledTimes(1);
    const opts = vi.mocked(showProgressToast).mock.calls[0]?.[0];
    expect(opts?.title).toBe('HWPX 문서를 만들고 있어요');
    expect(opts?.stages).toEqual([
      { label: '정보 취합 중', durationMs: 20_000 },
      { label: '문서 작성 중', durationMs: 20_000 },
      { label: 'HWPX 생성 중' },
    ]);
    expect(typeof opts?.onCancel).toBe('function');
  });

  it('성공 시 a.download 호출 + progress.success (기존 showSuccessToast 미호출)', async () => {
    const action = vi.fn().mockResolvedValue({
      success: true,
      data: {
        fileName: 'test.hwpx',
        contentBase64: Buffer.from('hwpx-bytes').toString('base64'),
        mimeType: 'application/vnd.hancom.hwpx',
      },
    });

    const { result } = renderHook(() => useHwpxDownload({ action }));

    await act(async () => {
      await result.current.download();
    });

    expect(action).toHaveBeenCalledOnce();
    expect(clickSpy).toHaveBeenCalled();
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:fake');
    expect(mockHandle.success).toHaveBeenCalledWith('HWPX 다운로드 완료');
    expect(showSuccessToast).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('실패(ActionResult) 시 progress.error(title·desc·action) + error 상태 설정', async () => {
    const action = vi.fn().mockResolvedValue({
      success: false,
      error: '권한 없음',
    });

    const { result } = renderHook(() => useHwpxDownload({ action }));

    await act(async () => {
      await result.current.download();
    });

    expect(mockHandle.error).toHaveBeenCalledWith(
      'HWPX 다운로드 실패',
      '권한 없음',
      expect.objectContaining({ label: '다시 시도', onClick: expect.any(Function) }),
    );
    expect(showErrorToast).not.toHaveBeenCalled();
    expect(clickSpy).not.toHaveBeenCalled();
    expect(result.current.error).toBe('권한 없음');
    expect(result.current.isLoading).toBe(false);
  });

  it('실패 토스트의 action.onClick 콜백이 download 를 재호출한다', async () => {
    const action = vi
      .fn()
      .mockResolvedValueOnce({ success: false, error: '일시 오류' })
      .mockResolvedValueOnce({
        success: true,
        data: {
          fileName: 'retry.hwpx',
          contentBase64: Buffer.from('ok').toString('base64'),
          mimeType: 'application/vnd.hancom.hwpx',
        },
      });

    const { result } = renderHook(() => useHwpxDownload({ action }));
    await act(async () => {
      await result.current.download();
    });
    expect(action).toHaveBeenCalledTimes(1);

    const lastCall = vi.mocked(mockHandle.error).mock.calls.at(-1);
    const onClick = (lastCall?.[2] as { onClick: () => void } | undefined)?.onClick;
    expect(onClick).toBeDefined();

    await act(async () => {
      await onClick?.();
    });
    expect(action).toHaveBeenCalledTimes(2);
    expect(mockHandle.success).toHaveBeenCalled();
  });

  it('action 이 throw → progress.error + error 상태', async () => {
    const action = vi.fn().mockRejectedValue(new Error('network'));
    const { result } = renderHook(() => useHwpxDownload({ action }));

    await act(async () => {
      await result.current.download();
    });

    expect(mockHandle.error).toHaveBeenCalled();
    expect(showErrorToast).not.toHaveBeenCalled();
    expect(result.current.error).toBe('network');
  });

  it('커스텀 successMessage·errorTitle 설정 가능 (progress.success 에 반영)', async () => {
    const action = vi.fn().mockResolvedValue({
      success: true,
      data: {
        fileName: 'x.hwpx',
        contentBase64: Buffer.from('x').toString('base64'),
        mimeType: 'application/vnd.hancom.hwpx',
      },
    });

    const { result } = renderHook(() =>
      useHwpxDownload({ action, successMessage: '완료!', errorTitle: '오류' }),
    );

    await act(async () => {
      await result.current.download();
    });

    expect(mockHandle.success).toHaveBeenCalledWith('완료!');
  });

  it('취소 시 결과가 도착해도 a.download / progress.success 가 호출되지 않는다', async () => {
    let resolveAction: ((value: ActionResult<HwpxDownloadPayload>) => void) | undefined;
    const action = vi.fn<() => Promise<ActionResult<HwpxDownloadPayload>>>(
      () =>
        new Promise((resolve) => {
          resolveAction = resolve;
        }),
    );

    const { result } = renderHook(() => useHwpxDownload({ action }));

    let downloadPromise: Promise<void> = Promise.resolve();
    await act(async () => {
      downloadPromise = result.current.download();
      await Promise.resolve();
    });

    const opts = vi.mocked(showProgressToast).mock.calls[0]?.[0];
    expect(typeof opts?.onCancel).toBe('function');

    await act(async () => {
      opts?.onCancel?.();
      resolveAction?.({
        success: true,
        data: {
          fileName: 'late.hwpx',
          contentBase64: Buffer.from('late').toString('base64'),
          mimeType: 'application/vnd.hancom.hwpx',
        },
      });
      await downloadPromise;
    });

    expect(mockHandle.dismiss).toHaveBeenCalled();
    expect(clickSpy).not.toHaveBeenCalled();
    expect(mockHandle.success).not.toHaveBeenCalled();
    expect(mockHandle.error).not.toHaveBeenCalled();
  });
});
