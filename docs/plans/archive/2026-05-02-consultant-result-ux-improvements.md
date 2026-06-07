# 컨설턴트 인터뷰·결과 페이지 UX 개선 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 컨설턴트 워크플로우(로드맵·PBL)의 인터뷰 입력 → 검토 → 결과 페이지에서 보고된 4건의 UX 개선을 일괄 처리한다.

**Architecture:** 기존 `LargeTextBox`·`InlineEditField`·`CollapsibleSection`·`ReviewActions` 컴포넌트를 그대로 활용하고, 표시 클래스(min-h)·기본값(defaultOpen)·레이아웃(flex 정렬)·렌더 노드(span → InlineEditField) 단위의 최소 변경만 수행한다. 새 컴포넌트는 만들지 않으며, 신규 의존성도 없다.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5(strict), Tailwind 4, Vitest + RTL(Unit), Playwright(E2E), Supabase(Postgres + RLS).

---

## 사전 정의 — 페이지 매핑(중요)

사용자가 "결과 페이지"라고 부른 두 페이지가 다르므로, 이 계획서에서는 다음 명칭을 고정 사용한다.

| 명칭                 | 라우트                                       | 파일                                                                                         | 비고                                                           |
| -------------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| 인터뷰 입력 페이지   | `/consultant/projects/[id]/interview`        | `[id]/interview/_components/roadmap/StepTaskAnalysis.tsx` 외                                 | 8/9 Step 폼 입력                                               |
| **검토 페이지**      | `/consultant/projects/[id]/interview/review` | `interview/review/InterviewReviewClient.tsx`, `_components/ReviewActions.tsx`                | 인터뷰 최종 제출 직후 진입. CollapsibleSection 다수 + 하단 CTA |
| **결과 페이지(LLM)** | `/consultant/projects/[id]/roadmap` `/pbl`   | `roadmap/_components/result-v2/TabRequirements.tsx` 외, `pbl/_components/result-v2/PBL*.tsx` | LLM 도출 결과를 탭별 표로 표시                                 |

사용자 보고 #1은 **인터뷰 입력 페이지**, 보고 #2는 **결과 페이지(LLM)**, 보고 #3·#4는 **검토 페이지**에 해당한다.

---

## 활용 스킬·MCP·서브에이전트(필수)

작업 직전·중간에 다음을 호출한다(생략 금지).

**Superpowers 스킬 (TDD 강제)**

- `superpowers:test-driven-development` — 모든 코드 변경의 RED → GREEN → REFACTOR 사이클 강제
- `superpowers:verification-before-completion` — Phase 5 최종 검증 단계 진입 시
- `superpowers:requesting-code-review` / `superpowers:receiving-code-review` — Phase 4 완료 후 1회

**프로젝트·전역 스킬**

- `frontend-guide` (프로젝트) — UI 작성 시 항상
- `web-design-guidelines` (전역) — Phase 3·4의 레이아웃 검수
- `composition-patterns` / `react-best-practices` (전역) — InlineEditField 재사용·렌더 패턴 점검
- `check-server-action` (프로젝트) — Phase 4에서 결과 페이지 편집 Server Action 수정 시

**MCP**

- `serena` — 심볼 단위 탐색·편집 (`find_symbol`, `replace_symbol_body`)
- `context7` — Tailwind 4·shadcn 신기능 확인 시
- `supabase` — Phase 4에서 RLS·정책 확인 필요 시 `list_tables`, `execute_sql`
- `puppeteer` — Phase 5 수동 시각 검증(컨설턴트 로그인 → 4 화면 캡처)

**서브에이전트(`.claude/agents/`)**

- `test-automator` — Vitest/Playwright 시나리오 작성 보조 (Phase 1~4 각 RED 단계)
- `security-auditor` — Phase 4 서버 액션 변경 시 RLS·역할 검증 점검 (선택)

**TDD 예외:** 단순 Tailwind 클래스 수치 교체(Phase 1)와 defaultOpen 토글(Phase 2)은 시각적 회귀가 회귀 테스트보다 비싸지 않다고 판단되면 단위 테스트 대신 **기존 E2E + 수동 시각 검증**으로 대체 가능. 단, 그 결정은 Phase 5 수동 검증 항목에 기록한다.

---

## File Structure

