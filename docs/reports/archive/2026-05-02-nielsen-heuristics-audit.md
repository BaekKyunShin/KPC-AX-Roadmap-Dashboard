# Nielsen 10가지 휴리스틱 기반 UX/UI 감사 보고서

## 메타

- **조사일:** 2026-05-02
- **조사 범위:** 전체 라우트 (`src/app/(dashboard)`, `src/app/(auth)`, `src/components`) — 컨설턴트·운영자·공통 영역 전수 감사
- **조사 방법:** Explore 에이전트 3대 병렬(공통 레이아웃/컨설턴트/운영자) → 메인 세션에서 코드 직접 검증·라인 번호 확정 → 5단 포맷 정리
- **이전 결과 반영:** 2026-04-30 보고서의 8개 critical 이슈는 PR #50(`3172189 feat(ux)`) · #51(`ba4a0b3 chore`)로 모두 ✅ 해결 완료. 본 보고서는 그 외 신규 결함만 다룸
- **선별 기준:** impact × effort 기준으로 5개 critical 이슈만 선별 (한 세션 ≈ 3시간 내 해결 분량)
- **총평:** PR #50으로 첫 마주침 지점(빈 화면·에러·확인 다이얼로그·승인 안내)이 정비되면서 시스템의 1차 결함은 해소됐다. 그러나 **반복 작업 효율성**(운영자가 다수 사용자·메시지를 다룰 때)과 **동시성·실패 복구의 정합성**(자동저장 실패 후 제출 차단·InlineEdit lost update)에서 본질적 결함이 남아 있다. 본 보고서 5개 이슈는 모두 "사용자가 같은 작업을 두세 번 반복하거나, 시스템의 실패 신호와 다음 액션 가능성이 어긋난다"는 한 축에 모인다. 기존 자산(`ProjectList`의 검색·필터·페이지네이션, `NewConversationDialog`의 검색 패턴)을 재사용하면 최소 코드 변경으로 큰 체감 개선이 가능하다.

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

## 보고서 읽는 법 (5단 포맷)

각 이슈는 다음 다섯 단으로 구성된다 — 어느 항목도 비우지 않는다:

1. **위치** — 메뉴 경로 + 파일 경로(라인 번호)
2. **사용자 시나리오** — 어떤 페르소나가 어떤 동선에서 무엇을 체감하는가 (개발자 용어 금지)
3. **위배 원칙** — Nielsen H1~H10 중 해당 번호와 명칭
4. **사용자 관점 개선 후** — 화면·문구·플로우의 변화를 실제 노출될 라벨까지 포함해 묘사
5. **개발자 구현 노트** — 변경 위치, 재사용 가능 자산 경로, 짧은 코드 예시

---

## CRITICAL 이슈 (우선순위 순)

### #1 [★★★★ H6·H7] 운영자 사용자 관리 화면에 검색·필터·정렬·페이지네이션이 모두 없음

- **위치:** 운영관리 > 사용자 관리
  - `src/components/ops/UserManagementTable.tsx` (536줄 — `filter`/`search`/`sort`/`page` 키워드 0건)
  - `src/app/(dashboard)/ops/users/page.tsx:104` (단일 배열을 그대로 props로 전달)
- **사용자 시나리오:** 운영관리자가 "사용자 관리"에 들어가 특정 컨설턴트(예: "박○○")의 승인 상태를 확인·변경하려 한다. 화면에는 가입 순으로 정렬된 50~200명의 사용자 목록이 한 페이지에 그대로 펼쳐져 있다. 검색창·역할 필터·상태 필터·페이지 번호가 전혀 없어, 운영자는 마우스 휠로 페이지를 끝까지 스크롤하며 이름을 눈으로 찾는다. 같은 시스템의 "프로젝트 관리"에는 검색·상태·업종 필터가 깔끔히 있고 페이지당 10건씩 분할돼 있어, **같은 운영관리자가 두 화면을 오갈 때마다 "왜 여긴 검색이 없지?"** 학습 부하가 생긴다.
- **위배 원칙:** **H6 회상보다 인식, H7 사용의 유연성과 효율성**
- **사용자 관점 개선 후:** 화면 상단에 가로 검색창("이름·이메일·전화번호로 검색")과 두 개의 셀렉트("역할: 전체/컨설턴트/컨설턴트(승인대기)/운영관리자"·"상태: 전체/활성/정지")가 자리 잡는다. 활성화된 필터는 그 아래에 회색 칩(`이름: 박○○ ✕`, `역할: 승인대기 ✕`)으로 보여 한 번에 끄거나 좁힐 수 있다. 하단에는 "1 2 3 … 12" 페이지 번호와 "총 187명 중 11~20" 캡션이 있다. 운영관리자는 단 두 클릭으로 "승인 대기 컨설턴트"만 추려 일괄 승인 작업으로 들어간다. 프로젝트 관리 화면과 동일한 톤이 유지돼 학습 부하가 사라진다.
- **개발자 구현 노트:** 신규 컴포넌트 작성 대신 `src/app/(dashboard)/ops/projects/_components/ProjectList.tsx:1-90, 142-340`의 패턴(URLSearchParams 기반 `search`·`status`·페이지네이션 + `FilterBadge`)을 그대로 차용. `useDebounce` 훅(`src/hooks/useDebounce.ts`)·`Pagination` 패턴 재사용. `UserManagementTable.tsx`를 client wrapper로 감싸 검색·필터 state를 갖게 하거나, 페이지 단계에서 SSR 필터링하도록 `page.tsx:104`의 `managedUsers`를 `searchParams` 기반으로 좁힌다. 검색 컬럼 후보: `name`, `email`, `phone` (`UserWithProfile` 타입). 정렬은 헤더 클릭 → 가입일/이름.

