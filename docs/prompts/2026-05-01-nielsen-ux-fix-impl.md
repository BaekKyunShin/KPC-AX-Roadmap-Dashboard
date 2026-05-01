# Nielsen UX 감사 보고서 8개 이슈 일괄 해결 — Implementation Prompt

> **입력 보고서:** `docs/reports/2026-04-30-nielsen-heuristics-audit.md`
> **작업 모드:** Plan Mode (반드시 EnterPlanMode 후 사용자 승인 → ExitPlanMode → 구현)
> **목표:** 보고서 #1~#8 이슈를 한 세션 내에 모두 해결. 잔여 작업 누적 추정 ≈ 4시간.
> **언어:** 모든 응답·커밋 메시지·PR 제목·코드 주석은 **한국어**.

---

## 0. 시작 시 반드시 지킬 것

1. **첫 응답에서 EnterPlanMode 진입.** 사용자 요구가 "차근차근 단계별로 꼼꼼히"이므로 코드 수정 전 plan 파일을 작성하고 승인을 받는다.
2. **보고서를 정확히 따른다.** `docs/reports/2026-04-30-nielsen-heuristics-audit.md`의 각 이슈 "현 상태(2026-05-01)" 라벨과 "잔여 작업"을 정독해, 부분 해결 3건(#2·#7·#8)은 **이미 적용된 부분을 중복 수정하지 말 것.**
3. **TDD 전면 적용** (CLAUDE.md 전역 지침). 코드 변경이 있는 이슈는 테스트 먼저(RED) → 구현(GREEN) → 리팩토링.
4. **한국어 답변**. 모든 사용자 가시 텍스트(토스트·다이얼로그·툴팁·페이지)도 한국어.
5. **작업 완료 전 반드시 `superpowers:verification-before-completion` 호출** 후 `npm run validate && npm run build` 통과 확인.
6. **🔒 애매한 사양 · UI 가시 변경은 사전 승인 필수** — 보고서에 정확히 명시되지 않은 모든 결정(라벨 문구 조정 · 색상 토큰 · 아이콘 선택 · 레이아웃 변형 · 새 컴포넌트 도입 · 기존 패턴 변경 등)은 **즉시 멈추고 `AskUserQuestion`으로 사용자에게 확인**한다. 추측으로 진행하지 말 것. 보고서 §"사용자 관점 개선 후"의 문구는 그대로 사용 가능 — 그 외의 결정은 모두 승인 대상이다.

---

## 1. 적극 활용할 MCP·Skill·서브에이전트

### MCP

| MCP | 본 작업에서의 용도 |
|---|---|
| **serena** | `find_symbol`·`find_referencing_symbols`·`replace_symbol_body`로 `editInterviewFieldRoadmap` 호출 3곳, `confirmFinalRoadmap` 콜백 등 정확한 심볼 단위 편집 |
| **context7** | shadcn `AlertDialog`·`Tooltip`, Next.js `error.tsx` 시그니처, Sonner toast description prop 최신 문서 조회 |
| **shadcn** | `AlertDialog`·`Tooltip` 미설치 시 `get_add_command_for_items`로 추가 |
| **puppeteer** | #2 AlertDialog 노출, #4 EmptyState 렌더, #5 error.tsx 트리거, #8 Navigation 툴팁 등 시각 변경 수동 검증 |
| **supabase** | (참고용) 본 작업은 DB 마이그레이션 없음 |

### 프로젝트 Skill (해당 영역 작업 시 반드시 호출)

| Skill | 적용 이슈 |
|---|---|
| `frontend-guide` | #2(AlertDialog)·#4(EmptyState 통일)·#5(error.tsx)·#6(인라인 알림)·#8(Tooltip) — UI 컴포넌트 작성 |
| `check-server-action` | #1 — `actions.ts` 4곳 수정 시 5단계 패턴 회귀 점검 |
| `web-design-guidelines` | UI 변경 후 접근성·UX 감사 |
| `react-best-practices` | 전반적 React 19 / Next.js 16 패턴 점검 |
| `composition-patterns` | #2 AlertDialog open state 관리 시 컴포지션 검토 |
| `refactoring` | 각 이슈 GREEN 직후 리팩터링 단계 |

### Superpowers Skill (프로세스 가이드)

- `superpowers:writing-plans` — Plan 파일 작성 시
- `superpowers:executing-plans` — Plan 승인 후 단계별 실행
- `superpowers:test-driven-development` — 모든 코드 변경 이슈
- `superpowers:dispatching-parallel-agents` — 의존성 없는 이슈 병렬 처리 가능 시
- `superpowers:subagent-driven-development` — 8개 이슈를 순차 처리할 때도 일부 위임 활용
- `superpowers:systematic-debugging` — 회귀 발생 시
- `superpowers:verification-before-completion` — 작업 완료 직전 필수
- `superpowers:requesting-code-review` — 8개 이슈 모두 종료 후 자체 리뷰

### 커스텀 서브에이전트

| 에이전트 | 용도 |
|---|---|
| `Explore` | 작업 전 영향 범위 파악 (예: `confirmFinalRoadmap` 호출처 전수 확인) |
| `test-automator` | #1·#3·#7 등 테스트 시나리오 설계·작성 |
| `performance-engineer` | (선택) 본 변경이 번들·렌더링에 영향을 주는지 점검 |
| `superpowers:code-reviewer` | 8개 이슈 종료 후 PR 직전 자체 코드 리뷰 |

> **`frontend-design` 플러그인은 사용 금지** (B2B 대시보드에 부적합 — MEMORY.md 명시). UI 작업은 `frontend-guide`만 사용.

---

## 2. 단계별 진행 절차 (꼼꼼히 단계별로)

### Step 1 — Plan 작성 (EnterPlanMode)

1. 보고서를 다시 읽고, 8개 이슈의 잔여 작업·파일 경로를 plan 파일에 정확히 옮긴다.
2. **의존성·충돌 분석**: 8개 이슈 중 동일 파일을 건드리는 것이 있는지 확인. 본 보고서 기준으로는 모두 별도 파일이지만, `EmptyState` 신규 사용 패턴(#4·#6)은 import 동일 컴포넌트를 공유.
3. **순차 처리 권장 순서**(보고서 §"한 세션 작업 권장 순서" 그대로):
   1. #2 window.confirm → AlertDialog 교체 (20분)
   2. #1 Zod 다중 메시지 actions.ts 4곳 (60분)
   3. #5 글로벌 error.tsx 신규 (30분)
   4. #4 빈 목록 EmptyState 통일 3개 라우트 (45분)
   5. #6 ops/users DB 에러 인라인 (30분)
   6. #3 beforeunload + 저장 상태 배지 (30분)
   7. #7 편집 성공 토스트 두 줄 — 잔여 ① (10분)
   8. #8 Navigation 비활성 아이콘 Tooltip — 잔여 ② (15분)
4. plan 파일에 각 이슈의 **TDD 테스트 전략**을 적는다 (예: #1 → `actions.test.ts` 4곳에 다중 검증 실패 케이스 추가).
5. ExitPlanMode → 사용자 승인 대기.

### Step 2 — 의존 컴포넌트 사전 준비

- shadcn `AlertDialog`·`Tooltip` 컴포넌트가 이미 있는지 `ls src/components/ui/`로 확인 (보고서 §재사용 자산 표 기준 모두 있음 — 누락 시 `mcp__shadcn__get_add_command_for_items` 사용).
- `src/components/ui/EmptyState.tsx`의 props 시그니처 재확인 (`icon`/`title`/`description`/`action`).
- `src/lib/utils/toast.ts`의 `showSuccessToast(title, description?)` 시그니처 확인.

### Step 3 — 이슈별 구현 (한 번에 한 이슈 완료)

각 이슈에 대해 다음 순서를 반드시 지킨다:

1. **TodoWrite/TaskCreate** — 이슈를 in_progress로 표시.
2. **Skill 호출** — 위 표의 해당 Skill을 먼저 호출(예: UI 작업 시 `frontend-guide`).
3. **🔒 UI 변경 · 애매 사양 확인 게이트** — 본 이슈가 화면에 가시 변경을 만들거나 보고서에 명시되지 않은 디테일을 결정해야 한다면 **여기서 멈춘다**. 결정해야 할 항목(라벨 문구·variant·아이콘·색상·레이아웃 등)을 정리해 `AskUserQuestion`으로 사용자 승인을 받는다. 승인된 안만 다음 단계로 진행. 보고서 §"사용자 관점 개선 후"가 모두 명시한 경우에는 통과 가능.
4. **Explore (필요 시)** — 영향 범위 파악(예: `confirmFinalRoadmap` 호출처 전수 grep).
5. **테스트 작성 (RED)** — 실패하는 테스트부터.
6. **구현 (GREEN)** — 보고서의 잔여 작업·코드 예시 그대로 적용. **부분 해결 항목은 잔여 부분만 건드릴 것.**
7. **리팩토링** — `refactoring` Skill 가이드.
8. **단위 검증** — `npm run typecheck && npm run lint && npm run test -- <변경된 테스트>` 통과.
9. **🔒 시각 검증 (UI 이슈) — 사용자 시연 + 승인** — puppeteer로 스크린샷을 찍거나 사용자에게 dev server 실행 동선을 안내해 **가시 변경 결과를 직접 확인받는다.** 사용자가 OK 한 후에만 커밋.
10. **커밋** — 한국어 메시지, 1 이슈 1 커밋 권장. 예: `fix: 로드맵 최종 확정 다이얼로그 shadcn AlertDialog 적용 (#2)`.
11. **TaskUpdate completed**.

### Step 4 — 통합 검증 (8개 모두 종료 후)

- `npm run validate` (typecheck + lint + test) 통과
- `npm run build` 통과
- 보고서 §"검증 체크리스트" 8개 항목을 puppeteer로 모두 시연하거나, 사용자에게 dev server 실행 후 동선 안내
- 부분 해결 3건(#2·#7·#8)의 **기존 부분 회귀** 확인 (예: #2의 기존 `window.confirm` 메시지가 더는 호출되지 않는가, #7 stale banner가 여전히 노출되는가, #8 PendingApprovalCard 본문이 그대로인가)
- `superpowers:verification-before-completion` 호출

### Step 5 — 자체 코드 리뷰 + PR

1. `superpowers:requesting-code-review` 호출 또는 `superpowers:code-reviewer` 서브에이전트 dispatch.
2. 리뷰 피드백 반영.
3. PR 제목 예시: `feat(ux): Nielsen 휴리스틱 감사 보고서 8개 critical 이슈 일괄 해결`
4. PR 본문에:
   - 보고서 인용 (`docs/reports/2026-04-30-nielsen-heuristics-audit.md`)
   - 8개 이슈 체크리스트 (보고서 §"검증 체크리스트" 그대로)
   - 부분 해결 3건은 "잔여 작업만 처리"임을 명시
   - 시각 변화 스크린샷 (가능 시)
5. CI 모든 check pass 까지 확인 (Lint & Typecheck · Unit Test · Build · **E2E Test** · Vercel) — Unit Test만 보고 통과 단정 금지(CLAUDE.md 규칙).

---

## 3. 이슈별 잔여 작업 요약 (보고서 발췌 — 빠른 참조용)

| # | 위치 | 잔여 작업 한 줄 | 추정 |
|---|---|---|---|
| 1 | `interview/actions.ts:190·677·1017·1193` | 4곳 모두 `errors.map(...).slice(0, 5).join('\n')` 패턴으로 변경 | 60분 |
| 2 | `result-v2/RoadmapResultClient.tsx:159-166` | `window.confirm` 제거 → shadcn `AlertDialog`(destructive) 도입 | 20분 |
| 3 | `RoadmapInterviewClient.tsx` | `beforeunload` 핸들러 등록 + StickyFormNav에 `saveState` 배지 렌더 | 30분 |
| 4 | `UserManagementTable.tsx:369·382` + Templates·ProjectsList | 빈 상태 텍스트 → `EmptyState` + action 버튼 통일 | 45분 |
| 5 | `src/app/(dashboard)/error.tsx` (신규) | Client Component, 한글 안내 + reset 버튼 | 30분 |
| 6 | `ops/users/page.tsx:60-65` | `usersError`/`profilesError` 분기에 `EmptyState` + RefreshButton 인라인 표시 | 30분 |
| 7 (잔여 ①) | `InterviewReviewClient.tsx:470·501·534` | `handleSave` success 분기에 두 줄 `showSuccessToast` 추가 | 10분 |
| 8 (잔여 ②) | `Navigation.tsx:208-210, 240~330` | 비활성 분기에 disabled 아이콘 + shadcn `Tooltip` "승인 후 사용 가능" 부착 | 15분 |

> 자세한 사용자 시나리오·개선 후 화면·코드 예시는 보고서 본문 참조.

---

## 4. 진행 중 준수 사항

### 코드 품질

- Server Action(`#1`) 수정 시 5단계 패턴(세션 → 역할 → Zod → 비즈니스 → ActionResult) 회귀 없음을 `check-server-action` Skill로 점검.
- 클라이언트 컴포넌트 신규 생성(`#5`) 시 `'use client'` 지시문 명시.
- 새로 추가하는 토스트·라벨·툴팁 텍스트는 모두 한국어. 보고서가 명시한 정확 문구 사용 권장 (예: "수정되었습니다 / 결과 탭에서 '다시 생성' 버튼을 눌러야 반영됩니다").

### 회귀 방지

- 보고서 §재사용 자산 표의 기존 자산만 사용. 신규 컴포넌트 추가 금지(필요 시 사용자 확인).
- 부분 해결 3건은 잔여 작업만 — `window.confirm` 제거 시 #2 의 기존 메시지 의도("이전 확정본은 아카이브됩니다")를 AlertDialog 본문에 보존.
- `frontend-design` 플러그인 사용 금지.

### 🔒 사용자 사전 승인 (애매한 것 · UI 변경 시)

본 작업은 8개 이슈 모두 어떤 식으로든 화면에 가시 변경을 만든다. 다음 상황이 발생하면 **즉시 멈추고 `AskUserQuestion`으로 사용자 결정을 받은 후 진행**:

- **라벨 문구가 보고서에 정확히 명시되지 않은 경우** — 보고서 §"사용자 관점 개선 후"의 따옴표 안 문구를 그대로 쓸 수 있으면 통과. 토씨라도 다른 안이 필요하면 확인.
- **색상·variant 결정이 명확하지 않은 경우** — 예: #2 AlertDialog의 destructive 빨간색은 보고서 명시 → 통과. 다만 프로젝트 디자인 토큰이 amber 톤으로 통일돼 보이면 승인 필요.
- **아이콘 선택** — 보고서가 `AlertTriangle`처럼 명시한 경우만 통과. 외 모든 아이콘은 후보 2~3개 제시 후 승인.
- **레이아웃 변경** — 보고서가 그리지 않은 화면 구조 변경(예: PendingApprovalCard 위치 이동 등)은 금지에 가까움 — 사용자 확인.
- **새 컴포넌트 도입** — 원칙적으로 금지. 정말 필요하면 후보·이유·대안을 정리해 승인 받기.
- **기존 패턴 변경** — 예: 토스트 표시 방식 자체 변경, 라우팅 구조 변경 등 → 승인 필수.
- **시각 변경 결과 시연** — Step 3의 단계 9에서 puppeteer 스크린샷 또는 dev server 안내로 사용자가 직접 확인하도록 한다. **사용자 OK 없이 커밋 금지**.

판단이 애매하면 "확인 받는 쪽"을 디폴트로 한다. 추가 한 번의 질문이 잘못된 변경 후 롤백보다 훨씬 싸다.

### 커밋·PR 규칙 (CLAUDE.md)

- 한국어 커밋 메시지, type(scope): 형식.
- 1 이슈 1 커밋 권장. 예:
  - `fix: 로드맵 최종 확정 다이얼로그 shadcn AlertDialog 적용 (#2)`
  - `fix: 인터뷰 폼 Zod 검증 다중 에러 메시지 표시 (#1)`
  - `feat: 글로벌 error.tsx 에러 바운더리 추가 (#5)`
  - `feat: 운영관리 빈 목록 EmptyState 통일 (#4)`
  - `fix: 운영관리 사용자 DB 에러 인라인 알림 (#6)`
  - `feat: 인터뷰 자동저장 beforeunload 경고 + 저장 상태 배지 (#3)`
  - `feat: 인터뷰 검토 편집 성공 토스트 강화 (#7)`
  - `feat: 헤더 비활성 아이콘 Tooltip "승인 후 사용 가능" (#8)`
- PR 제목도 동일 컨벤션 (Squash merge로 main 커밋 메시지가 됨).

### TDD 예외

- #5(error.tsx)는 Next.js 표준 시그니처라 단위 테스트 가치 낮음 → 일회성 프로토타입 예외. 단 시각 검증은 puppeteer로 throw 시 노출 확인.
- #8(Tooltip 부착)도 정적 마크업 변경에 가까워 단위 테스트 생략 가능. 단 RTL `getByRole('tooltip')` 정도는 권장.
- 그 외 모든 이슈는 TDD 적용.

---

## 5. 완료 정의 (Definition of Done)

다음을 **모두** 만족해야 작업 종료로 본다:

- [ ] 보고서 §검증 체크리스트 8개 항목 모두 ✅
- [ ] `npm run validate` 통과
- [ ] `npm run build` 통과
- [ ] 부분 해결 3건의 기존 충족 부분이 회귀 없이 동작
- [ ] PR 생성 후 CI 모든 check pass (Lint & Typecheck · Unit Test · Build · E2E Test · Vercel) — `gh pr checks <PR>` 출력 전체 확인
- [ ] `superpowers:verification-before-completion` 호출 후 사용자 보고

---

## 6. 시작 메시지 (이 프롬프트 사용 시 첫 응답 템플릿)

이 프롬프트로 새 세션을 시작할 때 첫 응답은 다음을 포함해야 한다:

1. 보고서 읽기 — `docs/reports/2026-04-30-nielsen-heuristics-audit.md`
2. EnterPlanMode 진입
3. plan 파일에 §2 Step 1의 모든 항목 명시 (의존성 분석·순차 순서·이슈별 TDD 전략)
4. ExitPlanMode → 승인 대기

코드 수정은 사용자 승인 이후 시작.
