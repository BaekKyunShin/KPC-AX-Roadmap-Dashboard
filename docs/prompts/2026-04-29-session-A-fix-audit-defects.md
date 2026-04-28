# 세션 #A — 1차 조사 결함 10건 수정

> **사용법**: 새 Claude Code 세션을 띄우고 **plan mode**로 진입한 뒤, 아래 "본문 프롬프트" 섹션을 그대로 복사해 첫 메시지로 전달.

## 사전 조건

- 사용자는 main 브랜치 그대로 새 세션을 띄웠음
- main에 1차 조사 리포트(1084205 커밋)가 이미 포함되어 있음
- **브랜치 생성·체크아웃은 본 세션의 클로드가 직접 수행한다** (아래 "Phase 0" 참조)

## 본문 프롬프트 (이하 그대로 복사)

---

KPC AI 훈련 로드맵 대시보드의 1차 전수 조사에서 발견된 결함 10건을 근본 원인까지 해결한 뒤, 같은 리포트 파일에 해결 표시를 누적해주세요. 새 세션이라 이전 대화 맥락이 없으니 아래 문서들을 먼저 읽어 컨텍스트를 확보해주세요.

## 시작 전 반드시 읽을 문서 (절대경로)

1. `/Users/baekkyunshin/Desktop/AI-roadmap-dashboard/docs/reports/2026-04-28-system-audit.md`
   — 결함 10건 상세, 메뉴 경로, 재현 단계, 스크린샷 링크. 본 작업의 입력.
2. `/Users/baekkyunshin/Desktop/AI-roadmap-dashboard/docs/prompts/2026-04-29-audit-followup-guide.md`
   — 후속 작업 진행 가이드. 리포트 관리 컨벤션·격리 정책 명시.
3. `/Users/baekkyunshin/Desktop/AI-roadmap-dashboard/CLAUDE.md`
   — 프로젝트 개요·명령어·아키텍처·역할 정의·커밋 규칙.
4. `/Users/baekkyunshin/Desktop/AI-roadmap-dashboard/docs/RLS.md`
   — Row-Level Security 정책. 결함 #001(audit logs) 진단의 핵심.
5. `/Users/baekkyunshin/Desktop/AI-roadmap-dashboard/docs/ARCHITECTURE.md`
   — 데이터 흐름·Server Action 패턴 참고.
6. memory/MEMORY.md + memory/reference_test_accounts.md (자동 로드됨)
   — 사용자 선호·테스트 계정. 특히 "근본 원인 해결 선호"·"환경 분리" 규칙 준수.

## 목표

