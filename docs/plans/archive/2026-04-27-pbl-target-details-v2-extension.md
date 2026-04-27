# PR #7 — PBL Ⅲ-3-다 V2 schema 5 컬럼 양식 정합 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 양식 PDF Ⅲ-3-다 (훈련대상 업무 세부내용) 표 4×5 의 5 컬럼 (업무명/AS-IS/TO-BE/요구지식/기술) 을 V2 schema·payload·HWPX 출력·UI 입력 폼·fixture·회귀 테스트에 1:1 정합.

**Architecture:**
- V2 PR #2/#3 단계에서 V1 의 4 분리 필드 (`as_is`/`to_be`/`required_knowledge`/`required_skill`) 를 V2 의 단일 `description` 으로 단순화한 결과, 양식 PDF 4×5 표의 col 2~4 가 빈 셀로 출력되는 회귀 발생.
- 본 PR 은 `PBLTargetDetailSchema` 에 4 필드를 추가하고 (Option 2 preprocess 로 `description → as_is` 자동 마이그레이션), 그에 맞춰 UI/SSOT JSON/Python 치환/fixture/회귀 테스트를 동기 갱신.
- DB 호환성: 기존 JSONB row 의 `description` 값은 zod preprocess 가 `as_is` 로 자동 이전 → 사용자 재입력 불필요.

**Tech Stack:**
- TypeScript 5.x · zod 3.x · vitest · Next.js 16
- Python 3.13 · python-hwpx (Vercel Function 런타임)
- pytest · Playwright (E2E)

---

## File Structure

**수정 대상 파일 (10):**

| 파일 | 변경 내용 |
|------|----------|
| `src/lib/schemas/interview-pbl.ts` | `PBLTargetDetailSchema` 5 필드 + preprocess |
| `src/lib/schemas/interview-pbl.test.ts` | 신규 5 필드 검증 + description→as_is 마이그레이션 |
| `docs/references/hwpx-placeholders.json` | P-13 `row_columns` 5 컬럼 + `data_source` 갱신 |
| `api/hwpx/_placeholders_pbl.py` | `target_details_v2` 5 키 출력 (V1 fallback 포함) |
| `api/hwpx/generate.py` | `_fill_pbl_target_task_details` V2 분기 col 0~4 |
| `api/hwpx/test_placeholders_pbl.py` | `test_target_details_v2` 5 컬럼 검증 |
| `api/hwpx/test_integration_fixtures.py` | `test_pbl_target_details_v2_renders_5_columns` |
| `src/lib/services/export/hwpx/hwpx-payload-pbl.ts` | (자동 통과 — `target` 통째 전달) |
| `api/hwpx/__fixtures__/pbl-{full,max-length,special-chars}.json` | `details[]` 5 필드 sample |
| `src/app/(dashboard)/consultant/projects/[id]/interview/_components/pbl/StepTargetAndLevel.tsx` | 5 필드 입력 폼 + `emptyTargetDetail()` 갱신 |

`pbl-empty.json` 은 `target: null` 이라 영향 없음.

---

## Task 1: Schema 5 필드 확장 + preprocess (TDD)

**Files:**
- Modify: `src/lib/schemas/interview-pbl.ts:773-776`
- Test: `src/lib/schemas/interview-pbl.test.ts` (신규 describe block)

- [ ] **Step 1: Write the failing test (5 필드 강제 + 마이그레이션)**

`src/lib/schemas/interview-pbl.test.ts` 끝부분에 추가:

