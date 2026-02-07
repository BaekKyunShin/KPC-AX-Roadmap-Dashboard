# CLAUDE.md

이 파일은 Claude Code (claude.ai/code)가 본 저장소에서 작업할 때 참고하는 지침입니다.

**항상 한국어로 답변할 것.**

## 프로젝트 개요

KPC AI 훈련 로드맵 대시보드 - 기업 AI 교육 진단, 컨설턴트 매칭, 로드맵 생성을 위한 B2B 내부 도구입니다.

**워크플로우:** 기업 진단 → 컨설턴트 배정 → 현장 인터뷰 → AI 훈련 로드맵 출력

## 명령어

```bash
npm run dev              # 개발 서버 시작 (localhost:3000)
npm run build            # 프로덕션 빌드
npm run lint             # ESLint 검사
npm run lint:fix         # 린트 오류 자동 수정
npm run typecheck        # TypeScript 타입 검사
npm run format           # Prettier 포맷팅
npm run format:check     # 포맷팅 검사 (CI용)
npm run test             # 테스트 실행 (Vitest)
npm run test:watch       # 테스트 워치 모드
npm run test:coverage    # 커버리지 리포트 생성
npm run validate         # typecheck + lint + test 통합 검증
```

**데이터베이스 마이그레이션:** `supabase/migrations/` 폴더의 SQL 파일을 Supabase CLI (`supabase db push`) 또는 SQL Editor에서 순차적으로 실행

## 아키텍처

```text
Next.js App Router (src/app/)
         │
         ├── 공개 라우트
         │   ├── page.tsx        → 랜딩 페이지
         │   └── demo/           → 샘플 데모
         │
         ├── Route Groups
         │   ├── (auth)/         → 로그인, 회원가입
         │   └── (dashboard)/    → 인증 필요 라우트
         │       ├── dashboard/    → 공통 대시보드 + 프로필
         │       ├── consultant/   → 컨설턴트 전용 (프로필, 프로젝트, 인터뷰, 로드맵)
         │       ├── ops/          → 운영관리자 전용 (프로젝트, 사용자, 템플릿, 감사로그, 쿼터)
         │       └── test-roadmap/ → 테스트 로드맵 (컨설턴트 연습용)
         │
         ├── API Routes (src/app/api/) → 최소화 (Server Actions 우선)
         │
         └── middleware.ts → 세션 관리
                 │
                 ▼
Shared Layers (src/lib/)
    ├── services/           → 핵심 비즈니스 로직
    │   ├── roadmap.ts          → LLM 로드맵 생성
    │   ├── llm.ts              → LLM API 호출 추상화
    │   ├── matching.ts         → 컨설턴트 매칭 알고리즘
    │   ├── stt.ts              → STT 인사이트 추출
    │   ├── quota.ts            → 일별/월별 LLM 호출 제한
    │   ├── audit.ts            → 이벤트 로깅
    │   ├── export-pdf.ts       → PDF 생성 (jspdf)
    │   └── export-xlsx.ts      → Excel 생성 (xlsx)
    ├── constants/          → 역할·상태·업종 등 상수 집중 관리
    ├── schemas/            → Zod 검증 스키마 + 테스트
    ├── utils/              → 유틸리티 함수 (에러 처리, 토스트 등)
    ├── actions/            → 공유 Server Actions 헬퍼
    └── types/              → ActionResult 등 공통 타입
                 │
                 ▼
Supabase Clients (src/lib/supabase/)
    ├── client.ts       → 브라우저용 (anon key)
    ├── server.ts       → 서버/SSR용 (세션 갱신 포함)
    ├── admin.ts        → 서비스 역할 (RLS 우회, 내부 작업용)
    └── middleware.ts   → 미들웨어용
                 │
                 ▼
Supabase Backend
    ├── PostgreSQL + RLS 정책
    ├── Auth 시스템
    └── Storage (PDF/XLSX 파일)
```

## 주요 패턴

**Server Actions 우선:**

- API Routes 대신 Server Actions를 우선 사용
- 각 라우트의 `actions.ts` 파일에 정의
- API Routes는 스트리밍이나 외부 호출이 필요한 경우에만 사용

**Supabase 클라이언트 4종:**

- `client.ts` - 브라우저 측, anon key 사용
- `server.ts` - 서버/SSR용, 세션 갱신 포함 (Server Components와 Server Actions에서 사용)
- `admin.ts` - 서비스 역할, RLS 우회 (내부 작업 전용)
- `middleware.ts` - 미들웨어에서 세션 확인용

