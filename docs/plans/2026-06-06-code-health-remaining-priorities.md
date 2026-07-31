# 코드 헬스 감사 — 잔여 우선순위 실행 계획

> **작성:** 2026-06-06 · **출처:** 2026-06-05 코드 헬스 감사(11관점·21에이전트, 전체 B/76) → 잔여 우선순위 정밀 재조사(6에이전트, 현재 main 코드 기준 file:line 재확인)
> **상태(2026-07-31):** 6건 중 **3건 완료** — `P5`(PR #135) · `P6`(PR #138) · `P8`(PR #154). 잔여 3건 중 `P7` 은 **1단계+분할안 B·C 완료**(PR #155·#156, 아래 진행 블록 참조), `P9`·`P4` 미착수.
> 완료 항목의 본문은 **기록용으로 그대로 둔다**(당시 판단 근거 보존). 실제 결과는 아래 요약표 밑 "완료 항목" 블록을 볼 것 — **세 건 모두 본문이 적은 것과 실제(범위·전제)가 달랐다.**

## Context

AI(Claude Code)로 대량 생성된 B2B 대시보드의 코드 헬스 감사 결과 전체 등급 **B(유지보수 76/100)**. 상위 우선순위 3건(P1 역할 상수 통일 · P3 산출물 접근 헬퍼 · P2 mockup 삭제)은 **PR #123(2026-06-06)으로 머지 완료**. 이 문서는 **남은 우선순위 6건**(잔여 부채 5 + 스킬 갱신 1)의 실행 계획이다. compact로 세부가 유실되지 않도록 영속 기록한다.

각 항목의 file:line은 **P1/P3/P2 머지 + prettier 재포맷 이후의 현재 main 코드를 직접 열어 재확인**한 값이다(감사 당시 라인에서 이동함). 착수 직전에는 한 번 더 그렙으로 위치를 재확인할 것(파일이 또 바뀌었을 수 있음).

## ⚠️ 두 묶음 구분 (가장 중요)

- **A. 순수 정리 (동작 불변):** P9, P4, P8, P7 — 이번 P1/P3/P2처럼 "동작 그대로, 코드만 정리". 기존 테스트가 안전망.
- **B. 잠재 버그 수정 (동작 변경 의도):** P5, P6 — 숨은 결함을 고치므로 **의도적으로 동작이 바뀐다**(쿼터가 걸리고, 삼켜지던 에러가 드러남). 착수 전 사용자 승인 권장.

## 요약

| ID                           | 항목                                                        | 분류        | 심각도 | 노력 |
| ---------------------------- | ----------------------------------------------------------- | ----------- | ------ | ---- |
| `P9-skill-update`            | check-server-action 스킬의 역할 체크 예시를 신규 헬퍼(OP    | 🧹 순수정리 | 보통   | 낮음 |
| `P4-editPBLV2`               | editPBLV2 인터뷰 슬라이스 병합부 추출 + deepMerge 채택      | 🧹 순수정리 | 보통   | 보통 |
| ✅ `P8-interview-dup-legacy` | 인터뷰 V2 저장 액션 공통 골격 중복 + 죽은 legacy 함수/stale | 🧹 순수정리 | 보통   | 보통 |
| `P7-layer-inversion`         | 계층 역전 제거: 기반 계층(lib·components)이 app 라우트를    | 🧹 순수정리 | 보통   | 높음 |
| ✅ `P5-matching-quota`       | 매칭 LLM 경로가 쿼터(checkAndRecordLLMUsage) 미적용         | 🐛 버그수정 | 보통   | 낮음 |
| ✅ `P6-status-desync`        | 생성 성공 후 projects.status 전이 update 에러를 조용히      | 🐛 버그수정 | 높음   | 보통 |

**권장 순서:** ① `P9`(스킬 문서, 즉시) → ~~② `P5`~~ → ~~③ `P6`~~ → ④ `P4`(editPBLV2 분해) → ~~⑤ `P8`~~ → ⑥ `P7`(계층 역전, 노력 높음·범위 큼·마지막). 단 B묶음(P5·P6)은 동작이 바뀌므로 각각 사용자 승인 후 착수.

> ✅ **완료 항목 (본문은 기록용으로 보존)**
>
> - **`P5` 완료 (PR #135, 2026-07-29)** — 실제 누락은 매칭만이 아니라 **PBL 생성·STT 녹취록 분석·`/test-pbl` 포함 4곳**이었다. 계층은 매칭만 서비스(throw — route 가 메시지로 429 판정), 나머지는 액션(서비스에서 throw 하면 `getLLMUserFriendlyError` 가 쿼터 메시지를 뭉갠다). STT 는 **입력 검증 뒤** 배치(쿼터는 확인과 동시에 차감).
> - **`P6` 완료 (PR #138, 2026-07-29)** — 본문이 지목한 3곳이 아니라 **8곳**이었다. 누락분은 인터뷰 저장 3곳(`interview/actions.ts`)과 진단 완료 2곳(`assessment/actions.ts`·`ops/.../crud.ts`). 인터뷰 3곳은 로깅뿐 아니라 **알림 오발송까지** 고쳤다 — `statusTransitioned` 를 전이 성공 시에만 세워, 전이 실패 시 "인터뷰 완료" 알림이 나가지 않는다. 진단 2곳은 `.eq('status','NEW')` 멱등 가드가 있어 0행 매치가 정상이므로 error 만 검사한다. 부록이 예고한 2차(반환 타입 변경·RPC 원자화)는 **미착수**.
> - **`P8` 완료 (PR #154, 2026-07-31)** — 부록의 정정(내부 순서 재배열·update 페이로드 track별 분리·특성화 선작성)대로 실행했고, 실측에서 본문·부록의 추가 오류도 드러났다: ① 본문 위치표는 **전 항목 stale**(+33~48행) ② 부록 415행의 "roadmap 단일 row+**upsert**"도 부정확 — 둘 다 update/insert **명시 분기**이며 진짜 차이는 **row 객체를 두 분기가 공유하느냐**다 ③ "기존 V2 테스트가 안전망" 전제는 거짓(`interview_date` 단언 0건) → **특성화 11개 선작성 + 결함 주입 2회**(추출 전 함수 레벨·추출 후 헬퍼 레벨)로 회귀 그물을 먼저 짰다 ④ 본문·부록 모두 놓친 `save*V2` 호출처 1곳 추가 발견(`roadmap/actions.ts` 결과 인라인 편집 → 인터뷰 write-back — 시그니처 불변으로 무영향) ⑤ zod join 치환은 부록대로 V2 2곳만(V1 은 함수째 삭제, "단일 필드 1줄"·"빈 errors fallback" 엣지는 `zod-error-format.test.ts` 의 유틸 케이스로 이관). knip 은 `fetchPBLInterview` 플래그가 사라진 대신 V1 전용 스키마 타입 2개(`RoadmapInterviewInput`·`RoadmapInterviewAutoSaveInput`)가 새 unused 로 드러났다(스키마 파일은 P8 범위 밖 — 후속 정리 후보). → **후속(같은 PR, 의도된 동작 변경 1건): 인터뷰 날짜를 최초 입력일로 통일** — 위 ②의 비대칭(Roadmap 이 update 마다 `interview_date`·`interviewer_id` 를 오늘/현재 사용자로 덮어써 화면·산출물의 "인터뷰 일자"가 사실상 최종 수정일로 동작)은 특성화로 보존했다가, 머지 전 사용자가 "둘 다 최초 입력일" 정책을 확정해 제거했다(특성화도 새 동작 기준으로 뒤집어 RED→GREEN + 결함 주입 재검증, 페이로드 빌더 콜백도 공통 로직으로 단순화). `interviewer_id` 는 프로덕션 read 0건 write-only 실측. ⚠️ 기존 row 의 이미 밀린 날짜는 소급 복원 불가(최초 입력일 기록이 없음) — 앞으로의 저장부터 보존된다.

> 🔄 **`P7` 1단계 완료 + 분할안 확정 (PR #155, 2026-07-31)** — 착수 실측(탐사 에이전트 2)으로 본문·부록의 오류를 정정하고 아래 분할안을 확정했다.
>
> **분할안(확정):** **A(완료)** = 단계 0·1 실측판 + 단계 2 전반부(lib 가드) → **B** = 단계 4 gallery 묶음(`AdminFilters`·`UseRoadmapDialog` 이동 + `GalleryCard` 타입 추출로 단계 3 축소판 흡수) → **C** = 단계 4 ops 묶음(`AssessmentTokenSection`·`UserManagementTable` + `AssignmentForm` dead 삭제[테스트 동반]) → **D** = 단계 4 나머지(`DeleteAccountSection`·`PublicSelfAssessmentForm` — `assessment/[token]/_components` **신설** 필요 + `components/assessment` 형제 응집도 점검) → **E** = ops 조립 컴포넌트군(`ConsultantSelector`·`ManualAssignmentForm`·`SelfAssessmentForm`·`RecommendationResults`) 소비자 위치 실측 후 방침 결정 → **F** = components 가드(잔여 역참조 0 이후에만. 대안: 기존 위반 파일 예외 목록과 함께 조기 도입) → **단계 5**(셸 3 + `ProfileForm`/`ProfilePageClient` + `ShareToggle`/`LikeButton`/`AttachmentList`)는 **동작 변경 경계 — 별도 설계 + 사용자 승인**.
>
> **1단계 실행 결과:** `NoticeForm`·`AttachmentUploader`·`UploadProgress`·`upload-notice-attachment`(+동반 테스트 4) **8파일**을 `ops/notices/_components` 로 git mv(rename 98~100%), 갱신은 import·vi.mock 경로 10곳뿐. `AttachmentList` 는 **의도적으로 잔류**. lib 가드는 `no-restricted-imports` + `group: ['@/app/**']`(본문 표기 `@/app/*` 는 minimatch 상 깊은 경로를 못 잡아 **정정**) + lib 테스트 예외. 결함 주입 2회 검증 — ① mock 경로를 옛 것으로 역치환 시 34건 중 **14건 실패**(mock 실효 = 갱신이 실제로 필요했음을 실증) ② lib 위반 import 주입 시 lint error 검출. `src/lib` 내 `@/app` 정적 참조 **0건 달성**.
>
> **실측 정정(본문·부록 대비):** ① **`UploadProgress.tsx` 가 이동 대상 목록에 아예 없다**(NoticeForm·AttachmentUploader 가 import — 빠뜨리면 참조 고아) ② `AttachmentList` 는 본문(단계 4 이동 목록)과 부록(단계 5 이월)이 **모순** — 실측상 일반 열람 `notices/[id]/_components/NoticeAttachmentDownloader.tsx` 가 소비해 **이동 시 새 역전이 생기므로 부록이 옳다** ③ 형제 import 는 부록 서술("상대만 갱신")과 반대로 **전부 절대경로**(`@/components/notices/...`)였고, `NoticeForm.test.tsx` 의 vi.mock 2건은 미갱신 시 **typecheck·lint 를 통과하면서 mock 만 조용히 실효**하는 유일한 구멍(결함 주입으로 실증) ④ "type-only 역참조 4건" 은 실측 **1건**(`GalleryCard`)뿐 — 3건은 value+type 혼재라 타입 추출만으로 해소 불가, 인라인 `type` 지정자 2건(`AssessmentTokenSection`·`ConsultantSelector`)은 문서 누락 ⑤ vi.mock 은 24건이 아니라 **호출 23·파일 22**, 위치표 라인 번호도 다수 stale. **부수 발견:** `uploadAttachmentAction`(ops/notices/actions.ts) 프로덕션 소비자 0건 dead 후보 · `ops/projects/actions.test.ts`(42KB) 가 배럴 전환 후 형제 위치에 잔존 · 이동한 util 은 coverage include 미매치(기존 `_components/*.ts` 9개와 동일 관례, CI 비차단).
>
> 🔄 **분할안 B+C 완료 (PR #156, 2026-07-31)** — gallery 3종(`AdminFilters`·`GalleryCard`·`UseRoadmapDialog`)+테스트를 gallery 해당 `_components` 로, ops 2종(`AssessmentTokenSection`·`UserManagementTable`)+테스트를 ops 해당 `_components` 로 git mv(10파일). dead 2종(`AssignmentForm`·`MatchingRecommendations`)+테스트 4파일 삭제(단위 테스트 6774→6725, −49). 결함 주입 1회(AdminFilters mock 을 옛 절대경로로 역치환 → 19건 중 2건 실패 검출 후 원복). C 묶음은 주입 생략 — mock 경로가 절대·상대 모두 같은 모듈로 resolve 라 실효 구멍이 구조적으로 없음.
>
> **실측 정정(분할안 B·C 대비, 6번째 사례):** ① **B 의 "GalleryCard 타입 추출" 전제("여러 라우트 소비라 이동 불가")가 틀렸다** — 비테스트 소비자는 `GalleryContent.tsx` 1곳뿐 → 사용자 결정으로 **통째 이동**(타입 추출 폐기, 본문 단계 4의 원래 이동 목록과 일치). 형제 `./LikeButton` import 만 절대화(LikeButton 은 3소비자 다중이라 잔류) ② **`MatchingRecommendations` 가 AssignmentForm 과 동일 dead**(외부 소비자 0, import 문 0 의 완전 독립 파일, knip 은 자기 테스트가 import 해 미탐지) → 사용자 승인으로 동반 삭제 ③ **UserManagementTable 의 역참조는 ops actions 가 아니라 `(auth)/actions` 배럴** — `ops/users/actions.ts` 는 존재하지 않는 파일. 이동 후에도 이 import 는 유지(크로스 라우트그룹, components→app 이 app→app 정방향이 되는 것 자체가 해소) ④ 이동 후 `src/components` 잔여 역참조 **14파일**(셸 3 + ProfileForm·ProfilePageClient + PublicSelfAssessmentForm + DeleteAccountSection + LikeButton·ShareToggle + AttachmentList + ops 4: ConsultantSelector·ManualAssignmentForm·SelfAssessmentForm·RecommendationResults) — **다음은 분할안 D**(DeleteAccountSection·PublicSelfAssessmentForm, `assessment/[token]/_components` 신설), 이후 E(ops 조립 4종 실측)·F(components 가드).

> 📌 **착수 전 [부록: 2차 적대 검증 정정·보강](#부록-2차-적대-검증-정정보강-착수-전-필독)을 먼저 읽을 것.** 본문과 충돌 시 부록이 우선. (특히 P4 동작-등가 단서는 누락 시 "순수정리"가 버그가 됨.)

## 공통 실행 규약 (모든 항목)

1. `main`에서 `git switch -c <type>/<slug>` 분기 (직접 커밋 금지).
2. **착수 직전 위치 재바인딩** — 이 문서의 file:line은 작성 시점 스냅샷이라 stale 가능. 각 항목 시작 시 **라인 번호를 신뢰하지 말고 심볼명(함수/상수)으로 grep** 해 현재 위치를 다시 잡는다. import 추적은 직접 경로 + **배럴(`index.ts`) 경유**도 함께 그렙.
3. **TDD** — 순수정리는 기존 테스트를 안전망으로, 신규 헬퍼는 테스트 선작성. 버그수정은 실패 재현 테스트 → 수정 → green. 동작 보존이 미묘한 항목(P4·P8)은 **특성화 테스트(characterization test)를 리팩터 전에 먼저** 추가.
4. 영향 범위 그렙은 `src/` **+** `e2e/` 둘 다 (P2에서 e2e spec을 놓칠 뻔한 교훈).
5. `npm run validate && npm run build` 통과 → PR → `gh pr checks`의 **모든 체크(E2E 포함) pass** 확인 후 squash 머지.

---

## A. 순수 정리 (동작 불변)

### 1. check-server-action 스킬의 역할 체크 예시를 신규 헬퍼(OPS_MANAGER_ROLES/isOpsManager/canAccessProjectArtifact)로 갱신

- **분류:** 순수정리(동작 불변) · **심각도:** 보통 · **노력:** 낮음 · **ID:** `P9-skill-update`

**요약** — .claude/skills/check-server-action/SKILL.md 의 '역할 체크 패턴 3종'과 '컨설턴트 프로젝트 배정 검증' 예시가 아직 ['OPS_ADMIN','SYSTEM_ADMIN'].includes() 리터럴과 가공의 verifyProjectAccess() 헬퍼를 기준으로 한다. 이번 리팩터링으로 코드베이스 표준이 OPS_MANAGER_ROLES/isOpsManager(역할 체크)·requireAuthWithRole(OPS_MANAGER_ROLES,...)(인증+역할 일괄)·canAccessProjectArtifact(산출물 접근 순수 판정)로 통일되었으므로 스킬 문서 예시를 실제 코드와 일치시켜야 한다.

**위치 (현재 main 기준 확인)**

| 파일                                          | 라인   | 메모                                                                                                                                                                                                                                                                                                                                                                          |
| --------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.claude/skills/check-server-action/SKILL.md` | 25-44  | '역할 체크 패턴 3종' 코드블록. 패턴 A(L28-30)·패턴 C(L38-43)가 ['OPS_ADMIN','SYSTEM_ADMIN'].includes() 리터럴 사용. 현재 코드에서 이 리터럴 .includes 가드는 전무 (소스 grep 0건; message.ts:76 잔존은 데이터 맵이라 가드 아님). 패턴 B(L33-35) role !== 'CONSULTANT_APPROVED' 는 현재도 유효.                                                                                |
| `.claude/skills/check-server-action/SKILL.md` | 46-63  | '컨설턴트 전용: 프로젝트 배정 검증' 섹션. 인라인 assigned_consultant_id 비교(L52-60)와 L63 '반복되는 경우 verifyProjectAccess() 같은 헬퍼 함수로 추출 가능' 문구. verifyProjectAccess는 interview/actions.ts 에만 로컬 존재하는 프라이빗 함수이며 공용 표준 헬퍼가 아님 — 현재 표준은 requireConsultantProjectAccess/requireConsultantRoadmapAccess/canAccessProjectArtifact. |
| `src/lib/constants/status.ts`                 | 27-34  | 신규 표준 헬퍼 정의 — OPS_MANAGER_ROLES: readonly UserRole[] = ['OPS_ADMIN','SYSTEM_ADMIN'], isOpsManager(role: UserRole): boolean. 스킬 예시가 import 경로 @/lib/constants/status 로 참조해야 함.                                                                                                                                                                            |
| `src/lib/actions/auth-helpers.ts`             | 62-152 | requireAuthWithRole(allowedRoles, options)(L62), requireConsultantRoadmapAccess(supabase,userId,roadmapId)→{projectId}\|{error}(L86), requireConsultantProjectAccess(supabase,userId,projectId,errorMessage)→true\|{error}(L112), canAccessProjectArtifact(role, assignedConsultantId, userId): boolean 순수함수(L143). import 경로 @/lib/actions/auth-helpers.               |

**왜 문제인가**

스킬 문서의 예시 코드가 현재 코드베이스 표준과 불일치한다. (1) 패턴 A/C가 ['OPS_ADMIN','SYSTEM_ADMIN'].includes() 리터럴을 권장하지만, 이번 리팩터링으로 소스에서 이 리터럴 가드는 모두 OPS_MANAGER_ROLES/isOpsManager로 치환됨(grep 0건 확인). (2) L63이 'verifyProjectAccess() 같은 헬퍼로 추출 가능'이라고 미래형으로 안내하지만, 실제로는 이미 requireConsultantProjectAccess/requireConsultantRoadmapAccess(DB 조회형)·canAccessProjectArtifact(순수 판정형) 공용 헬퍼가 존재하고 roadmap/pbl/export 액션에서 광범위하게 사용 중이다. 스킬은 'use server' 파일을 작성·리뷰할 때 기준이 되므로, 낡은 예시를 따르면 리뷰어(또는 Claude)가 리터럴 재도입·헬퍼 미사용을 정상으로 오판해 패턴이 다시 분기될 수 있다.

**접근법**

1. [패턴 A 수정] SKILL.md L28-30 의 패턴 A를 신규 표준 두 형태로 교체한다. (1) 변경(mutation) 함수: requireAuthWithRole(OPS_MANAGER_ROLES, { authError, roleError }) 한 줄 호출 후 if ('error' in auth) return { success:false, error: auth.error } — crud.ts:33, dashboard.ts:17 등 20+ 콜사이트가 이 형태. (2) 이미 role 을 보유한 분기 내부 검사: if (!currentUser || !isOpsManager(currentUser.role)) — api/matching/generate/route.ts:30 형태. import: { OPS_MANAGER_ROLES, isOpsManager } from '@/lib/constants/status', { requireAuthWithRole } from '@/lib/actions/auth-helpers'.
2. [패턴 B 유지] L33-35 패턴 B(role !== 'CONSULTANT_APPROVED')는 현재도 유효하므로 변경 불필요 — 다만 단순 컨설턴트 전용 라우트가 아닌 배정 검증이 필요한 경우 requireConsultantProjectAccess 로 이어진다는 한 줄 안내 추가 가능.
3. [패턴 C 수정] L38-43 의 else if (!['OPS_ADMIN','SYSTEM_ADMIN'].includes(profile.role)) 를 else if (!isOpsManager(role)) 로 교체. 이는 fetchRoadmapVersions(roadmap/actions.ts:211-223)·pbl/actions.ts:204 의 현행 형태와 정확히 일치. 더불어 '컨설턴트+관리자 복합 접근을 DB 조회 없이 한 줄로 판정하려면 canAccessProjectArtifact(role, project.assigned_consultant_id, user.id) 를 쓴다(roadmap/actions.ts:350, roadmap-export.ts:68)'는 권장 패턴을 별도 예시로 추가.
4. [배정 검증 섹션 수정] L46-63 을 실제 헬퍼 기준으로 재작성한다. 인라인 select('assigned_consultant_id') 비교 예시는 'DB 조회형 표준 헬퍼' 호출로 대체: const access = await requireConsultantProjectAccess(supabase, user.id, projectId); if ('error' in access) return ...; (consultant/projects/[id]/actions.ts:66 형태) 그리고 로드맵 ID 기반은 requireConsultantRoadmapAccess(supabase, user.id, roadmapId)→{ projectId }(roadmap/actions.ts:175). L63 의 가공 verifyProjectAccess() 문구는 삭제하고, '이미 조회한 assigned_consultant_id 와 role 로 DB 조회 없이 판정할 때는 순수함수 canAccessProjectArtifact 사용'을 명시.
5. [헬퍼 시그니처 표 추가(선택)] auth-helpers 4종(requireAuthWithRole·requireConsultantProjectAccess·requireConsultantRoadmapAccess·canAccessProjectArtifact)과 status 2종(OPS_MANAGER_ROLES·isOpsManager)의 정확한 시그니처·import 경로·반환형(예: canAccessProjectArtifact(role, assignedConsultantId, userId): boolean — DB 조회 없음, '누가 접근하는가'만 판정하고 track/상태는 호출부 별도 검사)을 한 표로 정리해 리뷰 기준을 단일 출처화.

**재사용할 기존 자산**

- src/lib/constants/status.ts:27 — OPS_MANAGER_ROLES
- src/lib/constants/status.ts:32 — isOpsManager(role)
- src/lib/actions/auth-helpers.ts:62 — requireAuthWithRole(allowedRoles, options)
- src/lib/actions/auth-helpers.ts:86 — requireConsultantRoadmapAccess(supabase, userId, roadmapId)
- src/lib/actions/auth-helpers.ts:112 — requireConsultantProjectAccess(supabase, userId, projectId, errorMessage)
- src/lib/actions/auth-helpers.ts:143 — canAccessProjectArtifact(role, assignedConsultantId, userId)

**동작 변화** — 없음 — 동작 불변. 스킬 문서(.claude/skills/.../SKILL.md)만 수정하며 실행 코드·런타임 동작에는 영향이 없다. 리뷰 기준 텍스트를 현재 코드 표준에 맞춰 갱신할 뿐이다.

**검증** — 스킬은 실행 코드가 아니므로 validate/build/test 대상 N/A. 올바름의 검증은 '문서 예시가 현재 main 코드와 1:1 일치하는가'로 갈음한다: (1) 패턴 A/C 교체 후 ['OPS_ADMIN','SYSTEM_ADMIN'].includes 리터럴이 SKILL.md 에서 사라졌는지 grep 0건 확인(현재 SKILL.md L29·L41 2건 → 0건). (2) 교체한 isOpsManager/OPS_MANAGER_ROLES/canAccessProjectArtifact/requireConsultantProjectAccess/requireConsultantRoadmapAccess 의 import 경로·시그니처·반환형이 status.ts/auth-helpers.ts 정의와 일치하는지 대조(본 조사에서 확인 완료). (3) 예시 코드 형태가 실제 콜사이트(crud.ts:33, roadmap/actions.ts:211·350·175, pbl/actions.ts:204, roadmap-export.ts:68)와 동형인지 대조.

**리스크**

- 문서를 너무 헬퍼 중심으로만 바꾸면, 단순 1회 가드처럼 헬퍼 도입이 과한 케이스(예: 한 함수 안에서 역할만 1회 체크)에 대해 인라인 isOpsManager 사용이 정상임을 누락할 수 있음 → 패턴 A에 '두 형태(일괄 requireAuthWithRole / 인라인 isOpsManager)' 모두 명시해 완화.
- verifyProjectAccess 문구 삭제 시, interview/actions.ts 에 동명의 로컬 프라이빗 함수가 실재함을 모르고 '존재하지 않는 함수'로 오해할 여지 → 해당 함수는 라우트 로컬 패턴이며 공용 표준은 auth-helpers 4종임을 한 줄로 구분 표기.
- canAccessProjectArtifact 는 track/프로젝트 상태(EXPORT_ELIGIBLE 등)를 판정하지 않는 순수 '누가' 판정 함수라는 경계를 명시하지 않으면, 리뷰어가 이 한 줄로 모든 인가가 끝났다고 오판할 위험 → auth-helpers.ts:133-142 주석의 경계 설명을 예시에 반영.

**의존성** — 독립 — 이 작업(P1 역할 상수 통일·P3 canAccessProjectArtifact 헬퍼 도입)이 이미 main 에 머지된 뒤의 문서 후속 정합 작업이므로, 코드 변경 항목들과의 추가 순서 의존은 없다. 단, 향후 역할 헬퍼 시그니처가 또 바뀌면 본 문서도 함께 갱신되어야 함(같은 종류의 drift 재발 방지).

---

### 2. editPBLV2 인터뷰 슬라이스 병합부 추출 + 스키마 .default() 이중정의 제거 (deepMerge 직접 채택 ❌)

- **분류:** 순수정리(동작 불변) · **심각도:** 보통 · **노력:** 보통 · **ID:** `P4-editPBLV2`

> ⚠️ **동작-등가 필수 단서 (부록 P4 참조):** 형제 `savePBLInterviewV2`의 `deepMerge`를 **그대로 채택하면 안 된다** — nested 객체에서 `??`(통째 교체) vs `deepMerge`(deep-merge) 의미가 다르다. 또한 권장하려던 `PBLTrainingEnvSchema.parse({...current,...patch})`도 **patch가 키를 omit한 경우에만** 현행 `??`와 등가다. patch에 explicit `undefined`/`null` 키가 담기면 spread가 current를 덮은 뒤 `.default()`가 하드코딩 기본값으로 **리셋**되어 발산한다(현행 `??`는 current 보존). → `mergeTrainingEnv`는 **patch에서 값이 undefined/null인 키를 제거한 뒤 parse**(=`??` 시맨틱 보존)하도록 구현하고, `.parse`(throw) 대신 `.safeParse` + 기존 에러 메시지 경로를 유지할 것.

**요약** — editPBLV2(약 308줄)의 trainingEnv 16필드·problemDefinitionSheet 4필드 인라인 fallback 병합을, **하드코딩 기본값을 스키마 `.default()` 단일 출처로 일원화**하는 `mergeTrainingEnv`/`mergeProblemDefinitionSheet` 순수 헬퍼로 추출한다(중복 제거가 목적). 형제 `savePBLInterviewV2`와는 "평면 필드 의미는 동일하나 nested 처리가 달라 `deepMerge` 직접 공유는 불가" — 의미 일관성은 헬퍼 콜로케이트로만 확보. **동작 불변은 위 단서를 지켜야만 성립**한다.

**위치 (현재 main 기준 확인)**

| 파일                                                                              | 라인      | 메모                                                                                                                                                                                                                                                                     |
| --------------------------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/app/(dashboard)/consultant/projects/[id]/pbl/actions.ts`                     | 861-1168  | editPBLV2 함수 전체(약 308줄). 인터뷰 슬라이스 vs operations 슬라이스 분기는 904-996, 인터뷰 슬라이스 병합 본문은 998-1163.                                                                                                                                              |
| `src/app/(dashboard)/consultant/projects/[id]/pbl/actions.ts`                     | 1014-1107 | merged 객체 구성 — camelCase flat 병합. 이 블록이 추출 대상의 핵심.                                                                                                                                                                                                      |
| `src/app/(dashboard)/consultant/projects/[id]/pbl/actions.ts`                     | 1022-1074 | trainingEnv 16필드 'patch ?? current ?? 하드코딩기본값' 병합 (53줄). mergeTrainingEnv 순수함수로 추출 후보.                                                                                                                                                              |
| `src/app/(dashboard)/consultant/projects/[id]/pbl/actions.ts`                     | 1078-1094 | problemDefinitionSheet 4필드 'patch ?? current ?? ""' 병합. mergeProblemDefinitionSheet 로 추출 후보.                                                                                                                                                                    |
| `src/app/(dashboard)/consultant/projects/[id]/pbl/actions.ts`                     | 910-996   | operations 슬라이스(pbl_reports.pbl_content) 분기 — applyOperationsPatch 헬퍼 추출 후보(별도).                                                                                                                                                                           |
| `src/app/(dashboard)/consultant/projects/[id]/pbl/actions.ts`                     | 1-46      | import 블록. deepMerge import 부재 확인. mapDbToPBLInterview/mapPBLInterviewToDb 는 40번 줄에서 이미 import 중.                                                                                                                                                          |
| `src/app/(dashboard)/consultant/projects/[id]/interview/actions.ts`               | 1071-1201 | 형제 함수 savePBLInterviewV2. 1128번 줄에서 deepMerge(mapDbToPBLInterview(existing), validated) 한 줄로 병합 — 동일 의미를 1/50 코드로 처리. ⚠️ savePBLInterviewV2 는 pbl/actions.ts 가 아니라 interview/actions.ts 에 위치(힌트의 '형제 함수' 파일 위치 정정).          |
| `src/app/(dashboard)/consultant/projects/[id]/interview/actions.ts`               | 34        | import { deepMerge } from '@/lib/utils/deep-merge' — 채택 시 pbl/actions.ts 에 동일 import 추가.                                                                                                                                                                         |
| `src/lib/utils/deep-merge.ts`                                                     | 1-45      | deepMerge 정의. plain object 끼리만 재귀 머지, 배열은 source 로 교체, source undefined 는 skip(target 유지), source null 은 명시 보존.                                                                                                                                   |
| `src/lib/schemas/interview-pbl.ts`                                                | 606-647   | PBLTrainingEnvSchema — 16필드 .default() 정의. editPBLV2 의 하드코딩 fallback 과 1:1 중복(이중정의/silent divergence 원천).                                                                                                                                              |
| `src/lib/schemas/interview-pbl.ts`                                                | 762-767   | PBLProblemDefinitionSheetSchema — 4필드 .default('') 정의. editPBLV2 1078-1094 와 중복.                                                                                                                                                                                  |
| `src/lib/services/interview/converters.ts`                                        | 608-626   | mapPBLInterviewToDb(611: pass-through), mapDbToPBLInterview(619: pass-through). 둘 다 schema parse 없이 그대로 전달 → 병합 시점에 default 가 자동 채워지지 않음(현재 editPBLV2 가 하드코딩 fallback 으로 메우는 이유). mergeTrainingEnv 순수함수의 콜로케이트 후보 위치. |
| `src/app/(dashboard)/consultant/projects/[id]/pbl/_components/result-v2/types.ts` | 38-66     | PBLResultEditPayload — trainingEnv?: Partial<PBLTrainingEnv>(49), problemDefinitionSheet?: Partial<...>(55), operations(65). patch 가 Partial 임을 확인.                                                                                                                 |
| `src/app/(dashboard)/consultant/projects/[id]/pbl/actions-v2.test.ts`             | 248-610   | editPBLV2 describe 블록(안전망). trainingEnv 병합 310-345, problemDefinitionSheet 병합 348-381, overview 383, operations 슬라이스 445-610, 슬라이스 동시 patch 차단 574, 빈 patch no-op 273. 13건 통과 확인.                                                             |

**왜 문제인가**

editPBLV2 의 인터뷰 슬라이스 병합부(1014-1107)는 trainingEnv 16필드·problemDefinitionSheet 4필드를 각각 'patch.x ?? current.x ?? 하드코딩기본값' 형태로 손수 나열한다(약 90줄). 정확히 같은 의미를 형제 함수 savePBLInterviewV2(interview/actions.ts:1128)는 deepMerge 한 줄로 처리하는데, pbl/actions.ts 는 deepMerge 를 import 조차 하지 않아 두 곳의 부분병합 의미가 각자 진화할 위험이 있다. 더 심각한 건 trainingEnv/problemDefinitionSheet 의 기본값('', [], 0, 'NO', {career:'',level:''} 등)이 PBLTrainingEnvSchema(interview-pbl.ts:606-647)·PBLProblemDefinitionSheetSchema(762-767)의 .default() 와 글자 그대로 이중정의된 점이다. 스키마에 새 필드가 추가되거나 default 가 바뀌면 editPBLV2 의 하드코딩 fallback 은 자동으로 따라오지 않아, 신규 필드가 병합 시 누락되거나 빈 값으로 덮이는 silent divergence 가 발생한다(실제로 Phase E 5필드·누락 3필드 추가 때마다 이 블록을 수동 동기화한 흔적이 코드 주석에 남아 있음).

**접근법**

1. trainingEnv 병합(1022-1074)을 src/lib/services/interview/converters.ts 에 mergeTrainingEnv(current?: Partial<PBLTrainingEnv>, patch?: Partial<PBLTrainingEnv>): PBLTrainingEnv 순수함수로 추출. 단 내부 구현은 하드코딩 fallback 을 제거하고 'PBLTrainingEnvSchema.parse({ ...current, ...patch })' 로 대체 — 스키마 .default() 가 빠진 키를 자동으로 채우므로 16개 기본값 이중정의가 단일 출처(스키마)로 일원화된다. nested 객체(aiInfraDetail 등)는 현재 ?? 의미와 동일하게 '있으면 통째 교체'가 되도록 spread 순서(current 먼저, patch 나중)로 보장.
2. problemDefinitionSheet 병합(1078-1094)도 동일 패턴으로 mergeProblemDefinitionSheet 추출 또는 PBLProblemDefinitionSheetSchema.parse({ ...current, ...patch }) 인라인 적용. 4필드 default('') 중복 제거.
3. operations 슬라이스 분기(910-996)는 별도 관심사 — applyOperationsPatch(currentContent, patch.operations) 헬퍼로 추출(선택). 인터뷰 슬라이스 리팩터와 독립이므로 한 PR에 묶지 말 것 권장.
4. deepMerge 채택 범위 결정: 최상위 평면 필드(companyIssues, organization, courseNecessity, activities, priority, target, currentAiLevel, expectedAiLevel, overview 펼침)는 현재 spread(...patch.x)로 단순 교체 중이라 deepMerge 도입 이점이 작다. 가장 큰 중복인 trainingEnv/problemDefinitionSheet 만 스키마 parse 헬퍼로 처리하면 ~90줄 → ~10줄로 축소되며, 형제 함수와의 '의미 일관성'은 헬퍼 콜로케이트로 확보된다. (deepMerge 를 trainingEnv 전체에 그대로 적용하면 nested 객체가 deep-merge 되어 동작이 바뀌므로 — risks 참조 — 무비판적 deepMerge 채택은 지양.)
5. editPBLV2 본문은 merged = { ...current, ...(patch.overview), ...(patch.trainingEnv ? { trainingEnv: mergeTrainingEnv(current.trainingEnv, patch.trainingEnv) } : {}), ... } 형태로 축약. 이후 PBLInterviewSchema.partial().safeParse → mapPBLInterviewToDb 흐름(1110-1118)은 그대로 유지.
6. 추출한 mergeTrainingEnv/mergeProblemDefinitionSheet 에 대한 단위테스트를 converters.test.ts 에 신규 추가(부분 patch·빈 current·신규 필드 누락 시 default 채움 검증).

**재사용할 기존 자산**

- deepMerge — src/lib/utils/deep-merge.ts (형제 savePBLInterviewV2 가 사용하는 부분병합 유틸)
- PBLTrainingEnvSchema / PBLProblemDefinitionSheetSchema — src/lib/schemas/interview-pbl.ts:606,762 (.parse() 로 default 자동 적용 → 하드코딩 fallback 대체)
- mapDbToPBLInterview / mapPBLInterviewToDb — src/lib/services/interview/converters.ts:608,619 (이미 pbl/actions.ts 40번 줄에서 import 중, 추출 헬퍼 콜로케이트 위치)
- PBLResultEditPayload / PBLTrainingEnv 타입 — \_components/result-v2/types.ts:38, interview-pbl.ts:648

**동작 변화** — 없음(단, 아래 단서를 **모두** 지킨 구현에 한해). 경계 3가지: (a) **키 부재 vs explicit undefined/null** ⭐ — `{...current,...patch}`는 patch가 키를 **생략**한 경우에만 현행 `??`와 등가다. patch가 키를 explicit `undefined`/`null`로 담으면 spread가 current를 덮은 뒤 `.default()`가 하드코딩값으로 리셋(또는 null 보존)되어 **현행 `??`(current 보존)와 발산**한다 → `mergeTrainingEnv`는 patch의 undefined/null 키를 **먼저 제거한 뒤** parse 해 `??` 시맨틱을 보존할 것. (b) nested 객체(aiInfraDetail 등)는 현행 `??`가 '통째 교체'이므로, `deepMerge`를 적용하면 부분 deep-merge로 **동작이 변함** → deepMerge 직접 채택 금지, schema parse(통째 교체) 유지. (c) 배열 필드는 parse·`??` 모두 통째 교체라 불변. **`.safeParse` 사용** + 실패 시 기존 에러 메시지 경로 유지. (상세: 부록 P4)

**검증** — 기존 안전망: pbl/actions-v2.test.ts 의 editPBLV2 describe(248-610) 13건이 현재 green(직접 실행 확인). 특히 trainingEnv 부분 patch 시 properTrainingHours 만 갱신·internalPlace/aiInfrastructure 보존(310-345), problemDefinitionSheet core 만 patch·나머지 3필드 보존(348-381)이 동치성을 직접 검증한다 — 추출 후 이 테스트가 그대로 green 이면 동작 보존 입증. 추가로: ① 신규 mergeTrainingEnv/mergeProblemDefinitionSheet 순수함수 단위테스트(converters.test.ts) — 빈 current+부분 patch 시 누락 필드가 스키마 default 로 채워지는지, nested 객체 통째 교체 의미가 보존되는지 검증. ② npm run validate (typecheck+lint+test) ③ npm run build. E2E 불필요(서버 내부 병합 로직, UI 플로우 무변경). 사전 grep: 'mergeTrainingEnv'·'trainingEnv:' 로 추출 후 호출처 단일성 확인.

**리스크**

- 가장 큰 함정: trainingEnv 전체에 deepMerge 를 무비판 적용하면 nested 객체(aiInfraDetail.pcCount 만 patch 시 toolCapacity/networkStatus 가 deep-merge 로 보존됨)가 현재 '통째 교체' 의미와 달라진다. 현재 ?? 구현은 aiInfraDetail 을 통째 교체하므로, 동작 불변을 원하면 deepMerge 대신 스키마 parse({...current,...patch}) 를 써야 한다. 이 차이를 놓치면 '순수정리' 가 아니라 의도치 않은 버그 주입이 된다.
- 스키마 .parse() 로 default 를 채우는 방식은 기존 DB 의 레거시 trainingEnv 에 신규 필드가 없을 때 default 를 주입한다 — 현재 하드코딩 fallback 도 동일하게 주입하므로 등가이나, 만약 스키마에 .min(1) 같은 비-default 제약이 trainingEnv 하위에 추가되면 parse 가 throw 할 수 있어 빈 입력 DRAFT 중간저장이 깨질 수 있음. 현재 16필드 전부 .default() 라 안전하지만 추출 헬퍼에 try/parse 안전장치 또는 .partial() 적용 여부를 명시 결정해야 함.
- operations 슬라이스 추출까지 같은 PR 에 묶으면 리뷰 범위가 커지고 pbl_reports vs interviews 두 테이블 경로가 섞여 회귀 위험 증가 — 인터뷰 슬라이스 병합 추출만 독립 PR 로 진행 권장.
- mergeTrainingEnv 를 converters.ts 에 두면 schema import 가 service 계층에 추가됨 — converters.ts 가 이미 interview-pbl 스키마 타입을 참조하므로 순환참조 위험은 낮으나 import 그래프 확인 필요.

**의존성** — 독립. 단 같은 감사의 다른 PBL 항목(operations 슬라이스 정리 등)과 동일 파일 editPBLV2 를 건드리면 충돌하므로, 인터뷰 슬라이스 병합 추출을 먼저 진행하고 operations 헬퍼 추출은 후속 PR 로 분리 권장. roadmap/actions.ts 의 유사 병합부와는 별개(같은 deepMerge 만 공유).

---

### 3. 인터뷰 V2 저장 액션 공통 골격 중복 + 죽은 legacy 함수/stale 주석 정리

- **분류:** 순수정리(동작 불변) · **심각도:** 보통 · **노력:** 보통 · **ID:** `P8-interview-dup-legacy`

**요약** — interview/actions.ts의 saveRoadmapInterviewV2와 savePBLInterviewV2가 인증·track가드·zod에러join·fetch+deepMerge+upsert·상태전이·after(알림+감사+활동로그) 골격을 거의 그대로 복제하고 있고, 프로덕션 호출처가 0건인 legacy 함수 3종(saveRoadmapInterview + 매퍼, fetchInterview, fetchPBLInterview)과 이미 삭제된 savePBLInterview를 가리키는 stale 주석이 남아 있다. 골격을 persistInterview 헬퍼로 추출하고 zod join을 공용 유틸로 일원화하며 죽은 legacy를 제거한다(전부 동작 불변).

**위치 (현재 main 기준 확인)**

| 파일                                                                | 라인                        | 메모                                                                                                                                                                                                                                                                                                            |
| ------------------------------------------------------------------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/(dashboard)/consultant/projects/[id]/interview/actions.ts` | 878-1018                    | saveRoadmapInterviewV2 — V2 공통 골격의 한쪽. 검증(885-916)·fetch+deepMerge+upsert(919-971)·상태전이(973-980)·after블록(982-1011)                                                                                                                                                                               |
| `src/app/(dashboard)/consultant/projects/[id]/interview/actions.ts` | 1071-1201                   | savePBLInterviewV2 — 다른 한쪽. 검증(1077-1109)·fetch+deepMerge+upsert(1112-1154)·상태전이(1156-1163)·after블록(1165-1194). 차이점은 track값/에러문구·audit action(PBL_INTERVIEW_SAVED 고정)·알림 title/message·DB 컬럼(pbl_data vs company_details/job_tasks/improvement_goals)·매퍼(mapPBL* vs mapRoadmap*)뿐 |
| `src/app/(dashboard)/consultant/projects/[id]/interview/actions.ts` | 187-198, 905-916, 1098-1109 | 동일한 inline zod-error join 블록 3중 복제(주석까지 동일 '#001 — 모든 zod 에러를 join'). V1(187)·V2 roadmap(905)·V2 pbl(1098)                                                                                                                                                                                   |
| `src/app/(dashboard)/consultant/projects/[id]/interview/actions.ts` | 73-152                      | mapRoadmapToLegacyColumns — saveRoadmapInterview(V1) 전용. V1 제거 시 함께 제거 대상. 프로덕션 호출처 0                                                                                                                                                                                                         |
| `src/app/(dashboard)/consultant/projects/[id]/interview/actions.ts` | 159-286                     | saveRoadmapInterview(legacy V1). 프로덕션 호출처 0건 — actions-roadmap.test.ts/actions-zod-fallback.test.ts/actions-zod-multimessage.test.ts만 import. knip은 test import 때문에 미탐지                                                                                                                         |
| `src/app/(dashboard)/consultant/projects/[id]/interview/actions.ts` | 618-648                     | fetchPBLInterview(legacy snake_case 조회). knip이 유일하게 unused로 플래그(618:23). 프로덕션·테스트 모두 호출 0                                                                                                                                                                                                 |
| `src/app/(dashboard)/consultant/projects/[id]/interview/actions.ts` | 650-677                     | fetchInterview(legacy snake_case 조회). 프로덕션 호출처 0 — actions.test.ts만 import                                                                                                                                                                                                                            |
| `src/app/(dashboard)/consultant/projects/[id]/interview/actions.ts` | 815-833                     | stale 주석 블록. 822줄이 이미 삭제된 savePBLInterview를 '병존'으로 명시하고 'Task 2.11 cleanup 에서 제거 예정'이라 기술 — 실제로는 일부만 제거된 상태                                                                                                                                                           |
| `src/lib/utils/zod-error-format.ts`                                 | 20-51                       | formatZodIssuesForToast 존재. 단 labelMap 기반 토스트 포맷터(클라 RoadmapInterviewClient.tsx:368 사용). 서버 inline join은 labelMap 없이 raw .message만 사용 → 그대로 재사용 불가, 신규 경량 헬퍼 필요                                                                                                          |
| `src/lib/utils/deep-merge.ts`                                       | 전체                        | deepMerge — V2 부분 머지에 사용 중(actions.ts 938·1128). 추출 헬퍼에서 그대로 재사용                                                                                                                                                                                                                            |
| `src/lib/services/interview/converters.ts`                          | 298,480,608,619             | mapRoadmapInterviewToDb/mapDbToRoadmapInterview/mapPBLInterviewToDb/mapDbToPBLInterview — persistInterview 헬퍼에 mapToDb/mapFromDb로 주입할 콜백 출처                                                                                                                                                          |

**왜 문제인가**

두 V2 저장 액션의 ~90줄 골격(검증·머지·upsert·상태전이·after 알림/감사/활동로그)이 거의 1:1 복제라, lost-update 방지(#4 deepMerge)나 알림 조건(is_test_mode 가드) 같은 버그 수정이 생기면 두 곳을 동기화해야 한다. zod-error join 블록은 동일 주석까지 3중 복제. 더해 프로덕션에서 전혀 호출되지 않는 legacy 함수 3종+매퍼가 read에 혼란을 주고, 815-833 주석은 이미 삭제된 savePBLInterview를 가리키는 거짓 정보(stale)라 다음 정리 담당자를 오도한다.

**접근법**

1. zod-error join 일원화: src/lib/utils/zod-error-format.ts에 신규 함수 joinZodMessagesForToast(error, {maxItems=5, fallback}) 추가(기존 formatZodIssuesForToast는 labelMap 시그니처라 재사용 불가 — 같은 파일에 병치). actions.ts 3곳(187-198·905-916·1098-1109)을 이 호출로 치환. 동작 동일(메시지 .map→filter(trim)→slice(5)→join '\n', 빈배열 fallback).
2. 공통 골격 추출: 같은 파일 상단 또는 별도 헬퍼 모듈에 persistInterview({projectId, user, validated, mapToDb, mapFromDb, selectCols, track, autoSave, audit, notify}) 추가. 내부에서 fetchProjectMetaForInterview 이미 호출된 projectData를 인자로 받아 (a) fetch existing(selectCols) (b) existing? deepMerge(mapFromDb(existing), validated): validated (c) mapToDb(merged) + interview_date 기본값 주입 (d) upsert (e) validateStatusTransition→INTERVIEWED (f) after()에서 notify(알림 title/message는 인자) + createAuditLog(action·meta 인자) + insertSystemActivityLog(autoSave=false 시) 수행. roadmap/pbl 차이(track문자열·에러문구·audit action·알림 워딩·selectCols·매퍼)는 전부 파라미터로 주입.
3. saveRoadmapInterviewV2/savePBLInterviewV2를 verifyProjectAccess→fetchProjectMetaForInterview→track가드→schema선택+zod검증→persistInterview(...) 호출로 슬림화. submit*/fetch* wrapper는 그대로.
4. 죽은 legacy 제거: saveRoadmapInterview(159-286)+mapRoadmapToLegacyColumns(73-152)+fetchInterview(650-677)+fetchPBLInterview(618-648) 삭제. 동반해 import(roadmapInterviewSchema·roadmapInterviewAutoSaveSchema·RoadmapInterviewInput·RoadmapInterviewAutoSaveInput 등 V1 전용)와 사용 안 되게 된 심볼 정리.
5. 죽은 함수만 테스트하던 파일 정리: actions-roadmap.test.ts(saveRoadmapInterview)·actions-zod-fallback.test.ts(saveRoadmapInterview)는 대상 함수 삭제와 함께 제거하거나 V2 케이스로 이관. actions.test.ts는 fetchInterview 블록만 제거(processSttFile·deleteSttInsights 블록은 유지). actions-zod-multimessage.test.ts의 saveRoadmapInterview(v1) 케이스는 제거하고 V2 케이스 유지.
6. stale 주석 정리: 815-833 블록을 현실(legacy 제거 완료, V2가 정본)에 맞게 갱신 또는 삭제.

**재사용할 기존 자산**

- src/lib/utils/deep-merge.ts (deepMerge — 부분 머지)
- src/lib/services/interview/converters.ts (mapRoadmapInterviewToDb·mapDbToRoadmapInterview·mapPBLInterviewToDb·mapDbToPBLInterview — persistInterview 콜백)
- src/lib/constants/status.ts:292 (validateStatusTransition)
- src/lib/services/notification.ts (createNotificationForAdmins)
- src/lib/services/audit.ts (createAuditLog)
- src/lib/services/activity-log.ts (insertSystemActivityLog)
- src/lib/actions/auth-helpers (verifyProjectAccess 내부 requireAuthWithRole·requireConsultantProjectAccess)
- src/lib/utils/zod-error-format.ts (formatZodIssuesForToast 존재 — 단 labelMap 기반이라 직접 재사용 불가, 신규 join 함수를 같은 파일에 추가)

**동작 변화** — 없음 — 동작 불변. 추출된 persistInterview는 두 V2 함수의 기존 코드 경로(검증·deepMerge·upsert·상태전이·after 알림/감사/활동로그·is_test_mode 가드·interview_date 기본값 주입)를 그대로 캡슐화. zod join도 입력→출력 매핑 동일. legacy 함수/매퍼/stale 주석 제거는 프로덕션 호출처 0건이라 런타임 무영향.

**검증** — 안전망: actions-v2.test.ts(describe 6개·27 케이스 — saveRoadmapInterviewV2/submit/fetch + savePBLInterviewV2/submit/fetch 전수)가 추출 리팩터의 1차 회귀 그물. actions-zod-multimessage.test.ts의 V2 케이스가 zod join 일원화 검증. 골격 추출은 신규 테스트 불필요(기존 V2 테스트가 커버) — 단 persistInterview를 별도 export하면 export 1개당 단위테스트 1개 추가 권장. legacy 제거는 해당 함수 전용 테스트 파일(actions-roadmap·actions-zod-fallback)을 함께 제거하므로 신규 테스트 불필요. 최종 npm run validate(typecheck+lint+test) && npm run build && npm run knip(fetchPBLInterview 플래그 소거 확인). E2E(interview-auto-save.spec.ts·quota-exceeded.spec.ts)가 V2 저장 경로를 실사용하므로 통합 안전망.

**리스크**

- persistInterview 추출 시 after() 클로저가 캡처하는 변수(statusTransitioned·auditAction·projectData·user·options.autoSave)를 인자로 정확히 전달하지 못하면 알림/활동로그 누락 — V2 테스트로 검출되나 audit meta(schema_version·auto_save)·activity log 문구 차이를 콜백으로 정밀 주입해야 함
- roadmap V2는 audit action이 INTERVIEW_CREATE/UPDATE(분기), pbl V2는 PBL_INTERVIEW_SAVED(고정) — 이 분기를 헬퍼에 그대로 보존하지 않으면 감사 로그 의미 변경(동작 변경됨). 콜백/파라미터로 구분 필수
- legacy 함수 제거 시 함께 unused 되는 import(V1 schema·타입)를 빠뜨리면 lint(no-unused) 실패 — 제거 후 grep 재확인
- actions-zod-multimessage.test.ts·actions.test.ts는 살아있는 함수도 함께 테스트하므로 파일 통째 삭제 금지 — 죽은 함수 블록만 제거
- zod join 신규 유틸을 formatZodIssuesForToast(labelMap 시그니처)와 혼동해 잘못 치환하면 클라/서버 포맷 불일치 — 서버용은 raw .message join(labelMap 없음)임을 유지

**의존성** — 독립 (방금 머지된 P1·P3·P2와 충돌 없음). 단 같은 파일을 다루는 다른 interview/actions.ts 항목이 있으면 라인 충돌 회피 위해 순차 진행 권장. 내부 순서: zod join 일원화 → 골격 추출 → legacy 제거 → 테스트/주석 정리.

---

### 4. 계층 역전 제거: 기반 계층(lib·components)이 app 라우트를 역참조(lib→app, components→app)

- **분류:** 순수정리(동작 불변) · **심각도:** 보통 · **노력:** 높음 · **ID:** `P7-layer-inversion`

**요약** — 기반 계층이어야 할 src/lib·src/components가 상위 계층인 app 라우트의 Server Action을 import해 의존성 방향이 역전돼 있다. 대표는 src/lib/utils/upload-notice-attachment.ts가 @/app/(dashboard)/ops/notices/actions를 import하는 것이며, src/components 비테스트 21개 파일도 동일하게 @/app/...를 역참조한다. 코드 이동·import 경로 갱신만으로 해결하는 순수 정리(동작 불변)지만 범위가 넓어 단계 분할이 필요하다.

**위치 (현재 main 기준 확인)**

| 파일                                                      | 라인  | 메모                                                                                                                                                                                                                                                                                                                                    |
| --------------------------------------------------------- | ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/utils/upload-notice-attachment.ts`               | 1-4   | 핵심 사례: lib→app 역참조. createUploadUrlAction, registerAttachmentAction를 @/app/(dashboard)/ops/notices/actions에서 value import. 이 util 소비자는 src/components/notices/NoticeForm.tsx:20 와 src/components/notices/AttachmentUploader.tsx:13 두 곳뿐. ops/notices/actions.ts는 이 util을 역import하지 않음 → 순환 없음(확인 완료) |
| `src/components/Navigation.tsx`                           | 7     | import { logoutUser } from '@/app/(auth)/actions'. (dashboard)/layout.tsx에서 사용되는 공유 셸 컴포넌트 — 단일 피처 귀속 불가. NotificationBell·MessageIcon을 자식으로 포함                                                                                                                                                             |
| `src/components/MessageIcon.tsx`                          | 14    | fetchUnreadConversationCount from @/app/(dashboard)/dashboard/messages/actions. layout.tsx + Navigation에서 사용(공유 셸)                                                                                                                                                                                                               |
| `src/components/NotificationBell.tsx`                     | 15-19 | fetchNotifications 등 4개 함수를 @/app/(dashboard)/notifications/actions에서 import(다중 라인 import 블록 15-19). Navigation에서만 사용                                                                                                                                                                                                 |
| `src/components/assessment/PublicSelfAssessmentForm.tsx`  | 22    | submitPublicAssessment from @/app/assessment/actions. 소비자: src/app/assessment/[token]/PublicAssessmentClient.tsx (단일 라우트) → assessment/[token]/\_components 로 이동 후보                                                                                                                                                        |
| `src/components/auth/DeleteAccountSection.tsx`            | 5     | deleteAccount from @/app/(auth)/actions. 소비자: (dashboard)/dashboard/settings/page.tsx (단일) → settings/\_components 이동 후보                                                                                                                                                                                                       |
| `src/components/consultant/ProfileForm.tsx`               | 6     | updateConsultantProfile, saveConsultantProfile from @/app/(auth)/actions. 소비자: (auth)/register/page.tsx + ProfilePageClient (다중 라우트) → 공유로 남기거나 actions 재구조화 필요                                                                                                                                                    |
| `src/components/consultant/ProfilePageClient.tsx`         | 4     | fetchConsultantProfile from @/app/(auth)/actions. 소비자: consultant/profile/page.tsx + dashboard/profile/page.tsx (다중 라우트) → 공유 컴포넌트                                                                                                                                                                                        |
| `src/components/gallery/AdminFilters.tsx`                 | 16-17 | fetchConsultantOptions(value) + ConsultantOption(type) from @/app/(dashboard)/gallery/actions. 소비자: gallery/\_components/GalleryContent.tsx (단일) → gallery/\_components 이동 후보                                                                                                                                                  |
| `src/components/gallery/GalleryCard.tsx`                  | 15    | import type { GalleryRoadmapItem } — type-only 역참조. 소비자: gallery/\_components/GalleryContent.tsx. 타입만이므로 GalleryRoadmapItem을 공용 타입 모듈로 추출하면 저비용 해소                                                                                                                                                         |
| `src/components/gallery/LikeButton.tsx`                   | 6     | toggleLike, togglePBLLike from @/app/(dashboard)/gallery/actions. 소비자: gallery/[id]/\_components 2개 + GalleryCard                                                                                                                                                                                                                   |
| `src/components/gallery/ShareToggle.tsx`                  | 6     | toggleShare from @/app/(dashboard)/gallery/actions. 소비자: consultant/projects/[id]/roadmap/\_components/result-v2/RoadmapResultClient.tsx (gallery actions를 roadmap 라우트에서 호출 — 피처 교차)                                                                                                                                     |
| `src/components/gallery/UseRoadmapDialog.tsx`             | 11-12 | value + type(EligibleProject) from @/app/(dashboard)/gallery/actions. 소비자: gallery/[id]/\_components/GalleryDetailContent.tsx (단일)                                                                                                                                                                                                 |
| `src/components/notices/AttachmentList.tsx`               | 8     | deleteAttachmentAction from @/app/(dashboard)/ops/notices/actions. 소비자: notices/[id]/\_components/NoticeAttachmentDownloader.tsx + NoticeForm(ops). 다운로드(일반)·관리(ops) 두 라우트 교차                                                                                                                                          |
| `src/components/notices/NoticeForm.tsx`                   | 19-21 | @/app/(dashboard)/ops/notices/actions(다중 라인 19) + getAttachmentDownloadUrl from @/app/(dashboard)/notices/actions(21). 소비자: ops/notices/[id]/edit/page.tsx + ops/notices/new/page.tsx → ops/notices/\_components 이동 후보                                                                                                       |
| `src/components/ops/AssessmentTokenSection.tsx`           | 20    | @/app/(dashboard)/ops/projects/actions(다중 라인 import 종료 20). 소비자: ops/projects/[id]/page.tsx (단일) → ops/projects/[id]/\_components 이동 후보                                                                                                                                                                                  |
| `src/components/ops/AssignmentForm.tsx`                   | 5     | assignConsultant from @/app/(dashboard)/ops/projects/actions. ⚠️ 비테스트 소비자 0개 확인 — 미사용(dead) 의심. 정리 시 별도 검증(knip) 권장, 본 항목과 분리                                                                                                                                                                             |
| `src/components/ops/ConsultantSelector.tsx`               | 8     | @/app/(dashboard)/ops/projects/actions(다중 라인 종료 8). 소비자: ManualAssignmentForm                                                                                                                                                                                                                                                  |
| `src/components/ops/ManualAssignmentForm.tsx`             | 5-8   | assignConsultant(value,5) + ConsultantCandidate(type,8) from @/app/(dashboard)/ops/projects/actions. 소비자: AssignmentTabSection                                                                                                                                                                                                       |
| `src/components/ops/SelfAssessmentForm.tsx`               | 6     | createSelfAssessment from @/app/(dashboard)/ops/projects/actions. 소비자: CollapsibleDirectInput(ops)                                                                                                                                                                                                                                   |
| `src/components/ops/UserManagementTable.tsx`              | 6     | updateUserStatus from @/app/(auth)/actions. 소비자: ops/users/page.tsx (단일) → ops/users/\_components 이동 후보                                                                                                                                                                                                                        |
| `src/components/ops/assignment/RecommendationResults.tsx` | 6     | assignConsultant from @/app/(dashboard)/ops/projects/actions. 소비자: AssignmentTabSection + ops/assignment/index.ts 배럴                                                                                                                                                                                                               |
| `eslint.config.mjs`                                       | 5-21  | import 경계 규칙 부재(no-restricted-imports/boundaries 없음). 이것이 drift를 무방비로 누적시킨 근본 원인 — 정리 후 회귀 방지 규칙 추가 지점                                                                                                                                                                                             |

**왜 문제인가**

의존성 방향이 역전돼(저수준 lib·공용 components가 고수준 app 라우트를 import) 응집도·재사용성·테스트 격리가 깨진다. (1) lib/utils의 범용 유틸이 특정 라우트(ops/notices)에 묶여 다른 컨텍스트에서 재사용 불가하고, 라우트가 이동·삭제되면 lib가 깨진다. (2) src/components는 '공용'이라는 위치 신호와 달리 실제로는 특정 피처 라우트에 강결합돼 있어, 어떤 게 진짜 공용인지 식별이 불가능하고 영향 범위 파악이 어렵다. (3) ESLint 경계 규칙이 없어 새 코드가 계속 같은 역참조를 추가해 drift가 무한 누적된다(현재 비테스트 22개 파일). gallery actions를 roadmap 라우트에서, ops/notices actions를 일반 notices 라우트에서 호출하는 등 피처 경계 교차도 섞여 있어 단순 이동만으로 끝나지 않는 케이스가 존재한다.

**접근법**

1. [단계 0: 안전망] 변경 전 npm run validate && npm run build로 베이스라인 그린 확인. 본 항목은 코드 '이동'이라 vitest가 import 깨짐을 즉시 잡는 안전망. AssignmentForm.tsx는 비테스트 소비자 0개이므로 본 작업 전 knip으로 dead 여부 확정 후 별도 처리(이동 대상에서 제외).
2. [단계 1: lib→app 역참조 1건 해소(최우선·저위험)] src/lib/utils/upload-notice-attachment.ts를 ops/notices 피처 영역으로 이동. 두 가지 선택지: (A) src/app/(dashboard)/ops/notices/\_components/ 또는 notices 피처 lib 폴더로 파일 이동 — 단 소비자가 NoticeForm·AttachmentUploader(둘 다 src/components/notices) 라서, 이상적으로는 이 컴포넌트들도 함께 ops/notices/\_components로 이동(단계 4와 묶음). (B) 최소 변경: 파일을 src/app/(dashboard)/ops/notices/upload-notice-attachment.ts로 이동하고 NoticeForm.tsx:20·AttachmentUploader.tsx:13의 import 경로만 갱신. 동반 테스트 upload-notice-attachment.test.ts도 함께 이동. 이동 후 lib/에서 @/app/ grep 결과 0건 확인.
3. [단계 2: 회귀 방지 가드(저위험·고효과)] eslint.config.mjs에 no-restricted-imports zone 규칙 추가: src/lib/** 파일이 @/app/\* 를 import하면 error. (단계 3 완료 후) src/components/** 도 동일 규칙 확대. 이것이 근본 원인(경계 미강제) 해결. 기존 test 파일(@/app mock 24건)은 files 오버라이드로 예외 처리.
4. [단계 3: 타입-only 역참조 분리 추출(중위험·중간 효과)] type-only import(GalleryCard.tsx:15 GalleryRoadmapItem, AdminFilters.tsx:17 ConsultantOption, UseRoadmapDialog.tsx:12 EligibleProject, ManualAssignmentForm.tsx:8 ConsultantCandidate)는 해당 타입을 src/types/ 또는 피처 공용 types.ts로 추출하고 actions.ts가 재-export하게 하면, 컴포넌트는 타입만 의존하므로 역참조 일부를 저비용 해소. value import만 남겨 다음 단계 범위 축소.
5. [단계 4: 단일-라우트 전용 컴포넌트를 _components로 이동(피처별 배치 처리)] 소비자가 단일 라우트인 것부터 이동: PublicSelfAssessmentForm→assessment/[token]/\_components, DeleteAccountSection→dashboard/settings/\_components, AdminFilters·GalleryCard·UseRoadmapDialog→gallery 해당 \_components, NoticeForm·AttachmentList·AttachmentUploader→ops/notices/\_components(+notices/[id]/\_components 다운로드 분리), AssessmentTokenSection→ops/projects/[id]/\_components, UserManagementTable→ops/users/\_components. 각 이동마다 page/소비자 import 경로 + 동반 \*.test.tsx 위치·import 갱신. 이동은 git mv로 히스토리 보존. 피처 1개씩 PR 분리 권장.
6. [단계 5: 다중-라우트 공유 컴포넌트 처리(고난도·신중)] Navigation·MessageIcon·NotificationBell(셸, layout.tsx 공유), ProfileForm·ProfilePageClient(2개 라우트), ShareToggle/LikeButton(gallery↔roadmap 교차)은 src/components에 남기되 역참조를 의존성 역전으로 해소: 컴포넌트가 action을 직접 import하지 않고 prop(onAction 콜백) 또는 서버에서 주입받게 시그니처 변경(이 경우 category가 '버그수정' 경계에 근접하므로 동작 불변 검증 강화 필요). 또는 호출 대상 action들을 src/lib/actions 또는 src/app 외 공용 위치로 끌어내림(action 자체의 'use server'·세션 의존성 때문에 라우트 밖 이동 시 별도 검토). 이 단계는 가장 위험하므로 단계 1~4 안정화 후 별도 설계.

**재사용할 기존 자산**

- 기존 \_components/ 규약: CLAUDE.md '라우트 디렉터리 규칙'의 \_components/(라우트 내부 전용 컴포넌트). 이미 22개 라우트에 \_components/ 존재(예: src/app/(dashboard)/ops/notices/\_components/, gallery/[id]/\_components/) — 이동 대상지 그대로 재사용
- src/lib/types/action-result.ts의 ActionResult<T> — upload util 이동 후에도 그대로 사용(피처 무관 공용 타입은 lib에 정상 잔류)
- src/app/(auth)/actions/index.ts 배럴 — (auth)/actions 소비처 경로는 디렉터리 배럴이므로 이동 시 import 갱신 불필요(대상은 컴포넌트 쪽 이동)
- eslint.config.mjs의 files 오버라이드 패턴(이미 e2e용 존재) — test 파일 @/app mock 예외 처리에 동일 패턴 재사용
- npm run knip — AssignmentForm.tsx dead 여부 사전 확정 도구(이미 도입됨, #120)

**동작 변화** — 없음 — 동작 불변. 단계 1~4는 파일 위치·import 경로 변경만으로 런타임 동작·번들 결과·라우팅에 영향 없음(컴포넌트 식별자·props·action 시그니처 불변). 단, 단계 5에서 '의존성 역전(action을 prop으로 주입)'을 택하면 컴포넌트 시그니처가 바뀌므로 그 부분만 별도 항목으로 분리해 동작 불변을 회귀 테스트로 보증해야 함(본 항목 범위에서는 단계 4까지를 순수정리로 한정).

**검증** — 각 이동 직후 npm run validate(typecheck가 깨진 import 경로를 즉시 검출 — 가장 강력한 안전망) + npm run build. 컴포넌트별 동반 \*.test.tsx(예: NoticeForm.test.tsx, UserManagementTable.test.tsx 등 — 거의 모든 대상에 코로케이션 테스트 존재)가 이동 후에도 통과하면 동작 불변 증명. 추가로 lib·components에서 '@/app/' grep 0건(단계별 목표치) 확인. CLAUDE.md 그렙 규칙대로 src/+e2e/ 전수 grep으로 옛 경로 잔존 점검. UI 플로우(공지 첨부 업로드, 배정, 갤러리 좋아요/공유)는 E2E(npm run test:e2e)로 통합 흐름 확인. 신규 테스트는 불필요(이동만), 단 ESLint 경계 규칙 추가 시 위반 케이스가 잡히는지 1회 수동 확인.

**리스크**

- 범위가 큼(비테스트 22개 + 테스트 24개 = 46개 파일 영향). 한 PR에 몰면 리뷰·충돌 위험 — 반드시 단계/피처별 분할(단계1 lib 1건 → 단계2 ESLint → 단계3 타입 → 단계4 피처별)
- 다중-라우트 공유 컴포넌트(Navigation·ProfileForm·ProfilePageClient·ShareToggle·LikeButton·AttachmentList)는 단일 \_components로 이동 불가 — 무리한 이동 시 다른 라우트가 라우트 내부 디렉터리를 역참조하는 새 역전을 만든다. 이들은 공유 잔류 + 의존성 역전(단계5)로만 해결
- action 자체를 라우트 밖으로 끌어내리는 선택지는 'use server' 파일의 위치·세션 의존성 때문에 단순 이동이 어렵고 동작 변경 위험 — 본 항목에서는 컴포넌트 이동을 우선
- AssignmentForm.tsx는 소비자 0개로 dead 의심 — 이동 대상에 넣지 말고 knip 확정 후 삭제(별도 정리 항목). 착오로 이동하면 무의미한 작업
- git mv 없이 신규 파일 작성+삭제로 처리하면 히스토리·blame 단절. 반드시 git mv 사용
- ESLint 경계 규칙을 정리 완료 전에 components까지 한 번에 켜면 다수 error로 빌드 차단 — lib는 단계1 직후, components는 단계4 완료 후 단계적으로 활성화

**의존성** — 독립(타 감사 항목과 무관). 단, 본 항목 내부에는 강한 순서 의존이 있음: 단계1(lib 역참조 제거) → 단계2(ESLint lib 가드) → 단계3(타입 추출) → 단계4(피처별 컴포넌트 이동) → 단계5(공유 컴포넌트 의존성 역전, 별도 설계). AssignmentForm dead 판정(knip)은 이동 작업 착수 전 선행 권장. 단계3의 타입 추출은 단계4 컴포넌트 이동 전에 하면 이동 후 import 정리가 단순해짐.

---

## B. 잠재 버그 수정 (동작 변경 의도 — 착수 전 승인 권장)

### 5. 매칭 LLM 경로가 쿼터(checkAndRecordLLMUsage) 미적용 — route.ts 429 분기는 도달 불가 죽은 코드

- **분류:** 버그수정(동작 변경 의도) · **심각도:** 보통 · **노력:** 낮음 · **ID:** `P5-matching-quota`

**요약** — LLM 매칭 경로(generateLLMMatchingRecommendations)는 로드맵·인터뷰 가이드 경로와 달리 checkAndRecordLLMUsage를 호출하지 않아 LLM 호출이 사용량/쿼터에 전혀 집계되지 않는다. 그 결과 route.ts의 429 "사용량 한도" 분기는 프로덕션에서 절대 도달하지 못하는 죽은 코드다(단위 테스트는 mock 거부로만 통과).

**위치 (현재 main 기준 확인)**

| 파일                                                      | 라인    | 메모                                                                                                                                                                                                                                                                                 |
| --------------------------------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/lib/services/matching/matching-llm.ts`               | 28-52   | generateLLMMatchingRecommendations 본문. line 43에서 callLLMForJSON 호출 직전에 쿼터 확인 없음. 파일 전체(193줄)에 quota/checkAndRecord/usage 참조 0건(grep으로 matching 서비스 디렉터리 전수 NONE 확인). actorUserId는 인자로 이미 받고 있어(line 30) 쿼터 호출에 그대로 사용 가능. |
| `src/app/api/matching/generate/route.ts`                  | 62-77   | catch 블록의 429 분기. line 64 message.includes('사용량 한도') 등으로 매칭하지만, 매칭 서비스가 그 메시지를 던지지 않으므로 프로덕션 도달 불가. line 73 code:'QUOTA_EXCEEDED', line 75 status:429 + Retry-After:3600.                                                                |
| `src/lib/services/roadmap/roadmap-generator.ts`           | 261-265 | 참조 패턴(정답). checkAndRecordLLMUsage(actorUserId) 호출 후 quotaCheck.exceeded 시 throw new Error(quotaCheck.message \|\| '사용량 한도를 초과했습니다.'). 이 throw 메시지가 route 429 분기 문자열과 일치하는 계약. line 547·583에도 동일 패턴 반복.                                |
| `src/app/(dashboard)/consultant/projects/[id]/actions.ts` | 290-294 | Server Action 변형 참조 패턴. 쿼터 초과 시 throw 대신 ActionResult { success:false, error } 반환. 매칭은 API Route라 throw 방식(roadmap-generator)이 적합.                                                                                                                           |
| `src/lib/services/llm.ts`                                 | 204-215 | callLLMForJSON/callLLM 은 쿼터를 기록하지 않음 — 쿼터는 호출자 책임임을 확인(roadmap·interview-guide 모두 호출 전 별도로 checkAndRecordLLMUsage 수행). 따라서 매칭도 호출자가 직접 걸어야 함.                                                                                        |
| `src/lib/services/quota.ts`                               | 132-162 | checkAndRecordLLMUsage(userId, tokensIn=0, tokensOut=0) 시그니처. RPC check_and_increment_llm_usage 로 원자적 확인+증가. 반환 { exceeded, reason?: 'daily'\|'monthly', message? }. 매칭은 tokensIn/Out 미지정 호출로 충분(로드맵도 인자 없이 호출).                                  |
| `src/app/api/matching/generate/route.test.ts`             | 222-241 | 429 분기 테스트가 generateLLMMatchingRecommendations 를 mock 으로 '일별 사용량 한도를 초과했습니다.' 거부시켜 통과 — 실제 서비스가 그 메시지를 던진다는 보장이 전혀 없는 거짓 안전망(분기 도달 불가를 가림).                                                                         |
| `src/app/api/matching/generate/route.ts`                  | 23-32   | 남용 표면 평가용. 호출 권한은 isOpsManager 로 운영관리자 전용(OPS_ADMIN/SYSTEM_ADMIN). 외부 노출 아님.                                                                                                                                                                               |
| `src/components/ops/assignment/useAssignmentMatching.ts`  | 63-69   | 유일한 UI 호출처 — 운영관리 배정 화면에서 /api/matching/generate POST. 내부 관리자 전용 트리거.                                                                                                                                                                                      |

**왜 문제인가**

LLM 호출 쿼터·사용량 추적이 경로별로 비일관적이다. 로드맵 생성(roadmap-generator.ts:262)과 인터뷰 가이드(actions.ts:291)는 호출 전 checkAndRecordLLMUsage 로 쿼터를 강제하지만, 매칭 경로만 누락되어 매칭 LLM 호출은 usage_metrics.llm_calls 에 집계되지 않는다. 결과 두 가지 문제: (1) 운영관리 사용량 통계(fetchAllUsersUsage)·과금/한도 관리에서 매칭 호출이 통째로 누락되어 실제 LLM 비용과 표시값이 어긋난다. (2) route.ts:62-77 의 429 분기는 매칭 서비스가 '사용량 한도' 메시지를 던지지 못하므로 절대 실행되지 않는 죽은 코드인데, 단위 테스트가 mock 거부로 이를 통과시켜 결함을 가린다. 운영자 전용이라 외부 남용 위험은 낮지만, 동시 다발 재계산(preserveStatus 재호출 포함)으로 한도 우회·비용 미집계가 가능하다.

**접근법**

1. 접근법 ① (권장 — 매칭에 쿼터 적용): matching-llm.ts 상단에 import { checkAndRecordLLMUsage } from '../quota'; 추가. generateLLMMatchingRecommendations 본문에서 supabase 클라이언트 생성(line 34) 직후, callLLMForJSON 호출(line 43) 이전에 다음을 삽입: const quotaCheck = await checkAndRecordLLMUsage(actorUserId); if (quotaCheck.exceeded) throw new Error(quotaCheck.message || '사용량 한도를 초과했습니다.'); — roadmap-generator.ts:262-265 와 동일 패턴·동일 메시지 문자열을 그대로 재사용해 route.ts:64 의 includes('사용량 한도') 매칭이 실제로 작동하게 만든다.
2. 데이터 조회(fetchMatchingData, line 37) 전에 쿼터를 걸어, 한도 초과 시 불필요한 DB 조회·프롬프트 구성도 절약(로드맵도 조회 전 line 262 에서 먼저 검사하는 순서와 일치).
3. preserveStatus(재계산) 경로도 같은 함수를 통과하므로 자동으로 쿼터가 적용된다 — 별도 분기 처리 불필요. 재계산이 빈번하다면 쿼터 정책상 의도된 동작인지만 1줄 확인(현재 로드맵 revision 도 동일하게 매번 쿼터 차감하므로 일관).
4. 접근법 ② (대안 — 죽은 분기 제거): 매칭에 쿼터를 적용하지 않기로 결정할 경우, route.ts:62-77 의 429 블록을 삭제하고 route.test.ts:222-241 테스트도 제거 + '매칭은 의도적으로 쿼터 미적용(운영자 전용)'을 명시하는 주석 추가. 단, 사용량 미집계로 인한 비용 추적 부정확은 그대로 남으므로 권장하지 않음.
5. 접근법 ① 채택 시 route.ts 의 catch/분기는 수정 불필요(이미 메시지를 받을 준비가 되어 있음) — 서비스 쪽만 메시지를 던지면 분기가 살아난다.

**재사용할 기존 자산**

- checkAndRecordLLMUsage — src/lib/services/quota.ts:132 (시그니처: (userId, tokensIn?, tokensOut?) => Promise<{exceeded, reason?, message?}>)
- 쿼터 throw 패턴(메시지 문자열 포함) — src/lib/services/roadmap/roadmap-generator.ts:262-265 그대로 복제
- 에러 메시지 매칭 분기(429) — src/app/api/matching/generate/route.ts:62-77 (수정 불필요, 그대로 활용)
- actorUserId — generateLLMMatchingRecommendations 가 이미 인자로 받음(matching-llm.ts:30), 추가 조회 없이 사용

**동작 변화** — 접근법 ① 적용 시: 운영관리자의 일별/월별 LLM 호출 한도가 매칭 실행에도 적용된다. 한도 초과 상태에서 매칭(또는 재계산)을 누르면 더 이상 LLM 이 호출되지 않고, route 가 429 QUOTA_EXCEEDED + Retry-After:3600 을 반환하며 UI(useAssignmentMatching.ts:73-74)는 result.error 메시지("오늘 사용 한도를 초과했습니다. 한국 시간 자정에 초기화됩니다.")를 노출한다. 또한 정상 실행 시 매칭 LLM 호출이 usage_metrics.llm_calls 에 +1 집계되어(이전엔 0집계) 사용량 통계·잔여 한도 표시가 매칭 분만큼 증가한다. 즉 '한도 초과 시 매칭 차단' + '매칭 호출이 사용량에 반영'되는 두 가지 동작 변화가 발생한다.

**검증** — 기존 안전망: src/lib/services/matching/matching-llm.test.ts(generateLLMMatchingRecommendations 다수 케이스)와 route.test.ts:222-241(429 분기). 단, route.test.ts 의 429 테스트는 mock 거부라 서비스 변경 후에도 그대로 통과 — 가짜 안전망이므로 신뢰 금지. 신규 테스트 필요: (1) matching-llm.test.ts 에 checkAndRecordLLMUsage 를 vi.mock 하여 ① exceeded:false 일 때 callLLMForJSON 이 호출되고 정상 진행, ② exceeded:true 일 때 throw 되고 callLLMForJSON 이 호출되지 않으며(쿼터 차단이 LLM 호출 앞이라는 순서 보장) 던진 메시지가 '사용량 한도'를 포함하는지 검증(roadmap-generator.test.ts:352-360 의 exceeded:true 테스트가 그대로 참고 모델). (2) 통합 관점: route 가 실제 서비스 throw('사용량 한도')를 받아 429 로 변환되는 계약을 보장하려면 matching-llm 의 throw 메시지 문자열이 route.ts:64 의 includes 키워드와 일치하는지 단언. 검증 절차: npm run validate(typecheck+lint+test) → npm run build. E2E 는 LLM 실호출이라 쿼터 경로는 단위/통합으로 커버.

**리스크**

- 쿼터 차단 위치를 데이터 조회 이후로 잘못 넣으면(예: fetchMatchingData 뒤) '불필요 조회 절약' 효과가 사라지고, 로드맵 경로와 순서가 어긋난다 — 반드시 callLLMForJSON 이전, 가능하면 데이터 조회 이전에 배치.
- preserveStatus 재계산이 매번 쿼터를 차감하므로, 운영자가 결과 미세조정을 위해 재계산을 반복하면 한도가 빨리 소진될 수 있다 — 이는 로드맵 revision 과 동일한 기존 정책이므로 일관되나, 한도(기본 daily 50)가 낮으면 운영 불편 가능성. 정책상 의도 확인 권장.
- route.test.ts:222 의 기존 429 테스트는 변경 후에도 통과하지만 실제 분기 도달을 증명하지 못함 — 신규 matching-llm 단위 테스트로 '서비스가 실제로 그 메시지를 던진다'를 별도 보장하지 않으면 회귀 방지 공백이 남는다.
- 동시 매칭 요청 시 check_and_increment_llm_usage RPC 가 원자적이므로 한도 우회는 방지되나, 매칭 함수가 쿼터 통과 후 LLM 호출 실패 시 사용량은 이미 +1 된 상태(로드맵과 동일한 기존 트레이드오프) — 동작 변경 아님, 참고.

**의존성** — 독립. 단, 같은 route.ts 의 다른 catch 분기(타임아웃 504·context 413)를 건드리는 항목이 있다면 route.ts 편집 충돌 가능 — 본 항목은 서비스(matching-llm.ts) 위주 수정이라 충돌 표면 작음.

---

### 6. 생성 성공 후 projects.status 전이 update 에러를 조용히 삼켜 상태 데시싱크 발생 (3곳)

- **분류:** 버그수정(동작 변경 의도) · **심각도:** 높음 · **노력:** 보통 · **ID:** `P6-status-desync`

**요약** — 로드맵 생성·매칭 추천·PBL 생성 세 경로에서 `projects.status` 전이 update가 await만 되고 반환 error를 전혀 확인하지 않아, update가 실패해도 함수는 그대로 success를 반환한다. 그 결과 산출물(로드맵/추천/PBL)은 저장됐는데 프로젝트 상태가 이전 단계에 머무는 silent desync가 발생하며, 운영 화면·다음 단계 가드가 어긋난다.

**위치 (현재 main 기준 확인)**

| 파일                                                          | 라인    | 메모                                                                                                                                                                                                                                                                                                                                |
| ------------------------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/services/roadmap/roadmap-generator.ts`               | 386-392 | generateRoadmap 내부. `if (validateStatusTransition(projectData.status, 'ROADMAP_DRAFTED')) { await supabase.from('projects').update({ status: 'ROADMAP_DRAFTED' }).eq('id', projectId); }` — 반환 객체를 destructure하지 않아 error 미확인. 직후 감사로그/알림 후 라인 418-422에서 `{ roadmapId, result, validation }`(성공) 반환. |
| `src/lib/services/matching/matching-helpers.ts`               | 200-202 | updateProjectStatusIfNeeded 내부. `if (project?.status && validateStatusTransition(project.status, 'MATCH_RECOMMENDED')) { await supabase.from('projects').update({ status: 'MATCH_RECOMMENDED' }).eq('id', projectId); }` — error 미확인. 함수는 void 반환이며 호출부(matching 서비스)는 추천 저장을 success로 종료.               |
| `src/app/(dashboard)/consultant/projects/[id]/pbl/actions.ts` | 356-359 | generatePBLAction 내부(try 블록). `if (validateStatusTransition(project.status, 'PBL_DRAFTED')) { await adminSupabase.from('projects').update({ status: 'PBL_DRAFTED' }).eq('id', projectId); }` — error 미확인. 직후 감사로그·activity 로그·revalidatePath 후 라인 385에서 `{ success: true, data: { pblId } }` 반환.              |

**왜 문제인가**

세 곳 모두 동일 패턴: `.update({ status })`.eq('id', ...)를 await하지만 Supabase가 돌려주는 `{ error }`를 전혀 destructure/검사하지 않는다. RLS 거부·네트워크 오류·일시적 DB 오류로 update가 실패해도 예외가 throw되지 않고(쿼리 빌더는 error를 객체로 반환), 호출 함수는 산출물 저장 성공 응답(roadmapId / void / { success:true })을 그대로 반환한다. 결과적으로 (1) 로드맵 버전/매칭 추천/PBL DRAFT는 DB에 생성됐는데 (2) projects.status는 이전 단계(INTERVIEWED·DIAGNOSED 등)에 멈춘다. 이 desync는 운영관리 프로젝트 목록의 상태 뱃지, 다음 단계 진입 가드(PBL_ELIGIBLE_STATUSES, FINALIZE 가능 여부 등), 알림 흐름을 어긋나게 하며, 로그조차 없어 원인 추적이 불가능하다. 같은 파일들이 다른 update(예: persistRoadmapSummaryToInterview 라인 228-238, saveRecommendations 라인 182-187, editPBLV2 라인 961-971)에서는 error를 검사하거나 console.warn/error를 남기는 것과 대비되어 일관성도 깨져 있다.

**접근법**

1. 세 update를 동일하게 처리한다 — 최소 변경(권장 1차): 각 호출을 `const { error } = await supabase.from('projects').update({ status }).eq('id', projectId);` 형태로 바꾸고, error가 있으면 `console.error('[<함수명>] status 전이 실패(<from>→<to>):', error.message)`로 로깅한다. 사용자 응답 자체는 유지(산출물은 이미 저장됐으므로 throw로 전부 롤백하지 않음) — 즉 '조용히 넘어감'에서 '관측 가능한 신호'로만 승격.
2. roadmap-generator.ts(386-392): update 결과를 destructure해 error 로깅 추가. 반환값 {roadmapId,...}은 그대로 유지.
3. matching-helpers.ts(200-202): updateProjectStatusIfNeeded가 void라 호출부에 신호가 전달 안 됨. error 로깅을 추가하고, 가능하면 함수 시그니처를 `Promise<{ statusUpdated: boolean; error?: string }>`로 좁혀 호출부(매칭 서비스)가 desync를 인지하게 한다(2차 개선, 호출부 grep 후 결정).
4. pbl/actions.ts(356-359): try 블록 내 update 결과 destructure + console.error 로깅. 반환 {success:true, data:{pblId}} 유지(보고서는 이미 생성됨).
5. 2차(견고화, 선택): 산출물 insert와 status 전이를 단일 Postgres RPC/함수로 묶어 원자성 확보. 단 admin.ts의 createClient에는 별도 rpc 헬퍼가 없고 세 경로 모두 현재 rpc 미사용이므로(.rpc 호출 0건 확인) 별도 마이그레이션 작업이 되어 effort 상승 — 1차(로깅)로 신호부터 확보 후 분리 PR 권장.
6. 구현 전 grep: `updateProjectStatusIfNeeded` 사용처(현재 matching 서비스 1곳 + 테스트), `generatePBLAction` 호출부(createPBLV2 라인 837-842 위임), `generateRoadmap` 호출부를 전수 확인해 시그니처 변경 시 파급 범위 점검.

**재사용할 기존 자산**

- validateStatusTransition — src/lib/constants/status.ts:292 (가드는 이미 호출 중, 변경 불필요)
- ALLOWED_STATUS_TRANSITIONS — src/lib/constants/status.ts:273 (전이 규칙 단일 출처)
- 동일 파일 내 기존 error 로깅 선례 재사용: persistRoadmapSummaryToInterview의 console.warn 패턴(roadmap-generator.ts:233-238), saveRecommendations의 throw 패턴(matching-helpers.ts:184-186), editPBLV2 update error 로깅(pbl/actions.ts:968-971)
- createAdminClient — src/lib/supabase/admin.ts:5 (RPC 분리안 채택 시 .rpc 호출에 사용; 현재 rpc 헬퍼 래퍼는 없음)

**동작 변화** — 현재: status 전이 update가 실패해도 예외·로그 없이 함수가 성공 응답을 반환 → 산출물은 저장됐는데 projects.status가 이전 단계에 머무는 silent desync. 변경 후(1차): update 결과의 error를 검사해 console.error로 로깅(원인·from→to 포함). 사용자에게 돌려주는 응답(roadmapId / void / {success:true})은 의도적으로 유지 — 산출물은 이미 커밋됐으므로 전체 throw/롤백은 하지 않고, 운영자·로그 관점에서 '관측 가능'해지는 것이 핵심 변화. (2차 채택 시 updateProjectStatusIfNeeded 반환 타입이 void→{statusUpdated,error?}로 바뀌어 호출부가 desync를 인지·표시할 수 있게 됨.)

**검증** — 안전망 기존 테스트: roadmap-generator.test.ts(325-343, it.each로 INTERVIEWED/ROADMAP_DRAFTED→update 호출·FINALIZED→미호출 검증)와 matching-helpers.test.ts(382-454, updateProjectStatusIfNeeded 전이 가능/불가 분기)와 pbl/actions.test.ts(generatePBLAction 경로)가 '호출 여부'는 커버하나 update가 error를 반환하는 케이스는 전무 → 리팩터 시 회귀는 잡히지 않으므로 신규 테스트 필수. 신규 TDD: (1) update가 `{error:{message}}`를 반환하도록 mock하고 console.error 스파이가 호출되는지 + 함수가 여전히 성공 응답을 반환하는지 검증(세 경로 각 1건). 기존 mock 인프라 재사용 가능 — roadmap test의 updateFn(라인 246), matching test의 createSequentialSupabase update step(라인 98-99 updateEq mockResolvedValue에 error 주입), pbl test의 serverMock. (2) `npm run validate`(typecheck+lint+test)로 시그니처 변경 시 호출부 타입 깨짐 확인, `npm run build` 통과. status 전이는 순수 DB 부수효과라 E2E 필수는 아님(단위로 충분).

**리스크**

- updateProjectStatusIfNeeded 반환 타입을 void→객체로 바꾸면(2차) 호출부 시그니처가 깨질 수 있음 — 변경 전 사용처 grep 필수. 1차(로깅만)는 시그니처 불변이라 무위험.
- 1차 안에서 응답을 그대로 유지하기로 한 결정은 '산출물 저장 성공 + 상태 누락'이라는 부분 성공을 사용자에게 숨기는 트레이드오프 — 로깅만으로는 사용자 화면에 desync가 드러나지 않음(운영자 재동기화 수단/배지는 별도 항목으로 분리 검토).
- throw로 승격(전체 실패 처리)하면 이미 저장된 로드맵/PBL/추천이 고아 상태로 남아 오히려 혼란 — 그래서 throw가 아닌 로깅을 택함. 원자성이 필요하면 RPC 분리(2차)로만 해결해야 함.
- 세 곳을 공통 헬퍼로 추출하고 싶을 수 있으나 supabase 클라(server vs admin)·테이블 컨텍스트가 동일해 추출 이득은 작고, 호출부 mock 구조가 제각각이라 과도한 추상화는 테스트 비용↑ — 인라인 로깅 권장.

**의존성** — 독립 — P1(역할 상수)·P3(canAccessProjectArtifact)·P2(mockup)와 무관. 단, 2차 RPC/트랜잭션 분리안을 채택할 경우 supabase 마이그레이션 작업(DB 함수 작성+적용)이 선행돼야 하며 CLAUDE.md의 '마이그 원자적 적용' 규칙을 따라야 함. 1차 로깅 개선은 코드만으로 완결.

---

## 비고

- 이 문서는 감사 시점 스냅샷 기반 설계다. 각 항목 착수 시 현재 코드를 다시 읽고 file:line·접근법을 갱신할 것.
- 관련 메모리: `project_code_quality_knip.md`(요약본). 감사 전체 등급·강점은 거기 기록됨.
- 완료 항목은 이 문서 상태를 `완료(PR #N)`로 갱신.

---

## 부록: 2차 적대 검증 정정·보강 (착수 전 필독)

> 위 본문은 1차 조사로 작성됐고, 아래는 **독립 2차 적대 검증(7에이전트)**이 현재 코드로 대조해 찾은 정정·보강이다. **본문과 아래가 충돌하면 아래(2차)를 따른다.** 특히 P4의 동작-등가 단서는 누락 시 "순수정리"가 버그가 되므로 필수.

### 교차(전 항목 공통) — 정정/보강 필요

- **⚠️ 동작 보존 단서:** P4(가장 위험): 권장안 PBLTrainingEnvSchema.parse({...current,...patch}) 는 '키 부재' 케이스에서만 현행 ?? 와 등가다. patch.trainingEnv 가 어떤 키를 explicit undefined 로 담으면 spread 가 current 값을 덮은 뒤 .default() 가 하드코딩 기본값으로 리셋해 '기존 값 보존'(현행) → '기본값 리셋'(신규) 으로 동작이 바뀐다. patch 가 null 을 담으면 z.string() parse 가 throw 해 DRAFT 중간저장이 깨질 수 있다(현행 ?? 는 null 을 흘려 보존). 기존 안전망(actions-v2.test.ts 310-345/348-381)은 키 부재만 검증하므로 이 발산을 잡지 못해 '순수정리'가 조용히 동작변경이 될 수 있다. 또한 mapDbToPBLInterview 가 pass-through라 current.trainingEnv 에 레거시/손상 enum(aiInfraDetail.toolCapacity 등)이 있으면 parse 가 throw(현행도 후속 L1110 partial safeParse 에서 실패하나 반환 에러 메시지가 'PBL 편집 데이터가 올바르지 않습니다'→catch 'PBL 편집 중 오류가 발생했습니다' 로 달라짐). | P8: persistInterview 추출 시 roadmap V2 는 단일 row+upsert, pbl V2 는 update/insert 분기로 골격 구조가 미세하게 다르고 interview_date 주입 지점도 다르다(L948 vs L1147). 추출이 이 구조 차이·audit action 분기(roadmap CREATE/UPDATE vs pbl 고정)·selectCols·매퍼를 파라미터로 정확히 보존하지 못하면 감사로그 의미/insert 경로가 바뀐다. | P7 단계5(action을 prop 주입): 컴포넌트 시그니처 변경=동작변경 경계로 계획서도 인지함(분리 권장). P9 는 문서만 수정이라 런타임 behavior_risk 없음. P5·P6 는 의도된 동작변경(분류 정확).
- **사실 정정:**
  - 파일 경로가 부정확. 계획서는 ops/projects/crud.ts·dashboard.ts 로 읽히지만 실제 경로는 src/app/(dashboard)/ops/projects/actions/crud.ts 와 .../actions/dashboard.ts (actions/ 하위 디렉터리). ops/projects/ 직하에는 해당 파일이 없음. 라인번호(crud.ts:33, dashboard.ts:17)는 정확.
    - → **정정:** 콜사이트 경로를 src/app/(dashboard)/ops/projects/actions/crud.ts:33 · .../actions/dashboard.ts:17 로 정정. 'ops/projects/actions' 는 index.ts 배럴 디렉터리임을 명시.
  - 경계 설명 주석 라인이 약간 어긋남(실제 L139-141 영역). canAccessProjectArtifact 정의 자체는 L143 으로 정확.
    - → **정정:** 경계 주석 인용을 auth-helpers.ts:139-141(track·상태는 호출부 별도 검사) 로 정정. (저영향)
  - 심볼-파일 귀속 오류. NoticeForm·AttachmentUploader 가 import 하는 것은 createUploadUrlAction/registerAttachmentAction 이 아니라 upload-notice-attachment.ts 의 유일 export 인 uploadNoticeAttachmentDirect. createUploadUrlAction/registerAttachmentAction 는 그 util 자체가 @/app/(dashboard)/ops/notices/actions 에서 import 하는 심볼(=lib→app 역참조의 실주체). 계획서가 두 계층을 혼동.
    - → **정정:** 'NoticeForm.tsx:20·AttachmentUploader.tsx:13 은 uploadNoticeAttachmentDirect 를 import 하며, lib→app 역참조의 주체는 upload-notice-attachment.ts:1-4 가 createUploadUrlAction/registerAttachmentAction 을 import 하는 부분' 으로 정정.
  - 문서 내부 수치 불일치. components→app 비테스트 파일은 실측 21개. '22' 는 components 21 + lib 1(upload util)=22(전체 비테스트 역참조)로 해석 가능하나 계획서가 두 의미를 혼용해 모호.
    - → **정정:** 'components 비테스트 21개 + lib 비테스트 1개 = 전체 22개' 로 정의를 명시해 일관화. '46개' 의 24개 테스트 수치도 grep 재확인 권장.
  - editPBLV2 update/insert error 로깅의 실제 위치는 L1126/L1136. 계획서 자체 위치표(L100)는 editPBLV2 를 861-1168 로 올바로 기재하므로 '961-971/968-971' 인용은 자기모순(stale).
    - → **정정:** editPBLV2 update error 로깅 선례를 pbl/actions.ts:1125-1128(update)·1135-1138(insert) 로 정정.
  - spread 와 현행 ?? 체인이 등가가 아닌 경계를 계획서가 누락. (1) patch 필드가 명시적 undefined 면 {...current,...patch} 가 current 값을 undefined 로 덮은 뒤 .default() 가 '하드코딩 기본값'으로 리셋 → 현행 ??는 current 값을 보존. (2) patch 필드가 null 이면 spread 가 current 를 null 로 덮고 z.string()이 throw → 현행 ??는 null 을 nullish 로 흘려 current 보존. 즉 'patch 가 explicit undefined/null 을 담는 경우' 동작이 달라짐. 기존 안전망(310-345 등)은 '키 부재' 케이스만 검증하므로 이 발산을 못 잡음.
    - → **정정:** P4 동작불변 주장에 'patch 가 키를 omit 한 경우에 한해 등가이며, explicit undefined/null 을 담으면 발산' 단서를 추가. mergeTrainingEnv 구현을 '키 부재=current 보존, 부재 키만 default 채움' 시맨틱으로 명시(예: current 기준으로 patch 의 undefined 값을 필터링한 뒤 parse, 또는 ?? 시맨틱을 보존하는 명시적 헬퍼). 발산 케이스 단위테스트 추가.
- **추가 리스크:**
  - P4: '동작 불변'의 안전망(기존 editPBLV2 테스트)이 explicit undefined/null patch 발산을 커버하지 못함 — 추출 전 '발산 케이스' 실패재현 테스트를 먼저 추가하지 않으면 silent regression 가능. converters.ts 에 value 스키마 import 추가 시 service 계층이 schema 를 런타임 의존하게 되어(현재는 type-only) 번들/순환 그래프 변동 가능(현재 cycle 부재이나 향후 schema→converters 역참조 추가 시 위험).
  - P8: persistInterview 헬퍼가 after() 클로저에서 캡처하던 statusTransitioned·auditAction·projectData·options.autoSave 를 콜백 파라미터로 옮길 때, insert vs update 분기 구조 차이(roadmap upsert-style row vs pbl 명시 update/insert)와 interview_date 주입 위치 차이를 한 골격에 흡수하면서 어느 한쪽의 insert 시 interviewer_id 주입 누락 등 미세 회귀 가능. zod join 일원화 시 신규 util 의 fallback 기본값이 반드시 '필수 입력 항목을 확인해주세요.' 와 1:1 일치해야 함(3곳 동일하므로 단일값으로 충분).
  - P7: ops/projects/actions 가 배럴 디렉터리(index.ts)라 컴포넌트들이 '@/app/(dashboard)/ops/projects/actions' 를 import — 단계4 컴포넌트 이동 시 배럴 경유 import 경로 갱신이 개별 파일 경로보다 까다로울 수 있음. AssignmentForm(dead) 처리 결과에 따라 동반 AssignmentForm.test.tsx(30+ render)도 함께 제거해야 lint/test 깨짐 방지. eslint no-restricted-imports zone 추가 시 24개 test mock(@/app) 예외 files 오버라이드를 빠뜨리면 다수 lint error 로 빌드 차단.
  - P6: matching-helpers.updateProjectStatusIfNeeded 를 void→{statusUpdated,error?} 로 좁히면(2차) 단일 호출처(matching-llm.ts:80)뿐 아니라 matching-helpers.test.ts(382-454) 의 기대 시그니처도 갱신 필요. console.error 로깅만 추가하는 1차는 무위험.
  - 전반: 계획서 자체가 L9·L391 에서 '착수 직전 라인 재확인' 을 명시하나, P6 의 선례 인용(961-971)·P9 의 경로(crud.ts:33) 처럼 일부 file:line 이 이미 stale/부정확하므로, 착수 시 '함수명 기준 grep → 라인 재바인딩' 을 규약 4에 명문화 필요.
- **보강(반영할 개선):**
  - 공통 실행 규약(L29-34)에 추가: 각 항목 착수 시 file:line 을 신뢰하지 말고 '심볼명 grep 으로 위치 재바인딩' 을 1단계로 명문화(이미 일부 라인이 stale: P6 961-971, P9 경로). + 'src+e2e grep' 외에 '배럴(index.ts) 경유 import 도 함께 grep' 안전장치 추가(P7 ops/projects/actions 배럴).
  - P4 접근법 1을 '동작 불변' 으로 유지하려면 PBLTrainingEnvSchema.parse({...current,...patch}) 를 그대로 쓰지 말고, patch 에서 값이 undefined/null 인 키를 제거한 뒤(=?? 시맨틱 보존) parse 하도록 mergeTrainingEnv 구현을 명시. 또는 deepMerge(현재 null 보존·undefined skip 시맨틱)와도 다르므로, '키 부재만 보존, nested 통째 교체' 라는 정확한 의미 계약을 헬퍼 docstring 에 고정. 발산 3케이스(키부재 / explicit undefined / explicit null) 단위테스트를 converters.test.ts 에 선작성.
  - P9 콜사이트 경로를 실제 경로(src/app/(dashboard)/ops/projects/actions/crud.ts:33, .../actions/dashboard.ts:17)로 정정하고, '20+ 콜사이트' 수치는 requireAuthWithRole(OPS_MANAGER_ROLES) grep 13개 파일 근거로 보정. SKILL.md 검증 기준에 'message.ts:76 같은 데이터맵 리터럴은 가드가 아니므로 grep 0건 대상에서 제외' 를 명시.
  - P7: upload util 소비자 설명을 'uploadNoticeAttachmentDirect 를 import' 로 정정하고, 역참조 주체를 upload-notice-attachment.ts:1-4 로 한정. '비테스트 21(components)+1(lib)=22' 정의를 단일화. AssignmentForm dead 처리(knip 확정→파일+테스트 동반 삭제)를 본 항목과 분리한 별도 정리 항목으로 명문화.
  - P8: persistInterview 시그니처에 'insertExtras(=interviewer_id 등)' 와 'buildRow(혹은 upsert vs update/insert 전략)' 를 명시적 파라미터로 두어 두 V2 의 구조 차이를 캡슐화. zod join 신규 util 의 fallback 기본값을 '필수 입력 항목을 확인해주세요.' 로 하드코딩 검증하는 단위테스트 추가.
  - P6: 1차(로깅) 와 2차(반환타입/ RPC 원자성) 를 PR 분리한다는 결정을 더 강하게 — 1차는 시그니처 불변 무위험, 2차(updateProjectStatusIfNeeded void→객체)는 matching-helpers.test.ts 기대 갱신을 동반함을 체크리스트화. 로깅 메시지에 from→to·projectId 포함을 통일된 헬퍼 없이 인라인으로(추상화 비용↑ 회피, 계획서 판단 타당).

### P9 스킬 갱신 — 정정/보강 필요

- **⚠️ 동작 보존 단서:** 없음 — 수정 대상이 .claude/skills/check-server-action/SKILL.md 단일 마크다운 문서뿐이고 실행 코드·import 그래프·테스트·런타임과 완전히 분리됨을 직접 확인. '순수정리(동작 불변)' 분류 정확. 단 '동작 변화'가 아닌 '문서 정확성' 차원에서, 위 factual_errors 2건(헬퍼 결과 검사 관용구 혼동, roadmap-export.ts 경로)을 그대로 반영하면 갱신된 스킬이 다시 코드와 미세 불일치하게 되어 P9 목적(doc-code fidelity)을 일부 미달한다.
- **사실 정정:**
  - requireConsultantProjectAccess 의 반환형은 `true | AuthFailure` 이지 `{projectId} | AuthFailure` 가 아니다. 실제 코드베이스 전 콜사이트(actions.ts:66, interview/actions.ts:56·457·540·585, roadmap/actions.ts:786, pbl/actions.ts:1215)는 예외 없이 `if (access !== true) return ...` 관용구를 쓴다. 계획서가 제안하는 doc 예시의 `if ('error' in access)` 는 TS 타입상 컴파일은 되지만 인용한 'actions.ts:66 형태'와 다른 형태다. `if ('error' in access)` 는 requireConsultantRoadmapAccess(반환 {projectId}|AuthFailure, roadmap/actions.ts:175·300·414)의 관용구다. P9 의 목적 자체가 '문서 예시를 실제 코드와 1:1 일치'시키는 것이므로, 두 헬퍼의 결과 검사 관용구를 뒤섞으면 갱신된 스킬이 또다시 코드와 불일치하게 된다.
    - → **정정:** 스킬 doc 예시에서 requireConsultantProjectAccess 는 `const access = await requireConsultantProjectAccess(supabase, user.id, projectId); if (access !== true) return { success:false, error: access.error };` (실제 actions.ts:66 / roadmap/actions.ts:786 형태)로, requireConsultantRoadmapAccess 만 `if ('error' in access) ... access.projectId` (roadmap/actions.ts:175 형태)로 구분해 기술할 것. 두 헬퍼의 반환형 차이(true|AuthFailure vs {projectId}|AuthFailure)와 그에 따른 검사 관용구 차이를 표/주석으로 명시.
  - roadmap-export.ts 의 실제 경로는 src/lib/actions/roadmap-export.ts(line 68 의 canAccessProjectArtifact 호출 정확)이며, src/lib/services/export/roadmap-export.ts 는 존재하지 않는다. 계획서가 파일명만 'roadmap-export.ts'로 적어 경로를 명시하지 않아, 착수자가 services/export 경로로 오인할 수 있다(다른 export 서비스 파일이 services/export 하위에 다수 존재).
    - → **정정:** 콜사이트를 'src/lib/actions/roadmap-export.ts:68' 풀 경로로 명시. (canAccessProjectArtifact import 도 동일 파일 L6 `from '@/lib/actions/auth-helpers'` 로 확인됨.)
- **추가 리스크:**
  - 스킬은 'use server' 파일 작성·리뷰 시 Claude/리뷰어의 기준 텍스트다. doc 예시 코드에 미세 오류(잘못된 결과 검사 관용구, 잘못된 import 경로)가 들어가면 그 오류가 후속 Server Action 코드에 그대로 복제·전파될 수 있어, 단순 '문서 오타'보다 영향이 크다. 예시 코드는 실제 콜사이트를 복사-검증한 뒤 박을 것.
  - 계획서 검증 절차가 '리터럴 grep 0건' + '시그니처 대조'까지만 규정하고, doc 예시 코드가 실제 콜사이트와 컴파일 가능한지(타입·관용구) 검증하는 단계가 없다. 예시를 실제 .ts 파일에 임시 붙여 typecheck 하거나, 최소한 인용한 콜사이트 라인을 그대로 발췌-대조하는 단계를 검증에 추가 권장.
  - isOpsManager 는 인자가 `UserRole`(non-null)이다(status.ts:32). 그러나 패턴 A 인라인 예시 'if (!currentUser || !isOpsManager(currentUser.role))'에서 currentUser.role 이 `UserRole | null` 일 수 있는 콜사이트(예: profile 조회 직후)에서는 null 가드가 선행돼야 타입이 통과한다. 실제 matching route:30 은 `if (!currentUser || !isOpsManager(currentUser.role))` 로 currentUser null 만 가드하고 role 은 non-null 타입이라 통과 — 예시에 이 전제(role 이 non-null로 좁혀진 상태)를 한 줄 명시하지 않으면 role:UserRole|null 컨텍스트에서 그대로 베끼는 리뷰어가 타입 에러를 만날 수 있다.
- **보강(반영할 개선):**
  - 접근법에 '헬퍼 결과 검사 관용구 표'를 명시적으로 추가: requireConsultantProjectAccess → 반환 `true | AuthFailure` → `if (access !== true) return ... access.error`; requireConsultantRoadmapAccess → 반환 `{ projectId } | AuthFailure` → `if ('error' in access) return ...` 이후 `access.projectId` 사용; requireAuthWithRole → 반환 `RoleSuccess | AuthFailure` → `if ('error' in auth) return ...`. 세 관용구가 다르다는 점을 단일 출처로 못박아 혼동 차단.
  - 콜사이트 인용을 모두 풀 경로로 통일(roadmap-export.ts → src/lib/actions/roadmap-export.ts:68). 다른 인용(crud.ts:33, dashboard.ts:17 도 ops/projects/actions/ 하위)도 디렉터리 경로를 붙여 착수자가 즉시 열 수 있게.
  - 검증 절차에 '예시 코드 컴파일 검증' 1단계 추가: 갱신한 doc 예시 스니펫을 실제 인용 콜사이트 라인과 글자 단위로 대조(또는 임시 .ts 에 붙여 typecheck)해 관용구·타입이 현재 코드와 동형임을 확정한 뒤 머지.
  - 패턴 A 인라인 isOpsManager 예시에 'currentUser.role 이 UserRole(non-null)로 좁혀진 분기 내부에서만 직접 호출하고, role 이 null 가능하면 먼저 가드(예: if (!role) return ...)' 라는 전제를 한 줄 주석으로 명시해, 잘못된 컨텍스트 복제로 인한 타입 에러를 예방.
  - verifyProjectAccess 구분 표기 시, 'interview/actions.ts:48 에 라우트-로컬 private 함수로 실재하며 내부적으로 requireAuthWithRole + requireConsultantProjectAccess 를 조합한다'는 정확한 출처(파일:라인·구성)를 한 줄로 적어, 리뷰어가 '존재하지 않는 가공 함수'로 오해하지 않도록 보강.

### P4 editPBLV2 — 정정/보강 필요

- **⚠️ 동작 보존 단서:** 접근법 1의 'PBLTrainingEnvSchema.parse({...current,...patch})'는 .safeParse가 아닌 .parse(throw)다. 현재 코드는 trainingEnv를 손수 16필드로 채운 뒤 하류 PBLInterviewSchema.partial().safeParse(1110)에서 검증 실패 시 'validation.error.errors[0]?.message'(구체적 한국어 메시지)를 반환한다. 제안대로 mergeTrainingEnv 내부에서 PBLTrainingEnvSchema.parse()를 쓰면, 검증 실패(예: 레거시 aiInfraDetail.pcCount 음수, 또는 patch에 null 값) 시 throw → editPBLV2 outer try/catch(1164) → 'PBL 편집 중 오류가 발생했습니다'(제네릭 메시지)로 바뀐다. 즉 '동작 불변'을 깨는 ERROR-PATH 분기: 동일 잘못된 입력에 대해 (이전) 구체 Zod 메시지 → (이후) 제네릭 catch 메시지. 또한 patch 필드값이 명시적 null이면 현재 '?? current'로 graceful fallback이지만, parse는 non-nullable 필드라 throw한다(다만 현 UI는 trainingEnv를 3개 string 필드 onSave로만 patch하므로 null/explicit-undefined는 실사용 경로에 없음 → 실제 회귀는 안 나지만 코드 의미상 동작 변화임). 완전 등가를 원하면 mergeTrainingEnv 내부를 .safeParse로 감싸 실패 시 기존과 동일하게 errors[0].message를 호출처로 전달하거나, parse 대신 현 per-field 보존 + 하류 safeParse 흐름을 유지해야 한다.
- **사실 정정:**
  - editPBLV2의 per-field '??'(nested 객체 통째교체)와 savePBLInterviewV2의 deepMerge(nested 객체 deep-merge)는 nested 객체 처리에서 '정확히 같은 의미'가 아니다. 더욱이 savePBLInterviewV2는 autoSave 경로(PBLInterviewAutoSaveSchema=passthrough, default 미적용)와 strict 경로(PBLInterviewStrictSchema, default 적용)에서 validated.trainingEnv 충전 상태가 달라 deepMerge 결과가 갈린다. 계획서가 같은 문서 안에서 '동일'(요약)과 '미묘하게 다름'(claim b·리스크)을 동시에 주장해 자기모순적이다. 실제 최종 권장안은 deepMerge 통일이 아니라 schema parse이므로, 요약/제목의 'deepMerge 채택/통일' 프레이밍이 권장안과 어긋난다.
    - → **정정:** 요약·제목에서 'deepMerge 채택/통일' 표현을 'savePBLInterviewV2와 의미는 유사하나 nested 처리가 달라 deepMerge가 아닌 schema parse로 일원화'로 수정. '정확히 같은 의미' → '평면 필드는 동일, nested 객체는 ?? (통째교체) vs deepMerge (deep-merge)로 의미가 달라 직접 deepMerge 채택 불가'로 정정.
  - trainingEnv 하위에는 이미 .min(0) 비-default 제약이 두 곳(pcCount: z.number().int().min(0).default(0) — 625줄, targetTraineeCount: z.number().int().min(0).default(0) — 633줄) 존재한다. '비-default 제약이 (미래에) 추가되면'이 아니라 이미 존재하나 default 값(0)이 제약을 통과하기 때문에 안전한 것이다. 더 중요하게는, 레거시 DB에 음수/비정수 pcCount가 저장돼 있을 경우 parse가 실제로 throw하는데, 이 case는 미래가 아니라 현재 발생 가능하다.
    - → **정정:** '현재 16필드 전부 .default()라 빈 입력에서 안전(이미 pcCount/targetTraineeCount에 .min(0)이 있으나 default(0)가 통과). 단 레거시 DB에 음수/비정수 등 제약 위반 값이 저장돼 있으면 parse가 throw'로 정정.
- **추가 리스크:**
  - 접근법 1의 PBLTrainingEnvSchema.parse() 도입으로 검증 실패 시 throw→제네릭 catch 메시지가 되어, 현재 하류 safeParse의 구체 메시지 반환과 다른 에러 경로가 된다(behavior_risk 참조). mergeTrainingEnv를 safeParse 기반으로 설계하고 실패를 호출처로 전파하도록 명시 필요.
  - 안전망(actions-v2.test.ts trainingEnv 310-345)이 current.trainingEnv에 6 base 필드만 채워진 케이스만 검증한다. Phase E 5필드(targetCharacteristics/aiInfraDetail/trainingNeedsAnalysis/expectationAsIs/expectationToBe)·누락 3필드(targetTraineeCount/internalInstructorUsage/internalInstructorPrimary/otherEquipment)가 current에 없을 때 schema default 주입 결과가 기존 하드코딩 fallback과 일치하는지 검증하는 테스트가 부재 — 이 갭 케이스가 정확히 '하드코딩 기본값 ↔ schema default' 등가성의 핵심 검증 지점이므로 converters.test.ts에 반드시 추가 필요(계획서 검증 ①이 이를 언급하나 '필수'로 격상하고 구체 케이스 명시 권장).
  - converters.ts의 현재 interview-pbl import는 'import type'(line 66)뿐이라, PBLTrainingEnvSchema 값 import 추가는 type-only→value import 전환이다. 빌드/번들에 schema 런타임 코드가 service 계층에 끌려 들어오므로(순환참조는 없으나) import 그래프가 실제로 바뀐다 — 계획서 리스크 4가 '낮음'으로만 표기하나 'type-only → value import 전환' 사실을 명시 권장.
- **보강(반영할 개선):**
  - 접근법 1을 'PBLTrainingEnvSchema.parse({...current,...patch})' 대신 'PBLTrainingEnvSchema.safeParse(...)' 기반으로 명시하고, 실패 시 기존 editPBLV2가 반환하던 것과 동일하게 result.error.errors[0]?.message를 호출처로 전파하도록 mergeTrainingEnv 시그니처를 ActionResult/throw가 아닌 명시 에러 반환형으로 설계할 것(에러-경로 동작 보존).
  - 또는 더 안전한 무동작변화 대안: trainingEnv 16필드 fallback을 그대로 두고 하류 PBLInterviewSchema.partial().safeParse(1110)에 모든 검증을 위임하는 현 흐름을 유지하되, 16필드 하드코딩 기본값만 PBLTrainingEnvSchema.parse(merged.trainingEnv)로 '한 번 더 통과시켜 default 채움'하는 방식은 피한다(이중 parse는 이미 1110에서 일어남). 핵심 중복(하드코딩 기본값 vs schema default)만 제거하려면 mergeTrainingEnv를 'spread 후 누락 키만 schema default로 보충'하는 순수함수로 만들고, 검증은 기존 하류 safeParse가 담당하게 분리.
  - converters.test.ts 추가 테스트에 (1) current가 6 base 필드만 보유 + Phase E/누락 8필드 부재 → 부분 patch 시 8필드가 schema default로 채워지고 기존 하드코딩 fallback과 동일 값인지, (2) current가 빈 객체({})일 때 16필드 전부 default 충전, (3) nested 객체(aiInfraDetail) whole-replace 의미 보존(patch가 aiInfraDetail 제공 시 통째 교체, 미제공 시 current 보존), (4) patch에 명시 undefined/null이 들어온 경우의 동작을 명시 케이스로 포함.
  - 요약·제목의 'deepMerge 채택/통일' 표현을 권장안(schema parse)과 일치하도록 수정해 자기모순 제거. savePBLInterviewV2와의 관계는 '평면 필드 의미는 동일, nested는 ?? vs deepMerge로 달라 deepMerge 직접 채택 불가 → schema parse로 중복만 제거'로 정확히 기술.
  - 리스크 142줄을 'pcCount/targetTraineeCount에 이미 .min(0)이 존재(default 0이 통과해 안전), 레거시 DB의 제약 위반 값이 있으면 parse가 현재도 하류 safeParse에서 실패하지만 메시지 경로가 달라짐'으로 사실 정정.

### P8 인터뷰 저장 중복+legacy — 정정/보강 필요

- **⚠️ 동작 보존 단서:** 실재한다. 계획 step 2가 'mapToDb(merged) + interview_date 기본값 주입 (d) upsert'를 단일 골격으로 기술하는데, 이를 Roadmap 방식(update/insert 양쪽에 interview_date 포함 row 사용)으로 일률 구현하면 PBL UPDATE 동작이 바뀐다. 시나리오: 컨설턴트가 기존 PBL 인터뷰를 자동저장/수정하면, 현행은 update(dbPayload={pbl_data})로 interview_date를 보존(원래 입력일 유지)하지만, 새 persistInterview가 통일 row를 쓰면 매 PBL 수정마다 interview_date가 오늘 날짜로 덮어써지고 interviewer_id·project_id도 재기록된다(interviewer_id는 동일인이라 무해하나 interview_date 변조는 데이터 의미 변경 = 동작 변경). 더 위험한 점은 기존 V2 테스트가 이를 못 잡는다는 것: PBL update 테스트(actions-v2.test.ts 665-702)는 pblData.\* 키만 단언하고 update 페이로드에 interview_date가 끼었는지 검증하지 않으며, roadmap update 테스트(350-411)도 company_details만 본다. 즉 '기존 테스트가 안전망'이라는 계획 전제가 이 특정 회귀에 대해서는 성립하지 않아, 동작 변경이 회귀 그물을 빠져나간다.
- **사실 정정:**
  - '뿐(only)'이 틀렸다. 두 함수의 UPDATE 페이로드 구조 자체가 비대칭이다. Roadmap V2는 update(row)에 row={project_id, interviewer_id, interview_date: 오늘, ...dbPayload}를 통째로 써서 매 update마다 interview_date를 오늘로 덮어쓰고 interviewer_id·project_id도 재기록한다(945-958). PBL V2는 update(dbPayload)로 dbPayload={pbl_data}만 쓰므로 interview_date/interviewer_id/project_id를 건드리지 않는다(1132-1136). 이 차이는 mapRoadmapInterviewToDb가 interview_date를 반환하지 않기(298-331) 때문에 더 본질적이다. 또 활동로그도 비대칭: Roadmap은 CREATE/UPDATE에 따라 '저장/수정' 문구 분기(1005-1009), PBL은 'PBL 인터뷰가 저장되었습니다.' 고정(1188-1192).
    - → **정정:** 차이 목록에 '② UPDATE 페이로드 형태: Roadmap=full row(interview_date 오늘 덮어쓰기+interviewer_id+project_id 재기록), PBL=pbl_data 단독(이들 컬럼 미터치)' 와 '③ 활동로그 문구: Roadmap=create/update 분기, PBL=고정' 을 추가하고 '뿐'을 삭제. persistInterview는 update/insert에 같은 row를 쓰지 말고 track별로 update 페이로드(interview_date 주입 여부 포함)를 파라미터화해야 함.
  - P8 legacy 제거 후에도 같은 파일의 knip 플래그가 0이 되지 않는다. 현재 knip은 이 파일에서 fetchPBLInterview(618) 외에 uploadHrdReportAttachment(316)·removeHrdReportAttachment(378)·createHrdReportSignedUrl(568) 3개를 추가로 unused export로 플래그한다(P8 범위 밖). 'knip 플래그 소거 확인'을 파일 전체 0건으로 오해하면 검증이 실패로 보일 수 있다.
    - → **정정:** 검증 문구를 'knip의 fetchPBLInterview(618:23) 1개 플래그가 사라지는지'로 한정. 단 uploadHrdReportAttachment/removeHrdReportAttachment/createHrdReportSignedUrl 3개는 별개 미사용 export로 남으며 P8 범위 밖임을 명시.
  - 187-198은 legacy V1 saveRoadmapInterview 내부 블록인데, step 4에서 saveRoadmapInterview(159-286) 자체를 통째 삭제한다. 삭제될 함수의 zod 블록을 신규 유틸로 치환하는 것은 무의미한 작업이며 step1↔step4 내부 모순.
    - → **정정:** step 1의 치환 대상을 살아남는 V2 2곳(905-916, 1098-1109)으로 한정. 187-198은 step 4의 legacy 제거로 함께 사라지므로 치환 불필요라고 명시(순서: legacy 제거 먼저면 치환 대상 자동 2곳).
- **추가 리스크:**
  - persistInterview의 update 경로를 'interview_date를 항상 주입'으로 만들면 PBL은 보존되던 interview_date가 오늘로 갱신됨(데이터 의미 변경). 반대로 'update 시 interview_date 미주입'으로 통일하면 이번엔 Roadmap UPDATE의 현행 동작(매 update마다 interview_date=오늘 덮어쓰기)이 사라져 Roadmap 쪽이 동작 변경됨. 둘 다 회귀 — 현행 비대칭을 그대로 보존하려면 update 페이로드의 interview_date 주입 여부를 track별 파라미터로 분리해야 함(예: roadmapWritesDateOnUpdate=true / pbl=false). 추출 전 이 비대칭을 핀하는 테스트(roadmap update 페이로드에 interview_date 포함·pbl update 페이로드에 interview_date 부재)를 먼저 추가해야 안전망이 성립함
  - 활동로그 문구가 Roadmap은 create/update 분기('인터뷰가 저장/수정되었습니다.'), PBL은 고정('PBL 인터뷰가 저장되었습니다.')으로 다름. 헬퍼가 logContent를 콜백/파라미터로 분리하지 않고 공통 분기로 통일하면 PBL이 수정 시에도 '저장' 고정문구를 유지해야 하는 현행과 어긋나거나 반대로 Roadmap이 고정문구로 바뀜. 활동로그 문구 단언 테스트가 actions-v2.test.ts에 없으면 이 변화도 미검출
  - Roadmap update는 row에 project_id·interviewer_id를 매번 재기록하는데(.update(row)), 통일 헬퍼가 PBL에도 이를 적용하면 PBL update 페이로드에 project_id/interviewer_id가 새로 끼어 RLS/트리거(updated 컬럼 등) 부작용 가능성. 현행 PBL update는 pbl_data만 보내므로 행동 면적이 최소임 — 이 최소성을 깨지 않도록 update 페이로드 구성을 track별로 분리 필요
  - Roadmap V2 audit meta는 {track,schema_version,auto_save}이고 legacy V1 audit meta는 {track,task_items_count,training_targets_count}로 키 집합이 다름(261-271 vs 992-1002). 계획은 legacy 제거라 무관하나, 만약 persistInterview를 V1까지 흡수하려 하면 meta 키 불일치로 감사로그 의미 변경. 다행히 계획은 V1을 제거(흡수 아님)하므로 이 리스크는 회피되나, 추출 헬퍼가 audit meta 전체를 콜백으로 주입받아야 함(부분 머지 금지)을 명시 권장
  - save*V2가 wrapper(submit*V2)를 거치지 않고 autosave 경로에서 직접 호출됨(RoadmapInterviewClient 228·257, PBLInterviewClient 216·242). 계획의 'submit*/fetch* wrapper는 그대로'는 맞지만 save*V2 시그니처(projectId, data, options?) 자체를 보존해야 함 — persistInterview로 슬림화하더라도 export된 save*V2의 인자/반환은 불변이어야 클라 호출이 안 깨짐. 이를 리스크/제약으로 명시 권장
- **보강(반영할 개선):**
  - 접근법 step 2의 'mapToDb(merged) + interview_date 기본값 주입'을 'INSERT 시에만 interview_date 주입, UPDATE 시 interview_date 포함 여부는 track 옵션(roadmapWritesDateOnUpdate)으로 분기'로 명확화. 현행: Roadmap update=interview_date 오늘 덮어쓰기 / PBL update=미터치. 이 비대칭을 그대로 보존하도록 persistInterview의 update 페이로드를 track별 콜백으로 구성
  - 리팩터 착수 전 '특성화 테스트(characterization test)'를 먼저 추가: (a) roadmap UPDATE 시 update 페이로드에 interview_date(오늘)·interviewer_id·project_id가 포함됨을 단언 (b) pbl UPDATE 시 update 페이로드가 {pbl_data}만이고 interview_date/interviewer_id/project_id가 부재함을 단언 (c) roadmap 활동로그가 create='저장'/update='수정' 분기, pbl이 고정 'PBL 인터뷰가 저장되었습니다.'임을 단언. 이 3개가 현재 actions-v2.test.ts에 없으므로 안전망에 구멍이 있음 — 추출 전 RED→GREEN 으로 핀 고정
  - step 1의 zod-join 치환 대상을 V2 2곳(905·1098)으로 명시. 187-198은 legacy 제거(step 4)로 자동 소멸하므로 치환 대상에서 제외. 내부 순서를 'legacy 제거(step 4) → 그 결과 남은 V2 2곳에 신규 join 유틸 적용(step 1)'로 재배열하면 무의미 작업 제거
  - 검증 문구를 'knip의 fetchPBLInterview(618:23) 플래그 1건 소거 확인'으로 한정하고, 같은 파일에 잔존하는 uploadHrdReportAttachment(316)·removeHrdReportAttachment(378)·createHrdReportSignedUrl(568) 3개 미사용 export는 P8 범위 밖(별도 처리)임을 주석으로 명기 — 'knip 0건'을 통과 조건으로 오해하지 않도록
  - persistInterview 시그니처에 명시 파라미터 추가 권장: updateIncludesAuditMeta·activityLogContent(create/update를 받는 함수 또는 고정문자열)·auditAction(고정 'PBL_INTERVIEW_SAVED' | (existing)=>'INTERVIEW_CREATE'|'UPDATE')·notify({title,message})·selectCols·updateRow(merged,base)·insertRow(merged,base). 이렇게 update/insert 페이로드 빌더를 track별 콜백으로 주입하면 interview_date 비대칭·활동로그 분기·audit 분기를 모두 동작 불변으로 캡슐화 가능
  - save*V2의 public 시그니처(projectId, data, options?: {autoSave?}) 와 반환 SimpleActionResult 를 불변으로 유지해야 함을 제약으로 명시 — autosave 경로에서 클라가 save*V2를 wrapper 없이 직접 호출하므로(RoadmapInterviewClient 228·257, PBLInterviewClient 216·242) 시그니처 변경 시 호출부 깨짐

### P7 계층 역전 — 정정/보강 필요

- **⚠️ 동작 보존 단서:** 단계 1~4는 검증 결과 동작 불변이 맞다(파일 이동 + import 경로 갱신만, 사이드이펙트·번들·라우팅·alias 영향 0 확인). 그러나 두 가지 미묘한 함정: (1) 단계 1 옵션 B는 upload util을 src/app/(dashboard)/ops/notices/로 옮기되 소비자(NoticeForm·AttachmentUploader)는 src/components/notices에 잔류시키므로, lib→app 역참조를 components→app 역참조로 '이동'만 시킬 뿐 역전 자체를 해소하지 못한다. 이 상태로 단계 2의 ESLint src/lib/\*\* 가드를 켜면 lib는 깨끗해지지만 새로 생긴 components→app 참조가 단계 4까지 잔존 — '해결'이 아니라 문제 위치 이전. 옵션 A(컴포넌트 동반 이동)를 권장으로 명시해야 동작 불변+역전 해소가 동시 성립. (2) 단계 5의 '의존성 역전(action을 prop으로 주입)'은 컴포넌트 시그니처(props)를 바꾸므로 명백한 동작 변경 — 계획서가 이를 line 267에서 '단계 4까지만 순수정리'로 스스로 격리한 것은 정확. 단 셸 컴포넌트(Navigation/MessageIcon/NotificationBell)는 옵션 A·B 어느 쪽으로도 단일 \_components 이동이 불가하므로(layout.tsx 공유) 단계 4에서 '동작 불변'으로 처리 가능한 대상이 아님 — 결국 단계 5(동작 변경 위험 구간)로 넘어가는 항목이 다수라, '순수정리로 끝나는 비율'이 계획서 인상보다 작다(22개 중 셸 3 + 다중라우트 ProfileForm/ProfilePageClient 2 + 교차 ShareToggle/LikeButton/AttachmentList 3 = 최소 8개가 단계 4 범위 밖)
- **사실 정정:**
  - '24건'은 lib+components 스코프 한정 수치이며 계획서가 이를 명시하지 않아 오해 소지. 전체 src 기준 @/app 참조 테스트는 32개(src/app 내 테스트 포함). 또한 24건 중 src/lib/actions/auth-order-verification.test.ts는 vi.mock가 아닌 동적 await import('@/app...') 12건을 사용 — no-restricted-imports(정적 import 대상) 규칙이 잡지 못하므로 'mock 예외 처리' 프레이밍이 부정확
    - → **정정:** 'lib+components 테스트 24개(components 22 + lib 2)'로 스코프 명시. ESLint files 오버라이드는 src/lib/**·src/components/** 테스트 파일을 모두 포함해야 함(src/lib/actions 포함). auth-order-verification.test.ts의 동적 import는 no-restricted-imports로는 안 잡히므로 별도 인지(가드 누수 아님, 정리 대상도 아님)
  - 라인 범위 부정확. eslint.config.mjs의 rules 블록은 8-18, e2e files 오버라이드는 19-25, 전체 설정 배열은 5-43. '5-21'은 규칙 영역을 정확히 가리키지 못함(경미)
    - → **정정:** rules 블록 8-18 / e2e 오버라이드 19-25 / 회귀 가드 추가 지점은 rules 블록(8-18) 또는 새 zone 오브젝트로 명시
- **추가 리스크:**
  - 옵션 B 채택 시 lib→app가 components→app로 자리만 옮겨 ESLint lib 가드 통과해도 실질 역전 미해소 — '핵심 사례 1건 해결'이라는 성과 서술이 과장될 수 있음. 옵션 A를 디폴트로 못박아야 함
  - 단계 4에서 components→_components 이동 시 동반 \*.test.tsx의 상대 import(예: import X from './X')와 vi.mock 경로(@/app/... 절대경로는 불변)를 함께 갱신해야 함. 절대경로 mock은 안 깨지지만 컴포넌트 자체의 상대 import(예: './LikeButton')는 \_components 내부 구조에 따라 갱신 필요 — git mv 후 typecheck가 잡지만 PR당 변경량이 계획서 추정보다 큼
  - RecommendationResults는 ops/assignment/index.ts 배럴 + AssignmentTabSection 두 곳에서 쓰여 단일 \_components 이동 대상이 아님(계획서 표는 단일라우트군에 안 넣었으나 단계 4 '단일' 분류에서 명시 제외 필요)
  - auth-order-verification.test.ts의 동적 await import('@/app...')는 lib 내부 역참조처럼 보이지만 테스트 검증용이라 정리 대상 아님 — ESLint 가드 작성 시 이 파일의 동적 import를 '위반으로 오탐'하지 않도록 files 오버라이드에 반드시 포함(정적 import만 막으면 자동 통과하지만 인지 필요)
  - PublicSelfAssessmentForm은 assessment/[token]/\_components 이동 후보지만, 이 컴포넌트가 src/components/assessment에 다른 비역참조 형제와 함께 있을 경우 디렉터리 분해로 응집도가 오히려 흩어질 수 있음 — 형제 컴포넌트 동시 점검 필요
- **보강(반영할 개선):**
  - 단계 1을 '옵션 A(util + NoticeForm + AttachmentUploader를 함께 ops/notices/\_components로 이동)'를 기본으로 채택하도록 명시. 옵션 B는 'lib 가드를 임시로 켜기 위한 중간 단계'로만 허용하고, 같은 PR 또는 직후 PR에서 컴포넌트 동반 이동으로 components→app 신규 역전을 제거한다는 후속 조건을 못박을 것
  - ESLint files 오버라이드 글롭을 'src/lib/**/\*.test.{ts,tsx}'와 'src/components/**/\*.test.{ts,tsx}' 둘 다로 명시하고, src/lib/actions/auth-order-verification.test.ts(동적 import 12건)가 no-restricted-imports 정적 규칙으로는 애초에 안 걸린다는 점을 주석으로 기록 — '24건 mock 예외'가 정적 import 대상만임을 분명히
  - '24건' 앞에 '(lib+components 스코프)' 한정자 추가. 전체 src 기준 32건과 구분. 리스크 섹션의 '46개' 분해도 '비테스트 22 + lib·components 테스트 24'로 스코프 표기
  - 단계 4의 '단일-라우트 전용' 목록에서 RecommendationResults를 명시 제외(배럴+AssignmentTabSection 다중 소비). 단계 4 대상은 AssessmentTokenSection·UserManagementTable·PublicSelfAssessmentForm·DeleteAccountSection·AdminFilters·UseRoadmapDialog로 한정 — 각 1라우트임을 검증 완료했으므로 표에 '소비자 단일 확인필' 칼럼 추가
  - 단계 4 각 이동 시 '컴포넌트의 상대 import(형제 컴포넌트 경로)도 갱신 필요(vi.mock @/app 절대경로는 불변)'를 검증 체크리스트에 추가. typecheck가 안전망이나 PR당 diff 규모를 미리 명시
  - eslint.config.mjs 라인 참조를 'rules 블록 8-18 / e2e files 오버라이드 19-25'로 정정
  - '순수정리로 끝나는 비율'을 명확히: 22개 중 단계 4(순수 이동)로 완결 가능한 것은 단일라우트 6~7개뿐이고, 셸 3 + 다중라우트 2 + 피처교차 3(≈8개)은 단계 5(동작 변경 위험)로 이월됨을 요약에 명시 — '대부분 순수정리'라는 인상 보정

### P5 매칭 쿼터 — 정정/보강 필요

- **⚠️ 동작 보존 단서:** 없음 — 이 항목은 의도적 버그수정(P5)이라 동작 변경이 설계상 정당하며, 계획서가 '동작 변화' 단락에서 두 변화(한도 초과 시 매칭/재계산 차단 + 매칭 호출이 usage_metrics.llm_calls에 +1 집계)를 정확히 명시함. 코드 대조 결과 (a)매칭 쿼터 미적용, (b)429 분기 도달불가 죽은코드, (c)버그수정 분류 모두 사실로 확인됨. 접근법 ①의 삽입 위치(supabase client 직후·callLLMForJSON 이전·가능하면 fetchMatchingData 이전)는 roadmap-generator.ts:262 순서와 일치하며 의도치 않은 추가 동작 변화는 없음. 단 '의도된 동작 변화'의 부수효과로, 한도 초과 운영자가 재계산을 시도하면 LLM 호출 전 차단되어 기존 추천이 보존되는데(executeMatching이 error 분기로 router.refresh 미실행) 이는 정상적인 차단 UX임"
- **추가 리스크:**
  - [가장 큰 누락] 기존 테스트 회귀: matching-llm.ts에 checkAndRecordLLMUsage import를 추가하면, matching-llm.test.ts의 기존 ~20개 테스트에서 '../quota'가 모킹돼 있지 않아 실제 checkAndRecordLLMUsage(quota.ts:132)가 실행됨. 이 함수는 createAdminClient()(테스트에서 {} 반환)의 .rpc()를 호출하는데 {}에는 rpc 메서드가 없어 'supabase.rpc is not a function' TypeError가 throw되고, generateLLMMatchingRecommendations에 try/catch가 없어 전파 → 기존 전체 스위트가 RED가 됨. 계획서 검증 단락은 'matching-llm.test.ts에 checkAndRecordLLMUsage를 vi.mock하여 신규 테스트'라고만 적어 신규 테스트 추가로 프레이밍했을 뿐, vi.mock('../quota')가 '기존 테스트 GREEN 유지를 위한 필수 선행조건'임을 명시하지 않음. TDD RED→GREEN 절차상 이 모킹을 먼저 추가하지 않으면 코드 한 줄 넣자마자 무관한 20개 테스트가 깨져 원인 추적에 시간 낭비
  - 접근법 ① 채택해도 route.test.ts:222의 429 테스트는 @/lib/services/matching를 통째로 모킹하므로 '서비스가 실제로 그 메시지를 던지는지'를 영원히 검증 못 함. 계획서가 이를 '가짜 안전망'으로 지적은 했으나, route 레벨 통합 보장을 위해 route.test.ts에서 모듈 모킹을 풀고 실제 서비스+quota만 모킹하는 대안은 제시 안 함(신규 matching-llm 단위 테스트로 우회). 회귀 방지엔 충분하나 route↔service 계약 자동검증 공백은 남음을 명시 권장
  - 쿼터 차단 후 createAuditLog(MATCHING_EXECUTE, line 84-97)가 실행되지 않음 — 정상이지만, 한도 초과로 매칭이 차단된 시도는 감사로그/사용량에 '시도' 흔적이 남지 않음(checkAndRecordLLMUsage는 exceeded여도 RPC가 증가시키지 않으므로 usage_metrics +1도 안 됨). 운영 추적상 '차단된 매칭 시도' 가시성이 0인 점은 기존 로드맵 경로와 동일한 정책이나 참고 필요
- **보강(반영할 개선):**
  - 검증 단락에 다음 문구 추가: '구현 1단계로 matching-llm.test.ts 상단에 vi.mock("../quota", () => ({ checkAndRecordLLMUsage: vi.fn().mockResolvedValue({ exceeded: false }) })) 를 먼저 추가하고 import 후 beforeEach에서 vi.mocked(checkAndRecordLLMUsage).mockResolvedValue({exceeded:false}) 기본값 설정 — 이는 신규 테스트가 아니라 기존 ~20개 테스트의 GREEN 유지를 위한 필수 선행 모킹임(미적용 시 supabase.rpc is not a function 으로 전체 스위트 RED).'
  - 접근법 ① 코드 삽입 위치를 더 명확히: 권장은 fetchMatchingData(line 37) '이전'(로드맵 line 262 순서 일치)이지만, 계획서 접근법 1번은 'supabase 클라이언트 생성(line 34) 직후'라 표현하고 2번에서 'fetchMatchingData 전'을 권고 — 1번 문장을 '// 1. 데이터 조회 직전(line 36 주석 위)에 쿼터 검사 삽입'으로 단일화해 모호성 제거 권장
  - 신규 단위 테스트의 메시지 단언을 route.ts:63-67의 4개 키워드 중 하나(예: '사용량 한도')와 정확히 일치시키도록 명시 — quotaCheck.message가 DB RPC에서 오는 동적 문자열이라 빈 값일 수 있으므로, 던지는 메시지는 반드시 fallback '사용량 한도를 초과했습니다.'(roadmap-generator.ts:264와 동일)를 포함해야 429 분기가 보장됨을 테스트로 고정
  - 접근법 ②(죽은 분기 제거)를 만약 선택할 경우의 영향범위를 한 줄 보강: route.ts:62-77 삭제 시 route.test.ts:222-241 외에도 동일 catch의 후속 분기(504/413/500)는 유지되어야 하며, 분기 삭제가 다른 에러 매칭 순서에 영향 없는지 grep 확인 권장(현재 429가 첫 분기라 제거해도 후속 분기 동작 불변)

### P6 상태 데시싱크 — 정정/보강 필요

- **⚠️ 동작 보존 단서:** P6 는 '버그수정(의도적 동작 변경)' 분류라 동작 변화 0 기준 대상이 아님. 다만 1차안이 '의도한 변화(로그 신호 추가)' 이상으로 동작을 바꿀 위험 2가지: (1) 계획서 3-4단계가 matching 의 updateProjectStatusIfNeeded 를 void→{statusUpdated,error?} 로 좁히는 2차 개선을 1차에 섞으면, 호출부 matching-llm.ts:80 은 반환값을 안 쓰므로 무해하나 matching-helpers.test.ts 의 6개 기존 테스트가 반환 타입 기대를 안 하므로 깨지진 않음 — 그러나 만약 호출부에서 error 시 throw/응답변경까지 가면 '추천은 저장됐는데 매칭 전체 실패' 라는 새 동작이 생겨 1차 범위(응답 유지)를 위반. 반드시 1차는 시그니처 불변·로깅만으로 한정. (2) console.error 메시지에 from→to·projectId 를 넣되 PII/민감정보(company_name 등)는 넣지 않도록 — 현재 선례(persistRoadmapSummaryToInterview)는 error.message 만 로깅하므로 그 수준 유지 필요.
- **사실 정정:**
  - editPBLV2(961-971)는 1차 권장안과 같은 '로깅만'이 아니라 console.error 후 `return { success: false, error: 'PBL 운영계획 저장에 실패했습니다.' }` 로 사용자 응답까지 실패로 바꾼다. 이를 '로깅 선례'로 인용하면 1차안(응답 유지)과 정책이 다른데도 동일 선례처럼 오인할 소지. 실제로 같은 파일이 '에러 시 응답을 실패로 돌리는' 또 다른 정책을 이미 쓰고 있음을 명시해야 일관성 판단이 정확해진다.
    - → **정정:** editPBLV2:968-971 은 '로깅+실패응답 반환' 패턴(로깅 전용 아님)임을 명기. 1차안이 '응답 유지(로깅만)'를 택한 근거(산출물 이미 커밋 vs editPBLV2 는 본 update 가 산출물 자체 저장이라 실패 시 롤백 의미가 있음)를 구분 서술.
  - 사실 자체는 정확하나, matching 의 경우 status update 가 `!preserveStatus` 일 때만 실행된다(matching-llm.ts:79). preserveStatus(재계산) 경로에서는 status 전이 자체가 스킵되므로 P6 desync 가 발생하지 않는다는 점이 표·왜문제 섹션에 누락. 3곳이 '항상 전이'가 아니라 matching 만 조건부(재계산 시 미전이)라는 차이가 분류·테스트 설계에 영향.
    - → **정정:** matching 경로는 `preserveStatus=false`(최초 매칭)에서만 status 전이가 일어나며 재계산(preserveStatus=true)은 의도적으로 전이를 건너뛴다는 사실을 명기. 신규 error 테스트도 preserveStatus=false 컨텍스트에서 작성해야 함을 추가.
- **추가 리스크:**
  - preserveStatus=true(재계산) 경로는 status 전이 자체를 건너뛰므로(matching-llm.ts:79) matching 의 desync 노출 면적이 로드맵/PBL 보다 작다 — 계획서가 3곳을 동질로 다루나 matching 만 조건부임을 테스트·범위에 반영 안 하면 '재계산 시 로그 안 남는 게 정상'을 회귀로 오인할 수 있음
  - 1차 로깅만으로는 운영자/사용자 화면에 desync 가 전혀 드러나지 않는다(계획서도 risks 에 인정). 그러나 '높음' 심각도로 분류한 근거(다음 단계 가드·뱃지 어긋남)와 1차 해결의 실효성 사이 간극이 큼 — 로그는 사후 추적용일 뿐 실시간 desync 를 막지 못하므로, 최소한 Sentry/구조화 로깅이 없는 환경(현재 console.error 만)에서는 Vercel 함수 로그를 사람이 보지 않으면 사실상 무신호. '관측 가능'의 실제 도달 경로(누가 이 로그를 보는가)를 명시해야 가치 주장이 성립
  - 3곳의 status update 가 RLS 로 거부될 현실적 시나리오 점검 누락 — 세 경로 모두 createAdminClient(서비스 롤, RLS 우회)를 사용(roadmap-generator.ts:259, pbl adminSupabase, matching admin)하므로 'RLS 거부' 는 admin 경로에선 사실상 발생하지 않는다. 계획서 '왜 문제인가' 가 'RLS 거부·네트워크 오류·일시적 DB 오류' 를 동급으로 들지만 admin client 에선 RLS 거부 가능성이 낮아, 실제 트리거는 네트워크/일시 DB 오류·전이대상 행 부재로 좁혀짐. 위험 과대평가 교정 필요
  - 신규 error 테스트에서 console.error 스파이가 호출되는지 검증하려면 vi.spyOn(console,'error') 후 afterEach 복원 필요 — 기존 테스트들이 console 을 mock 하지 않으므로 전역 오염/다른 테스트의 실제 에러 로그를 삼키지 않도록 격리 범위 명시 권장
- **보강(반영할 개선):**
  - matching 항목 메모와 테스트 설계에 'preserveStatus=false 일 때만 전이 실행(matching-llm.ts:79)' 을 명시하고, 신규 error 테스트는 preserveStatus=false 컨텍스트로 작성한다고 못박기
  - 재사용 자산의 editPBLV2(968-971) 인용을 '로깅 선례' 가 아니라 '로깅+실패응답 반환 선례(본 update 가 산출물 저장이라 실패 시 응답을 바꾸는 게 맞는 케이스)' 로 정정하고, P6 1차안이 응답을 유지하는 이유(산출물은 이미 별도 커밋됨)를 대조 서술
  - '왜 문제인가' 의 'RLS 거부' 표현을 admin client(RLS 우회) 컨텍스트에 맞게 '네트워크/일시 DB 오류·전이대상 행 부재(eq 0행 매치)' 중심으로 교정 — admin 경로에서 RLS 거부는 비현실적
  - 1차 로깅의 실효 경로를 명시: console.error 가 Vercel Functions 로그로만 가고 알람이 없다면 사실상 사후 포렌식 용도임을 인정하고, 진짜 desync 방지는 2차(RPC 원자화) 또는 운영자 재동기화 UI(별도 항목)가 필요함을 우선순위로 분리. '높음 심각도'에 비해 1차 해결의 커버리지가 낮다는 점을 명문화
  - 신규 테스트에 vi.spyOn(console,'error') + mockRestore 격리를 명시하고, 3경로 각각 'update error 주입 시 ① console.error 호출 ② 함수는 기존 성공 응답 반환(roadmapId/scoredCandidates/{success:true}) 유지' 를 단언하도록 구체화
  - 착수 직전 그렙 재확인 대상에 'preserveStatus', 'updateProjectStatusIfNeeded' 외에 '.update({ status:' 패턴 전수 그렙을 추가해 3곳 외 동일 데시싱크 누락분(예: finalize·archive 경로)이 없는지 1회 점검 — 계획서가 3곳으로 한정했으나 동종 패턴 잔존 가능성 확인 권장
