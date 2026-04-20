# 로드맵 표 공용 디자인 키트 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 로드맵 결과 표 3종(`CompetencyModelingTable`, `AnnualTrainingPlanTable`, `CourseSpecCard`)에 인라인 복제되어 있는 셀·행·뱃지 패턴을 `src/components/roadmap/shared/` 공용 컴포넌트로 추출해 PBL(Step 9) 등 향후 재사용 기반 확보.

**Architecture:** Base props를 공유하는 3개 셀 컴포넌트(`TableTextCell` / `TableInlineCell` / `TableNumericCell`) + 행 높이 동기화 내장 `<SyncedTableRow>` + 섹션 번호 뱃지 `<SectionNumberBadge>` + 특수 케이스용 스타일 상수 4종. 기존 훅 `useRowHeightSync`와 `AutoResizeTextarea`는 shared 컴포넌트 내부 의존으로 남겨두고 이동하지 않는다.

**Tech Stack:** TypeScript strict + React 19 (Next.js 16 App Router) + Tailwind CSS 4 + Vitest + @testing-library/react + `cn` (clsx + tailwind-merge).

**Spec reference:** `docs/superpowers/specs/2026-04-16-roadmap-table-shared-kit-design.md`

---

## 파일 구조 요약

### Phase 1 — 공용 키트 신설 (Task 1~7)
신규 생성:
- `src/components/roadmap/shared/table-styles.ts` — 스타일 상수 4종
- `src/components/roadmap/shared/TableTextCell.tsx` — 긴 텍스트 셀
- `src/components/roadmap/shared/TableTextCell.test.tsx`
- `src/components/roadmap/shared/TableInlineCell.tsx` — 한줄 셀
- `src/components/roadmap/shared/TableInlineCell.test.tsx`
- `src/components/roadmap/shared/TableNumericCell.tsx` — 숫자 셀
- `src/components/roadmap/shared/TableNumericCell.test.tsx`
- `src/components/roadmap/shared/SyncedTableRow.tsx` — 행 + useRowHeightSync
- `src/components/roadmap/shared/SyncedTableRow.test.tsx`
- `src/components/roadmap/shared/SectionNumberBadge.tsx` — 번호 뱃지
- `src/components/roadmap/shared/SectionNumberBadge.test.tsx`
- `src/components/roadmap/shared/index.ts` — 배럴 export

### Phase 2 — 기존 표 마이그레이션 (Task 8~10)
수정:
- `src/components/roadmap/CompetencyModelingTable.tsx`
- `src/components/roadmap/AnnualTrainingPlanTable.tsx`
- `src/components/roadmap/CourseSpecCard.tsx`

### Phase 3 — 전체 회귀 검증 (Task 11)
명령 수행만, 파일 변경 없음.

---

## 공통 규약

- 테스트 파일은 컴포넌트와 같은 디렉터리에 `*.test.tsx`로 배치
- 테스트 describe/it 라벨은 한국어
- 모든 shared 컴포넌트는 `'use client'` 선언 (React 훅·브라우저 API 사용)
- `className` 병합은 `@/lib/utils`의 `cn` 사용
- TDD: 실패 테스트 → 구현 → 통과 확인 → 커밋
- 커밋 메시지: 한국어, `<타입>(ofa-shared): <제목>` 형식

---

## Task 1: 스타일 상수 파일

**Files:**
- Create: `src/components/roadmap/shared/table-styles.ts`

본 태스크는 상수만 선언하므로 TDD 생략 (constants, no logic).

- [ ] **Step 1: 상수 파일 작성**

파일 생성: `src/components/roadmap/shared/table-styles.ts`

```ts
/**
 * 로드맵 표 공용 스타일 상수.
 *
 * 공용 컴포넌트(TableTextCell 등)가 내부적으로 사용하며,
 * colSpan/2단 label td 등 공용 컴포넌트를 쓸 수 없는 특수 케이스에서도
 * 일관된 스타일을 적용할 수 있도록 export한다.
 */

/** 긴 텍스트 셀 td. 자동 줄바꿈 + 상단 정렬. */
export const TABLE_CELL_TEXT_CLASS =
  'px-3 py-3 align-top whitespace-pre-wrap break-words [overflow-wrap:anywhere]';

/** 한줄·숫자 셀 td. 박스 stretch + 상단 정렬 + 중앙 정렬. */
export const TABLE_CELL_INLINE_CLASS = 'h-0 px-3 py-3 align-top text-center';

/** 읽기 모드 span 내부 텍스트 자동 줄바꿈. */
export const READ_ONLY_TEXT_CLASS =
  'whitespace-pre-wrap break-words [overflow-wrap:anywhere]';

/** 섹션 Card의 CardHeader 공통 스타일. */
export const CARD_HEADER_CLASS =
  'pt-5 pb-3 bg-gradient-to-r from-gray-50 to-white';
```

- [ ] **Step 2: 타입 체크 통과 확인**

Run: `npx tsc --noEmit --project tsconfig.json`
Expected: exit 0 (타입 오류 없음)

- [ ] **Step 3: 커밋**

```bash
git add src/components/roadmap/shared/table-styles.ts
git commit -m "feat(ofa-shared): 로드맵 표 공용 스타일 상수 4종 추가"
```

---

## Task 2: TableTextCell (긴 텍스트 셀)

**Files:**
- Create: `src/components/roadmap/shared/TableTextCell.tsx`
- Test: `src/components/roadmap/shared/TableTextCell.test.tsx`

- [ ] **Step 1: 실패 테스트 작성**

파일 생성: `src/components/roadmap/shared/TableTextCell.test.tsx`

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TableTextCell } from './TableTextCell';

/**
 * table 구조 안에서 렌더되어야 하므로 <table><tbody><tr>로 감싸서 테스트.
 */
function renderInTable(ui: React.ReactNode) {
  return render(
    <table>
      <tbody>
        <tr>{ui}</tr>
      </tbody>
    </table>,
  );
}

