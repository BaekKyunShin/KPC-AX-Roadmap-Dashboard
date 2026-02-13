import {
  Search,
  FileText,
  CheckSquare,
  MessageSquare,
  Settings,
} from 'lucide-react';
import {
  ACTIVITY_LOG_TYPE_CONFIG,
  MANUAL_ACTIVITY_LOG_TYPES,
  type ActivityLogType,
} from '@/lib/constants/activity-log';

export const ICON_MAP: Record<ActivityLogType, typeof Search> = {
  pre_research: Search,
  field_note: FileText,
  follow_up: CheckSquare,
  client_feedback: MessageSquare,
  system_auto: Settings,
};

export const FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: '전체' },
  ...MANUAL_ACTIVITY_LOG_TYPES.map((type) => ({
    value: type,
    label: ACTIVITY_LOG_TYPE_CONFIG[type].label,
  })),
];
