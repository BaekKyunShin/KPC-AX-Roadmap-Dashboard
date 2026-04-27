# Next.js App Router 성능 안티패턴 & 해결 가이드

**작성 배경:** KPC AI 로드맵 대시보드 성능 최적화 과정에서 발견한 16개 병목 포인트를 정리한 학습 자료입니다.
**이 프로젝트에 한정되지 않고**, Next.js App Router를 사용하는 모든 프로젝트에서 동일한 패턴이 발생할 수 있습니다.

**대상 독자:** 비개발자(PM, 기획자, 경영진) + 개발자 모두가 이해할 수 있도록 이중 설명을 포함합니다.
각 항목은 **비개발자용 설명이 먼저**, 개발자용 설명이 뒤에 나옵니다.

---

## 목차

1. [useEffect 워터폴 (가장 흔한 실수)](#1-useeffect-워터폴)
2. [리다이렉트 체인](#2-리다이렉트-체인)
3. [Suspense 미활용 (올 오어 낫싱 렌더링)](#3-suspense-미활용)
4. [router.refresh() 남용](#4-routerrefresh-남용)
5. [Realtime 구독 필터 부재](#5-realtime-구독-필터-부재)
6. [앱 레벨 집계 (DB에서 할 일을 JS에서 수행)](#6-앱-레벨-집계)
7. [직렬 쿼리 (병렬화 가능한 DB 호출)](#7-직렬-쿼리)
8. [select('*') 남용 (대형 컬럼 불필요 전송)](#8-select-남용)
9. [무거운 컴포넌트 eager import](#9-무거운-컴포넌트-eager-import)
10. [optimizePackageImports 미설정](#10-optimizepackageimports-미설정)
11. [랜딩 페이지 전체 CSR](#11-랜딩-페이지-전체-csr)
12. [CDN 폰트 로드 (next/font 미사용)](#12-cdn-폰트-로드)
13. [중복 인덱스](#13-중복-인덱스)
14. [다단계 순차 쿼리](#14-다단계-순차-쿼리)
15. [LLM 호출 후 불필요한 순차 처리](#15-llm-호출-후-불필요한-순차-처리)
16. [하이드레이션 불일치](#16-하이드레이션-불일치)

---

## 1. useEffect 워터폴

**심각도:** Critical | **체감 영향:** 2~3초 지연

### 왜 느린가 (비개발자용)

음식점에 비유하면:

**현재 (느린) 방식:**
1. 손님이 착석 (서버가 빈 페이지를 보냄)
2. 메뉴판이 도착 (JavaScript 다운로드)
3. 메뉴판을 읽기 시작 (하이드레이션)
4. 비로소 주문 (서버에 데이터 요청)
5. 요리가 나옴 (화면에 데이터 표시)

**올바른 방식:**
1. 손님이 도착하기 전에 주방이 이미 "오늘의 기본 메뉴"를 준비
2. 손님이 착석하면 바로 음식이 나옴
3. 추가 주문(필터, 검색)이 있을 때만 새로 요리

### 왜 느린가 (개발자용)

Next.js App Router에는 **Server Component**(서버에서만 실행되는 컴포넌트, 브라우저에 JS를 보내지 않음)와 **Client Component**(`'use client'`를 선언한 컴포넌트, 브라우저에서 인터랙티브하게 동작)가 있습니다.

Server Component는 서버에서 데이터를 가져오면서 동시에 HTML을 만들어 브라우저에 보냅니다. 반면 Client Component에서 `useEffect`로 데이터를 가져오면 아래 단계를 거칩니다:

— `useEffect`는 "컴포넌트가 화면에 그려진 직후 실행해야 할 코드"를 정의하는 React 기능입니다.

```
서버가 빈 HTML 전송 → 브라우저가 JS 다운로드 → JS 해석 → 하이드레이션(HTML에 이벤트 핸들러를 연결하는 과정) → useEffect 실행 → 서버에 데이터 요청 → 응답 대기 → 화면 갱신
```

각 단계가 앞 단계의 완료를 기다리므로 지연이 쌓입니다. 이 패턴을 "워터폴(폭포)"이라 부릅니다 — 물이 각 단(段)을 거쳐야 아래로 내려가듯이.

**안티패턴 코드:**
```tsx
// page.tsx (Server Component) — 빈 shell만 전달
export default async function Page() {
  return <DataTable />;  // 데이터 없이 클라이언트 컴포넌트만 렌더
}

// DataTable.tsx (Client Component) — 화면에 그려진 후에야 데이터 요청
'use client';
export default function DataTable() {
  const [data, setData] = useState([]);
  useEffect(() => {
    fetchData().then(setData);  // 화면이 그려진 후에야 요청 시작
  }, []);
  return loading ? <Skeleton /> : <Table data={data} />;
}
```

**올바른 패턴:**
```tsx
// page.tsx (Server Component) — 서버에서 데이터를 미리 가져옴
export default async function Page() {
  const data = await fetchData();  // 서버에서 즉시 실행
  return <DataTable initialData={data} />;
}

// DataTable.tsx (Client Component) — 서버가 준비한 데이터로 즉시 표시
'use client';
export default function DataTable({ initialData }) {
  const [data, setData] = useState(initialData);
  // useEffect는 필터 변경, 페이지 이동 등 사용자 행동 이후에만 사용
}
```

### 어떻게 고치나 (비개발자용)

주방이 손님이 착석하기 전에 기본 메뉴를 미리 준비해두는 방식으로 바꿉니다. 추가 주문(필터, 검색)이 있을 때만 새로 요리합니다. 대기 시간이 **2~3초 → 0.5초 이내**로 줄어듭니다.

### 어떻게 고치나 (개발자용)

**원칙:**
- 초기 데이터는 Server Component에서 가져와 props로 전달
- `useEffect` 데이터 요청은 사용자 인터랙션(필터, 페이지네이션, 검색) 이후에만 사용
- 여러 데이터가 필요하면 `Promise.all`로 동시에 요청 — `Promise.all`은 여러 비동기 작업을 동시에 시작하고 모두 끝나면 결과를 한꺼번에 반환하는 JS 메서드

### 예상 효과

초기 페이지 로드: **2~3초 → 0.5~1초** (가장 큰 단일 개선)

---

## 2. 리다이렉트 체인

**심각도:** Critical | **체감 영향:** ~500ms

### 왜 느린가 (비개발자용)

"A 건물에 가세요"라고 안내받아 갔더니, 도착하자마자 "아, B 건물로 가야 합니다"라고 다시 안내받는 것과 같습니다. 처음부터 B 건물로 안내했다면 이동 시간이 절반이었을 것입니다.

### 왜 느린가 (개발자용)

`redirect()`는 Next.js에서 "이 URL로 다시 와"라는 응답을 보내는 함수입니다. 브라우저는 완전히 새로운 요청을 시작합니다.

레이아웃(layout.tsx — 여러 페이지가 공유하는 UI 껍데기)이 있어도 리다이렉트되면 레이아웃의 모든 서버 로직(인증 확인, DB 조회 등)이 **처음부터 다시** 실행됩니다.

```
사용자 → /dashboard → 서버: 레이아웃 실행(인증+DB 조회) → redirect('/ops/projects')
                    → 서버: 레이아웃 실행(인증+DB 조회, 다시!) → 최종 화면
```

### 어떻게 고치나 (비개발자용)

처음부터 "당신의 역할은 관리자이니 관리 화면으로 가세요"라고 안내합니다. 중간 경유지를 거치지 않습니다.

### 어떻게 고치나 (개발자용)

로그인 성공 시 사용자 역할을 확인하고 최종 목적지(`/ops/projects` 또는 `/consultant/home`)로 직접 redirect합니다. `/dashboard`를 허브로 경유하지 않습니다. `/dashboard` 페이지는 북마크나 직접 URL 입력 대비로만 유지합니다.

### 예상 효과

로그인 후 최초 진입: **~500ms 단축**

---

## 3. Suspense 미활용

**심각도:** Critical | **체감 영향:** 0.5~1.5초

### 왜 느린가 (비개발자용)

뉴스 웹사이트에서 기사 본문, 댓글, 관련 기사, 날씨 위젯이 모두 로드될 때까지 **빈 화면**을 보여주는 것과 같습니다. 기사 본문은 0.2초 만에 준비되지만, 댓글이 1초 걸리면 전체가 1초를 기다립니다.

올바른 방식은 **기사 본문을 먼저 보여주고**, 댓글 영역에 "로딩 중..."을 표시하다가 준비되면 자동으로 채워넣는 것입니다.

### 왜 느린가 (개발자용)

Next.js에는 `loading.tsx`라는 특수 파일이 있어서 해당 경로의 전체 로딩 상태를 보여줍니다. 하지만 이것은 페이지 **전체** 단위여서, 한 데이터라도 느리면 전체가 대기합니다.

React의 `<Suspense>`는 이보다 세밀합니다. Suspense로 감싼 영역만 별도로 로딩 처리할 수 있습니다. 서버는 준비된 부분의 HTML부터 브라우저에 조금씩 보내줍니다 — 이것을 **스트리밍(Streaming)**이라 부릅니다.

```tsx
export default async function Page() {
  const a = await fetchQuickData();  // 빠르게 완료 (0.1초)
  return (
    <>
      <Header data={a} />  {/* 즉시 화면에 표시 */}
      <Suspense fallback={<Skeleton />}>
        {/* 이 부분은 아직 로딩 중이면 Skeleton을 보여주고,
            준비되면 자동으로 실제 내용으로 교체 */}
        <SlowSection />
      </Suspense>
    </>
  );
}
```

### 어떻게 고치나 (비개발자용)

뉴스 사이트가 기사 본문을 먼저 보여주고, 댓글은 "불러오는 중..."을 표시합니다. 사용자는 기사를 읽으면서 댓글이 준비되기를 기다릴 수 있습니다.

### 어떻게 고치나 (개발자용)

독립적인 데이터 영역을 별도의 async Server Component로 분리하고, 각각을 `<Suspense fallback={<스켈레톤 />}>`로 감쌉니다. 핵심 콘텐츠(헤더, 제목)만 먼저 await하고 나머지는 스트리밍합니다.

### 예상 효과

체감 로딩 시간: **1.5~2초 → 0.3~0.5초** (첫 의미 있는 콘텐츠 기준)

---

## 4. router.refresh() 남용

**심각도:** Critical | **체감 영향:** 1~2초 리렌더

### 왜 느린가 (비개발자용)

카카오톡에서 다른 채팅방에 메시지가 왔을 때, **현재 보고 있는 채팅방을 닫았다가 다시 여는 것**과 같습니다. 실제로는 채팅 목록의 미리보기 텍스트만 업데이트하면 충분합니다.

### 왜 느린가 (개발자용)

`router.refresh()`는 Next.js에서 "현재 페이지의 서버 쪽 코드를 전부 다시 실행해"라고 요청하는 함수입니다. 레이아웃의 인증 확인, 알림 수 조회 등 **모든 서버 로직이 다시 실행**됩니다.

채팅 목록의 미리보기 텍스트 하나를 갱신하기 위해 전체 페이지를 다시 만드는 것은 과도합니다. 대신 `setState`(화면의 특정 상태값만 바꾸는 React 함수)로 해당 부분만 갱신하면 서버 요청 없이 즉시 반영됩니다.

**안티패턴:**
```tsx
onNewMessage((msg) => {
  router.refresh();  // 전체 페이지 다시 만들기 (1~2초)
});
```

**올바른 패턴:**
```tsx
onNewMessage((msg) => {
  setConversations(prev => updatePreview(prev, msg));  // 해당 항목만 갱신 (즉시)
});
```

### 어떻게 고치나 (비개발자용)

다른 채팅방에 메시지가 오면, **목록의 미리보기만 갱신**합니다. 현재 채팅방은 건드리지 않습니다.

### 어떻게 고치나 (개발자용)

- `router.refresh()`는 폼 제출 후처럼 **전체 데이터가 바뀐 경우에만** 사용
- 부분 업데이트는 `setState`로 클라이언트 상태만 변경
- 서버 캐시를 무효화해야 하면 `revalidateTag()` 사용 — 특정 캐시 태그에 연결된 데이터만 "이제 오래됐으니 다음에 새로 가져와"라고 표시하는 함수

### 예상 효과

실시간 기능 사용 중: **불필요한 1~2초 리렌더 완전 제거**

---

## 5. Realtime 구독 필터 부재

**심각도:** Critical | **체감 영향:** 멀티유저 환경에서 지수적 저하

### 왜 느린가 (비개발자용)

편의점에서 "모든 고객의 주문"을 듣고 있다가 내 주문이 아니면 무시하는 것과 같습니다. 10명이 동시에 주문하면 10배의 소리를 들어야 합니다. "내 주문 번호만 호출해주세요"라고 하면 효율적입니다.

### 왜 느린가 (개발자용)

Supabase Realtime은 DB 변경사항을 실시간으로 감지하는 기능입니다. WebSocket(서버와 브라우저 간 항시 열려 있는 통신 채널)을 통해 INSERT/UPDATE/DELETE 이벤트를 즉시 전달합니다.

테이블의 **모든 변경**을 구독하면:
1. 모든 사용자의 이벤트가 클라이언트로 전달 시도
2. 각 이벤트마다 콜백 함수 실행 (DB 재조회, UI 갱신 등)
3. N명이 동시 사용하면 각 사용자가 N배의 이벤트를 처리

`filter` 옵션을 사용하면 "내 대화의 메시지만" 같은 조건으로 좁힐 수 있습니다:

```tsx
// 나쁜 예: 모든 메시지 감지
.on('postgres_changes', { event: 'INSERT', table: 'messages' }, callback);

// 좋은 예: 내 대화의 메시지만 감지
.on('postgres_changes', {
  event: 'INSERT', table: 'messages',
  filter: 'conversation_id=eq.conv-123'
}, callback);
```

### 어떻게 고치나 (비개발자용)

"내 주문 번호만 호출해주세요"라고 등록합니다. 다른 사람의 주문은 더 이상 듣지 않습니다.

### 어떻게 고치나 (개발자용)

- Realtime의 `filter` 옵션으로 관심 있는 레코드만 구독
- 여러 레코드를 구독해야 하면 개별 채널 또는 RLS 기반 필터링 활용
  — RLS(Row Level Security)는 "이 사용자는 이 행만 볼 수 있다"를 DB 수준에서 강제하는 보안 정책
- 전체 테이블 구독은 절대 사용하지 않음

### 예상 효과

멀티유저: 불필요한 이벤트 **90% 이상 감소**

---

## 6. 앱 레벨 집계

**심각도:** High | **체감 영향:** 100~300ms, 데이터 증가 시 선형 악화

### 왜 느린가 (비개발자용)

도서관에서 "경제 분야 책이 몇 권인지" 알고 싶을 때, 모든 책을 대출 카운터로 가져와서 하나씩 세는 것과 같습니다. 도서관 컴퓨터에서 검색하면 "경제 분야: 342권"이라고 즉시 답이 나옵니다.

### 왜 느린가 (개발자용)

DB는 집계 연산(COUNT, SUM, GROUP BY 등)을 **인덱스**(DB가 특정 컬럼의 값을 미리 정리해둔 "책 목차" 같은 구조)를 활용하여 매우 빠르게 처리합니다.

전체 행을 앱으로 가져와서 JavaScript의 `.filter()`, `.reduce()`, `for` 루프로 세면:
1. 네트워크로 불필요한 데이터가 전송됨 (100행 전체 vs 집계 결과 1행)
2. 서버 메모리에 전체 행이 올라감
3. DB의 최적화된 경로를 쓰지 않음

```tsx
// 나쁜 예: 전부 가져와서 JS로 세기
const { data } = await supabase.from('projects').select('status');
const count = data.filter(p => p.status === 'ACTIVE').length;

// 좋은 예: DB에서 세기
const { count } = await supabase
  .from('projects')
  .select('*', { count: 'exact', head: true })  // head: true = 행 내용은 안 가져오고 개수만
  .eq('status', 'ACTIVE');
```

### 어떻게 고치나 (비개발자용)

도서관 컴퓨터에서 검색합니다. 책을 일일이 가져오지 않습니다.

### 어떻게 고치나 (개발자용)

- 단순 카운트: Supabase의 `{ count: 'exact', head: true }` 옵션
- 상태별 그룹 카운트: PostgreSQL RPC 함수(DB에 직접 만드는 사용자 정의 함수)로 `GROUP BY` 사용
- 날짜 필터: `.lt('updated_at', thresholdDate)` — DB의 WHERE 절에서 필터링

### 예상 효과

전송 데이터: **50~90% 감소**, 응답 시간: **100~300ms 단축**

---

## 7. 직렬 쿼리

**심각도:** High | **체감 영향:** 쿼리당 50~100ms 누적

### 왜 느린가 (비개발자용)

편의점에서 라면, 음료, 과자를 사러 갔는데, 라면을 집은 후에야 음료 코너로 가고, 음료를 집은 후에야 과자 코너로 가는 것과 같습니다. 세 곳을 동시에 방문하면 시간이 1/3입니다.

### 왜 느린가 (개발자용)

독립적인 DB 쿼리를 순서대로 `await`(비동기 작업이 끝날 때까지 기다리는 키워드)하면 각 쿼리의 지연이 직렬로 합산됩니다:

```tsx
// 나쁜 예: 하나씩 순서대로 (150ms)
const a = await queryA();  // 50ms
const b = await queryB();  // 50ms, a가 끝난 후 시작
const c = await queryC();  // 50ms, b가 끝난 후 시작

// 좋은 예: 동시에 실행 (50ms)
const [a, b, c] = await Promise.all([queryA(), queryB(), queryC()]);
// Promise.all = "이 3개를 동시에 시작하고, 전부 끝나면 결과를 한꺼번에 줘"
```

B가 A의 결과를 필요로 하는 경우(순차 의존):
```tsx
// JOIN으로 한 번의 DB 요청으로 합침
const { data } = await supabase
  .from('table_a')
  .select('*, table_b!inner(column_x)')  // table_a와 table_b를 한번에 가져옴
  .eq('id', id)
  .single();
```

### 어떻게 고치나 (비개발자용)

세 코너를 동시에 방문하거나, 한 코너에서 모든 물건을 한 번에 가져옵니다.

### 어떻게 고치나 (개발자용)

- 독립적 쿼리: `Promise.all()`로 동시 실행
- 순차 의존: Supabase JOIN으로 한 번의 요청으로 합치기
- 복잡한 다단계 로직: PostgreSQL RPC 함수로 DB 내부에서 처리

### 예상 효과

쿼리 수에 비례하여 **50~200ms 단축**

---

## 8. select('*') 남용

**심각도:** High | **체감 영향:** 50~200ms, JSONB 컬럼 시 수배

### 왜 느린가 (비개발자용)

도서관에서 책 제목 목록을 보고 싶은데, 매 책의 전체 내용(200페이지)을 함께 보내주는 것과 같습니다. 제목과 저자만 보내면 됩니다.

### 왜 느린가 (개발자용)

`select('*')`는 테이블의 **모든 컬럼**을 가져옵니다. JSONB(JSON 형식으로 저장된 대형 데이터) 컬럼이 있으면 한 행당 수십KB가 될 수 있습니다.

예: 로드맵 목록에서 각 항목의 50KB JSONB 데이터가 불필요하게 포함 → 10개 항목이면 500KB 전송

```tsx
// 나쁜 예
.select('*')  // 50KB JSONB 포함

// 좋은 예 (목록 화면)
.select('id, title, status, created_at')  // 필요한 것만

// 좋은 예 (상세 화면 — 여기서는 JSONB가 필요)
.select('id, title, status, full_content')
```

### 어떻게 고치나 (비개발자용)

도서 목록에는 제목과 저자만 보내고, 책 내용은 클릭했을 때만 보내줍니다.

### 어떻게 고치나 (개발자용)

- 모든 쿼리에서 실제 사용하는 컬럼만 명시
- 목록 vs 상세에서 다른 컬럼 세트 사용
- 특히 JSONB, TEXT, BYTEA(바이너리 데이터) 컬럼 주의

### 예상 효과

네트워크 전송량: **70~90% 감소** (JSONB 테이블)

---

## 9. 무거운 컴포넌트 eager import

**심각도:** High | **체감 영향:** 100~200ms TTI 지연

### 왜 느린가 (비개발자용)

모든 페이지를 열 때마다 비상구 안내 책자를 전부 다운로드하는 것과 같습니다. 비상 버튼을 눌렀을 때만 보여주면 됩니다.

### 왜 느린가 (개발자용)

`import Component from './Component'`는 해당 모듈과 그 의존성을 **초기 JS 번들**(브라우저가 페이지를 열 때 가장 먼저 다운로드하는 JS 파일)에 포함시킵니다.

사용자 인터랙션(버튼 클릭, 키보드 단축키)으로만 열리는 컴포넌트도 초기 번들에 포함되면 **TTI(Time to Interactive, 사용자가 클릭 등 조작을 할 수 있게 되기까지의 시간)**가 지연됩니다.

```tsx
// 나쁜 예: 항상 번들에 포함 (Ctrl+K로만 열리는데도)
import HeavyModal from './HeavyModal';  // 50KB

// 좋은 예: 사용자가 열 때만 로드
import dynamic from 'next/dynamic';
const HeavyModal = dynamic(
  () => import('./HeavyModal'),  // 열릴 때 비로소 다운로드
  { ssr: false }  // 서버에서는 렌더하지 않음
);
```

### 어떻게 고치나 (비개발자용)

비상구 안내는 비상 버튼을 눌렀을 때만 불러옵니다.

### 어떻게 고치나 (개발자용)

`next/dynamic`으로 동적 import할 대상:
- 모달, 다이얼로그, 드로어 (사용자가 열기 전까지 불필요)
- 검색/명령 팔레트 (Ctrl+K로만 접근)
- 차트, 에디터 등 무거운 라이브러리 의존 컴포넌트
- 어드민 전용 기능

### 예상 효과

초기 번들: **20~100KB 감소**, TTI: **100~200ms 단축**

---

## 10. optimizePackageImports 미설정

**심각도:** High | **체감 영향:** 번들 5~15% 증가

### 왜 느린가 (비개발자용)

요리에 소금만 필요한데, 양념 세트 전체를 구매하는 것과 같습니다. 필요한 양념만 개별 구매하면 장바구니가 훨씬 가벼워집니다.

### 왜 느린가 (개발자용)

많은 라이브러리가 **barrel export** 패턴을 사용합니다 — 하나의 `index.ts` 파일에서 라이브러리의 모든 기능을 re-export하는 것입니다. 번들러가 **tree-shaking**(사용하지 않는 코드를 번들에서 제거하는 과정)을 완벽하게 수행하지 못하면, 사용하지 않는 코드까지 포함됩니다.

Next.js의 `optimizePackageImports`에 패키지를 등록하면 import를 직접 파일 경로로 자동 변환하여 완벽한 tree-shaking을 보장합니다.

### 어떻게 고치나 (비개발자용)

필요한 양념만 개별 구매합니다.

### 어떻게 고치나 (개발자용)

`next.config.ts`에 무거운 패키지를 등록합니다:

```tsx
experimental: {
  optimizePackageImports: [
    'lucide-react', 'recharts', 'motion',
    '@radix-ui/react-dialog', '@radix-ui/react-select',
    // ... 사용하는 @radix-ui 패키지 각각 등록
  ],
},
```

### 예상 효과

전체 번들: **5~15% 감소**

---

## 11. 랜딩 페이지 전체 CSR

**심각도:** Medium | **체감 영향:** FCP 0.5~1초

### 왜 느린가 (비개발자용)

회사 소개 브로셔를 인쇄된 종이로 줄 수 있는데, 조립 키트를 보내서 방문객이 직접 조립하게 하는 것과 같습니다.

### 왜 느린가 (개발자용)

랜딩 페이지의 래퍼 컴포넌트가 `'use client'`로 선언되면, 정적 콘텐츠(텍스트, 이미지)까지 전부 클라이언트 번들에 포함됩니다. CSR(Client-Side Rendering)은 브라우저에서 JS를 실행해야 화면이 그려지므로, 서버에서 완성된 HTML을 보내는 SSR(Server-Side Rendering)보다 FCP(First Contentful Paint — 화면에 첫 콘텐츠가 보이는 시점)가 느립니다.

### 어떻게 고치나 (개발자용)

- 정적 섹션: Server Component (기본값, `'use client'` 안 붙이면 됨)
- 인터랙티브 섹션(애니메이션, 폼): `'use client'`로 분리
- `'use client'` 경계를 가능한 한 트리 아래쪽으로 밀어내기

### 예상 효과

랜딩 페이지 FCP: **0.5~1초 단축** (대시보드 사용자 경로와는 무관)

---

## 12. CDN 폰트 로드

**심각도:** Medium | **체감 영향:** 50~150ms

### 왜 느린가 (비개발자용)

매번 외국 서점에서 글꼴 책을 주문하는 대신, 복사본을 미리 만들어두면 매번 주문할 필요가 없습니다.

### 왜 느린가 (개발자용)

외부 CDN(콘텐츠 전송 네트워크 — 전 세계에 분산된 파일 저장소)에서 폰트를 로드하면 DNS 해석(도메인→IP 변환) → TLS 핸드셰이크(암호화 연결 수립) → CSS 다운로드 → 폰트 파일 다운로드의 네트워크 체인이 발생합니다.

`<link rel="preconnect">`를 추가하면 DNS+TLS를 미리 처리하여 실제 폰트 요청 시 대기 시간을 줄일 수 있습니다.

### 예상 효과

LCP(Largest Contentful Paint — 화면의 가장 큰 요소가 보이는 시점): **50~150ms 단축**

---

## 13. 중복 인덱스

**심각도:** Medium | **체감 영향:** 미미 (쓰기 성능)

### 왜 느린가 (비개발자용)

같은 책에 목차를 2개 만든 것과 같습니다. 하나면 충분합니다.

### 왜 느린가 (개발자용)

PostgreSQL에서 `UNIQUE` 제약 조건(이 컬럼의 값은 중복 불가)을 걸면 자동으로 B-tree 인덱스(빠른 검색을 위한 자료구조)를 생성합니다. 동일 컬럼에 명시적 인덱스를 추가 생성하면 저장 공간 낭비 + 데이터 삽입/수정 시 인덱스를 2개 갱신해야 합니다.

### 예상 효과

쓰기 성능: 미미한 개선

---

## 14. 다단계 순차 쿼리

**심각도:** Medium | **체감 영향:** 100~200ms

7번(직렬 쿼리)의 확장판입니다. 4단계 이상의 순차 조회가 있을 때, JOIN을 활용하여 단계를 줄이거나 `Promise.all`로 독립 단계를 동시 실행합니다.

---

## 15. LLM 호출 후 불필요한 순차 처리

**심각도:** Medium | **체감 영향:** 50ms (LLM 시간 대비 미미)

### 왜 느린가 (비개발자용)

전화 통화가 끝나기를 기다렸다가 메모 용지를 찾는 것과 같습니다. 통화 중에 미리 준비하면 됩니다.

### 왜 느린가 (개발자용)

LLM(대규모 언어 모델, AI 텍스트 생성) API 호출은 10초~수분이 걸립니다. 이 호출 이후에 실행되는 간단한 DB 쿼리가 LLM 결과에 의존하지 않음에도 LLM 완료를 기다립니다. `Promise.all`로 동시 실행하면 LLM이 처리되는 동안 DB 쿼리가 미리 완료됩니다.

### 예상 효과

절대적으로는 미미하지만 **올바른 패턴 실천**

---

## 16. 하이드레이션 불일치

**심각도:** Low | **체감 영향:** 없음 (경고만)

### 왜 느린가 (개발자용)

하이드레이션은 "서버가 만든 HTML에 브라우저의 JS가 이벤트 핸들러 등을 연결하는 과정"입니다. 이때 서버가 만든 HTML과 브라우저에서 다시 만든 HTML이 다르면 경고가 발생합니다.

`new Date()`처럼 서버와 브라우저에서 **다른 값을 반환할 수 있는 코드**가 대표적 원인입니다.

```tsx
// 서버에서는 2026, 브라우저에서는 2027일 수 있음 (연말/연초)
<p>&copy; {new Date().getFullYear()}</p>

// 해결: "의도적인 차이"라고 React에 알려줌
<p suppressHydrationWarning>&copy; {new Date().getFullYear()}</p>
```

### 예상 효과

실질적 성능 영향 없음 — 코드 품질 개선

---

## 요약 체크리스트

새 프로젝트나 기존 프로젝트 성능 점검 시 아래 항목을 확인하세요:

| # | 확인 항목 | 검색 방법 |
|---|----------|----------|
| 1 | `useEffect`에서 Server Action/fetch 호출 | `grep -r "useEffect" --include="*.tsx" \| grep -i "fetch\|action"` |
| 2 | 불필요한 redirect 체인 | `grep -r "redirect(" --include="*.tsx" src/app/` |
| 3 | `<Suspense>` 사용 현황 | `grep -r "Suspense" --include="*.tsx" src/app/` |
| 4 | `router.refresh()` 사용 | `grep -r "router.refresh" --include="*.tsx"` |
| 5 | Realtime 구독 필터 | `grep -r "postgres_changes" --include="*.tsx"` 후 `filter` 확인 |
| 6 | JS 집계 (for 루프 카운트) | Server Action에서 전체 행 조회 후 `.length`, `.filter`, `.reduce` |
| 7 | 직렬 await | 연속된 `const x = await`가 `Promise.all` 없이 나열 |
| 8 | `select('*')` | `grep -r "select\('\*'\)"` |
| 9 | 무거운 정적 import | `import` 문에서 recharts, chart.js, monaco-editor, @uiw 등 |
| 10 | optimizePackageImports | `next.config.ts`의 해당 배열 확인 |
