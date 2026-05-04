# Nielsen 10가지 휴리스틱 기반 UX/UI 감사 보고서 (v2)

## 메타

- **조사일:** 2026-05-02 (당일 두 번째 사이클)
- **조사 범위:** 전체 라우트 — 컨설턴트 결과 페이지·갤러리·운영관리(컨설턴트 배정·템플릿)·인증·에러 경계
- **조사 방법:** Explore 에이전트 3대 병렬(공통 레이아웃/컨설턴트/운영자) → 메인 세션에서 코드 직접 검증·라인 번호 확정 → 5단 포맷 정리
- **이전 결과 반영:** 2026-04-30 보고서 8개·당일 v1 보고서 5개 critical 이슈는 PR #50·#54·#55·#56으로 ✅ 모두 해결 (`docs/reports/archive/`로 이동). 본 v2는 **그 외 신규 결함**만 다룸
- **선별 기준:** impact × effort 기준 5개 critical 이슈 (한 세션 ≈ 3시간 내 해결 분량)
- **총평:** v1 사이클로 사용자 관리·메시지·인터뷰 작성·회원가입 등 **다수가 거치는 핵심 동선**의 결함은 해소됐다. 본 v2가 추출한 5개는 한 단계 더 깊은 곳 — **비가역 액션의 사전 차단(컨설턴트 배정)**, **실패 신호의 가시성(좋아요·HWPX·인증 영역 에러)**, **변경 상태의 시각화(템플릿 편집)** — 에 모인다. 모두 한 컴포넌트·한 파일 변경으로 즉시 효과가 나오며, 기존 자산(`AlertDialog`·`useBeforeUnloadGuard`·`showErrorToast`·`(dashboard)/error.tsx`)을 그대로 재사용하면 신규 코드를 거의 추가하지 않아도 된다.

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

### #1 [★★★★★ H5·H3] 컨설턴트 배정·재배정 시 확인 다이얼로그·기존 배정자 표시·부드러운 새로고침 부재

- **위치:** 운영관리 > 프로젝트 관리 > (프로젝트명) > 컨설턴트 배정 탭
  - `src/components/ops/ManualAssignmentForm.tsx:29-64` (`handleSubmit` — 클릭 즉시 `assignConsultant(formData)` 실행)
  - `src/components/ops/ManualAssignmentForm.tsx:54` (`window.location.reload()` — 페이지 통째로 새로고침)
  - `src/components/ops/ManualAssignmentForm.tsx:74-128` (UI 어디에도 "기존 컨설턴트: X" 표시 없음)
- **사용자 시나리오:** 운영관리자가 이미 A컨설턴트가 배정된 프로젝트의 "컨설턴트 배정" 탭을 연다. 매뉴얼 배정 폼에서 컨설턴트 목록을 스크롤해 B컨설턴트를 클릭하고, 사유 30자를 입력한 뒤 "배정하기" 버튼을 누른다. **확인 다이얼로그 없이** 즉시 서버 호출 → 그리고 화면 전체가 흰색으로 한 번 깜빡이며 새로고침된다. 운영자는 "방금 누른 게 신규 배정이었나, 재배정이었나?" 그제야 의심하지만 이미 끝났다. 며칠 후 A컨설턴트가 "내 프로젝트가 사라졌어요?"라고 문의해서야 자신이 의도치 않은 재배정을 실행했음을 인지한다. 비가역 액션(다른 컨설턴트의 업무 박탈)에 사전 경고도, 사용자에게 "이게 재배정"이라는 인지 단서도 없다.
- **위배 원칙:** **H5 오류 예방, H3 사용자 통제와 자유**
- **사용자 관점 개선 후:**
  - 폼 상단에 회색 안내 띠 **"현재 배정: A컨설턴트 — 다른 컨설턴트를 선택하면 재배정됩니다"** (현재 배정자가 있을 때만 노출).
  - "배정하기" 클릭 시 AlertDialog 팝업: 신규 배정이면 **"B컨설턴트를 이 프로젝트에 배정하시겠습니까?"** / 재배정이면 **"A컨설턴트 → B컨설턴트로 변경하시겠습니까? 기존 배정은 이력으로 남으며 A컨설턴트의 접근 권한은 즉시 해제됩니다."** "취소"·"배정 확인" 두 버튼 (재배정은 destructive variant).
  - 확인 후 `window.location.reload()` 대신 `router.refresh()`로 부드럽게 갱신 + 토스트 **"B컨설턴트로 재배정되었습니다 (이전: A컨설턴트)"**.
