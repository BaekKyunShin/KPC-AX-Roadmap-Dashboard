# Session 05b — Step 6.5: 로드맵 양식 정합성 보강

## 세션 목표
마스터 계획서 §4의 **Step 6.5** (M, 12 Task) 수행. Step 5·6에서 누락된 산인공 양식 1번 필드·구조를 **HWPX 자동 생성 전**에 반드시 보강한다.

### 배경
Step 5·6 PR 머지 후 산인공 양식 1번(`docs/references/1.AI훈련로드맵 컨설팅 보고서(양식).pdf`, 3~12p)과 1:1 대조 결과 아래 격차 확인:
1. **인터뷰 Ⅰ장(수립 필요성·수립 주요 결과) 전체 누락** — Step 5에 미반영
2. **결과물 Ⅲ-1 NCS 방법 박스** — 양식은 "표 전체 단위 별도 박스 2개"인데 Step 6은 "각 역량 행마다 개별 필드"로 잘못 구현
3. **결과물 Ⅲ-2 훈련체계 수립 방법 텍스트 박스** 누락
4. 역량 모델링 부제 라벨 (수행준거·학술, 업무지식·기능) 미반영
5. 훈련과정 명세서 교과목 표 부제 "(단원, 과제명)" 미반영
6. Ⅰ장 데이터(수립 필요성·AI역량 수준·선정 과업·수립 주요내용 요약) 결과 화면에 미노출

Step 7 HWPX 생성은 위 데이터가 있어야 양식 그대로 출력 가능하므로 **본 Step이 Step 7의 선행 조건**.

## 사전 조건
- Step 5·6 모두 머지 완료 (`feature/ofa-05`, `feature/ofa-06` 브랜치가 `feature/official-form-alignment`에 통합됨).
- `feature/official-form-alignment` 최신.
- `npm run validate && npm run build` baseline 통과.

## 실행 모드
**subagent-driven-development** — 12 Task. 타입·스키마·prompt-engineer·UI 컴포넌트·페이지 통합·E2E 분리.

## 호출 스킬·MCP·서브에이전트
- `superpowers:subagent-driven-development`
- `prompt-engineer` 서브에이전트 (Task 7: LLM 프롬프트에 신규 필드 지시)
- `check-server-action`, `frontend-guide`, `composition-patterns`, `react-best-practices`, `refactoring`
- `serena` MCP (symbol rename·참조 탐색)
- `superpowers:test-driven-development`

## 예상 소요
**4~6시간**

## 성공 지표
- [ ] `src/lib/schemas/interview-roadmap.ts`에 `overviewSchema` 추가 (establishment_necessity·ai_competency_level·selected_tasks_summary·roadmap_summary·hrd_report_attachment_url).
- [ ] `src/lib/constants/interview-steps-roadmap.ts` "개요" 스텝 추가 (5 → 6스텝).
- [ ] `src/lib/services/roadmap/roadmap-types.ts` 신규 3필드(`setup_necessity`·`outcome_summary`·`training_structure_method`) + 루트 NCS 필드(`ncs_used`·`ncs_methodology`·`ncs_derivation_method`) + `RoadmapCompetency`에서 개별 NCS 필드 제거.
- [ ] Zod validator·schema 신규 필드 + 정합성 규칙(ncs_used refine) 반영 + 테스트 통과.
- [ ] `roadmap-storage-mapper.ts` type guard 확장 (legacy 데이터 호환).
- [ ] `roadmap-prompts.ts`에 신규 필드 출력 지시 반영 (prompt-engineer 서브에이전트 결과).
- [ ] `roadmap-matrix-builder.ts`에 `buildTrainingStructureTable()` 변환 함수 추가 (매트릭스 → 단순 6열 표, HWPX/PDF 출력용).
- [ ] 인터뷰 "개요" 스텝 컴포넌트 `StepOverview.tsx` 신규 (RTL 테스트 통과).
- [ ] `CompetencyModelingTable.tsx` 부제 라벨 반영 + 개별 NCS 필드 제거.
- [ ] `NcsMethodologyBox.tsx` 신규 (ncs_used 토글 + 활용/도출 방법 텍스트 박스).
- [ ] `RoadmapMatrix.tsx` 매트릭스 아래 "훈련체계 수립 방법" 섹션 추가.
- [ ] `CourseSpecCard.tsx` 교과목 표 "세부 내용 (단원, 과제명)" 부제.
- [ ] `ConsultantRoadmapClient.tsx`·`OpsRoadmapClient.tsx` 상단에 **Ⅰ장 요약 블록** (수립 필요성·AI 역량 수준 뱃지·선정 과업·수립 주요내용).
- [ ] 전체 테스트 회귀 0 + E2E (`e2e/consultant/consultant-roadmap.spec.ts`, `consultant-interview.spec.ts`) 갱신·통과.
- [ ] PR `feat(ofa-06.5): 로드맵 양식 정합성 보강` 생성.