| 파일                                                                                                            | 변경 종류                         | 책임                                        |
| --------------------------------------------------------------------------------------------------------------- | --------------------------------- | ------------------------------------------- |
| `src/app/(dashboard)/consultant/projects/[id]/interview/_components/roadmap/StepTaskAnalysis.tsx`               | Modify (line 196·206·216·226·238) | Ⅱ-3 표 셀 5개의 `minHeightClassName` 1.5배  |
| `src/app/(dashboard)/consultant/projects/[id]/interview/review/InterviewReviewClient.tsx`                       | Modify (line 147·259)             | `defaultOpen` prop 제거 — 모두 닫힘 default |
| `src/app/(dashboard)/consultant/projects/[id]/interview/review/_components/ReviewActions.tsx`                   | Modify (전체 JSX 재구성)          | CTA 영역 레이아웃 개선                      |
| `src/app/(dashboard)/consultant/projects/[id]/roadmap/_components/result-v2/TabRequirements.tsx`                | Modify (line 167-197)             | Ⅱ-3 표 셀 4개 `<span>` → `InlineEditField`  |
| `src/app/(dashboard)/consultant/projects/[id]/pbl/_components/result-v2/Tab*.tsx`                               | Modify(승인 후 결정)              | PBL 결과 페이지 read-only 셀 → 편집 가능    |
| `src/app/(dashboard)/consultant/projects/[id]/roadmap/_components/result-v2/__tests__/TabRequirements.test.tsx` | Create (없으면)                   | InlineEditField 셀 RTL 검증                 |
| `src/app/(dashboard)/consultant/projects/[id]/interview/review/_components/__tests__/ReviewActions.test.tsx`    | Create                            | 레이아웃·CTA 클릭 RTL 검증                  |
| `e2e/consultant-result-edit.spec.ts`                                                                            | Create                            | 컨설턴트 로그인 → 결과 페이지 셀 편집 E2E   |
| `e2e/consultant-review-collapsed.spec.ts`                                                                       | Create                            | 검토 페이지 모두 접힘 default E2E           |

신규 컴포넌트·라이브러리 추가 없음.

---

## Phase 0 — 사용자 승인 게이트(코드 수정 0줄)

> **목적:** 메모리 룰 "UI/UX 변경은 사용자 관점 사전 승인 필수" 준수. 추상적 옵션 금지. **이 Phase가 끝나기 전에는 어떤 코드도 수정하지 않는다.**

### Task 0.1: 스코프 확정용 화면 캡처

- [ ] **Step 1: 컨설턴트 로컬 로그인 + 4개 화면 캡처**

`puppeteer` MCP로 컨설턴트 계정(로컬: `son@kpc.or.kr` / `test1234!`)으로 로그인 → 다음 4개 URL을 스크린샷.

```
/consultant/projects/<id>/interview        (Step Ⅱ-3 표 가시)
/consultant/projects/<id>/interview/review (검토 페이지 진입)
/consultant/projects/<id>/roadmap          (LLM 결과 — 요구분석 탭)
/consultant/projects/<id>/pbl              (LLM 결과 — 전체 탭 순회)
```

- [ ] **Step 2: PBL 동등 적용 범위 매핑**

`Grep`/`serena__find_symbol`로 다음 4가지의 PBL 측 위치를 확정한다(현재 보고서에는 PBL Tab\*.tsx 위치까지만 식별됨, 셀별 read-only 여부는 미확정).

| 보고              | 로드맵 위치                                                | PBL 위치(확정 필요)                                             |
| ----------------- | ---------------------------------------------------------- | --------------------------------------------------------------- |
| #1 텍스트 폼 높이 | `StepTaskAnalysis.tsx:196,206,216,226,238` `min-h-[150px]` | PBL 인터뷰 입력 9 Step 中 표 형태 Step의 `LargeTextBox`(있으면) |
| #2 결과 셀 편집   | `TabRequirements.tsx:167-197` Ⅱ-3 표 4 셀                  | `pbl/_components/result-v2/Tab*.tsx` 中 read-only `<span>` 셀   |
| #3 모두 접힘      | `InterviewReviewClient.tsx:147` `defaultOpen`              | 같은 파일 line 259 (PBL 영역)                                   |
| #4 ReviewActions  | `_components/ReviewActions.tsx` 단일 — 로드맵·PBL 공유     | (공유 컴포넌트 → 동시 적용)                                     |

### Task 0.2: 사용자 승인 질문(`AskUserQuestion`)

각 항목에 대해 캡처와 함께 "어디서 · 이전 → 이후 mockup · 왜" 3단 설명 + **정확한 워딩·수치 옵션** 제시. 추상적 옵션 금지.

- [ ] **Step 1: #1 텍스트 폼 높이 옵션 제시**

```
질문: Ⅱ-3 표 텍스트 폼 높이 결정
옵션 A: min-h-[150px] → min-h-[225px] (정확히 1.5배, 사용자 요청)
옵션 B: min-h-[150px] → min-h-[200px] (약 1.33배, 모바일 스크롤 부담↓)
옵션 C: min-h-[150px] → min-h-[240px] (1.6배, 단락 4~5줄 가독↑)
PBL 인터뷰 동일 표가 있으면 함께 적용 여부?: Y/N
```

- [ ] **Step 2: #2 결과 페이지 편집 가능 셀 옵션 제시**

`TabRequirements.tsx`의 Ⅱ-3 표 6 셀 중:

- 직무/과업/AI필요도(line 169·170·195) — 현재 `String(...)` 또는 일반 텍스트
- As-Is/문제점/데이터 발생(line 171-194) — 현재 `<span class="whitespace-pre-wrap">`

