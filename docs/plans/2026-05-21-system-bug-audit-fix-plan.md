# 시스템 전수 버그 감사 결함 해결 계획서

> **📌 정본 정책:** 본 계획서는 **실행 세션이 따르는 정본**이다. 보고서(`docs/reports/2026-05-21-system-bug-audit.md`)는 시작 시점 스냅샷·결함 추적용이며, 실행 가이드(재현 경로·수정 후 동작·기술 변경)에서 차이가 있을 경우 **본 계획서가 우선**한다. 실행 세션이 결함을 해결하면 계획서 본문은 그대로 두고, 보고서의 §1 표만 🔴 OPEN → 🟢 RESOLVED 로 갱신한다.
>
> 작성일: 2026-05-21
> 입력 보고서: `docs/reports/2026-05-21-system-bug-audit.md` (재검증 후 P1 5건 · P2 10건 · P3 3건 · 보안 잠재 5건 · 테스트 사각 5건)
> 본 계획서는 **승인 후 별도 세션**에서 실행되어야 함. 본 세션의 산출물은 보고서 + 본 계획서까지.

---

# 조건 (사용자 명시 — 그대로 인용)

1. 여기서 해결해야 할 부분 제외하고 다른 기능이나 로직, UI/UX 등은 수정해서는 안돼.
   회귀 테스트가 완벽하게 보장되어야 한다는 말이야.
   만약 여기서 해결해야 할 부분 제외한 UI/UX 혹은 기능/로직이 바뀌어야만 하는 상황이라면
   반드시 사전에 보고를 해줘. 보고할 때는 사용자 관점에서 이해하기 쉽고 간결하게 설명해줘야 해.

2. 현재 다른 클로드 세션에서 작업 중이기 때문에, 별도 워크트리를 생성해서 충돌이 없도록 진행해줘.

3. 서브에이전트를 활용하는 것이 더 효율적이라면 서브에이전트를 여러 개 병렬로 적극 활용해줘
   (단, 충돌이 없어야겠지?)

4. 코드는 최대한 깔끔하게 작성해줘.
   수정 과정에서 더 이상 필요 없는 코드가 있거나 정리해야 할 코드가 있다면 정리해줘
   (단, 기능상 변화는 절대로 없어야 해)

5. 추가로 계획서에는 아래 세 가지 스킬을 포함해서 사용하면 좋을 스킬을 사용하도록 기재해줘.
   /using-superpowers
   /test-driven-development
   /verification-before-completion

---

## 0. 사전 합의 사항 (실행 세션 시작 전)

본 계획서 승인 후 다음 항목을 사용자에게 별도 확인:

- **P3 #020 DRAFT 다운로드 정책** — DRAFT 다운로드를 차단할지 / 허용하되 워터마크를 추가할지 / 현 상태 유지할지. UI/UX 가시 변경이 발생하므로 **착수 전 AskUserQuestion 필수**.
- **P2 #014 트랙 메시지 워딩** — 새 워딩 후보 2~3개 비교 + AskUserQuestion (MEMORY.md `feedback_ui_change_approval`).
- **P2 #021 에러 바운더리 워딩·시각 강조** — 헤딩 크기·아이콘 톤 변경은 사용자 가시 변경이므로 mockup 비교 후 승인.

위 3건은 "조건 1번 — 다른 UI/UX는 바꾸지 마라" 와 직접 충돌하므로 본 계획서가 자체적으로 결정하지 않음.

---

## 1. 사용 스킬·MCP·서브에이전트

### 필수 스킬 (사용자 명시)

- `/using-superpowers` — 세션 시작 직후 (관련 스킬 게이트)
- `/test-driven-development` — 결함당 RED → GREEN → REFACTOR 사이클
- `/verification-before-completion` — 세션 종료 직전

### 보조 스킬

