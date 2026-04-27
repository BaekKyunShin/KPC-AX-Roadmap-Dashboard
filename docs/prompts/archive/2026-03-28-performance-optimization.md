# 성능 최적화 — 분석 + 계획서 작성 프롬프트

> 새 Claude 세션에 이 프롬프트 전체를 붙여넣어 실행하세요.
> 작성일: 2026-03-28

---

## 임무

이 프로젝트(AI Roadmap Dashboard)는 **메뉴 전환이나 버튼 클릭 시 체감 3~4초 지연**이 발생합니다. B2B SaaS 제품으로서 허용 불가한 수준입니다. 목표는 주요 경로 전환을 **1초 이내**로 줄이는 것입니다.

**핵심 사용자 경로 (이 경로들의 전환 속도를 기준으로 측정):**
- `/dashboard` → `/ops/projects` (관리자 메인 진입)
- `/ops/projects` → `/ops/projects/[id]` (프로젝트 상세)
- `/ops/projects` → `/ops/users` (메뉴 간 전환)
- `/consultant/home` → `/consultant/projects` (컨설턴트 메인 전환)
- `/consultant/projects/[id]` → `/consultant/projects/[id]/interview` (인터뷰 진입)

**중요:** 이 작업은 단순히 이 프로젝트의 속도를 올리는 것이 아닙니다. **향후 다른 프로젝트에서 동일한 문제가 발생했을 때 참고할 수 있는 학습 자료**를 겸합니다. 따라서 각 이슈에 대해 "이 프로젝트에서 무엇이 잘못되었는가"뿐 아니라, **"왜 이런 패턴이 일반적으로 느린가"**와 **"일반적으로 어떻게 고치는가"**를 함께 설명해야 합니다. 개발자와 비개발자 모두가 이해할 수 있도록 이중으로 설명합니다.

너의 임무는 2단계입니다:

### 1단계: 전수조사 — 성능 병목 분석 보고서 작성

코드베이스를 전수조사하여 성능 병목 포인트를 **모두** 찾아내고, 우선순위별(P0/P1/P2)로 분류한 **분석 보고서**를 작성하세요.

**분석 범위 (반드시 모두 조사할 것):**

| 카테고리 | 조사 항목 |
|---------|----------|
| **렌더링 경계** | `'use client'` 지시어 위치 — 너무 높은 레벨에서 선언하여 전체 하위 트리가 클라이언트 번들에 포함되는 경우 |
| **데이터 페칭** | `useEffect`에서 Server Action을 호출하는 클라이언트 컴포넌트 (워터폴 패턴), 서버 컴포넌트에서 fetch 가능한데 안 하는 경우 |
| **스트리밍** | Suspense 바운더리 사용 현황, loading.tsx만 있고 페이지 내부 스트리밍이 없는 경우 |
| **인증 중복** | 레이아웃에서 이미 인증을 확인하는데 개별 페이지에서 중복 호출하는 경우 |
| **리다이렉트** | 불필요한 서버사이드 리다이렉트 체인 (예: /dashboard → /ops/projects) |
| **DB 쿼리** | `select('*')` 남용, N+1 쿼리, 병렬화 가능한 직렬 쿼리, 인덱스 부재 |
| **번들 크기** | 무거운 라이브러리(recharts, motion, gsap, jspdf, xlsx 등)의 eager import, `optimizePackageImports` 설정 |
| **동적 import** | dynamic import가 필요한데 사용하지 않는 컴포넌트 |
| **레이아웃** | 중첩 레이아웃에서의 데이터 재페칭, 레이아웃 렌더 차단 |
| **캐싱** | Next.js 캐시 전략 부재, 정적 생성 가능한 페이지의 동적 렌더링 |
| **Proxy(미들웨어)** | `src/proxy.ts` (Next.js 16 네이밍) — 모든 요청 경로에서 실행되는 불필요한 처리 |
| **Realtime** | Supabase Realtime 구독의 과도한 사용이나 미정리 |

**조사 시 활용할 도구:**

| 도구 | 용도 |
|------|------|
| `performance-engineer` 서브에이전트 | 번들/캐싱/SC·CC 경계/Realtime 분석 전담 |
| `postgres-pro` 서브에이전트 | 인덱스/쿼리 비용/RLS 성능/RPC 분석 전담 |
| Glob/Grep | `'use client'`, `useEffect`, `select('*')` 등 패턴 검색 |