## 다음 세션 이동 조건
- PR 머지 완료. 다음 → `session-06-step7-roadmap-hwpx.md`.

---

## 복사용 프롬프트

```
=== 컨텍스트 ===
- 프로젝트: KPC AI 훈련 로드맵 대시보드 (/Users/baekkyunshin/Desktop/AI-roadmap-dashboard)
- 마스터 계획서: docs/plans/archive/2026-04-14-official-form-alignment.md
- OFA 프로젝트 **5b번째 세션** (Step 5·6 사후 보강) — Step 1·2·3·4·5·6 모두 머지된 상태
  - Step 5: 로드맵 인터뷰 5스텝 (Ⅱ장만) — 본 세션에서 Ⅰ장 추가로 6스텝화
  - Step 6: 로드맵 산출물 4섹션 (Ⅲ장) — 본 세션에서 NCS 박스·수립 방법·부제 라벨·Ⅰ장 요약 추가
- 본 세션: Step 6.5 (M, 12 Task) — 산인공 양식 1번 1:1 정합성 보강. Step 7(HWPX) 선행 조건

=== 사전 검증 (반드시 첫 번째로 실행) ===
1. cd /Users/baekkyunshin/Desktop/AI-roadmap-dashboard
2. git fetch origin && git checkout feature/official-form-alignment && git pull
3. git log --oneline -10           → ofa-05·ofa-06 머지 커밋 확인
4. ls src/lib/schemas/interview-roadmap.ts src/lib/constants/interview-steps-roadmap.ts  → Step 5 결과
5. ls src/lib/services/roadmap/roadmap-types.ts src/lib/services/roadmap/roadmap-storage-mapper.ts  → Step 6 결과
6. ls src/components/roadmap/CompetencyModelingTable.tsx src/components/roadmap/RoadmapMatrix.tsx src/components/roadmap/CourseSpecCard.tsx  → Step 6 UI
7. ls docs/references/1.AI훈련로드맵*.pdf  → 양식 1번 원본 (3~12p 정독 대상)
8. npm run validate                → baseline pass

검증 실패 시 즉시 중단.

=== 필수 사전 정독 ===
> 계획서 해당 섹션의 정확한 줄 위치는 `grep -n '^## 0\.\|^### 3-4\.\|^### Step 6.5:\|^### Step 7:' docs/plans/archive/2026-04-14-official-form-alignment.md` 로 헤더 재확인.

- 계획서 §0: 안전장치
- 계획서 §3-4: UI/UX 재사용 원칙 (모든 신규 컴포넌트 준수)
- 계획서 §4 Step 6.5: 본 세션 12 Task + 양식 1번 1:1 대조표
- docs/references/1.AI훈련로드맵 컨설팅 보고서(양식).pdf (3~12p):
  - 3p: Ⅰ-1 수립 필요성(5줄 텍스트) + Ⅰ-2 주요 활동(수행 차수 자동 집계 표)
  - 4p: Ⅰ-3 AI훈련로드맵 수립 주요 결과(AI 역량 수준 체크 + 선정 과업 + 수립 주요내용 요약)
  - 5p: Ⅱ-1 기업 AI 역량 수준 진단(HRD이음 자동 첨부)
  - 6p: Ⅱ-2 기업 요구분석 4필드 + Ⅱ-3 과업·워크플로우 분석표 6열
  - 7p: Ⅱ-4 훈련대상 과업 선정 (과업·선정사유·As-Is·To-Be)
  - 8~9p: Ⅲ-1 역량 모델링 표(역량명·역량 정의(수행준거)·지식(학술,업무지식)·기술(기능)·태도) + NCS 활용 방법 박스(표 전체 단위 1개) + 역량별 도출 방법 박스(표 전체 단위 1개, NCS 미활용 시)
  - 10p: Ⅲ-2 훈련체계도 단순 표(구분·훈련수준·훈련내용·훈련대상·훈련방법·훈련목표) + 훈련체계 수립 방법 박스 / Ⅲ-3 연간 훈련계획 훈련과정 목록 표(구분·훈련과정명·훈련형태·훈련시간·비고)
  - 11p: Ⅲ-3 활용방안 / Ⅲ-4 훈련과정 명세서(과정명·훈련 형태·추천 훈련사업·훈련 목표·주요 훈련 내용·훈련 대상 + 교과목명·세부 내용(단원, 과제명)·훈련시간)
  - 12p: Ⅲ-4 명세서 2·3번째

=== 핵심 자산 요약 ===
- Step 5·6 결과물 위에 "보강"만 수행 — 기존 인터페이스 시그니처는 최대한 유지 + 신규 필드만 추가
- DB 스키마 변경·마이그레이션 신규 추가 **금지**. jsonb 내부 구조만 확장 (storage-mapper 갱신으로 해결)
- RoadmapCompetency에서 NCS 개별 필드 제거 → 루트로 이동 → 호환성을 위해 storage-mapper의 fromRoadmapVersionColumns에서 legacy 데이터의 역량별 NCS를 읽어 루트로 승격하는 fallback 추가 권장
- 로드맵 인터뷰 5스텝 → 6스텝 (맨 앞에 "개요" 삽입). 기존 draft에도 Ⅰ장 빈 값 기본값 제공
- 매트릭스 UI는 유지, 출력 전용(HWPX/PDF) 단순 표 변환 함수 신규 (Step 7이 사용)

진행 원칙:
1. feature/ofa-06.5-form-compliance 브랜치
2. Task 2: 인터뷰 스키마에 overviewSchema 추가 (establishment_necessity·ai_competency_level enum(BEGINNER/INTERMEDIATE/ADVANCED)·selected_tasks_summary·roadmap_summary·hrd_report_attachment_url)
3. Task 3: interview-steps-roadmap.ts에 "개요" 스텝 삽입 (1번 위치) — 기존 스텝 id shift 주의 + 테스트 갱신
4. Task 4: StepOverview.tsx RTL (라디오 3개 + 부제 "(AI기초형)", "(AI탐구형)", "(AI활용형·선도형)")
5. Task 5: roadmap-types.ts 재구성 — LLMRoadmapResult에 신규 3필드 + 루트 NCS 필드 추가. RoadmapCompetency에서 ncs_* 제거
6. Task 6: Zod validator·schema 갱신 (refine: ncs_used=true → ncs_methodology 필수, false → ncs_derivation_method 필수)
7. Task 7: Agent(subagent_type:"prompt-engineer") 디스패치. LLM 프롬프트에 신규 출력 필드 지시. setup_necessity와 outcome_summary.ai_competency_level은 LLM이 재창작하지 않고 인터뷰 입력값을 그대로 복사하도록 명시
8. Task 8: roadmap-storage-mapper.ts type guard 확장 (isCompetency에서 ncs_* 필드 선택적 허용 → 루트로 승격. asFilteredArray 안전 변환). roadmap-generator.ts에서 buildUserPrompt에 overview 데이터 주입
9. Task 9: roadmap-matrix-builder.ts에 buildTrainingStructureTable() 추가. 기존 buildTrainingStructureMatrix는 UI 매트릭스용으로 유지
10. Task 10: UI 보강 (병렬 서브에이전트 디스패치 가능):
   - CompetencyModelingTable.tsx: 부제 라벨 "(수행준거)", "(학술, 업무지식)", "(기능)" 추가. 각 역량 행에서 ncs_used·methodology·derivation_method 열 제거
   - NcsMethodologyBox.tsx 신규: ncs_used 토글 1개 + 단일 textarea(활용 시 "NCS 활용 방법", 미활용 시 "역량별 도출 방법"). canEdit + onChange
   - RoadmapMatrix.tsx 하단에 "훈련체계 수립 방법" textarea(canEdit=false 시 읽기 전용) 섹션
   - CourseSpecCard.tsx 교과목 표 헤더 "세부내용" → "세부 내용 (단원, 과제명)"
   - ConsultantRoadmapClient.tsx·OpsRoadmapClient.tsx: 탭 위 헤더 영역에 **Ⅰ장 요약 블록** (수립 필요성·AI 역량 수준 뱃지·선정 과업·수립 주요내용 4필드). 기존 diagnosis_summary 블록은 유지 또는 outcome_summary.main_content로 대체
   - NcsMethodologyBox를 CompetencyModelingTable 섹션 하단에 배치
11. Task 11: E2E 갱신
   - e2e/consultant/consultant-interview.spec.ts: 개요 스텝 렌더·입력·필수 검증
   - e2e/consultant/consultant-roadmap.spec.ts: Ⅰ장 요약 블록 + NCS 박스 + 훈련체계 수립 방법 표출 확인
12. Task 12: 검증·커밋·PR (npm run validate && npm run build && npm run test:e2e)

=== 자동 진행 vs 승인 요청 경계 ===
- 자동 진행: 12 Task 전체.
- 승인 요청 (즉시 중단):
  - RoadmapCompetency에서 NCS 필드 제거가 역량별 편집 UX를 크게 해치는 경우 (사용자 의견 필요)
  - 인터뷰 스텝 6개화가 작성 흐름을 너무 복잡하게 만든다고 판단될 때 (개요를 마지막에 배치 vs 맨 앞 배치 재논의)
  - prompt-engineer 결과가 기존 로드맵 생성 품질을 저해할 때
  - legacy 데이터(Step 6 이전 생성된 로드맵)가 storage-mapper 확장에서 예상 밖 케이스 다수 발생 시
  - 매트릭스 → 단순 표 변환에서 셀 병합·정렬 이슈가 발생해 Step 7 HWPX 템플릿 구조와 불일치할 때

=== Task 종료 보고 양식 ===
✅ Task N 완료
- 신규/변경 파일: 1~3개
- TDD/RTL 결과
- 다음 Task

=== 금지 사항 ===
- DB 마이그레이션 신규 추가 (jsonb 내부만 확장)
- Step 5·6에서 확정된 외부 시그니처(generatePDF·generateXLSX·fetchRoadmapVersion 등) 변경
- 기존 legacy jsonb 데이터 손상 유발 (type guard로 안전 필터 후 빈 값 기본값 제공)
- 매트릭스 UI 폐기 (HWPX 출력 전용 표 변환 함수만 추가)
- RoadmapCompetency에서 NCS 개별 필드 제거 후 legacy row에서 데이터 손실 (storage-mapper에서 루트로 승격 fallback)

=== 종료 시 ===
1. superpowers:verification-before-completion (npm run validate && npm run build && npm run test:e2e)
2. E2E 결과 + 양식 1번 PDF와 화면 대조 캡처(선택) 보고
3. gh pr create --base feature/official-form-alignment --title "feat(ofa-06.5): 로드맵 양식 정합성 보강"
4. PR URL 보고. 자동 머지 금지.

=== 사용자에게 전달할 검증 안내 (세션 종료 시 반드시 출력) ===
────────────────────────────────────────
✅ Step 6.5 완료. PR URL: <url>

**사용자가 확인할 것** (예상 15분, localhost):

1. `npm run dev` → http://localhost:3000
2. 컨설턴트로 로그인 → 로드맵 트랙 프로젝트 → 인터뷰 화면
3. **인터뷰 6스텝 확인** (첫 번째 "개요" 스텝 신규):
   - 수립 필요성 textarea (5줄 가이드)
   - AI 역량 수준 라디오 3개 (초급(AI기초형)·중급(AI탐구형)·고급(AI활용형·선도형))
   - 선정 과업 / 수립 주요내용 요약 textarea
4. 개요 작성 후 나머지 5스텝 진행 → 제출 → 로드맵 생성
5. **로드맵 결과 화면 확인**:
   - 헤더에 **Ⅰ장 요약 블록** (수립 필요성·AI 역량 수준 뱃지·선정 과업·수립 주요내용)
   - 역량 모델링 표: 부제 라벨 "(수행준거)", "(학술, 업무지식)", "(기능)" 표시
   - 역량 표 **아래**에 **NCS 방법 박스 1개** (역량 행마다 X) — 토글로 "활용 방법" / "도출 방법" 전환
   - 훈련체계도 아래 **"훈련체계 수립 방법"** 텍스트 박스
   - 훈련과정 명세서 교과목 표 헤더: "세부 내용 (단원, 과제명)"
6. PDF·XLSX 다운로드 → 파일에도 Ⅰ장 요약·신규 필드 반영 확인

**저에게 질문으로 대체 가능**:
> "Step 6.5 PR이 양식 1번 1:1 정합성 체크리스트를 모두 충족하는지 검증해줘"

localhost 동작 OK면 → PR Squash and Merge → 새 세션 session-06 (Step 7 HWPX).
────────────────────────────────────────
```
