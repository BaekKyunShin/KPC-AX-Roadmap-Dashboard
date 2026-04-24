# Batch 1 — LLM / 스키마 Critical (4건)

새 Claude Code 세션을 열고 아래 코드블록 전체를 첫 메시지로 붙여넣는다.

**처리 대상**: ISSUE-04, 06, 07, 19 (Critical 3건 + High 1건)
**브랜치**: `fix/batch-1-llm-and-schema`
**공통 테스트 계정**:
- 운영관리자: `son@test.com` / `aaaa00000`
- 컨설턴트: `kpc@test.com` / `aaaa0000`

---

```
## 작업 맥락 (중요 - 먼저 읽기)

이 작업은 2026-04-21 QA 에서 발견된 19건 이슈 중 Batch 1 (Critical/High 4건) 을 처리하는 세션이다.
전체 19건은 수정 규모가 커서 2개 배치로 분할되어 있다:

- Batch 1 (이 세션, 4건): ISSUE-04·06·07·19 (LLM/스키마 Critical — OFA 여파 연관)
- Batch 2 (별도 세션, 15건): ISSUE-01·02·03·05·08~18 (UI/UX — Batch 1 머지 후 시작 예정)

브랜치 전략:
- Batch 1 → fix/batch-1-llm-and-schema → PR → main 머지
- Batch 2 → Batch 1 머지 후 fix/batch-2-ui-ux → PR → main 머지

---

docs/2026-04-21-post-merge-qa-issues.md 를 정독해. 아래 4건만 처리:
- ISSUE-04 (로드맵 인터뷰 범위 재정의 + Ⅲ-1 역량 모델링 스텝 신규)
- ISSUE-06 (컨설턴트 자동 매칭 실패 - Critical)
- ISSUE-07 (사전 분석 실패 - Critical)
- ISSUE-19 (로드맵 생성 실패 - Critical)

4건 모두 OFA 스키마 변경 여파로 LLM 프롬프트·스키마·Server Action 이 얽혀 있음.
한 브랜치에서 순서대로 처리해.

스크린샷: docs/screenshots/2026-04-21-qa/
산인공 공식 양식: docs/references/1.*.hwp + 1.*.pdf (로드맵), 2.*.hwp + 2.*.pdf (PBL)
배포·완료 기준 계획서: docs/plans/2026-04-20-ofa-post-merge-deployment.md §7 "1차 완료 기준"

## 필수 사용 스킬 (생략 금지)
- superpowers:writing-plans → Plan Mode 에서 Step 단위 계획 수립
- superpowers:test-driven-development → 모든 스키마/서비스 수정은 TDD (RED → GREEN → REFACTOR)
- superpowers:systematic-debugging → Critical 3건 원인 특정 시 필수
- superpowers:executing-plans → 계획 실행
- superpowers:verification-before-completion → 완료 선언 전 필수
- check-server-action → Server Action (actions.ts) 수정 시
- supabase-dev → 마이그/RLS/DB 함수 수정 시
- refactoring → GREEN 단계 직후
- claude-api → Claude API / LLM 호출 최적화 (프롬프트 캐싱, JSON 안정성)

## 필수 사용 MCP
- mcp__supabase__apply_migration → 마이그 SQL 작성 시 직접 DB 적용 (수동 실행 금지)
- mcp__supabase__list_migrations → 적용 검증
- mcp__supabase__get_advisors → 스키마 변경 후 보안/성능 점검
- mcp__plugin_playwright_playwright__* → 매 Step 탐색적 회귀 + 신규 기능 즉흥 확인
  • 운영관리자: son@test.com / aaaa00000
  • 컨설턴트: kpc@test.com / aaaa0000
- mcp__plugin_serena_serena__* → 기존 코드 심볼 탐색/편집
- mcp__plugin_context7_context7__query-docs → 새 라이브러리 사용 시 최신 문서 조회

## 서브에이전트 (필요 시)
- prompt-engineer → LLM 프롬프트 토큰 효율화·JSON 안정성 (Critical 3건 공통 의심 영역)
- postgres-pro → JSONB 쿼리·인덱스 최적화
- security-auditor → 수정 후 RLS/역할 검증
- test-automator → Playwright E2E 시나리오 작성·기존 spec 동기화
- code-reviewer → 각 Step 완료 후 리뷰 (requesting-code-review 스킬과 함께)

## 진행 순서
1. Plan Mode 진입 → 아래 5개 Step 으로 계획 작성:
   - Step A: interview-roadmap.ts 스키마에 competencyModelSchema + ncs_usage 추가 (+ 테스트)
   - Step B: 인터뷰 UI 에 Ⅲ-1 역량 모델링 스텝 추가 (ISSUE-04)
   - Step C: Vercel Functions 로그로 Critical 3건 원인 특정 → LLM 프롬프트·스키마 재정비
   - Step D: Export (HWPX/PDF/XLSX) 에 역량 모델링 섹션 추가
   - Step E: 전 영역 최종 E2E + Playwright 회귀 검증

   ⚠️ 계획서에 각 Step 별로 아래 4가지를 반드시 명시할 것:
   1. 사용할 스킬·MCP 도구·서브에이전트
      (예: "Step A: TDD 스킬 + mcp__supabase__apply_migration + postgres-pro 서브에이전트")
   2. 회귀 테스트 범위 — 해당 Step 이 건드리는 파일/기능 + 영향 받을 수 있는 연관 기능 목록
      (예: "Step A 회귀 범위: interview-roadmap.test.ts + matching-llm.test.ts + roadmap-generator.test.ts + mapInterviewRowToRoadmapInterview legacy 호환")
   3. 회귀 실행 방법 — Step 커밋 전 반드시 수행:
      - 코드 회귀: npm run test -- <관련 파일> + npm run typecheck + npm run lint
      - E2E 회귀 (npm run test:e2e — 자동화된 회귀 자산):
        · 매 Step 커밋 전: 해당 Step 관련 spec 만 실행 (예: npm run test:e2e -- e2e/consultant/interview-roadmap.spec.ts)
        · Critical 3건 복구 Step 이후에는 매칭·사전분석·로드맵 생성 관련 spec 반드시 재실행
        · PR 생성 전 최종: npm run test:e2e 전체 실행
      - UI 회귀 (Playwright MCP): E2E spec 으로 아직 커버 안 된 신규 기능을 Claude 가 실시간 조작해 확인, 콘솔 에러 0건
      - Critical 3건 복구 Step 이후에는 매칭·사전분석·로드맵 생성 3종을 매번 재검증 (다시 깨지지 않았는지)
   4. E2E spec 동기화 범위 — 기능·UI·스키마 수정 Step 에서 관련 spec 도 같은 커밋에 포함 수정:
      (a) Selector 업데이트: 텍스트·DOM 만 바뀐 경우
      (b) 시나리오 확장: 신규 기능 추가 시 기존 spec 에 단계 삽입 + 필요 시 새 spec 파일 추가
          (예: Ⅲ-1 역량 모델링 스텝 → interview-roadmap.spec.ts 에 7번째 단계 삽입)
      (c) 시나리오 재작성: 기능 철학 변경 시 해당 부분 삭제·신규 작성
          (예: roadmap_summary 입력란 제거 → LLM 자동생성 검증 시나리오로 대체)
      - test-automator 서브에이전트 활용
      ⚠️ 금지: selector 만 바꿔서 pass 만 맞추는 눈속임. spec 이 여전히 "실제 사용자 플로우" 를 검증하는지 검토
      ⚠️ 필수: 계획서의 "E2E spec 수정 범위" 항목에 (a)/(b)/(c) 분류해 사전 명시
   ⚠️ 회귀 실패 시 해당 Step 커밋 절대 금지, 원인 해결 후 재수행. 임시 skip·주석처리 금지.

2. 계획 내가 승인하면:
   - 브랜치 생성: fix/batch-1-llm-and-schema
   - Step 별 커밋 (하나의 커밋이 여러 Step 을 묶지 말 것)
   - 마이그 필요 시 mcp__supabase__apply_migration 으로 직접 DB 적용
   - 매 Step 커밋 전 위 회귀 3종(코드·E2E·Playwright MCP) 통과 + E2E spec 동기화 통과 확인

3. 완료 후 검수 (셋 다 필수):
   a. 코드 검수:
      - npm run validate (typecheck + lint + test) 통과
      - npm run build 통과
      - code-reviewer 서브에이전트로 PR 수준 리뷰
   b. E2E 전체 회귀:
      - npm run test:e2e 전체 실행 → 통과
      - 신규 시나리오(Ⅲ-1 역량 모델링·LLM 호출 복구) spec 추가되어 있을 것
   c. Playwright MCP 탐색적 회귀 (E2E spec 이 커버 못 하는 영역):
      - 컨설턴트(kpc@test.com/aaaa0000) 로그인 → 프로젝트 상세 → 인터뷰 7스텝 (Ⅲ-1 포함) → 로드맵 생성 성공 확인
      - 운영관리자(son@test.com/aaaa00000) 로그인 → 프로젝트 → 자동 매칭 성공 확인
      - 컨설턴트 → 사전 분석 성공 확인
      - 콘솔 에러 0건 확인
4. 셋 다 통과하면 PR 생성 제안 (제목·본문·테스트 계획 초안 포함)
   - 계획서 §7 "1차 완료 기준" 체크리스트 참조해 PR 본문에 체크박스 포함

## 규칙
- 🚨 최우선: 모든 Step 마다 회귀 테스트 필수 — 코드 회귀(test + typecheck + lint) + E2E 회귀(npm run test:e2e, 관련 spec 만) + Playwright MCP 탐색적 회귀 + E2E spec 동기화 수정 전부 통과해야 커밋. 실패 시 커밋 금지. 회귀 범위·실행 명령·spec 수정 분류(a/b/c)는 계획서에 사전 명시
- verification-before-completion 스킬 호출 전에는 "완료" 선언 금지
- 마이그 파일만 만들고 DB 적용 안 하는 것 금지 (CLAUDE.md 엄수 규칙)
- PBL 트랙·운영관리자 계정에 동일 기능 있으면 함께 일관 수정 (해당 spec 파일도 동기화)
- 검증 실패 시 즉시 보고 (임시 우회·skip 금지)
- 한국어로 답변·커밋 메시지 작성
```
