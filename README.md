# KPC AI 훈련 로드맵 대시보드

KPC AI 훈련 확산센터의 **기업 진단 → 컨설턴트 배정 → 현장 인터뷰 → 교육 로드맵 산출**을 위한 B2B 내부용 대시보드입니다.

## 주요 기능

- **기업 자가진단**: 30문항 기반 AI 성숙도 진단 및 점수화
- **컨설턴트 매칭**: 자가진단 + 기업정보 기반 Top-N 추천 알고리즘
- **현장 인터뷰 관리**: 세부직무, 병목/페인포인트, 개선 목표 입력
- **AI 로드맵 생성**: LLM 기반 NxM 로드맵 + 40시간 PBL 과정 자동 생성
- **버전 관리**: DRAFT/FINAL/ARCHIVED 버전 관리, 수정 요청 히스토리
- **내보내기**: PDF/XLSX 다운로드 (LLM 재호출 없이 저장된 데이터 활용)
- **감사로그/쿼터**: 모든 주요 이벤트 기록, 일/월 LLM 호출 제한

## 워크플로우

```
┌─────────────────────────────────────────────────────────────────────┐
│                        OPS_ADMIN 영역                                │
├─────────────────────────────────────────────────────────────────────┤
│  1. 프로젝트 생성        2. 자가진단 입력       3. 매칭 추천 생성    │
│  (기업 기본정보)         (30문항 응답)          (Top-3 컨설턴트)     │
│        ↓                      ↓                      ↓              │
│                         4. 컨설턴트 배정 (사유 기록)                 │
└─────────────────────────────────────────────────────────────────────┘
                                   ↓
┌─────────────────────────────────────────────────────────────────────┐
│                      CONSULTANT 영역                                 │
├─────────────────────────────────────────────────────────────────────┤
│  5. 현장 인터뷰 입력     6. 로드맵 생성         7. 수정 요청         │
│  (직무, 페인포인트 등)   (LLM 기반)             (버전 누적)          │
│        ↓                      ↓                      ↓              │
│                    8. FINAL 확정 + PDF/XLSX 다운로드                │
└─────────────────────────────────────────────────────────────────────┘
```

**프로젝트 상태 흐름:**
```
NEW → DIAGNOSED → MATCH_RECOMMENDED → ASSIGNED → INTERVIEWED → ROADMAP_DRAFTED → FINALIZED
```

## 데모

로그인 없이 샘플 로드맵을 확인할 수 있습니다: `/demo`

## 기술 스택

- **Frontend/Backend**: Next.js (App Router) + TypeScript
- **Database/Auth**: Supabase (Postgres + Auth + RLS + Storage)
- **Styling**: Tailwind CSS
- **Validation**: Zod
- **Testing**: Vitest + React Testing Library

## 로컬 실행 방법

### 1. 환경 설정

```bash
# 저장소 클론
git clone <repository-url>
cd ai-roadmap-dashboard

# 의존성 설치
npm install

# 환경변수 설정
cp .env.example .env.local
# .env.local 파일에 실제 값 입력
```

### 2. Supabase 설정

1. [Supabase](https://supabase.com)에서 새 프로젝트 생성
2. Project Settings > API에서 URL과 anon key 복사
3. `.env.local`에 환경변수 설정:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

### 3. 데이터베이스 마이그레이션

Supabase CLI를 사용하거나 SQL Editor에서 `supabase/migrations/` 폴더의 SQL 파일을 순서대로 실행합니다.

```bash
# Supabase CLI 설치 (선택)
npm install -g supabase

# 마이그레이션 실행
supabase db push
```

또는 Supabase 대시보드의 SQL Editor에서 마이그레이션 파일들을 순서대로 실행합니다.

### 4. 개발 서버 실행

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000)에서 확인합니다.

## 스크립트

```bash
# 개발 서버
npm run dev

# 프로덕션 빌드
npm run build

# 프로덕션 서버
npm run start

# 린트
npm run lint
npm run lint:fix

# 타입 체크
npm run typecheck

# 포맷팅
npm run format
npm run format:check

# 테스트
npm run test
npm run test:watch
npm run test:coverage
```

## 환경변수

