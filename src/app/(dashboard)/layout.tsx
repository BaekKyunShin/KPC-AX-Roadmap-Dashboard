import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Navigation from '@/components/Navigation';
import { FooterCredit } from '@/components/ui/FooterCredit';
import { fetchUnreadCount } from '@/app/(dashboard)/notifications/actions';
import { fetchUnreadConversationCount } from '@/app/(dashboard)/dashboard/messages/actions';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // 사용자 정보 조회
  const { data: profile } = await supabase.from('users').select('*').eq('id', user.id).single();

  if (!profile) {
    redirect('/login');
  }

  // 안읽음 알림/메시지 카운트 조회
  const [unreadCount, unreadMessageCount] = await Promise.all([
    fetchUnreadCount(),
    fetchUnreadConversationCount(),
  ]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navigation user={profile} unreadCount={unreadCount} unreadMessageCount={unreadMessageCount} />
      <main className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">{children}</div>
      </main>
      <footer className="mt-auto pb-6">
        <FooterCredit />
      </footer>
    </div>
  );
}
