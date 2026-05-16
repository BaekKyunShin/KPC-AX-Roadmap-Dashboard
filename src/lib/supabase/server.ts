import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { SESSION_COOKIE_OPTIONS } from '@/lib/constants/session';

/**
 * Server-side Supabase client.
 *
 * `flowType: 'implicit'` — 비번 재설정 메일 발송(`resetPasswordForEmail`) 흐름을
 * PKCE 가 아닌 implicit grant 로 강제한다. 본 server 클라이언트가 메일 링크 형식을
 * 결정한다 (브라우저 client.ts 만 implicit 로 두는 것으로는 효과가 없다).
 *
 * PKCE(default) 는 code_verifier 를 요청자 디바이스 cookie 에 저장하므로 메일
 * 요청은 PC 에서 했는데 링크는 모바일/시크릿창/다른 브라우저에서 클릭하면 verifier
 * 부재로 "링크가 유효하지 않습니다" 가 일관되게 발생. implicit 는 fragment URL
 * (#access_token=...&refresh_token=...&type=recovery) 로 토큰을 직접 전달해 어떤
 * 디바이스에서든 동작한다.
 *
 * client.ts 와 반드시 동일 flowType 유지.
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
      auth: {
        flowType: 'implicit',
      },
    }
  );
}
