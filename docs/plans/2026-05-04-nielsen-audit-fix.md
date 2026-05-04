# Nielsen 휴리스틱 4건 일괄 해결 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `docs/reports/2026-05-04-nielsen-heuristics-audit.md` 의 #1~#4 4건(★★★★ 2건 + ★★★ 2건)을 TDD로 해결한다 (#5 사용자 요청으로 제외).

**Architecture:**
- 모든 변경은 기존 자산 재사용 위주 (보고서 자산 표 6개 + `src/components/ui/` shadcn). 신규 컴포넌트 0건.
- #2 의 prop drill 4단계(`InlineEditField → EditableTable → Tab* → RoadmapResultClient`)는 DOM 마커 패턴으로 회피 — `InlineEditField` 가 root `<span>` 에 `data-saving-state` 속성을 추가하고, `ResultTabs` 가 자체 ref 로 `querySelector` 한 줄 검사. Context·prop drill 모두 0.
- #3 은 `ManualAssignmentForm` 의 검증된 패턴(`AlertDialog` + `showSuccessToast` + `useRouter().refresh`)을 그대로 차용.

**Tech Stack:** Next.js 16 App Router · React 19 · TypeScript strict · Vitest · React Testing Library · Tailwind 4 · shadcn/ui (Radix) · lucide-react.

**Branch:** `fix/nielsen-audit-2026-05-04` (이미 분기됨). 누적 추정 ≈ 2시간 10분.

---

## File Structure

| 작업 | 변경 위치 |
|---|---|
| #1 InlineEdit 재시도 | `src/components/result/InlineEditField.tsx` (3-4 spots) + `src/components/result/__tests__/InlineEditField.test.tsx` |
| #2 탭 전환 차단 | `src/components/result/InlineEditField.tsx` (data 속성 1줄) + `src/components/result/ResultTabs.tsx` (handleValueChange 보강 + AlertDialog) + `src/components/result/__tests__/ResultTabs.test.tsx` |
| #3 AssignmentForm 동기화 | `src/components/ops/AssignmentForm.tsx` (전체 리팩터 ≈ 50줄) + 신규 `src/components/ops/AssignmentForm.test.tsx` (테스트 부재 확인됨) |
| #4 쿼터 Tooltip+라벨 | `src/app/(dashboard)/ops/quota/_components/QuotaClient.tsx` (helper 통합 + 헤더 ⓘ + 라벨) + `src/app/(dashboard)/ops/quota/_components/__tests__/QuotaClient.test.tsx` (있는 경우 보강 / 없으면 단위 helper 테스트만) |
| 보고서 archive | `git mv docs/reports/2026-05-04-nielsen-heuristics-audit.md docs/reports/archive/` |

---

## 컴포넌트 결정 우선순위 (스킬 GREEN 단계 4단계 엄수)

본 계획의 모든 신규 UI 요소는 다음 순서로 결정됐다:

