# 성능 병목 분석 보고서

**분석 일시:** 2026-03-28
**대상:** KPC AI 훈련 로드맵 대시보드
**증상:** 메뉴 전환/버튼 클릭 시 체감 3~4초 지연
**목표:** 주요 경로 전환 1초 이내

## 요약

- 발견된 이슈: **16개** (P0: 5개, P1: 5개, P2: 6개)
- 가장 큰 병목: **ops/projects 페이지의 useEffect 워터폴** — Server Component에서 데이터를 가져올 수 있지만 클라이언트에서 `useEffect`로 모든 데이터를 재요청
- 예상 총 개선 효과: 주요 경로 전환 시간 3~4초 → **0.5~1초**로 단축

---

## P0 — Critical (체감 지연의 직접 원인)

---

#### [P0-1] useEffect 워터폴 — ops/projects 전체 페이지

**해당 파일:**
- `src/app/(dashboard)/ops/projects/page.tsx` (L36)
- `src/app/(dashboard)/ops/projects/_components/ProjectManagementTabs.tsx` (L30-32)
- `src/app/(dashboard)/ops/projects/_components/ProjectList.tsx` (L206-209)
- `src/app/(dashboard)/ops/projects/_components/StatsSummaryCards.tsx` (L121-127)
- `src/app/(dashboard)/ops/projects/_components/useProjectDashboard.ts` (L30-55)

##### 왜 느린가 (개발자용)

`ops/projects/page.tsx`는 Server Component이지만, 렌더하는 것은 `<ProjectManagementTabs />`뿐이고 이 컴포넌트가 `'use client'`입니다. 그 내부에서:

1. `ProjectManagementTabs`가 마운트 → `useEffect`에서 `fetchProjectStats()` Server Action 호출
2. `ProjectList`가 마운트 → `useEffect`에서 `fetchProjectsWithTimeline()` Server Action 호출
3. 대시보드 탭 전환 시 `useProjectDashboard` 훅이 → `useEffect`에서 4개 Server Action을 `Promise.all`로 호출

```
현재 흐름:
서버 렌더(빈 shell) → 클라이언트 JS 다운로드 → 하이드레이션 → useEffect 실행 → Server Action HTTP 요청 → 응답 대기(1~2초) → setState → 리렌더
```

**일반적 원칙:** Next.js App Router에서 **Server Component에서 직접 데이터를 fetch하면 서버 렌더링과 동시에 데이터가 준비**됩니다. 반면 `'use client'` 컴포넌트의 `useEffect`에서 fetch하면, 클라이언트 JS 다운로드 + 파싱 + 하이드레이션이 완료된 **후에야** 데이터 요청이 시작됩니다. 이것이 "워터폴(폭포)" 패턴으로, 네트워크 왕복이 직렬로 연결되어 지연이 누적됩니다.

##### 왜 느린가 (비개발자용)

음식점에 비유하면, 현재 방식은 이렇습니다:

1. 손님이 착석 (서버가 빈 페이지를 보냄)
2. 메뉴판이 도착 (JavaScript 다운로드)
3. 메뉴판을 읽기 시작 (하이드레이션)
4. 비로소 주문 (서버에 데이터 요청)
5. 요리가 나옴 (화면에 데이터 표시)

올바른 방식은 **손님이 도착하기 전에 주방이 이미 요리를 시작**하는 것입니다. 손님이 착석하면 바로 음식이 나옵니다.

##### 어떻게 고치나 (개발자용)

`page.tsx` (Server Component)에서 데이터를 미리 fetch하고 props로 전달합니다:

**Before:**
```tsx
// ops/projects/page.tsx — 데이터 없이 빈 shell 전달
export default async function OPSProjectsPage() {
  // ...인증만 확인
  return <ProjectManagementTabs />;
}

// ProjectManagementTabs.tsx — 클라이언트에서 데이터 요청
useEffect(() => {
  fetchProjectStats().then(setStats);
}, []);
```

**After:**
```tsx
// ops/projects/page.tsx — 서버에서 데이터 미리 가져옴
export default async function OPSProjectsPage() {
  // ...인증
  const [stats, projectsResult] = await Promise.all([
    fetchProjectStats(),
    fetchProjectsWithTimeline({ page: 1, limit: 10 }),
  ]);
  return (
    <ProjectManagementTabs
      initialStats={stats}
      initialProjects={projectsResult}
    />
  );
}
```

**일반 원칙:**
- **Server Component에서 fetch 가능한 데이터는 항상 Server Component에서 가져올 것**
- `useEffect` 데이터 fetch는 사용자 인터랙션(필터, 페이지네이션, 검색) 이후에만 사용
- 초기 데이터는 props로 전달하여 즉시 렌더 가능하게 함

##### 어떻게 고치나 (비개발자용)

주방이 손님이 착석하기 전에 "오늘의 기본 메뉴"를 미리 준비해두는 것입니다. 손님이 앉으면 바로 음식이 나오고, 추가 주문(필터, 검색)이 있을 때만 새로 요리합니다.

