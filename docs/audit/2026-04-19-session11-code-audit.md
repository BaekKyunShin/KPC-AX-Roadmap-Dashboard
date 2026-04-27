# OFA Step 12 — Session 1~10 코드 레벨 회귀 감사 리포트

- **작성일**: 2026-04-19
- **감사 범위**: `feature/official-form-alignment` 브랜치 전체 (Session 1~11 머지 완료)
- **방법**: 정적 분석 (Read/Grep/Glob) — 런타임 실행 없음
- **참고**: `docs/plans/archive/2026-04-14-official-form-alignment.md` + `docs/prompts/archive/session-*.md` 13개
- **결과 요약**: High 3, Medium 8, Low 7

---

## 1. Step별 성공 지표 대조표

| Step | 세션 | 주요 성공 지표 (요약) | 실제 위치 | 상태 |
|---|---|---|---|---|
| 1 | 01 | 메인 브랜치 생성, 계획서 커밋, hwpx-docgen 스킬 설치 | `docs/plans/archive/2026-04-14-official-form-alignment.md` · `.claude/skills/hwpx-docgen/` | 기록상 머지 완료 (확인 불가) |
| 2 | 02 | 마이그 060~064 + `tracks.ts` + `status.ts` PBL_DRAFTED | `supabase/migrations/060~064.sql`, `src/lib/constants/tracks.ts`, `src/lib/constants/status.ts` | OK (테스트 포함) |
| 3 | 03 | Vercel Python Functions + `api/hwpx/ping.py` + generate.py + `vercel.json` | `api/hwpx/generate.py`, `api/hwpx/ping.py`, `vercel.json` | OK (`X-HWPX-Secret` 검증 OK) |
| 4 | 04 | 공지 게시판 + Storage + RLS | `supabase/migrations/062`, `src/lib/services/notice.ts`, `src/app/(dashboard)/{ops/,}notices/` | OK + Low 이슈 1건 |
| 5 | 04 | 로드맵 인터뷰 산인공 양식 재설계 + `interview-roadmap.ts` + 4 스텝 | `src/lib/schemas/interview-roadmap.ts`, `src/app/(dashboard)/consultant/projects/[id]/interview/_components/roadmap/` | OK |
| 6 | 05 | 4섹션 UI(CompetencyModelingTable·RoadmapMatrix·AnnualTrainingPlanTable·CourseSpecCard) + PDF 4 renderer | `src/components/roadmap/`, `src/lib/services/export/pdf/pdf-{competency,structure,annual,coursespec}-renderer.ts` | OK (테스트 포함) |
| 6.5 | 05b | Ⅰ장 개요(StepOverview) + NcsMethodologyBox + 부제 라벨 + 수립 방법 | `src/components/roadmap/NcsMethodologyBox.tsx`, `roadmap/shared/`, `StepOverview.tsx` | OK |
| 7 | 06 | `roadmap.hwpx` 템플릿 + `_placeholders_roadmap.py` + `exportRoadmapAsHwpxAction` | `templates/hwpx/roadmap.hwpx`, `api/hwpx/_placeholders_roadmap.py`, `consultant/projects/[id]/roadmap/actions.ts` | OK |
| 8 | 07 | 9스텝 PBL 인터뷰 위저드 + `interview-pbl.ts` + `savePBLInterview` | `src/lib/schemas/interview-pbl.ts`, `interview/_components/pbl/`, `consultant/projects/[id]/interview/actions.ts` | OK |
| 9 | 08 | PBL 산출물 서비스 6파일 + UI 6컴포넌트 + PDF/XLSX PBL 빌더 | `src/lib/services/pbl/`, `src/components/pbl/`, `src/lib/services/export/pdf/pdf-pbl-*`, `xlsx-pbl-sheet-builder.ts` | ⚠ **PDF/XLSX 테스트 누락** |
| 10 | 09 | PBL HWPX 템플릿 + `_placeholders_pbl.py` + `exportPBLAsHwpxAction` | `templates/hwpx/pbl.hwpx`, `api/hwpx/_placeholders_pbl.py`, `consultant/projects/[id]/pbl/actions.ts` | OK |
| 11 | 10 | 갤러리 트랙 라벨·필터 + `test-pbl` + `GalleryPBLDetailContent` | `src/components/gallery/TrackFilter.tsx`, `test-pbl/`, `gallery/[id]/_components/GalleryPBLDetailContent.tsx` | OK |

---

## 2. High Priority 이슈 (즉시 수정 권장)

