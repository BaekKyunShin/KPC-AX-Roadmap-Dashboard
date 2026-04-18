# Session 10 — Step 11: 갤러리 트랙 라벨·필터 + 프로젝트 목록·상세·대시보드 전 역할 UX 일관화 + PBL 테스트 페이지

## 세션 목표
마스터 계획서 §4의 **Step 11** (M~L, **17 Task**) 수행. 갤러리에 로드맵·PBL 통합 표시 + 트랙 필터/라벨 + 상세 페이지 트랙 분기 + `/test-pbl` 페이지 신규 + **Session 09(Step 10) 실사용 검증 중 발견된 전 역할 UX 누락 해소**.
**양식 정합성 반영**: Step 6.5에서 추가된 로드맵 Ⅰ장 요약·NCS 박스·훈련체계 수립 방법, Step 8·9에서 구축된 PBL 양식 2번 Ⅰ~Ⅴ장 전 필드가 갤러리 상세에서 누락 없이 렌더되어야 함.

**Session 09에서 발견된 추가 스코프 (Task 4.5~4.11)**:
- 컨설턴트/운영관리자/시스템관리자 세 역할에서 트랙 구분이 일관되게 노출되도록 프로젝트 상세·홈 대시보드·프로젝트 대시보드·감사로그 필터 모두 업데이트
- 잘못된 redirect(`/pbl/page.tsx:36`) 제거, 공통 헬퍼 `src/lib/utils/project-track.ts` 추출
- project_assignments 레코드 무결성 감사 (Session 09에서 수동 INSERT로 해결한 이슈의 재발 방지)

## 사전 조건
- Step 6.5 (로드맵 양식 정합성) 머지 — 로드맵 결과물에 Ⅰ장·NCS 박스·수립 방법 존재.
- Step 9 (PBL 산출물) 머지 — `pbl_reports.is_shared` 조회 가능, 갤러리에 PBL 데이터 노출 가능.
- **Step 10 (PBL HWPX) 머지 — `generateRoadmapHwpx`/`generatePBLHwpx`·`buildPBLHwpxPayload`·`exportPBLAsHwpxAction` 사용 가능**.
- `feature/official-form-alignment` 최신.
- 기존 갤러리 구조 파악: `gallery/_components/GalleryContent.tsx`, `gallery/[id]/_components/GalleryDetailContent.tsx`, `gallery/actions/{copy,queries,interactions,gallery-utils,index}.ts`.
- 프로젝트 목록 실제 파일명: `src/app/(dashboard)/consultant/projects/_components/ProjectList.tsx` + `src/app/(dashboard)/ops/projects/_components/ProjectList.tsx` (이전 판 계획서의 `ConsultantProjectsTable.tsx`·`OpsProjectsTable.tsx` 은 존재하지 않음).

## 실행 모드
**subagent-driven-development** — 17 Task. 갤러리 통합·필터·상세 분기·**프로젝트 목록 트랙 뱃지·프로젝트 상세 트랙 분기·전 역할 대시보드 PBL 반영·감사로그 필터·공통 헬퍼·project_assignments 무결성 감사**·test-pbl 페이지·E2E 분리.

## 호출 스킬·MCP·서브에이전트
- `superpowers:subagent-driven-development`
- `frontend-guide`, `composition-patterns`, `react-best-practices`
- `superpowers:test-driven-development`
- `test-automator` 서브에이전트 (E2E)

## 예상 소요
**6~8시간** (기존 10 Task에 전 역할 UX 7 Task 추가됨)

## 성공 지표