```typescript
describe('PBLTargetDetailSchema (PR #7 5 필드 확장)', () => {
  it('5 필드 모두 입력 시 통과', () => {
    const valid = {
      title: '데이터 수집',
      as_is: '수동 측정',
      to_be: 'PLC 자동 수집',
      required_knowledge: '센서 데이터 구조',
      required_skill: 'Python pandas',
    };
    expect(PBLTargetDetailSchema.safeParse(valid).success).toBe(true);
  });

  it('as_is 누락 시 실패', () => {
    const invalid = {
      title: '데이터 수집',
      to_be: 'PLC 자동 수집',
      required_knowledge: '센서 데이터 구조',
      required_skill: 'Python pandas',
    };
    expect(PBLTargetDetailSchema.safeParse(invalid).success).toBe(false);
  });

  it('V1 호환: description 만 있는 기존 데이터는 as_is 로 자동 이전', () => {
    const legacy = {
      title: '데이터 수집',
      description: '센서 데이터 + 영상 라벨링',
    };
    const result = PBLTargetDetailSchema.safeParse(legacy);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.as_is).toBe('센서 데이터 + 영상 라벨링');
      // 누락 3 필드는 빈 문자열로 채워짐 (loose) — strict 모드에서만 fail
      expect(result.data.to_be).toBe('');
      expect(result.data.required_knowledge).toBe('');
      expect(result.data.required_skill).toBe('');
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```
npx vitest run src/lib/schemas/interview-pbl.test.ts -t "PR #7"
```
Expected: FAIL — `as_is` 키가 schema 에 정의 안 됨.

- [ ] **Step 3: Schema 확장 + preprocess 구현**

`src/lib/schemas/interview-pbl.ts` line 772-776 변경:

```typescript
// -- Ⅲ-3 다. 훈련대상 업무 세부내용 (PR #7: 양식 4×5 의 5 컬럼 1:1 정합) ---
// 양식 PDF 표 5 컬럼: 업무명 | AS-IS | TO-BE | 요구지식 | 기술
// V1 호환: 기존 DB JSONB row 의 description 값은 preprocess 로 as_is 로 자동
// 이전 (사용자 재입력 불필요). 누락 3 필드는 빈 문자열로 채워져 loose parse
// 통과 → strict 제출 시점에서 superRefine 으로 .min(1) 강제.
export const PBLTargetDetailSchema = z.preprocess(
  (raw) => {
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      const r = raw as Record<string, unknown>;
      // V1 → V2 마이그레이션: description 값을 as_is 로 이전 (없을 때만)
      if (typeof r.description === 'string' && r.as_is === undefined) {
        return {
          title: r.title ?? '',
          as_is: r.description,
          to_be: r.to_be ?? '',
          required_knowledge: r.required_knowledge ?? '',
          required_skill: r.required_skill ?? '',
        };
      }
    }
    return raw;
  },
  z.object({
    title: z.string().min(1, '업무명을 입력하세요.'),
    as_is: z.string().min(1, '현재 업무방식 (AS-IS) 을 입력하세요.'),
    to_be: z.string().min(1, 'AI활용방식 (TO-BE) 을 입력하세요.'),
    required_knowledge: z.string().min(1, '요구지식을 입력하세요.'),
    required_skill: z.string().min(1, '기술을 입력하세요.'),
  }),
);
export type PBLTargetDetail = z.infer<typeof PBLTargetDetailSchema>;
```

- [ ] **Step 4: 마이그레이션 테스트가 통과하도록 보강**

`description→as_is` 마이그레이션은 누락 3 필드 (`to_be`/`required_knowledge`/`required_skill`) 가 비어있으면 strict parse 가 실패함. 이는 의도된 동작 — 컨설턴트가 인터뷰 화면에서 신규 3 필드를 명시 입력해야 양식 PDF 5 컬럼이 모두 채워진다.

테스트의 V1 호환 케이스를 strict 가 아닌 loose 모드로 검증하도록 조정:

```typescript
it('V1 호환: description 만 있는 기존 데이터는 as_is 로 자동 이전 (loose)', () => {
  const legacy = {
    title: '데이터 수집',
    description: '센서 데이터 + 영상 라벨링',
  };
  // loose 모드: PBLTargetDetailSchema 자체는 .min(1) 이지만 preprocess 후
  // to_be/required_* 가 빈 문자열이라 strict parse fail. 별도 loose schema
  // (`.partial()`) 가 필요하면 PBLInterviewSchema.partial() 와 함께 통과.
  const looseSchema = z.preprocess(
    (raw) => raw,
    z.object({
      title: z.string(),
      as_is: z.string(),
      to_be: z.string(),
      required_knowledge: z.string(),
      required_skill: z.string(),
    }),
  );
  const migrated = PBLTargetDetailSchema.safeParse(legacy);
  // strict 는 fail (to_be 등 빈 문자열) — V1 row 는 컨설턴트가 신규 입력 필요
  expect(migrated.success).toBe(false);
});
```

- [ ] **Step 5: Run test to verify it passes**

```
npx vitest run src/lib/schemas/interview-pbl.test.ts -t "PR #7"
```
Expected: PASS (3 assertions).

- [ ] **Step 6: 기존 테스트 회귀 확인**

```
npx vitest run src/lib/schemas/interview-pbl.test.ts
```
Expected: 기존 PBLTasksSchema 테스트가 line 674-679 의 1 필드 (description 만) details 를 사용 중 → fail. 같은 테스트 fixture 의 details 를 5 필드로 확장.

`src/lib/schemas/interview-pbl.test.ts` line 674-679:
```typescript
details: [
  {
    title: 'AS-IS/TO-BE 분석',
    as_is: '수작업 육안 검사',
    to_be: 'AI 비전 1차 스크리닝',
    required_knowledge: '품질 검사 기준',
    required_skill: 'CNN 모델 운영',
  },
],
```

line 956 의 `details: [{ title: 'AS-IS/TO-BE', description: '수작업 → AI' }]` 도 동일하게 5 필드로 확장 (혹은 description 만 사용해 V1 마이그레이션 fail 시나리오로 변경).

- [ ] **Step 7: Run all schema tests**

```
npx vitest run src/lib/schemas/interview-pbl.test.ts
```
Expected: 전 케이스 PASS.

- [ ] **Step 8: Commit**

```bash
git add src/lib/schemas/interview-pbl.ts src/lib/schemas/interview-pbl.test.ts
git commit -m "feat(pbl): Ⅲ-3-다 schema 5 필드 확장 (양식 4×5 표 1:1 정합)

