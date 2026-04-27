# PR #3 — HWPX 템플릿 재구축 실행 계획

> **착수 프롬프트:** `docs/prompts/archive/2026-04-25-pr3-hwpx-template-rebuild.md`
> **상위 계획서:** `docs/plans/archive/2026-04-24-interview-result-screens-redesign.md` §5·§6
> **승인 후 사본:** 본 계획을 `docs/plans/archive/2026-04-25-pr3-hwpx-template-rebuild.md` 로도 저장하여 프로젝트 컨벤션을 유지합니다.
> **실행 모드:** `superpowers:subagent-driven-development` (Phase 단위 병렬 가능 영역 식별 후 dispatch)

---

## Context (왜 이 작업이 필요한가)

KPC AI 훈련 로드맵 대시보드는 산인공 공식 양식 1번(로드맵)·2번(PBL) 과 1:1 정합하는 한글(.hwpx) 보고서를 산출하는 B2B 도구다. PR #28 (sha c44fbde, 2026-04-25) 머지로 4개 화면(로드맵·PBL × 인터뷰·결과)의 V2 양식 1:1 재설계가 완료됐으나, **HWPX 출력 파이프라인은 여전히 V1 템플릿 + V1 치환 로직** 위에서 동작한다.

진단 (Phase 1 탐색 결과):

| 자산 | 상태 | 영향 |
|---|---|---|
| `templates/hwpx/roadmap.hwpx` (412KB, sha 47f01b5…) | 사용자 정본도 archive 도 아닌 third-state. PR #26 작업본 잔존 | 사용자가 서식 수정한 정본(458KB, sha 3cff053…) 미반영 |
| `templates/hwpx/pbl.hwpx` (156KB, sha c6ed615…) | archive 와 동일 = 이전 버전 그대로 | 사용자 서식 수정본(152KB, sha d6fbfbc…) 완전 미반영 |
| `docs/references/archive/*.hwpx` | 백업본이 `.pre-2026-04-24.hwpx` 와 비-suffix 양쪽으로 중복 존재 | 정리 필요 |
| `api/hwpx/_placeholders_roadmap.py` (V1, 16개 단순 키) | V2 의 신규 필드 (수행활동·훈련체계도·연간계획·교과목 시간 등) 미커버 | DoD #5 (47섹션 cross-check 누락 0건) 미충족 |
| `api/hwpx/_placeholders_pbl.py` (V1, 31개 단순 키) | V2 PBL 인터뷰 신규 필드 (조직도 트리·문제 우선순위·AI역량 4등급 등) 미커버 | 동일 |
| `api/hwpx/generate.py` (1411줄) | 표 인덱스·셀 좌표 하드코딩 (idx=1,3,5,…) | 사용자 서식 수정본 적용 시 표 인덱스 재검증 필수 |
| `src/lib/services/export/hwpx/hwpx-payload-{roadmap,pbl}.ts` | V2 인터뷰 (camelCase) → Python payload (snake_case) 변환 일부 누락 | V2 신규 필드 누락 시 grep `{{...}}` 0건 미달 |
| `scripts/port-hwpx-placeholders.py` · `fix-roadmap-i3-alignment.py` | PR #26 의 일회성 잔존 스크립트 | 신규 `insert_placeholders.py` 로 통합 후 정리 대상 |

이번 PR 의 목표는 **"인터뷰에서 입력한 모든 값 + 결과 페이지에서 LLM 이 생성한 모든 값"이 한 개도 빠짐없이 한글 양식에 1:1 매핑되어 치환되지 않은 `{{…}}` 가 0건이 되는 상태**를 한글 오피스 실물 검증까지 마치는 것이다(상위 계획서 §5 9 단계 그대로).

---

## Recommended Approach (전체 전략)

**원칙:** 분석 우선 → 매핑 표 확정 → 매핑 표 단일 원천(SSOT) → 양쪽(템플릿/치환 로직) 재작성 → 4 단계 검증.

**핵심 SSOT 구조:**

```
docs/references/hwpx-placeholders.json     ← 단일 매핑 원천 (Step 4 산출)
        │
        ├─→ scripts/insert_placeholders.py  → templates/hwpx/{roadmap,pbl}.hwpx 에 {{…}} 삽입
        │                                      (생성 단계, 한 번 실행 후 템플릿에 영구 반영)
        │
        ├─→ api/hwpx/_placeholders_roadmap.py · _placeholders_pbl.py 의 키 검증 (런타임 import)
        │                                      → 매핑 JSON 의 모든 키가 build_placeholder_map 결과에 존재하는지 assertion
        │
        └─→ scripts/verify-hwpx-placeholders.ts → 출력 HWPX 에 {{…}} 0건 검증 (CI)
```

