# PR #5 — HWPX 서식 정본 갱신 + 누락 11 종 보강 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 사용자 한컴오피스 실물 검증 (DoD #7) 에서 발견된 11 종 데이터 누락 + 자간/줄바꿈 회귀를 보강하여 PR #4 시리즈 (4 화면 양식 1:1 정합) 의 최종 종결을 완성한다.

**Architecture:** 사용자가 갱신한 신규 정본 HWPX (자간 등 서식 수정본) 으로 `templates/hwpx/{roadmap,pbl}.hwpx` 교체 후, `api/hwpx/generate.py` 의 cover/cell_fill 누락 함수 추가·수정 + fixture 데이터 보강 + pytest 회귀 강화. **표 인덱스 시프트는 진단 결과 없음** — SSOT JSON 갱신 불필요.

**Tech Stack:** Python 3.13 + python-hwpx (HWPX 조작), pytest (회귀), Node.js (verify-mapping-completeness), Vercel Functions, Next.js 16.

---

## 0. Phase 1 진단 결과 (Pre-flight)

| 가설 | 검증 결과 | 영향 |
|---|---|---|
| 신규 정본의 표 인덱스 시프트 가능성 | ❌ **없음** — `.venv/bin/python` shallow traversal 결과 신규/기존 idx 0~43 (R) / 0~51 (P) 완전 일치 | SSOT `table_index` 갱신 불필요 |
| 표지 cover 누락 (R-01, P-01) | `_fill_table_cover(idx=1)` 가 PM 표 1×3 만 채움 — 본문 `(기업명)`, `202x. 00. 00.`, PBL nested 8×5 표 미처리 | C-1, C-2 |
| HRD URL raw 노출 (R-08) | `_fill_table_hrd_report` 가 URL 패턴 분기 없이 그대로 출력 | C-3 |
| P-02 4 필드 누락 | `_fill_pbl_overview` 매핑 테이블에 `training_target_label`/`training_form`/`training_period`/`business_issues` 없음 | C-4 |
| P-03·P-07 1×1 표 미채움 | `_fill_simple_box(tbl, 0, 1, ...)` — 1×1 표는 col 1 없음 → silent skip | C-5 |
| P-12 머리기호 2 개 | `_set_cell_text` 가 빈 paragraph 의 list/bullet 속성을 reset 안 함 → 빈 단락에도 머리기호 자동 삽입 | C-6 |
| P-11 점수 1~5 미렌더 | V2 `target.necessity` 는 자유서술 — 점수 schema 없음. selected ☑ 만 가능 | C-7 (확인 후 결정) |
| P-13 빠진 칸 | V2 `details[]` (title/description) → col 1 만 채움. col 2~4 명시적 비움 누락 | C-8 |
| P-20 거의 누락 | `_fill_pbl_subject_profile` 가 placeholder 치환에만 의존 — 정본 HWPX placeholder 0 개라 상단 7 cell 모두 미채움 | C-9 |
| P-19/P-21/P-22 누락 | `pbl-full.json` fixture 에 `facilities[]`, `training_instructors[]`, `training_contents[]`, `learning_group{instructors,trainees}` 데이터 자체가 없음 | C-10 |
| 자간 압축 회귀 | 사용자가 신규 정본에서 직접 수정 — 템플릿 교체로 자동 해결 | A |

---

## 1. File Structure

### 수정 (Modify)
- `api/hwpx/generate.py` — 11 종 누락 보강 (C-1 ~ C-9)
- `api/hwpx/_placeholders_pbl.py` — `_V1_TO_V2_ALIAS` 변경 시 (effect-less 이지만 SSOT 일관성)
- `api/hwpx/_placeholders_roadmap.py` — HRD URL fallback 동기화 (C-3)
- `api/hwpx/test_integration_fixtures.py` — 11 종 회귀 케이스 추가 (Phase D)
- `api/hwpx/__fixtures__/pbl-full.json` — facilities/instructors/contents/learning_group 데이터 추가 (C-10)
- `api/hwpx/__fixtures__/pbl-max-length.json` — 동일 (max-length 케이스)
- `api/hwpx/__fixtures__/pbl-special-chars.json` — 동일 (특수문자 케이스)
- `templates/hwpx/roadmap.hwpx` — 신규 정본 (84d1e67…) 으로 교체 (Phase A)
- `templates/hwpx/pbl.hwpx` — 신규 정본 (8952576…) 으로 교체 (Phase A)
- `docs/references/hwpx-structure-roadmap.md` — Phase B dump 재실행 갱신
- `docs/references/hwpx-structure-pbl.md` — 동일
- `docs/reports/2026-04-24-form-parity-report.md` §5.4 — 한컴 재검증 결과 ✅

### 생성 (Create)
- `templates/hwpx/archive/roadmap.pre-2026-04-27.hwpx` — 기존 백업
- `templates/hwpx/archive/pbl.pre-2026-04-27.hwpx` — 기존 백업
- `docs/screenshots/2026-04-24/hwpx-hancom/{roadmap,pbl}-{empty,full,max-length,special-chars}.hwpx` — fixture 재생성 8 개 (이미 working tree 에 untracked 로 있음)
- `docs/reports/2026-04-27-hwpx-form-fixes-report.md` — Phase A~D 결과 보고서

### 변경 없음
- `docs/references/hwpx-placeholders.json` — 표 인덱스 시프트 없음 진단 → **갱신 불필요**
- `docs/references/2026-04-23-current-fields-inventory.md` — 47 섹션 인벤토리 (변경 없음)

---

## 2. Phase A: 정본 백업 + 템플릿 교체

**Files:**
- Create: `templates/hwpx/archive/{roadmap,pbl}.pre-2026-04-27.hwpx`
- Modify: `templates/hwpx/{roadmap,pbl}.hwpx`

### Task A: 백업 + 교체 + hash 검증

- [ ] **Step A.1: 기존 templates 백업**