**역할 기반 접근 제어 (RBAC):**

- 역할: PUBLIC, USER_PENDING, OPS_ADMIN_PENDING, CONSULTANT_APPROVED, OPS_ADMIN, SYSTEM_ADMIN
- RLS 정책으로 데이터베이스 수준 보안 적용 (`docs/RLS.md` 참조)
- 컨설턴트는 자신의 담당 프로젝트만 접근 가능

**데이터 검증:**

- 모든 입력은 `src/lib/schemas/`의 Zod 스키마로 검증
- 스키마와 테스트 파일(`.test.ts`)은 같은 위치에 배치

**Server Action 패턴:**

1. 세션 확인
2. 역할 권한 검사
3. Zod로 입력 검증
4. 비즈니스 로직 실행
5. `ActionResult<T>` 타입으로 반환 (`src/lib/types/action-result.ts`)

**프로젝트 워크플로우 상태:**

```text
NEW → DIAGNOSED → MATCH_RECOMMENDED → ASSIGNED → INTERVIEWED → ROADMAP_DRAFTED → FINALIZED
```

**로드맵 버전 관리:**

- DRAFT 버전은 무제한 생성 가능
- FINAL 버전 생성 시 기존 FINAL은 ARCHIVED로 변경
- 내보내기(PDF/XLSX)는 저장된 데이터 사용 (LLM 재호출 없음)

## 기술 스택

- **프레임워크:** Next.js 16.x (App Router, React Compiler 활성화) + TypeScript 5.x (strict 모드)
- **데이터베이스/인증:** Supabase (Postgres + Auth + RLS + Storage)
- **스타일링:** Tailwind CSS 4.x
- **UI 컴포넌트:** Radix UI + shadcn/ui + Lucide React (아이콘)
- **폼/검증:** React Hook Form + Zod (@hookform/resolvers)
- **차트:** Recharts
- **토스트:** Sonner
- **랜딩 애니메이션:** GSAP + Three.js (@react-three/fiber, drei) + Lenis (스무스 스크롤)
- **테스트:** Vitest + React Testing Library + Playwright (E2E)
- **내보내기:** jspdf + jspdf-autotable, xlsx (SheetJS)

## 환경 변수

**필수:**

- `NEXT_PUBLIC_SUPABASE_URL` - Supabase 프로젝트 URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase 익명 키
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase 서비스 역할 키 (서버 전용)
- `LLM_API_KEY` - LLM API 키 (서버 전용)

**선택:**

- `LLM_API_BASE_URL` - LLM API 기본 URL (기본값: OpenAI 호환)
- `DAILY_LLM_CALL_LIMIT` - 일별 LLM 호출 제한 (기본값: 100)
- `MONTHLY_LLM_CALL_LIMIT` - 월별 LLM 호출 제한 (기본값: 2000)
- `NEXT_PUBLIC_APP_URL` - 앱 URL (기본값: http://localhost:3000)

## 커밋 메시지 규칙

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

## 코드 품질 지침

**코드 수정 시 반드시 다음 검증 단계를 수행할 것:**

1. **타입 체크**: `npm run typecheck` 실행하여 TypeScript 오류 없음 확인
2. **빌드 검증**: `npm run build` 실행하여 프로덕션 빌드 성공 확인
3. **린트 검사**: `npm run lint` 실행하여 코드 품질 문제 없음 확인
4. **통합 검증**: `npm run validate` 실행하여 typecheck + lint + test 한 번에 확인

**Server Actions 주의사항:**

- Server Action 함수의 반환 타입이 `ActionResult` 인터페이스와 일치하는지 확인
- Supabase 쿼리 후 `.select().single()` 사용 시 에러 처리 철저히 할 것
- 직렬화 불가능한 객체(Date, Map 등)를 반환하지 않도록 주의

**오류 발생 시:**

- 오류 메시지와 스택 트레이스를 분석하여 근본 원인 파악
- 단순히 증상만 해결하지 말고, 원인을 완전히 이해한 후 수정
- 수정 후 반드시 위의 검증 단계 재실행

## 문서

- `docs/ARCHITECTURE.md` - 시스템 다이어그램 및 데이터 흐름
- `docs/RLS.md` - Row-Level Security 정책
- `docs/DECISIONS.md` - 아키텍처 결정 기록 (ADR)
- `docs/CONSULTANT_PROFILE_SPEC.md` - 컨설턴트 프로필 명세
- `docs/PROJECT_OUTLINE.md` - 초기 기획서 (아카이브)
