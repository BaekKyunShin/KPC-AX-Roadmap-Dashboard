import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

/** ops 하위 모든 경로에 대해 OPS_ADMIN / SYSTEM_ADMIN 역할을 검증합니다. */
export default async function OpsLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: currentUser } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!currentUser || !['OPS_ADMIN', 'SYSTEM_ADMIN'].includes(currentUser.role)) {
    redirect('/dashboard');
  }

  return <>{children}</>;
}
