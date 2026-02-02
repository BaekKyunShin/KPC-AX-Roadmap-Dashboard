import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { COPYRIGHT_TEXT } from '@/lib/constants';
import Navigation from '@/components/Navigation';

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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navigation user={profile} />
      <main className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">{children}</div>
      </main>
      <footer className="mt-auto pb-6">
        <p className="text-center text-sm text-gray-400">{COPYRIGHT_TEXT}</p>
      </footer>
    </div>
  );
}