**조사 시 주의:**

- 추측하지 말고 **코드를 직접 읽어서** 확인할 것
- 각 이슈에 **구체적 파일 경로와 라인 번호**를 명시할 것
- 서브에이전트에게 분석을 병렬로 위임하되, 결과를 종합하여 중복 제거할 것

### 2단계: 계획서 작성 (분석 보고서 기반)

`superpowers:writing-plans` 스킬을 호출하여 구조화된 **실행 계획서**를 작성하세요.

---

## 보고서 작성 형식

### 각 이슈의 필수 구성

발견한 **모든 이슈**에 대해, 아래 5개 섹션을 **빠짐없이** 작성해야 합니다:

```markdown
#### [P등급] 이슈 제목

**해당 파일:** `src/...` (L숫자)

##### 왜 느린가 (개발자용)
> Next.js/React 아키텍처 관점에서 기술적 원인을 설명합니다.
> 서버 렌더링 사이클, 번들 파싱, 네트워크 왕복 등 구체적 메커니즘을 포함합니다.
> **이 프로젝트만의 문제가 아닌, 이 패턴이 일반적으로 왜 느린지** 원리를 함께 설명합니다.

##### 왜 느린가 (비개발자용)
> 비유를 사용하여 기술 배경 없이도 이해할 수 있게 설명합니다.
> 일상 생활에서 접할 수 있는 상황에 빗대어 설명합니다.
> 예: "음식점에서 메뉴판을 먼저 보여준 뒤 주문을 받는 대신,
>      주방에서 모든 요리를 다 만들 때까지 메뉴판조차 보여주지 않는 것과 같습니다."

##### 어떻게 고치나 (개발자용)
> 구체적 코드 변경 방향을 설명합니다.
> Before/After 코드 예시를 포함합니다.
> 변경할 파일 목록을 명시합니다.
> **다른 프로젝트에서도 적용 가능한 일반적 원칙**으로 정리합니다.

##### 어떻게 고치나 (비개발자용)
> 수정의 개념과 효과를 비유로 설명합니다.
> 예: "주방에서 전부 준비될 때까지 기다리는 대신,
>      준비된 전채요리부터 먼저 내놓는 방식으로 바꿉니다."

##### 예상 효과
> 이 수정으로 어느 화면에서 어느 정도 개선이 예상되는지 정성적으로 서술합니다.
> 사용자 체감 개선을 비개발자가 이해할 수 있는 표현으로 서술합니다.
```

### 보고서 전체 구조

```markdown
# 성능 병목 분석 보고서

## 요약
- 발견된 이슈: N개 (P0: _개, P1: _개, P2: _개)
- 가장 큰 병목: ...
- 예상 총 개선 효과: ...

## P0 — Critical (체감 지연의 직접 원인)
#### [P0] 이슈 제목
(위 형식대로)

## P1 — High Impact (누적 지연 효과)
#### [P1] 이슈 제목
(위 형식대로)

## P2 — Medium Impact (번들 크기 및 장기 성능)
#### [P2] 이슈 제목
(위 형식대로)
```

---

## 계획서 작성 지침

분석 보고서 작성 후, `superpowers:writing-plans`를 호출하여 실행 계획서를 작성하세요.

### 배치 구성 원칙

1. **의존성 순서**: 선행 배치의 결과물이 후행 배치에 영향을 주는 순서로 배열
2. **독립성 극대화**: 같은 배치 내 태스크들은 `superpowers:subagent-driven-development`로 병렬 실행 가능해야 함
3. **검증 단위**: 각 배치 완료 후 `npm run validate && npm run build` 통과 필수
4. **리스크 최소화**: 영향 범위가 작은 설정 변경을 먼저, 구조적 변경은 나중에

### 각 배치에 명시할 내용

- 어떤 P등급 이슈를 해결하는지
- 변경 대상 파일 목록
- 예상 작업 난이도 (낮음/중간/높음)
- 병렬 실행 가능 여부
- 배치 완료 후 검증 방법

### 계획서에서 활용을 지시할 도구