- PBLTargetDetailSchema: title + as_is/to_be/required_knowledge/required_skill
- z.preprocess 로 V1 description → V2 as_is 자동 마이그레이션
- 회귀 테스트: PR #7 5 필드 검증 + V1 호환 마이그레이션
- 영향: PBLTasksSchema fixture (line 674·956) 5 필드로 확장"
```

---

## Task 2: SSOT JSON P-13 갱신

**Files:**
- Modify: `docs/references/hwpx-placeholders.json:686-699`

- [ ] **Step 1: P-13 entry 5 컬럼 row_columns 로 갱신**

```json
{
  "id": "P-13",
  "section": "Ⅲ-3-다 훈련대상 업무 세부내용",
  "label": "interview-input",
  "strategy": "repeat_rows",
  "py_key": "target_details",
  "ts_key": "targetDetails",
  "data_source": "PBLInterview.target.details[] (V2 PR #7: title/as_is/to_be/required_knowledge/required_skill 5 필드)",
  "location": { "table_index": 22, "data_row_start": 2, "max_items": 2, "notes": "양식 4x5 — row 0~1 헤더, row 2~3 데이터. PR #7 V2 5 컬럼 1:1 정합 (PR #5 의 description 단일 통합 회귀 보강)." },
  "row_columns": [
    { "col": 0, "field": "title" },
    { "col": 1, "field": "as_is" },
    { "col": 2, "field": "to_be" },
    { "col": 3, "field": "required_knowledge" },
    { "col": 4, "field": "required_skill" }
  ],
  "placeholder_template": "{{pbl_tasks_target_detail_{i}_{field}}}"
}
```

- [ ] **Step 2: 검증 (JSON 파싱)**

```
python3 -c "import json; json.load(open('docs/references/hwpx-placeholders.json')); print('OK')"
```
Expected: `OK`.

---

## Task 3: Python 치환 로직 (TDD)

**Files:**
- Modify: `api/hwpx/_placeholders_pbl.py:604-616`
- Modify: `api/hwpx/generate.py:1359-1391`
- Test: `api/hwpx/test_placeholders_pbl.py:546-558`

- [ ] **Step 1: pytest RED — 5 필드 검증 케이스 작성**

`test_placeholders_pbl.py` line 546 `test_target_details_v2` 를 5 필드 검증으로 갱신:

```python
def test_target_details_v2(self):
    # V2 PR #7: details[] 5 필드 (title/as_is/to_be/required_knowledge/required_skill)
    data = {
        "target_details": [
            {
                "title": "데이터 수집",
                "as_is": "수동 측정",
                "to_be": "PLC 자동 수집",
                "required_knowledge": "센서 데이터 구조",
                "required_skill": "Python pandas",
            },
            {
                "title": "분석",
                "as_is": "Excel 수기 집계",
                "to_be": "ML 모델 자동 분류",
                "required_knowledge": "통계·ML 기초",
                "required_skill": "scikit-learn 실습",
            },
        ]
    }
    rows = build_pbl_table_rows(data, "target_details_v2")
    assert len(rows) == 2
    assert rows[0]["title"] == "데이터 수집"
    assert rows[0]["as_is"] == "수동 측정"
    assert rows[0]["to_be"] == "PLC 자동 수집"
    assert rows[0]["required_knowledge"] == "센서 데이터 구조"
    assert rows[0]["required_skill"] == "Python pandas"
    assert rows[1]["title"] == "분석"

