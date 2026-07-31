import type { Metadata } from 'next';
import { Geist_Mono } from 'next/font/google';
import localFont from 'next/font/local';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Agentation } from 'agentation';
import './globals.css';

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const pretendard = localFont({
  src: '../../public/fonts/PretendardVariable.woff2',
  variable: '--font-pretendard',
  display: 'swap',
  weight: '100 900',
});

export const metadata: Metadata = {
  title: 'KPC AI 훈련 로드맵',
  description: '기업 AI 교육 진단, 컨설턴트 매칭, 로드맵 생성을 위한 B2B 솔루션',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // `data-scroll-behavior="smooth"` 는 globals.css 의 `html { scroll-behavior: smooth }` 와 짝이다.
  // 이 속성이 있어야 Next.js 가 **라우트 전환 중에만** smooth 를 잠시 끄고 위치를 복원한다.
  // 빠져 있으면 전환 중에도 스크롤이 애니메이션으로 처리돼, 애니메이션이 끝나기 전에
  // DOM 높이가 바뀌면 브라우저가 애니메이션을 취소하며 스크롤을 맨 위로 되돌린다
  // (세션 3~4 의 "목록에서 페이지를 넘기면 화면이 맨 위로 튀는" 문제와 같은 계열).
  return (
    <html lang="ko" data-scroll-behavior="smooth">
      <body className={`${pretendard.variable} ${geistMono.variable} antialiased`}>
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster />
        {process.env.NODE_ENV === 'development' && <Agentation />}
      </body>
    </html>
  );
}
