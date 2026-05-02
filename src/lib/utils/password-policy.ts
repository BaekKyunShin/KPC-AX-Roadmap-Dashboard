/**
 * 비밀번호 정책 단일 출처 (Single Source of Truth).
 *
 * 회원가입·비밀번호 변경 등 모든 비밀번호 검증 지점에서 이 모듈의
 * 상수·정규식을 사용해야 한다. 정책 변경 시 이 파일만 수정하면
 * 클라이언트 실시간 체크리스트와 서버 Zod 스키마가 동시에 갱신된다.
 *
 * (#5 Nielsen H10 — 사전 안내 부재 해소: register 페이지 실시간 체크리스트가
 *  이 함수의 결과를 ✓/원으로 표시한다)
 */

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_LETTER_REGEX = /[a-zA-Z]/;
export const PASSWORD_NUMBER_REGEX = /[0-9]/;

export interface PasswordPolicyResult {
  minLength: boolean;
  hasLetter: boolean;
  hasNumber: boolean;
}

export function checkPasswordPolicy(password: string): PasswordPolicyResult {
  return {
    minLength: password.length >= PASSWORD_MIN_LENGTH,
    hasLetter: PASSWORD_LETTER_REGEX.test(password),
    hasNumber: PASSWORD_NUMBER_REGEX.test(password),
  };
}
