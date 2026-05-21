'use client';

import { Suspense, useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { showErrorToast, showSuccessToast, scrollToPageTop } from '@/lib/utils';
import { TOAST_ERROR } from '@/lib/constants/toast-messages';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Logo } from '@/components/ui/logo';
import { AuthBackgroundDecoration } from '@/components/auth/AuthBackgroundDecoration';
import { PasswordPolicyChecklist } from '@/components/auth/PasswordPolicyChecklist';
import { FooterCredit } from '@/components/ui/FooterCredit';
import { setNewPasswordWithToken } from '../actions';
import { PAGE_TITLE, PAGE_DESCRIPTION, PAGE_TITLE_DONE, PAGE_DESCRIPTION_DONE } from './_meta';

type SessionStatus = 'checking' | 'ready' | 'invalid';

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const isDone = searchParams.get('done') === '1';

  // done=1 화면에서는 어차피 폼을 렌더하지 않으므로 'ready'로 초기화해 추가 렌더 방지
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>(isDone ? 'ready' : 'checking');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // recovery 토큰 처리: Supabase 메일 링크는 implicit grant 형식.
  // 서버·브라우저 supabase 클라이언트 모두 flowType: 'implicit' 로 통일되어 있으므로
  // 메일 링크는 /reset-password#access_token=...&refresh_token=...&type=recovery
  // 형식으로 발송된다 (PKCE `?code=` 형식은 발생하지 않음).
  // setSession 으로 임시 세션화하면 cookie 가 설정되어 Server Action 의 getUser 가
  // 본인을 식별할 수 있다.
  useEffect(() => {
    if (isDone) {
      // done 화면에서는 토큰 부트스트랩이 불필요
      return;
    }

    const supabase = createClient();
    const hash = typeof window !== 'undefined' ? window.location.hash : '';

    async function bootstrap() {
      try {
        // implicit grant — fragment(#access_token=...) 처리
        if (hash && hash.includes('access_token')) {
          const params = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');
          const type = params.get('type');

          if (accessToken && refreshToken && type === 'recovery') {
            const { error: setSessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            // fragment 제거 (브라우저 히스토리에 토큰 잔류 방지)
            window.history.replaceState({}, '', window.location.pathname + window.location.search);
            if (setSessionError) {
              setSessionStatus('invalid');
              return;
            }
            setSessionStatus('ready');
            return;
          }
        }

        // fragment 가 없으면 이미 setSession 된 상태인지 확인
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setSessionStatus(user ? 'ready' : 'invalid');
      } catch {
        setSessionStatus('invalid');
      }
    }

    bootstrap();
  }, [isDone]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        const result = await setNewPasswordWithToken(newPassword, confirmPassword);
        if (!result.success) {
          setError(result.error);
          showErrorToast('비밀번호 재설정 실패', result.error);
          return;
        }
        showSuccessToast('재설정 완료', '새 비밀번호로 다시 로그인해주세요.');
        // 재설정 후 세션은 의도적으로 종료 — 사용자가 새 비번으로 재로그인
        const supabase = createClient();
        await supabase.auth.signOut();

        const url = new URL(window.location.href);
        url.searchParams.set('done', '1');
        window.history.pushState({}, '', url.toString());
        window.dispatchEvent(new PopStateEvent('popstate'));
        scrollToPageTop();
      } catch {
        setError('처리 중 오류가 발생했습니다.');
        showErrorToast('비밀번호 재설정 실패', TOAST_ERROR.NETWORK);
      }
    });
  }

  // 완료 화면
  if (isDone) {
    return (
      <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="space-y-1 pb-4 text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
          </div>
          <h1 className="text-xl font-semibold leading-none tracking-tight">{PAGE_TITLE_DONE}</h1>
          <CardDescription>{PAGE_DESCRIPTION_DONE}</CardDescription>
        </CardHeader>
        <CardContent>
          {/*
           * hard navigation (<a>) 사용 — Next.js Link 의 SPA navigation 은 setSession
           * recovery cookie 의 메모리 캐시 잔존으로 미들웨어가 stale token 으로 잘못 판단해
           * 403 + Chrome `Throttling navigation` (흰 화면) 을 유발한다. 전체 페이지 reload
           * 로 cookie·메모리 상태를 모두 재평가시켜 깨끗한 미인증 상태로 /login 진입한다.
           */}
          <Button asChild className="w-full h-11">
            <a href="/login">
              로그인 페이지로
              <ArrowRight className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // 토큰 검증 중
  if (sessionStatus === 'checking') {
    return (
      <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="space-y-1 pb-4">
          <h1 className="text-xl font-semibold leading-none tracking-tight">{PAGE_TITLE}</h1>
          <CardDescription>재설정 링크를 확인하는 중입니다...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="h-4 animate-shimmer rounded w-16" />
              <div className="h-11 animate-shimmer rounded w-full" />
            </div>
            <div className="space-y-2">
              <div className="h-4 animate-shimmer rounded w-20" />
              <div className="h-11 animate-shimmer rounded w-full" />
            </div>
            <div className="h-11 animate-shimmer rounded w-full mt-6" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // 토큰 무효 / 만료
  if (sessionStatus === 'invalid') {
    return (
      <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="space-y-1 pb-4">
          <h1 className="text-xl font-semibold leading-none tracking-tight">
            링크가 유효하지 않습니다
          </h1>
          <CardDescription>
            재설정 링크가 만료되었거나 이미 사용되었습니다. 메일을 다시 요청해주세요.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button asChild className="w-full h-11">
            <Link href="/forgot-password">비밀번호 찾기 다시 시도</Link>
          </Button>
          <Button asChild variant="outline" className="w-full h-11">
            <Link href="/login">로그인으로 돌아가기</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // 정상 폼
  return (
    <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
      <CardHeader className="space-y-1 pb-4">
        <h1 className="text-xl font-semibold leading-none tracking-tight">{PAGE_TITLE}</h1>
        <CardDescription>{PAGE_DESCRIPTION}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="newPassword">
              새 비밀번호 <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                id="newPassword"
                name="newPassword"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="h-11 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 표시'}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {newPassword.length === 0 ? (
              <p className="text-sm text-muted-foreground">8자 이상, 영문자와 숫자 포함</p>
            ) : (
              <PasswordPolicyChecklist password={newPassword} />
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">
              비밀번호 확인 <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-11 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? '비밀번호 숨기기' : '비밀번호 표시'}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
            <ShieldCheck className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
            <span>재설정 후에는 새 비밀번호로 다시 로그인해주세요.</span>
          </div>

          <Button type="submit" disabled={isPending} className="w-full h-11 mt-6">
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                재설정 중...
              </>
            ) : (
              '비밀번호 재설정'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4">
      <AuthBackgroundDecoration animated />

      <div className="w-full max-w-md relative">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-4">
            <Logo height={32} />
          </Link>
          <p className="mt-1 text-muted-foreground">기업 맞춤형 AI 교육 설계 플랫폼</p>
        </div>

        <Suspense
          fallback={
            <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="space-y-1 pb-4">
                <h1 className="text-xl font-semibold leading-none tracking-tight">{PAGE_TITLE}</h1>
                <CardDescription>{PAGE_DESCRIPTION}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="h-4 animate-shimmer rounded w-16" />
                    <div className="h-11 animate-shimmer rounded w-full" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 animate-shimmer rounded w-20" />
                    <div className="h-11 animate-shimmer rounded w-full" />
                  </div>
                  <div className="h-11 animate-shimmer rounded w-full mt-6" />
                </div>
              </CardContent>
            </Card>
          }
        >
          <ResetPasswordContent />
        </Suspense>

        <FooterCredit className="mt-8 text-muted-foreground" />
      </div>
    </main>
  );
}
