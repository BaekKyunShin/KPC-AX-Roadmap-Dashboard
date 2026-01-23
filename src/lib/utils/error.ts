/**
 * 에러 처리 유틸리티
 */

/**
 * 서버 액션 에러 로깅
 * @param context 에러 발생 컨텍스트 (예: 'createCase', 'fetchUsers')
 * @param error 에러 객체
 */
export function logServerError(context: string, error: unknown): void {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error(`[${context}] Error:`, errorMessage);

  // 프로덕션에서는 추가적인 로깅 서비스로 전송할 수 있음
  if (process.env.NODE_ENV === 'production') {
    // TODO: Sentry나 다른 에러 트래킹 서비스로 전송
  }
}

/**
 * 에러 메시지 추출
 * @param error 에러 객체
 * @param defaultMessage 기본 메시지
 */
export function getErrorMessage(error: unknown, defaultMessage = '오류가 발생했습니다.'): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return defaultMessage;
}

/**
 * 안전한 JSON 파싱
 * @param jsonString JSON 문자열
 * @param defaultValue 파싱 실패 시 기본값
 */
export function safeJsonParse<T>(jsonString: string, defaultValue: T): T {
  try {
    return JSON.parse(jsonString) as T;
  } catch {
    return defaultValue;
  }
}

/**
 * 사용자 친화적 에러 메시지 변환
 * @param error 에러 객체
 */
export function getUserFriendlyErrorMessage(error: unknown): string {
  const message = getErrorMessage(error);

  // 일반적인 에러 패턴을 사용자 친화적 메시지로 변환
  const errorMappings: Record<string, string> = {
    'Failed to fetch': '네트워크 연결을 확인해주세요.',
    'Network Error': '네트워크 연결을 확인해주세요.',
    'Unauthorized': '로그인이 필요합니다.',
    '401': '로그인이 필요합니다.',
    '403': '접근 권한이 없습니다.',
    '404': '요청한 리소스를 찾을 수 없습니다.',
    '500': '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    'timeout': '요청 시간이 초과되었습니다. 다시 시도해주세요.',
  };

  for (const [pattern, friendlyMessage] of Object.entries(errorMappings)) {
    if (message.toLowerCase().includes(pattern.toLowerCase())) {
      return friendlyMessage;
    }
  }

  return message;
}

/**
 * 서버 액션 결과 래퍼
 * 에러 발생 시 일관된 형식으로 반환
 */
export async function withErrorHandling<T>(
  context: string,
  operation: () => Promise<T>,
  defaultErrorMessage = '작업을 수행할 수 없습니다.'
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const data = await operation();
    return { success: true, data };
  } catch (error) {
    logServerError(context, error);
    return { success: false, error: getErrorMessage(error, defaultErrorMessage) };
  }
}
