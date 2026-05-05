/**
 * (dashboard) 라우트 그룹 template.
 *
 * 라우트 변경 시 직전 페이지가 잠깐 잔존하다가 새 페이지로 swap되던 결함의 진짜
 * 해결책. Next.js 공식 문서 인용:
 *
 *   "Suspense boundaries inside layouts only show a fallback on first load,
 *    while templates show it on every navigation."
 *
 * template은 매 navigation마다 새 인스턴스로 마운트되어 children Suspense
 * fallback(= 각 page의 loading.tsx skeleton)이 라우트 변경 즉시 표시되도록 한다.
 *
 * 다른 UI/UX·로직·디자인 변경 없음. 단순 pass-through wrapper.
 */
export default function DashboardTemplate({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
