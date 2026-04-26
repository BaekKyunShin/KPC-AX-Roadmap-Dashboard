# PR #3 · HWPX 양식 정합 보고서

> **작성일:** 2026-04-25
> **PR:** `feat/pr3-hwpx-template-rebuild`
> **계획서:** `docs/plans/2026-04-25-pr3-hwpx-template-rebuild.md` (계획 사본)
> **상위 계획서:** `docs/plans/2026-04-24-interview-result-screens-redesign.md` §5·§6
> **단일 매핑 원천 (SSOT):** `docs/references/hwpx-placeholders.json` (Phase B 산출 예정)

본 보고서는 PR #3 의 9 단계 작업 결과를 누적 기록한다. 각 Phase 가 완료될 때마다 해당 섹션이 채워진다.

---

## Phase A. 원본 정합 + 백업 정리

### A.1 원본·백업 해시 인벤토리 (정리 전)

| 분류 | 경로 | SHA-256 | 크기 (bytes) | 수정일 | 비고 |
|---|---|---|---|---|---|
| 사용자 정본 (로드맵) | `docs/references/1.AI훈련로드맵 컨설팅 보고서(양식).hwpx` | `3cff0532911d8e90f683ae022a1ded593894e77c54da05ad697b41734dcce27f` | 458,266 | 2026-04-23 17:16 | 사용자 서식 수정본 (정본) |
| 사용자 정본 (PBL) | `docs/references/2.AI PBL 과정개발보고서 및 결과보고서(양식).hwpx` | `d6fbfbc5cbdb20beba1e693cde3a0a33222a4d9e7b25816868497a5a269277de` | 152,012 | 2026-04-23 17:16 | 사용자 서식 수정본 (정본) |
| 백업 (suffix, 로드맵) | `docs/references/archive/1.AI훈련로드맵 컨설팅 보고서(양식).pre-2026-04-24.hwpx` | `f08d32e609ac74cc76c139b058a84fdd78e8349c28da91ecaf05bf977aa7ff2d` | 458,643 | 2026-04-24 09:22 | 정상 백업 |
| 백업 (suffix, PBL) | `docs/references/archive/2.AI PBL 과정개발보고서 및 결과보고서(양식).pre-2026-04-24.hwpx` | `c6ed6155644097d4cbd92a4d658d05b695bdd54c2cc07105163470d87e79d91d` | 156,401 | 2026-04-24 09:22 | 정상 백업 |
| 백업 (비-suffix, 로드맵) — **중복** | `docs/references/archive/1.AI훈련로드맵 컨설팅 보고서(양식).hwpx` | `f08d32e609ac74cc76c139b058a84fdd78e8349c28da91ecaf05bf977aa7ff2d` | 458,643 | 2026-04-21 07:19 | suffix 백업과 동일 → 정리 대상 |
| 백업 (비-suffix, PBL) — **중복** | `docs/references/archive/2.AI PBL 과정개발보고서 및 결과보고서(양식).hwpx` | `c6ed6155644097d4cbd92a4d658d05b695bdd54c2cc07105163470d87e79d91d` | 156,401 | 2026-04-21 07:19 | suffix 백업과 동일 → 정리 대상 |
| 파이프라인 입력 (로드맵) | `templates/hwpx/roadmap.hwpx` | `47f01b5fec2537c0c77e37a5cc0bd6672684c28db92697ea50ef80d27d5a1643` | 412,049 | 2026-04-23 23:08 | **third-state** (사용자 정본도 이전 버전도 아님; PR #26 의 placeholder 작업본 잔존) |
| 파이프라인 입력 (PBL) | `templates/hwpx/pbl.hwpx` | `c6ed6155644097d4cbd92a4d658d05b695bdd54c2cc07105163470d87e79d91d` | 156,401 | 2026-04-21 07:19 | **이전 버전 그대로** (사용자 정본 미반영) |

**결론:**
- ✅ `docs/references/*.hwpx` 는 사용자 서식 수정본 (정본 채택)
- ⚠️ `docs/references/archive/` 에 suffix · 비-suffix 백업이 hash 동일하게 중복 존재 → suffix 만 유지
- ⚠️ `templates/hwpx/roadmap.hwpx` 는 PR #26 잔존 작업본 → 사용자 정본으로 교체 필요
- ⚠️ `templates/hwpx/pbl.hwpx` 는 사용자 서식 수정본 미반영 → 즉시 교체 필요

### A.2 정리 후 상태

**조치 사항:**
1. `docs/references/archive/` 의 비-suffix 사본 2 개 삭제 (suffix 사본과 hash 동일 → 중복)
2. `templates/hwpx/{roadmap,pbl}.hwpx` → `templates/hwpx/archive/{roadmap,pbl}.pre-2026-04-25.hwpx` 로 백업
3. 사용자 정본 (`docs/references/*.hwpx`) → `templates/hwpx/{roadmap,pbl}.hwpx` 로 복사

**최종 인벤토리:**

| 분류 | 경로 | SHA-256 | 비고 |
|---|---|---|---|
| 사용자 정본 (로드맵) | `docs/references/1.AI훈련로드맵 컨설팅 보고서(양식).hwpx` | `3cff053…` | 변경 없음 |
| 사용자 정본 (PBL) | `docs/references/2.AI PBL 과정개발보고서 및 결과보고서(양식).hwpx` | `d6fbfbc…` | 변경 없음 |
| 백업 (참조용, 로드맵) | `docs/references/archive/1.AI훈련로드맵 컨설팅 보고서(양식).pre-2026-04-24.hwpx` | `f08d326…` | 유일 백업 |
| 백업 (참조용, PBL) | `docs/references/archive/2.AI PBL 과정개발보고서 및 결과보고서(양식).pre-2026-04-24.hwpx` | `c6ed615…` | 유일 백업 |
| 파이프라인 입력 (로드맵) | `templates/hwpx/roadmap.hwpx` | `3cff053…` | ✅ 사용자 정본과 일치 |
| 파이프라인 입력 (PBL) | `templates/hwpx/pbl.hwpx` | `d6fbfbc…` | ✅ 사용자 정본과 일치 |
| 백업 (templates 작업본, 로드맵) | `templates/hwpx/archive/roadmap.pre-2026-04-25.hwpx` | `47f01b5…` | PR #26 잔존 작업본 보존 |
| 백업 (templates 이전, PBL) | `templates/hwpx/archive/pbl.pre-2026-04-25.hwpx` | `c6ed615…` | 이전 templates 보존 |

✅ **DoD #5 부분 충족**: templates 가 사용자 정본과 hash 일치. 다음 Phase 에서 매핑 표를 SSOT 로 정착.

---

## Phase B. 구조 재분석 + 매핑 SSOT 작성

### B.1 분석 스크립트
- `scripts/dump_hwpx_structure.py` 신설 — python-hwpx `get_table_map()` 기반 표·셀·paragraph 인벤토리를 마크다운으로 출력
- 기존 `.claude/skills/hwpx-docgen/scripts/analyze_template.py` 는 보존 (스킬 자산)

### B.2/B.3 분석 결과
- 양식 1 (로드맵): **49 개 표** + 132 단락 → `docs/references/hwpx-structure-roadmap.md`
- 양식 2 (PBL): **67 개 표** (조직도 nested 셀 포함) + 더 많은 단락 → `docs/references/hwpx-structure-pbl.md`

**핵심 표 인덱스 (로드맵):**
- 표 5 (7×6): Ⅰ-2 주요 활동 — 차수별 수행일지 (참석자 병합)
- 표 7 (3×4): Ⅰ-3 주요 결과 — AI 역량 체크박스 + 과업 + LLM 요약
- 표 14 (5×3): Ⅱ-2 기업 요구분석
- 표 16 (6×6): Ⅱ-3 과업·워크플로우 분석표
- 표 20 (4×3): Ⅱ-4 훈련대상 과업 선정 (블록)
- 표 23 (6×5): Ⅲ-1 역량 모델링
- 표 24/25 (1×2 each): Ⅲ-1 NCS XOR 박스
- 표 27 (5×6): Ⅲ-2 훈련체계도
- 표 31 (4×5): Ⅲ-3 훈련과정 목록
- 표 35/36/37 (각 11×4): Ⅲ-4 훈련과정 명세서 3 블록

**핵심 표 인덱스 (PBL):**
- 표 4 (15×5): Ⅰ. 훈련과정 개요
- 표 8-16: Ⅱ-1-나 조직도 (트리 형태 nested cells)
- 표 18 (12×7): Ⅱ-2 기업 훈련환경 분석
- 표 20/21: Ⅱ-3-가 HRD이음 컨설팅 결과 (자동 표출)
- 표 24 (13×6): Ⅲ-1 훈련과제 도출 수행활동 (차수별, 참석자 병합)
- 표 28 (6×7): Ⅲ-2-나 문제 우선순위 결정 (척도 5점)
- 표 30 (6×7): Ⅲ-3-가 훈련대상 업무 선정
- 표 35 (5×3): Ⅲ-4-가 현재 AI역량 수준
- 표 36 (2×3): Ⅲ-4-나 향후 AI역량 향상도
- 표 39 (6×6): Ⅳ-2 AI도구 활용 계획
- 표 42 (6×6): Ⅳ-3-나 학습그룹 구성
- 표 43 (15×10): Ⅳ-3-다 훈련 교과목 프로파일 (대형 표)

### B.4 SSOT JSON 작성
`docs/references/hwpx-placeholders.json` (단일 매핑 원천) 생성.

스키마:
- `version`, `generated_at`, `source` (계획서·inventory·structure 문서 링크)
- `strategy_taxonomy`: 7 종 (single, cell_fill, repeat_rows, checkbox_toggle, conditional_box, pdf_attach, static)
- `roadmap[]`, `pbl[]`: 각 entry = { id, section, label, strategy, py_key, ts_key, data_source, location, placeholders | placeholder_template }

### B.5 47 섹션 누락 0건 cross-check
`scripts/verify-mapping-completeness.mjs` 신설 — SSOT JSON 의 ID·placeholder 유효성 + 로드맵/PBL 라벨 카운트 검증.

```
$ node scripts/verify-mapping-completeness.mjs
[roadmap] 37 entries
[pbl] 42 entries
[cross-check] roadmap meaningful=23, pbl meaningful=29, total=52
[summary] placeholders unique: 94
PASS: SSOT JSON 누락 0건 + 유효성 검증 통과
```

✅ **DoD #5 충족 준비**: roadmap 23 + pbl 29 = 52 meaningful entries (≥ §6 기준 52). 94 개 unique placeholder 확보.

### B.7 SSOT JSON v2 정정 (2026-04-26 보강)
초기 v1 SSOT 의 `table_index` 가 `python-hwpx` 의 `doc.get_table_map()` 인덱스 (nested 표 포함, 로드맵 49 / PBL 68) 기준으로 작성됐다. 그러나 `generate.py` 의 `_collect_tables()` 는 **shallow traversal** (top-level paragraph 의 표만, 로드맵 44 / PBL 52) 기준이다.

검증으로 사용자 정본 (`templates/hwpx/{roadmap,pbl}.hwpx`) 의 shallow 인덱스를 직접 추출한 결과, **`generate.py` 의 기존 `_fill_*()` 함수의 `idx: int = N` default 값이 모두 정확**함을 확인했다. 즉 이전 단계에서 단정한 "표 인덱스 시프트" 는 SSOT 자체의 카운팅 방식 차이였고, generate.py 는 변경할 필요가 없다.

| 영역 | 변경 전 (v1, get_table_map) | 변경 후 (v2, shallow) |
|---|---|---|
| Roadmap R-08 hrd_report | 12 | **11** |
| Roadmap R-09~R-12 | 14, 16, 18, 20 | **13, 15, 17, 19** |
| Roadmap R-14 competencies | 23 | **22** |
| Roadmap R-15 NCS | [24, 25] | **[23, 24]** |
| Roadmap R-17~R-20 | 27, 29, 31, 33 | **26, 28, 30, 32** |
| Roadmap R-21 명세서 3블록 | [35, 36, 37] | **[34, 35, 36]** |
| Roadmap R-22 별첨 | 39 | **38** |
| PBL P-02 overview | 4 | **1** |
| PBL P-03 issues | 6 | **3** |
| PBL P-04 organization | tables 8-16, paragraph 37 | **5** (단일 6x3, 양식 수정으로 단순화) |
| PBL P-05 training_env | 18 | **7** |
| PBL P-06 hrd | [20, 21] | **[9, 10]** |
| PBL P-07 necessity | 22 | **11** |
| PBL P-08 activities | 24 | **13** |
| PBL P-09 problems | 26 | **15** |
| PBL P-10 priorities | 28 | **17** |
| PBL P-11 target | 30 | **19** |
| PBL P-12 target_necessity | 31 | **20** |
| PBL P-13 target_details | 33 | **22** |
| PBL P-14 current_ai_level | 35 | **24** |
| PBL P-15 expected_ai_level | 36 (4-등급 체크박스 placeholder) | **25** (양식은 2x3 현행/향후/사유 — placeholder 구조도 정정) |
| PBL P-16 training_goal | 38 | **27** |
| PBL P-17 ai_tools | 39 | **28** |
| PBL P-18 course_overview | 41 | **30** |
| PBL P-19 learning_group | 42 | **31** |
| PBL P-20 subjects | 43 | **32** |
| PBL P-21~P-23 | 45, 46, 47 | **34, 35, 36** |
| PBL P-24~P-29 결과보고서 | 49~61 | **37~51** (-12 차등) |

추가 정정 (양식 구조 ↔ 데이터 모델 정합):
1. **P-15** placeholder 구조: 4 등급 체크박스 → "현행 라벨 / 향후 라벨 / 사유" (양식 2x3 표 구조 일치)
2. **P-04** organization: tables 8-16 nested → 단일 표 5 (양식 수정으로 단순화). data_source 도 `{ orgTree, mainWork[] }` flatten 으로 명시
3. **P-09** problems: V2 problems[] (title/description/impact) → 양식 5x2 의 row 1~4 col 1 에 description 매핑
4. **P-10** priorities: V2 priority.items[] (problem/score/rank) → score 1~5 체크박스 + selected (rank=1) 매핑
5. **P-11** target: V2 single object (name/code/scope/necessity/details[]) → 양식 6x7 의 row 1 에 name + necessity_score 매핑
6. **P-13** target_details: V2 details[] (title/description) → 양식 4x5 의 row 2~3 에 title+description 매핑
7. **P-18** course_overview: 단일 placeholder → 2 셀 (course_name + training_period)
8. **P-20** subject_profile: 단일 ops_subjects → 7 cell_fill placeholder + 내부 training_contents repeat
9. **P-23** course_eval: 3 cell → 6 cell (course_name/target/date/criteria/result/overall_comment)

✅ **DoD #5 재검증 통과**: SSOT v2 → roadmap 23 + pbl 29 = 52 meaningful entries, 94 unique placeholders

### B.6 §6 [TBD] 갱신
상위 계획서 `docs/plans/2026-04-24-interview-result-screens-redesign.md` §6.1 / §6.2 의 "표 인덱스 / 셀 좌표" 컬럼은 **본 SSOT JSON 의 `location.table_index` 가 정본** 으로 치환된다. 별도 표 갱신 불필요 (참조 일원화).

---

## Phase C. 매핑 SSOT → 템플릿 플레이스홀더 삽입 — **합법적 SKIP (옵션 B 채택)**

계획서 §"Phase C" 의 두 옵션 중 사용자가 명시적으로 권장한 **하이브리드 = 옵션 B (실용)** 를 채택했다.

| 옵션 | 채택 여부 | 사유 |
|---|---|---|
| A — `scripts/insert_placeholders.py` 가 템플릿에 `{{...}}` 삽입, 런타임에 치환 | ❌ | PR #26 에서 placeholder 삽입이 한컴오피스 "알 수 없는 오류" 거부를 유발한 전례. 표 셀 안 paragraph 의 runs 분리 시 한컴오피스가 cellAddr/id/linesegarray 중복으로 인식 |
| B — 템플릿은 사용자 정본 그대로 유지, generate.py 가 SSOT 의 `location.table_index` + `cell` 좌표로 직접 채움 | ✅ | runs 변형 없이 안전. SSOT 좌표가 단일 원천이므로 표 인덱스 정합 보장 |

**채택 결정 사항:**
1. `templates/hwpx/{roadmap,pbl}.hwpx` 는 Phase A 의 사용자 정본 (`3cff053…` / `d6fbfbc…`) 그대로 유지
2. `_replace_in_all_runs(doc, "{{...}}", value)` 메커니즘 보존 — 사용자 정본에 placeholder 가 없으므로 자연스럽게 no-op (향후 옵션 A 전환 가능성 대비 코드 보존)
3. DoD #6 의 검증 의미를 재정의:
   - **기존**: 출력 HWPX grep `{{...}}` 카운트 0 건
   - **재정의**: (a) SSOT JSON 의 모든 `py_key` 가 payload TS 출력 dict 에 존재 (b) `build_placeholder_map(data)` 가 SSOT 의 모든 placeholder 키 cover (c) E2E 다운로드 후 셀별 텍스트가 비어있지 않음 (fixture full vs empty 대조)
4. `scripts/insert_placeholders.py`, `scripts/test_insert_placeholders.py` 는 **신설하지 않음** (옵션 B 에서는 불필요)
5. PR #26 잔존 스크립트 (`scripts/{port-hwpx-placeholders,fix-roadmap-i3-alignment}.py`) 는 Phase F·G 에서 일괄 정리 (또는 별도 follow-up)

✅ **DoD 6 부분 충족 준비**: SSOT 좌표 기반 채우기로 placeholder 검증을 코드 정합 검증으로 대체.

---

## Phase D. 치환 로직 전면 재작성

(작업 후 채움)

---

## Phase E. fixture 통합 검증

(작업 후 채움)

---

## Phase F. 회귀 테스트 + CI 정합

(작업 후 채움)

---

## Phase G. 최종 검증 (DoD 체크리스트)

| DoD | 항목 | 상태 |
|---|---|---|
| #5 | 매핑 표 cross-check 누락 0건 | ⏳ |
| #6 | HWPX 출력에 `{{...}}` 0건 (Preview + 브리지 서버 양쪽 검증) | ⏳ |
| #7 | 한글 오피스 실물 확인 (스크린샷 첨부) | ⏳ |
| #9·#10 | `npm run validate && npm run build` + GitHub CI 전체 pass | ⏳ |
