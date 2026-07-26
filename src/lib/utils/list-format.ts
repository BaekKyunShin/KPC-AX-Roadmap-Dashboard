/**
 * UI·PDF·HWPX에 공통 적용되는 리스트/텍스트 포맷 유틸.
 *
 * 홈페이지 UI에서 머리기호(·, •)로 구분되는 항목이 PDF/HWPX로 내보낼 때도
 * 동일한 구조로 보이도록 하기 위한 헬퍼 모음.
 */

/**
 * 훈련과정 명세서·교과목 "세부 내용" 전용 머리기호.
 *
 * ⚠️ `api/hwpx/generate.py` 가 값에 부여하는 문자와 **반드시 동일해야 한다**
 * (`generate.py::_build_roadmap_markers` / `_build_pbl_markers`). 화면·PDF·XLSX 는
 * 이 상수를, 한글(HWPX)은 Python 리터럴을 쓰므로 바꿀 때 양쪽을 함께 바꾼다.
 */
export const DETAIL_BULLET = '▪ ';

/** 배열 항목들을 머리기호(`• `)로 접두하여 줄바꿈 문자열로 결합. */
export function bulletize(items: string[] | null | undefined, bullet: string = '• '): string {
  if (!items || items.length === 0) return '';
  return items
    .filter((s) => typeof s === 'string' && s.trim() !== '')
    .map((s) => `${bullet}${s.trim()}`)
    .join('\n');
}

/**
 * `bulletize` 의 역변환. 줄바꿈으로 split 후 머리기호(`•·▪-*`)와 양 끝 공백을
 * 제거하고 빈 줄을 걸러 `string[]` 으로 반환한다.
 *
 * `▪` 도 제거 대상이다 — 세부 내용은 `DETAIL_BULLET` 로 접두되므로, 이미 접두된
 * 값을 다시 통과시켜도 머리기호가 **중복되지 않아야** 한다.
 *
 * 라운드트립 보장: `parseBullets(bulletize(x)) === x` (공백 trim 만 적용).
 */
export function parseBullets(text: string | null | undefined): string[] {
  if (!text) return [];
  return text
    .split('\n')
    .map((line) => line.replace(/^[•·▪\-*]\s*/, '').trim())
    .filter((line) => line.length > 0);
}

/**
 * 줄바꿈으로 구분된 일반 텍스트를 받아 각 라인에 머리기호를 prepend한다.
 * 이미 머리기호가 붙어있으면 정규화(중복 prefix 방지). 빈 줄·공백 줄은 무시.
 *
 * 표시 전용 변환이며 DB 저장값에는 영향 없음.
 */
export function bulletizeText(text: string | null | undefined, bullet: string = '• '): string {
  return bulletize(parseBullets(text), bullet);
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

/**
 * 교과목 "세부 내용(단원, 과제명)" 의 **표시·내보내기 공통 변환** — 단일 출처.
 *
 * 단원 경계 줄바꿈(`splitByUnit`) → 항목별 머리기호(`DETAIL_BULLET`) 부여.
 * 화면(결과 페이지·데모·갤러리)·PDF·XLSX 가 모두 이 함수를 통과하므로 한글(HWPX)과
 * 모양이 어긋날 수 없다. 이미 머리기호가 붙은 값은 정규화되어 중복 부여되지 않는다.
 *
 * ⚠️ HWPX payload 에는 쓰지 않는다 — Python 이 값에 `▪` 를 부여하므로 이중 접두가 된다.
 *
 * 표시 전용 변환이며 DB 저장값에는 영향 없다(편집 모드는 raw 값을 그대로 다룬다).
 */
export function bulletizeDetails(details: string | null | undefined): string {
  return bulletizeText(splitByUnit(details), DETAIL_BULLET);
}