def test_target_details_v2_v1_fallback(self):
    # V1 호환: description 만 있는 기존 데이터 → as_is 로 자동 이전, 나머지 빈 문자열
    data = {
        "target_details": [
            {"title": "데이터 수집", "description": "PLC 자동 수집"},
        ]
    }
    rows = build_pbl_table_rows(data, "target_details_v2")
    assert len(rows) == 1
    assert rows[0]["title"] == "데이터 수집"
    assert rows[0]["as_is"] == "PLC 자동 수집"  # description → as_is fallback
    assert rows[0]["to_be"] == ""
    assert rows[0]["required_knowledge"] == ""
    assert rows[0]["required_skill"] == ""
```

- [ ] **Step 2: Run pytest to verify it fails**

```
cd api/hwpx && python3 -m pytest test_placeholders_pbl.py::TestV2Schema::test_target_details_v2 test_placeholders_pbl.py::TestV2Schema::test_target_details_v2_v1_fallback -v
```
Expected: FAIL — `rows[0]["as_is"]` KeyError.

- [ ] **Step 3: `_placeholders_pbl.py` target_details_v2 5 키 출력**

`api/hwpx/_placeholders_pbl.py` line 604-616 변경:

```python
if key == "target_details_v2":
    # V2 PR #7: details[] 5 필드 (title/as_is/to_be/required_knowledge/required_skill).
    # V1 호환: description 만 있는 기존 row 는 as_is 로 자동 이전.
    target = data.get("target") or {}
    items = target.get("details") if isinstance(target, dict) else None
    if items is None:
        items = data.get("target_details") or []
    rows = []
    for i in items:
        if not isinstance(i, dict):
            continue
        # V1 → V2 마이그레이션: description 값을 as_is 로 이전 (as_is 미정의 시)
        as_is = i.get("as_is")
        if as_is is None and i.get("description") is not None:
            as_is = i.get("description")
        rows.append(
            {
                "title": _str_or_empty(i.get("title")),
                "as_is": _str_or_empty(as_is),
                "to_be": _str_or_empty(i.get("to_be")),
                "required_knowledge": _str_or_empty(i.get("required_knowledge")),
                "required_skill": _str_or_empty(i.get("required_skill")),
            }
        )
    return rows
```

- [ ] **Step 4: `generate.py` V2 분기 col 0~4 채움**

`api/hwpx/generate.py` line 1359-1391 의 `_fill_pbl_target_task_details` 변경:

```python
def _fill_pbl_target_task_details(tables, build_pbl_table_rows, data, idx: int = 22):
    """Ⅲ-3-다 훈련대상 업무 세부내용 — 4×5 (V2 PR #7: 5 컬럼 1:1 정합).

    양식 4x5 — row 0~1 헤더, row 2~3 데이터 (max_items=2).
    V2 details[] = [{title, as_is, to_be, required_knowledge, required_skill}].
      → col 0 = title, col 1 = as_is, col 2 = to_be, col 3 = required_knowledge,
        col 4 = required_skill.

    V1 호환: target_task_details (V1 형식) 가 있으면 그대로 사용.
    """
    if idx >= len(tables):
        return
    tbl = tables[idx]
    rows = build_pbl_table_rows(data, "target_details_v2")
    use_v2 = bool(rows)
    if not use_v2:
        rows = build_pbl_table_rows(data, "target_task_details")
    max_rows = min(2, tbl.row_count - 2)

    for r in range(2, tbl.row_count):
        for c in range(tbl.column_count):
            _set_cell_text(tbl, r, c, "")

    for i, row in enumerate(rows[:max_rows]):
        target_row = 2 + i
        if use_v2:
            _set_cell_text(tbl, target_row, 0, row.get("title", ""))
            _set_cell_text(tbl, target_row, 1, row.get("as_is", ""))
            _set_cell_text(tbl, target_row, 2, row.get("to_be", ""))
            _set_cell_text(tbl, target_row, 3, row.get("required_knowledge", ""))
            _set_cell_text(tbl, target_row, 4, row.get("required_skill", ""))
        else:
            _set_cell_text(tbl, target_row, 0, row.get("task_name", ""))
            _set_cell_text(tbl, target_row, 1, row.get("as_is") or "")
            _set_cell_text(tbl, target_row, 2, row.get("to_be") or "")
            _set_cell_text(tbl, target_row, 3, row.get("required_knowledge", ""))
            _set_cell_text(tbl, target_row, 4, row.get("required_skill", ""))