이 구조의 이점:
1. JSON 매핑 표가 변경되면 (a) 템플릿 재삽입 (b) Python build_map 검증 (c) verify 스크립트 모두 동기화됨
2. 사용자 서식 재수정 → analyze_template.py 재실행 → JSON 갱신만으로 재진입 가능
3. 회귀 테스트가 매핑 표를 직접 검증하므로 누락 0건이 CI 로 강제됨

**전면 재작성 vs 부분 패치 결정:**

| 영역 | 결정 | 사유 |
|---|---|---|
| `templates/hwpx/*.hwpx` | **전면 재교체** | 사용자 서식 수정본을 정본으로 채택 |
| `docs/references/hwpx-placeholders.json` | **신규 작성** | 단일 원천 도입 |
| `scripts/insert_placeholders.py` | **신규 작성** | 매핑 JSON 기반 일관 삽입 + TDD grep count 검증 |
| `api/hwpx/_placeholders_{roadmap,pbl}.py` | **전면 재작성** | V2 스키마 + camelCase→snake_case 정합 |
| `src/lib/services/export/hwpx/hwpx-payload-{roadmap,pbl}.ts` | **전면 재작성** | V2 인터뷰·결과 → snake_case payload 키 정합 |
| `api/hwpx/generate.py` | **부분 패치** | OXML 조작 유틸(`_set_cell_text`, `_replace_in_all_runs`)은 검증된 자산. `_generate_*` 진입점 + `_fill_*` 함수의 표 인덱스/셀 좌표만 Step 3 분석 결과 기반으로 갱신 |
| `scripts/port-hwpx-placeholders.py` · `fix-roadmap-i3-alignment.py` | **삭제** (또는 `scripts/archive/` 이동) | 일회성 마이그레이션 완료, 신규 SSOT 로 대체 |
| `api/hwpx/test_placeholders_{roadmap,pbl}.py` | **전면 재작성** | V2 키 + 4조합(empty/max/special/long-korean) 회귀 |
| `src/lib/services/export/hwpx/*.test.ts` | **부분 패치** | V2 payload 키 변경분 갱신 |
| `tests/e2e/hwpx-download.spec.ts` | **신규 또는 갱신** | Playwright E2E (브리지 서버 + Preview 양쪽 검증) |

---

## Implementation Phases

각 Phase 는 `superpowers:subagent-driven-development` 의 1 task ≒ 1 subagent 단위로 분할 가능. Phase 내 task 는 가능한 한 TDD (RED → GREEN → COMMIT). 단, 일회성 마이그레이션 (Phase A 의 파일 복사·해시 검증) · 분석 산출 (Phase B 의 analyze_template 실행) 은 TDD 예외.

### Phase A — 원본 정합 + 백업 정리 (Step 1-2)

**Files:**
- Create: `docs/reports/2026-04-25-form-parity-report.md` (해시·크기·날짜 기록 + 이후 phase 결과 누적)
- Modify: `docs/references/archive/` (중복 백업 정리)
- Replace: `templates/hwpx/roadmap.hwpx`, `templates/hwpx/pbl.hwpx`
- Move: `templates/hwpx/{roadmap,pbl}.hwpx` → `templates/hwpx/archive/{roadmap,pbl}.pre-2026-04-25.hwpx`

**Tasks:**

A.1 **원본·백업 해시 검증 + 보고서 생성**
- `shasum -a 256` 으로 7개 파일 해시 기록 (`docs/references/{현재,archive/*.pre-2026-04-24,archive/비-suffix}` × 2 양식 + `templates/hwpx/*` × 2)
- `docs/reports/2026-04-25-form-parity-report.md` 상단에 "원본 교체 확인" 섹션 작성
- `docs/references/archive/` 의 중복 (suffix 와 비-suffix) 중 **`.pre-2026-04-24.hwpx` 만 유지**, 비-suffix 사본은 `git rm` (혼동 방지)

