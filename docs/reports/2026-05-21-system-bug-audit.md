# 시스템 전수 버그 감사 보고서

## 변경 이력

| 일자       | 변경 사유               | 영향 결함                                       |
| ---------- | ----------------------- | ----------------------------------------------- |
| 2026-05-21 | 초기 작성 (스냅샷)      | 전체                                            |
| 2026-05-21 | B1·B2·B3 해결 (P1 5건)  | #001 · #002 · #003 · #004 · #005 RESOLVED       |
| 2026-07-29 | 승인대기 라우트 차단 (PR #135) | #007 RESOLVED (+ 대상·기술 서술 정정)    |

> **📌 정본 정책:** 본 보고서는 **시작 시점 스냅샷 + 결함 추적용**이다. 실행 세션이 따르는 정본은 **`docs/plans/2026-05-21-system-bug-audit-fix-plan.md` (계획서)**. 보고서는 결함이 해결될 때마다 🔴 OPEN → 🟢 RESOLVED 로만 갱신한다. 결함의 재현 경로·수정 후 동작·기술 변경 등 실행 가이드가 계획서와 다를 경우 **계획서가 우선**한다.
>
> 작성일: 2026-05-21
> 조사 방식: 11개 서브에이전트 병렬 전수조사 (Explore×6 + security-auditor + postgres-pro + performance-engineer + test-automator + prompt-engineer)
> 조사 범위: 6개 역할 · 전체 워크플로우 · 공통 UX · DB/RLS · LLM · 보안
> 검증 방식: **코드 인용 우세** (P1 결함은 직접 파일 읽기로 재확인 + 2026-05-21 재검증 단계에서 3건 제외·2건 격하). puppeteer 실제 브라우저 재현은 미수행.
> 환경: 로컬 워크트리 `chore/bug-audit-2026-05-21` (`../AI-roadmap-dashboard-bug-audit`)
> 테스트 계정 (해결 단계에서 사용 예정): son@test.com / kpc@test.com / sysadmin@test.com (모두 test1234!)

---

## 0. 요약 (TL;DR)

> **2026-05-21 재검증:** 초기 보고서 21건 중 **3건은 코드 재검증에서 결함 아님으로 판정** (#014·#018·#021), **2건은 우선순위 격하** (#009 P2→P3, #015 P2→P3). 아래 수치는 재검증 후 기준.

총 **18건** 확정 (보안 잠재 위험 5건 별도, 테스트 사각지대 5건 부록):

- **P1 차단성: 5건** — 좋아요 silent fail · 로드맵 확정/생성 후 운영 목록 stale · STT/매칭 LLM 에러 generic 토스트
- **P2 오해 유발: 10건** — silent redirect · 승인대기 사용자 라우트 가드 누락 · 인덱스 부재로 지연 · Realtime 누락 등
- **P3 시각·문구: 3건** — 다이얼로그 닫힘 UX · 라우팅 안내 부재 · DRAFT 다운로드 조건 약함

**가장 시급한 3개 (P1 중):**

1. **#001** 갤러리 좋아요 취소 시 DB 에러 무시 — 사용자는 좋아요가 사라진 줄 알지만 다음 새로고침에 다시 나타날 수 있음
2. **#002** 컨설턴트가 로드맵을 최종 확정해도 운영관리자 프로젝트 목록에 반영되지 않음 — 운영자가 진행 상황 오판
3. **#004** STT 인사이트 추출 실패 시 "오류가 발생했습니다" 만 표시 — 사용자가 무엇이 잘못됐는지 알 수 없음

**서브에이전트가 보고했지만 본 보고서에서 제외한 결함:** 총 17건 (1차 14건 + 재검증 3건). 사유는 §11에 정리.

---

## 1. 결함 한눈에 보기

| # | 등급 | 영역 | 메뉴 경로 | 한 줄 요약 | 상태 |
|---|------|------|----------|-----------|------|
| #001 | **P1** ★★★★★ | 갤러리 | 갤러리 > 카드 좋아요 | 좋아요 취소 시 DB 에러를 감지하지 않아 silent fail | 🟢 RESOLVED |
| #002 | **P1** ★★★★★ | 운영관리 캐시 | 운영관리 > 프로젝트 관리 | 컨설턴트가 로드맵을 최종 확정해도 운영관리 목록에 stale 상태 표시 | 🟢 RESOLVED |
| #003 | **P1** ★★★★ | 운영관리 캐시 | 운영관리 > 프로젝트 관리 | 컨설턴트가 로드맵 초안을 생성해도 운영관리 목록에 stale 상태 표시 | 🟢 RESOLVED |
| #004 | **P1** ★★★★★ | LLM | 컨설턴트 > 인터뷰 > 인터뷰 녹취 STT 첨부 | STT 인사이트 추출 실패 시 도메인 컨텍스트 없는 generic 토스트 | 🟢 RESOLVED |
| #005 | **P1** ★★★★ | LLM | 운영관리 > 프로젝트 > 매칭 추천 | 매칭 API 모든 에러를 generic 500으로 반환 — 쿼터/타임아웃/토큰 한도 구분 없음 | 🟢 RESOLVED |
| #006 | **P2** ★★★★ | 운영관리 | 운영관리 > 프로젝트 상세 > 컨설턴트 재배정 | 인터뷰 완료 이후 단계에서 재배정 시 DB 에러로 차단 | 🔴 OPEN |
| #007 | **P2** ★★★★ | 보안/라우팅 | 갤러리 · 메시지 · 설정 · 테스트 페이지 | 승인대기 사용자가 URL 직접 입력으로 진입 — 타 기업 FINAL 산출물 열람 가능 | 🟢 RESOLVED |
| #008 | **P2** ★★★★ | 알림 | 헤더 > 알림 벨 | 알림 벨에 Realtime 구독 없어 새 알림이 최대 30초 지연 | 🔴 OPEN |
| #009 | **P3** ★★ | 메시지 | 헤더 > 메시지 > "새 메시지" | 새 대화 생성 실패 시 다이얼로그가 닫히지 않음 (재검증 후 P3 격하 — 의도된 UX 가능) | 🔴 OPEN |
| #010 | **P2** ★★★ | 메시지 | 헤더 > 메시지 | 초기 로드 실패 시 빈 상태와 구분 불가 — 에러 토스트·재시도 부재 | 🔴 OPEN |
| #011 | **P2** ★★★ | 갤러리 | 갤러리 > PBL 카드 상세 | PBL 보고서 상세에 공유 토글 누락 (로드맵과 비대칭) | 🔴 OPEN |
| #012 | **P2** ★★★ | 알림 | 헤더 > 알림 벨 > 알림 클릭 | 알림에 이동 대상 링크가 없으면 클릭해도 아무 변화 없음 | 🔴 OPEN |
| #013 | **P2** ★★★ | 토스트 | 컨설턴트 > 프로젝트 > 기업 정보 수정 | 토스트 호출 패턴이 한 컴포넌트만 다름 (정책 변경 시 누락 위험) | 🔴 OPEN |
| #015 | **P3** ★★ | 라우팅 | 컨설턴트 > 프로젝트 > 로드맵 | PBL 트랙 프로젝트가 /roadmap 진입 시 사유 안내 없이 강제 이동 (URL 직접 입력 시나리오 드묾) | 🔴 OPEN |
| #016 | **P2** ★★★ | DB 성능 | 헤더 > 알림 벨 | 누적 알림 많을 때 type 필터링 인덱스 부재로 지연 | 🔴 OPEN |
| #017 | **P2** ★★★ | DB 성능 | 운영관리 > 감사로그 | 액터·대상 필터 + 시간 정렬 복합 인덱스 부재 | 🔴 OPEN |
| #019 | **P2** ★★★ | 메시지 | 메시지 (네트워크 불안정) | Realtime 채널 중복 재시도 — MessageIcon + MessagesClient 각각 재시도 | 🔴 OPEN |
| #020 | **P3** ★★ | 다운로드 | 컨설턴트 > 프로젝트 > 로드맵 > 다운로드 | DRAFT 상태에서도 PDF/XLSX/HWPX 다운로드 활성 (FINAL 가드 미적용) | 🔴 OPEN |

> 보안 잠재 위험은 §9, 테스트 사각지대는 §10 부록.

---

## 2. P1 차단성 결함

### #001. 갤러리 "좋아요" 취소 시 데이터 불일치 가능 (DB 에러 silent fail)

- **등급:** P1 ★★★★★
- **영향 받는 사용자:** 모든 갤러리 사용자 (좋아요를 누른 적 있는 컨설턴트·운영관리자·시스템관리자)
- **현상 (사용자가 보는 것):** 갤러리에서 본인이 누른 "좋아요"를 취소(다시 클릭)할 때, 만약 DB에서 삭제가 실패하면 화면에는 좋아요가 빠진 것처럼 보이지만 다음 새로고침 시 다시 좋아요 상태로 돌아온다. 사용자는 "왜 다시 좋아요가 켜져 있지?" 혼란을 겪는다.
- **재현 경로 (사용자 관점):**
  1. 컨설턴트로 로그인 후 좌측 사이드바 **갤러리** 클릭
  2. 좋아요를 이미 눌러둔 카드의 하트 아이콘을 다시 클릭 (취소 의도)
  3. (네트워크/권한 일시 오류가 발생한 가상 시나리오) — 화면에는 좋아요 카운트 감소
  4. 페이지 새로고침
  → 좋아요가 다시 켜져 있음. 토스트도 없었음.
- **기대 동작 (사용자 관점):** 좋아요 취소 실패 시 "좋아요 취소에 실패했습니다" 안내 + 화면 상태 원복.
- **해결 방향 (사용자 친화 1~2줄):** "좋아요를 취소할 때 데이터베이스 응답을 끝까지 확인해 실패하면 사용자에게 안내 토스트를 표시하도록 보완합니다."
- **기술 근거:**
  - 파일: `src/app/(dashboard)/gallery/actions/interactions.ts:42-45`
  - 인용:
    ```ts
    await supabase
      .from('roadmap_likes')
      .delete()
      .eq('id', existing.id);
    ```
  - 원인: `await` 결과에서 `error` 를 디스트럭처링하지 않아 삭제 실패가 모두 누락됨. INSERT 분기(라인 48-55)는 정상적으로 에러 체크함. PBL 좋아요(`togglePBLLike`)도 동일 패턴 의심.
- **상태 변경:** 🔴 OPEN → 🟢 RESOLVED (2026-05-21) — `toggleLike` · `togglePBLLike` 모두 delete 분기에서 `{ error }` 디스트럭처링 + 실패 시 `errorResult('좋아요 취소에 실패했습니다.')` 반환. LikeButton 이 이미 갖춘 토스트·낙관적 롤백 경로 활성화. 단위 테스트 2건 신규(`interactions.test.ts` — `#001` 태그).

---

### #002. 컨설턴트가 로드맵 "최종 확정" 한 뒤에도 운영관리자 목록은 이전 상태 표시

- **등급:** P1 ★★★★★
- **영향 받는 사용자:** 운영관리자(OPS_ADMIN) / 시스템관리자(SYSTEM_ADMIN)
- **현상:** 컨설턴트가 "최종 확정" 버튼을 눌러 프로젝트 상태가 `FINALIZED`로 바뀌어도, 운영관리자의 **운영관리 > 프로젝트 관리** 목록에서는 같은 프로젝트가 `ROADMAP_DRAFTED` 라벨 그대로 표시된다. 운영자가 새로고침을 누르기 전까지 진행 현황을 잘못 인지한다.
- **재현 경로:**
  1. 컨설턴트(`kpc@test.com`) 로그인 → **워크스페이스 > 담당 프로젝트 > [시드기업B] > 로드맵** 진입
  2. "최종 확정" 버튼 클릭 → 성공 토스트 확인
  3. 다른 브라우저/시크릿 창에서 운영관리자(`son@test.com`) 로그인 → **운영관리 > 프로젝트 관리** 목록 진입
  → "시드기업B" 행이 여전히 "로드맵 초안" 라벨로 표시됨.
- **기대 동작:** 컨설턴트가 확정한 즉시 또는 수 초 내에 운영관리 목록·상세 페이지에 "최종 확정" 상태가 반영.
- **해결 방향:** "컨설턴트가 로드맵을 확정/생성하는 순간 운영관리 목록·상세 페이지의 캐시도 함께 무효화해 즉시 새 상태로 갱신되도록 보완합니다."
- **기술 근거:**
  - 파일: `src/app/(dashboard)/consultant/projects/[id]/roadmap/actions.ts:151-181` (`confirmFinalRoadmap`)
  - 인용: `await finalizeRoadmap(roadmapId, user.id);` 이후 `return { success: true };` — `revalidatePath('/ops/projects')` 호출 없음. 라우터 캐시가 운영관리 목록을 stale 상태로 유지.
  - 원인: DB의 `project.status = 'FINALIZED'` 업데이트는 RPC 안에서 원자적으로 발생하지만 Next.js Server Component 캐시는 무효화되지 않음.
- **상태 변경:** 🔴 OPEN → 🟢 RESOLVED (2026-05-21) — `confirmFinalRoadmap` · `finalizePBLAction` 성공 분기에 `revalidatePath('/ops/projects')` + `revalidatePath('/ops/projects/${projectId}')` 추가. 단위 테스트 2건 신규(roadmap·PBL 각각 `#002` 태그).

---

### #003. 컨설턴트가 로드맵 "초안 생성" 한 뒤에도 운영관리자 목록은 이전 상태 표시

- **등급:** P1 ★★★★
- **영향 받는 사용자:** 운영관리자 / 시스템관리자
- **현상:** 컨설턴트가 "AI 로드맵 생성"을 완료해 프로젝트가 `ROADMAP_DRAFTED`로 전환돼도 운영관리자 목록에는 `INTERVIEWED` 그대로 표시.
- **재현 경로:**
  1. 컨설턴트 로그인 → 인터뷰 완료된 프로젝트의 **로드맵** 진입
  2. "AI 로드맵 생성" 클릭 → 약 90초 후 생성 완료 토스트
  3. 운영관리자 로그인 → **운영관리 > 프로젝트 관리**
  → "인터뷰 완료" 라벨이 유지됨.
- **기대 동작:** 생성 완료 후 운영관리 목록에 "초안 작성됨" 반영.
- **해결 방향:** #002와 동일 패턴. "초안 생성 직후 운영관리 목록 캐시 무효화 추가."
- **기술 근거:**
  - 파일: `src/app/(dashboard)/consultant/projects/[id]/roadmap/actions.ts:75-146` (`createRoadmap`)
  - 인용: `generateRoadmap()` 호출 후 `return { success: true, data: ... };` — 운영관리 라우트에 대한 `revalidatePath` 없음.
  - 원인: 동일.
- **상태 변경:** 🔴 OPEN → 🟢 RESOLVED (2026-05-21) — `createRoadmap` · `generatePBLAction` 성공 분기에 동일 `revalidatePath` 2개 추가. 단위 테스트 2건 신규(roadmap·PBL 각각 `#003` 태그).

---

### #004. STT 녹취록 분석 실패 시 사용자가 무엇이 잘못됐는지 알 수 없음

- **등급:** P1 ★★★★★
- **영향 받는 사용자:** 컨설턴트(인터뷰 녹취 STT 파일 첨부 시)
- **현상:** 인터뷰 마지막 Step "인터뷰 녹취 STT 첨부" 에서 녹취록 TXT 파일을 첨부해 분석을 트리거하면, LLM이 한국어 키 대신 영문 키로 응답할 경우 "오류가 발생했습니다. 다시 시도해 주세요." 같은 일반 토스트만 노출됨. 같은 파일로 두 번째 시도해도 같은 에러 — 사용자는 LLM 응답 형식 문제인지 자신의 파일 문제인지 알 수 없다.
- **재현 경로:**
  1. 컨설턴트(`kpc@test.com`) 로그인 → **워크스페이스 > 담당 프로젝트 > [프로젝트] > 인터뷰**
  2. 인터뷰 진행 중 마지막 Step **"인터뷰 녹취 STT 첨부"** (ROADMAP 트랙 Step 9 / PBL 트랙 Step 10) 진입
  3. STT 텍스트 파일 첨부 → 분석 트리거
  4. LLM이 일시적으로 영문 키 응답 반환 (`additional_tasks` 등)
  → "오류가 발생했습니다" 토스트만 노출. 재시도해도 같음.
- **기대 동작:** "녹취록 분석 결과 형식이 올바르지 않습니다. 다시 시도해 주세요." 같은 도메인 메시지 + 자동 재시도(최대 2회).
- **해결 방향:** "녹취록 분석 결과가 예상 형식과 다를 때 자동으로 한 번 더 시도하고, 그래도 실패하면 도메인에 맞는 안내 메시지를 보여주도록 보완합니다."
- **기술 근거:**
  - 파일: `src/lib/services/stt.ts:103-111`
  - 원인: `callLLMForJSON<unknown>` 호출 시 `validator` 인자 미전달 → Zod 스키마 불일치가 자동 재시도 경로를 우회. `sttInsightsSchema.parse(raw)` 의 ZodError 가 `getLLMUserFriendlyError` 패턴 매칭(`llm.ts:302-339`)에 포함되지 않아 generic 변환됨.
- **상태 변경:** 🔴 OPEN → 🟢 RESOLVED (2026-05-21) — `extractInsightsFromStt` 가 `callLLMForJSON` 에 `sttInsightsSchema.safeParse` validator 를 5번째 인자로 전달해 자동 재시도(2회) 활성. `processSttFile` · `extractSttInsights` catch 가 `getLLMUserFriendlyError` 로 변환되어 `LLMResponseInvalidError` → "AI 응답 형식이 올바르지 않습니다. 잠시 후 다시 시도해 주세요." 도메인 메시지 노출. 단위 테스트 3건 신규(`stt.test.ts` 2건 + `interview/actions.test.ts` 1건, `#004` 태그).

---

### #005. 매칭 추천 생성 실패 시 쿼터 초과·타임아웃·토큰 한도가 모두 같은 메시지로 표시

- **등급:** P1 ★★★★
- **영향 받는 사용자:** 운영관리자(매칭 추천 생성 시)
- **현상:** **운영관리 > 프로젝트 상세 > 배정 탭 > 자동 매칭 실행** 클릭 시 LLM 호출 중 어떤 에러가 발생해도 "매칭 추천 생성 중 오류가 발생했습니다." 한 줄로 반환. 사용자는 잠깐 후 재시도해야 하는지, 한도가 차서 내일 다시 와야 하는지 알 수 없다.
- **재현 경로:**
  1. 운영관리자 로그인 → **운영관리 > 프로젝트 관리 > [프로젝트] > 배정** 탭
  2. "자동 매칭 실행" 클릭 (해당 사용자의 일별 LLM 호출 한도 도달 상태)
  → "매칭 추천 생성 중 오류가 발생했습니다." + HTTP 500
- **기대 동작:** 쿼터 초과 → HTTP 429 + "오늘 사용 한도를 초과했습니다 (다음 KST 자정 초기화)". 타임아웃 → HTTP 504. 토큰 한도 → 422.
- **해결 방향:** "매칭 추천 생성이 실패한 이유(한도 초과·시간 초과·응답 한도 초과)에 따라 사용자에게 다른 안내를 보여주도록 보완합니다."
- **기술 근거:**
  - 파일: `src/app/api/matching/generate/route.ts:50-57`
  - 원인: 단일 catch 블록이 모든 에러를 generic 메시지로 변환. `llm.ts` 의 `getLLMUserFriendlyError` 가 route 계층에서 호출되지 않음.
- **상태 변경:** 🔴 OPEN → 🟢 RESOLVED (2026-05-21) — catch 블록을 4분기로 확장: 한도 초과 → **429** `QUOTA_EXCEEDED` (+ `Retry-After: 3600`), 타임아웃/AbortError → **504** `LLM_TIMEOUT`, context length 초과 → **413** `INPUT_TOO_LARGE`, 그 외 → **500** `INTERNAL_ERROR`. baseline 워딩 4건은 사용자 사전 승인. 단위 테스트 5건 신규(`route.test.ts`, `#005` 태그).

---

## 3. P2 오해 유발 결함

### #006. 인터뷰 완료 이후 단계에서 컨설턴트 재배정 시 DB가 차단

- **등급:** P2 ★★★★
- **영향 받는 사용자:** 운영관리자
- **현상:** 운영관리자가 인터뷰 완료(`INTERVIEWED`) 또는 초안 작성됨(`ROADMAP_DRAFTED`·`PBL_DRAFTED`) 상태의 프로젝트에서 컨설턴트를 교체하려 "배정하기" 버튼을 클릭하면 "현재 프로젝트 상태(INTERVIEWED)에서는 컨설턴트를 배정할 수 없습니다." 에러로 차단됨. UI는 재배정 폼을 그대로 보여주지만 DB가 막는다.
- **재현 경로:**
  1. 운영관리자 로그인 → **운영관리 > 프로젝트 관리 > [INTERVIEWED 상태 프로젝트]** 클릭 → **배정** 탭
  2. 다른 컨설턴트 선택 → "배정하기" 클릭
  → 에러 토스트 노출, 배정 미적용.
- **기대 동작:** 재배정이 모든 워크플로우 단계에서 가능하거나, 차단된다면 UI에서 미리 비활성화 + 안내.
- **해결 방향:** "재배정 가능 상태를 인터뷰 완료·초안 작성 단계까지 확장하거나, 해당 단계에서 재배정 폼을 비활성화하고 사유를 안내하도록 보완합니다."
- **기술 근거:**
  - 파일: `supabase/migrations/058_reassign_return_previous.sql:31`
  - 인용: `IF v_current_status NOT IN ('DIAGNOSED', 'MATCH_RECOMMENDED', 'ASSIGNED') THEN`
  - 원인: RPC `assign_consultant` 가 3개 상태만 허용. `src/lib/constants/status.ts` 의 `ALLOWED_STATUS_TRANSITIONS` 도 동일. UI 노출과 DB 가드 불일치.

---

### #007. 승인 대기 사용자가 URL 직접 입력으로 갤러리·메시지·설정에 진입

> **⚠️ 2026-07-29 정정** — 2026-05-21 스냅샷은 이 결함을 "미들웨어가 `/ops/*` 를 통과시킨다"로
> 기술했으나, 해결 착수 시 코드 재조사에서 **두 가지가 사실과 달랐다.** 아래 본문은 정정본이며,
> 원 스냅샷의 오류는 이 인용 블록에 남긴다.
>
> 1. **`/ops/*` 는 이미 막혀 있었다** — `ops/layout.tsx:12-15` · `consultant/layout.tsx:11-14` ·
>    `notices/page.tsx:30,40-43` 이 역할을 검사한다. 실제로 뚫린 곳은 아래 6개 경로다.
> 2. **`src/middleware.ts` 는 존재하지 않는다** — Next.js 16 기준 진입점은 `src/proxy.ts`,
>    본체는 `src/lib/supabase/middleware.ts` 의 `updateSession` 이다. 이 함수는 role 을 조회하지
>    않고 로그인 여부만 본다(설계상 의도 — 매 요청 DB 조회를 피하기 위함).

- **등급:** P2 ★★★★
- **영향 받는 사용자:** USER_PENDING·OPS_ADMIN_PENDING 역할 사용자
- **현상:** 가입 신청 후 운영팀 승인을 받지 않은 사용자는 좌측 메뉴에 갤러리 등이 보이지 않지만,
  주소창에 URL 을 직접 입력하면 그대로 진입한다. 특히 **`/gallery` 에서 타 기업의 공유된 FINAL
  로드맵·PBL 보고서를 열람할 수 있었다** — 승인 심사 전에 산출물이 노출되는 것이 핵심 위험이다.
- **뚫려 있던 경로 6개:** `/gallery` · `/gallery/[id]` · `/dashboard/messages` ·
  `/dashboard/settings` · `/test-roadmap` · `/test-pbl`
- **재현 경로:**
  1. 회원가입 직후 `USER_PENDING` 상태로 로그인
  2. 주소창에 `/gallery` 입력
  → 갤러리 목록이 그대로 표시되고, 카드를 클릭하면 타 기업 FINAL 로드맵 상세까지 열린다.
- **기대 동작:** 승인 대기 사용자는 `/dashboard`(기존 `PendingApprovalCard` 화면)로 리다이렉트.
- **해결 방향:** "가입 승인 대기 중인 사용자가 갤러리·메시지·설정 페이지에 직접 접근하지 못하도록
  차단하고 승인 대기 안내 화면으로 돌려보냅니다."
- **기술 근거:**
  - 파일: `src/lib/supabase/middleware.ts` (`updateSession`)
  - 인용: `if (!user && isProtectedRoute) { ... redirect to /login }` — user 존재 여부만 검사. role 분기 없음.
  - 원인: `/ops/*`·`/consultant/*` 는 레이아웃이 역할을 검사했으나 위 6개 경로에는 그 가드가 없었다.
- **상태 변경:** 🔴 OPEN → 🟢 RESOLVED (2026-07-29, PR #135) — **미들웨어가 아니라 레이아웃/페이지
  레벨**에 가드를 추가했다. `getCachedProfile` 이 `react.cache` 로 감싸져 있어(`lib/supabase/cached.ts:8,22`)
  같은 요청 내 추가 DB 조회가 **0** 이고, 기존 `ops/layout.tsx`·`consultant/layout.tsx` 패턴과도 일치한다.
  신규 `PENDING_ROLES`·`isPendingApproval`(`lib/constants/status.ts`) + 신규 `gallery/layout.tsx`
  (하위 경로 추가 시 누락 방지) + `test-roadmap`·`test-pbl` layout + `messages`·`settings` page.
  라우트만 막으면 Server Action 직접 호출로 우회 가능하므로 `gallery/actions/queries.ts` 4곳
  (`fetchGalleryRoadmaps`·`fetchRoadmapDetail`·`fetchGalleryPBLReports`·`fetchPBLReportDetail`)에도
  같은 검사를 넣었다. 단위 테스트 신규 6파일.

---

### #008. 알림 벨에 실시간 구독 없어 새 알림이 최대 30초 늦게 표시

- **등급:** P2 ★★★★
- **영향 받는 사용자:** 모든 로그인 사용자 (특히 컨설턴트 배정·로드맵 확정 알림 수신자)
- **현상:** 다른 사용자의 행위로 새 알림이 발생해도 헤더의 종 아이콘 뱃지 숫자가 최대 30초 뒤에 갱신됨. 같은 탭에서 작업 중이면 그 30초가 더 길게 체감된다.
- **재현 경로:**
  1. 컨설턴트 로그인 → 임의 페이지에 머무름 (탭 전환 없음)
  2. 다른 창에서 운영관리자가 해당 컨설턴트에게 프로젝트 배정
  → 컨설턴트 헤더 종 아이콘이 즉시 갱신되지 않음. 최대 30초.
- **기대 동작:** 메시지 아이콘처럼 Supabase Realtime 구독으로 수 초 내 갱신.
- **해결 방향:** "헤더 알림 벨에도 실시간 구독을 적용해 새 알림이 즉시 반영되도록 보완합니다."
- **기술 근거:**
  - 파일: `src/components/NotificationBell.tsx:26-112` — `POLL_INTERVAL_MS = 30_000` 폴링만, Realtime 구독 없음
  - 비교: `src/components/MessageIcon.tsx:68-137` — Realtime + 폴백 polling 병행 패턴 보유

---

### #009. 메시지 새 대화 생성 실패 시 다이얼로그가 닫히지 않아 다음 액션 불명

- **등급:** P2 ★★★
- **영향 받는 사용자:** 메시지 사용자
- **현상:** **헤더 > 메시지 > "새 메시지"** 다이얼로그에서 대화 생성이 실패하면 에러 토스트만 표시되고 다이얼로그는 그대로 열려 있다. 사용자는 X로 수동 닫아야 하고 다음에 무엇을 해야 하는지 안내가 없다.
- **재현 경로:**
  1. 메시지 화면 진입 → "새 메시지" 클릭
  2. 권한 없는 역할의 사용자 선택
  → 에러 토스트 노출. 다이얼로그는 닫히지 않음.
- **기대 동작:** 실패 시 안내 + 닫기 또는 명확한 "다시 선택" 가이드.
- **해결 방향:** "새 대화 생성이 실패할 때 사용자가 다음에 무엇을 해야 하는지 안내하고, 일정 케이스에서는 다이얼로그를 자동으로 닫도록 보완합니다."
- **기술 근거:**
  - 파일: `src/app/(dashboard)/dashboard/messages/_components/NewConversationDialog.tsx:63-81`

---

### #010. 메시지 초기 로드 실패 시 "대화 없음"과 구분 불가

- **등급:** P2 ★★★
- **영향 받는 사용자:** 네트워크 일시 단절 환경 사용자
- **현상:** `/dashboard/messages` 진입 시 `fetchConversations()` 가 실패하면 빈 상태 화면이 그대로 노출. 실제로는 네트워크 에러인데 "아직 메시지가 없습니다" 와 동일하게 보임. 재시도 버튼도 없음.
- **재현 경로:**
  1. 메시지 메뉴 진입 직전 DevTools Network 차단
  2. 메뉴 클릭
  → 로딩 후 "아직 메시지가 없습니다" 화면. 실제로는 대화 목록 로드 실패.
- **기대 동작:** 에러 토스트 + "다시 시도" 버튼이 있는 에러 상태 화면.
- **해결 방향:** "대화 목록 첫 로딩이 실패하면 빈 상태가 아닌 에러 화면과 '다시 시도' 버튼을 보여주도록 보완합니다."
- **기술 근거:**
  - 파일: `src/app/(dashboard)/dashboard/messages/_components/MessagesClient.tsx:148-177` — `if (!result.success) { setIsLoading(false); return; }` 후 에러 표시 없음

---

### #011. PBL 갤러리 상세 페이지에 공유 토글 누락 (로드맵과 비대칭)

- **등급:** P2 ★★★
- **영향 받는 사용자:** PBL 보고서 작성 컨설턴트
- **현상:** **갤러리 > PBL 카드 상세** 페이지에 좋아요 버튼은 있으나 "갤러리에 공유" 토글이 없다. 같은 위치의 로드맵 상세에는 작성자에게 공유 토글이 노출된다.
- **재현 경로:**
  1. 컨설턴트 로그인 → **갤러리** → PBL 카드 클릭
  2. 본인 작성 PBL 상세 화면 확인
  → 공유 토글 없음. 같은 사용자의 로드맵 상세에는 있음.
- **기대 동작:** PBL 보고서 작성자도 갤러리 상세에서 공유 상태 변경 가능.
- **해결 방향:** "PBL 갤러리 상세에도 본인 작성 보고서에 한해 공유 토글을 추가해 로드맵과 동일하게 동작하도록 보완합니다."
- **기술 근거:**
  - 파일: `src/app/(dashboard)/gallery/[id]/_components/GalleryPBLDetailContent.tsx` — `ShareToggle` 미렌더
  - `togglePBLShare` 액션은 이미 존재 — UI만 누락

---

### #012. 알림에 이동 대상이 없으면 클릭해도 아무 변화 없음 (사일런트)

- **등급:** P2 ★★★
- **영향 받는 사용자:** 모든 사용자
- **현상:** 알림 벨 드롭다운에서 `link` 필드가 없는 알림을 클릭하면 읽음 처리만 되고 페이지 이동이 없다. 사용자는 "클릭이 안 먹혔나" 오해.
- **재현 경로:**
  1. 알림 벨 클릭 → 목록 중 `link`가 null인 알림 클릭
  → 알림은 읽음 처리되지만 화면 변화 없음. 토스트도 없음.
- **기대 동작:** 이동 대상이 없는 알림은 `/notifications` 페이지로 이동하거나, "이 알림에는 이동 대상이 없습니다" 토스트로 명시.
- **해결 방향:** "알림 클릭 시 이동 대상이 없으면 알림 목록으로 보내거나 안내 토스트를 표시하도록 보완합니다."
- **기술 근거:**
  - 파일: `src/components/NotificationBell.tsx:203-217`

---

### #013. 토스트 호출 패턴이 한 컴포넌트만 다름 — 정책 변경 시 누락 위험

- **등급:** P2 ★★★
- **영향 받는 사용자:** 컨설턴트(기업 정보 수정 시)
- **현상:** 컨설턴트 프로젝트 상세의 "기업 정보" 수정 컴포넌트만 Sonner `toast.success/error` 를 직접 호출. 나머지 전 앱은 `showSuccessToast/showErrorToast` 래퍼 사용. duration·action 정책 변경 시 이 한 곳만 누락된다.
- **재현 경로:** 사용자 가시 결함은 즉시 없음. 다만 향후 토스트 정책(예: duration·icon) 변경 시 이 컴포넌트만 다른 동작.
- **기대 동작:** 모든 토스트가 공통 래퍼를 통과.
- **해결 방향:** "기업 정보 수정 컴포넌트의 토스트 호출도 다른 화면들과 같은 방식으로 정리합니다."
- **기술 근거:**
  - 파일: `src/app/(dashboard)/consultant/projects/[id]/_components/CompanyInfoEditableCard.tsx:204,208`

---


- **등급:** P2 ★★★
- **영향 받는 사용자:** 컨설턴트
- **현상:** ROADMAP 트랙 프로젝트에서 일시적으로 PBL 저장 액션이 호출되면 "PBL 트랙 프로젝트는 PBL 인터뷰 화면을 사용해야 합니다" 라는 역방향 메시지가 노출되어 혼동.
- **재현 경로 (개발자 시나리오 — 일반 사용자는 라우터가 막아 도달하기 어려움):**
  1. ROADMAP 트랙 프로젝트 → 인터뷰 페이지
  2. 어떤 사유로 `savePBLInterviewV2` 호출 (네트워크 캐시·오래된 탭 등)
  → 메시지가 현재 상황을 거꾸로 묘사함.
- **기대 동작:** "현재 프로젝트는 ROADMAP 트랙입니다. 로드맵 인터뷰 화면을 사용해주세요." (실제 트랙 명시).
- **해결 방향:** "트랙 불일치 안내 메시지를 현재 프로젝트 트랙을 반영하도록 다듬어 사용자 혼동을 줄입니다."
- **기술 근거:**
  - 파일: `src/app/(dashboard)/consultant/projects/[id]/interview/actions.ts:893-897, 1086-1090`

---

### #015. PBL 트랙 프로젝트가 `/roadmap` 진입 시 사유 안내 없이 강제 이동 (silent redirect)

- **등급:** P2 ★★★
- **영향 받는 사용자:** 컨설턴트(외부 링크 클릭·북마크 사용 시)
- **현상:** PBL 트랙 프로젝트 URL의 `/roadmap` 으로 직접 진입하면 프로젝트 상세 페이지로 강제 이동되지만 "이 프로젝트는 PBL 트랙입니다" 같은 안내가 없어 왜 튕겨나갔는지 알 수 없다.
- **재현 경로:**
  1. PBL 트랙 프로젝트 진입 → 주소창에 `/consultant/projects/[id]/roadmap` 입력
  → 프로젝트 상세 페이지로 이동. 안내 없음.
- **기대 동작:** 리다이렉트 후 안내 배너 또는 토스트로 사유 표시.
- **해결 방향:** "잘못된 트랙 페이지 진입 시 사용자에게 트랙 정보를 안내하고 올바른 메뉴로 이동을 도와줍니다."
- **기술 근거:**
  - 파일: `src/app/(dashboard)/consultant/projects/[id]/roadmap/page.tsx:26-28`

---

### #016. 알림 목록 인덱스 부재로 누적 시 지연

- **등급:** P2 ★★★
- **영향 받는 사용자:** 알림이 누적된 사용자 (수백 건+)
- **현상:** 알림 페이지/벨 진입 시 로딩이 느려짐. 특히 메시지 알림 제외 필터(`type != 'message'`)가 인덱스를 타지 못해 선형 악화.
- **재현 경로:** 알림이 수백 건 쌓인 계정으로 로그인 → 알림 페이지 클릭 → 로딩 지연 체감.
- **기대 동작:** 즉시 표시.
- **해결 방향:** "알림 목록 조회 성능을 위해 자주 사용하는 필터 조합에 데이터베이스 인덱스를 추가합니다."
- **기술 근거:**
  - 파일: `supabase/migrations/016_add_notifications.sql:30-36`
  - 누락: `(user_id, type, created_at DESC)` 또는 `WHERE type != 'message'` 부분 인덱스

---

### #017. 감사로그 액터·대상 필터 + 시간 정렬 복합 인덱스 부재

- **등급:** P2 ★★★
- **영향 받는 사용자:** 운영관리자(감사로그 조회 시)
- **현상:** **운영관리 > 감사로그** 에서 특정 액터 또는 대상 타입 필터 적용 시 응답 지연.
- **재현 경로:** 감사로그 화면에서 액터 필터 → 결과 표시 지연.
- **기대 동작:** 즉시 표시.
- **해결 방향:** "감사로그의 자주 쓰는 필터(액터·대상)에 시간 정렬을 결합한 복합 인덱스를 추가합니다."
- **기술 근거:**
  - 파일: `supabase/migrations/001_initial_schema.sql:304-307` (단일 인덱스만), `supabase/migrations/052_audit_logs_composite_index.sql` (action+created_at만 추가됨)
  - 누락: `(actor_user_id, created_at DESC)`, `(target_type, created_at DESC)`

---

### #019. Realtime 채널 중복 재시도 — 모바일 네트워크 전환 시 지연 누적

- **등급:** P2 ★★★
- **영향 받는 사용자:** 모바일·네트워크 불안정 환경 사용자
- **현상:** 메시지 채팅창과 헤더 메시지 아이콘이 각각 독립적인 Realtime 채널을 보유하고, 둘 다 독자적으로 최대 3회 지수 백오프 재시도. 네트워크 일시 단절 시 총 6번 재시도가 겹쳐 회복이 늦어진다.
- **재현 경로:** 모바일 LTE/Wi-Fi 전환 직후 메시지 화면.
- **기대 동작:** 단일 재시도 관리자.
- **해결 방향:** "메시지 화면과 헤더 아이콘이 같은 실시간 연결을 공유하도록 정리해 불필요한 재시도를 줄입니다."
- **기술 근거:**
  - 파일: `src/app/(dashboard)/dashboard/messages/_components/MessagesClient.tsx:280-334`, `src/components/MessageIcon.tsx:68-137`

---

## 4. P3 시각·문구·접근성

### #020. 로드맵 DRAFT 상태에서도 PDF/XLSX/HWPX 다운로드 활성

- **등급:** P3 ★★ (정책 확인 필요)
- **영향 받는 사용자:** 컨설턴트(미확정 버전 공유 사고 우려)
- **현상:** 다운로드 버튼이 `disabled={!selectedVersion}` 만 검사하고 `status === 'FINAL'` 미체크. DRAFT 상태에서도 다운로드 가능.
- **재현 경로:** 로드맵 페이지 → DRAFT 버전 선택 → 다운로드 버튼 활성.
- **기대 동작:** 사용자/팀 정책에 따라 DRAFT 다운로드를 허용할지 차단할지 결정 필요. 차단 시 disabled + 안내 또는 워터마크.
- **해결 방향 (정책 결정 선행 필요):** "팀이 미확정 버전 다운로드를 허용하는지 먼저 확인하고, 차단 정책이라면 버튼을 비활성화 + 안내, 허용 정책이라면 다운로드 파일 자체에 'DRAFT' 워터마크를 추가해 사용자가 미확정 사실을 잊지 않도록 보완합니다."
- **기술 근거:**
  - 파일: `src/app/(dashboard)/consultant/projects/[id]/roadmap/_components/result-v2/RoadmapResultClient.tsx:311`
  - 인용: `disabled={!selectedVersion}` (status 검사 없음)

---

## 9. 보안 잠재 위험 (별도 섹션 — 현재 사용자 직접 노출 없음)

> 모두 "현재 코드 흐름에서는 다른 방어선(하위 함수 인증·admin client 우회·미들웨어)이 차단하나, 구조적으로는 단일 실패 지점이 되는" 잠재 위험. 코드 변경 시 무방비가 될 수 있으므로 §5 계획서에 함께 포함.

| # | 위치 | 위험 |
|---|------|------|
| SEC-1 | `gallery/actions/queries.ts:600-657` `fetchGalleryItems` | 진입 함수가 `requireAuth` 호출 안 함 (하위 함수가 막음). 신규 호출 경로 추가 시 무방비 가능 |
| SEC-2 | `migrations/002_rls_policies.sql:244-271` `roadmap_versions` | OPS_ADMIN UPDATE/INSERT RLS 정책 부재. 현재는 admin client 로 우회 — RLS 계층이 무력 |
| SEC-3 | `migrations/061_add_pbl_reports.sql:112-113` `pbl_reports_ops_all FOR ALL` | OPS_ADMIN 에게 DELETE 권한까지 부여 (문서는 SELECT 만 명시) |
| SEC-4 | `migrations/062_add_notices.sql:52-65` `notices_mutate_ops_sys FOR ALL` | SELECT/INSERT/UPDATE/DELETE 단일 정책 — 향후 SELECT 정책 변경 시 우회 가능 |
| SEC-5 | `src/lib/services/audit.ts:77-136` `fetchAuditLogs` | admin client 직접 사용. 호출부에서 권한 검증을 잊으면 전체 감사로그 노출 |

---

## 10. 테스트 사각지대 부록 (회귀 방지 권장)

| # | 시나리오 | 권장 테스트 |
|---|----------|-----------|
| T-1 | PBL DRAFT→FINAL 전환 시 기존 FINAL→ARCHIVED 강등 | Playwright `e2e/consultant/pbl-transitions.spec.ts` 신설 |
| T-2 | MessageIcon Realtime 재시도 소진 → 폴링 fallback | Vitest `MessageIcon.test.tsx` 케이스 추가 |
| T-3 | 메시지 전송 시 수신자 헤더 뱃지 실시간 갱신 | Playwright `messages-realtime.spec.ts` 단계 추가 |
| T-4 | 자가진단 토큰 만료·재사용 시 안내 UI | Playwright `e2e/public/assessment.spec.ts` 보강 |
| T-5 | 2회 연속 재배정 시 is_current 단일성 | Playwright `consultant-reassignment.spec.ts` 보강 |

---

## 11. 서브에이전트 보고에서 제외한 결함

본 보고서에 포함하지 않은 결함들 + 사유:

| 후보 | 사유 |
|------|------|
| Auth 영역 0건 | 서브에이전트 "발견 없음" 보고 (#A 영역) |
| Ops 영역 0건 | 서브에이전트 "발견 없음" 보고 (#O 영역) |
| 메시지 채팅 append 스크롤 | `docs/reports/2026-05-17-scroll-ux-audit.md` H-2 — 다른 세션(`scroll-p2` 워크트리) 진행 중 |
| 메시지 뱃지 초기값 0 | `(dashboard)/layout.tsx:10-16` 의 의도된 트레이드오프 (흰 화면 방지). 결함이 아님 |
| 메시지 마크다운 링크 미지원 | 의도된 단순화 (보안 이슈 회피) |
| 모바일 메뉴 프로필/설정 버튼 닫힘 누락 | **반박** — `Navigation.tsx:621, 637` 에 `onClick={() => setIsMobileMenuOpen(false)}` 명시되어 있음 |
| PBL/roadmap redirect 비대칭 | 실질적 사용자 영향 미미 |
| review 페이지 명시적 권한 검증 부재 | RLS 가 차단 — 잠재 위험은 §9 SEC 와 유사 |
| 인터뷰 제출 후 history stack | 일반 패턴, 결함성 약함 |
| PBL 확정 selectedVersion null 가드 | 추측에 근거 — 실제 disabled 조건이 차단 가능성 높음 |
| LikeButton race condition | 추측 — 함수형 setState 가 React 18에서 안전 |
| ScopeFilter URL 조작 우회 | 운영자에게 빈 결과만 노출 — 보안 영향 없음 |
| 로드맵 LLM validator 미사용 | 의도된 설계 (`fillMissingRoadmapFields` 가 대부분 복구) |
| LLM 쿼터 사전 표시 부재 | 향상 사항이지 결함 아님 |
| finalize_roadmap SECURITY INVOKER | admin client 우회로 실질 영향 없음 |
| ConfirmDialog Esc 닫힘 | Radix UI 가 자동 처리 |

---

## 12. 후속 단계

1. **보고서 사용자 검토 게이트** — 본 보고서의 결함 등급/범위에 대한 사용자 승인.
2. **§5 해결 계획서** — `docs/plans/2026-05-21-system-bug-audit-fix-plan.md` 별도 파일.
3. **실제 브라우저 재현** — Docker Desktop 기동 후 puppeteer 로 P1 5건 재현 (계획서 Phase 0).
4. **수정 PR** — 결함 묶음별로 분리. P1 5건은 한 PR, P2 묶음은 영역별로.

---

> **본 세션 산출물 종착점:** 본 보고서 + `docs/plans/2026-05-21-system-bug-audit-fix-plan.md`. 코드 수정은 계획서 사용자 승인 후 별도 세션에서 진행.