describe('TableTextCell', () => {
  describe('읽기 모드 (canEdit=false)', () => {
    it('값이 있으면 그대로 표시한다', () => {
      renderInTable(
        <TableTextCell
          canEdit={false}
          value="AI 기초 역량"
          onChange={() => {}}
          ariaLabel="역량명"
        />,
      );
      expect(screen.getByText('AI 기초 역량')).toBeInTheDocument();
    });

    it('값이 없으면 기본 fallback "-"을 표시한다', () => {
      renderInTable(
        <TableTextCell
          canEdit={false}
          value=""
          onChange={() => {}}
          ariaLabel="역량명"
        />,
      );
      expect(screen.getByText('-')).toBeInTheDocument();
    });

    it('커스텀 emptyFallback을 받아 표시한다', () => {
      renderInTable(
        <TableTextCell
          canEdit={false}
          value=""
          onChange={() => {}}
          ariaLabel="역량명"
          emptyFallback="(미입력)"
        />,
      );
      expect(screen.getByText('(미입력)')).toBeInTheDocument();
    });

    it('readOnlyClassName을 span에 병합한다', () => {
      renderInTable(
        <TableTextCell
          canEdit={false}
          value="역량"
          onChange={() => {}}
          ariaLabel="역량명"
          readOnlyClassName="font-medium"
        />,
      );
      expect(screen.getByText('역량')).toHaveClass('font-medium');
    });
  });

  describe('편집 모드 (canEdit=true)', () => {
    it('AutoResizeTextarea를 렌더하고 value를 전달한다', () => {
      renderInTable(
        <TableTextCell
          canEdit={true}
          value="초기값"
          onChange={() => {}}
          ariaLabel="역량명"
        />,
      );
      const textarea = screen.getByLabelText('역량명') as HTMLTextAreaElement;
      expect(textarea.value).toBe('초기값');
    });

    it('placeholder를 전달한다', () => {
      renderInTable(
        <TableTextCell
          canEdit={true}
          value=""
          onChange={() => {}}
          ariaLabel="역량명"
          placeholder="역량명을 입력"
        />,
      );
      expect(screen.getByPlaceholderText('역량명을 입력')).toBeInTheDocument();
    });

    it('입력 시 onChange를 값만으로 호출한다', () => {
      const onChange = vi.fn();
      renderInTable(
        <TableTextCell
          canEdit={true}
          value=""
          onChange={onChange}
          ariaLabel="역량명"
        />,
      );
      const textarea = screen.getByLabelText('역량명');
      fireEvent.change(textarea, { target: { value: '새 값' } });
      expect(onChange).toHaveBeenCalledWith('새 값');
    });

    it('inputClassName을 textarea에 병합한다', () => {
      renderInTable(
        <TableTextCell
          canEdit={true}
          value=""
          onChange={() => {}}
          ariaLabel="역량명"
          inputClassName="font-medium"
        />,
      );
      expect(screen.getByLabelText('역량명')).toHaveClass('font-medium');
    });
  });

  describe('공통 td 스타일', () => {
    it('td에 공용 셀 스타일 클래스를 부여한다', () => {
      const { container } = renderInTable(
        <TableTextCell
          canEdit={false}
          value="x"
          onChange={() => {}}
          ariaLabel="역량명"
        />,
      );
      const td = container.querySelector('td');
      expect(td).toHaveClass('align-top');
      expect(td).toHaveClass('whitespace-pre-wrap');
    });

    it('tdClassName을 td에 병합한다', () => {
      const { container } = renderInTable(
        <TableTextCell
          canEdit={false}
          value="x"
          onChange={() => {}}
          ariaLabel="역량명"
          tdClassName="w-[12%]"
        />,
      );
      const td = container.querySelector('td');
      expect(td).toHaveClass('w-[12%]');
    });
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm run test -- src/components/roadmap/shared/TableTextCell.test.tsx`
Expected: FAIL (TableTextCell 모듈 없음)

- [ ] **Step 3: 컴포넌트 구현**

파일 생성: `src/components/roadmap/shared/TableTextCell.tsx`

```tsx
'use client';

import { AutoResizeTextarea } from '@/components/ui/auto-resize-textarea';
import { cn } from '@/lib/utils';
import { TABLE_CELL_TEXT_CLASS, READ_ONLY_TEXT_CLASS } from './table-styles';

export interface TableTextCellProps {
  canEdit: boolean;
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  placeholder?: string;
  tdClassName?: string;
  inputClassName?: string;
  readOnlyClassName?: string;
  /** 읽기 모드에서 값이 비어있을 때 표시할 fallback. 기본 '-'. */
  emptyFallback?: string;
}

/**
 * 로드맵 표 공용 "긴 텍스트 셀".
 * 자동 줄바꿈 + 자동 리사이즈 + 상단 정렬. 행 단위 높이 동기화 대상.
 * <tr>의 직계 자식으로 사용한다.
 */
export function TableTextCell({
  canEdit,
  value,
  onChange,
  ariaLabel,
  placeholder,
  tdClassName,
  inputClassName,
  readOnlyClassName,
  emptyFallback = '-',
}: TableTextCellProps) {
  return (
    <td className={cn(TABLE_CELL_TEXT_CLASS, tdClassName)}>
      {canEdit ? (
        <AutoResizeTextarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-label={ariaLabel}
          className={inputClassName}
        />
      ) : (
        <span className={cn(READ_ONLY_TEXT_CLASS, readOnlyClassName)}>
          {value || emptyFallback}
        </span>
      )}
    </td>
  );
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm run test -- src/components/roadmap/shared/TableTextCell.test.tsx`
Expected: PASS (모든 테스트 통과)

- [ ] **Step 5: 커밋**

```bash
git add src/components/roadmap/shared/TableTextCell.tsx src/components/roadmap/shared/TableTextCell.test.tsx
git commit -m "feat(ofa-shared): TableTextCell 공용 컴포넌트 추가"
```

---

## Task 3: TableInlineCell (한줄 셀)

**Files:**
- Create: `src/components/roadmap/shared/TableInlineCell.tsx`
- Test: `src/components/roadmap/shared/TableInlineCell.test.tsx`

- [ ] **Step 1: 실패 테스트 작성**

파일 생성: `src/components/roadmap/shared/TableInlineCell.test.tsx`

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TableInlineCell } from './TableInlineCell';

function renderInTable(ui: React.ReactNode) {
  return render(
    <table>
      <tbody>
        <tr>{ui}</tr>
      </tbody>
    </table>,
  );
}

describe('TableInlineCell', () => {
  describe('읽기 모드', () => {
    it('값을 그대로 표시한다', () => {
      renderInTable(
        <TableInlineCell
          canEdit={false}
          value="집체"
          onChange={() => {}}
          ariaLabel="훈련형태"
        />,
      );
      expect(screen.getByText('집체')).toBeInTheDocument();
    });

    it('값이 없으면 기본 "-"를 표시한다', () => {
      renderInTable(
        <TableInlineCell
          canEdit={false}
          value=""
          onChange={() => {}}
          ariaLabel="훈련형태"
        />,
      );
      expect(screen.getByText('-')).toBeInTheDocument();
    });
  });

  describe('편집 모드', () => {
    it('textarea rows=1을 렌더하고 value를 전달한다', () => {
      renderInTable(
        <TableInlineCell
          canEdit={true}
          value="원격"
          onChange={() => {}}
          ariaLabel="훈련형태"
        />,
      );
      const textarea = screen.getByLabelText('훈련형태') as HTMLTextAreaElement;
      expect(textarea.value).toBe('원격');
      expect(textarea.rows).toBe(1);
    });

    it('줄바꿈을 입력해도 onChange에는 줄바꿈 제거 후 전달한다', () => {
      const onChange = vi.fn();
      renderInTable(
        <TableInlineCell
          canEdit={true}
          value=""
          onChange={onChange}
          ariaLabel="훈련형태"
        />,
      );
      fireEvent.change(screen.getByLabelText('훈련형태'), {
        target: { value: '집\n체' },
      });
      expect(onChange).toHaveBeenCalledWith('집체');
    });
  });

  describe('정렬', () => {
    it('기본 가운데 정렬을 적용한다', () => {
      const { container } = renderInTable(
        <TableInlineCell
          canEdit={false}
          value="x"
          onChange={() => {}}
          ariaLabel="훈련형태"
        />,
      );
      expect(container.querySelector('td')).toHaveClass('text-center');
    });

    it('align="right"를 전달하면 오른쪽 정렬을 적용한다', () => {
      const { container } = renderInTable(
        <TableInlineCell
          canEdit={false}
          value="x"
          onChange={() => {}}
          ariaLabel="훈련형태"
          align="right"
        />,
      );
      expect(container.querySelector('td')).toHaveClass('text-right');
    });
  });

  describe('공통 td 스타일', () => {
    it('td에 공용 셀 스타일 클래스를 부여한다', () => {
      const { container } = renderInTable(
        <TableInlineCell
          canEdit={false}
          value="x"
          onChange={() => {}}
          ariaLabel="훈련형태"
        />,
      );
      const td = container.querySelector('td');
      expect(td).toHaveClass('h-0');
      expect(td).toHaveClass('align-top');
    });
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm run test -- src/components/roadmap/shared/TableInlineCell.test.tsx`
Expected: FAIL

- [ ] **Step 3: 컴포넌트 구현**

파일 생성: `src/components/roadmap/shared/TableInlineCell.tsx`

```tsx
'use client';

import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { TABLE_CELL_INLINE_CLASS } from './table-styles';

type Align = 'left' | 'center' | 'right';

const TEXT_ALIGN_CLASS: Record<Align, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

export interface TableInlineCellProps {
  canEdit: boolean;
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  placeholder?: string;
  align?: Align;
  tdClassName?: string;
  inputClassName?: string;
  readOnlyClassName?: string;
  emptyFallback?: string;
}

/**
 * 로드맵 표 공용 "한줄 셀".
 * 줄바꿈 금지(입력 시 자동 제거) + 박스 stretch + 기본 가운데 정렬.
 * <tr>의 직계 자식으로 사용한다.
 */
export function TableInlineCell({
  canEdit,
  value,
  onChange,
  ariaLabel,
  placeholder,
  align = 'center',
  tdClassName,
  inputClassName,
  readOnlyClassName,
  emptyFallback = '-',
}: TableInlineCellProps) {
  const alignClass = TEXT_ALIGN_CLASS[align];
  // td는 TABLE_CELL_INLINE_CLASS(기본 text-center) → align prop으로 덮어쓰기
  const tdFinalClass = cn(
    'h-0 px-3 py-3 align-top',
    alignClass,
    tdClassName,
  );

  return (
    <td className={tdFinalClass}>
      {canEdit ? (
        <Textarea
          rows={1}
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\n/g, ''))}
          placeholder={placeholder}
          aria-label={ariaLabel}
          className={cn(
            'h-full w-full resize-none overflow-hidden',
            alignClass,
            inputClassName,
          )}
        />
      ) : (
        <span className={cn('text-foreground', readOnlyClassName)}>
          {value || emptyFallback}
        </span>
      )}
    </td>
  );
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm run test -- src/components/roadmap/shared/TableInlineCell.test.tsx`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/components/roadmap/shared/TableInlineCell.tsx src/components/roadmap/shared/TableInlineCell.test.tsx
git commit -m "feat(ofa-shared): TableInlineCell 공용 컴포넌트 추가"
```

---

## Task 4: TableNumericCell (숫자 셀)

**Files:**
- Create: `src/components/roadmap/shared/TableNumericCell.tsx`
- Test: `src/components/roadmap/shared/TableNumericCell.test.tsx`

- [ ] **Step 1: 실패 테스트 작성**

파일 생성: `src/components/roadmap/shared/TableNumericCell.test.tsx`

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TableNumericCell } from './TableNumericCell';

function renderInTable(ui: React.ReactNode) {
  return render(
    <table>
      <tbody>
        <tr>{ui}</tr>
      </tbody>
    </table>,
  );
}

describe('TableNumericCell', () => {
  describe('읽기 모드', () => {
    it('값이 0보다 크면 "값+unit"을 표시한다', () => {
      renderInTable(
        <TableNumericCell
          canEdit={false}
          value={24}
          onChange={() => {}}
          ariaLabel="훈련시간"
        />,
      );
      expect(screen.getByText('24H')).toBeInTheDocument();
    });

    it('커스텀 unit을 적용한다', () => {
      renderInTable(
        <TableNumericCell
          canEdit={false}
          value={5}
          onChange={() => {}}
          ariaLabel="개수"
          unit="개"
        />,
      );
      expect(screen.getByText('5개')).toBeInTheDocument();
    });

    it('값이 0이면 기본 fallback "-"를 표시한다', () => {
      renderInTable(
        <TableNumericCell
          canEdit={false}
          value={0}
          onChange={() => {}}
          ariaLabel="훈련시간"
        />,
      );
      expect(screen.getByText('-')).toBeInTheDocument();
    });

    it('커스텀 emptyFallback을 받아 표시한다', () => {
      renderInTable(
        <TableNumericCell
          canEdit={false}
          value={0}
          onChange={() => {}}
          ariaLabel="훈련시간"
          emptyFallback="미정"
        />,
      );
      expect(screen.getByText('미정')).toBeInTheDocument();
    });
  });

  describe('편집 모드', () => {
    it('값을 그대로 표시한다', () => {
      renderInTable(
        <TableNumericCell
          canEdit={true}
          value={10}
          onChange={() => {}}
          ariaLabel="훈련시간"
        />,
      );
      expect((screen.getByLabelText('훈련시간') as HTMLTextAreaElement).value).toBe('10');
    });

    it('값이 0이면 빈 문자열로 표시한다', () => {
      renderInTable(
        <TableNumericCell
          canEdit={true}
          value={0}
          onChange={() => {}}
          ariaLabel="훈련시간"
        />,
      );
      expect((screen.getByLabelText('훈련시간') as HTMLTextAreaElement).value).toBe('');
    });

    it('숫자 입력 시 onChange를 Number로 호출한다', () => {
      const onChange = vi.fn();
      renderInTable(
        <TableNumericCell
          canEdit={true}
          value={0}
          onChange={onChange}
          ariaLabel="훈련시간"
        />,
      );
      fireEvent.change(screen.getByLabelText('훈련시간'), { target: { value: '24' } });
      expect(onChange).toHaveBeenCalledWith(24);
    });

    it('숫자가 아닌 문자는 제거 후 onChange를 호출한다', () => {
      const onChange = vi.fn();
      renderInTable(
        <TableNumericCell
          canEdit={true}
          value={0}
          onChange={onChange}
          ariaLabel="훈련시간"
        />,
      );
      fireEvent.change(screen.getByLabelText('훈련시간'), { target: { value: '12abc3' } });
      expect(onChange).toHaveBeenCalledWith(123);
    });

    it('값을 모두 지우면 onChange(0)을 호출한다', () => {
      const onChange = vi.fn();
      renderInTable(
        <TableNumericCell
          canEdit={true}
          value={24}
          onChange={onChange}
          ariaLabel="훈련시간"
        />,
      );
      fireEvent.change(screen.getByLabelText('훈련시간'), { target: { value: '' } });
      expect(onChange).toHaveBeenCalledWith(0);
    });
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm run test -- src/components/roadmap/shared/TableNumericCell.test.tsx`
Expected: FAIL

- [ ] **Step 3: 컴포넌트 구현**

파일 생성: `src/components/roadmap/shared/TableNumericCell.tsx`

```tsx
'use client';

import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type Align = 'left' | 'center' | 'right';

const TEXT_ALIGN_CLASS: Record<Align, string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

export interface TableNumericCellProps {
  canEdit: boolean;
  value: number;
  onChange: (value: number) => void;
  ariaLabel: string;
  placeholder?: string;
  /** 기본 'center'. */
  align?: Align;
  /** 읽기 모드 접미사. 기본 'H' (시간). */
  unit?: string;
  /** 읽기 모드에서 이 값 이하일 때 fallback을 표시. 기본 0. */
  min?: number;
  tdClassName?: string;
  inputClassName?: string;
  readOnlyClassName?: string;
  emptyFallback?: string;
}

/**
 * 로드맵 표 공용 "숫자 셀".
 * 숫자 이외 입력 자동 제거 + 단위 접미사 + 박스 stretch.
 * <tr>의 직계 자식으로 사용한다.
 */
export function TableNumericCell({
  canEdit,
  value,
  onChange,
  ariaLabel,
  placeholder,
  align = 'center',
  unit = 'H',
  min = 0,
  tdClassName,
  inputClassName,
  readOnlyClassName,
  emptyFallback = '-',
}: TableNumericCellProps) {
  const alignClass = TEXT_ALIGN_CLASS[align];
  const tdFinalClass = cn(
    'h-0 px-3 py-3 align-top',
    alignClass,
    tdClassName,
  );

  return (
    <td className={tdFinalClass}>
      {canEdit ? (
        <Textarea
          rows={1}
          value={value || ''}
          onChange={(e) => {
            const v = e.target.value.replace(/[^0-9]/g, '');
            onChange(v === '' ? 0 : Number(v));
          }}
          placeholder={placeholder}
          aria-label={ariaLabel}
          className={cn(
            'h-full w-full resize-none overflow-hidden',
            alignClass,
            inputClassName,
          )}
        />
      ) : (
        <span className={cn('font-medium text-foreground', readOnlyClassName)}>
          {value > min ? `${value}${unit}` : emptyFallback}
        </span>
      )}
    </td>
  );
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm run test -- src/components/roadmap/shared/TableNumericCell.test.tsx`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/components/roadmap/shared/TableNumericCell.tsx src/components/roadmap/shared/TableNumericCell.test.tsx
git commit -m "feat(ofa-shared): TableNumericCell 공용 컴포넌트 추가"
```

---

## Task 5: SyncedTableRow (행 + 높이 동기화)

**Files:**
- Create: `src/components/roadmap/shared/SyncedTableRow.tsx`
- Test: `src/components/roadmap/shared/SyncedTableRow.test.tsx`

- [ ] **Step 1: 실패 테스트 작성**

파일 생성: `src/components/roadmap/shared/SyncedTableRow.test.tsx`

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SyncedTableRow } from './SyncedTableRow';

function renderInTable(ui: React.ReactNode) {
  return render(
    <table>
      <tbody>{ui}</tbody>
    </table>,
  );
}

describe('SyncedTableRow', () => {
  it('<tr>를 렌더하고 children을 표시한다', () => {
    renderInTable(
      <SyncedTableRow deps={[]}>
        <td>셀 A</td>
        <td>셀 B</td>
      </SyncedTableRow>,
    );
    expect(screen.getByText('셀 A')).toBeInTheDocument();
    expect(screen.getByText('셀 B')).toBeInTheDocument();
  });

  it('기본 className으로 align-top을 적용한다', () => {
    const { container } = renderInTable(
      <SyncedTableRow deps={[]}>
        <td>x</td>
      </SyncedTableRow>,
    );
    expect(container.querySelector('tr')).toHaveClass('align-top');
  });

  it('추가 className을 병합한다', () => {
    const { container } = renderInTable(
      <SyncedTableRow deps={[]} className="bg-red-50">
        <td>x</td>
      </SyncedTableRow>,
    );
    const tr = container.querySelector('tr');
    expect(tr).toHaveClass('align-top');
    expect(tr).toHaveClass('bg-red-50');
  });

  it('여러 textarea를 포함한 행에서 오류 없이 렌더된다', () => {
    renderInTable(
      <SyncedTableRow deps={['a', 'b', false]}>
        <td>
          <textarea aria-label="필드1" defaultValue="짧은" />
        </td>
        <td>
          <textarea aria-label="필드2" defaultValue={'긴\n내용\n여러\n줄'} />
        </td>
      </SyncedTableRow>,
    );
    expect(screen.getByLabelText('필드1')).toBeInTheDocument();
    expect(screen.getByLabelText('필드2')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm run test -- src/components/roadmap/shared/SyncedTableRow.test.tsx`
Expected: FAIL

- [ ] **Step 3: 컴포넌트 구현**

파일 생성: `src/components/roadmap/shared/SyncedTableRow.tsx`

```tsx
'use client';

import { useRef, type ReactNode } from 'react';
import { useRowHeightSync } from '@/hooks/useRowHeightSync';
import { cn } from '@/lib/utils';

export interface SyncedTableRowProps {
  /** 행 내부 값이 변경될 때마다 높이 재동기화를 트리거. */
  deps: ReadonlyArray<unknown>;
  className?: string;
  children: ReactNode;
}

/**
 * 로드맵 표 공용 "행 높이 동기화 tr".
 * useRowHeightSync를 내장해 행 내 모든 textarea 높이를 가장 긴 것에 맞춘다.
 */
export function SyncedTableRow({ deps, className, children }: SyncedTableRowProps) {
  const rowRef = useRef<HTMLTableRowElement>(null);
  useRowHeightSync(rowRef, deps);

  return (
    <tr ref={rowRef} className={cn('align-top', className)}>
      {children}
    </tr>
  );
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm run test -- src/components/roadmap/shared/SyncedTableRow.test.tsx`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/components/roadmap/shared/SyncedTableRow.tsx src/components/roadmap/shared/SyncedTableRow.test.tsx
git commit -m "feat(ofa-shared): SyncedTableRow 공용 컴포넌트 추가"
```

---

## Task 6: SectionNumberBadge (번호 뱃지)

**Files:**
- Create: `src/components/roadmap/shared/SectionNumberBadge.tsx`
- Test: `src/components/roadmap/shared/SectionNumberBadge.test.tsx`

- [ ] **Step 1: 실패 테스트 작성**

파일 생성: `src/components/roadmap/shared/SectionNumberBadge.test.tsx`

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { SectionNumberBadge } from './SectionNumberBadge';

describe('SectionNumberBadge', () => {
  it('label과 index+1 형식으로 표시한다', () => {
    render(<SectionNumberBadge label="명세서" index={0} />);
    expect(screen.getByText('명세서 #1')).toBeInTheDocument();
  });

  it('index 1은 #2로 표시한다', () => {
    render(<SectionNumberBadge label="PBL 프로젝트" index={1} />);
    expect(screen.getByText('PBL 프로젝트 #2')).toBeInTheDocument();
  });

  it('기본 outline blue 스타일을 적용한다', () => {
    render(<SectionNumberBadge label="명세서" index={0} />);
    const badge = screen.getByText('명세서 #1');
    expect(badge).toHaveClass('bg-blue-50');
    expect(badge).toHaveClass('text-blue-700');
    expect(badge).toHaveClass('border-blue-200');
  });

  it('추가 className을 병합한다', () => {
    render(<SectionNumberBadge label="명세서" index={0} className="text-lg" />);
    const badge = screen.getByText('명세서 #1');
    expect(badge).toHaveClass('bg-blue-50');
    expect(badge).toHaveClass('text-lg');
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npm run test -- src/components/roadmap/shared/SectionNumberBadge.test.tsx`
Expected: FAIL

- [ ] **Step 3: 컴포넌트 구현**

파일 생성: `src/components/roadmap/shared/SectionNumberBadge.tsx`

```tsx
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface SectionNumberBadgeProps {
  /** 뱃지 라벨 ('명세서', 'PBL 프로젝트' 등). */
  label: string;
  /** 0-based 인덱스. 표시는 index+1로 된다. */
  index: number;
  className?: string;
}

/**
 * 로드맵 결과 화면 카드 헤더용 "섹션 번호 뱃지".
 * "명세서 #1", "PBL 프로젝트 #2" 형태.
 */
export function SectionNumberBadge({ label, index, className }: SectionNumberBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn('bg-blue-50 text-blue-700 border-blue-200', className)}
    >
      {label} #{index + 1}
    </Badge>
  );
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm run test -- src/components/roadmap/shared/SectionNumberBadge.test.tsx`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add src/components/roadmap/shared/SectionNumberBadge.tsx src/components/roadmap/shared/SectionNumberBadge.test.tsx
git commit -m "feat(ofa-shared): SectionNumberBadge 공용 컴포넌트 추가"
```

---

## Task 7: 배럴 export (index.ts)

**Files:**
- Create: `src/components/roadmap/shared/index.ts`

본 태스크는 재export만 하므로 TDD 생략.

- [ ] **Step 1: index.ts 작성**

파일 생성: `src/components/roadmap/shared/index.ts`

```ts
/**
 * 로드맵 표 공용 디자인 키트 배럴 export.
 *
 * 사용 예:
 *   import { TableTextCell, SyncedTableRow } from '@/components/roadmap/shared';
 */

export {
  TABLE_CELL_TEXT_CLASS,
  TABLE_CELL_INLINE_CLASS,
  READ_ONLY_TEXT_CLASS,
  CARD_HEADER_CLASS,
} from './table-styles';

export { TableTextCell, type TableTextCellProps } from './TableTextCell';
export { TableInlineCell, type TableInlineCellProps } from './TableInlineCell';
export { TableNumericCell, type TableNumericCellProps } from './TableNumericCell';
export { SyncedTableRow, type SyncedTableRowProps } from './SyncedTableRow';
export { SectionNumberBadge, type SectionNumberBadgeProps } from './SectionNumberBadge';
```

- [ ] **Step 2: 타입 체크**

Run: `npx tsc --noEmit --project tsconfig.json`
Expected: exit 0

- [ ] **Step 3: 전체 shared 테스트 통과 확인**

Run: `npm run test -- src/components/roadmap/shared`
Expected: PASS (Task 2~6 테스트 모두)

- [ ] **Step 4: 커밋**

```bash
git add src/components/roadmap/shared/index.ts
git commit -m "feat(ofa-shared): 공용 디자인 키트 배럴 export 추가"
```

---

## Task 8: CompetencyModelingTable 마이그레이션

**Files:**
- Modify: `src/components/roadmap/CompetencyModelingTable.tsx`

**마이그레이션 원칙:**
- `DesktopRow` 내부만 수정. 헤더·mobile·빈 상태 행·역량 추가 버튼 등은 그대로 유지.
- `Input`·`AutoResizeTextarea`·`useRowHeightSync` 직접 import 제거 → shared에서 import.
- 기존 테스트 수정 금지. 결과적으로 기존 DOM 구조(`<tr>`·`<td>`·aria-label·placeholder)가 동일 유지되어야 함.

- [ ] **Step 1: baseline 테스트 통과 확인 (현재 상태 기록)**

Run: `npm run test -- src/components/roadmap/CompetencyModelingTable.test.tsx`
Expected: PASS (변경 전 통과 상태 확인)

- [ ] **Step 2: DesktopRow 및 KsaCell 교체**

`src/components/roadmap/CompetencyModelingTable.tsx`의 `DesktopRow`와 `KsaCell`를 아래로 교체.

상단 import 블록 수정:
```tsx
// 제거:
// import { useRef } from 'react';
// import { Input } from '@/components/ui/input';
// import { AutoResizeTextarea } from '@/components/ui/auto-resize-textarea';
// import { useRowHeightSync } from '@/hooks/useRowHeightSync';

// 추가:
import { SyncedTableRow, TableTextCell } from '@/components/roadmap/shared';
// Input은 MobileCard에서 여전히 사용 — 유지
import { Input } from '@/components/ui/input';
```

기존 `DesktopRow` 함수 전체를 다음으로 교체:

```tsx
function DesktopRow({ index, competency, canEdit, onUpdate, onRemove }: RowProps) {
  const knowledgeStr = competency.knowledge.join('\n');
  const skillsStr = competency.skills.join('\n');
  const attitudesStr = competency.attitudes.join('\n');

  return (
    <SyncedTableRow
      deps={[
        competency.name,
        competency.definition,
        knowledgeStr,
        skillsStr,
        attitudesStr,
        canEdit,
      ]}
    >
      <TableTextCell
        canEdit={canEdit}
        value={competency.name}
        onChange={(v) => onUpdate(index, { name: v })}
        placeholder="역량명"
        ariaLabel={`역량 ${index + 1} 역량명`}
        inputClassName="font-medium"
        readOnlyClassName="font-medium text-foreground"
      />

      <TableTextCell
        canEdit={canEdit}
        value={competency.definition}
        onChange={(v) => onUpdate(index, { definition: v })}
        placeholder="역량 정의 (수행준거)"
        ariaLabel={`역량 ${index + 1} 정의 (수행준거)`}
        readOnlyClassName="text-muted-foreground"
      />

      <KsaCell
        index={index}
        field="knowledge"
        label="지식 (학술, 업무지식)"
        values={competency.knowledge}
        canEdit={canEdit}
        onUpdate={onUpdate}
      />
      <KsaCell
        index={index}
        field="skills"
        label="기술 (기능)"
        values={competency.skills}
        canEdit={canEdit}
        onUpdate={onUpdate}
      />
      <KsaCell
        index={index}
        field="attitudes"
        label="태도"
        values={competency.attitudes}
        canEdit={canEdit}
        onUpdate={onUpdate}
      />

      {canEdit && (
        <td className="px-3 py-3 text-center align-top">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onRemove(index)}
            aria-label={`역량 ${index + 1} 삭제`}
            title="삭제"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </td>
      )}
    </SyncedTableRow>
  );
}
```

기존 `KsaCell` 함수 전체를 다음으로 교체 (AutoResizeTextarea 제거, TableTextCell로 대체):

```tsx
interface KsaCellProps {
  index: number;
  field: 'knowledge' | 'skills' | 'attitudes';
  label: string;
  values: string[];
  canEdit: boolean;
  onUpdate: (index: number, patch: Partial<RoadmapCompetency>) => void;
}

function KsaCell({ index, field, label, values, canEdit, onUpdate }: KsaCellProps) {
  // 편집 모드: 줄바꿈으로 구분된 문자열을 TableTextCell로 편집
  if (canEdit) {
    return (
      <TableTextCell
        canEdit={true}
        value={joinKsa(values ?? [])}
        onChange={(v) => onUpdate(index, { [field]: splitKsa(v) })}
        placeholder={`${label} 항목을 줄바꿈으로 구분`}
        ariaLabel={`역량 ${index + 1} ${label}`}
      />
    );
  }

  // 읽기 모드: 목록으로 렌더 (기존 UI 유지)
  if (!values || values.length === 0) {
    return (
      <td className="px-3 py-3 align-top whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
        <span className="text-muted-foreground">-</span>
      </td>
    );
  }

  return (
    <td className="px-3 py-3 align-top whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
      <ul className="list-disc pl-4 space-y-0.5 text-sm text-foreground">
        {values.map((v, i) => (
          <li key={i} className="break-keep">
            {v}
          </li>
        ))}
      </ul>
    </td>
  );
}
```

**주의사항:**
- `import { AutoResizeTextarea }`, `import { Textarea }`, `import { useRowHeightSync }` import 라인 및 `useRef` import 제거.
- `Input` 은 MobileCard에서 여전히 사용되므로 import 유지.

- [ ] **Step 3: 기존 테스트 통과 확인 (회귀 없음 검증)**

Run: `npm run test -- src/components/roadmap/CompetencyModelingTable.test.tsx`
Expected: PASS (모든 테스트 변경 없이 통과)

- [ ] **Step 4: lint + 타입 체크**

Run: `npm run lint && npx tsc --noEmit --project tsconfig.json`
Expected: exit 0 (lint·타입 오류 없음)

- [ ] **Step 5: 커밋**

```bash
git add src/components/roadmap/CompetencyModelingTable.tsx
git commit -m "refactor(ofa-shared): CompetencyModelingTable 공용 키트로 마이그레이션"
```

---

## Task 9: AnnualTrainingPlanTable 마이그레이션

**Files:**
- Modify: `src/components/roadmap/AnnualTrainingPlanTable.tsx`

- [ ] **Step 1: baseline 테스트 통과 확인**

Run: `npm run test -- src/components/roadmap/AnnualTrainingPlanTable.test.tsx`
Expected: PASS

- [ ] **Step 2: DesktopRow 교체 + import 정리**

상단 import 블록 수정:
```tsx
// 제거:
// import { useRef } from 'react';
// import { Textarea } from '@/components/ui/textarea';  // MobileCard는 Input 사용
// import { AutoResizeTextarea } from '@/components/ui/auto-resize-textarea';
// import { useRowHeightSync } from '@/hooks/useRowHeightSync';

// 추가:
import { SyncedTableRow, TableTextCell, TableInlineCell, TableNumericCell } from '@/components/roadmap/shared';
// Input은 MobileCard에서 여전히 사용 — 유지
```

기존 `DesktopRow` 함수 전체를 다음으로 교체:

```tsx
function DesktopRow({ index, item, canEdit, onUpdate, onRemove }: RowProps) {
  return (
    <SyncedTableRow
      deps={[item.competency_name, item.course_name, item.notes, canEdit]}
    >
      <TableTextCell
        canEdit={canEdit}
        value={item.competency_name}
        onChange={(v) => onUpdate(index, { competency_name: v })}
        placeholder="역량명"
        ariaLabel={`연간계획 ${index + 1} 역량명`}
        inputClassName="font-medium"
        readOnlyClassName="font-medium text-foreground"
      />

      <TableTextCell
        canEdit={canEdit}
        value={item.course_name}
        onChange={(v) => onUpdate(index, { course_name: v })}
        placeholder="훈련과정명"
        ariaLabel={`연간계획 ${index + 1} 훈련과정명`}
        readOnlyClassName="text-foreground"
      />

      <TableInlineCell
        canEdit={canEdit}
        value={item.format}
        onChange={(v) => onUpdate(index, { format: v })}
        placeholder="집체/원격/혼합"
        ariaLabel={`연간계획 ${index + 1} 훈련형태`}
      />

      <TableNumericCell
        canEdit={canEdit}
        value={item.hours}
        onChange={(v) => onUpdate(index, { hours: v })}
        placeholder="시간"
        ariaLabel={`연간계획 ${index + 1} 훈련시간`}
      />

      <TableTextCell
        canEdit={canEdit}
        value={item.notes}
        onChange={(v) => onUpdate(index, { notes: v })}
        placeholder="비고"
        ariaLabel={`연간계획 ${index + 1} 비고`}
        readOnlyClassName="text-muted-foreground"
      />

      {canEdit && (
        <td className="px-3 py-3 text-center align-top">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onRemove(index)}
            aria-label={`연간계획 ${index + 1} 삭제`}
            title="삭제"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </td>
      )}
    </SyncedTableRow>
  );
}
```

또한 파일 내 활용방안 섹션(`usagePlan`)은 `AutoResizeTextarea`를 직접 사용중이다. 이는 표 셀이 아니라 일반 폼 필드이므로 `AutoResizeTextarea` import를 유지해야 한다. 상단 import 블록을 최종적으로 다음처럼 유지:

```tsx
import { AutoResizeTextarea } from '@/components/ui/auto-resize-textarea'; // usagePlan용 유지
import { SyncedTableRow, TableTextCell, TableInlineCell, TableNumericCell } from '@/components/roadmap/shared';
import { Input } from '@/components/ui/input'; // MobileCard용 유지
```

**주의**: `useRef`, `Textarea`, `useRowHeightSync` import 라인을 제거. `AutoResizeTextarea`와 `Input`은 유지.

- [ ] **Step 3: 기존 테스트 통과 확인**

Run: `npm run test -- src/components/roadmap/AnnualTrainingPlanTable.test.tsx`
Expected: PASS

- [ ] **Step 4: lint + 타입 체크**

Run: `npm run lint && npx tsc --noEmit --project tsconfig.json`
Expected: exit 0

- [ ] **Step 5: 커밋**

```bash
git add src/components/roadmap/AnnualTrainingPlanTable.tsx
git commit -m "refactor(ofa-shared): AnnualTrainingPlanTable 공용 키트로 마이그레이션"
```

---

## Task 10: CourseSpecCard 마이그레이션

**Files:**
- Modify: `src/components/roadmap/CourseSpecCard.tsx`

본 컴포넌트는 공용 키트 4종 모두 활용:
- CardHeader 번호 뱃지 → `SectionNumberBadge`
- CardHeader 패딩 → `CARD_HEADER_CLASS` (조합하여 gradient 유지)
- ProfileSection 각 필드 → `TableTextCell` (label td는 인라인 유지)
- SubjectRow 교과목명·세부내용 → `TableTextCell`
- SubjectRow 시간 → `TableNumericCell`
- SubjectRow 행 → `SyncedTableRow`

- [ ] **Step 1: baseline 테스트 통과 확인**

Run: `npm run test -- src/components/roadmap/CourseSpecCard.test.tsx`
Expected: PASS

- [ ] **Step 2: import 블록 정리**

상단 import 블록 수정:
```tsx
// 제거:
// import { useRef } from 'react';
// import { Textarea } from '@/components/ui/textarea';
// import { AutoResizeTextarea } from '@/components/ui/auto-resize-textarea';
// import { useRowHeightSync } from '@/hooks/useRowHeightSync';
// import { Badge } from '@/components/ui/badge'; // SectionNumberBadge가 감쌈

// 추가:
import {
  SyncedTableRow,
  TableTextCell,
  TableNumericCell,
  SectionNumberBadge,
  CARD_HEADER_CLASS,
} from '@/components/roadmap/shared';
```

**주의**: `Badge` import는 SubjectsSection의 `{subjects.length}개 / {totalHours}H` 부분에서 여전히 사용되므로 유지해야 한다. 따라서 `Badge` import는 **제거하지 않는다**.

최종 import 유지 라인:
```tsx
import { Badge } from '@/components/ui/badge'; // SubjectsSection 카운트 뱃지용 유지
```

- [ ] **Step 3: CardHeader 블록 전체 교체**

파일 내 `<CardHeader>` 부터 그 뒤 `</CardHeader>` 까지 JSX 블록 전체를 찾아서 다음으로 교체.

**Before (현재 코드)**:
```tsx
<CardHeader className="pt-5 pb-3 bg-gradient-to-r from-gray-50 to-white">
  <div className="flex items-start justify-between gap-4">
    <div className="flex-1 min-w-0 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          명세서 #{index + 1}
        </Badge>
      </div>
      {canEdit ? (
        <AutoResizeTextarea
          value={spec.course_name}
          onChange={(e) => updateSpec({ course_name: e.target.value })}
          placeholder="과정명"
          aria-label={`명세서 ${index + 1} 과정명`}
          className="text-base font-semibold"
        />
      ) : (
        <h3 className="text-lg font-semibold text-foreground break-keep">
          {spec.course_name || '(과정명 미입력)'}
        </h3>
      )}
    </div>
    {canEdit && onDelete && (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onDelete}
        aria-label={`명세서 ${index + 1} 삭제`}
        title="삭제"
      >
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    )}
  </div>
</CardHeader>
```

**After (교체할 코드)**:
```tsx
<CardHeader className={CARD_HEADER_CLASS}>
  <div className="flex items-start justify-between gap-4">
    <div className="flex-1 min-w-0 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <SectionNumberBadge label="명세서" index={index} />
      </div>
      {canEdit ? (
        <table>
          <tbody>
            <tr>
              <TableTextCell
                canEdit={true}
                value={spec.course_name}
                onChange={(v) => updateSpec({ course_name: v })}
                placeholder="과정명"
                ariaLabel={`명세서 ${index + 1} 과정명`}
                inputClassName="text-base font-semibold"
                tdClassName="px-0 py-0"
              />
            </tr>
          </tbody>
        </table>
      ) : (
        <h3 className="text-lg font-semibold text-foreground break-keep">
          {spec.course_name || '(과정명 미입력)'}
        </h3>
      )}
    </div>
    {canEdit && onDelete && (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onDelete}
        aria-label={`명세서 ${index + 1} 삭제`}
        title="삭제"
      >
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    )}
  </div>
</CardHeader>
```

**교체 포인트**:
- CardHeader className → `CARD_HEADER_CLASS` 상수 사용
- Badge → SectionNumberBadge
- AutoResizeTextarea → mini-table + TableTextCell (tdClassName으로 padding 제거)
- 삭제 버튼 JSX는 변경 없음 (그대로 복사)

**왜 table wrapper인가**: `TableTextCell`은 `<td>`를 리턴하므로 직접 CardHeader 안에 쓸 수 없다. 편집 모드에서 과정명 입력 필드만 감싸기 위해 mini-table 구조를 유지. padding은 `tdClassName="px-0 py-0"`으로 제거.

- [ ] **Step 4: ProfileSection 교체**

기존 `ProfileSection` 함수 전체를 다음으로 교체:

```tsx
function ProfileSection({ spec, index, canEdit, onUpdate }: ProfileSectionProps) {
  const fields: {
    key: keyof RoadmapCourseSpec;
    label: string;
    icon: typeof BookOpen;
  }[] = [
    { key: 'format', label: '훈련형태', icon: BookOpen },
    { key: 'recommended_program', label: '추천 훈련사업', icon: Wrench },
    { key: 'goal', label: '훈련 목표', icon: Target },
    { key: 'main_content', label: '주요 훈련 내용', icon: FileText },
    { key: 'target_audience', label: '훈련 대상', icon: Users },
  ];

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <table className="w-full text-sm">
        <tbody className="divide-y divide-border">
          {fields.map((f) => {
            const Icon = f.icon;
            const value = (spec[f.key] ?? '') as string;
            const inputId = `course-${index}-${f.key}`;
            return (
              <tr key={f.key} className="align-top">
                <td className="min-w-[140px] bg-muted/50 px-3 py-3 text-left font-medium text-muted-foreground whitespace-normal break-keep">
                  <Label htmlFor={inputId} className="flex items-center gap-2 cursor-pointer">
                    <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                    {f.label}
                  </Label>
                </td>
                <TableTextCell
                  canEdit={canEdit}
                  value={value}
                  onChange={(v) =>
                    onUpdate({ [f.key]: v } as Partial<RoadmapCourseSpec>)
                  }
                  placeholder={f.label}
                  ariaLabel={`명세서 ${index + 1} ${f.label}`}
                  readOnlyClassName="break-keep"
                />
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
```

**주의**:
- `multiline`, `rows` prop은 제거 (TableTextCell은 항상 auto-resize).
- label td는 스타일이 다르므로 공용 컴포넌트 대상 아님. 그대로 유지.
- `inputId`는 이제 `TableTextCell` 내부 textarea에 직접 전달되지 않지만, `aria-label`이 있어 접근성 유지. `htmlFor`는 Label이 유지되면 된다. `TableTextCell`에는 id를 전달할 수 없으므로 label.htmlFor는 일치하지 않게 되지만 aria-label로 접근성 확보됨. (기존 테스트가 htmlFor를 체크하지 않는다는 전제)
- 만약 기존 테스트가 `htmlFor` 연결을 검증하면 이 교체를 재검토해야 함. Task 1 Step 1에서 baseline 테스트가 통과했다면 문제없음.

- [ ] **Step 5: SubjectRow 교체**

기존 `SubjectRow` 함수 전체를 다음으로 교체:

```tsx
function SubjectRow({ courseIndex, sIdx, subject, canEdit, onUpdate, onRemove }: SubjectRowProps) {
  return (
    <SyncedTableRow deps={[subject.name, subject.details, canEdit]}>
      <TableTextCell
        canEdit={canEdit}
        value={subject.name}
        onChange={(v) => onUpdate(sIdx, { name: v })}
        placeholder="교과목명"
        ariaLabel={`명세서 ${courseIndex + 1} 교과목 ${sIdx + 1} 이름`}
        inputClassName="font-medium"
        readOnlyClassName="font-medium text-foreground"
      />

      <TableTextCell
        canEdit={canEdit}
        value={subject.details}
        onChange={(v) => onUpdate(sIdx, { details: v })}
        placeholder="세부 내용 (단원, 과제명)"
        ariaLabel={`명세서 ${courseIndex + 1} 교과목 ${sIdx + 1} 세부 내용 (단원, 과제명)`}
        readOnlyClassName="text-muted-foreground"
      />

      <TableNumericCell
        canEdit={canEdit}
        value={subject.hours}
        onChange={(v) => onUpdate(sIdx, { hours: v })}
        placeholder="시간"
        ariaLabel={`명세서 ${courseIndex + 1} 교과목 ${sIdx + 1} 시간`}
      />

      {canEdit && (
        <td className="px-3 py-3 text-center">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onRemove(sIdx)}
            aria-label={`명세서 ${courseIndex + 1} 교과목 ${sIdx + 1} 삭제`}
            title="삭제"
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </td>
      )}
    </SyncedTableRow>
  );
}
```

- [ ] **Step 6: 기존 테스트 통과 확인**

Run: `npm run test -- src/components/roadmap/CourseSpecCard.test.tsx`
Expected: PASS

일부 테스트가 실패하면:
- `htmlFor` 연결 테스트 실패 → 테스트를 `aria-label` 기반으로 재작성 가능한지 검토 (spec 8.2 원칙에 따라 최소한의 수정만). 또는 ProfileSection에서 TableTextCell 대신 인라인 AutoResizeTextarea + id를 유지하는 방향으로 롤백.
- DOM 구조 검사 실패 → 공용 컴포넌트의 `<td>` 구조가 기존과 다른 경우 확인.
- 회귀 발생 시 Task 10 전체 롤백 후 다시 분석.

- [ ] **Step 7: lint + 타입 체크**

Run: `npm run lint && npx tsc --noEmit --project tsconfig.json`
Expected: exit 0

- [ ] **Step 8: 커밋**

```bash
git add src/components/roadmap/CourseSpecCard.tsx
git commit -m "refactor(ofa-shared): CourseSpecCard 공용 키트로 마이그레이션"
```

---

## Task 11: 전체 회귀 검증

**Files:** 없음 (명령 수행만)

- [ ] **Step 1: 전체 유닛 테스트**

Run: `npm run test`
Expected: 전체 테스트 파일·테스트 통과. 실패 테스트 0.

- [ ] **Step 2: 타입 체크 + 린트 + 포맷**

Run: `npm run validate`
Expected: exit 0 (typecheck + lint + test 통합 검증)

- [ ] **Step 3: 프로덕션 빌드**

Run: `npm run build`
Expected: exit 0 (Next.js 빌드 성공)

- [ ] **Step 4: E2E 테스트 (있는 경우)**

Run: `npm run test:e2e -- --grep "로드맵"`
Expected: 로드맵 관련 E2E 시나리오 통과. 없으면 skip 가능.

- [ ] **Step 5: 실제 화면 수동 확인**

로컬 서버 실행: `npm run dev`

컨설턴트 계정(`kpc@test.com` / `aaaa0000`)으로 로그인 → 담당 프로젝트 → 로드맵 결과 페이지 열기 → 다음 확인:
- 역량 모델링 표: 모든 열 정상 렌더, 편집 시 textarea 높이 자동 동기화, "역량 추가" 클릭 후 저장 실패 없음
- 연간 훈련계획 표: 훈련형태·훈련시간 입력 정상, 숫자 필터링 작동
- 명세서 카드: 번호 뱃지 표시, CardHeader 패딩(`pt-5 pb-3`) 유지, 교과목 표 정상

운영관리자 계정(`son@test.com` / `aaaa00000`)으로 로그인 → 운영관리 > 프로젝트 관리 → 특정 프로젝트 → 로드맵 탭에서 동일 표가 읽기 전용으로 정상 렌더되는지 확인.

- [ ] **Step 6: 검증 완료 보고**

다음 항목을 보고:
- `npm run validate` 결과
- `npm run build` 결과
- 수동 확인 결과 (스크린샷 또는 설명)
- 회귀 발견 여부

회귀 발견 시: Task 10까지 역순으로 롤백하며 범위 축소. 원인 분석 후 재시도.

- [ ] **Step 7: PR 생성**

모든 검증 통과 시:

```bash
git push -u origin feature/ofa-roadmap-shared-kit

gh pr create --base feature/official-form-alignment --title "refactor(ofa-shared): 로드맵 표 공용 디자인 키트 추출" --body "$(cat <<'EOF'
## Summary

- 로드맵 결과 표 3종(`CompetencyModelingTable`, `AnnualTrainingPlanTable`, `CourseSpecCard`)의 반복 셀·행·뱃지 패턴을 `src/components/roadmap/shared/` 공용 키트로 추출.
- PBL(Step 9) 구현 시 `import` 한두 줄로 동일 디자인 재현 가능.
- 기존 DOM·a11y·동작 동일 유지 — 기존 테스트 전부 통과 = 회귀 없음 증명.

## 주요 변경

- 신규: `TableTextCell`, `TableInlineCell`, `TableNumericCell`, `SyncedTableRow`, `SectionNumberBadge` + 스타일 상수 4종
- 마이그레이션: 3개 표 컴포넌트를 공용 키트 사용으로 교체

## Test plan

- [x] Shared 컴포넌트 TDD 단위 테스트 전부 작성 및 통과
- [x] 기존 표 컴포넌트 테스트 변경 없이 통과 (회귀 없음)
- [x] npm run validate / npm run build 통과
- [x] 컨설턴트·운영관리자 계정 실제 화면 렌더 확인

## Spec

- `docs/superpowers/specs/2026-04-16-roadmap-table-shared-kit-design.md`
- `docs/superpowers/plans/2026-04-17-roadmap-table-shared-kit.md`

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

자동 머지 금지. 사용자 승인 대기.

---

## Rollback 가이드

Task 10(CourseSpecCard) 마이그레이션에서 `htmlFor`/`id` 연결 등 접근성 관련 기존 테스트가 실패할 경우:

1. `git reset --hard HEAD~1` 로 Task 10 커밋만 되돌리기
2. ProfileSection은 현 상태(인라인 AutoResizeTextarea + id 유지)로 두고, CardHeader와 SubjectRow만 공용 키트로 교체
3. 재검증 후 커밋

Task 8~9 실패 시 동일 패턴: 해당 커밋만 되돌리고 범위 축소.

Phase 1(Task 1~7) 전체 실패 시: shared 폴더 전체 삭제하고 spec 재검토.
