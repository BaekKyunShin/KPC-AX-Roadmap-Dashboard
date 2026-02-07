# 기술 결정 기록 (ADR)

## ADR-001: 프레임워크 선택

**날짜**: 2025-01-22

**결정**: Next.js (App Router) + TypeScript + Supabase

**이유**:
- Next.js App Router: 서버/클라이언트 컴포넌트 분리, API Routes 내장
- TypeScript: 타입 안정성, 코드 품질
- Supabase: PostgreSQL + Auth + RLS + Storage 통합 솔루션

**대안**:
- Remix + Prisma + 별도 Auth: 복잡성 증가
- SvelteKit: 팀 학습 비용

---

## ADR-002: Tool DB 미구축

**날짜**: 2025-01-22

**결정**: 별도 Tool DB를 구축하지 않고 정책/검증으로 무료 툴 사용 강제

**이유**:
- AI 도구 생태계가 빠르게 변화 → DB 유지보수 비용
- 프롬프트 레벨 규칙 + 키워드 검증으로 충분
- 정책 테이블 (금지어/예외) 확장 가능

**구현**:
1. 생성 규칙: 프롬프트에 무료/오픈소스 제약 명시
2. 검증: "무료 범위 표기" 누락 시 저장/FINAL 불가
3. 운영: FINAL 전 체크리스트 제공

---

## ADR-003: 컨설턴트 프로필 스냅샷

**날짜**: 2025-01-22

**결정**: 로드맵 버전 생성 시 배정 컨설턴트 프로필을 스냅샷으로 저장

**이유**:
- 버전 재현성 보장 (프로필 변경 시에도 당시 상태 유지)
- 감사/품질관리 목적
- 로드맵이 컨설턴트 역량 기반으로 생성되므로 연관성 보존

**구현**:
- `roadmap_versions.consultant_profile_snapshot` JSONB 컬럼

---

## ADR-004: 버전관리 정책

**날짜**: 2025-01-22

**결정**: DRAFT 무한 생성, FINAL 1개 유지, 덮어쓰기 금지

**이유**:
- 이력 추적 및 감사 가능
- 실수 방지 (덮어쓰기 금지)
- 스토리지 효율 (최신 FINAL만 저장)

**구현**:
- 새 FINAL 확정 시 기존 FINAL → ARCHIVED
- PDF/XLSX는 DB 데이터로 렌더링 (LLM 재호출 금지)

---

## ADR-005: RLS 기반 권한 제어

**날짜**: 2025-01-22

**결정**: Supabase RLS로 데이터베이스 레벨 권한 강제

**이유**:
- API 레벨 검증만으로는 보안 취약점 가능
- DB 레벨에서 강제하면 클라이언트 직접 접근도 차단
- Supabase에서 네이티브 지원

**구현**:
- 모든 테이블 RLS 활성화
- 헬퍼 함수로 역할/배정 상태 확인
- 서버에서도 세션/역할 이중 검증

---

## ADR-006: 매칭 알고리즘

**날짜**: 2025-01-22

**결정**: 규칙 기반 점수화 + 근거 제공

**이유**:
- 설명가능성 (왜 이 컨설턴트를 추천했는지)
- 운영자가 최종 판단하므로 근거 중요
- ML 모델보다 규칙 기반이 초기에 적합

**평가 기준**:
1. 업종 적합성
2. 전문분야 일치도
3. 역량 태그 매칭
4. 강의 레벨 적합성
5. 경력/가용성

---

## ADR-007: 40시간 상한

**날짜**: 2025-01-22

**결정**: 과정 1개 단위로 ≤40시간 강제

**이유**:
- 기획서 명시 요구사항
- PBL 최적 과정도 합계 ≤40h
- 검증 로직으로 강제

**구현**:
- 생성 시 프롬프트에 제약 명시
- 저장 전 검증 (time_limit_validated)
- 위반 시 저장/FINAL 불가

---

## ADR-008: 모바일 반응형 (NxM 로드맵)

**날짜**: 2025-01-22

**결정**: 모바일에서는 레벨 탭 + 카드 리스트로 변환

**이유**:
- NxM 테이블은 모바일에서 보기 어려움
- 기획서에 옵션 B (레벨 탭) 제시
- 사용성 우선

**구현**:
- 데스크톱: NxM 테이블
- 태블릿/모바일: 초/중/고급 탭 → 행별 카드

---

## ADR-009: 감사로그 설계

