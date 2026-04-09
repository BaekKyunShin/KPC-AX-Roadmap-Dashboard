import { createClient } from '@/lib/supabase/server';
import NavbarClient from './NavbarClient';

/**
 * 랜딩 페이지 Navbar (async Server Component wrapper)
 *
 * 서버에서 auth 상태를 확인하여 NavbarClient에 isLoggedIn prop으로 전달한다.
 * Supabase 클라이언트(@/lib/supabase/client, ~30-50KB)를 랜딩 번들에 포함시키지
 * 않으면서도 "로그인 시 대시보드 버튼" UX를 유지하기 위한 구조.
 */
export default async function Navbar() {
  let isLoggedIn = false;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    isLoggedIn = !!user;
  } catch {
    // Supabase 오류 시 비로그인 상태로 안전 fallback
    isLoggedIn = false;
  }

  return <NavbarClient isLoggedIn={isLoggedIn} />;
}
