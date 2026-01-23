# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Always respond in Korean (한국어로 답변할 것).**

## Project Overview

KPC AI Training Roadmap Dashboard - A B2B internal tool for enterprise AI training diagnosis, consultant matching, and roadmap generation. The workflow: Enterprise diagnosis → Consultant assignment → On-site interview → AI training roadmap output.

## Commands

```bash
npm run dev              # Start dev server (localhost:3000)
npm run build            # Production build
npm run lint             # ESLint
npm run lint:fix         # Fix lint issues
npm run typecheck        # TypeScript type checking
npm run format           # Prettier formatting
npm run test             # Run tests (Vitest)
npm run test:watch       # Tests in watch mode
npm run test:coverage    # Generate coverage report
```

Database migrations: Run SQL files in `supabase/migrations/` sequentially via Supabase CLI (`supabase db push`) or SQL Editor.

## Architecture

```text
Next.js App Router (src/app/)
         │
         ├── Route Groups
         │   ├── (public)/     → Landing, demo (no auth)
         │   ├── (auth)/       → Login, register
         │   └── (dashboard)/  → Protected routes
         │       ├── consultant/  → Consultant-only UI
         │       └── ops/         → OPS_ADMIN-only UI
         │
         ├── API Routes (src/app/api/)
         │
         └── middleware.ts → Session management
                 │
                 ▼
Service Layer (src/lib/services/)
    ├── roadmap.ts      → LLM roadmap generation
    ├── matching.ts     → Consultant matching algorithm
    ├── quota.ts        → Daily/monthly LLM call limits
    ├── audit.ts        → Event logging
    ├── export-pdf.ts   → PDF generation (jspdf)
    └── export-xlsx.ts  → Excel generation (xlsx)
                 │
                 ▼
Supabase Clients (src/lib/supabase/)
    ├── client.ts       → Browser (anon key)
    ├── server.ts       → Server/SSR with session refresh
    └── admin.ts        → Service role for internal ops
                 │
                 ▼
Supabase Backend
    ├── PostgreSQL + RLS policies
    ├── Auth system
    └── Storage (PDF/XLSX files)
```

## Key Patterns

**Three Supabase Clients:**

- `client.ts` - Browser-side with anon key
- `server.ts` - Server/SSR with session refresh (use in Server Components and API routes)
- `admin.ts` - Service role for bypassing RLS (internal operations only)

**Role-Based Access (RBAC):**

- Roles: PUBLIC, USER_PENDING, CONSULTANT_APPROVED, OPS_ADMIN, SYSTEM_ADMIN
- RLS policies enforce database-level security (see `docs/RLS.md`)
- Consultants can only access their assigned cases

**Data Validation:**

- All input validated with Zod schemas in `src/lib/schemas/`
- Schemas have colocated tests (`.test.ts` files)

**API Route Pattern:**

1. Verify session
2. Check role permissions
3. Validate input with Zod
4. Execute business logic
5. Return `{ success, data/error }` JSON

**Case Workflow States:**

```text
NEW → DIAGNOSED → MATCH_RECOMMENDED → ASSIGNED → INTERVIEWED → ROADMAP_DRAFTED → FINALIZED
```

**Version Control for Roadmaps:**

- DRAFT versions can be created infinitely
- FINAL versions become ARCHIVED when new FINAL created
- Export (PDF/XLSX) uses stored data, no LLM re-calls

## Tech Stack

- **Framework:** Next.js 16 (App Router) + TypeScript (strict mode)
- **Database/Auth:** Supabase (Postgres + Auth + RLS + Storage)
- **Styling:** Tailwind CSS 4
- **Validation:** Zod
- **Testing:** Vitest + React Testing Library
- **Export:** jspdf, xlsx

## Environment Variables

Required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `LLM_API_KEY`

Optional: `LLM_API_BASE_URL`, `DAILY_LLM_CALL_LIMIT` (default: 100), `MONTHLY_LLM_CALL_LIMIT` (default: 2000)

## Commit Message Convention

커밋 메시지는 한국어로 작성하며, 다음 형식을 따릅니다:

```text
<타입>: <제목>

<본문 (선택)>
```

**타입:**

- `feat`: 새로운 기능 추가
- `fix`: 버그 수정
- `refactor`: 리팩토링 (기능 변경 없음)
- `docs`: 문서 수정
- `style`: 코드 포맷팅, 세미콜론 누락 등
- `test`: 테스트 추가/수정
- `chore`: 빌드, 설정 파일 수정

**예시:**

```text
feat: 로드맵 PDF 내보내기 기능 추가

- jspdf를 사용한 PDF 생성 로직 구현
- 로드맵 테이블 자동 레이아웃 적용
- 한글 폰트 지원 추가
```

```text
fix: 컨설턴트 매칭 점수 계산 오류 수정

- 산업 분야 가중치 누락 문제 해결
- calculateScore 함수에 industryWeight 반영
```

## Documentation

- `docs/ARCHITECTURE.md` - System diagrams and data flows
- `docs/RLS.md` - Row-level security policies
- `docs/DECISIONS.md` - Architecture Decision Records (ADRs)
