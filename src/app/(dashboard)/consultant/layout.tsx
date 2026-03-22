import { redirect } from 'next/navigation';
import { getCachedUser, getCachedProfile } from '@/lib/supabase/cached';

/** consultant 하위 모든 경로에 대해 CONSULTANT_APPROVED 역할을 검증합니다. */
export default async function ConsultantLayout({ children }: { children: React.ReactNode }) {
  const user = await getCachedUser();
  if (!user) {
    redirect('/login');
  }

  const profile = await getCachedProfile();
  if (!profile || profile.role !== 'CONSULTANT_APPROVED') {
    redirect('/dashboard');
  }

  return <>{children}</>;
}
