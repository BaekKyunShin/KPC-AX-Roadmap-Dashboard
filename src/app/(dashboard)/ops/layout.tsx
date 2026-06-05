import { redirect } from 'next/navigation';
import { getCachedUser, getCachedProfile } from '@/lib/supabase/cached';
import { isOpsManager } from '@/lib/constants/status';

/** ops 하위 모든 경로에 대해 OPS_ADMIN / SYSTEM_ADMIN 역할을 검증합니다. */
export default async function OpsLayout({ children }: { children: React.ReactNode }) {
  const user = await getCachedUser();
  if (!user) {
    redirect('/login');
  }

  const profile = await getCachedProfile();
  if (!profile || !isOpsManager(profile.role)) {
    redirect('/dashboard');
  }

  return <>{children}</>;
}