| 도구 | 활용 시점 |
|------|----------|
| `performance-engineer` 서브에이전트 | 배치 실행 후 번들/캐싱/SC·CC 경계 변경 영향 검증 |
| `postgres-pro` 서브에이전트 | 배치 실행 후 쿼리/인덱스/RLS 변경 영향 검증 |
| `react-best-practices` 스킬 | 컴포넌트 수정 시 React 성능 패턴 검증 |
| `check-server-action` 스킬 | Server Action 수정 시 패턴 검증 |
| `frontend-guide` 스킬 | UI 컴포넌트 수정 시 프로젝트 패턴 준수 |
| `superpowers:test-driven-development` | 수정 시 기존 테스트 보호 |
| `superpowers:subagent-driven-development` | 배치 내 독립 태스크 병렬 실행 |
| `superpowers:verification-before-completion` | 전체 작업 완료 전 최종 검증 |
| `supabase-dev` 스킬 | DB 마이그레이션(인덱스 추가 등) 시 프로젝트 SQL 규칙 준수 |
| Context7 MCP | Next.js 16 최신 API 확인 필요 시 |

---

## 이미 최적화된 영역 (건드리지 말 것)

아래 항목은 이미 적절하게 최적화되어 있으므로 **보고서에서 제외**하세요. 시간 낭비를 방지합니다.

| 영역 | 현황 |
|------|------|
| PDF/XLSX 내보내기 | `useRoadmapDownload.ts`에서 `await import()`로 동적 로드 — 정상 |
| GSAP + Lenis | `SmoothScroll.tsx`에서 `await import()`로 동적 로드 — 정상 |
| 랜딩 페이지 하위 섹션 | `LandingPage.tsx`에서 `dynamic()` 4개 적용 — 정상 |
| 차트 컴포넌트 일부 | `ProjectDashboard`에서 StatusDistributionChart, MonthlyCompletionChart를 `dynamic()` — 정상 |
| Server Actions의 `after()` | 감사 로그, 알림 생성을 `after()`로 비차단 처리 — 정상 |
| React.cache 인증 디듀프 | `getCachedUser/getCachedProfile`이 `React.cache`로 같은 렌더 트리 내 중복 제거 — 정상 |
| 병렬 쿼리 일부 | `ops/projects/[id]/page.tsx` Promise.all 6개, `consultant/home/page.tsx` Promise.all 2개 — 정상 |
| RLS auth.uid() initplan | 032/048 마이그레이션에서 `(SELECT auth.uid())` 래핑 완료 — 정상 |

---

## 조사 시작점 (힌트)

전수조사를 효율적으로 수행하기 위한 시작점입니다. **이 목록에 한정하지 말고 전체를 조사하세요.**

### 프론트엔드 / 렌더링

