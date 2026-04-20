# Session 07 — Step 8: PBL 트랙 인터뷰 신규 (9스텝 위저드, 양식 2번 3~11p 1:1)

## 세션 목표
마스터 계획서 §4의 **Step 8** (L, 19 Task) 수행. PBL 트랙 전용 **9스텝 인터뷰 위저드**를 산인공 양식 2번 **3~11p (Ⅰ·Ⅱ·Ⅲ장)** 필드에 **1:1로 정합**하게 신규 구축. `interview/page.tsx`의 PBL placeholder를 실제 위저드로 교체.

## 사전 조건
- Step 2 (DB) 머지 — `interviews.pbl_data` 컬럼 + `audit_action` 'PBL_INTERVIEW_SAVED' enum 값.
- Step 5 (로드맵 인터뷰) 머지 — `interview-steps.ts` 디스패처, `useInterviewAutoSave` 훅, `InterviewStepper` 재사용 가능.
- `feature/official-form-alignment` 최신.

## 실행 모드
**subagent-driven-development** — 19 Task. 9개 Step 컴포넌트가 독립적이고 fresh subagent로 병렬 가능 부분 존재.

## 호출 스킬·MCP·서브에이전트
- `superpowers:subagent-driven-development`
- `frontend-guide`, `composition-patterns`, `check-server-action`, `react-best-practices`
- `superpowers:test-driven-development`
- 필요 시 `superpowers:dispatching-parallel-agents` (Task 6~13의 8개 스텝 컴포넌트는 독립이라 2~3개 동시 디스패치 가능)

## 예상 소요
**6~9시간**

## 성공 지표
- [ ] `src/lib/schemas/interview-pbl.ts` 신규 + **9개 서브 스키마** (courseOverview·companyStatus·trainingEnvironment·hrdNecessity·performanceActivities·problemDefinition·targetTasks·aiLevelDiagnosis + 통합) + autosave 완화 스키마 + 빈 항목 헬퍼 + 테스트 통과.
- [ ] **양식 2번 필드 1:1 매칭**: 모든 enum 값 한글 양식 그대로 (`'AI기초형'`/`'AI탐구형'`/`'AI활용형'`/`'AI선도형'`, `'사내'`/`'사외'`, `'가능'`/`'제한적'`/`'불가능'`, `'양호'`/`'보통'`/`'개선필요'`).
- [ ] `src/lib/constants/interview-steps-pbl.ts` 신규 (9스텝) + `interview-steps.ts` 디스패처에 PBL 분기 완성.
- [ ] **9개** `_components/pbl/Step*.tsx` 컴포넌트 (CourseOverview·CompanyStatus·TrainingEnvironment·HrdNecessity·**PerformanceActivities**·ProblemDefinition·TargetTasks·AILevel·Summary) + 모든 RTL 테스트 통과.
- [ ] `_components/PBLInterviewClient.tsx` 오케스트레이터 + 동적 import + Suspense + Skeleton fallback.
- [ ] `interview/page.tsx`에서 PBL 분기 placeholder → 실제 PBLInterviewClient 교체.
- [ ] `actions.ts`에 `savePBLInterview`·`fetchPBLInterview` 신규 + 5단계 패턴 + `createAuditLog({ action: 'PBL_INTERVIEW_SAVED', ... })`.
- [ ] `e2e/consultant/interview-pbl.spec.ts` 통과 (**9스텝** 작성·자동저장 복원).
- [ ] 양식 2번 3~11p QA 체크리스트(계획서 §4 Step 12) Ⅰ~Ⅲ장 전 항목 통과.
- [ ] PR `feat(ofa-08): PBL 트랙 인터뷰 신규` 생성.

## 다음 세션 이동 조건
- PR 머지 완료. 다음 → `session-08-step9-pbl-output.md`.

---

## 복사용 프롬프트

