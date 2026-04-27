# PR #7 — PBL Ⅲ-3-다 훈련대상 업무 세부내용 V2 schema 확장 (양식 5 컬럼 1:1 정합)

항상 한국어로 답변할 것.

## 배경

PR #5 (#31) 머지 후 사용자 한컴 재검증에서 다음 회귀 발견:

**PBL Ⅲ-3-다 (훈련대상 업무 세부내용) 표의 5 컬럼 중 3 컬럼 미출력**

```
양식 PDF (4×5 표):
| 업무명 | 현재 업무방식 (AS-IS) | AI활용방식 (TO-BE) | 요구지식 | 기술 |
|--------|----------------------|--------------------|----|------|
| col 0  | col 1                | col 2              | col 3 | col 4 |

V2 schema (현재):
- target.details[].title       → col 0
- target.details[].description → col 1
- (col 2/3/4 매핑 없음 → 양식 빈 셀 그대로 출력)
```

PR #2/#3 V2 정합 작업 시 V1 의 4 개 분리 필드 (`as_is`/`to_be`/`required_knowledge`/`required_skill`) 를 V2 의 2 개 (`title`+`description`) 로 단순화한 결과. 사용자 요청: **양식과 1:1 정합 보강 → 3 필드 추가 (TO-BE / 요구지식 / 기술)**.

## 단일 원천 문서 (반드시 통독)

1. **`docs/references/2026-04-23-current-fields-inventory.md`** §Ⅲ-3-다 (라인 1161~1190) — 양식 5 컬럼 정의
2. **`docs/references/2.AI PBL 과정개발보고서 및 결과보고서(양식).pdf`** p.10 — 양식 PDF 표 구조
3. **`docs/references/hwpx-placeholders.json`** P-13 entry — 현재 매핑 (col 0~1 만)
4. **`src/lib/schemas/interview-pbl.ts`** line 773-776 (`PBLTargetDetailSchema`) — 확장 대상
5. **`src/app/(dashboard)/consultant/projects/[id]/interview/_components/pbl/StepTargetAndLevel.tsx`** — UI 입력 폼 (확장 대상)
6. **`api/hwpx/_placeholders_pbl.py`** line 604-609 (`target_details_v2` 분기) — 치환 로직
7. **`api/hwpx/generate.py`** line 1359 (`_fill_pbl_target_task_details`) — 셀 매핑 (idx=22)
8. **`src/lib/services/export/hwpx/hwpx-payload-pbl.ts`** — TS payload `buildDataFromV2` (target.details 매핑)
9. **`api/hwpx/__fixtures__/pbl-{full,empty,max-length,special-chars}.json`** — fixture 4 종 (확장 필요)

## 작업 범위 (8 영역 동시 변경)

### A. Schema 확장 — `src/lib/schemas/interview-pbl.ts`

```typescript
// 변경 전
export const PBLTargetDetailSchema = z.object({
  title: z.string().min(1, '세부내용 제목을 입력하세요.'),
  description: z.string().min(1, '세부내용 설명을 입력하세요.'),
});

// 변경 후 (V2 양식 5 컬럼 정합)
export const PBLTargetDetailSchema = z.object({
  title: z.string().min(1, '업무명을 입력하세요.'),
  as_is: z.string().min(1, '현재 업무방식 (AS-IS) 을 입력하세요.'),
  to_be: z.string().min(1, 'AI활용방식 (TO-BE) 을 입력하세요.'),
  required_knowledge: z.string().min(1, '요구지식을 입력하세요.'),
  required_skill: z.string().min(1, '기술을 입력하세요.'),
});
```

**호환성 처리:**
- 기존 DB JSONB 데이터에는 `as_is`/`to_be`/`required_knowledge`/`required_skill` 필드 없음 → loose 모드는 default(`''`) 처리, strict 모드는 .min(1) 으로 신규 입력 강제
- `description` 필드는 V1 호환을 위해 deprecated alias 로 유지하거나 삭제 후 schema migration

