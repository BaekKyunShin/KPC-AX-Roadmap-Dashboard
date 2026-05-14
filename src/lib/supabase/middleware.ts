import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE_OPTIONS } from '@/lib/constants/session';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
      cookieOptions: SESSION_COOKIE_OPTIONS,
    }
  );

  // 실서버 검증 + stale token 정리.
  // Why: 과거에는 getSession() 으로 로컬 JWT 디코딩만 수행했으나, 서버 측에서 무효화된
  //   토큰(비번 변경·관리자 ban·강제 종료)을 감지하지 못해 layout 의 getCachedUser()
  //   가 null 반환 → redirect('/login') → 미들웨어가 stale JWT 로 user 존재 판단 →
  //   redirect('/dashboard') → 무한 핑퐁(ERR_TOO_MANY_REDIRECTS·흰 화면) 이 발생했다.
  //   getUser() 는 매 호출 Supabase Auth API 에 검증을 요청해 stale token 을 즉시
  //   감지한다 (Supabase 2024+ 공식 가이드). error 시 signOut 으로 cookie 를 정리해
  //   다음 요청부터 정상 미인증 흐름이 동작한다.
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error && !user) {
    // stale token cleanup — supabase signOut 의 setAll 콜백이 빈 토큰 cookie 를
    // supabaseResponse 에 포함시켜 브라우저 쿠키가 정리된다.
    await supabase.auth.signOut();
  }

  // Server Action 요청은 세션 갱신만 수행하고 리다이렉트하지 않음
  const isServerAction =
    request.method === 'POST' &&
    (request.headers.get('next-action') || request.headers.get('content-type')?.includes('multipart/form-data'));

  if (isServerAction) {
    return supabaseResponse;
  }

  const pathname = request.nextUrl.pathname;

  // 보호된 경로 정의
  const protectedRoutes = ['/dashboard', '/consultant', '/ops', '/gallery', '/notifications', '/test-roadmap'];
  // 회원가입 페이지는 인증된 사용자도 접근 가능 (새 계정 생성을 위해)
  const authRoutes = ['/login'];

  const isProtectedRoute = protectedRoutes.some((route) => pathname.startsWith(route));
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));
  const isRegisterRoute = pathname.startsWith('/register');

  // 인증되지 않은 사용자가 보호된 경로 접근 시
  if (!user && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  // 인증된 사용자가 로그인 페이지 접근 시 (회원가입 페이지는 제외)
  if (user && isAuthRoute && !isRegisterRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
