/**
 * toast.ts 테스트
 * - showErrorToast: 에러 토스트 표시
 * - showSuccessToast: 성공 토스트 표시
 * - showProgressToast: 단계 라벨·점 애니메이션·취소 버튼을 가진 persistent 진행 토스트
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { toast } from 'sonner';
import { showErrorToast, showProgressToast, showSuccessToast } from './toast';

// ─── sonner 모킹 ──────────────────────────────────────────────────────────

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
}));

afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
});

// ─── showErrorToast ────────────────────────────────────────────────────────

describe('showErrorToast', () => {
  it('title만 전달하면 description 없이 호출한다', () => {
    showErrorToast('에러 발생');

    expect(toast.error).toHaveBeenCalledWith('에러 발생', undefined);
  });

  it('title과 description을 함께 전달한다', () => {
    showErrorToast('에러 발생', '상세 내용');

    expect(toast.error).toHaveBeenCalledWith('에러 발생', { description: '상세 내용' });
  });

  it('빈 title이어도 호출된다', () => {
    showErrorToast('');

    expect(toast.error).toHaveBeenCalledWith('', undefined);
  });

  it('description이 빈 문자열이면 falsy이므로 undefined로 전달', () => {
    showErrorToast('에러', '');

    expect(toast.error).toHaveBeenCalledWith('에러', undefined);
  });

  it('매우 긴 title도 그대로 전달된다', () => {
    const longTitle = '오류: ' + 'A'.repeat(500);
    showErrorToast(longTitle);

    expect(toast.error).toHaveBeenCalledWith(longTitle, undefined);
  });

  it('매우 긴 description도 그대로 전달된다', () => {
    const longDescription = '상세: ' + 'B'.repeat(500);
    showErrorToast('에러', longDescription);

    expect(toast.error).toHaveBeenCalledWith('에러', { description: longDescription });
  });

  it('특수문자가 포함된 에러 메시지도 정상 전달된다', () => {
    showErrorToast('저장 실패!', '프로젝트 "AI 기초"의 <업데이트>가 실패하였습니다.');

    expect(toast.error).toHaveBeenCalledWith('저장 실패!', {
      description: '프로젝트 "AI 기초"의 <업데이트>가 실패하였습니다.',
    });
  });
});

// ─── showSuccessToast ──────────────────────────────────────────────────────

describe('showSuccessToast', () => {
  it('title만 전달하면 description 없이 호출한다', () => {
    showSuccessToast('성공');

    expect(toast.success).toHaveBeenCalledWith('성공', undefined);
  });

  it('title과 description을 함께 전달한다', () => {
    showSuccessToast('성공', '저장되었습니다');

    expect(toast.success).toHaveBeenCalledWith('성공', { description: '저장되었습니다' });
  });

  it('빈 title이어도 호출된다', () => {
    showSuccessToast('');

    expect(toast.success).toHaveBeenCalledWith('', undefined);
  });

  it('description이 빈 문자열이면 falsy이므로 undefined로 전달', () => {
    showSuccessToast('성공', '');

    expect(toast.success).toHaveBeenCalledWith('성공', undefined);
  });

  it('긴 title도 정상 전달된다', () => {
    const longTitle = 'A'.repeat(300);
    showSuccessToast(longTitle);

    expect(toast.success).toHaveBeenCalledWith(longTitle, undefined);
  });

  it('한국어 특수문자가 포함된 메시지도 정상 전달', () => {
    showSuccessToast('저장 완료!', '프로젝트 "테스트"가 <성공>적으로 저장됨');

    expect(toast.success).toHaveBeenCalledWith('저장 완료!', {
      description: '프로젝트 "테스트"가 <성공>적으로 저장됨',
    });
  });
});

// ─── showProgressToast ─────────────────────────────────────────────────────

/** 가장 최근 toast.loading 호출의 description 추출 헬퍼 */
function latestDescription(): string | undefined {
  const calls = vi.mocked(toast.loading).mock.calls;
  const lastCall = calls[calls.length - 1];
  const opts = lastCall?.[1] as { description?: string } | undefined;
  return opts?.description;
}

