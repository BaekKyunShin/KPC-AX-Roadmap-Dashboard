/**
 * action-result-toast.ts 테스트
 *
 * 핵심 보장:
 * 1. result.error 가 falsy 여도 errorFallback 으로 토스트 발생 (silent fail 차단).
 * 2. isSilent 가 true 반환 시 토스트 미표시 (정상 silent 흐름).
 * 3. successMessage 가 미지정이면 success 토스트 미표시.
 * 4. onSuccess 콜백은 success path 에서만 실행 + await.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { toast } from 'sonner';
import { handleActionResult, handleSimpleActionResult } from './action-result-toast';

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

afterEach(() => {
  vi.clearAllMocks();
});

// ─── handleActionResult ────────────────────────────────────────────────────

describe('handleActionResult', () => {
  it('success: successMessage 가 있으면 성공 토스트 발생 + onSuccess 호출 + true 반환', async () => {
    const onSuccess = vi.fn();

    const ok = await handleActionResult(
      { success: true, data: { id: 'abc' } },
      {
        successMessage: { title: '저장 완료', description: '저장되었습니다.' },
        errorTitle: '저장 실패',
        errorFallback: '알 수 없는 오류',
        onSuccess,
      },
    );

    expect(ok).toBe(true);
    expect(toast.success).toHaveBeenCalledWith('저장 완료', {
      description: '저장되었습니다.',
    });
    expect(toast.error).not.toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalledWith({ id: 'abc' });
  });

  it('success: successMessage 미지정이면 토스트 미표시, onSuccess 만 호출', async () => {
    const onSuccess = vi.fn();

    const ok = await handleActionResult(
      { success: true, data: 42 },
      {
        errorTitle: '실패',
        errorFallback: 'fallback',
        onSuccess,
      },
    );

    expect(ok).toBe(true);
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
    expect(onSuccess).toHaveBeenCalledWith(42);
  });

  it('error: result.error 에 메시지가 있으면 그대로 표시', async () => {
    const ok = await handleActionResult(
      { success: false, error: '권한이 없습니다.' },
      { errorTitle: '오류', errorFallback: 'fallback' },
    );

    expect(ok).toBe(false);
    expect(toast.error).toHaveBeenCalledWith('오류', {
      description: '권한이 없습니다.',
    });
  });

  it('error: result.error 가 빈 문자열이면 errorFallback 으로 토스트 표시 (silent fail 차단)', async () => {
    const ok = await handleActionResult(
      { success: false, error: '' },
      { errorTitle: '오류', errorFallback: '알 수 없는 오류가 발생했습니다.' },
    );

    expect(ok).toBe(false);
    expect(toast.error).toHaveBeenCalledWith('오류', {
      description: '알 수 없는 오류가 발생했습니다.',
    });
  });

  it('error: result.error 가 공백만 있어도 fallback 으로 토스트 표시', async () => {
    const ok = await handleActionResult(
      { success: false, error: '   ' },
      { errorTitle: '오류', errorFallback: 'fallback message' },
    );

    expect(ok).toBe(false);
    expect(toast.error).toHaveBeenCalledWith('오류', {
      description: 'fallback message',
    });
  });

  it('error: isSilent 가 true 반환하면 토스트 미표시 + false 반환', async () => {
    const isSilent = vi.fn().mockReturnValue(true);

    const ok = await handleActionResult(
      { success: false, error: '취소되었습니다.' },
      {
        errorTitle: '오류',
        errorFallback: 'fallback',
        isSilent,
      },
    );

    expect(ok).toBe(false);
    expect(isSilent).toHaveBeenCalledWith('취소되었습니다.');
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('error: isSilent 가 false 반환하면 정상 토스트 표시', async () => {
    const isSilent = vi.fn().mockReturnValue(false);

    const ok = await handleActionResult(
      { success: false, error: '서버 오류' },
      {
        errorTitle: '실패',
        errorFallback: 'fallback',
        isSilent,
      },
    );

    expect(ok).toBe(false);
    expect(toast.error).toHaveBeenCalledWith('실패', {
      description: '서버 오류',
    });
  });

  it('onSuccess 가 비동기여도 await 후 true 반환', async () => {
    const order: string[] = [];
    const onSuccess = vi.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      order.push('onSuccess');
    });

    const ok = await handleActionResult(
      { success: true, data: null },
      {
        errorTitle: '실패',
        errorFallback: 'fallback',
        onSuccess,
      },
    );
    order.push('after');

    expect(ok).toBe(true);
    expect(order).toEqual(['onSuccess', 'after']);
  });
});

// ─── handleSimpleActionResult ──────────────────────────────────────────────

describe('handleSimpleActionResult', () => {
  it('success: 성공 토스트 + onSuccess + true 반환', async () => {
    const onSuccess = vi.fn();

    const ok = await handleSimpleActionResult(
      { success: true },
      {
        successMessage: { title: '완료' },
        errorTitle: '실패',
        errorFallback: 'fallback',
        onSuccess,
      },
    );

    expect(ok).toBe(true);
    expect(toast.success).toHaveBeenCalledWith('완료', undefined);
    expect(onSuccess).toHaveBeenCalled();
  });

  it('error: result.error 가 falsy 여도 fallback 토스트 보장', async () => {
    const ok = await handleSimpleActionResult(
      { success: false, error: '' },
      { errorTitle: '실패', errorFallback: '알 수 없는 오류' },
    );

    expect(ok).toBe(false);
    expect(toast.error).toHaveBeenCalledWith('실패', {
      description: '알 수 없는 오류',
    });
  });

  it('error: isSilent true 면 토스트 미표시', async () => {
    const ok = await handleSimpleActionResult(
      { success: false, error: '취소' },
      {
        errorTitle: '실패',
        errorFallback: 'fallback',
        isSilent: () => true,
      },
    );

    expect(ok).toBe(false);
    expect(toast.error).not.toHaveBeenCalled();
  });
});
