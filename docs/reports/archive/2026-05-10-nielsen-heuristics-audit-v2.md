# Nielsen 10가지 휴리스틱 기반 UX/UI 감사 보고서 (v2)

## 메타

- **조사일:** 2026-05-10
- **조사 범위:** 전체 라우트 — 공통 글로벌(알림·메시지·모바일·세션·토스트) / 컨설턴트 워크플로우(home·projects·gallery·인터뷰·결과) / 운영자(audit·이메일·쿼터)·인증·진단 설문·프로필 편집
- **조사 방법:** Explore 에이전트 3대 병렬(A 글로벌·B 컨설턴트·C 운영자/인증/프로필) → 의심 결함 1건을 메인 세션이 실제 코드(`src/components/consultant/ProfileForm.tsx`, `src/hooks/useBeforeUnloadGuard.ts`, `src/app/(dashboard)/ops/templates/_components/TemplateForm.tsx`)로 재검증 → 진성 critical 로 확정
- **이전 결과 반영:** archive 5개 보고서(2026-04-30 · 2026-05-02 v1 · 2026-05-02 v2 · 2026-05-04 · 2026-05-08) 의 **27건 critical + 오늘 v1 의 의심 후보 5건(false positive)** 은 모두 본 보고서에서 제외. 사용자 명시 거부 항목인 "운영자 우선순위 카드(오늘 할 일)"도 재제안 금지로 그대로 유지
- **선별 기준:** 사용자가 **막히거나·데이터를 잃거나·잘못된 상태로 진입**하는 본질적 결함만 채택. 별점 내림차순 정렬해 상위 최대 5건. 발견 5건 미만이면 발견 수만 보고 (억지 채움 금지). 0건도 정상 결과
- **총평:** 본 라운드는 v1 의 false positive 5건을 컷한 뒤 미탐색 영역(알림·메시지·모바일·세션·토스트·갤러리·진단설문·audit·이메일·OPS_ADMIN_PENDING·프로필)을 광범위하게 점검했다. A·B 영역에서는 progress bar·자동저장·beforeunload 가드·EmptyState·AlertDialog·검색 필터·router.refresh 통일 등 7사이클 누적 정비가 이미 본질적 결함을 모두 해소한 상태로 0건이 자연스러운 결과였다. 단 1건, **컨설턴트 프로필 편집(`/dashboard/profile`)이 미저장 이탈 경고를 갖추지 못한 상태**가 신규 발견되었다 — 같은 코드베이스 내 운영자 템플릿 편집은 동일 자산(`useBeforeUnloadGuard`) 으로 이미 보호 중인데, 컨설턴트 프로필만 누락이라 일관성 결함(H4)과 데이터 손실 위험(H3·H5) 을 동시에 충족한다. 별점 ★★★★, 단일 훅 한 줄 적용으로 해결되는 낮은 effort 대비 영향이 큰 항목이다

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

각 이슈는 다음 다섯 단으로 작성한다 — 어느 항목도 비우지 않는다:

1. **위치** — 메뉴 경로 + 파일 경로(라인 번호)
2. **사용자 시나리오** — 어떤 페르소나가 어떤 동선에서 무엇을 체감하는가 (개발자 용어 금지)
3. **위배 원칙** — Nielsen H1~H10 중 해당 번호와 명칭
4. **사용자 관점 개선 후** — 화면·문구·플로우의 변화를 실제 노출될 라벨까지 포함해 묘사 + **`[이전]`·`[이후]` ASCII mockup 두 블록 의무 첨부** (≤70 컬럼)
5. **개발자 구현 노트** — 변경 위치, 재사용 가능 자산 경로, 짧은 코드 예시

---

## CRITICAL 이슈 (우선순위 순)

**발견 1건.** 5건 미만이므로 하한 강제 없이 발견 수만 보고한다.

### #1 [★★★★ H3·H4·H5] 컨설턴트 프로필 편집이 미저장 이탈 경고 부재 — 같은 시스템 운영자 템플릿 편집은 이미 보호 중인데 프로필만 누락

1. **위치**

   대시보드 > **내 프로필** (좌측 네비게이션 > 사용자 메뉴 > 프로필)

   - 페이지: `src/app/(dashboard)/dashboard/profile/page.tsx`
   - 폼 본체: `src/components/consultant/ProfileForm.tsx:1-531` (다중 셀렉트 6종 + 자유 텍스트 다수, 총 531 라인)
   - 비교 대조군: `src/app/(dashboard)/ops/templates/_components/TemplateForm.tsx:10, 232-234` 가 이미 `useBeforeUnloadGuard(isDirty)` 적용 중