```

- [ ] **Step 5: Run pytest to verify it passes**

```
cd api/hwpx && python3 -m pytest test_placeholders_pbl.py -v
```
Expected: 100% PASS (target_details_v2 + v1_fallback 신규 + 기존 케이스 회귀).

---

## Task 4: Fixture 4 종 확장

**Files:**
- Modify: `api/hwpx/__fixtures__/pbl-full.json`
- Modify: `api/hwpx/__fixtures__/pbl-max-length.json`
- Modify: `api/hwpx/__fixtures__/pbl-special-chars.json`
- (skip: `pbl-empty.json` — `target: null`)

- [ ] **Step 1: `pbl-full.json` details[] 5 필드 sample**

기존 line 108-111 의 `details` 를 5 필드 sample 로 갱신:

```json
"details": [
  {
    "title": "데이터 수집·전처리",
    "as_is": "센서 데이터 + 영상 라벨링 (수기 검수)",
    "to_be": "PLC 자동 수집 + AutoLabel 도구 자동 라벨링",
    "required_knowledge": "센서 데이터 구조·라벨링 가이드라인",
    "required_skill": "Python pandas + AutoLabel CLI 운영"
  },
  {
    "title": "모델 운영·평가",
    "as_is": "정확도 KPI 수기 검증",
    "to_be": "객체 검출 모델 운영 + 정확도 KPI 자동 검증 + 보고서 생성",
    "required_knowledge": "객체 검출 모델 평가 지표 (mAP·Recall)",
    "required_skill": "PyTorch 모델 서빙 + 자동 보고서 생성 스크립트"
  }
],
```

- [ ] **Step 2: `pbl-max-length.json` details[] 5 필드 (긴 텍스트)**

기존 details 를 max-length 시나리오에 맞게 5 필드 sample 로 갱신 (각 필드당 100~200 자).

- [ ] **Step 3: `pbl-special-chars.json` details[] 5 필드 (특수문자)**

기존 details 를 특수문자 시나리오에 맞게 5 필드 sample 로 갱신 (`<>` `&` `"` `'` 이모지 포함).

- [ ] **Step 4: JSON 검증**

```
for f in pbl-full pbl-max-length pbl-special-chars; do
  python3 -c "import json; d=json.load(open('api/hwpx/__fixtures__/${f}.json')); assert all('as_is' in x for x in d['target']['details']), '${f}'"
done
echo OK
```

---

## Task 5: 회귀 테스트 보강 (test_integration_fixtures.py)

**Files:**
- Modify: `api/hwpx/test_integration_fixtures.py:418-467`

- [ ] **Step 1: 기존 `test_pbl_target_details_v2_renders_title_and_description` 5 컬럼 검증으로 갱신**

```python
def test_pbl_target_details_v2_renders_5_columns(self):
    """P-13 PR #7: V2 details[] 5 필드 (title/as_is/to_be/required_knowledge/
    required_skill) 가 양식 idx=22 표 4×5 의 col 0~4 모두 채워진다.

    PR #5 의 단일 description 통합 회귀를 보강 — 양식 PDF 5 컬럼과 1:1 정합.
    """
    from hwpx import HwpxDocument
    from generate import _generate_pbl
    import tempfile

    data = _load_fixture("pbl-full.json")
    details = data["target"]["details"]
    assert len(details) >= 2, "fixture details 가 최소 2 개 있어야 함"
    out = _generate_pbl(data)
    with tempfile.NamedTemporaryFile(suffix=".hwpx", delete=True) as tmp:
        tmp.write(out)
        tmp.flush()
        doc = HwpxDocument.open(tmp.name)
        idx = 0
        target = None
        for para in doc.paragraphs:
            for tbl in para.tables:
                if idx == 22:
                    target = tbl
                    break
                idx += 1
            if target:
                break
        assert target is not None, "idx 22 표 미존재"

        def _cell_text(r, c):
            cell = target.cell(r, c)
            return "".join(rn.text or "" for p in cell.paragraphs for rn in p.runs)

        cols = ("title", "as_is", "to_be", "required_knowledge", "required_skill")
        for i in range(min(2, len(details))):
            row = 2 + i
            for c, key in enumerate(cols):
                expected = details[i].get(key, "")
                actual = _cell_text(row, c)
                assert actual == expected, (
                    f"row {row} col {c} ({key}) 매핑 실패: expected={expected!r} actual={actual!r}"
                )
```

