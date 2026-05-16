import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { SESSION_COOKIE_OPTIONS } from '@/lib/constants/session';

/**
 * Server-side Supabase client.
 *
 * 인증 세션 관리(getUser·signInWithPassword·signOut·signUp) 전용. cookie 기반 SSR
 * 세션을 자동 동기화한다.
 *
 * ⚠ `auth.flowType` 옵션을 여기서 전달해도 적용되지 않는다. @supabase/ssr 의
 *   createServerClient 가 내부에서 `flowType: "pkce"` 를 hardcode 로 덮어쓰기
 *   때문이다(`@supabase/ssr/dist/main/createServerClient.js:29`). 비번 재설정 메일
 *   발송은 implicit grant 가 필요하므로 [src/app/(auth)/actions/auth.ts](../app/(auth)/actions/auth.ts)
 *   의 `requestPasswordReset` 에서 @supabase/supabase-js 의 createClient 를 직접
 *   사용해 ssr 을 우회한다.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // 서버 컴포넌트에서 호출 시 무시
          }
        },
      },
      cookieOptions: SESSION_COOKIE_OPTIONS,
    }
  );
}
