/**
 * HWPX 파일명 안전 변환 유틸.
 *
 * company_name 을 그대로 파일명에 삽입하면 macOS/Windows 모두 금지 문자
 * (/ \ : * ? " < > |) 가 포함될 수 있어 다운로드/저장 오류를 유발한다.
 * 한글·영문·숫자·공백·하이픈·언더스코어·괄호·점은 허용하고 그 외 특수문자
 * 는 `_` 로 치환한다. 선행·후행 공백 및 연속 언더스코어는 1개로 정리.
 *
 * 예:
 *   "KT/SKT 컨소시엄"  → "KT_SKT 컨소시엄"
 *   "A*B:C?"           → "A_B_C_"
 *   ""                 → "document"
 */
const FORBIDDEN_CHARS = /[\\/:*?"<>|\r\n\t\x00-\x1F\x7F]/g;

export function sanitizeFileNamePart(input: string, fallback = 'document'): string {
  const trimmed = (input ?? '').trim();
  if (trimmed.length === 0) return fallback;

  const replaced = trimmed.replace(FORBIDDEN_CHARS, '_');
  const collapsed = replaced.replace(/_+/g, '_');
  const stripped = collapsed.replace(/^[._]+|[._]+$/g, '');

  return stripped.length > 0 ? stripped : fallback;
}
