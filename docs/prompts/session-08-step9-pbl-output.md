# Session 08 — Step 9: PBL 산출물 신규 (양식 2번 Ⅳ·Ⅴ장 1:1 — LLM 생성·편집·버전관리·내보내기)

## 세션 목표
마스터 계획서 §4의 **Step 9** (XL, 20 Task) 수행. PBL 보고서의 LLM 생성·편집·버전관리·PDF/XLSX 내보내기를 `pbl_reports` 테이블 기반으로 신규 구축. **산인공 양식 2번 12~17p (Ⅳ·Ⅴ장 + 결과평가 4종 설문) 모든 필드 1:1 매칭 필수**.

## 사전 조건
- Step 2 (DB) 머지 — `pbl_reports`·`pbl_likes`·`pbl_report_status` ENUM·`finalize_pbl` RPC + 모든 audit ENUM 값.
- Step 8 (PBL 인터뷰) 머지 — PBL 인터뷰 데이터 입력 가능.
- `feature/official-form-alignment` 최신.

## 실행 모드
**subagent-driven-development** — 20 Task. 가장 큰 Step. 필요 시 2개 PR로 분할 검토(서비스 레이어 + UI 분리).

## 호출 스킬·MCP·서브에이전트
- `superpowers:subagent-driven-development`
- `prompt-engineer` 서브에이전트 (Task 4: PBL LLM 프롬프트)
- `check-server-action`, `frontend-guide`, `composition-patterns`, `react-best-practices`
- `serena` MCP (PDF/XLSX 신규 엔트리 추가 시 기존 export 모듈 심볼 탐색)
- `superpowers:test-driven-development`

## 예상 소요
**8~12시간** (XL 규모. 2일 분산 권장)

## 성공 지표
- [ ] `src/lib/services/pbl/` 6파일 (types/validator/prompts/generator/crud + index) + 각 `.test.ts` 통과.
- [ ] `pbl-types.ts`에 **양식 2번 Ⅳ·Ⅴ장 필드 1:1 매칭 타입** — PBLAIToolUsagePlanItem·PBLSubjectProfile(교과목 프로파일, 강사 투입시간 외부/내부 합=훈련시간)·PBLCourseEvaluation(수행수준 1~5)·PBLResultEvaluation(만족도 5/성취도 3/외부전문가 5/현업적용도 4 고정 문항)·PBLPerformanceAnalysis(훈련목표 카테고리 5종 체크) 등. enum은 양식 한글 그대로.
- [ ] `pbl-validator.ts`에 **양식 규칙 반영**: AI도구 활용계획 3단계 이상, 교과목별 강사 투입시간 합 = 훈련시간, 결과평가 설문 문항 수 고정 (5/3/5/4), 훈련목표 카테고리 enum.
- [ ] `pbl-crud.ts`의 `finalizePBL`이 `finalize_pbl` RPC 호출 (Step 2에서 미리 추가됨).
- [ ] PBL Server Actions 5종 + 운영자용 별도 actions 파일 + 모든 테스트 통과.
- [ ] UI 컴포넌트 6종 (`PBLOverview`·`PBLTrainingTargets`·`PBLToolUsagePlan`·`PBLTrainingPlan`·`PBLEvaluationPlan`·`PBLPerformanceMetrics`) + 테스트.
- [ ] `ConsultantPBLClient.tsx` + `OpsPBLClient.tsx` + page/layout/loading + Skeleton.
- [ ] PDF/XLSX PBL 버전: `generatePBLPDF(data: PBLExportData): Promise<Blob>`, `generatePBLXLSX(data: PBLExportData): Promise<Uint8Array>`. 기존 `generatePDF`·`generateXLSX`는 건드리지 않음.
- [ ] `index.ts` 배럴 export에 신규 엔트리 포함.
- [ ] PBL_DRAFTED 상태 전환 로직 (Server Action에서 update).
- [ ] `e2e/consultant/pbl-output.spec.ts` 통과.
- [ ] 양식 2번 12~17p QA 체크리스트(계획서 §4 Step 12) Ⅳ·Ⅴ장 전 항목 통과.
- [ ] PR `feat(ofa-09): PBL 산출물 신규` 생성 (필요 시 09a/09b 분할).

