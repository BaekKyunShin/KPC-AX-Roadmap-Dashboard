# 아키텍처

## 시스템 개요

```
┌─────────────────────────────────────────────────────────────┐
│                        클라이언트                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │   PUBLIC    │  │ CONSULTANT  │  │  OPS_ADMIN  │         │
│  │   (랜딩)    │  │  (컨설턴트)  │  │ (운영관리자) │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTPS
┌─────────────────────────▼───────────────────────────────────┐
│                    Next.js App Router                       │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                    API Routes                         │  │
│  │  /api/auth/*    /api/projects/*    /api/roadmaps/*      │  │
│  │  /api/users/*   /api/matching/* /api/admin/*         │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                   Server Actions                      │  │
│  │  - 세션/역할 검증                                      │  │
│  │  - 입력 검증 (Zod)                                    │  │
│  │  - LLM API 호출 (키 노출 금지)                        │  │
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

## 디렉토리 구조

```
src/
├── app/                          # Next.js App Router
│   ├── (public)/                 # PUBLIC 라우트
│   │   ├── page.tsx             # 랜딩 페이지
│   │   ├── demo/                # 샘플(데모)
│   │   └── layout.tsx
│   ├── (auth)/                   # 인증 라우트
│   │   ├── login/
│   │   ├── register/
│   │   └── layout.tsx
│   ├── (dashboard)/              # 대시보드 라우트 (인증 필수)
│   │   ├── consultant/          # 컨설턴트 전용
│   │   │   ├── projects/          # 배정된 프로젝트 목록
│   │   │   ├── projects/[id]/    # 프로젝트 상세
│   │   │   └── profile/        # 프로필 관리
│   │   ├── ops/                 # OPS_ADMIN 전용
│   │   │   ├── users/          # 사용자 관리
│   │   │   ├── projects/          # 프로젝트 관리
│   │   │   ├── templates/      # 템플릿 관리
│   │   │   └── audit/          # 감사로그/쿼터
│   │   └── layout.tsx
│   ├── api/                      # API Routes
│   │   ├── auth/
│   │   ├── users/
│   │   ├── projects/
│   │   ├── assessments/
│   │   ├── matching/
│   │   ├── interviews/
│   │   ├── roadmaps/
│   │   └── admin/
│   └── layout.tsx
├── components/                   # 재사용 컴포넌트
│   ├── ui/                      # 기본 UI 컴포넌트
│   ├── forms/                   # 폼 컴포넌트
│   ├── tables/                  # 테이블 컴포넌트
│   └── roadmap/                 # 로드맵 관련 컴포넌트
├── hooks/                        # 커스텀 훅
│   ├── useAuth.ts
│   ├── useProject.ts
│   └── useRoadmap.ts
├── lib/                          # 유틸리티 및 설정
│   ├── supabase/
│   │   ├── client.ts           # 클라이언트 Supabase
│   │   ├── server.ts           # 서버 Supabase
│   │   └── admin.ts            # 서비스 역할 Supabase
│   ├── schemas/                 # Zod 스키마
│   │   ├── user.ts
│   │   ├── project.ts
│   │   ├── assessment.ts
│   │   └── roadmap.ts
│   ├── services/                # 비즈니스 로직
│   │   ├── matching.ts
│   │   ├── roadmap.ts
│   │   └── audit.ts
│   └── utils/
│       ├── validation.ts
│       └── export.ts
├── types/                        # TypeScript 타입
│   └── database.ts
└── test/                         # 테스트 설정
```

## 데이터 흐름

### 1. 회원가입/승인 플로우

```
사용자 → 회원가입 → USER_PENDING
                         │
                         ▼
              OPS_ADMIN 승인 → CONSULTANT_APPROVED
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
2. API Route → 세션/역할 검증
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

## 파일 저장 정책

```
스토리지 (Supabase Storage)
└── roadmaps/
    └── {project_id}/
        ├── final.pdf      # 최신 FINAL만 저장
        └── final.xlsx     # 나머지는 즉시 생성
```
