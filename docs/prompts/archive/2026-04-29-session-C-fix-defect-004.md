# 세션 #C — 결함 #004 회원가입 Step 1 잔재 USER_PENDING 본격 해결

> **사용법**: 새 Claude Code 세션을 띄우고 **plan mode**로 진입한 뒤, 아래 "본문 프롬프트" 섹션을 그대로 복사해 첫 메시지로 전달.

## 사전 조건

- **세션 #A의 PR (PR #36) 이 main에 머지 완료** — 이미 머지됨 (2026-04-28T15:20:16Z, squash commit `13250b6`)
- 세션 #B (이월 검증) 와는 독립적으로 시작 가능 — 두 세션은 다른 영역을 다룸
- 사용자는 main 브랜치 그대로 새 세션을 띄웠음
- **main 동기화·브랜치 생성·환경 셋업은 본 세션의 클로드가 직접 수행한다** (아래 "Phase 0" 참조)

## 본문 프롬프트 (이하 그대로 복사)

---

KPC AI 훈련 로드맵 대시보드의 1차 전수 조사 결함 중 세션 #A에서 보류한 **#004 회원가입 Step 1 만 완료해도 USER_PENDING 사용자 잔재** 결함을 본격 해결해주세요. 새 세션이라 이전 대화 맥락이 없으니 아래 문서들을 먼저 읽어 컨텍스트를 확보해주세요.

## 시작 전 반드시 읽을 문서 (절대경로)

1. `/Users/baekkyunshin/Desktop/AI-roadmap-dashboard/docs/reports/2026-04-28-system-audit.md`
   — 1차 조사 리포트. **#004 결함 본문**(현재 🔴 OPEN 유지) 과 그 끝의 **"보류 사유" 행** 이 본 작업의 입력. 다른 결함 #001~#010 은 세션 #A 에서 RESOLVED 상태.
2. `/Users/baekkyunshin/Desktop/AI-roadmap-dashboard/docs/prompts/2026-04-29-audit-followup-guide.md`
   — 후속 작업 진행 가이드. 리포트 관리 컨벤션·격리 정책 명시.
3. `/Users/baekkyunshin/Desktop/AI-roadmap-dashboard/CLAUDE.md`
   — 프로젝트 개요·명령어·역할 정의·커밋 규칙·Server Action 5단계 패턴.
4. `/Users/baekkyunshin/Desktop/AI-roadmap-dashboard/docs/RLS.md`
   — Row-Level Security 정책. `users` 테이블·`consultant_profiles` 테이블 정책 검토에 필수.
5. `/Users/baekkyunshin/Desktop/AI-roadmap-dashboard/docs/ARCHITECTURE.md`
   — 회원가입/승인 플로우 (라인 203~215) 와 Server Actions 패턴.
6. **현재 회원가입 코드** — `src/app/(auth)/register/page.tsx` + `src/app/(auth)/actions/auth.ts` (`registerUser()` 함수)
7. memory/MEMORY.md + memory/reference_test_accounts.md (자동 로드됨)

## 결함 요약 (1차 조사 + 세션 #A 보류 사유)

**결함**: `/register` Step 1 (기본 정보) 제출 시점에 이미 `auth.users` + `public.users(role=USER_PENDING)` 레코드가 즉시 INSERT. Step 2 (컨설턴트 프로필) 미완료로 이탈하면 `consultant_profiles` 정보가 없는 미완성 USER_PENDING 사용자가 DB에 잔재.

**영향**:
- 운영관리자가 사용자 승인 검토 시 프로필 정보 부재 케이스 발생
- 가입 도중 이탈한 사용자를 자동 정리할 방법 없음
- 시간이 지날수록 좀비 사용자가 누적되어 운영관리 화면 노이즈 증가