- **개발자 구현 노트:**
  - `AssignmentTabSection`(`src/app/(dashboard)/ops/projects/[id]/page.tsx:213`)에서 `currentAssignment`(없으면 null) 정보를 prop으로 내려보내고, `ManualAssignmentForm`이 받아서 ① 안내 띠 ② AlertDialog 분기에 사용.
  - `src/components/ui/alert-dialog.tsx` 그대로 사용 (destructive variant 지원). PR #50에서 도입된 패턴이라 일관성 보장.
  - `window.location.reload()` → `import { useRouter } from 'next/navigation'; router.refresh();`로 교체. 사이드바·헤더가 깜빡이지 않는다.
  - `src/components/ops/assignment/RecommendationResults.tsx`의 자동 매칭 결과 클릭 흐름에도 동일 다이얼로그 적용 (이중 진입점 보호).

---

### #2 [★★★★ H1·H9] 갤러리·로드맵 결과의 좋아요 실패 시 토스트 0건 — 사용자 모르게 사일런트 롤백

- **위치:** 갤러리 상세, 컨설턴트 로드맵 결과(공유된 카드)
  - `src/components/gallery/LikeButton.tsx:29-47` (`handleToggle`)
  - 특히 `src/components/gallery/LikeButton.tsx:38-45` — `result.success === false`일 때 **`setLiked`·`setCount` 롤백만 하고 토스트·로깅 0건**
  - `import` 영역(L1-7)에도 `showErrorToast` 등 토스트 유틸 미참조
- **사용자 시나리오:** 컨설턴트가 갤러리에서 잘 만들어진 동료의 로드맵을 보고 하트(♡) 버튼을 누른다. 즉시 하트가 빨갛게 채워지고 카운트가 `12 → 13`으로 올라간다. 잠깐의 네트워크 지연 후, 서버 응답이 RLS·중복 트리거·세션 만료 등으로 실패한다. 화면은 **아무 안내 없이** 하트가 빈 모양(♡)으로 돌아가고 카운트가 다시 `12`로 줄어든다. 사용자는 "내가 잘못 봤나? 두 번 눌렀나?" 하며 다시 누른다 — 또 사일런트 롤백. 세 번째 시도에서도 같은 일이 반복돼서야 "뭔가 안 되는 것 같다"고 인지한다. 사용자가 **자신이 보내는 신호가 시스템에 도달하지 못하고 있다**는 사실을 알 길이 없다.
- **위배 원칙:** **H1 시스템 상태의 가시성, H9 오류 인식·진단·복구**
- **사용자 관점 개선 후:** 좋아요 호출 실패 시 토스트 노출: **"좋아요 저장에 실패했습니다 — 다시 시도해주세요"** + 회색 보조 문구 "잠시 후에도 안 되면 새로고침 후 시도해주세요". 5초 자동 사라짐. 같은 패턴을 `ShareToggle`(공유 토글) 실패 분기에도 동일 적용해 **"공유 상태 저장에 실패했습니다"**로 안내. 사용자는 첫 실패 즉시 원인을 인지하고 재시도하거나 다른 경로(새로고침·세션 재로그인)를 시도한다.
- **개발자 구현 노트:**
  - `LikeButton.tsx`에 한 줄 추가 — L7 아래에 `import { showErrorToast } from '@/lib/utils/toast';`, L43 위에 `showErrorToast('좋아요 저장에 실패했습니다', '잠시 후 다시 시도해주세요');` (toast 유틸 시그니처: `showErrorToast(title, description?)`).
  - 동일 패턴을 `src/components/gallery/ShareToggle.tsx`에도 적용 (RoadmapResultClient.tsx:271 사용처).
  - 더 견고하게 하려면 `useTransition` 외부에 로컬 `error` state를 두고 버튼 옆 작은 ⚠ 아이콘으로 영구 표시. 단, 토스트 한 줄만으로도 critical 결함은 해소됨.
  - 단위 테스트: `LikeButton.test.tsx`(이미 존재한다면)에 `togglePBLLike`가 `success: false` 반환 시 `showErrorToast` 호출 검증 추가.