### H-1. 마이그 065 RLS 정책의 `auth.uid()` 래핑 누락 (성능)

- **파일**: `supabase/migrations/065_add_interview_attachments.sql:59, 77, 95, 113`
- **문제**: 마이그 048(`wrap_auth_uid_in_helper_functions`)이 정립한 **프로젝트 공식 패턴인 `(SELECT auth.uid())` 래핑**을 4개 정책 모두 위반. 이는 PostgreSQL initplan 최적화로 행당 반복 호출을 피하는 핵심 패턴. interview-attachments 버킷은 컨설턴트가 HRD이음 PDF를 첨부할 때마다 다수 행 SELECT 되는 대상이므로 실측 성능 저하 가능.

  ```sql
  -- 현재 (065 line 59):
  AND p.assigned_consultant_id = auth.uid()
  -- 권장:
  AND p.assigned_consultant_id = (SELECT auth.uid())
  ```

- **권장 수정**: 후속 마이그 `067_fix_interview_attachments_rls_initplan.sql`을 추가해 4개 정책을 DROP + CREATE로 재선언하면서 `(SELECT auth.uid())` 적용.

### H-2. `/gallery/actions/interactions.ts` 의 공유 토글에 감사로그 누락

- **파일**: `src/app/(dashboard)/gallery/actions/interactions.ts` (토글 4개 중 `toggleShare`·`togglePBLShare`)
- **문제**: 갤러리 카드의 공유 토글 경로에는 `createAuditLog` 호출이 **0건**. `audit_action` enum에는 `PBL_REPORT_SHARED`(마이그 061)가 추가되어 있고, 컨설턴트 상세 페이지의 `togglePBLShareAction`(pbl/actions.ts:464~475)은 감사로그를 기록하는데 갤러리 경로는 누락되어 있어 감사 추적 일관성 깨짐.
- **권장 수정**: `toggleShare` / `togglePBLShare`에 `createAuditLog({ action: 'ROADMAP_SHARED' | 'PBL_REPORT_SHARED', ... })` 추가. 필요 시 `audit_action` enum에 `ROADMAP_SHARED` 값도 추가 마이그 필요(현재 ENUM 확인 필요).

### H-3. PBL PDF/XLSX 빌더 테스트 전면 누락

- **파일**:
  - `src/lib/services/export/pdf/pdf-pbl-generator.ts`
  - `src/lib/services/export/pdf/pdf-pbl-overview-renderer.ts`
  - `src/lib/services/export/pdf/pdf-pbl-requirements-renderer.ts`
  - `src/lib/services/export/pdf/pdf-pbl-operation-renderer.ts`
  - `src/lib/services/export/pdf/pdf-pbl-performance-renderer.ts`
  - `src/lib/services/export/xlsx/xlsx-pbl-sheet-builder.ts`
- **문제**: Step 9 성공 지표에 "`generatePBLPDF`/`generatePBLXLSX` 신규 + 테스트 통과"가 명시되었으나 6개 PBL 관련 파일 모두 `.test.ts` 파일이 없음. 로드맵 측 `pdf-competency-renderer.test.ts` 등과 비교해 평행성 부재. 계획서 "Iron Law: Test-Driven Development" 위반.
- **권장 수정**: 각 renderer 파일마다 mock jsPDF + autoTable로 출력 문자열·autoTable call args 검증 테스트 추가. 최소 `pdf-pbl-generator`와 `xlsx-pbl-sheet-builder`는 end-to-end 출력 크기·sheet name 검증 수준이라도 필요.

---

## 3. Medium Priority 이슈

### M-1. `createHrdReportSignedUrl`의 배정 검증 부재

- **파일**: `src/app/(dashboard)/consultant/projects/[id]/interview/actions.ts:371-395`
- **문제**: 업로드(`uploadHrdReportAttachment`)·삭제(`removeHrdReportAttachment`)는 `verifyProjectAccess`(컨설턴트 배정 검증)를 호출하지만, 다운로드용 signed URL 발급은 `requireAuth()`만 호출. 즉 **로그인한 임의 사용자가 projectId/storagePath만 알면 1시간 유효 signed URL**을 발급받을 수 있음. `storagePath.startsWith(projectId/)` 검증은 경로 조작 방지일 뿐 배정 검증이 아님.
  - 완화 요인: 마이그 065 policy의 storage.objects RLS가 SELECT 권한 자체를 체크하지만, **admin client가 RLS를 우회**하므로 이 경로에서는 RLS 방어가 작동하지 않음.