---

### #2 [★★★★ H5] 자동저장 실패(`saveState='error'`) 상태에서도 "최종 제출" 버튼이 활성화돼 있음

- **위치:** 컨설턴트 > 담당 프로젝트 > 인터뷰 작성 (로드맵 양식)
  - `src/app/(dashboard)/consultant/projects/[id]/interview/_components/roadmap/RoadmapInterviewClient.tsx:139-261, 525-543`
  - 동일 패턴이 PBL 양식 `PblInterviewClient.tsx`에도 존재할 가능성 높음 (확인 후 동일 적용)
- **사용자 시나리오:** 컨설턴트가 8단계 인터뷰를 채우다 어느 단계에서 자동저장이 실패한다(네트워크 일시 단절·서버 5xx). 화면 하단 StickyFormNav에 "저장 실패"가 빨간 톤으로 뜨고 토스트도 한 번 노출됐다. 그러나 사용자는 빠르게 마지막 단계까지 입력을 마치고 "최종 제출"을 누른다 — 버튼이 회색이 아닌 활성 상태이기 때문이다. 제출 자체는 성공할 수 있으나, "저장 실패였는데 제출은 됐다고? 그럼 저장 실패 메시지는 뭐였지?" 인지 부조화가 발생한다. 더 위험한 것은 자동저장 실패 후 페이지를 새로고침했을 때 마지막 디바운싱 변경분이 서버에 없어 일부 데이터가 사라질 수 있다는 점이다.
- **위배 원칙:** **H5 오류 예방**
- **사용자 관점 개선 후:** 자동저장이 실패한 동안 "최종 제출" 버튼은 회색·비활성으로 잠긴다. 마우스를 올리면 툴팁 **"자동 저장이 실패했습니다. '저장' 버튼으로 다시 저장한 뒤 제출해주세요"**가 뜬다. 헤더 우측 saveIndicator는 "저장 실패 — 다시 시도" 버튼을 동반하며, 한 번 클릭으로 즉시 재저장이 시도된다. 성공으로 전환되면 "최종 제출"이 다시 활성화된다. 사용자는 "저장 실패 → 제출 차단 → 재저장 → 제출"이라는 인과를 시각적으로 인지한다.
- **개발자 구현 노트:** `RoadmapInterviewClient.tsx:539`의 disabled 조건 한 줄 수정:

```ts
// 기존
disabled: isPending || isSubmitting,
// 변경
disabled: isPending || isSubmitting || saveState === 'error',
```

추가로 `StickyFormNav`에 saveState='error'에서만 노출되는 "다시 저장" 보조 버튼 추가 (기존 `handleSave` 재호출). PBL 양식 `PblInterviewClient.tsx`에도 동일 패턴 적용. shadcn `Tooltip`(`src/components/ui/tooltip.tsx`)으로 비활성 사유 라벨 부착.

---

### #3 [★★★★ H7] 메시지 대화 목록에 검색·일괄 읽음·필터링이 모두 없음

- **위치:** 공통 대시보드 > 메시지
  - `src/app/(dashboard)/dashboard/messages/_components/ConversationList.tsx:1-178` (검색 input·markAllAsRead 호출 0건)
  - 비교군: 같은 모듈 `NewConversationDialog.tsx:41, 100-120`은 사용자 검색 패턴이 이미 구현돼 있음
