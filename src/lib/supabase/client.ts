import { createBrowserClient } from '@supabase/ssr';

/**
 * Browser-side Supabase client.
 *
 * 브라우저측 인증 세션 처리 전용. cookie 기반 SSR 세션을 자동 동기화한다.
 * reset-password 페이지의 setSession(fragment 토큰 적용) 도 본 client 를 사용한다.
 *
 * ⚠ `auth.flowType` 옵션을 여기서 전달해도 적용되지 않는다. @supabase/ssr 의
 *   createBrowserClient 가 내부에서 `flowType: "pkce"` 를 hardcode 로 덮어쓰기
 *   때문이다(`@supabase/ssr/dist/main/createBrowserClient.js:37`). 비번 재설정 메일
 *   링크는 implicit grant 형식으로 발송되어야 하며, 이는 server 측의 메일 발송
 *   호출에서 @supabase/supabase-js 를 직접 사용해 ssr 을 우회한다
 *   ([src/app/(auth)/actions/auth.ts](../../app/(auth)/actions/auth.ts) `requestPasswordReset`).
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