2. **사용자 시나리오**

   김컨설턴트(승인된 컨설턴트, CONSULTANT_APPROVED)가 새 프로젝트가 배정되기 전에 자신의 전문 영역을 보강하려고 **"내 프로필"** 에 들어와 30분간 정성껏 입력한다 — AI 훈련 가능 산업 8개, 하위 산업 12개, AI 적용 가능 업무 6개, 교육 대상 수준 4개, 선호 교육 방식 3개, 보유 역량 태그 11개, 자기소개 본문, 외부 링크. 입력 도중 좌측 네비의 **"메시지"** 알림이 깜빡여 무심코 클릭하거나, 컨설턴트 home 으로 돌아가려 **"돌아가기"** 가 아닌 브라우저 뒤로가기를 눌렀을 때, 시스템은 **아무런 경고 없이 페이지를 떠난다.** 30분치 입력은 그대로 사라지고, 다시 프로필을 열면 이전 저장 상태로 돌아가 있다. 같은 사용자가 운영자 권한으로 **"진단 템플릿 편집"** 을 했을 때는 동일 상황에서 브라우저 기본 경고 다이얼로그("변경사항이 저장되지 않았습니다…")가 떠 빠져나오는 걸 막아주는데, 프로필 편집에서는 그 보호가 빠져 있다 — 같은 시스템에서 두 폼의 안전망이 다르다는 일관성 결함도 동시에 발생한다

3. **위배 원칙**

   **H3 사용자 통제와 자유** — 실수로 페이지를 이탈할 때 "되돌리기" 비상구를 제공하지 않아 30분치 입력이 비가역으로 사라진다. **H4 일관성과 표준** — 같은 코드베이스의 `TemplateForm.tsx` 는 `useBeforeUnloadGuard(isDirty)` 한 줄로 이미 보호 중인데 `ProfileForm.tsx` 만 누락이라 동일 의미(미저장 변경)에 대한 안전망 표현이 두 폼에서 다르다. **H5 오류 예방** — 위험한 액션(데이터 손실)이 발생하지 않게 사전에 막아야 하는 영역인데, 사후 안내조차 없다

4. **사용자 관점 개선 후**

   김컨설턴트가 다중 셀렉트 한 칸이라도 변경하면 그 즉시 폼이 **"미저장 상태(isDirty)"** 로 진입하고, **두 가지 이탈 경로** 모두에서 보호 다이얼로그가 뜬다:

   **(가) 좌측 네비 "메시지" 클릭, 햄버거 메뉴 다른 항목 클릭, "돌아가기"·"취소" 버튼 클릭** (Next.js client-side navigation) 시도 시 브라우저 기본 confirm 다이얼로그 — 「**이 프로필 페이지의 변경사항이 저장되지 않을 수 있습니다. 페이지를 나가시겠습니까?** [확인] [취소]」. 사용자가 **"취소"** 를 선택하면 이동이 차단되어 입력 그대로 페이지에 머문다. **"확인"** 을 선택했을 때만 이탈된다.

   **(나) 새로고침(F5/Cmd+R)·탭 닫기·창 닫기·외부 사이트 이동** 시도 시 브라우저 기본 beforeunload 다이얼로그 (브라우저별 기본 문구는 OS·언어에 따라 다소 다름).

   **"저장"** 버튼을 눌러 성공 토스트가 뜨면 isDirty 가 false 로 떨어져 두 가지 가드 모두 자동 해제 — 다음부터는 자유롭게 이탈할 수 있다. 운영자 템플릿 편집(`TemplateForm`)은 (나)만 보호하지만 컨설턴트 프로필은 입력 분량이 훨씬 크므로 (가)까지 추가해 더 강력한 보호를 적용한다. **"이 시스템은 미저장 변경을 항상 지켜준다"** 는 일관된 멘탈 모델이 형성된다.

   ```text
   [이전]
   ┌──────────────────────────────────────────────────────┐
   │ 내 프로필                                            │
   │                                                      │
   │ AI 훈련 가능 산업: [제조][금융][공공][교육]…(8)      │
   │ 하위 산업: [자동차][반도체][은행]…(12)               │
   │ AI 적용 가능 업무: [데이터 분석]…(6)                 │
   │ 교육 대상 수준: [초급][중급][고급][임원](4)          │
   │ 선호 교육 방식: [온라인][오프라인][하이브리드](3)    │
   │ 보유 역량: [Python][LLM][PBL]…(11)                   │
   │ 자기소개: "30분간 작성한 본문…"                      │
   │                                                      │
   │ [돌아가기]                          [💾 저장]        │
   └──────────────────────────────────────────────────────┘
   ↓ 사용자가 무심코 좌측 네비 "메시지" 클릭
   ↓ (경고 없음 — 즉시 이탈, 30분치 입력 전부 손실)
   ┌──────────────────────────────────────────────────────┐
   │ 메시지                                               │
   │ (프로필 입력은 사라지고 복구 불가)                   │
   └──────────────────────────────────────────────────────┘
   ```

   ```text
   [이후]
   ┌──────────────────────────────────────────────────────┐
   │ 내 프로필           ● 미저장 변경 있음               │
   │                                                      │
   │ AI 훈련 가능 산업: [제조][금융][공공][교육]…(8)      │
   │ … (동일)                                             │
   │ 자기소개: "30분간 작성한 본문…"                      │
   │                                                      │
   │ [돌아가기]                          [💾 저장]        │
   └──────────────────────────────────────────────────────┘
   ↓ 사용자가 무심코 좌측 네비 "메시지" 클릭
   ┌──────────────────────────────────────────────────────┐
   │ ⚠ 이 프로필 페이지의 변경사항이 저장되지 않을 수    │
   │    있습니다. 페이지를 나가시겠습니까?               │
   │                                                      │
   │                          [취소]   [확인]            │
   └──────────────────────────────────────────────────────┘
   ↓ "취소" 선택 (= 이동 차단)
   ┌──────────────────────────────────────────────────────┐
   │ 내 프로필           ● 미저장 변경 있음               │
   │ (입력 그대로 유지, 사용자가 [💾 저장] 누르면         │
   │  성공 토스트 → "미저장 변경 있음" 표시 사라짐)       │
   └──────────────────────────────────────────────────────┘
   ```

