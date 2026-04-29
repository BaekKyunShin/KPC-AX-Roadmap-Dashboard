PBL 양식 정합성 대규모 모델 변경 PR 진행해줘.

## 입력
- docs/plans/2026-04-29-roadmap-review-findings.md
- docs/plans/2026-04-29-pbl-form-matrix.md (R0 산출 — 4중 정합성 비교)

## 공통 진행 규칙
1. 시작 시 findings.md + pbl-form-matrix.md 를 먼저 읽고 본 라운드 범위 + 이미 [해결됨] 표시된 항목 + 다른 라운드 메모 확인
2. 작업 중 신규 결함 발견 시 findings.md 의 "## 추가 발견 사항" 섹션에 추가
3. 작업 중 다른 라운드 항목에 영향 주는 사실 발견 시 해당 항목에 "> 메모(YYYY-MM-DD, R8로부터 발견): 내용" 추가
4. PR 머지 직전: 본 PR 이 닫는 항목에 [해결됨][PR #N] YYYY-MM-DD 표기 + findings.md 변경 같은 PR 에 포함
5. 머지는 사용자 명시 승인 후에만 진행

## 본 라운드 (R8) 범위
R3 PR2 (PR #43) 에서 양식 정합성 정정만 처리하고 별도 PR 로 분리한 PBL 측 대규모 모델 변경.
양식 텍스트 정정이 아니라 **인터뷰 스키마 + Step UI + HWPX 매퍼** 모두 신설/변경 필요.

### 5.2-1 PBL-자체-02 — Ⅱ-2 훈련환경 분석 정형 표 복원
- 현재: `PBLAnalysis.trainingEnv` (단일 자유서술 string), `StepTrainingEnv.tsx` 단일 LargeTextBox
- 양식 기준: 12×7 정형 표 (적정 훈련시간/장소(사내/사외)/사내강사 직위·이름·직무경력·인적특성/외부장소 등)
- HWPX P-05: 6 셀 분배 (`internal_status`/`external_status`/`internal_capability`/`external_capability`/`internal_facility`/`external_facility`) — 자유서술 → 6 셀 매핑 fallback 미정의
- 처리: 정형 표 입력 모델 (`PBLTrainingEnv` 구조체) 복원 + StepUI 보강 + HWPX P-05 6 셀 매퍼

### 5.2-2 PBL-자체-03 — Ⅲ-1 수행활동 차수×역할 4행 모델 확장
- 현재: 차수당 1행 + `participants` (PM·외부전문가·내부전문가·주치의) 4 person dict 단일 행 합산
- 양식 기준: 13×6 = 차수당 4행 (역할별 일자/내용/방법 분리)
- 처리: `PBLActivityItem` 스키마를 차수×역할 행 모델로 확장 + `StepActivities.tsx` 입력 UI + HWPX P-08 매퍼 (`_fill_pbl_performance_activities` 검증)

### 5.2-3 PBL-자체-04 — Ⅲ-2-가 정형 4 항목 라벨 보존
- 현재: `problems[]` 동적 행 (title/description/impact)
- 양식 기준: 5×2 "문제 정의서" 표 — 4 정형 항목 (문제 배경 / 핵심 문제 / 문제 범위 / 제약 조건) 단일 세트
- 처리: 양식 4 정형 라벨 보존 모델 (`PBLProblemDefinition` 구조체) + Step UI 보강 + HWPX P-09 라벨 매핑

### 5.2-4 PBL-자체-05 — Ⅴ. 성과분석 LLM 결과 연결
- 현재: `TabPBLOutcomes.tsx` placeholder 영구 (Task 2.10 미완)
- 처리:
  1. `pbl_content.outcome_analysis` 필드 신설 + Zod 스키마
  2. LLM 프롬프트 작성 (`pbl-prompts.ts` — 성과 측정 지표·내재화 방안)
  3. `TabPBLOutcomes` 결과 표시 컴포넌트 구현 (Ⅴ-1 정량/정성 + Ⅴ-2 내재화)
  4. HWPX P-25/P-26 cell_fill 매핑 추가

### 5.2-5 PBL-자체-01 본격 데이터 바인딩
- 현재 (R3 PR #43): `TabPBLOverview` description 안내문만 추가
- 양식 기준: 신청서 자동표출 7필드 (사업장관리번호·업종·업종코드·주소·훈련실시주소·관할 지부·담당자) 결과 페이지 (읽기 전용) 표출
- 처리:
  1. `PBLResultClient` props 에 `project: Project` 추가
  2. `src/app/(dashboard)/consultant/projects/[id]/pbl/page.tsx` 에서 project 메타 fetch + 전달
  3. `TabPBLCommonProps` 에 project 추가
  4. `TabPBLOverview` 의 FormTable 에 7필드 행 추가 (읽기 전용 InlineEditField 또는 그냥 텍스트)

### 5.2-6 #14·#17·#18(PBL) — TabPBLOps Ⅳ-3 표 변환
- 현재: Ⅳ-3-가/나/다/라/마 줄글/카운트 텍스트
- 양식 기준: 정형 표 (시설 명단·강사 명단·교과목 프로파일 등)
- 처리: LLM 결과 데이터 구조 (`subject_profile.training_contents`·`facilities[]`·`training_instructors[]`) 의존이라 LLM 프롬프트 작업 (R5 PR4) 과 협업 권장. 단계:
  1. LLM 결과 형태 확인 (R5 작업 결과)
  2. `TabPBLOps` 의 5개 SectionCard 줄글 → FormTable 변환
  3. Ⅳ-3-다 details 머리기호 분리 (#17 PBL — `splitByUnit` 재사용)

## 브랜치/PR
- 브랜치: feat/pbl-form-model-changes
- PR 제목: feat: PBL 양식 정합성 대규모 모델 변경 (스키마·Step·HWPX 매퍼)
- PR 본문에 닫는 검수 항목 번호 명시 (PBL-자체-01·02·03·04·05 + #14(PBL)·#17(PBL)·#18(PBL))

## 절차
- TDD 전면 적용 (스키마 검증·StepUI 텍스트 매칭·HWPX 매퍼 단위 테스트)
- supabase-dev / check-server-action / frontend-guide 스킬 호출
- DB 마이그 시 mcp__supabase__apply_migration → list_migrations 검증
- src/types/database.ts 수동 갱신
- HWPX 검증은 npm run dev:hwpx + npm run dev:with-hwpx 브리지 서버로 로컬 확인
- subagent-driven-development 권장 (5 항목 독립적 실행 가능)
- 모든 check (Lint & Typecheck · Unit Test · Build · E2E · Vercel) pass → findings.md 업데이트 → 머지 대기

## 우선순위 권고
PBL-자체-01 본격 (가장 단순, prop chain만) → PBL-자체-04 (4 정형 항목, 작은 모델) → PBL-자체-02 (12×7 표) → PBL-자체-03 (차수×역할) → PBL-자체-05 (LLM 신설, 가장 큼) → #14·#17·#18(PBL) 표 변환 (R5 PR4 결과 의존)