## 다음 세션 이동 조건
- PR 머지 완료. 다음 → `session-09-step10-pbl-hwpx.md`.

---

## 복사용 프롬프트

```
=== 컨텍스트 ===
- 프로젝트: KPC AI 훈련 로드맵 대시보드 (/Users/baekkyunshin/Desktop/AI-roadmap-dashboard)
- 마스터 계획서: docs/plans/2026-04-14-official-form-alignment.md
- OFA 프로젝트 **여덟 번째 세션** — Step 1·2·3·4·5·6·7·8 모두 머지된 상태
  - Step 2: pbl_reports·pbl_likes 테이블, finalize_pbl RPC, audit ENUM 9개 모두 추가됨 (마이그 061)
  - Step 8: PBL 인터뷰 8스텝 + interviews.pbl_data 입력 가능
- 본 세션: Step 9 (XL, 20 Task) — 가장 큰 Step. PBL 산출물(LLM 생성·편집·버전관리·PDF/XLSX 내보내기) 신규
- 분할 옵션: 필요 시 ofa-09a (서비스 레이어 7 Task) + ofa-09b (UI/내보내기 13 Task)로 PR 분할

=== 사전 검증 (반드시 첫 번째로 실행) ===
1. cd /Users/baekkyunshin/Desktop/AI-roadmap-dashboard
2. git fetch origin && git checkout feature/official-form-alignment && git pull
3. git log --oneline -10           → ofa-08 머지 커밋 확인
4. mcp__supabase__list_tables({schemas:['public']})  → pbl_reports·pbl_likes 존재 확인
5. mcp__supabase__execute_sql({query: "SELECT proname FROM pg_proc WHERE proname='finalize_pbl'"})  → RPC 존재 (이름은 finalize_pbl, atomic_ 접두사 없음)
6. mcp__supabase__execute_sql({query: "SELECT enumlabel FROM pg_enum WHERE enumtypid='audit_action'::regtype AND enumlabel LIKE 'PBL_%'"})  → PBL_* enum 값 5개 확인
7. mcp__supabase__execute_sql({query: "SELECT enumlabel FROM pg_enum WHERE enumtypid='pbl_report_status'::regtype"})  → DRAFT/FINAL/ARCHIVED
8. ls src/lib/schemas/interview-pbl.ts  → Step 8 결과 (PBL 인터뷰 스키마)
9. ls src/lib/services/roadmap/  → 평행 구조 참조용 (roadmap-crud/generator/prompts/validator/types/sanitize/matrix-builder/storage-mapper/stt-formatter/time-utils)
10. ls src/lib/services/export/pdf/ src/lib/services/export/xlsx/  → 기존 export 모듈 (Step 6 4섹션 분할 렌더러 구조: pdf-cover/competency/structure/annual/coursespec-renderer + xlsx-sheet-builder)
11. ls src/components/roadmap/shared/  → **Step 6.5에서 추출된 공용 디자인 키트** 존재 확인 (TableTextCell/TableInlineCell/TableNumericCell/SyncedTableRow/SectionNumberBadge + table-styles + index.ts)
12. ls src/components/roadmap/RoadmapStatusBadge.tsx src/components/roadmap/VersionSelector.tsx src/components/roadmap/RegenerateAccordion.tsx src/components/roadmap/RoadmapOverviewSummary.tsx src/components/roadmap/NcsMethodologyBox.tsx  → Step 6/6.5 핵심 UI 자산(패턴 참고용)
13. ls src/hooks/useRowHeightSync.ts src/components/ui/auto-resize-textarea.tsx  → Step 6.5 공용 훅·컴포넌트
14. grep -c pbl_data src/app/\(dashboard\)/consultant/projects/\[id\]/interview/actions.ts  → Step 8에서 pbl_data 저장 경로 확인 (>0)
15. npm run validate              → baseline pass

검증 실패 시 즉시 중단. Step 2·8 미머지면 차단. 공용 디자인 키트 누락 시 Step 6.5 머지 재확인.

=== 필수 사전 정독 ===
- 계획서 §0·§3-4
> 계획서 해당 섹션의 정확한 줄 위치는 `grep -n '^## 0\.\|^### 3-4\.\|^### Step 9:' docs/plans/2026-04-14-official-form-alignment.md` 로 헤더 재확인.

- 계획서 §4 Step 9: 본 세션 20 Task + 평행 구조 + UI 6종 + **양식 2번 Ⅳ·Ⅴ장 필드 정밀 정의**
- src/lib/services/roadmap/* 전체 — 평행 구조 패턴
- src/lib/services/export/pdf/index.ts·xlsx/index.ts — 배럴 export 패턴
- src/lib/services/export/pdf/pdf-generator.ts — generatePDF 시그니처 참조
- **docs/references/2.AI PBL 과정개발보고서 및 결과보고서(양식).pdf 12~17p 전 페이지 정독 필수**:
  - 12p: Ⅳ-1 훈련 목표 / Ⅳ-2 AI 도구 활용 계획 (단계·주요활동·AI도구·활용데이터·활용목적·구체적 활용방법)
  - 13p: Ⅳ-3 훈련 실시 계획 가(과정 개요)·나(학습그룹 훈련강사 외부/내부·훈련생)·다(훈련 교과목 프로파일 — 업무(단원)명·세부 내용·훈련시간·강사 투입시간 외부/내부·평가방법)
  - 14p: Ⅳ-3 훈련 교과목 프로파일 작성 가이드 + 라(시설·장비) + 마(훈련강사)
  - 15p: Ⅳ-4-가 과정평가 (평가방법 포트폴리오/문제해결시나리오/작업장 평가·평가대상·평가일자·평가기준·수행 수준 1~5·총평·평가척도 5단계 고정 설명)
  - 16p: Ⅳ-4-나 결과평가 만족도 5문항·성취도 3문항 (온라인 설문, 훈련 종료 직후)
  - 17p: Ⅳ-4-나 결과평가 외부전문가 만족도 5문항·현업적용도 4문항 (훈련 종료 이후 1개월 내외)
  - 18p: Ⅴ-1 성과분석 측정 지표 (훈련목표 체크·정량·정성) / Ⅴ-2 성과 확산 전략 (내재화 방안·전사 확산 방안)

=== 핵심 자산 요약 ===
- src/lib/services/pbl/는 src/lib/services/roadmap/와 평행 구조 (6 파일: types/validator/prompts/generator/crud + index)
- pbl_reports + pbl_likes + finalize_pbl RPC 모두 Step 2 마이그 061에서 완료
- audit_action enum 값(PBL_REPORT_CREATED·FINALIZED·SHARED·HWPX_EXPORTED)도 마이그 061 완료
- interviews.pbl_data JSONB 컬럼(마이그 063)을 PBL 생성 입력으로 사용. **interviews.answers(레거시)·roadmap_data와 격리**
- src/components/pbl/PBLStatusBadge.tsx 신규 (src/components/roadmap/RoadmapStatusBadge.tsx 패턴)
- **Step 6.5 공용 디자인 키트 (반드시 재사용)**:
  - import: `@/components/roadmap/shared` (배럴 export)
  - 제공: TableTextCell·TableInlineCell·TableNumericCell·SyncedTableRow·SectionNumberBadge + TABLE_CELL_TEXT_CLASS·TABLE_CELL_INLINE_CLASS·READ_ONLY_TEXT_CLASS·CARD_HEADER_CLASS 상수
  - 용도: PBL 교과목 프로파일·AI도구 활용계획·시설/장비·수행수준 표 전부
- **Step 6.5 UI 컨벤션**: AutoResizeTextarea(src/components/ui/auto-resize-textarea.tsx) + useRowHeightSync(src/hooks/useRowHeightSync.ts)로 같은 행 textarea 높이 동기화
- **Step 6.5 레이아웃**: 사이드바 제거 → VersionSelector + RegenerateAccordion + 풀 너비. ConsultantPBLClient도 동일 레이아웃. 로드맵용 컴포넌트가 타입 제약으로 그대로 재사용 불가하면 PBL 전용 평행 복제(로드맵 컴포넌트 수정 금지)
- export PDF/XLSX는 기존 generatePDF·generateXLSX와 별도 신규 엔트리 generatePBLPDF·generatePBLXLSX (대문자 패턴 유지). 로드맵 PDF는 Step 6에서 4섹션 분할 렌더러 구조이므로, PBL도 pdf-pbl-overview/requirements/operation/performance-renderer.ts 분할 권장
- ConsultantPBLClient.tsx는 _components/ 안 (interview 컨벤션과 동일)
- 운영자용 별도 actions: src/app/(dashboard)/ops/projects/[id]/pbl/actions.ts (디렉터리 신설)
- **양식 2번 Ⅳ·Ⅴ장 불변 제약 (validator가 반드시 강제)**:
  - Ⅳ-2 AI 도구 활용 계획 단계 수 ≥ 3 (양식 예시 3단계)
  - Ⅳ-3-다 교과목 프로파일: 각 행 `external_hours + internal_hours === training_hours`, 전체시간 자동 집계
  - Ⅳ-4-가 과정평가 performance_level 1~5 정수
  - Ⅳ-4-나 결과평가 설문 문항 수 고정: 만족도 5 / 성취도 3 / 외부전문가 만족도 5 / 현업적용도 4 (양식 문항·순서 변경 금지, 응답은 리커트 1~5)
  - Ⅴ-1 training_goal_categories는 `'기술문제 해결'|'공정 최적화'|'불량률 감소'|'기술 매뉴얼 개발'|'기타'` enum만
- **평가척도 5단계 고정 설명**(pbl-types.ts PBLCourseEvaluation.evaluation_scale) — 양식 15p 하단 표 그대로 상수로 정의

진행 원칙:
1. feature/ofa-09-output-pbl 브랜치
2. Task 2~3 (types·validator) TDD. 신규 PBLContent·PBLAIToolUsagePlanItem·PBLTrainingPlan·PBLEvaluationPlan·PBLPerformanceMetrics·PBLDisseminationStrategy
3. Task 4: Agent(subagent_type:"prompt-engineer", ...) 디스패치. 산인공 양식 2번 Ⅳ·Ⅴ장. 출력 스키마 100% 준수, 단계 3개+, 교과목 3개+
4. Task 5~6 (generator·crud) TDD. finalizePBL은 finalize_pbl RPC 호출 (Step 2 마이그 061에서 추가). createDraftVersion·sharePBL·listVersions
5. Task 7 (Server Actions): 5종(generate/save/finalize/delete/toggleShare) + 운영자용 별도 ops/projects/[id]/pbl/actions.ts (디렉터리 신설). check-server-action 스킬 호출
6. Task 8~13 (UI 6종): 각각 fresh subagent + frontend-guide·composition-patterns·react-best-practices. §3-4 공통 UI 원칙 준수
7. Task 14~16 (오케스트레이터·페이지·운영자 뷰): ConsultantPBLClient + page/layout/loading.tsx Skeleton + OpsPBLClient
8. Task 17 (PDF/XLSX PBL 버전):
   - 신규 타입 PBLExportData
   - generatePBLPDF(data: PBLExportData): Promise<Blob>
   - generatePBLXLSX(data: PBLExportData): Promise<Uint8Array> + downloadPBLXLSX
   - 기존 generatePDF·generateXLSX 시그니처 유지 (절대 수정 X)
   - export/pdf/index.ts·export/xlsx/index.ts 배럴 export 추가
   - 공통 유틸(폰트·상수·헬퍼)은 그대로 재사용. 필요시 중립화 리팩터링
   - serena MCP로 안전 수정
9. Task 18 (상태 전환): generatePBLAction 성공 시 projects.status를 PBL_DRAFTED로. PBL_ELIGIBLE_STATUSES 활용
10. Task 19: e2e/consultant/pbl-output.spec.ts (test-automator 서브에이전트)

=== 자동 진행 vs 승인 요청 경계 ===
- 자동 진행: 20 Task. 서비스 레이어·UI·내보내기 자율.
- 승인 요청 (즉시 중단):
  - prompt-engineer 결과가 산인공 양식 일부 필드를 누락할 때
  - PBL 보고서 LLM 생성 시간이 사용자 인내 한계 초과(>30s)할 때 (스트리밍 또는 백그라운드 작업 검토)
  - PR 분할(09a + 09b) 결정 시
  - ConsultantPBLClient·ConsultantRoadmapClient 공통 base 컴포넌트 추출 결정 (큰 결정)
  - generatePDF·generateXLSX 시그니처 변경이 필요할 때 (절대 변경 불가 — 우회 방법 모색)
  - PBLExportData 타입이 RoadmapExportData와 호환 불가 부분이 너무 클 때

=== Task 종료 보고 양식 ===
✅ Task N 완료
- 신규/변경 파일: 1~3개
- TDD: RED→GREEN
- 다음 Task

=== 금지 사항 ===
- generatePDF·generateXLSX 시그니처 변경 (절대)
- 기존 roadmap-* 서비스 파일 수정 (PBL은 평행 신규)
- 기존 src/components/roadmap/* 수정 — 특히 Step 6.5 공용 키트(src/components/roadmap/shared/*) 및 RoadmapOverviewSummary·NcsMethodologyBox·VersionSelector·RegenerateAccordion은 **읽기만** (필요 시 PBL 평행 복제)
- 마이그레이션 신규 추가 (정리 마이그는 Step 12에서만)
- src/lib/services/pbl/ 외 위치에 PBL 서비스 코드 배치
- interviews.answers(레거시) 또는 interviews.roadmap_data를 PBL 입력으로 사용 (반드시 interviews.pbl_data JSONB만)

=== 종료 시 ===
0. **[필수] 전체 회귀 테스트 수행** — 모든 구현이 끝난 뒤 기존 기능 회귀 방지를 위해 반드시 실행. 건너뛰기 금지.
   - `npm run validate` (typecheck + lint + unit test 전체)
   - `npm run build` (프로덕션 빌드)
   - `npm run test:e2e` (E2E 전체)
   - 실패 시 원인 분석·수정 후 재실행. 우회·skip 금지.
1. superpowers:verification-before-completion
2. e2e/consultant/pbl-output.spec.ts 통과 보고
3. gh pr create --base feature/official-form-alignment --title "feat(ofa-09): PBL 산출물 신규" (또는 09a/09b 분할)
4. PR URL 보고. 자동 머지 금지.

=== 사용자에게 전달할 검증 안내 (세션 종료 시 반드시 출력) ===
────────────────────────────────────────
✅ Step 9 완료. PR URL: <url>

**사용자가 확인할 것** (예상 20분, localhost):

1. `npm run dev` → http://localhost:3000
2. 컨설턴트로 로그인 → Step 8에서 제출한 PBL 인터뷰 프로젝트 → "PBL 보고서 생성" 버튼
3. **PBL 보고서 양식 2번 Ⅳ·Ⅴ장 1:1 섹션 구조** 화면 확인:
   - 개요 (Ⅰ장 자동 인용) / 요구분석·훈련과제 도출 (Ⅱ·Ⅲ장 인용) / **Ⅳ-1 훈련 목표 / Ⅳ-2 AI 도구 활용 계획 (3단계 이상) / Ⅳ-3 훈련 실시 계획 (교과목 프로파일 강사투입시간 외부/내부 합 = 훈련시간 검증) / Ⅳ-4-가 과정평가 (포트폴리오/문제해결시나리오/작업장 평가 체크 + 수행수준 1~5) / Ⅳ-4-나 결과평가 (만족도 5·성취도 3·외부전문가 5·현업적용도 4 고정 문항) / Ⅴ-1 성과분석 지표 / Ⅴ-2 성과 확산 전략**
4. 섹션별 편집 동작 + 강사 투입시간 합 검증 (불일치 시 경고)
5. 최종 확정(Finalize) 버튼 → 상태 FINAL로 전환
6. PDF·XLSX 다운로드 → 파일 정상 열림
7. 갤러리에 공유 토글 → is_shared 반영

**저에게 질문으로 대체 가능**:
> "Step 9 PBL 산출물 PR이 성공 지표를 충족하는지 검증해줘"

localhost 동작 OK면 → PR Squash and Merge → 새 세션 session-09.
────────────────────────────────────────
```
