# 로드맵 표 공용 디자인 키트 (Shared Table Kit)

**작성일**: 2026-04-16
**작성 목적**: Step 6.5에서 정리된 로드맵 결과 표 디자인 패턴을 PBL(Step 9) 결과 화면 등에서 재사용할 수 있도록 공용 컴포넌트·스타일 상수로 추출한다.
**대상 독자**: 본 키트를 소비할 Step 9(PBL 결과) 구현 세션 및 향후 양식 기반 표 화면 개발자.

---

## 1. 배경

Step 6.5에서 로드맵 결과 페이지(`CompetencyModelingTable`, `AnnualTrainingPlanTable`, `CourseSpecCard`)가 산인공 양식 1번에 맞춰 통일된 표 디자인을 갖추게 되었다. 해당 디자인에는 다음과 같은 반복 패턴이 존재한다:

- 긴 텍스트 셀(자동 줄바꿈 + 자동 리사이즈)
- 한줄 텍스트 셀(줄바꿈 금지, 가운데 정렬)
- 숫자 셀(숫자만 허용, 단위 접미사)
- 행 단위 textarea 높이 동기화
- 섹션 번호 뱃지 (`명세서 #1` 등)

이 패턴들은 현재 3개 파일에 **인라인으로 복붙** 되어있어, Step 9(PBL 결과)에서 유사한 표를 만들 때 다시 동일한 스타일 문자열과 JSX를 수동으로 복제해야 한다. 복제 과정에서 일부 속성을 누락하면 로드맵과 PBL 결과 간 UI 일관성이 깨진다.

## 2. 목표

1. **재사용성**: PBL 결과 화면에서 `import` 한두 줄로 로드맵과 동일한 셀·행·뱃지를 렌더.
2. **일관성 강제**: 공용 컴포넌트를 거치면 스타일·접근성 속성이 자동 통일.
3. **변경 지점 단일화**: 나중에 디자인 조정 시 한 곳만 수정해 전파.
4. **무회귀**: 기존 로드맵 페이지 동작·DOM·테스트는 동일하게 유지.

## 3. 비목표

- 갤러리·운영관리 등 **양식과 무관한 일반 목록 표**는 대상이 아니다 (과잉 추상화 방지, YAGNI).
- 모바일 카드 뷰는 대상이 아니다. 본 키트는 데스크톱 `<table>` 패턴에 한정된다.
- `AutoResizeTextarea`, `useRowHeightSync`는 이미 독립 파일로 존재 — 이동하지 않고 현 위치 유지.

## 4. 아키텍처

### 4.1 폴더 구조

```
src/components/roadmap/shared/
├── index.ts                       # 배럴 export
├── table-styles.ts                # 스타일 상수
├── TableTextCell.tsx              # 긴 텍스트 셀
├── TableInlineCell.tsx            # 한줄 셀
├── TableNumericCell.tsx           # 숫자 셀
├── SyncedTableRow.tsx             # 행 + 높이 동기화
├── SectionNumberBadge.tsx         # 번호 뱃지
├── TableTextCell.test.tsx
├── TableInlineCell.test.tsx
├── TableNumericCell.test.tsx
├── SyncedTableRow.test.tsx
└── SectionNumberBadge.test.tsx
```

### 4.2 의존 관계

```
shared/TableTextCell, TableInlineCell, TableNumericCell
  └── src/components/ui/auto-resize-textarea.tsx    (유지)
  └── src/components/ui/textarea.tsx                (유지)

shared/SyncedTableRow
  └── src/hooks/useRowHeightSync.ts                 (유지)

shared/SectionNumberBadge
  └── src/components/ui/badge.tsx                   (유지)

기존 표 3개 (CompetencyModelingTable / AnnualTrainingPlanTable / CourseSpecCard)
  └── @/components/roadmap/shared                   (신규 의존)
```

## 5. 컴포넌트 명세

### 5.1 공통 Base Props

```ts
interface BaseCellProps {
  canEdit: boolean;
  ariaLabel: string;              // 필수 (a11y)
  placeholder?: string;
  tdClassName?: string;           // <td> 추가 스타일
  inputClassName?: string;        // 편집 Textarea 추가 스타일
  readOnlyClassName?: string;     // 읽기 <span> 추가 스타일
  emptyFallback?: string;         // 기본 '-'
}
```

### 5.2 `<TableTextCell>`

