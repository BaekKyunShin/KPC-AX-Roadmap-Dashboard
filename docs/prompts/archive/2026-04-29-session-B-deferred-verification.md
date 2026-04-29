# 세션 #B — 1차 조사 이월 항목 검증

> **사용법**: 세션 #A의 PR이 main에 머지된 후 새 Claude Code 세션을 띄우고 **plan mode**로 진입한 뒤, 아래 "본문 프롬프트" 섹션을 그대로 복사해 첫 메시지로 전달.

## 사전 조건

- **세션 #A의 PR이 main에 머지 완료** — 머지 전 시작 금지 (silent fail 결함 #002 수정이 LLM 호출 검증의 전제)
- 사용자는 main 브랜치 그대로 새 세션을 띄웠음
- **main 동기화·머지 검증·브랜치 생성은 본 세션의 클로드가 직접 수행한다** (아래 "Phase 0" 참조)

## 본문 프롬프트 (이하 그대로 복사)

---

KPC AI 훈련 로드맵 대시보드의 1차 전수 조사에서 시간 부족으로 이월된 검증 항목을 Playwright MCP로 마저 수행하고, 새 결함이 있으면 같은 리포트에 #011~ 신규 번호로 추가해주세요. 새 세션이라 이전 대화 맥락이 없으니 아래 문서를 먼저 읽어 컨텍스트를 확보해주세요.

## 시작 전 반드시 읽을 문서 (절대경로)

1. `/Users/baekkyunshin/Desktop/AI-roadmap-dashboard/docs/reports/2026-04-28-system-audit.md`
   — 1차 조사 리포트. **부록 A의 ⬜ 표시 항목**이 본 세션의 작업 대상. 결함 한눈에 보기 표의 #001~#010은 세션 #A에서 RESOLVED됐는지 먼저 확인.
2. `/Users/baekkyunshin/Desktop/AI-roadmap-dashboard/docs/prompts/2026-04-29-audit-followup-guide.md`
   — 후속 작업 진행 가이드. 리포트 관리 컨벤션·격리 정책 명시.
3. `/Users/baekkyunshin/Desktop/AI-roadmap-dashboard/CLAUDE.md`
   — 프로젝트 개요·HWPX 브리지 서버 사용법·환경 변수.
4. `/Users/baekkyunshin/.claude/plans/hidden-spinning-tide.md`
   — 1차 조사 계획서. 환경 셋업·계정·격리 정책·리포트 형식 그대로 따를 것.
5. memory/MEMORY.md + memory/reference_test_accounts.md (자동 로드됨)

## 검증 범위 (1차 부록 A의 이월 항목 그대로)

1. **인터뷰 8단계 폼 입력** — 시드기업B(또는 신규 [AUDIT-20260429] 프로젝트) 대상
2. **AI 로드맵 생성** — LLM 실호출, 응답 30~60초 대기 허용. 세션 #A의 #002 수정이 적용된 상태 확인.
3. **로드맵 리비전·편집·최종 확정** — DRAFT→FINAL 전환, ARCHIVED 동작
4. **로드맵 PDF / Excel / HWPX 실 다운로드** — HWPX는 브리지 서버 활성 시 검증
5. **PBL 트랙 신규 프로젝트** → PBL 생성(LLM) → HWPX 다운로드
6. **메시지 1:1 대화 + Realtime** — kpc·son 두 계정 간 양방향. SMTP 미설정 시 이메일은 발송 시도만 확인.
7. **알림벨 + 알림 라우팅** — 자가진단 제출·인터뷰 완료·프로젝트 상태 변경 알림
8. **sysadmin@test.com 로그인 → OPS_ADMIN과의 권한 차이**
9. **`/test-roadmap`, `/test-pbl`** 테스트 트랙

## 진행 원칙

- **검증 범위가 명확하지 않은 경우 plan 단계에서 사용자 확인** (인터뷰 데이터 형식, LLM 대기 정책 등)
- **데이터 격리** — 새로 생성하는 엔티티는 `[AUDIT-20260429]` 프리픽스
- **실 비용 발생 액션 모두 승인됨** — LLM, HWPX, 이메일 (단 운영 DB X)
- **Skill·MCP 적극 활용**:
  - `superpowers:writing-plans` — Plan mode 단계
  - `superpowers:dispatching-parallel-agents` — 독립적 검증 흐름 다수 시
  - `web-design-guidelines` — 새 결함 UI/UX 검수 시
  - Playwright MCP (`mcp__plugin_playwright_playwright__*`) — 모든 인터랙션
  - supabase MCP — 필요 시 데이터 직접 검증
- **LLM 응답 50초+ 대기해도 강제 중단 금지** (스피너·진행 표시가 정상 동작하는지가 검증 대상)
- **회귀 발견 시 즉시 사용자에게 알림**. 1차에서 RESOLVED된 결함이 다시 발생하면 🔁 REGRESSION 라벨로 표시.

## Phase 0 — 머지 검증 + 브랜치 분기 (Plan 작성 전 자동 수행)

