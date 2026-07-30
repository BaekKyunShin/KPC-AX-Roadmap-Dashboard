# 시스템 전수 버그·오류 감사 + 해결 계획서 작성 — 사용자 관점 우선

> **목적:** KPC AI 훈련 로드맵 대시보드 전 영역에서 **사용자가 실제로 마주칠 수 있는 명백한 오류·버그**를 사용자 관점으로 전수 발견하고, ① 사용자가 이해할 수 있는 재현 경로·해결 방향이 담긴 보고서와 ② 회귀 안전성을 보장하는 해결 계획서까지 완성한다. 본 세션에서는 **코드 수정은 수행하지 않는다.** 발견·보고·계획만.
> **언어:** 모든 답변·문서·UI 텍스트·커밋 메시지는 한국어.
> **작업 모드:** Plan Mode 진입은 §6 Step 5(계획서 작성)에서만. Step 1~4는 일반 모드에서 읽기 위주로 진행.

---

## 0. 사전 컨텍스트 로드 (새 세션이므로 필수)

다음 문서를 먼저 읽어 프로젝트 맥락을 확보한다.

1. `/Users/baekkyunshin/Desktop/AI-roadmap-dashboard/CLAUDE.md` — 프로젝트 개요·명령어·아키텍처·역할 6종·커밋 규칙
2. `/Users/baekkyunshin/Desktop/AI-roadmap-dashboard/docs/ARCHITECTURE.md` — 시스템 다이어그램·데이터 흐름·Server Action 패턴
3. `/Users/baekkyunshin/Desktop/AI-roadmap-dashboard/docs/RLS.md` — Row-Level Security 정책 (권한·은닉 결함 진단 핵심)
4. `/Users/baekkyunshin/Desktop/AI-roadmap-dashboard/docs/reports/archive/` 최근 5개 — **이미 알려진/해결된 결함 중복 보고 방지** (특히 `2026-04-28-system-audit.md`, `2026-04-30-nielsen-heuristics-audit.md`, `2026-05-02-nielsen-heuristics-audit-v2.md`, `2026-05-17-scroll-ux-audit.md`)
5. `MEMORY.md` + `reference_test_accounts.md` (자동 로드됨) — 사용자 선호·테스트 계정·근본 원인 해결 원칙·UI 변경 사전 승인 규칙

## 1. 워크트리 격리 (코드 읽기 전 자동 수행)

다른 Claude 세션이 동시 작업 중이므로 충돌 없는 격리 워크트리에서 진행한다.

1. 현재 디렉터리 확인: `/Users/baekkyunshin/Desktop/AI-roadmap-dashboard`
2. 현재 브랜치 확인: `git branch --show-current` → `main`이어야 함. 아니면 사용자에게 보고 후 진행 여부 확인.
3. uncommitted 변경 점검: `git status --short`. 변경 있으면 사용자에게 보고 후 stash/커밋/무시 결정.
4. 최신 동기화: `git fetch origin && git pull --ff-only origin main` (필요 시).
5. 워크트리 생성: `git worktree add ../AI-roadmap-dashboard-bug-audit -b chore/bug-audit-2026-05-21 main`
6. 작업 디렉터리 전환: `cd ../AI-roadmap-dashboard-bug-audit`
7. 의존성: `npm install` (워크트리는 `node_modules` 비공유). E2E 재현이 필요하면 `npx playwright install`도.

> 본 세션의 모든 파일 작업은 위 워크트리 안에서 진행. 산출물 보고서·계획서도 워크트리의 `docs/` 안에 작성.

## 2. 활용할 Skill · MCP · 서브에이전트

### Superpowers Skill (필수 호출)

- `/using-superpowers` — 세션 시작 직후 (관련 스킬 발동 게이트)
- `/test-driven-development` — 해결 계획서 본문에 반드시 명시
- `/verification-before-completion` — 본 세션 종료 직전 호출
- `superpowers:dispatching-parallel-agents` — 본 감사는 **반드시 병렬 처리가 효율적**
- `superpowers:systematic-debugging` — 결함 진단·재현 시
- `superpowers:writing-plans` — 해결 계획서 작성 시
- `superpowers:requesting-code-review` — 보고서·계획서 완성 후 자체 검토

### 프로젝트 · 전역 Skill (해당 영역 점검 시)

- `check-server-action` — `actions.ts` 영역 점검
- `supabase-dev` — 마이그레이션·RLS·SQL 영역
- `frontend-guide` — UI 컴포넌트·페이지 영역
- `react-best-practices` · `composition-patterns` · `web-design-guidelines` · `refactoring`

### MCP