```
=== 컨텍스트 ===
- 프로젝트: KPC AI 훈련 로드맵 대시보드 (/Users/baekkyunshin/Desktop/AI-roadmap-dashboard)
- 마스터 계획서: docs/plans/2026-04-14-official-form-alignment.md
- OFA 프로젝트 **일곱 번째 세션** — Step 1·2·3·4·5·6·7 모두 머지된 상태
  - Step 2: interviews.pbl_data JSONB 컬럼 추가됨 (마이그 063)
  - Step 2: audit_action에 'PBL_INTERVIEW_SAVED' enum 값 추가됨 (마이그 061)
  - Step 5: useInterviewAutoSave 훅 + InterviewStepper 재사용 가능
  - Step 5: interview/page.tsx에 PBL placeholder 존재 (본 세션에서 실제 위저드로 교체)
  - Step 7: 로드맵 HWPX 다운로드 동작
- 본 세션: Step 8 (L, 18 Task) — PBL 트랙 8스텝 인터뷰 위저드 신규

=== 사전 검증 (반드시 첫 번째로 실행) ===
1. cd /Users/baekkyunshin/Desktop/AI-roadmap-dashboard
2. git fetch origin && git checkout feature/official-form-alignment && git pull
3. git log --oneline -10           → ofa-05·ofa-07 머지 커밋 확인
4. ls src/app/\(dashboard\)/consultant/projects/\[id\]/interview/_hooks/useInterviewAutoSave.ts  → Step 5 결과
5. ls src/app/\(dashboard\)/consultant/projects/\[id\]/interview/_components/RoadmapInterviewClient.tsx  → Step 5 결과
6. ls src/lib/constants/interview-steps-roadmap.ts  → Step 5 결과
7. mcp__supabase__execute_sql({query: "SELECT column_name FROM information_schema.columns WHERE table_name='interviews' AND column_name='pbl_data'"})  → pbl_data 컬럼 존재 확인
8. mcp__supabase__execute_sql({query: "SELECT 'PBL_INTERVIEW_SAVED'::audit_action"})  → enum 값 존재 확인
9. ls docs/references/2.AI*PBL*.pdf  → 양식 2번 원본
10. npm run validate                → baseline pass

검증 실패 시 즉시 중단. 특히 pbl_data·PBL_INTERVIEW_SAVED 부재 시 Step 2 마이그 재확인 필요.

=== 필수 사전 정독 ===
- 계획서 §0·§3-4
> 계획서 해당 섹션의 정확한 줄 위치는 `grep -n '^## 0\.\|^### 3-4\.\|^### Step 8:' docs/plans/2026-04-14-official-form-alignment.md` 로 헤더 재확인.

- 계획서 §4 Step 8: 본 세션 19 Task + **9스텝 분할** + 양식 2번 1:1 필드 정의 + 기존 자산 준수
- src/lib/constants/interview-steps-roadmap.ts — Step 5 패턴 참조 (Step 6.5에서 6스텝으로 늘어난 상태)
- src/app/(dashboard)/consultant/projects/[id]/interview/_components/RoadmapInterviewClient.tsx — Step 5 오케스트레이터 패턴 참조
- **docs/references/2.AI PBL 과정개발보고서 및 결과보고서(양식).pdf 3~11p 전 페이지 정독 필수**:
  - 3p: Ⅰ. 훈련과정 개요 (기업명·사업장관리번호·업종·주소·훈련실시주소·관할 지부·담당자 연락처·과정명·NCS 분류·훈련시간·훈련생·훈련 직무·AI역량수준 4등급·훈련 목표 5종 체크)
  - 4p: Ⅱ-1. 기업 현황 분석 (경영 이슈·조직도 부서/업무)
  - 5p: Ⅱ-2. 기업 훈련환경 분석 (적정 훈련시간·장소 사내/사외·사내강사·대상 인원·대상자 특성·AI활용 가능 인프라·AI훈련 요구분석 결과·기대효과 As-is/To-be)
  - 6p: Ⅱ-3. AI 과정개발의 필요성 (훈련 실시 이력·지원 이력·추천훈련사업 3순위·AI훈련과정 개발 필요성)
  - 7p: Ⅲ-1. 훈련과제 도출 수행활동 (수행 차수·일자·내용·방법·참석자 PM/외부전문가/기업내부전문가/능력개발전담주치의)
  - 8p: Ⅲ-2. 문제 도출 및 문제 우선순위 결정 (문제 정의서 배경·핵심·범위·제약, 우선순위 5점 척도)
  - 9~10p: Ⅲ-3. 훈련대상 업무 선정 및 분석 (선정 표·사유·세부내용 As-IS·To-Be·요구지식·기술)
  - 11p: Ⅲ-4. AI수준 진단 (현재 4등급·향후 4등급·향상 사유)

=== 핵심 자산 요약 ===
- 컨테이너: _components/PBLInterviewClient.tsx (RoadmapInterviewClient.tsx와 평행)
- 스텝: Step* 접두사, _components/pbl/ 서브폴더. **9개 스텝 컴포넌트 + Summary**:
  1. StepPBLCourseOverview.tsx (Ⅰ장)
  2. StepPBLCompanyStatus.tsx (Ⅱ-1)
  3. StepPBLTrainingEnvironment.tsx (Ⅱ-2)
  4. StepPBLHrdNecessity.tsx (Ⅱ-3)
  5. **StepPBLPerformanceActivities.tsx** (Ⅲ-1, **신규 스텝 — 양식 2번 7p에서 누락되지 않도록 주의**)
  6. StepPBLProblemDefinition.tsx (Ⅲ-2)
  7. StepPBLTargetTasks.tsx (Ⅲ-3)
  8. StepPBLAILevel.tsx (Ⅲ-4)
  9. StepPBLSummary.tsx (확인·제출)
- InterviewStepper.tsx 재사용 (Step 5에서 정리됨)
- _hooks/useInterviewAutoSave.ts 재사용 (Step 5에서 분리됨)
- DB: interviews.pbl_data JSONB 컬럼 (Step 2)
- audit: 'PBL_INTERVIEW_SAVED' (Step 2 마이그 061에서 추가됨)
- savePBLInterview Server Action 신규 (saveInterview는 Step 5에서 ROADMAP 가드 추가됨)
- **enum 값은 양식 한글 그대로**: `'AI기초형'|'AI탐구형'|'AI활용형'|'AI선도형'`, `'사내'|'사외'`, `'가능'|'제한적'|'불가능'`, `'양호'|'보통'|'개선필요'`, 훈련목표 `'기술문제 해결'|'공정 최적화'|'불량률 감소'|'기술 매뉴얼 개발'|'기타'`

진행 원칙:
1. feature/ofa-08-interview-pbl 브랜치
2. Task 2~3 (PBL 스키마): **9개 서브** (courseOverview·companyStatus·trainingEnvironment·hrdNecessity·performanceActivities·problemDefinition·targetTasks·aiLevelDiagnosis + 통합) + autosave 완화. TDD. **enum은 양식 한글 그대로**
3. Task 4~5 (스텝 상수 + 디스패처): interview-steps.ts에 PBL 분기 추가 (9스텝)
4. Task 6~14 (**9개 Step 컴포넌트 + Summary**): superpowers:dispatching-parallel-agents 활용 가능 — 2~3개씩 묶어 병렬 fresh subagent 디스패치
   - **StepPBLPerformanceActivities (Ⅲ-1)는 쉽게 누락되니 반드시 포함 — 양식 2번 7p 참석자 4역할(PM·외부전문가·기업내부전문가·능력개발전담주치의) 모두 필드**
   - 각 컴포넌트는 §3-4 공통 UI/UX 재사용 원칙 준수 (Skeleton·shadcn 강제·sonner·field-error·접근성)
   - composition-patterns 스킬로 동적 배열 컴포넌트(StepPBLCompanyStatus·StepPBLTargetTasks·StepPBLPerformanceActivities 등) 공통 Wrapper 추출 검토
5. Task 15 (PBLInterviewClient 오케스트레이터): **9스텝** 전환 + 동적 import + Suspense + useInterviewAutoSave 재사용
6. Task 16 (interview/page.tsx PBL 분기 완성): Step 5의 placeholder를 실제 PBLInterviewClient로 교체. interview row null 가능성 처리 (계획서 본문 코드 샘플 참조)
7. Task 17 (savePBLInterview Server Action): 5단계 패턴 (createClient from @/lib/supabase/server, projects.track === 'PBL' 가드, pblInterviewSchema 검증, 조회 후 update/insert 패턴, ActionResult). createAuditLog action: 'PBL_INTERVIEW_SAVED' (Step 2 마이그 061에서 enum 값 추가됨)
8. Task 18: e2e/consultant/interview-pbl.spec.ts (test-automator 서브에이전트 활용) — **9스텝** 작성 시나리오
9. Task 19: 검증·커밋·PR

=== 자동 진행 vs 승인 요청 경계 ===
- 자동 진행: 18 Task. 8개 스텝 컴포넌트는 dispatching-parallel-agents로 2~3개씩 묶어 병렬 디스패치 가능.
- 승인 요청 (즉시 중단):
  - 8스텝 분할이 UX 과부하 우려 시 (압축·통합 검토)
  - 산인공 양식 일부 필드가 schema 매핑 어려울 때
  - composition-patterns 추출이 RoadmapInterviewClient·PBLInterviewClient 공통 base 컴포넌트로 발전할 때 (큰 결정)
  - 8스텝 컴포넌트 병렬 작업 중 worktree 충돌 시

=== Task 종료 보고 양식 ===
✅ Task N 완료
- 신규/변경 파일: 1~3개
- TDD: RED→GREEN 결과
- 다음 Task

=== 금지 사항 ===
- saveInterview 함수 본문 변경 (Step 5에서 ROADMAP 가드 추가됨, PBL은 별개 savePBLInterview)
- 기존 InterviewClient.tsx·legacy Step* 컴포넌트 삭제 (Step 12에서)
- React Hook Form 도입
- 마이그레이션 신규 추가 (audit·pbl_data 모두 Step 2에서 처리됨)
- _components/pbl/ 외 다른 위치에 PBL Step 컴포넌트 배치

=== 종료 시 ===
0. **[필수] 전체 회귀 테스트 수행** — 모든 구현이 끝난 뒤 기존 기능 회귀 방지를 위해 반드시 실행. 건너뛰기 금지.
   - `npm run validate` (typecheck + lint + unit test 전체)
   - `npm run build` (프로덕션 빌드)
   - `npm run test:e2e` (E2E 전체)
   - 실패 시 원인 분석·수정 후 재실행. 우회·skip 금지.
1. superpowers:verification-before-completion
2. interview-pbl.spec.ts 통과 + autosave draft 복원 검증 결과 보고
3. gh pr create --base feature/official-form-alignment --title "feat(ofa-08): PBL 트랙 인터뷰 신규"
4. PR URL 보고. 자동 머지 금지.

=== 사용자에게 전달할 검증 안내 (세션 종료 시 반드시 출력) ===
────────────────────────────────────────
✅ Step 8 완료. PR URL: <url>

**사용자가 확인할 것** (예상 15분, localhost):

1. `npm run dev` → http://localhost:3000
2. 운영자로 로그인 → **PBL 트랙** 프로젝트 1건 생성 → 컨설턴트에게 배정
3. 컨설턴트로 로그인 → 배정된 PBL 프로젝트 → 인터뷰 화면
4. **PBL 인터뷰 9스텝** 확인 (양식 2번 3~11p 순서):
   - 훈련과정 개요 (Ⅰ) / 기업 현황 분석 (Ⅱ-1) / 훈련환경 분석 (Ⅱ-2) / HRD 제안·과정개발 필요성 (Ⅱ-3) / 훈련과제 도출 수행활동 (Ⅲ-1) / 문제 도출·우선순위 (Ⅲ-2) / 훈련대상 업무 (Ⅲ-3) / AI 수준 진단 (Ⅲ-4) / 확인·제출
5. 각 스텝 작성 → "다음" 이동 → 마지막 "제출"
6. 중간에 새로고침 → 자동 저장된 draft 복원 확인

**저에게 질문으로 대체 가능**:
> "Step 8 PBL 인터뷰 PR이 성공 지표를 충족하는지 검증해줘"

localhost 동작 OK면 → PR Squash and Merge → 새 세션 session-08.
────────────────────────────────────────
```