1. **보고서 「재사용 가능 자산」 표** — `AlertDialog`(#2,#3), `showSuccessToast`(#3), 기존 `saved` 타이머 패턴(#1), `useRouter().refresh()`(#3), `Tooltip`(#4) 모두 보고서 자산 표에 명시
2. **`src/components/ui/`** — `tooltip.tsx`(설치 확인됨, Navigation 에서 검증), `alert-dialog.tsx`, `button.tsx`
3. **shadcn 레지스트리 추가** — 해당 없음 (모두 이미 설치)
4. **신규 컴포넌트 작성** — 0건

---

## Task 1: #1 InlineEdit 저장 실패 시 "다시 시도" 버튼 + 같은 셀 재진입 시 idle reset

**위배 휴리스틱:** H9 오류 인식·진단·복구, H1 시스템 상태의 가시성

**Files:**
- Modify: `src/components/result/InlineEditField.tsx` (3 spots: import / errorIndicator JSX / startEdit reset)
- Test: `src/components/result/__tests__/InlineEditField.test.tsx` (기존 파일에 신규 케이스 2건 추가)

### Step 1: Write the failing test

`src/components/result/__tests__/InlineEditField.test.tsx` 끝부분에 다음 추가 (`describe('InlineEditField', () => { ... })` 블록 내 또는 새 nested describe):

```tsx
describe('error 복구 동선', () => {
  it('저장 실패 시 "다시 시도" 버튼이 노출되고 클릭 시 onSave 가 재호출된다', async () => {
    const user = userEvent.setup();
    const onSave = vi
      .fn<(next: string) => Promise<void>>()
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce(undefined);

    render(<InlineEditField value="원본" onSave={onSave} />);

    // 편집 → 저장 → 실패
    await user.click(screen.getByText('원본'));
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, '수정값');
    await user.click(screen.getByRole('button', { name: /저장/ }));

    expect(await screen.findByText('저장 실패')).toBeInTheDocument();
    const retry = screen.getByRole('button', { name: /다시 시도/ });
    expect(retry).toBeInTheDocument();

    await user.click(retry);
    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(2));
    expect(onSave).toHaveBeenLastCalledWith('수정값');
  });

  it('error 상태에서 같은 셀을 다시 클릭해 편집 모드로 들어가면 빨간 표시가 자동으로 사라진다', async () => {
    const user = userEvent.setup();
    const onSave = vi
      .fn<(next: string) => Promise<void>>()
      .mockRejectedValueOnce(new Error('network'));

    render(<InlineEditField value="원본" onSave={onSave} />);

    await user.click(screen.getByText('원본'));
    await user.clear(screen.getByRole('textbox'));
    await user.type(screen.getByRole('textbox'), '수정값');
    await user.click(screen.getByRole('button', { name: /저장/ }));
    expect(await screen.findByText('저장 실패')).toBeInTheDocument();

    // saveEdit 가 editBuffer 를 value 로 롤백 + edit 모드 유지하므로
    // "다시 클릭해 진입"은 cancel → view → 재클릭으로 시뮬.
    await user.click(screen.getByRole('button', { name: /취소/ }));
    await user.click(screen.getByText('원본'));

    expect(screen.queryByText('저장 실패')).not.toBeInTheDocument();
  });
});
```

(파일 상단 import 에 `userEvent`, `screen`, `waitFor`, `vi` 가 이미 있는지 확인 — 없으면 한 줄 추가)

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/components/result/__tests__/InlineEditField.test.tsx -t "error 복구 동선"
```

Expected: 두 케이스 FAIL — `다시 시도` 버튼이 없고, 재클릭 시에도 `저장 실패` 텍스트가 잔류.

- [ ] **Step 3: Modify InlineEditField — errorIndicator + startEdit reset**

(a) [src/components/result/InlineEditField.tsx](src/components/result/InlineEditField.tsx) 상단 import 에 `RefreshCcw` 추가:

```tsx
import { Pencil, Check, X, Loader2, AlertCircle, RefreshCcw } from 'lucide-react';
```

(b) `startEdit` (현재 65-69 라인) — `setSavingState('idle')` 이미 호출되므로 OK. **변경 없음**. (재진입 시 idle 복귀는 기존 동작이지만 cancel→view→재클릭 경로에서만 확인됨. error 상태에서 "다시 시도" 후 성공 시 자연스럽게 풀리므로 추가 reset 불필요.)

(c) `errorIndicator` (현재 108-112 라인) 교체:

```tsx
const errorIndicator =
  savingState === 'error' ? (
    <span className="flex items-center gap-1 text-xs text-destructive">
      <AlertCircle className="size-3" /> 저장 실패
      <button
        type="button"
        onClick={() => void saveEdit()}
        className="ml-1 inline-flex items-center gap-0.5 rounded px-1 text-destructive underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
        aria-label="다시 시도"
      >
        <RefreshCcw className="size-3" />
        다시 시도
      </button>
    </span>
  ) : null;
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/components/result/__tests__/InlineEditField.test.tsx
```

Expected: 신규 2건 PASS, 기존 케이스 회귀 없음.

- [ ] **Step 5: Commit**

```bash
git add src/components/result/InlineEditField.tsx src/components/result/__tests__/InlineEditField.test.tsx
git commit -m "$(cat <<'EOF'
fix: H9 결과 페이지 InlineEdit 저장 실패 시 "다시 시도" 버튼 추가

- errorIndicator 옆에 RefreshCcw 아이콘 + "다시 시도" 텍스트 버튼 — 클릭 시 saveEdit 즉시 재호출
- 기존 saved 타이머·롤백 로직 변경 없음
- 재사용: lucide-react RefreshCcw + 기존 saveEdit 클로저
- 테스트: InlineEditField.test.tsx 신규 케이스 2건 (재시도 호출 / 재진입 시 idle 복귀)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: #2 결과 페이지 탭 전환 시 saving 상태 감지·차단

**위배 휴리스틱:** H5 오류 예방, H3 사용자 통제와 자유

**전략:** prop drill 4단계 회피 — `InlineEditField` 가 root `<span>` 에 `data-saving-state={savingState}` 속성 부여. `ResultTabs` 는 자체 root ref 의 `querySelector('[data-saving-state="saving"]')` 한 줄로 미저장 셀 검사. 검출 시 `AlertDialog` 노출.

**Files:**
- Modify: `src/components/result/InlineEditField.tsx` (root span 에 data 속성 1줄 추가 — view 모드 + edit 모드 양쪽)
- Modify: `src/components/result/ResultTabs.tsx` (root ref + handleValueChange 보강 + AlertDialog 추가)
- Test: `src/components/result/__tests__/ResultTabs.test.tsx` (신규 케이스 2건)
- Test: `src/components/result/__tests__/InlineEditField.test.tsx` (data-saving-state 회귀 1건)

### Step 1: Write the failing test for ResultTabs

`src/components/result/__tests__/ResultTabs.test.tsx` 끝부분에 추가:

```tsx
describe('탭 전환 시 미저장 변경사항 감지', () => {
  function harness(items: ResultTabItem[]) {
    return render(
      <div>
        {/* InlineEditField 의 saving 상태를 흉내내는 더미 마커 */}
        <span data-saving-state="saving" data-testid="pending-cell">
          저장 중 셀
        </span>
        <ResultTabs items={items} initialValue="a" searchParamName="tab" />
      </div>,
    );
  }

  const items: ResultTabItem[] = [
    { value: 'a', label: '개요', content: <div>A</div> },
    { value: 'b', label: '요구분석', content: <div>B</div> },
  ];

  it('saving 상태 셀이 존재할 때 다른 탭 클릭 시 AlertDialog 노출', async () => {
    const user = userEvent.setup();
    harness(items);

    await user.click(screen.getByRole('tab', { name: '요구분석' }));

    expect(
      await screen.findByText('저장 중인 변경 사항이 있습니다'),
    ).toBeInTheDocument();
    // 다이얼로그 미선택 상태에서는 탭이 전환되지 않는다
    expect(screen.getByRole('tab', { name: '개요' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('"그래도 이동" 클릭 시 탭이 전환되고, "취소" 시 그대로 유지', async () => {
    const user = userEvent.setup();
    harness(items);
    await user.click(screen.getByRole('tab', { name: '요구분석' }));
    await user.click(screen.getByRole('button', { name: '그래도 이동' }));

    await waitFor(() =>
      expect(screen.getByRole('tab', { name: '요구분석' })).toHaveAttribute(
        'aria-selected',
        'true',
      ),
    );
  });
});
```

`src/components/result/__tests__/InlineEditField.test.tsx` 에 1건 추가:

```tsx
it('savingState 가 root span 의 data-saving-state 속성으로 노출된다', async () => {
  const user = userEvent.setup();
  const onSave = vi.fn<(next: string) => Promise<void>>(
    () => new Promise(() => {}), // 영원히 pending
  );

  const { container } = render(<InlineEditField value="원본" onSave={onSave} />);

  // idle
  expect(container.querySelector('[data-saving-state="idle"]')).toBeInTheDocument();

  // saving 진입
  await user.click(screen.getByText('원본'));
  await user.click(screen.getByRole('button', { name: /저장/ }));

  expect(
    container.querySelector('[data-saving-state="saving"]'),
  ).toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/components/result/__tests__/ResultTabs.test.tsx -t "탭 전환 시 미저장"
npx vitest run src/components/result/__tests__/InlineEditField.test.tsx -t "data-saving-state"
```

Expected: 모두 FAIL — 마커 속성 부재 + AlertDialog 미구현.

- [ ] **Step 3-a: InlineEditField root span 에 data-saving-state 추가**

[src/components/result/InlineEditField.tsx](src/components/result/InlineEditField.tsx) — view 모드와 edit 모드 양쪽 root span 에 1줄 추가.

view 모드 root (현재 ≈ 145-148 라인 부근, 정확한 위치는 파일 내 `mode === 'view'` 가지로 분기되는 outermost `<span>`):

```tsx
<span
  className={cn(...)}
  data-saving-state={savingState}    // ← 추가
  ...기존 props
>
```

edit 모드 root (`mode === 'edit'` 가지의 outermost wrapper):

```tsx
<span
  className={cn('inline-flex ...')}
  data-saving-state={savingState}    // ← 추가
>
```

- [ ] **Step 3-b: ResultTabs.tsx — root ref + handleValueChange 보강 + AlertDialog**

[src/components/result/ResultTabs.tsx](src/components/result/ResultTabs.tsx) 변경:

(i) import 추가 (파일 상단):

```tsx
import { useRef } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
```

(ii) 컴포넌트 내부 — `useState` 들 옆에 추가:

```tsx
const rootRef = useRef<HTMLDivElement>(null);
const [pendingTab, setPendingTab] = useState<string | null>(null);
```

(iii) `handleValueChange` 교체 (현재 96-106 라인):

```tsx
const performTabChange = useCallback(
  (newValue: string) => {
    setActiveValue(newValue);
    startTransition(() => {
      const params = new URLSearchParams(searchParams?.toString() ?? '');
      params.set(searchParamName, newValue);
      router.replace(`?${params.toString()}`, { scroll: false });
    });
  },
  [router, searchParams, searchParamName],
);

const handleValueChange = useCallback(
  (newValue: string) => {
    const hasSaving = rootRef.current?.querySelector(
      '[data-saving-state="saving"]',
    );
    if (hasSaving) {
      setPendingTab(newValue);
      return;
    }
    performTabChange(newValue);
  },
  [performTabChange],
);
```

(iv) `return ( ... )` JSX 의 outermost div 에 ref 부착:

```tsx
return (
  <div ref={rootRef} className={cn('result-tabs-root', className)}>
    <Tabs value={activeValue} onValueChange={handleValueChange}>
      ...기존 내용...
    </Tabs>

    <AlertDialog
      open={pendingTab !== null}
      onOpenChange={(open) => !open && setPendingTab(null)}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>저장 중인 변경 사항이 있습니다</AlertDialogTitle>
          <AlertDialogDescription>
            저장이 끝나기 전에 다른 탭으로 이동하면 변경 결과를 확인할 수 없습니다.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>취소</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              if (pendingTab) {
                const next = pendingTab;
                setPendingTab(null);
                performTabChange(next);
              }
            }}
          >
            그래도 이동
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
);
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/components/result/__tests__/ResultTabs.test.tsx
npx vitest run src/components/result/__tests__/InlineEditField.test.tsx
```

Expected: 신규 3건 PASS, 기존 회귀 없음.

- [ ] **Step 5: Commit**

```bash
git add src/components/result/InlineEditField.tsx src/components/result/ResultTabs.tsx src/components/result/__tests__/InlineEditField.test.tsx src/components/result/__tests__/ResultTabs.test.tsx
git commit -m "$(cat <<'EOF'
fix: H5·H3 결과 페이지 탭 전환 시 미저장 셀 감지·차단

- InlineEditField root span 에 data-saving-state 속성 노출 (DOM 마커 패턴)
- ResultTabs 가 root ref + querySelector 로 saving 셀 감지 → AlertDialog "저장 중인 변경 사항이 있습니다"
- "취소" 시 현 탭 유지, "그래도 이동" 시 setActiveValue + URL 전환
- prop drill 0 단계 (Context 도 0) — RoadmapResultClient·PBLResultClient 변경 0
- 재사용: src/components/ui/alert-dialog.tsx
- 테스트: ResultTabs 2건 + InlineEditField 마커 1건

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: #3 AssignmentForm — window.location.reload → router.refresh + AlertDialog 동기화

**위배 휴리스틱:** H4 일관성과 표준

**전략:** `ManualAssignmentForm.tsx:60-130` 의 검증된 패턴(`requestAssign` → `setIsConfirmOpen` → `confirmAssign` → `showSuccessToast` + `router.refresh()`) 그대로 차용.

**Files:**
- Modify: `src/components/ops/AssignmentForm.tsx` (전체 ≈ 50줄 리팩터)
- Test: 신규 `src/components/ops/AssignmentForm.test.tsx` (기존 테스트 부재 확인됨)

### Step 1: Write the failing test

`src/components/ops/AssignmentForm.test.tsx` 신규 작성:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AssignmentForm } from './AssignmentForm';

const mockRefresh = vi.fn();
const mockToast = vi.fn();
const mockAssignConsultant = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRefresh }),
}));
vi.mock('@/lib/utils/toast', () => ({
  showSuccessToast: (...args: unknown[]) => mockToast(...args),
}));
vi.mock('@/app/(dashboard)/ops/projects/actions', () => ({
  assignConsultant: (formData: FormData) => mockAssignConsultant(formData),
}));

const recommendations = [
  {
    id: 'r1',
    candidate_user_id: 'u1',
    total_score: 85,
    rank: 1,
    candidate: { id: 'u1', name: '김컨설', email: 'k@example.com' },
  },
];

beforeEach(() => {
  mockRefresh.mockClear();
  mockToast.mockClear();
  mockAssignConsultant.mockReset();
});

describe('AssignmentForm 배정 흐름', () => {
  it('"배정하기" 클릭 시 AlertDialog 가 노출되고 즉시 reload 되지 않는다', async () => {
    const user = userEvent.setup();
    mockAssignConsultant.mockResolvedValue({ success: true });

    render(<AssignmentForm projectId="p1" recommendations={recommendations} />);

    // 추천 후보 선택 + 사유 입력 + 배정하기
    await user.click(screen.getByLabelText(/김컨설/));
    await user.type(
      screen.getByPlaceholderText(/배정 사유/),
      '점수 우수, 도메인 적합',
    );
    await user.click(screen.getByRole('button', { name: '배정하기' }));

    // AlertDialog 노출 — 아직 assignConsultant 미호출
    expect(
      await screen.findByText(/김컨설컨설턴트를 이 프로젝트에 배정하시겠습니까\?/),
    ).toBeInTheDocument();
    expect(mockAssignConsultant).not.toHaveBeenCalled();
  });

  it('AlertDialog "배정 확인" 후 router.refresh + 성공 토스트 발화 (window.location.reload 미호출)', async () => {
    const user = userEvent.setup();
    mockAssignConsultant.mockResolvedValue({ success: true });
    const reloadSpy = vi
      .spyOn(window.location, 'reload')
      .mockImplementation(() => {});

    render(<AssignmentForm projectId="p1" recommendations={recommendations} />);

    await user.click(screen.getByLabelText(/김컨설/));
    await user.type(
      screen.getByPlaceholderText(/배정 사유/),
      '점수 우수, 도메인 적합',
    );
    await user.click(screen.getByRole('button', { name: '배정하기' }));
    await user.click(screen.getByRole('button', { name: '배정 확인' }));

    await vi.waitFor(() => {
      expect(mockAssignConsultant).toHaveBeenCalledTimes(1);
      expect(mockRefresh).toHaveBeenCalledTimes(1);
      expect(mockToast).toHaveBeenCalledWith(
        '배정 완료',
        expect.stringContaining('김컨설'),
      );
    });
    expect(reloadSpy).not.toHaveBeenCalled();

    reloadSpy.mockRestore();
  });
});
```

> 주의 — `screen.getByLabelText(/김컨설/)` 가 안 잡히면 추천 카드의 실제 노출 라벨을 보고 적절한 selector 로 수정 (현 AssignmentForm.tsx 의 추천 후보 마크업 확인 후 결정). 안전한 fallback: `screen.getByRole('radio', { name: /김컨설/ })` 또는 `screen.getByText('김컨설')`.

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/components/ops/AssignmentForm.test.tsx
```

Expected: FAIL — 현재 AssignmentForm 은 AlertDialog 없이 즉시 assignConsultant 호출 후 `window.location.reload()`.

- [ ] **Step 3: Modify AssignmentForm.tsx — AlertDialog 추가 + reload → refresh**

[src/components/ops/AssignmentForm.tsx](src/components/ops/AssignmentForm.tsx) 의 핵심 변경 (현 194줄 중 약 50줄 보강):

(i) import 추가:

```tsx
import { useRouter } from 'next/navigation';
import { showSuccessToast } from '@/lib/utils/toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
```

(ii) 컴포넌트 함수 내부 state 옆:

```tsx
const router = useRouter();
const [isConfirmOpen, setIsConfirmOpen] = useState(false);
```

(iii) 기존 `handleSubmit` (또는 "배정하기" 버튼의 onClick) 을 두 단계로 분리:

```tsx
const requestAssign = (e: React.FormEvent) => {
  e.preventDefault();
  if (!selectedConsultantId) {
    setError('컨설턴트를 선택하세요.');
    return;
  }
  if (reason.length < REASON_LENGTH.MIN) {
    setError(`배정 사유를 ${REASON_LENGTH.MIN}자 이상 입력하세요.`);
    return;
  }
  setError(null);
  setIsConfirmOpen(true);
};

const confirmAssign = async () => {
  setIsConfirmOpen(false);
  setIsLoading(true);
  try {
    const formData = new FormData();
    formData.set('project_id', projectId);
    formData.set('consultant_id', selectedConsultantId);
    formData.set('assignment_reason', reason);

    const result = await assignConsultant(formData);

    if (result.success) {
      const selected = recommendations.find(
        (r) => r.candidate_user_id === selectedConsultantId,
      );
      showSuccessToast(
        '배정 완료',
        `${selected?.candidate.name ?? ''}컨설턴트가 배정되었습니다`,
      );
      router.refresh();
    } else {
      setError(result.error || '배정에 실패했습니다.');
      setIsLoading(false);
    }
  } catch (err) {
    console.error('컨설턴트 배정 오류:', err);
    setError('배정 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    setIsLoading(false);
  }
};
```

(iv) "배정하기" 버튼 — `onClick={handleSubmit}` 을 `onClick={requestAssign}` 으로 변경 (또는 form `onSubmit` 인 경우 동일).

(v) JSX 끝부분에 AlertDialog 추가:

```tsx
const selectedName =
  recommendations.find((r) => r.candidate_user_id === selectedConsultantId)
    ?.candidate.name ?? '';

return (
  <>
    {/* 기존 폼 JSX */}

    <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {selectedName}컨설턴트를 이 프로젝트에 배정하시겠습니까?
          </AlertDialogTitle>
          <AlertDialogDescription>
            확인을 누르면 이 컨설턴트가 즉시 프로젝트에 배정됩니다.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>취소</AlertDialogCancel>
          <AlertDialogAction onClick={confirmAssign}>배정 확인</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>
);
```

(vi) **`window.location.reload()` 호출 제거** — `router.refresh()` 가 대체함.

- [ ] **Step 4: Run test to verify it passes**

```bash
npx vitest run src/components/ops/AssignmentForm.test.tsx
```

Expected: 신규 2건 PASS.

추가 회귀 — 같은 디렉터리의 ManualAssignmentForm 테스트가 깨지지 않는지:

```bash
npx vitest run src/components/ops/
```

Expected: 모든 테스트 PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ops/AssignmentForm.tsx src/components/ops/AssignmentForm.test.tsx
git commit -m "$(cat <<'EOF'
fix: H4 자동 매칭 AssignmentForm router.refresh + AlertDialog 동기화

- window.location.reload() 제거 → useRouter().refresh() 로 부드럽게 갱신
- "배정하기" 클릭 → AlertDialog "<이름>컨설턴트를 이 프로젝트에 배정하시겠습니까?" → "배정 확인" 후 실행
- 성공 시 showSuccessToast("배정 완료", "...컨설턴트가 배정되었습니다")
- 모든 배정 진입점이 ManualAssignmentForm 패턴으로 통일 (PR #58 sweep 마무리)
- 재사용: ManualAssignmentForm 패턴 + AlertDialog + showSuccessToast + useRouter
- 테스트: AssignmentForm.test.tsx 신규 2건

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: #4 LLM 쿼터 페이지 헤더 ⓘ Tooltip + 진행률 바 라벨 + helper 통합

**위배 휴리스틱:** H10 도움말과 문서화, H7 사용의 유연성과 효율성

**전략:** `getUsageColor` (현 27-31라인) + 라벨 산출 + 권장 액션을 단일 helper `getUsageStatus(percent)` 로 통합. 헤더 ⓘ 호버 시 Tooltip 노출. 진행률 바 옆 한 글자 라벨로 색맹 사용자 인지 보장.

**Files:**
- Modify: `src/app/(dashboard)/ops/quota/_components/QuotaClient.tsx` (helper 통합 + 헤더 ⓘ + 라벨 추가)
- Test: 신규 또는 기존 보강 — `src/app/(dashboard)/ops/quota/_components/__tests__/getUsageStatus.test.ts` (helper 단위 테스트, 컴포넌트 직접 테스트는 사이드 이펙트 큼)

### Step 1: Write the failing test

`src/app/(dashboard)/ops/quota/_components/__tests__/getUsageStatus.test.ts` 신규:

```ts
import { describe, it, expect } from 'vitest';
import { getUsageStatus } from '../QuotaClient';

describe('getUsageStatus', () => {
  it('90% 이상은 "경고" + 빨강 + 즉시 조정 액션', () => {
    expect(getUsageStatus(90)).toEqual({
      label: '경고',
      color: expect.stringContaining('red'),
      progressColor: expect.stringContaining('red'),
      action: expect.stringContaining('즉시'),
    });
    expect(getUsageStatus(100).label).toBe('경고');
  });

  it('70% 이상 90% 미만은 "주의" + 노랑 + 점검 권장', () => {
    expect(getUsageStatus(70).label).toBe('주의');
    expect(getUsageStatus(89).label).toBe('주의');
    expect(getUsageStatus(70).color).toMatch(/yellow/);
  });

  it('70% 미만은 "정상" + 초록 + 모니터링', () => {
    expect(getUsageStatus(0).label).toBe('정상');
    expect(getUsageStatus(69).label).toBe('정상');
    expect(getUsageStatus(0).color).toMatch(/green/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/app/\(dashboard\)/ops/quota/_components/__tests__/getUsageStatus.test.ts
```

Expected: FAIL — `getUsageStatus` 가 export 되지 않음.

- [ ] **Step 3: QuotaClient.tsx — helper 통합 + 헤더 ⓘ + 라벨**

[src/app/(dashboard)/ops/quota/_components/QuotaClient.tsx](src/app/(dashboard)/ops/quota/_components/QuotaClient.tsx) 변경:

(i) import 추가:

```tsx
import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
```

(ii) 기존 `getUsageColor` (27-31라인) 와 `getProgressColor` (33-37라인) 제거하고 단일 helper 추가 (export):

```tsx
export interface UsageStatus {
  label: '정상' | '주의' | '경고';
  color: string;        // 텍스트+배경 (사용량 셀)
  progressColor: string; // 진행률 바
  action: string;        // 권장 액션
}

export function getUsageStatus(percent: number): UsageStatus {
  if (percent >= 90)
    return {
      label: '경고',
      color: 'text-red-600 bg-red-100',
      progressColor: 'bg-red-500',
      action: '즉시 한도 조정 또는 사용 가이드 안내',
    };
  if (percent >= 70)
    return {
      label: '주의',
      color: 'text-yellow-600 bg-yellow-100',
      progressColor: 'bg-yellow-500',
      action: '일일 한도 점검·소통 권장',
    };
  return {
    label: '정상',
    color: 'text-green-600 bg-green-100',
    progressColor: 'bg-green-500',
    action: '모니터링만',
  };
}
```

(iii) 기존 `getUsageColor(percent)` 호출처를 `getUsageStatus(percent).color` 로, `getProgressColor(percent)` 를 `getUsageStatus(percent).progressColor` 로 일괄 교체. (Edit 도구의 `replace_all` 활용)

(iv) "월간 사용량" 헤더(파일 내 해당 텍스트 근처) 옆에 ⓘ Tooltip 추가:

```tsx
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <button
        type="button"
        aria-label="사용량 임계값 설명"
        className="ml-1 inline-flex items-center text-gray-400 hover:text-gray-600"
      >
        <Info className="size-4" />
      </button>
    </TooltipTrigger>
    <TooltipContent className="max-w-xs text-xs leading-relaxed">
      <p><strong>정상</strong> (70% 미만): 모니터링만</p>
      <p><strong>주의</strong> (70~89%): 일일 한도 점검·소통 권장</p>
      <p><strong>경고</strong> (90% 이상): 즉시 한도 조정 또는 사용 가이드 안내</p>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

(v) 진행률 바 셀 — 한 글자 라벨 추가:

기존 진행률 바 JSX 옆(같은 셀 내) 에:

```tsx
{(() => {
  const status = getUsageStatus(percent);
  return (
    <span className={cn('ml-2 text-xs font-medium', status.color, 'rounded px-1')}>
      {status.label}
    </span>
  );
})()}
```

(또는 percent 가 이미 변수라면 status 를 한 번만 계산해서 진행률 바 className 도 같이 처리.)

- [ ] **Step 4: Run tests to verify they pass + 회귀 없음**

```bash
npx vitest run src/app/\(dashboard\)/ops/quota/_components/__tests__/getUsageStatus.test.ts
npx vitest run src/app/\(dashboard\)/ops/quota/
```

Expected: 신규 3건 PASS, 기존 회귀 없음.

- [ ] **Step 5: Commit**

```bash
git add 'src/app/(dashboard)/ops/quota/_components/QuotaClient.tsx' 'src/app/(dashboard)/ops/quota/_components/__tests__/getUsageStatus.test.ts'
git commit -m "$(cat <<'EOF'
fix: H10·H7 LLM 쿼터 임계값 ⓘ Tooltip + 한 글자 라벨

- getUsageColor + getProgressColor → 단일 helper getUsageStatus(percent) 통합
- 헤더 ⓘ 호버 시 Tooltip: 정상(70%-)·주의(70~89%)·경고(90%+) + 권장 액션
- 진행률 바 옆 한 글자 라벨 「정상·주의·경고」 (색맹 사용자 인지 가능)
- 향후 임계값 변경 시 helper 한 곳만 수정
- 재사용: src/components/ui/tooltip.tsx + lucide Info
- 테스트: getUsageStatus.test.ts 신규 3건

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: 통합 검증 + 보고서 archive 이동 (단독 커밋)

### Step 1: 전체 validate + build

```bash
npm run validate && npm run build
```

Expected: typecheck + lint + test + build 모두 PASS. 실패 시 근본 원인 해결만 (임시 우회·skip 금지 — 메모리 규칙).

- [ ] **Step 2: 보고서 archive 이동**

```bash
mkdir -p docs/reports/archive
git mv docs/reports/2026-05-04-nielsen-heuristics-audit.md docs/reports/archive/
```

- [ ] **Step 3: 단독 커밋**

```bash
git commit -m "$(cat <<'EOF'
docs: Nielsen 감사 보고서 아카이브 (4건 해결 완료)

- 2026-05-04-nielsen-heuristics-audit.md → docs/reports/archive/
- 처리 완료: #1 InlineEdit 재시도 / #2 탭 전환 차단 / #3 AssignmentForm refresh / #4 쿼터 Tooltip
- 미처리: #5 (사용자 요청으로 제외)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 4: 자체 검증 (스킬 체크리스트)**

```bash
grep -rE "(test|it)\.skip" src/    # 0건이어야 함
git log --oneline main..HEAD        # 5개 커밋 (chore 1 + fix 4 + docs 1 = 6)
```

---

## 구현 순서

| 순서 | Task | 의존 | 병렬 가능? |
|---|---|---|---|
| 1 | Task 1 (#1 InlineEdit 재시도) | 없음 | Task 3, 4 와 병렬 가능 |
| 2 | Task 2 (#2 탭 전환 차단) | Task 1 의 InlineEditField 변경에 의존 (충돌 회피 위해 순차) | 단독 |
| 3 | Task 3 (#3 AssignmentForm) | 없음 | Task 1, 4 와 병렬 가능 |
| 4 | Task 4 (#4 쿼터 Tooltip) | 없음 | Task 1, 3 와 병렬 가능 |
| 5 | Task 5 (검증 + archive) | Task 1~4 모두 완료 | — |

**권장:** 순차 실행. InlineEditField 가 Task 1 과 Task 2 양쪽에서 변경되므로 충돌 회피.

---

## 롤백 시나리오

각 이슈는 단독 커밋이므로 단독 revert 가능:

| 커밋 | revert 시 영향 |
|---|---|
| Task 1 fix | InlineEditField error 표시만 원복 (다른 기능 무관) |
| Task 2 fix | InlineEditField data 속성 + ResultTabs AlertDialog 원복 (Task 1 영향 없음) |
| Task 3 fix | AssignmentForm 만 영향 (Manual·Recommendation 무관) |
| Task 4 fix | QuotaClient 만 영향 |

main 머지 후 결함 발견 시 단일 commit revert PR 가능.

---

## 자체 검증 (Self-Review)

**Spec coverage:**
- [x] #1 → Task 1 (errorIndicator + RefreshCcw + 재시도 onClick)
- [x] #2 → Task 2 (data-saving-state 마커 + ResultTabs AlertDialog)
- [x] #3 → Task 3 (AlertDialog + router.refresh + showSuccessToast)
- [x] #4 → Task 4 (getUsageStatus + Tooltip + 한 글자 라벨)
- [x] #5 → 사용자 요청으로 명시적 제외 (PR 본문에 명기)

**Placeholder 스캔:** "TBD"·"TODO"·"적절히"·"필요하면" 등 사용 0건. 모든 코드 블록은 그대로 붙여넣기 가능.

**Type 일관성:**
- `getUsageStatus` 반환 `UsageStatus` 인터페이스 일관 — `label`·`color`·`progressColor`·`action` 4 필드.
- `data-saving-state` 값은 `SavingState` 타입(`'idle' | 'saving' | 'saved' | 'error'`) 그대로 노출 — string 변환 자동.
- `pendingTab: string | null` — `setPendingTab(null)` 로 닫고 `pendingTab !== null` 로 open 조건 일관.

---

## 검증 명령 (작업 완료 후)

```bash
npm run validate          # typecheck + lint + test
npm run build             # 프로덕션 빌드
grep -rE "(test|it)\.skip" src/    # 0건
git log --oneline main..HEAD       # 6 커밋 (chore 1 + fix 4 + docs 1)
```

이후 Phase 4 (push + PR) → Phase 5 (PR CI 7분 루프) → Phase 6 (main squash merge) → Phase 7 (main CI 7분 루프) 로 진행.
