/**
 * PostgREST .or() 필터용 검색어 이스케이프
 *
 * PostgREST 필터 구문에서 특수 의미를 가지는 문자를 이스케이프합니다.
 * - 쉼표(,): 필터 구분자
 * - 마침표(.): 연산자 구분자
 * - 괄호(()): 그룹핑
 * - 백슬래시(\): 이스케이프 문자
 * - 퍼센트(%): LIKE 와일드카드
 * - 따옴표("): 값 감싸기
 */
export function sanitizePostgrestFilter(input: string): string {
  return input.replace(/[\\%,.()"]/g, (char) => `\\${char}`);
}

/**
 * PostgREST .or() 필터용 ilike 패턴 생성
 *
 * 사용자 입력을 sanitize한 후 양쪽에 %를 추가합니다.
 * 이 함수가 반환한 값을 .or() 필터에 직접 사용할 수 있습니다.
 *
 * @example
 * const p = ilikePattern(userInput);
 * query = query.or(`name.ilike.${p},email.ilike.${p}`);
 */
export function ilikePattern(input: string): string {
  return `%${sanitizePostgrestFilter(input)}%`;
}
