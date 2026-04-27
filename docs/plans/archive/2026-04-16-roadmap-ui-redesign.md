# 로드맵 결과 페이지 UI 리디자인 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 컨설턴트·운영자·테스트 로드맵 결과 3개 페이지를 사이드바 없는 풀 너비 레이아웃 + 양식 1번 2단 헤더 역량 표 + 세로 stack 개요 블록 + 균일 높이 셀로 리디자인한다.

**Architecture:** 공용 컴포넌트(Overview/Competency/Matrix/Annual/CourseSpec)를 수정해 3개 페이지가 동시에 혜택을 보도록 한다. 버전 셀렉터와 수정요청 아코디언은 신규 공용 컴포넌트로 분리. RTL 테스트로 2단 헤더 정합성·셀 높이·줄바꿈을 검증.

**Tech Stack:** Next.js 16 App Router · TypeScript · Tailwind CSS 4.x · shadcn/ui (Accordion/DropdownMenu/Select/Dialog) · Vitest + @testing-library/react · Playwright 수동 검증.

**설계 문서:** `docs/plans/archive/2026-04-16-roadmap-ui-redesign-design.md`

**브랜치:** `feature/ofa-06.5-form-compliance` (동일 브랜치 연속 작업)

---

## File Structure

**신규 생성:**
- `src/components/roadmap/VersionSelector.tsx` — 버전 드롭다운 (shadcn Select 기반)
- `src/components/roadmap/VersionSelector.test.tsx`
- `src/components/roadmap/RegenerateAccordion.tsx` — 수정 요청 아코디언 + textarea + 생성 버튼
- `src/components/roadmap/RegenerateAccordion.test.tsx`

**수정:**
- `src/components/roadmap/CompetencyModelingTable.tsx` — 2단 헤더 + 셀 높이 균일
- `src/components/roadmap/CompetencyModelingTable.test.tsx`
- `src/components/roadmap/RoadmapOverviewSummary.tsx` — 세로 stack
- `src/components/roadmap/AnnualTrainingPlanTable.tsx` — 열 폭 고정/flex + 줄바꿈
- `src/components/roadmap/CourseSpecCard.tsx` — 교과목 표 균형
- `src/components/roadmap/RoadmapMatrix.tsx` — 셀 줄바꿈 보강
- `src/app/(dashboard)/consultant/projects/[id]/roadmap/_components/ConsultantRoadmapClient.tsx` — 사이드바 제거, 상단 바 + 아코디언 + 메인 풀 너비
- `src/app/(dashboard)/consultant/projects/[id]/roadmap/_components/ConsultantRoadmapClient.test.tsx`
- `src/app/(dashboard)/ops/projects/[id]/roadmap/_components/OpsRoadmapClient.tsx` — 동일 레이아웃 (읽기 전용)
- `src/app/(dashboard)/ops/projects/[id]/roadmap/_components/OpsRoadmapClient.test.tsx`
- `src/app/(dashboard)/test-roadmap/_components/TestRoadmapClient.tsx` — 가능한 경우 동일 구조 적용

---

## Task 1: 공용 컴포넌트 `VersionSelector` (TDD)

**Files:**
- Create: `src/components/roadmap/VersionSelector.tsx`
- Create: `src/components/roadmap/VersionSelector.test.tsx`

- [ ] **Step 1: 실패 테스트 작성**

```tsx
// src/components/roadmap/VersionSelector.test.tsx
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { VersionSelector } from './VersionSelector';
import type { RoadmapVersionUI } from '@/types/roadmap-ui';

function makeVer(v: number, status: 'DRAFT' | 'FINAL' | 'ARCHIVED' = 'DRAFT'): RoadmapVersionUI {
  return {
    id: `v${v}`,
    version_number: v,
    status,
    diagnosis_summary: '',
    setup_necessity: '',
    outcome_summary: { ai_competency_level: 'BEGINNER', selected_tasks: '', main_content: '' },
    competencies: [],
    ncs_used: false,
    ncs_methodology: '',
    ncs_derivation_method: '',
    training_structure: [],
    training_structure_method: '',
    annual_plan: { items: [], usage_plan: '' },
    course_specs: [],
    revision_prompt: null,
    is_shared: false,
    created_at: '2026-04-16T00:00:00Z',
    finalized_at: null,
  };
}

describe('VersionSelector', () => {
  it('선택된 버전이 트리거에 표시', () => {
    render(
      <VersionSelector
        versions={[makeVer(2, 'FINAL'), makeVer(1, 'DRAFT')]}
        selectedId="v2"
        onSelect={vi.fn()}
      />,
    );
    expect(screen.getByRole('combobox')).toHaveTextContent(/버전 2/);
  });

  it('드롭다운 열면 전체 버전 목록 노출', async () => {
    render(
      <VersionSelector
        versions={[makeVer(2, 'FINAL'), makeVer(1, 'DRAFT')]}
        selectedId="v2"
        onSelect={vi.fn()}
      />,
    );
    await userEvent.click(screen.getByRole('combobox'));
    const list = await screen.findByRole('listbox');
    expect(within(list).getByText(/버전 2/)).toBeInTheDocument();
    expect(within(list).getByText(/버전 1/)).toBeInTheDocument();
  });

  it('항목 클릭 시 onSelect 호출', async () => {
    const onSelect = vi.fn();
    render(
      <VersionSelector
        versions={[makeVer(2, 'FINAL'), makeVer(1, 'DRAFT')]}
        selectedId="v2"
        onSelect={onSelect}
      />,
    );
    await userEvent.click(screen.getByRole('combobox'));
    const list = await screen.findByRole('listbox');
    await userEvent.click(within(list).getByText(/버전 1/));
    expect(onSelect).toHaveBeenCalledWith('v1');
  });

  it('versions가 비어있으면 비활성 상태', () => {
    render(<VersionSelector versions={[]} selectedId={undefined} onSelect={vi.fn()} />);
    expect(screen.getByRole('combobox')).toBeDisabled();
  });
});
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

```bash
npx vitest run src/components/roadmap/VersionSelector.test.tsx
```
Expected: FAIL (`VersionSelector` not found)

- [ ] **Step 3: 최소 구현**

```tsx
// src/components/roadmap/VersionSelector.tsx
'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RoadmapStatusBadge } from './RoadmapStatusBadge';
import type { RoadmapVersionUI } from '@/types/roadmap-ui';

