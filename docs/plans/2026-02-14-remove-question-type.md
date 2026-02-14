# question_type 필드 제거 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 자가진단 템플릿에서 question_type 필드를 완전히 제거하고 모든 문항을 5점 척도로 고정하여 점수 계산 버그를 근본적으로 해결한다.

**Architecture:** question_type 필드 제거는 타입 → 스키마 → 상수 → 비즈니스 로직 → UI → 테스트 순서로 진행. 기존 DB JSONB 데이터에 남아있는 question_type은 TypeScript에서 무시되므로 DB 마이그레이션 불필요.

**Tech Stack:** TypeScript, Zod, React (Next.js App Router), Vitest

---

## 변경 파일 총 13개

| Phase | 파일 | 변경 내용 |
|-------|------|-----------|
| 1 | `src/types/database.ts` | question_type, options 제거 |
| 1 | `src/components/ops/self-assessment/types.ts` | question_type, options 제거 |
| 1 | `src/app/(dashboard)/ops/templates/actions.ts` | Zod 스키마에서 제거 |
| 2 | `src/components/ops/self-assessment/constants.ts` | SCALE_10_VALUES 제거 |
| 2 | `src/components/ops/self-assessment/index.ts` | 내보내기 정리 |
| 3 | `src/app/(dashboard)/ops/projects/actions/crud.ts` | calculateScores 주석 정리 |
| 3 | `src/lib/services/interview-guide.ts` | question_type 제거 |
| 4 | `src/components/ops/self-assessment/QuestionInputs.tsx` | 불필요 컴포넌트 삭제 |
| 4 | `src/components/ops/SelfAssessmentForm.tsx` | TEXT 분기 제거 |
| 4 | `src/app/(dashboard)/ops/templates/_components/TemplateForm.tsx` | 유형 드롭다운 제거 |
| 4 | `src/app/(dashboard)/ops/templates/_components/TemplatePreview.tsx` | 미리보기 단순화 |
| 4 | `src/app/(dashboard)/consultant/projects/[id]/_components/AssessmentDetailAccordion.tsx` | 유형 분기 제거 |
| 5 | `src/app/(dashboard)/ops/templates/_components/TemplateList.test.tsx` | fixture 정리 |

---

### Task 0: 기존 테스트 통과 확인

**Step 1: 전체 검증 실행**

Run: `npm run validate`
Expected: PASS (GREEN 상태에서 시작)

---

### Task 1: 타입 정의 수정

**Files:**
- Modify: `src/types/database.ts:106-114`
- Modify: `src/components/ops/self-assessment/types.ts:1-9`

**Step 1: database.ts 수정**

```typescript
// Before
export interface SelfAssessmentQuestion {
  id: string;
  order: number;
  dimension: string;
  question_text: string;
  question_type: 'SCALE_5' | 'SCALE_10' | 'MULTIPLE_CHOICE' | 'TEXT';
  options?: string[];
  weight: number;
}

// After
export interface SelfAssessmentQuestion {
  id: string;
  order: number;
  dimension: string;
  question_text: string;
  weight: number;
}
```

**Step 2: self-assessment/types.ts 수정**

```typescript
// Before
export interface Question {
  id: string;
  order: number;
  dimension: string;
  question_text: string;
  question_type: 'SCALE_5' | 'SCALE_10' | 'MULTIPLE_CHOICE' | 'TEXT';
  options?: string[];
  weight: number;
}

// After
export interface Question {
  id: string;
  order: number;
  dimension: string;
  question_text: string;
  weight: number;
}
```

---

### Task 2: Zod 스키마 수정

**Files:**
- Modify: `src/app/(dashboard)/ops/templates/actions.ts:12-20`

**Step 1: questionSchema에서 question_type, options 제거**

```typescript
// Before
const questionSchema = z.object({
  id: z.string(),
  order: z.number().min(1),
  dimension: z.string().min(1, '차원을 입력하세요.'),
  question_text: z.string().min(5, '질문을 5자 이상 입력하세요.'),
  question_type: z.enum(['SCALE_5', 'SCALE_10', 'MULTIPLE_CHOICE', 'TEXT']),
  options: z.array(z.string()).optional(),
  weight: z.number().min(0.1).max(10),
});

// After
const questionSchema = z.object({
  id: z.string(),
  order: z.number().min(1),
  dimension: z.string().min(1, '차원을 입력하세요.'),
  question_text: z.string().min(5, '질문을 5자 이상 입력하세요.'),
  weight: z.number().min(0.1).max(10),
});
```

