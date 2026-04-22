/**
 * 인터뷰 수행 시간 시작/종료를 '00:00~00:00' 포맷 문자열로 변환.
 *
 * ISSUE-10 Step C-2: 단일 `interview_time` → `interview_start_time` +
 * `interview_end_time` 분리에 맞춰 Export 3종(HWPX/PDF/XLSX)과 요약 UI 가
 * 공통으로 사용한다.
 *
 * 규칙:
 *   - 둘 다 있으면 `${start}~${end}`
 *   - 한쪽만 있으면 그 값
 *   - 둘 다 없으면 빈 문자열
 */
export function formatTimeRange(
  start?: string | null,
  end?: string | null,
): string {
  const s = (start ?? '').trim();
  const e = (end ?? '').trim();
  if (s && e) return `${s}~${e}`;
  return s || e || '';
}