##### 예상 효과

`/ops/projects` 초기 로드: **2~3초 → 0.5~1초** (가장 큰 개선)
`/dashboard` → `/ops/projects` 전환: 레이아웃 캐시 활용으로 **체감 즉시 전환**

---

#### [P0-2] 리다이렉트 체인 — /dashboard에서 역할별 분기

**해당 파일:** `src/app/(dashboard)/dashboard/page.tsx` (L18-44)

##### 왜 느린가 (개발자용)

관리자(OPS_ADMIN)가 로그인하면:
1. `/dashboard`로 이동
2. DashboardLayout 렌더링 (getCachedUser + getCachedProfile + fetchUnreadCount + fetchUnreadConversationCount)
3. `dashboard/page.tsx`에서 getCachedUser + getCachedProfile (React.cache로 중복 제거)
4. `redirect('/ops/projects')` 실행
5. `/ops/projects`로 이동 → DashboardLayout **다시** 렌더링

**결과:** 레이아웃의 인증 + unreadCount 쿼리가 **2번** 실행됩니다. `redirect()`는 서버에서 HTTP 307 응답을 보내므로 브라우저가 새 요청을 시작합니다.

**일반적 원칙:** 서버사이드 리다이렉트는 완전한 새 요청-응답 사이클을 발생시킵니다. 레이아웃이 공유되더라도 Next.js는 리다이렉트된 경로에 대해 전체 렌더 트리를 재실행합니다. **리다이렉트 체인은 불필요한 서버 왕복을 추가합니다.**

##### 왜 느린가 (비개발자용)

"A 건물에 가세요"라고 안내받아 가봤더니, 도착하자마자 "아, B 건물로 가야 합니다"라고 다시 안내받는 것과 같습니다. 처음부터 B 건물로 안내했다면 이동 시간이 절반이었을 것입니다.

##### 어떻게 고치나 (개발자용)

로그인 성공 시 역할을 확인하여 **최종 목적지로 직접 redirect**합니다:

**Before (로그인 Server Action):**
```tsx
if (result.success) {
  redirect(redirectTo || '/dashboard');
  // → /dashboard → redirect('/ops/projects')
}
```

**After:**
```tsx
if (result.success) {
  const profile = await getCachedProfile();
  const destination = getDefaultRouteForRole(profile?.role);
  redirect(redirectTo || destination);
  // → 직접 /ops/projects
}
```

`dashboard/page.tsx`의 역할별 switch는 북마크/직접 접속 대비로 유지합니다.

##### 어떻게 고치나 (비개발자용)

처음부터 "당신의 역할은 관리자이니 B 건물(관리 화면)로 가세요"라고 안내합니다.

##### 예상 효과

로그인 후 최초 진입: **~500ms 단축** (서버 왕복 1회 제거)
일상 사용: 직접 URL 접속이 아닌 한 영향 없음

---

#### [P0-3] Suspense 미활용 — 페이지 전체가 "올 오어 낫싱"

**해당 파일:** `src/app/(dashboard)/` 하위 20개 이상 페이지

##### 왜 느린가 (개발자용)

현재 프로젝트는 `loading.tsx`를 23개 경로에 두고 있지만, 페이지 **내부**에 `<Suspense>` 바운더리가 3개뿐입니다 (messages, gallery, login).

`loading.tsx`는 라우트 세그먼트 전체의 로딩 상태를 처리합니다. 즉, 페이지 내 여러 데이터 소스 중 **하나라도 느리면 전체 페이지가 대기**합니다.

예를 들어 `ops/projects/[id]/page.tsx`에서 6개 병렬 쿼리(`Promise.all`)를 실행하는데, 가장 느린 쿼리가 완료될 때까지 전체 페이지가 loading.tsx 스켈레톤을 표시합니다.

**일반적 원칙:** Next.js의 **Streaming SSR**은 `<Suspense>` 바운더리 단위로 완료된 부분부터 클라이언트에 전송합니다. 독립적인 데이터 섹션을 개별 `<Suspense>`로 감싸면, 빠른 섹션이 먼저 표시되고 느린 섹션은 나중에 스트리밍됩니다. 이것이 **부분 프리렌더링(Partial Prerendering)** 의 핵심입니다.

##### 왜 느린가 (비개발자용)

뉴스 웹사이트에 비유하면, 현재는 **기사 본문, 댓글, 관련 기사, 날씨 위젯이 모두 로드될 때까지 빈 화면**을 보여줍니다. 실제로 기사 본문은 0.2초 만에 준비되지만, 댓글 로드가 1초 걸리면 전체가 1초를 기다립니다.

올바른 방식은 **기사 본문을 먼저 보여주고, 댓글은 "로딩 중..."을 표시하다가 준비되면 교체**하는 것입니다.

##### 어떻게 고치나 (개발자용)