**보류 사유 (세션 #A — 2026-04-29)**: 회원가입 트랜잭션 분리는 Supabase Auth 의 `signUp()` 이 Step 1 시점에 인증 사용자를 만들어야 하는 구조적 제약 때문에 본격적인 리팩터링이 필요. 세션 #A 는 1차 조사 결함 표면 정리(9건) 에 집중했으므로 본 세션에서 패키지로 본격 해결.

## 권장 해결 방향 (세션 #A에서 제안)

세션 #A 가이드라인에 따라 **두 가지 접근** 중 선택 가능:

### 옵션 A — 단계적 패키지 (권장, 점진적·저위험)

1. **마이그레이션**: `users.profile_completed BOOLEAN NOT NULL DEFAULT FALSE` 컬럼 추가
2. **Server Action 갱신**:
   - Step 1 (`registerUser`): `users` INSERT 시 `profile_completed=false` (현재 동작 유지 + 컬럼만 set)
   - Step 2 (`createConsultantProfile` 등): `consultant_profiles` INSERT 후 `users.profile_completed=true` 로 UPDATE
3. **운영관리자 화면 필터**: `/ops/users/page.tsx` 의 기본 필터에서 `profile_completed=false` 행 제외 (단, 토글로 "미완성 가입자 보기" 옵션 제공)
4. **야간 cleanup cron** (선택): `created_at > 1d AND profile_completed = false` 사용자 삭제. Vercel Cron 또는 Supabase Edge Function. **이 단계는 다른 세션으로 분리 가능**.

### 옵션 B — 본격 트랜잭션 통합 (대규모 리팩터링, 고위험)

1. 회원가입 폼을 **단일 페이지**로 통합 (Step 1·Step 2 동일 화면, 클라이언트 state 로 관리)
2. 폼 제출 시 한 번에 `signUp` + `users INSERT` + `consultant_profiles INSERT` 단일 트랜잭션 (또는 Supabase Auth Hook 활용)
3. 사용자 UX 변경 — Step 분리의 장점 (기본 정보 입력 후 진행률 인지) 손실 가능
4. 회원가입 E2E 시나리오 다수 갱신 필요

**기본 권장**: **옵션 A**. UX 변경 없이 데이터 정합성 확보 + 운영관리 노이즈 즉시 제거. 옵션 B 는 별도 UX 개선 세션으로 분리.

본 세션은 **사용자 승인 후 옵션 A** 를 진행. 옵션 B 를 원하시면 plan mode 에서 의논 후 결정.

## 진행 원칙

- **TDD 적용** — 결함 수정 전 실패 테스트 작성 → 코드 수정 → 통과 → 리팩터링. 일회성/설정·생성 코드는 예외.
- **임시 우회 금지** — 사용자는 근본 원인 해결을 강하게 선호 (메모: feedback_root_cause_preference). 임시 fallback·skip 금지.
- **작업 완료 전** `superpowers:verification-before-completion` 호출 필수.
- **Skill·MCP 적극 활용**:
  - `superpowers:systematic-debugging` — 결함 진단·검증 시
  - `superpowers:test-driven-development` — 모든 코드 수정 전
  - `superpowers:writing-plans` — Plan mode 단계
  - `superpowers:requesting-code-review` — 작업 완료 시 자기 리뷰
  - `check-server-action` — `actions.ts` 수정 시 5단계 패턴 검증
  - `supabase-dev` — `users.profile_completed` 마이그레이션 작성 시
  - `frontend-guide` — 운영관리자 화면 필터 UI 수정 시
  - `react-best-practices` — 회원가입 폼 React 코드 수정 시
- **DB 마이그레이션 작성 시** — `supabase/migrations/NNN_*.sql` 작성 후 `mcp__supabase__apply_migration` 까지 원자적 완료. `mcp__supabase__list_migrations` 로 검증.
- **운영 Supabase 절대 건드리지 말 것**. 작업은 로컬 인스턴스(`http://127.0.0.1:54321`) 에서만.
- **데이터 격리** — 새로 생성하는 모든 테스트 엔티티에 `[AUDIT-#004-20260429]` 같은 프리픽스.

## Phase 0 — 브랜치 분기 (Plan 작성 전 자동 수행)

새 세션 시작 시 클로드가 다음을 차례로 수행:

1. 작업 디렉토리 확인: `/Users/baekkyunshin/Desktop/AI-roadmap-dashboard`
2. 현재 브랜치 확인: `git branch --show-current` → `main` 이어야 함
3. main 최신 동기화: `git fetch origin && git pull --ff-only origin main`. 분기 상태이면 사용자에게 보고 후 결정 (옵션: `git reset --hard origin/main` — main 의 origin 만 신뢰. 또는 stash 후 진행).
4. 작업 트리 깨끗한지 확인: `git status --short`. uncommitted 변경 있다면 사용자에게 보고.
5. 세션 #A PR (#36) 머지 확인: `git log --oneline | head -10` 에 `13250b6` (또는 squash 커밋 메시지 `fix: 1차 시스템 조사 결함 9건 해결 (보류 1건) (#36)`) 가 있어야 함.
6. 신규 브랜치 생성·체크아웃: `git checkout -b fix/audit-defect-004-2026-04-29`. 동명 브랜치 이미 존재 시 사용자에게 보고 후 결정.

## 환경 셋업

Phase 0 직후, Plan 단계 진입 전에 1회 실행:

1. Docker Desktop 실행 여부 사용자에게 확인 (메모리 규칙: feedback_docker_announce)
2. `npx supabase start`
3. `npx supabase db reset` (시드 재주입)
4. `cp .env.local .env.local.audit-bak && cp .env.test .env.local` (로컬 URL 분기, 작업 끝나면 원복)
5. `npm run dev` (포트 3000, 백그라운드)
6. `son@test.com` / `test1234!` 로 로그인 동작 확인

## 산출물 (반드시 생성)

1. **마이그레이션** — `supabase/migrations/NNN_add_users_profile_completed.sql` (옵션 A 의 경우)
2. **코드 수정** — `registerUser` (Step 1) + `createConsultantProfile` (Step 2) + `/ops/users/page.tsx` 갱신
3. **테스트** — 단위 테스트 (Vitest, `auth.test.ts` · `register/page.test.tsx`) + E2E (`tests/e2e/register-step1-only-leaves-incomplete.spec.ts` 등)
4. **리포트 갱신** — `docs/reports/2026-04-28-system-audit.md` 의:
   - #004 상태 라벨 `[🔴 OPEN]` → `[🟢 RESOLVED]`
   - 결함 한눈에 보기 표 갱신
   - 결함 본문 끝에 해결 정보 + 상태 변경 행 추가
   - 변경 이력 표에 한 줄 추가:
     ```
     | 2026-04-29 | #004 본격 해결 (세션 #C) | PR #(번호) | RESOLVED: #004 |
     ```
5. **PR 생성** — 제목: `fix: 회원가입 Step 1 잔재 USER_PENDING 사용자 정리 (#004)`
6. `npm run validate && npm run build` 통과 + PR push

## 진행 단계

### Phase 1 — Plan 작성 (Phase 0 + 환경 셋업 직후)

- 옵션 A 단계적 패키지 적용 가능 여부 (사용자에게 옵션 A vs B 확인)
- 마이그 SQL 초안
- Server Action 변경 위치 정확히 명시
- `/ops/users/page.tsx` 필터 UX (기본 숨김 + 토글 "미완성 가입자 포함")
- 야간 cleanup cron 도입 여부 결정 (본 세션 포함 vs 별도 세션 분리)
- 사용자 승인 (`ExitPlanMode`)

### Phase 2 — 결함 해결

- 마이그레이션 작성 → `mcp__supabase__apply_migration` 적용 → `list_migrations` 검증
- TDD 사이클: 실패 테스트 → 코드 수정 → 통과 → 리팩터링
- 운영관리자 필터 UI 수정 + UX 검증

### Phase 3 — 통합 검증

- `npm run validate && npm run build` 통과
- E2E 테스트 통과
- 1차 조사·세션 #A 에서 정상 동작했던 흐름 회귀 없음 확인 (특히 `/ops/users` 본인 표시 (#003), 회원가입 정상 흐름)

### Phase 4 — PR 생성

- 작업 종료 시 `.env.local` 원복 + AUDIT 데이터 정리(`supabase db reset`)
- 브랜치 push: `git push -u origin fix/audit-defect-004-2026-04-29`
- `gh pr create` 로 PR 생성. 제목 `fix: 회원가입 Step 1 잔재 USER_PENDING 사용자 정리 (#004)`. 본문에 해결 패키지·검증 방법·CI 결과 정리
- PR URL 사용자에게 보고

## 작업 종료 시 보고

- ✅ **해결한 결함** — #004 + PR/커밋 + 검증 결과
- ⚠️ **추가 발견 결함** — #011~ 신규 번호로 리포트에 OPEN 추가 (있다면)
- 📦 **별도 세션 권장 작업** — 야간 cleanup cron, 옵션 B (UX 통합) 등 본 세션에서 분리한 작업

## 금지 사항

- 운영 Supabase 에 쓰기 (`.env.local` 이 운영 URL 을 가리키는지 항상 확인)
- 강제 푸시(`--force`) 금지
- `--no-verify` 등 hooks 우회 금지
- 같은 리포트 파일에 동시 쓰기 (다른 세션이 진행 중이면 머지 후 시작)
- 기존 시드 사용자(`son/kpc/sysadmin`) 영향 주지 말 것 — 본 결함은 신규 가입자 처리에 한정
- **이미 가입한 USER_PENDING 사용자 데이터를 임의 삭제 금지** — 새 컬럼은 default false 로 적용하되, 기존 사용자는 manually `profile_completed=true` 로 backfill (`consultant_profiles` 가 있는 경우) 후 적용

---

## 부록: 세션 #C 와 다른 세션의 관계

| 세션 | 상태 | 다루는 영역 |
|------|------|-----------|
| #A `fix/audit-defects-2026-04-29` | ✅ 완료 (PR #36 머지) | 결함 #001 #002 #003 #005 #006 #007 #008 #009 #010 |
| #B `chore/verify-deferred-2026-04-29` | ⏳ 시작 가능 | 1차 부록 A 의 ⬜ 이월 항목 (LLM 호출·HWPX·메시지 Realtime 등) — 신규 결함 #011~ 추가 |
| #C `fix/audit-defect-004-2026-04-29` | ⏳ 시작 가능 | 결함 #004 회원가입 트랜잭션 패키지 |

**세션 #B 와 #C 동시 진행 가능?** — 가능. 두 세션은 별도 브랜치·별도 작업 영역. 단 둘 다 같은 리포트 파일을 갱신하므로 PR 머지 순서는 머지하는 측이 마지막에 main 동기화 + conflict 해결.

권장 순서: **#C → #B 또는 #B → #C 모두 가능**. 사용자 결정.
