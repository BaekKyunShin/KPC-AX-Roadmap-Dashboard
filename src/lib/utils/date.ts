/**
 * SSR/CSR 동기화 안전 날짜·숫자 포맷터.
 *
 * **왜 필요한가? (ISSUE-20 / React #418 hydration mismatch)**
 *
 * `new Date(iso).toLocaleDateString('ko-KR')` 를 그대로 호출하면 server
 * (UTC) 과 client(KST) 의 timezone 차이로 같은 ISO 문자열이 다른 날짜로
 * 렌더되어 React #418 hydration error 가 발생한다. 예를 들어
 * `2026-04-19T15:00:00Z` 는 UTC 에서 `2026. 4. 19.` 이지만 KST 브라우저에서는
 * `2026. 4. 20.` 으로 출력된다.
 *
 * 모든 포맷터는 `Asia/Seoul` 타임존을 명시적으로 지정해 server/client 가
 * 동일한 결과를 보장한다.
 */

const TIME_ZONE = 'Asia/Seoul';
const LOCALE = 'ko-KR';

type DateInput = string | Date | null | undefined;

function toValidDate(input: DateInput): Date | null {
  if (input === null || input === undefined || input === '') return null;
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

/**
 * KST 기준 yyyy. m. d. 형식 (한국 ko-KR 기본 짧은 형식)
 *
 * 예: 2026-04-19T15:00:00Z → "2026. 4. 20."
 */
export function formatDateKR(input: DateInput): string {
  const date = toValidDate(input);
  if (!date) return '';
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).format(date);
}

/**
 * KST 기준 yyyy. m. d. hh:mm 형식
 *
 * 예: 2026-04-19T01:23:45Z → "2026. 4. 19. 10:23"
 */
export function formatDateTimeKR(input: DateInput): string {
  const date = toValidDate(input);
  if (!date) return '';
  // 'medium' style 은 환경마다 다를 수 있어 직접 조합
  const datePart = new Intl.DateTimeFormat(LOCALE, {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).format(date);
  const timePart = new Intl.DateTimeFormat(LOCALE, {
    timeZone: TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date);
  return `${datePart} ${timePart}`;
}

/**
 * KST 기준 24시간제 hh:mm 형식.
 *
 * `hourCycle: 'h23'` 을 명시해 자정 경계를 "00:00" 으로 일관 반환한다.
 * `hour12: false` 만 지정하면 ICU 버전별 ko-KR 기본값이 달라 macOS 는
 * "00:00", Ubuntu Node 는 "24:00" 을 반환해 CI 실패를 유발한 전례가 있다.
 */
export function formatTimeKR(input: DateInput): string {
  const date = toValidDate(input);
  if (!date) return '';
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date);
}

/**
 * KST 기준 "M월 D일" 형식 (홈 대시보드 활동 로그 등)
 */
export function formatDateMonthDayKR(input: DateInput): string {
  const date = toValidDate(input);
  if (!date) return '';
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: TIME_ZONE,
    month: 'long',
    day: 'numeric',
  }).format(date);
}

/**
 * KST 기준 "yyyy년 M월 D일" 형식 (긴 날짜 표시용)
 */
export function formatDateLongKR(input: DateInput): string {
  const date = toValidDate(input);
  if (!date) return '';
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

/**
 * 한국식 천 단위 콤마.
 *
 * `Number#toLocaleString()` 도 환경에 따라 결과가 다를 수 있어 명시적으로
 * `Intl.NumberFormat('ko-KR')` 을 사용한다.
 */
export function formatNumberKR(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '0';
  return new Intl.NumberFormat(LOCALE).format(value);
}
