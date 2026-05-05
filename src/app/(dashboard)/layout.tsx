import { Suspense } from 'react';
import NavigationContainer from '@/components/NavigationContainer';
import NavigationFallback from '@/components/NavigationFallback';
import { FooterCredit } from '@/components/ui/FooterCredit';

// layout을 sync function으로 유지해 자식 segment의 loading.tsx가 즉시 표시되도록 한다.
// user/profile fetch는 NavigationContainer가 Suspense 경계 안에서 수행 → layout-await로
// children swap이 막히던 잔존 현상이 해소된다. 인증/리다이렉트는 middleware(proxy)가 처리.
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Suspense fallback={<NavigationFallback />}>
        <NavigationContainer />
      </Suspense>
      <main className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">{children}</div>
      </main>
      <footer className="mt-auto pb-20 md:pb-6">
        <FooterCredit />
      </footer>
    </div>
  );
}