**날짜**: 2025-01-22

**결정**: 구조화된 감사로그 테이블 + 서버에서만 삽입

**이유**:
- 감사/컴플라이언스 요구
- 클라이언트에서 조작 방지
- 필터/검색 용이

**필수 이벤트**:
- 사용자 승인/정지
- 프로젝트 생성/수정
- 자가진단 입력/수정
- 매칭/배정/변경
- 로드맵 생성/수정/FINAL/ARCHIVE
- 다운로드

---

## ADR-010: 쿼터 관리

**날짜**: 2025-01-22

**결정**: LLM 호출에만 쿼터 적용, KST 기준 리셋

**이유**:
- 비용 통제 목적
- 조회/다운로드는 쿼터 비적용
- 운영 편의상 KST 기준

**구현**:
- usage_metrics 테이블로 집계
- user_quotas 테이블로 상한 관리
- 초과 시 생성/수정 차단

---

## ADR-011: Server Actions 우선 사용

**날짜**: 2025-01-24

**결정**: API Routes 대신 Server Actions를 기본 데이터 처리 방식으로 사용

**이유**:
- Next.js App Router의 권장 패턴
- 타입 안전성 향상 (클라이언트-서버 간 타입 공유)
- 보일러플레이트 감소
- 자동 재검증 및 캐시 무효화

**구현**:
- 각 라우트의 `actions.ts` 파일에 Server Actions 정의
- `ActionResult<T>` 타입으로 일관된 응답 형식
- API Routes는 스트리밍/외부 호출 필요시에만 사용

**예외**:
- `/api/matching/generate` - 복잡한 매칭 로직

---

## ADR-012: LLM 추상화 레이어

**날짜**: 2025-01-25

**결정**: LLM API 호출을 `lib/services/llm.ts`로 추상화

**이유**:
- 다양한 모델 지원 (GPT-4o, GPT-5, o1, o3 등)
- 모델별 파라미터 차이 처리 (max_tokens vs max_completion_tokens)
- JSON 파싱 재시도 로직 통합
- API 키/엔드포인트 관리 중앙화

**구현**:
- `callLLM()` - 기본 LLM 호출
- `callLLMForJSON<T>()` - JSON 응답 요청 (자동 재시도)
- `MODEL_CAPABILITIES` - 모델별 기능 설정

**지원 모델**:
- GPT-4o, GPT-4o-mini
- GPT-5, GPT-5-mini
- o1, o1-mini, o1-preview
- o3, o3-mini

---

## ADR-013: 테스트 로드맵 기능

**날짜**: 2025-01-26

**결정**: 컨설턴트가 연습용 로드맵을 생성할 수 있는 테스트 모드 제공

**이유**:
- 컨설턴트 온보딩/연습 지원
- 실제 프로젝트 데이터 오염 방지
- 시스템 기능 검증 용이

**구현**:
- `projects.is_test_mode` - 테스트 프로젝트 구분
- `projects.test_created_by` - 생성자 추적
- 별도 RLS 정책으로 접근 제어
- `/test-roadmap` 전용 페이지

**제약**:
- 테스트 프로젝트는 생성자만 접근 가능
- OPS_ADMIN도 관리 목적으로 접근 가능
- 실제 프로젝트와 명확히 구분 (UI 표시)

---

## ADR-014: 케이스에서 프로젝트로 용어 변경

**날짜**: 2025-01-27

**결정**: 데이터베이스 및 코드에서 "case"를 "project"로 변경

**이유**:
- 비즈니스 용어와 일치 (고객사에서 "프로젝트"로 인식)
- 코드 가독성 향상
- JavaScript 예약어 충돌 방지 (`case` 키워드)

**변경 범위**:
- DB: `cases` → `projects`, `case_assignments` → `project_assignments`
- 컬럼: `case_id` → `project_id`
- 함수: `is_assigned_to_case()` → `is_assigned_to_project()`
- 코드: 모든 변수명/타입명 변경

**마이그레이션**:
- `005_rename_case_to_project.sql`로 일괄 변경
- RLS 정책 재생성 포함

---

## ADR-015: STT 인사이트 추출

**날짜**: 2025-01-28

**결정**: 인터뷰 녹취록(STT 텍스트)에서 LLM으로 구조화된 인사이트를 추출하여 저장

