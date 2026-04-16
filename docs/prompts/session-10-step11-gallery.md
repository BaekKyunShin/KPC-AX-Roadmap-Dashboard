# Session 10 — Step 11: 갤러리 트랙 라벨·필터 + PBL 테스트 페이지 (양식 신규 필드 노출 포함)

## 세션 목표
마스터 계획서 §4의 **Step 11** (M, 10 Task) 수행. 갤러리에 로드맵·PBL 통합 표시 + 트랙 필터/라벨 + 상세 페이지 트랙 분기 + `/test-pbl` 페이지 신규.
**양식 정합성 반영**: Step 6.5에서 추가된 로드맵 Ⅰ장 요약·NCS 박스·훈련체계 수립 방법, Step 8·9에서 구축된 PBL 양식 2번 Ⅰ~Ⅴ장 전 필드가 갤러리 상세에서 누락 없이 렌더되어야 함.

## 사전 조건
- Step 6.5 (로드맵 양식 정합성) 머지 — 로드맵 결과물에 Ⅰ장·NCS 박스·수립 방법 존재.
- Step 9 (PBL 산출물) 머지 — `pbl_reports.is_shared` 조회 가능, 갤러리에 PBL 데이터 노출 가능.
- `feature/official-form-alignment` 최신.
- 기존 갤러리 구조 파악: `gallery/_components/GalleryContent.tsx`, `gallery/[id]/_components/GalleryDetailContent.tsx`, `gallery/actions/{copy,queries,interactions,gallery-utils,index}.ts`.

## 실행 모드
**subagent-driven-development** — 10 Task. 갤러리 통합·필터·상세 분기·test-pbl 페이지·E2E 분리.

## 호출 스킬·MCP·서브에이전트
- `superpowers:subagent-driven-development`
- `frontend-guide`, `composition-patterns`, `react-best-practices`
- `superpowers:test-driven-development`
- `test-automator` 서브에이전트 (E2E)

## 예상 소요
**4~6시간**

## 성공 지표
- [ ] `gallery/actions/queries.ts`에 `fetchPBLReportDetail(id)` 추가 + 통합 목록 함수 (병렬 두 쿼리 + TS 병합 + 정렬 + 페이지네이션) + 테스트.
- [ ] `gallery/actions/interactions.ts`에 PBL 좋아요·공유 분기 (pbl_likes 테이블 INSERT/DELETE → 트리거가 like_count 자동 갱신).
- [ ] `src/components/gallery/TrackFilter.tsx` 신규 + URL searchParams 동기화 + 테스트.
- [ ] `GalleryContent.tsx` 카드에 트랙 라벨 뱃지 (`TRACK_BADGE_COLORS` 사용) + 카드 href에 `?track=ROADMAP|PBL` 명시.
- [ ] `gallery/[id]/page.tsx` `?track` 분기 + `GalleryPBLDetailContent.tsx` 신규.
- [ ] **`GalleryDetailContent.tsx` (로드맵)에 Step 6.5 신규 필드 렌더**: Ⅰ장 요약 블록 (수립 필요성·AI 역량 수준·선정 과업·수립 주요내용) + NCS 전체 단위 박스 + 훈련체계 수립 방법 + 부제 라벨. 컨설턴트·운영자 뷰의 Step 6.5 블록을 `canEdit=false`로 재사용.
- [ ] **`GalleryPBLDetailContent.tsx` (신규)에 양식 2번 Ⅰ~Ⅴ장 전 섹션 렌더**: PBLOverview·PBLTrainingTargets·PBLToolUsagePlan·PBLTrainingPlan·PBLEvaluationPlan·PBLPerformanceMetrics 컴포넌트 모두 `canEdit=false`로 재사용.
- [ ] `gallery/page.tsx`에 `TrackFilter` 통합 + 빈 상태 메시지.
- [ ] `/test-pbl` 페이지 (test-roadmap 평행 구조: `TestPBLClient.tsx`는 루트, `_components/TestPBL*` + `_hooks/useTestPBL*` + actions). `projects.is_test_mode = true` 활용.
- [ ] **`e2e/fixtures/pbl-interview-sample.ts` 신규 — 양식 2번 3~11p 필드를 모두 채운 샘플 데이터** (test-pbl 시나리오용).
- [ ] `Navigation.tsx`에 "PBL 테스트" 메뉴.
- [ ] E2E (`e2e/gallery/gallery-tracks.spec.ts` + `e2e/consultant/test-pbl.spec.ts`) 통과.
- [ ] PR `feat(ofa-11): 갤러리 트랙 분리 + PBL 테스트` 생성.

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
  - Step 10: PBL HWPX 다운로드 동작
- 본 세션: Step 11 (M, 10 Task) — 갤러리 통합·필터·상세 분기 + /test-pbl 신규

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
10. ls src/components/Navigation.tsx  → 메뉴 추가 대상
11. mcp__supabase__execute_sql({query: "SELECT column_name FROM information_schema.columns WHERE table_name='projects' AND column_name='is_test_mode'"})  → is_test_mode 컬럼 확인
12. npm run validate              → baseline pass

검증 실패 시 즉시 중단. Step 9 미머지면 차단.

=== 필수 사전 정독 ===
- 계획서 §0·§3-4
> 계획서 해당 섹션의 정확한 줄 위치는 `grep -n '^### Step 11:' docs/plans/2026-04-14-official-form-alignment.md` 로 헤더 재확인.