| 영역 | 시작 파일 | 힌트 |
|------|----------|------|
| 레이아웃 인증 체인 | `src/app/(dashboard)/layout.tsx` | getCachedUser → getCachedProfile → unreadCount 직렬 호출, 매 네비게이션마다 DB 2회 |
| useEffect 워터폴 | `src/app/(dashboard)/ops/projects/_components/` | ProjectManagementTabs, ProjectList, StatsSummaryCards, ProjectTimeline 등 8개+ |
| 리다이렉트 체인 | `src/app/(dashboard)/dashboard/page.tsx` | 역할별 redirect() — 레이아웃 렌더가 두 번 발생 |
| 중복 인증 | `src/app/(dashboard)/**/page.tsx` 전체 | getCachedUser를 레이아웃과 페이지에서 중복 호출 (23개 페이지) |
| Suspense 미활용 | `src/app/(dashboard)/**/page.tsx` | loading.tsx는 23개 있지만 Suspense는 3개만 사용 |
| 번들 크기 | `next.config.ts` | optimizePackageImports에 lucide-react만 있음 — recharts, @radix-ui/*, motion 누락 |
| 무거운 import | `src/components/Navigation.tsx` | CommandPalette 등 eager import |
| router.refresh 남용 | `MessagesClient.tsx` L349-351 | 비선택 대화 새 메시지마다 전체 페이지 재렌더링 |
| 랜딩 페이지 SSR | `src/app/_components/LandingPageLoader.tsx` | 'use client'로 전체 랜딩 페이지가 CSR — SSR 미활용 |
| 외부 폰트 | `src/app/layout.tsx` L26-30 | Pretendard를 CDN에서 로드 — next/font 미사용으로 LCP 영향 |
| Realtime 필터 | `MessagesClient.tsx` L336-342 | messages:all 채널이 사용자 무관하게 모든 INSERT 수신 |
| 하이드레이션 | `src/app/assessment/layout.tsx` L31 | `new Date().getFullYear()` SSR/CSR 불일치 위험 |
| 메모이제이션 부재 | 프로젝트 전체 | useMemo/useCallback/memo 사용 0건 — React Compiler가 커버하는지 확인 필요 |

### DB 쿼리 / 서버사이드

| 영역 | 시작 파일 | 힌트 |
|------|----------|------|
| select('*') | Grep으로 `select('*')` 검색 | 17개 이상 파일 — 특히 roadmap_versions의 대형 JSONB 포함 |
| 직렬 쿼리 3단계 | `src/lib/services/quota.ts` L93-125 | fetchUserUsage() — upsert → quota → daily → monthly 직렬 |
| 직렬 쿼리 2단계 | `src/lib/actions/auth-helpers.ts` L83-108 | requireConsultantRoadmapAccess() — roadmap_versions → projects 순차 (JOIN으로 통합 가능) |
| 앱 레벨 집계 | `ops/projects/actions/dashboard.ts` L16-38 | fetchProjectStats() — 전체 행 조회 후 JS에서 COUNT (DB GROUP BY로 전환 가능) |
| 앱 레벨 필터 | `ops/projects/actions/dashboard.ts` L212-257 | fetchStalledProjects() — 전체 조회 후 JS에서 날짜 비교 (DB WHERE로 전환 가능) |
| 앱 레벨 집계 | `ops/projects/actions/dashboard.ts` | fetchMonthlyCompletions() — FINAL 전체 조회 후 앱 집계 (DATE_TRUNC + GROUP BY로 전환) |
| 중복 쿼리 | `consultant/projects/actions.ts` L76-78 | fetchConsultantProjects() — users.name 재조회 (getCachedProfile에 이미 있음) |
| 중복 인덱스 | `supabase/migrations/` | idx_users_email — UNIQUE 제약의 암묵적 인덱스와 중복 |
| 중복 접근 제어 | `consultant/.../interview/actions.ts` L181-207 | fetchInterview() — RLS가 이미 보장하는 검증을 앱에서 중복 수행 |
| LLM 후 쿼리 | `roadmap-generator.ts` L119 | 버전 번호 조회가 LLM 호출 후 실행 — LLM 전 병렬 블록에 포함 가능 |

---

## 안티패턴 (하지 말 것)

- **성능을 위한 추상화 추가 금지** — 헬퍼 함수, wrapper, 캐시 레이어를 새로 만들지 말 것. 기존 코드를 올바른 패턴으로 변경하는 것이 정답
- **과도한 메모이제이션 금지** — React Compiler가 활성화되어 있으므로 수동 `useMemo`/`useCallback`/`memo`는 Compiler가 커버하지 못하는 경우에만 사용
- **기능·UI·로직 변경 금지** — 성능 최적화 중 화면 디자인, 레이아웃, 컴포넌트 구조, 사용자 인터랙션 동작, 비즈니스 로직이 바뀌면 안 됨. 사용자가 보는 결과물은 최적화 전후 100% 동일해야 함
- **micro-optimization 금지** — 큰 병목(P0)을 먼저 해결하고, 측정 불가능한 작은 최적화는 건너뛸 것

---

## 성능 측정 도구 (이미 프로젝트에 설치됨)

```bash
npm run analyze          # 번들 분석기 (webpack, 빌드 후 브라우저에서 확인)
npm run lighthouse:ci    # Lighthouse CI 자동 실행
npm run test:perf        # Playwright 성능 테스트
```

이 도구들은 **계획서의 배치별 검증 방법**에 포함시키세요. (보고서 단계에서는 코드 수정이 없으므로 실행 불필요)

---

## 작업 완료 조건

1. **분석 보고서**가 `docs/plans/` 폴더에 MD 파일로 저장됨 (예: `2026-03-28-performance-analysis.md`)
2. 보고서의 **모든** 이슈가 5개 필수 섹션(왜 느린가 x2, 어떻게 고치나 x2, 예상 효과)을 빠짐없이 포함함
3. 개발자용 설명은 기술적으로 정확하고, 비개발자용 설명은 비유를 활용하여 누구나 이해할 수 있음
4. 각 이슈의 설명이 **이 프로젝트에 국한되지 않고, 일반적인 웹 성능 원칙**을 포함하여 다른 프로젝트에서도 참고 가능함
5. **실행 계획서**가 `superpowers:writing-plans`로 작성되어 승인 대기 상태
6. 보고서/계획서 작성 단계에서는 코드 수정 없음 (분석과 계획만 수행)