**역할**: 긴 텍스트(역량명, 역량 정의, K/S/A, 훈련과정명, 비고, 교과목명, 세부내용, 프로파일 5필드 등).

```ts
interface TableTextCellProps extends BaseCellProps {
  value: string;
  onChange: (value: string) => void;
}
```

**렌더링**:
- `canEdit=true`: `<td className="px-3 py-3 align-top whitespace-pre-wrap break-words [overflow-wrap:anywhere] ${tdClassName}"><AutoResizeTextarea ... /></td>`
- `canEdit=false`: `<td ...><span className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] ${readOnlyClassName}">{value || emptyFallback}</span></td>`

### 5.3 `<TableInlineCell>`

**역할**: 한 줄 텍스트(훈련형태 등). 줄바꿈 금지, 기본 가운데 정렬.

```ts
interface TableInlineCellProps extends BaseCellProps {
  value: string;
  onChange: (value: string) => void;
  align?: 'left' | 'center' | 'right';  // 기본 'center'
}
```

**렌더링**:
- `canEdit=true`: `<td className="h-0 px-3 py-3 align-top text-{align} ${tdClassName}"><Textarea rows={1} ... onChange={(e) => onChange(e.target.value.replace(/\n/g, ''))} className="h-full w-full resize-none overflow-hidden text-{align} ${inputClassName}" /></td>`
- `canEdit=false`: `<td ...><span className="text-foreground ${readOnlyClassName}">{value || emptyFallback}</span></td>`

### 5.4 `<TableNumericCell>`

**역할**: 숫자 전용 셀(훈련시간, 교과목 시간). 단위 접미사 지원.

```ts
interface TableNumericCellProps extends BaseCellProps {
  value: number;
  onChange: (value: number) => void;
  align?: 'left' | 'center' | 'right';  // 기본 'center'
  unit?: string;                         // 기본 'H' — 읽기모드 접미사
  min?: number;                          // 기본 0
}
```

**렌더링**:
- `canEdit=true`: `<td className="h-0 px-3 py-3 align-top text-{align} ${tdClassName}"><Textarea rows={1} value={value || ''} onChange={(e) => { const v = e.target.value.replace(/[^0-9]/g, ''); onChange(v === '' ? 0 : Number(v)); }} ... /></td>`
- `canEdit=false`: `<td ...><span className="font-medium text-foreground ${readOnlyClassName}">{value > min ? \`${value}${unit}\` : emptyFallback}</span></td>`

### 5.5 `<SyncedTableRow>`

**역할**: `<tr>` + `useRowHeightSync`를 내장해 행 내 모든 textarea 높이를 자동 동기화.

```ts
interface SyncedTableRowProps {
  deps: ReadonlyArray<unknown>;  // 내용이 바뀔 때마다 재동기화
  className?: string;            // 기본 'align-top'
  children: React.ReactNode;
}
```

**구현**:
```tsx
const ref = useRef<HTMLTableRowElement>(null);
useRowHeightSync(ref, deps);
return <tr ref={ref} className={cn('align-top', className)}>{children}</tr>;
```

### 5.6 `<SectionNumberBadge>`

**역할**: "명세서 #1", "PBL 프로젝트 #2" 형태의 번호 뱃지. CardHeader 상단용.

```ts
interface SectionNumberBadgeProps {
  label: string;      // '명세서' | 'PBL 프로젝트' 등
  index: number;      // 0-based, 표시는 index+1
  className?: string;
}
```

**렌더링**: `<Badge variant="outline" className={cn('bg-blue-50 text-blue-700 border-blue-200', className)}>{label} #{index + 1}</Badge>`

## 6. 스타일 상수 (`table-styles.ts`)

colSpan·2단 label td 등 공용 컴포넌트 범위 밖 특수 케이스용.

```ts
export const TABLE_CELL_TEXT_CLASS =
  'px-3 py-3 align-top whitespace-pre-wrap break-words [overflow-wrap:anywhere]';

export const TABLE_CELL_INLINE_CLASS =
  'h-0 px-3 py-3 align-top text-center';

export const READ_ONLY_TEXT_CLASS =
  'whitespace-pre-wrap break-words [overflow-wrap:anywhere]';

export const CARD_HEADER_CLASS =
  'pt-5 pb-3 bg-gradient-to-r from-gray-50 to-white';
```

## 7. 마이그레이션 계획

### 7.1 대상 파일

1. `src/components/roadmap/CompetencyModelingTable.tsx`
2. `src/components/roadmap/AnnualTrainingPlanTable.tsx`
3. `src/components/roadmap/CourseSpecCard.tsx`