```
옵션 A: 6 셀 모두 InlineEditField (multiline, AI필요도는 number 검증)
옵션 B: As-Is/문제점/데이터 발생 3 셀만 InlineEditField (사용자가 가장 많이 수정하는 자유 텍스트)
옵션 C: 6 셀 + Ⅱ-3 행 추가/삭제 버튼까지 (현재 인터뷰 페이지에서만 가능)
```

PBL 결과 페이지의 read-only 셀 목록(Task 0.1 Step 2에서 확정)도 동일 옵션으로 질문.

- [ ] **Step 3: #3 모두 접힘 default 확인**

```
옵션 A: 검토 페이지의 모든 CollapsibleSection을 default 닫힘 (사용자 요청 — 로드맵 8건·PBL 9건)
옵션 B: 첫 번째 항목만 펼침 (현재 동작 유지)
옵션 C: 사용자 토글 후 localStorage 기억 (별도 기능 추가)
```

- [ ] **Step 4: #4 ReviewActions 레이아웃 옵션 제시**

현재 구조:

```
sm:flex-row sm:items-center
[--------- 안내문(긴 한 줄) ---------] [outline btn] [primary btn]
```

사용자 보고: "디스플레이가 이상함" — 추정 원인은 안내문이 길어 좁은 viewport에서 버튼이 줄바꿈되며 정렬이 어색해지는 것.

```
옵션 A — 분리 카드형:
┌──────────────────────────────────┐
│ 검토를 마치셨나요?                  │  ← 헤딩
│ 표 행 추가·삭제 등 ... 진행할 수    │  ← 보조 설명
│ 있습니다.                          │
│                                  │
│ [← 인터뷰로]  [결과 페이지로 →]    │  ← 우측 정렬 CTA
└──────────────────────────────────┘

옵션 B — 좌우 분할 유지(여백·정렬만 보강):
[안내문 max-w-prose]            [버튼 그룹 shrink-0]
* 모바일에서만 stack, 데스크톱은 1줄

옵션 C — 토글 패널형:
"다음 액션 ▾" 버튼 + 펼치면 옵션 A 형태
```

각 옵션의 **정확한 JSX 스니펫**(아래 Task 3.X에 코드로 명시)을 함께 제시한다.

- [ ] **Step 5: PBL 동시 적용 여부 일괄 확인**

```
질문: Task 0.1 Step 2에서 식별한 PBL 측 동일 패턴 N건을 함께 수정하시겠습니까?
- 로드맵에만 적용 / 로드맵 + PBL 동시 / 별도 PR로 PBL은 후속 처리
```

### 게이트 통과 조건

5 가지 옵션이 모두 **명시적으로 선택**되기 전까지 Phase 1 진입 금지. 사용자가 "다 알아서"라고 응답하면 **각 항목에 대해 가장 보수적인(영향 최소) 옵션**을 잠정 선택하고 그 선택을 다시 확인 받는다.

승인 결과는 본 문서의 "## 승인 결과 기록"(아래) 섹션에 추가 기록 → Phase 1로 진행.

---

## Phase 1 — Ⅱ-3 텍스트 폼 높이 1.5배

> **사전 조건:** Phase 0에서 #1 옵션 확정 (이하 옵션 A=`min-h-[225px]` 가정). 다른 값이 승인되면 해당 값으로 치환.

### Task 1.1: RED — 단위 테스트 작성

**Files:**

- Test: `src/app/(dashboard)/consultant/projects/[id]/interview/_components/roadmap/__tests__/StepTaskAnalysis.minheight.test.tsx` (신규)

- [ ] **Step 1: 실패하는 테스트 작성**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { StepTaskAnalysis } from '../StepTaskAnalysis';

describe('StepTaskAnalysis Ⅱ-3 표 셀 텍스트 폼 높이', () => {
  it('5개 LargeTextBox 모두 min-h-[225px] 클래스를 가진다', () => {
    render(
      <StepTaskAnalysis
        rows={[{ domain: '', task: '', asIs: '', problem: '', dataTiming: '', aiScore: 3 }]}
        onChange={() => {}}
        readOnly={false}
      />
    );
    const textareas = screen.getAllByRole('textbox');
    const taskAnalysisTextareas = textareas.filter((t) =>
      /직무|과업|현행 방식|문제점|데이터 발생/.test(t.getAttribute('aria-label') ?? '')
    );
    expect(taskAnalysisTextareas).toHaveLength(5);
    for (const t of taskAnalysisTextareas) {
      expect(t.className).toMatch(/min-h-\[225px\]/);
    }
  });
});
```

- [ ] **Step 2: 실패 확인**

```bash
npm run test -- StepTaskAnalysis.minheight
```

Expected: FAIL — 현재는 `min-h-[150px]`.

### Task 1.2: GREEN — 클래스 교체

**Files:**

- Modify: `src/app/(dashboard)/consultant/projects/[id]/interview/_components/roadmap/StepTaskAnalysis.tsx:196,206,216,226,238`

- [ ] **Step 3: 5곳 일괄 교체**

```tsx
// 변경 전
minHeightClassName = 'min-h-[150px]';
// 변경 후
minHeightClassName = 'min-h-[225px]';
```

`Edit` 도구의 `replace_all=true`를 같은 파일 내에서만 사용한다.

- [ ] **Step 4: 통과 확인**

```bash
npm run test -- StepTaskAnalysis.minheight
```

Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add src/app/.../StepTaskAnalysis.tsx src/app/.../__tests__/StepTaskAnalysis.minheight.test.tsx
git commit -m "feat(interview): Ⅱ-3 과업·워크플로우 분석 표 셀 높이 1.5배 (150px→225px)"
```