---

### #3 [★★★ H3·H5] 운영자 템플릿 편집 화면에서 미저장 변경 이탈 경고 부재

- **위치:** 운영관리 > 템플릿 관리 > (템플릿명) 편집
  - `src/app/(dashboard)/ops/templates/_components/TemplateForm.tsx:1-453` (전체 — `isDirty` state·`useBeforeUnloadGuard` 호출 0건)
  - 비교군: `src/app/(dashboard)/consultant/projects/[id]/interview/_hooks/useBeforeUnloadGuard.ts` (이미 인터뷰 작성에 적용된 검증된 훅)
- **사용자 시나리오:** 운영관리자가 진단 템플릿을 열고 문항 12개 중 4개의 라벨·점수 가중치를 수정한다. 중간에 슬랙 알림으로 다른 사용자가 등록 승인 요청을 보냈다는 메시지를 보고 본능적으로 사이드바의 "사용자 관리"를 클릭한다. **아무 경고 없이** 페이지가 즉시 이동하고, 4개 문항의 변경분이 모두 사라진다. 사용자 관리에서 일을 마치고 돌아왔을 때야 "어? 내가 수정한 거 어디 갔지?" 깨닫는다. 같은 시스템의 인터뷰 작성 화면에서는 동일 상황에 브라우저 경고가 떠서 막아주는데, 템플릿만 보호 없음 — **일관성 결함**까지 더해진다.
- **위배 원칙:** **H3 사용자 통제와 자유, H5 오류 예방**
- **사용자 관점 개선 후:** 템플릿 폼에서 한 글자라도 수정한 상태로 사이드바·뒤로가기·창 닫기를 시도하면 브라우저 기본 다이얼로그 **"이 사이트를 벗어나면 변경 사항이 저장되지 않을 수 있습니다"**가 뜬다. 인터뷰 작성과 똑같은 톤·동일 동작이라 운영자는 학습 부하 없이 즉시 인지한다. "취소" 클릭 시 그대로 머물러 저장 버튼을 누른다. 저장 성공 시 isDirty가 풀려 더 이상 경고가 뜨지 않는다.
- **개발자 구현 노트:**
  - `TemplateForm.tsx` 상단 import에 `useBeforeUnloadGuard`(`src/app/(dashboard)/consultant/projects/[id]/interview/_hooks/useBeforeUnloadGuard.ts`) 추가 — 단, 인터뷰 라우트 내부 훅이므로 **공용 위치 `src/hooks/useBeforeUnloadGuard.ts`로 이동·재사용** 권장 (인터뷰 측 import path만 수정).
  - 컴포넌트 본문에 `const isDirty = useTemplateFormDirty(initialValues, currentValues);` (또는 form 라이브러리의 `formState.isDirty`)를 산출하고 `useBeforeUnloadGuard(isDirty);` 호출.
  - 저장 성공 시 `initialValues`를 최신 응답으로 갱신해 `isDirty`가 false로 떨어지게 한다.
  - PBL/로드맵 결과 페이지의 InlineEditField는 즉시저장 패턴이라 본 경고 대상 아님 — 본 이슈는 **명시적 저장 버튼**을 가진 템플릿 폼 한정.

