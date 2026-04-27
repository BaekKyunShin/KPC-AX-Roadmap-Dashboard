# PR #3 — Phase D~G 새 세션 인계 프롬프트

> **시점:** 2026-04-26
> **브랜치:** `feat/pr3-hwpx-template-rebuild` (push 완료, draft PR 미생성)
> **머지 대상:** `main` (sha c44fbde)
> **이번 PR 진행도:** Phase A·B 완료 → Phase C SKIP 결정 → **Phase D-3a (SSOT v2 정정) 완료** → Phase D-3b·D-1·D-2·D-4·D-5·E·F·G 미진행

KPC AI 훈련 로드맵 대시보드 PR #3 (HWPX 템플릿 재구축) 의 후속 단계를 진행해 주세요.

## 본 세션 (2026-04-26) 에 새로 확정된 사실

### 1. 옵션 B (SSOT 좌표 기반) 채택 — Phase C 합법 SKIP

이전 세션 (2026-04-25) 의 계획서가 제시한 **하이브리드** 두 옵션 중 사용자가 권장한 **옵션 B (실용)** 를 정식 채택했다.

| 옵션 | 채택 | 사유 |
|---|---|---|
| A — `scripts/insert_placeholders.py` 가 템플릿에 `{{...}}` 삽입, 런타임에 치환 | ❌ | PR #26 에서 placeholder 삽입이 한컴오피스 거부 유발한 전례 (cellAddr/id/linesegarray 중복) |
| B — 템플릿은 사용자 정본 그대로 유지, generate.py 가 SSOT 의 `location.table_index` + `cell` 좌표로 직접 채움 | **✅ 채택** | runs 변형 없이 안전. SSOT 좌표가 단일 원천이므로 표 인덱스 정합 보장 |

**즉시 영향:**
- `templates/hwpx/{roadmap,pbl}.hwpx` 는 Phase A 의 사용자 정본 (`3cff053…` / `d6fbfbc…`) 그대로 유지 (placeholder 미삽입)
- `_replace_in_all_runs(doc, "{{...}}", value)` 메커니즘 보존하되 사용자 정본에 placeholder 없으므로 자연스럽게 no-op
- `scripts/insert_placeholders.py` 신설 **불필요** (Phase C 산출물 0건)
- DoD #6 ("`{{...}}` 0 건") 의 검증을 **재정의**:
  - 기존: 출력 HWPX grep `{{...}}` 카운트 0 건
  - 재정의: (a) SSOT JSON 의 모든 `py_key` 가 payload TS 출력 dict 에 존재 (b) E2E 다운로드 후 셀별 텍스트가 비어있지 않음 (fixture full vs empty 대조)

### 2. **이전 세션 인계 prompt 의 "표 인덱스 시프트" 단정은 SSOT 의 카운팅 차이로 판명 (반대 방향)**

이전 세션 prompt (`docs/prompts/2026-04-25-pr3-phase-c-handoff.md` 의 "핵심 발견 1") 가:
> generate.py 의 모든 `_fill_*()` 함수의 `idx: int = N` default 값이 어긋남.
> 권장 패턴: `idx` 를 함수 default 에 박지 말고, generate.py 가 SSOT JSON 을 import …

라고 단정했는데, 실제 검증 결과 **반대 방향이었다**:

```
실제 사용자 정본 (templates/hwpx/{roadmap,pbl}.hwpx) 의
generate.py 의 _collect_tables(doc) 결과 (shallow traversal):
- roadmap.hwpx: 44 표 → generate.py 의 모든 _fill_*() default idx 가 정확
- pbl.hwpx: 52 표 → generate.py 의 모든 _fill_*() default idx 가 정확

반면 이전 세션의 SSOT v1 의 table_index 는
python-hwpx 의 doc.get_table_map() (nested 표 포함) 결과:
- roadmap.hwpx: 49 표 (nested 5 개 추가) → SSOT 인덱스가 +0~+1 시프트
- pbl.hwpx: 68 표 (nested 16 개 추가) → SSOT 인덱스가 +3~+12 시프트
```

**결과:**
- **`generate.py` 의 모든 `_fill_*()` 함수의 `idx: int = N` default 값은 변경 불필요** (이미 정확)
- **SSOT JSON 을 shallow 인덱스로 정정**해야 함 (commit `91c9a14` 에서 완료)

### 3. SSOT JSON v2 정정 (commit `91c9a14`)

`docs/references/hwpx-placeholders.json` 을 v1 → v2 로 전면 갱신:

