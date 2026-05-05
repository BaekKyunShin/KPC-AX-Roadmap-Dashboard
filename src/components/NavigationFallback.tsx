/**
 * Navigation 영역의 server-side fetch(`getCachedProfile`)가 끝나기 전에 표시되는 골격.
 * 첫 진입 시에만 잠깐 보이고, 이후 라우트 변경에서는 layout이 sync이므로 즉시 children이
 * swap되며 헤더는 그대로 유지된다.
 *
 * 실제 Navigation 컴포넌트의 sticky 헤더 골격을 미러링한다.
 */
export default function NavigationFallback() {
  return (
    <nav
      data-testid="navigation-fallback"
      className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* 로고 자리 */}
          <div className="h-6 w-32 rounded bg-gray-100 animate-pulse" />
          {/* 우측 아이콘 자리 */}
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded bg-gray-100 animate-pulse" />
            <div className="h-9 w-9 rounded bg-gray-100 animate-pulse" />
            <div className="h-9 w-9 rounded bg-gray-100 animate-pulse" />
            <div className="hidden md:block h-8 w-40 rounded bg-gray-100 animate-pulse" />
          </div>
        </div>
      </div>
    </nav>
  );
}
