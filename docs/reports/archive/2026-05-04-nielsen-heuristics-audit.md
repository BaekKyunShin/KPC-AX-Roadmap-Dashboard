# Nielsen 10가지 휴리스틱 기반 UX/UI 감사 보고서

## 메타

- **조사일:** 2026-05-04
- **조사 범위:** 전체 라우트 — 컨설턴트 결과 페이지·인터뷰·운영관리(프로젝트·쿼터·배정 흐름)·갤러리
- **조사 방법:** Explore 에이전트 3대 병렬(공통 레이아웃/컨설턴트/운영자) → 메인 세션에서 코드 직접 검증·라인 번호 확정 → 5단 포맷 정리
- **이전 결과 반영:** archive 된 보고서 3건 모두 본 보고서에서 제외 — `2026-04-30-nielsen-heuristics-audit.md`(PR #50, 8건), `2026-05-02-nielsen-heuristics-audit.md`(PR #54, v1 5건), `2026-05-02-nielsen-heuristics-audit-v2.md`(PR #58, v2 5건). 본 보고서는 그 외 **신규 미해결 결함**만 다룸
- **선별 기준:** impact × effort 기준 5개 critical 이슈 (한 세션 ≈ 2시간 30분 분량)
- **총평:** v1·v2 사이클로 사용자 관리·메시지·인터뷰 작성·회원가입·컨설턴트 배정·좋아요·내보내기·인증 흐름이 정비됐다. 본 v3 5건은 **결과 페이지 InlineEdit 의 실패 신호 비대칭**(saved 는 3초 후 사라지나 error 는 영구 노출), **결과 페이지 탭 전환 시 미저장 상태 무감지**, **자동 매칭 배정 흐름의 reload sweep 누락**, **운영자 첫 화면의 우선순위 신호 부재**, **쿼터 임계값의 학습 비용**으로 모인다. 모두 한 컴포넌트·한 파일 변경으로 즉시 효과가 나오며, 기존 자산(`saved` 타이머 패턴, `useRouter().refresh()`, `Tooltip`, 우선순위 카드 디자인)을 그대로 재사용하면 신규 코드를 거의 추가하지 않아도 된다.

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

### #1 [★★★★ H9·H1] 결과 페이지 InlineEdit 저장 실패 시 에러 인디케이터가 영구 노출되고 재시도 버튼이 없음

- **위치:** 컨설턴트 > 담당 프로젝트 > 로드맵 결과·PBL 결과 (모든 InlineEditField 사용처)
  - `src/components/result/InlineEditField.tsx:52-59` (`saved` 상태는 3초 후 자동 idle 복귀)
  - `src/components/result/InlineEditField.tsx:74-89` (`saveEdit` — 실패 시 `setSavingState('error')`만 하고 타이머·재시도 동선 0건)
  - `src/components/result/InlineEditField.tsx:108-112` (`errorIndicator` — "저장 실패" 텍스트 + AlertCircle만, 액션 버튼 없음)
- **사용자 시나리오:** 컨설턴트가 로드맵 결과 Ⅲ-2 "훈련 방법" 셀을 클릭해 한 줄 수정한다. 저장 버튼을 누르자 네트워크 일시 단절로 "저장 실패" 빨간 표시가 뜬다. 같은 컴포넌트의 **저장 성공**은 3초 후 깨끗이 사라지는데, **실패** 표시는 페이지를 떠나거나 같은 필드를 다시 클릭할 때까지 그 자리에 남아있다. 사용자는 "지금 다시 시도하면 될까? 새로고침해야 하나? 다른 셀도 영향 받나?" 판단 근거가 없다. 같은 셀을 다시 클릭해도 빨간 표시가 그대로 남은 상태로 편집이 시작돼 인지 부조화가 생긴다. 결국 사용자는 페이지를 새로고침해 "정말로 안 저장된 게 맞나?"를 직접 확인한다.
- **위배 원칙:** **H9 오류 인식·진단·복구, H1 시스템 상태의 가시성**
- **사용자 관점 개선 후:** 저장 실패 표시 옆에 작은 **"다시 시도"** 버튼이 함께 노출된다. 한 클릭으로 동일 `onSave`가 즉시 재호출된다. 또는 같은 셀을 다시 클릭해 편집 모드로 들어가면 빨간 표시가 자동으로 사라진다(idle로 복귀). 5초간 재시도가 없으면 표시는 노란색 톤으로 약화돼 시야에서 흐려진다. 사용자는 "실패했지만 같은 자리에서 한 번 더 시도하면 된다"는 명확한 인과를 즉시 인지한다.
- **개발자 구현 노트:**
  - `InlineEditField.tsx:108-112`의 `errorIndicator` 옆에 `<button onClick={() => void saveEdit()}>` 추가 — 작은 텍스트 버튼이거나 `RefreshCcw` 아이콘.
  - L52-59 `saved` 타이머 패턴을 그대로 차용해 `error` 상태도 일정 시간(예: 5초) 후 약화 또는 idle 복귀 옵션 추가. 단, 자동 idle 보다는 **"다시 시도"** 버튼이 본질 해결이며 자동 사라짐은 보조.
  - 같은 셀이 다시 edit 모드로 들어갈 때 (`enterEdit` 시점)에 `setSavingState('idle')`로 명시 reset. 현재는 mode 만 전환하고 savingState는 그대로 유지됨.
  - 영향 범위: 본 InlineEditField는 로드맵·PBL 결과 페이지의 모든 인라인 편집 셀에서 공유 — 한 곳 수정으로 전체 일관성 확보.

---

### #2 [★★★★ H5·H3] 결과 페이지 탭 전환 시 InlineEdit 의 미저장 상태(saving)를 검사하지 않아 데이터 손실 위험

- **위치:** 컨설턴트 > 담당 프로젝트 > 로드맵 결과·PBL 결과 (Ⅰ. 개요·Ⅱ. 요구분석·Ⅲ. 훈련체계 등 탭 전환)
  - `src/components/result/ResultTabs.tsx:96-106` (`handleValueChange` — URL 갱신 + setActiveValue만, 탭 내 편집 상태 미감지)
  - `src/components/result/InlineEditField.tsx:74-89` (`saveEdit` — 진행 중에는 `savingState='saving'`)
  - 동시 영향: PBL 결과 동일 패턴 (`PBLResultClient` 의 `ResultTabs`)
- **사용자 시나리오:** 컨설턴트가 로드맵 결과 Ⅰ. 개요 탭에서 "수립 필요성" 셀을 편집·저장 클릭한다. 저장이 1~2초 진행 중인 사이에 옆 탭 Ⅱ. 요구분석을 클릭한다. 화면은 즉시 Ⅱ 탭으로 전환되고, Ⅰ 탭의 저장 진행 상태가 시야에서 사라진다. 저장이 성공했는지 실패했는지 사용자는 알 길이 없다. 만약 저장이 실패해 InlineEditField가 `error` 상태로 갔다면, 그 신호는 Ⅰ 탭에 묻혀 보이지 않는다. 사용자는 "저장 표시는 떴던 것 같은데…"라며 다음 작업을 이어가고, 며칠 후 다시 와 보면 그 셀이 옛 값 그대로다.
- **위배 원칙:** **H5 오류 예방, H3 사용자 통제와 자유**
- **사용자 관점 개선 후:** 탭을 클릭한 순간 시스템이 현 탭의 InlineEditField 중 `savingState === 'saving'`이 하나라도 있으면 **AlertDialog**: 「저장 중인 변경 사항이 있습니다. 잠시 후 다시 이동해주세요.」 + "취소"·"그래도 이동" 두 버튼 — 또는 자동으로 200~500ms 대기 후 저장 완료를 기다렸다가 탭 전환. 사용자는 미저장 상태에서 탭을 넘기는 즉시 멈추고, 데이터가 안전히 저장된 뒤에야 다음 탭으로 넘어간다.
- **개발자 구현 노트:**
  - 가장 단순한 방식 — InlineEditField가 자기 `savingState`를 부모로 알리는 콜백(`onSavingStateChange?: (state) => void`)을 받게 하고, ResultTabs를 사용하는 부모(RoadmapResultClient·PBLResultClient)가 `pendingFieldsCountRef` 를 유지.
  - `ResultTabs.handleValueChange`가 prop으로 받은 `confirmBeforeChange?: () => boolean | Promise<boolean>` 를 호출 — false 반환 시 탭 전환 차단. 부모가 이 함수에서 `pendingFieldsCountRef.current > 0`이면 AlertDialog 노출 후 결과 반환.
  - 또는 더 가벼운 옵션 — 탭 전환 시 진행 중인 저장이 끝날 때까지 setActiveValue 만 200ms 지연. UX 비용 거의 없음.
  - 재사용 자산: `src/components/ui/alert-dialog.tsx` (확인 다이얼로그 표준).

---

### #3 [★★★ H4] 자동 매칭 배정 흐름이 여전히 `window.location.reload()` — ManualAssignmentForm·RecommendationResults는 router.refresh로 통일됐는데 AssignmentForm만 누락

- **위치:** 운영관리 > 프로젝트 관리 > (프로젝트명) > 컨설턴트 배정 탭 > 자동 매칭 (특정 진입점)
  - `src/components/ops/AssignmentForm.tsx:68` (`window.location.reload()` — PR #58 sweep 누락)
  - 비교군: `src/components/ops/ManualAssignmentForm.tsx` (PR #58 에서 router.refresh 로 교체) · `src/components/ops/assignment/RecommendationResults.tsx:49` (이미 router.refresh 사용 중)
- **사용자 시나리오:** 운영관리자가 자동 매칭 탭에서 추천된 컨설턴트를 보고 배정을 결정한다. AssignmentForm 진입점을 통해 배정을 실행하면 페이지 전체가 흰색으로 한 번 깜빡이며 새로고침된다. 같은 운영자가 옆 페이지의 매뉴얼 배정 또는 RecommendationResults 카드 클릭 흐름에서는 깜빡임 없이 부드럽게 갱신되는데, **유독 이 한 진입점만 옛 reload 패턴**이라 일관성 결함이 생긴다. PR #58 도입한 AlertDialog 사전 차단도 없어 비가역 액션 보호도 미적용.
- **위배 원칙:** **H4 일관성과 표준**
- **사용자 관점 개선 후:** AssignmentForm 도 ManualAssignmentForm 과 동일한 흐름 — "배정하기" 클릭 시 AlertDialog **"<이름>컨설턴트를 이 프로젝트에 배정하시겠습니까?"** + "확인" 클릭 후 `router.refresh()` 로 부드럽게 갱신 + 성공 토스트 「배정이 완료되었습니다」. 모든 배정 진입점이 같은 패턴으로 묶여 운영자 학습 부하 0.
- **개발자 구현 노트:**
  - `AssignmentForm.tsx:68` 한 줄: `window.location.reload()` → `useRouter().refresh()` 교체.
  - 더 완전한 동기화 — `ManualAssignmentForm.tsx` 의 `currentAssignment` prop + AlertDialog 분기 패턴(PR #58 도입)을 그대로 차용. 약 50줄 복사.
  - 재사용 자산: `src/components/ui/alert-dialog.tsx`, `src/lib/utils/toast.ts` `showSuccessToast`.
  - 단위 테스트: `AssignmentForm.test.tsx` 가 있다면 `mockReload` → `mockRefresh` 검증으로 일괄 교체 (ManualAssignmentForm 테스트의 helper `clickAssignAndConfirm` 패턴 참조).

---

### #4 [★★★ H10·H7] LLM 쿼터 페이지 헤더에서 임계값(70%·90%)의 의미·권장 액션 안내 부재

- **위치:** 운영관리 > LLM 쿼터 관리
  - `src/app/(dashboard)/ops/quota/_components/QuotaClient.tsx:27-37` (`getUsageColor`·`getRoleBadge` — 색만 분류, 의미 라벨 없음)
  - `src/app/(dashboard)/ops/quota/_components/QuotaClient.tsx:466-482` (페이지 하단 범례 — 스크롤 후에야 보임)
- **사용자 시나리오:** 신규 운영관리자가 처음 쿼터 페이지를 연다. 사용자별 사용량 진행률 바가 초록·노랑·빨강으로 색분류돼 있다. 노란색 바를 본 운영자는 "이건 주의인가, 경고인가?"를 짐작만 할 뿐, 페이지 하단까지 스크롤 해야 「주의(70% 이상)」 범례를 발견한다. 더 큰 문제는 **그래서 뭘 해야 하는지** 행동 가이드가 어디에도 없다는 점 — "주의면 한도를 늘려야 하나, 사용을 자제시켜야 하나, 그냥 두어도 되나?" 신규 운영자는 매번 선임에게 묻는다.
- **위배 원칙:** **H10 도움말과 문서화, H7 사용의 유연성과 효율성**
- **사용자 관점 개선 후:** "월간 사용량" 헤더 옆 ⓘ 아이콘 호버 시 Tooltip:
  > **정상**(초록, 70% 미만): 모니터링만  
  > **주의**(노랑, 70~89%): 일일 한도 점검·소통 권장  
  > **경고**(빨강, 90% 이상): 즉시 한도 조정 또는 사용 가이드 안내
  
  진행률 바 옆에는 색 외에 한 글자 라벨 「정상」·「주의」·「경고」가 함께 노출돼 색맹 사용자도 즉시 인지 가능. 페이지 하단 범례는 그대로 유지(중복은 H8 위반이 아니라 보강).
- **개발자 구현 노트:**
  - `QuotaClient.tsx`의 사용량 셀(`getUsageColor` 호출처)에서 같은 임계값으로 라벨 산출:
    ```tsx
    const usageLabel = percent >= 90 ? '경고' : percent >= 70 ? '주의' : '정상';
    ```
  - 헤더 ⓘ는 `lucide-react` `Info` + `src/components/ui/tooltip.tsx` 조합 — `로드맵 갤러리`·`인터뷰 도움말`에서 이미 동일 패턴 검증됨.
  - getUsageColor 와 라벨 산출 로직을 단일 helper(`getUsageStatus(percent): { color, label, action }`)로 추출하면 향후 임계값 변경 시 한 곳만 수정.

---

### #5 [★★★ H1·H10] 운영자 프로젝트 관리 첫 화면에 "오늘 할 일" 우선순위 작업 카드 부재

- **위치:** 운영관리 > 프로젝트 관리 (대시보드 탭)
  - `src/app/(dashboard)/ops/projects/_components/ProjectDashboard.tsx:71-98` (StatusDistribution / MonthlyCompletion / ConsultantProgressTable / StalledProjectsSection 4개 위젯만 나열)
- **사용자 시나리오:** 운영관리자가 매일 아침 프로젝트 관리 페이지를 연다. 화면에는 큰 도넛(상태 분포), 추세 라인(월별 완성도), 컨설턴트 진행률 표, 정체 프로젝트 리스트가 차례로 보인다. 모두 가치 있는 정보지만 "**오늘 내가 가장 먼저 처리할 한 가지**"가 어디에도 명시되지 않는다. 미승인 컨설턴트가 5명 있는데도 "사용자 관리"에 들어가지 않으면 모르고, 7일 이상 정체된 프로젝트가 3개 있는데도 정체 섹션까지 스크롤해서 일일이 클릭해야 한다. 운영자는 매일 4~5개 페이지를 회유하며 "오늘 처리할 일"을 직접 조립한다.
- **위배 원칙:** **H1 시스템 상태의 가시성, H10 도움말과 문서화**
- **사용자 관점 개선 후:** 대시보드 최상단(다른 위젯들 위)에 가로형 카드 **"오늘 처리할 작업"**:
  
  | 항목 | 라벨 | 동선 |
  |---|---|---|
  | 미승인 사용자 | 「승인 대기 컨설턴트 **N명**」 | 클릭 시 사용자 관리(승인 대기) |
  | 정체 프로젝트 | 「7일 이상 진행 정체 **N개**」 | 정체 섹션으로 스크롤 |
  | 미배정 신규 | 「DIAGNOSED 미배정 **N개**」 | 프로젝트 리스트 필터 |
  | LLM 쿼터 경고 | 「쿼터 90% 초과 사용자 **N명**」 | 쿼터 페이지 |
  
  N=0 항목은 회색·비활성. 한 줄·한 클릭으로 운영자 일과의 시작 지점이 명확해진다.
- **개발자 구현 노트:**
  - 신규 컴포넌트 `OpsTopActions.tsx` (`src/app/(dashboard)/ops/projects/_components/`) — 4개 카운트 표시 + Link 동선.
  - 카운트 데이터 — page.tsx(서버 컴포넌트)에서 4개 쿼리 추가 또는 기존 `fetchOpsDashboard` 확장. count(*) 만 필요하니 비용 최소.
  - 디자인 — 기존 `ProjectDashboard` 카드 톤(흰 배경 + 그림자) 유지하되 가로 4분할 그리드. 모바일 1열.
  - 재사용 자산: `src/components/ui/card.tsx`, `src/components/ui/badge.tsx`, lucide 아이콘.

---

## 한 세션 작업 권장 순서

추정 총 작업 시간 **약 2시간 30분**. 사용자 영향 큰 데이터 무결성·매일 동선부터:

| 순서 | 이슈 | 추정 | 비고 |
|---|---|---|---|
| 1 | #1 InlineEdit 에러에 "다시 시도" + 같은 셀 재진입 시 idle reset | 30분 | 한 컴포넌트 한 곳, 모든 결과 페이지 영향 |
| 2 | #3 AssignmentForm router.refresh + AlertDialog 동기화 | 30분 | ManualAssignmentForm 패턴 복사 |
| 3 | #4 LLM 쿼터 임계값 ⓘ Tooltip + 한 글자 라벨 | 25분 | helper 추출 + Tooltip 추가 |
| 4 | #2 결과 탭 전환 시 saving 상태 감지·확인 | 45분 | InlineEditField → 부모 콜백 신설 + ResultTabs prop |
| 5 | #5 운영자 대시보드 "오늘 처리할 작업" 카드 | 40분 | 신규 컴포넌트 + 4개 count 쿼리 |

---

## 재사용 가능한 기존 자산

| 자산 | 경로 | 본 보고서 활용 |
|---|---|---|
| InlineEditField `saved` 타이머 패턴 | `src/components/result/InlineEditField.tsx:52-59` | #1 error 상태 idle 복귀 패턴 동일 차용 |
| `AlertDialog` (destructive 포함) | `src/components/ui/alert-dialog.tsx` | #2 탭 전환 차단 다이얼로그, #3 배정 확인 다이얼로그 |
| `ManualAssignmentForm` 의 currentAssignment + 다이얼로그 분기 | `src/components/ops/ManualAssignmentForm.tsx` (PR #58) | #3 AssignmentForm 동일 패턴 복사 |
| `useRouter().refresh()` | `next/navigation` | #3 reload 대체 |
| `Tooltip` (shadcn) | `src/components/ui/tooltip.tsx` | #4 ⓘ 아이콘 호버 안내 |
| `showSuccessToast`·`showErrorToast` | `src/lib/utils/toast.ts` | #3·#5 표준 토스트 |
| `getUsageColor`·`getRoleBadge` | `src/app/(dashboard)/ops/quota/_components/QuotaClient.tsx:27-39` | #4 helper 통합 시 재사용 |
| `Card`·`Badge` | `src/components/ui/card.tsx`·`badge.tsx` | #5 우선순위 카드 |

---

## 검증 체크리스트

구현 세션 종료 시 다음을 모두 만족해야 한다:

- [ ] `npm run validate` (typecheck + lint + test) 통과
- [ ] `npm run build` 통과
- [ ] **#1**: 결과 페이지 InlineEdit 에서 강제 실패(네트워크 차단) → "저장 실패" 옆 "다시 시도" 버튼 노출 → 클릭 시 즉시 재호출 / 같은 셀을 다시 클릭해 편집 모드 진입 시 빨간 표시 자동 해제
- [ ] **#2**: 결과 페이지에서 셀 편집·저장 클릭 직후 다른 탭 클릭 → 저장 완료 대기 또는 AlertDialog "저장 중인 변경 사항이 있습니다" 노출 / 정상 idle 상태에서는 즉시 전환
- [ ] **#3**: AssignmentForm 진입점에서 자동 매칭 결과 클릭 → AlertDialog "<이름>컨설턴트를 이 프로젝트에 배정하시겠습니까?" → "확인" 후 화면 깜빡임 없이 부드럽게 갱신 + 성공 토스트
- [ ] **#4**: 쿼터 페이지 "월간 사용량" 헤더 ⓘ 호버 시 임계값·권장 액션 Tooltip / 진행률 바 옆 「정상·주의·경고」 한 글자 라벨
- [ ] **#5**: 운영관리 > 프로젝트 관리 진입 시 최상단 "오늘 처리할 작업" 카드 4종(승인 대기·정체·미배정·쿼터 경고) 카운트 + 클릭 시 해당 동선 이동 / N=0 항목은 회색

---

## 범위 외 (Out of Scope)

다음은 본 조사에서 발견됐지만 한 세션 분량 초과 또는 별도 정책 결정이 필요해 본 보고서에서 제외:

- **인터뷰 작성 단계별 필드 완성도 진행률 시각화** — InterviewStepper + 각 Step* 컴포넌트의 validateStep prop 도입 sweep, 별도 epic
- **인터뷰 검토 페이지 앵커 네비게이션** — 8~9개 섹션 점프 링크 사이드바 신설, 디자인 결정 선행
- **템플릿 동시 편집 충돌 감지** — Realtime presence + 서버 버전 비교, 별도 epic (v1·v2 InlineEdit lost update와 동일 클래스)
- **window.location.reload() 잔재 일괄 sweep** — 본 #3 한 곳 외 다른 사용처 전수, 별도 chore PR
- **테이블 정렬 헤더 클릭 일관성** — v1·v2 OOS 그대로 유지
- **로그인 실패 메시지 분기** — Supabase Auth 에러 카테고리 매핑 정책 결정 선행 (v1·v2 OOS 그대로)
- **알림 풀페이지** — 100건 이상 누적 시 풀페이지 (v1·v2 OOS 그대로)
- **사용자 관리 일괄 처리** — RLS·감사로그 정책 검토 필요 (v1·v2 OOS 그대로)
