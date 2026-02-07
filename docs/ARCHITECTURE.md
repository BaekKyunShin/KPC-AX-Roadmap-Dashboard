# 아키텍처

## 시스템 개요

```
┌─────────────────────────────────────────────────────────────┐
│                        클라이언트                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   PUBLIC    │  │ CONSULTANT  │  │  OPS_ADMIN  │         │
│  │   (랜딩)    │  │  (컨설턴트)  │  │ (운영관리자) │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
                          │ HTTPS
┌─────────────────────────▼───────────────────────────────────┐
│                    Next.js App Router                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                   Server Actions                      │  │
│  │  - 세션/역할 검증                                      │  │
│  │  - 입력 검증 (Zod)                                    │  │
│  │  - LLM API 호출 (키 노출 금지)                        │  │
│  │  - 대부분의 데이터 처리                               │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                    API Routes                         │  │
│  │  /api/matching/generate (매칭 추천 생성)              │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                       Supabase                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │    Auth     │  │  PostgreSQL │  │   Storage   │         │
│  │  (인증)     │  │  (DB + RLS) │  │ (FINAL PDF) │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

> **참고**: API Routes 대신 Server Actions를 우선 사용합니다. API Routes는 스트리밍이나 외부 호출이 필요한 경우에만 사용합니다.

## 디렉토리 구조

```
src/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # 랜딩 페이지 (공개)
│   ├── demo/                     # 샘플 데모 (공개)
│   ├── (auth)/                   # 인증 라우트
│   │   ├── login/
│   │   ├── register/
│   │   └── actions.ts
│   ├── (dashboard)/              # 대시보드 라우트 (인증 필수)
│   │   ├── dashboard/            # 공통 대시보드 + 프로필
│   │   ├── consultant/           # 컨설턴트 전용
│   │   │   ├── profile/          # 프로필 관리
│   │   │   └── projects/         # 담당 프로젝트
│   │   │       └── [id]/
│   │   │           ├── interview/  # 인터뷰 입력
│   │   │           └── roadmap/    # 로드맵 생성/관리
│   │   ├── ops/                  # OPS_ADMIN 전용
│   │   │   ├── projects/         # 프로젝트 관리
│   │   │   │   ├── new/          # 프로젝트 생성
│   │   │   │   └── [id]/         # 진단/배정/로드맵
│   │   │   │       └── roadmap/  # 로드맵 열람 (읽기 전용)
│   │   │   ├── users/            # 사용자 관리/승인
│   │   │   ├── templates/        # 자가진단 템플릿 관리
│   │   │   ├── quota/            # 쿼터 관리
│   │   │   └── audit/            # 감사로그
│   │   └── test-roadmap/         # 테스트 로드맵 (컨설턴트 연습용)
│   ├── api/                      # API Routes (최소화)
│   │   └── matching/generate/    # 매칭 추천 생성
│   ├── layout.tsx
│   └── middleware.ts             # 인증 미들웨어
├── components/                   # 재사용 컴포넌트
│   ├── ui/                       # 기본 UI (button, input, card, dialog 등)
│   ├── landing/                  # 랜딩 페이지 컴포넌트
│   │   ├── sections/             # 섹션별 컴포넌트
│   │   └── hooks/                # 랜딩 전용 훅
│   ├── auth/                     # 인증 관련 컴포넌트
│   ├── consultant/               # 컨설턴트 UI 컴포넌트
│   ├── ops/                      # 운영관리자 UI 컴포넌트
│   │   └── assignment/           # 배정 관련 컴포넌트
│   ├── roadmap/                  # 로드맵 공통 컴포넌트
│   ├── interview/                # 인터뷰 공통 컴포넌트
│   ├── Navigation.tsx
│   └── PendingApprovalCard.tsx
├── hooks/                        # 공용 커스텀 훅
│   ├── useDebounce.ts
│   └── useRoadmapDownload.ts
├── lib/                          # 유틸리티 및 설정
│   ├── supabase/
│   │   ├── client.ts             # 클라이언트 (anon key)
│   │   ├── server.ts             # 서버/SSR (세션 갱신)
│   │   ├── admin.ts              # 서비스 역할 (RLS 우회)
│   │   └── middleware.ts         # 미들웨어용
│   ├── schemas/                  # Zod 스키마 (테스트와 함께 배치)
│   │   ├── user.ts
│   │   ├── user.test.ts
│   │   ├── project.ts
│   │   ├── project.test.ts
│   │   ├── interview.ts
│   │   ├── interview.test.ts
│   │   └── test-roadmap.ts
│   ├── services/                 # 비즈니스 로직
│   │   ├── roadmap.ts            # LLM 로드맵 생성
│   │   ├── llm.ts                # LLM API 호출 추상화
│   │   ├── matching.ts           # 컨설턴트 매칭 알고리즘
│   │   ├── stt.ts                # STT 인사이트 추출
│   │   ├── quota.ts              # 일별/월별 LLM 호출 제한
│   │   ├── audit.ts              # 이벤트 로깅
│   │   ├── export-pdf.ts         # PDF 생성 (jspdf)
│   │   └── export-xlsx.ts        # Excel 생성 (xlsx)
│   ├── constants/                # 상수 정의
│   │   ├── status.ts             # 역할/상태 상수 및 헬퍼 함수
│   │   ├── industry.ts           # 업종 분류
│   │   ├── company-size.ts       # 기업 규모 분류
│   │   ├── profile-options.ts    # 컨설턴트 프로필 옵션
│   │   ├── interview-steps.ts    # 인터뷰 단계
│   │   ├── site.ts               # 사이트 메타 정보
│   │   └── stt.ts                # STT 관련 상수
│   ├── actions/                  # 공유 Server Actions 헬퍼
│   │   └── roadmap-export.ts     # 로드맵 내보내기
│   ├── types/                    # TypeScript 타입
│   │   └── action-result.ts      # Server Action 결과 타입
│   ├── utils/                    # 유틸리티 함수
│   │   ├── error.ts              # 에러 처리
│   │   ├── toast.ts              # 토스트 알림
│   │   ├── roadmap.ts            # 로드맵 유틸리티 (서버)
│   │   ├── roadmap-client.ts     # 로드맵 유틸리티 (클라이언트)
│   │   └── scroll.ts             # 스크롤 유틸리티
│   └── data/                     # 정적 데이터
│       └── demo-sample.ts        # 데모 샘플 데이터
├── types/                        # 전역 타입 정의
│   ├── database.ts               # DB 테이블 인터페이스
│   └── roadmap-ui.ts             # 로드맵 UI 타입
└── middleware.ts                 # 루트 미들웨어
```

## 데이터 흐름

### 1. 회원가입/승인 플로우

```
컨설턴트     → 회원가입 → USER_PENDING
                              │
                              ▼
                   OPS_ADMIN 승인 → CONSULTANT_APPROVED

