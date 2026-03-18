# 시스템 종합 점검 결과 (2026-03-14)

4개 전문 서브에이전트(security-auditor, postgres-pro, performance-engineer, test-automator)를 활용하여 시스템 전반을 점검한 결과입니다.

## 요약

| 영역 | P0 | P1 | P2 | 상태 |
|------|----|----|-----|------|
| 보안 (security-auditor) | 0 | ~~3~~ ✅ | ~~5/6~~ ✅ | P1 전체 + P2 5/6건 해결 (P2-SEC-04 제외) |
| 데이터베이스 (postgres-pro) | 2 | 5 | 7 | 개선 필요 |
| 성능 (performance-engineer) | ~~2~~ ✅ | ~~4~~ ✅ | ~~4~~ ✅ | 전체 해결 완료 |
| 테스트 (test-automator) | ~~4~~ ✅ | ~~8~~ ✅ | ~~5~~ ✅ | P0/P1/P2 전체 해결 완료 |
| **합계** | **8** | **20** | **22** | — |

---

## 1. 보안 (security-auditor)

전반적으로 **양호**. P0 이슈 없음.

### P1 발견사항

#### ~~P1-SEC-01: 로드맵 내보내기 ACTIVE 상태 체크 누락~~ ✅ 해결

- [x] **해결 완료** (2026-03-18) — `EXPORT_ELIGIBLE_STATUSES` 상수 추가, `prepareExportData()`에서 프로젝트 상태 검증 (ROADMAP_DRAFTED, FINALIZED만 허용)
- **파일:** `src/lib/actions/roadmap-export.ts`, `src/lib/constants/status.ts`

#### ~~P1-SEC-02: PostgREST `.or()` 필터 인젝션~~ ✅ 해결

- [x] **해결 완료** (2026-03-18) — `sanitizePostgrestFilter()`/`ilikePattern()` 이스케이프 유틸리티 추가, 5개 파일(7개 `.or()` 호출) 전체 적용
- **파일:** `src/lib/utils/postgrest-sanitize.ts` (신규), `filters.ts`, `queries.ts`, `search/actions.ts`, `gallery/actions/queries.ts`, `consultant/projects/actions.ts`

#### ~~P1-SEC-03: 프로필 상태 검증 갭~~ ✅ 해결

- [x] **해결 완료** (2026-03-18) — `requireAuth` → `requireAuthWithRole(MESSAGING_ROLES)` 교체, ACTIVE 상태 검증 추가
- **파일:** `src/app/(dashboard)/dashboard/profile/actions.ts`

### P2 발견사항

| ID | 설명 |
|----|------|
| ~~P2-SEC-01~~ | ~~createAdminClient 사용처 주석 미흡~~ → ✅ 5개 파일에 RLS 우회 근거 주석 추가 |
| ~~P2-SEC-02~~ | ~~감사로그에 IP 주소 미기록~~ → ✅ `getClientIp()` 자동 추출, `meta.ip_address`에 기록 |
| ~~P2-SEC-03~~ | ~~환경변수 빌드 타임 검증 없음~~ → ✅ `next.config.ts`에 필수 환경변수 검증 추가 |
| P2-SEC-04 | SMTP 비밀번호가 환경변수로 관리되나 로테이션 정책 없음 |
| ~~P2-SEC-05~~ | ~~세션 만료 시간 기본값 사용~~ → ✅ `SESSION_COOKIE_OPTIONS` 명시적 설정 |
| ~~P2-SEC-06~~ | ~~RLS 정책 문서 최신화 필요~~ → ✅ `assessment_tokens` 정책 + 마이그레이션 목록 업데이트 |

---

## 2. 데이터베이스 (postgres-pro)

### P0 발견사항

#### ~~P0-DB-01: fetchProjectTimeline N+1 쿼리 (7개 순차)~~ ✅ 해결

