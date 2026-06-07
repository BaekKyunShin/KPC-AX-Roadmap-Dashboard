# Nielsen 휴리스틱 감사 5건 일괄 해결 — 구현 계획서

## 메타

- **보고서:** `docs/reports/2026-05-08-nielsen-heuristics-audit.md` (CRITICAL 5건)
- **브랜치:** `fix/nielsen-audit-2026-05-08`
- **누적 추정:** 약 2시간 5분
- **TDD 전면 적용** — 모든 이슈 RED → GREEN → REFACTOR
- **Phase 1 일괄 검토 결과:** 사용자 「그대로 진행」 (수정 사이클 0회)

## 구현 순서 (의존 관계 고려)

| 순서 | 이슈                                                      | 추정 | 의존                                               |
| ---- | --------------------------------------------------------- | ---- | -------------------------------------------------- |
| 1    | #1 인터뷰 차수/행 삭제 AlertDialog                        | 35분 | 독립 — 3 Step 파일                                 |
| 2    | #2 사용자 정지·템플릿 삭제 AlertDialog 통일               | 30분 | 독립                                               |
| 3    | #5 StaleResultBanner 라벨 + RegenerateAccordion 자동 펼침 | 30분 | RegenerateAccordion props 확장 → 결과 페이지 두 곳 |
| 4    | #4 사용자 관리 검색 EmptyState 통합                       | 20분 | 독립                                               |
| 5    | #3 비밀번호 흐름 「재설정」 통일                          | 10분 | 독립 — 텍스트만                                    |

이슈 간 의존이 없으므로 모두 독립 커밋으로 처리. 단독 revert 가능.

## 호출 스킬·에이전트

| 단계           | 호출                                                                              |
| -------------- | --------------------------------------------------------------------------------- |
| 모든 이슈 (UI) | `frontend-guide` (shadcn/ui 우선), `composition-patterns`, `react-best-practices` |
| 코드 변경 후   | `superpowers:test-driven-development` (RED→GREEN→REFACTOR)                        |
| 완료 검증      | `superpowers:verification-before-completion`                                      |
| 리팩토링 단계  | `superpowers:refactoring`                                                         |

서브에이전트 미사용 — 5건 모두 단일 파일 또는 동형 컴포넌트군 변경이므로 본 메인 세션이 직접 처리.

---

## 이슈별 상세

### #1 [★★★★★ H5·H3] 인터뷰 차수/행 삭제 AlertDialog

**변경 파일 (3개 + PBL 동형 시 추가):**

- `src/app/(dashboard)/consultant/projects/[id]/interview/_components/roadmap/StepPerformanceActivities.tsx` (`removeRound`, `RoundRows.onRemove`)
- `src/app/(dashboard)/consultant/projects/[id]/interview/_components/roadmap/StepCompetencyModeling.tsx` (`removeRow`)
- `src/app/(dashboard)/consultant/projects/[id]/interview/_components/roadmap/StepTaskAnalysis.tsx` (`removeRow`)
- (필요 시) `src/app/(dashboard)/consultant/projects/[id]/interview/_components/pbl/` 동형 Step 파일들

**구현 방식:**

- 각 Step 의 휴지통 버튼을 `AlertDialog` 로 감싸기 (`AlertDialogTrigger asChild`)
- onConfirm 시 기존 `removeRow`/`removeRound` 호출
- 신규 컴포넌트 작성 검토 → 인라인 AlertDialog 가 더 단순. Step 별로 다이얼로그 문구가 다름 (`{N}차 행` vs `선택한 행`)

**테스트 (Vitest + RTL):**

- 휴지통 클릭 → AlertDialog 노출 검증
- "취소" 클릭 → 행 유지, emit 미호출
- "삭제" 클릭 → 행 제거, emit 호출
- 마지막 1행은 휴지통 disabled (현재 가드 그대로)

**재사용 자산:** `src/components/ui/alert-dialog.tsx`

### #2 [★★★★ H5·H4] 사용자 정지·템플릿 삭제 AlertDialog 통일

**변경 파일 (2개):**

- `src/components/ops/UserManagementTable.tsx` (`renderUserActions` 의 `isApprovedAndActive` 분기)
- `src/app/(dashboard)/ops/templates/_components/TemplateList.tsx` (`mutate` 헬퍼의 native `confirm()` 분기 제거)

