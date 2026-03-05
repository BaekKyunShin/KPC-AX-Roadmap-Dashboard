// =============================================================================
// 알림 상수
// =============================================================================

import {
  Briefcase,
  AlertTriangle,
  CheckCircle2,
  MessageSquare,
  FileText,
  ClipboardCheck,
  FileEdit,
  FileBadge,
  ClipboardList,
} from 'lucide-react';
import type { NotificationType } from '@/types/database';

/** 알림 타입 목록 */
export const NOTIFICATION_TYPES = [
  'assignment',
  'deadline',
  'status_change',
  'message',
  'system',
  'interview_complete',
  'roadmap_draft',
  'roadmap_finalized',
  'assessment_submitted',
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
  interview_complete: {
    label: '인터뷰',
    bgColor: 'bg-teal-50',
    textColor: 'text-teal-600',
    icon: ClipboardCheck,
  },
  roadmap_draft: {
    label: '초안',
    bgColor: 'bg-indigo-50',
    textColor: 'text-indigo-600',
    icon: FileEdit,
  },
  roadmap_finalized: {
    label: '확정',
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-600',
    icon: FileBadge,
  },
  assessment_submitted: {
    label: '자가진단',
    bgColor: 'bg-cyan-50',
    textColor: 'text-cyan-600',
    icon: ClipboardList,
  },
};

/** 운영관리자/시스템관리자용 알림 탭 */
export const OPS_NOTIFICATION_TABS = [
  { key: 'all', label: '전체' },
  { key: 'interview_complete', label: '인터뷰' },
  { key: 'roadmap_draft', label: '초안' },
  { key: 'roadmap_finalized', label: '확정' },
] as const;

/** Popover에서 한 번에 보여줄 알림 수 */
export const NOTIFICATION_PAGE_SIZE = 20;

/** 뱃지 최대 표시 수 (이상은 "9+") */
export const NOTIFICATION_BADGE_MAX = 9;