### B. UI 확장 — `StepTargetAndLevel.tsx`

기존 `details[]` 입력 폼이 title + description 2 필드만 받도록 되어 있음. **5 필드 입력 폼으로 확장:**

```tsx
{/* 변경 후 (5 컬럼 + 행 추가/삭제) */}
{details.map((detail, i) => (
  <Card key={i}>
    <Field label="업무명">{title input}</Field>
    <Field label="현재 업무방식 (AS-IS)">{as_is textarea}</Field>
    <Field label="AI활용방식 (TO-BE)">{to_be textarea}</Field>
    <Field label="요구지식">{required_knowledge textarea}</Field>
    <Field label="기술">{required_skill textarea}</Field>
  </Card>
))}
```

**참고:** 기존 description 데이터는 마이그레이션 시 `as_is` 로 자동 이전 (DB JSONB 의 description 값을 as_is 로 복사하는 1 회성 마이그레이션 또는 loose parse 시 fallback).

### C. SSOT JSON 갱신 — `docs/references/hwpx-placeholders.json` P-13

```json
{
  "id": "P-13",
  "row_columns": [
    {"col": 0, "field": "title"},
    {"col": 1, "field": "as_is"},
    {"col": 2, "field": "to_be"},
    {"col": 3, "field": "required_knowledge"},
    {"col": 4, "field": "required_skill"}
  ],
  "location": {
    "table_index": 22,
    "data_row_start": 2,
    "max_items": 2,
    "notes": "양식 4x5 — row 0~1 헤더, row 2~3 데이터. V2 PR #7 에서 5 컬럼 모두 매핑."
  }
}
```

### D. Placeholders 확장 — `_placeholders_pbl.py`

기존 `target_details_v2` 분기 (line 604) 의 5 키 출력:

```python
if key == "target_details_v2":
    target = data.get("target") if isinstance(data.get("target"), dict) else None
    items = target.get("details") if target else None
    if items is None:
        items = data.get("target_details") or []
    rows = []
    for item in items[:2]:
        rows.append([
            item.get("title", ""),
            item.get("as_is", item.get("description", "")),  # V1 호환 fallback
            item.get("to_be", ""),
            item.get("required_knowledge", ""),
            item.get("required_skill", ""),
        ])
    return rows
```

### E. Generate.py 셀 매핑 확장

`_fill_pbl_target_task_details(tables, ..., idx=22)` 의 row_columns 5 개 처리. 기존 col 0~1 매핑을 col 0~4 로 확장. 양식 4×5 표의 row 2~3 (헤더 제외) 만 채움.

### F. Payload TS 갱신 — `hwpx-payload-pbl.ts` `buildDataFromV2`

V2 데이터 → snake_case dict 매핑 시 `details[].as_is` / `to_be` / `required_knowledge` / `required_skill` 4 신규 필드 추가.

### G. Fixtures 확장 — 4 종

`pbl-full.json` / `pbl-empty.json` / `pbl-max-length.json` / `pbl-special-chars.json` 의 `target.details[]` 에 5 필드 모두 입력. 풀필 case 는 양식 의도에 맞는 sample, empty 는 빈 문자열.

### H. 회귀 테스트 보강

- `interview-pbl.test.ts` — `PBLTargetDetailSchema.parse()` 5 필드 검증
- `test_placeholders_pbl.py` — `target_details_v2` 5 컬럼 출력 검증
- `test_integration_fixtures.py` — `test_pbl_target_details_v2_renders_5_columns` 신규 케이스
- pytest 99 → 100+ PASS 유지

## DB 호환성 + 마이그레이션 전략

### Option 1 — 보수적 (default 빈 문자열)

```typescript
// loose schema 는 default(''), strict 는 min(1)
as_is: z.string().min(1, '...').or(z.string().default('')),
```

기존 DB row 의 `description` 값은 손실. 컨설턴트가 인터뷰 화면에서 다시 입력 필요.

