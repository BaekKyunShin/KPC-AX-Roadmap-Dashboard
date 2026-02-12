export default function ProposalsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-7xl items-center px-4">
          <span className="text-sm font-semibold text-gray-900">
            KPC AI ROADMAP — 기능 제안 목업
          </span>
          <nav className="ml-8 flex gap-4 text-sm">
            <a
              href="/proposals/home"
              className="text-gray-600 hover:text-gray-900"
            >
              홈 대시보드
            </a>
            <a
              href="/proposals/stats"
              className="text-gray-600 hover:text-gray-900"
            >
              성과 통계
            </a>
            <a
              href="/proposals/notifications"
              className="text-gray-600 hover:text-gray-900"
            >
              알림 센터
            </a>
            <a
              href="/proposals/delivery"
              className="text-gray-600 hover:text-gray-900"
            >
              교육 추적
            </a>
            <a
              href="/proposals/templates"
              className="text-gray-600 hover:text-gray-900"
            >
              템플릿
            </a>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