리포트의 결함 10건(#001~#010)을 다음 우선순위로 처리:

### P1 — 차단성 결함 (반드시 해결)

- **#001 운영관리 > 감사로그 항상 "로그 없음"**
  - 1차 조사 단서: PROJECT_CREATE 로그가 `audit_logs` 테이블에는 정상 INSERT, 그러나 `/ops/audit` UI는 0건.
  - 진단 시작점: `src/app/(dashboard)/ops/audit/` 페이지·loader. RLS 정책 vs 쿼리 필터 vs 클라이언트 사용(server.ts vs admin.ts) 중 어디서 막히는지 확인.

- **#002 인터뷰 미완료 상태에서 "AI 로드맵 생성" 클릭 시 silent fail**
  - 1차 조사 단서: POST 75ms로 즉시 200 OK 반환, DB·UI·콘솔 변화 없음. 토스트도 없음.
  - 진단 시작점: 로드맵 생성 Server Action에서 인터뷰 데이터 부재 시 early return하지만 사용자 피드백을 반환하지 않는 것으로 추정.
  - 해결 방향(둘 중 하나, 또는 둘 다):
    - ① 인터뷰 미완료 상태에서 버튼 비활성화 + 안내 문구
    - ② 클릭 시 "인터뷰 입력을 먼저 완료해주세요" 토스트 + 인터뷰 페이지로 이동 CTA

### P2 — 오해 유발 (해결 권장)

- **#003 사용자 관리에 OPS_ADMIN/SYSTEM_ADMIN 본인 미표시**
- **#004 회원가입 Step 1만 완료해도 USER_PENDING 사용자 잔재**
- **#005 자가진단 무효 토큰 → 일반 404 (도메인 안내 없음)**

### P3 — 시각·문구 (시간 허락 시 모두)

- **#006~#010** 이메일 줄바꿈, 빈 상태 다운로드 활성, 데모 캐러셀 자동 회전, fullPage 헤더 중복, USER_PENDING 헤더 아이콘 노출

## 진행 원칙

- **TDD 적용** — 결함마다 실패 테스트(Vitest 또는 Playwright) 작성 → 코드 수정 → 통과 → 리팩터링. 일회성/설정·생성 코드는 예외.
- **임시 우회 금지** — 사용자는 근본 원인 해결을 강하게 선호 (메모: feedback_root_cause_preference). 임시 fallback·skip 금지.
- **작업 완료 전** `superpowers:verification-before-completion` 호출 필수.
- **Skill·MCP 적극 활용**:
  - `superpowers:systematic-debugging` — 결함 진단 시
  - `superpowers:test-driven-development` — 모든 코드 수정 전
  - `superpowers:writing-plans` — Plan mode 단계
  - `superpowers:requesting-code-review` — 작업 완료 시 자기 리뷰
  - `check-server-action` — `actions.ts` 수정 시 5단계 패턴 검증
  - `supabase-dev` — SQL/RLS/마이그레이션 작성 시
  - `frontend-guide` — UI 수정 시
  - `refactoring` — 정리 시
  - `react-best-practices` — React/Next.js 컴포넌트 수정 시
  - `web-design-guidelines` — UI 결함(#006~#010) 검수 시
- **DB 마이그레이션 작성 시** — `supabase/migrations/NNN_*.sql` 작성 후 `mcp__supabase__apply_migration`까지 원자적 완료. `mcp__supabase__list_migrations`로 검증.
- **운영 Supabase 절대 건드리지 말 것**. 작업은 로컬 인스턴스(`http://127.0.0.1:54321`)에서만.
- **데이터 격리** — 새로 생성하는 모든 엔티티에 `[AUDIT-20260429]` 프리픽스 부여.

## Phase 0 — 브랜치 분기 (Plan 작성 전 자동 수행)

새 세션 시작 시 클로드가 다음을 차례로 수행:

1. 작업 디렉토리 확인: `/Users/baekkyunshin/Desktop/AI-roadmap-dashboard`
2. 현재 브랜치 확인: `git branch --show-current` → `main`이어야 함. 다른 브랜치라면 사용자에게 보고 후 진행 여부 확인.
3. 작업 트리 깨끗한지 확인: `git status --short`. uncommitted 변경이 있다면 사용자에게 보고 후 진행 방법 확인 (stash · 커밋 · 무시).
4. main 최신 동기화: `git fetch origin && git status -uno`로 origin/main 대비 ahead/behind 확인. behind라면 `git pull --ff-only origin main`. ahead라면 (1차 리포트 커밋이 push 안 된 상태) 그대로 진행.
5. 1차 조사 리포트 존재 확인: `docs/reports/2026-04-28-system-audit.md`가 main에 포함됐는지 `git log --oneline | head -5`. 1084205 커밋(또는 동일 내용)이 있어야 함.
6. 새 브랜치 생성·체크아웃: `git checkout -b fix/audit-defects-2026-04-29`. 동명 브랜치가 이미 존재하면 사용자에게 보고 후 결정(이어서 작업 vs 다른 이름).

위 6단계가 모두 정상이면 Phase 1로 진행.

## 환경 셋업

Phase 0 직후, Plan 단계 진입 전에 1회 실행:

1. Docker Desktop 실행 여부 사용자에게 확인 (메모리 규칙: feedback_docker_announce)
2. `npx supabase start`
3. `npx supabase db reset` (시드 재주입 — son/kpc/sysadmin 모두 비번 `test1234!`)
4. `cp .env.local .env.local.audit-bak && cp .env.test .env.local` (로컬 URL로 분기, 작업 끝나면 원복)
5. `npm run dev` (포트 3000, 백그라운드)
6. `son@test.com` / `test1234!`로 로그인 동작 확인 (API 테스트 또는 Playwright)

## 산출물 (반드시 생성)

1. **코드 수정** — 결함당 별도 커밋. 커밋 메시지는 한국어 + `fix:` 타입.
2. **테스트** — 결함별 단위/통합/E2E 테스트. 회귀 방지.
3. **리포트 갱신** — `docs/reports/2026-04-28-system-audit.md`의 같은 파일에:
   - 각 해결된 결함의 상태 `🔴 OPEN` → `🟢 RESOLVED` 변경
   - 결함 항목 끝에 추가:
     ```
     - **해결 정보**: PR #NN · 커밋 abc1234 · 2026-04-29 · 검증자: 자동 테스트 + 수동 확인
     ```
   - 본문 상단 "변경 이력" 표에 한 줄:
     ```
     | 2026-04-29 | 결함 수정 (세션 #A) | PR #NN | RESOLVED: #001, #002, ... |
     ```
   - "결함 한눈에 보기" 표의 등급/상태 컬럼 갱신
4. **PR 생성** (제목: `fix: 1차 시스템 조사 결함 N건 해결`)
5. `npm run validate && npm run build` 통과 확인 후 PR push

## 진행 단계

### Phase 1 — Plan 작성 (Phase 0 + 환경 셋업 직후)

- 결함 10건 각각에 대해:
  - 원인 가설 (1차 단서 기반)
  - 진단 명령어/검증 단계
  - 해결 방향
  - 영향 받는 파일
  - 검증 테스트
- 각 결함을 1순위/2순위/3순위로 분류 (P 등급 + 의존성 고려)
- 사용자 승인 (`ExitPlanMode`)

### Phase 2 — 결함 해결

- P1 → P2 → P3 순서. 각 결함마다 TDD 사이클.
- 각 결함 완료 시 리포트 갱신 (✓ 누적).

### Phase 6 — 통합 검증

- `npm run validate && npm run build` 통과
- E2E 테스트 통과
- 1차 조사에서 정상 동작했던 흐름들 회귀 없음 확인 (예: 회원가입·승인·프로젝트 생성)

### Phase 7 — PR 생성

- 작업 종료 시 `.env.local` 원복 + AUDIT 데이터 정리(`supabase db reset`)
- 브랜치 push: `git push -u origin fix/audit-defects-2026-04-29`
- `gh pr create`로 PR 생성. 제목 `fix: 1차 시스템 조사 결함 N건 해결`. 본문에 해결한 결함 번호·검증 방법·CI 통과 여부 정리
- PR URL을 사용자에게 보고

## 작업 종료 시 보고

다음 세 가지로 분리해 사용자에게 보고:

- ✅ **해결한 결함** — 결함 번호 + PR/커밋 + 검증 결과
- ⚠️ **보류한 결함** — 결함 번호 + 보류 사유 + 다음 세션 권장 사항 (리포트는 🔴 OPEN 유지하되 "보류 사유" 행 추가)
- 🆕 **추가 발견 결함** — #011~ 신규 번호로 리포트에 OPEN 추가

## 금지 사항

- 운영 Supabase에 쓰기 (`.env.local`이 운영 URL을 가리키는지 항상 확인)
- 강제 푸시(`--force`) 금지
- `--no-verify` 등 hooks 우회 금지
- 같은 리포트 파일에 동시 쓰기 (세션 #B는 #A 머지 후에 시작)
- 가입자 잔재 결함(#004) 해결 시 기존 시드 사용자(`son/kpc/sysadmin`) 영향 주지 말 것