- **권장 수정**: `createHrdReportSignedUrl`에도 `verifyProjectAccess(projectId)` 호출 추가. OPS/SYSTEM_ADMIN도 허용해야 한다면 `requireConsultantProjectAccess` 대신 roleBasedAccess 로 분기.

### M-2. `fetchPBLVersions` / `fetchRoadmapVersions` 등에서 role=null 시 빈 배열 반환 — 에러 메시지 손실

- **파일**:
  - `src/app/(dashboard)/consultant/projects/[id]/pbl/actions.ts:170-194` (`fetchPBLVersions`)
  - `src/app/(dashboard)/consultant/projects/[id]/roadmap/actions.ts:177-205`
- **문제**: `role === null`이면 `return []`, `'error' in auth`여도 `[]`. UI에서는 "데이터가 없습니다"로 표시되어 **세션 만료 vs 실제 권한 문제 vs 프로젝트 부재 구분 불가**. 사용자가 로그인이 끊겼는지 모르고 새로고침만 반복할 수 있음.
- **권장 수정**: 반환 타입을 `ActionResult<PBLReportRow[]>`로 변경하거나, 최소한 role null일 때 `console.warn` + 사용자에게 재로그인 안내 배너 노출.

### M-3. `projects.track` 필드 기본값 의존 — 런타임 값 검증 누락

- **파일**: `src/app/(dashboard)/ops/projects/actions/crud.ts:55` (`...(trackValue ? { track: trackValue } : {})`)
- **문제**: `formData.get('track')`이 빈 문자열이면 falsy → 생략 → 스키마 default 적용. 하지만 브라우저 경로가 아닌 CLI/curl 호출에서 `track="INVALID"`를 보내도 Zod가 잡아주긴 함. **그러나** `createProjectSchema`가 실제로 `z.enum(PROJECT_TRACKS)`를 갖고 있는지는 확인 필요(파일을 다 읽지 못함). 스키마에 track 필드가 없다면 `...validation.data`에 track이 빠져 DB default(ROADMAP)로 떨어짐.
- **권장 수정**: `src/lib/schemas/project.ts`의 `createProjectSchema`에 `track: z.enum(PROJECT_TRACKS).default('ROADMAP')`이 **명시적으로 포함**되었는지 감사 후 누락 시 추가.

### M-4. 마이그 062 Storage 버킷 MIME 목록과 schemas/notice.ts `ALLOWED_ATTACHMENT_EXT` 불일치

- **파일**: `src/lib/schemas/notice.ts:7-21` vs `supabase/migrations/062_add_notices.sql:96-110`
- **문제**: `ALLOWED_ATTACHMENT_EXT`에는 `.hwpx`·`.hwp`·`.pdf`·`.docx`·`.xlsx`·`.txt`·`.ppt`·`.pptx`·`.jpg`·`.jpeg`·`.png`·`.gif`·`.webp` 13종. 그러나 `.doc`(msword), `.xls`(vnd.ms-excel)은 **SQL 버킷 정책엔 있으나 ALLOWED_ATTACHMENT_EXT에는 없음**. 반대로 `.gif`는 양쪽 다 있음.
  - 결과: 사용자가 `.doc` 파일을 업로드하려 하면 클라이언트 Zod 검증에서 "허용되지 않는 파일 형식"으로 차단. 버킷 정책이 허용함에도 스키마가 막음.
  - `src/lib/services/notice.ts`의 `EXT_TO_MIME`(338~357 line)은 `.doc`/`.xls` 매핑 포함 → 삼중 불일치.
- **권장 수정**: `ALLOWED_ATTACHMENT_EXT`에 `.doc`·`.xls` 추가하거나, 반대로 버킷·EXT_TO_MIME에서 제거.

### M-5. `deleteNotice` 성공 반환이 Storage 에러를 무시함

- **파일**: `src/lib/services/notice.ts:288-318`
- **문제**: DB row 삭제 후 Storage 파일 삭제 실패 시 `console.error`만 하고 `return true`. 공지 row는 사라지지만 Storage에는 orphan 파일이 영원히 남음. 20MB 누적되면 스토리지 비용·버킷 제한 충돌 가능.
- **권장 수정**: Storage 삭제 실패를 감사로그(`NOTICE_DELETED` meta.storage_orphan_paths)에 기록 + cron 작업(예: 주간 orphan 수거)으로 정리. 또는 `return { success: true, orphanCount: paths.length }` 형태로 상위 전달.

### M-6. `AttachmentList.handleDelete`에서 네이티브 `confirm()` 사용