---

### Task 3: 상수 정리

**Files:**
- Modify: `src/components/ops/self-assessment/constants.ts`
- Modify: `src/components/ops/self-assessment/index.ts`

**Step 1: SCALE_10_VALUES 제거 (constants.ts)**

`SCALE_10_VALUES` 상수 행 삭제.

**Step 2: 내보내기 정리 (index.ts)**

`SCALE_10_VALUES` 내보내기 제거.

---

### Task 4: 비즈니스 로직 수정

**Files:**
- Modify: `src/app/(dashboard)/ops/projects/actions/crud.ts:289-324`
- Modify: `src/lib/services/interview-guide.ts:26-33`

**Step 1: calculateScores 주석 명확화 (crud.ts)**

```typescript
// Before
dimensionScores[question.dimension].max += 5 * question.weight; // 5점 척도 가정

// After (상수 추가)
const MAX_SCALE = 5;
// ...
dimensionScores[question.dimension].max += MAX_SCALE * question.weight;
```

**Step 2: interview-guide.ts에서 question_type 제거**

```typescript
// Before
interface AssessmentQuestion {
  id: string;
  order: number;
  dimension: string;
  question_text: string;
  question_type: string;
  weight: number;
}

// After
interface AssessmentQuestion {
  id: string;
  order: number;
  dimension: string;
  question_text: string;
  weight: number;
}
```

---

### Task 5: QuestionInputs.tsx 단순화

**Files:**
- Modify: `src/components/ops/self-assessment/QuestionInputs.tsx`

Scale10Input, MultipleChoiceInput, TextInput 삭제. switch문 제거. Scale5Input만 남기고 QuestionInput에서 직접 렌더링.

---

### Task 6: SelfAssessmentForm.tsx 수정

**Files:**
- Modify: `src/components/ops/SelfAssessmentForm.tsx:62-69`

**Step 1: isQuestionAnswered에서 TEXT 분기 제거**

```typescript
// Before
const isQuestionAnswered = useCallback((question: Question): boolean => {
  const answer = answers[question.id];
  if (answer === undefined) return false;
  if (question.question_type === 'TEXT') {
    return typeof answer === 'string' && answer.trim().length > 0;
  }
  return true;
}, [answers]);

// After
const isQuestionAnswered = useCallback((question: Question): boolean => {
  return answers[question.id] !== undefined;
}, [answers]);
```

---

### Task 7: TemplateForm.tsx 수정

**Files:**
- Modify: `src/app/(dashboard)/ops/templates/_components/TemplateForm.tsx`

**Step 1: QUESTION_TYPES 상수 삭제 (31-36행)**
**Step 2: createEmptyQuestion에서 question_type 제거 (38-47행)**
**Step 3: 유형 드롭다운 UI 전체 제거 (319-336행)**
**Step 4: grid 레이아웃 3열 → 2열 (299행)**

---

### Task 8: TemplatePreview.tsx 수정

**Files:**
- Modify: `src/app/(dashboard)/ops/templates/_components/TemplatePreview.tsx`

**Step 1: maxScore 계산 단순화 (26-29행)**

```typescript
// Before
const maxValue = q.question_type === 'SCALE_10' ? 10 : 5;

// After
const maxValue = 5;
```

**Step 2: QuestionTypePreview에서 switch문 → SCALE_5 렌더링만 남김 (98-163행)**
**Step 3: 점수 계산 안내에서 "10점 척도" 언급 제거 (91행)**

---

### Task 9: AssessmentDetailAccordion.tsx 수정

**Files:**
- Modify: `src/app/(dashboard)/consultant/projects/[id]/_components/AssessmentDetailAccordion.tsx`

**Step 1: AssessmentQuestion에서 question_type, options 제거 (23-31행)**
**Step 2: QuestionAnswer에서 question_type 분기 제거 → 항상 ScaleIndicator(value, 5) (92-124행)**
**Step 3: dimensionGroups에서 SCALE_5 조건 제거 → 모든 문항 점수 계산 (154-158행)**

---

### Task 10: 테스트 수정

**Files:**
- Modify: `src/app/(dashboard)/ops/templates/_components/TemplateList.test.tsx:68`

**Step 1: fixture에서 question_type 제거**

---

### Task 11: 전체 검증

**Step 1: typecheck + lint + test**

Run: `npm run validate`
Expected: ALL PASS

**Step 2: 커밋**

```bash
git add -A
git commit -m "refactor: question_type 필드 제거 및 5점 척도 고정"
```
