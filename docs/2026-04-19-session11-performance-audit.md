# Session 11 성능 감사 리포트

**작성일:** 2026-04-19
**감사 범위:** Session 1~11에서 도입된 모든 기능
**브랜치:** feature/ofa-12-final-qa-docs

---

## 500자 요약

전체 코드베이스 성능 감사 결과, Critical 이슈는 없음. High 이슈 2건이 확인됨.
(1) `AuditLogClient`의 검색어 필터링이 서버가 아닌 클라이언트에서 실행되어 페이지네이션 정확도가 낮아지는 구조적 문제,
(2) 갤러리 `ALL` 트랙 병합 조회 시 2배 쿼리를 실행하면서 각 트랙에서 또 `projects` 2-stage 검색 쿼리를 중복 발행하는 N+1 유사 패턴.
번들 측면에서는 GSAP·Recharts·motion 모두 정상적으로 동적 import 또는 `next/dynamic` 처리됨.
Realtime 채널은 cleanup 정상. Server Action 워터폴 대부분 `Promise.all`로 병렬화됨.
HWPX 클라이언트 UX에 스피너(isLoading)가 구현되어 있어 지연 UX는 문제없음.
LLM 호출은 240초 타임아웃 + 취소/재시도 구현 완료.

---

## 성능 분석 결과

### 번들 분석

| 청크 | 추정 크기 | 포함 라이브러리 | 최적화 상태 | 권고 |
|------|-----------|----------------|-------------|------|
| GSAP + ScrollTrigger | ~200KB | 랜딩 HeroSection, SmoothScroll, FooterSection, DemoSection, ScrollAnimation | 동적 import(`await import('gsap')`) 적용됨 | 정상 |
| Recharts (PieChart) | ~400KB | StatusDistributionChart (컨설턴트홈·OPS 프로젝트), ConsultantAssessmentResult | `next/dynamic` + `ssr: false` 적용됨 | 정상 |
| motion/react | ~150KB | TemplateForm (Reorder, useDragControls) | 정적 import 유지 — TemplateForm 자체가 CC이므로 번들에 포함됨 | Medium: `/ops/templates` 진입 시만 필요하므로 `next/dynamic` 분리 검토 |
| jspdf + jspdf-autotable | ~300KB | pdf-generator.ts, pdf-pbl-generator.ts, export-interview-guide-pdf.ts | `await import('jspdf')` 동적 import 적용됨 | 정상 |
| xlsx-js-style | ~200KB | AuditLogClient.exportToExcel, export-xlsx.ts | `await import('xlsx-js-style')` 동적 import 적용됨 | 정상 |
| @next/bundle-analyzer | 설정 완료 | ANALYZE=true npm run build | 설정됨 | 정상 |