A.2 **templates 디렉터리 백업 + 새 정본 복사**
- `mkdir -p templates/hwpx/archive`
- `git mv templates/hwpx/roadmap.hwpx templates/hwpx/archive/roadmap.pre-2026-04-25.hwpx`
- `git mv templates/hwpx/pbl.hwpx     templates/hwpx/archive/pbl.pre-2026-04-25.hwpx`
- `cp "docs/references/1.AI훈련로드맵 컨설팅 보고서(양식).hwpx" templates/hwpx/roadmap.hwpx`
- `cp "docs/references/2.AI PBL 과정개발보고서 및 결과보고서(양식).hwpx" templates/hwpx/pbl.hwpx`
- `git add` + 해시 재확인 (사용자 정본과 일치)
- 커밋: `chore: HWPX 템플릿 정본 교체 및 이전 버전 백업`

**Verification:**
- `shasum -a 256 templates/hwpx/*.hwpx` 결과가 `docs/references/*.hwpx` 해시와 일치
- `git status` 에 `templates/hwpx/archive/*` 신규 파일 표시

---

### Phase B — 구조 재분석 + 매핑 SSOT 작성 (Step 3-4)

**Files:**
- Create: `docs/references/hwpx-structure-roadmap.md` (analyze_template 출력)
- Create: `docs/references/hwpx-structure-pbl.md`
- Create: `docs/references/hwpx-placeholders.json` (단일 원천)
- Modify: `docs/plans/archive/2026-04-24-interview-result-screens-redesign.md` §6 의 [TBD] 컬럼 채움

**Tasks:**

B.1 **`.claude/skills/hwpx-docgen/scripts/analyze_template.py` 확장 (필요 시)**
- 현재 스크립트는 표 개수 + 플레이스홀더만 출력. **표별 행·열·셀 좌표 + paragraph 인덱스 + 서식 ID** 까지 출력하도록 확장
- 옵션: `--output <path>` 추가하여 마크다운 보고서 저장 가능하게 함
- **TDD**: pytest 로 sample HWPX 에 대해 표 N 개·셀 (i,j) 좌표가 정확히 추출되는지 검증
- 단, 이 확장이 과도하면 별도 스크립트 `scripts/dump_hwpx_structure.py` 를 신설하는 것이 더 깔끔. **결정**: 별도 스크립트 신설 (스킬 자산 보존).

B.2 **양식 1 (로드맵) 구조 분석**
- `python scripts/dump_hwpx_structure.py templates/hwpx/roadmap.hwpx --output docs/references/hwpx-structure-roadmap.md`
- 출력 내용: (a) 표 인덱스 + 행×열 (b) 각 셀의 (row, col, rowspan, colspan) (c) 셀 내 paragraph 텍스트 1 줄 미리보기 (d) 본문 paragraph 인덱스
- 결과 검토: 사용자 서식 수정으로 표 개수·인덱스가 변경됐는지 확인. 변경 시 §6 매핑 표 [TBD] 갱신.

B.3 **양식 2 (PBL) 구조 분석**
- 동일 명령으로 `pbl.hwpx` 분석 → `docs/references/hwpx-structure-pbl.md`

B.4 **매핑 SSOT JSON 작성** (`docs/references/hwpx-placeholders.json`)
- 스키마:
  ```json
  {
    "roadmap": [
      {
        "id": "R-03",
        "section": "Ⅰ-1 수립 필요성",
        "label": "interview-input",
        "placeholder": "{{roadmap_overview_establishment_necessity}}",
        "strategy": "single",
        "location": { "type": "paragraph", "paragraph_index": 47 },
        "data_source": "RoadmapInterview.overview.establishmentNecessity",
        "py_key": "establishment_necessity",
        "ts_key": "establishmentNecessity"
      },
      {
        "id": "R-04",
        "section": "Ⅰ-2 주요 활동",
        "label": "interview-input",
        "placeholder_template": "{{roadmap_overview_performance_{i}_round}}",
        "strategy": "repeat_rows",
        "location": { "type": "table", "table_index": 5, "row_start": 2, "row_end": 7, "max_rows": 3 },
        "row_columns": [
          { "col": 0, "field": "round", "format": "{n}차" },
          { "col": 1, "field": "date" },
          { "col": 2, "field": "content" },
          { "col": 3, "field": "method" },
          { "col": 4, "field": "pmName" },
          { "col": 5, "field": "expertName" }
        ],
        "data_source": "RoadmapInterview.overview.performanceActivities[]",
        "py_key": "performance_activities",
        "ts_key": "performanceActivities"
      },
      ...
    ],
    "pbl": [...]
  }
  ```
- 상위 계획서 §6.1 (R-01~R-23) + §6.2 (P-01~P-29) 의 모든 행을 변환. `[TBD]` 컬럼은 Phase B.2/B.3 분석 결과로 채움.