핵심 사용자 경로의 페이지에서 독립적 데이터 섹션을 async Server Component로 분리하고 `<Suspense>`로 감쌉니다:

**Before:**
```tsx
export default async function ProjectDetailPage({ params }) {
  const [project, timeline, diagnosis, ...] = await Promise.all([...]);
  // 6개 쿼리 전부 완료 후에야 렌더
  return (
    <>
      <ProjectHeader project={project} />
      <Timeline data={timeline} />
      <DiagnosisSection data={diagnosis} />
    </>
  );
}
```

**After:**
```tsx
export default async function ProjectDetailPage({ params }) {
  const project = await fetchProject(id);  // 핵심 데이터만 먼저
  return (
    <>
      <ProjectHeader project={project} />  {/* 즉시 표시 */}
      <Suspense fallback={<TimelineSkeleton />}>
        <TimelineSection projectId={id} />  {/* 별도 스트리밍 */}
      </Suspense>
      <Suspense fallback={<DiagnosisSkeleton />}>
        <DiagnosisSection projectId={id} />  {/* 별도 스트리밍 */}
      </Suspense>
    </>
  );
}

async function TimelineSection({ projectId }) {
  const timeline = await fetchTimeline(projectId);
  return <Timeline data={timeline} />;
}
```

##### 어떻게 고치나 (비개발자용)

뉴스 사이트가 기사 본문을 먼저 보여주고, 댓글 영역에 "댓글 불러오는 중..."을 표시합니다. 댓글이 준비되면 자동으로 채워집니다. 사용자는 기사를 읽으면서 기다릴 수 있습니다.

##### 예상 효과

`/ops/projects/[id]`: 프로젝트 기본 정보가 **0.3초 내 표시**, 나머지 섹션이 순차 스트리밍
체감 로딩 시간: **1.5~2초 → 0.3~0.5초** (첫 의미 있는 콘텐츠 기준)

---

#### [P0-4] router.refresh() 남용 — 메시지 화면 전체 재렌더

**해당 파일:** `src/app/(dashboard)/dashboard/messages/_components/MessagesClient.tsx` (L349-351)

##### 왜 느린가 (개발자용)

```tsx
// L335-354
channel = supabase
  .channel('messages:all')
  .on('postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'messages' },
    (payload) => {
      const newMsg = payload.new as Message;
      if (newMsg.sender_id === currentUserIdRef.current) return;
      refreshConversations();  // 대화 목록 갱신 (적절)
      if (newMsg.conversation_id !== selectedConvIdRef.current) {
        router.refresh();  // ← 전체 Server Component 트리 재렌더!
      }
    },
  );
```

`router.refresh()`는 **현재 라우트의 전체 Server Component 트리를 서버에서 재실행**합니다. 즉:
- DashboardLayout이 재실행 → getCachedUser, getCachedProfile, fetchUnreadCount, fetchUnreadConversationCount
- MessagesPage가 재실행 → 초기 대화 목록 재조회

이것이 **비선택 대화에 새 메시지가 올 때마다** 발생합니다. 활발한 대화가 있는 환경에서는 초당 여러 번 트리거될 수 있습니다.

**일반적 원칙:** `router.refresh()`는 전체 페이지의 Server Component를 재실행하므로, **세밀한 UI 업데이트에 사용하면 안 됩니다**. 부분적 상태 변경은 클라이언트 상태(setState)나 세밀한 재검증(revalidateTag)으로 처리해야 합니다.

##### 왜 느린가 (비개발자용)

카카오톡에서 **다른 채팅방에 메시지가 왔을 때, 현재 보고 있는 채팅방 전체를 닫았다가 다시 여는 것**과 같습니다. 실제로는 채팅 목록의 프리뷰만 업데이트하면 충분합니다.

##### 어떻게 고치나 (개발자용)

`router.refresh()` 호출을 제거하고, `refreshConversations()`만으로 대화 목록 프리뷰를 갱신합니다:

**Before:**
```tsx
if (newMsg.conversation_id !== selectedConvIdRef.current) {
  router.refresh();  // 전체 페이지 리렌더
}
```

**After:**
```tsx
// refreshConversations()가 이미 대화 목록을 갱신하므로
// 별도 router.refresh() 불필요
// 선택된 대화의 메시지는 개별 채널(messages:${convId})에서 처리
```

##### 어떻게 고치나 (비개발자용)

다른 채팅방에 메시지가 오면, **목록의 미리보기 텍스트만 갱신**합니다. 현재 보고 있는 채팅방은 건드리지 않습니다.

##### 예상 효과

메시지 화면 사용 중: 외부 대화 메시지 수신 시 **불필요한 1~2초 리렌더 제거**
다중 사용자 환경: router.refresh() 폭풍 방지로 **안정성 대폭 개선**

---

#### [P0-5] Realtime 구독 필터 부재 — 모든 메시지 수신

