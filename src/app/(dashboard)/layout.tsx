import { redirect } from 'next/navigation';
import { getCachedUser, getCachedProfile } from '@/lib/supabase/cached';
import Navigation from '@/components/Navigation';
import { FooterCredit } from '@/components/ui/FooterCredit';

/**
 * (dashboard) 그룹 공통 레이아웃.
 *
 * 인증 검증만 수행하고 즉시 셸을 렌더한다. 알림/메시지 미읽음 카운트는
 * NotificationBell/MessageIcon 이 mount 후 자체적으로 fetch + supabase realtime
 * 으로 구독하므로 SSR 단계에서 별도 await 가 필요 없다. 과거 layout 에서
 * Promise.all([fetchUnreadCount(), fetchUnreadConversationCount()]) 를 await 하면서
 * 매 진입마다 두 RPC 호출을 기다려 (특히 cold start) 사용자에게 흰 화면이
 * 길게 노출됐다 — 본 커밋에서 그 await 를 제거해 layout 셸이 즉시 렌더되도록
 * 한다. badge 값은 mount 후 client fetch (보통 100ms 이내) 로 채워진다.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCachedUser();
  if (!user) {
    redirect('/login');
  }

  const profile = await getCachedProfile();
  if (!profile) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navigation user={profile} />
      <main className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">{children}</div>
      </main>
      <footer className="mt-auto pb-20 md:pb-6">
        <FooterCredit />
      </footer>
    </div>
  );
}
