# 시스템 종합 점검 결과 (2026-03-14)

4개 전문 서브에이전트(security-auditor, postgres-pro, performance-engineer, test-automator)를 활용하여 시스템 전반을 점검한 결과입니다.

## 요약

| 영역 | P0 | P1 | P2 | 상태 |
|------|----|----|-----|------|
| 보안 (security-auditor) | 0 | 3 | 6 | 양호 |
| 데이터베이스 (postgres-pro) | 2 | 5 | 7 | 개선 필요 |
| 성능 (performance-engineer) | ~~2~~ ✅ | ~~4~~ ✅ | 4 | P0·P1 해결 완료 |
| 테스트 (test-automator) | 4 | 8 | 5 | 개선 시급 |
| **합계** | **8** | **20** | **22** | — |

---

## 1. 보안 (security-auditor)

전반적으로 **양호**. P0 이슈 없음.

### P1 발견사항

#### P1-SEC-01: 로드맵 내보내기 ACTIVE 상태 체크 누락

- **파일:** `src/lib/actions/export-actions.ts`
- **문제:** 프로젝트가 FINALIZED 이후 비활성화되어도 내보내기 가능. 프로젝트 상태(ACTIVE 여부) 검증 없음.
- **권장:** 내보내기 전 프로젝트 상태 확인 로직 추가

#### P1-SEC-02: PostgREST `.or()` 필터 인젝션

- **파일:** `src/app/(dashboard)/ops/projects/actions.ts` 등 `.or()` 사용처
- **문제:** 사용자 입력이 `.or()` 필터 문자열에 직접 삽입되면 PostgREST 필터 인젝션 가능
- **권장:** `.or()` 내 사용자 입력을 파라미터화하거나 사전 이스케이프 처리

#### P1-SEC-03: 프로필 상태 검증 갭

- **파일:** `src/app/(dashboard)/dashboard/profile/actions.ts`
- **문제:** 프로필 업데이트 시 사용자 상태(ACTIVE/SUSPENDED 등) 재검증 없음. 미들웨어에서 세션은 확인하지만 상태 변경 후 기존 세션으로 프로필 수정 가능.
- **권장:** 프로필 수정 Server Action에서 사용자 상태 재검증

### P2 발견사항

| ID | 설명 |
|----|------|
| P2-SEC-01 | createAdminClient 사용처 8+ 파일 — 대부분 적절하나 주석으로 사용 근거 명시 권장 |
| P2-SEC-02 | 감사로그에 IP 주소 미기록 |
| P2-SEC-03 | 환경변수 검증이 런타임에만 수행 (빌드 타임 검증 없음) |
| P2-SEC-04 | SMTP 비밀번호가 환경변수로 관리되나 로테이션 정책 없음 |
| P2-SEC-05 | 세션 만료 시간이 Supabase 기본값 사용 (명시적 설정 권장) |
| P2-SEC-06 | RLS 정책 43개 마이그레이션에 분산 — 정책 일람 문서(`docs/RLS.md`) 최신화 필요 |

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

| ID | 설명 |
|----|------|
| P2-PERF-01 | 랜딩 페이지 전체 CSR (`ssr: false`) — SEO 불리 |
| P2-PERF-02 | 컨설턴트 홈/프로젝트 차트 recharts 직접 import — dynamic import 누락 |
| P2-PERF-03 | MessagesClient `createClient()` 4곳 다중 호출 — 1회로 통합 권장 |
| P2-PERF-04 | `unstable_cache` 미사용 — 정적 데이터(필터 옵션 등) 캐싱 기회 |

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
**해결 후 (2026-03-15):** 58개 테스트 파일, 1028개 테스트 전부 통과.

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

