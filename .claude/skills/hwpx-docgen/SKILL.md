---
name: hwpx-docgen
description: "HWPX 한글 문서 생성·편집·분석·표 만들기. 템플릿 기반 문서 생성, 플레이스홀더 치환, 텍스트 추출, 구조 검증. Trigger: 한글 문서, HWPX, hwpx 생성, hwpx 편집, hwpx 분석, 표 만들기"
context: fork
agent: general-purpose
effort: high
allowed-tools: Bash Read Grep Write Edit
---

# hwpx-docgen

HWPX(한컴오피스 XML) 문서를 생성·편집·분석하는 스킬.

**핵심 원칙**: 모든 HWPX 조작은 **python-hwpx API**를 통해서만 수행합니다. XML을 직접 작성하거나 편집하지 않습니다.

## 쿼리

$ARGUMENTS

## 의사결정 트리

$ARGUMENTS를 분석해서 의도 분류:

| 키워드 | 워크플로우 |
|---|---|
| "생성", "만들어", "create", "new" | → Workflow 1 (문서 생성) |
| "편집", "수정", "바꿔", "치환", "edit" | → Workflow 2 (문서 편집) |
| "분석", "추출", "읽어", "analyze" | → Workflow 3 (문서 분석) |
| "표", "테이블", "table" | → Workflow 4 (표 생성) |
| "템플릿", "template", "목록", "list" | → Workflow 5 (템플릿 관리) |

---

## 사전 준비

모든 워크플로우 실행 전:

```bash
pip install python-hwpx lxml 2>/dev/null
```

---

## Workflow 1 — 문서 생성

### Step 1: 템플릿 선택

사용자 요청에서 문서 유형을 파악하고 해당 `.hwpx` 템플릿을 선택합니다.

| 유형 | 템플릿 파일 | 플레이스홀더 |
|---|---|---|
| 공문 | `templates/gonmun.hwpx` | 발신기관, 수신, 제목, 본문, 붙임, 날짜, 발신자, 담당자, 전화, 팩스 |
| 보고서 | `templates/report.hwpx` | 제목, 작성일, 작성자, 부서, 장N_제목, 장N_본문, 결론, 결론_본문 |
| 회의록 | `templates/minutes.hwpx` | 회의명, 일시, 장소, 참석자, 안건, 논의사항, 결정사항, 후속조치, 작성자 |
| 제안서 | `templates/proposal.hwpx` | 제목, 부제, 기관명, 날짜, 개요, 목적, 세부내용, 추진일정, 예산, 기대효과 |
| 기본 | `templates/base.hwpx` | (없음 — 빈 문서) |

### Step 2: python-hwpx로 문서 생성

**방법 A — build_hwpx.py 사용 (권장)**:

콘텐츠 JSON을 구성한 후:

```bash
python scripts/build_hwpx.py --template gonmun --content content.json --output output.hwpx
```

콘텐츠 JSON 형식:
```json
{
  "placeholders": {
    "{{발신기관}}": "한국생산성본부",
    "{{수신}}": "삼육대학교 총장",
    "{{제목}}": "협조 요청"
  },
  "paragraphs": [
    {"type": "text", "text": "추가 본문"},
    {"type": "table", "rows": 3, "cols": 4, "data": [["a","b","c","d"], ...]}
  ]
}
```

**방법 B — Python 직접 작성 (복잡한 커스텀 문서)**:

```python
from hwpx import HwpxDocument

doc = HwpxDocument.new()                    # 빈 문서 (Skeleton 기반)
# 또는
doc = HwpxDocument.open("templates/gonmun.hwpx")  # 템플릿 기반

# 플레이스홀더 치환
doc.replace_text_in_runs("{{발신기관}}", "한국생산성본부")

# 단락 추가
doc.add_paragraph("본문 내용")

# 표 추가
tbl = doc.add_table(3, 4)
cell = tbl.cell(0, 0)
cell.paragraphs[0].runs[0].text = "셀 내용"

# 저장
doc.save_to_path("output.hwpx")
```

### Step 3: 검증

```bash
python scripts/validate_hwpx.py output.hwpx
```

### Step 4: 결과 전달

생성된 `.hwpx` 파일 경로와 검증 결과를 보고합니다.

---

## Workflow 2 — 문서 편집

### Step 1: 문서 열기 + 분석

```bash
python scripts/analyze_template.py input.hwpx
```

### Step 2: 편집

**플레이스홀더 치환**:
```bash
python scripts/zip_replace_all.py input.hwpx --mapping mapping.json --output output.hwpx
```

