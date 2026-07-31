import type { ZodError, ZodIssue } from 'zod';

/**
 * Zod 검증 에러를 토스트용 다중 라인 문자열로 변환한다.
 *
 * 사용자 경험 목표 — 어느 Step·필드가 비었는지 명확히 표시:
 *   "Step Ⅰ. 기업명: 필수 입력입니다.
 *    Step Ⅲ-3·4. 훈련대상 NCS 코드: 필수 입력입니다."
 *
 * - `labelMap` 의 키는 zod `issue.path` 를 '.' 으로 join 한 문자열 (배열 index 는 '*' 로 정규화)
 * - 라벨 없는 path 는 path 문자열 자체를 fallback
 * - 같은 path 는 1회만 출력 (Refine + min_length 가 동시에 떨어지는 케이스 방지)
 * - 최대 `maxItems` 개까지만, 초과는 "외 N건 더 있음" 안내 추가
 *
 * @param error Zod safeParse 실패 결과의 `error`
 * @param labelMap path → 사람용 라벨 사전
 * @param options.maxItems 토스트 가독성 보호 (기본 5)
 * @returns 줄바꿈으로 구분된 멀티라인 문자열 (sonner toaster 의 description CSS `whitespace-pre-line` 와 짝)
 */
export function formatZodIssuesForToast(
  error: ZodError,
  labelMap: Record<string, string>,
  options: { maxItems?: number } = {}
): string {
  const maxItems = options.maxItems ?? 5;
  // Zod v3 의 ZodError.issues 는 항상 array 보장 — null/undefined fallback 불필요.
  const issues: ZodIssue[] = error.issues;
  if (issues.length === 0) return '';

  const seen = new Set<string>();
  const lines: string[] = [];

  for (const issue of issues) {
    const pathKey = normalizePath(issue.path);
    if (seen.has(pathKey)) continue;
    seen.add(pathKey);

    const label = labelMap[pathKey] ?? (pathKey || '(루트)');
    const message = issue.message?.trim() || '필수 입력입니다.';
    const friendly = message === 'Required' ? '필수 입력입니다.' : message;
    lines.push(`${label}: ${friendly}`);
  }

  if (lines.length <= maxItems) {
    return lines.join('\n');
  }

  const head = lines.slice(0, maxItems);
  const remaining = lines.length - maxItems;
  return [...head, `외 ${remaining}건 더 있음`].join('\n');
}

/**
 * Zod path 를 라벨 사전 키로 정규화.
 *  - 객체 key 는 그대로
 *  - 숫자 index (배열) 는 '*' 로 치환 → `details.*.task_name` 같은 패턴 매칭 가능
 *
 * 라벨 사전을 작성할 때 배열 항목 자체에 라벨을 붙이고 싶다면 '*' 와일드카드를 사용.
 */
function normalizePath(path: ReadonlyArray<string | number>): string {
  return path.map((p) => (typeof p === 'number' ? '*' : p)).join('.');
}

/**
 * Zod 이슈 메시지 원문을 줄바꿈으로 join 한다 — 서버 Action 반환용.
 *
 * `formatZodIssuesForToast` 와 달리 labelMap 을 받지 않는다. 스키마 메시지가
 * 이미 사용자용 한국어 문구인 경로(인터뷰 V2 저장 Action) 전용으로,
 * 세 곳에 인라인 복제돼 있던 `#001` join 블록을 추출한 것이다.
 *
 * @param options.maxItems 토스트 가독성 보호 (기본 5)
 * @param options.fallback 유효 메시지가 하나도 없을 때 문구
 */
export function joinZodMessagesForToast(
  error: ZodError,
  options: { maxItems?: number; fallback?: string } = {}
): string {
  const maxItems = options.maxItems ?? 5;
  const fallback = options.fallback ?? '필수 입력 항목을 확인해주세요.';
  const messages = error.issues
    .map((issue) => issue.message)
    .filter((m) => Boolean(m?.trim()))
    .slice(0, maxItems);
  return messages.length > 0 ? messages.join('\n') : fallback;
}