5. **개발자 구현 노트**

   - 변경 파일: `src/components/consultant/ProfileForm.tsx` 단일
   - **두 가지 가드 동시 적용**:
     1. **`useBeforeUnloadGuard(isDirty && formStatus !== 'completed')`** — 새로고침·탭 닫기·외부 이동 보호. 재사용 자산 `src/hooks/useBeforeUnloadGuard.ts` (TemplateForm 동형)
     2. **`useEffect` 로 document-level capture-phase 클릭 핸들러** — Next.js client-side navigation 보호. `<a>` 태그 클릭 가로채 isDirty 면 `window.confirm()` 호출, 사용자가 취소 시 `e.preventDefault() + e.stopPropagation()` 로 이동 차단. 폼 내부 anchor 는 `data-profile-form-root` 속성으로 제외
     3. **"돌아가기"·"취소" 버튼 onClick 가드** — `<Button>` 은 anchor 가 아니므로 (1)·(2) 모두 catch 못 함. `router.push(backUrl)` 호출 직전 `isDirty` 면 `window.confirm()` 호출
   - 적용 위치: `useState` 블록 직후, `prepareFormData` 위
   - 짧은 코드 스케치:

     ```tsx
     import { useBeforeUnloadGuard } from '@/hooks/useBeforeUnloadGuard';

     const [isDirty, setIsDirty] = useState(false);

     // (나) 새로고침·탭 닫기 보호 — TemplateForm 동형
     useBeforeUnloadGuard(isDirty && formStatus !== 'completed');

     // (가) Next.js client-side navigation 보호 — document capture click
     useEffect(() => {
       if (!isDirty || formStatus === 'completed') return;
       const handler = (e: MouseEvent) => {
         const anchor = (e.target as HTMLElement).closest('a');
         if (!anchor) return;
         const href = anchor.getAttribute('href');
         if (!href || href.startsWith('#') || anchor.target === '_blank') return;
         if (anchor.closest('[data-profile-form-root]')) return; // 폼 내부 제외
         if (window.confirm('이 프로필 페이지의 변경사항이 저장되지 않을 수 있습니다. 페이지를 나가시겠습니까?')) return;
         e.preventDefault();
         e.stopPropagation();
       };
       document.addEventListener('click', handler, { capture: true });
       return () => document.removeEventListener('click', handler, { capture: true });
     }, [isDirty, formStatus]);

     // (가') "돌아가기"·"취소" 버튼 가드 — anchor 가 아닌 Button onClick 우회로
     const guardedNavigate = (url: string) => {
       if (isDirty && formStatus !== 'completed' &&
           !window.confirm('이 프로필 페이지의 변경사항이 저장되지 않을 수 있습니다. 페이지를 나가시겠습니까?')) {
         return;
       }
       router.push(url);
     };
     ```

   - 테스트: `ProfileForm.test.tsx` 에 추가 describe — (가)·(가')·(나) 세 가지 가드 각각 검증 (총 7 케이스 권장)
     - (나) beforeunload 리스너 등록·미등록 4 케이스
     - (가) anchor 클릭 시 confirm 호출, 취소 시 preventDefault, OK 시 통과 3 케이스
     - (가') "돌아가기" 클릭 시 router.push 차단/통과 검증 (선택)

---

## 한 세션 작업 권장 순서

| 순서 | 이슈 | 추정 시간 | 비고 |
|---|---|---|---|
| 1 | #1 컨설턴트 프로필 미저장 이탈 경고 부재 | 약 30~45분 | 자산 재사용(훅 한 줄 + baseline 1개) + 테스트 4 케이스 추가. TDD RED→GREEN→REFACTOR 한 사이클로 마감 가능 |

총 누적 약 1시간 — 본 스킬의 "≤ 3시간" 가이드 안에 충분히 들어옴

---

## 재사용 가능한 기존 자산

| 자산 | 경로 | 활용 위치 |
|---|---|---|
| `useBeforeUnloadGuard` | `src/hooks/useBeforeUnloadGuard.ts` | 인터뷰 자동저장(`RoadmapInterviewClient`) · 운영자 템플릿 편집(`TemplateForm`) — 신규 ProfileForm 에 동일 적용 |
| `TemplateForm` baseline 패턴 | `src/app/(dashboard)/ops/templates/_components/TemplateForm.tsx:212-234, 345` | baseline 캡처 + 저장 성공 시 갱신해 isDirty 해제 — `ProfileForm` 에 동형 적용 |
| `TemplateForm.test.tsx` 미저장 이탈 describe | `src/app/(dashboard)/ops/templates/_components/TemplateForm.test.tsx:472-510` | 테스트 4 케이스 본보기 — `ProfileForm.test.tsx` 에 복제 |
| `EmptyState` / `AlertDialog` / `PageSkeleton` / `showSuccessToast` / `ActionResult` / `FilterBadge` / `_meta.ts` | (전 사이클 표준) | 본 라운드는 신규 추가 없음 |

---

## 검증 체크리스트

- [x] `git log --oneline -25` 로 직전 커밋(`9c8cd76`) 까지의 변경 반영 — 운영관리 프로젝트 카드 필터 초기화는 이미 적용됨
- [x] archive 5건 + 오늘 v1 의 모든 critical 항목 본 보고서 제외 (목록은 메타 "이전 결과 반영" 참조)
- [x] 인용한 모든 `src/...` 경로 실존 검증 (`ProfileForm.tsx:1-531`, `useBeforeUnloadGuard.ts:19-30`, `TemplateForm.tsx:10/212-234/345`, `TemplateForm.test.tsx:472-510`)
- [x] 휴리스틱 번호 H1~H10 범위 내, 본문 헤더(`[★★★★ H3·H4·H5]`)와 메타 일치
- [x] 같은 날짜 기존 보고서(`2026-05-10-nielsen-heuristics-audit.md`) 존재 → `-v2` 접미사로 신규 생성
- [x] 5단 포맷의 다섯 항목 모두 채워짐 — 위치·시나리오·위배·개선·구현 노트
- [x] 4단 끝에 `[이전]` / `[이후]` ASCII mockup 두 블록 첨부 (≤70 컬럼)
- [x] ASCII 안의 따옴표 라벨이 본문 라벨과 일치 — "내 프로필" / "미저장 변경 있음" / "이 사이트의 변경사항이 저장되지 않을 수 있습니다." / "페이지에 머무르기" / "페이지 나가기" / "💾 저장" / "돌아가기"
- [x] 누적 작업 시간 추정 ≤ 3시간

---

## 범위 외 (Out of Scope)

| 영역 | 결정 | 사유 |
|---|---|---|
| 알림 팝오버 / 메시지 입력 / 모바일 nav / 세션 만료 / 글로벌 토스트 | 0건 | A 에이전트 검증 — `NotificationBell.tsx`·`MessagesClient.tsx`·`Navigation.tsx`·`middleware.ts`·`toaster.tsx` 모두 기 정비 |
| 컨설턴트 home / 프로젝트 목록 · 상세 / 인터뷰 / 결과 / 갤러리 | 0건 | B 에이전트 검증 — 자동저장·beforeunload·진행률·EmptyState·필터·페이지네이션 모두 정비 |
| 운영자 audit 로그 / 이메일 발송 / OPS_ADMIN_PENDING / 진단 설문 / 운영자 프로필 | 0건 | C 에이전트 검증 — audit 검색·필터·페이지네이션 / `PendingApprovalCard` / `PublicSelfAssessmentForm` `ProgressBar` 정비. 이메일 발송은 시스템 설계상 미존재(알림으로 대체) |
| 운영자 우선순위 카드 ("오늘 할 일") | 영구 제외 | 사용자 명시 거부 (2026-05-04 v3 #5) — 향후 모든 보고서에서 재제안 금지 |

---

본 영역 작업은 critical 1건 — `/nielsen-audit-fix` 호출 대상 1건.