- `superpowers:dispatching-parallel-agents` — P1/P2 결함 묶음 병렬 처리
- `superpowers:systematic-debugging` — 진단·재현 단계
- `superpowers:writing-plans` — 본 계획서 작성·갱신
- `superpowers:requesting-code-review` · `receiving-code-review` — 묶음 완료 시
- `superpowers:subagent-driven-development` — 3+ 태스크 묶음 실행 시
- `check-server-action` — `actions.ts` 수정 시 (5단계 패턴 검증)
- `supabase-dev` — 마이그/RLS/RPC 수정 시 (#006·#016·#017·SEC-1~5)
- `frontend-guide` · `react-best-practices` · `composition-patterns` — UI 수정 시
- `web-design-guidelines` — UI 가시 변경 검수 (#014·#020·#021)
- `refactoring` — 조건 4번 정리 단계

### MCP

- `serena` — 시맨틱 심볼 탐색 (find_symbol, find_referencing_symbols, search_for_pattern)
- `supabase` — 로컬 DB 검증 (apply_migration, list_migrations, execute_sql, get_advisors)
- `context7` — Next.js 16 / React 19 / Supabase 최신 동작 확인
- `puppeteer` — P1 결함 사용자 흐름 재현·스크린샷
- `shadcn` — UI 컴포넌트 사양

### 서브에이전트 (병렬 — 충돌 없는 묶음만)

| 에이전트            | 담당 결함 묶음 (충돌 없음)                                                        |
| ------------------- | --------------------------------------------------------------------------------- |
| `general-purpose` ❶ | P1 #001 (gallery actions) + P2 #011 (gallery PBL ShareToggle)                     |
| `general-purpose` ❷ | P1 #002 + #003 + P2 #018 (roadmap/pbl actions revalidatePath 일괄)                |
| `general-purpose` ❸ | P1 #004 + #005 (LLM 에러 변환 강화)                                               |
| `general-purpose` ❹ | P2 #009 + #010 + #019 (메시지 영역)                                               |
| `general-purpose` ❺ | P2 #012 (NotificationBell link 분기) + P2 #008 (NotificationBell Realtime)        |
| `postgres-pro`      | P2 #006 (assign_consultant RPC) + #016 + #017 (인덱스 마이그) + SEC-1~5           |
| `general-purpose` ❻ | P2 #007 (미들웨어 역할 가드) + P2 #013 (토스트 통일) + P2 #014·#015 (트랙 메시지) |
| `test-automator`    | §10 T-1~T-5 회귀 테스트 작성 (구현 묶음 완료 후)                                  |

> `frontend-design` 플러그인은 사용 금지 (MEMORY.md — B2B 대시보드 부적합).

---

## 2. Phase 0 — 환경 셋업 (실행 세션 시작 시 1회)

1. **Docker Desktop 실행 여부 확인** — 사용자에게 메시지 (MEMORY.md `feedback_docker_announce`).
2. 워크트리 분기 확인:
   - 현재 워크트리: `chore/bug-audit-2026-05-21` (`../AI-roadmap-dashboard-bug-audit`)
   - 본 계획 실행 세션은 **본 워크트리에서 이어서 진행**하거나, 별도 워크트리(`chore/bug-audit-fix-2026-05-21`) 분기.
   - 다른 세션(`scroll-p2`)과 영역 충돌 없음 확인.
3. 로컬 Supabase 기동: `npx supabase start`
4. 로컬 DB 시드: `npx supabase db reset`
5. 환경 분기: `cp .env.local .env.local.audit-bak && cp .env.test .env.local`
6. 의존성: `npm install` (워크트리 이미 완료된 경우 skip)
7. dev 서버: `npm run dev` (포트 3000, 백그라운드)
8. 테스트 계정 로그인 동작 확인: `son@test.com` / `kpc@test.com` / `sysadmin@test.com` (모두 `test1234!`)

---

## 3. Phase 1 — 결함 충돌 매트릭스 + 묶음 분류

본 계획서의 핵심. 같은 파일·라우트를 수정하는 결함은 순차, 독립 결함은 병렬.

| 묶음    | 결함               | 주 수정 파일                                                                                              | 의존                                                 | 병렬 가능        |
| ------- | ------------------ | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ---------------- |
| **B1**  | #001 + #011        | `src/app/(dashboard)/gallery/actions/interactions.ts` + `GalleryPBLDetailContent.tsx`                     | —                                                    | ❶                |
| **B2**  | #002 + #003        | `src/app/(dashboard)/consultant/projects/[id]/roadmap/actions.ts` · `pbl/actions.ts`                      | —                                                    | ❷                |
| **B3**  | #004 + #005        | `src/lib/services/stt.ts` · `src/app/api/matching/generate/route.ts` · `src/lib/services/llm.ts`          | —                                                    | ❸                |
| **B4**  | #009 + #010 + #019 | `MessagesClient.tsx` · `NewConversationDialog.tsx` · `MessageIcon.tsx` (공유 hook 추출)                   | —                                                    | ❹                |
| **B5**  | #008 + #012        | `src/components/NotificationBell.tsx`                                                                     | —                                                    | ❺                |
| **B6**  | #006 + #016 + #017 | `supabase/migrations/068_*_extend_assign_states.sql` + `069_*_notifications_audit_indexes.sql` + RPC 본문 | DB 동시성 — 순차 권장                                | 단독             |
| **B7**  | #007               | `src/lib/supabase/middleware.ts`                                                                          | 미들웨어 — 모든 라우트 영향, 단독 실행 + 회귀 광범위 | 단독             |
| **B8**  | #013 + #015        | `CompanyInfoEditableCard.tsx` · roadmap `page.tsx`                                                        | 라우팅 안내 UI 변경은 사용자 승인 게이트 (조건 1번)  | ❻                |
| **B9**  | P3 #020            | `RoadmapResultClient.tsx`                                                                                 | UI 가시 변경 — 사전 승인 필수                        | 단독             |
| **B10** | SEC-1~5            | RLS 마이그·gallery queries.ts·audit.ts                                                                    | DB 마이그 + 정책 분리                                | 단독             |
| **B11** | T-1~T-5            | E2E·단위 테스트 신설                                                                                      | 구현 묶음 완료 후                                    | `test-automator` |

**병렬 순서 (한 메시지에 최대 4~5개 묶음 동시 디스패치):**

1. **Round 1** — B1, B2, B3, B4, B5 (5개 동시 — 영역 완전 독립)
2. **Round 2** — B6, B7, B8 (3개 — DB·미들웨어·UI 워딩 — 사용자 게이트 후)
3. **Round 3** — B9, B10 (UI 가시 변경 + 보안)
4. **Round 4** — B11 (회귀 테스트)

---

## 4. Phase 2 — 결함별 해결 단계 (TDD)

각 결함마다 다음 사이클:

1. **원인 가설 확정** — 보고서 §2~4 의 "기술 근거" 인용 + `serena:find_referencing_symbols` 로 영향 범위 확인
2. **사전 grep 영향 범위 점검** (CLAUDE.md 규칙) — Phase 3 참조
3. **RED** — Vitest 또는 Playwright 실패 테스트 작성
4. **GREEN** — 최소 구현
5. **REFACTOR** — 조건 4번 (정리·중복 제거)
6. **회귀 검증** — 재현 시나리오 수동 확인 (puppeteer 또는 로컬 브라우저)
7. **보고서 갱신** — 해당 결함의 `🔴 OPEN` → `🟢 RESOLVED` + 해결 정보 1줄 부기

### 결함별 사용자 관점 재현 + 수정 후 동작 + 기술 변경

> **사전 준비:** 로컬 Supabase 기동 + `npm run dev` (포트 3000) + 테스트 계정 3종 (모두 비번 `test1234!`)
>
> - `son@test.com` — OPS_ADMIN (운영관리자)
> - `kpc@test.com` — CONSULTANT_APPROVED (컨설턴트)
> - `sysadmin@test.com` — SYSTEM_ADMIN (시스템관리자)

---

## P1 차단성 (5건)

### #001 갤러리 좋아요 취소가 silent fail

**🐛 재현 방법**

1. `kpc@test.com` 로그인 → 좌측 사이드바 **갤러리** 클릭
2. 본인이 이미 "좋아요" 누른 카드의 하트 아이콘을 다시 클릭 (취소 의도)
3. 페이지 새로고침 (Cmd+R)
   → DB 삭제가 실패한 케이스에서 화면에는 좋아요가 꺼져 보이지만, 새로고침 후 다시 켜져 있음. 토스트도 없음.

**✅ 수정 후**
좋아요 취소가 실패하면 "좋아요 취소에 실패했습니다" 빨간 토스트 표시 + 하트 아이콘이 원래 켜진 상태로 즉시 되돌아감. 데이터 불일치 사라짐.

**🔧 기술 변경**
`gallery/actions/interactions.ts:42-45` delete 호출에 `{ error }` 디스트럭처링 + 에러 시 `errorResult` 반환. `togglePBLLike` 동일.

---

### #002 컨설턴트가 로드맵 "최종 확정" 해도 운영관리 목록은 이전 상태

**🐛 재현 방법**

1. `kpc@test.com` 로그인 → **워크스페이스 > 담당 프로젝트 > [시드기업B] > 로드맵**
2. DRAFT 버전에서 "최종 확정" 버튼 클릭 → 성공 토스트 확인
3. 시크릿 창 또는 다른 브라우저에서 `son@test.com` 로그인
4. **운영관리 > 프로젝트 관리** 목록 진입
   → "시드기업B" 행이 여전히 "로드맵 초안" 또는 "초안 작성됨" 라벨 표시. 새로고침해야만 "최종 확정" 으로 갱신.

**✅ 수정 후**
컨설턴트가 확정한 직후, 운영관리자가 다른 페이지에 있다가 운영관리 목록으로 돌아오면 즉시 "최종 확정" 상태로 표시. 새로고침 불필요.

**🔧 기술 변경**
`consultant/projects/[id]/roadmap/actions.ts:151-181` (`confirmFinalRoadmap`) 성공 분기에 `revalidatePath('/ops/projects')` + `revalidatePath(\`/ops/projects/${access.projectId}\`)` 추가.

---

### #003 컨설턴트가 로드맵 "초안 생성" 해도 운영관리 목록은 이전 상태

**🐛 재현 방법**

1. `kpc@test.com` 로그인 → 인터뷰 완료(`INTERVIEWED`) 상태의 프로젝트의 **로드맵** 진입
2. "AI 로드맵 생성" 클릭 → 약 90초 후 생성 완료 토스트
3. `son@test.com` 로그인 → **운영관리 > 프로젝트 관리** 목록
   → 해당 프로젝트가 여전히 "인터뷰 완료" 라벨. 새로고침해야 "초안 작성됨" 표시.

**✅ 수정 후**
컨설턴트가 초안 생성 완료한 직후 운영관리 목록·상세 페이지에 "초안 작성됨" 상태가 즉시 반영.

**🔧 기술 변경**
`consultant/projects/[id]/roadmap/actions.ts:75-146` (`createRoadmap`) 성공 분기에 동일 `revalidatePath` 2개 추가. PBL 트랙 (`pbl/actions.ts`) 도 동일 패치.

---

### #004 인터뷰 녹취록 분석 실패 시 "오류가 발생했습니다" 만 표시

**🐛 재현 방법**

1. `kpc@test.com` 로그인 → **워크스페이스 > 담당 프로젝트 > [프로젝트] > 인터뷰**
2. 인터뷰 진행하여 마지막 Step **"인터뷰 녹취 STT 첨부"** (ROADMAP 트랙 Step 9 / PBL 트랙 Step 10) 진입
3. STT 텍스트 파일 첨부 → 분석 자동 트리거
4. (LLM이 일시적으로 영문 키 응답을 반환하는 시점에 걸리면) → "오류가 발생했습니다. 다시 시도해 주세요." 토스트만 노출. 재시도해도 같은 결과.
   > 강제 재현은 어려움 — LLM 응답이 비결정적. 대신 단위 테스트로 시나리오 시뮬레이션 (Phase 6 검증 참조).

**✅ 수정 후**
LLM이 형식에 안 맞는 응답을 보내도 자동으로 한 번 더 시도. 그래도 실패하면 "녹취록 분석 결과 형식이 올바르지 않습니다. 잠시 후 다시 시도해 주세요." 같은 도메인 메시지 노출 — 사용자가 자기 입력 문제가 아닌 LLM 일시 오류임을 인지 가능.

**🔧 기술 변경**
`lib/services/stt.ts:103-111` 의 `callLLMForJSON` 호출에 validator 인자 추가 → 자동 재시도 활용. `.parse()` → `.safeParse()` + 실패 시 `LLMResponseInvalidError` throw. `getLLMUserFriendlyError` 에 ZodError 도메인 매칭 추가.

---

### #005 매칭 추천 생성 실패 시 모든 에러가 같은 메시지

**🐛 재현 방법**

1. `son@test.com` 로그인 → **운영관리 > 프로젝트 관리 > [DIAGNOSED 상태 프로젝트] > 배정** 탭
2. (해당 사용자의 일별 LLM 호출 한도가 차 있는 상황에서) "자동 매칭 실행" 클릭
   → "매칭 추천 생성 중 오류가 발생했습니다." 토스트 + HTTP 500. 한도 초과인지 시스템 오류인지 사용자가 구분 불가.
   > 한도 초과 재현: 운영관리 > 쿼터에서 본인 한도를 임의로 0 으로 낮춘 뒤 재시도, 또는 단위 테스트로 시뮬레이션.

**✅ 수정 후 — 4가지 분기 (사용자가 다음 행동 즉시 판단 가능)**

| 상황                            | 사용자가 보는 토스트 (한국어)                                       | HTTP 상태                     | `code` (응답 본문) | 추가 헤더           |
| ------------------------------- | ------------------------------------------------------------------- | ----------------------------- | ------------------ | ------------------- |
| 일별/월별 사용 한도 초과        | "오늘 사용 한도를 초과했습니다. 한국 시간 자정에 초기화됩니다."     | **429** Too Many Requests     | `QUOTA_EXCEEDED`   | `Retry-After: 3600` |
| LLM 응답 지연 (타임아웃/abort)  | "AI 응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요."           | **504** Gateway Timeout       | `LLM_TIMEOUT`      | —                   |
| 입력 길이 초과 (context length) | "분석할 내용이 너무 깁니다. 텍스트 길이를 줄여주세요."              | **413** Payload Too Large     | `INPUT_TOO_LARGE`  | —                   |
| 기타 예상치 못한 오류           | "매칭 추천 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요." | **500** Internal Server Error | `INTERNAL_ERROR`   | —                   |

> **HTTP 상태 코드 표준 근거:**
>
> - 429: RFC 6585 — rate limit. OpenAI·Anthropic·Stripe·GitHub API 모두 동일.
> - 504: RFC 9110 — upstream(LLM) 응답 지연.
> - 413: RFC 9110 — 입력 페이로드 크기 초과. (422 보다 의미적으로 정확 — 422는 "필드 누락·타입 오류" 같은 의미 검증 실패용)
> - 500: RFC 9110 — 기타 fallback.
>
> **`code` 도메인 코드를 본문에 함께 두는 이유:**
> Vercel·CDN이 5xx를 자체 에러 페이지로 가로챌 위험 회피 + 클라이언트 i18n 분기 + Sentry/로깅 그룹화.

**워딩 사용자 승인 게이트:** 위 4개 한국어 워딩은 baseline 안. 실행 세션 시작 시 AskUserQuestion 으로 최종 확정 (MEMORY.md `feedback_ui_change_approval`).

**🔧 기술 변경**

```ts
// app/api/matching/generate/route.ts:50-57 의 단일 catch 블록을
// 에러 메시지 패턴 분기로 교체

} catch (error) {
  console.error('[Matching API] Error:', error);
  const msg = error instanceof Error ? error.message : '';

  if (msg.includes('사용량 한도') || msg.includes('일별') || msg.includes('월별')) {
    return NextResponse.json(
      { success: false, error: '오늘 사용 한도를 초과했습니다. 한국 시간 자정에 초기화됩니다.', code: 'QUOTA_EXCEEDED' },
      { status: 429, headers: { 'Retry-After': '3600' } }
    );
  }
  if (msg.includes('타임아웃') || msg.includes('abort') || error?.name === 'AbortError') {
    return NextResponse.json(
      { success: false, error: 'AI 응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요.', code: 'LLM_TIMEOUT' },
      { status: 504 }
    );
  }
  if (msg.includes('context length') || msg.includes('token') || msg.includes('너무 깁니다')) {
    return NextResponse.json(
      { success: false, error: '분석할 내용이 너무 깁니다. 텍스트 길이를 줄여주세요.', code: 'INPUT_TOO_LARGE' },
      { status: 413 }
    );
  }
  return NextResponse.json(
    { success: false, error: '매칭 추천 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.', code: 'INTERNAL_ERROR' },
    { status: 500 }
  );
}
```

**클라이언트 측 분기 (선택):** 호출부에서 `response.status` 또는 `body.code` 로 toast 분기 + 429일 때만 자동 재시도 버튼 표시 가능.

**RED 테스트:** `route.test.ts` — 각 에러 종류별로 정확한 HTTP 상태 + body.code 검증 (4 케이스).

---

## P2 오해 유발 (10건)

### #006 인터뷰 완료 이후 컨설턴트 재배정 시 DB가 차단

**🐛 재현 방법**

1. `son@test.com` 로그인 → **운영관리 > 프로젝트 관리** → 인터뷰가 이미 완료된 (상태: "인터뷰 완료" 또는 "초안 작성됨") 프로젝트 클릭
2. **배정** 탭 진입 → 다른 컨설턴트 선택 → "배정하기" 클릭
   → "현재 프로젝트 상태(INTERVIEWED)에서는 컨설턴트를 배정할 수 없습니다." 에러 토스트 + 배정 실패.

**✅ 수정 후 (사용자 결정 후 분기)**

- **옵션 A (확장):** 인터뷰·초안 단계에서도 재배정 성공 + 이전 컨설턴트에게 해제 알림.
- **옵션 B (UI 차단):** 인터뷰 완료 단계부터는 재배정 폼 자체가 회색으로 비활성화 + "인터뷰 완료 이후에는 재배정이 제한됩니다" 안내. 클릭 자체 차단.

**🔧 기술 변경**

- 옵션 A: 신규 마이그 `068_extend_assign_consultant_states.sql` — RPC 허용 상태 확장 (인터뷰 데이터 유지 정책 결정 필요).
- 옵션 B: `AssignmentTabSection.tsx` 에서 status 기반 폼 비활성화. 더 안전.

---

### #007 가입 승인 대기 중 사용자가 운영관리 URL 직접 입력 시 빈 화면

**🐛 재현 방법**

1. 새 회원가입 직후 (역할이 `USER_PENDING` 또는 `OPS_ADMIN_PENDING`) 로그인
2. 주소창에 `http://localhost:3000/ops/users` 직접 입력
   → 미들웨어가 통과시켜 페이지 로드 시점에 권한 검사 실패 → silent redirect 또는 빈 화면. "왜 안 보이지" 혼동.

**✅ 수정 후**
미들웨어 단계에서 즉시 차단 → `/dashboard` (승인 대기 카드 화면) 로 자동 리다이렉트. URL 직접 입력으로도 우회 불가.

**🔧 기술 변경**
`lib/supabase/middleware.ts:60-77` 에 role 검사 추가. `USER_PENDING`·`OPS_ADMIN_PENDING` 이 `/ops/*` 또는 `/consultant/*` 진입 시 `/dashboard` 리다이렉트.

---

### ✅ #008 새 알림이 도착해도 종 아이콘이 최대 30초 늦게 갱신 — 해결 완료 (2026-07-30, PR #147)

> **⚠️ 이 항목의 기술 변경 서술은 불완전했다.** "`NotificationBell.tsx` 에 구독 추가"만으로는
> 동작하지 않는다 — `notifications` 가 `supabase_realtime` **publication 에 없어서**
> (019 는 `messages` 만 추가) 이벤트가 오지 않는다. 마이그 `078` 이 함께 필요했다.
> 30초 polling 은 제거하지 않고 **폴백으로 유지**(구독 성립 시 중단, 실패 시 계속)했다 —
> 구독이 성공도 실패도 통보하지 않는 상태에서 갱신이 아예 멈추는 것을 막기 위함.

**🐛 재현 방법**

1. 두 브라우저 창 준비: A=`son@test.com` (운영관리자), B=`kpc@test.com` (컨설턴트)
2. B 창은 컨설턴트 홈에서 대기 (탭 전환 없음)
3. A 창에서 B 에게 프로젝트 배정 또는 메시지 전송
   → B 창 헤더 종 아이콘이 즉시 갱신되지 않음. 최대 30초까지 대기 후 뱃지 +1 표시.

**✅ 수정 후**
헤더 메시지 아이콘처럼 종 아이콘도 새 알림 발생 즉시 (~1초 내) 뱃지 갱신.

**🔧 기술 변경**
`components/NotificationBell.tsx` 에 Supabase Realtime 구독 추가 (`MessageIcon.tsx` 패턴 그대로 차용). 폴백 30초 polling 유지.

---

### ✅ #009 메시지 새 대화 생성이 실패해도 다이얼로그 그대로 [P3 격하] — 해결 완료 (2026-07-30)

> **2026-05-21 재검증:** 다이얼로그가 열려 있는 게 "사용자가 다른 수신자를 다시 선택할 수 있게" 한 의도된 UX로 보임. 결함이라기보다 안내 부재. **P2 → P3 격하.**
>
> **2026-07-30 해결:** 창 안에 `role="alert"` 안내를 추가했다 — **서버가 준 실패 사유 그대로** +
> "다른 사용자를 선택해 다시 시도해주세요." + 닫기(×). 사용자가 고른 방식이다(고정 문구 대신 실제 사유).
> 토스트는 **제거하지 않고 유지**(즉각 피드백), 인라인은 다음 시도 전까지 남는 기록 역할.
> **닫기 정책 불변** — 그 사실을 특성화 테스트로 고정했다(`onOpenChange` 미호출 단언).
> `AlertMessage`(`components/ops/assignment/`)는 같은 폴더 `Icons` 에 묶여 있어 **가져오지도 옮기지도 않고**
> 인라인 마크업으로 처리했다(이동은 `P7` 범위).

**🐛 재현 방법**

1. `kpc@test.com` 로그인 → 헤더 **메시지** 아이콘 → 메시지 메뉴 → "새 메시지" 버튼
2. (대화 생성 권한이 없는 사용자 선택 시나리오, 또는 네트워크 일시 오류)
   → "대화 생성에 실패했습니다" 토스트만 표시. 다이얼로그는 여전히 열려 있음.

**✅ 수정 후**
실패 시 다이얼로그 안에 작은 안내 텍스트 ("다시 시도하시려면 다른 사용자를 선택해주세요") 또는 명시적 닫기 버튼 강조. 다이얼로그는 그대로 열어둠 (재선택 UX 유지).

**🔧 기술 변경**
`NewConversationDialog.tsx:63-81` catch 분기에서 안내 텍스트 추가. 닫기 정책은 변경하지 않음.

---

### ✅ #010 메시지 초기 로드가 실패하면 "대화 없음" 화면과 구분 불가 — 해결 완료 (2026-07-30)

> **⚠️ 조용히 실패하는 곳이 1곳이 아니라 3곳이었다.**
> 계획서가 지목한 목록 초기 로드 외에 ① URL `?conversation=` 으로 자동 선택된 대화의 메시지 조회
> ② 대화 클릭 시 `result.success === false` 도 아무 표시 없이 넘어갔다(`throw` 만 토스트를 띄웠다).
> → 목록 실패는 **에러 화면 + [다시 시도]**, 나머지 둘은 **서버 사유 토스트**로 처리했다.
> 문구는 운영관리 > 사용자 관리의 기존 에러 UI 와 같은 톤으로 승인받았다:
> _"메시지를 불러오지 못했습니다 / 잠시 후 다시 시도해주세요. 계속되면 운영팀에 문의해주세요."_
> ⚠️ `RefreshButton` 은 재사용 불가 — `router.refresh()` 로 **서버 페이지**를 다시 받는 방식이라
> 클라이언트가 Server Action 을 직접 부르는 이 화면에는 맞지 않는다(재조회 핸들러를 따로 만들었다).
> **정상적으로 대화가 0건인 경우의 기존 빈 상태는 그대로 유지**되며, 그것도 특성화 테스트로 고정했다.

**🐛 재현 방법**

1. `kpc@test.com` 로그인 → 메시지 메뉴 진입 직전, DevTools > Network 탭에서 "Offline" 토글
2. 메시지 메뉴 클릭
   → 로딩 후 "아직 메시지가 없습니다" 빈 상태 화면. 실제로는 네트워크 에러인데 사용자는 정말 대화가 없는 줄 오해.

**✅ 수정 후**
초기 로드 실패 시 "메시지를 불러오지 못했습니다" + "다시 시도" 버튼이 있는 에러 화면 표시. 빈 상태와 명확히 구분.

**🔧 기술 변경**
`MessagesClient.tsx:148-177` 에러 분기에서 `setLoadError(true)` + 에러 상태 UI 렌더 + 재시도 버튼 추가.

---

### ✅ #011 PBL 공유 수단 부재 — 해결 완료 (2026-07-30)

> **⚠️ 대상 화면이 틀렸다. 아래 재현 방법·기술 변경은 그대로 따르면 안 된다.**
> ① **갤러리 상세에는 로드맵도 토글이 없다** — "로드맵엔 있다"고 본 것은 갤러리가 아니라
> **컨설턴트 > 프로젝트 > 로드맵 결과 화면**이다. 갤러리 상세에 없는 것은 결함이 아니다
> (갤러리는 이미 공유된 것을 남이 보는 곳이라, 거기서 끄면 보고 있던 페이지가 사라지고
> "켜기"는 애초에 불가능한 반쪽 컨트롤이 된다).
> ② 진짜 결함은 **PBL 결과 화면에 공유 수단이 아예 없다는 것** — PBL 보고서는 갤러리에
> 올릴 방법 자체가 없었다. 서버 액션·`is_shared` 컬럼·갤러리 PBL 카드·트랙 필터는 이미
> 다 있었고 **화면만 없는 반쪽 구현**이었다.
> ③ _"UI 만 연결"_ 도 부정확 — `ShareToggle` 이 로드맵 전용으로 하드코딩돼 있었다.
>
> **해결:** `PBLResultClient` 에 `shareControl` capability 를 추가해 로드맵과 **동일 규칙**을 적용
> (FINAL 에서만 / 컨설턴트는 토글 · Ops 는 읽기 전용 배지 — 서버 액션의 FINAL·본인 가드와 일치).
> `ShareToggle` 에는 `track` prop 을 추가해 **같은 폴더 `LikeButton` 과 동일한 단일 prop 분기**로
> 일반화했고, **기본값 `ROADMAP`** 이라 기존 로드맵 호출부는 무변경이다(그 기본값을 특성화 테스트로 고정 —
> 실수로 뒤집히면 로드맵 공유가 PBL 액션을 타 조용히 실패한다).
> 사용자 정책 결정: _"PBL 도 공유가 되어야 한다."_ 승인 문구: _"다른 컨설턴트가 이 PBL 보고서를
> 열람하고 활용할 수 있습니다."_
> **`GalleryPBLDetailContent.tsx`·`gallery/actions/*`·`gallery/[id]/page.tsx` 는 손대지 않았다.**

**🐛 재현 방법**

1. `kpc@test.com` 로그인 → 좌측 **갤러리** → 본인이 작성한 **PBL 보고서** 카드 클릭
2. 상세 페이지 우측 상단 영역 확인
   → 좋아요 버튼은 있으나 "갤러리에 공유" 토글이 없음. 같은 사용자가 작성한 로드맵 상세에는 토글이 있음.

**✅ 수정 후**
PBL 보고서 작성자가 본인 PBL 상세에서 "갤러리 공유 On/Off" 토글 가능 — 로드맵과 일관된 UX.

**🔧 기술 변경**
`GalleryPBLDetailContent.tsx` 에 `ShareToggle` 컴포넌트 추가 (작성자 한정). `togglePBLShare` Server Action 은 이미 존재 — UI 만 연결.

---

### ✅ #012 알림 클릭했는데 아무 변화 없음 (이동 대상 누락 알림) — 해결 완료 (2026-07-30, PR #147)

> **⚠️ 전제 2개가 실제와 달랐다.**
> ① **현재 발생하지 않는다** — 알림 생성 호출처 10곳 전부 `link` 를 넣는다(전수 확인). 위험은
> "나중에 새 유형을 추가하며 빠뜨리는 것"이므로 **생성 시점 차단**이 근본 수정이다(스키마 `.min(1)`
>
> - 파라미터 타입 필수화 → 컴파일이 막는다).
>   ② **`/notifications` 로 보낼 수 없다** — 그 경로엔 `actions.ts` 만 있고 페이지가 없어 404 다.
>   → 화면 방어는 **안내 토스트**(`showInfoToast` 신규)로 했다.

**🐛 재현 방법**

1. 어떤 사용자든 로그인 → 헤더 종 아이콘 → 드롭다운에서 알림 목록 확인
2. (DB에 `link` 필드가 null 인 알림이 있는 경우 — 예: 일부 시스템 공지) 그 알림 클릭
   → 알림은 읽음 처리되지만 페이지가 이동하지 않고 토스트도 없음. "클릭이 안 먹혔나?" 혼동.

**✅ 수정 후**
이동 대상이 없는 알림 클릭 시 `/notifications` 페이지로 이동 (전체 알림 목록), 또는 "이 알림에는 이동 대상이 없습니다" 안내 토스트 표시.

**🔧 기술 변경**
`NotificationBell.tsx:203-217` `handleNotificationClick` 에서 `link` falsy 분기 처리.

---

### ✅ #013 일관성 — 한 컴포넌트만 토스트 호출 방식이 다름 — 해결 완료 (2026-07-31, PR #152)

> **결과:** `CompanyInfoEditableCard` 의 sonner 직접 호출 3줄(import·success·error)을
> `showSuccessToast`/`showErrorToast` 로 치환. **화면 동작 변화 0** — 래퍼가 인자 1개일 때
> sonner 를 그대로 호출함을 코드로 확인했다(`toast.ts:41,50`).
> 동반 수정한 테스트는 `vi.mock('@/lib/utils/toast')` 위임 변수 방식(`LikeButton.test.tsx` 선례)으로
> 바꾸고, **성공 토스트 단언을 추가**해 양쪽 경로 모두 래퍼를 거치는지 고정했다.
> 이로써 `src/` 비테스트 코드에서 sonner 를 직접 부르는 곳은 **0건**이다
> (`toaster.tsx` 전역 프로바이더 · `toast.ts` 래퍼 자신만 남음).

**🐛 재현 방법**

> 즉시 사용자 가시 결함은 없음. 향후 토스트 정책 (duration·아이콘 등) 변경 시 이 컴포넌트만 누락되는 위험.

1. `kpc@test.com` 로그인 → 임의 프로젝트 상세 → "기업 정보" 섹션 수정 → 저장 토스트 노출 시 다른 화면의 토스트와 비교 → 동작 차이 없음 (현재는).

**✅ 수정 후**
모든 토스트가 같은 래퍼 함수(`showSuccessToast`/`showErrorToast`)를 통과. 향후 토스트 정책 변경 시 한 곳만 수정해도 전체 일관성 유지.

**🔧 기술 변경**
`CompanyInfoEditableCard.tsx:204,208` 의 Sonner `toast.success/error` → `showSuccessToast`/`showErrorToast`. 정리 단계에서 grep 으로 다른 컴포넌트 동일 패턴 점검.

> **2026-07-31 실측 보완 — 본문은 정확하다(위반은 이 1곳뿐). 다만 동반 수정이 하나 빠져 있다.**
> `src/` 전체에서 sonner 를 직접 부르는 비-래퍼 코드는 `CompanyInfoEditableCard.tsx:25,204,208`
> **정확히 1곳**이다(나머지 4건은 래퍼 정의·`Toaster` 렌더·래퍼 테스트라 정상).
> ⚠️ 같은 폴더 **`CompanyInfoEditableCard.test.tsx` 가 `vi.mock('sonner')` 로 직접 모킹**하고
> `toast.error` 호출을 단언한다(`:19,164,182`) → 소스를 래퍼로 바꾸면 **이 테스트도
> `@/lib/utils/toast` 모킹으로 함께 고쳐야** 깨지지 않는다.
> 두 호출 모두 인자 1개짜리라 화면 동작은 **완전히 동일**하다(순수 내부 정리).

---

### ✅ #015 트랙이 맞지 않는 주소 진입 시 사유 없이 강제 이동 — 해결 완료 (2026-07-31, PR #152)

> **결과 — 사용자 승인 형태: 안내 배너 + 올바른 화면으로 가는 링크.**
>
> - **양방향 모두 수정**: `roadmap/page.tsx:26` · `pbl/page.tsx:35` 두 redirect 가 목적지에
>   `?trackMismatch=1` 을 실어 보낸다. (아래 실측 보완이 지적한 대로 한쪽만 고치면 절반만 해결이었다.)
> - **배너**: 신규 `consultant/projects/[id]/_components/TrackMismatchNotice.tsx` — 공용
>   `ui/alert.tsx` 의 shadcn `Alert` 사용(부품을 새로 만들거나 옮기지 않았다). amber 톤 + `AlertTriangle`.
>   문구 예: **"이 프로젝트는 PBL 트랙입니다 / 로드맵 화면은 열 수 없어 프로젝트 상세로 이동했습니다."**
>   \+ 링크 **"PBL 보고서 보기"**. 반대 방향은 로드맵 문구로 자동 대칭.
> - **문구·링크 출처**: `lib/utils/project-track.ts` 의 `trackShortLabel`·`projectDetailHref`·
>   `primaryActionLabel` 재사용 — 헤더 트랙 뱃지·액션 버튼과 같은 출처라 명칭이 어긋날 수 없다.
> - **노출 조건**: 상세 페이지가 `searchParams.trackMismatch === '1'` 일 때만 렌더.
>   위치는 `PageHeader` 아래·탭 위. `loading.tsx` 는 조건부 요소라 손대지 않았다.
> - **안전망 4종**: `roadmap/page.test.tsx`(7) · `pbl/page.test.tsx`(7) ·
>   `TrackMismatchNotice.test.tsx`(4) · `page.test.tsx`(5). **결함 주입(조건 반전)으로 4건이 실패함을
>   확인**해 감시력을 검증했다.
> - ✅ **운영관리자 쪽은 범위 밖** — `ops/projects/[id]/roadmap|pbl` 에는 트랙 조건 자체가 없다.

> **2026-05-21 재검증:** URL 직접 입력·오래된 북마크 시나리오로 발생. 빈도 매우 낮음. **P2 → P3 격하.**
>
> **2026-07-31 실측 보완 — 아래 "기술 변경"이 절반만 다룬다.**
> ① **반대 방향도 동일하다** — `pbl/page.tsx:33` 이 로드맵 트랙을 `/pbl` 에서 무사유로 튕긴다.
> roadmap 쪽 주석이 스스로 _"PBL 페이지 분기 대칭"_ 이라 적을 만큼 의도된 쌍이므로,
> `?reason=` 을 roadmap 에만 붙이면 **절반만 고쳐진다.**
> ② 목적지 `consultant/projects/[id]/page.tsx:36-41` 은 `params` 만 받고 **`searchParams` 를 안 읽는다.**
> 가장 가까운 선례는 `gallery/[id]/page.tsx:22-24`(`searchParams` 로 track 을 읽는다).
> ③ ✅ **안내 배너 부품을 새로 만들거나 옮길 필요가 없다** — 공용 `src/components/ui/alert.tsx` 에
> shadcn `Alert`/`AlertTitle`/`AlertDescription` 이 이미 있다.
> (`components/ops/assignment/AlertMessage` 는 같은 폴더 `Icons` 에 묶여 있어 옮기면 배정 화면 3곳이
> 흔들린다 — **건드리지 말 것.**)
> ④ 운영관리자 쪽(`ops/projects/[id]/roadmap|pbl`)에는 이 redirect 패턴 자체가 **없다** — 범위 밖.

**🐛 재현 방법**

1. `kpc@test.com` 로그인 → PBL 트랙 프로젝트 진입 → 주소창에 해당 프로젝트 URL 뒤에 `/roadmap` 직접 입력 (또는 외부 북마크 클릭)
   → 프로젝트 상세 페이지로 강제 이동. 안내 토스트·배너 없음. 사용자는 "왜 튕겨나갔지?" 의문.

**✅ 수정 후 (안내 방식 사용자 승인 필요)**
리다이렉트 후 안내 표시:

- **옵션 토스트:** "이 프로젝트는 PBL 트랙입니다. PBL 메뉴를 이용해주세요." 토스트 3초 노출.
- **옵션 배너:** 프로젝트 상세 페이지 상단에 노란 안내 배너 (X 버튼 포함).

**🔧 기술 변경**
`consultant/projects/[id]/roadmap/page.tsx:26-28` `redirect()` 에 `?reason=track_mismatch` query string 추가. 프로젝트 상세 페이지가 query string 감지 시 안내 UI 렌더.

---

### ✅ #016 누적된 알림이 많을수록 알림 페이지·종 아이콘이 느려짐 — 해결 완료 (2026-07-30, PR #147)

> 마이그 번호는 계획서의 `069` 가 아니라 **`077`** 이다(그 사이 076 까지 진행됐다).
> `(user_id, type, created_at DESC)` 복합 인덱스 — 정렬 방향까지 담아 필터 + 최신순을 한 번에 처리.

**🐛 재현 방법**

> 일반 사용자에서는 즉시 체감 어려움. 알림이 수백~수천 건 누적된 운영자·시드 환경에서 두드러짐.

1. 알림이 많이 쌓인 계정으로 로그인 → 종 아이콘 또는 `/notifications` 페이지 진입
   → 로딩 인디케이터가 평소보다 길게 표시.

**✅ 수정 후**
알림 목록 응답이 즉시 (수십 ms 내). 사용자가 누적 알림 수와 무관하게 동일한 속도 체감.

**🔧 기술 변경**
신규 마이그 `069_add_notifications_filter_index.sql` — `CREATE INDEX idx_notifications_user_type_created ON notifications (user_id, type, created_at DESC);`

---

### ✅ #017 감사로그 액터·대상 필터 적용 시 결과 표시 지연 — 해결 완료 (2026-07-30)

> **⚠️ 아래 "기술 변경"의 마이그 번호 `070` 은 틀렸다 — 실제는 `079`.**
> `070_audit_actions_pr5.sql` 이 이미 그 번호를 쓰고 있다(#016 이 `069`→`077` 로 겪은 것과 같은 drift).
> 또 실제 서버 필터는 2개가 아니라 **5개**(action·target_type·actor_user_id·시작일·종료일)이며,
> `action` 은 `052` 로 이미 커버된다. 화면 상단 검색창은 **서버로 가지 않는 클라이언트 필터**라 무관하다.
> → `079_add_audit_logs_composite_indexes.sql` 로 `(actor_user_id, created_at DESC)` ·
> `(target_type, created_at DESC)` 추가. 기존 단일 인덱스는 다른 조회 경로가 쓰므로 **삭제하지 않았다.**
> 조회 코드(`src/lib/services/audit.ts`)는 무변경. 로컬 적용·인덱스 존재 검증 완료.
> ⚠️ **운영 DB 반영은 별도다.**

**🐛 재현 방법**

1. `son@test.com` 로그인 → **운영관리 > 감사로그**
2. 상단 필터에서 특정 사용자(액터) 또는 대상 타입(예: "project") 선택
   → 결과 목록이 평소보다 느리게 표시 (시드 환경에서는 미세하나, 운영에서 감사로그 누적 시 명확).

**✅ 수정 후**
필터 변경 즉시 결과 갱신. 누적 로그가 많아도 동일한 속도.

**🔧 기술 변경**
신규 마이그 `070_add_audit_logs_composite_indexes.sql` — `(actor_user_id, created_at DESC)` + `(target_type, created_at DESC)` 복합 인덱스 추가.

---

### ⚠️ #019 모바일 네트워크 전환 시 메시지 실시간 복구가 느림 — **아래 처방을 그대로 실행하지 말 것**

> **2026-07-31 정밀 재검증 — 처방의 전제 두 가지가 코드와 맞지 않는다.**
>
> **① "재시도가 중복이라 복구가 느려진다"는 근거가 약하다.**
> `MessagesClient` 의 두 채널은 **목적이 다르다** — `messages:${convId}`(필터 有)는 열어둔 대화의
> 메시지 append(`:336-357`), `messages:all`(필터 無)은 목록 프리뷰 갱신(`:390-403`)이다.
> 각자 독립 재시도해도 서로를 방해하지 않고, 하나가 살아나면 그 기능은 동작한다.
> supabase-js 는 채널이 여러 개여도 **WebSocket 하나를 공유**하므로 연결 수도 줄지 않는다.
> → "재시도 횟수를 절반으로" 가 사용자 체감을 개선한다는 근거가 없다.
>
> **② 진짜 결함은 재시도가 아니라 폴백 신호에 있다.**
> 폴백 폴링은 `realtimeActiveRef` 가 true 면 통째로 skip 하는데(`:425`), 그 ref 는
> **conv 채널에서만** 세팅되고(`:355`) 폴링이 하는 일에는 **목록 갱신까지 포함**된다(`:454`).
> → `messages:all` 이 죽고 conv 가 살아 있으면 **다른 대화의 새 메시지가 목록에 안 뜬다**
> (실시간도 폴백도 목록을 갱신하지 않는 구간). 게다가 폴링은 `selectedConvId` 가 있을 때만
> 돌아(`:419`) **대화를 하나도 열지 않은 상태에서는 목록 갱신 폴백이 아예 없다.**
>
> **권고:** 훅 통합(목적이 다른 채널을 합치는 큰 수술)이 아니라 **폴백 신호를 고치는 작은 수정**부터.
> 채널별 상태를 따로 추적하거나, 최소한 `realtimeActiveRef` 를 **두 채널 모두 SUBSCRIBED 일 때만**
> true 로 둔다. 위험은 훨씬 작고 이득은 명확하다.
>
> ⚠️ 어느 쪽이든 **특성화 테스트 선작성 필수** — `MessagesClient.test.tsx` 의 realtime 단언이
> **사실상 1건**뿐이다(`MessageIcon` 7건 · `NotificationBell` 7건과 대비).
> 📌 구독처는 2곳이 아니라 **3파일 4채널**이며, `NotificationBell` 은 테이블이 `notifications` 로
> 달라 **합칠 대상이 아니다**(세션 4에서 추가됨 — 이 계획서 작성 이후).

**🐛 재현 방법**

1. 모바일 기기 또는 DevTools 모바일 에뮬레이션에서 로그인 → 메시지 메뉴 진입
2. Wi-Fi → LTE 전환 (또는 DevTools Network throttle 토글)
3. 다른 사용자가 메시지 전송
   → Realtime 연결 복구 중 헤더 아이콘과 채팅창이 각각 따로 재시도 (총 최대 6번). 새 메시지 수신이 늦어짐.

**✅ 수정 후**
헤더 아이콘과 채팅창이 같은 실시간 연결 공유 → 재시도 횟수 절반(최대 3번)으로 줄어 복구 속도 향상.

**🔧 기술 변경**
`MessagesClient.tsx` + `MessageIcon.tsx` 가 공유하는 `useMessageRealtime` 훅 신설. 단일 채널·단일 재시도 매니저.

---

## P3 시각·문구·접근성 (3건 — #009·#015 격하 포함)

### ⚪ #020 DRAFT 상태 로드맵도 다운로드 버튼 활성 — 결함 아님으로 종결 (2026-07-30)

> **사용자 정책 결정:** _"초안인 경우에도 파일(pdf, hwpx 등) 다운로드는 가능해야 한다."_
> → 아래 옵션 A(차단)·B(워터마크)를 **모두 배제**하고 옵션 C(현 상태 유지)로 확정. 코드 변경 없음.
> 이후 세션은 이 항목을 착수 대상으로 보지 말 것.

**🐛 재현 방법**

1. `kpc@test.com` 로그인 → 담당 프로젝트 > 로드맵 → "새 버전 생성" 으로 DRAFT 버전 생성
2. 버전 선택에서 DRAFT 버전 선택 → "PDF 다운로드" / "XLSX 다운로드" / "HWPX 다운로드" 버튼 확인
   → 모두 활성 상태. 클릭 시 미확정 버전 파일 다운로드됨.

**✅ 수정 후 (정책 사용자 결정 필요)**

- **옵션 A 차단:** DRAFT 버전 선택 시 다운로드 버튼이 회색으로 비활성화 + "최종 확정 후 다운로드 가능" 툴팁.
- **옵션 B 워터마크:** 다운로드 자체는 가능하나 파일 안에 "DRAFT" 워터마크 표시 (PDF/XLSX/HWPX 모두).
- **옵션 C 현 상태 유지:** 변경 없음 (정책상 DRAFT 다운로드 의도된 동작인 경우).

**🔧 기술 변경 (옵션별)**

- A: `RoadmapResultClient.tsx:311` 의 `disabled={!selectedVersion}` → `disabled={!selectedVersion || selectedVersion.status !== 'FINAL'}` + 안내 툴팁.
- B: `pdf-generator.ts` / `xlsx-generator.ts` / HWPX 템플릿에 status='DRAFT' 워터마크 옵션.

---

## 보안 잠재 위험 (5건 — 현재 사용자 직접 노출 없음, 구조적 단일 실패 지점)

> 모두 "현재 다른 방어선이 차단하나 코드 변경 시 무방비 가능" 형태. 사용자 가시 재현은 어렵고, 코드 변경 시 회귀 방지 차원.

| #     | 시나리오                                                                         | 수정 후                                                    |
| ----- | -------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| SEC-1 | 향후 새로운 페이지가 `fetchGalleryItems` 직접 호출 시 인증 없이 데이터 노출 가능 | 함수 진입부에서 `requireAuth` 자체 실행 → 호출부 실수 차단 |
| SEC-2 | OPS_ADMIN 이 로드맵 관리 작업 시 RLS 정책 부재로 admin client 우회에만 의존      | RLS 정책 명시 추가 → admin client 의존도 해소              |
| SEC-3 | 향후 코드 변경 시 OPS_ADMIN 이 PBL 보고서 DELETE 가능 (문서 의도와 불일치)       | `pbl_reports_ops_all` 을 `FOR SELECT` 로 좁힘              |
| SEC-4 | `notices_mutate_ops_sys FOR ALL` 단일 정책으로 의도 분리 어려움                  | SELECT/INSERT/UPDATE/DELETE 4개 정책으로 분리              |
| SEC-5 | 향후 코드 변경 시 `fetchAuditLogs` 가 권한 검사 없이 호출되면 전체 감사로그 노출 | 서비스 함수 자체에 `requireAuthWithRole` 내장              |

---

## 테스트 사각지대 (5건 — 회귀 방지 테스트 신설)

> 사용자 재현이 아니라 "이 분기에서 깨지면 사용자에게 X가 발생" 의 회귀 안전망 추가.

| #   | 시나리오                                                       | 추가 테스트                                   |
| --- | -------------------------------------------------------------- | --------------------------------------------- |
| T-1 | PBL DRAFT→FINAL 전환 시 기존 FINAL→ARCHIVED 강등 정상 동작     | `e2e/consultant/pbl-transitions.spec.ts` 신설 |
| T-2 | MessageIcon Realtime 재시도 소진 후 폴링 fallback 활성화       | `MessageIcon.test.tsx` 케이스 추가            |
| T-3 | 메시지 전송 시 수신자 헤더 뱃지 실시간 갱신                    | `messages-realtime.spec.ts` 보강              |
| T-4 | 자가진단 토큰 만료·재사용 시 사용자 안내 UI                    | `e2e/public/assessment.spec.ts` 보강          |
| T-5 | 2회 연속 컨설턴트 재배정 시 is_current 단일성 + 알림 중복 방지 | `consultant-reassignment.spec.ts` 보강        |

---

## 5. Phase 3 — 사전 grep 영향 범위 점검 (CLAUDE.md 규칙)

각 변경 직후 다음 grep 수행 (예시):

| 변경 종류                   | grep 키워드                                                |
| --------------------------- | ---------------------------------------------------------- |
| 토스트 워딩 변경            | 옛 라벨 + 새 라벨 (예: `"PBL 트랙 프로젝트는"`)            |
| Server Action 시그니처 변경 | 함수명 (예: `assignConsultant`, `createRoadmap`)           |
| `revalidatePath` 추가       | 동일 라우트 패턴 다른 액션도 갱신 필요한지 확인            |
| 컴포넌트 prop 추가          | 컴포넌트명 (예: `ShareToggle`)                             |
| Enum/상수 값                | 값명 (예: `INTERVIEWED`)                                   |
| 미들웨어 라우트 패턴        | `protectedRoutes` 값 변경 시 모든 `requireAuth*` 호출 패턴 |
| LLM 에러 메시지             | `getLLMUserFriendlyError` 호출처                           |

검색 범위: `src/` + `e2e/`. 의심 spec 발견 시 `npx playwright test e2e/<path>.spec.ts` 부분 실행.

---

## 6. Phase 4 — 통합 회귀 검증

각 묶음 PR 머지 전:

1. `npm run validate` (typecheck + lint + test) 통과
2. `npm run build` 통과
3. 핵심 E2E 통과 (`npm run test:e2e`)
4. **기존 정상 흐름 무회귀 확인 (수동):**
   - 회원가입 atomic flow (#004 RESOLVED 재확인)
   - 컨설턴트 배정 → 인터뷰 → 로드맵 DRAFT → FINAL → 다운로드
   - PBL 동일
   - 메시지 1:1 + Realtime
   - 알림벨 클릭 라우팅 (기존 link 있는 알림은 정상 이동)
5. **사용자 가시 변경 회귀:** #014·#015·#020·#021 묶음은 puppeteer 자동 캡처 또는 수동 시각 확인

---

## 7. Phase 5 — 보고서 상태 갱신

`docs/reports/2026-05-21-system-bug-audit.md` 의 §1 표:

- 각 결함 행의 상태 `🔴 OPEN` → `🟢 RESOLVED` 갱신
- 결함 본문 끝에 추가:
  ```
  - **해결 정보**: PR #NN · 커밋 abc1234 · 2026-05-22 · 검증자: 자동 테스트 + 수동 확인
  - **상태 변경**: 🔴 OPEN → 🟢 RESOLVED — 근본 원인 ...
  ```
- 상단 새로운 "변경 이력" 표 추가:
  ```
  | 2026-05-22 | 결함 수정 (세션 #fix) | PR #NN | RESOLVED: #001, #002, ... |
  ```

---

## 8. Phase 6 — PR 생성 + 머지

- 묶음별로 분리된 PR (B1, B2, ... 11개) — Squash merge 환경이므로 PR 제목이 그대로 main 커밋 메시지
- PR 제목 예시:
  - `fix: 갤러리 좋아요 silent fail + PBL 공유 토글 누락 해결`
  - `fix: 로드맵·PBL 확정·생성·배정 시 운영관리 캐시 무효화`
  - `fix: STT·매칭 LLM 에러를 도메인 컨텍스트로 변환`
- PR 본문에 결함 번호·검증 방법·CI 통과 여부 정리
- `gh pr checks` 의 모든 check (E2E Test 포함) pass 확인 (MEMORY.md `feedback_ci_e2e_must_pass`)
- 머지 후 main CI 7분 루프 확인 (nielsen-audit-fix 패턴)

---

## 9. 종료 시 보고

```
✅ 해결한 결함: N건 (P1 N · P2 N · P3 N · SEC N · T N) — PR/커밋 + 검증
⚠️ 보류한 결함: N건 (사용자 결정 게이트 미통과 — 예: #006 INTERVIEWED 재배정 정책)
🆕 추가 발견 결함: N건 (구현 중 발견된 부수 결함)
🧪 회귀 테스트 추가: T-1~T-5 + 신규 N건
```

---

## 10. 금지 사항 (실행 세션 엄수)

- **사용자 가시 라벨·문구 임의 변경 금지** — 모든 워딩 변경은 mockup + AskUserQuestion 필수 (MEMORY.md `feedback_ui_change_approval`)
- 운영 Supabase 쓰기 금지 — `.env.local`이 운영 URL을 가리키는지 항상 확인
- `--force` 푸시 금지
- `--no-verify` hooks 우회 금지
- 같은 워크트리에서 충돌 가능성 있는 결함 동시 수정 금지 — 묶음 매트릭스 §3 엄수

---

## 11. 예상 소요 시간 (단일 세션 기준 추정)

| Round    | 묶음                         | 추정 시간     |
| -------- | ---------------------------- | ------------- |
| Round 1  | B1·B2·B3·B4·B5 (병렬)        | 3~4시간       |
| Round 2  | B6·B7·B8 (사용자 게이트 후)  | 4~5시간       |
| Round 3  | B9·B10 (UI 가시 변경 + 보안) | 3~4시간       |
| Round 4  | B11 (회귀 테스트)            | 2시간         |
| **합계** |                              | **12~15시간** |

PR 5건 이상으로 분할 권장. 단일 세션 강행 비권장.

---

## 12. 사용자 결정 게이트 요약 (착수 전 AskUserQuestion 필수)

1. **#006 재배정 정책** — INTERVIEWED 이후 재배정을 허용할지 / UI 측에서 차단할지
2. **#014 트랙 메시지 워딩** — 새 워딩 옵션 비교
3. ~~**#015 라우팅 안내 방식** — 토스트 vs 안내 배너~~ → ✅ **결정 완료 (2026-07-31): 안내 배너 + 바로가기 링크.**
   토스트를 배제한 근거: 몇 초 뒤 사라져 놓치면 다시 볼 수 없고, 목적지가 서버 컴포넌트라
   토스트를 띄우려면 그 용도만의 클라이언트 부품을 새로 만들어야 한다(배너보다 손이 더 감).
4. **#020 DRAFT 다운로드 정책** — 차단 / 워터마크 / 현 상태 유지
5. **#021 에러 바운더리 시각** — 헤딩·아이콘 mockup 비교

---

> **본 계획서의 종착점:** 사용자가 본 계획서를 승인하면 별도 세션에서 Phase 0 부터 실행.