운영관리자   → 회원가입 → OPS_ADMIN_PENDING
                              │
                              ▼
                  SYSTEM_ADMIN 승인 → OPS_ADMIN
```

### 2. 프로젝트 생성/배정 플로우

```
OPS_ADMIN                          CONSULTANT
    │                                  │
    ▼                                  │
프로젝트 생성 (NEW)                      │
    │                                  │
    ▼                                  │
자가진단 입력 (DIAGNOSED)              │
    │                                  │
    ▼                                  │
매칭 추천 조회 (MATCH_RECOMMENDED)     │
    │                                  │
    ▼                                  │
배정 확정 (ASSIGNED) ─────────────────→│
                                       │
                                       ▼
                              인터뷰 입력 (INTERVIEWED)
                                       │
                                       ▼
                              로드맵 생성 (ROADMAP_DRAFTED)
                                       │
                                       ▼
                              FINAL 확정 (FINALIZED)
```

### 3. 로드맵 생성 플로우

```
입력 데이터                    LLM 호출                  출력
┌────────────────┐           (서버에서만)
│ 기업 정보      │              │
│ 자가진단       │──────────────┼─────────────▶ NxM 로드맵
│ 인터뷰         │              │              PBL 최적 과정
│ 컨설턴트 프로필│              │              과정 상세 리스트
└────────────────┘              │
                               ▼
                          검증 (무료툴/40h)
                               │
                               ▼
                          DRAFT 저장
```

### 4. 버전관리 플로우

```
DRAFT v1 → DRAFT v2 → ... → FINAL
                              │
                              ▼ (새 FINAL 생성 시)
                           ARCHIVED
```

## 보안 계층

```
1. 클라이언트 → UI 레벨 권한 체크 (라우트 가드)
       ▼
2. Server Action/API Route → 세션/역할 검증
       ▼
3. Supabase → RLS 정책 적용
       ▼
4. 데이터베이스 → 제약조건/트리거
```

## LLM 호출 정책

- **호출 허용**: 로드맵 생성, 수정 요청 반영
- **호출 금지**: PDF/XLSX 내보내기 (DB 데이터로 렌더링)
- **쿼터 적용**: 일/월 상한, 초과 시 차단
- **키 보안**: 서버에서만 호출 (환경변수로 관리)
- **추상화**: `lib/services/llm.ts`에서 API 호출 통합 관리

## 파일 저장 정책

```
스토리지 (Supabase Storage)
└── roadmaps/
    └── {project_id}/
        ├── final.pdf      # 최신 FINAL만 저장
        └── final.xlsx     # 나머지는 즉시 생성
```

## Server Actions vs API Routes

| 용도 | 방식 | 위치 |
|------|------|------|
| 데이터 조회/수정 | Server Actions | `actions.ts` (라우트별) |
| 매칭 추천 생성 | API Route | `/api/matching/generate` |
| 폼 제출 | Server Actions | `actions.ts` |
| 파일 내보내기 | Server Actions | `actions.ts` |

> Server Actions를 우선 사용하고, 스트리밍이나 복잡한 응답이 필요한 경우에만 API Routes를 사용합니다.
