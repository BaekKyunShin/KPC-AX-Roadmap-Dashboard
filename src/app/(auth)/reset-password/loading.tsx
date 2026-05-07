import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Logo } from '@/components/ui/logo';
import { AuthBackgroundDecoration } from '@/components/auth/AuthBackgroundDecoration';
import { FooterCredit } from '@/components/ui/FooterCredit';
import { PAGE_TITLE, PAGE_DESCRIPTION } from './_meta';

export default function Loading() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4">
      <AuthBackgroundDecoration />

      <div className="w-full max-w-md relative">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block mb-4">
            <Logo height={32} />
          </Link>
          <p className="mt-1 text-muted-foreground">기업 맞춤형 AI 교육 설계 플랫폼</p>
        </div>

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

        <FooterCredit className="mt-8 text-muted-foreground" />
      </div>
    </main>
  );
}