**해당 파일:** `src/app/(dashboard)/dashboard/messages/_components/MessagesClient.tsx` (L336-342)

##### 왜 느린가 (개발자용)

```tsx
channel = supabase
  .channel('messages:all')
  .on('postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'messages' },
    // 필터 없음! 모든 INSERT 이벤트 수신
    (payload) => { ... }
  );
```

Supabase Realtime은 RLS 정책에 의해 클라이언트에 전달되는 이벤트가 제한되지만, **모든 INSERT 이벤트가 서버에서 처리되어 클라이언트로 전송 시도됩니다**. 이는:
1. 불필요한 네트워크 트래픽
2. 각 이벤트마다 `refreshConversations()` 호출 → DB 쿼리 발생
3. P0-4의 `router.refresh()` 트리거

**일반적 원칙:** Realtime 구독은 **가능한 한 좁은 범위로 필터링**해야 합니다. Supabase의 `filter` 옵션으로 특정 `conversation_id`만 구독하거나, 이미 구현된 개별 대화 채널(`messages:${convId}`)만 사용하고 전체 채널을 제거할 수 있습니다.

##### 왜 느린가 (비개발자용)

편의점에서 "모든 고객의 주문"을 듣고 있다가, 내 주문이 아니면 무시하는 것과 같습니다. 처음부터 "내 주문 번호만 호출해주세요"라고 하면 훨씬 효율적입니다.

##### 어떻게 고치나 (개발자용)

`messages:all` 채널의 `refreshConversations()`와 `router.refresh()` 를 제거하고, 대화 목록 갱신은 대화별 개별 채널 또는 `conversation_participants` 테이블 구독으로 대체합니다:

```tsx
// 기존 messages:all에서는 refreshConversations()만 호출하고 router.refresh() 제거
// 또는 messages:all 자체를 제거하고 conversation_participants 변경을 감지
```

##### 어떻게 고치나 (비개발자용)

"내 주문 번호만 호출해주세요"라고 등록합니다. 다른 사람의 주문은 더 이상 듣지 않습니다.

##### 예상 효과

메시지 화면: 불필요한 DB 쿼리 **90% 이상 감소** (다른 사용자의 메시지에 반응하지 않음)
멀티유저 환경: **지수적 성능 저하 방지** (N명 동시 사용 시 N배 트래픽 → 1배)

---

## P1 — High Impact (누적 지연 효과)

---

#### [P1-6] 앱 레벨 집계 — DB에서 할 일을 JavaScript에서 수행

**해당 파일:**
- `src/app/(dashboard)/ops/projects/actions/dashboard.ts` (L16-38, L49-107, L212-258)

##### 왜 느린가 (개발자용)

3개 Server Action이 전체 행을 메모리로 로드한 후 JavaScript에서 집계합니다:

1. **fetchProjectStats()** (L16-38): 모든 프로젝트의 `status` 컬럼을 조회 → JS에서 `for` 루프로 `byStatus` 카운트
2. **fetchMonthlyCompletions()** (L49-107): 6개월치 FINAL 로드맵 버전을 조회 → JS에서 월별 그룹핑
3. **fetchStalledProjects()** (L212-258): 미완료 프로젝트 전체 조회 → JS에서 날짜 비교 필터링

```tsx
// 현재: 모든 행을 가져와서 JS에서 카운트
const { data: projects } = await supabase.from('projects').select('status');
const byStatus = {};
for (const project of projects) {
  byStatus[project.status] = (byStatus[project.status] || 0) + 1;
}
```

PostgreSQL은 `GROUP BY`, `COUNT()`, `DATE_TRUNC()`, 날짜 비교를 네이티브로 지원하며, 이는 인덱스를 활용하여 **수백 배 빠릅니다**. 데이터가 100행이면 차이가 미미하지만, 1000행 이상이면 네트워크 전송량과 JS 처리 시간이 눈에 띄게 증가합니다.

**일반적 원칙:** **집계는 항상 데이터베이스에서 수행합니다**. 데이터를 애플리케이션으로 가져와서 집계하면 (1) 불필요한 네트워크 전송, (2) 메모리 낭비, (3) 인덱스 미활용이 발생합니다.

##### 왜 느린가 (비개발자용)

도서관에서 "경제 분야 책이 몇 권인지" 알고 싶을 때, 현재 방식은 **모든 책을 대출 카운터로 가져와서 하나씩 세는 것**입니다. 도서관 컴퓨터에서 검색하면 "경제 분야: 342권"이라고 즉시 답이 나옵니다.

##### 어떻게 고치나 (개발자용)

**fetchStalledProjects()** — DB WHERE 절에서 필터링:

```tsx
// Before: 전체 조회 후 JS 필터링
const { data: projects } = await supabase
  .from('projects').select('...').neq('status', 'FINALIZED');
// → JS에서 daysDiff >= minDays 필터링

// After: DB에서 직접 필터링
const thresholdDate = new Date(Date.now() - minDays * 86400000).toISOString();
const { data: projects } = await supabase
  .from('projects').select('...')
  .neq('status', 'FINALIZED')
  .lt('updated_at', thresholdDate);  // DB에서 날짜 비교
```

