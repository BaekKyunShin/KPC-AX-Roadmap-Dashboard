# CLAUDE.md

이 파일은 Claude Code (claude.ai/code)가 본 저장소에서 작업할 때 참고하는 지침입니다.

**항상 한국어로 답변할 것.**

## 프로젝트 개요

KPC AI 훈련 로드맵 대시보드 — 기업 AI 교육 진단·컨설턴트 매칭·로드맵 생성 B2B 내부 도구.

**워크플로우:** 기업 진단 → 컨설턴트 배정 → 현장 인터뷰 → AI 훈련 로드맵 출력

## 명령어

```bash
npm run dev              # 개발 서버 (Next.js, localhost:3000)
npm run dev:vercel       # vercel dev (Python Functions 포함, HWPX 다운로드 테스트)
npm run dev:with-hwpx    # HWPX 브리지 서버 + Next.js 프록시 (권장)
npm run build            # 프로덕션 빌드
npm run lint:fix         # ESLint 자동 수정
npm run format           # Prettier 포맷팅
npm run validate         # typecheck + lint + test 통합 검증 (CI와 동일)
npm run test             # Vitest 단위 테스트
npm run test:watch       # Vitest 워치 모드
npm run test:coverage    # 커버리지 리포트
npm run test:e2e         # Playwright E2E
npm run db:start         # 로컬 Supabase 시작 (Docker Desktop 필요)
npm run db:reset         # 로컬 Supabase 리셋 (마이그레이션 재적용)
```

**작업 완료 검증:** 코드 수정 후 반드시 `npm run validate && npm run build` 통과 확인.

**배포 전 체크리스트:** `npm run validate` → `npm run build` → Vercel 배포.

## 핵심 규칙

**브랜치 워크플로우 (엄수):**

- `main`에 **직접 커밋 금지** — 모든 작업은 `git checkout -b <type>/<slug>` 분기 후 PR (Squash merge 환경에서 분기 누적 방지)

**DB 마이그레이션 (엄수):**

- `supabase/migrations/NNN_*.sql` 신규 작성·수정 시 **같은 작업 내**에 DB 적용까지 완료 (파일만 만들고 종료 금지)
- 적용 우선순위: ① `mcp__supabase__apply_migration` → ② `supabase db push` → ③ SQL Editor
- 적용 후 `mcp__supabase__list_migrations` 또는 `list_tables`로 검증
- 과거 수동 적용 마이그는 멱등 패치(`DROP IF EXISTS + CREATE`, `IF NOT EXISTS`)로 재등록
- ⚠️ `src/types/database.ts`는 **수동 작성 파일** — `supabase gen types`로 덮어쓰면 40+ 타입 참조가 깨짐. 마이그 후 신규 enum 값·인터페이스는 수동 편집 필수

**PR CI 통과 판정:** `gh pr checks <PR>`의 **모든 check** (Lint & Typecheck · Unit Test · Build · **E2E Test** · Vercel)가 pass 일 때만 "✅ 통과" 결정. Unit Test 만 보고 단정 금지 — E2E 가 별도 job 으로 가장 마지막. exit code 0 ≠ 모든 pass (출력 파싱이 정답).

## HWPX 로컬 테스트

`/api/hwpx/generate`는 Vercel Python Function — `next dev`에서 동작하지 않음. 권장 워크플로우(브리지 서버):

```bash
npm run dev:hwpx:setup   # 최초 1회 (Python venv 생성)
npm run dev:hwpx         # 터미널 A: 브리지 서버 (포트 3010)
npm run dev:with-hwpx    # 터미널 B: Next.js + 프록시 (포트 3000)
```

`next.config.ts`의 `rewrites()`가 `HWPX_DEV_PROXY_URL` 감지 시 `/api/hwpx/*`를 브리지로 포워딩 → 프로덕션 동일 출력 보장 (PBL 117KB · ROADMAP 411KB ZIP 검증 완료). 브리지 서버 없이 `npm run dev`로 HWPX 버튼 누르면 클라이언트에 3가지 해결 옵션 안내 메시지가 표출됨.

**대안:** ① Preview 배포(`git push` → Preview URL)에서 테스트 ② `npm run dev:vercel` — ⚠️ Vercel CLI 51.7+ 필수 (구버전은 Python 런타임 빌드 실패).

## 아키텍처