- [x] **해결 완료** (2026-03-15) — `Promise.all`로 6개 독립 쿼리 병렬화, DB 왕복 8→2회로 최적화
- **파일:** `src/app/(dashboard)/ops/projects/actions/queries.ts`

#### ~~P0-DB-02: audit_logs 보존/아카이빙 정책 없음~~ ✅ 해결

- [x] **해결 완료** (2026-03-15) — `audit_logs_archive` 테이블 + `archive_old_audit_logs()` RPC 함수 추가
- **파일:** `supabase/migrations/044_audit_logs_archive.sql`

### P1 발견사항

| ID | 설명 | 권장 조치 |
|----|------|----------|
| P1-DB-01 | audit_logs 복합 인덱스 부재 — `(action_type, created_at)`, `(target_type, target_id)` 인덱스 필요 | 인덱스 마이그레이션 추가 |
| P1-DB-02 | fetchConversations 5단계 순차 쿼리 — 3~5단계 병렬화 가능 | Promise.all 적용 |
| P1-DB-03 | `is_approved_consultant()` RLS 함수 — 매 행 평가 시 users 테이블 조회. `get_user_role()`과 중복 호출 가능 | 결과 캐싱 또는 함수 통합 |
| P1-DB-04 | JSONB 컬럼 인덱싱 미적용 — `projects.diagnosis_result`, `roadmap_versions.roadmap_data` 등 | 자주 필터링하는 키에 GIN 인덱스 고려 |
| P1-DB-05 | setActiveTemplate 비원자적 2단계 UPDATE — 동시 호출 시 복수 템플릿 활성화 가능 | 단일 RPC로 원자적 처리 |

### P2 발견사항

| ID | 설명 |
|----|------|
| P2-DB-01 | `get_user_role()` 반복 호출 비용 — RLS 정책마다 호출, `SET LOCAL` 캐싱 고려 |
| P2-DB-02 | 소프트 삭제 미적용 — 현재 물리 삭제 사용 |
| P2-DB-03 | 외래키 인덱스 일부 누락 가능성 |
| P2-DB-04 | `messages` 테이블 대량 증가 시 파티셔닝 필요 |
| P2-DB-05 | `roadmap_versions.roadmap_data` JSONB 크기 제한 없음 |
| P2-DB-06 | `conversation_participants` 복합 인덱스 최적화 여지 |
| P2-DB-07 | 통계 쿼리용 물화 뷰(Materialized View) 부재 |

---

## 3. 성능 (performance-engineer)

### P0 발견사항

#### ~~P0-PERF-01: 감사로그 페이지 전체가 'use client'~~ ✅ 해결

- [x] **해결 완료** (2026-03-15) — page.tsx를 SC로 전환, `_components/AuditLogClient.tsx`로 분리, 초기 데이터 서버 프리페치
- **파일:** `src/app/(dashboard)/ops/audit/page.tsx`, `src/app/(dashboard)/ops/audit/_components/AuditLogClient.tsx`

#### ~~P0-PERF-02: 로드맵 페이지 2개 전체가 'use client'~~ ✅ 해결

- [x] **해결 완료** (2026-03-15) — 두 페이지 모두 SC로 전환, 인증 + 초기 버전 목록 서버 프리페치
- **파일:** `ops/.../roadmap/page.tsx` → `OpsRoadmapClient.tsx`, `consultant/.../roadmap/page.tsx` → `ConsultantRoadmapClient.tsx`

### P1 발견사항

#### ~~P1-PERF-01: 인터뷰 페이지 전체 'use client' (550줄)~~ ✅ 해결

- [x] **해결 완료** (2026-03-17) — page.tsx를 SC로 전환, `_components/InterviewClient.tsx`로 분리, 초기 데이터 서버 프리페치
- **파일:** `src/app/(dashboard)/consultant/projects/[id]/interview/page.tsx`, `_components/InterviewClient.tsx`

#### ~~P1-PERF-02: ops/projects/[id] 인증 쿼리 중복~~ ✅ 해결