| 변수명 | 설명 | 필수 |
|--------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | O |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 익명 키 | O |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 서비스 역할 키 (서버 전용) | O |
| `LLM_API_KEY` | LLM API 키 (서버 전용) | O |
| `LLM_API_BASE_URL` | LLM API 베이스 URL | X |
| `DAILY_LLM_CALL_LIMIT` | 일일 LLM 호출 상한 (기본: 100) | X |
| `MONTHLY_LLM_CALL_LIMIT` | 월간 LLM 호출 상한 (기본: 2000) | X |
| `NEXT_PUBLIC_APP_URL` | 앱 URL (기본: http://localhost:3000) | X |

## 프로젝트 구조

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/            # 인증 (로그인/회원가입)
│   ├── (dashboard)/       # 대시보드
│   │   ├── consultant/    # 컨설턴트 화면
│   │   └── ops/           # OPS_ADMIN 화면
│   ├── api/               # API Routes
│   └── demo/              # 샘플 데모 페이지
├── components/            # 재사용 컴포넌트
│   ├── consultant/        # 컨설턴트 전용
│   └── ops/               # OPS_ADMIN 전용
├── lib/
│   ├── supabase/         # Supabase 클라이언트 (server/client/admin)
│   ├── schemas/          # Zod 검증 스키마
│   ├── services/         # 비즈니스 로직
│   │   ├── audit.ts      # 감사로그
│   │   ├── matching.ts   # 매칭 추천
│   │   ├── quota.ts      # 쿼터 관리
│   │   ├── roadmap.ts    # 로드맵 생성 (LLM)
│   │   ├── export-pdf.ts # PDF 내보내기
│   │   └── export-xlsx.ts# XLSX 내보내기
│   └── utils/
├── types/                 # TypeScript 타입
└── test/                  # 테스트 설정

supabase/
└── migrations/            # SQL 마이그레이션 (순서대로 실행)

docs/
├── ARCHITECTURE.md        # 아키텍처 문서
├── RLS.md                 # RLS 정책 문서
├── DECISIONS.md           # 기술 결정 기록
└── IMPLEMENTATION_CHECKLIST.md  # 구현 체크리스트
```

## 사용자 역할

| 역할 | 설명 |
|------|------|
| `PUBLIC` | 비로그인 - 랜딩/소개/샘플 열람 |
| `USER_PENDING` | 승인 대기 - 로그인만 가능 |
| `CONSULTANT_APPROVED` | 승인된 컨설턴트 - 담당 프로젝트 접근 |
| `OPS_ADMIN` | 운영 관리자 - 사용자 승인, 프로젝트 관리 |
| `SYSTEM_ADMIN` | 시스템 관리자 - 인프라/시크릿 관리 |

## 배포

Vercel 또는 기타 Next.js 호환 플랫폼에 배포 가능합니다.

```bash
# Vercel CLI 사용
vercel

# 또는 GitHub 연동으로 자동 배포
```

## 로드맵 출력 형식

생성되는 AI 교육 로드맵은 다음을 포함합니다:

| 구성요소 | 설명 |
|----------|------|
| **NxM 매트릭스** | 행=세부직무/업무, 열=초급/중급/고급 레벨별 과정 |
| **40시간 PBL 과정** | 최적의 단일 과정 (≤40시간) |
| **과정 상세** | 과정명, 레벨, 커리큘럼, 실습/과제, 사용 툴, 기대효과 |

**검증 규칙:**
- 모든 과정: 권장 시간 ≤ 40시간
- 사용 툴: 무료 범위 명시 필수 (유료 키워드 검출 시 경고)
- FINAL 확정 전 검증 통과 필수

## 보안

- **RLS (Row Level Security)**: 모든 테이블에 적용
- **역할 기반 접근**: 컨설턴트는 담당 프로젝트만 접근
- **API 키 보호**: LLM API 키는 서버에서만 사용 (클라이언트 노출 금지)
- **감사로그**: 주요 이벤트 자동 기록 (승인, 배정, 로드맵 생성 등)

## 문서

- [아키텍처](./docs/ARCHITECTURE.md)
- [RLS 정책](./docs/RLS.md)
- [기술 결정 기록](./docs/DECISIONS.md)
- [구현 체크리스트](./docs/IMPLEMENTATION_CHECKLIST.md)

## 라이선스

Private - KPC 내부용