- **사용자 시나리오:** 컨설턴트가 며칠 만에 시스템에 들어와 메시지 탭을 연다. 좌측에 30개 이상의 대화가 가입 시점·최근 메시지 순으로 길게 늘어서 있고, 그중 12개에는 안읽음 도트가 붙어 있다. 특정 운영관리자(예: "김○○")와의 대화를 찾으려면 마우스 휠로 끝까지 스크롤한다. 안읽음 12건을 모두 정리하려면 대화를 하나씩 클릭해 자동 읽음 처리를 기다려야 한다 — 같은 시스템의 알림 드롭다운에는 "모두 읽음" 버튼이 있는데 메시지에는 없다(불일관). NotificationBell의 정보 효율성이 메시지 모듈에는 적용되지 않은 셈이다.
- **위배 원칙:** **H7 사용자의 유연성과 효율성**
- **사용자 관점 개선 후:** ConversationList 상단에 "이름으로 대화 검색…" 입력창과 "안읽음만" 토글 칩이 추가된다. 우측 상단에는 알림 드롭다운과 동일한 톤의 **"모두 읽음"** 버튼이 등장 — 클릭 시 토스트 "12개 대화를 모두 읽음 처리했습니다". 컨설턴트는 한 번의 입력·한 번의 클릭으로 30초 → 3초로 단축된 정리를 끝낸다. NotificationBell·NewConversationDialog·ConversationList가 같은 톤으로 묶여 일관성이 회복된다.
- **개발자 구현 노트:** `ConversationList.tsx`에 `useState('')` 기반 검색 input + `conversations.filter(c => c.other_user.name.includes(query))` (NewConversationDialog.tsx:88 패턴 재사용). 일괄 읽음은 `src/app/(dashboard)/dashboard/messages/actions.ts`에 신규 Server Action `markAllConversationsRead` 추가 — `markAllNotificationsRead`(`notifications/actions.ts:133`) 골격 그대로 차용. NotificationBell의 "모두 읽음" UI 패턴(`src/components/NotificationBell.tsx`) 그대로 재사용. 기존 `Realtime` 구독은 영향 없음 (단순 SELECT/UPDATE 추가).

---

### #4 [★★★ H5·H3] 인터뷰 검토 페이지 InlineEdit이 동시 편집(두 탭) 시 기존 변경분을 덮어씀 (Lost Update)

- **위치:** 컨설턴트 > 담당 프로젝트 > 인터뷰 검토
  - `src/app/(dashboard)/consultant/projects/[id]/interview/review/InterviewReviewClient.tsx:491-524` (`CompanyReqRow.handleSave` — `base` prop 사용)
  - `src/app/(dashboard)/consultant/projects/[id]/interview/review/InterviewReviewClient.tsx:526-600` (`TargetTaskRow` 동일 패턴)
  - 서버: `src/app/(dashboard)/consultant/projects/[id]/interview/actions.ts` (`editInterviewFieldRoadmap` — version·timestamp 검증 없음)
- **사용자 시나리오:** 컨설턴트가 인터뷰 검토 페이지를 두 탭으로 열어둔다(흔한 작업 방식 — 하나는 본문 참조, 하나는 편집). 탭A에서 "기업 요구분석 > 현재 상태" 필드를 수정·저장한다. 잠시 후 탭B에서 같은 섹션의 "주요 문제" 필드를 수정·저장한다. 페이지를 새로고침해 보면 탭A의 "현재 상태" 변경분이 사라져 있다. 원인은 탭B의 `base` prop이 SSR 시점의 옛 스냅샷이고, 저장 시 `{ ...base, problem: next }` 형태로 전체 객체를 덮어쓰기 때문이다. 사용자는 "분명 저장 토스트가 떴는데?" 혼란에 빠진다.
- **위배 원칙:** **H5 오류 예방, H3 사용자 통제와 자유**
- **사용자 관점 개선 후:** ① 단기 (저비용 안전장치): 저장 직후 응답에 최신 객체를 받아 부모 state를 갱신해 다음 편집의 `base`가 항상 최신이 되게 한다. 한 탭 안에서 연속 편집할 때의 lost update가 차단된다. ② 중기: 서버에서 `companyRequirements` 같은 group 필드를 통째로 덮어쓰는 대신 변경된 키만 부분 머지한다(`{ companyRequirements: { problem: next } }` → 서버에서 `jsonb_set` 또는 `{ ...current, ...partial }`). ③ 장기: 같은 사용자가 두 탭에서 같은 프로젝트를 열고 있을 때 헤더에 회색 안내 띠 **"이 인터뷰는 다른 탭에서 열려 있습니다. 변경사항이 충돌할 수 있습니다."**를 노출. 사용자는 충돌 가능성을 즉시 인지하고 한 탭만 사용한다.
- **개발자 구현 노트:** 핵심은 ②의 서버 부분 머지. `editInterviewFieldRoadmap`의 group 필드 분기에서 기존 row 조회 후 `{ ...existing.companyRequirements, ...partial }` 적용. 또는 마이그레이션 한 줄로 `jsonb_set` 사용. 클라이언트 변경은 `CompanyReqRow.handleSave`에서 `editInterviewFieldRoadmap(projectId, { companyRequirements: { [field]: next } })`처럼 변경된 키만 보내도록 단순화. 단기 ①은 `InlineEditField.onSave` 콜백에서 부모의 setter를 호출해 `base`를 갱신.

