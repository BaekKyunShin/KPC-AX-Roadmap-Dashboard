# CLAUDE.md

## 프로젝트 개요

KPC AI 훈련 로드맵 대시보드 — 기업 AI 교육 진단·컨설턴트 매칭·산출물 생성 B2B 내부 도구.

**워크플로우:** 기업 진단 → 컨설턴트 배정 → 현장 인터뷰 → 산출물 출력

**2트랙 (`ProjectTrack`):** `ROADMAP`(AI 훈련 로드맵) · `PBL`(프로젝트 기반 학습 보고서). 트랙마다 초안 상태(`ROADMAP_DRAFTED` / `PBL_DRAFTED`)·서비스(`services/roadmap` / `services/pbl`)·내보내기 템플릿이 갈린다. 상태·자격 판정은 반드시 `src/lib/constants/status.ts` 상수 사용.

## 명령어

```bash
npm run validate      # typecheck + lint + test (CI 동일) — 작업 완료 판정 기준
npm run build         # 프로덕션 빌드 — validate 통과 후 필수
npm run dev           # 개발 서버 (localhost:3000, HWPX 제외)
npm run test:e2e      # Playwright — 사전에 db:start 필요 (Docker Desktop 기동 확인)
npm run db:start      # 로컬 Supabase (Docker Desktop 필요) / db:reset 은 마이그 재적용
npm run knip          # dead code 탐지 (정보성, CI 비차단)
```

**완료 판정:** `npm run validate && npm run build` 통과 확인 없이 "완료" 보고 금지.

**커밋 시 자동 수정:** husky pre-commit → lint-staged 가 스테이지 파일에 `eslint --fix` + `prettier --write` 를 적용한다. 커밋 후 diff 가 예상과 다르면 이 훅을 먼저 의심.

## 핵심 규칙

**브랜치 (엄수):**

- `main`에 **직접 커밋 금지** — 모든 작업은 `git checkout -b <type>/<slug>` 분기 후 PR (Squash merge 환경에서 분기 누적 방지)

**DB 마이그레이션 (엄수):**

- `supabase/migrations/NNN_*.sql` 신규 작성·수정 시 **같은 작업 내**에 DB 적용까지 완료 (파일만 만들고 종료 금지)
- 적용 우선순위: ① `mcp__supabase__apply_migration` → ② `supabase db push` → ③ SQL Editor
- 적용 후 `mcp__supabase__list_migrations` 또는 `list_tables`로 검증
- 과거 수동 적용 마이그는 멱등 패치(`DROP IF EXISTS + CREATE`, `IF NOT EXISTS`)로 재등록
- ⚠️ `src/types/database.ts`는 **수동 작성 파일** — `supabase gen types`로 덮어쓰면 40+ 타입 참조가 깨짐. 마이그 후 신규 enum 값·인터페이스는 수동 편집 필수

**PR CI 통과 판정:** `gh pr checks <PR>` 출력을 **파싱**해 모든 check 가 pass 일 때만 "✅ 통과" 결정. job: Lint & Typecheck · Unit Test · Build · **E2E Test** · Lighthouse CI · Vercel (+ Knip 정보성). E2E 가 별도 job 으로 가장 마지막에 끝나므로 Unit Test 만 보고 단정 금지. exit code 0 ≠ 모든 pass.

**회귀 차단 3단 (엄수):**

기능 개발·버그 수정·리팩터링 등 **모든 코드 변경**은 명시적으로 의도한 것 외에 기존 로직·UI·기능을 바꾸지 않는다. 착수 → 작업 → 완료 각 시점에 아래를 수행한다.

1. **착수 — 변경 허용 목록 선언**: 바뀌어도 되는 파일·동작을 먼저 적는다. 목록 밖 변경 금지. 작업 중 필요해지면 임의로 넓히지 말고 사용자에게 확인.
2. **작업 중 — 특성화 테스트 선작성**: 손대기 전 현재 동작을 고정하는 테스트를 추가한다. 기존 테스트가 그 동작을 단언하지 않으면 안전망이 없는 것이다. 회귀를 실제로 잡는지 의심되면 결함을 일부러 주입해 실패를 확인한 뒤 제거한다 (주입·원복 모두 Edit 역치환으로, `git checkout` 금지 — 미커밋 구현이 소실됨).
3. **완료 — grep 전수 + diff 대조**: 아래 표대로 사용처를 grep 하고, `git diff --stat` 을 허용 목록과 대조한다. 벗어난 변경은 되돌리거나 사용자에게 보고 후 결정을 받는다.