### Task 1.3: PBL 동등 적용(승인된 경우만)

Phase 0에서 PBL 동일 표 위치가 확인되고 승인됐으면 동일 패턴으로 RED → GREEN → 커밋. 승인 안 됐으면 Skip.

---

## Phase 2 — 검토 페이지 모든 CollapsibleSection default 접힘

> **사전 조건:** Phase 0 #3 승인.

### Task 2.1: RED — 단위 테스트

**Files:**

- Test: `src/app/(dashboard)/consultant/projects/[id]/interview/review/__tests__/InterviewReviewClient.collapsed.test.tsx`

- [ ] **Step 1: 실패하는 테스트 작성**

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { InterviewReviewClient } from '../InterviewReviewClient';

const minimalRoadmap = {} as any;
const minimalPbl = {} as any;

describe('검토 페이지 — default 모두 접힘', () => {
  it('ROADMAP track 의 모든 CollapsibleSection 이 닫혀 있다', () => {
    render(
      <InterviewReviewClient
        projectId="p1"
        track="ROADMAP"
        interviewData={minimalRoadmap}
        interviewUpdatedAt={null}
        latestResult={{ createdAt: null, status: null, versionId: null }}
      />
    );
    const buttons = screen.getAllByRole('button', { expanded: false });
    expect(buttons.length).toBeGreaterThanOrEqual(8); // 로드맵 검토 8 섹션
    expect(screen.queryAllByRole('button', { expanded: true })).toHaveLength(0);
  });

  it('PBL track 의 모든 CollapsibleSection 이 닫혀 있다', () => {
    render(
      <InterviewReviewClient
        projectId="p1"
        track="PBL"
        interviewData={minimalPbl}
        interviewUpdatedAt={null}
        latestResult={{ createdAt: null, status: null, versionId: null }}
      />
    );
    expect(screen.queryAllByRole('button', { expanded: true })).toHaveLength(0);
  });
});
```

- [ ] **Step 2: 실패 확인**

```bash
npm run test -- InterviewReviewClient.collapsed
```

Expected: FAIL — Ⅱ-2(line 147)·Ⅰ-1(line 259)에 `defaultOpen` 존재.

### Task 2.2: GREEN — `defaultOpen` 제거

**Files:**

- Modify: `src/app/(dashboard)/consultant/projects/[id]/interview/review/InterviewReviewClient.tsx:147,259`

- [ ] **Step 3: 두 곳에서 `defaultOpen` prop 제거**

```tsx
// 변경 전 (line 147)
<CollapsibleSection title="Ⅱ-2. 기업 요구분석" defaultOpen>
// 변경 후
<CollapsibleSection title="Ⅱ-2. 기업 요구분석">

// 변경 전 (line 259)
<CollapsibleSection title="Ⅰ-1. 훈련과정 개요" defaultOpen>
// 변경 후
<CollapsibleSection title="Ⅰ-1. 훈련과정 개요">
```

- [ ] **Step 4: 통과 확인**

```bash
npm run test -- InterviewReviewClient.collapsed
```

Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add src/app/.../InterviewReviewClient.tsx src/app/.../__tests__/InterviewReviewClient.collapsed.test.tsx
git commit -m "feat(review): 검토 페이지 모든 섹션 default 접힘 (로드맵·PBL)"
```

---

## Phase 3 — ReviewActions 레이아웃 개선

> **사전 조건:** Phase 0 #4 옵션 확정. 이하 **옵션 A(분리 카드형)** 기준 코드. 다른 옵션 시 JSX 치환.

### Task 3.1: RED — 레이아웃 단위 테스트

**Files:**

- Test: `src/app/(dashboard)/consultant/projects/[id]/interview/review/_components/__tests__/ReviewActions.test.tsx`

- [ ] **Step 1: 실패하는 테스트**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { ReviewActions } from '../ReviewActions';

