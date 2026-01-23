import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

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
    }
  );

  // Server Action 요청은 리다이렉트하지 않음
  // Server Action은 POST 요청이며 Next-Action 헤더를 포함함
  const isServerAction =
    request.method === 'POST' &&
    (request.headers.get('next-action') || request.headers.get('content-type')?.includes('multipart/form-data'));

  if (isServerAction) {
    return supabaseResponse;
  }

  // 세션 갱신
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // 보호된 경로 정의
  const protectedRoutes = ['/dashboard', '/consultant', '/ops'];
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
