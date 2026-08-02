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
// Realtime 재시도 정책 — 이름에 도메인이 없는 범용 상수이지만 현재 위치가
// `constants/message.ts` 다. 헤더의 두 아이콘(메시지·알림)이 **같은 정책**을 써야 하므로
// 값을 복제하지 않고 그대로 참조한다. 공용 위치로 옮기는 것은 별도 정리 항목(P7) 범위.
import {
  MAX_REALTIME_RETRIES,
  REALTIME_RETRY_BASE_MS,
  REALTIME_RETRY_MAX_MS,
} from '@/lib/constants/message';
import { createClient } from '@/lib/supabase/client';
import { formatRelativeTime } from '@/lib/utils/consultant-home';
import { showInfoToast } from '@/lib/utils/toast';
import {
  fetchNotifications,
  fetchUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
} from '@/app/(dashboard)/notifications/actions';
import type { Notification, NotificationType, UserRole } from '@/types/database';

// =============================================================================
// Constants
// =============================================================================

/**
 * 안읽음 카운트 polling 간격 (MessageIcon 과 동일 톤).
 *
 * Realtime 구독이 붙기 전·붙지 못했을 때의 **폴백**이다. 구독이 `SUBSCRIBED` 되면
 * 중단하고, 실패하면 계속 돈다. 처음부터 켜 두는 이유는 구독이 성공도 실패도
 * 통보하지 않는 상태(네트워크 단절 등)에서 갱신이 아예 멈추는 것을 막기 위함이다 —
 * 그 경우 30초 지연은 남지만 **현재 동작과 같은 수준**은 보장된다.
 */
const POLL_INTERVAL_MS = 30_000;

/** Realtime 채널명 — MessageIcon 의 `message-icon:badge` 와 겹치지 않게 분리. */
const REALTIME_CHANNEL = 'notification-bell:badge';

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

  const isMountedRef = useRef(true);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null);

  const refreshUnreadCount = async () => {
    if (!isMountedRef.current || document.visibilityState !== 'visible') return;
    const count = await fetchUnreadCount();
    if (isMountedRef.current) setUnreadCount(count);
  };

  const startFallbackPolling = () => {
    if (pollIntervalRef.current) return; // 이미 실행 중
    pollIntervalRef.current = setInterval(refreshUnreadCount, POLL_INTERVAL_MS);
  };

  const stopFallbackPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  };

  // 클라이언트 자체 안읽음 카운트 갱신
  // - 첫 paint 후 1회 fetch (page redirect/transition 과 race 회피)
  // - 폴백 30s polling (visible 일 때만) — 아래 Realtime 구독이 붙으면 중단된다
  // - visibilitychange visible 시 즉시 fetch
  // layout 에서 await 를 제거해 첫 paint 를 가속하는 대신, 카운트는 client 에서 갱신한다.
  // 첫 fetch 를 requestAnimationFrame 으로 지연하는 이유: `/dashboard` 같은 redirect
  // 경유 페이지에서 RSC navigation transition 도중 server action 을 호출하면
  // page.evaluate 가 destroy 되거나 axe 가 redirect placeholder 를 위반으로 잡는다
  // (E2E /dashboard a11y · CLS 테스트 실패 사례). 첫 paint 후 = transition 완료 시점.
  useEffect(() => {
    isMountedRef.current = true;
    let rafId: number | null = requestAnimationFrame(() => {
      rafId = null;
      void refreshUnreadCount();
    });

    startFallbackPolling();

    const handleVisibility = () => {
      void refreshUnreadCount();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      isMountedRef.current = false;
      if (rafId !== null) cancelAnimationFrame(rafId);
      stopFallbackPolling();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- React Compiler가 메모이제이션 처리
  }, []);

  // #008 — 새 알림 도착 시 뱃지를 즉시 갱신한다.
  //
  // 이전에는 30초 polling 만이라 배정·인터뷰 완료 알림이 최대 30초 뒤에야 보였다.
  // 같은 헤더의 `MessageIcon` 이 쓰는 패턴(인증 대기 → 구독 → 지수 백오프 재시도 →
  // 소진 시 polling)을 그대로 따른다. `notifications` 테이블의 publication 등록은
  // `078_enable_realtime_notifications.sql` — **그것 없이는 이벤트가 오지 않는다.**
  useEffect(() => {
    const supabase = createClient();
    let disposed = false;
    let retryCount = 0;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    async function subscribe() {
      if (disposed) return;

      // 인증 세션이 로드된 뒤에 구독해야 RLS(`auth.uid() = user_id`)를 통과한다.
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (disposed || !user) return;

      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }

      channelRef.current = supabase
        .channel(REALTIME_CHANNEL)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            // 서버에서 걸러 남의 알림 이벤트는 아예 받지 않는다(RLS 와 이중 방어).
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            // payload 의 카운트를 직접 더하지 않고 서버 재조회로 맞춘다 —
            // 다른 탭에서 읽음 처리한 경우까지 한 번에 반영된다.
            void refreshUnreadCount();
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            retryCount = 0;
            stopFallbackPolling();
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            if (retryCount < MAX_REALTIME_RETRIES) {
              retryCount++;
              const delay = Math.min(
                REALTIME_RETRY_BASE_MS * 2 ** retryCount,
                REALTIME_RETRY_MAX_MS
              );
              retryTimer = setTimeout(() => void subscribe(), delay);
            } else {
              // 재시도 소진 → polling 으로 버틴다(30초 지연은 남지만 갱신은 계속된다)
              startFallbackPolling();
            }
          }
        });
    }

    void subscribe();

    return () => {
      disposed = true;
      if (retryTimer) clearTimeout(retryTimer);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- React Compiler가 메모이제이션 처리
  }, []);

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
      { root: scrollRef.current, threshold: 0.1 }
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
        prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }

    setIsOpen(false);

    // #012 — 이동 대상이 없으면 아무 일도 일어나지 않아 사용자가 "클릭이 안 먹었나?"
    // 하고 다시 누른다. 갈 곳을 안내한다.
    //
    // 전체 알림 목록으로 보내는 방법은 쓸 수 없다 — `/notifications` 에는 Server Action
    // 만 있고 **페이지가 없어서** 이동하면 404 다(2026-07-30 확인).
    //
    // 앱이 만드는 알림은 생성 스키마·타입에서 link 를 필수로 요구하므로(#012 근본 수정)
    // 이 분기는 과거 데이터·외부 삽입분에 대한 방어다.
    if (notification.link) {
      router.push(notification.link);
    } else {
      showInfoToast('이동할 화면이 없는 알림입니다', '알림 내용은 위 목록에서 확인할 수 있습니다.');
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
      <PopoverTrigger asChild>{bellButton}</PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        collisionPadding={16}
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
        <p className="text-xs text-gray-400 mt-1">{formatRelativeTime(notification.created_at)}</p>
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
