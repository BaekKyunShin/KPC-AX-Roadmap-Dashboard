# 시스템 전수 조사 리포트 — 2026-04-28

> Playwright MCP 기반 전수 조사. 본 리포트는 검수자(사용자) 관점에서 "어느 메뉴 → 어떤 클릭 → 어떻게 깨지는지" 형식으로 정리되었습니다. 코드 인용은 포함하지 않습니다.
> **본 파일은 이후 세션에서 누적 갱신됩니다.** 갱신 컨벤션은 아래 "결함 상태 라벨" 절을 참조하세요.

## 변경 이력

| 날짜 | 작업 | PR | 결함 변동 |
|------|------|----|-----------|
| 2026-04-28 | 1차 전수 조사 | — | OPEN: #001~#010 (10건) |
| 2026-04-29 | 결함 수정 (세션 #A) | PR #36 | RESOLVED: #001, #002, #003, #005, #006, #007, #008, #009, #010 / 보류: #004 |
| 2026-04-29 | 이월 검증 (세션 #B) | PR #38 | OPEN 추가: #011 (P2), #012 (P1), #013 (P1) — silent fail 패턴 3건 |
| 2026-04-29 | #004 본격 해결 (세션 #C) | PR #39 | RESOLVED: #004 |
<!-- 새 항목은 위 행 위쪽이 아닌 아래쪽에 추가 (시간 순 누적) -->

## 결함 상태 라벨

| 라벨 | 의미 |
|------|------|
| 🔴 **OPEN** | 미해결 |
| 🟢 **RESOLVED** | 해결 완료 (PR 번호·커밋 SHA·날짜 명시) |
| ⚪ **DEFERRED** | 다음 세션 이월 |
| 🚫 **WONTFIX** | 의도된 동작으로 결정 (이유 명시) |
| 🔁 **REGRESSION** | 회귀 발생 |

각 결함 항목 끝에 해결 시 다음 행 추가:
```
- **해결 정보**: PR #NN · 커밋 abc1234 · 2026-04-29 · 검증자: ...
- **상태 변경**: 🔴 OPEN → 🟢 RESOLVED
```

## 요약

| 항목 | 값 |
|------|-----|
| **조사 환경** | 로컬 Supabase (`http://127.0.0.1:54321`) + 로컬 dev (`http://localhost:3000`) + HWPX 브리지 서버(`:3010`) |
| **로그인 계정** | `son@test.com`(OPS_ADMIN) · `kpc@test.com`(CONSULTANT_APPROVED) · 신규 가입 `audit-c-20260428@test.com`(USER_PENDING→CONSULTANT_APPROVED) — 모두 비번 `test1234!` (신규는 `Test1234!`) |
| **점검 라우트** | 약 18개 (랜딩·데모·로그인·회원가입·자가진단·승인 대기 대시보드·운영관리 7개·컨설턴트 5개·메시지·갤러리 등) |
| **점검 액션** | 12건 — 회원가입·승인·프로젝트 생성·자가진단 토큰 무효 케이스·로드맵 생성 클릭·로그아웃 등 |
| **발견 결함 합계** | **13건** (P1 4 / P2 4 / P3 5) — 세션 #B(2026-04-29) 에서 silent fail 3건 추가 |
| **다음 세션 권장** | LLM 실호출(로드맵·PBL·인터뷰 가이드·STT) + HWPX 다운로드 + 메시지 Realtime + 전체 sysadmin 권한 차이는 인터뷰 데이터 입력이 선행되어야 해 시간 부족으로 다음 세션으로 이월 |

### 결함 한눈에 보기

| # | 등급 | 상태 | 영역 | 메뉴 경로 | 한 줄 요약 |
|---|------|------|------|----------|-----------|
| 1 | **P1** | 🟢 RESOLVED | 기능 | 운영관리 > 감사로그 | 감사로그 페이지가 항상 "로그 없음" — DB는 정상 기록 중 |
| 2 | **P1** | 🟢 RESOLVED | 기능/UX | 컨설턴트 > 담당 프로젝트 > [프로젝트] > 로드맵 | 인터뷰 미완료 상태에서 "AI 로드맵 생성" 클릭 시 silent fail (피드백 0건) |
| 3 | P2 | 🟢 RESOLVED | 기능 | 운영관리 > 사용자 관리 | 운영관리자/시스템관리자 본인이 목록에 표시되지 않음 |
| 4 | P2 | 🟢 RESOLVED | 데이터 | (모든 사용자) /register | Step 1만 완료해도 USER_PENDING 사용자 즉시 등록, Step 2 이탈자 잔재 |
| 5 | P2 | 🟢 RESOLVED | UX | 자가진단 링크 | 무효/만료 토큰 접근 시 도메인 안내 없이 일반 404 페이지 |
| 6 | P3 | 🟢 RESOLVED | UI | 운영관리 > 사용자 관리 | 이메일이 셀에서 어색한 위치에서 줄바꿈 |
| 7 | P3 | 🟢 RESOLVED | UX | 운영관리 > 감사로그 | 0건 상태에서도 "전체 목록 다운로드 (0건)" 버튼 활성 |
| 8 | P3 | 🟢 RESOLVED | UX | 랜딩 페이지 (#demo) | 데모 캐러셀이 약 90초 주기 자동 회전, 일시정지 컨트롤 부재 |
| 9 | P3 | 🟢 RESOLVED | UI | 모든 인증 페이지 | fullPage 캡처 시 sticky 헤더가 페이지 중간에 한 번 더 그려짐 (SEO/OG에 영향) |
| 10 | P3 | 🟢 RESOLVED | UX | 승인 대기 대시보드 | USER_PENDING 사용자에게 사용 불가능한 메시지·알림 아이콘 노출 |
| 11 | P2 | 🔴 OPEN | UX | 컨설턴트 > 담당 프로젝트 > [프로젝트] > 인터뷰 | 자동저장 상태 라벨이 영구 "저장 실패"로 고착 — DB는 정상 저장 |
| 12 | **P1** | 🔴 OPEN | 기능 | 컨설턴트 > 담당 프로젝트 > [프로젝트] > 인터뷰 > Step 8 | "최종 제출" 클릭 시 silent fail — DB·status 전환 0, 토스트 0, 페이지 stay |
| 13 | **P1** | 🔴 OPEN | 기능 | 컨설턴트 > 담당 프로젝트 > [프로젝트] > 로드맵·PBL | 생성 Server Action 검증 실패 시 클라이언트 silent fail (토스트 부재) |

---

## P1 — 핵심 기능 사용 불가/사용성 차단

### #001 [P1] [🟢 RESOLVED] 운영관리 > 감사로그가 항상 "로그 없음" 표시

**메뉴 경로:** 로그인 (운영관리자) → 운영관리 > 감사로그

**재현 단계:**
1. `son@test.com` / `test1234!`으로 로그인
2. 운영관리 메뉴 → 감사로그 클릭

**기대:** 시스템에서 발생한 활동(프로젝트 생성, 사용자 승인 등) 로그 목록이 표시됨

**실제:** "로그 없음 / 기록된 로그가 없습니다" 빈 상태가 항상 표시됨. **하지만 데이터베이스에는 PROJECT_CREATE 등 로그가 정상적으로 기록되고 있음** (직접 SQL 조회로 확인).

**영향:** 운영관리자가 시스템 활동 내역을 추적할 수 없어 보안·감사·문제 추적이 불가능.

**스크린샷:** [G7-07-ops-audit.png](./screenshots/2026-04-28/G7-07-ops-audit.png)

- **해결 정보**: PR #36 · 2026-04-29 · 검증자: Vitest 회귀 테스트 + 수동 확인
- **상태 변경**: 🔴 OPEN → 🟢 RESOLVED — 근본 원인: `src/lib/services/audit.ts` 의 `fetchAuditLogs` 가 OPS_ADMIN 일 때만 `actor_user_id` 를 컨설턴트 화이트리스트로 좁히고 있어 OPS_ADMIN 본인이 actor 인 PROJECT_CREATE 등이 모두 차단되었음. RLS 정책(`audit_logs SELECT: OPS_ADMIN 이상 — 모든 로그 조회`) 의도와 충돌하던 코드 분기를 제거. 같은 결함이 export 다운로드(`fetchAllAuditLogs`)·actor 필터(`fetchUsers`)에도 있어 함께 정리.

---

### #002 [P1] [🟢 RESOLVED] "AI 로드맵 생성" 버튼 클릭 시 아무 피드백 없이 무반응

**메뉴 경로:** 로그인 (컨설턴트) → 워크스페이스 > 담당 프로젝트 > [시드기업B] > 로드맵 (또는 우측 상단 "로드맵" 버튼)

**전제 조건:** 자가진단 미완료, 인터뷰 미완료 (시드 기본 상태)

**재현 단계:**
1. `kpc@test.com` / `test1234!`으로 로그인
2. 컨설턴트 홈 → 최근 프로젝트의 "시드기업B" 클릭
3. "AI 로드맵 생성" 버튼 클릭
4. 어떤 시각적 변화도 발생하지 않음을 확인 (수십 초 대기 후에도 동일)

**기대 동작 (둘 중 하나):**
- ① 인터뷰 미완료 상태에서는 버튼이 비활성화되고 "인터뷰 입력을 먼저 완료해주세요" 안내 표시
- ② 클릭 시 로딩 스피너·진행 표시 후 LLM 호출이 진행됨

**실제 동작:** 버튼이 활성 상태로 클릭 가능 → 클릭 시 75ms 만에 서버에서 200 OK 응답 → 화면·DB·콘솔에 어떤 변화도 없음 → 사용자는 클릭이 됐는지조차 확인할 수 없음.

**영향:**
- 사용자가 무한히 같은 버튼을 누르며 LLM이 응답하지 않는 시스템이라고 오해할 수 있음
- 명확한 에러 메시지가 없어 컨설턴트가 무엇을 먼저 해야 하는지 모름

**스크린샷:**
- [G4-01-roadmap-generating.png](./screenshots/2026-04-28/G4-01-roadmap-generating.png) (클릭 직전)
- [G4-02-roadmap-after-click.png](./screenshots/2026-04-28/G4-02-roadmap-after-click.png) (클릭 후 8초, 동일 화면)

- **해결 정보**: PR #36 · 2026-04-29 · 검증자: Vitest 회귀 테스트 (3건 추가)
- **상태 변경**: 🔴 OPEN → 🟢 RESOLVED — 근본 원인: `RoadmapResultClient` EmptyState 가 인터뷰 부재 여부를 가드하지 않아 사용자가 클릭 자체를 할 수 있었음. Server Action 이 `Error('인터뷰 데이터가 없습니다.')` throw 후 catch → 토스트로 변환했으나 75ms 응답이라 시각적으로 놓치기 쉬움. 클라이언트에서 `interview` snapshot 키 존재 여부로 사전 가드 추가: 인터뷰 부재 시 EmptyState 가 "현장 인터뷰를 먼저 완료해주세요" 안내 + `/consultant/projects/[id]/interview` CTA 링크 + 생성 버튼 disabled 로 변환. 본 버튼에도 `disabled={isGenerating || !hasInterview}` 이중 가드.

---

## P2 — 주요 흐름 일부 차단/오해 유발

### #003 [P2] [🟢 RESOLVED] 사용자 관리에 운영관리자·시스템관리자 본인이 표시되지 않음

**메뉴 경로:** 로그인 (운영관리자) → 운영관리 > 사용자 관리

**재현 단계:**
1. `son@test.com`으로 로그인
2. 운영관리 > 사용자 관리 클릭

**기대:** 메뉴명이 "사용자 관리"이므로 시스템의 모든 사용자(운영관리자·시스템관리자·컨설턴트) 표시

**실제:** 컨설턴트 역할만 표시됨. 운영관리자(son)·시스템관리자(sysadmin) 본인이 목록에 없음.

**영향:** 운영관리자가 자기 정보 확인이나 시스템관리자 관리(예: 권한 정지)가 불가능. 메뉴명과 실제 기능 불일치.

**스크린샷:** [G7-04-ops-users.png](./screenshots/2026-04-28/G7-04-ops-users.png)

- **해결 정보**: PR #36 · 2026-04-29 · 검증자: Vitest 회귀 테스트 (3건 추가)
- **상태 변경**: 🔴 OPEN → 🟢 RESOLVED — 근본 원인: `/ops/users/page.tsx` 가 `OPS_ADMIN_MANAGEABLE_ROLES = CONSULTANT_ROLES` 로만 필터링하여 본인을 결과에 포함시키지 않음. `page.tsx` 에서 본인 행을 별도 조회해 목록 맨 앞에 합치고 (중복 제거) `UserManagementTable` 에 `currentUserId` prop 을 추가해 본인 행에서는 액션 버튼 대신 "본인" 뱃지 노출 (자기 권한 변경 사고 방지). 페이지 설명도 "운영관리자·시스템관리자 본인 정보와 컨설턴트 승인/정지 상태를 관리합니다."로 갱신.

---

### #004 [P2] [🟢 RESOLVED] 회원가입 Step 2 이탈 시 미완성 USER_PENDING 사용자 잔재

**메뉴 경로:** 회원가입 (`/register`)

**재현 단계:**
1. `/register` 진입
2. Step 1 (기본 정보) 입력 → "다음" 클릭 → Step 2 진입
3. Step 2 (컨설턴트 프로필)에서 페이지 닫기 또는 다른 곳으로 이탈

**기대:** Step 2까지 완료해야 사용자 레코드가 생성됨, 이탈자는 잔재 없음

**실제:** Step 1 제출 시점에 이미 `auth.users` + `public.users`(role=USER_PENDING) 레코드가 생성됨. Step 2 미완료 시 컨설턴트 프로필 정보 없는 USER_PENDING 사용자가 DB에 잔재.

**영향:** 운영관리자가 사용자 승인 검토 시 프로필 정보 부재 케이스 발생. 가입 도중 이탈한 케이스를 자동 정리할 방법 없음.

**DB 검증:** `audit-c-20260428@test.com`이 Step 2 미완료 상태에서도 즉시 `USER_PENDING`/`role=USER_PENDING`으로 등록됨을 확인.

- **해결 정보**: PR #39 · 2026-04-29 · 검증자: Vitest 단위 테스트 11건 + Playwright E2E 1건
- **상태 변경**: 🔴 OPEN → 🟢 RESOLVED — 옵션 C(atomic registration) 적용. Step 2 까지 완료해야 `auth.users` + `public.users` + `consultant_profiles` 가 한 번에 생성되도록 회원가입 흐름을 재구성. 신규 액션 `checkEmailAvailability` 가 Step 1 → Step 2 전환 시 이메일 중복만 사전 확인(DB 쓰기 없음)하고, 신규 액션 `registerConsultantWithProfile` 이 Step 2 제출 시 4단계(Auth user → users → consultant_profiles → 자동 로그인) 를 atomic 으로 처리하며 어느 단계든 실패 시 Auth user 삭제(CASCADE) 로 롤백. Step 1 입력값은 React state(`step1Data`) 에만 보관 + Step 2 진입 후 `beforeunload` 경고로 손실 방지. **DB 스키마 변경 없음**(마커 컬럼·cleanup cron 같은 보조 장치 불필요 — 좀비 사용자가 구조적으로 발생할 수 없음). UX 동일(2단계 스테퍼 유지). OPS_ADMIN 흐름은 Step 2 가 없으므로 기존 `registerUser` 호출 유지. 보류 사유에서 검토했던 옵션 A(profile_completed marker) 와 옵션 B(단일 페이지 통합) 대비 데이터 정합성·UX·작업량 모두 우위.

---

### #005 [P2] [🟢 RESOLVED] 자가진단 무효/만료 토큰 → 일반 404 (도메인 안내 없음)

**메뉴 경로:** 자가진단 링크 (`/assessment/[token]`)

**재현 단계:**
1. 비로그인 상태로 `/assessment/invalid-token-test` 같은 무효 토큰 URL 접근

**기대:** "이 자가진단 링크는 만료되었거나 이미 사용되었습니다. 컨설턴트에게 새 링크를 요청해주세요" 같은 도메인 안내 + 액션

**실제:** 일반 "404 페이지를 찾을 수 없습니다" + "홈으로 돌아가기" 버튼 표시. 사용자(고객사 진단 담당자)가 본인 링크가 잘못된 건지 시스템 오류인지 알 수 없음.

**영향:** 고객사 응답률 저하·문의 전화 증가 가능.

**스크린샷:** [G1-08-assessment-invalid.png](./screenshots/2026-04-28/G1-08-assessment-invalid.png)

- **해결 정보**: PR #36 · 2026-04-29 · 검증자: Phase 4 E2E (`tests/e2e/assessment-invalid-token.spec.ts`)
- **상태 변경**: 🔴 OPEN → 🟢 RESOLVED — 근본 원인: `assessment/[token]/page.tsx` 가 토큰 미존재 시 `notFound()` 호출 → 일반 404 페이지로 폴백. 이미 만료/사용 케이스는 `StatusMessage` 도메인 안내 컴포넌트가 있었음. 무효 토큰 분기도 같은 컴포넌트로 "유효하지 않은 자가진단 링크 — 자가진단 링크가 잘못되었거나 만료된 것으로 보입니다. 담당 컨설턴트에게 새 링크를 요청해 주세요." 안내 노출. `notFound` import 도 제거.

---

## P3 — 사소한 시각·문구·UX

### #006 [P3] [🟢 RESOLVED] 사용자 관리 — 이메일 셀에서 어색한 줄바꿈

**메뉴 경로:** 운영관리 > 사용자 관리

**현상:** 긴 이메일(`audit-c-20260428@test.com`)이 셀 너비에 맞춰 줄바꿈될 때 단어 단위가 아닌 임의 위치에서 끊어져 `audit-c-20260428@te` / `st.com`처럼 표시됨.

**개선 방향:** `word-break: keep-all` + `overflow-wrap: break-word` 조합 사용 또는 셀 너비 조정.

**스크린샷:** [G7-04-ops-users.png](./screenshots/2026-04-28/G7-04-ops-users.png)

- **해결 정보**: PR #36 · 2026-04-29 · 검증자: Vitest (`break-all` 클래스 적용 검증)
- **상태 변경**: 🔴 OPEN → 🟢 RESOLVED — `UserManagementTable` 데스크톱 셀 (모바일 카드는 이미 적용됨) 의 `text-gray-500` 에 `break-all` 추가. data-testid="user-email-desktop" 부여로 회귀 테스트 셀렉터 안정성 확보.

---

### #007 [P3] [🟢 RESOLVED] 감사로그 0건 상태에서 "전체 목록 다운로드 (0건)" 버튼 활성

**메뉴 경로:** 운영관리 > 감사로그

**현상:** 로그가 0건일 때도 "전체 목록 다운로드 (0건)" 버튼이 클릭 가능한 상태. 클릭해도 다운로드할 데이터 없음.

**개선 방향:** 0건일 때 버튼 disabled 처리.

**스크린샷:** [G7-07-ops-audit.png](./screenshots/2026-04-28/G7-07-ops-audit.png)

- **해결 정보**: 코드 검증 결과 `AuditLogClient.tsx:469` 에 이미 `disabled={total === 0 || exporting !== null || loading}` 적용되어 있음. 1차 조사자가 시각적으로 disabled 인지 못한 것으로 추정 (`disabled:opacity-50` 만 적용되어 흐림). 회귀 방지 단위 테스트 1건 추가.
- **상태 변경**: 🔴 OPEN → 🟢 RESOLVED

---

### #008 [P3] [🟢 RESOLVED] 랜딩 페이지 데모 캐러셀이 자동으로 빠르게 넘어감

**메뉴 경로:** 랜딩 페이지(`/`) → 하단 "제품 데모" 섹션

**현상:** 데모 캐러셀(역량 모델링 / 훈련체계도 / 연간 훈련계획 / 훈련과정 명세서)이 약 90초 주기로 자동 전환됨. 표 콘텐츠가 길어 사용자가 다 읽기 전에 다음 페이지로 넘어감. 일시정지·수동 컨트롤이 사용 가능하지만 명시적이지 않음.

**개선 방향:**
- 사용자가 캐러셀 영역에 마우스를 올리면 자동 전환 일시정지
- "자동 전환 끄기" 토글 또는 명시적 일시정지 버튼

- **해결 정보**: PR #36 · 2026-04-29 · 검증자: Vitest 회귀 테스트 (3건 추가)
- **상태 변경**: 🔴 OPEN → 🟢 RESOLVED — DemoSection 의 SlideCounter 옆 (top-4 right-20) 에 명시적 일시정지/재생 토글 버튼 추가. `aria-label` 이 isPaused 상태에 따라 "자동 전환 일시정지" / "자동 전환 재생" 으로 토글되어 스크린 리더에도 명확. 기존 호버 일시정지(`onMouseEnter/Leave`) 는 유지.

---

### #009 [P3] [🟢 RESOLVED] fullPage 캡처 시 sticky 헤더가 페이지 중간에 한 번 더 그려짐

**메뉴 경로:** 운영관리 > 프로젝트 관리 > [프로젝트 상세] 등 sticky 헤더가 있는 모든 페이지

**현상:** `fullPage` 모드 스크린샷 캡처 시 헤더 네비게이션이 페이지 상단(0px) + 중간(약 30~40% 지점)에 두 번 그려짐. 일반 사용자에게는 영향 없으나 OG 이미지·소셜 공유·문서 캡처 품질이 저하됨.

**참고:** 같은 원인으로 랜딩 페이지의 GSAP 인터섹션 애니메이션 섹션이 fullPage 캡처에서 빈 화면으로 캡처되는 문제도 함께 발생.

**스크린샷:** [G7-03-ops-project-detail.png](./screenshots/2026-04-28/G7-03-ops-project-detail.png) (헤더가 중간에 두 번째로 등장)

- **해결 정보**: PR #36 · 2026-04-29 · 검증자: Vitest 회귀 테스트
- **상태 변경**: 🔴 OPEN → 🟢 RESOLVED — Navigation 의 `<nav>` 요소에 `data-html2canvas-ignore` 속성 추가. html2canvas/Playwright fullPage 등 캡처 도구가 sticky 헤더를 페이지 중간에 중복으로 그리는 현상을 회피. 일반 브라우저 동작에는 영향 없음 (속성은 무시됨). 검증은 best-effort 수준 — 단위 테스트로 속성 존재만 확인.

---

### #010 [P3] [🟢 RESOLVED] 승인 대기 사용자 헤더에 사용 불가능한 메시지·알림 아이콘 노출

**메뉴 경로:** 신규 회원가입 직후 → /dashboard

**현상:** USER_PENDING 상태에서 헤더 우측에 "검색 / 메시지 / 알림" 아이콘이 그대로 노출됨. 승인 전에는 이 기능들이 의미 없거나 사용 불가능.

**개선 방향:** 승인 전 사용자에게는 해당 아이콘을 숨기거나 비활성 + 툴팁("승인 후 사용 가능") 표시.

**스크린샷:** [G2-02-pending-dashboard.png](./screenshots/2026-04-28/G2-02-pending-dashboard.png) (헤더 우측 아이콘들 확인)

- **해결 정보**: PR #36 · 2026-04-29 · 검증자: Vitest 회귀 테스트 (4건 추가)
- **상태 변경**: 🔴 OPEN → 🟢 RESOLVED — Navigation 에 `isApprovedUser = isConsultant || isOpsAdmin` 가드 추가. USER_PENDING / OPS_ADMIN_PENDING 일 때 데스크톱·모바일 두 영역의 `<MessageIcon>` / `<NotificationBell>` 모두 미렌더. 승인된 사용자(컨설턴트·운영관리자·시스템관리자) 에게는 기존대로 노출. 검색 아이콘은 별도 결함이 아니므로 그대로 유지.

---

## 세션 #B 신규 결함 (silent fail 3건 — 2026-04-29)

> 1차 조사(2026-04-28)에서 이월된 인터뷰·로드맵·PBL LLM 흐름 검증 중 발견. 모두 **사용자 클릭 → 시스템 응답 0** 패턴 (1차 결함 #002 와 같은 계열).

### #011 [P2] [🔴 OPEN] 인터뷰 자동저장 상태 라벨이 영구 "저장 실패"로 고착

**메뉴 경로:** 컨설턴트 > 담당 프로젝트 > [프로젝트] > 인터뷰

**재현:** kpc 로그인 → 시드기업B 인터뷰 → Step 1 입력 → 다음 → 하단 "저장 실패 / 저장" 라벨 관찰

**기대:** 자동저장 성공 시 "저장됨 / N초 전 저장" 정상 표기

**실제:** 페이지 진입부터 8단계 끝까지 라벨 영구 "저장 실패". POST 응답 모두 200 OK, DB에는 V2 schema 데이터 정상 저장 (`company_details.roadmap_overview` 등). UI 라벨만 영구 고착.

**영향:** 컨설턴트가 입력 미저장으로 오해 → 반복 입력 또는 작업 중단

**근본 원인 추정:** 자동저장 partial schema 검증 일부 분기에서 `success: false` 반환하지만 별도 path에서 DB INSERT/UPDATE 정상 실행. 또는 클라이언트 자동저장 hook이 ActionResult 응답 검증 잘못 해석.

**스크린샷:** ./screenshots/2026-04-29/G1-02-step1-filled.png, G1-04-step2-saved.png

---

### #012 [P1] [🔴 OPEN] 인터뷰 "최종 제출" silent fail — DB·status 전환 없음

**메뉴 경로:** 컨설턴트 > 담당 프로젝트 > [프로젝트] > 인터뷰 > Step 8 > "최종 제출"

**재현:** Step 1~8 모두 입력 후 "최종 제출" 클릭

**기대:** 인터뷰 최종 확정 → 결과 페이지 + status `INTERVIEWED` + 토스트. 또는 검증 실패 시 명확한 에러 토스트.

**실제:** 화면 변화 0, 토스트 0, DB `interviews.updated_at` 갱신 X, `projects.status` `ASSIGNED` 그대로, 콘솔 에러 0, 추가 POST 흔적 없음

**영향:** 컨설턴트가 인터뷰 완료라 오해하지만 후속 워크플로우(로드맵 생성)는 status 가드(`ROADMAP_ELIGIBLE_STATUSES`)에 막힘 → 결함 #013과 결합 시 dead-end

**근본 원인 추정:** Step 8 strict schema 검증(`RoadmapInterviewStrictSchema`) 실패 시 클라이언트 에러 토스트 변환 못 함. 또는 "최종 제출" 버튼이 실제 submit handler에 wired 안 됨.

**스크린샷:** ./screenshots/2026-04-29/G1-09-step8-filled.png, G1-10-after-submit.png

---

### #013 [P1] [🔴 OPEN] 로드맵·PBL 생성 Server Action 실패 시 클라이언트 silent fail

**메뉴 경로:**
- ① 컨설턴트 > 담당 프로젝트 > [프로젝트] > 로드맵 > "AI 로드맵 생성"
- ② 컨설턴트 > 담당 프로젝트 > [프로젝트] > PBL > "새 버전 생성"

**재현 A (로드맵):** status `ASSIGNED`이거나 자가진단 결과 없는 프로젝트에서 "AI 로드맵 생성" 클릭

**재현 B (PBL):** PBL 트랙에서 인터뷰 9단계 미완료 → "새 버전 생성" → "생성 시작" 클릭

**기대:** server action `success: false` 반환 → Sonner 토스트 표시. 또는 클라이언트 사전 검증으로 버튼 비활성화

**실제 (양 시나리오):** POST 200 OK + 60~95ms (LLM 호출 시작도 안 됨), 화면 변화 0, 토스트 0, 버튼 다시 활성화 → 무한 재시도

**서버 로그 (시나리오 A):**
```
[createRoadmap Error] Error: 자가진단 결과가 없습니다.
    at generateRoadmap (src/lib/services/roadmap/roadmap-generator.ts:285:11)
POST /consultant/projects/[id]/roadmap 200 in 241ms
```

**영향:** 결함 #002 silent fail의 또 다른 케이스. 결함 #012로 인터뷰 status 전환 안 되는 환경에서 무한 클릭

**근본 원인 추정:** `createRoadmap`/`createPblReport` Server Action 사전 검증 실패 응답을 클라이언트가 토스트로 변환 못 함. 결함 #002 fix(인터뷰 부재 가드)가 status·자가진단 검증까지는 커버 X.

**스크린샷:** ./screenshots/2026-04-29/G2-03-roadmap-loading.png, G3-04-pbl-loading-or-error.png

**비고:** 본 세션은 검증을 위해 시드기업B status를 `UPDATE projects SET status='INTERVIEWED'`로 fallback.

---

## 세션 #B 검증 산출물 요약

> 1차 부록 A 6항목 모두 검증 (1건 부분 + 추가 이월). 양호 항목 우세.

### ✅ 검증 완료

- **로드맵 LLM** — 시드기업B V1 LLM 호출 성공 (응답 ~95초, progress 다이얼로그 정상 — 1단계 요구사항 분석 → 2단계 교육과정 설계 → 3단계 로드맵 구성)
- **로드맵 결과 페이지** — V1 DRAFT 표시, I.개요/II.요구분석/III.훈련체계 탭, 인터뷰 입력값 정확히 주입
- **로드맵 다운로드 3종** — PDF (8페이지, 750KB, %PDF-1.3), XLSX (75KB, PK ZIP), HWPX (408KB, hwp+zip MIME)
- **두 번째 DRAFT** — V2 LLM 호출 후 DB에 V2 DRAFT 추가 (V1=FINAL, V2=DRAFT 공존)
- **FINAL 확정 + ARCHIVED** — V2 확정 시 V1 자동 ARCHIVED (DB 검증)
- **결함 #002 가드 회귀 확인** — 인터뷰 없는 신규 프로젝트에서 버튼 disabled + 안내 정상
- **결함 #003 가드** — sysadmin 페이지에 본인 행 + "본인" 라벨 + 액션 버튼 미노출 정상
- **메시지 1:1 + Realtime** — kpc → son 즉시 수신, 메시지 뱃지 1, 알림 뱃지 4
- **알림벨 + 라우팅** — 드롭다운 4건, 탭 분류(전체/인터뷰/초안/확정) 정상
- **`/test-roadmap`, `/test-pbl`** — 둘 다 정상, "DB 비저장" 안내 명시, 본 인터뷰 대비 단계 1개 적음 (HRD이음 PDF 단계 제외)

### 🆕 신규 결함 — silent fail 3건

| # | 등급 | 영역 | 한 줄 요약 |
|---|------|------|-----------|
| #011 | P2 | UX | 인터뷰 자동저장 라벨이 영구 "저장 실패"로 고착 (DB는 정상 저장) |
| #012 | **P1** | 기능 | 인터뷰 "최종 제출" silent fail |
| #013 | **P1** | 기능 | 로드맵·PBL 생성 Server Action 실패 시 토스트 부재 |

### ⚠️ 부분 검증 + 추가 이월

- PBL 인터뷰 9단계는 Step 1만 입력. PBL LLM 호출은 결함 #013 확인까지만. **PBL HWPX 다운로드 보류** — 세션 #C+에서 PBL 9단계 완전 입력 후 LLM + HWPX 검증 권장.

### 환경 메모

- 시드 `.env.test` LLM_API_KEY가 OpenAI placeholder(`sk-proj-...`) — Anthropic SDK 호출 실패. 본 세션은 운영 백업에서 Anthropic 키와 HWPX_API_SECRET을 fallback. 운영 .env.test 보강 여부는 별도 결정.
- 본 세션 진행 중 시드기업B status를 `INTERVIEWED`로 직접 UPDATE — 결함 #012 회피용.

---

## UX 종합 코멘트

### 잘된 점

- **비주얼 톤 일관성**: 운영관리·컨설턴트 영역 모두 깔끔한 카드/테이블 디자인. 색·간격·타이포그래피가 B2B 대시보드 답게 정제됨.
- **승인 대기 대시보드**: 진행 단계 시각화(가입 완료 → 프로필 검토 → 승인 → 서비스 이용) + 영업일 안내 + 연락처가 명확. 사용자가 다음에 무엇을 기다리는지 잘 이해 가능.
- **컨설턴트 홈 KPI**: 5장의 상태별 KPI 카드 + 도넛 차트 + 최근 프로젝트 3축 구성이 직관적.
- **프로젝트 진행 단계 인디케이터**: 상세 페이지의 6단계(생성 → 자가진단 → 컨설턴트 배정 → 인터뷰 → 초안 → 최종 확정)가 시각적으로 명확.
- **모바일 반응형**: 햄버거 메뉴, 카드형 변환, 가로 스크롤 없음 — 핵심 페이지 모두 반응형 대응이 완성도 높음.

### 개선이 필요한 점 (UX 관점)

1. **클릭에 대한 피드백 부재** (#002와 직결) — Server Action 실행 중·완료·실패에 대한 시각적 피드백(스피너, 토스트, 버튼 disabled)이 일부 화면에서 누락됨. 사용자는 자기 동작이 시스템에 도달했는지 알 수 없음.
2. **선행 조건이 명확하지 않은 액션 버튼** — 자가진단/인터뷰가 안 끝났는데 "AI 로드맵 생성" 버튼이 활성화되어 사용자가 잘못된 순서를 시도하게 됨. 흐름 단계마다 다음 액션의 활성/비활성을 명확히 보여줘야 함.
3. **에러/빈 상태의 도메인 컨텍스트 부재** — 자가진단 무효 토큰처럼 도메인 특화 상황에서 일반 404로 떨어지면 사용자가 다음 행동을 알 수 없음. 빈 상태마다 "왜 비어있는지 + 무엇을 하면 채워지는지" 안내 필요.
4. **메뉴명과 기능 범위 불일치** — "사용자 관리"라고 적혀 있으나 실제로는 컨설턴트만 관리됨. 메뉴명을 "컨설턴트 관리"로 바꾸거나 모든 역할을 표시하도록 확장 필요.
5. **"승인 대기" 상태 UI/UX 일관성** — 승인 전 사용자에게 사용 불가능한 헤더 아이콘들이 그대로 노출. 상태별 헤더 변형 권장.

---

## 모바일 반응형 평가

데스크톱(1440×900)과 모바일(390×844) 두 viewport에서 핵심 페이지를 점검한 결과:

| 페이지 | 모바일 동작 | 비고 |
|--------|----------|------|
| 컨설턴트 홈 | ✓ 정상 | KPI 카드 2열 → 1열 변환, 도넛 차트 가운데 정렬 |
| 컨설턴트 담당 프로젝트 | ✓ 정상 | 테이블 → 카드형으로 변환, 검색·필터 별도 행 |
| 갤러리 | ✓ 정상 | 데스크톱과 동일한 카드 레이아웃 |
| 메시지 | ✓ 정상 | 빈 상태 그대로 표시 |
| 회원가입 Step 1 | ✓ 정상 | 라디오 카드 2열 유지, 입력 필드 풀폭 |

**모바일에서의 추가 결함은 발견되지 않음.** Batch 0~6의 모바일 반응형 작업이 잘 적용된 것으로 보임.

---

## 부록 A — 점검한 라우트·액션 체크리스트

### PUBLIC
- [x] `/` 랜딩 — CTA·헤더 네비·서비스소개·워크플로우·데모·푸터
- [x] `/demo` 데모 화면 — 4탭 전환
- [x] `/login` 로그인 — 정상/오타비번/keychain 자동완성
- [x] `/register` 회원가입 Step 1 / Step 2 양식 확인
- [x] `/assessment/[invalid-token]` 무효 토큰

### USER_PENDING
- [x] `/dashboard` 승인 대기 카드
- [x] `/ops/projects` 직접 접근 → /dashboard 리다이렉트 (보호 라우트 차단)

### CONSULTANT_APPROVED (kpc)
- [x] `/consultant/home` KPI·차트·최근 프로젝트
- [x] `/consultant/projects` 검색·필터
- [x] `/consultant/projects/[id]` 기업정보·자가진단·탭
- [x] `/consultant/projects/[id]/roadmap` 빈 상태·생성 클릭 (silent fail 발견)
- [x] `/consultant/projects/[id]/interview` 8단계 폼 진입 확인 (입력은 시간 부족)
- [x] `/dashboard/messages` 빈 상태
- [x] `/gallery` 빈 상태

### OPS_ADMIN (son)
- [x] `/ops/projects` KPI·필터·목록
- [x] `/ops/projects/new` 폼 입력 → 프로젝트 생성 성공
- [x] `/ops/projects/[id]` 상세 화면
- [x] `/ops/users` 사용자 목록·승인 액션
- [x] `/ops/templates` 템플릿 목록
- [x] `/ops/notices` 빈 공지 목록
- [x] `/ops/audit` 감사로그 (P1 결함 발견)
- [x] `/ops/quota` 컨설턴트 LLM 쿼터 현황

### 모바일 반응형 (Pixel 5)
- [x] 컨설턴트 홈 / 프로젝트 목록

### 다음 세션 이월
- [x] 인터뷰 8단계 입력 → 로드맵 LLM 실호출 — **세션 #B 검증 완료**
- [x] 로드맵 PDF/Excel/HWPX 실제 다운로드 — PDF 8페이지·750KB / XLSX 75KB / HWPX 408KB 모두 정상
- [~] PBL 트랙 프로젝트 별도 생성 → PBL 생성·다운로드 — **부분 검증**, HWPX 추가 이월
- [x] 메시지 1:1 대화 + Realtime 검증 — kpc → son 즉시 수신, 메시지·알림 뱃지 정상
- [x] sysadmin 로그인 → OPS_ADMIN과의 권한 차이 — 메뉴 동일 + 본인 가드 정상
- [x] `/test-roadmap`, `/test-pbl` 테스트 트랙 — 둘 다 정상, "DB 비저장" 안내 명시

### 세션 #B 추가 이월 (세션 #C+)
- [ ] PBL 인터뷰 9단계 완전 입력 → PBL LLM 생성 → PBL HWPX 다운로드

---

## 부록 B — 다음 세션 진행 권장 사항

1. **이번 세션에서 환경 셋업 완료** — `.env.local`이 로컬 Supabase로 분기됐고, HWPX 브리지·dev 서버·Supabase 모두 기동 상태. 다음 세션은 셋업 단계 생략 가능.
2. **인터뷰 데이터 시드 추가 권장** — 시드기업A 또는 시드기업B에 인터뷰 데이터를 미리 넣어두면 LLM 호출 케이스를 즉시 검증 가능.
3. **결함 #002 수정 후 재검증** — 인터뷰 미완료 시 로드맵 생성 버튼 비활성/안내가 추가되면, 그 후 인터뷰 완료 흐름으로 LLM·HWPX 검증 진행.
4. **PBL 트랙 별도 점검** — 이번 세션은 모두 "AI 훈련로드맵" 트랙이었음. PBL 트랙 시드 또는 별도 프로젝트 생성 후 점검.

---

## 부록 C — AUDIT 데이터 정리 가이드

이번 조사 중 다음 데이터가 시스템에 잔류했습니다.

### DB 잔재 (로컬 Supabase)

| 테이블 | 행 | 식별자 |
|--------|----|--------|
| `auth.users` + `public.users` | 1행 | `audit-c-20260428@test.com` (USER_PENDING → CONSULTANT_APPROVED) |
| `public.projects` | 1행 | `[AUDIT-20260428] 감사회사` (UUID `76fcf68b-898a-44ce-9de8-0242a0fcc7e9`) |
| `public.audit_logs` | 1행 | PROJECT_CREATE 로그 |

### 정리 방법

**옵션 1 (권장):** 로컬 DB 통째로 리셋
```bash
npx supabase db reset
```

**옵션 2:** 운영관리 메뉴에서 수동 정리
- 운영관리 > 사용자 관리 → "감사컨설턴트" 행 삭제(현재 UI에 삭제 액션 부재 시 옵션 1 사용)
- 운영관리 > 프로젝트 관리 → `[AUDIT-20260428] 감사회사` 검색 → 삭제

### 환경 원복 (조사 종료 시 반드시 실행)

```bash
mv .env.local.audit-bak .env.local
```

위 명령으로 운영 Supabase URL을 다시 가리키도록 복구. 이후 `npm run dev` 시 자동으로 운영 환경에 연결됩니다.

---

## 부록 D — 조사 메타데이터

- **시작:** 2026-04-28 02:09 KST
- **종료:** 2026-04-28 02:18 KST (조사) + 리포트 작성 시간
- **사용 도구:** Playwright MCP (Chromium), psql 직접 조회, Supabase CLI
- **점검자:** Claude (Auto mode, 한국어 응답 모드)
- **스크린샷 위치:** `docs/reports/screenshots/2026-04-28/`
- **임시 결함 노트:** `docs/reports/_findings-draft.md` (정리 후 본 리포트에 통합)

---

## 부록 E — 세션 #B 검증 메타데이터 (2026-04-29)

- **시작:** 2026-04-29 약 00:50 KST (Phase 0 + 환경 셋업)
- **종료:** 2026-04-29 약 01:40 KST (PR #38 생성 + .env 원복)
- **소요:** 약 50분 (계획 대비 3.5시간 예상의 약 1/4 — silent fail 결함 발견·진단·우회에 시간 절약)
- **사용 도구:** Playwright MCP (Chromium), `docker exec ... psql` (로컬 DB 직접 조회), Supabase CLI, gh CLI, HWPX 브리지(`scripts/dev-hwpx-server.py`)
- **점검자:** Claude (Auto mode, 한국어 응답 모드, plan mode 후 ExitPlanMode 승인)
- **검증 흐름 그룹:** G1 (인터뷰 8단계) · G2 (로드맵 LLM·편집·FINAL·다운로드) · G3 (PBL 부분) · G4 (메시지·Realtime·알림벨) · G5 (sysadmin) · G6 (`/test-roadmap`·`/test-pbl`)
- **스크린샷 위치:** `docs/reports/screenshots/2026-04-29/` (총 **33장** — G1×6 / G2×14 / G3×4 / G4×4 / G5×3 / G6×2)
- **PR:** [#38](https://github.com/BaekKyunShin/KPC-AX-Roadmap-Dashboard/pull/38) — 브랜치 `chore/verify-deferred-2026-04-29`
- **LLM 실호출:** 2회 (시드기업B V1 로드맵 ~95초 / V2 로드맵 ~150초 — Anthropic Claude Sonnet)
- **다운로드 검증:** PDF (8페이지 · 750 KB · `%PDF-1.3` 매직), XLSX (75 KB · `PK\x03\x04` 매직), HWPX 로드맵 (408 KB · `application/hwp+zip` MIME · ZIP 구조 정상)
- **DB 직접 검증 쿼리:** `interviews`, `roadmap_versions`, `self_assessments`, `projects`, `messages` 등 (`docker exec supabase_db_ai-roadmap-dashboard psql -U postgres ...`)
- **임시 결함 노트:** `docs/reports/_findings-draft-20260429.md` (작업 중 누적 → 본 리포트에 통합 후 삭제)

### 환경 fallback 적용 사항 (재현 시 참고)

| 항목 | 시드 기본값 (`.env.test`) | 본 세션 fallback (`.env.local.audit-bak`) | 사유 |
|------|--------------------------|-------------------------------------------|------|
| `LLM_API_KEY` | `sk-proj-...` (OpenAI placeholder) | `sk-ant-api03-...` (Anthropic 실키) | Anthropic SDK 호출이라 OpenAI 키로는 인증 실패 |
| `HWPX_API_SECRET` | (미설정) | 64자 hex secret | HWPX 브리지 서버가 secret 미설정 시 다운로드 차단 |
| `projects.status` (시드기업B) | `ASSIGNED` (시드 기본) | `INTERVIEWED` (SQL UPDATE 우회) | 결함 #012로 status 자동 전환 안 됨 → LLM 호출 검증 진행 위한 일회성 수동 우회 |

### 사용자 결정 사항 (Plan mode AskUserQuestion)

| 결정 | 선택 |
|------|------|
| 분기 베이스 | origin/main (세션 #C 프롬프트 PR #37과 독립) |
| 인터뷰 데이터 시드 | 8단계 폼 직접 입력 (UI 동작 검증 포함) |
| LLM 응답 대기 정책 | 120초 + 진행 표시 정상 시 추가 60초 (총 180초 한도) |
| 멀티 계정 흐름 | son ↔ kpc 단일 컨텍스트 로그아웃·재로그인 (시간 절약 — 사용자 결정과 달리 두 BrowserContext는 미사용) |

---

## 부록 F — 세션 #B 데이터 잔재 (로컬 Supabase)

본 세션 동안 다음 데이터가 로컬 Supabase에 잔류했습니다. **운영 Supabase에는 어떤 변경도 없음** (`.env.local`은 모두 `127.0.0.1:54321`로 고정).

### DB 잔재

| 테이블 | 행 | 식별자 / 비고 |
|--------|----|---------------|
| `public.projects` | 2행 | `[AUDIT-20260429] NoInterviewCo` (UUID `cc6e0384-6d0d-4155-82a0-3293362cef35` · 결함 #002 가드 회귀 확인용) / `[AUDIT-20260429-PBL] PBL테스트사` (UUID `468dcb92-7d34-4149-95c3-ed58161e8e8f` · 결함 #013 PBL 시나리오 확인용) |
| `public.interviews` | 1행 | 시드기업B (project_id `bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb`) — V2 schema (`company_details.roadmap_overview` 등) |
| `public.self_assessments` | 2행 | 시드기업B + `[AUDIT-20260429-PBL]` — 자가진단 결함 우회용 (모든 답변 = 3) |
| `public.roadmap_versions` | 2행 | 시드기업B V1 (FINAL → 후속 V2 확정 시 ARCHIVED) / V2 (FINAL — 현재 활성) |
| `public.messages` | 2행 이상 | kpc → son `[AUDIT-20260429] 테스트 메시지 1` 외 |
| `public.notifications` | 4건 이상 | son(OPS_ADMIN) 알림 — 로드맵 초안 생성·확정 (V1·V2 각 2건) |
| `public.audit_logs` | 다수 | `INTERVIEW_CREATE`, `ROADMAP_CREATE`, `ROADMAP_FINALIZE` 등 |
| **수동 SQL UPDATE** | 1건 | 시드기업B `projects.status`: `ASSIGNED` → `INTERVIEWED` (결함 #012 회피용) |

### 정리 방법 (선택)

```bash
# 옵션 1 (권장) — 로컬 DB 통째로 리셋. 시드기업A·B 등 시드 데이터는 자동 재주입
npx supabase db reset

# 옵션 2 — 본 세션 잔재만 SQL로 정리
docker exec -i supabase_db_ai-roadmap-dashboard psql -U postgres -d postgres <<EOF
DELETE FROM public.projects WHERE company_name LIKE '[AUDIT-20260429%';
UPDATE public.projects SET status='ASSIGNED' WHERE id='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
DELETE FROM public.interviews WHERE project_id='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
DELETE FROM public.self_assessments WHERE submitted_by_email LIKE '%@audit.test';
DELETE FROM public.roadmap_versions WHERE project_id='bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
DELETE FROM public.messages WHERE content LIKE '[AUDIT-20260429]%';
EOF
```

### 환경 원복 (본 세션 이미 수행됨)

```bash
mv .env.local.audit-bak .env.local   # 운영 Supabase URL 복원 — 본 세션 종료 시 수행 완료
```

---

## 부록 G — 외부 file watcher 이슈 메모 (작업 중 발견)

본 세션 진행 중 `docs/reports/2026-04-28-system-audit.md` 파일이 Edit 직후 일정 확률로 `origin/main` 상태로 자동 reset되는 현상이 관찰됨. dev 서버(`npm run dev:with-hwpx`)와 HWPX 브리지(`npm run dev:hwpx`) 종료 후에는 reset이 멈췄음. 정확한 원인은 미확인이며 본 세션은 결함으로 분류하지 않음 (개발자 도구 동작이지 사용자 영향 없음). 향후 동일 증상 재현 시 다음 절차 권장:

1. dev 서버·HWPX 브리지 모두 종료 (`pkill -f "next dev" && pkill -f "dev-hwpx-server"`)
2. Edit 직후 즉시 `git add` + `git commit --amend --no-edit` (외부 reset이 발생할 시간 차단)
3. `git show HEAD:<file>`로 커밋 내용 검증 후 push