| 변경 영역 | v1 (get_table_map) | v2 (shallow) |
|---|---|---|
| Roadmap R-08~R-22 전체 | 12, 14, 16, 18, 20, 23, [24,25], 27, 29, 31, 33, [35,36,37], 39 | **11, 13, 15, 17, 19, 22, [23,24], 26, 28, 30, 32, [34,35,36], 38** |
| PBL P-02~P-15 | 4, 6, [8-16], 18, [20,21], 22, 24, 26, 28, 30, 31, 33, 35, 36 | **1, 3, 5(단일), 7, [9,10], 11, 13, 15, 17, 19, 20, 22, 24, 25** |
| PBL P-16~P-23 | 38, 39, 41, 42, 43, 45, 46, 47 | **27, 28, 30, 31, 32, 34, 35, 36** |
| PBL P-24~P-29 결과보고서 | 49~61 | **37~51** (-12 차등) |

추가 정밀화:
- **P-04 organization**: 양식 수정으로 단순화된 단일 6x3 표 (shallow [5]). data_source 도 `{ orgTree, mainWork[] }` flatten 으로 명시
- **P-09 problems**: V2 problems[] (title/description/impact) → 양식 5x2 의 row 1~4 col 1 에 description 매핑
- **P-10 priorities**: V2 priority.items[] (problem/score/rank) → score 1~5 체크박스 + selected (rank=1) 매핑
- **P-11 target**: V2 single object → 양식 6x7 의 row 1 에 name + necessity_score 매핑
- **P-13 target_details**: V2 details[] (title/description) → 양식 4x5 의 row 2~3 에 매핑
- **P-15 expected_ai_level**: 4 등급 체크박스 → "현행/향후/사유" 3 cell_fill (양식 2x3 표 구조와 정합)
- **P-18 course_overview**: 단일 → 2 cell (course_name + training_period)
- **P-20 subject_profile**: 단일 → 7 cell_fill (course_name/total_hours/training_goals/ai_tools/utilized_data/analysis_method/total_sum_hours)
- **P-23 course_eval**: 3 → 6 cell (course_name/target/date/criteria/result/overall_comment)

`scripts/verify-mapping-completeness.mjs` 재실행 통과:
```
[roadmap] 37 entries
[pbl] 42 entries
[cross-check] roadmap meaningful=23, pbl meaningful=29, total=52
[summary] placeholders unique: 94
PASS
```

### 4. 잔존 스크립트 정리 (commit `6805ce5`)

`scripts/port-hwpx-placeholders.py`, `scripts/fix-roadmap-i3-alignment.py` 를 `scripts/archive/` 로 이동. 보존 사유는 `scripts/archive/README.md` 에 명시 (향후 옵션 A 전환 시 참고).

### 5. 진행 보고서 갱신

`docs/reports/2026-04-25-form-parity-report.md` 의 Phase A, B, C 섹션 모두 채움. **Phase D~G 는 다음 세션이 채울 영역**.

## 본 세션 commit 목록 (이미 push 됨)

```
6805ce5 chore(hwpx): PR #26 잔존 스크립트 archive 이동
91c9a14 fix(hwpx): SSOT JSON 인덱스를 shallow traversal 기준으로 정정
d68963d docs: PR #3 Phase C-G 새 세션 인계 프롬프트 신설  (이전 세션)
c77dd41 feat(hwpx): Phase B — SSOT JSON + 구조 분석 (47섹션 누락 0건)  (이전 세션)
68af415 chore(hwpx): Phase A — 사용자 서식 수정본을 templates 정본으로 교체  (이전 세션)
```

## 남은 작업 (Phase D~G) — 가장 큰 분량

### Phase D-1 (`api/hwpx/_placeholders_roadmap.py`) — TDD 권장

기존 V1 짧은 placeholder 키 (`{{company_name}}`, `{{level_beginner_check}}`) 보존 또는 SSOT v2 명명 규칙 (`{{roadmap_overview_establishment_necessity}}`) 으로 갱신 결정 필요.

**권장 결정**: **V1 짧은 키 보존** — 옵션 B 채택 결과 placeholder 메커니즘이 no-op 이므로 키 명칭은 무관. 단, build_placeholder_map 결과에 SSOT 의 모든 placeholder 가 포함되도록 하는 것은 의미가 있음 (장차 옵션 A 전환 대비). 다만 SSOT 키와 generate.py 가 사용하는 짧은 키를 **양쪽 모두 출력** 하는 형태로 확장하면 호환성 보존.