### Option 2 — 진취적 (description → as_is 마이그레이션)

```typescript
// preprocess 로 description 을 as_is 로 자동 이전
PBLTargetDetailSchema = z.preprocess((raw) => {
  if (typeof raw === 'object' && raw && !raw.as_is && raw.description) {
    return { ...raw, as_is: raw.description, to_be: '', required_knowledge: '', required_skill: '' };
  }
  return raw;
}, z.object({ ... }));
```

기존 DB JSONB 데이터가 자동 호환되며 사용자 재입력 불필요. **Option 2 권장.**

## 진행 순서 (TDD)

1. **PlanMode 진입 + 계획 작성** (`docs/plans/archive/2026-04-27-pbl-target-details-v2-extension.md`)
2. **A. Schema RED** — `interview-pbl.test.ts` 에 5 필드 검증 테스트 작성 → fail
3. **A. Schema GREEN** — `PBLTargetDetailSchema` 확장 + preprocess(Option 2) → pass
4. **C. SSOT 갱신** + **D/E. Python 치환 로직** — pytest RED → GREEN
5. **F. Payload TS** + **G. Fixtures 4 종** + **H. 회귀 테스트**
6. **B. UI 확장** — `StepTargetAndLevel.tsx` 5 필드 폼 + vitest UI 테스트
7. fixture HWPX 8 종 재생성 + 사용자 한컴 재검증 의뢰
8. `npm run validate && npm run build` + PR 생성 + CI 6/6 + 머지

## Definition of Done

1. **Schema 5 필드** — `PBLTargetDetailSchema` 가 `title`/`as_is`/`to_be`/`required_knowledge`/`required_skill` 5 필드 정의
2. **DB 호환성** — Option 2 preprocess 로 기존 description 자동 이전 검증 (vitest 마이그레이션 케이스)
3. **UI 5 입력 폼** — `StepTargetAndLevel.tsx` 가 5 필드 입력 받음
4. **HWPX 5 컬럼 출력** — fixture HWPX 의 idx=22 표 row 2~3 의 col 0~4 모두 채워짐 (한컴 검증)
5. **fixture 4 종 갱신** — 5 필드 모두 sample 값 보유
6. **회귀 테스트** — pytest 100+ + vitest 5640+ PASS
7. **`npm run validate && npm run build`** 통과
8. **PR CI 전체 pass** — Lint·Typecheck·Unit·Build·E2E·Vercel
9. **사용자 한컴 재검증** — Ⅲ-3-다 표의 5 컬럼 모두 정상 출력 확인
10. **`verification-before-completion`** 호출 후 완료 선언

## 사용 스킬·MCP·서브에이전트

- `superpowers:writing-plans` — 계획서 작성
- `superpowers:test-driven-development` — schema/payload/UI 모두 TDD
- `superpowers:systematic-debugging` — 회귀 발생 시
- `frontend-guide` (프로젝트 스킬) — UI 확장 시 필수
- `check-server-action` (프로젝트 스킬) — actions.ts 변경 시 필수
- `serena` MCP — 심볼 탐색·치환
- `sequential-thinking` MCP — 복잡한 호환성 처리 추론
- `superpowers:requesting-code-review` / `receiving-code-review` — 머지 직전
- `superpowers:verification-before-completion` — 머지 직전 필수

## 진행 방식

1. PR #31 (PR #5+#6) 머지 확인 (`git log` → main sha 확인)
2. 새 브랜치 `chore/pr7-pbl-target-details-v2-extension` 생성
3. PlanMode 로 Phase A~H 세분화 계획 작성 (`docs/plans/archive/2026-04-27-pbl-target-details-v2-extension.md`)
4. 사용자 승인 후 구현 (TDD 전면)
5. fixture HWPX 재생성 후 사용자 한컴 재검증 의뢰
6. 머지 직전 verification-before-completion 호출

진행해줘.
