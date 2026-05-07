'use client';

import { Suspense, useState, useTransition } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AlertCircle, ArrowLeft, CheckCircle2, Loader2, Mail } from 'lucide-react';
import { showErrorToast, showSuccessToast } from '@/lib/utils';
import { TOAST_ERROR } from '@/lib/constants/toast-messages';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Logo } from '@/components/ui/logo';
import { AuthBackgroundDecoration } from '@/components/auth/AuthBackgroundDecoration';
import { FooterCredit } from '@/components/ui/FooterCredit';
import { requestPasswordReset } from '../actions';
import { PAGE_TITLE, PAGE_DESCRIPTION, PAGE_TITLE_SENT, PAGE_DESCRIPTION_SENT } from './_meta';

function ForgotPasswordContent() {
  const searchParams = useSearchParams();
  const isSent = searchParams.get('sent') === '1';

  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(targetEmail: string) {
    if (!targetEmail.trim()) {
      const msg = '이메일을 입력해주세요.';
      setError(msg);
      showErrorToast('입력 확인 필요', msg);
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        const result = await requestPasswordReset(targetEmail.trim());
        if (!result.success) {
          setError(result.error);
          showErrorToast('재설정 메일 요청 실패', result.error);
          return;
        }
        showSuccessToast('메일 발송 완료', '받은편지함을 확인해주세요.');
        // sent=1 쿼리로 이동 (URL 공유 가능, 새로고침 안전)
        const url = new URL(window.location.href);
        url.searchParams.set('sent', '1');
        window.history.pushState({}, '', url.toString());
        window.dispatchEvent(new PopStateEvent('popstate'));
      } catch {
        setError('요청 처리 중 오류가 발생했습니다.');
        showErrorToast('재설정 메일 요청 실패', TOAST_ERROR.NETWORK);
      }
    });
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    submit(email);
  }

  function handleResend() {
    if (email.trim()) {
      submit(email);
    } else {
      // 이메일이 비어 있으면 메일 요청 폼으로 복귀
      const url = new URL(window.location.href);
      url.searchParams.delete('sent');
      window.history.pushState({}, '', url.toString());
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  }

  if (isSent) {
    return (
      <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="space-y-1 pb-4 text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 className="h-6 w-6" aria-hidden="true" />
          </div>
          <h1 className="text-xl font-semibold leading-none tracking-tight">{PAGE_TITLE_SENT}</h1>
          <CardDescription>{PAGE_DESCRIPTION_SENT}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            메일이 도착하지 않았다면 스팸함을 확인하거나, 잠시 후 다시 보내주세요.
          </p>
          <Button
            type="button"
            variant="outline"
            className="w-full h-11"
            onClick={handleResend}
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                다시 보내는 중...
              </>
            ) : (
              <>
                <Mail className="mr-2 h-4 w-4" />
                다시 보내기
              </>
            )}
          </Button>

          <div className="text-center text-base">
            <Link
              href="/login"
              className="inline-flex items-center font-medium text-blue-600 hover:text-blue-500 transition-colors"
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              로그인으로 돌아가기
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

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
            <Label htmlFor="email">이메일</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="example@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11"
            />
          </div>

          <Button type="submit" disabled={isPending} className="w-full h-11 mt-6">
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                메일 보내는 중...
              </>
            ) : (
              '재설정 메일 받기'
            )}
          </Button>

          <div className="mt-2 text-center text-base">
            <Link
              href="/login"
              className="inline-flex items-center font-medium text-blue-600 hover:text-blue-500 transition-colors"
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              로그인으로 돌아가기
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default function ForgotPasswordPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4">
      <AuthBackgroundDecoration animated />

      <div className="w-full max-w-md relative">
        {/* Logo */}
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
                  <div className="h-11 animate-shimmer rounded w-full mt-6" />
                </div>
              </CardContent>
            </Card>
          }
        >
          <ForgotPasswordContent />
        </Suspense>

        <FooterCredit className="mt-8 text-muted-foreground" />
      </div>
    </main>
  );
}