- **파일**: `src/components/notices/AttachmentList.tsx:68`
- **문제**: 프로젝트 frontend-guide 스킬이 shadcn `AlertDialog` 사용을 권장 + CLAUDE.md §3-4-2 "순수 HTML/네이티브 다이얼로그 사용 금지". 키보드 포커스·다국어·스타일 일관성 모두 깨짐.
- **권장 수정**: shadcn `AlertDialog`로 교체 (운영/템플릿 삭제 확인과 동일 패턴 재사용).

### M-7. `hwpx-client.ts`에 console.log가 프로덕션 로깅에 그대로 남아 있음

- **파일**: `src/lib/services/export/hwpx/hwpx-client.ts:79, 167`
- **문제**: `console.log('[generateHwpx] fetching', ...)` / `console.log('[generateHwpx] response received', ...)` 매 호출마다 Vercel Functions log에 출력. `bypassLen`·`firstBytes`·`contentType` 등 로그 노이즈 + (bypassLen으로 비밀 유출은 아니지만) 잠재적 정보 노출.
- **권장 수정**: `process.env.NODE_ENV === 'development'` 가드 추가 또는 `console.debug` + Vercel log level 설정.

### M-8. `PBLContent.operation_plan` 깊은 객체 접근 패턴 중복 (DRY 위반)

- **파일**:
  - `src/app/(dashboard)/gallery/actions/queries.ts:528-534, 712-717`
  - (같은 `operation_plan.training_plan.subject_profile` 접근 경로가 2곳 중복)
- **문제**: 갤러리 목록용 `fetchGalleryPBLReports`와 상세용 `fetchPBLReportDetail`에서 동일하게 `content.operation_plan?.training_plan?.subject_profile?.course_name` 안전 접근 코드 6라인씩 중복. `PBLContent` 타입이 있음에도 `Record<string, unknown>`으로 캐스팅해 탐색.
- **권장 수정**: `src/lib/services/pbl/pbl-crud.ts`에 `extractPBLSummary(content: PBLContent): { courseName: string; totalHours: number; trainingGoals: string[] }` 헬퍼 추가 후 두 곳에서 호출. 타입 안전성 회복.

---

## 4. Low Priority 이슈

### L-1. Step 2 계획서의 `author_id UUID NOT NULL` 요구와 실제 구현 상충 (실제가 올바름)

- **파일**: `supabase/migrations/062_add_notices.sql:11-13`
- **내용**: 계획서 §4 Step 2 Task 6에서는 `author_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL`로 명시했으나, `NOT NULL`과 `ON DELETE SET NULL`은 **논리적으로 충돌**. 실제 구현에서는 `NOT NULL`을 제거해 작동하도록 수정(주석에 명시). 계획서 오탈자이므로 수정 불요, 기록용.

### L-2. 계획서의 `NoticeList.tsx` vs 실제 `NoticeTable.tsx`

- **파일**: 계획서 §1-3-B "src/components/notices/NoticeList.tsx" vs 실제 `src/app/(dashboard)/ops/notices/_components/NoticeTable.tsx`
- **내용**: 이름·위치 모두 다름. 기능적으로 동등하므로 수정 불요. 문서 추적을 위해 계획서 업데이트 또는 ADR에 기록 권장.

### L-3. `PBLOperationGoal.tsx` — 계획서에 명시되지 않은 컴포넌트 추가

- **파일**: `src/components/pbl/PBLOperationGoal.tsx`
- **내용**: 계획서 §1-3-B의 PBL 컴포넌트 목록(PBLOverview·TrainingTargets·ToolUsagePlan·TrainingPlan·EvaluationPlan·PerformanceMetrics·StatusBadge·DownloadButton 8종)에 없는 `PBLOperationGoal` 존재. Ⅳ-1 훈련 목표를 별도 카드로 분리한 구현 세분화. 문서 업데이트 권장.

### L-4. `src/lib/services/pbl/pbl-generator.ts` 재시도 시 비결정적 user prompt 접두사

- **파일**: `src/lib/services/pbl/pbl-generator.ts:62-74`
- **내용**: 재시도 시 basePrompt에 "[재시도 2/3]... 다음을 반드시 준수하라:" 블록을 **문자열 concat**으로 이어붙임. LLM Prompt injection 방어 측면에서는 문제 없으나, 재시도 로그 추적 시 동일 입력 두 번 해시가 달라져 replay/디버깅 어려움. 반환값에 `attemptCount`를 포함하면 개선.