---

### #4 [★★★ H9] HWPX·PDF·XLSX 내보내기 실패 시 "다시 시도" CTA 부재

- **위치:** 컨설턴트 > 프로젝트 > 로드맵 결과·PBL 결과 (우측 상단 다운로드 버튼)
  - `src/components/result/DownloadButtonGroup.tsx:35-67` (loading 상태만 추적, error 상태·재시도 prop 0건)
  - `src/hooks/useHwpxDownload.ts:44` (실패 시 토스트만 띄우고 종료, 재시도 단축 동선 없음)
- **사용자 시나리오:** 컨설턴트가 로드맵 결과 화면 우측 상단의 **"HWPX"** 버튼을 누른다. 스피너가 도는 도중 내부 Python Function이 일시 오류로 500을 반환한다. 토스트 한 줄 **"HWPX 다운로드 실패"**가 4초간 떴다 사라진다. 버튼은 다시 활성 상태가 됐지만, 사용자는 "지금 다시 누르면 될까? 아니면 잠시 기다려야 하나? 다른 형식으로 받아볼까?" 판단 근거가 없다. 같은 버튼을 4~5번 눌러보다 결국 PDF로 우회하거나 작업을 포기한다. 토스트가 사라진 뒤에는 어떤 실패 상태도 화면에 남지 않아 **"방금 뭐가 실패했던 거지?"** 혼란만 남는다.
- **위배 원칙:** **H9 오류 인식·진단·복구**
- **사용자 관점 개선 후:** 실패 토스트의 본문이 액션을 동반한 형태로 진화한다 — `showErrorToast({ title: 'HWPX 다운로드 실패', description: '한글 파일 생성에 일시적 오류가 발생했습니다', action: { label: '다시 시도', onClick: () => onDownload('HWPX') } })`. 또한 `DownloadButtonGroup`이 `errorType: DownloadType | null` prop을 받아, 마지막으로 실패한 형식의 버튼 옆에 작은 ⚠ 아이콘을 잠시 유지(다음 시도 시 자동 해제). 사용자는 한 번의 클릭으로 즉시 재시도하고, 두 번째도 실패하면 "이번엔 다른 형식으로 받자"고 자연스럽게 우회한다.
- **개발자 구현 노트:**
  - `DownloadButtonGroup.tsx`에 `errorType?: DownloadType | null` prop 추가, L57-60 spinner/icon 분기에 `errorType === type`일 때 `<AlertCircle className="text-amber-500" />` 표시.
  - `useHwpxDownload.ts`에서 실패 분기 시 `showErrorToast`의 `action` 옵션(또는 sonner의 `toast.error(..., { action: { label, onClick } })`)으로 "다시 시도" 버튼 부착. PDF·XLSX 훅(`useRoadmapDownload` 등)에도 동일 패턴 일괄 적용.
  - 기존 토스트 유틸 `src/lib/utils/toast.ts`가 action 옵션을 지원하지 않는다면 한 줄 확장 (sonner 표준 옵션 통과).

---

### #5 [★★ H1] (auth)·root 영역에 segment-level error.tsx 부재 — 로그인 흐름 에러 시 흰 화면 위험

- **위치:** 인증 라우트 그룹 + 앱 루트
  - `src/app/(auth)/error.tsx` **부재** (login·register·forgot-password·reset-password 4개 라우트가 segment error boundary 없음)
  - `src/app/error.tsx` **부재** — 루트 레이아웃에서 throw된 예외를 잡을 boundary 0건
  - 비교군: `src/app/(dashboard)/error.tsx:18-71`은 충실히 구현돼 있음
