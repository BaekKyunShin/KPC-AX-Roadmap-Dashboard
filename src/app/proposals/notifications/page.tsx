import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Bell,
  Briefcase,
  CheckCircle2,
  Clock,
  FileText,
  MessageSquare,
  AlertTriangle,
  Settings,
  Check,
} from 'lucide-react';

// ── 하드코딩 데모 데이터 ──────────────────────────────

interface Notification {
  id: string;
  type: 'assignment' | 'status_change' | 'deadline' | 'message' | 'system';
  title: string;
  message: string;
  link: string;
  isRead: boolean;
  createdAt: string;
  relativeTime: string;
}

const NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    type: 'assignment',
    title: '새 프로젝트 배정',
    message: '(주)한국전자 프로젝트가 배정되었습니다. 인터뷰 마감일은 2026-02-12입니다.',
    link: '/consultant/projects/p1',
    isRead: false,
    createdAt: '2026-02-09T09:00:00',
    relativeTime: '30분 전',
  },
  {
    id: '2',
    type: 'deadline',
    title: '마감 임박',
    message: '삼성물산(주) 로드맵 확정 마감이 5일 남았습니다.',
    link: '/consultant/projects/p2/roadmap',
    isRead: false,
    createdAt: '2026-02-09T08:00:00',
    relativeTime: '1시간 전',
  },
  {
    id: '3',
    type: 'message',
    title: '운영관리자 메시지',
    message: '박관리자: 현대중공업 프로젝트 관련하여 참고 자료를 첨부합니다.',
    link: '/consultant/projects/p3',
    isRead: false,
    createdAt: '2026-02-08T17:30:00',
    relativeTime: '어제',
  },
  {
    id: '4',
    type: 'status_change',
    title: '프로젝트 상태 변경',
    message: 'LG에너지솔루션 프로젝트가 "교육 진행중" 상태로 변경되었습니다.',
    link: '/consultant/projects/p4',
    isRead: true,
    createdAt: '2026-02-08T14:00:00',
    relativeTime: '어제',
  },
  {
    id: '5',
    type: 'system',
    title: '로드맵 생성 완료',
    message: '삼성물산(주) 로드맵 v2가 성공적으로 생성되었습니다.',
    link: '/consultant/projects/p2/roadmap',
    isRead: true,
    createdAt: '2026-02-08T10:00:00',
    relativeTime: '어제',
  },
  {
    id: '6',
    type: 'assignment',
    title: '새 프로젝트 배정',
    message: 'SK하이닉스(주) 프로젝트가 배정되었습니다.',
    link: '/consultant/projects/p5',
    isRead: true,
    createdAt: '2026-02-07T09:00:00',
    relativeTime: '2일 전',
  },
  {
    id: '7',
    type: 'deadline',
    title: '마감 임박 경고',
    message: '현대중공업(주) 인터뷰 마감이 3일 남았습니다. 서둘러 주세요.',
    link: '/consultant/projects/p3/interview',
    isRead: true,
    createdAt: '2026-02-06T08:00:00',
    relativeTime: '3일 전',
  },
];

// ── 헬퍼 ────────────────────────────────────────────

const TYPE_ICON: Record<string, React.ReactNode> = {
  assignment: <Briefcase className="h-4 w-4 text-blue-600" />,
  status_change: <CheckCircle2 className="h-4 w-4 text-green-600" />,
  deadline: <AlertTriangle className="h-4 w-4 text-amber-600" />,
  message: <MessageSquare className="h-4 w-4 text-purple-600" />,
  system: <FileText className="h-4 w-4 text-gray-500" />,
};

const TYPE_BG: Record<string, string> = {
  assignment: 'bg-blue-50',
  status_change: 'bg-green-50',
  deadline: 'bg-amber-50',
  message: 'bg-purple-50',
  system: 'bg-gray-50',
};

const unreadCount = NOTIFICATIONS.filter((n) => !n.isRead).length;

// ── 페이지 컴포넌트 ──────────────────────────────────

export default function NotificationsMockup() {
  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="h-6 w-6" />
            알림
            {unreadCount > 0 && (
              <Badge className="bg-red-500 text-white">{unreadCount}</Badge>
            )}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            프로젝트 배정, 마감일, 상태 변경 등 주요 알림을 확인합니다.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5">
            <Check className="h-4 w-4" />
            모두 읽음 처리
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Settings className="h-4 w-4" />
            알림 설정
          </Button>
        </div>
      </div>

      {/* 필터 탭 */}
      <div className="flex gap-2 overflow-x-auto">
        {[
          { label: '전체', count: NOTIFICATIONS.length },
          { label: '읽지 않음', count: unreadCount },
          { label: '프로젝트 배정', count: 2 },
          { label: '마감 알림', count: 2 },
          { label: '메시지', count: 1 },
        ].map((filter, i) => (
          <Button
            key={filter.label}
            variant={i === 0 ? 'default' : 'outline'}
            size="sm"
            className="whitespace-nowrap"
          >
            {filter.label}
            <Badge
              variant="secondary"
              className="ml-1.5 text-xs px-1.5 min-w-[20px]"
            >
              {filter.count}
            </Badge>
          </Button>
        ))}
      </div>

      {/* 알림 목록 */}
      <Card>
        <CardContent className="p-0 divide-y">
          {NOTIFICATIONS.map((notification) => (
            <div
              key={notification.id}
              className={`flex items-start gap-3 p-4 transition-colors hover:bg-gray-50 ${
                !notification.isRead ? 'bg-blue-50/30' : ''
              }`}
            >
              {/* 아이콘 */}
              <div
                className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${TYPE_BG[notification.type]}`}
              >
                {TYPE_ICON[notification.type]}
              </div>

              {/* 내용 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm font-medium ${!notification.isRead ? 'text-gray-900' : 'text-gray-700'}`}
                  >
                    {notification.title}
                  </span>
                  {!notification.isRead && (
                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                  )}
                </div>
                <p className="mt-0.5 text-sm text-gray-600 line-clamp-2">
                  {notification.message}
                </p>
                <div className="mt-1 flex items-center gap-3">
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {notification.relativeTime}
                  </span>
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-xs text-primary"
                  >
                    자세히 보기
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* 알림 설정 미리보기 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Settings className="h-5 w-5 text-gray-400" />
            알림 설정
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              {
                label: '새 프로젝트 배정',
                description: '프로젝트가 배정될 때 알림',
                enabled: true,
              },
              {
                label: '마감일 알림',
                description: '마감 3일 전, 1일 전 알림',
                enabled: true,
              },
              {
                label: '상태 변경',
                description: '프로젝트 상태가 변경될 때 알림',
                enabled: true,
              },
              {
                label: '운영관리자 메시지',
                description: '운영관리자가 코멘트를 남길 때 알림',
                enabled: true,
              },
              {
                label: '시스템 알림',
                description: '로드맵 생성 완료, 내보내기 완료 등',
                enabled: false,
              },
            ].map((setting) => (
              <div
                key={setting.label}
                className="flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {setting.label}
                  </p>
                  <p className="text-xs text-gray-500">
                    {setting.description}
                  </p>
                </div>
                <div
                  className={`relative h-6 w-11 rounded-full transition-colors ${setting.enabled ? 'bg-primary' : 'bg-gray-200'}`}
                >
                  <div
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${setting.enabled ? 'left-[22px]' : 'left-0.5'}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
