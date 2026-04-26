# PR #3 — HWPX 템플릿 재구축 (Phase C-G 이어가기)

> 새 세션에서 본 작업을 진행할 때 아래 프롬프트를 그대로 복사해 사용하세요.
> 이전 세션에서 Phase A·B (foundation) 가 완료된 상태이며, 본 세션은 Phase C-G 의 implementation 단계를 처리합니다.

---

KPC AI 훈련 로드맵 대시보드의 HWPX 템플릿 재구축 작업(PR #3)의 **후속 단계 (Phase C-G)** 를 진행해줘.

## 현재 상태 (2026-04-25 기준)

- **브랜치:** `feat/pr3-hwpx-template-rebuild` (원격 push 완료, draft PR 미생성)
- **머지 대상:** `main` (sha c44fbde — PR #28 머지 직후)
- **이번 PR 의 진행도:** 9 단계 중 Phase A·B (foundation) 완료, Phase C-G 미진행

### 이전 세션 commits (이미 푸시됨)

```
c77dd41 feat(hwpx): Phase B — SSOT JSON + 구조 분석 (47섹션 누락 0건)
68af415 chore(hwpx): Phase A — 사용자 서식 수정본을 templates 정본으로 교체
```

### Phase A·B 산출물 (이미 존재 — 다시 만들지 말 것)

| 산출 | 경로 | 역할 |
|---|---|---|
| 정본 교체 완료 | `templates/hwpx/{roadmap,pbl}.hwpx` | 사용자 서식 수정본과 hash 일치. 이전 작업본은 `templates/hwpx/archive/*.pre-2026-04-25.hwpx` 로 백업 |
| **단일 매핑 원천 (SSOT)** | `docs/references/hwpx-placeholders.json` | 88 unique placeholder · 52 meaningful entries (R-01~R-23 + P-01~P-29). 7 종 strategy taxonomy (single, cell_fill, repeat_rows, checkbox_toggle, conditional_box, pdf_attach, static) |
| 구조 분석 (로드맵 49 표) | `docs/references/hwpx-structure-roadmap.md` | 표 인덱스·셀·paragraph 인벤토리 |
| 구조 분석 (PBL 67 표) | `docs/references/hwpx-structure-pbl.md` | 동일 (조직도 nested 셀 포함) |
| 분석 스크립트 | `scripts/dump_hwpx_structure.py` | python-hwpx 기반. 사용자 서식 재수정 시 재실행으로 SSOT 갱신 가능 |
| SSOT 검증 스크립트 | `scripts/verify-mapping-completeness.mjs` | DoD #5 (47섹션 누락 0건) 자동화. `node scripts/verify-mapping-completeness.mjs` |
| 누적 보고서 | `docs/reports/2026-04-25-form-parity-report.md` | Phase A·B 결과 기록. Phase C-G 진행 시 누적 갱신 대상 |

## 단일 통독 문서 — **이것만 보면 됨**

> 다른 문서들은 cross-reference 용일 뿐, 새 세션은 아래 1 개만 처음부터 끝까지 통독하면 충분합니다.

**`docs/plans/2026-04-25-pr3-hwpx-template-rebuild.md`** (28KB)
- PR #3 의 정본 실행 계획서 (가장 최신·최상세).
- Phase A·B (완료) + Phase C·D·E·F·G (남은 작업) 의 실행 step·파일 경로·검증 방법 모두 포함.
- §5 의 SSOT 도식 + §"Implementation Phases" + §"Critical Files" 가 핵심.

### 보조 참조 (필요할 때만)

- `docs/references/hwpx-placeholders.json` — 매핑 SSOT (코드가 import 할 정본)
- `docs/references/hwpx-structure-{roadmap,pbl}.md` — 표 인덱스·셀 좌표 lookup
- `docs/references/2026-04-23-current-fields-inventory.md` — 양식 47섹션 라벨 정의 (cross-check 기준)
- `docs/reports/2026-04-25-form-parity-report.md` — Phase A·B 진행 결과 + Phase C-G 채울 자리

### 들춰볼 필요 거의 없는 문서 (이미 SSOT 에 흡수됨)

> 아래 문서들은 의도적 계층 구조의 상위 계층입니다. PR #3 정본 계획서가 superset 으로 흡수했으므로 **새 세션이 처음부터 통독할 필요 없음**. 단, "왜 이 PR 이 존재하는가"의 더 큰 맥락을 이해할 때만 cross-reference.

- `docs/prompts/2026-04-25-pr3-hwpx-template-rebuild.md` (7KB) — 원본 PR #3 착수 프롬프트. 9 단계 요약. **PR #3 정본 계획서가 superset.**
- `docs/prompts/2026-04-24-interview-result-screens-redesign.md` (20KB) — **상위 작업 (PR #28 = 4 개 화면 V2 재설계) 의 원본 프롬프트.** PR #3 의 출발점이 된 line 90-145 "⚠️ HWPX 템플릿 재구축" 섹션이 PR #3 정본 계획서로 완전히 흡수됨. 나머지 (4 개 화면 UI 통일 원칙·화면 구성 원칙·DoD 11 항목 중 PR #28 책임 부분) 는 **이미 PR #28 머지로 완료된 작업**이라 PR #3 와 무관.
- `docs/plans/2026-04-24-interview-result-screens-redesign.md` (93KB) — 상위 통합 계획서 (PR #1~#5 전체). §5 (HWPX 9 단계) + §6 (매핑 표) 가 PR #3 의 출발점이었으나, PR #3 정본 계획서가 §5 를 Phase A~G 로 세분화하고 §6 을 SSOT JSON 으로 디지털화하여 superset.

## 핵심 발견 (이전 세션에서 확인됨 — Phase C-G 작업의 함정)

### 1. `api/hwpx/generate.py` 의 표 인덱스가 모두 시프트됨

사용자 서식 수정으로 표가 추가/이동되어, 1411 줄 generate.py 의 모든 `_fill_*()` 함수의 `idx: int = N` default 값이 어긋났습니다.

**로드맵 (idx 11 부터 +1 시프트):**

| 함수 | 기존 idx | SSOT idx |
|---|---|---|
| `_fill_table_hrd_report` | 11 | 12 |
| `_fill_table_company_requirements` | 13 | 14 |
| `_fill_table_task_workflow` | 15 | 16 |
| `_fill_table_training_target` | 19 | 20 |
| `_fill_table_competencies` | 22 | 23 |
| `_fill_ncs_boxes` | 23/24 | 24/25 |
| `_fill_table_training_structure` | 26 | 27 |
| `_fill_table_annual_plan` | 30 | 31 |
| `_fill_course_spec_tables` | 34/35/36 | 35/36/37 |
| `_fill_table_journal` | 38 | 39 |

**PBL (인덱스 변동 큼):**

| 함수 | 기존 idx | SSOT idx |
|---|---|---|
| `_fill_pbl_overview` | 1 | 4 |
| `_fill_pbl_organization` | 5 | 8-16 (nested) |
| `_fill_pbl_training_env` | 7 | 18 |
| `_fill_pbl_hrd_history` | 9/10 | 20/21 |
| `_fill_pbl_performance_activities` | 13 | 24 |
| `_fill_pbl_problem_definition` | 15 | 26 |
| `_fill_pbl_problem_priorities` | 17 | 28 |
| `_fill_pbl_target_tasks` | 19 | 30 |
| `_fill_pbl_target_task_details` | 22 | 33 |
| `_fill_pbl_ai_level_current` | 24 | 35 |
| `_fill_pbl_ai_level_improvement` | 25 | 36 |
| `_fill_pbl_ai_tool_usage` | 28 | 39 |
| `_fill_pbl_course_overview` | 30 | 41 |
| `_fill_pbl_learning_group` | 31 | 42 |
| `_fill_pbl_subject_profile` | 32 | 43 |
| `_fill_pbl_facilities` | 34 | 45 |
| `_fill_pbl_training_instructors` | 35 | 46 |
| `_fill_pbl_course_evaluation` | 36 | 47 |
| `_fill_pbl_performance_metrics` | 39 | 51/52 |
| `_fill_pbl_dissemination` | 40 | (paragraph) |

**권장 패턴**: `idx` 를 함수 default 에 박지 말고, generate.py 가 `docs/references/hwpx-placeholders.json` 을 import 해 entry id (예: "P-08") 의 `location.table_index` 를 사용하도록 리팩토링. 향후 사용자 서식 재수정 시 SSOT 갱신만으로 대응 가능.

### 2. archive 폴더 git rename detection 부작용

이전 세션에서 git 이 `docs/references/archive/2.AI PBL ...hwpx` 삭제와 `templates/hwpx/archive/pbl.pre-2026-04-25.hwpx` 추가를 hash 동일성으로 "rename" 으로 인식했습니다 (양쪽이 sha `c6ed615...`). 결과는 동일하지만 git log 의 rename 표시는 약간 이상해 보일 수 있습니다. 정상이며 추가 조치 불필요.

### 3. V1 vs V2 스키마 병존

- camelCase: `RoadmapInterviewSchema`, `PBLInterviewSchema` (인터뷰 클라이언트 입력)
- snake_case: `roadmapContentSchema`, PBL `ops`/`outcomes` (LLM 결과·DB 저장)
- payload TS 의 책임은 양쪽을 SSOT 의 `py_key` (snake_case) 로 정렬하는 것

## 작업 범위 (Phase C-G)

> 상세는 `docs/plans/2026-04-25-pr3-hwpx-template-rebuild.md` 의 "Implementation Phases" 섹션을 통독.

### Phase C — 매핑 SSOT → 템플릿 플레이스홀더 삽입 (선택적)

이전 세션에서 **하이브리드 접근**으로 전략 수정 가능성 검토됨:
- 옵션 A (계획대로): `scripts/insert_placeholders.py` 신설 → 템플릿에 `{{...}}` 박기 → generate.py 가 런타임에 치환
- 옵션 B (실용): 템플릿은 사용자 정본 그대로 유지, generate.py 가 SSOT 의 `location.table_index` + `cell` 로 셀에 직접 데이터 채움 (placeholder 단계 생략)

**판단 기준**: paragraph 단위 자유 서술 영역(예: 박스)은 placeholder 가 있어야 verify-hwpx-placeholders.ts 의 grep 검증이 의미 있음. 표 셀은 SSOT 직접 채우기로 충분. → **하이브리드 권장**.

### Phase D — 치환 로직 전면 재작성 (가장 큰 분량)

| 파일 | 작업 | 비고 |
|---|---|---|
| `api/hwpx/_placeholders_roadmap.py` | 전면 재작성 (TDD) | SSOT JSON 을 import → `build_placeholder_map(data)` 가 SSOT 의 모든 single/checkbox 키 cover. 핵심: `set(build_map.keys()) == set(json_keys)` assertion. |
| `api/hwpx/_placeholders_pbl.py` | 전면 재작성 (TDD) | 동일. PBL 추가 분기 (현재/향후 AI역량 4등급 × 2 체크박스 = 8 박스, 조직도 트리 → flatten) |
| `api/hwpx/generate.py` (1411줄) | 부분 패치 | OXML 유틸 (`_set_cell_text`, `_replace_in_all_runs`, `_collect_tables`) 보존. 모든 `_fill_*()` 의 `idx` default 를 SSOT 기반으로 갱신 (또는 SSOT import) |
| `src/lib/services/export/hwpx/hwpx-payload-roadmap.ts` | 전면 재작성 (TDD) | `RoadmapVersion` (DB) + `RoadmapInterview` (V2 camelCase) → SSOT 의 모든 `py_key` 를 채운 snake_case dict. SSOT 자동 동기화 assertion. |
| `src/lib/services/export/hwpx/hwpx-payload-pbl.ts` | 전면 재작성 (TDD) | 동일 |
| `api/hwpx/test_placeholders_{roadmap,pbl}.py` | 전면 재작성 | 4 조합 회귀 (empty/max/special/long-korean) |
| `src/lib/services/export/hwpx/*.test.ts` | 부분 패치 | V2 + SSOT 동기화 assertion 추가 |

### Phase E — fixture 통합 검증

- `scripts/verify-hwpx-placeholders.ts` 신설 — 출력 HWPX 의 `{{...}}` 0건 grep 검증 (DoD #6)
- `api/hwpx/__fixtures__/{roadmap,pbl}-{full,edge}.json` — 모든 V2 필드 채운 정본 + 4 조합 융합
- 브리지 서버 + 한글 오피스 실물 검증 (스크린샷 → 보고서 첨부, DoD #7)

### Phase F — 회귀 테스트 + CI

- pytest 4 조합 + Vitest SSOT 동기화 + Playwright E2E (`tests/e2e/hwpx-download.spec.ts`)
- `npm run validate && npm run build` 통과 (CLAUDE.md 필수 규칙)

### Phase G — PR 생성 + verification-before-completion

- 보고서 최종화 (DoD #5/#6/#7/#9·#10 ✅ 전환)
- PR 제목: `feat(hwpx): V2 양식 1:1 정합 HWPX 템플릿·치환 로직 재구축 (#3)`
- 머지 전 `gh pr checks <PR>` 의 **모든 check** (Lint & Typecheck · Unit Test · Build · **E2E Test** · Vercel) pass 확인 (CLAUDE.md "PR CI 통과 판정 규칙" 엄수)

## 잔존 정리 대상 (선택)

- `scripts/port-hwpx-placeholders.py` — PR #26 잔존 (placeholder 이식 일회성 마이그). `scripts/archive/` 로 이동 또는 삭제.
- `scripts/fix-roadmap-i3-alignment.py` — 동일.
- 통합/대체본은 `scripts/insert_placeholders.py` (Phase C) 가 됨.

## 로컬 테스트 환경 (브리지 서버 — 검증된 방식)

```bash
# 최초 1 회만
npm run dev:hwpx:setup       # .venv-hwpx 생성 + python-hwpx 설치

# 매번
npm run dev:hwpx             # 터미널 A: HWPX 브리지 서버 (port 3010)
npm run dev:with-hwpx        # 터미널 B: Next.js dev + HWPX 프록시 (port 3000)
```

대안: Preview 배포 (git push → Vercel Preview URL) 에서 동일 검증 가능.

자세한 배경: `CLAUDE.md` 의 "HWPX 다운로드 로컬 테스트 규칙" 섹션.

## 사용 스킬·서브에이전트 권장

- **`hwpx-docgen`** — HWPX 편집·표 구성·검증 전반 필수
- **`superpowers:executing-plans`** 또는 **`superpowers:subagent-driven-development`** — Phase 단위 task 분할·실행
- **`superpowers:test-driven-development`** — `_placeholders_*.py` · payload TS 모두 TDD
- **`check-server-action`** — payload TS 가 Server Action 의존부에 영향 줄 경우
- **`superpowers:verification-before-completion`** — 머지 전 필수
- **`superpowers:systematic-debugging`** — generate.py 표 인덱스 mismatch 디버깅 시

## DoD (이 PR 머지 전 ✅ 만들어야 하는 항목)

- [x] DoD #5: 매핑 표 cross-check 누락 0건 (Phase B 에서 `verify-mapping-completeness.mjs` 통과)
- [ ] DoD #6: HWPX 출력에 `{{...}}` 0건 (Phase E `verify-hwpx-placeholders.ts` 통과 — Preview + 브리지 서버 양쪽)
- [ ] DoD #7: 한글 오피스 실물 확인 (Phase E 스크린샷 첨부)
- [ ] DoD #9·#10: `npm run validate && npm run build` + GitHub CI 전체 pass (Phase F·G)

## 진행 방식 (권장)

1. 위 "단일 통독 문서" 1 개 통독 → Phase C·D 의 실행 step 숙지
2. **Phase D 부터** 진행 권장 — 치환 로직 본체가 가장 큰 가치 (Phase C 의 placeholder 삽입은 D 진행 중 발견되는 필요에 따라 결정)
3. TDD: RED → GREEN → 단계별 commit (한국어 메시지 — feat/fix/refactor/test/chore)
4. 각 Phase 완료 후 `docs/reports/2026-04-25-form-parity-report.md` 누적 갱신
5. 머지 전 `verification-before-completion` 호출

진행해줘.