새 SSOT 키 (Roadmap):
- 표지: `roadmap_cover_company_name` 등 6 개
- Ⅰ-1: `roadmap_overview_establishment_necessity`
- Ⅰ-2: `roadmap_overview_performance_{i}_{round/date/content/method/pm_role/pm_name/expert_role/expert_name}` (i=1..3, 8 필드)
- Ⅰ-3: `roadmap_overview_ai_level_{beginner/intermediate/advanced}_check`, `roadmap_overview_selected_task`, `roadmap_overview_main_summary`
- Ⅱ-1: `roadmap_requirements_hrd_report_attachment`
- Ⅱ-2: `roadmap_requirements_{company_status/main_problems/push_willingness/expected_outcomes}`
- Ⅱ-3: `roadmap_requirements_task_analysis_{i}_{job/task/as_is/problem/data_availability/ai_score}`, `roadmap_requirements_task_analysis_{note,attachment}`
- Ⅱ-4: `roadmap_requirements_target_task_{name/selection_reason/expected_as_is/expected_to_be}`
- Ⅲ-1: `roadmap_training_competency_{i}_{name/definition_performance_criteria/knowledge/skill/attitude}`, `roadmap_training_ncs_{methodology/derivation_method}`
- Ⅲ-2: `roadmap_training_structure_{i}_{competency_name/training_level/training_content/training_target/training_method/training_goal}`, `roadmap_training_structure_method`
- Ⅲ-3: `roadmap_training_plan_{i}_{competency_name/course_name/training_type/training_hours/remarks}`, `roadmap_training_plan_utilization`
- Ⅲ-4: `roadmap_training_spec_{j}_{course_name/...}`, `roadmap_training_spec_{j}_subject_{k}_{...}`
- 별첨: `roadmap_appendix_{company_name/insurance_no}`

### Phase D-2 (`api/hwpx/_placeholders_pbl.py`) — TDD 권장

V2 PBL 인터뷰 (`PBLInterviewSchema` = `PBLOverviewSchema.merge(PBLAnalysisSchema).merge(PBLTasksSchema)`) 의 신규 데이터 구조 처리:
- `currentAiLevel { level: BASIC/EXPLORER/USER/LEADER, note }` → 4 등급 체크박스 (P-14)
- `expectedAiLevel { level, note }` → 양식 2x3 의 현행/향후/사유 (P-15, **체크박스 아님**)
- `organization { orgTree (재귀 트리), mainWork[] }` → 부서명/업무 flatten 행 (P-04)
- `priority.items[] { problem, score, rank }` → score 1~5 체크박스 + rank=1 시 selected (P-10)
- `target { name, code, scope, necessity, details[] }` → 단일 row 매핑 + details[] 별도 표 (P-11, P-13)
- `problems[] { title, description, impact }` → 5x2 표 row 1~4 col 1 매핑 (P-09)
- `activities[] { round, date, content, method, participants }` (V2 participants 는 단일 string) → 13x6 표 (P-08)

### Phase D-3b (`api/hwpx/generate.py`) — V2 데이터 구조 적응

표 인덱스는 그대로 보존 (이미 정확). V2 신규 데이터 구조 처리:
1. `_fill_pbl_organization` — V2 organization { orgTree, mainWork[] } flatten 처리
2. `_fill_pbl_problem_definition` (idx=15) → `_fill_pbl_problems` 로 개명 + V2 problems[] (4 항목) 매핑
3. `_fill_pbl_problem_priorities` (idx=17) → V2 priority { items[] (problem/score/rank), method } 매핑
4. `_fill_pbl_target_tasks` (idx=19) → V2 single target { name/scope/necessity } 매핑
5. `_fill_pbl_target_task_details` (idx=22) → V2 details[] (title/description 만) 매핑
6. `_fill_pbl_ai_level_current` (idx=24) → V2 currentAiLevel { level (영문 enum), note } 매핑 + AI_LEVEL_LABELS dict 추가
7. `_fill_pbl_ai_level_improvement` (idx=25) → V2 expectedAiLevel + currentAiLevel 의 라벨/사유 매핑 (양식 2x3)
8. **미사용 V1 함수 정리**: `_fill_pbl_recommendations` (idx=10), `_fill_pbl_dissemination` (idx=40), `_fill_pbl_performance_metrics` (idx=39) — V2 에서 사용 안 함 (양식 원문 고정 또는 PDF 첨부 처리)

### Phase D-4 (`src/lib/services/export/hwpx/hwpx-payload-roadmap.ts`)

Roadmap V2 인터뷰 (`roadmapInterviewSchema`) + RoadmapVersion DB → SSOT v2 의 모든 py_key 출력. 기존 코드는 70% 정합 — 다음 정도만 보완:
- `analysis_notes_text`, `task_workflow_items` 가 SSOT v2 와 정확히 일치하는지 확인
- vitest 측에 SSOT JSON 의 모든 placeholder ↔ 출력 dict 키 동기화 assertion 추가

### Phase D-5 (`src/lib/services/export/hwpx/hwpx-payload-pbl.ts`) — 가장 큰 작업

현재 코드는 **V1 PBL 인터뷰 (`pblInterviewSchema` 의 camelCase: `courseOverview`, `companyStatus`, ...) 입력 기반**. 그러나 PR #28 머지로 V2 PBL 인터뷰 (`PBLInterviewSchema` 의 camelCase: `companyName`, `companyIssues`, `organization`, `activities`, `problems`, `priority`, `target`, `currentAiLevel`, `expectedAiLevel`) 가 정본.

