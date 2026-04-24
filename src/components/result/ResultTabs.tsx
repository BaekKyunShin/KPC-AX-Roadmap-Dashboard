'use client';

import { useCallback, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { List, LayoutList } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ResultTabItem {
  /** URL 쿼리 파라미터 값 및 탭 value. 예: 'overview', 'requirements' */
  value: string;
  /** 탭 버튼에 표시할 라벨. 예: 'Ⅰ. 개요' */
  label: string;
  /** 탭 내용 */
  content: React.ReactNode;
}

interface ResultTabsProps {
  /** 탭 항목 배열 (순서 유지). */
  tabs: ResultTabItem[];
  /** 기본 탭 value (URL 파라미터 없을 때 폴백). 기본: tabs[0].value */
  defaultValue?: string;
  /** URL 쿼리 파라미터 이름. 기본: 'tab' */
  searchParamName?: string;
  /** className 합성 */
  className?: string;
}

/**
 * ResultTabs — 로드맵·PBL 결과 페이지 공용 탭 컴포넌트.
 *
 * 기능:
 * 1. URL ?tab={value} 동기화 — tab 변경 시 router.replace 로 shallow push,
 *    뒤로가기·새로고침·북마크 시 같은 탭 유지.
 * 2. sticky TabsList (top-16) — 스크롤 시에도 탭 바 유지.
 * 3. '전체 펼치기' 인쇄 토글 — 모든 탭 콘텐츠를 한 번에 펼쳐서 인쇄/PDF 저장.
 *    (접힌 콘텐츠는 화면에만 보이고, window.print() 시 CSS @media print 로 전체 노출)
 *
 * Radix Tabs 기반 (shadcn/ui). 키보드 네비는 Radix 기본 (←/→ 화살표).
 *
 * ## 사용 제약 (중요)
 *
 * - **상위 Suspense boundary 필수:** 내부적으로 `useSearchParams()` 를 사용하므로,
 *   프로덕션 빌드 시 해당 라우트 전체가 CSR bailout 되는 것을 막으려면
 *   **상위 페이지·layout 에서 `<Suspense fallback={...}>` 로 감싸야 한다**.
 *   PR #2 에서 RoadmapResultPage · PBLResultPage 래핑 시 이 규칙을 지킬 것.
 *
 * - **PageContainer 동등 래퍼 내부 전제:** sticky TabsList 는 상위 래퍼의
 *   좌우 패딩을 negative margin (`-mx-4 sm:-mx-6 lg:-mx-8`) 으로 취소하여
 *   전폭 배경을 그린다. 따라서 **`PageContainer` (또는 동일한 `px-4 sm:px-6 lg:px-8`
 *   패딩 래퍼) 내부에서만 사용**해야 한다. 다른 래퍼에서 쓰면 좌우 overflow 발생.
 *
 * - **전체 펼치기 상태는 URL 에 반영되지 않음 (의도):** 공유·북마크·새로고침 시
 *   기본 '탭별 보기' 로 복원된다. 단순 view-state 이므로 URL 오염을 회피.
 *   PR #2 통합 후 UX 피드백에 따라 `?expand=1` 동기화 여부 재검토 가능.
 */
export function ResultTabs({
  tabs,
  defaultValue,
  searchParamName = 'tab',
  className,
}: ResultTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlTab = searchParams?.get(searchParamName);
  const fallback = defaultValue ?? tabs[0]?.value;

  // 현재 탭 값: URL 파라미터 우선, 없거나 유효하지 않으면 fallback
  const validValues = tabs.map((t) => t.value);
  const activeValue =
    urlTab && validValues.includes(urlTab) ? urlTab : fallback;

  const [expandAll, setExpandAll] = useState(false);

  const handleValueChange = useCallback(
    (newValue: string) => {
      const params = new URLSearchParams(searchParams?.toString() ?? '');
      params.set(searchParamName, newValue);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams, searchParamName],
  );

  return (
    <div className={cn('result-tabs-root', className)}>
      <Tabs value={activeValue} onValueChange={handleValueChange}>
        <div className="sticky top-16 z-10 -mx-4 sm:-mx-6 lg:-mx-8 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75 border-b">
          <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-2 gap-2">
            <TabsList className="h-auto">
              {tabs.map((t) => (
                <TabsTrigger key={t.value} value={t.value}>
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setExpandAll((v) => !v)}
              aria-pressed={expandAll}
              aria-label={expandAll ? '탭별 보기로 전환' : '전체 펼치기'}
            >
              {expandAll ? (
                <>
                  <List className="mr-1.5 size-4" />
                  탭별 보기
                </>
              ) : (
                <>
                  <LayoutList className="mr-1.5 size-4" />
                  전체 펼치기
                </>
              )}
            </Button>
          </div>
        </div>

        {expandAll ? (
          <div className="space-y-8 pt-6">
            {tabs.map((t) => (
              <section
                key={t.value}
                aria-labelledby={`result-tab-section-${t.value}`}
                className="space-y-4"
              >
                <h2
                  id={`result-tab-section-${t.value}`}
                  className="text-lg font-semibold border-b pb-2"
                >
                  {t.label}
                </h2>
                {t.content}
              </section>
            ))}
          </div>
        ) : (
          tabs.map((t) => (
            <TabsContent key={t.value} value={t.value} className="pt-6">
              {t.content}
            </TabsContent>
          ))
        )}
      </Tabs>
    </div>
  );
}
