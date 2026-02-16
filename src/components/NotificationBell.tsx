'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Check, Loader2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import {
  NOTIFICATION_TYPE_CONFIG,
  NOTIFICATION_BADGE_MAX,
  OPS_NOTIFICATION_TABS,
} from '@/lib/constants/notification';
import { formatRelativeTime } from '@/lib/utils/consultant-home';
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '@/app/(dashboard)/notifications/actions';
import type { Notification, NotificationType, UserRole } from '@/types/database';

// =============================================================================
// Types
// =============================================================================

interface NotificationBellProps {
  initialUnreadCount: number;
  userRole: UserRole;
}

type TabKey = (typeof OPS_NOTIFICATION_TABS)[number]['key'];

// =============================================================================
// Component
// =============================================================================

export default function NotificationBell({ initialUnreadCount, userRole }: NotificationBellProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('all');

  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  // useRef로 page/loadingMore 관리 → IntersectionObserver에서 stale state 방지
  const pageRef = useRef(1);
  const isLoadingMoreRef = useRef(false);
  // 탭 변경 시 stale 응답 무시를 위한 requestId
  const requestIdRef = useRef(0);

  const isOpsAdmin = userRole === 'OPS_ADMIN' || userRole === 'SYSTEM_ADMIN';
  const showTabs = isOpsAdmin;

  // 브라우저에서 준비되면 mounted 켜기
  useEffect(() => {
    setMounted(true);
  }, []);

  // initialUnreadCount prop 동기화
  useEffect(() => {
    setUnreadCount(initialUnreadCount);
  }, [initialUnreadCount]);

  // Popover 열릴 때마다 알림 목록을 fresh fetch
  const handleOpenChange = async (open: boolean) => {
    setIsOpen(open);

    if (open) {
      const id = ++requestIdRef.current;
      setIsLoading(true);
      setActiveTab('all');
      pageRef.current = 1;

      const result = await fetchNotifications(1);
      // stale 응답 무시
      if (requestIdRef.current !== id) return;

      if (result.success) {
        setNotifications(result.data.notifications);
        setHasMore(result.data.hasMore);
      }
      setIsLoading(false);
    } else {
      // Popover 닫힐 때 초기화
      setNotifications([]);
      setHasMore(false);
    }
  };

  // 탭 변경
  const handleTabChange = async (tab: TabKey) => {
    setActiveTab(tab);
    const id = ++requestIdRef.current;
    setIsLoading(true);
    pageRef.current = 1;

    const filterValue = tab === 'all' ? undefined : tab;
    const result = await fetchNotifications(1, filterValue);
    // stale 응답 무시 (빠른 탭 전환 시)
    if (requestIdRef.current !== id) return;

    if (result.success) {
      setNotifications(result.data.notifications);
      setHasMore(result.data.hasMore);
    }
    setIsLoading(false);

    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  };

  // 무한 스크롤: 다음 페이지 로드
  const loadMore = async () => {
    if (isLoadingMoreRef.current) return;
    isLoadingMoreRef.current = true;
    setIsLoadingMore(true);

    const nextPage = pageRef.current + 1;
    pageRef.current = nextPage;

    const filterValue = activeTab === 'all' ? undefined : activeTab;
    const result = await fetchNotifications(nextPage, filterValue);

    if (result.success) {
      setNotifications((prev) => [...prev, ...result.data.notifications]);
      setHasMore(result.data.hasMore);
    }

    setIsLoadingMore(false);
    isLoadingMoreRef.current = false;
  };

  // IntersectionObserver 기반 무한 스크롤
  useEffect(() => {
    if (!isOpen || !sentinelRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoadingMoreRef.current) {
          loadMore();
        }
      },
      { root: scrollRef.current, threshold: 0.1 },
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps -- React Compiler가 메모이제이션 처리
  }, [isOpen]);

  // 단일 알림 클릭: 읽음 처리 + 페이지 이동
  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await markNotificationRead(notification.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }

    setIsOpen(false);

    if (notification.link) {
      router.push(notification.link);
    }
  };

  // 모두 읽음 처리
  const handleMarkAllRead = async () => {
    const result = await markAllNotificationsRead();
    if (result.success) {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    }
  };

  // 뱃지 표시 텍스트
  const badgeText =
    unreadCount > NOTIFICATION_BADGE_MAX ? `${NOTIFICATION_BADGE_MAX}+` : `${unreadCount}`;

  // 서버에서는 벨 버튼만 보여주고, 브라우저 준비 후 Popover 연결
  const bellButton = (
    <button
      className="relative flex items-center justify-center h-9 w-9 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
      aria-label={`알림 ${unreadCount > 0 ? `${unreadCount}개 안읽음` : ''}`}
    >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
          {badgeText}
        </span>
      )}
    </button>
  );

  if (!mounted) return bellButton;

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        {bellButton}
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[380px] max-w-[calc(100vw-2rem)] p-0"
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-900">알림</h3>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 transition-colors"
            >
              <Check className="h-3 w-3" />
              모두 읽음
            </button>
          )}
        </div>

        {/* 탭 (운영관리자/시스템관리자만) */}
        {showTabs && (
          <>
            <div className="flex px-4 gap-1">
              {OPS_NOTIFICATION_TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => handleTabChange(tab.key)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    activeTab === tab.key
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="h-2" />
          </>
        )}

        <Separator />

        {/* 알림 리스트 + 무한 스크롤 */}
        <div ref={scrollRef} className="max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <NotificationSkeleton />
          ) : notifications.length === 0 ? (
            <NotificationEmpty />
          ) : (
            <div className="divide-y divide-gray-100">
              {notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onClick={handleNotificationClick}
                />
              ))}

              {/* 무한 스크롤 센티넬 */}
              {hasMore && <div ref={sentinelRef} className="h-1" />}

              {/* 더 로딩 중 */}
              {isLoadingMore && (
                <div className="flex items-center justify-center py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                </div>
              )}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