B.5 **47 섹션 누락 0건 cross-check**
- `docs/references/2026-04-23-current-fields-inventory.md` 의 47 섹션 라벨 ↔ JSON `id` 양방향 매핑 확인
- 자동화: 작은 Python/Node 스크립트로 양쪽 ID 집합 diff → 누락 0건 assertion
- 누락 발견 시 JSON 확장. 확장 후 §6 표도 동기화.

B.6 **상위 계획서 §6 [TBD] 컬럼 갱신**
- `docs/plans/archive/2026-04-24-interview-result-screens-redesign.md` §6.1·6.2 의 "표 인덱스 / 셀 좌표" 컬럼을 분석 결과로 채움
- 커밋: `docs: HWPX 구조 재분석 + 매핑 표 cross-check 완료`

**Verification:**
- `jq 'length' docs/references/hwpx-placeholders.json` (roadmap + pbl 합계 ≥ 60)
- 누락 검증 스크립트 0 exit (Phase B.5)

---

### Phase C — 매핑 SSOT → 템플릿 플레이스홀더 삽입 (Step 5)

**Files:**
- Create: `scripts/insert_placeholders.py` (TDD)
- Create: `scripts/test_insert_placeholders.py` (pytest)
- Modify: `templates/hwpx/roadmap.hwpx`, `templates/hwpx/pbl.hwpx` (플레이스홀더 삽입된 상태로 갱신)
- Delete (or move to scripts/archive/): `scripts/port-hwpx-placeholders.py`, `scripts/fix-roadmap-i3-alignment.py`

**Tasks:**

C.1 **`scripts/insert_placeholders.py` 신규 작성 (TDD)**
- 입력: `--mapping docs/references/hwpx-placeholders.json --template <path> --output <path>`
- 동작:
  - JSON 의 각 항목을 location 타입별로 분기:
    - `paragraph`: `doc.paragraphs[idx]` 의 텍스트를 placeholder 로 치환 (서식 보존)
    - `table` + `single`: `tbl.cell(row, col)` 텍스트 치환
    - `table` + `repeat_rows`: 지정 행 범위의 각 셀에 `{{…_{i}_field}}` 패턴으로 채움
    - `checkbox`: 양식의 `□` 심볼이 있는 위치를 그대로 두고 `{{…_check}}` 를 빈 단락에 삽입(런타임에 ☑/☐ 토글)
- **runs 분리 방지**:
  - python-hwpx 의 `replace_text_in_runs(old, new)` 사용 (서식 덩어리 1개 단위로 작성)
  - 삽입 직후 `re.findall(r'\{\{[^}]+\}\}', export_text)` 로 카운트 == 기대치 검증 → 미스매치 시 fail-fast
- TDD 케이스 (`scripts/test_insert_placeholders.py`):
  - 작은 테스트용 HWPX (1 표·3 paragraph) 픽스처에 대해 paragraph 치환 → grep count == 기대치
  - table single → cell 텍스트 변경 확인
  - table repeat_rows → N 행에 `_{i}_` 패턴 삽입 확인
  - 런타임 검증: 삽입 후 export_text 의 placeholder 개수 == JSON 항목 개수 (with multiplicity for repeat)

C.2 **로드맵 템플릿에 일괄 삽입**
- `python scripts/insert_placeholders.py --mapping docs/references/hwpx-placeholders.json --template templates/hwpx/roadmap.hwpx --output templates/hwpx/roadmap.hwpx --track roadmap`
- (in-place 갱신; git diff 로 변경 확인)
- `unzip -p templates/hwpx/roadmap.hwpx Contents/section0.xml | grep -c '{{'` 로 삽입 개수 검증

C.3 **PBL 템플릿에 일괄 삽입**
- 동일 명령 (track=pbl)

C.4 **잔존 스크립트 정리**
- `git mv scripts/port-hwpx-placeholders.py scripts/archive/`
- `git mv scripts/fix-roadmap-i3-alignment.py scripts/archive/`
- 또는 명시적 삭제 (사용자 선호 확인)
- 커밋: `feat(hwpx): 매핑 SSOT 기반 플레이스홀더 일괄 삽입 + 잔존 스크립트 정리`

