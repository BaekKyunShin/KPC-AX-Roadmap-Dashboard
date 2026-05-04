import { redirect } from 'next/navigation';
import { getCachedUser, getCachedProfile } from '@/lib/supabase/cached';
import Navigation from '@/components/Navigation';
import { FooterCredit } from '@/components/ui/FooterCredit';

// 안읽음 알림/메시지 카운트 fetch는 NotificationBell·MessageIcon이 자체적으로
// 마운트 시 수행한다(라우트 변경마다 layout await로 children swap이 막히던 잔존
// 현상 해소). 헤더 뱃지는 첫 진입 시 잠깐 0으로 보였다가 fetch 결과로 swap됨.
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
