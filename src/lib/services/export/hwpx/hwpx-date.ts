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

/**
 * 활동(수행) 일시의 날짜 성분을 양식 셀 폭에 맞는 `YY.MM.DD`(2자리 연도) 로 정규화.
 *
 * 표지 일자(`formatReportDate` = `YYYY. MM. DD.`)와 달리, Ⅰ-2 주요활동·Ⅱ-1-나·Ⅲ-1
 * '수행 일시' 셀은 폭이 좁아 양식이 `26.00.00` 포맷을 쓴다. 4자리·공백 포맷을 넣으면
 * 셀 폭을 넘겨 한컴에서 줄바꿈이 깨진다. 다양한 입력(ISO·점·공백)을 파싱해 통일한다.
 * 파싱 불가(이미 짧거나 형식 밖)면 원본을 그대로 반환한다.
 */
export function formatActivityDate(raw: string | null | undefined): string {
  if (!raw) return '';
  const m = String(raw).match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/);
  if (!m) return String(raw);
  const yy = m[1].slice(2);
  const mm = m[2].padStart(2, '0');
  const dd = m[3].padStart(2, '0');
  return `${yy}.${mm}.${dd}`;
}