- [x] **해결 완료** (2026-03-17) — 3개 페이지의 직접 인증 쿼리를 getCachedUser/getCachedProfile로 전환
- **파일:** `ops/projects/[id]/page.tsx`, `ops/templates/[id]/page.tsx`, `gallery/[id]/page.tsx`

#### ~~P1-PERF-03: email.ts 순차 쿼리 병렬화~~ ✅ 해결

- [x] **해결 완료** (2026-03-17) — 발신자 이름 + 수신자 이메일 조회를 Promise.all로 병렬화 (DB 왕복 4→3회)
- **파일:** `src/lib/services/email.ts`

#### ~~P1-PERF-04: GSAP+Lenis 정적 import 개선~~ ✅ 해결

- [x] **해결 완료** (2026-03-17) — 6개 파일 동적 import 전환 + dead code(useScrollAnimation.ts) 삭제
- **파일:** `SmoothScroll.tsx`, `HeroSection.tsx`, `FeaturesSection.tsx`, `WorkflowSection.tsx`, `DemoSection.tsx`, `FooterSection.tsx`

### P2 발견사항

#### ~~P2-PERF-01: 랜딩 페이지 전체 CSR (`ssr: false`) — SEO 불리~~ ✅ 해결

- [x] **해결 완료** (2026-03-17) — `ssr: false` 제거하여 SSR 활성화, FOUC 방지를 위해 GSAP 애니메이션 대상 요소에 `opacity-0` CSS 클래스 선적용
- **파일:** `LandingPageLoader.tsx`, `FeaturesSection.tsx`, `WorkflowSection.tsx`, `DemoSection.tsx`, `FooterSection.tsx`

#### ~~P2-PERF-02: 컨설턴트 홈/프로젝트 차트 recharts 직접 import~~ ✅ 해결

- [x] **해결 완료** (2026-03-17) — 이미 `dynamic()` import으로 코드 분할 적용됨 확인. Server Component에서는 `ssr: false` 사용 불가하나, recharts SVG 컴포넌트는 SSR에서 정상 동작하므로 현재 구성이 최적
- **파일:** `consultant/home/page.tsx` (변경 불필요 확인)

#### ~~P2-PERF-03: MessagesClient `createClient()` 4곳 다중 호출~~ ✅ 해결

- [x] **해결 완료** (2026-03-17) — `useRef` lazy initialization 패턴으로 단일 인스턴스 통합 (4회 → 1회)
- **파일:** `dashboard/messages/_components/MessagesClient.tsx`

#### ~~P2-PERF-04: `unstable_cache` 미사용 — 정적 데이터 캐싱 기회~~ ✅ 해결

- [x] **해결 완료** (2026-03-17) — 업종/컨설턴트 필터 옵션에 `unstable_cache` 적용 (30분 TTL + 태그 기반 무효화), 데이터 변경 시 `revalidateTag`로 즉시 무효화
- **파일:** `ops/projects/actions/filters.ts`, `ops/projects/actions/crud.ts`, `(auth)/actions/profile.ts`

### 양호한 영역

- jspdf, xlsx-js-style 동적 import 철저
- `React.cache()` getCachedUser/getCachedProfile 구현 완료
- revalidatePath 범위 적절 (과도한 무효화 없음)
- Realtime 구독 cleanup 철저 (removeChannel, timer, isMounted 패턴)
- ops 대시보드 차트 dynamic import + `ssr: false` 올바르게 적용
- loading.tsx 23개 라우트에 인스턴트 로딩 UI 제공

---

## 4. 테스트 (test-automator)

점검 시점: 55개 테스트 파일, 994개 테스트 전부 통과. 커버리지 15.8%.
**P0 해결 후 (2026-03-15):** 58개 테스트 파일, 1028개 테스트 전부 통과.
**P1 해결 후 (2026-03-17):** 65개 테스트 파일, 1128개 테스트 전부 통과. +100개 테스트, +7개 파일.
**P2 해결 후 (2026-03-18):** 65개 테스트 파일, 1154개 테스트 통과 (1 스킵). +27개 테스트, 100+개 네이밍 한국어 통일, 커버리지 임계값 설정, CI 워크플로우 추가, 스냅샷 7개.