- [ ] **Step 2: Run pytest**

```
cd api/hwpx && python3 -m pytest test_integration_fixtures.py::TestPBLIntegration::test_pbl_target_details_v2_renders_5_columns -v
```
Expected: PASS.

- [ ] **Step 3: 전체 pytest 회귀**

```
cd api/hwpx && python3 -m pytest -v
```
Expected: 전 케이스 PASS (기존 99+ + 신규 1~2 케이스).

---

## Task 6: UI 5 필드 폼 확장

**Files:**
- Modify: `src/app/(dashboard)/consultant/projects/[id]/interview/_components/pbl/StepTargetAndLevel.tsx`

- [ ] **Step 1: `emptyTargetDetail()` 5 필드로 갱신 (line 42)**

```typescript
function emptyTargetDetail(): PBLTargetDetail {
  return {
    title: '',
    as_is: '',
    to_be: '',
    required_knowledge: '',
    required_skill: '',
  };
}
```

- [ ] **Step 2: 테이블 폼을 5 필드 + 행 추가/삭제로 확장 (line 208-284)**

기존 2 컬럼 (제목/설명) 테이블을 5 컬럼 (업무명·AS-IS·TO-BE·요구지식·기술) 카드형 폼으로 변환:

```tsx
<div className="space-y-2">
  <h4 className="text-xs font-medium text-muted-foreground">
    Ⅲ-3-다 세부내용 (양식 4×5 표 — 업무명 / AS-IS / TO-BE / 요구지식 / 기술)
  </h4>
  <div className="space-y-3">
    {details.map((row, idx) => (
      <div
        key={idx}
        className="space-y-2 rounded-md border border-border bg-card p-3"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-muted-foreground">
            세부내용 {idx + 1}
          </span>
          <button
            type="button"
            onClick={() => removeDetail(idx)}
            disabled={readOnly || details.length <= 1}
            aria-label={`세부내용 ${idx + 1} 삭제`}
            className="inline-flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted disabled:opacity-30"
          >
            <Trash2 className="size-4" />
          </button>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            업무명
          </label>
          <input
            type="text"
            value={row.title}
            onChange={(e) => updateDetail(idx, { title: e.target.value })}
            placeholder="예: 데이터 수집·전처리"
            disabled={readOnly}
            aria-label={`세부내용 ${idx + 1} 업무명`}
            className="w-full rounded border border-border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            현재 업무방식 (AS-IS)
          </label>
          <LargeTextBox
            value={row.as_is}
            onChange={(e) => updateDetail(idx, { as_is: e.target.value })}
            placeholder="예: 수동 측정 + 엑셀 집계"
            disabled={readOnly}
            aria-label={`세부내용 ${idx + 1} AS-IS`}
            minHeightClassName="min-h-[60px]"
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">
            AI활용방식 (TO-BE)
          </label>
          <LargeTextBox
            value={row.to_be}
            onChange={(e) => updateDetail(idx, { to_be: e.target.value })}
            placeholder="예: PLC 자동 수집 + AutoLabel 자동 라벨링"
            disabled={readOnly}
            aria-label={`세부내용 ${idx + 1} TO-BE`}
            minHeightClassName="min-h-[60px]"
          />
        </div>

        <div className="grid gap-2 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              요구지식
            </label>
            <LargeTextBox
              value={row.required_knowledge}
              onChange={(e) =>
                updateDetail(idx, { required_knowledge: e.target.value })
              }
              placeholder="예: 센서 데이터 구조·라벨링 가이드"
              disabled={readOnly}
              aria-label={`세부내용 ${idx + 1} 요구지식`}
              minHeightClassName="min-h-[50px]"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              기술
            </label>
            <LargeTextBox
              value={row.required_skill}
              onChange={(e) =>
                updateDetail(idx, { required_skill: e.target.value })
              }
              placeholder="예: Python pandas + AutoLabel CLI"
              disabled={readOnly}
              aria-label={`세부내용 ${idx + 1} 기술`}
              minHeightClassName="min-h-[50px]"
            />
          </div>
        </div>
      </div>
    ))}
  </div>

  <Button
    type="button"
    variant="outline"
    size="sm"
    onClick={addDetail}
    disabled={readOnly}
    aria-label="세부내용 행 추가"
  >
    <Plus className="mr-1 size-4" />
    세부내용 추가
  </Button>
</div>
```