**Verification:**
- `pytest scripts/test_insert_placeholders.py -v` 100% pass
- 양쪽 템플릿의 `{{` 카운트 == JSON 기대치
- python-hwpx `validate()` PASS (서식 깨짐 없음)
- 한글 오피스에서 양쪽 템플릿을 직접 열어 placeholder 가 본문에 정상 노출되는지 시각 확인 (스크린샷 → `docs/reports/2026-04-25-form-parity-report.md` 첨부)

---

### Phase D — 치환 로직 재작성 (Step 6-7)

**Files:**
- Rewrite: `api/hwpx/_placeholders_roadmap.py`
- Rewrite: `api/hwpx/_placeholders_pbl.py`
- Modify: `api/hwpx/generate.py` (의 `_generate_roadmap`, `_generate_pbl`, `_fill_*`)
- Rewrite: `src/lib/services/export/hwpx/hwpx-payload-roadmap.ts`
- Rewrite: `src/lib/services/export/hwpx/hwpx-payload-pbl.ts`
- Update: `api/hwpx/test_placeholders_roadmap.py`, `test_placeholders_pbl.py`
- Update: `src/lib/services/export/hwpx/hwpx-payload-{roadmap,pbl}.test.ts`

**Tasks:**

D.1 **`api/hwpx/_placeholders_roadmap.py` 전면 재작성 (TDD)**
- 입력: TS 측에서 보낸 snake_case payload dict (V2 인터뷰·결과 모두 포함)
- 출력:
  - `build_placeholder_map(data) -> dict[str, str]`: SSOT JSON 의 모든 single/checkbox placeholder 키 커버
  - `build_table_rows(data, key) -> list[dict]`: SSOT JSON 의 모든 repeat_rows 항목 커버
- 체크박스 토글:
  - `{{roadmap_overview_ai_level_beginner_check}}` 등 3 등급 (BEGINNER/INTERMEDIATE/ADVANCED)
- NCS XOR 박스: 기존 패턴 유지 + fallback 문구
- HRD 첨부 분기: `{{roadmap_requirements_hrd_report_attachment}}` — 첨부 시 빈 문자열 (PDF 첨부 페이지로 대체) / 미첨부 시 fallback
- **TDD**: 모든 SSOT 키 ↔ build_map 결과 키 일치 assertion (`set(build_map.keys()) == set(json_keys)`)

D.2 **`api/hwpx/_placeholders_pbl.py` 전면 재작성 (TDD)**
- 동일 패턴
- 추가 분기:
  - 현재/향후 AI역량 4등급 × 2 = 8 체크박스 (`pbl_tasks_current_ai_level_*_check`, `pbl_tasks_expected_ai_level_*_check`)
  - 조직도 트리 → flatten 행 변환
  - 차수별 수행활동 (최대 N 차)

D.3 **`api/hwpx/generate.py` 의 `_generate_*` + `_fill_*` 갱신**
- 표 인덱스를 SSOT JSON 의 `location.table_index` 값으로 치환 (하드코딩 제거 → 매핑 JSON 로드 후 사용)
- 새 표/셀 좌표 반영 (사용자 서식 수정으로 변경된 부분)
- `_replace_in_all_runs` / `_set_cell_text` 유틸은 수정 없음
- TDD: fixture payload 입력 → 결과 HWPX 의 `{{` 카운트 == 0 assertion

D.4 **`hwpx-payload-roadmap.ts` 전면 재작성 (TDD)**
- 입력: `RoadmapVersion` (snake_case DB) + `RoadmapInterview` (camelCase V2)
- 출력: SSOT JSON 의 모든 `py_key` 를 채운 snake_case dict
- camelCase → snake_case 변환은 명시적 매핑 (자동 변환 함수 도입 시 부수 효과 위험)
- TDD: SSOT JSON 의 모든 `py_key` 가 출력 dict 에 존재 assertion (테스트가 SSOT 와 직접 동기화됨)

D.5 **`hwpx-payload-pbl.ts` 전면 재작성 (TDD)**
- 동일 패턴

D.6 **회귀 테스트 4 조합 추가**
- `api/hwpx/test_placeholders_{roadmap,pbl}.py`:
  - empty: 모든 필드 빈 값/`null` → fallback 문자열로 변환됨
  - max: 10000 자 한글 → XML 깨짐 없음
  - special: `<>&"'` → XML escape 정상
  - long-korean: 한글 5000 자 → 단락 줄바꿈 정상
- `hwpx-payload-{roadmap,pbl}.test.ts`:
  - 4 조합 + V2 신규 필드 추가 케이스

