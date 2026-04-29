# 세션 #D — silent fail 결함 3건(#011·#012·#013) 본격 해결

> **사용법**: 새 Claude Code 세션을 띄우고 **plan mode**로 진입한 뒤, 아래 "본문 프롬프트" 섹션을 그대로 복사해 첫 메시지로 전달.

## 사전 조건

- 세션 #A PR (#36 — 1차 조사 결함 9건 해결) **머지 완료** (squash commit `13250b6`, 2026-04-28)
- 세션 #B PR (#38 — 이월 검증 + #011~#013 발견·기록) **머지 완료** (squash commit `9068e9e`, 2026-04-29)
- 세션 #C PR (#39 — #004 회원가입 잔재 해결) **머지 완료** (squash commit `0f4d352`, 2026-04-29)
- 즉 **본 세션이 시작될 때 main 에는 1차 조사 결함 중 #001~#010 + #004 모두 RESOLVED**, 남은 OPEN 은 silent fail 3건(#011·#012·#013)뿐
- 사용자는 main 브랜치 그대로 새 세션을 띄움
- **main 동기화·브랜치 생성·환경 셋업은 본 세션의 클로드가 직접 수행한다** (아래 "Phase 0" 참조)

## 본문 프롬프트 (이하 그대로 복사)

---