### P0 발견사항

#### ~~P0-TEST-01: 컨설턴트 E2E 테스트 완전 부재~~ ✅ 해결

- [x] **해결 완료** (2026-03-15) — E2E 스펙 3개 추가 (홈 대시보드, 프로젝트 목록, 로드맵)
- **파일:** `e2e/consultant/consultant-home.spec.ts`, `consultant-projects.spec.ts`, `consultant-roadmap.spec.ts`

#### ~~P0-TEST-02: notifications/actions.ts 미테스트~~ ✅ 해결

- [x] **해결 완료** (2026-03-15) — 17개 단위 테스트 추가 (4개 함수 전체 커버)
- **파일:** `src/app/(dashboard)/notifications/actions.test.ts`

#### ~~P0-TEST-03: ops/quota/actions.ts 미테스트~~ ✅ 해결

- [x] **해결 완료** (2026-03-15) — 14개 단위 테스트 추가 (3개 함수 전체 커버)
- **파일:** `src/app/(dashboard)/ops/quota/actions.test.ts`

#### ~~P0-TEST-04: activity-log.ts 0% 커버리지~~ ✅ 해결

- [x] **해결 완료** (2026-03-15) — 3개 단위 테스트 추가 (정상 삽입, DB 에러, 예외 처리)
- **파일:** `src/lib/services/activity-log.test.ts`

### P1 발견사항

#### ~~P1-TEST-01: createMockClient 패턴 중앙화~~ ✅ 해결

- [x] **해결 완료** (2026-03-17) — `src/test/helpers/mock-supabase.ts` 공유 헬퍼 생성, 8개 테스트 파일 마이그레이션
- **파일:** `src/test/helpers/mock-supabase.ts` (신규), 8개 기존 테스트 파일 수정

#### ~~P1-TEST-02: consultant/projects/actions 테스트 보완~~ ✅ 해결

- [x] **해결 완료** (2026-03-17) — 32개 테스트 추가 (7개 신규 파일 + 25개 기존 확장)
- **파일:** `consultant/projects/actions.test.ts` (신규, 7개), `consultant/projects/[id]/roadmap/actions.test.ts` (확장, 25개)

#### ~~P1-TEST-03: ops/projects/actions 테스트 보완~~ ✅ 해결

- [x] **해결 완료** (2026-03-17) — 31개 테스트 추가 (3개 신규 파일 + 1개 확장)
- **파일:** `ops/projects/actions/filters.test.ts` (13개), `ops/projects/actions/assessment-token.test.ts` (10개), `ops/projects/[id]/roadmap/actions.test.ts` (6개), `ops/projects/actions.test.ts` (확장, 3개)

#### ~~P1-TEST-04: E2E 역할별 시나리오 확장~~ ✅ 해결

- [x] **해결 완료** (2026-03-17) — SYSTEM_ADMIN E2E 인프라 구축 + 스펙 2개 추가 (6개 케이스)
- **파일:** `e2e/system-admin/admin-access.spec.ts`, `e2e/system-admin/admin-approval.spec.ts`, `e2e/fixtures/auth.fixture.ts`, `e2e/fixtures/test-data.ts`, `e2e/global-setup.ts`
- **참고:** `.env.test`에 `E2E_SYSTEM_ADMIN_EMAIL/PASSWORD` 미설정 시 자동 skip

#### ~~P1-TEST-05: Zod 스키마 경계값 테스트~~ ✅ 해결 (기존)

- [x] **확인 완료** (2026-03-17) — 12/12 스키마 전체 테스트 존재 확인

#### ~~P1-TEST-06: 로드맵 내보내기 단위 테스트~~ ✅ 해결