**Verification:**
- `pytest api/hwpx/ -v` 100% pass
- `npm run test -- src/lib/services/export/hwpx/` 100% pass
- 커밋: `feat(hwpx): V2 스키마 정합 치환 로직 전면 재작성 + 회귀 테스트 4 조합`

---

### Phase E — fixture 통합 검증 (Step 8)

**Files:**
- Create: `scripts/verify-hwpx-placeholders.ts` (또는 `.mjs` — Node/TS 환경에 맞게)
- Create: `api/hwpx/__fixtures__/roadmap-full.json`, `pbl-full.json` (모든 필드 채운 정본)
- Create: `api/hwpx/__fixtures__/roadmap-edge.json`, `pbl-edge.json` (4 조합 융합)
- Update: `docs/reports/2026-04-25-form-parity-report.md` (스크린샷·grep 결과 첨부)

**Tasks:**

E.1 **`scripts/verify-hwpx-placeholders.ts` 신규 작성**
- 입력: HWPX 파일 경로
- 동작: unzip → `Contents/section0.xml` (그리고 추가 section*.xml) 에서 `{{[^}]+}}` 패턴 grep
- 출력: 0 건이면 exit 0, 1 건 이상이면 stderr 에 위치·키 출력 후 exit 1
- TDD: 알려진 placeholder 가 포함된 sample HWPX 입력 → exit 1 + 정확한 키 출력 확인

E.2 **로드맵 fixture 정본 작성** (`__fixtures__/roadmap-full.json`)
- 기존 `src/lib/services/roadmap/__fixtures__/sample-llm-response.json` 기반
- 모든 V2 인터뷰·결과 필드 채움 (47 섹션 전수)
- 모든 체크박스·반복행·조건부 박스 케이스 커버

E.3 **PBL fixture 정본 작성** (`__fixtures__/pbl-full.json`)
- 동일 패턴

E.4 **브리지 서버 + 한글 오피스 실물 검증**
- `npm run dev:hwpx:setup` (최초 1 회)
- `npm run dev:hwpx` (브리지 서버) + 별 터미널에서 `npm run dev:with-hwpx`
- POST `/api/hwpx/generate` with full fixture → HWPX 다운로드
- `tsx scripts/verify-hwpx-placeholders.ts <downloaded.hwpx>` exit 0 확인
- 한글 오피스에서 직접 열어 다음 검증 + 스크린샷 (Figma·Preview.app 양쪽 가능):
  - ① 사용자 서식(폰트·줄간격·들여쓰기) 유지
  - ② 표 병합 양식 PDF 와 동일
  - ③ 체크박스·반복 행·조건부 박스 토글 정상
  - ④ `{{…}}` 0 건 (verify 스크립트 통과)
- 스크린샷 → `docs/reports/2026-04-25-form-parity-report.md` 첨부