KPC AI 훈련 로드맵 대시보드의 **이월 검증(세션 #B)에서 발견된 silent fail 3건** 을 근본 원인까지 해결해주세요. 세 결함은 모두 **사용자 클릭 → 시스템 응답 0** 패턴으로, 1차 조사 결함 #002 와 같은 계열입니다. 새 세션이라 이전 대화 맥락이 없으니 아래 문서들을 먼저 읽어 컨텍스트를 확보해주세요.

## 시작 전 반드시 읽을 문서 (절대경로)

1. `/Users/baekkyunshin/Desktop/AI-roadmap-dashboard/docs/reports/2026-04-28-system-audit.md`
   — 누적 갱신 리포트. **본 세션의 입력**: 결함 한눈에 보기 표의 #011~#013 + 본문 "세션 #B 신규 결함" 절(라인 ~257~) + "세션 #B 검증 산출물 요약"(라인 ~328~) + 부록 E (세션 #B 환경 fallback) + 부록 F (잔재 SQL). 세션 #A·#B·#C 의 RESOLVED 정보도 함께 검토.
2. `/Users/baekkyunshin/Desktop/AI-roadmap-dashboard/docs/prompts/2026-04-29-audit-followup-guide.md`
   — 후속 작업 진행 가이드. 리포트 관리 컨벤션 (🔴 OPEN → 🟢 RESOLVED 라벨 갱신)·격리 정책 명시.
3. `/Users/baekkyunshin/Desktop/AI-roadmap-dashboard/docs/prompts/2026-04-29-session-A-fix-audit-defects.md`
   — 세션 #A 가이드. 결함 #002 silent fail 해결 패턴(EmptyState 가드 + 버튼 disabled 이중 가드)이 본 세션의 직접적 참조점.
4. `/Users/baekkyunshin/Desktop/AI-roadmap-dashboard/CLAUDE.md`
   — 프로젝트 개요·명령어·역할 정의·커밋 규칙·**Server Action 5단계 패턴**(세션 확인 → 역할 권한 검사 → Zod 검증 → 비즈니스 로직 → ActionResult 반환)·PR CI 통과 판정 규칙(E2E 까지 모든 check pass 확인 필수).
5. `/Users/baekkyunshin/Desktop/AI-roadmap-dashboard/docs/ARCHITECTURE.md`
   — Server Actions 패턴·Supabase 클라이언트 4종 분리(client/server/admin/middleware).
6. `/Users/baekkyunshin/Desktop/AI-roadmap-dashboard/src/lib/types/action-result.ts`
   — `ActionResult<T>` 타입 정의. 클라이언트 측 응답 처리 헬퍼 패턴 도입의 출발점.
7. **현재 코드 진단 시작점** (본 세션이 직접 분석):
   - `src/app/(dashboard)/consultant/projects/[id]/interview/actions.ts` — `saveRoadmapInterviewV2` (라인 988~1111), `submitRoadmapInterviewV2` (라인 1117~), `savePBLInterviewV2`, `submitPBLInterviewV2`
   - `src/app/(dashboard)/consultant/projects/[id]/interview/_components/` — 자동저장 hook + Client 컴포넌트 (#011, #012)
   - `src/app/(dashboard)/consultant/projects/[id]/roadmap/actions.ts` — `createRoadmap` (라인 71~142, 결함 #002 fix 의 Server Action 면), `confirmFinalRoadmap` 등
   - `src/app/(dashboard)/consultant/projects/[id]/roadmap/_components/RoadmapResultClient.tsx` — #002 fix 가 적용된 클라이언트, #013 추가 가드가 들어갈 위치
   - `src/app/(dashboard)/consultant/projects/[id]/pbl/_components/` — PBL 클라이언트 (#013 PBL 시나리오)
   - `src/lib/schemas/interview-roadmap.ts` — `RoadmapInterviewSchema`, `RoadmapInterviewStrictSchema` (#011·#012 검증 분기 분석에 필수)
8. memory/MEMORY.md + memory/reference_test_accounts.md (자동 로드됨)
   — 사용자 선호("근본 원인 해결 선호"·임시 우회 금지)·테스트 계정·환경 분리 규칙

## 결함 요약 (세션 #B 발견 + 본 세션 입력)

### #011 [P2] [🔴 OPEN] 인터뷰 자동저장 상태 라벨이 영구 "저장 실패"로 고착

- **현상**: 인터뷰 페이지 진입부터 8단계 끝까지 하단 상태 라벨이 항상 **"저장 실패"** 표시. POST `/consultant/projects/[id]/interview` 응답은 모두 200 OK 이고 DB(`public.interviews`)에는 V2 schema 데이터(`company_details.roadmap_overview` 등)가 정상 저장됨. UI 라벨만 영구 고착.
- **세션 #B 추정 원인**: 자동저장 partial schema 검증(`RoadmapInterviewSchema.partial()`) 의 일부 분기에서 `success: false` 반환하지만 별도 path 에서 DB INSERT/UPDATE 정상 실행. 또는 클라이언트 자동저장 hook 이 ActionResult 응답을 잘못 해석.
- **본 세션 진단 의무**: 위 추정이 정확한지 코드 직접 분석으로 확정. 분기 트리거 조건과 영구 고착 메커니즘을 한 줄로 설명 가능해야 함.

### #012 [P1] [🔴 OPEN] 인터뷰 "최종 제출" 클릭 시 silent fail — DB·status 전환 없음

- **현상**: Step 1~8 모두 입력 후 "최종 제출" 클릭 시 화면 변화 0, 토스트 0, DB `interviews.updated_at` 갱신 X, `projects.status` `ASSIGNED` 그대로 (`INTERVIEWED` 전환 X), 콘솔 에러 0, 추가 POST 흔적 없음.
- **세션 #B 추정 원인**: Step 8 strict schema 검증(`RoadmapInterviewStrictSchema`) 실패 시 클라이언트가 에러 토스트로 변환 못 함. 또는 "최종 제출" 버튼이 실제 submit handler 에 wired 안 됨.
- **연쇄 효과**: 결함 #013 과 결합 시 dead-end — 인터뷰 status 전환 안 됨 → 로드맵 생성도 막힘 → 사용자가 무한 클릭.

### #013 [P1] [🔴 OPEN] 로드맵·PBL 생성 Server Action 실패 시 클라이언트 silent fail (토스트 부재)

- **현상 (시나리오 A — 로드맵)**: status `ASSIGNED`이거나 자가진단 결과 없는 프로젝트에서 "AI 로드맵 생성" 클릭 시 POST 200 OK + 60~95ms (LLM 호출 시작도 안 됨), 화면 변화 0, 토스트 0, 버튼 다시 활성화 → 사용자 무한 재시도.
- **현상 (시나리오 B — PBL)**: 인터뷰 9단계 미완료 PBL 트랙에서 "새 버전 생성" → "생성 시작" 클릭 시 동일 패턴.
- **서버 로그 증거 (시나리오 A)**:
  ```
  [createRoadmap Error] Error: 자가진단 결과가 없습니다.
      at generateRoadmap (src/lib/services/roadmap/roadmap-generator.ts:285:11)
      at async createRoadmap (src/app/(dashboard)/consultant/projects/[id]/roadmap/actions.ts:108:49)
  POST /consultant/projects/[id]/roadmap 200 in 241ms
  ```
- **세션 #B 추정 원인**: `createRoadmap` / `createPblReport` Server Action 의 사전 검증 실패 응답을 각 클라이언트 컴포넌트(`RoadmapResultClient`, `PblReportClient`)가 토스트로 변환 못 함. **결함 #002 fix(인터뷰 부재 가드)가 status·자가진단 검증까지는 커버 X**.

## 권장 해결 방향

세 결함 모두 **클라이언트 ↔ Server Action ActionResult 응답 처리 동기화 버그** 라는 동일 패턴이라 한 세션에서 함께 처리하는 것이 효율적. 다만 영향 범위가 다르므로 단계적 접근 권장.

### 옵션 A — 결함별 직접 수정 (권장, 저위험·점진적)

각 결함의 클라이언트 컴포넌트에서 직접 가드·토스트를 추가. 1차 조사 결함 #002 fix 의 패턴을 그대로 답습:

1. **#011 (자동저장 라벨)**:
   - 자동저장 hook 의 `success: false` 분기에서 라벨을 어떻게 갱신하는지 코드 분석
   - DB 가 실제 저장된 경우(별도 path)에도 라벨이 "실패" 로 가는 분기를 찾아 제거 또는 보정
   - **핵심 단서**: HTTP 200 + DB 저장 성공 + UI 라벨 "실패" 의 3가지가 동시에 성립하는 path 가 정확히 어디인지 진단 필요

2. **#012 (최종 제출 silent fail)**:
   - `submitRoadmapInterviewV2` 호출 분기에서 strict schema 검증 실패 시 어떤 응답이 오는지 확인
   - 클라이언트의 "최종 제출" handler 에 명시적 try/catch + Sonner 토스트 추가
   - status 전환 성공 시 결과 페이지로 라우팅 추가 (현재는 stay)

3. **#013 (로드맵·PBL 생성 silent fail)**:
   - `RoadmapResultClient` 의 onGenerate handler 에 `result.success === false` 분기 + Sonner 토스트
   - 동일 패턴을 `PblReportClient` 에 적용
   - 결함 #002 fix(EmptyState + disabled 가드)는 인터뷰 부재만 커버 — 추가로 status·자가진단 부재도 사전 가드 (가능하면 server-side 에서 props 로 전달)

### 옵션 B — Reusable 헬퍼 도입 (권장, 같은 패턴 재발 방지)

옵션 A 와 함께 진행 가능. 신규 헬퍼:

```ts
// src/lib/utils/action-result-toast.ts
import { toast } from 'sonner';
import type { ActionResult } from '@/lib/types/action-result';

export function handleActionResult<T>(
  result: ActionResult<T>,
  options: {
    successMessage?: string;
    errorFallback: string;  // result.error 가 빈 경우 fallback
    onSuccess?: (data: T) => void;
  },
): boolean {
  if (result.success) {
    if (options.successMessage) toast.success(options.successMessage);
    options.onSuccess?.(result.data);
    return true;
  }
  toast.error(result.error ?? options.errorFallback);
  return false;
}
```

세 결함의 클라이언트 컴포넌트에서 이 헬퍼를 일괄 사용하면 silent fail 패턴이 구조적으로 차단됨. 단, 헬퍼 도입은 다른 클라이언트 컴포넌트(예: 매칭, 자가진단)에도 점진 확산이 필요해 본 세션은 **세 결함 영역만 도입**하고, 전사 확산은 별도 리팩터링 세션으로 분리.

**기본 권장**: **옵션 A + 옵션 B 병행** — 결함 직접 수정하면서 헬퍼 도입까지. UX 변경 없이 silent fail 만 차단. 사용자 승인 후 진행.

## 진행 원칙

- **TDD 적용** — 결함마다 실패 테스트 작성 → 코드 수정 → 통과 → 리팩터링. 일회성/설정·생성 코드는 예외.
- **임시 우회 금지** — 사용자는 근본 원인 해결을 강하게 선호 (메모: feedback_root_cause_preference). 임시 fallback·skip 금지. **세션 #B 의 status SQL UPDATE 우회 같은 fallback 은 결함 자체 fix 후엔 불필요**.
- **작업 완료 전** `superpowers:verification-before-completion` 호출 필수.
- **Skill·MCP 적극 활용**:
  - `superpowers:writing-plans` — Plan mode 단계
  - `superpowers:systematic-debugging` — 결함 진단·근본 원인 확정 (#011 의 영구 고착 메커니즘 분석에 특히 유용)
  - `superpowers:test-driven-development` — 모든 코드 수정 전
  - `superpowers:requesting-code-review` — 작업 완료 시 자기 리뷰
  - `superpowers:receiving-code-review` — 코드 리뷰 피드백 수용 시
  - `check-server-action` — `actions.ts` 수정 시 5단계 패턴 검증
  - `react-best-practices` — 클라이언트 컴포넌트(`RoadmapResultClient`, `PblReportClient`, 인터뷰 hook) 수정 시
  - `composition-patterns` — `handleActionResult` 헬퍼 도입 시 (옵션 B)
  - `frontend-guide` — 토스트·가드 UI 추가 시 디자인 톤 일관성
  - `web-design-guidelines` — 사용자 피드백·접근성 검수 시
  - `refactoring` — 헬퍼 도입 후 클라이언트 정리 단계
  - **Playwright MCP** (`mcp__plugin_playwright_playwright__*`) — Phase 5 통합 회귀 검증에서 세션 #B 와 동일 흐름 재현 + 토스트·라벨·status 전환 확인 (필수)
  - **Supabase MCP** (`mcp__supabase__*`) — 로컬 DB 직접 검증·마이그레이션 적용 (필요 시)
- **운영 Supabase 절대 건드리지 말 것**. 작업은 로컬 인스턴스(`http://127.0.0.1:54321`) 에서만.
- **데이터 격리** — 새로 생성하는 테스트 엔티티에 `[AUDIT-#011-013-20260429]` 같은 프리픽스.
- **세션 #B 환경 fallback 인지** — `.env.test` 의 `LLM_API_KEY` 가 OpenAI placeholder, `HWPX_API_SECRET` 미설정. 본 세션 #013 검증 시 LLM 실호출이 필요하면 운영 백업(`.env.local.audit-bak` 의 `sk-ant-...` + HWPX_API_SECRET)을 fallback. **다만 #011, #012 는 LLM 미사용이라 fallback 불필요**.

## Phase 0 — 브랜치 분기 (Plan 작성 전 자동 수행)

새 세션 시작 시 클로드가 다음을 차례로 수행:

1. 작업 디렉토리 확인: `/Users/baekkyunshin/Desktop/AI-roadmap-dashboard`
2. 현재 브랜치 확인: `git branch --show-current` → `main` 이어야 함. 다른 브랜치라면 사용자에게 보고 후 결정.
3. 작업 트리 깨끗한지 확인: `git status --short`. uncommitted 변경 있다면 보고.
4. main 최신 동기화: `git fetch origin && git pull --ff-only origin main`. 분기 상태이면 보고 후 결정.
5. **세션 #B·#C 머지 검증**:
   - `git log --oneline | head -5` 에 squash 커밋 `9068e9e` (PR #38, 세션 #B) + `0f4d352` (PR #39, 세션 #C) 가 있어야 함
   - 리포트 갱신 확인: `grep -E "#011 \[P2\] \[🔴 OPEN\]|#012 \[P1\] \[🔴 OPEN\]|#013 \[P1\] \[🔴 OPEN\]" docs/reports/2026-04-28-system-audit.md` 가 3건 매치되어야 함
   - `#004 \[P2\] \[🟢 RESOLVED\]` 가 매치되어야 함
   - 매치 안 되면 사용자에게 보고하고 세션 종료
6. 신규 브랜치 생성·체크아웃: `git checkout -b fix/audit-defects-011-013-2026-04-29`. 동명 브랜치 이미 존재 시 보고.

## 환경 셋업

Phase 0 직후, Plan 단계 진입 전에 1회 실행:

1. Docker Desktop 실행 여부 사용자에게 확인 (메모리 규칙: feedback_docker_announce)
2. `npx supabase start` (이미 동작 중이면 `npx supabase status` 로 상태만 확인)
3. `npx supabase db reset` (시드 재주입 — son/kpc/sysadmin/시드기업A/시드기업B 모두 복원)
4. `cp .env.local .env.local.audit-bak && cp .env.test .env.local` (작업 끝나면 원복)
5. **#013 검증 위해 Anthropic 키 fallback** (선택, LLM 실호출 e2e 가 필요한 경우만):
   ```bash
   ANTHROPIC_KEY=$(grep '^LLM_API_KEY=' .env.local.audit-bak | cut -d'=' -f2-)
   sed -i.bak "s|^LLM_API_KEY=.*|LLM_API_KEY=${ANTHROPIC_KEY}|" .env.local
   ```
6. `npm run dev` (포트 3000, 백그라운드)
7. `kpc@test.com` / `test1234!` 로 로그인 동작 확인 (Playwright MCP `browser_navigate` + `browser_type` + `browser_click`)

## 산출물 (반드시 생성)

1. **헬퍼 (옵션 B 채택 시)** — `src/lib/utils/action-result-toast.ts` + 단위 테스트
2. **코드 수정** — 결함당 별도 커밋. 영향 영역:
   - 인터뷰 자동저장 hook + Client 컴포넌트 (#011, #012)
   - `RoadmapResultClient` (#013 시나리오 A)
   - `PblReportClient` (#013 시나리오 B)
3. **단위 테스트 (Vitest)** — 헬퍼 + 클라이언트 분기 + Server Action 응답 형식 검증
4. **E2E 회귀 테스트 (Playwright)** — `tests/e2e/`:
   - `interview-autosave-label.spec.ts` — 자동저장 후 라벨이 "저장됨"인지 (#011)
   - `interview-final-submit.spec.ts` — Step 8 제출 시 status 전환 + 토스트 + 라우팅 (#012)
   - `roadmap-generation-silent-fail.spec.ts` — 자가진단/인터뷰 미충족 시 토스트 (#013 A)
   - `pbl-generation-silent-fail.spec.ts` — PBL 인터뷰 미충족 시 토스트 (#013 B)
5. **리포트 갱신** — `docs/reports/2026-04-28-system-audit.md`:
   - #011·#012·#013 상태 라벨 `[🔴 OPEN]` → `[🟢 RESOLVED]` (3건 모두)
   - 결함 한눈에 보기 표 갱신
   - 각 결함 본문 끝에 해결 정보 + 상태 변경 행 추가
   - 변경 이력 표에 한 줄 추가:
     ```
     | 2026-04-29 | silent fail 3건 본격 해결 (세션 #D) | PR #(번호) | RESOLVED: #011, #012, #013 |
     ```
6. **PR 생성** — 제목: `fix: 인터뷰·로드맵·PBL silent fail 3건 해결 (#011~#013)`
7. `npm run validate && npm run build` 통과 + PR push + **CI 모든 check pass 확인** (E2E 포함)

## 진행 단계

### Phase 1 — Plan 작성 (Phase 0 + 환경 셋업 직후)

`superpowers:writing-plans` + `superpowers:systematic-debugging` 결합. Plan 에 다음 명시:

- 결함별 진단 가설 (1차 단서 + 코드 분석 결과)
- 영향 받는 파일 정확한 경로
- 옵션 A 단독 vs 옵션 A+B 병행 결정 (사용자 승인)
- 헬퍼 시그니처 (옵션 B 채택 시)
- 각 결함 TDD 사이클 단계
- 회귀 검증 시나리오 (Phase 5)
- 사용자 승인 (`ExitPlanMode`)

### Phase 2 — 진단 (각 결함 재현 + 원인 확정)

- **Playwright MCP** 로 세션 #B 시나리오 재현
- 각 결함의 정확한 원인 분기를 코드 + 서버 로그 + DB 로 확정
- 진단 결과를 plan 파일에 갱신 (가설 → 확정)

### Phase 3 — TDD 사이클 (#011 → #012 → #013 순서)

각 결함마다:
1. 실패 테스트 작성 (Vitest 또는 Playwright)
2. `npm run test` 또는 `npm run test:e2e` 로 실패 확인
3. 코드 수정 (최소 변경)
4. 테스트 통과 확인
5. 리팩터링 (헬퍼 도입 후 클라이언트 정리)
6. 결함별 커밋

### Phase 4 — 통합 단위 검증

- `npm run validate` (typecheck + lint + unit test)
- `npm run build`
- 모두 통과 후 다음 Phase

### Phase 5 — 회귀 테스트 + Playwright 수동 검증 (필수)

> **사용자 명시 요구**: 세션 종료 전 반드시 수행.

1. **E2E 풀 실행**: `npm run test:e2e` — 전체 회귀 통과 확인 (특히 결함 #002·#003·#004 fix 의 e2e 가 깨지지 않는지)
2. **Playwright MCP 수동 검증**:
   - 시드기업B 인터뷰 8단계 입력 → "저장됨" 라벨 확인 (#011 RESOLVED 증거)
   - Step 8 "최종 제출" → 결과 페이지 이동 + status `INTERVIEWED` 전환 + 토스트 (#012)
   - 인터뷰·자가진단 부재 프로젝트에서 "AI 로드맵 생성" → 명확한 에러 토스트 (#013 A)
   - PBL 인터뷰 미완료 프로젝트에서 "PBL 생성" → 명확한 에러 토스트 (#013 B)
3. **수동 회귀 시나리오**:
   - 시드기업B 인터뷰 정상 입력 → 로드맵 V1 LLM 생성 → PDF/XLSX/HWPX 다운로드 (세션 #B 와 동일 흐름이 그대로 동작하는지)
   - 결함 #002 fix(EmptyState 가드) 회귀 없음 확인
   - 결함 #004 fix(회원가입 atomic) 회귀 없음 확인
4. **신규 스크린샷 누적** — `docs/reports/screenshots/2026-04-29-D/` (날짜+세션 폴더)
5. 콘솔 에러·경고 0 확인 (`browser_console_messages` 로 level=error 조회)

### Phase 6 — 리포트 갱신

- 세 결함 모두 🔴 OPEN → 🟢 RESOLVED
- 결함 한눈에 보기 표 갱신
- 변경 이력 한 줄 추가 (PR 번호 plug-in 후 amend)
- 회귀 검증 결과를 결함 본문 "해결 정보" 행에 명시

### Phase 7 — PR 생성

- 작업 종료 시 `.env.local` 원복 + AUDIT 데이터 정리(`supabase db reset`, 사용자 명시 거부 시 생략)
- 브랜치 push: `git push -u origin fix/audit-defects-011-013-2026-04-29`
- `gh pr create` 로 PR 생성. 제목 `fix: 인터뷰·로드맵·PBL silent fail 3건 해결 (#011~#013)`. 본문에:
  - 해결한 결함 3건 + 근본 원인 요약
  - 회귀 검증 시나리오 결과
  - CI 결과 (Lint·Typecheck·Unit·Build·E2E·Vercel 모두 pass)
- **CI 통과 확인**: `gh pr checks <PR>` 출력의 모든 check pass 까지 대기 (CLAUDE.md 규칙). E2E 가 가장 마지막에 끝나므로 최소 12~15분 폴링 필요.
- PR URL 사용자에게 보고

## 작업 종료 시 보고

- ✅ **해결한 결함** — #011 + #012 + #013 + PR/커밋 + CI pass + 회귀 검증 결과
- 📦 **별도 세션 권장 작업** — `handleActionResult` 헬퍼의 전사 확산(매칭·자가진단·기타 클라이언트 컴포넌트), 옵션 B 추가 영역
- ⚠️ **추가 발견 결함** — 본 세션 진행 중 발견된 신규 결함이 있다면 #014~ 신규 번호로 리포트에 OPEN 추가

## 금지 사항

- 운영 Supabase 에 쓰기 (`.env.local` 이 운영 URL 을 가리키는지 항상 확인)
- 강제 푸시(`--force`) 금지
- `--no-verify` 등 hooks 우회 금지
- 같은 리포트 파일에 동시 쓰기 (다른 세션이 진행 중이면 머지 후 시작)
- **silent fail 결함을 try/catch + 빈 응답으로 회피 금지** — 반드시 명시적 사용자 피드백(토스트·가드)으로 해결
- **세션 #B 의 status SQL UPDATE 같은 우회 코드를 production 코드에 도입 금지** — 우회는 진단 단계에서만 일회성 사용
- 회귀 시나리오 검증을 누락한 채 PR 생성 금지 (Phase 5 필수)

---

## 부록: 세션 #D 와 다른 세션의 관계

| 세션 | 상태 | 다루는 영역 |
|------|------|-----------|
| #A `fix/audit-defects-2026-04-29` | ✅ 완료 (PR #36 머지) | 결함 #001 #002 #003 #005~#010 (보류 #004) |
| #B `chore/verify-deferred-2026-04-29` | ✅ 완료 (PR #38 머지) | 1차 부록 A 의 ⬜ 이월 항목 검증 + 신규 결함 #011~#013 발견 |
| #C `fix/audit-defect-004-2026-04-29` | ✅ 완료 (PR #39 머지) | 결함 #004 회원가입 트랜잭션 본격 해결 |
| #D `fix/audit-defects-011-013-2026-04-29` | ⏳ 시작 가능 | 본 세션 — silent fail 3건(#011·#012·#013) 본격 해결 |

**현재 main 의 결함 누적 상태**:
- 🟢 RESOLVED: #001~#010 (10건, 세션 #A) + #004 (세션 #C) = 사실상 1차 조사 결함 10건 모두 해결
- 🔴 OPEN: #011·#012·#013 (silent fail 3건, 본 세션의 입력)

**본 세션 종료 시 main 상태 (목표)**:
- 🟢 RESOLVED: #001~#013 (전체 13건)
- 🔴 OPEN: 0건 (단, 본 세션 진행 중 추가 발견된 결함이 있다면 #014~ 로 누적 가능)

## 부록: 세션 #B 환경 fallback 재현 가이드 (#013 검증 시)

세션 #B 가 적용한 임시 우회는 **본 세션의 결함 fix 가 적용되면 더 이상 불필요**. 다만 fix 검증 단계에서 동일 환경을 재현해야 할 경우:

| 항목 | 세션 #B fallback | 본 세션 fix 후 |
|------|------------------|----------------|
| `LLM_API_KEY` (`.env.test`) | OpenAI placeholder → Anthropic 실키 fallback | LLM 실호출 e2e 가 필요한 경우에만 fallback. 단위 테스트는 mock 활용 |
| `HWPX_API_SECRET` | 미설정 → 64자 hex secret fallback | HWPX 다운로드 e2e 시 fallback |
| 시드기업B `projects.status` | `ASSIGNED` → SQL UPDATE `INTERVIEWED` | **fix 후 불필요** — Step 8 "최종 제출" 이 정상 동작하면 자동 전환 |

본 세션의 fix 가 시드기업B status 자동 전환을 정상화하므로 (#012 해결의 직접 효과), Phase 5 회귀 검증에서 **status 자동 전환을 명시적으로 확인** 할 것.