- [x] **해결 완료** (2026-03-17) — 22개 테스트 추가 (3개 신규 파일)
- **파일:** `export/pdf/pdf-generator.test.ts` (7개), `export/xlsx/xlsx-generator.test.ts` (4개), `lib/actions/roadmap-export.test.ts` (11개)

#### ~~P1-TEST-07: 메시지 기능 테스트~~ ✅ 해결 (기존)

- [x] **확인 완료** (2026-03-17) — 7/7 함수 100% 테스트됨 (35개 케이스)

#### ~~P1-TEST-08: email.ts 테스트~~ ✅ 해결

- [x] **해결 완료** (2026-03-17) — 13개 테스트 추가 (기존 파일 확장)
- **파일:** `src/lib/services/email.test.ts` (기존 7개 + 13개 = 20개)

### P2 발견사항

#### ~~P2-TEST-01: 테스트 네이밍 불일치~~ ✅ 해결

- [x] **해결 완료** (2026-03-18) — 100+개 영어 it() 설명을 한국어로 변환, 화살표 기호 `→` 통일
- **파일:** `schemas/project.test.ts`, `schemas/interview.test.ts`, `schemas/user.test.ts`, `schemas/activity-log.test.ts`, `messages/actions.test.ts`, `consultant/projects/actions.test.ts`, `consultant/projects/[id]/roadmap/actions.test.ts` (7개)

#### ~~P2-TEST-02: 에러 케이스 테스트 비율 낮음~~ ✅ 해결

- [x] **해결 완료** (2026-03-18) — 20개 에러/경계값 테스트 추가 (19개 통과 + 1개 스킵)
- **파일:** `calculate-scores.test.ts` (4개), `pdf-generator.test.ts` (3개), `xlsx-generator.test.ts` (3개), `export-pdf.test.ts` (3개), `export-xlsx.test.ts` (3개), `roadmap.test.ts` (4개)

#### ~~P2-TEST-03: CI에서 E2E 자동 실행 미설정~~ ✅ 해결

- [x] **해결 완료** (2026-03-18) — `.github/workflows/ci.yml` 생성 (lint+typecheck → unit-test → build → e2e)
- **참고:** GitHub repo Settings에서 8개 시크릿 등록 필요

#### ~~P2-TEST-04: 커버리지 임계값 미설정~~ ✅ 해결

- [x] **해결 완료** (2026-03-18) — `vitest.config.ts`에 래칫 임계값 설정 (lines: 35, branches: 28, functions: 25, statements: 35)
- 현재 커버리지: lines 38.55%, branches 32.25%, functions 28.84%, statements 38.77%

#### ~~P2-TEST-05: snapshot 테스트 미사용~~ ✅ 해결

- [x] **해결 완료** (2026-03-18) — 7개 스냅샷 테스트 추가 (4개 컴포넌트)
- **파일:** `not-found.test.tsx` (1개), `CompanyInfoCard.test.tsx` (3개), `FooterCredit.test.tsx` (1개), `CollapsibleDirectInput.test.tsx` (2개)

---

## 우선순위 로드맵

### P0 — 즉시 조치 (8건)

| ID | 영역 | 설명 | 난이도 | 영향도 | 상태 |
|----|------|------|--------|--------|------|
| P0-DB-01 | DB | fetchProjectTimeline N+1 쿼리 병렬화 | 낮음 | 높음 | ✅ 해결 |
| P0-DB-02 | DB | audit_logs 보존/아카이빙 정책 수립 | 중간 | 높음 | ✅ 해결 |
| P0-PERF-01 | 성능 | 감사로그 페이지 SC/CC 분리 | 중간 | 높음 | ✅ 해결 |
| P0-PERF-02 | 성능 | 로드맵 페이지 2개 SC/CC 분리 | 중간 | 높음 | ✅ 해결 |
| P0-TEST-01 | 테스트 | 컨설턴트 E2E 테스트 추가 | 높음 | 높음 | ✅ 해결 |
| P0-TEST-02 | 테스트 | notifications/actions.ts 테스트 추가 | 낮음 | 중간 | ✅ 해결 |
| P0-TEST-03 | 테스트 | ops/quota/actions.ts 테스트 추가 | 낮음 | 중간 | ✅ 해결 |
| P0-TEST-04 | 테스트 | activity-log.ts 테스트 추가 | 낮음 | 중간 | ✅ 해결 |

