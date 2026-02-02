'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { loginUser } from '../actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { Logo } from '@/components/ui/logo';
import { AuthBackgroundDecoration } from '@/components/auth/AuthBackgroundDecoration';
import { COPYRIGHT_TEXT } from '@/lib/constants';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/dashboard';

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await loginUser(formData);

    if (result.success) {
      router.push(redirectTo);
      router.refresh();
    } else {
      setError(result.error || '로그인에 실패했습니다.');
    }

    setIsLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
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
          className="h-11"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">비밀번호</Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            required
            className="h-11 pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <Button type="submit" disabled={isLoading} className="w-full h-11 mt-6">
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            로그인 중...
          </>
        ) : (
          '로그인'
        )}
      </Button>
    </form>
  );
}

function LoadingForm() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="space-y-2">
        <div className="h-4 bg-muted rounded w-16"></div>
        <div className="h-11 bg-muted rounded w-full"></div>
      </div>
      <div className="space-y-2">
        <div className="h-4 bg-muted rounded w-16"></div>
        <div className="h-11 bg-muted rounded w-full"></div>
      </div>
      <div className="h-11 bg-muted rounded w-full mt-6"></div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4">
      <AuthBackgroundDecoration animated />

      <div className="w-full max-w-md relative">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-4">
            <Logo height={32} />
          </Link>
          <p className="mt-1 text-muted-foreground">기업 맞춤형 AI 교육 설계 플랫폼</p>
        </div>

        {/* Login Card */}
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl">로그인</CardTitle>
            <CardDescription>계정에 로그인하여 서비스를 이용하세요</CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<LoadingForm />}>
              <LoginForm />
            </Suspense>

            <div className="mt-6 text-center text-base">
              <span className="text-muted-foreground">계정이 없으신가요?</span>{' '}
              <Link
                href="/register"
                className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
              >
                회원가입
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="mt-8 text-center text-sm text-muted-foreground">{COPYRIGHT_TEXT}</p>
      </div>
    </div>
  );
}