---

### #5 [★★★ H10] 회원가입 비밀번호 정책이 사전 안내되지 않아 입력 후에야 거절당함

- **위치:** 회원가입 (Step 1 비밀번호 입력)
  - `src/app/(auth)/register/page.tsx:547-553` (라벨 "비밀번호" 옆 헬퍼 텍스트 부재)
  - 검증 위치: `src/lib/schemas/user.ts`의 `registerSchema` (요구사항 정의됨)
- **사용자 시나리오:** 신규 컨설턴트가 가입을 시작한다. 비밀번호 입력란 라벨은 "비밀번호 *" 한 줄뿐 — 몇 자 이상인지, 어떤 문자 종류가 필수인지 어떤 단서도 없다. 사용자는 평소 쓰는 짧은 비밀번호("kpc123")를 입력하고 "다음"을 누른다. 그러자 빨간 에러 "비밀번호는 최소 8자 이상이어야 합니다"가 뜬다. 길이를 늘려 "kpckpckp" 입력 → "비밀번호에 숫자가 포함되어야 합니다". 또 수정 → 통과. 정책을 한 번에 알았다면 첫 시도에 끝났을 일이 2~3번 시도로 늘어난다. 가입 첫인상이 "왜 미리 안 알려주지?"로 남는다.
- **위배 원칙:** **H10 도움말과 문서화**
- **사용자 관점 개선 후:** 비밀번호 입력란 바로 아래 회색 헬퍼 텍스트 한 줄: **"8자 이상, 영문자와 숫자 포함"**. 입력 중에는 같은 위치의 체크리스트가 실시간 갱신된다 — 충족 항목은 초록 ✓, 미충족은 회색 원. 3가지 항목(8자 이상 / 영문자 포함 / 숫자 포함)이 모두 ✓로 바뀌면 사용자는 "다 채웠다"는 시각 피드백을 받고 한 번에 다음 단계로 넘어간다.
- **개발자 구현 노트:** `register/page.tsx:547-553`의 `<Label>` 아래에 `<p className="text-xs text-muted-foreground">` 한 줄 추가. 실시간 체크리스트는 `registerSchema`의 실제 정책 3가지(`length>=8`, `/[a-zA-Z]/`, `/[0-9]/`)를 useMemo로 계산해 ✓/원 아이콘으로 표시. `passwordSchema`(`src/lib/schemas/user.ts:28-32`)의 정규식을 그대로 참조해 클라/서버 정책 일치 보장 — 대소문자 구분이나 특수문자는 요구사항이 아니므로 헬퍼 텍스트에도 포함하지 않는다.

---

## 한 세션 작업 권장 순서

추정 총 작업 시간 **약 3시간**. 의존성 적은 것·즉시 차단 효과부터:

| 순서 | 이슈 | 추정 | 비고 |
|---|---|---|---|
| 1 | #2 자동저장 'error' 상태에서 제출 차단 | 15분 | disabled 조건 한 줄 + Tooltip |
| 2 | #5 비밀번호 정책 헬퍼 텍스트·실시간 체크리스트 | 15분 | 단일 컴포넌트 |
| 3 | #4 InlineEdit 부분 머지(서버) + base 갱신(클라이언트) | 45분 | actions.ts 분기 + InlineEditField onSave 흐름 |
| 4 | #3 메시지 검색·"모두 읽음" + 안읽음만 필터 | 45분 | NewConversationDialog 패턴 + markAllNotificationsRead 골격 차용 |
| 5 | #1 사용자 관리 검색·필터·페이지네이션 | 60분 | ProjectList 패턴 그대로 이식 (FilterBadge 포함) |

