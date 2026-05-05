import { getCachedProfile } from '@/lib/supabase/cached';
import Navigation from './Navigation';

/**
 * Navigation 비동기 컨테이너 — DashboardLayout이 sync function이 되도록 user/profile
 * fetch를 이 컴포넌트로 분리한다. layout 안에서 `<Suspense fallback={<NavigationFallback/>}>`
 * 로 감싸므로, fetch가 진행되는 동안 자식 segment(`children`) 마운트가 막히지 않는다.
 *
 * 인증/리다이렉트는 src/lib/supabase/middleware.ts의 proxy가 이미 처리하므로 여기서는
 * 단순히 profile null guard만 둔다.
 */
export default async function NavigationContainer() {
  const profile = await getCachedProfile();
  if (!profile) return null;
  return <Navigation user={profile} />;
}