**구조 변경** (Python 직접):
```python
from hwpx import HwpxDocument
doc = HwpxDocument.open("input.hwpx")

# 단락 추가
doc.add_paragraph("새 내용")

# 텍스트 치환
doc.replace_text_in_runs("기존 텍스트", "새 텍스트")

# 표 추가
tbl = doc.add_table(2, 3)

doc.save_to_path("output.hwpx")
```

### Step 3: 검증

```bash
python scripts/validate_hwpx.py output.hwpx
```

---

## Workflow 3 — 문서 분석

### Step 1: 텍스트 추출

```bash
python scripts/extract_text.py input.hwpx --format <plain|markdown|json>
```

### Step 2: 구조 분석

```bash
python scripts/analyze_template.py input.hwpx
```

### Step 3: 검증

```bash
python scripts/validate_hwpx.py input.hwpx
```

### Step 4: 결과 보고

추출된 텍스트 + 구조 분석 + 검증 결과를 사용자에게 반환합니다.

---

## Workflow 4 — 표 생성

### Step 1: 표 명세 파악

사용자 요청에서 행/열 수, 셀 내용, 병합 정보를 추출합니다.

### Step 2: Python으로 표 생성

```python
from hwpx import HwpxDocument

doc = HwpxDocument.new()
tbl = doc.add_table(rows, cols)

# 셀 내용 채우기
for ri, row in enumerate(data):
    for ci, text in enumerate(row):
        cell = tbl.cell(ri, ci)
        cell.paragraphs[0].runs[0].text = text

# 셀 병합 (필요시)
tbl.merge_cells(start_row, start_col, end_row, end_col)

doc.save_to_path("output.hwpx")
```

### Step 3: 검증

```bash
python scripts/validate_hwpx.py output.hwpx
```

---

## Workflow 5 — 템플릿 관리

### 목록

```bash
ls templates/*.hwpx
```

| 이름 | 용도 |
|---|---|
| base.hwpx | 최소 골격 (빈 문서) |
| gonmun.hwpx | 공문 (발신·수신·제목·본문) |
| report.hwpx | 보고서 (장·절 계층 구조) |
| minutes.hwpx | 회의록 (메타 표 + 안건·논의·결정·후속) |
| proposal.hwpx | 제안서 (개요·목적·세부내용·예산·기대효과) |

### 분석

```bash
python scripts/analyze_template.py templates/<name>.hwpx
```

### 템플릿 재생성

```bash
python scripts/generate_templates.py           # 전체 재생성
python scripts/generate_templates.py gonmun     # 특정 템플릿만
```

---

## 규칙

### 핵심 원칙

- **모든 HWPX 조작은 python-hwpx API를 통해서만 수행**합니다.
- XML을 직접 작성하거나 편집하지 않습니다.
- `HwpxDocument.new()`는 올바른 OWPML Skeleton을 기반으로 문서를 생성합니다.
- `HwpxDocument.open()`으로 기존 .hwpx 파일을 엽니다.

### 금지 사항

- XML 파일을 직접 생성하거나 편집하지 않습니다.
- 디렉터리 기반 템플릿을 사용하지 않습니다 (.hwpx 파일만 사용).
- 레거시 `unpack → 직접 XML 편집 → pack` 워크플로우는 더 이상 지원되지 않습니다. python-hwpx API만 사용하세요.
- python-hwpx Skeleton에 없는 네임스페이스나 요소를 임의로 추가하지 않습니다.

### 검증

- 모든 생성/편집 작업 후 `validate_hwpx.py` 실행.
- `page_guard.py`는 참고용 경고만 출력.

### 플레이스홀더

- `{{이중중괄호}}` 형식 사용.
- `doc.replace_text_in_runs("{{키}}", "값")`으로 안전하게 치환.

### 의존성

- **필수**: Python 3.8+, `pip install python-hwpx lxml`

## 스크립트 레퍼런스

| 스크립트 | 용도 |
|---|---|
| `build_hwpx.py` | 템플릿 + JSON → .hwpx 빌드 |
| `zip_replace_all.py` | .hwpx 내 플레이스홀더 치환 |
| `validate_hwpx.py` | 문서 구조 검증 |
| `extract_text.py` | 텍스트 추출 (plain/markdown/json) |
| `analyze_template.py` | 문서 구조 분석 |
| `generate_templates.py` | 프로페셔널 .hwpx 템플릿 재생성 |
| `table_gen.py` | 독립 표 생성 |
| `page_guard.py` | 페이지 수 추정 |