### 갤러리 (기존 범위)
- [ ] `gallery/actions/queries.ts`에 `fetchPBLReportDetail(id)` 추가 + 통합 목록 함수 (병렬 두 쿼리 + TS 병합 + 정렬 + 페이지네이션) + 테스트.
- [ ] `gallery/actions/interactions.ts`에 PBL 좋아요·공유 분기 (pbl_likes 테이블 INSERT/DELETE → 트리거가 like_count 자동 갱신).
- [ ] `src/components/gallery/TrackFilter.tsx` 신규 + URL searchParams 동기화 + 테스트.
- [ ] `GalleryContent.tsx` 카드에 트랙 라벨 뱃지 (`TRACK_BADGE_COLORS` 사용) + 카드 href에 `?track=ROADMAP|PBL` 명시.
- [ ] `gallery/[id]/page.tsx` `?track` 분기 + `GalleryPBLDetailContent.tsx` 신규.
- [ ] **`GalleryDetailContent.tsx` (로드맵)에 Step 6.5 신규 필드 렌더**: Ⅰ장 요약 블록 (수립 필요성·AI 역량 수준·선정 과업·수립 주요내용) + NCS 전체 단위 박스 + 훈련체계 수립 방법 + 부제 라벨. 컨설턴트·운영자 뷰의 Step 6.5 블록을 `canEdit=false`로 재사용.
- [ ] **`GalleryPBLDetailContent.tsx` (신규)에 양식 2번 Ⅰ~Ⅴ장 전 섹션 렌더**: PBLOverview·PBLTrainingTargets·PBLToolUsagePlan·PBLTrainingPlan·PBLEvaluationPlan·PBLPerformanceMetrics 컴포넌트 모두 `canEdit=false`로 재사용.
- [ ] `gallery/page.tsx`에 `TrackFilter` 통합 + 빈 상태 메시지.
- [ ] **갤러리 `copy.ts:126` revalidatePath 트랙 분기** (PBL 복사 시 `/pbl` 경로도 재검증).

### 전 역할 트랙 UX 일관화 (Session 09 발견, 신규 범위)
- [ ] **공통 헬퍼 `src/lib/utils/project-track.ts` 추출** (+ 테스트) — `projectDetailHref`, `opsProjectDetailHref`, `statusLabel`, `primaryActionLabel` (트랙 × 상태 매트릭스 전수 검증).
- [ ] **`src/components/ui/TrackBadge.tsx` 신규** (+ 테스트) — `size='sm'|'md'` prop, `TRACK_BADGE_COLORS` 사용.
- [ ] **컨설턴트 `projects/_components/ProjectList.tsx`** (실제 파일명, `ConsultantProjectsTable.tsx` 아님) — 트랙 컬럼·뱃지·상태 라벨 트랙별.
- [ ] **컨설턴트 `projects/[id]/page.tsx` (line 119~127) 트랙 분기** — `projectDetailHref(id, track)` + `primaryActionLabel(status, track)`.
- [ ] **`projects/[id]/pbl/page.tsx:36` 잘못된 `/roadmap` redirect 제거** (PBL 페이지에서 튕겨나가는 버그).
- [ ] **컨설턴트 홈 대시보드 PBL 반영** — `SummaryCards.tsx`·`StatusDistributionChart.tsx`·`RecentProjects.tsx` (+ 각 `.test.tsx`): PBL 상태 카운트/라벨/배지.
- [ ] **운영관리자 `ops/projects/_components/ProjectList.tsx`** — 동일 패턴 (트랙 컬럼·뱃지).
- [ ] **운영관리자 `ops/projects/[id]/page.tsx` (line 380~400)** — `opsProjectDetailHref(id, track)` + 라벨.
- [ ] **운영관리자 프로젝트 대시보드 PBL 포함**:
  - `MonthlyCompletionChart.tsx`: 제목·데이터 소스 트랙 통합
  - `ops/projects/actions/dashboard.ts:118,183`: `drafting` 카운트에 `PBL_DRAFTED` 포함
  - `ops/projects/actions/queries.ts:278,289`: 상태 스텝 라벨 트랙별 분기
- [ ] **운영관리자 감사로그 필터 PBL 액션 라벨 추가** — `ops/audit/actions.ts:73-75` (`PBL_REPORT_CREATED`·`PBL_REPORT_FINALIZED`·`PBL_REPORT_SHARED`·`PBL_HWPX_EXPORTED`·`ROADMAP_HWPX_EXPORTED`).
- [ ] **project_assignments 레코드 무결성 감사** — `assigned_consultant_id` 있으나 `is_current=true` 레코드 없는 행 수 쿼리 결과 0건. 누락 행 발견 시 보완 INSERT + 재발 방지 코드 감사.

### /test-pbl + Navigation + E2E (기존 범위)
- [ ] `/test-pbl` 페이지 (test-roadmap 평행 구조: `TestPBLClient.tsx`는 루트, `_components/TestPBL*` + `_hooks/useTestPBL*` + actions). `projects.is_test_mode = true` 활용.
- [ ] **`e2e/fixtures/pbl-interview-sample.ts` 신규 — 양식 2번 3~11p 필드를 모두 채운 샘플 데이터** (test-pbl 시나리오용).
- [ ] `Navigation.tsx`에 "PBL 테스트" 메뉴.
- [ ] E2E (`e2e/gallery/gallery-tracks.spec.ts` + `e2e/consultant/test-pbl.spec.ts`) 통과.

