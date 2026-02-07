# KPC AI 훈련 로드맵 대시보드

> **기업 AI 교육 진단 -- 컨설턴트 매칭 -- 현장 인터뷰 -- 교육 로드맵 산출**을 위한 B2B 내부용 대시보드

---

## 목차

- [개요](#개요)
- [주요 기능](#주요-기능)
- [워크플로우](#워크플로우)
- [기술 스택](#기술-스택)
- [시작하기](#시작하기)
- [스크립트](#스크립트)
- [환경 변수](#환경-변수)
- [프로젝트 구조](#프로젝트-구조)
- [아키텍처](#아키텍처)
- [사용자 역할](#사용자-역할)
- [로드맵 출력 형식](#로드맵-출력-형식)
- [보안](#보안)
- [데모](#데모)
- [문서](#문서)

---

## 개요

KPC(한국생산성본부) AI 훈련 확산센터에서 사용하는 **기업 AI 교육 로드맵 관리 시스템**입니다.

기업의 AI 성숙도를 진단하고, 최적의 컨설턴트를 매칭한 뒤, 현장 인터뷰를 거쳐 맞춤형 AI 교육 로드맵을 생성합니다. LLM 기반 자동 생성과 버전 관리, PDF/Excel 내보내기까지 하나의 플랫폼에서 처리합니다.

---

## 주요 기능

| 기능 | 설명 |
|------|------|
| **기업 자가진단** | 30문항 기반 AI 성숙도 진단 및 점수화 |
| **컨설턴트 매칭** | 자가진단 + 기업정보 기반 Top-N 추천 알고리즘 |
| **현장 인터뷰 관리** | 세부직무, 병목/페인포인트, 개선 목표를 단계별 폼으로 입력 |
| **AI 로드맵 생성** | LLM 기반 NxM 매트릭스 + 40시간 PBL 과정 자동 생성 |
| **버전 관리** | DRAFT / FINAL / ARCHIVED 버전 관리, 수정 요청 히스토리 |
| **내보내기** | PDF / XLSX 다운로드 (저장된 데이터 활용, LLM 재호출 없음) |
| **진단 템플릿** | 자가진단 설문 템플릿 생성 및 관리 |
| **사용자 관리** | 역할 기반 접근 제어, 승인 워크플로우 |
| **감사 로그** | 모든 주요 이벤트 자동 기록 (승인, 배정, 생성 등) |
| **LLM 쿼터** | 일별/월별 LLM 호출 제한으로 비용 관리 |
| **테스트 로드맵** | 컨설턴트가 실제 프로젝트 없이 로드맵 생성을 연습 |

---

## 워크플로우

### 전체 흐름

```
                    [ 운영관리자(OPS_ADMIN) 영역 ]
    +-----------------------------------------------------------+
    |                                                           |
    |  1. 프로젝트 생성  -->  2. 자가진단 입력  -->  3. 매칭 추천  |
    |     (기업 기본정보)      (30문항 응답)        (Top-3 추천)   |
    |                                                           |
    |                  4. 컨설턴트 배정                           |
    |                     (사유 기록)                             |
    +-----------------------------------------------------------+
                             |
                             v
                  [ 컨설턴트(CONSULTANT) 영역 ]
    +-----------------------------------------------------------+
    |                                                           |
    |  5. 현장 인터뷰  -->  6. 로드맵 생성  -->  7. 수정/보완     |
    |     (직무, 페인포인트)    (LLM 기반)        (버전 누적)      |
    |                                                           |
    |              8. FINAL 확정 + 내보내기                       |
    |                 (PDF / XLSX)                               |
    +-----------------------------------------------------------+
```

### 프로젝트 상태 흐름

```
NEW --> DIAGNOSED --> MATCH_RECOMMENDED --> ASSIGNED --> INTERVIEWED --> ROADMAP_DRAFTED --> FINALIZED
 |         |               |                  |             |                |                 |
 |         |               |                  |             |                |                 |
프로젝트  자가진단       매칭 추천           컨설턴트       인터뷰          로드맵            최종
 생성     완료           생성               배정 완료      제출            초안 생성          확정
```

---

## 기술 스택

### 핵심 프레임워크

| 분류 | 기술 | 버전 |
|------|------|------|
| 프레임워크 | Next.js (App Router) | 16.x |
| 언어 | TypeScript (strict 모드) | 5.x |
| 런타임 | React (React Compiler 활성화) | 19.x |
| Node.js | 권장 버전 | 20.x |

### 백엔드 / 데이터

| 분류 | 기술 | 용도 |
|------|------|------|
| 데이터베이스 | Supabase (PostgreSQL) | 데이터 저장, RLS 보안 |
| 인증 | Supabase Auth | 회원가입, 로그인, 세션 관리 |
| 스토리지 | Supabase Storage | PDF/XLSX 파일 저장 |
| API 패턴 | Server Actions 우선 | API Routes는 스트리밍 등 특수 경우만 사용 |

### 프론트엔드

| 분류 | 기술 | 용도 |
|------|------|------|
| 스타일링 | Tailwind CSS 4.x | 유틸리티 기반 CSS |
| UI 컴포넌트 | Radix UI + shadcn/ui | 접근성 보장 헤드리스 컴포넌트 |
| 아이콘 | Lucide React | 아이콘 라이브러리 |
| 폼 관리 | React Hook Form + Zod | 폼 상태 + 스키마 검증 |
| 차트 | Recharts | 데이터 시각화 |
| 토스트 | Sonner | 알림 메시지 |
| 랜딩 애니메이션 | GSAP + Three.js + Lenis | 3D 효과, 스크롤 애니메이션 |

### 내보내기 / 테스트

| 분류 | 기술 | 용도 |
|------|------|------|
| PDF | jspdf + jspdf-autotable | 로드맵 PDF 생성 |
| Excel | xlsx (SheetJS) | 로드맵 XLSX 생성 |
| 단위 테스트 | Vitest + React Testing Library | 스키마 검증, 컴포넌트 테스트 |
| E2E 테스트 | Playwright | 브라우저 통합 테스트 |
| 린트/포맷 | ESLint 9.x + Prettier | 코드 품질 관리 |

---

## 시작하기

### 사전 요구사항

- **Node.js** 20.x
- **npm** (Node.js에 포함)
- **Supabase** 프로젝트 ([supabase.com](https://supabase.com)에서 생성)
- **LLM API 키** (OpenAI 호환 API)

### 1단계: 저장소 클론 및 의존성 설치

```bash
git clone <repository-url>
cd ai-roadmap-dashboard
npm install
```

### 2단계: 환경 변수 설정

```bash
cp .env.example .env.local
```

`.env.local` 파일을 열어 실제 값을 입력합니다. 필수 항목은 [환경 변수](#환경-변수) 섹션을 참고하세요.

### 3단계: 데이터베이스 마이그레이션

`supabase/migrations/` 폴더의 SQL 파일을 **번호 순서대로** 실행합니다.

**방법 A: Supabase CLI 사용**

```bash
npm install -g supabase
supabase db push
```

**방법 B: Supabase 대시보드 SQL Editor에서 직접 실행**

`001_initial_schema.sql`부터 `014_drop_summary_text.sql`까지 순서대로 실행합니다.

### 4단계: 개발 서버 실행

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000)에서 확인합니다.

---

## 스크립트

| 명령어 | 설명 |
|--------|------|
| `npm run dev` | 개발 서버 시작 (localhost:3000) |
| `npm run build` | 프로덕션 빌드 |
| `npm run start` | 프로덕션 서버 실행 |
| `npm run lint` | ESLint 코드 검사 |
| `npm run lint:fix` | ESLint 오류 자동 수정 |
| `npm run typecheck` | TypeScript 타입 검사 |
| `npm run format` | Prettier 코드 포맷팅 |
| `npm run format:check` | 포맷팅 검사 (CI용) |
| `npm run test` | 단위 테스트 실행 (Vitest) |
| `npm run test:watch` | 테스트 워치 모드 |
| `npm run test:coverage` | 테스트 커버리지 리포트 |
| `npm run validate` | typecheck + lint + test 통합 검증 |

---

## 환경 변수

### 필수

| 변수명 | 설명 |
|--------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 익명 키 (브라우저 사용 가능) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 서비스 역할 키 (서버 전용) |
| `LLM_API_KEY` | LLM API 키 (서버 전용, 클라이언트 노출 금지) |

### 선택

| 변수명 | 설명 | 기본값 |
|--------|------|--------|
| `LLM_API_BASE_URL` | LLM API 베이스 URL | OpenAI 호환 엔드포인트 |
| `DAILY_LLM_CALL_LIMIT` | 일별 LLM 호출 제한 | 100 |
| `MONTHLY_LLM_CALL_LIMIT` | 월별 LLM 호출 제한 | 2000 |
| `NEXT_PUBLIC_APP_URL` | 앱 URL | http://localhost:3000 |

---

## 프로젝트 구조

```
ai-roadmap-dashboard/
|
|-- src/
|   |-- app/                          # Next.js App Router
|   |   |-- page.tsx                  # 랜딩 페이지
|   |   |-- layout.tsx                # 루트 레이아웃
|   |   |-- globals.css               # 전역 스타일
|   |   |-- demo/                     # 로그인 없이 체험 가능한 데모
|   |   |-- api/                      # API Routes (최소 사용)
|   |   |   `-- matching/generate/    # 매칭 생성 API
|   |   |-- (auth)/                   # 인증 라우트 그룹
|   |   |   |-- login/                # 로그인
|   |   |   `-- register/             # 회원가입
|   |   `-- (dashboard)/              # 인증 필요 라우트 그룹
|   |       |-- dashboard/            # 공통 대시보드
|   |       |   |-- profile/          # 프로필 조회
|   |       |   `-- settings/         # 계정 설정 (비밀번호, 탈퇴)
|   |       |-- consultant/           # 컨설턴트 전용
|   |       |   |-- profile/          # 프로필 작성/수정
|   |       |   `-- projects/         # 배정 프로젝트 관리
|   |       |       `-- [id]/
|   |       |           |-- interview/  # 현장 인터뷰 입력
|   |       |           `-- roadmap/    # 로드맵 생성/조회
|   |       |-- ops/                  # 운영관리자 전용
|   |       |   |-- projects/         # 프로젝트 CRUD, 진단, 배정
|   |       |   |   `-- [id]/roadmap/ # 로드맵 조회 (읽기 전용)
|   |       |   |-- users/            # 사용자 승인 관리
|   |       |   |-- templates/        # 진단 템플릿 관리
|   |       |   |-- audit/            # 감사 로그 조회
|   |       |   `-- quota/            # LLM 쿼터 현황
|   |       `-- test-roadmap/         # 테스트 로드맵 (연습용)
|   |
|   |-- components/                   # 공유 컴포넌트
|   |   |-- ui/                       # shadcn/ui + 커스텀 UI (~25개)
|   |   |-- landing/                  # 랜딩 페이지 (Hero, Features 등)
|   |   |-- ops/                      # 운영관리 (배정, 매칭, 사용자 등)
|   |   |-- consultant/               # 컨설턴트 (프로필 폼, 배지 등)
|   |   |-- roadmap/                  # 로드맵 (매트릭스, 다운로드 등)
|   |   |-- interview/                # 인터뷰 (요약 컴포넌트)
|   |   |-- auth/                     # 인증 (배경 장식, 탈퇴 등)
|   |   |-- Navigation.tsx            # 대시보드 네비게이션
|   |   `-- PendingApprovalCard.tsx   # 승인 대기 안내
|   |
|   |-- lib/                          # 비즈니스 로직 및 유틸리티
|   |   |-- services/                 # 핵심 서비스 (8개)
|   |   |   |-- roadmap.ts            # LLM 로드맵 생성
|   |   |   |-- llm.ts                # LLM API 호출 추상화
|   |   |   |-- matching.ts           # 컨설턴트 매칭 알고리즘
|   |   |   |-- stt.ts                # STT 인사이트 추출
|   |   |   |-- quota.ts              # LLM 호출 쿼터 관리
|   |   |   |-- audit.ts              # 감사 로그 기록
|   |   |   |-- export-pdf.ts         # PDF 생성 (jspdf)
|   |   |   `-- export-xlsx.ts        # Excel 생성 (xlsx)
|   |   |-- schemas/                  # Zod 검증 스키마 + 테스트
|   |   |   |-- interview.ts / .test.ts
|   |   |   |-- project.ts / .test.ts
|   |   |   |-- user.ts / .test.ts
|   |   |   `-- test-roadmap.ts
|   |   |-- constants/                # 상수 집중 관리
|   |   |   |-- industry.ts           # 업종/산업 분류
|   |   |   |-- company-size.ts       # 기업 규모
|   |   |   |-- status.ts             # 프로젝트/로드맵 상태
|   |   |   |-- profile-options.ts    # 컨설턴트 프로필 옵션
|   |   |   |-- interview-steps.ts    # 인터뷰 단계
|   |   |   |-- site.ts               # 사이트 정보
|   |   |   `-- stt.ts                # STT 관련
|   |   |-- supabase/                 # Supabase 클라이언트 4종
|   |   |   |-- client.ts             # 브라우저용 (anon key)
|   |   |   |-- server.ts             # 서버/SSR용 (세션 갱신)
|   |   |   |-- admin.ts              # 서비스 역할 (RLS 우회)
|   |   |   `-- middleware.ts          # 미들웨어용
|   |   |-- actions/                  # 공유 Server Actions
|   |   |-- types/                    # 공통 타입 (ActionResult 등)
|   |   |-- utils/                    # 유틸리티 (에러 처리, 토스트 등)
|   |   `-- data/                     # 정적 데이터 (데모 샘플)
|   |
|   |-- hooks/                        # 커스텀 React 훅
|   |   |-- useDebounce.ts
|   |   `-- useRoadmapDownload.ts
|   |
|   |-- types/                        # 전역 TypeScript 타입
|   |   |-- database.ts               # Supabase DB 타입
|   |   `-- roadmap-ui.ts             # 로드맵 UI 타입
|   |
|   |-- test/                         # 테스트 설정
|   `-- middleware.ts                  # Next.js 미들웨어 (세션 관리)
|
|-- supabase/
|   `-- migrations/                   # SQL 마이그레이션 (14개)
|       |-- 001_initial_schema.sql        # 초기 스키마
|       |-- 002_rls_policies.sql          # RLS 정책
|       |-- 003_roadmap_storage.sql       # 스토리지 설정
|       |-- ...
|       `-- 014_drop_summary_text.sql     # 최신 마이그레이션
|
|-- docs/                             # 프로젝트 문서
|   |-- ARCHITECTURE.md               # 시스템 아키텍처
|   |-- RLS.md                        # Row-Level Security 정책
|   |-- DECISIONS.md                  # 아키텍처 결정 기록 (ADR)
|   |-- CONSULTANT_PROFILE_SPEC.md    # 컨설턴트 프로필 명세
|   `-- PROJECT_OUTLINE.md            # 초기 기획서 (아카이브)
|
|-- public/                           # 정적 파일 (로고 등)
`-- scripts/                          # 유틸리티 스크립트
```

---

## 아키텍처

### 시스템 구조

```
+------------------------------------------------------------------+
|                        클라이언트 (브라우저)                         |
|                                                                  |
|   Landing Page        Auth Pages         Dashboard Pages         |
|   (Three.js/GSAP)     (Login/Register)   (역할별 라우팅)          |
+------------------------------------------------------------------+
          |                    |                    |
          v                    v                    v
+------------------------------------------------------------------+
|                      Next.js App Router                          |
|                                                                  |
|   +------------------+  +------------------+  +----------------+ |
|   | Server           |  | Server Actions   |  | API Routes     | |
|   | Components       |  | (주요 데이터 흐름)|  | (스트리밍 등)  | |
|   +------------------+  +------------------+  +----------------+ |
|                                                                  |
|   +------------------+  +------------------+  +----------------+ |
|   | middleware.ts    |  | Zod Schemas      |  | Services       | |
|   | (세션 관리)       |  | (입력 검증)       |  | (비즈니스로직) | |
|   +------------------+  +------------------+  +----------------+ |
+------------------------------------------------------------------+
          |                    |                    |
          v                    v                    v
+------------------------------------------------------------------+
|                     Supabase 백엔드                               |
|                                                                  |
|   +------------------+  +------------------+  +----------------+ |
|   | PostgreSQL       |  | Auth             |  | Storage        | |
|   | + RLS 정책       |  | (인증/세션)       |  | (파일 저장)    | |
|   +------------------+  +------------------+  +----------------+ |
+------------------------------------------------------------------+
          |
          v
+------------------------------------------------------------------+
|                     외부 서비스                                    |
|                                                                  |
|   +------------------+                                           |
|   | LLM API          |  <-- 로드맵 생성, 인사이트 추출            |
|   | (OpenAI 호환)    |                                           |
|   +------------------+                                           |
+------------------------------------------------------------------+
```

### Supabase 클라이언트 전략

각 실행 환경에 맞는 전용 클라이언트를 사용합니다:

| 클라이언트 | 파일 | 사용 위치 | 특징 |
|-----------|------|-----------|------|
| Browser | `client.ts` | 클라이언트 컴포넌트 | anon key, RLS 적용 |
| Server | `server.ts` | Server Components, Actions | 세션 갱신 포함, RLS 적용 |
| Admin | `admin.ts` | 내부 작업 전용 | 서비스 역할, RLS 우회 |
| Middleware | `middleware.ts` | Next.js 미들웨어 | 세션 확인 전용 |

### Server Action 패턴

모든 Server Action은 동일한 5단계 패턴을 따릅니다:

```
1. 세션 확인  -->  2. 역할 검사  -->  3. Zod 검증  -->  4. 비즈니스 로직  -->  5. ActionResult 반환
```

---

## 사용자 역할

시스템은 6가지 역할로 접근을 제어합니다:

```
  PUBLIC              로그인 전. 랜딩, 데모 열람만 가능
    |
    v  (회원가입)
  USER_PENDING        승인 대기. 로그인만 가능, 기능 접근 불가
    |
    +-- (운영관리자 신청) --> OPS_ADMIN_PENDING   운영관리자 승인 대기
    |                              |
    |                              v  (SYSTEM_ADMIN 승인)
    |                          OPS_ADMIN            프로젝트 생성, 진단, 컨설턴트 배정, 사용자 승인
    |
    +-- (컨설턴트 승인) ----> CONSULTANT_APPROVED   담당 프로젝트 인터뷰, 로드맵 생성
    |
    v  (시스템 관리자)
  SYSTEM_ADMIN        인프라/시크릿 관리, 운영관리자 승인
```

| 역할 | 접근 가능 영역 |
|------|---------------|
| `PUBLIC` | 랜딩 페이지, 데모 |
| `USER_PENDING` | 로그인 후 승인 대기 화면 |
| `OPS_ADMIN_PENDING` | 로그인 후 운영관리자 승인 대기 화면 |
| `CONSULTANT_APPROVED` | 프로필, 배정된 프로젝트, 인터뷰, 로드맵, 테스트 로드맵 |
| `OPS_ADMIN` | 프로젝트 관리, 사용자 승인, 템플릿, 감사 로그, 쿼터, 로드맵 조회 |
| `SYSTEM_ADMIN` | 전체 시스템 관리 |

---

## 로드맵 출력 형식

LLM이 생성하는 AI 교육 로드맵은 다음 구성요소를 포함합니다:

### NxM 매트릭스

행(세부직무/업무)과 열(초급/중급/고급)이 교차하는 과정 추천표입니다.

```
                  초급              중급              고급
          +----------------+----------------+----------------+
 직무 A   |  과정 A-1      |  과정 A-2      |  과정 A-3      |
          +----------------+----------------+----------------+
 직무 B   |  과정 B-1      |  과정 B-2      |  과정 B-3      |
          +----------------+----------------+----------------+
 직무 C   |  과정 C-1      |  과정 C-2      |  과정 C-3      |
          +----------------+----------------+----------------+
```

### 40시간 PBL 과정

매트릭스에서 기업에 가장 적합한 **단일 과정**(40시간 이내)을 선정하여 상세 커리큘럼을 제공합니다.

### 과정 상세 정보

각 과정은 다음 항목을 포함합니다:

| 항목 | 설명 |
|------|------|
| 과정명 | 교육 과정의 명칭 |
| 레벨 | 초급 / 중급 / 고급 |
| 권장 시간 | 40시간 이하 |
| 커리큘럼 | 주차별/회차별 학습 내용 |
| 실습/과제 | 실무 적용 실습 및 프로젝트 과제 |
| 사용 툴 | 무료 범위 명시 필수 |
| 기대 효과 | 교육 후 예상 성과 |

### 버전 관리

```
DRAFT (무제한 생성 가능)  -->  FINAL (1개만 유지)  -->  ARCHIVED (이전 FINAL)
                                      |
                                      v
                              PDF / XLSX 내보내기
```

---

## 보안

### Row-Level Security (RLS)

모든 데이터베이스 테이블에 RLS 정책이 적용되어 있습니다. 사용자는 자신의 역할에 따라 허용된 데이터만 조회/수정할 수 있습니다.

- **컨설턴트**: 자신에게 배정된 프로젝트만 접근 가능
- **운영관리자**: 전체 프로젝트 관리 가능
- **API 키 보호**: `LLM_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`는 서버에서만 사용

### 입력 검증

모든 사용자 입력은 Zod 스키마로 서버 측에서 검증합니다 (`src/lib/schemas/`).

### 감사 추적

프로젝트 생성, 컨설턴트 배정, 로드맵 생성, 사용자 승인 등 주요 이벤트가 자동으로 기록됩니다.

---

## 데모

로그인 없이 샘플 로드맵을 확인할 수 있습니다.

```
http://localhost:3000/demo
```

---

## 문서

프로젝트의 상세 기술 문서는 `docs/` 폴더에서 확인할 수 있습니다:

| 문서 | 설명 |
|------|------|
| [ARCHITECTURE.md](./docs/ARCHITECTURE.md) | 시스템 아키텍처 다이어그램 및 데이터 흐름 |
| [RLS.md](./docs/RLS.md) | Row-Level Security 정책 상세 |
| [DECISIONS.md](./docs/DECISIONS.md) | 아키텍처 결정 기록 (ADR) |
| [CONSULTANT_PROFILE_SPEC.md](./docs/CONSULTANT_PROFILE_SPEC.md) | 컨설턴트 프로필 필드 명세 |
| [PROJECT_OUTLINE.md](./docs/PROJECT_OUTLINE.md) | 초기 기획서 (아카이브) |

---

## 배포

Vercel 또는 기타 Next.js 호환 플랫폼에 배포할 수 있습니다.

```bash
# Vercel CLI
vercel

# 또는 GitHub 연동으로 자동 배포
```

배포 시 [환경 변수](#환경-변수)의 필수 항목을 모두 설정해야 합니다.

---

## 라이선스

Private - KPC 내부용