- `serena` — 시맨틱 심볼 탐색 (`find_symbol`, `find_referencing_symbols`, `search_for_pattern`)
- `supabase` — 로컬 DB 검증 (`list_tables`, `get_advisors`, `get_logs`, `execute_sql`)
- `context7` — Next.js 16 / React 19 / Supabase 최신 동작 확인 (추측 금지)
- `puppeteer` — 사용자 흐름 실제 브라우저 재현·스크린샷
- `shadcn` — 컴포넌트 사양 조회

### 커스텀 서브에이전트 — **병렬 적극 활용**

> 본 감사의 핵심. **충돌 없는 영역으로 분할해 한 메시지에 다수 병렬 디스패치**한다. 읽기·grep만 수행하며 코드 수정은 금지.

| 에이전트                 | 담당 영역 (충돌 없음)                                                               | 산출 기대치                                       |
| ------------------------ | ----------------------------------------------------------------------------------- | ------------------------------------------------- |
| `Explore` ❶              | `src/app/(auth)/*` 회원가입·로그인·세션 흐름                                        | 사용자 가시 결함 후보 + 재현 단계                 |
| `Explore` ❷              | `src/app/(dashboard)/dashboard/*` + `messages/*` (Realtime DM 포함)                 | 동일                                              |
| `Explore` ❸              | `src/app/(dashboard)/consultant/*` 컨설턴트 흐름 (home·profile·projects)            | 동일                                              |
| `Explore` ❹              | `src/app/(dashboard)/ops/*` 운영관리(프로젝트·사용자·템플릿·감사·쿼터·공지)         | 동일                                              |
| `Explore` ❺              | `gallery/*` + `notifications/*` + 공지·프로필                                       | 동일                                              |
| `Explore` ❻              | 공통 컴포넌트 (`src/components/*`) + 미들웨어 + 전역 CSS + 레이아웃                 | 헤더 drift · 모달 · 토스트 · 스크롤 · 모바일      |
| `security-auditor`       | RLS · 역할 검증 · 세션 · admin 클라이언트 오용 · 환경변수 노출                      | 사용자에게 노출될 수 있는 권한·데이터 누설 결함   |
| `postgres-pro`           | DB · RLS · RPC · 인덱스 부재로 인한 "데이터 안 보임" · "타임아웃" · "조용한 누락"   | DB 계층 결함 후보                                 |
| `performance-engineer`   | 번들 · SC/CC 경계 · 캐싱 · Realtime 누락 · 깜빡임 · `router.refresh` 오용           | UX 체감 결함                                      |
| `test-automator`         | E2E · 단위 테스트 사각지대 (테스트되지 않은 분기점)                                 | 사용자 흐름 중 미커버 분기 + 테스트 시나리오 초안 |
| `prompt-engineer` (선택) | LLM 호출 흐름(매칭·로드맵·PBL·인터뷰) silent fail · JSON 파싱 오류 · 토큰 한도 초과 | LLM 계층 결함 후보                                |

**병렬 디스패치 규칙:**

- 한 메시지에 여러 `Agent` tool 호출을 동시 포함.
- 모든 에이전트는 **읽기 전용**(Read/Grep/Glob). 코드 수정 금지.
- 각 에이전트에는 **자기 영역 + 출력 포맷(§4 5단 포맷)** 을 명확히 전달.
- 결과 회수 후 메인 세션이 중복 제거 · 등급 분류 · 보고서 통합 담당.

> `frontend-design` 플러그인은 사용 금지 (B2B 대시보드에 부적합 — MEMORY.md 명시).

## 3. 감사 범위 · 우선순위

### 우선순위 (사용자 관점 임팩트 순)

| 등급                    | 정의                                                                                                       | 예시                                          |
| ----------------------- | ---------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| **P1 차단성**           | 클릭은 되지만 아무 일도 일어나지 않음(silent fail), 영구 에러, 데이터 손실, 권한 누설, 무한 로딩           | "AI 로드맵 생성" 클릭 시 토스트도 없이 무반응 |
| **P2 오해 유발**        | 잘못된 라벨 · 토스트 누락 · 비활성/활성 잘못 · 검증 메시지 누락 · 헤더 drift · 모달 닫기 · 뒤로가기 어긋남 | 진행 중 단계 라벨이 실제 단계와 다름          |
| **P3 시각·문구·접근성** | 텍스트 잘림 · 정렬 깨짐 · 키보드 포커스 누락 · 색 대비 부족 · 띄어쓰기 오류 · 깜빡임                       | 모바일에서 버튼이 화면 밖으로 잘림            |

### 점검 범위

