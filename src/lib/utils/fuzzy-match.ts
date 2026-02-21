/**
 * 퍼지 매칭 유틸리티 — cmdk의 filter prop에 전달하여 로컬 항목 필터링에 사용
 *
 * @param query 검색어
 * @param target 대상 문자열
 * @returns 1 (포함 검색), 0.5 (순차 문자 매칭), 0 (미매칭)
 */
export function fuzzyMatch(query: string, target: string): number {
  if (!query || !target) return 0;

  const q = query.toLowerCase();
  const t = target.toLowerCase();

  // 포함 검색
  if (t.includes(q)) return 1;

  // 순차 문자 매칭
  let qi = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++;
  }

  return qi === q.length ? 0.5 : 0;
}