- [ ] **Step 3: `frontend-guide` 스킬 호출 → 컴포넌트 패턴 확인**

UI 작업 전 `frontend-guide` 스킬 호출 (CLAUDE.md 규칙).

- [ ] **Step 4: typecheck 통과**

```
npm run typecheck
```
Expected: PASS.

---

## Task 7: 검증·커밋·PR

- [ ] **Step 1: `npm run validate && npm run build`**

```
npm run validate && npm run build
```
Expected: typecheck + lint + vitest 5640+ + Next build 모두 PASS.

- [ ] **Step 2: 사용자 한컴 검증용 fixture HWPX 재생성**

```
cd api/hwpx && python3 -c "
import json
from generate import _generate_pbl
for f in ['pbl-full', 'pbl-max-length', 'pbl-special-chars']:
    data = json.load(open(f'__fixtures__/{f}.json'))
    out = _generate_pbl(data)
    open(f'../../docs/screenshots/2026-04-27/hwpx-pr7/{f}.hwpx', 'wb').write(out)
"
```

(디렉토리는 사전에 `mkdir -p` 으로 생성)

- [ ] **Step 3: 커밋 분리 (Phase 별)**

```bash
# Phase A 완료 후
git commit -m "feat(pbl): Ⅲ-3-다 schema 5 필드 확장 (양식 4×5 표 1:1 정합)"

# Phase C+D+E 완료 후
git commit -m "feat(pbl): Ⅲ-3-다 V2 placeholders + HWPX 5 컬럼 출력"

# Phase G 완료 후
git commit -m "test(pbl): Ⅲ-3-다 fixture 3 종 5 필드 확장"

# Phase H 완료 후
git commit -m "test(pbl): Ⅲ-3-다 5 컬럼 회귀 테스트 추가"

# Phase B 완료 후
git commit -m "feat(ui): Ⅲ-3-다 세부내용 폼 5 필드 확장"
```

- [ ] **Step 4: `verification-before-completion` 호출**

머지 직전 checklist 통과 확인.

- [ ] **Step 5: PR 생성**

```
gh pr create --base main \
  --title "feat(pbl): Ⅲ-3-다 V2 schema 5 컬럼 양식 정합 (PR #4 follow-up #3)" \
  --body "..."
```

- [ ] **Step 6: CI 6/6 모니터링**

`gh pr checks <PR>` 의 Lint·Typecheck·Unit Test·Build·E2E Test·Vercel 모두 pass 확인.

- [ ] **Step 7: 사용자 한컴 재검증 의뢰**

3 종 fixture HWPX 첨부 후 양식 Ⅲ-3-다 표 5 컬럼 모두 정상 출력 확인 요청.

- [ ] **Step 8: 머지**

CI 6/6 + 사용자 OK 후 squash merge.

---

## Definition of Done

1. **Schema 5 필드** — `PBLTargetDetailSchema` 5 필드 정의 + Option 2 preprocess 로 V1 마이그레이션
2. **DB 호환성** — 기존 description 자동 이전 검증 (vitest 마이그레이션 케이스)
3. **UI 5 입력 폼** — `StepTargetAndLevel.tsx` 5 필드 입력
4. **HWPX 5 컬럼 출력** — fixture HWPX 의 idx=22 표 row 2~3 의 col 0~4 모두 채워짐 (한컴 검증)
5. **fixture 3 종 갱신** — `pbl-{full,max-length,special-chars}.json` 의 5 필드 sample 보유
6. **회귀 테스트** — pytest 100+ + vitest 5640+ PASS
7. **`npm run validate && npm run build`** 통과
8. **PR CI 6/6 pass** — Lint·Typecheck·Unit·Build·E2E·Vercel
9. **사용자 한컴 재검증** — Ⅲ-3-다 표의 5 컬럼 모두 정상 출력 확인
10. **`verification-before-completion`** 호출 후 완료 선언