| 변경 종류                        | grep 키워드                                    |
| -------------------------------- | ---------------------------------------------- |
| UI 라벨·토스트·다이얼로그 워딩   | 새 라벨 + **옛 라벨** 양쪽                     |
| Server Action 시그니처·반환 타입 | 함수명 (예: `assignConsultant`)                |
| Helper/훅 시맨틱                 | helper 명 + 의존 키워드 (예: `router.refresh`) |
| Component prop 추가·개명         | 컴포넌트명 (예: `ManualAssignmentForm`)        |
| 라우트·환경변수·Enum 값          | 옛 path · ENV 명 · enum 값명                   |

검색 범위 `src/` + `e2e/`. 의심 spec 은 `npx playwright test e2e/<path>.spec.ts` 부분 실행. **`npm run validate` 통과는 통합 흐름 결함을 못 잡는다 — grep 은 별도로 필수.**

## HWPX 로컬 테스트

`/api/hwpx/generate` 는 Vercel Python Function — `next dev` 에서 동작하지 않는다. 터미널 A `npm run dev:hwpx` (브리지 3010) + 터미널 B `npm run dev:with-hwpx` 로 테스트. 최초 1회 `npm run dev:hwpx:setup`. 상세·대안·트러블슈팅: `docs/references/HWPX_LOCAL_DEV.md`.

## 아키텍처

```text
src/app/
  (auth)/         로그인·회원가입
  (dashboard)/    인증 필요 — dashboard(공통·프로필·Realtime DM) · consultant · ops
                  · gallery · notices · notifications · search
  assessment/     토큰 링크 기반 공개 진단     api/    최소화 (Server Actions 우선)
src/proxy.ts      세션 갱신 — Next.js 16 은 middleware.ts 가 아니라 proxy.ts 다
src/lib/
  services/       roadmap · pbl · matching · interview · export · llm · quota
                  · notification · stt · audit · email · storage · file-parser
  supabase/       client(브라우저) · server(SSR) · admin(RLS우회) · middleware
  schemas/(Zod)  actions/(공유 인증 헬퍼)  constants/  utils/  types/  data/  fixtures/
```

**Backend:** Supabase (Postgres + RLS · Auth · Realtime · Storage). 시스템 다이어그램: `docs/ARCHITECTURE.md`.

## 핵심 패턴

**Server Actions 우선:** API Routes 대신 라우트별 `actions.ts` 사용. API Routes는 스트리밍·외부 호출이 필요한 경우만.

**Server Action 5단계 패턴:**

1. 세션 확인 → 2. 역할 권한 검사 → 3. Zod 입력 검증 → 4. 비즈니스 로직 → 5. `ActionResult<T>` 반환 (`src/lib/types/action-result.ts`)

주의: 직렬화 불가 객체(Date, Map) 반환 금지. `.select().single()` 후 에러 처리 필수. 컨설턴트는 자신의 담당 프로젝트만 접근하도록 추가 검증.

**Supabase 클라이언트 4종 (`src/lib/supabase/`):**

- `client.ts` — 브라우저 (anon key)
- `server.ts` — Server Components/Actions (세션 갱신 포함)
- `admin.ts` — 서비스 역할 (RLS 우회, 내부 작업 전용)
- `middleware.ts` — 세션 갱신 (`src/proxy.ts` 가 호출)

Server Component/Action 에서 사용자·프로필 조회는 `supabase/cached.ts` 의 `getCachedUser()` / `getCachedProfile()` 사용 — `React.cache` 로 감싸 layout → page → Action 체인에서 1회만 실행된다. `createClient()` 직후 `auth.getUser()` 를 직접 부르면 요청당 중복 호출이 쌓인다.

**RBAC (6역할):** `PUBLIC`, `USER_PENDING`, `OPS_ADMIN_PENDING`, `CONSULTANT_APPROVED`, `OPS_ADMIN`, `SYSTEM_ADMIN`. RLS 정책으로 DB 수준 보안 (`docs/RLS.md`).

**데이터 검증:** 모든 입력은 `src/lib/schemas/`의 Zod 스키마로. 스키마와 `*.test.ts`는 같은 위치 배치.

**라우트 디렉터리 규칙:**

- `(group)/` — 라우트 그룹 (URL 영향 없음, 레이아웃 분리용)
- `_components/` — 라우트 내부 전용 컴포넌트 (라우팅 제외)
- `_meta.ts` — `PAGE_TITLE` / `PAGE_DESCRIPTION` 등 헤더 텍스트 단일 출처
- `actions.ts` — 라우트별 Server Action 정의
- `__tests__/` — 단위 테스트 코로케이션

