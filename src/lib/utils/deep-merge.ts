/**
 * 두 plain object 를 깊이 머지한다.
 *
 * 규칙:
 * - **plain object 끼리만** 재귀 머지 (Object.prototype 또는 null prototype).
 * - **배열은 머지하지 않고** source(=patch) 값으로 교체. 인터뷰 데이터의 요구사항 리스트·태스크 분석 등은
 *   사용자가 의도적으로 항목을 빼는 동작이 명시적 교체로 해석돼야 한다.
 * - **source 의 값이 `undefined` 이면 skip** (기존 target 값 유지). zod `.partial()` 결과는
 *   미입력 키가 자연스럽게 `undefined` 로 들어오므로 이 동작이 부분 머지의 핵심.
 * - **source 의 값이 `null` 이면 명시적 보존**. 사용자가 의도적으로 비운 값과 미설정을 구분.
 *
 * (#4 Nielsen H5/H3 — InterviewReviewClient lost update 차단:
 *  서버에서 기존 row 를 fetch → 부분 patch 와 deepMerge → 변환 → update 흐름의 핵심 유틸)
 */
type Plain = Record<string, unknown>;

function isPlainObject(value: unknown): value is Plain {
  if (value === null || typeof value !== 'object') return false;
  if (Array.isArray(value)) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

export function deepMerge<T extends object>(target: T, source: unknown): T {
  if (!isPlainObject(target)) {
    return (isPlainObject(source) ? (source as unknown as T) : target);
  }
  if (!isPlainObject(source)) {
    return target;
  }

  const result: Plain = { ...(target as unknown as Plain) };
  for (const key of Object.keys(source)) {
    const next = (source as Plain)[key];
    if (next === undefined) continue;
    const cur = result[key];
    if (isPlainObject(cur) && isPlainObject(next)) {
      result[key] = deepMerge(cur, next);
    } else {
      result[key] = next;
    }
  }
  return result as T;
}
