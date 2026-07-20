/**
 * HWPX 보고서 표지 일자 포맷터 — 로케일·타임존 비의존 결정론 포맷.
 *
 * `Date.prototype.toLocaleDateString('ko-KR', …)` 는 런타임의 ICU/로케일 데이터와
 * 시스템 타임존에 따라 출력이 달라져(예: "2026. 04. 30." vs "2026/04/30",
 * 자정 경계에서 하루 밀림) 산출물이 비결정적이다. 저장값(Postgres `timestamptz`
 * → UTC ISO 문자열)의 **UTC 성분**을 문자열 조립해 항상 `YYYY. MM. DD.` 를 만든다.
 *
 * 운영 서버(Vercel = UTC)에서의 기존 `toLocaleDateString` 출력과 동일하며,
 * 로컬 개발/CI 의 타임존·로케일과 무관하게 같은 값을 보장한다.
 */
export function formatReportDate(value: string | number | Date | null | undefined): string {
  if (value === null || value === undefined || value === '') return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}. ${month}. ${day}.`;
}