**fetchProjectStats()**, **fetchMonthlyCompletions()**: Supabase RPC 함수 또는 `.select('status')` 유지하되, 프로젝트 수가 적은 B2B 도구이므로 현행도 허용 가능. fetchStalledProjects가 가장 큰 개선 대상.

##### 어떻게 고치나 (비개발자용)

도서관 컴퓨터에 "경제 분야 책 수"를 검색합니다. 책을 일일이 가져오지 않습니다.

##### 예상 효과

fetchStalledProjects(): 전송 데이터 **50~90% 감소** (minDays 이상인 프로젝트만 전송)
대시보드 탭 전환: **100~300ms 단축**

---

#### [P1-7] 직렬 쿼리 — 병렬화 가능한 DB 호출

**해당 파일:**
- `src/lib/services/quota.ts` (L93-126)
- `src/lib/actions/auth-helpers.ts` (L83-109)

##### 왜 느린가 (개발자용)

**quota.ts L93-126** — `fetchUserUsage()`에서 3개 쿼리를 직렬 실행:
```tsx
const quota = await fetchUserQuota(userId);      // 쿼리 1: ~50ms
const { data: dailyUsage } = await supabase...;  // 쿼리 2: ~50ms (1 완료 후 시작)
const { data: monthlyUsage } = await supabase...; // 쿼리 3: ~50ms (2 완료 후 시작)
// 총: ~150ms
```

쿼리 2, 3은 쿼리 1의 결과에 **의존하지 않으므로** 병렬 실행 가능합니다.

**auth-helpers.ts L83-109** — `requireConsultantRoadmapAccess()`에서 2개 쿼리를 직렬 실행:
```tsx
const roadmap = await supabase.from('roadmap_versions').select('project_id')...;
const project = await supabase.from('projects').select('assigned_consultant_id')
  .eq('id', roadmap.project_id)...;  // roadmap 결과에 의존
```

이 경우는 순차 의존이 있지만, **Supabase JOIN**으로 단일 쿼리로 통합 가능합니다.

**일반적 원칙:** 독립적인 DB 쿼리는 `Promise.all()`로 병렬 실행합니다. 순차 의존이 있으면 JOIN으로 통합합니다.

##### 왜 느린가 (비개발자용)

편의점에서 라면, 음료, 과자를 사러 갔는데, **라면을 집은 후에야 음료 코너로 가고, 음료를 집은 후에야 과자 코너로 가는 것**과 같습니다. 세 곳을 동시에 가면 시간이 1/3로 줄어듭니다.

##### 어떻게 고치나 (개발자용)

```tsx
// Before (직렬):
const quota = await fetchUserQuota(userId);
const { data: dailyUsage } = await supabase...;
const { data: monthlyUsage } = await supabase...;

// After (병렬):
const [quota, { data: dailyUsage }, { data: monthlyUsage }] = await Promise.all([
  fetchUserQuota(userId),
  supabase.from('usage_metrics').select('llm_calls').eq('user_id', userId).eq('date', date).single(),
  supabase.from('usage_metrics').select('llm_calls').eq('user_id', userId).eq('month', month),
]);
```

```tsx
// Before (순차 2쿼리):
const roadmap = await supabase.from('roadmap_versions').select('project_id')...;
const project = await supabase.from('projects').select('assigned_consultant_id')...;

// After (JOIN 1쿼리):
const { data } = await supabase
  .from('roadmap_versions')
  .select('project_id, projects!inner(assigned_consultant_id)')
  .eq('id', roadmapId)
  .single();
```

##### 어떻게 고치나 (비개발자용)

세 코너를 동시에 방문하거나, 한 코너에서 모든 물건을 한 번에 가져옵니다.

##### 예상 효과

fetchUserUsage(): **~100ms 단축** (150ms → 50ms)
requireConsultantRoadmapAccess(): **~50ms 단축** (100ms → 50ms)

---

#### [P1-8] select('*') 남용 — 불필요한 대형 JSONB 전송

**해당 파일:** 25개 이상 파일 (핵심: `roadmap-crud.ts`, `ops/projects/[id]/page.tsx`, `messages/actions.ts`, `roadmap-generator.ts`)

##### 왜 느린가 (개발자용)

`roadmap_versions` 테이블에는 대형 JSONB 컬럼이 4개 있습니다:
- `diagnosis_summary` — 진단 요약 JSON (~10KB)
- `roadmap_matrix` — 로드맵 매트릭스 JSON (~20KB)
- `courses` — 교육과정 배열 JSON (~15KB)
- `pbl_course` — PBL 과정 JSON (~5KB)

`select('*')`로 조회하면 **목록 화면에서도 이 50KB+ JSONB 데이터가 매 행마다 전송**됩니다. 10개 행이면 500KB의 불필요한 전송입니다.