- **6개 역할 흐름 모두** — `PUBLIC` · `USER_PENDING` · `OPS_ADMIN_PENDING` · `CONSULTANT_APPROVED` · `OPS_ADMIN` · `SYSTEM_ADMIN`
- **핵심 워크플로우** — 회원가입 → 진단 → 매칭 → 배정 → 인터뷰 → 로드맵 DRAFT → FINAL → 내보내기 (PDF/XLSX/HWPX)
- **부가 메뉴** — 메시지(Realtime DM) · 갤러리(좋아요·공유) · 알림 · 공지 · 프로필 · 감사로그 · 쿼터
- **공통 UX** — 로그인/로그아웃 · 세션 만료 · 뒤로가기 · 새로고침 · 새 탭 · 모바일(<768px) · 키보드 내비게이션
- **입력 검증** — 폼 · 업로드(이미지/문서) · 검색 · 필터 · 페이지네이션 · 정렬

### 제외 (이번 회차)

- 신규 기능 제안 · UI 개편 제안 (버그·오류 한정)
- 이미 archive 보고서에 RESOLVED로 표기된 결함 (중복 보고 금지)
- 성능 최적화 · 디자인 개선 (별도 트랙)

## 4. 산출물 ① — 보고서

### 위치 · 이름

- 파일: `docs/reports/2026-05-21-system-bug-audit.md`

### 상단 헤더

```
# 시스템 전수 버그 감사 보고서

> 작성일: 2026-05-21
> 조사 방식: N개 서브에이전트 병렬 전수조사
> 조사 범위: 6개 역할 · 전체 워크플로우 · 공통 UX
> 환경: 로컬 Supabase (http://127.0.0.1:54321)
> 테스트 계정: son@test.com / kpc@test.com / sysadmin@test.com (모두 test1234!)

## 0. 요약 (TL;DR)
- 총 N건 (P1 N건 · P2 N건 · P3 N건)
- 가장 시급: ...

## 1. 결함 한눈에 보기

| # | 제목 | 등급 | 메뉴 경로 | 상태 |
|---|---|---|---|---|
| #001 | ... | P1 | 운영관리 > 감사로그 | 🔴 OPEN |
```

### 결함 1건당 5단 포맷 — **사용자 관점**

> 개발자 용어는 최소화. 메뉴명·버튼 라벨은 실제 UI 텍스트 그대로 인용 ("배정하기", "AI 로드맵 생성" 등).

```markdown
### #NNN. {한 줄 제목}

- **등급:** P1 ★★★★★
- **영향 받는 사용자:** OPS_ADMIN / CONSULTANT_APPROVED / USER_PENDING …
- **현상 (사용자가 보는 것):** 1~2문장으로 간결히

- **재현 경로 (사용자 관점):**
  1. 로그인 화면에서 `son@test.com` / `test1234!`로 로그인
  2. 좌측 사이드바 **운영관리** → **사용자 관리** 클릭
  3. 검색창에 "테스트"를 입력하고 Enter
     → 결과 목록이 표시되지 않고 화면이 비어있음 (로딩 스피너만 계속 회전)

- **기대 동작 (사용자 관점):**
  → "검색 결과가 없습니다" 안내 문구가 표시되어야 함

- **해결 방향 (사용자가 이해할 수 있게, 1~2줄):**
  - "검색이 빈 결과를 반환할 때 '검색 결과가 없습니다' 안내를 보여주도록 화면을 보완합니다."

- **기술 근거 (개발자 부록):**
  - 파일: `src/app/(dashboard)/ops/users/_components/UserManagementTable.tsx:142`
  - 원인 가설: 빈 배열 분기 누락
```

### 보고서 작성 규칙

- **추측 금지** — 모든 결함은 코드 인용 또는 `puppeteer` 실제 재현 중 하나로 근거 확보.
- **archive 보고서와 중복 금지** — 이미 RESOLVED 처리된 결함은 기재하지 않음. 단, "재발 의심"은 별도 섹션에 기재.
- **재현 단계는 메뉴명·버튼명 그대로** — `/ops/users` 같은 URL이 아닌 "운영관리 > 사용자 관리".

## 5. 산출물 ② — 해결 계획서

### 위치 · 이름

- 파일: `docs/plans/2026-05-21-system-bug-audit-fix-plan.md`
- 작성 도구: `superpowers:writing-plans` 사용 (Plan Mode 진입 후 작성)

### 계획서 본문에 **반드시 명시**할 조건 (그대로 인용)

```
# 조건

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
```

### 계획서 본문 구성

