# Nielsen 10가지 휴리스틱 기반 UX/UI 감사 보고서

## 메타

- **조사일:** 2026-04-30
- **재점검일:** 2026-05-01 — 8개 항목을 코드 현황과 직접 대조하여 상태 라벨·라인 번호·잔여 작업을 갱신
- **조사 범위:** `src/app` 전 라우트 / `src/components` / `src/lib/services`
- **조사 방법:** Explore 에이전트 3대 병렬 — ① 공통 레이아웃·네비·글로벌 상태, ② 컨설턴트 워크플로우, ③ 운영자 영역 + 공통 페이지
- **선별 기준:** 총 18개 이슈 중 **impact × effort 기준으로 8개 critical 이슈만 선별** (한 세션 ≈ 3시간 내 클로드 코드로 해결 가능 분량)
- **현 상태 요약(2026-05-01):** 완전 해결 0건 · 부분 해결 3건(#2·#7·#8) · 미해결 5건(#1·#3·#4·#5·#6). 부분 해결 3건은 본질(확인 절차·노란 배너·풍부한 카드 본문)이 이미 충족돼 있어 잔여 디테일만 남음. 잔여 누적 작업 추정 약 4시간.
- **총평:** 본 시스템은 핵심 기능과 워크플로우가 안정적으로 구축되어 있고 상태 전이·역할 권한 등 도메인 로직 품질이 높다. 다만 **사용자가 시스템과 처음 마주치는 지점**(빈 화면, 에러 화면, 비가역 액션, 다중 검증 실패)에서의 안내·보호 장치가 일관되지 않다. 본 보고서가 짚는 8개 이슈는 모두 "사용자가 다음 액션을 즉시 알 수 있는가" 또는 "실수·장애에서 회복할 수 있는가"의 질문에 답을 제공하는 작업이며, 기존 자산(`EmptyState`, `AlertDialog`, `showSuccessToast` 등)을 재사용하면 최소 코드 변경으로 큰 체감 개선을 만들 수 있다.

---

## Nielsen 10가지 휴리스틱 (참조표)

| 번호 | 명칭 | 한 줄 정의 |
|---|---|---|
| H1 | 시스템 상태의 가시성 | 사용자가 지금 시스템이 무엇을 하는지 알 수 있어야 한다 |
| H2 | 시스템과 현실 세계의 일치 | 사용자가 쓰는 언어·개념과 시스템이 일치해야 한다 |
| H3 | 사용자 통제와 자유 | 실수했을 때 빠져나올 수 있는 비상구가 있어야 한다 |
| H4 | 일관성과 표준 | 같은 의미는 같은 방식으로 표현해야 한다 |
| H5 | 오류 예방 | 위험한 액션은 발생하지 않게 막는 것이 우선이다 |
| H6 | 회상보다 인식 | 기억에 의존하지 않고 화면이 보여주어야 한다 |
| H7 | 사용의 유연성과 효율성 | 숙련 사용자에게 가속기를 제공해야 한다 |
| H8 | 미적이고 최소한의 디자인 | 불필요한 정보는 제거해야 한다 |
| H9 | 오류 인식·진단·복구 | 오류를 명확히 알리고 해결 방법을 안내해야 한다 |
| H10 | 도움말과 문서화 | 필요할 때 발견할 수 있는 도움말이 있어야 한다 |

---

## 보고서 읽는 법 (5단 포맷 + 상태 라벨)

각 이슈는 다음 다섯 단으로 구성된다 — 그 위에 2026-05-01 재점검 결과를 한 줄 상태로 표기한다:

- **현 상태(2026-05-01):** ❌ 미해결 / 🟡 부분 해결 / ✅ 완전 해결
- 부분 해결인 경우 **잔여 작업** 항목으로 남은 디테일만 명시

5단 포맷:

1. **위치** — 메뉴 경로 + 파일 경로
2. **사용자 시나리오** — 어떤 페르소나가 어디서 어떻게 막히는가 (실제 동선)
3. **위배 원칙** — Nielsen 1~10 중 해당 번호와 명칭
4. **사용자 관점 개선 후** — 수정 시 사용자가 화면에서 보고 느끼게 될 변화
5. **개발자 구현 노트** — 파일·코드 변경 위치, 재사용 가능한 기존 자산

---

## CRITICAL 이슈 (우선순위 순)

### #1 [★★★★★ H9] Server Action Zod 검증 에러가 첫 번째 메시지만 표출됨

- **현 상태(2026-05-01):** ❌ 미해결 — `actions.ts` 4곳 모두 여전히 `errors[0].message`만 반환 (라인 **190·677·1017·1193**)
- **위치:** 컨설턴트 > 담당 프로젝트 > 인터뷰 작성 (로드맵·PBL 양식 모두)
  - `src/app/(dashboard)/consultant/projects/[id]/interview/actions.ts:190, 677, 1017, 1193` (4개 함수 분기)
- **사용자 시나리오:** 컨설턴트가 인터뷰를 작성하다 일부 필수 필드(예: 기업 현황·주요 문제·추진 의지)를 한 번에 빈 채로 "저장"을 누른다. 화면 우측 토스트에는 "기업 현황을 입력해주세요" 한 줄만 뜬다. 그 필드를 채우고 다시 저장 → 이번엔 "주요 문제를 입력해주세요". 또 채우고 저장 → "추진 의지…". 같은 행위가 3~4번 반복된다. "왜 한 번에 알려주지 않냐"는 불만과 함께 클라이언트 미팅 직전 시간을 허비한다.
- **위배 원칙:** **H9 오류 인식·진단·복구 지원**
- **사용자 관점 개선 후:** 한 번 저장만으로 비어 있는 모든 필수 필드가 토스트에 한꺼번에(최대 5개, 줄바꿈) 표시된다. 컨설턴트는 부족한 항목을 한 화면에서 모두 파악하고 한 번의 작성으로 저장을 끝낸다. 이미 클라이언트 측 `RoadmapInterviewClient.tsx`는 동일 패턴이 적용되어 있어 사용자는 "이전과 같은 톤"으로 일관되게 받아들인다.
- **개발자 구현 노트:** `RoadmapInterviewClient.tsx:330-333`이 이미 `errors.map(...).slice(0, 5)` 패턴을 사용하므로, `actions.ts` **4곳(190·677·1017·1193)** 모두 동일 로직으로 변경:

```ts
const messages = validation.error.errors
  .map(e => e.message)
  .filter(Boolean)
  .slice(0, 5);
return { success: false, error: messages.join('\n') };
```

---

### #2 [★★★★★ H5] 로드맵 최종 확정(FINAL) 액션에 확인 다이얼로그 없음

- **현 상태(2026-05-01):** 🟡 부분 해결 — `result-v2/RoadmapResultClient.tsx:162`에 `window.confirm("이 버전을 최종 확정하시겠습니까? 이전 확정본은 아카이브됩니다.")`이 적용돼 본질적 보호 장치는 존재. 다만 native `window.confirm`은 디자인 일관성·접근성·destructive variant 강조 면에서 B2B 도구에 부적합.
- **잔여 작업:** `window.confirm` 호출(라인 162) 제거 → shadcn `AlertDialog`(destructive variant)로 교체. 제목·설명·버튼 라벨은 아래 "사용자 관점 개선 후"의 문구 그대로 사용.
- **위치:** 컨설턴트 > 담당 프로젝트 > 로드맵 결과 > "최종 확정"
  - `src/app/(dashboard)/consultant/projects/[id]/roadmap/_components/result-v2/RoadmapResultClient.tsx:159-166` (handleFinalize 내 window.confirm)
- **사용자 시나리오:** 컨설턴트가 DRAFT 로드맵을 검토하다 마우스 휠로 스크롤하던 중 실수로 "최종 확정" 버튼을 클릭한다. 현재는 native window.confirm이 떠 OS별로 모양이 다르고 destructive 강조도 약하다. 정책상 역전이가 불가능해 (`ALLOWED_STATUS_TRANSITIONS[FINALIZED] = []`) 클릭 후에는 운영팀에 SOS를 요청해야 한다.
- **위배 원칙:** **H5 오류 예방**
- **사용자 관점 개선 후:** "최종 확정"을 클릭하면 화면 중앙에 본 시스템 톤의 모달이 떠오른다. 굵은 제목 **"로드맵을 최종 확정하시겠습니까?"**, 그 아래 설명 "확정 후에는 되돌릴 수 없으며, 프로젝트가 완료 상태로 전환됩니다." 두 버튼이 보인다 — 좌측 회색 "취소", 우측 빨간색 "최종 확정". 한 번 더 멈칫하게 만드는 시각적 신호로 실수 클릭이 차단된다.
- **개발자 구현 노트:** 기존 shadcn `AlertDialog` (`src/components/ui/alert-dialog.tsx`) 사용. 액션 버튼은 `destructive` variant. `RoadmapResultClient.tsx`에 다이얼로그 open state(`useState`) 추가하고 기존 `window.confirm` 라인 삭제 후 `AlertDialogAction.onClick` 에서 `await onFinalize(selectedVersion.id)` 호출.

---

### #3 [★★★★ H3] 인터뷰 작성 중 탭 닫으면 자동저장 미발화로 데이터 손실

- **현 상태(2026-05-01):** ❌ 미해결 — `RoadmapInterviewClient.tsx`에서 `beforeunload`/`onBeforeUnload` 등록 흔적 없음.
- **위치:** 컨설턴트 > 담당 프로젝트 > 인터뷰 입력
  - `src/app/(dashboard)/consultant/projects/[id]/interview/_components/roadmap/RoadmapInterviewClient.tsx`
- **사용자 시나리오:** 컨설턴트가 30분 동안 인터뷰 내용을 채워 넣었다. 슬랙 알림이 와서 다른 탭으로 이동, 정리 중 실수로 인터뷰 탭의 X를 클릭한다. 자동저장은 500ms 디바운싱 중이라 마지막 변경분이 발화되지 못한 상태다. 다시 들어가 보면 30분 작업물이 사라져 있다. 명시적 "저장" 버튼을 누른 적이 없으니 사용자는 "왜 사라졌지? 시스템이 안 먹은 건가?" 혼란에 빠진다.
- **위배 원칙:** **H3 사용자 통제와 자유**
- **사용자 관점 개선 후:**
  - ① 변경 후 저장이 끝나기 전에 탭 닫기·새로고침을 시도하면 브라우저 기본 경고 ("이 사이트를 떠나시겠습니까? 변경사항이 저장되지 않을 수 있습니다.") 가 떠 한 번 더 멈출 수 있다.
  - ② 화면 상단(StickyFormNav)에 "저장됨" / "저장 중…" / "변경사항 있음" 작은 배지가 항상 보여 컨설턴트는 자기 작업이 안전한 상태인지 즉시 확인할 수 있다.
- **개발자 구현 노트:** 더티 상태에서만 `beforeunload` 등록:

```ts
useEffect(() => {
  const handler = (e: BeforeUnloadEvent) => {
    if (JSON.stringify(data) !== lastSerializedRef.current) {
      e.preventDefault();
      e.returnValue = '';
    }
  };
  window.addEventListener('beforeunload', handler);
  return () => window.removeEventListener('beforeunload', handler);
}, [data]);
```

`StickyFormNav`에 기존 `saveState` 기반 배지 렌더링 추가 (`saveState` 변수 이미 존재).

---

### #4 [★★★★ H10] 빈 목록 화면이 "다음에 무엇을 할지" 안내하지 않음

- **현 상태(2026-05-01):** ❌ 미해결 — `ops/` 전 라우트에서 `EmptyState` 사용 0건. `UserManagementTable.tsx:369·382`은 "등록된 사용자가 없습니다" 텍스트만.
- **위치:** 운영관리 > 사용자 관리 / 템플릿 관리 / 프로젝트 관리
  - `src/components/ops/UserManagementTable.tsx:369, 382` (현재 텍스트만)
  - `src/app/(dashboard)/ops/templates/_components/TemplateList.tsx:256-262`
  - `src/app/(dashboard)/ops/projects/_components/ProjectList.tsx`
- **사용자 시나리오:** 신규 운영자가 인수인계 첫날 "운영관리 > 프로젝트 관리"에 들어왔다. 화면에는 "등록된 프로젝트가 없습니다"라는 한 줄 텍스트만 보인다. 옆에 "+" 버튼이 있는지 페이지 상단을 두리번거리고, 사이드바를 클릭해 다른 메뉴를 헤맨다. 결국 인수인계 매뉴얼을 열어 "프로젝트는 어떻게 생성하나요?"부터 다시 확인한다.
- **위배 원칙:** **H10 도움말과 문서화**
- **사용자 관점 개선 후:** 빈 화면 한가운데에 큰 폴더 아이콘 + 제목 "등록된 프로젝트가 없습니다" + 설명 "새 프로젝트를 생성하여 컨설턴트를 배정하세요" + 강조된 파란색 버튼 **"+ 새 프로젝트 생성"** 이 표시된다. 운영자는 매뉴얼을 열지 않아도 한 번의 클릭으로 다음 단계로 이동한다. 사용자 관리·템플릿 관리에도 동일한 패턴이 적용되어 학습 비용이 사라진다.
- **개발자 구현 노트:** 기존 `src/components/ui/EmptyState.tsx` (`icon`/`title`/`description`/`action` prop 보유) 를 3개 라우트에 통일 적용. 각 라우트별 액션 버튼 라벨은 "새 프로젝트 생성" / "사용자 추가" / "새 템플릿 생성".

---

### #5 [★★★★ H1·H8] 글로벌 error.tsx 에러 바운더리 부재

- **현 상태(2026-05-01):** ❌ 미해결 — `src/app/(dashboard)/` 하위 `error.tsx` 파일 부재.
- **위치:** `src/app/(dashboard)/error.tsx` (생성 대상)
- **사용자 시나리오:** 사용자가 어느 메뉴에서 작업하던 중 갑자기 흰 화면 또는 영문 메시지 "Application error: a client-side exception has occurred"가 뜬다. 일반 컨설턴트·운영자는 무슨 의미인지 모르고 새로고침을 반복하거나, 사이드바를 통해 다른 페이지로 빠져나간다. 시스템 신뢰도가 하락하고, 같은 페이지를 다시 시도해야 할지 운영팀에 보고해야 할지 판단할 단서가 없다.
- **위배 원칙:** **H1 시스템 상태의 가시성, H8 미적·최소 디자인**
- **사용자 관점 개선 후:** 동일 상황에서 친절한 한글 안내 화면이 표시된다 — 가벼운 일러스트 또는 경고 아이콘 + "일시적인 오류가 발생했습니다" 제목 + (가능 시) 짧은 원인 한 줄 + 큰 **"다시 시도"** 버튼. 클릭 한 번으로 페이지가 재시도된다. 사용자는 "이건 일시 오류이고, 내가 다시 누르면 되는구나"를 즉시 인지한다.
- **개발자 구현 노트:** `src/app/(dashboard)/error.tsx` 신규 생성 (Client Component, `'use client'`):

```tsx
'use client';
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <h2>일시적인 오류가 발생했습니다</h2>
      <p className="text-muted-foreground">{error.message}</p>
      <Button onClick={reset}>다시 시도</Button>
    </div>
  );
}
```

---

### #6 [★★★ H1·H10] 운영자 페이지에서 DB 쿼리 실패 시 화면이 그냥 비어 보임

- **현 상태(2026-05-01):** ❌ 미해결 — `ops/users/page.tsx:60-65`에서 `usersError`·`profilesError`를 `console.error`만 호출, 사용자 화면에 미전달.
- **위치:** 운영관리 > 사용자 관리
  - `src/app/(dashboard)/ops/users/page.tsx:60-65`
- **사용자 시나리오:** 운영자가 "사용자 관리"에 들어왔는데 사용자 목록이 텅 비어 있다. 진짜 0명인지(시스템 초기 상태), 아니면 DB·권한 오류인지 구분할 수 없다. 새로고침을 3~4번 반복하다 결국 IT팀에 "사용자 목록이 안 보여요"라고 문의 티켓을 올린다. 알고 보니 일시적 DB 연결 지연이었다.
- **위배 원칙:** **H1 시스템 상태 가시성, H10 도움말**
- **사용자 관점 개선 후:** 같은 상황에서 빈 테이블 대신 경고 아이콘 + "사용자 데이터를 불러올 수 없습니다" 제목 + "잠시 후 다시 시도해주세요" 설명 + **"다시 시도"** 버튼이 카드 형태로 표시된다. 운영자는 "이건 시스템 오류이고, 잠시 후 다시 시도하면 된다"를 즉시 인지하고, 불필요한 IT 문의 없이 30초 후 한 번 더 시도한다.
- **개발자 구현 노트:** 에러 분기에서 인라인 알림:

```tsx
if (usersError || profilesError) {
  return (
    <EmptyState
      icon={<AlertTriangle />}
      title="사용자 데이터를 불러올 수 없습니다"
      description="잠시 후 다시 시도해주세요"
      action={<RefreshButton />}
    />
  );
}
```

(재사용: `src/components/ui/EmptyState.tsx`)

---

### #7 [★★★ H2] 인터뷰 필드 직접 편집 후 로드맵에 즉시 반영되지 않음을 사용자가 인지하기 어려움

- **현 상태(2026-05-01):** 🟡 부분 해결 — ② StaleResultBanner는 이미 충족(`StaleResultBanner.tsx`: amber-50 노란 배경 + AlertTriangle 아이콘 + "결과 재생성하기" CTA + 닫기 버튼). ① 편집 성공 토스트 강화는 미적용.
- **잔여 작업:** ① 편집 성공 토스트만 추가. `InterviewReviewClient.tsx`의 `editInterviewFieldRoadmap` 호출 부(라인 470·501·534)에서 현재 실패 분기(`if (!result.success)`)만 토스트를 띄우고 있음 → success 분기에 `showSuccessToast('수정되었습니다', "결과 탭에서 '다시 생성' 버튼을 눌러야 반영됩니다")` 추가.
- **위치:** 컨설턴트 > 담당 프로젝트 > 인터뷰 검토 / 로드맵 결과
  - `src/app/(dashboard)/consultant/projects/[id]/interview/review/InterviewReviewClient.tsx:470, 501, 534` (편집 성공 토스트 추가 대상)
  - `src/app/(dashboard)/consultant/projects/[id]/interview/review/_components/StaleResultBanner.tsx` (이미 충족)
- **사용자 시나리오:** 컨설턴트가 인터뷰 검토 페이지에서 "기업 현황" 필드의 오타를 고치고 저장한다. 현재는 성공 시 별도 토스트가 없어 변경 사실은 알지만 "결과 탭에 자동 반영되는가, 다시 생성을 눌러야 하는가"가 불명확하다. 결과 탭에 가면 amber 배너가 안내해주지만, 검토 페이지에서 편집한 직후의 즉시성 안내가 부족하다.
- **위배 원칙:** **H2 시스템과 현실 세계의 일치**
- **사용자 관점 개선 후:**
  - ① 필드 편집 성공 시 토스트가 두 줄로 표시된다 — 위에 "수정되었습니다", 아래에 "결과 탭에서 '다시 생성' 버튼을 눌러야 반영됩니다".
  - ② 결과 탭 상단의 노란 배너(이미 적용됨)와 합쳐, 사용자는 두 위치 모두에서 다음 액션을 명확히 인지하고, 더는 헤매지 않는다.
- **개발자 구현 노트:** `InterviewReviewClient.tsx`의 `InlineEditField` 래퍼 3곳(`CompanyReqRow`/`TargetTaskRow`/이름 없는 일반 행)의 `handleSave` 함수에서 `result.success === true` 분기에 `showSuccessToast(title, description)` 추가 (`src/lib/utils/toast.ts`).

---

### #8 [★★★ H10] 승인 대기(USER_PENDING) 사용자에게 다음 단계·예상 시간이 불명확

- **현 상태(2026-05-01):** 🟡 부분 해결 — ① `PendingApprovalCard.tsx` 본문은 이미 풍부 (영업일 기준 2~3일 안내 배지·진행 4단계 시각화·도움말 카드의 운영팀 메일/전화·컨설턴트용 "프로필 수정" 버튼). ② Navigation 비활성 아이콘 툴팁은 미적용.
- **잔여 작업:** ② Navigation 측만 — `Navigation.tsx`의 `isApprovedUser === false` 분기에서 메시지·알림 아이콘이 그냥 숨겨짐. 동일 자리에 disabled 톤 아이콘을 렌더하고 shadcn `Tooltip`으로 "승인 후 사용 가능" 라벨 부착.
- **위치:**
  - `src/components/PendingApprovalCard.tsx` (이미 충족)
  - `src/components/Navigation.tsx:208-210, 240~330` (헤더 우측 아이콘 노출 분기 — 비활성 자리 처리 대상)
- **사용자 시나리오:** 신규 회원이 가입 후 로그인하면 풍부한 PendingApprovalCard로 안내 받지만, 헤더 우측의 알림·메시지 아이콘이 그냥 사라져 있어 "내 계정에 문제가 있나? 가입이 잘못된 건가?" 불안감이 든다. 카드 안내와 헤더 비대칭이 일관성을 깨뜨린다.
- **위배 원칙:** **H10 도움말과 문서화**
- **사용자 관점 개선 후:** 헤더 자리에 회색 톤 알림·메시지 아이콘이 그대로 표시되되, 마우스를 올리면 툴팁 "승인 후 이용 가능합니다"가 뜬다. 사용자는 "내가 못 보는 영역이 아니라, 승인되면 활성화될 자리"임을 즉시 이해한다.
- **개발자 구현 노트:** `Navigation.tsx`에서 `isApprovedUser` 조건부 렌더 부분(약 라인 240~330 사이 헤더 우측 아이콘 영역)을 확장. 비활성 분기에서 `<Tooltip>`(shadcn)로 disabled 아이콘을 래핑하고 라벨을 "승인 후 사용 가능"으로 지정. PendingApprovalCard는 변경 없음.

---

## 한 세션 작업 권장 순서 (2026-05-01 잔여 작업 기준)

추정 총 잔여 작업 시간 **약 4시간**. 의존성 적은 것·빠른 차단 효과부터:

| 순서 | 이슈 | 추정 | 비고 |
|---|---|---|---|
| 1 | #2 window.confirm → AlertDialog 교체 | 20분 | shadcn AlertDialog로 디자인·접근성 정상화 |
| 2 | #1 Zod 다중 메시지 | 60분 | actions.ts **4곳**(190·677·1017·1193) 일괄 수정 + 단위 테스트 |
| 3 | #5 글로벌 error.tsx | 30분 | 단일 파일 신규 |
| 4 | #4 빈 목록 EmptyState 통일 | 45분 | 3개 라우트 |
| 5 | #6 운영자 DB 에러 인라인 표시 | 30분 | 단일 파일 |
| 6 | #3 beforeunload + 저장 상태 배지 | 30분 | 단일 컴포넌트 |
| 7 | #7 편집 성공 토스트 두 줄 (① 잔여) | 10분 | InterviewReviewClient handleSave success 분기 3곳 |
| 8 | #8 Navigation 비활성 아이콘 Tooltip (② 잔여) | 15분 | shadcn Tooltip 래핑 |

---

## 재사용 가능한 기존 자산

| 자산 | 경로 | 본 보고서 활용 |
|---|---|---|
| `EmptyState` | `src/components/ui/EmptyState.tsx` | #4·#6 빈 상태/오류 표시 |
| `AlertDialog` | `src/components/ui/alert-dialog.tsx` | #2 비가역 액션 확인 (window.confirm 대체) |
| `Tooltip` (shadcn) | `src/components/ui/tooltip.tsx` | #8 Navigation 비활성 아이콘 라벨 |
| `PageSkeleton` | `src/components/layout/PageSkeleton.tsx` | (참고) 로딩 일관성 |
| `showSuccessToast` 등 | `src/lib/utils/toast.ts` | #1·#7 토스트 표준화 |
| `ActionResult` | `src/lib/types/action-result.ts` | #1 Server Action 반환 타입 |
| `FilterBadge` | `src/app/(dashboard)/ops/projects/_components/ProjectList.tsx:52-69` | (확장 후보) 검색 필터 시각화 |

---

## 검증 체크리스트 (2026-05-01 잔여 작업 기준)

구현 세션 종료 시 다음을 모두 만족해야 한다:

- [ ] `npm run validate` (typecheck + lint + test) 통과
- [ ] `npm run build` 통과
- [ ] **#1**: 인터뷰 폼에서 필수 필드 3개 이상 비우고 저장 → 토스트에 모든 누락 필드명이 줄바꿈으로 표시되는지 수동 확인 (4곳 함수 모두)
- [ ] **#2**: 로드맵 결과 페이지에서 "최종 확정" 클릭 → shadcn AlertDialog(destructive)가 노출, 기존 `window.confirm`은 더는 호출되지 않는지 확인 / "취소" 클릭 시 상태 미변경
- [ ] **#3**: 인터뷰 입력 후 즉시 탭 닫기 시도 → 브라우저 경고 노출 / 저장 완료 후엔 경고 미노출 / StickyFormNav에 저장 상태 배지 노출
- [ ] **#4**: 운영관리 3개 메뉴 빈 상태에서 EmptyState + action 버튼 노출 확인
- [ ] **#5**: 의도적 throw로 `error.tsx` 트리거 → 한글 안내 + "다시 시도" 버튼 동작 확인
- [ ] **#6**: 잘못된 쿼리 흐름으로 `usersError` 발생 → 인라인 알림 노출 확인
- [ ] **#7 (잔여 ①)**: 인터뷰 검토 페이지에서 필드 편집 후 → success 토스트 두 줄("수정되었습니다 / 결과 탭에서 '다시 생성' 버튼을 눌러야 반영됩니다") 노출 확인 (배너는 이미 충족 — 회귀 확인만)
- [ ] **#8 (잔여 ②)**: USER_PENDING 계정으로 로그인 → 헤더 비활성 알림·메시지 아이콘 위 hover 시 "승인 후 사용 가능" 툴팁 노출 확인 (PendingApprovalCard 본문은 이미 충족 — 회귀 확인만)

---

## 범위 외 (Out of Scope)

다음은 본 조사에서 발견됐지만 한 세션 분량 초과 또는 별도 정책 결정이 필요해 본 보고서에서 제외:

- **운영자 일괄 처리(체크박스 다중 선택)** — UX 분량이 크고 RLS 정책 영향 검토 필요
- **템플릿 "활성 vs 비활성" 용어 통일** — KPC 사내 용어 정책 확인 필요
- **검색·필터 활성 상태 칩 통합** — `FilterBadge` 확장 별도 작업
- **모바일 네비 드롭다운 미세 일관성** — 이미 모바일 Batch 0~6 종료 후의 잔무
- **HWPX 다운로드 에러 메시지 구체화** — 서버 측 에러 카테고리 정의 필요
- **페이지 로딩 스켈레톤 일관성** — `PageSkeleton` 전 라우트 적용 별도 sweep