```tsx
// roadmap-crud.ts L89
.select('*')  // 50KB * N rows — 목록에서는 id, version_number, status만 필요
```

**일반적 원칙:** SELECT에서 **실제 사용하는 컬럼만 명시**합니다. 특히 JSONB, TEXT, BYTEA 같은 대형 컬럼이 있는 테이블에서는 필수입니다.

##### 왜 느린가 (비개발자용)

도서관에서 책 제목 목록을 보고 싶은데, **매 책의 전체 내용(200페이지)을 함께 보내주는 것**과 같습니다. 제목과 저자만 보내면 됩니다.

##### 어떻게 고치나 (개발자용)

```tsx
// Before:
.select('*')

// After (목록 조회):
.select('id, project_id, version_number, status, created_at, finalized_at, created_by')

// After (상세 조회):
.select('id, project_id, version_number, status, diagnosis_summary, roadmap_matrix, courses, pbl_course, created_at, finalized_at')
```

##### 어떻게 고치나 (비개발자용)

도서 목록에는 제목과 저자만 보내고, 책 내용은 클릭했을 때만 보내줍니다.

##### 예상 효과

로드맵 관련 페이지: 네트워크 전송량 **70~90% 감소**
전체 앱: 응답 시간 **50~200ms 단축** (JSONB 직렬화/역직렬화 비용 절감)

---

#### [P1-9] CommandPalette eager import — 초기 번들 비대화

**해당 파일:** `src/components/Navigation.tsx` (L25)

##### 왜 느린가 (개발자용)

```tsx
// Navigation.tsx L25
import CommandPalette from '@/components/command-palette/CommandPalette';
```

`CommandPalette`는 `Ctrl+K`로만 열리는 기능이지만, `Navigation`이 모든 대시보드 페이지에서 렌더되므로 **모든 페이지의 초기 JS 번들에 포함**됩니다. CommandPalette는 내부적으로 `cmdk` 라이브러리와 다수의 UI 컴포넌트를 포함하고 있어 번들 크기가 상당합니다.

**일반적 원칙:** **사용자 인터랙션으로만 열리는 컴포넌트는 동적 import**(`next/dynamic` 또는 `React.lazy`)로 로드합니다. 초기 번들에서 제외하여 TTI(Time to Interactive)를 단축합니다.

##### 왜 느린가 (비개발자용)

모든 페이지를 열 때마다 **비상구 안내 책자를 전부 다운로드**하는 것과 같습니다. 비상구 안내는 비상 버튼을 눌렀을 때만 보여주면 됩니다.

##### 어떻게 고치나 (개발자용)

```tsx
// Before:
import CommandPalette from '@/components/command-palette/CommandPalette';

// After:
import dynamic from 'next/dynamic';
const CommandPalette = dynamic(
  () => import('@/components/command-palette/CommandPalette'),
  { ssr: false }
);
```

##### 어떻게 고치나 (비개발자용)

비상구 안내는 비상 버튼을 눌렀을 때만 불러옵니다. 평소에는 다운로드하지 않습니다.

##### 예상 효과

모든 대시보드 페이지: 초기 JS 번들 **20~50KB 감소**, TTI **100~200ms 단축**

---

#### [P1-10] optimizePackageImports 미흡 — tree-shaking 비효율

**해당 파일:** `next.config.ts` (L29-31)

##### 왜 느린가 (개발자용)

```tsx
experimental: {
  optimizePackageImports: [
    'lucide-react',  // 이것만 포함
  ],
},
```

`optimizePackageImports`는 barrel export(`index.ts`)가 있는 패키지에서 **사용하는 export만 번들에 포함**하도록 합니다. 현재 `lucide-react`만 최적화되어 있고, 다음 무거운 패키지들이 누락:

- `recharts` (~200KB) — 차트 라이브러리
- `@radix-ui/react-*` — UI 프리미티브 다수
- `motion` (~50KB) — 애니메이션
- `date-fns` — 날짜 유틸리티 (사용 시)

**일반적 원칙:** barrel export가 있는 패키지는 **tree-shaking이 불완전**할 수 있습니다. `optimizePackageImports`에 등록하면 Next.js가 import를 자동으로 직접 경로로 변환합니다.

##### 왜 느린가 (비개발자용)

요리에 소금만 필요한데, **양념 세트 전체를 구매**하는 것과 같습니다. 필요한 양념만 개별 구매하면 장바구니(번들)가 훨씬 가벼워집니다.

##### 어떻게 고치나 (개발자용)