- **Phase 0 — 환경 셋업:** Docker Desktop 확인 → `npx supabase start` → `npx supabase db reset` → `npm install` → `npm run dev`
- **Phase 1 — 결함 충돌 매트릭스:** 같은 파일·라우트를 건드리는 결함은 순차, 독립 결함은 병렬 묶음. 어떤 서브에이전트가 어떤 묶음을 맡을지 명시.
- **Phase 2 — 결함별 해결 단계:** 결함당 ① 원인 가설 → ② TDD 실패 테스트(RED) → ③ 최소 구현(GREEN) → ④ 리팩터링 → ⑤ 재현 시나리오로 회귀 검증.
- **Phase 3 — 사전 grep 영향 범위 점검:** CLAUDE.md "사전 grep으로 영향 범위 점검" 규칙 적용 (UI 라벨 · Server Action 시그니처 · helper 시맨틱 등 변경 시).
- **Phase 4 — 통합 회귀 검증:** `npm run validate && npm run build` 통과 + 핵심 E2E 통과 + 기존 정상 흐름(회원가입·승인·프로젝트 생성·로드맵 생성·내보내기) 무회귀 확인.
- **Phase 5 — 보고서 상태 갱신:** 보고서의 `🔴 OPEN` → `🟢 RESOLVED`, "해결 정보: PR #NN · 커밋 abc1234 · 검증자: 자동 테스트 + 수동 확인" 부기.
- **Phase 6 — PR 생성:** 제목 `fix: 시스템 전수 감사 결함 N건 해결`. PR 본문에 결함 번호·검증 방법·CI 통과 여부.

### 계획서에 반드시 포함할 스킬·MCP·서브에이전트 호출 표

§2의 표를 계획서에도 그대로 옮기되, 결함별로 어떤 스킬·MCP·에이전트를 쓸지 매핑.

## 6. 본 세션 실행 흐름

### Step 1. 사전 컨텍스트 로드 + 워크트리 생성

§0 문서 읽기 → §1 워크트리 생성 → `/using-superpowers` 호출.

### Step 2. 병렬 감사 (읽기 전용)

§2의 서브에이전트 표대로 한 메시지에 다수 디스패치. 각 에이전트는 §4의 5단 포맷으로 후보 결함 + 재현 단계 + 1차 원인 가설 반환.

### Step 3. 사용자 관점 재현 검증

`puppeteer` MCP로 후보 결함을 실제 브라우저에서 재현 (가능한 것만). 재현 안 되는 후보는 보고서에서 제외하거나 "재현 조건 불명" 섹션으로 강등.

### Step 4. 보고서 작성

§4 포맷대로 `docs/reports/2026-05-21-system-bug-audit.md` 작성. archive 보고서와 중복 결함은 제거. P1/P2/P3 분류. `superpowers:requesting-code-review`로 자체 검토.

### Step 5. 해결 계획서 작성 (Plan Mode 진입)

`superpowers:writing-plans` + `EnterPlanMode` → §5 포맷대로 `docs/plans/2026-05-21-system-bug-audit-fix-plan.md` 작성 → `ExitPlanMode`로 사용자 승인 대기.

### Step 6. 종료 직전 검증

`/verification-before-completion` 호출 → 보고서·계획서 파일 존재·내용·포맷 확인 → 사용자에게 최종 보고.

## 7. 금지 사항

- **본 세션에서 코드 수정 금지** — 발견·보고·계획만. 실제 수정은 계획서 승인 후 별도 세션에서.
- **운영 Supabase 쓰기 금지** — 로컬(`http://127.0.0.1:54321`) 한정. `.env.local`이 운영 URL을 가리키는지 항상 확인.
- **추측 기반 결함 기재 금지** — 코드 인용 또는 `puppeteer` 재현 중 하나로 근거 확보.
- **archive 보고서 RESOLVED 결함 중복 보고 금지.**
- **사용자 가시 라벨·문구 임의 변경 제안 금지** — 보고서에 옵션으로 제시만.
- **`--force` 푸시 · `--no-verify` hooks 우회 금지.**

## 8. 작업 종료 시 사용자 보고 포맷

다음 3가지로 분리해 보고:

- ✅ **발견·정리한 결함:** 총 N건 (P1 N · P2 N · P3 N) + 보고서 경로 + 상위 3개 결함 한 줄 요약
- 📋 **해결 계획서:** 파일 경로 + 5개 조건 반영 여부 체크 + 권장 실행 순서 + 예상 소요 시간
- ⚠️ **보류/모호:** 재현 불명 결함 N건 + 추가 조사 필요 사항

---

> **본 프롬프트의 종착점은 "보고서 + 계획서" 두 산출물.** 코드 수정은 계획서 사용자 승인 후 후속 세션에서 진행한다.
