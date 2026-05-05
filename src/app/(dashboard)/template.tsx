'use client';

import { usePathname } from 'next/navigation';

/**
 * (dashboard) 라우트 그룹 template — V5: client component + key={pathname}.
 *
 * V4(server template)는 매 navigation 시 새 인스턴스로 마운트되지만, RSC payload
 * 도착 시점이 그대로라 React의 instant transition이 직전 페이지를 유지하는 default
 * 동작이 그대로 작동했다.
 *
 * V5는 client component로 만들고 pathname을 children div의 key로 부여한다.
 * pathname이 바뀌면 React는 새 컴포넌트 트리로 인식하여 children을 즉시 unmount →
 * remount 한다. 이로써 instant transition 정책이 우회되고 자식 segment의
 * loading.tsx Suspense fallback이 즉시 표시된다.
 *
 * 다른 UI/UX·로직·디자인 변경 없음. 단순 wrapper에 key만 부여.
 */
export default function DashboardTemplate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return <div key={pathname}>{children}</div>;
}
