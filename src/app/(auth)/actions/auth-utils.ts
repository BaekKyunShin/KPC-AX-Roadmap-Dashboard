/**
 * Supabase Auth 에러 메시지를 한글로 변환
 * 'use server' 파일에서 동기 함수를 export할 수 없으므로 별도 유틸리티로 분리
 */
export function translateAuthError(message: string): string {
  const errorMap: Record<string, string> = {
    // 이메일 관련
    'Email rate limit exceeded': '이메일 전송 한도를 초과했습니다. 약 1시간 후 다시 시도해주세요.',
    'User already registered': '이미 등록된 이메일입니다. 로그인 페이지에서 로그인해주세요.',
    'Email not confirmed': '이메일 인증이 완료되지 않았습니다. 이메일을 확인해주세요.',
    'Unable to validate email address: invalid format': '유효하지 않은 이메일 형식입니다.',
    'invalid email': '유효하지 않은 이메일 형식입니다.',

    // 비밀번호 관련
    'Password should be at least 6 characters': '비밀번호는 최소 6자 이상이어야 합니다.',
    'Password should be at least 8 characters': '비밀번호는 최소 8자 이상이어야 합니다.',
    'Signup requires a valid password': '유효한 비밀번호를 입력하세요.',
    'New password should be different from the old password': '새 비밀번호는 기존 비밀번호와 달라야 합니다.',

    // 로그인 관련
    'Invalid login credentials': '이메일 또는 비밀번호가 올바르지 않습니다.',
    'invalid claim: missing sub claim': '인증 정보가 올바르지 않습니다. 다시 로그인해주세요.',

    // Rate Limit 관련
    'For security purposes, you can only request this once every 60 seconds': '보안을 위해 60초에 한 번만 요청할 수 있습니다.',
    'rate limit': '요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.',

    // 토큰/링크 관련
    'Email link is invalid or has expired': '이메일 링크가 유효하지 않거나 만료되었습니다.',
    'Token has expired or is invalid': '토큰이 만료되었거나 유효하지 않습니다.',

    // 기타
    'Anonymous sign-ins are disabled': '익명 로그인이 비활성화되어 있습니다.',
    'Signups not allowed for this instance': '회원가입이 비활성화되어 있습니다. 관리자에게 문의하세요.',
    'Database error': '데이터베이스 오류가 발생했습니다. 관리자에게 문의하세요.',
  };

  // 정확히 일치하는 에러 메시지가 있으면 한글로 반환
  if (errorMap[message]) {
    return errorMap[message];
  }

  // 부분 일치 검색 (소문자로 비교)
  const lowerMessage = message.toLowerCase();
  for (const [key, value] of Object.entries(errorMap)) {
    if (lowerMessage.includes(key.toLowerCase())) {
      return value;
    }
  }

  // 일치하는 것이 없으면 사용자 친화적 메시지 반환
  // 원본 에러는 서버 로그에만 기록
  console.error('[translateAuthError Error] 미번역 메시지:', message);
  return '일시적인 오류가 발생했습니다. 잠시 후 다시 시도하거나, 문제가 지속되면 관리자에게 문의해주세요.';
}
