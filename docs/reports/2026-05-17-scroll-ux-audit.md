# 스크롤 UX 전수조사 보고서

> 작성일: 2026-05-17
> 조사 방식: 6개 서브에이전트 병렬 전수조사 (`src/` 전체)
> 조사 범위: ops · consultant · dashboard · gallery · messages · notifications · (auth) · 공통 컴포넌트 · 미들웨어 · 모든 `actions.ts` · 전역 CSS

---

## 진행 현황

### PR 단위 진행

|PR|우선순위|범위|상태|비고|
|---|---|---|---|---|
|**PR1** ([#110](https://github.com/BaekKyunShin/KPC-AX-Roadmap-Dashboard/pull/110))|P0|C-1 (`{ scroll: false }` 23건) + C-2 (`location.reload` → `router.refresh` 1건)|**✅ 완료 (2026-05-21)**|보고서 18건 + 동일 패턴 추가 발견 5건. 헬퍼 함수 단위 19곳 패치. E2E 17개 신규 추가 (`e2e/scroll-ux/`).|
|**PR2** ([#111](https://github.com/BaekKyunShin/KPC-AX-Roadmap-Dashboard/pull/111))|P1|H-2 (채팅 append 가드) + H-3 (인증 폼 scroll reset) + H-4 (모바일 메뉴 body lock)|**✅ 완료 (2026-05-21)**|`scroll.ts` 에 `isNearBottom` 신규. `MessageThread` 에 unread 배지 도입. 3 auth 페이지 `scrollToPageTop()` 호출. `Navigation` body lock useEffect. E2E 3개 + 단위 테스트 보강.|
|**PR3**|P2|M-2 (RoadmapResult/PBLResult `scrollIntoView` 타이밍)|**✅ 완료 (2026-05-21)**|2 ResultClient 의 `?regenerate=open` useEffect 를 `requestAnimationFrame` 으로 감싸 페인트 직후 정확한 위치에 `scrollIntoView`. 단위 테스트 2 보강 (rAF 콜백 안에서 호출됨 검증). M-1 은 본 PR 진행 중 사용자 의향 + 업계 표준 (Linear/Notion/GitHub 의 즉시 라우팅) 검토 후 ❌ 결함 아님 재판정.|
|**PR4**|P3|L-2 (`scroll-padding-top`) + L-3 (Dialog 키보드 포커스 복원 회귀 차단)|**✅ 완료 (2026-05-21)**|`globals.css` 의 `html` 셀렉터에 `scroll-padding-top: var(--sticky-top)` 한 줄 추가 — 기존 디자인 토큰 `--sticky-top: 4rem` 재사용. L-3 은 Radix UI 자동 동작으로 이미 정상 → 코드 변경 0, E2E 회귀 차단 spec 1개 신규 (`dialog-keyboard-focus-restore.spec.ts`). M-1·M-4·M-5 는 결함 아님 재판정 (아래 매트릭스 참고).|

### 이슈별 상세 매트릭스 (2026-05-21 기준)

|이슈|분류|상태|처리 PR|비고|
|---|---|---|---|---|
|**C-1**|Critical|✅ 해결|PR1 ([#110](https://github.com/BaekKyunShin/KPC-AX-Roadmap-Dashboard/pull/110))|같은 페이지 쿼리 변경 시 `{ scroll: false }` 누락 23건 일괄 패치|
|**C-2**|Critical|✅ 해결|PR1 ([#110](https://github.com/BaekKyunShin/KPC-AX-Roadmap-Dashboard/pull/110))|`window.location.reload()` → `router.refresh()`|
|~~H-1~~|High|❌ 결함 아님|—|갤러리 뒤로가기 — 두 단계 전환은 트레이드오프, 현 상태 유지 결정|
|**H-2**|High|✅ 해결|PR2 ([#111](https://github.com/BaekKyunShin/KPC-AX-Roadmap-Dashboard/pull/111))|append 가드 + "새 메시지 N개" 배지 도입|
|**H-3**|High|✅ 해결|PR2 ([#111](https://github.com/BaekKyunShin/KPC-AX-Roadmap-Dashboard/pull/111))|인증 폼 상태 전환 후 `scrollToPageTop()`|
|**H-4**|High|✅ 해결|PR2 ([#111](https://github.com/BaekKyunShin/KPC-AX-Roadmap-Dashboard/pull/111))|모바일 햄버거 body lock|
|~~H-5~~|High|❌ 결함 아님|—|`router.refresh()` 는 공식적으로 스크롤 유지 (Next.js v16 공식 동작)|
|~~M-1~~|Medium|❌ 결함 아님|—|인터뷰 제출 직후 250ms 지연은 사용자 답답함 유발. sonner Toaster 가 root layout 에 있어 페이지 전환 후에도 토스트가 살아남으므로 가독성 확보 불필요. 업계 표준 (Linear/Notion/GitHub) 도 즉시 라우팅 + 토스트 지속 패턴. M-4 와 일관 판정|
|**M-2**|Medium|✅ 해결|PR3|2 ResultClient 의 `?regenerate=open` `scrollIntoView` 를 `requestAnimationFrame` 으로 한 프레임(~16ms) 지연 → 페인트 직후 정확한 위치 보장|
|~~M-3~~|Medium|❌ 결함 아님|—|`revalidatePath` 는 공식적으로 스크롤 유지|
|~~M-4~~|Medium|❌ 결함 아님|—|`UseRoadmapDialog` — 토스트 후 라우팅 지연은 사용자 답답함 유발 (Linear/Notion 의 즉시 라우팅 패턴이 더 합리적). 사용자 의향 반영 결정|
|~~M-5~~|Medium|❌ 결함 아님|—|전역 `scroll-behavior: smooth` — PR1 의 `{ scroll: false }` 18건 일괄 패치로 사실상 자연 해소. 추가 변경 효용 없음|
|~~L-1~~|Low|✅ 해결 (PR1 로 흡수)|PR1 ([#110](https://github.com/BaekKyunShin/KPC-AX-Roadmap-Dashboard/pull/110))|UserManagement 의 `router.replace` 가 C-1 패치로 자연 해결|
|**L-2**|Low|✅ 해결|PR4|`globals.css` 의 `html` 셀렉터에 `scroll-padding-top: var(--sticky-top)` 추가. 기존 디자인 토큰 재사용으로 일관성 확보. 앵커 점프·`scrollIntoView({block:'start'\|'nearest'})` 시 헤더(4rem) 자동 오프셋|
|**L-3**|Low|✅ 회귀 차단|PR4|Radix UI 가 default behavior 로 포커스 복원을 자동 처리하므로 코드 변경 없음. `e2e/scroll-ux/dialog-keyboard-focus-restore.spec.ts` 신규 — 운영관리 > 프로젝트 삭제 다이얼로그를 Enter 로 열고 Escape 로 닫은 후 포커스가 원래 트리거 버튼으로 복원됨을 명시 검증. 미래 Radix 교체·직접 dialog 작성 시 회귀 즉시 감지|
|~~L-4~~|Low|❌ 결함 아님|—|비밀번호 변경 후 `/login` 으로 이동 — 의도된 동작|

### 한눈에 보는 상태

- **해결 완료**: C-1, C-2, H-2, H-3, H-4, L-1, M-2, L-2, L-3 (9건, PR #110·#111·PR3·PR4)
- **결함 아님 확인 (수정 불필요)**: H-1, H-5, M-1, M-3, M-4, M-5, L-4 (7건)
- **잔여**: 0건 — 보고서의 결함 확정 이슈 전부 해소

---

## 0. 요약 (TL;DR)

> **2026-05-17 재검증:** 초안 일부를 사용자 직접 테스트·Next.js 공식 문서·코드 직접 검증으로 정정함.
> ① **H-1(갤러리 뒤로가기)**: 스크롤 복원이 **이미 동작**함. 두 단계 전환은 트레이드오프로 보고 현 상태 유지.
> ② **H-5(`router.refresh()` 14건)**: 공식 문서가 스크롤 위치 유지 명시. **잘못된 분석으로 판정, 수정 불필요.**
> ③ **M-3(`revalidatePath()` 시 폼 스크롤 손실)**: revalidatePath도 router.refresh와 동일한 RSC 머지 메커니즘 → 스크롤 보존. **잘못된 분석으로 판정, 수정 불필요.**
> ④ **H-2(메시지 채팅)**: prepend(과거 메시지 로드)는 잘 처리됨. 결함은 "append 시 사용자 스크롤 위치 미고려" 한 가지로 좁혀짐.
> ⑤ **C-1 카운트 정정**: 14건 → **18건** (UserManagementTable, RoadmapResultClient, PBLResultClient 3건 추가). L-1과 연동 — UserManagement의 스크롤 보존 로직은 `router.refresh` 액션에만 적용되고 필터 변경 `router.replace`(라인 246)에는 미적용.

사용자가 호소한 "버튼 누르면 스크롤이 한 번 올라간 뒤 다음 화면으로 넘어가는 깜빡임" 현상의 **확인된 근본 원인은 한 가지**다.

1. **같은 페이지 내 쿼리 변경(필터·검색·페이지네이션·정렬)에 `{ scroll: false }`가 누락**되어 있어 `router.push/replace`의 기본값(`scroll: true`)이 적용 → 스크롤이 매번 맨 위로 점프 (Next.js v16 공식 동작으로 확인). **총 18건**.

부수적으로 발견된 영향 큰 문제:

- 메시지 채팅창에서 사용자가 위로 스크롤한 상태인데 **새 메시지 append 시 강제 하단 스크롤**(prepend는 정상 처리됨)
- 회원가입 Step1 → Step2 전환 시 **scroll reset 누락**으로 새 폼 상단이 보이지 않음
- 모바일 햄버거 메뉴 열린 상태에서 **body scroll lock 부재** → 배경이 스크롤됨
- `window.location.reload()` 1곳 — `router.refresh()`로 대체 가능

**모범 사례 (이미 올바르게 구현):**
- `src/components/result/ResultTabs.tsx:124` — `router.replace(..., { scroll: false })` 명시 ✓
- `src/components/ops/UserManagementTable.tsx:246, 358` — 스크롤 위치 저장 후 복원 패턴 ✓
- 인증 폼 에러 시 `scrollToFirstError()` — 에러 필드로 자동 스크롤 + 포커스 ✓
- Server Action에서 `redirect()` 사용 0건 — `revalidatePath()` + 클라이언트 후처리 패턴 일관

> **재현 시 공통 준비:** 데스크톱은 1280×800 이상 화면 권장, 모바일 항목은 DevTools의 모바일 에뮬레이션(예: iPhone 14) 또는 실기. 일부 시나리오는 데이터가 "스크롤이 발생할 만큼" 충분히 쌓여 있어야 합니다(부족하면 시드/더미 데이터 추가).

---

## 1. 통계 요약

| API | 총 호출 수 | `{ scroll: false }` 명시 | 의심 케이스 |
|---|---|---|---|
| `router.push` | 29 | 0 | 9 (같은-페이지 쿼리 변경) |
| `router.replace` | 13 | 1 (ResultTabs) | 9 (필터·정렬·URL 정리) |
| `router.refresh` | 14 | — | 0 (재검증 결과 공식 동작 = 스크롤 유지) |
| `router.back` | 1 | — | 1 (폴백 push 시) |
| `window.scrollTo` | 2 | — | 0 (의도적, 올바름) |
| `scrollIntoView` | 7 | — | 1 (RoadmapResultClient·PBLResultClient `?regenerate=open` 타이밍 — PR3 에서 rAF 적용으로 해결) |
| `window.location.reload` | 1 | — | 1 (Critical) |
| `history.pushState/replaceState` | 5 | — | 4 (스크롤 리셋 누락) |
| `<Link>` (47개 파일, 150+ 사용처) | — | 0 | 정상 (기본값 `scroll: true` 적정) |

---

## 2. Critical 이슈 (즉시 수정 필요)

### C-1. 같은 페이지 쿼리 변경 시 `{ scroll: false }` 누락 — 14건 ─ ✅ 해결 (PR1, 2026-05-21)

**현상:** 사용자가 페이지 중간에서 필터·검색·페이지네이션·정렬을 변경하면 **결과를 보기 직전에 스크롤이 맨 위로 점프** → 명백한 깜빡임. 사용자 호소가 정확히 이 패턴.

**위치 & 코드:**

| 파일 | 라인 | 동작 |
|---|---|---|
| [src/app/(dashboard)/notices/_components/NoticeSearchBar.tsx:40](src/app/(dashboard)/notices/_components/NoticeSearchBar.tsx#L40) | 검색어 변경 | `router.push('/notices?...')` |
| [src/app/(dashboard)/notices/_components/NoticeSearchBar.tsx:53](src/app/(dashboard)/notices/_components/NoticeSearchBar.tsx#L53) | 검색 리셋 | `router.push('/notices')` |
| [src/app/(dashboard)/notices/_components/NoticePagination.tsx:25](src/app/(dashboard)/notices/_components/NoticePagination.tsx#L25) | 페이지 변경 | `router.push('/notices?page=...')` |
| [src/app/(dashboard)/gallery/_components/GalleryContent.tsx:132](src/app/(dashboard)/gallery/_components/GalleryContent.tsx#L132) | 필터·정렬 | `router.push('${pathname}?...')` |
| [src/app/(dashboard)/gallery/_components/GalleryContent.tsx:166](src/app/(dashboard)/gallery/_components/GalleryContent.tsx#L166) | 필터 초기화 | `router.push(pathname)` |
| [src/components/gallery/ScopeFilter.tsx:70](src/components/gallery/ScopeFilter.tsx#L70) | scope 변경 | `router.push('${pathname}?...')` |
| [src/components/gallery/TrackFilter.tsx:52](src/components/gallery/TrackFilter.tsx#L52) | track 변경 | `router.push('${pathname}?...')` |
| [src/components/gallery/AdminFilters.tsx:79](src/components/gallery/AdminFilters.tsx#L79) | 관리자 필터 | `router.push('${pathname}?...')` |
| [src/components/gallery/AdminFilters.tsx:94](src/components/gallery/AdminFilters.tsx#L94) | 관리자 필터 리셋 | `router.push(...)` |
| [src/app/(dashboard)/ops/projects/_components/ProjectList.tsx:184](src/app/(dashboard)/ops/projects/_components/ProjectList.tsx#L184) | 필터 변경 | `router.replace(...)` |
| [src/app/(dashboard)/ops/projects/_components/ProjectList.tsx:291](src/app/(dashboard)/ops/projects/_components/ProjectList.tsx#L291) | 필터 리셋 | `router.replace(pathname)` |
| [src/app/(dashboard)/consultant/projects/_components/ProjectList.tsx:284](src/app/(dashboard)/consultant/projects/_components/ProjectList.tsx#L284) | 필터 변경 | `router.replace(...)` |
| [src/app/(dashboard)/consultant/projects/_components/ProjectList.tsx:334](src/app/(dashboard)/consultant/projects/_components/ProjectList.tsx#L334) | 필터 리셋 | `router.replace(pathname)` |
| [src/app/(dashboard)/ops/audit/_components/AuditLogClient.tsx:161](src/app/(dashboard)/ops/audit/_components/AuditLogClient.tsx#L161) | 감사 로그 필터 | `router.replace(...)` |
| [src/app/(dashboard)/ops/audit/_components/AuditLogClient.tsx:224](src/app/(dashboard)/ops/audit/_components/AuditLogClient.tsx#L224) | 감사 로그 리셋 | `router.replace(pathname)` |
| [src/components/ops/UserManagementTable.tsx:246](src/components/ops/UserManagementTable.tsx#L246) | 사용자 관리 필터/검색 변경 | `router.replace(...)` (라인 246 호출에는 scroll 보존 없음 — L-1 참고) |
| [src/app/(dashboard)/consultant/projects/[id]/roadmap/_components/result-v2/RoadmapResultClient.tsx:147](src/app/(dashboard)/consultant/projects/[id]/roadmap/_components/result-v2/RoadmapResultClient.tsx#L147) | `?regenerate=open` 쿼리 정리 | `router.replace(pathname)` |
| [src/app/(dashboard)/consultant/projects/[id]/pbl/_components/result-v2/PBLResultClient.tsx:124](src/app/(dashboard)/consultant/projects/[id]/pbl/_components/result-v2/PBLResultClient.tsx#L124) | `?regenerate=open` 쿼리 정리 | `router.replace(pathname)` |

> **2026-05-17 카운트 정정:** 초안에서 "14건"으로 표기했으나 실제 정확한 수는 **18건**입니다(누락 3건 추가: UserManagementTable, RoadmapResultClient, PBLResultClient). P0 패치 시 18건 모두에 `{ scroll: false }` 추가 필요.

**모범 사례 (이미 올바름):**

- [src/components/result/ResultTabs.tsx:124](src/components/result/ResultTabs.tsx#L124) — 탭 전환 시 `router.replace('?...', { scroll: false })` 명시 ✓

**재현 방법 (대표 5가지 — 하나만 봐도 동일 패턴 확인 가능):**

1. **공지사항 페이지네이션 ─ 가장 두드러짐**
   - 사이드바 > 공지사항 진입 (페이지가 여러 개 있을 정도로 공지가 쌓여 있어야 함)
   - 스크롤을 하단까지 내려 페이지네이션 버튼 "2" 클릭
   - 결과: 클릭 직후 스크롤이 한 번 맨 위로 점프했다가 2페이지 내용이 표시됨 (깜빡임)
2. **공지사항 검색**
   - 사이드바 > 공지사항 → 스크롤을 중간까지 내림 → 상단 검색창에 "테스트" 입력 후 Enter
   - 결과: 결과 표시 직전 스크롤이 맨 위로 점프
3. **갤러리 필터**
   - 갤러리 메뉴 진입 → 카드를 화면 중간쯤 보이도록 스크롤 → 업종/트랙/정렬 필터 변경
   - 결과: 새 결과가 보이기 직전 스크롤이 맨 위로 점프
4. **운영-프로젝트 목록 필터**
   - 운영관리 > 프로젝트 관리 → 스크롤 내림 → 상태/업종 필터 변경
   - 결과: 동일
5. **감사 로그 필터**
   - 운영관리 > 감사 로그 → 스크롤 내림 → 액션 유형/기간 필터 변경
   - 결과: 동일

**비교 — 정상 동작 확인:** 같은 시스템에서 컨설턴트 영역 > 담당 프로젝트 > 프로젝트 상세 > 탭(예: "기업 정보" → "사전 분석") 전환은 스크롤이 점프하지 않음. C-1 패턴이 고쳐지면 모든 필터 변경이 이와 동일하게 동작하게 됨.

**권장 동작:** 같은 페이지 내 쿼리 변경에는 모두 `{ scroll: false }`. 필터 변경 결과를 사용자가 즉시 확인해야 하므로 스크롤 위치 유지가 일반적인 UX 표준(Google, GitHub, Linear 동일).

---

### C-2. `window.location.reload()` 사용 1곳 — 풀 페이지 리프레시 ─ ✅ 해결 (PR1, 2026-05-21)

**위치:** [src/app/(dashboard)/ops/users/_components/RefreshButton.tsx:15](src/app/(dashboard)/ops/users/_components/RefreshButton.tsx#L15)

**현상:** "다시 시도" 버튼이 `window.location.reload()`를 호출 → 모든 클라이언트 상태(스크롤·폼 입력·필터)가 초기화됨.

**재현 방법:**

- 운영관리 > 사용자 관리 페이지를 정상 진입한 뒤, 브라우저 DevTools > Network 탭에서 "Offline"으로 전환하고 새로고침
- 에러 상태에 표시되는 "다시 시도" 버튼을 클릭
- 결과: 페이지가 통째로 리로드되며 (브라우저 탭 상단 로딩 인디케이터까지 도는 풀 리프레시) 스크롤·검색어·필터가 초기화됨

**권장:** `router.refresh()` 또는 Server Action 기반 재조회로 교체.

---

## 3. High 이슈

### ~~H-1. 갤러리 목록 → 상세 → 뒤로가기 시 스크롤 위치 미복원~~ — **현 상태 유지 결정 (2026-05-17)**

> **결정:** 본 항목은 결함이 아닌 트레이드오프로 판단되어 **현 상태 유지**한다. 추후 다른 우선순위 작업에 영향 없음.

**실제 동작 (재검증):** `BackButton`이 `router.back()`을 호출 → 브라우저 native scroll restoration이 활성화되어 **스크롤 위치는 정상적으로 복원됨**. 단, 두 단계로 보임:

1. `router.back()` 직후 RSC 캐시로 페이지 즉시 렌더 → `scrollY=0`에서 시작
2. 콘텐츠(카드·이미지) 안정화 후 native restoration이 이전 위치로 점프

**이 동작의 양면성:**

- 장점: 페이지 상단을 잠깐 보여줘 "갤러리로 돌아왔다"는 컨텍스트 환기, 자동 점프로 클릭 위치까지 안내
- 단점: 점프 시점이 비결정적(콘텐츠 로딩 속도 의존), `prefers-reduced-motion` 사용자에게 불편

**판단 근거:** 사용자 직접 테스트 결과 두 단계 동작이 자연스럽다고 평가. 카드 수가 많지 않고 점프 거리도 짧아 결함으로 보기 어려움.

**향후 재검토 트리거:**

- 갤러리 카드 수가 100개 이상으로 증가
- 모션 멀미·접근성 관련 사용자 보고
- `prefers-reduced-motion` 대응이 정책으로 도입될 때

---

### H-2. 메시지 채팅창 — 새 메시지 append 시 사용자 스크롤 위치 미고려 ✅ 해결 (PR2, 2026-05-21)

**위치:** [src/app/(dashboard)/dashboard/messages/_components/MessageThread.tsx:133-156](src/app/(dashboard)/dashboard/messages/_components/MessageThread.tsx#L133-L156)

> **재검증 (2026-05-17):** 코드가 `currentFirstId === prev` && `currentLastId !== prev` 조건으로 **prepend(과거 메시지 로드)와 append(새 메시지)를 구분**하고 있어, **사용자가 위로 스크롤해 과거 메시지를 로드하는 경우는 이미 스크롤이 유지됨** ✓. 결함은 "append 한 가지 경로"에 한정됨.

**실제 남은 결함:** 새 메시지가 append되면 사용자가 채팅창 위쪽을 읽고 있어도(스크롤이 하단이 아니어도) 무조건 `messagesEndRef.scrollIntoView({ behavior: 'smooth' })`로 끌어내림.

**재현 방법 (계정 2개 필요):**

- 두 개의 브라우저 창(또는 시크릿 창)에서 서로 DM할 수 있는 두 계정으로 로그인 (예: 운영관리자 ↔ 컨설턴트)
- 양쪽에서 메시지 메뉴 진입 → 같은 대화방 선택 → 메시지가 한 화면을 넘어갈 만큼 쌓여 있어야 함 (없으면 한쪽에서 짧은 메시지 20~30개 전송)
- A 창에서 채팅창 안을 위로 스크롤해 과거 메시지 읽기
- B 창에서 짧은 메시지 전송
- 결과 (A 창): 자동으로 채팅창이 하단으로 점프 → 읽고 있던 위치 손실

**권장:** Slack/카카오톡 패턴 — 사용자가 하단 ~100~200px 근처일 때만 자동 스크롤. 위로 올라간 상태면 "새 메시지 N개" 배지만 표시.

---

### H-3. 인증 폼 상태 전환 시 스크롤 리셋 누락 ✅ 해결 (PR2, 2026-05-21)

**위치:**

- 회원가입 Step1 → Step2 전환: [src/app/(auth)/register/page.tsx:204](src/app/(auth)/register/page.tsx#L204) — `setStep(2)` 후 scroll reset 없음
- 비밀번호 재설정 popstate: [src/app/(auth)/reset-password/page.tsx:115-118](src/app/(auth)/reset-password/page.tsx#L115-L118)
- 비밀번호 찾기 popstate: [src/app/(auth)/forgot-password/page.tsx:46-50](src/app/(auth)/forgot-password/page.tsx#L46-L50)

**현상:** 사용자가 Step1 폼 하단(제출 버튼)에서 다음 단계 진입 → Step2 폼 상단(헤더)이 보이지 않음. 비밀번호 메일 발송 완료 메시지도 페이지 상단에 표시되나 스크롤이 그대로 → 메시지를 사용자가 못 봄.

**재현 방법 (3가지):**

1. **회원가입 Step 전환**
   - 로그인 페이지 > "회원가입" 진입 → "컨설턴트" 선택 → Step1 폼의 모든 필드 입력
   - 페이지 하단 "다음" 버튼 클릭
   - 결과: Step2(프로필 작성) 폼으로 바뀌었지만 스크롤은 Step1 하단 그대로 → Step2 상단 헤더/안내문이 화면 위쪽으로 잘려 보이지 않음
2. **비밀번호 찾기 메일 발송**
   - 로그인 페이지 > "비밀번호를 잊으셨나요?" 진입 → 폼 페이지를 스크롤 내림 → 이메일 입력 후 "메일 발송" 클릭
   - 결과: 화면이 "메일 발송 완료" 상태로 바뀌었으나 스크롤은 그대로 → 완료 안내 메시지가 화면 위쪽 밖에 있어 사용자가 못 봄
3. **비밀번호 재설정 완료**
   - 메일 링크로 비밀번호 재설정 페이지 진입 → 폼 입력 후 제출 → 같은 패턴

**권장:** 상태 변경 직후 `window.scrollTo({ top: 0, behavior: 'smooth' })` 추가.

---

### H-4. 모바일 햄버거 메뉴 — body scroll lock 부재 ✅ 해결 (PR2, 2026-05-21)

**위치:** [src/components/Navigation.tsx](src/components/Navigation.tsx) (`isMobileMenuOpen` state 변경 영역)

**현상:** 모바일에서 햄버거 메뉴 펼친 상태로 메뉴 콘텐츠를 스크롤하면 **배경 페이지가 함께 스크롤**됨 — 메뉴 닫고 보면 엉뚱한 위치.

**재현 방법:**

- DevTools 모바일 에뮬레이션(예: iPhone 14) 또는 실제 모바일 기기로 로그인 후 임의 페이지 진입
- 페이지를 어느 정도 스크롤로 내려둠 (현재 위치를 기억)
- 우상단 햄버거 아이콘 탭 → 메뉴 열림
- 메뉴 영역 위에서 손가락을 위/아래로 스와이프
- 결과: 메뉴가 아닌 뒤쪽 페이지가 스크롤됨 → 메뉴를 닫고 보면 처음 기억해뒀던 위치가 아닌 다른 위치에 있음

**권장:**

```tsx
useEffect(() => {
  document.body.style.overflow = isMobileMenuOpen ? 'hidden' : '';
  return () => { document.body.style.overflow = ''; };
}, [isMobileMenuOpen]);
```

---

### ~~H-5. `router.refresh()` 후 스크롤 손실 가능성~~ — **재검증 결과 결함 아님 (2026-05-17)**

**판정:** Next.js v16.2.6 공식 문서 확인 결과, `router.refresh()`는 **스크롤 위치를 유지하는 것이 공식 보장 동작**. 14건의 사용처는 모두 그대로 두어도 무방.

**공식 문서 인용:**

> "The client will merge the updated React Server Component payload **without losing unaffected client-side React (e.g. `useState`) or browser state (e.g. scroll position)**."
> — [next/navigation `useRouter`](https://nextjs.org/docs/app/api-reference/functions/use-router)

**잘못된 분석 사유:** 초안에서 "RSC payload 교체 시 DOM 재배치로 스크롤이 점프"라고 추정했으나, Next.js의 RSC merge는 React 재조정(reconciliation)을 활용해 DOM을 부분 갱신할 뿐 스크롤 위치는 보존됨.

**실제 점프가 사용자에게 보인다면** 원인은 `router.refresh()` 자체가 아니라:

- 같은 핸들러 안에서 `router.refresh()` 직후 `router.push()`·`window.location.reload()`가 함께 호출되는 경우
- Server Component 재렌더링 결과 콘텐츠 높이가 바뀌는 레이아웃 시프트
- Suspense fallback이 잠깐 표시되며 페이지가 짧아졌다 길어지는 경우

위 사례가 실제로 발견되면 그 케이스만 개별 이슈로 다루는 것이 합리적.

---

## 4. Medium 이슈

### ~~M-1. 인터뷰 제출 후 `router.push()` 깜빡임~~ — **결함 아님 재판정 (2026-05-21, PR3)**

**판정:** PR3 진행 중 사용자 의향 + 업계 표준 검토 결과 **결함 아님**.

**판정 근거:**

- sonner 의 Toaster Provider 는 root layout 에 등록되어 페이지 전환 후에도 토스트가 fade-out 까지 자연 표시됨 → "토스트 미인지" 위험 자체가 실재하지 않음
- Linear · Notion · GitHub · Stripe · Slack 등 모던 SaaS 의 표준은 **즉시 라우팅 + 토스트 지속** (Optimistic UI)
- 250~300ms `setTimeout` 지연은 사용자 인지 가능한 답답함만 추가하며 실효 없음
- M-4 와 동일 논리로 결함 아님 판정

**유사 사례 참고:** M-4 (UseRoadmapDialog) 도 같은 논리로 ❌ 결함 아님.

---

### M-2. `RoadmapResultClient` 쿼리 기반 자동 스크롤 타이밍 레이스 ─ ✅ 해결 (PR3, 2026-05-21)

**위치:**

- [src/app/(dashboard)/consultant/projects/[id]/roadmap/_components/result-v2/RoadmapResultClient.tsx](src/app/(dashboard)/consultant/projects/[id]/roadmap/_components/result-v2/RoadmapResultClient.tsx)
- [src/app/(dashboard)/consultant/projects/[id]/pbl/_components/result-v2/PBLResultClient.tsx](src/app/(dashboard)/consultant/projects/[id]/pbl/_components/result-v2/PBLResultClient.tsx)

**현상 (해결 전):** `?regenerate=open` 진입 시 아코디언 펼침 + `scrollIntoView` 호출. **DOM 마운트와 펼침 애니메이션 완료 전에 스크롤이 실행**될 수 있어 부정확한 위치로 스크롤.

**해결 (PR3):** `useEffect` 본문을 `requestAnimationFrame` 으로 감싸 페인트 직후(약 1 프레임 ~16ms 후) `scrollIntoView` 가 실행되도록 보정. `cancelAnimationFrame` cleanup 으로 unmount 안전. 사용자 체감 지연 없음 (1 프레임은 60fps 화면의 인지 불가 단위).

```tsx
useEffect(() => {
  if (!isRegenerateRequested || !accordionRef.current) return;
  const rafId = requestAnimationFrame(() => {
    accordionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    router.replace(pathname, { scroll: false });
  });
  return () => cancelAnimationFrame(rafId);
}, [isRegenerateRequested, router, pathname]);
```

---

### ~~M-3. 같은 페이지 Server Action `revalidatePath` 시 폼 편집 중 스크롤 손실~~ — **재검증 결과 결함 아님 (2026-05-17)**

**판정:** `revalidatePath()`도 `router.refresh()`와 동일한 메커니즘(RSC payload 머지 + React 재조정)으로 클라이언트 갱신이 이루어지므로 **스크롤 위치는 보존됨**. H-5와 같은 오해.

**공식 동작 근거:**

- `revalidatePath()` 자체는 캐시 무효화 API로, "Updates the UI immediately" — 페이지 재마운트가 아님
- 클라이언트 측 갱신 경로는 `router.refresh()`와 공유되며, 그 동작은 공식적으로 "without losing… browser state (e.g. scroll position)" 보장
- 코드 검증 결과 actions.ts에 `window.scrollTo`·`location.reload` 같은 명시적 스크롤 리셋 호출은 없음

**실제 점프가 사용자에게 보인다면** 원인은 `revalidatePath` 자체가 아니라:

- 같은 핸들러에서 동반 호출된 `redirect()`
- 폼 컴포넌트의 `key` prop 변경으로 인한 재마운트
- `<form>` reset, `scrollIntoView` 호출 등 추가 동작
- Server Component 콘텐츠 높이 변화로 인한 레이아웃 시프트

이런 사례가 실제로 발견되면 해당 케이스만 개별 이슈로 다루는 것이 합리적.

---

### M-4. `UseRoadmapDialog` 토스트와 즉시 라우팅 겹침

**위치:** [src/components/gallery/UseRoadmapDialog.tsx:82](src/components/gallery/UseRoadmapDialog.tsx#L82)

**현상:** 갤러리 "이 로드맵 사용하기" → 토스트 + 즉시 `router.push('.../roadmap')` → 사용자가 성공 메시지를 읽기 전에 페이지가 전환됨.

**재현 방법 (컨설턴트 계정):**

- 갤러리 메뉴 진입 → 임의 카드 클릭 → 상세 페이지에서 "이 로드맵 사용하기" 클릭
- 다이얼로그가 열리면 대상 프로젝트 선택 후 "가져오기" 클릭
- 결과: 성공 토스트가 잠깐 보이려는 찰나에 새 프로젝트 로드맵 페이지로 전환되어 메시지 내용을 읽을 시간이 없음

**권장:** 토스트 표시 후 1~1.5초 지연 후 라우팅, 또는 새 페이지에서 동일 토스트 재표시.

---

### M-5. 전역 `scroll-behavior: smooth` 영향

**위치:** [src/app/globals.css:213](src/app/globals.css#L213)

**현상:** 모든 프로그래밍 스크롤 호출에 smooth가 적용되어, `router.push`로 인한 자동 scroll reset도 smooth로 보임 → "스크롤이 한 번 올라간 뒤 화면 전환" 현상의 한 원인.

**재현 방법:**

- 위 C-1 사례 중 하나를 그대로 재현 (예: 운영관리 > 프로젝트 관리에서 스크롤 내림 → 상태 필터 변경)
- 결과: 스크롤이 단순한 즉시 점프가 아니라 "위로 미끄러져 올라가는" 짧은 애니메이션으로 보임 → 사용자에게 "잠깐 스크롤이 움직였다"는 더 강한 인상을 줌

**권장:** 페이지 전환·필터 변경에는 instant, 앵커 점프·명시적 `scrollToPageTop`에만 smooth. CSS 전역 대신 호출 지점에서 명시.

---

## 5. Low 이슈

### L-1. 사용자 관리 페이지의 스크롤 복원 — `router.refresh` 액션에만 적용

**위치:** [src/components/ops/UserManagementTable.tsx:340, 353-361, 375](src/components/ops/UserManagementTable.tsx#L340)

**재검증 결과 (2026-05-17):** `scrollPositionRef` + `useLayoutEffect` + `requestAnimationFrame` 패턴은 **라인 375의 `router.refresh()` 액션(사용자 역할 변경 등) 후에만 적용**됨. **같은 파일 라인 246의 필터/검색 `router.replace` 호출에는 스크롤 보존 로직이 없음** — 따라서 라인 246 자체는 C-1의 18건 중 하나로 분류됨.

**현재 동작 정리:**

- ✓ **역할 변경·승인 등 데이터 변경 액션 후:** scrollY 저장 → router.refresh → useLayoutEffect로 복원 (잘 동작)
- ✗ **필터/검색어 변경 시:** router.replace만 호출, scrollY 보존 없음 → C-1 수정(`{ scroll: false }` 추가)이 필요

**다른 리스트 페이지와의 일관성:** 다른 리스트(ops/projects, consultant/projects, audit)는 router.refresh 후 스크롤 보존 로직 자체가 없음. 다만 이는 **C-1 수정으로 router.replace에 `{ scroll: false }`를 일괄 추가하면 대부분 해결**됨 (필터/페이지네이션은 페이지 재요청 없이 데이터만 갱신되는 패턴이라 스크롤도 자연 보존).

**권장:**

- **단기:** C-1 패치(`{ scroll: false }` 18건 일괄) 적용 후 사용자 체감 검증
- **장기:** router.refresh 액션 후 스크롤 복원을 원하는 페이지가 늘어나면 `useScrollRestoration` 공용 훅으로 추출

---

### L-2. `Sticky` 헤더의 `scroll-padding-top` 누락 ─ ✅ 해결 (PR4, 2026-05-21)

**위치:** [src/app/globals.css](src/app/globals.css), [src/components/Navigation.tsx](src/components/Navigation.tsx) (sticky `top-0`, h-16)

**현상 (해결 전):** `<a href="#section">` 앵커 점프 또는 `scrollIntoView()` 호출 시 sticky 헤더(4rem) 가 대상 요소를 가림.

**해결 (PR4):** `globals.css` 의 `html` 셀렉터에 `scroll-padding-top: var(--sticky-top)` 한 줄 추가. 기존 미사용 디자인 토큰 `--sticky-top: 4rem` 재사용으로 일관성 확보. `scrollIntoView({block:'start'|'nearest'})` · 앵커 점프 시 브라우저가 자동으로 헤더 높이만큼 오프셋 보정.

```css
html {
  scroll-behavior: smooth;
  scroll-padding-top: var(--sticky-top);
}
```

`scrollIntoView({block:'center'})` 호출처는 영향 없음 (M-2 의 `RegenerateAccordion` 등).

---

### L-3. 다이얼로그 닫은 뒤 트리거 포커스/스크롤 복원 ─ ✅ 회귀 차단 (PR4, 2026-05-21)

**위치:** Radix UI 기반 Dialog/AlertDialog 사용 전반

**판정:** Radix UI 가 default behavior 로 포커스 복원을 자동 처리 (Radix UI 1.1.15 공식 동작). 현재 동작 정상 → 코드 변경 불필요.

**해결 (PR4):** E2E 회귀 차단 spec 신규 — [e2e/scroll-ux/dialog-keyboard-focus-restore.spec.ts](e2e/scroll-ux/dialog-keyboard-focus-restore.spec.ts). 운영관리 > 프로젝트 관리의 삭제 다이얼로그를 대상으로 다음 시나리오 검증:

1. 트리거 버튼에 키보드 포커스 → 활성 element 확인
2. `Enter` 로 다이얼로그 열기 → `alertdialog` role 노출 확인
3. `Escape` 로 닫기 → 다이얼로그 사라짐 확인
4. 활성 element 가 **원래 트리거 버튼과 동일** 임을 명시 검증

미래에 Radix 를 다른 라이브러리로 교체하거나 직접 dialog 를 작성할 때 포커스 복원이 깨지면 CI 에서 즉시 fail.

---

### L-4. 비밀번호 변경 후 `router.replace` 시 스크롤

**위치:** [src/app/(dashboard)/dashboard/settings/_components/PasswordChangeSection.tsx:118](src/app/(dashboard)/dashboard/settings/_components/PasswordChangeSection.tsx#L118)

**현상:** 비밀번호 변경 → `/login` 로 `router.replace`. 새 페이지로 가는 것이므로 스크롤 리셋이 자연스러움 — 의도된 동작.

**재현 방법:** 사이드바 > 설정 > 비밀번호 변경에서 현재/새 비밀번호 입력 후 저장 → 로그인 페이지로 이동 (스크롤 맨 위, 정상). 재현은 가능하나 수정 불필요.

**판정:** 문제 없음 (참고용 기록).

---

## 6. 영역별 발견 사항 요약

| 영역 | Critical | High | Medium | Low | 비고 |
|---|---|---|---|---|---|
| 갤러리 | 6 (C-1) | — | 1 (M-4) | 1 (H-1 격하) | H-1: 트레이드오프, 현 상태 유지 |
| 공지사항 | 3 (C-1) | — | — | — | H-5·M-3은 재검증 결과 결함 아님 |
| 프로젝트(ops) | 2 (C-1) | — | — | — | — |
| 프로젝트(consultant) | 4 (C-1) | — | 2 (M-1, M-2) | — | RoadmapResultClient·PBLResultClient 라인 추가 |
| 감사 로그 | 2 (C-1) | — | — | — | — |
| 사용자 관리 | 1 (C-1) | — | — | 1 (L-1) | router.refresh 후 복원은 잘 동작, replace 누락만 결함 |
| 템플릿 | — | — | — | — | M-3 격하로 제외 |
| 배정 | — | — | — | — | — |
| 메시지(DM) | — | 1 (H-2 축소) | — | — | append 시 사용자 위치 미고려에 한정 |
| 인증(auth) | — | 1 (H-3) | — | 1 (L-4) | — |
| 글로벌(layout/CSS/Nav) | 1 (C-2) | 1 (H-4) | 1 (M-5) | 2 (L-2, L-3) | — |

---

## 7. 모범 사례 (이미 잘 되어 있는 곳, 참고용)

| 사례 | 위치 | 비고 |
|---|---|---|
| 탭 전환 `scroll: false` | [src/components/result/ResultTabs.tsx:124](src/components/result/ResultTabs.tsx#L124) | C-1 수정 시 동일 패턴 적용 |
| 스크롤 위치 저장/복원 | [src/components/ops/UserManagementTable.tsx:246, 358](src/components/ops/UserManagementTable.tsx#L246) | 공용 훅으로 추출 권장 |
| 폼 에러 첫 필드 자동 스크롤 + 포커스 | [src/lib/utils/scroll.ts:43](src/lib/utils/scroll.ts#L43) | 이미 폼 전반에 적용 |
| Server Action `redirect()` 미사용 | 모든 actions.ts (총 0건) | redirect 대신 ActionResult + 클라이언트 후처리 |
| 홈 링크 instant 스크롤 | [src/components/landing/sections/NavbarClient.tsx:203](src/components/landing/sections/NavbarClient.tsx#L203) | smooth 대신 instant — 사용자 의도와 일치 |

---

## 8. 권장 정책 (스크롤 UX 가이드라인 초안)

향후 신규 코드 작성·리뷰 기준으로 채택을 권장.

### 8.1 라우터 호출 시 `scroll` 옵션 정책

| 상황 | API & 옵션 | 사유 |
|---|---|---|
| **같은 페이지** 내 쿼리 변경 (필터·정렬·페이지네이션·탭) | `router.push/replace(url, { scroll: false })` | 사용자는 변경 결과를 즉시 보길 원함 |
| **다른 라우트**로 이동 (목록 → 상세, 폼 → 결과) | `router.push(url)` (기본값 `scroll: true`) | 새 페이지는 상단에서 시작 |
| 데이터 변경 후 같은 페이지 갱신 | `router.refresh()` 호출 (공식적으로 스크롤 유지됨) | RSC merge는 React 재조정으로 부분 갱신, 스크롤 위치 보존 — 공식 보장 동작 |

### 8.2 Server Action 패턴

| 상황 | 패턴 |
|---|---|
| 리스트 페이지에서 행 액션 (삭제·토글) | `revalidatePath(listPath)` — Next.js 공식적으로 스크롤 위치 보존됨 |
| 상세/편집 페이지에서 부분 변경 | 동일하게 `revalidatePath()` 또는 ActionResult로 갱신 데이터 반환 — 스크롤 보존 동작은 같음 |
| 생성 후 상세 페이지로 이동 | `router.push(newDetailPath)` (기본값 scroll: true) |

> Note: `revalidatePath`·`router.refresh`는 RSC payload 머지 + React 재조정 메커니즘으로 클라이언트 상태(useState·scrollY)를 보존합니다. 폼 재마운트나 `key` prop 변경이 없는 한 스크롤은 잃지 않습니다.

### 8.3 명시적 스크롤 호출 정책

| 상황 | 호출 |
|---|---|
| 폼 검증 실패 | `scrollToFirstError()` + 첫 에러 필드 `focus()` |
| 회원가입 Step 전환 | `setStep(n)` 직후 `window.scrollTo({ top: 0, behavior: 'smooth' })` |
| 채팅창 새 메시지 도착 | 사용자가 하단 200px 내일 때만 자동 스크롤, 그 외에는 "새 메시지 N개" 배지 |
| 다이얼로그 닫은 후 | Radix UI 자동 처리 신뢰 (필요 시 E2E로 검증) |

### 8.4 글로벌 CSS

```css
html {
  scroll-padding-top: 4rem;       /* sticky 헤더 높이 */
  /* scroll-behavior: smooth 제거 검토 — 호출 지점에서 명시 */
}
```

### 8.5 모바일

```tsx
useEffect(() => {
  document.body.style.overflow = isMobileMenuOpen ? 'hidden' : '';
  return () => { document.body.style.overflow = ''; };
}, [isMobileMenuOpen]);
```

---

## 9. 우선순위별 수정 권고

| 우선순위 | 항목 | 예상 작업량 | 사용자 체감 효과 |
|---|---|---|---|
| ~~**P0**~~ ✅ | C-1: 같은 페이지 쿼리 변경 **18건**에 `{ scroll: false }` 일괄 추가 — **PR1 (2026-05-21) 완료**. 실제 패치: 헬퍼 함수 단위 18곳 + 동일 패턴 추가 발견 5곳 = 19곳. E2E 17개 신규. | 40분 | **매우 큼** — 사용자 호소 직접 해결 |
| ~~**P0**~~ ✅ | C-2: `window.location.reload()` → `router.refresh()` 1건 — **PR1 (2026-05-21) 완료**. | 5분 | 작음 (드물게 발생) |
| ~~**P1**~~ | ~~H-4: 모바일 햄버거 메뉴 body scroll lock~~ | ~~10분~~ | ✅ 해결 (PR2, 2026-05-21) |
| ~~**P1**~~ | ~~H-3: 회원가입 Step1 → Step2 / 비밀번호 페이지 popstate 후 scroll reset~~ | ~~20분~~ | ✅ 해결 (PR2, 2026-05-21) |
| ~~**P2**~~ | ~~H-2: 메시지 채팅 — append 시 사용자 위치 고려 가드 추가~~ | ~~1시간~~ | ✅ 해결 (PR2, 2026-05-21) |
| ~~**P2**~~ | ~~M-2: RoadmapResultClient/PBLResultClient 자동 스크롤 타이밍 (`requestAnimationFrame`)~~ | ~~15분~~ | ✅ 해결 (PR3, 2026-05-21) |
| ~~**P3**~~ | ~~L-2: `scroll-padding-top: var(--sticky-top)` 추가~~ | ~~5분~~ | ✅ 해결 (PR4, 2026-05-21) |
| ~~**P3**~~ | ~~L-3: Radix UI Dialog 키보드 포커스 복원 회귀 차단 E2E~~ | ~~30분~~ | ✅ 회귀 차단 (PR4, 2026-05-21) |
| ~~H-1~~ | 갤러리 뒤로가기 — **현 상태 유지 결정** | — | — |
| ~~H-5~~ | `router.refresh()` 14건 — **재검증 결과 결함 아님** | — | — |
| ~~M-1~~ | 인터뷰 제출 깜빡임 — **결함 아님 재판정 (PR3, sonner Toaster 가 페이지 전환 후에도 토스트 유지 + 업계 표준 즉시 라우팅)** | — | — |
| ~~M-3~~ | `revalidatePath()` 시 폼 스크롤 손실 — **재검증 결과 결함 아님** | — | — |
| ~~M-4~~ | UseRoadmapDialog 토스트 → 라우팅 지연 — **결함 아님 재판정 (즉시 라우팅이 표준)** | — | — |
| ~~M-5~~ | 전역 `scroll-behavior: smooth` — **C-1 패치(PR1)로 사실상 자연 해소** | — | — |
| ~~L-1~~ | 사용자 관리 스크롤 복원 — **router.refresh에는 잘 동작, C-1로 흡수** | — | — |

---

## 10. 다음 단계 제안

1. **P0 일괄 패치 PR** — C-1 14건 + C-2 1건을 한 PR로. 단순 옵션 추가이므로 리뷰 부담 적고 효과 큼. 사용자 검토 게이트 권장.
2. **P1 묶음 PR** — H-3·H-4 묶기.
3. **P2/P3 별도 PR** — 메시지·인터뷰 등은 각각 영향 범위가 달라 분리.
4. **회귀 테스트** — 각 PR마다 다음 시나리오 Playwright 보강 권장:
   - 목록 페이지 중간에서 필터 변경 → 스크롤 위치 유지 확인
   - 폼 페이지 하단에서 제출 성공 → 다음 페이지 상단에서 시작 확인
   - 모바일 햄버거 메뉴 열고 메뉴 스크롤 → 배경 미스크롤 확인

---

**조사 종료.** 사용자 검토 후 수정 범위·우선순위를 확정해 주시면 P0 패치부터 착수합니다.