**next.config.ts `optimizePackageImports`**: recharts, motion, lucide-react, @radix-ui/* 등 14개 라이브러리 등록 완료.

---

### 렌더링 병목

| 컴포넌트 | 문제 | 우선순위 | 영향 | 권장 조치 |
|----------|------|----------|------|----------|
| `AuditLogClient` (L227-233) | `searchKeyword` 필터링이 클라이언트에서 `logs.filter()` 실행 — 서버 조회 후 같은 페이지 내 로컬 필터링이라 페이지네이션 결과와 불일치 발생 가능 | High | 20건 페이지 기준, searchKeyword가 있을 때 `filteredLogs` 개수가 `total`과 달라져 페이지네이션 "X/Y건" 카운트가 부정확해짐 | searchKeyword를 서버 필터(`fetchAuditLogs`의 keyword 파라미터)로 이전. URL `useEffect` 디바운스 이미 구현됨 (L171-177)이므로 `loadLogs`에 keyword 포함만 하면 됨 |
| `GalleryContent` | `useSearchParams` 기반 재페칭 시 서버 프리페치(`initialData`)를 `isInitialMount`로 회피하지만, URL 변경마다 `fetchGalleryItems` Server Action 재호출 | Low | 필터 변경 시 RTT 1회 추가 — 현재 동작은 정상 패턴 | 현재 구현 정상; 필요 시 SWR/React Query로 낙관적 업데이트 추가 가능 |
| `MessagesClient` | `appendMessageIfNew` 내부에서 매 Realtime 이벤트마다 `prev.some()` 선형 탐색 (L87-90) | Low | 메시지 수가 PAGE_SIZE(기본 20) 이내이면 무시 가능; 수백 건 축적 시 O(n) | 메시지 목록이 100건 이상이 되는 경우 `Set<id>` 기반 O(1) 탐색으로 교체 |

---

### SC/CC 경계 분석

| 컴포넌트 | 현황 | 문제 | 우선순위 | 권고 |
|----------|------|------|----------|------|
| `StatusDistributionChart` (컨설턴트홈) | `'use client'` — PieChart 사용 필수 | `next/dynamic` + loading skeleton으로 분리됨 (`consultant/home/page.tsx:12-15`) | 정상 | 유지 |
| `GalleryContent` | `'use client'` — 검색/정렬 상태 및 URL 동기화 필요 | 정상 CC 사용 | 정상 | 유지 |
| `AuditLogClient` | `'use client'` — 필터/페이지네이션 상태 관리 필요 | 정상 CC 사용 | 정상 | 유지 |
| `TemplateForm` | `'use client'` — `motion/react` Reorder 드래그 UI | motion 정적 import로 인해 `/ops/templates` 진입 시 번들에 포함 | Medium | `motion/react`를 `await import`로 변경하거나, TemplateForm을 `next/dynamic`으로 감싸기 |
| `NoticesPage` | Server Component — `getCachedUser`, `getCachedProfile` 사용 | 정상 | 정상 | 유지 |
| `TestRoadmapPage` | Server Component — 컨설턴트 프로필 조회 1회 | `isApprovedConsultant` 판정 후에만 supabase 호출하여 조건부 쿼리 수행. 단, `createClient()`와 `getCachedUser()` 각각 호출 — `cached.ts`의 캐시와 별도 클라이언트 생성 | Low | `createClient()` 호출이 `getCachedUser()` 이후 이중 생성되는 것은 실제로 세션 갱신을 위한 것이므로 허용 범위 |

---

### 쿼리 N+1 및 워터폴 분석

| 위치 | 현황 | 우선순위 | 영향 | 권고 |
|------|------|----------|------|------|
| `fetchGalleryItems` (queries.ts:590-647) `ALL` 트랙 | `fetchGalleryRoadmaps` + `fetchGalleryPBLReports` 병렬 호출(L616). 각 함수 내부에서 검색 시 `projects` 테이블 추가 쿼리 발행 → ALL + search 조합 시 총 4회 쿼리 | High | ALL+search 조합에서 쿼리 4회(roadmap×2 + pbl×2). 트래픽 증가 시 Supabase 연결 풀 부하. `fetchSize=page*limit` 방식으로 초과 데이터 로드 후 TS에서 슬라이싱 — 깊은 페이지에서 오버패치 | DB 뷰(`gallery_items_view`) 또는 PostgreSQL UNION 기반 단일 쿼리로 통합. 코드 주석(L611)에도 "Step 12 검토" 언급됨. 단기: search 파라미터 있을 때 두 2-stage 쿼리를 `Promise.all`로 묶는 것은 이미 수행됨 |
| `fetchGalleryRoadmaps` (queries.ts:244-253) | 목록 조회 후 `roadmap_likes` 일괄 조회 (L244-253). `roadmapIds.length > 0` 조건으로 빈 배열 가드 | Low | 이미 IN절 배치 조회로 N+1 해소됨 | 정상 |
| `fetchGalleryPBLReports` (queries.ts:514-523) | 동일 패턴 — `pbl_likes` 배치 조회 | Low | 정상 | 정상 |
| `AuditLogPage` (page.tsx:21-26) | `Promise.all`로 4개 쿼리 병렬 실행 | 정상 | 정상 | 유지 |
| `ConsultantHomePage` (home/page.tsx:32-44) | `Promise.all([projects, logs])` 병렬 | 정상 | 정상 | 유지 |
| `OPSProjectsPage` (ops/projects/page.tsx:30-33) | `Promise.all([stats, projects])` 병렬 | 정상 | 정상 | 유지 |
| `saveRoadmapInterview` (interview/actions.ts) | `requireAuthWithRole` → supabase `projects` 조회 → `adminSupabase` 순차 실행 | Low | 의존 관계상 순차 불가피(user.id 필요 후 project 조회), 패턴 정상 | 유지 |

---

### 캐싱 전략 분석

| 항목 | 현황 | 우선순위 | 권고 |
|------|------|----------|------|
| `React.cache` (cached.ts) | `getCachedUser`, `getCachedProfile` — 요청 내 중복 제거 정상 적용 | 정상 | 유지 |
| `unstable_cache` (filters.ts:25, 175) | 프로젝트 업종 목록, 컨설턴트 필터 옵션 캐시 — `CACHE_TAG_PROJECT_FILTERS`, `CACHE_TAG_CONSULTANT_FILTERS` 태그 사용 | 정상 | 유지 |
| `revalidatePath` 범위 | `/gallery` 4곳, `/ops/projects`, `/consultant/projects/[id]` 등 — 경로 최소화 잘 유지됨. `revalidatePath('/')` 같은 전체 무효화 없음 | 정상 | 유지 |
| 갤러리/공지 `unstable_cache` 미사용 | `fetchGalleryItems`, `listNotices`에 캐싱 없음 — 매 요청마다 DB 조회 | Medium | 갤러리: `unstable_cache`(TTL 30s) 또는 ISR `revalidate: 30` 적용 검토. 공지: 핀 공지 포함이므로 변경 시 `revalidateTag` 필요 |
| `revalidateTag` 활용 | `CACHE_TAG_PROJECT_FILTERS` 태그에 `revalidateTag` 사용(crud.ts:102) — 패턴 정상 | 정상 | 유지 |

---

### Realtime 분석

| 항목 | 현황 | 우선순위 | 결론 |
|------|------|----------|------|
| 채널 cleanup | `MessagesClient` — `useEffect` cleanup에서 `supabase.removeChannel(channel)` + `retryTimer` 클리어 정상 (L308-313, L352-356) | 정상 | 유지 |
| 대화 전환 시 채널 재생성 | `selectedConvId` 의존 useEffect — 전환 시 이전 채널 `removeChannel` 후 새 채널 생성 (L276-278) | 정상 | 유지 |
| messages:all 채널 | 컴포넌트 마운트 시 1회 구독 — cleanup 정상 | 정상 | 유지 |
| 폴링 fallback | `realtimeActiveRef.current` 체크로 Realtime 정상 시 폴링 스킵 (L369) | 정상 | 유지 |
| 메시지 가상화 | 현재 `MESSAGE_PAGE_SIZE` 기반 페이지네이션으로 한 번에 표시 건수 제한됨 — 가상화 불필요 수준 | 정상 | 1000건 이상 축적 시 react-virtual 도입 검토 |

---

### HWPX 내보내기 UX

| 항목 | 현황 | 우선순위 | 결론 |
|------|------|----------|------|
| 클라이언트 스피너 | `useHwpxDownload.isLoading` — 다운로드 버튼에 로딩 상태 반영 (DownloadButton 컴포넌트) | 정상 | 유지 |
| 오류 메시지 | 로컬 dev 환경(`next dev`)에서 Python 런타임 없을 때 구체적 해결 안내 메시지 3가지 옵션 포함 (hwpx-client.ts:142-149) | 정상 | 유지 |
| 스트리밍 | Server Action → base64 직렬화 방식으로 블로킹. Python 함수 응답 후 일괄 전달 — 구조적 한계 | Low | Vercel Python 함수 응답 시간이 수초 이내이므로 현재 UX 허용 범위. 필요 시 진행률 스트리밍(SSE) 도입 가능 |

---

### LLM 호출 분석

| 항목 | 현황 | 우선순위 | 결론 |
|------|------|----------|------|
| 타임아웃 | 240초 (LLM_TIMEOUT_MS) — Anthropic SDK `timeout` 파라미터로 설정 | 정상 | 유지 |
| 취소 | `AbortSignal` 지원 — `cancelRoadmapGeneration` Server Action으로 클라이언트 취소 가능 | 정상 | 유지 |
| 사용자 피드백 | `RoadmapLoadingOverlay` — 단계별 진행 표시(요구사항 분석/교육과정 설계/로드맵 구성), 취소 버튼 제공 | 정상 | 유지 |
| JSON 재시도 | 파싱 실패 시 최대 2회 재시도 (callLLMForJSON) | 정상 | 유지 |
| 토큰 효율 | 로드맵 system 프롬프트 ~115줄, user 프롬프트는 인터뷰 JSON 직렬화. PBL도 유사 | Medium | JSON.stringify(interview, null, 2) 들여쓰기 제거 시 토큰 약 20~30% 절감 가능. `JSON.stringify(interview)` 변경 권고 |
| 동시 LLM 호출 | `checkAndRecordLLMUsage`(quota.ts)로 일별/월별 한도 관리. 동시 호출 시 쿼터 경합 방지는 DB insert+check 방식으로 처리 | 정상 | 유지 |

---

## Critical 이슈

없음.

---

## 우선순위 로드맵

### [High] 즉시 조치

1. **[H1] `AuditLogClient` 검색어 서버 이전**
   - 파일: `src/app/(dashboard)/ops/audit/_components/AuditLogClient.tsx:227-233`
   - 현재: `logs.filter()` 클라이언트 필터링 → 페이지네이션 total과 filteredLogs 개수 불일치
   - 수정: `loadLogs()`의 `fetchAuditLogs` 호출에 `keyword: searchKeyword` 추가. `filteredLogs` 변수 제거하고 `logs` 직접 사용
   - 영향: 검색 정확도 향상, 불필요한 클라이언트 연산 제거

2. **[H2] 갤러리 ALL+search 쿼리 최적화**
   - 파일: `src/app/(dashboard)/gallery/actions/queries.ts:590-647`
   - 현재: ALL 트랙 + search 시 4회 쿼리 (roadmap×2 + pbl×2), 오버패치 후 TS 슬라이싱
   - 단기: `src/lib/schemas/gallery.ts`의 limit max(50)를 실제 limit+offset 수준으로 낮추고, projects 2-stage 쿼리를 공통 함수로 추출 후 두 트랙이 동일 matched IDs 재사용
   - 중기: `gallery_items_view` DB 뷰 도입 (코드 주석에도 언급됨)
   - 영향: DB 쿼리 수 4→2(단기) 또는 4→1(중기)

### [Medium] 단기 (1~2주)

3. **[M1] `motion/react` 동적 import**
   - 파일: `src/app/(dashboard)/ops/templates/_components/TemplateForm.tsx:7`
   - 현재: `import { Reorder, useDragControls } from 'motion/react'` — 정적 import
   - 수정: motion ~150KB가 `/ops/templates` 진입 시 번들에 포함됨. TemplateForm을 `next/dynamic`으로 감싸거나, Reorder 관련 코드를 별도 컴포넌트(`TemplateFormDnD`)로 분리 후 `await import` 처리
   - 영향: 운영 템플릿 페이지 초기 번들 ~150KB 절감

4. **[M2] 갤러리·공지 캐싱 추가**
   - 파일: `src/app/(dashboard)/gallery/actions/queries.ts`, `src/lib/services/notice.ts`
   - 현재: 매 요청마다 DB 조회
   - 수정: 갤러리 목록은 `unstable_cache`(TTL 30s, tag: `gallery-list`)로 캐시. 공지 목록은 TTL 60s + 공지 CUD 시 `revalidateTag('notice-list')` 호출
   - 영향: 갤러리/공지 반복 접근 시 DB 쿼리 제거, TTFB 개선

5. **[M3] LLM 프롬프트 JSON 들여쓰기 제거**
   - 파일: `src/lib/services/roadmap/roadmap-prompts.ts:148-164`, `src/lib/services/pbl/pbl-prompts.ts`
   - 현재: `JSON.stringify(interview.company_requirements, null, 2)` — 인터뷰 JSON에 공백/줄바꿈 포함
   - 수정: `JSON.stringify(interview.company_requirements)` — 들여쓰기 제거
   - 영향: 입력 토큰 약 20~30% 절감 (인터뷰 JSON 규모에 따라 수백~수천 토큰). Claude Sonnet 기준 비용 및 지연 시간 절감

### [Low] 중기 (필요 시)

6. **[L1] 공통 대시보드 레이아웃 unstable_cache 확장**
   - 현재 `getCachedProfile`이 React.cache(요청 단위)만 처리
   - `unstable_cache`(TTL 60s)로 확장 시 반복 새로고침에서도 users 테이블 쿼리 제거 가능

7. **[L2] 메시지 목록 대용량 가상화 준비**
   - `MessagesClient`의 `messages` state가 100건 이상 축적되면 렌더 비용 상승
   - 현재 `MESSAGE_PAGE_SIZE`로 제한되어 즉각 필요 없음. 1000건 이상 시 `react-virtual` 도입

8. **[L3] 번들 분석 정기 실행**
   - `ANALYZE=true npm run build`로 현재 번들 상태 시각화 확인 권고
   - 특히 `GSAP` 동적 import가 실제 청크 분리로 이어지는지 검증

---

## 검토 근거 파일 목록

- `/Users/baekkyunshin/Desktop/AI-roadmap-dashboard/next.config.ts` — Bundle Analyzer, optimizePackageImports, reactCompiler 설정
- `/Users/baekkyunshin/Desktop/AI-roadmap-dashboard/src/lib/supabase/cached.ts` — React.cache 구현
- `/Users/baekkyunshin/Desktop/AI-roadmap-dashboard/src/app/(dashboard)/dashboard/messages/_components/MessagesClient.tsx` — Realtime 채널 관리
- `/Users/baekkyunshin/Desktop/AI-roadmap-dashboard/src/app/(dashboard)/gallery/actions/queries.ts` — 갤러리 통합 조회 (N+1 유사 패턴)
- `/Users/baekkyunshin/Desktop/AI-roadmap-dashboard/src/app/(dashboard)/ops/audit/_components/AuditLogClient.tsx` — 클라이언트 검색 필터링 문제
- `/Users/baekkyunshin/Desktop/AI-roadmap-dashboard/src/app/(dashboard)/ops/audit/page.tsx` — Promise.all 병렬 조회
- `/Users/baekkyunshin/Desktop/AI-roadmap-dashboard/src/app/(dashboard)/consultant/home/page.tsx` — Promise.all 병렬 조회
- `/Users/baekkyunshin/Desktop/AI-roadmap-dashboard/src/app/(dashboard)/ops/projects/actions/filters.ts` — unstable_cache 적용
- `/Users/baekkyunshin/Desktop/AI-roadmap-dashboard/src/app/(dashboard)/ops/projects/actions/crud.ts` — revalidatePath/revalidateTag 패턴
- `/Users/baekkyunshin/Desktop/AI-roadmap-dashboard/src/app/(dashboard)/ops/templates/_components/TemplateForm.tsx` — motion 정적 import
- `/Users/baekkyunshin/Desktop/AI-roadmap-dashboard/src/app/(dashboard)/consultant/home/_components/StatusDistributionChart.tsx` — next/dynamic + ssr:false
- `/Users/baekkyunshin/Desktop/AI-roadmap-dashboard/src/lib/services/llm.ts` — 240초 타임아웃, JSON 재시도
- `/Users/baekkyunshin/Desktop/AI-roadmap-dashboard/src/lib/services/roadmap/roadmap-prompts.ts` — JSON.stringify 들여쓰기 토큰 낭비
- `/Users/baekkyunshin/Desktop/AI-roadmap-dashboard/src/lib/services/export/hwpx/hwpx-client.ts` — HWPX Python 함수 호출
- `/Users/baekkyunshin/Desktop/AI-roadmap-dashboard/src/hooks/useHwpxDownload.ts` — isLoading 스피너