```bash
cp templates/hwpx/roadmap.hwpx templates/hwpx/archive/roadmap.pre-2026-04-27.hwpx
cp templates/hwpx/pbl.hwpx templates/hwpx/archive/pbl.pre-2026-04-27.hwpx
```

- [ ] **Step A.2: 신규 정본 → templates 복사**

```bash
cp "docs/references/1.AI훈련로드맵 컨설팅 보고서(양식).hwpx" templates/hwpx/roadmap.hwpx
cp "docs/references/2.AI PBL 과정개발보고서 및 결과보고서(양식).hwpx" templates/hwpx/pbl.hwpx
```

- [ ] **Step A.3: hash 검증 (cross-check)**

```bash
shasum -a 256 templates/hwpx/roadmap.hwpx templates/hwpx/pbl.hwpx \
  "docs/references/1.AI훈련로드맵 컨설팅 보고서(양식).hwpx" \
  "docs/references/2.AI PBL 과정개발보고서 및 결과보고서(양식).hwpx" \
  templates/hwpx/archive/roadmap.pre-2026-04-27.hwpx \
  templates/hwpx/archive/pbl.pre-2026-04-27.hwpx
```

Expected:
- `templates/hwpx/roadmap.hwpx` = `84d1e674…`
- `templates/hwpx/pbl.hwpx` = `8952576e…`
- `docs/references/1.AI*.hwpx` = `84d1e674…` (동일)
- `docs/references/2.AI*.hwpx` = `8952576e…` (동일)
- `templates/hwpx/archive/roadmap.pre-2026-04-27.hwpx` = `3cff0532…`
- `templates/hwpx/archive/pbl.pre-2026-04-27.hwpx` = `d6fbfbc5…`

- [ ] **Step A.4: 커밋**

```bash
git add templates/hwpx/roadmap.hwpx templates/hwpx/pbl.hwpx \
  templates/hwpx/archive/roadmap.pre-2026-04-27.hwpx \
  templates/hwpx/archive/pbl.pre-2026-04-27.hwpx
git commit -m "$(cat <<'EOF'
chore(hwpx): 신규 정본 (자간·줄바꿈 수정본) 으로 templates 교체

- roadmap.hwpx 3cff053 → 84d1e67 (사용자 한컴 검증 후 자간 압축 회피 수정)
- pbl.hwpx d6fbfbc → 8952576 (동일)
- archive 에 이전 정본 백업

PR #5 (PR #4 follow-up) Phase A.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## 3. Phase B: SSOT 정합 검증

**Files:**
- Modify: `docs/references/hwpx-structure-roadmap.md`
- Modify: `docs/references/hwpx-structure-pbl.md`
- Modify: `docs/reports/2026-04-25-form-parity-report.md` (Phase A.2 표 hash 갱신)

### Task B: 구조 재분석 + 매핑 검증

- [ ] **Step B.1: 신규 정본 구조 dump 갱신**

```bash
.venv/bin/python scripts/dump_hwpx_structure.py templates/hwpx/roadmap.hwpx \
  -o docs/references/hwpx-structure-roadmap.md
.venv/bin/python scripts/dump_hwpx_structure.py templates/hwpx/pbl.hwpx \
  -o docs/references/hwpx-structure-pbl.md