**구현 방식:**

- **UserManagementTable**: 정지 `TableActionLink` 를 `AlertDialogTrigger` 로 감싸기. 승인·활성화는 비파괴이므로 그대로 둠 — destructive 만 게이트.
  - 다이얼로그: 「{사용자명}님을 정지하시겠습니까?」 / 「정지된 사용자는 즉시 로그인이 차단되며, 알림 메일이 발송됩니다.」
- **TemplateList**: `mutate({ confirmMessage })` 의 native `confirm()` 호출(L213-216) 제거 → `onDelete` 호출처에 AlertDialogTrigger 직접 부착. `confirmMessage` 옵션은 deprecated 처리 또는 제거.
  - 다이얼로그: 「이 템플릿을 삭제하시겠습니까?」 / 「이 작업은 되돌릴 수 없습니다.」

**테스트:**

- UserManagementTable: 정지 클릭 → AlertDialog 노출, "취소" → updateUserStatus 미호출, "정지" → 호출
- TemplateList: 삭제 메뉴 클릭 → AlertDialog 노출 (native confirm mock 제거)

**재사용 자산:** `AlertDialog`, `ManualAssignmentForm.tsx` 분기 패턴(PR #58)

### #3 [★★★ H4·H2] 비밀번호 흐름 「재설정」 통일

**변경 파일 (2개):**

- `src/app/(auth)/reset-password/page.tsx` (버튼·진행 라벨·안내 박스 텍스트)
- `src/app/(auth)/reset-password/_meta.ts` (PAGE_TITLE / PAGE_DESCRIPTION 의 "변경" → "재설정")

**구현 방식:**

- 「비밀번호 변경」 → 「비밀번호 재설정」 (3개 위치: 버튼 라벨·진행 라벨·안내 박스)
- 「변경 중...」 → 「재설정 중...」
- 「변경 후에는 새 비밀번호로 다시 로그인해주세요.」 → 「재설정 후에는 새 비밀번호로 다시 로그인해주세요.」
- \_meta.ts PAGE_TITLE 동기화 (CLAUDE.md page↔loading 규칙)

**사전 grep 검증 (CLAUDE.md 영향 범위 점검):**

- `grep -rn "비밀번호 변경\|변경 중" src/app/\(auth\)`
- `grep -rn "변경 후에는" src/`

**테스트:** 기존 reset-password 단위 테스트의 라벨 검증을 「재설정」으로 갱신.

**재사용 자산:** `_meta.ts` (헤더 텍스트 단일 출처)

### #4 [★★★ H1·H7] 사용자 관리 검색 EmptyState 통합

**변경 파일:**

- `src/components/ops/UserManagementTable.tsx` (`isFilteredEmpty` 분기, 데스크톱 + 모바일 양쪽)

**구현 방식:**

- 현재 `EmptyState` 호출에 description + action prop 추가 (보고서 5단 코드 예시 그대로):
  - title: 검색어 유무에 따라 동적 (`'kim'과(와) 일치하는 사용자가 없습니다` / `조건과 일치하는 사용자가 없습니다`)
  - description: 활성 필터 라벨 동적 조립 (`현재 적용된 필터: 역할: 운영관리자, 상태: 활성`)
  - action: `<Button variant="outline" size="sm">필터 초기화</Button>` — 클릭 시 `setSearchInput('')` + `handleRoleChange(DEFAULT_FILTER_VALUE)` + `handleStatusChange(DEFAULT_FILTER_VALUE)`
- 모바일 카드 분기에도 동일 EmptyState 호출 (TableRow 래핑 없이)

**테스트:**

- 검색만 → title에 검색어 / description 미노출
- 필터만 → title 일반 문구 / description에 필터 라벨
- 검색 + 필터 → 둘 다
- 「필터 초기화」 클릭 → 검색·역할·상태 동시 리셋

**재사용 자산:** `EmptyState`, 기존 `selectedRoleLabel`·`handleRoleChange` 등

### #5 [★★★ H2·H4·H7] StaleResultBanner 라벨 + RegenerateAccordion 자동 펼침

**변경 파일 (4개):**

- `src/app/(dashboard)/consultant/projects/[id]/interview/review/_components/StaleResultBanner.tsx` (라벨 + 아이콘 + 쿼리)
- `src/components/roadmap/RegenerateAccordion.tsx` (defaultOpen·autoFocus prop 추가)
- `src/app/(dashboard)/consultant/projects/[id]/roadmap/_components/result-v2/RoadmapResultClient.tsx` (`useSearchParams` 분기 + scrollIntoView + URL cleanup)
- `src/app/(dashboard)/consultant/projects/[id]/pbl/_components/result-v2/PBLResultClient.tsx` (동일 패턴)

**구현 방식:**

1. **StaleResultBanner** (라벨/아이콘/쿼리):

   ```tsx
   import { AlertTriangle, Plus, Loader2 } from 'lucide-react';  // RefreshCw 제거

   // 버튼 라벨/아이콘
   {isPending ? <Loader2 className="..." /> : <Plus className="mr-1 size-4" />}
   새 버전 생성

   // router.push 쿼리 부착
   router.push(`${path}?regenerate=open`);
   ```

2. **RegenerateAccordion** (props 확장):

   ```tsx
   interface RegenerateAccordionProps {
     value: string;
     onChange: (next: string) => void;
     onSubmit: () => void;
     isLoading: boolean;
     disabled?: boolean;
     defaultOpen?: boolean;
     autoFocus?: boolean;
   }

   // useState 초기값
   const [open, setOpen] = useState(defaultOpen ?? false);

   // textarea ref + useEffect 로 마운트 후 포커스
   const textareaRef = useRef<HTMLTextAreaElement>(null);
   useEffect(() => {
     if (autoFocus && open) textareaRef.current?.focus();
   }, [autoFocus, open]);
   ```

3. **RoadmapResultClient / PBLResultClient** (쿼리 감지 + scrollIntoView + cleanup):

   ```tsx
   const searchParams = useSearchParams();
   const router = useRouter();
   const isRegenerateRequested = searchParams?.get('regenerate') === 'open';
   const accordionRef = useRef<HTMLDivElement>(null);

   useEffect(() => {
     if (isRegenerateRequested && accordionRef.current) {
       accordionRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
       // URL cleanup — 새로고침 시 또 펼치지 않게
       router.replace(pathname);
     }
   }, [isRegenerateRequested, router, pathname]);

   // RegenerateAccordion 호출
   <div ref={accordionRef}>
     <RegenerateAccordion
       value={revisionPrompt}
       onChange={setRevisionPrompt}
       onSubmit={handleRegenerate}
       isLoading={isGenerating}
       defaultOpen={isRegenerateRequested}
       autoFocus={isRegenerateRequested}
     />
   </div>;
   ```

**테스트:**

- StaleResultBanner: 버튼 라벨이 「새 버전 생성」 / `router.push` 호출 시 `?regenerate=open` 포함
- RegenerateAccordion: defaultOpen=true 시 첫 렌더부터 펼쳐짐 / autoFocus=true 시 textarea 포커스
- RoadmapResultClient: `?regenerate=open` 쿼리 시 RegenerateAccordion 펼친 채 렌더 + URL cleanup 호출

**재사용 자산:** `RegenerateAccordion` (props 확장), `RoadmapLoadingOverlay` (변경 없음), `useSearchParams`/`useRouter`

---

## 전체 완료 후

1. `npm run validate && npm run build` 통과 확인
2. **보고서 archive 이동 + 단독 커밋:**
   ```bash
   git mv docs/reports/2026-05-08-nielsen-heuristics-audit.md docs/reports/archive/
   git commit -m "docs: Nielsen 감사 보고서 아카이브 (5건 해결 완료)"
   ```
3. 푸쉬 + PR 생성 (제목: `fix: Nielsen 휴리스틱 5건 해결`)

## 롤백 시나리오

각 이슈는 단독 커밋이므로 단독 revert 가능. RegenerateAccordion props 확장(#5)만 결과 페이지 두 곳과 함께 처리되므로, 롤백 시 RegenerateAccordion + 결과 페이지 분기 + StaleResultBanner 세 커밋을 함께 revert.