### 7.2 교체 예시 (Before → After)

**Before (CompetencyModelingTable DesktopRow 역량명 셀, 약 13줄)**:
```tsx
<tr ref={rowRef} className="align-top">
  <td className="px-3 py-3 align-top whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
    {canEdit ? (
      <AutoResizeTextarea
        value={competency.name}
        onChange={(e) => onUpdate(index, { name: e.target.value })}
        placeholder="역량명"
        aria-label={`역량 ${index + 1} 역량명`}
        className="font-medium"
      />
    ) : (
      <span className="font-medium text-foreground whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
        {competency.name || '-'}
      </span>
    )}
  </td>
  ...
</tr>
```

**After (약 9줄)**:
```tsx
<SyncedTableRow deps={[competency.name, competency.definition, knowledgeStr, skillsStr, attitudesStr, canEdit]}>
  <TableTextCell
    canEdit={canEdit}
    value={competency.name}
    onChange={(v) => updateCompetency(index, { name: v })}
    placeholder="역량명"
    ariaLabel={`역량 ${index + 1} 역량명`}
    inputClassName="font-medium"
    readOnlyClassName="font-medium text-foreground"
  />
  ...
</SyncedTableRow>
```

### 7.3 예외

- `<td colSpan={6}>` 빈 상태 행, ProfileSection의 label td(`whitespace-normal break-keep`) 등은 공용 컴포넌트 대상 아님. 스타일 상수만 import해 직접 작성 유지.
- 모바일 카드 뷰(`MobileCard`, `MobileField`)는 변경 대상 아님.

## 8. 테스트 전략

### 8.1 신규 shared 컴포넌트 — TDD

각 컴포넌트당 확인 항목:
- 렌더링 모드: `canEdit=false` → 읽기 span, `canEdit=true` → Textarea
- `ariaLabel`·`placeholder` 전파
- `onChange` 호출값 정확성 (값만 넘기기 시그니처)
- 필터링: InlineCell → 줄바꿈 제거, NumericCell → 비숫자 제거
- `emptyFallback` 기본/커스텀
- NumericCell 단위 접미사: `value=10, unit='H'` → `10H` / `value=0` → fallback
- SyncedTableRow: `ref` 주입 확인, children 렌더 확인
- SectionNumberBadge: `index=0` → `#1` 표시

### 8.2 기존 테스트 보존

- `CompetencyModelingTable.test.tsx`, `AnnualTrainingPlanTable.test.tsx`, `CourseSpecCard.test.tsx` 수정 금지 원칙.
- shared 컴포넌트가 `<td>`·`<tr>` DOM 구조와 `aria-label`·`placeholder`를 **동일하게** 유지하므로 기존 테스트 그대로 통과해야 함. 통과 = 회귀 없음 증명.

### 8.3 최종 검증

- `npm run validate` (typecheck + lint + test)
- `npm run build`
- 실제 화면 확인: 컨설턴트(`kpc@test.com`) + 운영관리자(`son@test.com`) 양쪽 로드맵 결과 페이지

## 9. 리스크 & 대응

| 리스크 | 대응 |
|---|---|
| colSpan 등 특수 셀 누락 | 스타일 상수만 import해 직접 작성 |
| `readOnlyClassName` 다양 (font-medium, text-muted-foreground 등) | prop으로 받음 |
| `hours=0` 표시 경계 | NumericCell 내부 명시 (`value > min ? ...`) |
| ProfileSection label td 고유 스타일 | 리팩토링 대상 아님 |
| useLayoutEffect SSR 경고 | `'use client'` 내부에서만 사용 |
| 기존 테스트 회귀 | DOM 구조 유지 + 기존 테스트 통과로 검증 |

## 10. 변경 규모 추산

- **신규**: 12 파일 (컴포넌트 5 + 상수 1 + index 1 + 테스트 5)
- **수정**: 3 파일 (기존 표)
- **총**: 약 15 파일, PR 1건

## 11. 향후 확장 (본 스펙 범위 외)

- PBL 세션(Step 9)에서 본 키트 재사용이 주 목적.
- 갤러리·운영관리·프로필 등의 일반 목록 표에 적용할 필요가 생기면, 그때 본 키트를 `src/components/tables/`로 승격(C안) 고려.
- 모바일 카드 뷰 공통화는 별도 스펙에서 다룬다.
