import { createBrowserClient } from '@supabase/ssr';

/**
 * Browser-side Supabase client.
 *
 * `flowType: 'implicit'` — 비번 재설정 등 이메일 링크 흐름을 PKCE 가 아닌 implicit grant
 * 로 강제한다. PKCE 는 메일 요청한 브라우저의 localStorage 에 code_verifier 를 저장하고,
 * exchangeCodeForSession 시 같은 브라우저에서만 동작한다 — 사용자가 메일 요청은 PC 에서
 * 했는데 메일 링크는 모바일/시크릿창/다른 브라우저에서 클릭하면 code_verifier 부재로
 * "링크가 유효하지 않습니다" 가 일관되게 발생. 비번 재설정 UX 에 치명적.
 *
 * implicit grant 는 메일 링크가 #access_token=...&refresh_token=...&type=recovery 형태로
 * 와 어느 브라우저/디바이스에서든 setSession 으로 임시 세션화 가능하다. reset-password
 * 페이지가 이미 fragment 처리 로직을 가지고 있어 코드 측 추가 변경 없이 동작.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        flowType: 'implicit',
      },
    }
  );
}
