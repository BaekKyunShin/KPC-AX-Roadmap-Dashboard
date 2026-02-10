// =============================================================================
// 알림 상수
// =============================================================================

import {
  Briefcase,
  AlertTriangle,
  CheckCircle2,
  MessageSquare,
  FileText,
} from 'lucide-react';
import type { NotificationType } from '@/types/database';

/** 알림 타입 목록 */
export const NOTIFICATION_TYPES = [
  'assignment',
  'deadline',
  'status_change',
  'message',
  'system',
] as const;

/** 알림 타입별 설정 (라벨, 색상, 아이콘) */
export const NOTIFICATION_TYPE_CONFIG: Record<
  NotificationType,
  {
    label: string;
    bgColor: string;
    textColor: string;
    icon: typeof Briefcase;
  }
> = {
  assignment: {
    label: '배정',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-600',
    icon: Briefcase,
  },
  deadline: {
    label: '마감',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-600',
    icon: AlertTriangle,
  },
  status_change: {
    label: '상태변경',
    bgColor: 'bg-green-50',
    textColor: 'text-green-600',
    icon: CheckCircle2,
  },
  message: {
    label: '메시지',
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-600',
    icon: MessageSquare,
  },
  system: {
    label: '시스템',
    bgColor: 'bg-gray-50',
    textColor: 'text-gray-500',
    icon: FileText,
  },
};

/** Popover에서 한 번에 보여줄 알림 수 */
export const NOTIFICATION_PAGE_SIZE = 20;

/** 뱃지 최대 표시 수 (이상은 "9+") */
export const NOTIFICATION_BADGE_MAX = 9;