```text
src/app/                       # Next.js App Router
├── (auth)/                    # 로그인·회원가입
├── (dashboard)/               # 인증 필요
│   ├── dashboard/             # 공통 + 프로필 + 메시지(Realtime DM)
│   ├── consultant/            # 컨설턴트 (home, profile, projects)
│   ├── gallery/               # 로드맵 갤러리 (공유·좋아요)
│   ├── ops/                   # 운영관리자 (프로젝트·사용자·템플릿·감사·쿼터)
│   └── notifications/         # 알림 Server Actions
├── api/                       # 최소화 (Server Actions 우선)
└── middleware.ts              # 세션 관리

src/lib/
├── services/                  # 핵심 로직 (roadmap·matching·pbl·interview·
│                              #   export·llm·quota·notification·stt·audit·email)
├── supabase/                  # client(브라우저) · server(SSR) · admin(RLS우회) · middleware
├── schemas/                   # Zod 검증 + 테스트
├── actions/                   # 공유 Server Action 헬퍼 (인증·역할 검증)
├── constants/                 # 역할·상태·업종 상수
├── utils/                     # 유틸 (에러·토스트 등)
└── types/                     # ActionResult 등 공통 타입
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
- `middleware.ts` — 미들웨어 세션 확인

**RBAC (6역할):** `PUBLIC`, `USER_PENDING`, `OPS_ADMIN_PENDING`, `CONSULTANT_APPROVED`, `OPS_ADMIN`, `SYSTEM_ADMIN`. RLS 정책으로 DB 수준 보안 (`docs/RLS.md`).

**데이터 검증:** 모든 입력은 `src/lib/schemas/`의 Zod 스키마로. 스키마와 `*.test.ts`는 같은 위치 배치.

**라우트 디렉터리 규칙:**

- `(group)/` — 라우트 그룹 (URL 영향 없음, 레이아웃 분리용)
- `_components/` — 라우트 내부 전용 컴포넌트 (라우팅 제외)
- `actions.ts` — 라우트별 Server Action 정의
- `__tests__/` — 단위 테스트 코로케이션

**프로젝트 상태 흐름:**

```text
NEW → DIAGNOSED → MATCH_RECOMMENDED → ASSIGNED → INTERVIEWED → ROADMAP_DRAFTED → FINALIZED
```

각 상태 의미:

- `NEW` → `DIAGNOSED`: 기업이 진단 설문 완료
- `DIAGNOSED` → `MATCH_RECOMMENDED`: LLM 매칭으로 컨설턴트 후보 추천
- `MATCH_RECOMMENDED` → `ASSIGNED`: 운영관리자가 컨설턴트 배정
- `ASSIGNED` → `INTERVIEWED`: 컨설턴트가 현장 인터뷰 완료
- `INTERVIEWED` → `ROADMAP_DRAFTED`: 로드맵 DRAFT 생성 (LLM 호출)
- `ROADMAP_DRAFTED` → `FINALIZED`: 운영관리자가 FINAL 확정

**로드맵 버전 관리:** DRAFT 무제한, FINAL 생성 시 기존 FINAL은 ARCHIVED. 내보내기(PDF/XLSX/HWPX)는 저장 데이터 사용 (LLM 재호출 없음).

## 기술 스택

Next.js 16.x (App Router · React Compiler) + TypeScript 5.x strict / Supabase / Tailwind 4.x / Radix UI + shadcn/ui / Zod (네이티브 폼, RHF 미사용) / Recharts / Sonner / Vitest + RTL + Playwright / jspdf · xlsx-js-style.

## 환경 변수

**필수:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `LLM_API_KEY`.

**선택:** `LLM_API_BASE_URL`, `DAILY_LLM_CALL_LIMIT`(기본 50), `MONTHLY_LLM_CALL_LIMIT`(기본 500), `NEXT_PUBLIC_APP_URL`, SMTP (`SMTP_HOST/PORT/USER/PASS`, `EMAIL_FROM`).

## 커밋 메시지 규칙

```text
<타입>: <한국어 제목>

<본문 (선택)>
```

**타입:** `feat`(신규), `fix`(버그), `refactor`(리팩토링), `docs`, `style`, `test`, `chore`(빌드·설정).

**예시:**

```text
feat: 로드맵 PDF 내보내기 기능 추가

- jspdf 사용한 PDF 생성 로직 구현
- 한글 폰트 지원 추가
```

**PR 제목도 동일 규칙.** 본 저장소는 Squash merge → PR 제목이 그대로 main 커밋 메시지가 됨.

## 스킬 규칙

IMPORTANT: Superpowers 플러그인 설치됨. 작업 전 관련 superpowers 스킬 확인·호출. **TDD 전면 적용** (예외: 일회성 프로토타입, 생성 코드, 설정 파일).

**해당 영역 코드 수정 시 반드시 호출:**

| 조건 | 스킬 | 범위 |
|------|------|------|
| UI 컴포넌트·페이지 작성 | `frontend-guide` | 프로젝트 |
| UI 검수 (접근성·UX 감사) | `web-design-guidelines` | 전역 |
| React/Next.js 작성·리뷰·성능 | `react-best-practices` | 전역 |
| 컴포넌트 구조 설계·리팩토링 | `composition-patterns` | 전역 |
| Server Action (`actions.ts`) 수정 | `check-server-action` | 프로젝트 |
| 마이그레이션·RLS·DB 함수 작성 | `supabase-dev` | 프로젝트 |
| 리팩터링·코드 정리 | `refactoring` | 전역 |

여러 스킬 해당 시 모두 호출. 스킬 호출 후 작업 컨텍스트에 맞게 적용.

## 문서

| 문서 | 용도 |
|------|------|
| `docs/ARCHITECTURE.md` | 시스템 다이어그램·데이터 흐름 |
| `docs/RLS.md` | Row-Level Security 정책 |
| `docs/DECISIONS.md` | 아키텍처 결정 기록 (ADR) |
| `docs/CONSULTANT_PROFILE_SPEC.md` | 컨설턴트 프로필 명세 |
| `docs/PERFORMANCE_BUDGET.md` | 성능 예산·측정 기준 |
| `docs/PROJECT_OUTLINE.md` | 초기 기획서 (아카이브) |

**네이밍:** 상시 참조는 `UPPER_SNAKE_CASE.md` (예: `ARCHITECTURE.md`), 시점 기반 기획·설계는 `YYYY-MM-DD-kebab-case.md`.