새 세션 시작 시 클로드가 다음을 차례로 수행:

1. 작업 디렉토리 확인: `/Users/baekkyunshin/Desktop/AI-roadmap-dashboard`
2. 현재 브랜치 확인: `git branch --show-current` → `main`이어야 함. 다른 브랜치라면 사용자에게 보고 후 진행 여부 확인.
3. 작업 트리 깨끗한지 확인: `git status --short`. uncommitted 변경이 있다면 사용자에게 보고.
4. main 최신 동기화: `git fetch origin && git pull --ff-only origin main`
5. **세션 #A 머지 검증**:
   - `git log origin/main --oneline | head -10`로 최근 커밋 확인
   - 1차 조사 결함 수정 PR이 머지되었는지 확인 (커밋 메시지에 `fix:` + "결함" 또는 "audit" 키워드)
   - 리포트 갱신 확인: `docs/reports/2026-04-28-system-audit.md`에 `🟢 RESOLVED` 라벨이 들어가 있는지 grep
   - 머지 흔적이 없으면 사용자에게 보고하고 **세션 종료**. (이월 검증은 #A 머지 후에만 의미 있음)
6. 새 브랜치 생성·체크아웃: `git checkout -b chore/verify-deferred-2026-04-29`. 동명 브랜치가 이미 존재하면 사용자에게 보고 후 결정.

위 단계가 모두 정상이면 환경 셋업 → Plan 작성으로 진행.

## 환경 셋업

Phase 0 직후 1회 실행:

1. Docker Desktop 실행 여부 사용자에게 확인
2. `npx supabase start && npx supabase db reset`
3. `cp .env.local .env.local.audit-bak && cp .env.test .env.local`
4. HWPX 브리지: `npm run dev:hwpx:setup` (최초 1회) → `npm run dev:hwpx` (백그라운드)
5. dev 서버: `npm run dev:with-hwpx` (백그라운드, 포트 3000)
6. son/kpc/sysadmin 모두 비번 `test1234!`로 로그인 가능 확인

## 진행 단계

### Phase 1 — Plan 작성 (Phase 0 + 환경 셋업 직후)

- 검증 범위·데이터 시드 방법(인터뷰 폼 직접 입력 vs SQL INSERT)·LLM 대기 정책·새 결함 추가 형식 결정
- 사용자 승인 (`ExitPlanMode`)

### Phase 2~N — 검증 흐름 그룹별 실행

각 그룹마다 캡처 + 결함 발견 시 누적 메모.

### 마지막 Phase — 리포트 갱신 + PR 생성

- 위 산출물 갱신 후 브랜치 push: `git push -u origin chore/verify-deferred-2026-04-29`
- `gh pr create`로 PR 생성. 제목 `docs(reports): 1차 조사 이월 항목 검증 + 신규 결함 N건 추가`
- PR URL을 사용자에게 보고

### 리포트 갱신 (마지막 Phase 세부)

- 부록 A 체크리스트 ⬜ → ✓ 갱신
- 새 결함 #011~ 추가 (🔴 OPEN 라벨)
- 회귀 발견 시 해당 결함을 🔁 REGRESSION으로 변경
- 변경 이력에 한 줄 추가:
  ```
  | 2026-04-29 | 이월 검증 (세션 #B) | PR #NN | OPEN 추가: #011~#NNN, REGRESSION: #NN |
  ```
- "결함 한눈에 보기" 표 갱신

## 산출물

1. **신규 스크린샷** — `docs/reports/screenshots/2026-04-29/` (날짜 폴더 분리)
2. **리포트 갱신** — 같은 파일 `docs/reports/2026-04-28-system-audit.md`
3. **HWPX/PDF/XLSX 다운로드 결과 파일** — 임시 위치 캡처 후 정상 열림 확인 (한컴오피스/Excel 호환). 파일 자체는 git에 커밋하지 않음.
4. **PR 생성** (제목: `docs(reports): 1차 조사 이월 항목 검증 + 신규 결함 N건 추가`)

## 작업 종료 시 보고

- ✅ **검증 완료 항목** — 부록 A의 ✓ 표시 추가된 항목
- 🆕 **추가 발견 결함** — #011~ 번호 + P 등급 + 한 줄 요약
- 🔁 **회귀 발견** — 1차에서 RESOLVED됐던 결함 번호 + 회귀 사유
- ⚠️ **검증 보류 항목** — 시간 부족 등 이유로 추가 이월 (있다면)

## 금지 사항

- 운영 Supabase에 쓰기 (작업 시작 시 dev 서버 콘솔에서 Supabase URL이 `127.0.0.1:54321`인지 한 번 더 확인)
- HWPX/PDF/XLSX 결과 파일 커밋 (스크린샷만 커밋)
- 같은 리포트 파일에 다른 세션과 동시 쓰기 (세션 #A 종료 후에만 시작)
- 1차에서 RESOLVED된 결함의 픽스를 임의로 되돌리기 — 회귀 발견해도 코드는 건드리지 않고 리포트에 REGRESSION 표시만
