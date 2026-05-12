import { unstable_rethrow } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import NavbarClient from './NavbarClient';

/**
 * 사용자 역할별 대시보드 진입 경로.
 *
 * /dashboard 는 서버에서 역할별로 redirect 하지만, 그 redirect 체인이
 * Next.js 16 Router 내부의 hook 위반(react.dev/errors/310)을 트리거하는
 * 경우가 있어, 역할이 명확한 사용자는 직접 목적지로 링크해 우회한다.
 *
 * 승인 대기 상태(USER_PENDING / OPS_ADMIN_PENDING)와 그 외는 기존대로
 * /dashboard 로 보낸다 (PendingApprovalCard 렌더링이 필요).
 */
export function resolveDashboardHref(role: string | undefined | null): string {
  switch (role) {
    case 'OPS_ADMIN':
    case 'SYSTEM_ADMIN':
      return '/ops/projects';
    case 'CONSULTANT_APPROVED':
      return '/consultant/home';
    default:
      return '/dashboard';
  }
}

/**
 * 랜딩 페이지 Navbar (async Server Component wrapper)
 *
 * 서버에서 auth 상태를 확인하여 NavbarClient에 isLoggedIn prop으로 전달한다.
 * Supabase 클라이언트(@/lib/supabase/client, ~30-50KB)를 랜딩 번들에 포함시키지
 * 않으면서도 "로그인 시 대시보드 버튼" UX를 유지하기 위한 구조.
 *
 * 로그인된 사용자의 역할도 같이 조회해 대시보드 버튼 href 를 역할별 직접
 * 경로로 지정한다 (/dashboard 서버 redirect 우회).
 */
export default async function Navbar() {
  let isLoggedIn = false;
  let dashboardHref = '/dashboard';
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    isLoggedIn = !!user;

    if (user) {
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();
      dashboardHref = resolveDashboardHref(profile?.role);
    }
  } catch (err) {
    // Next.js 내부 제어 흐름 에러(redirect/notFound 등)는 반드시 재throw하여
    // 프레임워크가 정상 처리하도록 함. 그 외 실제 에러만 비로그인 fallback.
    unstable_rethrow(err);
    isLoggedIn = false;
    dashboardHref = '/dashboard';
  }

  return <NavbarClient isLoggedIn={isLoggedIn} dashboardHref={dashboardHref} />;
}