- 계획서 §4 Step 11: 본 세션 10 Task + 평행 구조
- src/app/(dashboard)/test-roadmap/* 전체 — 평행 구조 참조 (TestRoadmapClient는 루트, _components·_hooks)
- src/app/(dashboard)/gallery/actions/queries.ts·interactions.ts — 기존 패턴
- supabase/migrations/032·034 — is_test_mode 사용 패턴

=== 핵심 자산 요약 ===
- gallery/actions/{copy,queries,interactions,gallery-utils,index}.ts (like.ts·share.ts 분리 파일 **없음** — interactions.ts에 통합)
- gallery/[id]/page.tsx는 fetchRoadmapDetail(id)만 호출 — fetchPBLReportDetail 신규 추가 + ?track 쿼리 분기
- pbl_likes 테이블 + 트리거 모두 Step 2 마이그 061에서 추가됨 — 본 Step에서 마이그 X
- TRACK_BADGE_COLORS는 src/lib/constants/tracks.ts (Step 2)
- test-roadmap 평행 구조: **TestRoadmapClient.tsx는 루트(_components/ 아님)**, _components/Test* 단계 컴포넌트, _hooks/useTest* 훅
- projects.is_test_mode 컬럼은 마이그 032·034부터 사용 중 — test-pbl도 동일 메커니즘
- e2e/fixtures/pbl-interview-sample.ts 신규 (e2e/fixtures 경로, tests/fixtures 아님)

진행 원칙:
1. feature/ofa-11-gallery-test-track 브랜치
2. Task 2 (통합 목록): SQL UNION 사용 X. 두 테이블 병렬 쿼리 후 TS에서 병합·정렬·페이지네이션 (계획서 본문 코드 패턴)
3. Task 3 (TrackFilter): 3개 토글(전체/로드맵/PBL) + URL searchParams 동기화 + composition-patterns로 기존 필터와 공통화 검토
4. Task 4 (카드 + 상세 분기): 카드 href에 ?track 명시 (UUID 충돌 방지). gallery/[id]/page.tsx에 ?track 기반 분기 + GalleryPBLDetailContent.tsx 신규
5. Task 5 (gallery/page.tsx 통합): TrackFilter + 빈 상태 + 페이지네이션
6. Task 6 (좋아요·공유): interactions.ts 분기. pbl_likes INSERT/DELETE만 — 트리거가 like_count 자동 갱신 (Step 2 마이그 061 트리거)
7. Task 7 (/test-pbl): test-roadmap 컨벤션 정확히 평행
   - src/app/(dashboard)/test-pbl/TestPBLClient.tsx (루트, NOT _components/)
   - _components/TestPBL*.tsx 단계 컴포넌트
   - _hooks/useTestPBL*.ts 폼·검증 훅
   - layout/loading/actions
   - is_test_mode=true 프로젝트로 격리
   - e2e/fixtures/pbl-interview-sample.ts 신규
8. Task 8 (Navigation.tsx): "PBL 테스트" 컨설턴트 메뉴 추가
9. Task 9: E2E 2개 (e2e/gallery/gallery-tracks.spec.ts + e2e/consultant/test-pbl.spec.ts)

=== 자동 진행 vs 승인 요청 경계 ===
- 자동 진행: 10 Task. 갤러리 통합·필터·상세 분기·test-pbl·E2E 자율.
- 승인 요청 (즉시 중단):
  - TS 병합 방식이 트래픽 증가로 비효율적일 가능성이 보일 때 (DB 뷰 도입 검토)
  - TrackFilter 추출이 기존 필터 컴포넌트와 인터페이스 충돌할 때
  - /test-pbl 격리 방식이 is_test_mode로 충분하지 않을 때 (별도 테이블 검토)
  - GalleryPBLDetailContent와 GalleryDetailContent 공통 base 추출 검토 시

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
1. superpowers:verification-before-completion
2. e2e/gallery/gallery-tracks.spec.ts + e2e/consultant/test-pbl.spec.ts 통과 보고
3. gh pr create --base feature/official-form-alignment --title "feat(ofa-11): 갤러리 트랙 분리 + PBL 테스트"
4. PR URL 보고. 자동 머지 금지.

=== 사용자에게 전달할 검증 안내 (세션 종료 시 반드시 출력) ===
────────────────────────────────────────
✅ Step 11 완료. PR URL: <url>

**사용자가 확인할 것** (예상 10분, localhost):

1. `npm run dev` → http://localhost:3000
2. 컨설턴트로 로그인 → /gallery 접속
3. **갤러리 통합 확인**:
   - 로드맵·PBL 카드 혼재 표시 (각각 blue/purple 트랙 뱃지)
   - 상단 "전체 / 로드맵 / PBL" 필터 토글 동작
   - 각 카드 클릭 → 트랙별 상세 페이지 진입
4. 컨설턴트 메뉴에 **"PBL 테스트"** 항목 보임
5. /test-pbl 진입 → 샘플 데이터로 "PBL 생성" → 성공
6. 좋아요·공유 토글 양쪽 트랙 동작

**저에게 질문으로 대체 가능**:
> "Step 11 갤러리·test-pbl PR이 성공 지표를 충족하는지 검증해줘"

localhost 동작 OK면 → PR Squash and Merge → 새 세션 **session-11 (마지막)**.
────────────────────────────────────────
```