describe('ReviewActions', () => {
  it('헤딩·설명·버튼 그룹이 분리되어 있고 두 버튼이 우측 정렬 컨테이너에 묶여 있다', () => {
    render(<ReviewActions projectId="p1" track="ROADMAP" />);
    expect(
      screen.getByRole('heading', { level: 3, name: /검토를 마치셨나요/ })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/표 행 추가·삭제 등 본격 편집은 인터뷰 페이지에서/)
    ).toBeInTheDocument();
    const ctaGroup = screen.getByTestId('review-cta-group');
    expect(ctaGroup).toHaveClass('justify-end');
    expect(ctaGroup).toContainElement(screen.getByTestId('review-cta-back-to-interview'));
    expect(ctaGroup).toContainElement(screen.getByTestId('review-cta-go-to-result'));
  });

  it('PBL track 일 때 "결과 페이지로 이동" 링크가 /pbl 로 향한다', () => {
    render(<ReviewActions projectId="p2" track="PBL" />);
    const link = screen.getByTestId('review-cta-go-to-result').querySelector('a');
    expect(link).toHaveAttribute('href', '/consultant/projects/p2/pbl');
  });
});
```

- [ ] **Step 2: 실패 확인**

```bash
npm run test -- ReviewActions
```

Expected: FAIL — 현재 `<p>` 한 줄 + flex-row, heading·`data-testid="review-cta-group"` 없음.

### Task 3.2: GREEN — 옵션 A 구조로 재구성

**Files:**

- Modify: `src/app/(dashboard)/consultant/projects/[id]/interview/review/_components/ReviewActions.tsx`

- [ ] **Step 3: JSX 재작성**

```tsx
'use client';

import Link from 'next/link';
import { ArrowLeft, FileOutput } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface ReviewActionsProps {
  projectId: string;
  track: 'ROADMAP' | 'PBL';
}