- **사용자 시나리오:** 신규 가입자가 회원가입 Step 2에서 약관 동의 후 "다음"을 누른다. Supabase Auth가 일시 장애로 unhandled exception을 throw한다. 대시보드 영역이라면 `(dashboard)/error.tsx`가 잡아 **"일시적인 오류가 발생했습니다 / 다시 시도"** 안내가 뜨지만, 인증 영역은 segment boundary가 없어 Next.js 기본 에러 페이지(개발 환경에서만 친절, 프로덕션에서는 거의 흰 화면 + 한 줄 영문 메시지)로 폴백한다. 사용자는 "사이트가 깨졌나?" 첫인상에서 가입을 포기한다. 가입 첫걸음에서 시스템 신뢰가 무너진다.
- **위배 원칙:** **H1 시스템 상태의 가시성**
- **사용자 관점 개선 후:** 인증 영역에서 어떤 예외가 throw돼도 `(dashboard)/error.tsx`와 똑같은 톤의 안내가 뜬다 — ⚠ 아이콘 + **"일시적인 오류가 발생했습니다 / 잠시 후 다시 시도해주세요. 계속되면 운영팀에 문의해주세요"** + "다시 시도" 버튼. 개발 환경에서만 상세 정보 펼침. 사용자는 "장애일 뿐 사이트가 깨진 게 아니다"를 인지하고 30초 뒤 재시도해 정상 가입을 완료한다.
- **개발자 구현 노트:**
  - `src/app/(auth)/error.tsx` 신규 작성 — `(dashboard)/error.tsx:18-71`의 골격을 그대로 복사. layout 차이로 `min-h-[60vh]`만 적절히 유지 (auth 레이아웃이 이미 중앙 정렬 카드).
  - `src/app/error.tsx` 신규 작성 — 동일 패턴, 단 `min-h-screen`으로 변경하고 사이드바·헤더 없는 가정. 루트 boundary는 dashboard·auth 어느 segment에서도 잡히지 않은 최후의 방어선.
  - 두 파일 모두 `'use client'` + `useEffect`로 `console.error`(추후 Sentry 연동 위치 명시).
  - 단위 테스트는 segment error.tsx 특성상 RTL이 어려우니 생략 가능. Playwright E2E에서 강제 throw 시나리오로만 보강.

---

## 한 세션 작업 권장 순서

추정 총 작업 시간 **약 2시간 30분**. 사용자 영향 큰 비가역 액션·실패 신호부터:

| 순서 | 이슈 | 추정 | 비고 |
|---|---|---|---|
| 1 | #2 좋아요·공유 실패 토스트 추가 | 15분 | LikeButton·ShareToggle 두 파일에 `showErrorToast` 한 줄씩 |
| 2 | #5 (auth)·root error.tsx 2개 신규 | 20분 | (dashboard)/error.tsx 복사·수정 |
| 3 | #3 템플릿 폼 isDirty + useBeforeUnloadGuard | 30분 | 훅을 `src/hooks/`로 승격 + import 추가 |
| 4 | #4 다운로드 실패 "다시 시도" 액션 토스트 | 30분 | sonner action 옵션 + DownloadButtonGroup error 아이콘 |
| 5 | #1 컨설턴트 배정 AlertDialog + 기존 배정자 표시 + router.refresh | 60분 | AssignmentTabSection prop 추가 + ManualAssignmentForm 분기 |

---

## 재사용 가능한 기존 자산