E.5 **HWPX → PDF 변환 픽셀 비교**
- 한글 오피스 또는 LibreOffice 로 PDF 변환
- 양식 PDF (`docs/references/*.pdf`) 와 Preview.app split view 로 시각 비교
- 결과 보고서에 첨부 (선택적, PR #4 의 PDF 1:1 대조 리포트와 중첩되므로 본 PR 은 핵심 페이지 1-2 장만)

**Verification:**
- verify 스크립트 exit 0
- 스크린샷 보고서 검토 ✅
- 커밋: `test(hwpx): fixture 정본 + verify 스크립트 + 실물 검증 보고서`

---

### Phase F — 회귀 테스트 + CI 정합 (Step 9)

**Files:**
- Update: `api/hwpx/test_placeholders_{roadmap,pbl}.py` (Phase D.6 에서 시작, 보강)
- Update: `src/lib/services/export/hwpx/*.test.ts`
- Create or Update: `tests/e2e/hwpx-download.spec.ts` (Playwright)
- Update: `.github/workflows/*.yml` (필요 시 — pytest 추가)

**Tasks:**

F.1 **Python pytest 보강**
- 4 조합 (empty/max/special/long-korean) × 모든 매핑 항목
- 파일 크기 > 50KB assertion (placeholder 치환 후 정상 출력 확인)

F.2 **Vitest 보강**
- `hwpx-payload-{roadmap,pbl}.test.ts` 에 SSOT JSON 키 자동 동기화 assertion 추가
  - `expect(Object.keys(result.data)).toEqual(expect.arrayContaining(jsonKeys))`

F.3 **Playwright E2E 신규 또는 갱신** (`tests/e2e/hwpx-download.spec.ts`)
- 시나리오 1: 컨설턴트로 로그인 → 로드맵 인터뷰 → 결과 → HWPX 다운로드 → 파일 크기 검증
- 시나리오 2: 동일 PBL 플로우
- 다운로드된 HWPX 에 대해 grep `{{` 검증 (in-test 파일 처리)

F.4 **CI 워크플로 확인**
- `.github/workflows/test.yml` (또는 동등) 에 pytest 단계가 있는지 확인
- 없으면 추가: `cd api/hwpx && pytest -v`
- E2E 잡이 새 spec 을 picks up 하는지 확인

F.5 **`npm run validate && npm run build` 통과 확인**
- typecheck + lint + test + build 4 단계 모두 pass
- 커밋: `test(hwpx): 4 조합 회귀 + E2E + CI 통합`

**Verification:**
- `npm run validate` exit 0
- `npm run build` exit 0
- `pytest api/hwpx/ -v` exit 0
- `npm run test:e2e -- tests/e2e/hwpx-download.spec.ts` exit 0

---

### Phase G — PR 생성 + verification-before-completion

**Tasks:**

G.1 **`docs/reports/2026-04-25-form-parity-report.md` 최종화**
- Phase A (해시) ~ Phase F (CI 결과) 누적 기록
- DoD #5/#6/#7/#9·#10 체크박스 모두 ✅ 처리

G.2 **사용자 승인 후 본 계획서를 `docs/plans/archive/2026-04-25-pr3-hwpx-template-rebuild.md` 로 저장**
- 프로젝트 컨벤션 (`YYYY-MM-DD-kebab-case.md`) 준수
- 실행 진행상황 누적 기록 가능

G.3 **PR 생성**
- PR 제목: `feat(hwpx): V2 양식 1:1 정합 HWPX 템플릿·치환 로직 재구축 (#3)`
- PR 본문:
  - Summary: 9 단계 요약 + 매핑 표 47 섹션 cross-check 완료 + 한글 오피스 실물 검증
  - Test plan: validate / build / pytest / E2E 결과
  - DoD checkbox 4 개 모두 ✅
  - 첨부: `docs/reports/2026-04-25-form-parity-report.md` 링크 + 핵심 스크린샷

G.4 **`superpowers:verification-before-completion` 호출**
- 머지 전 모든 CI check (Lint & Typecheck · Unit Test · Build · E2E Test · Vercel) pass 확인
- `gh pr checks <PR>` 의 모든 check 가 pass 인지 명시적 확인 (CLAUDE.md 의 "PR CI 통과 판정 규칙" 준수)

---

## Critical Files (수정·생성 요약)

| 액션 | 경로 | 비고 |
|---|---|---|
| Replace | `templates/hwpx/roadmap.hwpx` | 사용자 서식 수정본 |
| Replace | `templates/hwpx/pbl.hwpx` | 사용자 서식 수정본 |
| Move | `templates/hwpx/{roadmap,pbl}.hwpx` → `archive/*.pre-2026-04-25.hwpx` | 백업 |
| Create | `docs/references/hwpx-structure-roadmap.md` | analyze 출력 |
| Create | `docs/references/hwpx-structure-pbl.md` | 동일 |
| Create | `docs/references/hwpx-placeholders.json` | **단일 원천 (SSOT)** |
| Create | `scripts/dump_hwpx_structure.py` | 분석 스크립트 |
| Create | `scripts/insert_placeholders.py` | SSOT → 템플릿 삽입 (TDD) |
| Create | `scripts/verify-hwpx-placeholders.ts` | 출력 검증 (CI) |
| Move/Delete | `scripts/{port-hwpx-placeholders,fix-roadmap-i3-alignment}.py` | PR #26 잔존 정리 |
| Rewrite | `api/hwpx/_placeholders_roadmap.py` | V2 정합 |
| Rewrite | `api/hwpx/_placeholders_pbl.py` | V2 정합 |
| Modify | `api/hwpx/generate.py` (특히 `_generate_*` + `_fill_*`) | 표 인덱스/셀 좌표 SSOT 기반 |
| Rewrite | `src/lib/services/export/hwpx/hwpx-payload-roadmap.ts` | V2 인터뷰·결과 → snake_case payload |
| Rewrite | `src/lib/services/export/hwpx/hwpx-payload-pbl.ts` | 동일 |
| Update | `api/hwpx/test_placeholders_{roadmap,pbl}.py` | 4 조합 + SSOT 키 동기화 |
| Update | `src/lib/services/export/hwpx/*.test.ts` | V2 + SSOT 동기화 |
| Create/Update | `tests/e2e/hwpx-download.spec.ts` | Playwright |
| Create | `api/hwpx/__fixtures__/{roadmap,pbl}-{full,edge}.json` | fixture 4 종 |
| Create | `docs/reports/2026-04-25-form-parity-report.md` | 누적 결과 보고 |
| Update | `docs/plans/archive/2026-04-24-interview-result-screens-redesign.md` §6 | [TBD] 컬럼 채움 |

## 재사용 가능한 기존 자산

| 자산 | 위치 | 활용 |
|---|---|---|
| `_replace_in_all_runs(doc, old, new)` | `api/hwpx/generate.py` | OXML 안전 치환 — 재사용 |
| `_set_cell_text(tbl, row, col, text)` | 동일 | 셀 텍스트 변경 — 재사용 |
| `_collect_tables(doc)` | 동일 | shallow 표 수집 — 재사용 |
| python-hwpx `replace_text_in_runs` | 라이브러리 | runs 분리 방지 핵심 — 재사용 |
| `analyze_template.py` | `.claude/skills/hwpx-docgen/scripts/` | 기존 스킬 자산은 보존, 본 PR 은 별도 `dump_hwpx_structure.py` 신설 |
| `npm run dev:hwpx{,:setup}` + `dev:with-hwpx` | `package.json` | 브리지 서버 로컬 검증 — 재사용 |
| `RoadmapInterviewSchema` / `PBLInterviewSchema` | `src/lib/schemas/` | V2 입력 타입 — payload TS 의 입력 |
| 기존 fixture (`__fixtures__/sample-llm-response.json` × 2) | `src/lib/services/{roadmap,pbl}/` | E.2/E.3 의 base 데이터 |

## End-to-End Verification (PR 머지 직전)

```bash
# 1. 정적 검증
npm run validate                              # typecheck + lint + test
npm run build                                 # Next 프로덕션 빌드

# 2. Python 단위 테스트
cd api/hwpx && pytest -v && cd -

# 3. 매핑 SSOT 누락 0건
node scripts/verify-mapping-completeness.mjs  # (Phase B.5 산출)

# 4. 양 템플릿 placeholder 카운트 일치
unzip -p templates/hwpx/roadmap.hwpx Contents/section0.xml | grep -oE '\{\{[^}]+\}\}' | sort -u | wc -l
# == JSON 의 roadmap 항목 수와 일치

# 5. 브리지 서버 + 실물 생성
npm run dev:hwpx:setup
npm run dev:hwpx &
npm run dev:with-hwpx &
# (브라우저로 fixture POST 또는 curl)
curl -X POST http://localhost:3000/api/hwpx/generate -d @api/hwpx/__fixtures__/roadmap-full.json -o /tmp/out-roadmap.hwpx
tsx scripts/verify-hwpx-placeholders.ts /tmp/out-roadmap.hwpx   # exit 0

# 6. E2E
npm run test:e2e -- tests/e2e/hwpx-download.spec.ts

# 7. 한글 오피스에서 /tmp/out-{roadmap,pbl}.hwpx 직접 열어 시각 검증 → 스크린샷
```

## 위험 요소 및 완화

1. **사용자 서식 수정으로 표 인덱스 변경**: Phase B.2/B.3 의 분석 결과로 SSOT JSON 의 `table_index` 를 직접 명시 → generate.py 의 하드코딩 인덱스 제거. 향후 서식 재수정 시 SSOT 만 갱신하면 됨.
2. **runs 분리**: insert_placeholders.py 의 TDD 케이스에서 grep count 검증으로 즉시 탐지. 실패 시 placeholder 를 더 짧게 분할하거나 paragraph 단위로 통째 치환.
3. **camelCase ↔ snake_case 매핑 누락**: SSOT JSON 의 `ts_key` ↔ `py_key` 컬럼 도입 + payload TS 의 출력 dict 키가 모든 `py_key` 를 포함하는지 자동 assertion (Phase F.2).
4. **HRD PDF 첨부 페이지**: 본 PR 범위는 placeholder fallback 까지. 실제 PDF 페이지 병합은 기존 로직 유지(필요 시 별도 follow-up).
5. **표 인덱스 충돌**: `_collect_tables(doc)` 가 shallow 만 수집하므로 nested 표가 신규 추가되면 인덱스가 어긋남. Phase B 분석에서 nested 여부 확인 필수.
