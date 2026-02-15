// =============================================================================
// 메시지 상수
// =============================================================================

/** 한 번에 조회할 메시지 수 (초기 로딩 + 페이지네이션 단위) */
export const MESSAGE_PAGE_SIZE = 30;

/** 대화 목록 한 번에 조회할 수 */
export const CONVERSATION_PAGE_SIZE = 30;

/** 메시지 최대 길이 */
export const MESSAGE_MAX_LENGTH = 2000;

/** 메시지 뱃지 최대 표시 수 (이상은 "9+") */
export const MESSAGE_BADGE_MAX = 9;

/** 역할별 한국어 라벨 */
export const ROLE_LABELS: Record<string, string> = {
  SYSTEM_ADMIN: '시스템관리자',
  OPS_ADMIN: '운영관리자',
  CONSULTANT_APPROVED: '컨설턴트',
};

/** 역할별 뱃지 스타일 (Tailwind 클래스) */
export const ROLE_BADGE_STYLES: Record<string, string> = {
  SYSTEM_ADMIN: 'bg-red-50 text-red-600 border-red-100',
  OPS_ADMIN: 'bg-purple-50 text-purple-600 border-purple-100',
  CONSULTANT_APPROVED: 'bg-emerald-50 text-emerald-600 border-emerald-100',
};

/** 역할별 아바타 배경색 (Tailwind 그라데이션) */
export const ROLE_AVATAR_COLORS: Record<string, string> = {
  SYSTEM_ADMIN: 'bg-gradient-to-br from-red-500 to-red-600',
  OPS_ADMIN: 'bg-gradient-to-br from-purple-500 to-purple-600',
  CONSULTANT_APPROVED: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
};

/** 이름에서 이니셜 추출 (최대 2자) */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// =============================================================================
// Realtime 채널 재시도 설정
// =============================================================================

/** Realtime 구독 실패 시 최대 재시도 횟수 */
export const MAX_REALTIME_RETRIES = 3;

/** 재시도 기본 지연 (ms) — 지수 백오프 계산의 기저값 */
export const REALTIME_RETRY_BASE_MS = 1_000;

/** 재시도 최대 지연 (ms) — 백오프 상한 */
export const REALTIME_RETRY_MAX_MS = 10_000;

/** 대화 읽음 처리 시 컴포넌트 간 통신에 사용하는 커스텀 이벤트 이름 */
export const CONVERSATION_READ_EVENT = 'conversation-read';

/** 메시지 가능 역할 목록 */
export const MESSAGING_ROLES = ['SYSTEM_ADMIN', 'OPS_ADMIN', 'CONSULTANT_APPROVED'] as const;

/** 이메일 알림 대상 역할 (MESSAGING_ROLES와 동일하나 의미적 구분) */
export const EMAIL_NOTIFY_ROLES: readonly string[] = MESSAGING_ROLES;

/**
 * 역할별 메시지 수신 가능 대상
 * - 컨설턴트: 운영관리자, 시스템관리자에게만 전송 가능
 * - 운영관리자/시스템관리자: 모든 메시징 역할에게 전송 가능
 */
export const ALLOWED_RECIPIENTS: Record<string, readonly string[]> = {
  CONSULTANT_APPROVED: ['OPS_ADMIN', 'SYSTEM_ADMIN'],
  OPS_ADMIN: ['SYSTEM_ADMIN', 'OPS_ADMIN', 'CONSULTANT_APPROVED'],
  SYSTEM_ADMIN: ['SYSTEM_ADMIN', 'OPS_ADMIN', 'CONSULTANT_APPROVED'],
};