### L-5. `abort-registry`는 모듈 레벨 Map — 서버리스 다중 인스턴스에서 취소 보장 없음

- **파일**: `src/lib/services/abort-registry.ts:7-12`
- **내용**: 이미 주석에 명시된 알려진 제약. Vercel fluid compute라 같은 인스턴스 재활용 확률이 높지만 보장 불가. **계획서의 `cancelPBLGeneration`/`cancelRoadmapGeneration`는 UI 피드백만 보장되고 실제 LLM 호출은 계속 토큰 소비**. 실 사용량 측면에서 Step 12 관측 대상.

### L-6. `sharePBL` service → RLS 간접 의존 (직접 created_by 검증 부재)

- **파일**: `src/lib/services/pbl/pbl-crud.ts:299-331`
- **내용**: `sharePBL(pblId, isShared)` 함수가 status='FINAL' 검증만 하고 **작성자 검증은 admin client RLS 우회로 서비스 레이어에 없음**. 호출부(`/gallery/actions/interactions.ts:togglePBLShare`)에서는 `report.created_by !== user.id` 체크가 있고, `/consultant/projects/[id]/pbl/actions.ts:togglePBLShareAction`은 `requireConsultantPBLReportAccess`로 배정 컨설턴트 확인 → 실질적 방어는 있으나 서비스 레이어 단독 호출 시 취약. 방어심층 원칙 약간 위배.

### L-7. 테스트 환경에서 `interview-attachments` 버킷 policy 적용 테스트 부재

- **파일**: `supabase/migrations/065_*.sql` + 대응 테스트 `supabase/migrations/*test*` 또는 e2e
- **내용**: Supabase MCP 브랜치에서 policy 적용 자체는 검증되어 있으나, 컨설턴트가 타 프로젝트 storage path를 추측 접근 시 차단되는지 자동화 e2e가 없음. `e2e/negative/` 디렉터리에 negative spec 추가 권장.

---

## 5. 전반적 평가

### 잘된 점

1. **5단계 Server Action 패턴** — `ops/notices/actions.ts`, `pbl/actions.ts`, `roadmap/actions.ts` 모두 `requireAuthWithRole` → track 가드 → Zod → admin client → `after()` 감사로그 순서를 일관 적용. `check-server-action` 스킬 규칙 준수.
2. **`ActionResult` 타입 규율** — 직렬화 불가 객체(Date, Map 함수) 반환 0건. `new Date().toISOString()` 문자열 변환, Buffer → base64 문자열 변환 등 직렬화 규율 엄수.
3. **AbortController 일관 사용** — `generateRoadmap`·`generatePBLContent`·`generateTestPBL` 전부 `registerAbort(key).signal`을 LLM 호출에 전달. 취소 UX 지원.
4. **HWPX_API_SECRET 보호** — 서버 측 환경변수만 읽고 `X-HWPX-Secret` 헤더로 Python 함수에 전달. 클라이언트 번들 노출 없음(Grep 확인).
5. **RLS 커버리지** — 060~066 모든 새 테이블에 RLS enable + 정책 선언. 066에서 audit_logs_archive RLS 누락분 보충. `pbl_likes` 트리거로 `like_count` 원자적 갱신.
6. **트랙 기반 분리** — `saveRoadmapInterview`·`savePBLInterview`·`generatePBLAction`·`exportPBLAsHwpxAction` 모두 `projects.track` 검증을 첫 단계에서 수행. 트랙 혼선 방지.

### 개선 영역

1. **테스트 커버리지 편차** — 로드맵 측 PDF 렌더러는 `.test.ts` 5개, PBL 측 PDF 렌더러는 0개. XLSX도 동일 패턴. (H-3)
2. **감사로그 일관성** — 공유 토글·Storage orphan·일부 재시도 경로에서 로그 누락. (H-2, M-5)
3. **권한 검증 방어심층** — signed URL 발급과 서비스 레이어에서 일부 배정/작성자 체크 누락. (M-1, L-6)
4. **RLS 성능 패턴** — 마이그 065가 마이그 048 `(SELECT auth.uid())` 패턴 위반. (H-1)

---

## 6. 권장 후속 작업 (우선순위 순)

1. **High 이슈 3건 즉시 반영** (H-1 마이그 067 + H-2 감사로그 추가 + H-3 PBL export 테스트 5~6개 추가)
2. **Medium 이슈** 중 M-1(signed URL 권한), M-4(MIME 불일치) 먼저 수정
3. 나머지 Medium/Low는 ADR 또는 다음 릴리스 백로그로 이관

리포트 끝.