| 자산 | 경로 | 본 보고서 활용 |
|---|---|---|
| `AlertDialog` (destructive variant) | `src/components/ui/alert-dialog.tsx` | #1 재배정 확인 다이얼로그 |
| `useBeforeUnloadGuard` | `src/app/(dashboard)/consultant/projects/[id]/interview/_hooks/useBeforeUnloadGuard.ts` | #3 템플릿 폼 (공용 위치 `src/hooks/`로 승격 권장) |
| `(dashboard)/error.tsx` | `src/app/(dashboard)/error.tsx:18-71` | #5 (auth)/error.tsx + root error.tsx의 골격 |
| `showErrorToast` | `src/lib/utils/toast.ts` | #2 좋아요 실패 안내, #4 다운로드 실패 안내 |
| sonner `toast(..., { action })` | `node_modules/sonner` (이미 의존성) | #4 "다시 시도" 액션 버튼 |
| `useRouter().refresh()` | `next/navigation` | #1 reload 대체 |
| `RoadmapResultClient`의 ShareToggle 사용처 | `src/app/(dashboard)/consultant/projects/[id]/roadmap/_components/result-v2/RoadmapResultClient.tsx:271` | #2 동일 토스트 패턴 적용 |
| `ActionResult<T>` | `src/lib/types/action-result.ts` | #1 assignConsultant 응답 검증 |

---

## 검증 체크리스트

구현 세션 종료 시 다음을 모두 만족해야 한다:

- [ ] `npm run validate` (typecheck + lint + test) 통과
- [ ] `npm run build` 통과
- [ ] **#1**: 운영관리 > 프로젝트 > 컨설턴트 배정 탭에서 ① 신규 프로젝트(미배정) → 다이얼로그 라벨 "B컨설턴트를 이 프로젝트에 배정하시겠습니까?" / ② 재배정 → "A→B로 변경하시겠습니까? 기존 배정은 이력으로 남으며…" 노출 / 확인 후 화면이 깜빡이지 않고 부드럽게 갱신
- [ ] **#2**: 갤러리 상세에서 네트워크 차단 후 좋아요 클릭 → 토스트 "좋아요 저장에 실패했습니다" 노출 / ShareToggle 동일
- [ ] **#3**: 템플릿 편집에서 한 글자 수정 후 사이드바 클릭 → 브라우저 경고 다이얼로그 노출 / 저장 성공 후에는 경고 미노출 / 미수정 상태에서 이탈은 경고 없음
- [ ] **#4**: 로드맵 결과에서 HWPX 강제 실패 → 토스트의 "다시 시도" 버튼 클릭 시 즉시 재호출 / 실패 직후 해당 버튼 옆 ⚠ 아이콘 잠시 유지
- [ ] **#5**: 인증 영역에서 강제 throw → (auth)/error.tsx의 "일시적인 오류가 발생했습니다" 노출 / 루트 throw → root error.tsx 노출

---

## 범위 외 (Out of Scope)

다음은 본 조사에서 발견됐지만 한 세션 분량 초과 또는 별도 정책 결정이 필요해 본 보고서에서 제외:

- **EmptyState 사용처 일괄 통일** — 8~12개 페이지 sweep 작업, 별도 epic 권장
- **테이블 헤더 정렬 클릭 일관성** — 프로젝트·사용자·템플릿·감사로그 등 5개 테이블 sweep (v1과 동일 보류)
- **사용자 관리 일괄 처리(체크박스 다중 승인·정지)** — RLS·감사로그 정책 검토 필요 (v1과 동일 보류)
- **알림 별도 페이지(전체 보기·필터·기간 검색)** — 100건 이상 누적 시 풀페이지 필요 (v1과 동일 보류)
- **로그인 실패 메시지 분기(잠금·비밀번호 만료·미승인)** — Supabase Auth 에러 카테고리 매핑 정책 결정 선행 필요 (v1과 동일 보류)
- **승인 대기(USER_PENDING) 사용자에게 헤더 전체 배너 노출** — 현재 disabled 아이콘 + Tooltip로 부분 안내됨. 정책 결정(배너 vs 툴팁) 필요
- **`window.location.reload()` 일괄 router.refresh() 마이그레이션** — #1에서 한 곳만 다룸. 다른 사용처 전수 sweep은 별도 epic
- **InlineEditField 즉시저장 실패 시 영구 시각 신호** — 현재 saveIndicator로 노출되나 토스트만으로는 한계. UI 디자인 결정 선행