**이유**:
- 컨설턴트가 수동 정리한 정보 외에 놓치기 쉬운 정보 보완
- 추가 업무, 숨은 니즈, 조직 맥락, AI 태도 등 로드맵 품질에 영향을 주는 정보 추출
- 정형 데이터와 결합하여 더 정밀한 로드맵 생성 가능

**구현**:
- `interviews.stt_insights` JSONB 컬럼 추가
- `lib/services/stt.ts` - LLM 기반 인사이트 추출 서비스
- GIN 인덱스로 존재 여부 필터링 최적화
- 마이그레이션: `008_add_stt_insights.sql`

---

## ADR-016: 세부 업종 필드 추가

**날짜**: 2025-01-29

**결정**: 컨설턴트 프로필과 프로젝트에 세부 업종(sub_industries) 필드 추가

**이유**:
- 대분류 업종만으로는 매칭 정밀도가 부족
- 예: 같은 '제조업'이라도 자동차, 반도체, 식품 등 세부 업종에 따라 필요 역량이 다름
- 세부 업종 기반 매칭으로 컨설턴트-기업 적합도 향상

**구현**:
- `consultant_profiles.sub_industries` TEXT[] 컬럼 추가
- `projects.sub_industries` TEXT[] 컬럼 추가
- GIN 인덱스로 배열 검색 최적화
- 마이그레이션: `009_add_sub_industries.sql`

---

## ADR-017: 인터뷰 참석자 정보

**날짜**: 2025-01-30

**결정**: 인터뷰에 참석한 기업 담당자 정보를 별도 컬럼으로 저장

**이유**:
- 인터뷰 참석자(이름, 직급)가 로드맵에 반영되어야 함
- 교육 대상자 정보를 명확히 기록하여 맞춤형 로드맵 생성 지원
- 감사 추적 및 리포트에 참석자 정보 필요

**구현**:
- `interviews.participants` JSONB 컬럼 추가 (id, name, position 배열)
- 마이그레이션: `010_add_interview_participants.sql`

---

## ADR-018: OPS_ADMIN_PENDING 역할 추가

**날짜**: 2025-02-01

**결정**: 운영관리자 회원가입 시 승인 대기 상태를 위한 `OPS_ADMIN_PENDING` 역할 추가

**이유**:
- 기존에는 컨설턴트(USER_PENDING)만 승인 플로우가 존재
- 운영관리자도 무분별한 가입을 방지하기 위해 승인 플로우 필요
- OPS_ADMIN은 컨설턴트만 승인, SYSTEM_ADMIN은 운영관리자까지 승인하는 역할 분리

**구현**:
- `user_role` ENUM에 `OPS_ADMIN_PENDING` 값 추가
- `lib/constants/status.ts`에 역할 그룹 상수 추가 (CONSULTANT_ROLES, OPS_ADMIN_ROLES)
- `getManageableRoles()`, `canManageUser()` 헬퍼 함수로 승인 가능 역할 판별
- 마이그레이션: `011_add_ops_admin_pending_role.sql`

---

## ADR-019: 컨설턴트 프로필 소속 필드 추가

**날짜**: 2025-02-02

**결정**: 컨설턴트 프로필에 소속(affiliation) 필드 추가

**이유**:
- 소속 정보가 기업의 컨설턴트 신뢰도 판단에 영향
- 프리랜서와 기관 소속 컨설턴트 구분 필요
- 프로필 명세(CONSULTANT_PROFILE_SPEC.md)에 이미 정의되어 있었으나 DB 스키마에 누락

**구현**:
- `consultant_profiles.affiliation` TEXT NOT NULL 컬럼 추가
- 기존 레코드는 마이그레이션에서 '프리랜서'로 기본값 설정 후 DEFAULT 제거
- 마이그레이션: `012_add_consultant_affiliation.sql`

---

## ADR-020: 회원탈퇴 기능 추가

**날짜**: 2025-02-05

**결정**: 사용자 상태에 `WITHDRAWN` 추가, 감사로그에 `USER_WITHDRAW` 액션 추가

**이유**:
- 개인정보보호법 준수 (사용자의 탈퇴 권리 보장)
- 탈퇴 시 데이터 삭제가 아닌 상태 전환으로 감사 추적 유지
- ACTIVE → WITHDRAWN 전환으로 재가입 관리 가능

**구현**:
- `user_status` ENUM에 `WITHDRAWN` 값 추가
- `audit_action` ENUM에 `USER_WITHDRAW` 값 추가
- 마이그레이션: `013_add_user_withdrawal.sql`