**전면 재작성 필요**:
1. `toInterviewPBL(interview)` 가 V2 PBLInterview 를 반환하도록 변경 (DB row 의 어느 필드에 V2 가 저장되는지 정확히 파악 — `interview.pbl_data` 일 가능성)
2. 출력 dict 의 key 를 V2 데이터에서 추출 + SSOT v2 의 모든 py_key cover
3. PBL V2 결과 (`PBLContent.operation_plan` snake_case) 와 인터뷰 V2 (camelCase) 양쪽을 SSOT py_key (snake_case) 로 정렬
4. vitest TDD: 4 조합 (empty/max/special/long-korean) + SSOT 동기화 assertion

### Phase E — fixture 통합 검증

신규:
- `api/hwpx/__fixtures__/{roadmap,pbl}-{full,edge}.json` (4 fixture)
- `scripts/verify-hwpx-placeholders.ts` 또는 `.mjs` (출력 HWPX 의 셀별 텍스트 검증 — DoD #6 재정의 형태)

브리지 서버 + 한글 오피스 실물 검증 → 스크린샷 첨부.

### Phase F — 회귀 테스트 + CI

- pytest 4 조합 보강 (`api/hwpx/test_placeholders_{roadmap,pbl}.py`)
- vitest SSOT 동기화 assertion (`hwpx-payload-{roadmap,pbl}.test.ts`)
- Playwright E2E (`tests/e2e/hwpx-download.spec.ts`)
- `npm run validate && npm run build` 통과

### Phase G — PR 생성 + verification-before-completion

- 보고서 최종화 (`docs/reports/2026-04-25-form-parity-report.md` 의 Phase D~G 섹션 채움)
- DoD #5/#6/#7/#9·#10 모두 ✅ 전환
- PR 제목: `feat(hwpx): V2 양식 1:1 정합 HWPX 템플릿·치환 로직 재구축 (#3)`
- `gh pr checks <PR>` 의 **모든 check** (Lint & Typecheck · Unit Test · Build · **E2E Test** · Vercel) pass 확인 (CLAUDE.md "PR CI 통과 판정 규칙" 엄수)

## 시작 가이드 (다음 세션)

1. **단일 통독 문서:** `docs/plans/archive/2026-04-25-pr3-hwpx-template-rebuild.md` (정본 계획서, 28KB)
2. **본 인계 프롬프트** (이 문서) — 본 세션 (2026-04-26) 의 핵심 발견 + 결정 사항 요약
3. **SSOT JSON v2:** `docs/references/hwpx-placeholders.json` — table_index 가 shallow traversal 기준으로 정합됨
4. **진행 보고서:** `docs/reports/2026-04-25-form-parity-report.md` — Phase A, B, C SKIP, B.7 SSOT v2 정정까지 기록 완료. Phase D~G 는 미진행
5. **사용 스킬·서브에이전트 권장**:
   - `hwpx-docgen` — HWPX 편집·표 구성·검증 전반 필수
   - `superpowers:subagent-driven-development` — Phase 단위 task 분할·실행
   - `superpowers:test-driven-development` — `_placeholders_*.py` · payload TS 모두 TDD
   - `superpowers:verification-before-completion` — 머지 전 필수
   - `superpowers:systematic-debugging` — 표 인덱스 mismatch 디버깅 시

## DoD 체크리스트 (이번 PR 머지 전)

- [x] **DoD #5: 매핑 표 cross-check 누락 0건** — Phase B + B.7 SSOT v2 정정으로 충족 (`verify-mapping-completeness.mjs` PASS)
- [ ] DoD #6: HWPX 출력 정합성 (재정의: SSOT py_key ↔ payload TS 출력 dict + 셀별 텍스트 검증) — Phase E 에서 검증
- [ ] DoD #7: 한글 오피스 실물 확인 (Phase E 스크린샷 첨부)
- [ ] DoD #9·#10: `npm run validate && npm run build` + GitHub CI 전체 pass (Phase F·G)

## 진행 방식 권장

1. **Phase D-1 + D-2** (Python `_placeholders_*.py`) — TDD 로 V2 데이터 구조 처리 + SSOT 키 cover. **공유 가능한 작은 단위.**
2. **Phase D-3b** (generate.py PBL V2 적응) — `_fill_pbl_*()` 8 개 함수 갱신. SystemDebug 스킬 활용.
3. **Phase D-4 + D-5** (TS payload) — D-5 가 최대 작업량 (V1 → V2 입력 형태 변환). vitest TDD.
4. **Phase E** — fixture + verify + 한글 오피스 실물.
5. **Phase F + G** — 회귀 테스트 + PR 생성. `verification-before-completion` 필수.

각 phase 완료 후 한국어 commit (feat/fix/refactor/test/chore) 으로 push.