### PR
- [ ] PR `feat(ofa-11): 갤러리 트랙 분리 + 전 역할 트랙 UX + PBL 테스트` 생성.

## 다음 세션 이동 조건
- PR 머지 완료. 다음 → `session-11-step12-final-qa.md`.

---

## 복사용 프롬프트

```
=== 컨텍스트 ===
- 프로젝트: KPC AI 훈련 로드맵 대시보드 (/Users/baekkyunshin/Desktop/AI-roadmap-dashboard)
- 마스터 계획서: docs/plans/2026-04-14-official-form-alignment.md
- OFA 프로젝트 **열 번째 세션** — Step 1~10 모두 머지된 상태
  - Step 2: pbl_reports·pbl_likes 테이블 + TRACK_BADGE_COLORS 상수
  - Step 9: pbl_reports 데이터 + UI + 내보내기 동작
  - Step 10: PBL HWPX 다운로드 동작 + hwpx-client 리팩터 (`generateRoadmapHwpx`/`generatePBLHwpx`/`postToPythonGenerate`)
- 본 세션: Step 11 (M~L, **17 Task**) — 갤러리 통합·필터·상세 분기 + **전 역할 트랙 UX 일관화** + /test-pbl 신규

⚠️ Session 09(Step 10) 말미 실사용자 점검에서 발견된 전 역할 UX 누락(7 Task 분)이 본 세션 범위에 포함됨. 계획서 Step 11 §4 본문 Task 4.5~4.11 참고.

=== 사전 검증 (반드시 첫 번째로 실행) ===
1. cd /Users/baekkyunshin/Desktop/AI-roadmap-dashboard
2. git fetch origin && git checkout feature/official-form-alignment && git pull
3. git log --oneline -10           → ofa-09·ofa-10 머지 커밋 확인
4. ls src/lib/constants/tracks.ts  → TRACK_BADGE_COLORS 확인 (grep TRACK_BADGE_COLORS src/lib/constants/tracks.ts)
5. mcp__supabase__execute_sql({query: "SELECT id FROM pbl_reports LIMIT 1"})  → 테이블 존재
6. mcp__supabase__execute_sql({query: "SELECT id FROM pbl_likes LIMIT 1"})    → 테이블 존재
7. ls src/app/\(dashboard\)/gallery/_components/GalleryContent.tsx src/app/\(dashboard\)/gallery/\[id\]/_components/GalleryDetailContent.tsx  → 기존 컴포넌트
8. ls src/app/\(dashboard\)/gallery/actions/  → copy, queries, interactions, gallery-utils, index 5개 파일 확인
9. ls src/app/\(dashboard\)/test-roadmap/  → 평행 구조 참조 (TestRoadmapClient.tsx 루트 위치 확인)
10. ls src/app/\(dashboard\)/test-roadmap/_components/ src/app/\(dashboard\)/test-roadmap/_hooks/  → _components·_hooks 하위 구조 참조
11. ls src/components/Navigation.tsx  → 메뉴 추가 대상
12. ls src/components/roadmap/RoadmapOverviewSummary.tsx src/components/roadmap/NcsMethodologyBox.tsx src/components/roadmap/CompetencyModelingTable.tsx src/components/roadmap/AnnualTrainingPlanTable.tsx src/components/roadmap/CourseSpecCard.tsx src/components/roadmap/RoadmapMatrix.tsx src/components/roadmap/CoursesList.tsx  → Step 6.5에서 확정된 로드맵 상세 구성 요소 (GalleryDetailContent가 canEdit=false로 재사용)
13. ls src/components/pbl/PBLOverview.tsx src/components/pbl/PBLTrainingTargets.tsx src/components/pbl/PBLToolUsagePlan.tsx src/components/pbl/PBLTrainingPlan.tsx src/components/pbl/PBLEvaluationPlan.tsx src/components/pbl/PBLPerformanceMetrics.tsx  → Step 9 결과 (GalleryPBLDetailContent가 canEdit=false로 재사용)
14. mcp__supabase__execute_sql({query: "SELECT column_name FROM information_schema.columns WHERE table_name='projects' AND column_name='is_test_mode'"})  → is_test_mode 컬럼 확인 (마이그 005에서 추가됨)
15. ls src/lib/schemas/interview-pbl.ts  → test-pbl fixture가 준수할 스키마
16. ls "src/app/(dashboard)/consultant/projects/_components/ProjectList.tsx" "src/app/(dashboard)/ops/projects/_components/ProjectList.tsx"  → 트랙 뱃지 추가 대상 (실제 파일명)
17. ls "src/app/(dashboard)/consultant/home/_components/SummaryCards.tsx" "src/app/(dashboard)/consultant/home/_components/StatusDistributionChart.tsx" "src/app/(dashboard)/consultant/home/_components/RecentProjects.tsx"  → 홈 대시보드 PBL 반영 대상
18. ls "src/app/(dashboard)/ops/projects/_components/MonthlyCompletionChart.tsx" "src/app/(dashboard)/ops/projects/actions/dashboard.ts" "src/app/(dashboard)/ops/projects/actions/queries.ts"  → OPS 대시보드 PBL 반영 대상
19. ls "src/app/(dashboard)/ops/audit/actions.ts"  → 감사로그 액션 필터 PBL 라벨 추가 대상
20. ls src/lib/constants/status.ts  → PBL 상태 enum 확인 (statusLabel 매트릭스 작성 기준)
21. mcp__supabase__execute_sql({query: "SELECT p.id, p.company_name, p.track FROM projects p LEFT JOIN project_assignments pa ON pa.project_id=p.id AND pa.is_current=true WHERE p.assigned_consultant_id IS NOT NULL AND pa.id IS NULL"})  → project_assignments 무결성 baseline
22. npm run validate              → baseline pass

검증 실패 시 즉시 중단. Step 9·10 미머지면 차단.

=== 필수 사전 정독 ===
- 계획서 §0·§3-4
> 계획서 해당 섹션의 정확한 줄 위치는 `grep -n '^### Step 11:' docs/plans/2026-04-14-official-form-alignment.md` 로 헤더 재확인.

- 계획서 §4 Step 11: 본 세션 **17 Task** + 평행 구조 (Task 4.5~4.11은 Session 09에서 추가된 전 역할 UX)
- src/app/(dashboard)/test-roadmap/* 전체 — 평행 구조 참조 (TestRoadmapClient는 루트, _components·_hooks)
- src/app/(dashboard)/gallery/actions/queries.ts·interactions.ts — 기존 패턴
- supabase/migrations/005_rename_case_to_project.sql — is_test_mode 컬럼 + 사용 패턴 (이전 판의 "마이그 032·034"는 오기)

=== 핵심 자산 요약 ===
- gallery/actions/{copy,queries,interactions,gallery-utils,index}.ts (like.ts·share.ts 분리 파일 **없음** — interactions.ts에 통합)
- gallery/[id]/page.tsx는 fetchRoadmapDetail(id)만 호출 — fetchPBLReportDetail 신규 추가 + ?track 쿼리 분기
- pbl_likes 테이블 + 트리거 모두 Step 2 마이그 061에서 추가됨 — 본 Step에서 마이그 X
- TRACK_BADGE_COLORS는 src/lib/constants/tracks.ts (Step 2)
- test-roadmap 평행 구조: **TestRoadmapClient.tsx는 루트(_components/ 아님)**, _components/Test* 단계 컴포넌트, _hooks/useTest* 훅
- projects.is_test_mode 컬럼은 **마이그 005**에서 추가됨 — test-pbl도 동일 메커니즘 (이전 판의 "마이그 032·034" 언급은 오기)
- 프로젝트 목록 실제 파일명: 양쪽 모두 **`ProjectList.tsx`** (`ConsultantProjectsTable.tsx`·`OpsProjectsTable.tsx` 은 존재하지 않음)
- Step 10에서 `generateHwpx` → `generateRoadmapHwpx`로 리네임 + `generatePBLHwpx` 추가 + `postToPythonGenerate` 공통 헬퍼 추출. 본 Step에서 HWPX 관련 코드 참조 시 새 이름 사용
- e2e/fixtures/pbl-interview-sample.ts 신규 (e2e/fixtures 경로, tests/fixtures 아님). **Step 8의 src/lib/schemas/interview-pbl.ts 스키마 준수 필수**
- **GalleryDetailContent (로드맵) 재사용 대상 (Step 6.5 자산)**:
  - RoadmapOverviewSummary — Ⅰ장 요약 블록
  - NcsMethodologyBox — 표 전체 단위 NCS 박스 (활용/미활용 2종)
  - CompetencyModelingTable·AnnualTrainingPlanTable·CourseSpecCard·RoadmapMatrix·CoursesList — 모두 canEdit=false로 호출 (controlled 패턴 Step 6.5 반영 완료)
  - 내부 표는 @/components/roadmap/shared 공용 키트 기반이라 추가 작업 불필요
- **GalleryPBLDetailContent (신규, PBL) 재사용 대상 (Step 9 자산)**: PBLOverview·PBLTrainingTargets·PBLToolUsagePlan·PBLTrainingPlan·PBLEvaluationPlan·PBLPerformanceMetrics 모두 canEdit=false
- **⭐ Step 8(Session 7)에서 신설된 공용 UI 자산**: `@/components/ui/form-field`(FormField). 본 Step에서 신규 필터·TrackBadge·테이블 UI 작성 시 일관 사용. 양식 1:1 매칭·Grid 2열 이하·Textarea rows 적정화 원칙 동일 적용. **GuideNote는 본 Step 대상 아님** (갤러리·test-pbl은 샘플/조회 UI이며, 인터뷰 단계에서만 사용)

진행 원칙:
1. feature/ofa-11-gallery-test-track 브랜치
2. Task 2 (통합 목록): SQL UNION 사용 X. 두 테이블 병렬 쿼리 후 TS에서 병합·정렬·페이지네이션 (계획서 본문 코드 패턴)
3. Task 3 (TrackFilter): 3개 토글(전체/로드맵/PBL) + URL searchParams 동기화 + composition-patterns로 기존 필터와 공통화 검토
4. Task 4 (카드 + 상세 분기): 카드 href에 ?track 명시 (UUID 충돌 방지). gallery/[id]/page.tsx에 ?track 기반 분기 + GalleryPBLDetailContent.tsx 신규
4.5. **Task 4.5 (프로젝트 목록 트랙 뱃지 컬럼 + 트랙별 상태 라벨 — OFA-08/09 Playwright 점검에서 발견된 누락)**:
   - 신규 `src/components/ui/TrackBadge.tsx` + 테스트 (shadcn Badge 기반, `tracks.ts` 색상맵 사용 — ROADMAP=blue, PBL=purple)
   - `/consultant/projects`의 `_components/ProjectList.tsx` 테이블에 "트랙" 컬럼 추가 + 각 행에 `<TrackBadge track={p.track} />` + 상태 라벨은 `statusLabel(status, track)` 사용
   - `/ops/projects`의 `_components/ProjectList.tsx`에 동일 패턴
   - 각 actions/queries에 `select` 절에 `track` 포함 (빠뜨리면 클라에 도달 안 함)
   - 배경: Session 07 Playwright 점검에서 목록 헤더가 "기업명·업종·규모·상태·배정일·작업"뿐이라 로드맵/PBL 육안 구별 불가 + Session 09에서 PBL 프로젝트가 목록에서 "로드맵 완료"로 잘못 표시됨.
   - composition-patterns: TrackBadge는 갤러리 카드(Task 4)·프로젝트 테이블 양쪽에서 쓰이므로 한 파일로 집중

4.6. **Task 4.6 (공통 트랙 분기 헬퍼 추출)**:
   - 신규 `src/lib/utils/project-track.ts` + 테스트 — `projectDetailHref(projectId, track)`, `opsProjectDetailHref(projectId, track)`, `statusLabel(status, track)`, `primaryActionLabel(status, track)`
   - 트랙 × 상태 매트릭스 전수 검증
   - Task 4.7~4.9의 선행 — 이후 모든 하드코딩된 `/roadmap` 링크·"로드맵" 라벨을 이 헬퍼 사용으로 교체

4.7. **Task 4.7 (컨설턴트 프로젝트 상세 트랙 분기 + PBL redirect 버그 제거)**:
   - `src/app/(dashboard)/consultant/projects/[id]/page.tsx:119~127` — 하드코딩 `/roadmap` 링크를 `projectDetailHref(projectId, projectData.track)`·`primaryActionLabel(...)` 사용으로 교체
   - 상태 조건 `['INTERVIEWED', 'ROADMAP_DRAFTED', 'FINALIZED']` 에 PBL 상태 추가 (`'PBL_DRAFTED'` 등)
   - **`src/app/(dashboard)/consultant/projects/[id]/pbl/page.tsx:36`에서 `redirect('/roadmap')` 제거** (PBL 페이지인데 로드맵으로 튕기는 버그)

4.8. **Task 4.8 (컨설턴트 홈 대시보드 PBL 반영)**:
   - `SummaryCards.tsx`·`StatusDistributionChart.tsx`·`RecentProjects.tsx` (+ 각 `.test.tsx`)
   - 상태 카드: PBL 상태 카운트 추가 또는 합산(`ROADMAP_DRAFTED+PBL_DRAFTED`)
   - 차트 범례·색: PBL 상태 추가
   - 최근 프로젝트 카드: `statusLabel`·`projectDetailHref` 사용
   - 기존 테스트에서 "로드맵 작성 중/완료" 라벨 기대값을 트랙 혼재 라벨로 대체

4.9. **Task 4.9 (운영관리자 프로젝트 상세·대시보드·감사로그 PBL 반영)**:
   - `ops/projects/[id]/page.tsx` line 380~400 "AI 교육 로드맵" 블록 — `opsProjectDetailHref(id, track)` 사용
   - `ops/projects/_components/MonthlyCompletionChart.tsx` — 제목/데이터 소스 트랙 통합 (또는 트랙별 스택 바)
   - `ops/projects/actions/dashboard.ts:118,183` — `drafting` 카운트에 `PBL_DRAFTED` 포함
   - `ops/projects/actions/queries.ts:278,289` — 상태 스텝 라벨 "로드맵 초안 생성" 트랙별 분기
   - `ops/audit/actions.ts:73-75` — 감사로그 액션 라벨 맵에 PBL 5종 추가 (`PBL_REPORT_CREATED`·`PBL_REPORT_FINALIZED`·`PBL_REPORT_SHARED`·`PBL_HWPX_EXPORTED`·`ROADMAP_HWPX_EXPORTED`)

4.10. **Task 4.10 (갤러리 revalidatePath 트랙 분기)**:
   - `gallery/actions/copy.ts:126` — 대상 프로젝트 track 조회 후 `revalidatePath(projectDetailHref(id, track))` 사용
   - `copy.test.ts` — PBL 대상 복사 시 `/pbl` 경로 revalidate 호출 확인

4.11. **Task 4.11 (project_assignments 레코드 무결성 감사)**:
   - `mcp__supabase__execute_sql` 로 `assigned_consultant_id` 있으나 `is_current=true` 레코드 없는 행 감사 SQL 실행
   - 누락 행 발견 시 보완 INSERT + 배정 서비스 코드 감사하여 재발 방지
   - Session 09에서 "PBL 테스트 기업" 프로젝트가 이 증상이었음 (수동 INSERT로 해결)

5. Task 5 (gallery/page.tsx 통합): TrackFilter + 빈 상태 + 페이지네이션
6. Task 6 (좋아요·공유): interactions.ts 분기. pbl_likes INSERT/DELETE만 — 트리거가 like_count 자동 갱신 (Step 2 마이그 061 트리거)
7. Task 7 (/test-pbl): test-roadmap 컨벤션 정확히 평행
   - src/app/(dashboard)/test-pbl/TestPBLClient.tsx (루트, NOT _components/)
   - _components/TestPBL*.tsx 단계 컴포넌트
   - _hooks/useTestPBL*.ts 폼·검증 훅
   - layout/loading/actions
   - is_test_mode=true 프로젝트로 격리 (마이그 005 메커니즘)
   - e2e/fixtures/pbl-interview-sample.ts 신규
8. Task 8 (Navigation.tsx): "PBL 테스트" 컨설턴트 메뉴 추가
9. Task 9: E2E 2개 (e2e/gallery/gallery-tracks.spec.ts + e2e/consultant/test-pbl.spec.ts)

=== 자동 진행 vs 승인 요청 경계 ===
- 자동 진행: 17 Task (Task 4.5~4.11 포함). 갤러리 통합·필터·상세 분기·프로젝트 목록 트랙 뱃지·상세 트랙 분기·홈 대시보드·OPS 대시보드·감사로그 필터·공통 헬퍼·revalidatePath·project_assignments 감사·test-pbl·E2E 자율.
- 승인 요청 (즉시 중단):
  - TS 병합 방식이 트래픽 증가로 비효율적일 가능성이 보일 때 (DB 뷰 도입 검토)
  - TrackFilter 추출이 기존 필터 컴포넌트와 인터페이스 충돌할 때
  - /test-pbl 격리 방식이 is_test_mode로 충분하지 않을 때 (별도 테이블 검토)
  - GalleryPBLDetailContent와 GalleryDetailContent 공통 base 추출 검토 시
  - **project_assignments 감사 결과 누락 행 대량 발견 시** (수십 건 이상 → 배정 서비스 코드 버그 가능성. 일괄 보완 INSERT 전 사용자 승인)
  - **`statusLabel`/`primaryActionLabel` 라벨 문구 확정 시** (운영팀이 사용할 용어 — 자의적 결정 금지)

=== Task 종료 보고 양식 ===
✅ Task N 완료
- 신규/변경 파일: 1~3개
- TDD/E2E 결과
- 다음 Task

=== 금지 사항 ===
- gallery 액션 like.ts·share.ts 분리 파일 신규 작성 (interactions.ts에 통합)
- /test-pbl을 _components/TestPBLClient.tsx 구조로 (test-roadmap 컨벤션 — 루트 배치)
- 마이그레이션 신규 추가 (pbl_likes 트리거는 Step 2)
- tests/e2e·tests/fixtures 경로 사용 (실제는 e2e/<카테고리>/, e2e/fixtures/)

=== 종료 시 ===
0. **[필수] 전체 회귀 테스트 수행** — 모든 구현이 끝난 뒤 기존 기능 회귀 방지를 위해 반드시 실행. 건너뛰기 금지.
   - `npm run validate` (typecheck + lint + unit test 전체)
   - `npm run build` (프로덕션 빌드)
   - `npm run test:e2e` (E2E 전체)
   - 실패 시 원인 분석·수정 후 재실행. 우회·skip 금지.
1. superpowers:verification-before-completion
2. e2e/gallery/gallery-tracks.spec.ts + e2e/consultant/test-pbl.spec.ts 통과 보고
3. gh pr create --base feature/official-form-alignment --title "feat(ofa-11): 갤러리 트랙 분리 + 전 역할 트랙 UX + PBL 테스트"
4. PR URL 보고. 자동 머지 금지.

=== 사용자에게 전달할 검증 안내 (세션 종료 시 반드시 출력) ===
────────────────────────────────────────
✅ Step 11 완료. PR URL: <url>

**사용자가 확인할 것** (예상 20분, localhost 또는 Preview):

### 컨설턴트(kpc@test.com) 시점
1. `/consultant/home` 대시보드 — PBL 프로젝트 상태가 KPI·차트·최근 프로젝트에 **반영됨**
2. `/consultant/projects` 목록 — "트랙" 컬럼에 로드맵/PBL 뱃지 + 상태 라벨 트랙별 ("PBL 완료" vs "로드맵 완료")
3. PBL 프로젝트 상세 → **"PBL 보고서 보기"** 버튼 (이전: 로드맵 버튼만) → 정상 진입
4. PBL 페이지에서 `/roadmap`으로 튕기는 버그 사라짐
5. `/gallery` — 로드맵·PBL 혼재 표시, 필터 토글 동작, 상세 진입 트랙 분기
6. 좋아요·공유 토글 양쪽 트랙 동작
7. 네비게이션에 **"PBL 테스트"** 메뉴 → `/test-pbl` 샘플로 PBL 생성 성공

### 운영관리자(son@test.com) 시점
8. `/ops/projects` 목록 — "트랙" 컬럼에 로드맵/PBL 뱃지 + 상태 라벨 트랙별
9. `/ops/projects` 대시보드 — "월별 확정 현황" 차트에 PBL 포함, `drafting` 카운트에 PBL 초안 반영
10. PBL 프로젝트 상세 → "PBL 보고서 보기" 정상 진입
11. `/ops/audit` — 액션 필터 드롭다운에 **PBL 관련 항목 5종** (생성/확정/공유/HWPX 내보내기)

### 백엔드 무결성
12. project_assignments 감사 SQL 결과 0건 (누락 행 없음)

**저에게 질문으로 대체 가능**:
> "Step 11 갤러리·test-pbl PR이 성공 지표를 충족하는지 검증해줘"

localhost 동작 OK면 → PR Squash and Merge → 새 세션 **session-11 (마지막)**.
────────────────────────────────────────
```
