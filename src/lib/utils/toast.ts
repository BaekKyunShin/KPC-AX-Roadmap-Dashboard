import { toast } from 'sonner';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ErrorToastOptions {
  action?: ToastAction;
  /**
   * 토스트 노출 시간 (밀리초). 생략 시 Sonner 기본값(4초) 사용.
   * 진단용 긴 에러 메시지를 사용자가 읽고 복사할 수 있도록 `Infinity` 등을 지정.
   */
  duration?: number;
}

/**
 * 에러 Toast 표시
 * @param title - Toast 제목
 * @param description - 상세 설명 (선택)
 * @param options - action, duration 등 부가 옵션 (선택)
 *
 * 하위 호환: 세 번째 인자가 `{label,onClick}` 형태인 ToastAction 도 받는다.
 */
export function showErrorToast(
  title: string,
  description?: string,
  options?: ErrorToastOptions | ToastAction,
) {
  const opts: { description?: string; action?: ToastAction; duration?: number } = {};
  if (description) opts.description = description;
  if (options) {
    // ToastAction (label+onClick) 직접 전달도 허용 (하위 호환).
    if ('label' in options && 'onClick' in options) {
      opts.action = options;
    } else {
      if (options.action) opts.action = options.action;
      if (options.duration !== undefined) opts.duration = options.duration;
    }
  }
  toast.error(title, Object.keys(opts).length > 0 ? opts : undefined);
}

/**
 * 성공 Toast 표시
 * @param title - Toast 제목
 * @param description - 상세 설명 (선택)
 */
export function showSuccessToast(title: string, description?: string) {
  toast.success(title, description ? { description } : undefined);
}

export interface ProgressStage {
  /** 베이스 텍스트 (점 제외). 예: "정보 취합 중" */
  label: string;
  /** 이 단계 노출 시간. 마지막 stage 는 생략 → 완료/실패/취소 호출 전까지 유지 */
  durationMs?: number;
}

export interface ProgressToastOptions {
  title: string;
  stages: ProgressStage[];
  /** 점 bounce 간격. 기본 500ms */
  dotIntervalMs?: number;
  /** 점 개수 순환 패턴. 기본 [1, 2, 3, 2] (. → .. → ... → .. → . → ...) */
  dotPattern?: number[];
  /** 토스트 우측 [취소] 버튼 클릭 시 호출. 미지정 시 버튼 비표시 */
  onCancel?: () => void;
  /** 취소 버튼 라벨. 기본 "취소" */
  cancelLabel?: string;
}

export interface ProgressToastHandle {
  /** 진행 토스트를 같은 id 의 success 토스트로 교체 */
  success: (title: string, description?: string) => void;
  /** 진행 토스트를 같은 id 의 error 토스트로 교체 (재시도 등 액션 전달 가능) */
  error: (title: string, description?: string, action?: ToastAction) => void;
  /** 토스트 즉시 제거 + 모든 내부 타이머 정지 */
  dismiss: () => void;
}

const DEFAULT_DOT_INTERVAL_MS = 500;
const DEFAULT_DOT_PATTERN: readonly number[] = [1, 2, 3, 2];
const DEFAULT_CANCEL_LABEL = '취소';

/**
 * 장시간 작업용 persistent 진행 토스트.
 *
 * 사용 예 (HWPX 다운로드):
 * ```ts
 * const progress = showProgressToast({
 *   title: 'HWPX 문서를 만들고 있어요',
 *   stages: [
 *     { label: '정보 취합 중', durationMs: 20_000 },
 *     { label: '문서 작성 중', durationMs: 20_000 },
 *     { label: 'HWPX 생성 중' }, // 마지막 stage — 완료/실패/취소까지 유지
 *   ],
 *   onCancel: () => { cancelled = true; progress.dismiss(); },
 * });
 * // 완료 시: progress.success('HWPX 다운로드 완료', fileName)
 * // 실패 시: progress.error('HWPX 다운로드 실패', error, { label: '다시 시도', onClick })
 * ```
 */
export function showProgressToast(opts: ProgressToastOptions): ProgressToastHandle {
  const {
    title,
    stages,
    dotIntervalMs = DEFAULT_DOT_INTERVAL_MS,
    dotPattern = DEFAULT_DOT_PATTERN as number[],
    onCancel,
    cancelLabel = DEFAULT_CANCEL_LABEL,
  } = opts;

  if (stages.length === 0) {
    throw new Error('showProgressToast: stages must contain at least one stage');
  }

  // 토스트 id — 같은 id 로 loading→success/error 갱신
  const id = `progress-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  let stageIndex = 0;
  let dotIndex = 0;
  let stageTimer: ReturnType<typeof setTimeout> | undefined;
  let dotTimer: ReturnType<typeof setInterval> | undefined;

  const action = onCancel ? { label: cancelLabel, onClick: onCancel } : undefined;

  const render = () => {
    const stage = stages[stageIndex];
    if (!stage) return;
    const dots = '.'.repeat(dotPattern[dotIndex % dotPattern.length] ?? 1);
    toast.loading(title, {
      id,
      description: `${stage.label}${dots}`,
      duration: Infinity,
      ...(action ? { action } : {}),
    });
  };

  const stopTimers = () => {
    if (stageTimer) {
      clearTimeout(stageTimer);
      stageTimer = undefined;
    }
    if (dotTimer) {
      clearInterval(dotTimer);
      dotTimer = undefined;
    }
  };

  const scheduleNextStage = () => {
    const current = stages[stageIndex];
    if (!current || current.durationMs === undefined) return; // 마지막 stage — 더 이상 전환 안 함
    stageTimer = setTimeout(() => {
      stageIndex += 1;
      render();
      scheduleNextStage();
    }, current.durationMs);
  };

  // 초기 렌더 + 타이머 시작
  render();
  dotTimer = setInterval(() => {
    dotIndex += 1;
    render();
  }, dotIntervalMs);
  scheduleNextStage();

  return {
    success(successTitle, description) {
      stopTimers();
      toast.success(successTitle, description ? { id, description } : { id });
    },
    error(errorTitle, description, errorAction) {
      stopTimers();
      const errorOpts: { id: string; description?: string; action?: ToastAction } = { id };
      if (description) errorOpts.description = description;
      if (errorAction) errorOpts.action = errorAction;
      toast.error(errorTitle, errorOpts);
    },
    dismiss() {
      stopTimers();
      toast.dismiss(id);
    },
  };
}