/** 가장 최근 toast.loading 호출에서 사용된 id 추출 헬퍼 */
function latestId(): string | number | undefined {
  const calls = vi.mocked(toast.loading).mock.calls;
  const lastCall = calls[calls.length - 1];
  const opts = lastCall?.[1] as { id?: string | number } | undefined;
  return opts?.id;
}

describe('showProgressToast', () => {
  it('호출 즉시 sonner toast.loading 이 첫 stage 라벨·점 1개 description 으로 호출된다', () => {
    vi.useFakeTimers();

    const handle = showProgressToast({
      title: 'HWPX 문서를 만들고 있어요',
      stages: [
        { label: '정보 취합 중', durationMs: 20_000 },
        { label: '문서 작성 중', durationMs: 20_000 },
        { label: 'HWPX 생성 중' },
      ],
    });

    expect(toast.loading).toHaveBeenCalled();
    const firstCall = vi.mocked(toast.loading).mock.calls[0];
    expect(firstCall?.[0]).toBe('HWPX 문서를 만들고 있어요');
    const opts = firstCall?.[1] as { description?: string; duration?: number; id?: unknown };
    expect(opts?.description).toBe('정보 취합 중.');
    expect(opts?.duration).toBe(Infinity);
    expect(opts?.id).toBeDefined();

    handle.dismiss();
  });

  it('점 애니메이션이 500ms 마다 [1,2,3,2] 순서로 무한 순환한다', () => {
    vi.useFakeTimers();

    const handle = showProgressToast({
      title: '진행',
      stages: [{ label: '정보 취합 중' }],
    });

    expect(latestDescription()).toBe('정보 취합 중.');
    vi.advanceTimersByTime(500);
    expect(latestDescription()).toBe('정보 취합 중..');
    vi.advanceTimersByTime(500);
    expect(latestDescription()).toBe('정보 취합 중...');
    vi.advanceTimersByTime(500);
    expect(latestDescription()).toBe('정보 취합 중..');
    vi.advanceTimersByTime(500);
    expect(latestDescription()).toBe('정보 취합 중.');
    vi.advanceTimersByTime(500);
    expect(latestDescription()).toBe('정보 취합 중..');

    handle.dismiss();
  });

  it('stage 의 durationMs 가 경과하면 다음 stage 라벨로 전환되되 점 카운터는 유지된다', () => {
    vi.useFakeTimers();

    const handle = showProgressToast({
      title: '진행',
      stages: [
        { label: '정보 취합 중', durationMs: 20_000 },
        { label: '문서 작성 중', durationMs: 20_000 },
        { label: 'HWPX 생성 중' },
      ],
    });

    expect(latestDescription()?.startsWith('정보 취합 중')).toBe(true);

    vi.advanceTimersByTime(19_500);
    expect(latestDescription()?.startsWith('정보 취합 중')).toBe(true);

    vi.advanceTimersByTime(1_000); // 20_500ms
    expect(latestDescription()?.startsWith('문서 작성 중')).toBe(true);

    vi.advanceTimersByTime(20_000); // 40_500ms
    expect(latestDescription()?.startsWith('HWPX 생성 중')).toBe(true);

    handle.dismiss();
  });

  it('마지막 stage 도달 후 더 이상 stage 전환은 일어나지 않고 점 애니메이션만 계속된다', () => {
    vi.useFakeTimers();

    const handle = showProgressToast({
      title: '진행',
      stages: [
        { label: '정보 취합 중', durationMs: 20_000 },
        { label: '문서 작성 중', durationMs: 20_000 },
        { label: 'HWPX 생성 중' },
      ],
    });

    // 마지막 stage 까지 진행
    vi.advanceTimersByTime(40_500);
    expect(latestDescription()?.startsWith('HWPX 생성 중')).toBe(true);

    // 추가 시간 경과 — 라벨은 그대로, 점만 변화
    vi.advanceTimersByTime(60_000);
    expect(latestDescription()?.startsWith('HWPX 생성 중')).toBe(true);

    vi.advanceTimersByTime(60_000);
    expect(latestDescription()?.startsWith('HWPX 생성 중')).toBe(true);

    handle.dismiss();
  });

  it('handle.success 호출 시 진행 토스트를 dismiss 한 뒤 toast.success 를 새 토스트로 띄우고 타이머가 정지된다', () => {
    // 진행 토스트의 duration: Infinity 가 success 갱신 시 잔존해 토스트가 사라지지 않거나
    // 이전 description ("HWPX 생성 중·") 이 그대로 남는 sonner 옵션 merge 문제를 회피한다.
    vi.useFakeTimers();

    const handle = showProgressToast({
      title: '진행',
      stages: [{ label: '정보 취합 중' }],
    });

    const initialId = latestId();
    expect(initialId).toBeDefined();

    handle.success('완료!', 'file.hwpx');

    // 1) 진행 토스트(같은 id) 가 명시적으로 dismiss 되어야 한다
    expect(toast.dismiss).toHaveBeenCalledWith(initialId);
    // 2) success 토스트는 새 토스트로 띄워진다 (이전 id 미사용 → sonner 기본 duration·정상 description 적용)
    expect(toast.success).toHaveBeenCalledWith('완료!', { description: 'file.hwpx' });

    // success 호출 후 타이머가 정지되어야 함 — 추가 시간 경과 시 toast.loading 추가 호출 없음
    const callsBeforeAdvance = vi.mocked(toast.loading).mock.calls.length;
    vi.advanceTimersByTime(5_000);
    expect(vi.mocked(toast.loading).mock.calls.length).toBe(callsBeforeAdvance);
  });

  it('handle.success description 미전달 시 toast.success 에 description 없이 호출된다', () => {
    vi.useFakeTimers();

    const handle = showProgressToast({
      title: '진행',
      stages: [{ label: '정보 취합 중' }],
    });

    const initialId = latestId();
    handle.success('완료!');

    expect(toast.dismiss).toHaveBeenCalledWith(initialId);
    expect(toast.success).toHaveBeenCalledWith('완료!', undefined);
  });

  it('handle.error 호출 시 진행 토스트를 dismiss 한 뒤 toast.error 를 새 토스트로 띄운다', () => {
    vi.useFakeTimers();

    const handle = showProgressToast({
      title: '진행',
      stages: [{ label: '정보 취합 중' }],
    });

    const initialId = latestId();
    handle.error('실패!', '네트워크 오류', { label: '다시 시도', onClick: vi.fn() });

    expect(toast.dismiss).toHaveBeenCalledWith(initialId);
    expect(toast.error).toHaveBeenCalledWith('실패!', {
      description: '네트워크 오류',
      action: { label: '다시 시도', onClick: expect.any(Function) },
      duration: Infinity,
    });

    // error 후 타이머 정지 — 추가 시간 경과해도 toast.loading 추가 호출 없음
    const callsBeforeAdvance = vi.mocked(toast.loading).mock.calls.length;
    vi.advanceTimersByTime(5_000);
    expect(vi.mocked(toast.loading).mock.calls.length).toBe(callsBeforeAdvance);
  });

  it('handle.dismiss 호출 시 toast.dismiss(id) 호출 + 모든 타이머 정지', () => {
    vi.useFakeTimers();

    const handle = showProgressToast({
      title: '진행',
      stages: [
        { label: '정보 취합 중', durationMs: 20_000 },
        { label: 'HWPX 생성 중' },
      ],
    });

    const initialId = latestId();
    handle.dismiss();

    expect(toast.dismiss).toHaveBeenCalledWith(initialId);

    const callsBeforeAdvance = vi.mocked(toast.loading).mock.calls.length;
    vi.advanceTimersByTime(60_000);
    expect(vi.mocked(toast.loading).mock.calls.length).toBe(callsBeforeAdvance);
  });

  it('onCancel 옵션 전달 시 toast.loading 의 action 으로 취소 버튼이 함께 전달된다', () => {
    vi.useFakeTimers();

    const onCancel = vi.fn();
    const handle = showProgressToast({
      title: '진행',
      stages: [{ label: '정보 취합 중' }],
      onCancel,
    });

    const firstCall = vi.mocked(toast.loading).mock.calls[0];
    const opts = firstCall?.[1] as {
      action?: { label: string; onClick: () => void };
    };

    expect(opts?.action?.label).toBe('취소');
    expect(typeof opts?.action?.onClick).toBe('function');

    opts?.action?.onClick();
    expect(onCancel).toHaveBeenCalledOnce();

    handle.dismiss();
  });
});
