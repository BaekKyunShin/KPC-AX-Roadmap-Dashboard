/**
 * UI·PDF·HWPX에 공통 적용되는 리스트/텍스트 포맷 유틸.
 *
 * 홈페이지 UI에서 머리기호(·, •)로 구분되는 항목이 PDF/HWPX로 내보낼 때도
 * 동일한 구조로 보이도록 하기 위한 헬퍼 모음.
 */

/** 배열 항목들을 머리기호(`• `)로 접두하여 줄바꿈 문자열로 결합. */
export function bulletize(
  items: string[] | null | undefined,
  bullet: string = '• ',
): string {
  if (!items || items.length === 0) return '';
  return items
    .filter((s) => typeof s === 'string' && s.trim() !== '')
    .map((s) => `${bullet}${s.trim()}`)
    .join('\n');
}

/**
 * `bulletize` 의 역변환. 줄바꿈으로 split 후 머리기호(`•·-*`)와 양 끝 공백을
 * 제거하고 빈 줄을 걸러 `string[]` 으로 반환한다.
 *
 * 라운드트립 보장: `parseBullets(bulletize(x)) === x` (공백 trim 만 적용).
 */
export function parseBullets(text: string | null | undefined): string[] {
  if (!text) return [];
  return text
    .split('\n')
    .map((line) => line.replace(/^[•·\-*]\s*/, '').trim())
    .filter((line) => line.length > 0);
}

/**
 * 훈련과정 명세서의 "세부 내용(단원, 과제명)" 텍스트에서 단원 경계마다 줄바꿈을 삽입한다.
 *
 * 예:
 *   "1단원: AI 개요, 2단원: 프롬프트 작성, 3단원: 실습"
 *   → "1단원: AI 개요\n2단원: 프롬프트 작성\n3단원: 실습"
 *
 * 규칙:
 *   - `\d+단원` 패턴을 경계로 인식
 *   - 첫 단원 앞에는 줄바꿈을 붙이지 않는다
 *   - 이미 줄바꿈이 포함된 문자열이면 추가 삽입 없이 trim 후 반환
 */
export function splitByUnit(details: string | null | undefined): string {
  if (!details) return '';
  const trimmed = details.trim();
  if (!trimmed) return '';

  // 이미 줄바꿈이 있으면 그대로 (사용자가 의도한 레이아웃 존중)
  if (trimmed.includes('\n')) return trimmed;

  // `N단원`/`N단원:` 앞에 줄바꿈 삽입. 첫 번째는 제외.
  const pattern = /(?:\s*,\s*|\s+)(?=\d+\s*단원\s*[:.])/g;
  return trimmed.replace(pattern, '\n').trim();
}