interface VersionSelectorProps {
  versions: RoadmapVersionUI[];
  selectedId: string | undefined;
  onSelect: (versionId: string) => void;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  } catch {
    return iso.slice(0, 10);
  }
}

export function VersionSelector({ versions, selectedId, onSelect }: VersionSelectorProps) {
  const disabled = versions.length === 0;
  return (
    <Select value={selectedId} onValueChange={onSelect} disabled={disabled}>
      <SelectTrigger className="min-w-[240px]">
        <SelectValue placeholder="버전 선택" />
      </SelectTrigger>
      <SelectContent>
        {versions.map((v) => (
          <SelectItem key={v.id} value={v.id}>
            <span className="flex items-center gap-2">
              <span className="font-medium">버전 {v.version_number}</span>
              <RoadmapStatusBadge status={v.status} versionNumber={v.version_number} />
              <span className="text-xs text-muted-foreground">
                {formatDate(v.created_at)}
              </span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

- [ ] **Step 4: 테스트 실행 → 통과 확인**

```bash
npx vitest run src/components/roadmap/VersionSelector.test.tsx
```
Expected: PASS (4 tests)

- [ ] **Step 5: 커밋**

```bash
git add src/components/roadmap/VersionSelector.tsx src/components/roadmap/VersionSelector.test.tsx
git commit -m "feat(ofa-06.5): VersionSelector 공용 컴포넌트 추가

- shadcn Select 기반 로드맵 버전 드롭다운
- 상태 뱃지 + 생성일 표시
- 빈 목록 비활성화 처리"
```

---

## Task 2: 공용 컴포넌트 `RegenerateAccordion` (TDD)

**Files:**
- Create: `src/components/roadmap/RegenerateAccordion.tsx`
- Create: `src/components/roadmap/RegenerateAccordion.test.tsx`

- [ ] **Step 1: 실패 테스트 작성**

```tsx
// src/components/roadmap/RegenerateAccordion.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { RegenerateAccordion } from './RegenerateAccordion';

describe('RegenerateAccordion', () => {
  it('초기 접힘 상태, 트리거 클릭 시 펼쳐짐', async () => {
    render(
      <RegenerateAccordion
        value={''}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        isLoading={false}
      />,
    );
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /새 버전 생성/ }));
    expect(await screen.findByRole('textbox')).toBeInTheDocument();
  });

  it('textarea에 rows 속성이 충분히 크게 설정', async () => {
    render(
      <RegenerateAccordion
        value={''}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        isLoading={false}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /새 버전 생성/ }));
    const ta = await screen.findByRole('textbox');
    expect(Number(ta.getAttribute('rows'))).toBeGreaterThanOrEqual(6);
  });

  it('입력 시 onChange, 생성 시작 클릭 시 onSubmit 호출', async () => {
    const onChange = vi.fn();
    const onSubmit = vi.fn();
    render(
      <RegenerateAccordion
        value={'기존 프롬프트'}
        onChange={onChange}
        onSubmit={onSubmit}
        isLoading={false}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /새 버전 생성/ }));
    await userEvent.type(screen.getByRole('textbox'), 'X');
    expect(onChange).toHaveBeenLastCalledWith('기존 프롬프트X');
    await userEvent.click(screen.getByRole('button', { name: /생성 시작/ }));
    expect(onSubmit).toHaveBeenCalled();
  });

  it('isLoading=true이면 생성 시작 버튼 비활성화', async () => {
    render(
      <RegenerateAccordion
        value={''}
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        isLoading={true}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /새 버전 생성/ }));
    expect(screen.getByRole('button', { name: /생성 중|생성 시작/ })).toBeDisabled();
  });
});
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

```bash
npx vitest run src/components/roadmap/RegenerateAccordion.test.tsx
```
Expected: FAIL

- [ ] **Step 3: 최소 구현**

```tsx
// src/components/roadmap/RegenerateAccordion.tsx
'use client';

import { useState } from 'react';
import { Loader2, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface RegenerateAccordionProps {
  value: string;
  onChange: (next: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  disabled?: boolean;
}

export function RegenerateAccordion({
  value,
  onChange,
  onSubmit,
  isLoading,
  disabled,
}: RegenerateAccordionProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-border bg-background">
      <Button
        type="button"
        variant={open ? 'ghost' : 'default'}
        className="w-full justify-between rounded-lg"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
      >
        <span className="flex items-center gap-2">
          <Plus className="h-4 w-4" />새 버전 생성
        </span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </Button>
      {open && (
        <div className="border-t border-border p-4 space-y-3">
          <div>
            <Label htmlFor="regenerate-prompt" className="mb-2 block text-sm font-medium">
              수정 요청 사항 (선택)
            </Label>
            <Textarea
              id="regenerate-prompt"
              rows={8}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="예) 역량별로 초/중/고급 훈련과정을 각 1개 이상 추가해주세요. Canva AI를 활용한 과정을 포함해주세요."
              className="min-h-[200px]"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              취소
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={onSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  AI 생성 중…
                </>
              ) : (
                '생성 시작'
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npx vitest run src/components/roadmap/RegenerateAccordion.test.tsx
```
Expected: PASS (4 tests)

- [ ] **Step 5: 커밋**

```bash
git add src/components/roadmap/RegenerateAccordion.tsx src/components/roadmap/RegenerateAccordion.test.tsx
git commit -m "feat(ofa-06.5): RegenerateAccordion 공용 컴포넌트 추가

- 새 버전 생성 아코디언 (접기/펼치기)
- textarea rows=8 + min-h-[200px]
- 로딩 상태 + 생성 시작/취소 버튼"
```

---

## Task 3: `CompetencyModelingTable` 2단 헤더 + 셀 균일화 (TDD)

**Files:**
- Modify: `src/components/roadmap/CompetencyModelingTable.tsx`
- Modify: `src/components/roadmap/CompetencyModelingTable.test.tsx`

- [ ] **Step 1: 기존 테스트에 2단 헤더 검증 추가**

```tsx
// src/components/roadmap/CompetencyModelingTable.test.tsx 기존 파일에 아래 describe 추가
describe('2단 헤더 (양식 1번 Ⅲ-1)', () => {
  it('상위 "필요 지식·기술·태도" 헤더가 colspan=3으로 존재', () => {
    render(<CompetencyModelingTable competencies={[]} canEdit={false} />);
    // 빈 상태는 EmptyState를 렌더하므로, 데이터 있는 경우로 테스트
  });

  it('역량 데이터 있을 때 상위 헤더 + 하위 헤더 구조', () => {
    render(
      <CompetencyModelingTable
        competencies={[makeCompetency('데이터 분석')]}
        canEdit={false}
      />,
    );
    const groupHeader = screen.getByRole('columnheader', {
      name: /필요 지식.*기술.*태도/,
    });
    expect(groupHeader).toHaveAttribute('colspan', '3');

    // 하위 헤더: 지식(학술, 업무지식) / 기술(기능) / 태도
    expect(screen.getByRole('columnheader', { name: /^지식/ })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /^기술/ })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /^태도/ })).toBeInTheDocument();
  });

  it('역량명·정의 헤더는 rowspan=2', () => {
    render(
      <CompetencyModelingTable
        competencies={[makeCompetency('A')]}
        canEdit={false}
      />,
    );
    expect(screen.getByRole('columnheader', { name: '역량명' })).toHaveAttribute('rowspan', '2');
    expect(screen.getByRole('columnheader', { name: /역량 정의/ })).toHaveAttribute('rowspan', '2');
  });
});

describe('셀 균일 높이 + 자동 줄바꿈', () => {
  it('각 td에 whitespace-pre-wrap break-words 클래스 적용', () => {
    const { container } = render(
      <CompetencyModelingTable
        competencies={[makeCompetency('A')]}
        canEdit={false}
      />,
    );
    const tds = container.querySelectorAll('tbody td');
    tds.forEach((td) => {
      const cls = td.className;
      expect(cls).toMatch(/break-words|break-keep/);
    });
  });
});
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

```bash
npx vitest run src/components/roadmap/CompetencyModelingTable.test.tsx
```
Expected: FAIL (colspan 헤더 없음, rowspan 없음)

- [ ] **Step 3: `CompetencyModelingTable.tsx` `<thead>` 2단 구조로 변경**

`<thead>` 블록 전체 교체:

```tsx
<thead className="bg-muted/50">
  <tr>
    <th
      rowSpan={2}
      className="w-[12%] px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide align-middle"
      scope="col"
    >
      역량명
    </th>
    <th
      rowSpan={2}
      className="w-[26%] px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide align-middle"
      scope="col"
    >
      <span>역량 정의</span>
      <span className="ml-1 font-normal normal-case text-[11px] text-muted-foreground/80">
        (수행준거)
      </span>
    </th>
    <th
      colSpan={3}
      className="px-3 py-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b border-border"
      scope="colgroup"
    >
      필요 지식·기술·태도
    </th>
    {canEdit && (
      <th rowSpan={2} className="w-[60px] px-3 py-2 text-center text-xs font-semibold text-muted-foreground uppercase align-middle" scope="col">
        액션
      </th>
    )}
  </tr>
  <tr>
    <th
      className="w-[20%] px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide"
      scope="col"
    >
      <span>지식</span>
      <span className="ml-1 font-normal normal-case text-[11px] text-muted-foreground/80">
        (학술, 업무지식)
      </span>
    </th>
    <th
      className="w-[20%] px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide"
      scope="col"
    >
      <span>기술</span>
      <span className="ml-1 font-normal normal-case text-[11px] text-muted-foreground/80">
        (기능)
      </span>
    </th>
    <th
      className="w-[22%] px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide"
      scope="col"
    >
      태도
    </th>
  </tr>
</thead>
```

`COLUMN_HEADERS` 상수는 제거 또는 유지만 (더 이상 map으로 헤더 렌더하지 않음). 빈 상태의 `colSpan` 값도 업데이트:

```tsx
// tbody의 empty row colSpan: 역량명/정의/지식/기술/태도 = 5 + (canEdit ? 1 : 0)
<td
  colSpan={canEdit ? 6 : 5}
  className="px-3 py-8 text-center text-sm text-muted-foreground"
>
```

`DesktopRow`의 `<td>` 각각에 `whitespace-pre-wrap break-words [overflow-wrap:anywhere]` 추가:

```tsx
<td className="px-3 py-3 align-top whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
  ...
</td>
```

`Textarea`(편집 모드) 모두 `rows={4}` 통일.

- [ ] **Step 4: 테스트 통과 확인**

```bash
npx vitest run src/components/roadmap/CompetencyModelingTable.test.tsx
```
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/components/roadmap/CompetencyModelingTable.tsx src/components/roadmap/CompetencyModelingTable.test.tsx
git commit -m "feat(ofa-06.5): 역량 모델링 표 2단 헤더 + 셀 균일화

- 상위 '필요 지식·기술·태도' colspan=3 헤더 + 하위 3열 (양식 1번 Ⅲ-1)
- 역량명/정의는 rowspan=2로 상단 정렬
- 모든 td에 whitespace-pre-wrap break-words 적용
- 편집 모드 textarea rows=4 통일"
```

---

## Task 4: `RoadmapOverviewSummary` 세로 stack (TDD)

**Files:**
- Modify: `src/components/roadmap/RoadmapOverviewSummary.tsx`
- Create: `src/components/roadmap/RoadmapOverviewSummary.test.tsx`

- [ ] **Step 1: 테스트 작성**

```tsx
// src/components/roadmap/RoadmapOverviewSummary.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { RoadmapOverviewSummary } from './RoadmapOverviewSummary';

describe('RoadmapOverviewSummary', () => {
  it('필드가 모두 비었으면 렌더되지 않음', () => {
    const { container } = render(
      <RoadmapOverviewSummary
        setupNecessity=""
        outcomeSummary={{ ai_competency_level: 'BEGINNER', selected_tasks: '', main_content: '' }}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('수립 필요성·선정 과업·수립 주요내용·AI 역량 뱃지가 모두 세로 stack', () => {
    render(
      <RoadmapOverviewSummary
        setupNecessity="필요성"
        outcomeSummary={{
          ai_competency_level: 'INTERMEDIATE',
          selected_tasks: '과업',
          main_content: '주요내용',
        }}
      />,
    );
    const dl = screen.getByRole('list');
    expect(dl).toBeInTheDocument();
    // 세로 stack: grid-cols-2 없음
    expect(dl.className).not.toMatch(/grid-cols-2|md:grid-cols-2/);
  });

  it('AI 역량 수준 뱃지가 중급 + AI탐구형 라벨', () => {
    render(
      <RoadmapOverviewSummary
        setupNecessity="x"
        outcomeSummary={{ ai_competency_level: 'INTERMEDIATE', selected_tasks: '', main_content: '' }}
      />,
    );
    expect(screen.getByText(/중급/)).toBeInTheDocument();
    expect(screen.getByText(/AI탐구형/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 테스트 실행**

```bash
npx vitest run src/components/roadmap/RoadmapOverviewSummary.test.tsx
```
Expected: 일부 FAIL (grid-cols-2를 포함한 현재 구조)

- [ ] **Step 3: 컴포넌트를 세로 stack으로 교체**

`dl` 태그 + stack 구조로 재작성:

```tsx
<section
  aria-label="로드맵 개요 (Ⅰ장)"
  className="rounded-lg border border-border bg-muted/20 p-5 space-y-4 break-keep"
>
  <header className="flex items-center justify-between gap-2 flex-wrap">
    <h3 className="text-sm font-semibold text-foreground">개요 (Ⅰ장)</h3>
    <Badge variant="outline" className={LEVEL_BADGE_CLASS[outcomeSummary.ai_competency_level]}>
      AI 역량 {LEVEL_LABEL[outcomeSummary.ai_competency_level]}
    </Badge>
  </header>
  <dl role="list" className="space-y-4 text-sm">
    <Row label="수립 필요성" value={setupNecessity} />
    <Row label="선정 과업" value={outcomeSummary.selected_tasks} />
    <Row label="수립 주요내용 요약" value={outcomeSummary.main_content} />
  </dl>
</section>
```

`Row` 헬퍼:

```tsx
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1 pb-1 border-b border-border/40">
        {label}
      </dt>
      <dd className="text-foreground whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
        {value || '-'}
      </dd>
    </div>
  );
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
npx vitest run src/components/roadmap/RoadmapOverviewSummary.test.tsx
```
Expected: PASS (3 tests)

- [ ] **Step 5: 커밋**

```bash
git add src/components/roadmap/RoadmapOverviewSummary.tsx src/components/roadmap/RoadmapOverviewSummary.test.tsx
git commit -m "feat(ofa-06.5): Ⅰ장 요약 블록 세로 stack 재배치

- 필드 나란히(2열) → 세로 stack (dl > dt + dd)
- 라벨 아래 얇은 구분선으로 시각 리듬
- whitespace-pre-wrap으로 긴 문단 안정적 표시"
```

---

## Task 5: `AnnualTrainingPlanTable` 표 균형

**Files:**
- Modify: `src/components/roadmap/AnnualTrainingPlanTable.tsx`

- [ ] **Step 1: 현재 구조 확인**

```bash
grep -n 'colgroup\|col span\|<col \|th ' src/components/roadmap/AnnualTrainingPlanTable.tsx | head -20
```

- [ ] **Step 2: 열 폭 고정/유연 조정 + 줄바꿈**

각 `<th>` / `<td>` 너비 및 클래스 변경:

```tsx
// 헤더 너비 + center/right 정렬
<th className="w-[18%] px-3 py-2 text-left ...">역량명</th>
<th className="px-3 py-2 text-left ...">훈련과정명</th>  {/* flex */}
<th className="w-[10%] px-3 py-2 text-center ...">훈련형태</th>
<th className="w-[10%] px-3 py-2 text-right ...">훈련시간</th>
<th className="w-[20%] px-3 py-2 text-left ...">비고</th>

// 각 td에 whitespace-pre-wrap break-words [overflow-wrap:anywhere] + align-top
<td className="px-3 py-3 align-top whitespace-pre-wrap break-words [overflow-wrap:anywhere]">...</td>
```

- [ ] **Step 3: 기존 테스트 실행**

```bash
npx vitest run src/components/roadmap/AnnualTrainingPlanTable.test.tsx 2>&1 | tail -5
```
Expected: PASS (변경이 시각에만 영향, 기능 테스트는 유지)

- [ ] **Step 4: 커밋**

```bash
git add src/components/roadmap/AnnualTrainingPlanTable.tsx
git commit -m "feat(ofa-06.5): 연간 훈련계획 표 열 폭·줄바꿈 조정

- 역량명 18%, 형태 10% 고정, 시간 10% right 정렬
- 과정명·비고는 flex + 줄바꿈
- 모든 td whitespace-pre-wrap break-words"
```

---

## Task 6: `CourseSpecCard` 교과목 표 균형

**Files:**
- Modify: `src/components/roadmap/CourseSpecCard.tsx`

- [ ] **Step 1: 교과목 표 열 폭 조정**

`SubjectsSection`의 `<th>` 블록 수정:

```tsx
<th scope="col" className="w-[180px] px-3 py-2 text-left ...">교과목명</th>
<th scope="col" className="px-3 py-2 text-left ...">
  <span>세부 내용</span>
  <span className="ml-1 font-normal normal-case text-[11px] text-muted-foreground/80">
    (단원, 과제명)
  </span>
</th>
<th scope="col" className="w-[90px] px-3 py-2 text-right ...">시간</th>
```

각 `<td>`에 `align-top whitespace-pre-wrap break-words` 적용. 프로필 섹션 표도 라벨 `w-[140px]`로 유지.

- [ ] **Step 2: 테스트 실행**

```bash
npx vitest run 'src/components/roadmap/CourseSpecCard' 2>&1 | tail -5
```
Expected: PASS

- [ ] **Step 3: 커밋**

```bash
git add src/components/roadmap/CourseSpecCard.tsx
git commit -m "feat(ofa-06.5): 훈련과정 명세서 교과목 표 균형 조정

- 교과목명 180px 고정, 시간 90px right
- 세부 내용은 flex + 줄바꿈
- align-top로 같은 행 셀 정렬"
```

---

## Task 7: `RoadmapMatrix` 셀 줄바꿈 보강

**Files:**
- Modify: `src/components/roadmap/RoadmapMatrix.tsx`

- [ ] **Step 1: TrainingItemCard 내부 텍스트 줄바꿈 보강**

현재 `break-keep` 적용되어 있음. 긴 영문 URL·토큰 대비 `[overflow-wrap:anywhere]` 추가:

```tsx
<div className="font-semibold text-foreground break-keep [overflow-wrap:anywhere]">{item.content}</div>
```

Cell 컴포넌트의 `<td>`에도 `align-top` 유지 + `min-w-[160px]` 정도 지정 안 (너무 작으면 가로 스크롤로 해결). 이미 overflow-x-auto라 OK.

- [ ] **Step 2: 테스트 실행**

```bash
npx vitest run src/components/roadmap/RoadmapMatrix.test.tsx 2>&1 | tail -5
```
Expected: PASS

- [ ] **Step 3: 커밋**

```bash
git add src/components/roadmap/RoadmapMatrix.tsx
git commit -m "refactor(ofa-06.5): 훈련체계도 매트릭스 긴 토큰 줄바꿈 보강"
```

---

## Task 8: `ConsultantRoadmapClient` 레이아웃 재구성

**Files:**
- Modify: `src/app/(dashboard)/consultant/projects/[id]/roadmap/_components/ConsultantRoadmapClient.tsx`
- Modify: `src/app/(dashboard)/consultant/projects/[id]/roadmap/_components/ConsultantRoadmapClient.test.tsx`

- [ ] **Step 1: 기존 테스트의 셀렉터 갱신**

기존 테스트가 사이드바 요소(버전 히스토리 리스트)에 의존하면 드롭다운 기반으로 변경. 예:

```tsx
// 변경 전
screen.getByRole('button', { name: /버전 1/ });
// 변경 후
screen.getByRole('combobox'); // VersionSelector
```

- [ ] **Step 2: 레이아웃 JSX 재구성**

`return (...)` 블록을 `grid lg:grid-cols-4` → 단일 컬럼으로 변경:

```tsx
return (
  <>
    <div className="space-y-6">
      <PageHeader
        title="AI 교육 로드맵"
        backLink={{
          href: `/consultant/projects/${projectId}`,
          label: '프로젝트로 돌아가기',
          useBack: true,
        }}
        actions={
          selectedVersion ? (
            <div className="flex items-center gap-2">
              <DownloadButton
                onClick={handleDownloadPDF}
                loading={isDownloading === 'PDF'}
                type="PDF"
                disabled={isDownloading !== null}
              />
              <DownloadButton
                onClick={handleDownloadXLSX}
                loading={isDownloading === 'XLSX'}
                type="Excel"
                disabled={isDownloading !== null}
              />
              {canEdit && (
                <Button
                  onClick={handleFinalize}
                  disabled={isFinalizing}
                  className="bg-green-600 hover:bg-green-700 text-white text-sm"
                >
                  {isFinalizing ? '처리 중...' : '최종 확정'}
                </Button>
              )}
            </div>
          ) : undefined
        }
      />

      {/* 버전 셀렉터 바 */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border -mx-4 px-4 py-3 sm:-mx-6 sm:px-6 flex items-center justify-between gap-3 flex-wrap">
        <VersionSelector
          versions={versions}
          selectedId={selectedVersion?.id}
          onSelect={handleVersionSelect}
        />
        {selectedVersion?.status === 'FINAL' && (
          <ShareToggle
            roadmapVersionId={selectedVersion.id}
            initialShared={selectedVersion.is_shared ?? false}
          />
        )}
      </div>

      {/* 수정 요청 아코디언 */}
      <RegenerateAccordion
        value={revisionPrompt}
        onChange={setRevisionPrompt}
        onSubmit={handleGenerate}
        isLoading={isGenerating}
      />

      {selectedVersion ? (
        <div className="bg-card shadow rounded-lg pb-1">
          <div className="px-6 py-5 border-b border-gray-200 space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-lg font-semibold text-gray-900">
                버전 {selectedVersion.version_number}
              </h2>
              <RoadmapStatusBadge
                status={selectedVersion.status}
                versionNumber={selectedVersion.version_number}
              />
              {isSaving && <span className="text-xs text-gray-400">저장 중…</span>}
            </div>

            {selectedVersion.revision_prompt && (
              <RevisionPromptToggle prompt={selectedVersion.revision_prompt} />
            )}

            <RoadmapOverviewSummary
              setupNecessity={selectedVersion.setup_necessity}
              outcomeSummary={selectedVersion.outcome_summary}
            />

            {selectedVersion.diagnosis_summary && (
              <p className="text-sm text-muted-foreground whitespace-pre-wrap break-keep">
                {selectedVersion.diagnosis_summary}
              </p>
            )}
          </div>

          {/* 탭 (sticky) */}
          <div className="sticky top-[60px] z-10 bg-card border-b border-gray-200">
            <nav className="flex -mb-px overflow-x-auto">
              {ROADMAP_TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-3 py-2 sm:px-6 sm:py-3 text-xs sm:text-sm font-medium border-b-2 whitespace-nowrap flex-shrink-0 ${
                    activeTab === tab.key
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-4 sm:p-6">
            {activeTab === 'competencies' && (
              <div className="space-y-5">
                <CompetencyModelingTable
                  competencies={selectedVersion.competencies}
                  canEdit={canEdit}
                  onChange={handleCompetenciesChange}
                />
                <NcsMethodologyBox
                  ncsUsed={selectedVersion.ncs_used}
                  ncsMethodology={selectedVersion.ncs_methodology}
                  ncsDerivationMethod={selectedVersion.ncs_derivation_method}
                  canEdit={canEdit}
                  onChange={handleNcsChange}
                />
              </div>
            )}
            {activeTab === 'structure' && (
              <RoadmapMatrix
                competencies={selectedVersion.competencies}
                trainingStructure={selectedVersion.training_structure}
                trainingStructureMethod={selectedVersion.training_structure_method}
                canEdit={canEdit}
                onTrainingStructureMethodChange={handleTrainingStructureMethodChange}
              />
            )}
            {activeTab === 'plan' && (
              <AnnualTrainingPlanTable
                plan={selectedVersion.annual_plan}
                competencies={selectedVersion.competencies}
                canEdit={canEdit}
                onChange={handleAnnualPlanChange}
              />
            )}
            {activeTab === 'specs' && (
              <CoursesList
                specs={selectedVersion.course_specs}
                canEdit={canEdit}
                onChange={handleCourseSpecsChange}
              />
            )}
          </div>
        </div>
      ) : (
        <EmptyRoadmapState />
      )}
    </div>

    {/* 로딩 오버레이 유지 */}
    {isGenerating && (
      <RoadmapLoadingOverlay
        isTestMode={false}
        companyName={companyName}
        profileHref="/consultant/profile"
        onCancel={handleCancelGeneration}
        isCompleted={isGenerationComplete}
      />
    )}
  </>
);
```

VersionSelector import 추가:

```tsx
import { VersionSelector } from '@/components/roadmap/VersionSelector';
import { RegenerateAccordion } from '@/components/roadmap/RegenerateAccordion';
```

- [ ] **Step 3: 테스트 실행**

```bash
npx vitest run 'src/app/(dashboard)/consultant/projects/[id]/roadmap' 2>&1 | tail -10
```
Expected: PASS (기존 테스트 셀렉터 갱신)

- [ ] **Step 4: 커밋**

```bash
git add src/app/\(dashboard\)/consultant/projects/\[id\]/roadmap/_components/
git commit -m "feat(ofa-06.5): 컨설턴트 로드맵 레이아웃 재구성

- 사이드바 제거 → 상단 버전 셀렉터 + 아코디언 + 메인 풀 너비
- Ⅰ장 요약 블록을 헤더 영역으로 이동
- 탭 sticky, 다운로드·최종확정 버튼 PageHeader actions로 통합"
```

---

## Task 9: `OpsRoadmapClient` 동일 레이아웃 (읽기 전용)

**Files:**
- Modify: `src/app/(dashboard)/ops/projects/[id]/roadmap/_components/OpsRoadmapClient.tsx`
- Modify: `src/app/(dashboard)/ops/projects/[id]/roadmap/_components/OpsRoadmapClient.test.tsx`

- [ ] **Step 1: 레이아웃 재구성 (Task 8의 구조를 운영자용 읽기 전용으로)**

Consultant와 동일 구조. 단:
- `RegenerateAccordion`과 `handleGenerate`·`handleFinalize` 관련 UI 모두 제외
- `VersionSelector`만 유지 (읽기 전용이므로 onSelect가 `handleVersionSelect`에 연결)
- `canEdit` 관련 prop은 모두 `false`
- 공유 토글은 FINAL 버전일 때 상단에 표시 (운영자는 조회만)

- [ ] **Step 2: 테스트 갱신 및 실행**

```bash
npx vitest run 'src/app/(dashboard)/ops/projects/[id]/roadmap' 2>&1 | tail -5
```
Expected: PASS

- [ ] **Step 3: 커밋**

```bash
git add src/app/\(dashboard\)/ops/projects/\[id\]/roadmap/_components/
git commit -m "feat(ofa-06.5): 운영자 로드맵 레이아웃 재구성 (읽기 전용)

- 컨설턴트와 동일한 상단 셀렉터 + 메인 풀 너비
- 생성·편집 UI 제거, 다운로드·공유만 유지"
```

---

## Task 10: `TestRoadmapClient` 레이아웃 적용

**Files:**
- Modify: `src/app/(dashboard)/test-roadmap/_components/TestRoadmapClient.tsx` (또는 유사 이름)

- [ ] **Step 1: 해당 컴포넌트 파일 탐색**

```bash
grep -rn 'TestRoadmap\|RoadmapOverviewSummary\|ROADMAP_TABS' src/app/\(dashboard\)/test-roadmap/ | head
```

- [ ] **Step 2: Task 8과 동일한 원칙으로 레이아웃 수정**

- Ⅰ장 요약 블록 추가
- 탭 sticky
- 공용 컴포넌트 props 그대로 사용 (CompetencyModelingTable / RoadmapMatrix / ...)

- [ ] **Step 3: 테스트 실행 + 커밋**

```bash
npx vitest run 'src/app/(dashboard)/test-roadmap' 2>&1 | tail -5
git add src/app/\(dashboard\)/test-roadmap/
git commit -m "feat(ofa-06.5): 테스트 로드맵 레이아웃 동일 원칙 적용"
```

---

## Task 11: 전체 검증 + 빌드 + Playwright 수동 확인

- [ ] **Step 1: 전체 vitest**

```bash
npm run validate
```
Expected: 239+ files, 4215+ tests pass, typecheck + lint 통과

- [ ] **Step 2: 빌드**

```bash
npm run build
```
Expected: 통과

- [ ] **Step 3: Playwright로 3페이지 수동 확인 — 컨설턴트**

```bash
# dev server 이미 실행 중이라 가정 (localhost:3000)
```

브라우저에서 `/consultant/projects/46b5cd9b-d9b2-4357-9092-5a0d1a451816/roadmap` 접속 후:
- 상단 버전 드롭다운 v1 표시
- "새 버전 생성" 버튼 클릭 시 아코디언 펼침, textarea rows≥6
- Ⅰ장 요약 블록 세로 stack
- 역량 모델링 탭: 2단 헤더("필요 지식·기술·태도" colspan, 하위 3열)
- 훈련체계도 탭: 매트릭스 + 하단 수립 방법
- 연간 계획·명세서 탭 표 균형
- PDF/Excel 버튼은 PageHeader actions에 위치

- [ ] **Step 4: 운영자 페이지 동일 확인**

`/ops/projects/46b5cd9b-d9b2-4357-9092-5a0d1a451816/roadmap`
- 편집 UI 없음, 동일 레이아웃

- [ ] **Step 5: 테스트 로드맵 페이지 확인**

`/test-roadmap`

- [ ] **Step 6: 커밋 (변경 없으면 skip)**

```bash
git status
# 수동 확인 중 발견한 자잘한 수정이 있으면 별도 커밋
```

---

## Task 12: PR 갱신

- [ ] **Step 1: 푸시**

```bash
git push origin feature/ofa-06.5-form-compliance 2>&1 | tail -5
```

- [ ] **Step 2: PR 본문에 리디자인 섹션 추가**

```bash
gh pr view 6 --json body -q '.body' > /tmp/pr_body_backup.md

gh pr edit 6 --body "$(cat <<'EOF'
[기존 PR 본문]

## UI 리디자인 (2026-04-16)

### 해결한 문제
1. 개요 블록 2열 레이아웃 → 세로 stack
2. 역량 표 양식 1번 그대로 2단 헤더 ("필요 지식·기술·태도" colspan=3)
3. 같은 행 셀 높이 균일화 + align-top
4. 긴 텍스트 자동 줄바꿈 (whitespace-pre-wrap break-words)
5. 열 너비 재조정, 세로 쏠림 방지
6. 수정 요청 textarea rows=8 + min-h-[200px]
7. 사이드바 제거 → 상단 버전 셀렉터 + 아코디언 + 풀 너비 메인

### 공통 개선
- 탭 sticky
- 카드 padding·섹션 space 통일
- 표 hover 상태
EOF
)"
```

- [ ] **Step 3: 보고**

"구현 완료. PR #6 갱신됨. localhost에서 직접 확인해주세요."

---

## 완료 지표

- [ ] Ⅰ장 요약 블록 세로 stack
- [ ] 역량 표 2단 헤더(`필요 지식·기술·태도` colspan=3)
- [ ] 모든 표 셀 줄바꿈·align-top
- [ ] 수정 요청 아코디언 + textarea rows≥6
- [ ] 사이드바 제거, 상단 버전 셀렉터
- [ ] 컨설턴트/운영자/테스트 3페이지 동일 레이아웃
- [ ] `npm run validate && npm run build` 통과
- [ ] Playwright 수동 확인 완료