**page ↔ loading 헤더 동기화:**

`page.tsx` 와 `loading.tsx` 의 헤더 텍스트는 같은 디렉터리 `_meta.ts` 상수만 import 한다. 양쪽에 문자열이 직접 박히면 page 만 고쳐지고 loading 이 누락돼 drift(잘못된 헤더 깜빡)가 쌓인다. **신규 page+loading 쌍은 `_meta.ts` 필수. 기존 미적용분은 그 디렉터리를 손댈 때 함께 도입.**

**프로젝트 상태 흐름:**

```text
NEW → DIAGNOSED → MATCH_RECOMMENDED → ASSIGNED → INTERVIEWED ─┬→ ROADMAP_DRAFTED ─┐
                                                              └→ PBL_DRAFTED ─────┴→ FINALIZED
```

진단 설문 완료 → LLM 매칭 추천 → 운영관리자 배정 → 컨설턴트 인터뷰 완료 → 트랙별 DRAFT 생성(LLM 호출) → 운영관리자 FINAL 확정. 상태 집합은 하드코딩 금지 — `ROADMAP_ELIGIBLE_STATUSES` · `PBL_ELIGIBLE_STATUSES` · `EXPORT_ELIGIBLE_STATUSES` (`src/lib/constants/status.ts`) 사용.

**버전 관리(로드맵·PBL 공통):** DRAFT 무제한, FINAL 생성 시 기존 FINAL은 ARCHIVED. 내보내기(PDF/XLSX/HWPX)는 저장 데이터 사용 (LLM 재호출 없음).

**행정 종결:** 잠금 판정은 status 가 아니라 `projects.closed_at` 기준 (마이그 076).

## 기술 스택

Next.js 16.x (App Router · React Compiler) + TypeScript 5.x strict / Supabase / Tailwind 4.x / Radix UI + shadcn/ui / Zod (네이티브 폼, RHF 미사용) / Recharts / Sonner / Vitest + RTL + Playwright / jspdf · xlsx-js-style.

## 환경 변수

**필수:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `LLM_API_KEY`.

**선택:** `LLM_API_BASE_URL`, `DAILY_LLM_CALL_LIMIT`(기본 50), `MONTHLY_LLM_CALL_LIMIT`(기본 500), `NEXT_PUBLIC_APP_URL`, SMTP (`SMTP_HOST/PORT/USER/PASS`, `EMAIL_FROM`).

## 커밋·PR 제목

형식·타입·길이는 전역 지침(`~/.claude/CLAUDE.md`)을 따른다 — 타입은 commitlint 표준 11종.

**PR 제목도 동일 규칙** — 본 저장소는 Squash merge 라 PR 제목이 그대로 main 커밋 메시지가 된다.

## 스킬 규칙

IMPORTANT: Superpowers 플러그인 설치됨. 작업 전 관련 superpowers 스킬 확인·호출. **TDD 전면 적용** (예외: 일회성 프로토타입, 생성 코드, 설정 파일). 작업 완료 전 `verification-before-completion` 호출.

**아래 영역을 건드리면 반드시 해당 스킬을 먼저 호출한다. 여러 개 해당 시 전부.**

| 대상                         | 스킬                                                      |
| ---------------------------- | --------------------------------------------------------- |
| UI 컴포넌트·페이지 작성      | `frontend-guide` (UI 검수는 `web-design-guidelines` 병행) |
| React/Next.js 작성·리뷰·성능 | `react-best-practices`                                    |
| 컴포넌트 구조 설계           | `composition-patterns`                                    |
| Server Action (`actions.ts`) | `check-server-action`                                     |
| 마이그레이션·RLS·DB 함수     | `supabase-dev`                                            |
| 리팩터링·코드 정리           | `refactoring`                                             |
| HWPX 문서 생성·편집          | `hwpx-docgen`                                             |

## 문서

`docs/` — `ARCHITECTURE.md`(다이어그램·데이터 흐름) · `RLS.md`(RLS 정책) · `DECISIONS.md`(ADR) · `CONSULTANT_PROFILE_SPEC.md` · `PERFORMANCE_BUDGET.md` · `PROJECT_OUTLINE.md`(초기 기획, 아카이브) · `references/`(HWPX 템플릿·로컬 개발) · `plans/` `reports/` `decisions/` `testing/`

**네이밍:** 상시 참조는 `UPPER_SNAKE_CASE.md`, 시점 기반 기획·설계는 `YYYY-MM-DD-kebab-case.md`.