export function ReviewActions({ projectId, track }: ReviewActionsProps) {
  const resultPath =
    track === 'PBL'
      ? `/consultant/projects/${projectId}/pbl`
      : `/consultant/projects/${projectId}/roadmap`;

  return (
    <section
      aria-label="검토 후 다음 단계"
      className="flex flex-col gap-4 rounded-lg border bg-muted/20 p-5"
    >
      <div className="space-y-1">
        <h3 className="text-base font-semibold">검토를 마치셨나요?</h3>
        <p className="text-sm text-muted-foreground">
          표 행 추가·삭제 등 본격 편집은 인터뷰 페이지에서, 결과 확인은 결과 페이지에서 진행할 수
          있습니다.
        </p>
      </div>
      <div
        data-testid="review-cta-group"
        className="flex flex-col gap-2 sm:flex-row sm:justify-end"
      >
        <Button
          asChild
          type="button"
          variant="outline"
          size="sm"
          data-testid="review-cta-back-to-interview"
        >
          <Link href={`/consultant/projects/${projectId}/interview`}>
            <ArrowLeft className="mr-1 size-4" />
            인터뷰 페이지로 돌아가기
          </Link>
        </Button>
        <Button asChild type="button" size="sm" data-testid="review-cta-go-to-result">
          <Link href={resultPath}>
            <FileOutput className="mr-1 size-4" />
            결과 페이지로 이동
          </Link>
        </Button>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: 통과 확인**

```bash
npm run test -- ReviewActions
```

Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add src/app/.../ReviewActions.tsx src/app/.../__tests__/ReviewActions.test.tsx
git commit -m "feat(review): ReviewActions 분리 카드형 레이아웃 — 헤딩·설명·CTA 분리 + 우측 정렬"
```

---

## Phase 4 — 결과 페이지 read-only 셀 → 편집 가능 (로드맵 + PBL)

> **사전 조건:** Phase 0 #2 옵션 확정. 이하 **옵션 B(자유 텍스트 3 셀: As-Is/문제점/데이터 발생)** 기준. 옵션 A·C 선택 시 추가 셀 포함.

### Task 4.1: 영향 범위 재확인

- [ ] **Step 1: serena 로 read-only `<span>` 패턴 탐색**

```
mcp__serena__search_for_pattern: "whitespace-pre-wrap text-sm" (in result-v2/)
```

확인된 위치를 본 문서 "## 승인 결과 기록"에 부착.

### Task 4.2: RED — 결과 페이지 편집 단위 테스트

**Files:**

- Test: `src/app/(dashboard)/consultant/projects/[id]/roadmap/_components/result-v2/__tests__/TabRequirements.editable.test.tsx`

- [ ] **Step 1: 실패하는 테스트**

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { TabRequirements } from '../TabRequirements';

const interviewWithTask = {
  taskAnalysis: [
    {
      domain: '영업',
      task: '제안서 작성',
      asIs: '수기',
      problem: '시간',
      dataTiming: '월말',
      aiScore: 4,
    },
  ],
} as any;

describe('TabRequirements Ⅱ-3 표 — 자유 텍스트 셀 편집 가능', () => {
  it('readOnly=false 일 때 As-Is/문제점/데이터 발생 셀이 InlineEditField 로 렌더된다', async () => {
    const onEdit = vi.fn().mockResolvedValue({ success: true });
    render(<TabRequirements interview={interviewWithTask} readOnly={false} onEdit={onEdit} />);
    const asIsCell = screen.getByText('수기');
    await userEvent.click(asIsCell);
    expect(screen.getByRole('textbox', { name: /As-Is|asIs/i })).toBeInTheDocument();
  });

  it('readOnly=true 일 때 편집 트리거가 노출되지 않는다', () => {
    render(<TabRequirements interview={interviewWithTask} readOnly={true} onEdit={vi.fn()} />);
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('편집 저장 시 onEdit 이 task_analysis 부분 patch 로 호출된다', async () => {
    const onEdit = vi.fn().mockResolvedValue({ success: true });
    render(<TabRequirements interview={interviewWithTask} readOnly={false} onEdit={onEdit} />);
    await userEvent.click(screen.getByText('수기'));
    const editor = screen.getByRole('textbox');
    await userEvent.clear(editor);
    await userEvent.type(editor, '엑셀 매크로');
    await userEvent.tab(); // blur 저장
    expect(onEdit).toHaveBeenCalledWith(
      expect.objectContaining({
        task_analysis: expect.arrayContaining([expect.objectContaining({ asIs: '엑셀 매크로' })]),
      })
    );
  });
});
```

- [ ] **Step 2: 실패 확인**

```bash
npm run test -- TabRequirements.editable
```

Expected: FAIL — 현재 셀은 `<span>`이라 textbox 가 없다.

### Task 4.3: GREEN — 셀 3 종을 InlineEditField 로

**Files:**

- Modify: `src/app/(dashboard)/consultant/projects/[id]/roadmap/_components/result-v2/TabRequirements.tsx:167-197`

- [ ] **Step 3: bodyRows 셀 교체**

```tsx
bodyRows={tasks.map((t, idx) => ({
  cells: [
    { content: t.domain || '-', align: 'left' },
    { content: t.task || '-', align: 'left' },
    {
      content: (
        <InlineEditField
          value={t.asIs ?? ''}
          onSave={async (next) => {
            const draft = tasks.map((row, i) => (i === idx ? { ...row, asIs: next } : row));
            await onEdit({ task_analysis: draft });
          }}
          readOnly={readOnly}
          multiline
          placeholder="현행 (As-Is) 미입력"
        />
      ),
      align: 'left',
    },
    {
      content: (
        <InlineEditField
          value={t.problem ?? ''}
          onSave={async (next) => {
            const draft = tasks.map((row, i) => (i === idx ? { ...row, problem: next } : row));
            await onEdit({ task_analysis: draft });
          }}
          readOnly={readOnly}
          multiline
          placeholder="문제점 미입력"
        />
      ),
      align: 'left',
    },
    {
      content: (
        <InlineEditField
          value={t.dataTiming ?? ''}
          onSave={async (next) => {
            const draft = tasks.map((row, i) => (i === idx ? { ...row, dataTiming: next } : row));
            await onEdit({ task_analysis: draft });
          }}
          readOnly={readOnly}
          multiline
          placeholder="데이터 발생/보유 미입력"
        />
      ),
      align: 'left',
    },
    { content: String(t.aiScore ?? '-'), align: 'center' },
  ],
}))}
```

> **주의:** `task_analysis` Server Action(`onEdit`)이 배열 전체 patch 를 받아 deepMerge 하는지, 행 단위 인덱스 patch 만 받는지 `check-server-action` 스킬로 점검한다. 배열은 Map 키가 없으므로 `editInterviewFieldRoadmap` 의 deepMerge 로직 확인 필수 — **편집 전 전체 배열을 보내고 서버는 그대로 덮어쓰는 패턴**이 안전.

- [ ] **Step 4: Server Action 검증 — `check-server-action` 스킬 호출**

`Skill: check-server-action` 으로 `editInterviewFieldRoadmap` 가 `task_analysis` 배열 patch 를 deepMerge 가 아닌 **전체 교체**로 처리하는지 확인. 만약 deepMerge 라면 행 인덱스 base 가 서로 어긋나 lost update 발생 — 이 경우 RPC 함수에 `task_analysis` 전체 교체 분기 추가 필요(Task 4.5).

- [ ] **Step 5: 통과 확인**

```bash
npm run test -- TabRequirements.editable
```

Expected: PASS.

- [ ] **Step 6: 커밋**

```bash
git add src/app/.../TabRequirements.tsx src/app/.../__tests__/TabRequirements.editable.test.tsx
git commit -m "feat(result): 로드맵 결과 Ⅱ-3 표 자유 텍스트 셀 편집 가능 (As-Is/문제점/데이터)"
```

### Task 4.4: PBL 결과 페이지 동등 적용(승인된 경우)

Phase 0 Task 0.1 Step 2 에서 식별된 PBL 측 read-only 셀에 대해 Task 4.2 ~ 4.3 패턴 반복.

대상 후보(0.1 단계에서 확정):

- `pbl/_components/result-v2/TabPBLOps.tsx` 5 섹션 표 (이미 표 변환 완료된 상태 #14·#17·#18 — read-only 여부 재확인)
- `pbl/_components/result-v2/TabPBLAnalysis.tsx` / `TabPBLTasks.tsx` 등

각 파일별로:

- [ ] RED 테스트 → GREEN → 커밋(파일당 1 커밋)

### Task 4.5: 서버측 deepMerge 보강(필요 시)

Task 4.3 Step 4 에서 deepMerge 충돌이 식별되면:

**Files:**

- Modify: `src/app/(dashboard)/consultant/projects/[id]/interview/review/actions.ts` 또는 RPC 함수
- Migration: `supabase/migrations/NNN_interview_array_patch.sql` (필요 시)

- [ ] **Step 1: `supabase-dev` 스킬 호출** → 마이그 작성
- [ ] \*\*Step 2: `mcp__supabase__apply_migration` 으로 적용 + `list_migrations` 검증
- [ ] **Step 3: RED 테스트로 lost update 시나리오 회귀 방지** (행 동시 편집 시 마지막 저장이 다른 행을 덮지 않는지)
- [ ] **Step 4: 커밋**

### Task 4.6: E2E 시나리오

**Files:**

- Create: `e2e/consultant-result-edit.spec.ts`

- [ ] **Step 1: 테스트 작성 — `test-automator` 서브에이전트 호출 보조**

```ts
import { test, expect } from '@playwright/test';

test('컨설턴트가 결과 페이지 Ⅱ-3 표의 As-Is 셀을 인라인 편집할 수 있다', async ({ page }) => {
  await page.goto('/login');
  // ... 로그인 헬퍼 (e2e/_utils/login.ts 재사용)
  await page.goto('/consultant/projects/<seed-id>/roadmap');
  await page.getByRole('tab', { name: /요구분석/ }).click();
  const cell = page.locator('table').getByText('수기 작성').first();
  await cell.click();
  await page.getByRole('textbox').first().fill('엑셀 매크로 자동화');
  await page.keyboard.press('Tab');
  await expect(page.getByText('엑셀 매크로 자동화')).toBeVisible();
});
```

- [ ] **Step 2: 실행 + 통과**

```bash
npm run test:e2e -- consultant-result-edit
```

- [ ] **Step 3: 커밋**

```bash
git commit -m "test(e2e): 컨설턴트 결과 페이지 Ⅱ-3 셀 인라인 편집 E2E 추가"
```

---

## Phase 5 — 통합 검증(필수)

> **REQUIRED SUB-SKILL:** `superpowers:verification-before-completion`. 본 Phase 통과 전 어떤 단계도 "완료"로 단정 금지.

### Task 5.1: 자동 검증

- [ ] **Step 1: `npm run validate`** (typecheck + lint + Vitest 전체)

```bash
npm run validate
```

Expected: PASS.

- [ ] **Step 2: `npm run build`**

```bash
npm run build
```

Expected: 빌드 성공, 신규 경고 없음.

- [ ] **Step 3: `npm run test:e2e`**

```bash
npm run test:e2e
```

Expected: 신규 2 spec 포함 모든 E2E PASS.

### Task 5.2: 수동 시각 검증(`puppeteer` MCP)

컨설턴트 로컬 계정으로 로그인 후 다음 4 시나리오 캡처 + 비교(Phase 0 캡처와 before/after 대조).

- [ ] **Step 1: Ⅱ-3 표 셀 높이 비교**
  - 인터뷰 입력 → Ⅱ-3 표 → 셀 높이가 약 1.5배 증가했음을 시각 확인
- [ ] **Step 2: 검토 페이지 default 모두 접힘 확인**
  - 로드맵 트랙: 8 섹션 모두 닫힘
  - PBL 트랙: 9 섹션 모두 닫힘
- [ ] **Step 3: ReviewActions 레이아웃 확인**
  - desktop(1280px) / tablet(768px) / mobile(375px) 3 viewport 캡처
  - 헤딩·설명·CTA 그룹의 정렬 일관성 확인
- [ ] **Step 4: 결과 페이지 Ⅱ-3 셀 편집**
  - 셀 클릭 → textarea 활성 → 저장 → 토스트 + 값 반영 확인
  - 새로고침 후에도 값 유지(서버 반영) 확인

### Task 5.3: 회귀 점검

- [ ] **Step 1: 기존 E2E 시나리오 회귀**
  - `consultant/login.spec.ts`, `interview-roadmap.spec.ts`, `interview-pbl.spec.ts` 등 기존 spec 변동 없음 확인
- [ ] **Step 2: OPS/SYSTEM_ADMIN 계정 영향 범위 확인**
  - OPS 계정 로그인 → 동일 4 페이지 진입 시 권한 분기(`canEdit=false` 등)가 정상 작동
  - SYSTEM_ADMIN: 동일

### Task 5.4: 코드 리뷰 요청

- [ ] **Step 1: `superpowers:requesting-code-review` 스킬 호출**
  - 4 Phase 통합 diff 요약 + 검증 결과 첨부
- [ ] \*\*Step 2: 수정 사항이 있으면 `superpowers:receiving-code-review` 로 처리

### Task 5.5: PR 생성 (사용자 명시 시)

- [ ] **Step 1: PR 본문 — Phase 별 변경·테스트·검증 결과·캡처 첨부**
- [ ] **Step 2: PR 제목 한국어 규칙(예: `feat(consultant): 인터뷰·결과 페이지 UX 4건 일괄 개선`)**
- [ ] \*\*Step 3: `gh pr checks <PR>` 모든 check (Lint & Typecheck · Unit Test · Build · E2E Test · Vercel) 가 PASS 일 때만 "✅ 통과" 결정. Unit Test 만 보고 단정 금지.

---

## 승인 결과 기록 (2026-05-02 사용자 승인 완료)

```
[x] #1 텍스트 폼 높이: 옵션 A (150px → 225px, 1.5배)
    대상: src/app/(dashboard)/consultant/projects/[id]/interview/_components/roadmap/StepTaskAnalysis.tsx (5곳)
    PBL 동등 적용: N (다른 표·다른 베이스 값이라 변경 없음)

[x] #2 결과 페이지 편집 셀: 옵션 B (모든 read-only 셀 — 직무·AI필요도 포함)
    로드맵 대상: TabRequirements.tsx Ⅱ-3 표 6셀
        - 직무·과업 → InlineEditField (single-line)
        - As-Is·문제점·데이터 발생 → InlineEditField (multiline)
        - AI필요도 → 신규 NumberEditField (1~5 검증)
    PBL 결과 대상: 8셀 (Analysis 1 + Tasks 5 + Ops 2)
        - TabPBLAnalysis.tsx:97 — 주요 업무 설명
        - TabPBLTasks.tsx:76 — 수행 활동 내용
        - TabPBLTasks.tsx:339,347,355,363 — Ⅲ-3-다 AS-IS·TO-BE·요구지식·기술
        - TabPBLOps.tsx:203 — Ⅳ-3-다 훈련 교과목 세부
        - TabPBLOps.tsx:310 — Ⅳ-3-마 훈련강사 세부 훈련 내용
    행 추가/삭제 포함 여부: N (옵션 C 미선택)

[x] #3 모두 접힘 default: 옵션 B (모두 접힘 + 상단 '전체 펼치기/접기' 토글)
    구현 변경:
        - CollapsibleSection 을 controlled 패턴으로 리팩토링 (open/onOpenChange prop)
        - InterviewReviewClient 에 openMap (Record<string, boolean>) 상태 추가
        - 상단에 [전체 펼치기] [전체 접기] 버튼 2개 (또는 단일 토글)
    대상: InterviewReviewClient.tsx — 로드맵 8섹션·PBL 9섹션 + 보조 컴포넌트 line 414-438

[x] #4 ReviewActions 레이아웃: 옵션 A (분리 카드형 — 헤딩+설명+우측 정렬 CTA)
    대상: ReviewActions.tsx 단일 (ROADMAP·PBL 자동 동시 적용 — 별도 PBL CTA 컴포넌트 없음)
    구조:
        <section> rounded-lg border p-5
          <div> h3 "검토를 마치셨나요?" + p 설명
          <div data-testid="review-cta-group"> sm:justify-end
            [outline btn ← 인터뷰로]  [primary btn 결과로 →]
```

---

## Self-Review 체크리스트(계획 작성자가 직접 확인)

- [x] 사용자 보고 4 건 모두 Phase 1~4 와 1:1 매핑
- [x] PBL 동등 적용 결정은 Phase 0 승인 게이트로 분리(임의 적용 금지)
- [x] 모든 Step 에 actual code · 정확한 명령 · 예상 출력 명시
- [x] TDD RED → GREEN → 커밋 사이클이 모든 코드 변경 Task 에 적용됨
- [x] 검증 Phase 5 가 자동(typecheck/lint/test/build/e2e) + 수동(시각) + 회귀(타 역할) 3 축으로 구성됨
- [x] CI 통과 판정은 `gh pr checks` 모든 check 기준임을 PR 단계에 명시
- [x] 마이그레이션 변경 시 `apply_migration + list_migrations` 검증까지 원자적으로 완료하도록 Task 4.5 에 명시
- [x] UI/UX 변경 사전 승인 룰을 Phase 0 게이트로 강제

---

## Execution Handoff

**계획서 저장 완료. 두 가지 실행 방식 중 선택:**

1. **Subagent-Driven (권장)** — Phase 단위로 fresh subagent 디스패치 + 사이사이 리뷰. `superpowers:subagent-driven-development` 사용.
2. **Inline Execution** — 본 세션에서 Phase 1 → 5 직선 실행 + Phase 0 승인 게이트만 사용자 확인. `superpowers:executing-plans` 사용.

**어느 방식으로 진행할까요?**
