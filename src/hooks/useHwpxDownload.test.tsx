/**
 * useHwpxDownload 훅 단위 테스트 (Step 7 Task 9).
 */
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useHwpxDownload } from './useHwpxDownload';

vi.mock('@/lib/utils/toast', () => ({
  showSuccessToast: vi.fn(),
  showErrorToast: vi.fn(),
}));

import { showErrorToast, showSuccessToast } from '@/lib/utils/toast';

describe('useHwpxDownload', () => {
  const origCreateElement = document.createElement.bind(document);
  const origCreateObjectURL = URL.createObjectURL;
  const origRevokeObjectURL = URL.revokeObjectURL;
  const origAtob = globalThis.atob;
  const clickSpy = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
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
    const { result } = renderHook(() =>
      useHwpxDownload({ action: vi.fn() }),
    );
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('성공 시 a.download 호출 + successToast', async () => {
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
    expect(showSuccessToast).toHaveBeenCalledWith('HWPX 다운로드 완료');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('실패(ActionResult) 시 errorToast(title·desc·action) + error 상태 설정', async () => {
    const action = vi.fn().mockResolvedValue({
      success: false,
      error: '권한 없음',
    });

    const { result } = renderHook(() => useHwpxDownload({ action }));

    await act(async () => {
      await result.current.download();
    });

    expect(showErrorToast).toHaveBeenCalledWith(
      'HWPX 다운로드 실패',
      '권한 없음',
      expect.objectContaining({ label: '다시 시도', onClick: expect.any(Function) }),
    );
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

    const lastCall = vi.mocked(showErrorToast).mock.calls.at(-1);
    const onClick = (lastCall?.[2] as { onClick: () => void } | undefined)?.onClick;
    expect(onClick).toBeDefined();

    await act(async () => {
      await onClick?.();
    });
    // 두 번째 호출(재시도) 후 action 이 한 번 더 실행됨
    expect(action).toHaveBeenCalledTimes(2);
    expect(showSuccessToast).toHaveBeenCalled();
  });

  it('action이 throw → errorToast + error 상태', async () => {
    const action = vi.fn().mockRejectedValue(new Error('network'));
    const { result } = renderHook(() => useHwpxDownload({ action }));

    await act(async () => {
      await result.current.download();
    });

    expect(showErrorToast).toHaveBeenCalled();
    expect(result.current.error).toBe('network');
  });

  it('커스텀 successMessage·errorTitle 설정 가능', async () => {
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

    expect(showSuccessToast).toHaveBeenCalledWith('완료!');
  });
});