| ID | 설명 | 권장 조치 |
|----|------|----------|
| P1-TEST-01 | createMockClient 패턴 중앙화 필요 — 테스트 파일마다 재정의 | `__tests__/helpers/mock-supabase.ts` 공유 헬퍼 생성 |
| P1-TEST-02 | consultant/projects/actions.ts 부분 테스트만 존재 | 누락 액션 테스트 추가 |
| P1-TEST-03 | ops/projects/actions.ts 일부 액션 미테스트 | 누락 액션 테스트 추가 |
| P1-TEST-04 | E2E 역할별 시나리오 갭 — OPS_ADMIN 플로우만 존재 | SYSTEM_ADMIN, 다중 역할 전환 시나리오 추가 |
| P1-TEST-05 | Zod 스키마 테스트 불균일 — 일부 스키마만 테스트 존재 | 전체 스키마 경계값 테스트 추가 |
| P1-TEST-06 | 로드맵 내보내기(PDF/XLSX) 단위 테스트 없음 | 내보내기 로직 단위 테스트 추가 |
| P1-TEST-07 | 메시지 기능 테스트 없음 | 메시지 CRUD + Realtime 테스트 추가 |
| P1-TEST-08 | email.ts 테스트 없음 | SMTP 모킹 기반 이메일 발송 테스트 |

### P2 발견사항

| ID | 설명 |
|----|------|
| P2-TEST-01 | 테스트 네이밍 불일치 — describe/it 블록 한국어/영어 혼용 |
| P2-TEST-02 | 에러 케이스 테스트 비율 낮음 — happy path 위주 |
| P2-TEST-03 | CI에서 E2E 자동 실행 미설정 |
| P2-TEST-04 | 테스트 커버리지 임계값 미설정 (현재 15.8%) |
| P2-TEST-05 | snapshot 테스트 미사용 — UI 회귀 감지 도구 없음 |

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
| P1-SEC-01 | 보안 | 로드맵 내보내기 ACTIVE 상태 체크 | 낮음 | 중간 |
| P1-SEC-02 | 보안 | PostgREST .or() 필터 인젝션 방어 | 중간 | 중간 |
| P1-SEC-03 | 보안 | 프로필 수정 시 사용자 상태 재검증 | 낮음 | 중간 |
| P1-DB-01 | DB | audit_logs 복합 인덱스 추가 | 낮음 | 높음 |
| P1-DB-02 | DB | fetchConversations 병렬화 | 낮음 | 중간 |
| P1-DB-03 | DB | is_approved_consultant() 최적화 | 중간 | 중간 |
| P1-DB-04 | DB | JSONB 컬럼 GIN 인덱스 검토 | 중간 | 중간 |
| P1-DB-05 | DB | setActiveTemplate 원자적 RPC | 낮음 | 중간 |
| P1-PERF-01 | 성능 | 인터뷰 페이지 SC/CC 분리 | 중간 | 중간 | ✅ 해결 |
| P1-PERF-02 | 성능 | ops/projects/[id] getCachedUser 전환 | 낮음 | 낮음 | ✅ 해결 |
| P1-PERF-03 | 성능 | email.ts 순차 쿼리 병렬화 | 낮음 | 낮음 | ✅ 해결 |
| P1-PERF-04 | 성능 | GSAP+Lenis 정적 import 개선 | 낮음 | 낮음 | ✅ 해결 |
| P1-TEST-01 | 테스트 | createMockClient 중앙화 | 낮음 | 중간 |
| P1-TEST-02 | 테스트 | consultant/projects/actions 테스트 보완 | 중간 | 중간 |
| P1-TEST-03 | 테스트 | ops/projects/actions 테스트 보완 | 중간 | 중간 |
| P1-TEST-04 | 테스트 | E2E 역할별 시나리오 확장 | 높음 | 중간 |
| P1-TEST-05 | 테스트 | Zod 스키마 경계값 테스트 보완 | 중간 | 중간 |
| P1-TEST-06 | 테스트 | 로드맵 내보내기 단위 테스트 | 중간 | 중간 |
| P1-TEST-07 | 테스트 | 메시지 기능 테스트 추가 | 중간 | 중간 |
| P1-TEST-08 | 테스트 | email.ts 테스트 추가 | 낮음 | 낮음 |

### P2 — 중기 조치 (22건)

보안 6건, DB 7건, 성능 4건, 테스트 5건 — 위 각 섹션의 P2 테이블 참조.

---

## 사용 예시

이 문서를 기반으로 다음과 같이 요청할 수 있습니다:

```
"P0-DB-01 수정해줘"           → fetchProjectTimeline N+1 쿼리 병렬화
"P1-SEC 전부 처리해줘"        → 보안 P1 이슈 3건 일괄 수정
"P0-TEST-02~04 테스트 작성해줘" → 미테스트 Server Action 3개 테스트 추가
```