---

## 재사용 가능한 기존 자산

| 자산 | 경로 | 본 보고서 활용 |
|---|---|---|
| `ProjectList` 검색·필터·페이지네이션 패턴 | `src/app/(dashboard)/ops/projects/_components/ProjectList.tsx:142-340` | #1 사용자 관리에 그대로 이식 |
| `FilterBadge` | `src/app/(dashboard)/ops/projects/_components/ProjectList.tsx:54-71` | #1 활성 필터 시각화 |
| `useDebounce` | `src/hooks/useDebounce.ts` | #1 검색 디바운싱 |
| `markAllNotificationsRead` | `src/app/(dashboard)/notifications/actions.ts:133-155` | #3 메시지 일괄 읽음의 골격 |
| `NotificationBell` "모두 읽음" UI | `src/components/NotificationBell.tsx` | #3 일괄 읽음 버튼 톤·동선 |
| `NewConversationDialog` 검색 | `src/app/(dashboard)/dashboard/messages/_components/NewConversationDialog.tsx:41, 100-120` | #3 대화 검색 패턴 |
| `Tooltip` (shadcn) | `src/components/ui/tooltip.tsx` | #2 비활성 사유 라벨 |
| `EmptyState` | `src/components/ui/EmptyState.tsx` | #1·#3 검색 결과 없음 표시 |
| `showSuccessToast`·`showErrorToast` | `src/lib/utils/toast.ts` | #3·#5 표준 토스트 |
| `ActionResult` | `src/lib/types/action-result.ts` | #3·#4 Server Action 반환 타입 |

---

## 검증 체크리스트

구현 세션 종료 시 다음을 모두 만족해야 한다:

- [ ] `npm run validate` (typecheck + lint + test) 통과
- [ ] `npm run build` 통과
- [ ] **#1**: 운영관리 > 사용자 관리에서 검색어 입력 시 디바운싱 후 결과 좁혀짐 / 역할·상태 셀렉트 변경 시 즉시 반영 / 활성 필터 칩 ✕ 클릭 시 해제 / 페이지 1·2 전환 시 URL `?page=` 갱신
- [ ] **#2**: 인터뷰 작성 도중 네트워크 차단으로 자동저장 실패 → "최종 제출" 버튼 비활성·tooltip 노출 / 다시 저장 성공 시 활성화 복귀
- [ ] **#3**: 메시지 대화 목록에서 이름 일부 입력 시 결과 필터링 / "안읽음만" 토글 동작 / "모두 읽음" 클릭 시 모든 도트 사라지고 토스트 노출
- [ ] **#4**: 두 탭에서 같은 인터뷰 검토 페이지 열고 각 탭에서 다른 필드 수정·저장 → 새로고침 후 두 변경분 모두 보존됨
- [ ] **#5**: 회원가입 Step 1 비밀번호 입력 중 정책 3가지(8자 이상·영문자·숫자) 체크리스트가 실시간으로 ✓/원 전환 / 모두 충족 시 "다음" 활성화 / 헬퍼 문구 "8자 이상, 영문자와 숫자 포함"이 라벨 아래에 항상 노출

---

## 범위 외 (Out of Scope)

다음은 본 조사에서 발견됐지만 한 세션 분량 초과 또는 별도 정책 결정이 필요해 본 보고서에서 제외:

- **사용자 관리 일괄 처리(체크박스 다중 승인·정지)** — RLS·감사로그 정책 검토 필요, #1 검색·필터 도입 후 별도 epic으로 분리
- **알림 별도 페이지(전체 보기·필터·기간 검색)** — 현재 NotificationBell 드롭다운 + actions.ts만 존재. 100건 이상 누적 시 풀페이지 필요
- **InlineEdit 동시 편집 알림 띠** — #4 ③안. WebSocket·Realtime presence 설계 필요
- **테이블 전반의 정렬 헤더 클릭 일관성** — 프로젝트·사용자·템플릿·감사로그 등 5개 테이블 sweep 작업
- **로그인 실패 메시지 분기(잠금·비밀번호 만료·미승인)** — Supabase Auth 에러 카테고리 매핑 정책 결정 선행 필요
- **모바일 메시지 화면의 대화 목록 ↔ 스레드 전환 단축 동선** — Batch 0~6 종료 후 잔무
- **HWPX 다운로드 실패 시 재시도 가속기** — 서버 에러 카테고리 정의 후 사용자 안내 분기