### P1 — 단기 조치 (20건)

| ID | 영역 | 설명 | 난이도 | 영향도 |
|----|------|------|--------|--------|
| P1-SEC-01 | 보안 | 로드맵 내보내기 ACTIVE 상태 체크 | 낮음 | 중간 | ✅ 해결 |
| P1-SEC-02 | 보안 | PostgREST .or() 필터 인젝션 방어 | 중간 | 중간 | ✅ 해결 |
| P1-SEC-03 | 보안 | 프로필 수정 시 사용자 상태 재검증 | 낮음 | 중간 | ✅ 해결 |
| P1-DB-01 | DB | audit_logs 복합 인덱스 추가 | 낮음 | 높음 |
| P1-DB-02 | DB | fetchConversations 병렬화 | 낮음 | 중간 |
| P1-DB-03 | DB | is_approved_consultant() 최적화 | 중간 | 중간 |
| P1-DB-04 | DB | JSONB 컬럼 GIN 인덱스 검토 | 중간 | 중간 |
| P1-DB-05 | DB | setActiveTemplate 원자적 RPC | 낮음 | 중간 |
| P1-PERF-01 | 성능 | 인터뷰 페이지 SC/CC 분리 | 중간 | 중간 | ✅ 해결 |
| P1-PERF-02 | 성능 | ops/projects/[id] getCachedUser 전환 | 낮음 | 낮음 | ✅ 해결 |
| P1-PERF-03 | 성능 | email.ts 순차 쿼리 병렬화 | 낮음 | 낮음 | ✅ 해결 |
| P1-PERF-04 | 성능 | GSAP+Lenis 정적 import 개선 | 낮음 | 낮음 | ✅ 해결 |
| P1-TEST-01 | 테스트 | createMockClient 중앙화 | 낮음 | 중간 | ✅ 해결 |
| P1-TEST-02 | 테스트 | consultant/projects/actions 테스트 보완 | 중간 | 중간 | ✅ 해결 |
| P1-TEST-03 | 테스트 | ops/projects/actions 테스트 보완 | 중간 | 중간 | ✅ 해결 |
| P1-TEST-04 | 테스트 | E2E 역할별 시나리오 확장 | 높음 | 중간 | ✅ 해결 |
| P1-TEST-05 | 테스트 | Zod 스키마 경계값 테스트 보완 | 중간 | 중간 | ✅ 해결 |
| P1-TEST-06 | 테스트 | 로드맵 내보내기 단위 테스트 | 중간 | 중간 | ✅ 해결 |
| P1-TEST-07 | 테스트 | 메시지 기능 테스트 추가 | 중간 | 중간 | ✅ 해결 |
| P1-TEST-08 | 테스트 | email.ts 테스트 추가 | 낮음 | 낮음 | ✅ 해결 |

### P2 — 중기 조치 (22건)

~~보안 5/6건~~ ✅ 해결 (P2-SEC-04 제외), DB 7건, ~~성능 4건~~ ✅ 해결, ~~테스트 5건~~ ✅ 해결 — 위 각 섹션의 P2 테이블 참조.

---

## 사용 예시

이 문서를 기반으로 다음과 같이 요청할 수 있습니다:

```
"P0-DB-01 수정해줘"           → fetchProjectTimeline N+1 쿼리 병렬화
"P1-SEC 전부 처리해줘"        → 보안 P1 이슈 3건 일괄 수정
"P0-TEST-02~04 테스트 작성해줘" → 미테스트 Server Action 3개 테스트 추가
```
