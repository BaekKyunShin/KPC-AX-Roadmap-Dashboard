import type { Metadata } from 'next';
import { Logo } from '@/components/ui/logo';

export const metadata: Metadata = {
  title: 'AI 훈련 자가진단 | KPC',
  description: '기업 AI 교육 수준 자가진단',
};

export default function AssessmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
          <Logo height={26} />
        </div>
      </header>

      {/* 콘텐츠 */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-8">
        {children}
      </main>

      {/* 푸터 */}
      <footer className="border-t border-gray-200 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
          <p className="text-sm text-gray-500 text-center">
            &copy; {new Date().getFullYear()} KPC 한국생산성본부. All rights
            reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
