/**
 * (dashboard) 그룹 공통 fallback.
 *
 * layout 이 렌더된 후, 자식 page.tsx 가 server work 를 수행하는 동안 표시된다.
 * 라우트별 page.tsx 의 더 구체적인 loading.tsx 가 있으면 그것이 우선 표시된다.
 *
 * 결정적 형태(가운데 카드 등) 를 그리지 않는 이유:
 *   - (dashboard) 라우트는 각자 모양이 매우 다름 (테이블·차트·폼·결과 탭…)
 *   - 공통 fallback 에 결정적 모양을 넣으면 다음 페이지로 전환될 때 점프 발생
 *   - 본문 영역만 확보 (min-h) 하고 옅은 회색 배경으로 "곧 컨텐츠 등장" 인지 전달
 */
export default function DashboardGroupLoading() {
  return <div className="min-h-[60vh] rounded-lg bg-gray-100/50" aria-hidden="true" />;
}