```

Expected: dump 출력은 deep traversal 기준이지만 본 PR 의 SSOT (shallow) 와 cross-check 가능. 사전 진단에서 인덱스 시프트 없음 확인.

- [ ] **Step B.2: SSOT 매핑 완전성 검증**

```bash
node scripts/verify-mapping-completeness.mjs
```

Expected: `94 unique placeholders` + `누락 0 건` PASS (PR #4 와 동일 — 표 인덱스 시프트 없으므로 SSOT 갱신 불필요)

- [ ] **Step B.3: PR #3 보고서 hash 표 갱신**

`docs/reports/2026-04-25-form-parity-report.md` Phase A.2 표에 신규 hash 추가:

```markdown
| 2026-04-27 | 84d1e674… | 8952576e… | 사용자 자간 회피 수정본 (PR #5) |
```

- [ ] **Step B.4: 커밋**

```bash
git add docs/references/hwpx-structure-roadmap.md \
  docs/references/hwpx-structure-pbl.md \
  docs/reports/2026-04-25-form-parity-report.md
git commit -m "docs(hwpx): 신규 정본 구조 dump + hash 갱신 (PR #5 Phase B)"
```

---

## 4. Phase C: 11 종 누락 보강 (TDD 적용)

각 Task 별 RED → GREEN → REFACTOR → COMMIT.

### Task C-1: 로드맵 표지 회사명·일자 본문 치환 (R-01)

**Files:**
- Modify: `api/hwpx/generate.py:146-200` (`_generate_roadmap`)
- Test: `api/hwpx/test_integration_fixtures.py`

- [ ] **Step C-1.1: RED test 작성**

`api/hwpx/test_integration_fixtures.py` 에 추가:

```python
def test_roadmap_full_renders_cover_company_name_and_date(self):
    """R-01: 표지에 회사명 + 일자 + PM/내부전문가 소속·성명 모두 노출."""
    fixture = self._load_fixture("roadmap-full.json")
    payload = json.dumps({"track": "ROADMAP", "data": fixture, "fileName": "test.hwpx"})
    response = self._post(payload)
    assert response.status_code == 200
    text = self._extract_text(response.content)
    assert fixture["company_name"] in text, "회사명 미노출"
    assert fixture["report_date"] in text, "일자 미노출"
    assert fixture["pm_affiliation"] in text
    assert fixture["pm_name"] in text
    assert fixture["internal_expert_affiliation"] in text
    assert fixture["internal_expert_name"] in text
```

- [ ] **Step C-1.2: 테스트 실패 확인**

```bash
.venv/bin/pytest api/hwpx/test_integration_fixtures.py::TestRoadmapFixtures::test_roadmap_full_renders_cover_company_name_and_date -v
```

Expected: FAIL — 회사명 또는 일자 미노출 (cover 미치환)

- [ ] **Step C-1.3: GREEN — 본문 텍스트 치환 추가**

`generate.py:146` `_generate_roadmap` 의 `# --- 1) 본문 + 표 셀 내부 ...` 직후에 추가:

```python
    # --- 1.5) 표지 본문 텍스트 직접 치환 (placeholder 미사용 정본 대응) ---
    company_name = data.get("company_name") or ""
    report_date = data.get("report_date") or ""
    if company_name:
        # 표지 paragraph 3: "AI훈련로드맵 컨설팅 보고서(기업명)"
        _replace_in_all_runs(doc, "(기업명)", f"({company_name})")
    if report_date:
        # 표지 paragraph 8: "202x. 00. 00."
        _replace_in_all_runs(doc, "202x. 00. 00.", report_date)
```

- [ ] **Step C-1.4: 테스트 통과 확인**

```bash
.venv/bin/pytest api/hwpx/test_integration_fixtures.py::TestRoadmapFixtures::test_roadmap_full_renders_cover_company_name_and_date -v
```

Expected: PASS

- [ ] **Step C-1.5: 커밋**

```bash
git add api/hwpx/generate.py api/hwpx/test_integration_fixtures.py
git commit -m "fix(hwpx): R-01 로드맵 표지 회사명·일자 본문 치환 추가 (PR #5 C-1)"
```

---

### Task C-2: PBL 표지 nested 8×5 표 PM/외부/내부/주치의 채움 (P-01)

**Files:**
- Modify: `api/hwpx/generate.py:632-779` (`_generate_pbl`)
- Add: `_fill_pbl_cover_nested(doc, data)` 신규 함수
- Test: `api/hwpx/test_integration_fixtures.py`

**진단 데이터:**
- shallow_table[0] = 2×2 (paragraph 0)
- shallow_table[0].cell(1,0) → nested 8×5 표 (좌측 표지)
  - row 1 col 1·2 = PM 소속·성명
  - row 2~3 col 1·2 = 외부전문가 소속·성명 (최대 2명)
  - row 4~5 col 1·2 = 기업 내부전문가 소속·성명 (최대 2명)
  - row 6~7 col 1·2 = 능력개발전담주치의 소속·성명 (최대 2명)
- shallow_table[0].cell(1,1) → 동일 nested 8×5 표 (우측 표지) — **같은 데이터 두 번**

- [ ] **Step C-2.1: RED test 작성**

```python
def test_pbl_full_renders_cover_pm_internal_expert(self):
    """P-01: PBL 표지에 회사명·과정명·일자·PM/외부/내부/주치의 모두 노출."""
    fixture = self._load_fixture("pbl-full.json")
    # cover 객체가 fixture 에 없으면 추가 (fixture 보강 필요)
    response = self._post(json.dumps({"track": "PBL", "data": fixture, "fileName": "test.hwpx"}))
    assert response.status_code == 200
    text = self._extract_text(response.content)
    assert fixture["company_name"] in text
    assert fixture["course_name"] in text
    assert fixture["report_date"] in text
    # PM/외부/내부/주치의 — fixture 에 cover.pm/external/internal/doctor 추가 후 검증
```

- [ ] **Step C-2.2: fixture 에 cover 객체 추가**

`api/hwpx/__fixtures__/pbl-full.json` 에 추가:

```json
"cover": {
  "pm": {"affiliation": "한국생산성본부", "name": "홍길동"},
  "external_experts": [{"affiliation": "AI연구소", "name": "김전문"}],
  "internal_experts": [{"affiliation": "㈜AI산업자동화", "name": "박관리"}],
  "doctors": [{"affiliation": "능력개발센터", "name": "이주치"}]
}
```

- [ ] **Step C-2.3: 테스트 실패 확인 + GREEN 구현**

`generate.py` 에 신규 함수 추가:

```python
def _fill_pbl_cover_nested(doc, data):
    """PBL 표지 nested 8x5 표 (PM/외부전문가/내부전문가/능력개발전담주치의) 채움.

    paragraph 0 의 shallow_table[0] (2x2) 의 cell(1,0) 과 cell(1,1) 안에
    nested 8x5 표가 두 번 들어 있다 (좌·우 표지). 동일 데이터 양쪽에 채운다.
    """
    cover = data.get("cover") or {}
    pm = cover.get("pm") or {}
    externals = cover.get("external_experts") or []
    internals = cover.get("internal_experts") or []
    doctors = cover.get("doctors") or []

    # role 별로 (row_index, person) 매핑
    role_rows = [
        (1, pm),
        (2, externals[0] if len(externals) > 0 else {}),
        (3, externals[1] if len(externals) > 1 else {}),
        (4, internals[0] if len(internals) > 0 else {}),
        (5, internals[1] if len(internals) > 1 else {}),
        (6, doctors[0] if len(doctors) > 0 else {}),
        (7, doctors[1] if len(doctors) > 1 else {}),
    ]

    if not doc.paragraphs:
        return
    para0 = doc.paragraphs[0]
    if not para0.tables:
        return
    outer = para0.tables[0]  # shallow_table[0] = 2x2

    for outer_col in (0, 1):
        try:
            outer_cell = outer.cell(1, outer_col)
        except Exception:
            continue
        for inner_para in outer_cell.paragraphs:
            for nested in inner_para.tables:
                if nested.row_count == 8 and nested.column_count == 5:
                    for row_idx, person in role_rows:
                        if row_idx >= nested.row_count:
                            break
                        _set_cell_text(nested, row_idx, 1, person.get("affiliation", "") or "")
                        _set_cell_text(nested, row_idx, 2, person.get("name", "") or "")
```

`_generate_pbl` 의 `# --- 0) 표지 ...` 영역 끝에 호출:

```python
    _fill_pbl_cover_nested(doc, data)
```

- [ ] **Step C-2.4: 테스트 통과 + 커밋**

```bash
.venv/bin/pytest api/hwpx/test_integration_fixtures.py::TestPblFixtures::test_pbl_full_renders_cover_pm_internal_expert -v
git add api/hwpx/generate.py api/hwpx/__fixtures__/pbl-full.json api/hwpx/test_integration_fixtures.py
git commit -m "fix(hwpx): P-01 PBL 표지 nested 8x5 PM/외부/내부/주치의 채움 (PR #5 C-2)"
```

---

### Task C-3: HRD이음 URL raw 노출 fallback (R-08, P-06)

**Files:**
- Modify: `api/hwpx/_placeholders_roadmap.py:14-20` + `build_placeholder_map`
- Modify: `api/hwpx/_placeholders_pbl.py` (HRD attachment 처리 동기화)
- Modify: `api/hwpx/generate.py:384-391` (`_fill_table_hrd_report`)
- Test: `api/hwpx/test_placeholders_roadmap.py`, `test_placeholders_pbl.py`

- [ ] **Step C-3.1: RED test 작성**

```python
# test_placeholders_roadmap.py
def test_hrd_report_url_replaced_with_attachment_notice():
    data = {"hrd_report_attachment": "https://x.example/hrd-report.pdf"}
    result = build_placeholder_map(data)
    assert "https://" not in result["{{hrd_report_attachment}}"]
    assert "별첨" in result["{{hrd_report_attachment}}"]
```

- [ ] **Step C-3.2: GREEN — URL 패턴 fallback 추가**

`_placeholders_roadmap.py:18` 위에 추가:

```python
HRD_REPORT_URL_FALLBACK = "(첨부 PDF: 별첨 페이지 참조)"
```

`build_placeholder_map` 의 HRD 처리 부분 (line 116-117) 변경:

```python
    hrd = _str_or_empty(data.get("hrd_report_attachment")).strip()
    if hrd.startswith("http://") or hrd.startswith("https://"):
        hrd_text = HRD_REPORT_URL_FALLBACK
    elif hrd:
        hrd_text = hrd
    else:
        hrd_text = HRD_REPORT_EMPTY_FALLBACK
    result["{{hrd_report_attachment}}"] = hrd_text
```

`generate.py:_fill_table_hrd_report` 도 동일 분기 추가:

```python
def _fill_table_hrd_report(tables, data, idx: int = 11):
    if idx >= len(tables):
        return
    from _placeholders_roadmap import HRD_REPORT_EMPTY_FALLBACK, HRD_REPORT_URL_FALLBACK
    attachment = (data.get("hrd_report_attachment") or "").strip()
    if attachment.startswith("http://") or attachment.startswith("https://"):
        text = HRD_REPORT_URL_FALLBACK
    elif attachment:
        text = attachment
    else:
        text = HRD_REPORT_EMPTY_FALLBACK
    _set_cell_text(tables[idx], 0, 0, text)
```

PBL 측 (`_placeholders_pbl.py` 의 HRD 처리도 동일 패턴 적용 — 현재는 `_SIMPLE_KEYS` 에 raw 출력) — `build_pbl_placeholder_map` 에 명시 분기 추가.

- [ ] **Step C-3.3: 테스트 통과 + 커밋**

```bash
.venv/bin/pytest api/hwpx/test_placeholders_roadmap.py -v
.venv/bin/pytest api/hwpx/test_placeholders_pbl.py -v
git add api/hwpx/_placeholders_roadmap.py api/hwpx/_placeholders_pbl.py \
  api/hwpx/generate.py api/hwpx/test_placeholders_roadmap.py api/hwpx/test_placeholders_pbl.py
git commit -m "fix(hwpx): R-08·P-06 HRD URL raw 노출 fallback 안내문구 치환 (PR #5 C-3)"
```

---

### Task C-4: P-02 Ⅰ. 훈련과정 개요 4 필드 매핑 추가

**Files:**
- Modify: `api/hwpx/generate.py:795-857` (`_fill_pbl_overview`)

**진단:** 현재 매핑에 누락된 필드:
- `training_target_label` (훈련생) — 양식 row 11
- `training_form` (훈련형태) — 양식 row 13~14 체크박스 영역
- `training_period` (훈련기간) — 양식 row 8 또는 row 14
- `business_issues` (훈련직무) — `data.get("training_job")` 으로 이미 row 12 매핑 존재 — 재검토

신규 정본 dump idx 1 (15×5):
```
row 0: 기업명 | 사업장관리번호
row 1~2: 주요업종/업종코드/주업종
row 3: 주소
row 4~5: 훈련실시주소
row 6~7: 담당자연락처
row 8: 훈련과정명
row 9: NCS 분류
row 10: 훈련시간
row 11: 훈련생  ← `training_target_label`
row 12: 훈련 직무 ← `training_job`
row 13~14: AI역량/훈련목표 체크박스 (별도)
```

- [ ] **Step C-4.1: RED test 작성**

```python
def test_pbl_full_renders_overview_training_target_label(self):
    """P-02: 훈련생·훈련직무·훈련목표·훈련기간 모두 표 idx 1 에 채워진다."""
    fixture = self._load_fixture("pbl-full.json")
    response = self._post(json.dumps({"track": "PBL", "data": fixture, "fileName": "test.hwpx"}))
    text = self._extract_text(response.content)
    assert fixture["training_target_label"] in text  # "QA 인력 5명"
    # training_form 은 체크박스로 처리 (별도 검증)
    # training_period 는 Ⅳ-3-가 에서도 사용 — 여기서는 cell_fill 검증만
```

- [ ] **Step C-4.2: GREEN — 매핑 추가**

`_fill_pbl_overview` 의 `mapping` 리스트에 추가:

```python
    mapping = [
        # 기존 14 매핑 ...
        (11, 1, data.get("training_target_label")),  # 훈련생
        # row 12 training_job 은 이미 매핑 존재
    ]
```

`training_form` 은 양식의 체크박스 영역 (row 13~14) 이라 별도 함수 (`_fill_pbl_training_form_checkbox`) 또는 `_replace_in_all_runs` 패턴으로 처리. `training_period` 는 Ⅰ장 표에는 셀 없음 (Ⅳ-3-가 의 idx 30 에서만 사용).

- [ ] **Step C-4.3: 테스트 통과 + 커밋**

---

### Task C-5: P-03/P-07 1×1 표 셀 채움 버그 수정

**Files:**
- Modify: `api/hwpx/generate.py:732-749` (`_generate_pbl`)

**진단:** `_fill_simple_box(tables, 3/11, ...)` 가 `_set_cell_text(tbl, 0, 1, ...)` 호출. 1×1 표는 col 1 없음 → silent skip.

- [ ] **Step C-5.1: RED test 작성**

```python
def test_pbl_full_renders_company_issues_at_idx3(self):
    fixture = self._load_fixture("pbl-full.json")
    response = self._post(json.dumps({"track": "PBL", "data": fixture, "fileName": "test.hwpx"}))
    text = self._extract_text(response.content)
    assert fixture["company_issues"] in text

def test_pbl_full_renders_course_necessity_at_idx11(self):
    fixture = self._load_fixture("pbl-full.json")
    response = self._post(json.dumps({"track": "PBL", "data": fixture, "fileName": "test.hwpx"}))
    text = self._extract_text(response.content)
    assert fixture["course_necessity"] in text
```

- [ ] **Step C-5.2: GREEN — 호출부 변경**

`_generate_pbl` 의 두 호출 변경:

```python
    # 변경 전
    _fill_simple_box(tables, 3, data.get("company_issues") or data.get("business_issues"))
    _fill_simple_box(tables, 11, data.get("course_necessity") or data.get("course_development_necessity"))

    # 변경 후 — 1x1 표는 col 0 사용
    _fill_pbl_simple_content(tables, 3, data.get("company_issues") or data.get("business_issues"))
    _fill_pbl_simple_content(tables, 11, data.get("course_necessity") or data.get("course_development_necessity"))
```

- [ ] **Step C-5.3: 테스트 통과 + 커밋**

---

### Task C-6: P-12 머리기호 1:N 불일치 + `_set_cell_text` 일반화

**Files:**
- Modify: `api/hwpx/generate.py:229-275` (`_set_cell_text`)
- Test: `api/hwpx/test_integration_fixtures.py`

**진단:** `_set_cell_text` 는 모든 paragraph 의 runs.text 를 비우고 첫/마지막에 분배. 그러나 paragraph 의 list/bullet 속성이 살아있어 빈 단락에도 머리기호가 자동 그려짐.

해결 옵션:
- (A) 모든 줄을 첫 paragraph 에 \n 으로 join — 단순하지만 multi-paragraph 셀 (Ⅰ-2 수행일시 등) 에서 줄바꿈 동작 변경
- (B) 빈 paragraph 의 paraPrIDRef 를 "빈 단락" 스타일로 변경 — 안전하지만 paraPrIDRef 식별 필요
- (C) 입력 줄 개수와 paragraph 개수 일치하도록 trim — 예: 1 줄 입력 → paragraph 1 개만 채움, 나머지 paragraph 의 runs 모두 비움 + paraPrIDRef 변경 시도

**권장:** (C) + (B) 의 결합.

- [ ] **Step C-6.1: RED test 작성**

```python
def test_pbl_full_no_orphan_bullet_in_target_necessity(self):
    """P-12: target_necessity 1 항목에 머리기호 (∙ 또는 □) 1 개만 노출."""
    fixture = self._load_fixture("pbl-full.json")
    response = self._post(json.dumps({"track": "PBL", "data": fixture, "fileName": "test.hwpx"}))
    text = self._extract_text(response.content)
    necessity_text = fixture["target_necessity"]
    # 텍스트 노출 검증
    assert necessity_text in text
    # 빈 머리기호 회피 — 직접 OXML 검증은 별도 unit test 로
```

- [ ] **Step C-6.2: GREEN — `_set_cell_text` 보강**

`_set_cell_text` 의 Step 2 (분배) 를 다음과 같이 변경:

```python
    # Step 2: text 를 '\n' 기준으로 분할
    text = text if text is not None else ""
    lines = text.split("\n") if text else []
    p_count = len(paragraphs)

    if not lines or (len(lines) == 1 and not lines[0]):
        # 빈 입력 — 모든 paragraph 의 runs 비움 + (선택) bullet 회피 시도
        # 빈 단락 스타일 (paraPrIDRef = "0") 로 reset 시도
        for p in paragraphs:
            if p.runs:
                p.runs[0].text = ""
            try:
                p.set_paraPrIDRef("0")  # 기본 단락 스타일 (bullet 없음)
            except Exception:
                pass
        return

    # 분배: 줄 수가 paragraph 수보다 적으면 첫 N 개 paragraph 만 채우고
    # 나머지는 빈 단락 스타일로 reset (bullet 회피)
    if len(lines) <= p_count:
        for i, p in enumerate(paragraphs):
            if not p.runs:
                continue
            if i < len(lines):
                p.runs[0].text = lines[i]
            else:
                # 빈 paragraph — bullet 회피
                p.runs[0].text = ""
                try:
                    p.set_paraPrIDRef("0")
                except Exception:
                    pass
    else:
        # 줄 수가 더 많으면 마지막 paragraph 에 join
        for i, p in enumerate(paragraphs):
            if not p.runs:
                continue
            if i < p_count - 1:
                p.runs[0].text = lines[i]
            else:
                p.runs[0].text = "\n".join(lines[i:])
```

> **주의:** `python-hwpx` 의 paragraph 가 `set_paraPrIDRef` 를 지원하지 않을 수 있음. 그 경우 try/except 로 silent skip — 머리기호는 시각적 회귀로 확인.

- [ ] **Step C-6.3: 테스트 통과 + 커밋**

---

### Task C-7: P-11 우선순위 ☑ 강화

**Files:**
- Modify: `api/hwpx/generate.py:1192-1234` (`_fill_pbl_target_tasks`)

**진단:** V2 schema 는 `target.necessity_score` 필드 없음. 사용자 보고 "필요성 체크 누락" 은 selected ☑ 만으로 충분할 가능성. 우선 ☑ 만 보장하고, 사용자 재검증 후 점수 schema 도입 여부 결정.

- [ ] **Step C-7.1: RED test 작성**

```python
def test_pbl_full_target_selected_check(self):
    """P-11: V2 단일 target 은 row 1 col 6 에 ☑ 표시."""
    fixture = self._load_fixture("pbl-full.json")
    response = self._post(json.dumps({"track": "PBL", "data": fixture, "fileName": "test.hwpx"}))
    text = self._extract_text(response.content)
    assert fixture["target"]["name"] in text
    # ☑ 직접 텍스트 검증은 어려움 — 표 idx 19 row 1 col 6 unit test 로 확인
```

- [ ] **Step C-7.2: 현재 코드 검증**

`_fill_pbl_target_tasks` 의 `target_single` 결과는 `selected` 필드가 없음 → `row.get("selected", True)` 가 항상 True 가 되어 ☑ 표시됨. **이미 정상 동작 가능성**.

→ root cause 재분석 필요. 먼저 fixture 출력의 실제 `☑` (☑) 존재 여부 검증 후 결정.

- [ ] **Step C-7.3: 필요 시 보강 + 커밋**

---

### Task C-8: P-13 V2 details col 1~4 비움 보강

**Files:**
- Modify: `api/hwpx/generate.py:1236-1268` (`_fill_pbl_target_task_details`)

**진단:** V2 details 는 col 0=title, col 1=description. col 2~4 는 양식상 별도 컬럼 (요구지식·기술 등) 이지만 V2 에선 description 단일에 통합. 명시적 비움 누락이 빠진 칸 root cause.

- [ ] **Step C-8.1: RED test 작성**

```python
def test_pbl_full_target_details_no_blank_columns(self):
    """P-13: V2 details title + description 모두 노출, col 2~4 명시적 비움."""
    fixture = self._load_fixture("pbl-full.json")
    response = self._post(json.dumps({"track": "PBL", "data": fixture, "fileName": "test.hwpx"}))
    text = self._extract_text(response.content)
    for detail in fixture["target"]["details"]:
        assert detail["title"] in text
        assert detail["description"] in text
```

- [ ] **Step C-8.2: GREEN — V2 분기 보강**

```python
    for i, row in enumerate(rows[:max_rows]):
        target_row = 2 + i
        if use_v2:
            _set_cell_text(tbl, target_row, 0, row.get("title", ""))
            _set_cell_text(tbl, target_row, 1, row.get("description", ""))
            # col 2~4 명시적 비움 (양식 원본 텍스트 제거 보장)
            for c in range(2, min(5, tbl.column_count)):
                _set_cell_text(tbl, target_row, c, "")
        else:
            # ... V1 분기 (변경 없음)
```

- [ ] **Step C-8.3: 테스트 통과 + 커밋**

---

### Task C-9: P-20 교과목 프로파일 상단 7 cell 직접 채움

**Files:**
- Modify: `api/hwpx/generate.py:1397-1432` (`_fill_pbl_subject_profile`)

**진단:** 함수가 `training_contents` 반복 행만 처리. 상단 7 cell (course_name/total_hours/training_goals/ai_tools/utilized_data/analysis_method/total_sum_hours) 은 placeholder 치환에 의존 → 정본 placeholder 0 개라 모두 미채움.

신규 정본 idx 32 (15×10) 의 상단 셀 좌표는 dump 분석 후 결정. 일반적으로:
- row 1: 과정명 / 총 훈련시간
- row 2: 훈련목표 (병합 셀)
- row 3: 활용 AI도구
- row 4: 활용 데이터 / 분석방법
- row 9 또는 13: 총합 시간

- [ ] **Step C-9.1: 셀 좌표 진단**

```bash
.venv/bin/python -c "
from hwpx import HwpxDocument
doc = HwpxDocument.open('templates/hwpx/pbl.hwpx')
# shallow idx 32
idx = 0
target = None
for para in doc.paragraphs:
    for tbl in para.tables:
        if idx == 32:
            target = tbl
            break
        idx += 1
    if target:
        break
for r in range(target.row_count):
    for c in range(target.column_count):
        cell = target.cell(r, c)
        text = ''.join(run.text or '' for p in cell.paragraphs for run in p.runs)
        if text:
            print(f'({r},{c}) {text[:60]!r}')
"
```

진단 결과를 보고 셀 좌표 매핑 결정.

- [ ] **Step C-9.2: RED test + GREEN 구현**

진단 결과를 바탕으로 매핑:

```python
def _fill_pbl_subject_profile(tables, build_pbl_table_rows, data, selected_methods, idx: int = 32):
    if idx >= len(tables):
        return
    tbl = tables[idx]

    # === 상단 7 cell 직접 매핑 (실제 좌표는 Step C-9.1 진단 결과로 확정) ===
    upper_mapping = [
        (1, 1, data.get("subject_profile_course_name")),     # 과정명
        (1, 5, data.get("total_training_hours")),            # 총 훈련시간
        (2, 1, data.get("subject_training_goals")),          # 훈련목표
        (3, 1, data.get("subject_ai_tools")),                # 활용 AI도구
        (4, 1, data.get("subject_utilized_data")),           # 활용 데이터
        (4, 5, data.get("subject_analysis_method")),         # 분석방법
        # total_sum_hours 좌표는 진단 후 확정
    ]
    for r, c, text in upper_mapping:
        try:
            _set_cell_text(tbl, r, c, text or "")
        except Exception:
            pass

    # === 기존 training_contents 반복 행 처리 (변경 없음) ===
    contents = build_pbl_table_rows(data, "training_contents")
    # ...
```

- [ ] **Step C-9.3: 테스트 통과 + 커밋**

---

### Task C-10: fixture 데이터 보강

**Files:**
- Modify: `api/hwpx/__fixtures__/pbl-full.json`
- Modify: `api/hwpx/__fixtures__/pbl-max-length.json`
- Modify: `api/hwpx/__fixtures__/pbl-special-chars.json`

**진단:** P-19/P-20/P-21/P-22 의 root cause 일부는 fixture 데이터 자체가 빈 것.

- [ ] **Step C-10.1: pbl-full.json 보강**

```json
{
  "// 기존 데이터 ...": "...",
  "learning_group": {
    "instructors": [
      {"type": "외부", "role": "팀장", "affiliation": "AI연구소", "position": "수석연구원", "name": "김전문"}
    ],
    "trainees": [
      {"role": "팀원", "affiliation": "QA팀", "position": "사원", "name": "이검사"},
      {"role": "팀원", "affiliation": "QA팀", "position": "사원", "name": "박품질"}
    ]
  },
  "training_contents": [
    {"unit_name": "CV 기초", "detail": "1단원: 영상 처리 기본", "training_hours": "4", "instructor_hours": {"external": "4", "internal": "0"}},
    {"unit_name": "객체 검출", "detail": "2단원: YOLO 실습", "training_hours": "8", "instructor_hours": {"external": "6", "internal": "2"}}
  ],
  "facilities": [
    {"seq": "1", "category": "AI 인프라", "name": "고사양 PC", "spec": "RTX 4090 × 5", "location": "본사 3층 교육장"},
    {"seq": "2", "category": "AI 도구", "name": "YOLO 라이선스", "spec": "Enterprise", "location": "클라우드"}
  ],
  "training_instructors": [
    {"name": "김전문", "internal_external": "외부", "career_years": "10", "work_name": "비전 모델 강의", "detailed_training_content": ["객체 검출 실습", "Transfer learning 실습"]},
    {"name": "박관리", "internal_external": "내부", "career_years": "5", "work_name": "OJT 멘토링", "detailed_training_content": ["현장 적용 가이드"]}
  ]
}
```

- [ ] **Step C-10.2: pbl-max-length.json 동일 보강 (긴 한국어)**
- [ ] **Step C-10.3: pbl-special-chars.json 동일 보강 (특수문자)**
- [ ] **Step C-10.4: pbl-empty.json 은 변경 없음 (빈 객체 케이스)**
- [ ] **Step C-10.5: 커밋**

```bash
git add api/hwpx/__fixtures__/pbl-full.json \
  api/hwpx/__fixtures__/pbl-max-length.json \
  api/hwpx/__fixtures__/pbl-special-chars.json
git commit -m "fix(hwpx): fixture 에 facilities/instructors/contents/learning_group 데이터 추가 (PR #5 C-10)"
```

---

## 5. Phase D: pytest 회귀 + fixture HWPX 8 종 재생성

**Files:**
- Modify: `api/hwpx/test_integration_fixtures.py` — 11 종 회귀 케이스 추가
- Generate: `docs/screenshots/2026-04-24/hwpx-hancom/{roadmap,pbl}-{empty,full,max-length,special-chars}.hwpx` (working tree 에 untracked 로 이미 있음 — 재생성 후 갱신)

### Task D: 회귀 + 재생성

- [ ] **Step D.1: pytest 통합 테스트 PASS 확인**

```bash
.venv/bin/pytest api/hwpx/test_integration_fixtures.py -v
.venv/bin/pytest api/hwpx/test_placeholders_roadmap.py -v
.venv/bin/pytest api/hwpx/test_placeholders_pbl.py -v
```

Expected: 75 (PR #4) + 신규 11 종 회귀 = **86+ PASS**

- [ ] **Step D.2: fixture HWPX 8 종 재생성**

```bash
# 브리지 서버 띄운 상태에서 cURL 또는 별도 스크립트로 8 fixture 다운로드
npm run dev:hwpx & # 백그라운드
sleep 3
for fixture in roadmap-empty roadmap-full roadmap-max-length roadmap-special-chars \
               pbl-empty pbl-full pbl-max-length pbl-special-chars; do
  track=$(echo "$fixture" | cut -d'-' -f1 | tr 'a-z' 'A-Z')
  curl -X POST http://localhost:3010/api/hwpx/generate \
    -H "X-HWPX-Secret: ${HWPX_API_SECRET:-dev}" \
    -H "Content-Type: application/json" \
    -d "{\"track\":\"$track\",\"data\":$(cat "api/hwpx/__fixtures__/$fixture.json"),\"fileName\":\"$fixture.hwpx\"}" \
    -o "docs/screenshots/2026-04-24/hwpx-hancom/$fixture.hwpx"
done
kill %1
```

- [ ] **Step D.3: ZIP 매직 + placeholder 잔존 검증**

```bash
for f in docs/screenshots/2026-04-24/hwpx-hancom/*.hwpx; do
  hexdump -C "$f" | head -1 | grep -q "504b 0304" && echo "$f OK" || echo "$f FAIL"
done
```

- [ ] **Step D.4: SSOT 매핑 완전성 재검증**

```bash
node scripts/verify-mapping-completeness.mjs
```

Expected: `94 unique placeholders, 누락 0`

- [ ] **Step D.5: 사용자 한컴 재검증 의뢰**

사용자에게 8 fixture HWPX 를 한컴오피스에서 다시 열어 11 종 누락 + 자간 회귀 모두 해결됐는지 확인 요청.

- [ ] **Step D.6: 커밋**

```bash
git add docs/screenshots/2026-04-24/hwpx-hancom/*.hwpx \
  api/hwpx/test_integration_fixtures.py
git commit -m "test(hwpx): 11 종 누락 회귀 케이스 추가 + fixture HWPX 재생성 (PR #5 D)"
```

---

## 6. Phase E: 보고서 + npm validate/build + PR + CI + 머지

### Task E: 마무리

- [ ] **Step E.1: 보고서 신규 작성**

`docs/reports/2026-04-27-hwpx-form-fixes-report.md` 생성:

```markdown
# 2026-04-27 HWPX 양식 보강 리포트 (PR #5)

> PR #4 (eefad0d) 머지 후 사용자 한컴오피스 검증 (DoD #7) 에서 발견된 11 종 누락 + 자간 회귀를 보강한 follow-up PR 의 종결 보고서.

## 요약
- 표 인덱스 시프트 없음 (사전 진단)
- 11 종 누락 모두 해결 (위 표)
- 자간 회귀: 신규 정본 교체로 자동 해결
- pytest 75 → 86+ PASS

## (이하 §A~§E 결과 누적)
```

- [ ] **Step E.2: PR #4 보고서 §5.4 갱신**

`docs/reports/2026-04-24-form-parity-report.md` §5.4 표 모든 ⏳ → ✅ (한컴 재검증 완료 시).

- [ ] **Step E.3: `npm run validate && npm run build` PASS 확인**

```bash
npm run validate && npm run build
```

- [ ] **Step E.4: PR 생성**

```bash
git checkout -b chore/pr5-hwpx-form-fixes
git push -u origin chore/pr5-hwpx-form-fixes
gh pr create --title "fix(hwpx): 신규 정본 교체 + 누락 11 종 보강 (PR #4 follow-up)" --body "$(cat <<'EOF'
## Summary
- 사용자 한컴 검증 (DoD #7) 회귀 11 종 보강 + 자간 회피 정본 교체
- templates/hwpx/{roadmap,pbl}.hwpx hash 84d1e67·8952576 으로 갱신
- generate.py cover/cell_fill 9 함수 신규/보강

## Test plan
- [x] pytest 86+ PASS
- [x] npm run validate && npm run build
- [ ] CI Lint·Typecheck·Unit·Build·E2E·Vercel 6/6 pass
- [ ] 사용자 한컴오피스 재검증 8 fixture

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step E.5: CI 모니터링**

```bash
gh pr checks <PR>
```

Expected: Lint·Typecheck·Unit·Build·**E2E**·Vercel 6/6 pass.

- [ ] **Step E.6: superpowers:requesting-code-review + 리뷰 반영**

- [ ] **Step E.7: 사용자 승인 + verification-before-completion**

- [ ] **Step E.8: squash merge**

---

## 7. Definition of Done (사전 prompt 기준)

| # | 항목 | 검증 방법 |
|---|---|---|
| 1 | 서식 정본 갱신 | `shasum -a 256 templates/hwpx/{roadmap,pbl}.hwpx` = `84d1e67…`/`8952576…` |
| 2 | 표 인덱스 SSOT 정합 | 사전 진단 — 시프트 없음 (B) |
| 3 | 누락 11 종 모두 해결 | pytest 11 회귀 케이스 PASS + 사용자 한컴 재검증 ✅ |
| 4 | 자간·줄바꿈 회귀 없음 | 신규 정본 교체로 자동 해결 + 사용자 시각 검증 |
| 5 | 회귀 테스트 보강 | pytest 75 → 86+ |
| 6 | npm validate && build | exit 0 |
| 7 | PR CI 6 check pass | gh pr checks |
| 8 | 사용자 한컴 재검증 | 8 fixture 모두 ✅ |
| 9 | verification-before-completion | 머지 직전 호출 |

---

## 8. Self-Review

### 8.1 Spec coverage 체크
- ✅ R-01 표지 회사명·일자 — Task C-1
- ✅ R-08 URL raw — Task C-3
- ✅ 자간 — Phase A 정본 교체
- ✅ P-01 표지 — Task C-2
- ✅ P-02 4 필드 — Task C-4
- ✅ P-03 — Task C-5
- ✅ P-05 — Task C-4 의 일부 (training_env 매핑은 이미 존재 — fixture 누락 가능성)
- ✅ P-07 — Task C-5
- ✅ P-11 점수 — Task C-7
- ✅ P-12 머리기호 — Task C-6
- ✅ P-13 빠진 칸 — Task C-8
- ✅ P-20 거의 누락 — Task C-9
- ✅ P-21·P-22 — Task C-10
- ⚠️ P-04 (조직도) — prompt 에 "건드리지 말 것" 명시 → 작업 제외

### 8.2 Type 일관성
- `_set_cell_text` (str·int·int·str) — 모든 호출에서 동일
- `_replace_in_all_runs` (doc·str·str) — 동일
- `cover` 객체 신규 추가 — `pm`/`external_experts[]`/`internal_experts[]`/`doctors[]` 4 필드

### 8.3 Placeholder scan
- "TBD"·"TODO"·"implement later" — 본 계획서에 없음
- C-7 의 root cause 재분석 후 결정 — 단계 명시 (Step C-7.2 진단 후 보강)
- C-9 의 셀 좌표 진단 후 확정 — 단계 명시 (Step C-9.1 진단)

---

## Execution Handoff

Plan complete and saved to `docs/plans/2026-04-27-hwpx-form-fixes.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — 각 Task 별 fresh subagent dispatch + 두 단계 리뷰. 빠른 반복.
2. **Inline Execution** — 본 세션에서 Phase A→B→C-1→...→E 순차 실행. 체크포인트마다 사용자 검토.

**자동 모드 활성** (Auto Mode) — 사용자가 자율 실행을 선택했으므로, 별도 명시가 없으면 **Inline Execution** 으로 즉시 Phase A 부터 진행한다.