```tsx
experimental: {
  optimizePackageImports: [
    'lucide-react',
    'recharts',
    '@radix-ui/react-accordion',
    '@radix-ui/react-alert-dialog',
    '@radix-ui/react-avatar',
    '@radix-ui/react-checkbox',
    '@radix-ui/react-collapsible',
    '@radix-ui/react-dialog',
    '@radix-ui/react-dropdown-menu',
    '@radix-ui/react-label',
    '@radix-ui/react-popover',
    '@radix-ui/react-progress',
    '@radix-ui/react-scroll-area',
    '@radix-ui/react-select',
    '@radix-ui/react-separator',
    '@radix-ui/react-slot',
    '@radix-ui/react-switch',
    '@radix-ui/react-tabs',
    '@radix-ui/react-toast',
    '@radix-ui/react-tooltip',
    'motion',
  ],
},
```

##### 어떻게 고치나 (비개발자용)

필요한 양념만 개별 구매합니다. 전체 세트가 아니라 소금, 후추만 담습니다.

##### 예상 효과

전체 번들 크기: **5~15% 감소**
모든 페이지 초기 로드: **100~300ms 단축**

---

## P2 — Medium Impact (번들 크기 및 장기 성능)

---

#### [P2-11] 랜딩 페이지 전체 CSR — SSR 미활용

**해당 파일:**
- `src/app/_components/LandingPageLoader.tsx` (L1-19)
- `src/components/landing/LandingPage.tsx`

##### 왜 느린가 (개발자용)

`LandingPageLoader.tsx`가 `'use client'`로 선언되어 있고, 내부에서 `dynamic()`으로 `LandingPage`를 로드합니다. `LandingPage.tsx` 자체도 `'use client'`입니다. 결과적으로 **랜딩 페이지 전체가 CSR(Client-Side Rendering)**이 됩니다.

랜딩 페이지는 대부분 정적 콘텐츠(소개 텍스트, 이미지, CTA 버튼)이므로 Server Component로 렌더하면 JS 번들 없이 HTML만 전송할 수 있습니다.

##### 왜 느린가 (비개발자용)

회사 소개 브로셔를 인쇄된 종이(서버 렌더링)로 줄 수 있는데, **브로셔 조립 키트(JavaScript)**를 보내서 방문객이 직접 조립하게 하는 것과 같습니다.

##### 어떻게 고치나 (개발자용)

LandingPage의 정적 섹션을 Server Component로 유지하고, 인터랙티브 섹션(GSAP 애니메이션 등)만 `'use client'`로 분리합니다. 단, 이미 하위 섹션에 `dynamic()` 4개가 적용되어 있으므로 대시보드 경로에 비해 우선순위가 낮습니다.

##### 어떻게 고치나 (비개발자용)

브로셔를 인쇄된 종이로 줍니다. 움직이는 부분(애니메이션)만 별도 키트로 보냅니다.

##### 예상 효과

랜딩 페이지 FCP: **0.5~1초 단축** (단, 대시보드 사용자 경로와 무관)

---

#### [P2-12] CDN 폰트 로드 — next/font 미사용

**해당 파일:** `src/app/layout.tsx` (L24-29)

##### 왜 느린가 (개발자용)

```tsx
<link
  rel="stylesheet"
  href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
  crossOrigin="anonymous"
/>
```

외부 CDN에서 폰트 CSS를 로드하면:
1. DNS 해석 → TLS 핸드셰이크 → CSS 다운로드 → 폰트 파일 다운로드
2. 렌더 블로킹 (CSS는 렌더를 차단)
3. CDN 가용성에 의존

`next/font`를 사용하면 빌드 타임에 폰트를 로컬에 포함하여 **외부 네트워크 의존성을 제거**합니다.

단, Pretendard는 현재 `next/font/google`에 포함되어 있지 않고 로컬 폰트로 설정해야 합니다. Dynamic Subset(사용 글리프만 on-demand 로드) 기능은 CDN 방식에서만 작동하므로, 전환 시 서브셋 전략을 변경해야 합니다.

**현실적 대안:** `<link rel="preconnect">`를 추가하여 DNS/TLS 비용을 줄이는 것이 가장 안전합니다.

##### 왜 느린가 (비개발자용)

매번 외국 서점에서 **글꼴 책을 주문해서 배송받는 것**과 같습니다. 한 번 복사본을 만들어두면 매번 주문할 필요가 없습니다.

##### 어떻게 고치나 (개발자용)

```tsx
// layout.tsx에 preconnect 추가 (최소 개선)
<link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
```

##### 어떻게 고치나 (비개발자용)

자주 쓰는 글꼴의 복사본을 미리 준비해둡니다.

##### 예상 효과

전체 앱 LCP: **50~150ms 단축** (preconnect만 적용 시)

---

#### [P2-13] 중복 인덱스

**해당 파일:** `supabase/migrations/001_initial_schema.sql` (L79, L272, L91, L275)

##### 왜 느린가 (개발자용)

```sql
email TEXT NOT NULL UNIQUE,  -- L79: UNIQUE 제약 → 암묵적 인덱스 자동 생성
CREATE INDEX idx_users_email ON users(email);  -- L272: 명시적 인덱스 → 중복!
```

