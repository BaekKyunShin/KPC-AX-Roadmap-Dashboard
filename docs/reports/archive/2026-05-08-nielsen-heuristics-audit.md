# Nielsen 10가지 휴리스틱 기반 UX/UI 감사 보고서

## 메타

- **조사일:** 2026-05-08
- **조사 범위:** 전체 라우트 — 컨설턴트 인터뷰 작성·검토, 운영관리(사용자·템플릿), 인증(비밀번호 흐름), 결과 페이지 stale 배너
- **조사 방법:** Explore 에이전트 3대 병렬(공통 레이아웃 / 컨설턴트 워크플로우 / 운영관리·인증) → 메인 세션에서 실제 코드 직접 검증·라인 번호 확정 → 5단 포맷 정리
- **이전 결과 반영:** archive 된 보고서 4건의 모든 critical 이슈는 본 보고서에서 제외 — `2026-04-30`(PR #50, 8건), `2026-05-02`(PR #54, v1 5건), `2026-05-02-v2`(PR #58, v2 5건), `2026-05-04`(PR #60, 4건). 2026-05-04 v3 의 #5 "운영자 대시보드 우선순위 카드"는 사용자 명시 거부로 **재제안 절대 금지**. 본 보고서는 그 외 신규 미해결 결함만 다룸
- **선별 기준:** impact × effort 기준 5개 critical 이슈 (한 세션 ≈ 2시간 분량)
- **총평:** v1·v2·v3 사이클로 컨설턴트 배정·결과 페이지 InlineEdit·LLM 쿼터·로딩 UI 가 정비됐다. 본 v4 5건은 **(1) 인터뷰 차수/행 삭제의 비가역 데이터 손실 보호 부재**(자동저장 환경에서 confirm 없이 즉시 영속화), **(2) 사용자 정지·템플릿 삭제의 보호 패턴 분산**(한 곳은 무확인, 한 곳은 native `confirm()`), **(3) 비밀번호 흐름의 용어 3종 혼재**(잊으셨나요·재설정·변경), **(4) 사용자 관리 검색 0건 EmptyState 의 가이드 부족**(활성 필터·검색어 미명시 + 초기화 버튼 없음), **(5) StaleResultBanner 재생성 후 결과 페이지 진입 시 의도 신호 부재**(쿼리 파라미터 없이 `router.push` → 옛 결과 잠깐 노출)로 모인다. 모두 한 컴포넌트·한 파일 변경으로 효과가 즉시 나오며, 기존 자산(`AlertDialog`·`FilterBadge`·`RoadmapLoadingOverlay`·_meta.ts)을 그대로 재사용하면 신규 코드를 거의 추가하지 않아도 된다.

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
4. **사용자 관점 개선 후** — 화면·문구·플로우의 변화를 실제 노출될 라벨까지 포함해 묘사 + **`[이전]`·`[이후]` ASCII mockup 두 블록 의무 첨부** (≤70 컬럼)
5. **개발자 구현 노트** — 변경 위치, 재사용 가능 자산 경로, 짧은 코드 예시

---

## CRITICAL 이슈 (우선순위 순)

### #1 [★★★★★ H5·H3] 인터뷰 차수/행의 휴지통 버튼이 즉시 삭제 → 자동저장으로 영구 손실

- **위치:** 컨설턴트 > 담당 프로젝트 > 인터뷰 입력 (Ⅰ-2 주요 활동·역량 모델링·과업 분석 등)
  - `src/app/(dashboard)/consultant/projects/[id]/interview/_components/roadmap/StepPerformanceActivities.tsx:79-83` (`removeRound` — `if (rows.length <= 1) return;` 가드 외에 confirm 0건)
  - `src/app/(dashboard)/consultant/projects/[id]/interview/_components/roadmap/StepPerformanceActivities.tsx:316-329` (휴지통 버튼이 `onClick={onRemove}` 직접 호출, AlertDialog 없음)
  - `src/app/(dashboard)/consultant/projects/[id]/interview/_components/roadmap/StepCompetencyModeling.tsx:88,241` (`removeRow` 동일 패턴)
  - `src/app/(dashboard)/consultant/projects/[id]/interview/_components/roadmap/StepTaskAnalysis.tsx:94,261` (`removeRow` 동일 패턴)
  - 동시 영향: PBL 트랙의 동형 Step 들 (`_components/pbl/`) — 자동저장(`useInterviewAutoSave`)이 3초 후 영속화하므로 새로고침해도 복구 불가
- **사용자 시나리오:** 컨설턴트가 인터뷰 입력 페이지 "Ⅰ-2 주요 활동" 섹션에서 3차 컨설팅 기록을 정성껏 작성한다. 같은 페이지에서 다른 차수의 휴지통 모양 버튼을 클릭하려다 실수로 **3차 행의 휴지통**을 누른다. 행이 즉시 사라진다. "어, 잘못 눌렀다…" 되돌릴 수 있는 어떤 단추도 없다. 자동저장 인디케이터가 「저장 중…」 → 「저장됨」으로 바뀌고, 3초 안에 서버에 영구 반영된다. 페이지를 새로고침해도, 옆 탭으로 이동했다 돌아와도 그 행은 영영 비어있다. 한 시간 작업이 한 번의 클릭으로 사라진다. 동일 패턴이 역량 모델링·과업 분석 등 6~7개 Step 의 모든 행 삭제 버튼에 일관되게 적용돼 있다.
- **위배 원칙:** **H5 오류 예방, H3 사용자 통제와 자유**
- **사용자 관점 개선 후:** 휴지통 버튼 클릭 시 **AlertDialog**가 즉시 노출된다.
  > **「{N}차 행을 삭제하시겠습니까?」**  
  > 작성된 내용이 함께 삭제되며 되돌릴 수 없습니다.  
  >   
  > [취소]  [삭제]
  
  "삭제" 클릭 시에만 행이 제거되고 자동저장 트리거. "취소" 또는 ESC 시 아무 변화 없음. 빈 행(작성 내용 0)을 삭제하는 경우에도 동일 다이얼로그를 띄워 학습 부하 0 — "이 표현은 모든 삭제에 동일"이라는 일관성을 사용자에게 각인. 모든 Step 행 삭제 버튼이 동일 패턴으로 묶여 한 번 학습하면 끝.

```text
[이전]
┌──────────────────────────────────────────────┐
│ Ⅰ-2 주요 활동                                 │
│ ┌─────┬───────┬───────┬──────┬──┐            │
│ │ 1차 │ ...   │ ...   │ ...  │🗑│            │
│ ├─────┼───────┼───────┼──────┼──┤            │
│ │ 2차 │ ...   │ ...   │ ...  │🗑│            │
│ ├─────┼───────┼───────┼──────┼──┤            │
│ │ 3차 │ 컨설팅 │ 워크숍 │ ...  │🗑│ ← 클릭 즉시  │
│ └─────┴───────┴───────┴──────┴──┘   행 사라짐 │
│                          (3초 뒤 자동저장 영구) │
└──────────────────────────────────────────────┘
```

```text
[이후]
┌──────────────────────────────────────────────┐
│ Ⅰ-2 주요 활동                                 │
│ ┌─────┬───────┬───────┬──────┬──┐            │
│ │ 3차 │ 컨설팅 │ 워크숍 │ ...  │🗑│ ← 클릭      │
│ └─────┴───────┴───────┴──────┴──┘            │
│                                              │
│   ┌──────────────────────────────────┐       │
│   │ 3차 행을 삭제하시겠습니까?         │       │
│   │ 작성된 내용이 함께 삭제되며        │       │
│   │ 되돌릴 수 없습니다.                │       │
│   │                                  │       │
│   │       [취소]   [삭제]            │       │
│   └──────────────────────────────────┘       │
└──────────────────────────────────────────────┘
```

- **개발자 구현 노트:**
  - 신규 small wrapper `ConfirmRemoveRowButton` (재사용 컴포넌트) 추출 권장 — 휴지통 아이콘 + AlertDialog 트리거를 캡슐화. 6~7개 Step 에서 동일하게 사용.
  - 또는 각 Step 컴포넌트의 onRemove 콜백 자리에 AlertDialog 인라인 — props 변화 없음.
  - 재사용 자산: `src/components/ui/alert-dialog.tsx` (destructive variant 지원).
  - 행 라벨은 컴포넌트별 다름 — `removeRound` 의 idx 는 "차수", `removeRow` 의 idx 는 "행". AlertDialog 문구는 컴포넌트별로 차등화 (「{N}차 행」 / 「선택한 행」).
  - 단위 테스트: 각 Step 의 removeRound/removeRow 호출 전 AlertDialog 트리거 검증 (Vitest + RTL `userEvent.click`).
  - **자동저장과의 관계:** 삭제 후 emit → 부모의 onChange → useInterviewAutoSave 트리거 — 자동저장 자체는 변경 없음. 다이얼로그가 emit 호출을 게이트할 뿐.

---

### #2 [★★★★ H5·H4] 사용자 정지·템플릿 삭제의 비가역 액션 보호 패턴 분산 — 한 곳은 무확인, 한 곳은 native `confirm()`

- **위치:**
  - 운영관리 > 사용자 관리 > (활성 사용자 행) > "정지" 버튼: `src/components/ops/UserManagementTable.tsx:402-411` (정지 클릭 → `handleAction(id, 'suspend')` → `updateUserStatus` 즉시 호출, 사전 확인 0건). `handleAction` 정의: `src/components/ops/UserManagementTable.tsx:324-344`
  - 운영관리 > 자가진단 템플릿 > (비활성 + 미사용 템플릿) > "삭제": `src/app/(dashboard)/ops/templates/_components/TemplateList.tsx:215` (`if (options.confirmMessage && !confirm(options.confirmMessage)) return;`) + 247 (`confirmMessage: '이 템플릿을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.'`) — 브라우저 native `confirm()` 사용
  - 비교군: PR #58 ManualAssignmentForm·PR #60 결과 페이지·PR #66 ops 프로젝트 삭제는 모두 shadcn `AlertDialog` 로 통일됨
- **사용자 시나리오:** **케이스 A**(정지) — 운영관리자가 사용자 관리 페이지에서 활성 컨설턴트 옆 빨간 "정지" 텍스트 링크를 본다. 옆 셀의 "프로필 보기"를 누르려다 한 칸 옆을 잘못 클릭한다. 다이얼로그도 진행 표시도 없이 페이지가 새로고침되며 그 사용자가 정지된다. 이메일도 즉시 발송된다. **케이스 B**(템플릿 삭제) — 운영관리자가 자가진단 템플릿 카드 우측 ⋯ 메뉴에서 빨간 "삭제"를 클릭하면 브라우저 기본 다이얼로그(OS 별로 디자인 다름·앱 톤과 어색)가 뜬다. 같은 운영자가 5분 전에 ops 프로젝트 삭제 페이지에서 본 깔끔한 모달과는 외관이 전혀 다르다. 시각 일관성이 어긋나면서 "이게 진짜 시스템 다이얼로그인가, 아니면 뭔가 잘못 떴나?" 짧은 의심이 발생한다.
- **위배 원칙:** **H5 오류 예방, H4 일관성과 표준**
- **사용자 관점 개선 후:**
  - 정지 버튼 클릭 → AlertDialog 「**{사용자명}님을 정지하시겠습니까?**」 본문 「정지된 사용자는 즉시 로그인이 차단되며, 알림 메일이 발송됩니다.」 + "취소"·"정지"(destructive) 두 버튼.
  - 템플릿 삭제 메뉴 클릭 → 동일 톤의 AlertDialog 「**이 템플릿을 삭제하시겠습니까?**」 본문 「이 작업은 되돌릴 수 없습니다.」 + "취소"·"삭제"(destructive). 같은 모양·같은 위치·같은 톤. 운영자는 "비가역 액션은 항상 같은 모양의 모달로 묻는다"는 단일 멘탈 모델만 학습하면 됨.

```text
[이전 — 정지]              [이전 — 템플릿 삭제]
┌──────────────────────┐  ┌─────────────────────────┐
│ 김컨설 | … | [정지]  │  │ ⋯메뉴: [활성화][복제]   │
│   클릭 즉시            │  │           [삭제]        │
│   → 정지·메일 발송     │  │   클릭 → 브라우저 native │
│   (확인 0)             │  │     "이 템플릿을 삭제…?" │
└──────────────────────┘  │     [확인][취소] (OS UI) │
                          └─────────────────────────┘
```

```text
[이후 — 정지·삭제 통일]
┌────────────────────────────────────────────┐
│  김컨설님을 정지하시겠습니까?                 │
│  정지된 사용자는 즉시 로그인이 차단되며,      │
│  알림 메일이 발송됩니다.                     │
│                                            │
│              [취소]   [정지]               │
└────────────────────────────────────────────┘

┌────────────────────────────────────────────┐
│  이 템플릿을 삭제하시겠습니까?                │
│  이 작업은 되돌릴 수 없습니다.                │
│                                            │
│              [취소]   [삭제]               │
└────────────────────────────────────────────┘
```

- **개발자 구현 노트:**
  - **UserManagementTable**: `renderUserActions` 의 `isApprovedAndActive` 분기에서 `<TableActionLink onClick={() => handleAction(id, 'suspend')}>` 를 `AlertDialogTrigger` 로 감싸기. confirm 후 onConfirm 핸들러에서 `handleAction(id, 'suspend')` 호출. (승인·활성화는 비파괴 액션이므로 그대로 둘 것 — destructive 만 게이트.)
  - **TemplateList**: `mutate({ confirmMessage, ... })` 헬퍼의 `confirm()` 분기 제거 → 호출처에서 AlertDialog 컴포넌트 사용. 또는 헬퍼 시그니처를 `confirmMessage?: string | { title; description }` 로 확장하고 내부에서 AlertDialog 트리거.
  - 활성화(`isPending && template.is_active === false → onSetActive`)도 같은 헬퍼를 쓰므로, 활성화는 비파괴이지만 다이얼로그 톤 통일은 OK (옵션).
  - 재사용 자산: `src/components/ui/alert-dialog.tsx` (PR #58·#60·#66 도입 검증 완료), `ManualAssignmentForm.tsx` 의 분기 패턴.
  - 단위 테스트: `UserManagementTable.test.tsx` 의 정지 클릭 시나리오에 AlertDialog 사전 확인 검증 추가 / `TemplateList.test.tsx` 의 native confirm mock 제거 후 AlertDialog interaction 으로 교체.

---

### #3 [★★★ H4·H2] 비밀번호 찾기 흐름 3개 페이지의 행위 표현이 「잊으셨나요 → 재설정 → 변경」으로 매번 달라짐

- **위치:**
  - 인증 > 로그인: `src/app/(auth)/login/page.tsx:98` ("비밀번호를 잊으셨나요?" 링크)
  - 인증 > 비밀번호 찾기: `src/app/(auth)/forgot-password/page.tsx:160` ("재설정 메일 받기" 버튼) + `src/app/(auth)/forgot-password/_meta.ts` (PAGE_TITLE)
  - 인증 > 비밀번호 변경: `src/app/(auth)/reset-password/page.tsx:279` ("비밀번호 변경" 버튼) + `src/app/(auth)/reset-password/_meta.ts` (PAGE_TITLE)
- **사용자 시나리오:** 비밀번호를 잊은 사용자가 로그인 페이지에서 「비밀번호를 **잊으셨나요?**」를 클릭한다. 다음 페이지의 큰 제목과 버튼이 「**재설정** 메일 받기」다. "어… 재설정이 잊으셨나요와 같은 건가?"라는 짧은 의심. 메일을 받아 링크를 클릭한다. 다음 페이지의 버튼은 「비밀번호 **변경**」이다. "이번엔 또 변경?" 사용자는 동일한 한 가지 행위(잠금 복구)를 세 가지 다른 단어로 마주친다. 신규 사용자에게는 학습 부하, 기존 사용자에게도 "내가 지금 어느 단계에 있는지" 시그널이 약화된다. 또한 reset-password 페이지의 토큰 만료 메시지에서 「재설정 링크가 유효하지 않습니다 / 만료되었거나 이미 사용되었습니다」와 같은 문구가 노출되는데, 페이지 제목·버튼에는 "변경"이 등장해 메시지 안의 용어와도 어긋난다.
- **위배 원칙:** **H4 일관성과 표준, H2 시스템과 현실 세계의 일치**
- **사용자 관점 개선 후:** 한 행위에는 한 단어 — **"재설정"** 으로 통일.
  - login:98 링크: 「**비밀번호를 잊으셨나요?**」(질문형은 보존 가능) 또는 「**비밀번호 재설정**」으로 변경
  - forgot-password 제목·버튼: 「비밀번호 재설정」·「**재설정 메일 받기**」 (그대로 유지)
  - reset-password 제목·버튼: 「비밀번호 재설정」·「**비밀번호 재설정**」 (현재 "변경" → "재설정")
  - 진행 중 라벨: 「변경 중...」 → 「재설정 중...」
  - 안내 문구: 「변경 후에는 새 비밀번호로 다시 로그인해주세요.」 → 「재설정 후에는 새 비밀번호로 다시 로그인해주세요.」
  
  사용자는 "잠금 복구는 항상 '재설정'이다"라는 단일 멘탈 모델만 학습.

```text
[이전]
로그인          → 비밀번호 찾기      → 비밀번호 변경
"비밀번호를       "재설정 메일 받기"   "비밀번호 변경"
잊으셨나요?"     "메일 보내는 중..."   "변경 중..."

  └─ 잊다       └─ 재설정           └─ 변경
     (3개 단어가 한 흐름에 혼재)
```

```text
[이후 — "재설정" 단일 통일]
로그인          → 비밀번호 재설정    → 비밀번호 재설정
"비밀번호를       "재설정 메일 받기"   "비밀번호 재설정"
잊으셨나요?"     "재설정 메일          "재설정 중..."
                  보내는 중..."

  └─────────── 재설정 ───────────┘
     (한 흐름에 한 단어)
```

- **개발자 구현 노트:**
  - 변경 지점:
    - `src/app/(auth)/reset-password/page.tsx:276-280` — `'비밀번호 변경'` → `'비밀번호 재설정'`, `'변경 중...'` → `'재설정 중...'`
    - `src/app/(auth)/reset-password/page.tsx:269` (또는 그 부근의 안내 박스) — `'변경 후에는'` → `'재설정 후에는'`
    - `src/app/(auth)/reset-password/_meta.ts` 의 PAGE_TITLE/DESCRIPTION 이 "변경"이라면 "재설정"으로 (CLAUDE.md "page ↔ loading 헤더 텍스트 동기화" 규칙 준수)
    - login:98 은 질문형으로 보존하되 hover/aria 툴팁 통일 ("비밀번호 재설정") 권장
  - 사전 grep (CLAUDE.md "사전 grep 으로 영향 범위 점검"): `grep -rn "비밀번호 변경\|변경 중\b" src/app/\(auth\)` 으로 누락 점검
  - reset-password 페이지의 토큰 만료 메시지 (`src/app/(auth)/reset-password/page.tsx` 검색: "유효하지 않습니다") — 「이미 사용되었습니다」 문구는 보안 관점에서 "메일을 다시 요청해주세요" 정도로 약화 권장 (별도 항목, 본 이슈에서는 우선순위 외)
  - 단위 테스트: `reset-password.test.tsx` 의 노출 라벨 검증 (`screen.getByText('비밀번호 재설정')`)

---

### #4 [★★★ H1·H7] 사용자 관리 검색이 0건일 때 EmptyState 가이드가 빈약 — "왜 비었는지", "어떻게 풀어낼지" 신호 부재

- **위치:** 운영관리 > 사용자 관리 (검색·필터 적용 후 0건 상태)
  - `src/components/ops/UserManagementTable.tsx:583-593` (`isFilteredEmpty` 분기 — 정적 EmptyState 만 노출, 활성 필터·검색어 미명시, 초기화 버튼 없음)
  - `src/components/ops/UserManagementTable.tsx:294` (`hasFilters` 변수 이미 존재 — 재사용 가능), 484-497 (활성 FilterBadge 그룹 — 패턴 이미 도입돼 있음)
- **사용자 시나리오:** 신규 운영자가 사용자 관리 페이지에서 "kim"으로 검색한다. 결과가 0건이다. 화면에 「**검색 결과가 없습니다** / 검색어 또는 필터 조건을 변경해 보세요」 EmptyState 가 뜬다. 운영자는 "정말 'kim'이라는 사용자가 없는 건가?"인지, 아니면 위에 있는 **역할 필터: '운영관리자'** 가 함께 적용돼 한 번에 너무 많이 필터링된 건지 단번에 알지 못한다. 화면 상단 FilterBadge 영역까지 시선을 다시 올려 직접 칩들을 하나씩 확인해야 한다. 게다가 모든 필터를 한 번에 비우려면 칩들을 하나씩 X 클릭해야 한다 — 검색·역할·상태 3개를 모두 적용한 상태였다면 클릭 3번. 신규 운영자는 페이지를 새로고침해 처음부터 다시 시작하는 우회를 택한다.
- **위배 원칙:** **H1 시스템 상태의 가시성, H7 사용의 유연성과 효율성**
- **사용자 관점 개선 후:** 별도의 안내 박스를 추가하지 않고, **기존 EmptyState 자체를 풍부하게** 만든다 — 한 영역에 "왜 비었는지 + 어떻게 풀지"가 모두 들어간다 (정보·시각 신호·액션이 한 카드에 응집되어 H8 미적·최소 디자인도 함께 보존). 노출 화면:
  > 🔍 (검색 아이콘)  
  > **'kim'과 일치하는 사용자가 없습니다**  
  > 현재 적용된 필터: **역할: 운영관리자**, **상태: 활성**  
  > [ **필터 초기화** ]
  
  분기:
  - 검색어 + 필터 둘 다 있음 → 「'{검색어}'과(와) 일치하는 사용자가 없습니다」 + 「현재 적용된 필터: …」
  - 검색어만 있음 → 「'{검색어}'과(와) 일치하는 사용자가 없습니다」
  - 필터만 있음 → 「조건과 일치하는 사용자가 없습니다」 + 「현재 적용된 필터: …」
  - 등록 사용자 자체가 0명(상위 분기 `users.length === 0`) → 기존 「등록된 사용자가 없습니다」 + 설명 그대로 (필터 초기화 액션 없음)
  
  「필터 초기화」 한 클릭으로 검색어·역할·상태 3종을 동시에 리셋. 운영자는 0건이 든 이유를 1초 안에 인지하고 한 클릭으로 풀어낸다.

```text
[이전]
┌──────────────────────────────────────────┐
│ [검색: "kim" ✕] [역할: 운영관리자 ✕]    │
│ [상태: 활성 ✕]                            │
│                                          │
│ ┌──────────────────────────────┐         │
│ │      🔍                      │         │
│ │  검색 결과가 없습니다          │         │
│ │  검색어 또는 필터 조건을        │         │
│ │  변경해 보세요                 │         │
│ └──────────────────────────────┘         │
│                                          │
│ ← 필터 칩 3개를 하나씩 X 클릭해야 함        │
│   "왜 비었는지" 단서 부재                  │
└──────────────────────────────────────────┘
```

```text
[이후 — 한 영역으로 통합]
┌──────────────────────────────────────────┐
│ [검색: "kim" ✕] [역할: 운영관리자 ✕]    │
│ [상태: 활성 ✕]                            │
│                                          │
│ ┌──────────────────────────────────────┐ │
│ │              🔍                      │ │
│ │                                      │ │
│ │  'kim'과 일치하는 사용자가 없습니다   │ │
│ │                                      │ │
│ │  현재 적용된 필터:                    │ │
│ │  역할: 운영관리자, 상태: 활성          │ │
│ │                                      │ │
│ │         [ 필터 초기화 ]              │ │
│ └──────────────────────────────────────┘ │
└──────────────────────────────────────────┘
```

- **개발자 구현 노트:**
  - 기존 `EmptyState` 컴포넌트(`src/components/ui/EmptyState.tsx`) 가 이미 `description` + `action` prop 을 받음 — 신규 박스 추가 불필요. 동일 파일에 **`NoSearchResults`** 헬퍼(`EmptyState.tsx:43-62`) 도 이미 존재하지만 `message` 한 줄만 받고 description 슬롯이 없어 활성 필터 라벨을 별도로 노출하기 어렵다 → 본 케이스는 `EmptyState` 직접 사용 + description 에 활성 필터 문자열 동적 조립이 가장 깔끔.
  - `UserManagementTable.tsx:583-593` 의 `isFilteredEmpty` 분기 교체:
    ```tsx
    {isFilteredEmpty && (() => {
      const titleText = debouncedSearch
        ? `'${debouncedSearch}'과(와) 일치하는 사용자가 없습니다`
        : '조건과 일치하는 사용자가 없습니다';
      const filterParts = [
        selectedRoleLabel && `역할: ${selectedRoleLabel}`,
        selectedStatusLabel && `상태: ${selectedStatusLabel}`,
      ].filter(Boolean);
      const descriptionText = filterParts.length > 0
        ? `현재 적용된 필터: ${filterParts.join(', ')}`
        : undefined;
      return (
        <TableRow>
          <TableCell colSpan={6} className="p-0">
            <EmptyState
              icon={<Search className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400" />}
              title={titleText}
              description={descriptionText}
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchInput('');
                    handleRoleChange(DEFAULT_FILTER_VALUE);
                    handleStatusChange(DEFAULT_FILTER_VALUE);
                  }}
                >
                  필터 초기화
                </Button>
              }
            />
          </TableCell>
        </TableRow>
      );
    })()}
    ```
  - 모바일 카드 분기(598줄 이후 `md:hidden` 영역) 에도 동일 EmptyState 호출. TableRow 래핑 없이 그대로.
  - 재사용 자산: `EmptyState` (`src/components/ui/EmptyState.tsx`), `selectedRoleLabel`·`selectedStatusLabel`·`hasFilters` (이미 상위에서 산출됨), `setSearchInput`·`handleRoleChange`·`handleStatusChange` (이미 정의), `Button` (`src/components/ui/button.tsx`).
  - **선택적 후속 개선** — `NoSearchResults` 헬퍼를 `description?: string` + `filters?: string[]` 까지 받도록 확장하면 ProjectList·TemplateList 등 동형 검색 화면에서 재사용 가능. 본 PR 범위 외 sweep 후보.
  - 단위 테스트: 검색·역할·상태 조합별 4가지 시나리오에서 EmptyState title/description 노출 검증 + 「필터 초기화」 클릭 → `setSearchInput('')` + roleFilter·statusFilter 가 DEFAULT_FILTER_VALUE 로 복귀 검증.

---

### #5 [★★★ H2·H4·H7] StaleResultBanner 「결과 재생성하기」 라벨이 실제 동작과 어긋남 — 클릭해도 재생성되지 않고 결과 페이지로 이동만 함

- **위치:** 컨설턴트 > 담당 프로젝트 > 인터뷰 검토 (stale 배너)
  - `src/app/(dashboard)/consultant/projects/[id]/interview/review/_components/StaleResultBanner.tsx:54-63,97` (버튼 라벨 「결과 재생성하기」 + `handleRegenerate` 가 감사 로그 기록 후 단순 `router.push(resultPath)` — LLM 호출 0건)
  - `src/app/(dashboard)/consultant/projects/[id]/interview/review/actions.ts:158-211` (`triggerResultRegenerationFromReview` — 액션 주석에 *"실제 LLM 트리거는 결과 페이지에서 수행되므로 본 액션은 감사로그만 남긴다"* 명시)
  - 결과 페이지의 실제 재생성 진입점: `src/components/roadmap/RegenerateAccordion.tsx:37` (메인 버튼 라벨 「**새 버전 생성**」) → 펼침 후 「수정 요청 사항 (선택)」 textarea(`L52-63`) 입력 → 「재생성」 버튼 클릭 시 `onGenerate(revisionPrompt)` LLM 호출
  - 동시 영향: PBL 트랙의 동형 stale 배너 (있다면)도 동일 결함
- **사용자 시나리오:** 컨설턴트가 인터뷰 검토 페이지의 노란 배너 「인터뷰가 로드맵 생성 이후 변경되었습니다」를 본다. 「**결과 재생성하기**」 버튼을 클릭한다. 1~2초간 스피너가 돌고 결과 페이지로 이동한다. **그런데 화면에는 옛 로드맵이 그대로 떠 있다.** 컨설턴트: "어, 재생성한다고 했는데?" 화면을 천천히 살피다 페이지 어딘가의 「**새 버전 생성**」 버튼을 발견하고 또 클릭, 「수정 요청 사항」 입력 칸이 펼쳐지면 비워두거나 적당히 입력 후 「재생성」을 누른다. 그제야 LLM 이 돌고 새 결과가 나온다. 동작은 결국 같지만 **검토 페이지의 라벨이 즉시 재생성을 시사**해 신뢰가 한 번 깨졌고, 같은 흐름에 「재생성하기」와 「새 버전 생성」 두 가지 다른 단어가 섞여 인지 부담이 생긴다.
- **위배 원칙:** **H2 시스템과 현실 세계의 일치, H4 일관성과 표준, H7 사용의 유연성과 효율성**
- **사용자 관점 개선 후:** **두 가지를 동시에 적용 (옵션 C):**
  
  1. **라벨 통일** — 검토 페이지의 진입 버튼 라벨을 「결과 재생성하기」 → 「**새 버전 생성**」 으로 변경. 결과 페이지 `RegenerateAccordion` 의 메인 버튼과 정확히 동일한 단어. 사용자는 "검토 페이지에서 누른 버튼이 결과 페이지에서 같은 이름으로 펼쳐져 있구나" 즉시 인지.
  2. **수정 요청 칸 자동 펼침** — 클릭 시 `?regenerate=open` 쿼리로 결과 페이지에 진입 → 결과 페이지가 쿼리를 감지해 `RegenerateAccordion`을 자동 펼침 + textarea 자동 포커스 + 그 영역으로 부드럽게 스크롤. 사용자는 결과 페이지의 「새 버전 생성」 버튼을 또 찾아 클릭하는 한 단계가 사라진다 — 도착하자마자 곧장 수정 요청을 입력하거나 비워둔 채 「재생성」 한 번만 누르면 LLM 호출 + `RoadmapLoadingOverlay` 노출 (일반 생성 시 오버레이와 **동일** 컴포넌트, 학습 부하 0).
  
  LLM 호출 시점은 사용자가 의식적으로 「재생성」을 누른 한 순간으로 통제됨 — 쿼터·비용도 보존되고 prompt 입력 기회도 보존됨. 클릭 횟수: 현행 4회 → 2회로 감소.

```text
[이전]
검토 페이지                       결과 페이지
┌─────────────────────────┐      ┌─────────────────────────┐
│ ⚠ 인터뷰가 변경됨          │      │ 〔옛 로드맵 그대로 노출〕  │
│                         │      │                         │
│ [결과 재생성하기] ─────────│ ───→│  사용자: "재생성 안 됐나?" │
│                         │      │                         │
│ (router.push만,          │      │ ▼ 페이지 어딘가에서        │
│  LLM 호출 0건)            │      │ [+ 새 버전 생성] 직접 찾아 │
└─────────────────────────┘      │  클릭 → 펼침 → 입력 → 재생성│
                                 └─────────────────────────┘
   라벨「재생성」 vs 결과 페이지 라벨「새 버전 생성」— 단어 불일치
   사용자 클릭 횟수: 4회 (검토[재생성] → 결과[새 버전 생성] → 입력 → [재생성])
```

```text
[이후 — 옵션 C: 라벨 통일 + 수정 요청 칸 자동 펼침]
검토 페이지                       결과 페이지(?regenerate=open)
┌─────────────────────────┐      ┌─────────────────────────────┐
│ ⚠ 인터뷰가 변경됨          │      │ 〔옛 로드맵 (배경)〕          │
│                         │      │                             │
│ [+ 새 버전 생성] ─────────│ ───→ │ ┌──「새 버전 생성」자동 펼침─┐│
│                         │      │ │ 수정 요청 사항 (선택)       ││
│ (?regenerate=open       │      │ │ ┌─────────────────────┐   ││
│  쿼리 부착)              │      │ │ │ 〔커서 깜빡임·포커스〕  │   ││
└─────────────────────────┘      │ │ └─────────────────────┘   ││
                                 │ │       [취소]  [재생성]    ││
   ↑ 라벨이 결과 페이지와 정확히 동일       │ └───────────────────────────┘│
                                 │ ↓ [재생성] 클릭 시 LLM      │
                                 │  RoadmapLoadingOverlay 노출  │
                                 │  (일반 생성 시와 동일 오버레이)│
                                 └─────────────────────────────┘
   사용자 클릭 횟수: 2회 (검토[새 버전 생성] → 결과[재생성])
```

- **개발자 구현 노트:**
  - **StaleResultBanner.tsx:97** — 버튼 라벨 변경:
    ```tsx
    {isPending ? (<Loader2 className="mr-1 size-4 animate-spin" />) : (<Plus className="mr-1 size-4" />)}
    새 버전 생성
    ```
    `RefreshCw` 아이콘 → `Plus` 아이콘으로 교체 (결과 페이지 RegenerateAccordion.tsx:37 과 완전 일치). `import { Plus } from 'lucide-react'`.
  - **StaleResultBanner.tsx:61** — router.push 에 쿼리 부착:
    ```tsx
    const path = result.data?.resultPath ?? `/consultant/projects/${projectId}/${track === 'PBL' ? 'pbl' : 'roadmap'}`;
    router.push(`${path}?regenerate=open`);
    ```
  - **RegenerateAccordion.tsx** — props 확장으로 외부에서 자동 펼침 가능:
    ```tsx
    interface RegenerateAccordionProps {
      // 기존 props…
      defaultOpen?: boolean;
      autoFocus?: boolean;
    }
    // L24: const [open, setOpen] = useState(defaultOpen ?? false);
    // textarea 에 autoFocus 또는 useEffect + ref 로 포커스 명령
    ```
  - **RoadmapResultClient.tsx 290-297** + **PBLResultClient.tsx 동일 위치** — `useSearchParams` 로 `regenerate === 'open'` 감지 시 `defaultOpen` + `autoFocus` true 전달. RegenerateAccordion 영역에 `ref` + `useEffect` 로 마운트 직후 `scrollIntoView({ behavior: 'smooth', block: 'center' })`. 펼침 후 URL cleanup — `router.replace(pathname)` 으로 쿼리 제거(히스토리 누적 방지).
  - **LLM은 자동 호출 안 함** — 사용자가 결과 페이지에서 「재생성」을 누른 시점에만 `onGenerate(revisionPrompt)` 호출 → 기존 `RoadmapLoadingOverlay` 흐름 그대로 (RoadmapResultClient.tsx:327-334, PBLResultClient.tsx:246).
  - **PBL 트랙** — 같은 패턴이 PBL 검토 페이지에 stale 배너가 있다면 동일 적용. 없다면 본 PR 범위는 ROADMAP 만.
  - 재사용 자산: `src/components/roadmap/RegenerateAccordion.tsx` (defaultOpen·autoFocus prop 추가), `src/components/roadmap/RoadmapLoadingOverlay.tsx` (변경 없음), `useSearchParams`·`useRouter` (`next/navigation`).
  - **단위 테스트:**
    - StaleResultBanner: 버튼 라벨이 「새 버전 생성」 검증 / `router.push` 호출 시 `?regenerate=open` 포함 검증
    - RegenerateAccordion: `defaultOpen=true` 시 첫 렌더부터 펼쳐짐 / `autoFocus=true` 시 textarea 포커스
    - RoadmapResultClient: `?regenerate=open` 쿼리 시 RegenerateAccordion 펼친 채 렌더 + 마운트 후 URL cleanup

---

## 한 세션 작업 권장 순서

추정 총 작업 시간 **약 2시간**. 사용자 영향 큰 데이터 무결성·매일 동선부터:

| 순서 | 이슈 | 추정 | 비고 |
|---|---|---|---|
| 1 | #1 인터뷰 차수/행 삭제 AlertDialog 일괄 적용 (3 파일) | 35분 | ConfirmRemoveRowButton 추출 또는 인라인. 자동저장 로직 무변화 |
| 2 | #2 사용자 정지 + 템플릿 삭제 AlertDialog 통일 | 30분 | UserManagementTable: AlertDialogTrigger / TemplateList: native `confirm()` 제거 |
| 3 | #5 StaleResultBanner 라벨 「새 버전 생성」 + ?regenerate=open + RegenerateAccordion 자동 펼침 | 30분 | 라벨/아이콘 통일 + RegenerateAccordion props 확장(defaultOpen·autoFocus) + 결과 페이지 useSearchParams 분기 + scrollIntoView |
| 4 | #4 사용자 관리 검색 0건 안내·초기화 버튼 | 20분 | 한 컴포넌트, 기존 변수 재사용, 모바일 분기 동일 적용 |
| 5 | #3 비밀번호 흐름 용어 "재설정" 통일 | 10분 | reset-password page + _meta.ts 텍스트만 수정 |

---

## 재사용 가능한 기존 자산

| 자산 | 경로 | 본 보고서 활용 |
|---|---|---|
| `AlertDialog` (destructive 포함) | `src/components/ui/alert-dialog.tsx` | #1 행 삭제 다이얼로그, #2 정지·템플릿 삭제 다이얼로그 |
| `ManualAssignmentForm` 의 분기 패턴 | `src/components/ops/ManualAssignmentForm.tsx` (PR #58) | #2 정지 버튼 AlertDialogTrigger 차용 |
| `useInterviewAutoSave` (자동저장) | `src/app/(dashboard)/consultant/projects/[id]/interview/_hooks/useInterviewAutoSave.ts` | #1 — 다이얼로그가 emit 호출만 게이트, 자동저장 자체 무변화 |
| `RoadmapLoadingOverlay` | `src/components/roadmap/RoadmapLoadingOverlay.tsx` | #5 「재생성」 클릭 후 LLM 호출 시 노출 (변경 없음, 재사용만) |
| `RegenerateAccordion` | `src/components/roadmap/RegenerateAccordion.tsx` | #5 defaultOpen·autoFocus prop 확장으로 검토 페이지 진입 시 자동 펼침 |
| `useSearchParams` / `useRouter` | `next/navigation` | #5 ?regenerate=open 쿼리 감지 + URL cleanup |
| `EmptyState` (icon·title·description·action 슬롯) | `src/components/ui/EmptyState.tsx:5-38` | #4 한 영역 통합 표현 (안내 박스 신규 추가 불필요) |
| `NoSearchResults` 헬퍼 | `src/components/ui/EmptyState.tsx:43-62` | #4 — 후속 확장 후보 (description·filters prop 추가 시 다른 검색 화면 재사용) |
| `FilterBadge` + `selectedRoleLabel` 등 | `src/components/ops/UserManagementTable.tsx` 287-294, 484-497 | #4 활성 필터 라벨·초기화 버튼 |
| `_meta.ts` (헤더 텍스트 단일 출처) | `src/app/(auth)/reset-password/_meta.ts` 등 | #3 page+loading 헤더 동기화 (CLAUDE.md 규칙) |
| `Button` (variant 다수) | `src/components/ui/button.tsx` | #4 "필터 초기화" |
| `showSuccessToast`·`showErrorToast` | `src/lib/utils/toast.ts` | #1·#2·#5 토스트 표준 |

---

## 검증 체크리스트

구현 세션 종료 시 다음을 모두 만족해야 한다:

- [ ] `npm run validate` (typecheck + lint + test) 통과
- [ ] `npm run build` 통과
- [ ] **#1**: 인터뷰 입력의 모든 행 삭제 휴지통 클릭 → AlertDialog 「**{N}차 행을 삭제하시겠습니까?**」 노출 → "취소" 시 행 유지·"삭제" 시 행 제거 + 자동저장. 빈 행에도 동일 다이얼로그 노출. 3개 Step 파일 모두에 일관 적용 + PBL 트랙 동형 Step 동일 적용
- [ ] **#2**: 사용자 관리 정지 클릭 → AlertDialog 「**{사용자명}님을 정지하시겠습니까?**」 → "정지"(destructive) 시에만 `updateUserStatus` 호출. 자가진단 템플릿 삭제 클릭 → 동일 톤의 AlertDialog 「이 템플릿을 삭제하시겠습니까?」 (native `confirm()` 제거 확인)
- [ ] **#3**: reset-password 의 노출 라벨이 「**비밀번호 재설정**」·「재설정 중...」·「재설정 후에는 새 비밀번호로...」 으로 통일. _meta.ts PAGE_TITLE 도 일관. login/forgot-password 와 한 흐름 안에서 동일 단어
- [ ] **#4**: 사용자 관리에서 일치 0건 검색 → EmptyState 위에 「**'{검색어}'**과(와) 일치하는 사용자가 없습니다. 현재 적용된 필터: 역할: …, 상태: …」 + 「**필터 초기화**」 버튼 노출. 클릭 시 검색어·역할·상태 3종 동시 리셋. 모바일 카드 분기에서도 동일
- [ ] **#5**: StaleResultBanner 버튼 라벨이 「**새 버전 생성**」(아이콘 Plus) + 클릭 시 URL 에 `?regenerate=open` 부착 → 결과 페이지 진입 시 RegenerateAccordion 자동 펼침 + textarea 포커스 + 부드러운 스크롤 → 마운트 후 URL cleanup. 사용자가 「재생성」 누른 시점에만 LLM 호출(자동 호출 X) + 기존 RoadmapLoadingOverlay 노출 흐름 그대로

---

## 범위 외 (Out of Scope)

다음은 본 조사에서 발견됐지만 한 세션 분량 초과 또는 별도 정책 결정이 필요해 본 보고서에서 제외:

- **showErrorToast(result.error) 인자 1개 호출 sweep** — `StepTaskAnalysis:121`, `StepHrdReportPdf` 2개 위치 등 title-only 호출이 잔존해 description 이 비어있는 토스트를 만든다. 별도 chore PR
- **reset-password 토큰 만료 메시지 보안 강도** — 「이미 사용되었습니다」 노출이 토큰 존재 여부를 외부에 노출 — Supabase Auth 정책 결정 선행 후 별도 PR
- **운영자 대시보드 우선순위 카드** — 사용자 명시 거부(2026-05-04 v3 #5), 재제안 금지
- **인터뷰 작성 단계별 필드 완성도 진행률 시각화** — Stepper + validateStep prop 전사 도입, 별도 epic
- **인터뷰 검토 페이지 앵커 네비게이션 사이드바** — 8~9개 섹션 점프 링크, 디자인 결정 선행
- **갤러리 좋아요 실패 토스트의 "다시 시도" 액션** — Sonner action prop 도입 시 일괄 — InlineEditField 의 #1(PR #60) 패턴 참조 가능
- **테이블 정렬 헤더 클릭 일관성** — v1·v2·v3 OOS 그대로 유지
- **알림 풀페이지** — 100건 이상 누적 시 풀페이지 (v1·v2·v3 OOS 그대로)
- **사용자 관리 일괄 처리** — RLS·감사로그 정책 검토 필요 (v1·v2·v3 OOS 그대로)