function NotificationItem({
  notification,
  onClick,
}: {
  notification: Notification;
  onClick: (n: Notification) => void;
}) {
  const config = NOTIFICATION_TYPE_CONFIG[notification.type as NotificationType];
  const Icon = config?.icon;

  return (
    <button
      onClick={() => onClick(notification)}
      className={`flex items-start gap-3 w-full px-4 py-3 text-left transition-colors hover:bg-gray-50 ${
        !notification.is_read ? 'bg-blue-50/30' : ''
      }`}
    >
      {/* 안읽음 도트 + 타입 아이콘 */}
      <div className="relative flex-shrink-0 mt-0.5">
        <div
          className={`flex items-center justify-center w-8 h-8 rounded-full ${config?.bgColor || 'bg-gray-50'}`}
        >
          {Icon && <Icon className={`h-4 w-4 ${config?.textColor || 'text-gray-500'}`} />}
        </div>
        {!notification.is_read && (
          <span className="absolute -top-0.5 -left-0.5 w-2.5 h-2.5 rounded-full bg-blue-500 border-2 border-white" />
        )}
      </div>

      {/* 텍스트 */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm leading-snug ${
            notification.is_read ? 'text-gray-500' : 'text-gray-900 font-medium'
          }`}
        >
          {notification.title}
        </p>
        <p className="text-xs text-gray-400 mt-0.5 truncate">{notification.message}</p>
        <p className="text-xs text-gray-400 mt-1">
          {formatRelativeTime(notification.created_at)}
        </p>
      </div>
    </button>
  );
}

function NotificationEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
      <Bell className="h-8 w-8 mb-2 opacity-40" />
      <p className="text-sm">새로운 알림이 없습니다</p>
    </div>
  );
}

function NotificationSkeleton() {
  return (
    <div className="divide-y divide-gray-100">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 px-4 py-3">
          <div className="w-8 h-8 rounded-full bg-gray-100 animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 bg-gray-100 rounded animate-pulse" />
            <div className="h-3 w-1/2 bg-gray-100 rounded animate-pulse" />
          </div>
        </div>
      ))}
    </div>
  );
}