PostgreSQL에서 `UNIQUE` 제약 조건은 **자동으로 B-tree 인덱스를 생성**합니다. 동일 컬럼에 명시적 인덱스를 추가하면:
1. 저장 공간 낭비
2. INSERT/UPDATE 시 인덱스 2개 갱신 → 쓰기 성능 저하
3. 혼란 유발

`idx_consultant_profiles_user_id`도 동일한 중복입니다.

##### 왜 느린가 (비개발자용)

같은 책에 **목차를 2개** 만든 것과 같습니다. 하나면 충분한데, 책이 두꺼워지고 인쇄 비용이 늘어납니다.

##### 어떻게 고치나 (개발자용)

```sql
-- 새 마이그레이션 파일
DROP INDEX IF EXISTS idx_users_email;
DROP INDEX IF EXISTS idx_consultant_profiles_user_id;
```

##### 어떻게 고치나 (비개발자용)

중복 목차를 제거합니다.

##### 예상 효과

쓰기 성능: **미미한 개선** (INSERT/UPDATE 시 인덱스 갱신 1회 감소)
저장 공간: 약간의 절약

---

#### [P2-14] fetchConversations() 4단계 순차 쿼리

**해당 파일:** `src/app/(dashboard)/dashboard/messages/actions.ts` (L29-97)

##### 왜 느린가 (개발자용)

대화 목록 조회가 4단계 순차로 실행됩니다:
1. 내 참여 조회 (`conversation_participants`)
2. 대화 정보 조회 (`conversations`, 1의 결과에 의존)
3. 상대 참여자 + 마지막 메시지 조회 (2의 결과에 의존, Promise.all 사용)
4. 상대방 사용자 정보 조회 (`users`, 3의 결과에 의존)

단계 2와 3은 의존성이 있지만, **JOIN을 활용하면 2+3을 단일 쿼리로 통합** 가능합니다.

##### 왜 느린가 (비개발자용)

4번 편의점을 왕복하는 대신, **한 번에 필요한 것을 모두 사서 오는 것**과 같습니다.

##### 어떻게 고치나 (개발자용)

```tsx
// conversations + participants + users를 JOIN으로 통합
const { data } = await supabase
  .from('conversation_participants')
  .select(`
    conversation_id, last_read_at,
    conversations!inner(id, last_message_at),
    users!inner(id, name, role)
  `)
  .eq('user_id', user.id);
```

##### 어떻게 고치나 (비개발자용)

한 번에 필요한 모든 물건을 사서 옵니다.

##### 예상 효과

메시지 페이지 로드: **100~200ms 단축**

---

#### [P2-15] LLM 호출 후 버전 번호 조회 — 병렬화 가능

**해당 파일:** `src/lib/services/roadmap/roadmap-generator.ts` (L119)

##### 왜 느린가 (개발자용)

```tsx
// L110-116: LLM 호출 (10초~수분)
const { result, validation } = await callLLMAndBuildRoadmap([...], signal);

// L119-125: LLM 완료 후에야 버전 번호 조회 (50ms)
const { data: latestVersion } = await supabase
  .from('roadmap_versions')
  .select('version_number')...;
```

버전 번호 조회는 LLM 결과에 의존하지 않으므로 **LLM 호출과 동시에 실행 가능**합니다.

##### 왜 느린가 (비개발자용)

전화 통화(LLM)가 끝나기를 기다렸다가 **메모 용지를 찾는 것**과 같습니다. 통화 중에 미리 메모 용지를 준비하면 됩니다.

##### 어떻게 고치나 (개발자용)

```tsx
const [{ result, validation }, { data: latestVersion }] = await Promise.all([
  callLLMAndBuildRoadmap([...], signal),
  supabase.from('roadmap_versions').select('version_number')...,
]);
```

##### 어떻게 고치나 (비개발자용)

전화하는 동안 메모 용지를 미리 준비합니다.

##### 예상 효과

로드맵 생성: **50ms 단축** (LLM이 10초+ 걸리므로 체감 미미하지만 원칙적으로 올바른 패턴)

---

#### [P2-16] 하이드레이션 불일치 위험

**해당 파일:** `src/app/assessment/layout.tsx` (L32)

##### 왜 느린가 (개발자용)

```tsx
<p>&copy; {new Date().getFullYear()} KPC 한국생산성본부</p>
```

`assessment/layout.tsx`는 Server Component이므로 `new Date().getFullYear()`는 **서버에서 한 번만 실행**됩니다. 하이드레이션 불일치가 발생할 가능성은 **매우 낮습니다** (연도가 바뀌는 순간에만 문제). 이 이슈는 다른 P0/P1 해결 후 살펴볼 수 있습니다.

##### 어떻게 고치나 (개발자용)

```tsx
<p suppressHydrationWarning>
  &copy; {new Date().getFullYear()} KPC 한국생산성본부
</p>
```

##### 예상 효과

**실질적 영향 없음** — 방어적 코드 개선
