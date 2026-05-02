# AI PBL 양식 정합성 매트릭스 (R0)

- **작성일**: 2026-04-29
- **작성자**: Claude (R0 매트릭스 산출 작업자)
- **목적**: 양식(HWPX) ↔ 인터뷰 입력 ↔ 결과 페이지 ↔ HWPX 플레이스홀더 4중 정합성 비교 → R3 PR2(양식 정합성) 입력 자료
- **단일 진실 원천**: `docs/plans/2026-04-29-roadmap-review-findings.md`
- **대상**:
  1. PBL 자체 4중 정합성 (양식 2번 — AI PBL 과정개발보고서)
  2. 로드맵 검수 21건 결함 중 PBL 적용 여부 (#5·#10·#12·#14·#15·#17·#18·#20·#21·공통-A)

---

## 0. 작업 방법

### 양식 텍스트 추출

```bash
.venv-hwpx/bin/hwpx-text-extract "docs/references/2.AI PBL 과정개발보고서 및 결과보고서(양식).hwpx"
```

추출 결과는 사전 분석 문서 `docs/references/hwpx-structure-pbl.md` 와 일치 확인 (199 단락 · 68 표).

### 코드 비교 대상

| 위치 | 경로 |
|------|------|
| 인터뷰 입력 라우터 | `src/app/(dashboard)/consultant/projects/[id]/interview/page.tsx` (track === 'PBL' 분기) |
| 인터뷰 Client | `src/app/(dashboard)/consultant/projects/[id]/interview/_components/pbl/PBLInterviewClient.tsx` (9 스텝) |
| 인터뷰 Step 컴포넌트 | `src/app/(dashboard)/consultant/projects/[id]/interview/_components/pbl/Step*.tsx` (9개) |
| 결과 페이지 Client | `src/app/(dashboard)/consultant/projects/[id]/pbl/_components/result-v2/PBLResultClient.tsx` (5탭) |
| 결과 탭 컴포넌트 | `.../result-v2/TabPBLOverview.tsx` · `TabPBLAnalysis.tsx` · `TabPBLTasks.tsx` · `TabPBLOps.tsx` · `TabPBLOutcomes.tsx` |
| HWPX 플레이스홀더 매핑 | `api/hwpx/_placeholders_pbl.py` |
| HWPX 플레이스홀더 인벤토리 | `docs/references/hwpx-placeholders.json` (P-01 ~ P-29) |

### 검수 범위 안내

- findings.md 21건은 **컨설턴트 계정 + 로드맵 흐름**만 검수한 결과
- 본 매트릭스로 **PBL 측 결함 1차 식별** 수행 (실제 사용자 검수 미실행 — 코드·양식 비교 기준)
- "주의사항 1번" 의해 "수정 전 사용자 승인" 필수 → 본 매트릭스는 R3 입력 자료(체크리스트)로만 활용

### PBL 인터뷰 9 스텝 매핑 (코드 기준)

| Step | shortName | name | 컴포넌트 |
|------|-----------|------|----------|
| 1 | Ⅰ | 훈련과정 개요 | `StepOverview.tsx` |
| 2 | Ⅱ-1-가 | 기업 경영 이슈 | `StepCompanyIssues.tsx` |
| 3 | Ⅱ-1-나 | 조직 및 주요 업무 | `StepOrganization.tsx` |
| 4 | Ⅱ-2 | 훈련환경 분석 | `StepTrainingEnv.tsx` |
| 5 | Ⅱ-3-가 | HRD이음 PDF | `StepHrdReportPdf.tsx` |
| 6 | Ⅱ-3-나 | AI훈련과정 개발 필요성 | `StepCourseNecessity.tsx` |
| 7 | Ⅲ-1 | 수행활동 | `StepActivities.tsx` |
| 8 | Ⅲ-2 | 문제 도출·우선순위 | `StepProblems.tsx` |
| 9 | Ⅲ-3·4 | 훈련대상·AI수준 | `StepTargetAndLevel.tsx` |

> 주: 양식 Ⅳ(운영계획) · Ⅴ(성과분석)는 **인터뷰 입력 없음** → LLM 결과로만 생성 (결과 페이지 TabPBLOps · TabPBLOutcomes 의 placeholder 영역).

---

## 1. 전체 섹션 매핑 개요

양식 2번(AI PBL 과정개발 + 결과보고서) 목차 vs 코드 매핑:

| 양식 섹션 | 인터뷰 입력 | 결과 페이지 | HWPX 매핑 | 비고 |
|---|---|---|---|---|
| Ⅰ. 훈련과정 개요 | Step 1 (Ⅰ) | Tab Overview | P-02 (cell_fill 18 키) | 양식 신청서 자동표출 항목(주소·관할 등) 포함 |
| Ⅱ-1-가 기업 경영 이슈 | Step 2 (Ⅱ-1-가) | Tab Analysis · 첫 카드 | P-03 (single) | 박스 자유서술 |
| Ⅱ-1-나 조직 및 주요 업무 | Step 3 (Ⅱ-1-나) | Tab Analysis · 둘째 카드 | P-04 (repeat_rows) | OrganizationTree + mainWork 표 |
| Ⅱ-2 기업 훈련환경 분석 | Step 4 (Ⅱ-2) | Tab Analysis · 셋째 카드 | P-05 (cell_fill 6 키) | **인터뷰=자유서술 1개 / HWPX=6 셀 / 양식=12×7 표 — 3중 불일치** |
| Ⅱ-3 AI 과정개발의 필요성 (전체) | — | — | — | 양식 섹션 헤더만, 하위 가·나로 분할 |
| Ⅱ-3-가 기업HRD이음컨설팅 결과 | Step 5 (Ⅱ-3-가) | Tab Analysis · 넷째 카드 | P-06 (pdf_attach) | 양식: 자동표출 표 · 코드: PDF 첨부 |
| Ⅱ-3-나 AI훈련과정 개발 필요성 | Step 6 (Ⅱ-3-나) | Tab Analysis · 다섯째 카드 | P-07 (single) | 박스 자유서술 |
| Ⅲ-1 훈련과제 도출 수행활동 | Step 7 (Ⅲ-1) | Tab Tasks · 첫 카드 | P-08 (repeat_rows 13×6) | 양식 차수당 4행 확장 / 코드 차수당 1행(participants 4 person dict) |
| Ⅲ-2-가 문제 도출 (정의서) | Step 8 (Ⅲ-2-가) | Tab Tasks · 둘째 카드 | P-09 (repeat_rows 5×2) | **양식 5×2 = 구분(배경/핵심/범위/제약) × 내용 / 코드 = problems[] {title, description, impact} 자유 자료 — 의미 충돌** |
| Ⅲ-2-나 문제 우선순위 결정 | Step 8 (Ⅲ-2-나) | Tab Tasks · 셋째 카드 | P-10 (repeat_rows 6×7) | priority items × score(1-5) × selected |
| Ⅲ-3 훈련대상 업무 선정 및 분석 | Step 9 (Ⅲ-3) | Tab Tasks · 넷째~여섯째 카드 | P-11 + P-12 + P-13 | 양식 3분할(가·나·다) → 코드 단일 Step (target 객체) |
| Ⅲ-4 AI수준 진단 (가·나) | Step 9 (Ⅲ-4) | Tab Tasks · 일곱째~여덟째 카드 | P-14 + P-15 | currentAiLevel · expectedAiLevel 분리 |
| Ⅳ-1 훈련 목표 | — (LLM) | Tab Ops | P-16 (single LLM) | placeholder UI |
| Ⅳ-2 AI도구 활용 계획 | — (LLM) | Tab Ops | P-17 (repeat_rows 6×6) | placeholder UI |
| Ⅳ-3-가 훈련과정 개요 | — (LLM) | Tab Ops | P-18 (cell_fill) | placeholder UI |
| Ⅳ-3-나 학습그룹 구성 | — (LLM) | Tab Ops | P-19 (repeat_rows 6×6) | placeholder UI |
| Ⅳ-3-다 훈련 교과목 프로파일 | — (LLM) | Tab Ops | P-20 (cell_fill+repeat 15×10) | placeholder UI · 명시적 LLM 의존 |
| Ⅳ-3-라 시설·장비 | — (LLM) | Tab Ops | P-21 (repeat_rows 3×5) | placeholder UI |
| Ⅳ-3-마 훈련강사 | — (LLM) | Tab Ops | P-22 (repeat_rows 3×5) | placeholder UI |
| Ⅳ-4-가 과정평가 계획 | — (LLM) | Tab Ops | P-23 (cell_fill+repeat 16×9) | placeholder UI |
| Ⅳ-4-나 결과평가 계획 | — | **렌더 금지** | P-24 (static) | 만족도/성취도/외부전문가/현업적용도 양식 고정 |
| Ⅴ-1 성과분석 측정 지표 | — (LLM) | Tab Outcomes | P-25 (static) | placeholder UI · 양식 원문만 |
| Ⅴ-2 성과 확산 전략 | — (LLM) | Tab Outcomes | P-26 (static) | placeholder UI · 양식 원문만 |
| [결과보고서] 1.학습활동~4.훈련결과(가~바) | — | **렌더 금지** | P-27 ~ P-29 | 양식 고정 + 표지 메타 cell_fill |

---

## 2. 항목별 4중 비교 매트릭스

### 2.1 Ⅰ. 훈련과정 개요

| 위치 | 항목명 | 작성안내 | 작성예시 | 비고 |
|------|--------|----------|----------|------|
| 양식 | Ⅰ. 훈련과정 개요 (15×5 표) | "(기업명/사업장관리번호/주요 업종/주소/훈련실시주소/관할 지부·지사) 신청서 기준으로 자동 불러옴 처리되며, 내용 수정이 불가" | 없음 (표 자체에 입력 필드) | 신청서 자동 표출 vs 인터뷰 입력 혼재 |
| 인터뷰 | "Ⅰ 훈련과정 개요" `StepOverview.tsx` | "기업 기본 정보와 훈련과정 기본 속성을 입력합니다. 신청서에서 자동 불러오는 항목(주소·관할 등)은 결과 화면에서 별도 바인딩됩니다." | ExampleAccordion 4 bullet | 양식 작성 가이드 한 줄과 의미 다름 (양식: 자동표출 결과 / 코드: 입력 안내) |
| 결과 | TabPBLOverview · 단일 SectionCard "Ⅰ. 훈련과정 개요" | 8행 FormTable (기업명/훈련과정명/NCS/훈련시간/훈련대상/훈련형태/훈련기간/사업쟁점) | InlineEditField (DRAFT 편집) | **양식 15필드 vs 결과 8필드 — 신청서 자동표출 7필드(사업장관리번호/업종/업종코드/주소/훈련실시주소/관할/담당자 5필드) 결과 화면 미렌더** |
| HWPX | P-02 cell_fill 18 키 | — | — | 결과 페이지에 없는 필드도 HWPX 에는 포함됨 |

**결함 후보:**
- **PBL-자체-01** 결과 페이지에 신청서 자동표출 7필드(사업장관리번호·업종·업종코드·주소·훈련실시주소·관할·담당자 정보) 미렌더 → HWPX 다운로드 시 "메타가 어디서 채워지는지" 사용자 미확인. 양식·HWPX 18키 vs 결과 8키 정합성 갭.

### 2.2 Ⅱ-1-가 기업 경영 이슈

| 위치 | 항목명 | 작성안내 | 작성예시 | 비고 |
|------|--------|----------|----------|------|
| 양식 | Ⅱ-1 기업 현황 분석 > 가. 기업 경영 이슈 (1×1 + 2×2) | "(작성방법) 기업담당자와의 인터뷰를 통해 기업의 내·외부 환경에 대해 파악하고 기업이 마주한 어려움이 무엇인지를 작성함. (예. ..." | 양식에 인용된 실제 작성 예시 ("재고 자동화 시스템에 대한 …" 형태) 포함 | 양식: 작성방법 + 예시 1건 |
| 인터뷰 | "Ⅱ-1-가 기업 경영 이슈" `StepCompanyIssues.tsx` | "훈련과정을 둘러싼 기업의 최근 경영 이슈를 인터뷰 청취한 그대로 서술합니다." | ExampleAccordion 3 bullet (작성팁) | **양식 작성안내 핵심 문구 "기업담당자와의 인터뷰를 통해 …" 누락 (#5 패턴)**. 작성예시 미게재 (#공통-A 패턴) |
| 결과 | TabPBLAnalysis · "Ⅱ-1-가 기업 경영 이슈" SectionCard | InlineEditField (multiline) | — | 박스 1개 |
| HWPX | P-03 single `{{pbl_analysis_company_issues}}` | — | — | 정상 매핑 |

### 2.3 Ⅱ-1-나 조직 및 주요 업무

| 위치 | 항목명 | 작성안내 | 작성예시 | 비고 |
|------|--------|----------|----------|------|
| 양식 | Ⅱ-1 > 나. 조직 및 주요 업무 + "조직도" + 2×2 안내 | "공정분석 대신 조직도를 기반으로 업무 현황을 파악함. NCS 능력단위(요소) DB를 활용하여 부서(팀)별 업무를 작성함. ☞ 훈련 …" | 6×3 표에 ☑ + 부서(팀)명 + 업무명(부서명) + 예시 행 3건 (제품생산직무·제품품질관리·자재관리) | 양식: 자동 NCS DB 활용 안내 |
| 인터뷰 | "Ⅱ-1-나 조직 및 주요 업무" `StepOrganization.tsx` | "기업 조직도를 재귀 트리로 입력하고, 부서별 주요 업무를 표로 풀어 씁니다." | ExampleAccordion 3 bullet | **양식 핵심 문구 "공정분석 대신 조직도", "NCS 능력단위(요소) DB 활용" 누락 (#5 패턴)**. 양식 예시 행 3건 미게재 (#공통-A 패턴) |
| 결과 | TabPBLAnalysis · "Ⅱ-1-나 조직 및 주요 업무" SectionCard | OrganizationTree readOnly + FormTable (부서/역할/주요 업무 설명) | — | 표 형태 정돈됨 |
| HWPX | P-04 repeat_rows `{{pbl_analysis_organization_{i}_{field}}}` (max_items=5, col 1=department_name, col 2=tasks) | — | — | 양식 6×3 → max_items=5 |

### 2.4 Ⅱ-2 기업 훈련환경 분석

| 위치 | 항목명 | 작성안내 | 작성예시 | 비고 |
|------|--------|----------|----------|------|
| 양식 | 2. 기업 훈련환경 분석 (12×7 표) | "1. '훈련 대상자 특성'은 훈련업무를 수행하는 직원들의 특징 기술 2. '훈련 여건'은 훈련과정 개발·운영을 위해 활용 가능한 …" | 양식 표 자체가 예시 (적정 훈련시간/장소(사내/사외)/사내 강사/직위·이름·직무경력 등 12행) | 양식: 12×7 정형 표 |
| 인터뷰 | "Ⅱ-2 기업 훈련환경 분석" `StepTrainingEnv.tsx` | "훈련시간·장소·AI인프라·참여자 특성 등 훈련환경을 요약 서술합니다." | ExampleAccordion 5 bullet (적정 훈련시간/훈련장소/AI인프라/참여자 특성/Ⅱ-3 분리 안내) | **양식 12×7 정형 표 → 코드 자유서술 1개 박스로 단순화 — 형식 불일치 (PBL-자체-02 후보)**. 양식 작성가이드 핵심 "훈련 대상자 특성", "훈련 여건" 분류 누락 (#5 패턴) |
| 결과 | TabPBLAnalysis · "Ⅱ-2 기업 훈련환경 분석" SectionCard | InlineEditField (multiline) — 자유서술 1개 박스 | — | 표 미렌더 |
| HWPX | P-05 cell_fill 6 키 (`internal_status`/`external_status`/`internal_capability`/`external_capability`/`internal_facility`/`external_facility`) | — | — | **단일 trainingEnv 자유서술 → 6 셀 분배 로직 불명. P-05 fallback 미정의 → HWPX 출력 시 6 셀 모두 공란 가능성 (#20 패턴 PBL 적용)** |

### 2.5 Ⅱ-3-가 HRD이음 컨설팅 결과 PDF

| 위치 | 항목명 | 작성안내 | 작성예시 | 비고 |
|------|--------|----------|----------|------|
| 양식 | "가. 기업HRD이음컨설팅 결과(전산 자동 표출)" + 8×8 + 4×4 표 | (작성가이드 명시 안 됨 — 자동표출) | 표 자체가 자동 결과 (훈련 실시 이력·지원 이력·추천훈련사업 1~3순위) | 양식: 시스템이 PDF 자동 출력 |
| 인터뷰 | "Ⅱ-3-가 HRD이음컨설팅 결과 PDF 첨부" `StepHrdReportPdf.tsx` | "HRD이음 컨설팅 결과 보고서(PDF) 를 업로드하면 본문이 자동 추출되어 LLM 분석에 활용됩니다. (선택 첨부)" | ExampleAccordion 4 bullet (1건만/자동 추출/10MB/Ⅱ-3-나 작성 강제) | **양식: "전산 자동 표출" → 코드: 사용자가 PDF 직접 첨부**. 항목명·실행 방식 자체가 양식과 다름 (#10 패턴 PBL 적용 가능) |
| 결과 | TabPBLAnalysis · "Ⅱ-3-가 HRD이음 컨설팅 결과 보고서" SectionCard | iframe + ExternalLink | — | PDF 미리보기 |
| HWPX | P-06 pdf_attach `{{pbl_analysis_hrd_report_attachment}}`, fallback="별도 작성 불요 (HRD이음 보고서 미첨부)" | — | — | URL→안내문구 치환 후 출력 |

### 2.6 Ⅱ-3-나 AI훈련과정 개발 필요성

| 위치 | 항목명 | 작성안내 | 작성예시 | 비고 |
|------|--------|----------|----------|------|
| 양식 | "나. AI훈련과정 개발 필요성" + 1×1 + 2×2 안내 | "1. 기업HRD이음컨설팅에서 제시된 결과와 연계하여 작성 필요 2. 기업HRD이음컨설팅 외에도 'Ⅱ. 훈련 요구분석' 및 기업관계자 면담 …" | (예시 직접 인용 안됨 — 작성 가이드만) | 양식 강조: HRD이음 결과와 연계 |
| 인터뷰 | "Ⅱ-3-나 AI훈련과정 개발 필요성" `StepCourseNecessity.tsx` | "AI훈련과정 신규 개발의 근거를 서술합니다. HRD이음 보고서 PDF 가 없을 때는 반드시 작성해야 합니다." | ExampleAccordion 3 bullet (Ⅱ-2 연결/PDF 없을 때 필수/5줄 권장) | **양식 핵심 "기업HRD이음컨설팅에서 제시된 결과와 연계" 문구 누락 (#5 패턴)** |
| 결과 | TabPBLAnalysis · "Ⅱ-3-나 AI훈련과정 개발 필요성" SectionCard | InlineEditField (multiline) | — | 박스 1개 |
| HWPX | P-07 single `{{pbl_analysis_course_necessity}}` | — | — | 정상 매핑 |

### 2.7 Ⅲ-1 훈련과제 도출 수행활동

| 위치 | 항목명 | 작성안내 | 작성예시 | 비고 |
|------|--------|----------|----------|------|
| 양식 | Ⅲ-1 훈련과제 도출 수행활동 (13×6) | "1. 문제도출 및 훈련대상 업무 선정 등을 위한 중요한 활동으로, 기업이 지닌 본질적인 핵심문제 파악 및 문제정의에 경영진과 기업 핵 …" | 양식 13×6 표는 1차/2차 차수당 4행(PM·외부전문가·기업내부전문가·능력개발전담주치의) 정형 | 차수당 4행 = 4 역할별 일자/내용/방법 분리 |
| 인터뷰 | "Ⅲ-1 훈련과제 도출 수행활동" `StepActivities.tsx` | "PM·외부전문가·기업내부전문가·능력개발전담주치의가 참여한 훈련과제 도출 과정을 차수별로 정리합니다." | ExampleAccordion 3 bullet | **양식: 차수당 4행 (역할별 분리) → 코드: 차수당 1행 (participants 4 person dict 단일 행 합산) — 정합성 갭 (PBL-자체-03 후보)**. 양식 핵심 가이드 "기업이 지닌 본질적인 핵심문제 파악" 누락 (#5 패턴) |
| 결과 | TabPBLTasks · "Ⅲ-1 훈련과제 도출 수행활동" SectionCard | FormTable (5컬럼: 차수/일자/내용/방법/참석자) — 표 형태 | — | 양식 6컬럼 vs 코드 5컬럼 (양식의 col4·col5 분리된 참석자 → 코드 단일 셀) |
| HWPX | P-08 repeat_rows `{{pbl_tasks_activity_{i}_{field}}}` (rows_per_round=4, max_items=3, merged_first_col=true) | — | — | 양식 표는 차수×4행 출력 위해 재처리 필요 — Python 측 fill 로직 검증 필요 |

### 2.8 Ⅲ-2-가 문제 도출 (정의서)

| 위치 | 항목명 | 작성안내 | 작성예시 | 비고 |
|------|--------|----------|----------|------|
| 양식 | Ⅲ-2 문제 도출 및 문제 우선순위 결정 > 가. 문제 도출 + "문제 정의서" 5×2 표 | "1. 실제로 직무에 해결해야 할 문제를 선정하기 위한 문제 범위 도출하고 핵심 개념, 문제를 명확히 정의한다. 2. 외부 전문가, 기업 …" | 5×2 표 = "구분 / 내용" 4행 (문제 배경, 핵심 문제, 문제 범위, 제약 조건) | 양식: 4 정형 항목 1세트 |
| 인터뷰 | "Ⅲ-2-가 문제 도출" (`StepProblems.tsx` 의 첫 블록) | "Ⅲ-2-가 문제 도출과 Ⅲ-2-나 문제 우선순위 결정을 함께 입력합니다." (Step 전체 description) | ExampleAccordion 3 bullet (pain-point 구체적/1~5/AHP) | **양식: 1 세트 4 정형 항목 (배경/핵심/범위/제약) → 코드: 자유 problems[] {title, description, impact} 동적 행 — 의미 충돌 (PBL-자체-04 후보)**. 양식 핵심 "문제 범위 도출", "외부 전문가" 안내 누락 (#5 패턴) |
| 결과 | TabPBLTasks · "Ⅲ-2-가 문제 도출" SectionCard | FormTable (3컬럼: 문제명/문제 설명/영향) | — | 양식 2컬럼 vs 코드 3컬럼 |
| HWPX | P-09 repeat_rows `{{pbl_tasks_problem_{i}_{field}}}` (max_items=4, col 0=title, col 1=description) | — | — | **양식 5×2 의 정형 4 항목(배경/핵심/범위/제약) 의미 손실 — title 자유 입력으로 대체. impact 필드 HWPX 매핑 누락 (#10·#21 패턴)** |

### 2.9 Ⅲ-2-나 문제 우선순위 결정

| 위치 | 항목명 | 작성안내 | 작성예시 | 비고 |
|------|--------|----------|----------|------|
| 양식 | "나. 문제 우선순위 결정" 6×7 표 | "1. 문제 정의 분석결과를 토대로 해결해야 할 문제 우선순위를 결정한다. - '문제 정의'는 문제 정의서의 핵심문제를 중심으로 작성 …" | "문제 정의 / 문제 해결 우선순위 낮음 ←→ 높음 / 선정 여부" + ① ② ③ ④ ⑤ √ ☑ 5점 척도 5행 | 양식: 5점 척도 점수 칸 5개 + 선정 ☑ |
| 인터뷰 | "Ⅲ-2-나 문제 우선순위 결정" (`StepProblems.tsx` 의 둘째 블록) | (Step 통합 description 사용) | (통합 ExampleAccordion 사용) | priority.items {problem/score(1-5)/rank} + method 자유서술 |
| 결과 | TabPBLTasks · "Ⅲ-2-나 문제 우선순위 결정" SectionCard | FormTable (3컬럼: 문제명/점수/순위) + method 박스 | — | 양식 5점 칸 시각화 미반영 — score 정수 1개 |
| HWPX | P-10 repeat_rows `{{pbl_tasks_priority_{i}_{field}}}` col 1~5 = score_1_check ~ score_5_check, col 6 = selected_check | — | — | 정상 (5칸 체크 변환) |

### 2.10 Ⅲ-3 훈련대상 업무 선정 및 분석

#### 2.10-가 Ⅲ-3-가 훈련대상 업무 선정

| 위치 | 항목명 | 작성안내 | 작성예시 | 비고 |
|------|--------|----------|----------|------|
| 양식 | Ⅲ-3 훈련대상 업무 선정 및 분석 > 가. 훈련대상 업무 선정 (6×7) | (직접 가이드 박스 없음 — 다·라 통합 가이드만) | 6×7 표 = 업무명 / AI훈련과정 개발 필요성 1~5점 / 선정 여부 | 양식: 5점 + ☑ |
| 인터뷰 | (Step 9 `StepTargetAndLevel.tsx` 의 상단) "Ⅲ-3 훈련대상 업무 (가·나·다)" | "Ⅲ-3 훈련대상 업무 (업무명·범위·선정 사유·세부내용) 와 Ⅲ-4 현재·예상 AI역량 수준을 함께 입력합니다." | ExampleAccordion 4 bullet (NCS 능력단위/Ⅲ-2 정합/AS-IS·TO-BE 4행/AI 차이) | target {name/code/scope/necessity/necessity_score(1-5)/details[]} 단일 객체 |
| 결과 | TabPBLTasks · "Ⅲ-3-가 훈련대상 업무 선정" SectionCard | FormTable 3행 (업무명/NCS 코드/업무 범위) | — | **score 칸 결과 화면 미렌더 (#15 패턴 — 점수 시각화 미흡 / #14 패턴 — 표 정돈)** |
| HWPX | P-11 cell_fill+repeat_rows `{{pbl_tasks_target_{i}_{field}}}` col 0=name, col 1~5=necessity_score_1~5, col 6=selected_check | — | — | 정상 (양식 6×7 → 단일 row + 5칸 체크) |

#### 2.10-나 Ⅲ-3-나 AI기반 문제해결 필요성 (선정 사유)

| 위치 | 항목명 | 작성안내 | 작성예시 | 비고 |
|------|--------|----------|----------|------|
| 양식 | "나. AI기반 문제해결의 필요성(훈련대상 업무 선정 사유)" 1×1 + 2×2 가이드 | "1.. 문제 우선순위에서 도출된 결과를 분석하여 AI를 통해 가장 큰 변화가 예상되는 핵심업무(Task) 단위로 훈련대상 업무를 선정 …" | 양식 본문에 "(작성 예시) 훈련대상 업무는 영상 데이터 수집, 영상 데이터 분석임. 기업 경영 이슈인 '사업 다각화를 위한 신규 서비스 런칭 필요' …" **명시적 인용 예시 1건 포함** | **양식: 명시적 작성 예시 인용 — 코드에 누락 시 #공통-A 패턴 적용** |
| 인터뷰 | (Step 9 통합) `target.necessity` 박스 | (통합 description) | (통합 ExampleAccordion) | LargeTextBox 박스 |
| 결과 | TabPBLTasks · "Ⅲ-3-나 AI기반 문제해결 필요성 (선정 사유)" SectionCard | InlineEditField (multiline) | — | 박스 1개 |
| HWPX | P-12 single `{{pbl_tasks_target_necessity}}` | — | — | 정상 |

**결함 후보:**
- **#5(PBL)** Ⅲ-3-나 양식 작성안내 핵심 "AI를 통해 가장 큰 변화가 예상되는 핵심업무(Task) 단위로 훈련대상 업무를 선정" 누락
- **#공통-A(PBL)** Ⅲ-3-나 양식의 명시적 작성 예시("훈련대상 업무는 영상 데이터 수집 …") 코드 미게재

#### 2.10-다 Ⅲ-3-다 훈련대상 업무 세부내용

| 위치 | 항목명 | 작성안내 | 작성예시 | 비고 |
|------|--------|----------|----------|------|
| 양식 | "다. 훈련대상 업무 세부내용" 4×5 표 | "1. 훈련대상 업무가 AI활용ㆍ도입 전후로 어떻게 변화하는지, 그에 따른 어떤 역량이 필요한지, 특히 현재 업무방식(AS-IS)에서 …" | 양식 4×5 표 = 업무명 / 세부내용 / 요구지식 / 기술 (단, 양식 헤더 정돈 — 코드와 5컬럼 정합) | 양식: 5컬럼 (업무명/세부내용*2/요구지식/기술) |
| 인터뷰 | (Step 9 통합) `target.details[]` (PBLTargetDetail) | (통합 description) | (통합 ExampleAccordion) | details[] {title/as_is/to_be/required_knowledge/required_skill} |
| 결과 | TabPBLTasks · "Ⅲ-3-다 훈련대상 업무 세부내용" SectionCard | FormTable 5컬럼 (업무명/AS-IS/TO-BE/요구지식/기술) | — | **양식 4컬럼 (세부내용 1) → 코드 5컬럼 (AS-IS·TO-BE 분리) — 양식 컬럼명·헤더 차이 (#10·#12 패턴 PBL 적용 가능) — 양식 헤더는 "세부내용" 단일이지만 PR #7 V2 가 5컬럼 1:1 정합으로 보강한 상태** |
| HWPX | P-13 repeat_rows max_items=2 col 0~4 (title/as_is/to_be/required_knowledge/required_skill) | — | — | **max_items=2 → 코드 details[] 가 2건 초과 시 일부 누락 (#21 패턴)**. data_row_start=2 |

### 2.11 Ⅲ-4 AI 수준 진단

#### 2.11-가 Ⅲ-4-가 현재 AI역량 수준

| 위치 | 항목명 | 작성안내 | 작성예시 | 비고 |
|------|--------|----------|----------|------|
| 양식 | 4. AI수준 진단 > 가. 현재 기업의 AI역량 수준 진단 (5×3) | (Ⅲ-4-나 통합 가이드) | 5×3 표 = 구분 / 수준(등급) / 주요 내용. ☑/□ 4 등급 체크 (AI기초형(기초)/AI탐구형(초급)/AI활용형(중급)/AI선도형(고급)) | 양식: 한글 라벨 + 등급 |
| 인터뷰 | (Step 9 통합) `currentAiLevel` (PBLAiLevelAssessment) | "Ⅲ-4 현재와 예상 간 차이…" (통합 ExampleAccordion) | — | AiLevel4Check 위젯 (BASIC/EXPLORER/USER/LEADER) |
| 결과 | TabPBLTasks · "Ⅲ-4-가 현재 AI 역량 수준" SectionCard | AiLevel4Check readOnly | — | 한글 라벨 표시 (BASIC→AI기초형(기초) 등) |
| HWPX | P-14 checkbox_toggle `{{pbl_tasks_current_ai_level_{basic/explorer/user/leader}_check}}` | — | — | 정상 (4 체크박스) |

**결함 후보 (#15 패턴):**
- 코드 영문 enum (BASIC/EXPLORER/USER/LEADER) 사용 — UI 노출은 PBL_AI_LEVEL_LABEL_MAP 으로 한글 변환됨. **로드맵 #15 와 달리 PBL 결과 화면은 한글 표기 OK 로 보임**. AiLevel4Check 위젯 자체 검수 필요.

#### 2.11-나 Ⅲ-4-나 향후 AI역량 수준 향상도(예상)

| 위치 | 항목명 | 작성안내 | 작성예시 | 비고 |
|------|--------|----------|----------|------|
| 양식 | "나. 훈련 이후 AI역량 수준 향상도(예상)" 2×3 + 2×2 가이드 | "1. '현재 기업의 AI역량 수준 진단'은 공단에서 제공하는 AI역량 수준 진단 툴을 활용할 수 있으며(선택사항), 기업 현황 분석 …" | 양식 2×3 = 현행 / 향후 / AI역량 수준 향상 사유. 예시 (AI탐구형(초급) → AI활용형(중급)) | 양식: 현행/향후/사유 |
| 인터뷰 | (Step 9 통합) `expectedAiLevel` | (통합) | — | AiLevel4Check 위젯 |
| 결과 | TabPBLTasks · "Ⅲ-4-나 예상 AI 역량 수준" SectionCard | AiLevel4Check readOnly | — | 사유 note 필드 표시는 위젯 내부 |
| HWPX | P-15 cell_fill `{{pbl_tasks_expected_ai_level_{current_label/expected_label/note}}}` | — | — | 정상 (라벨+등급 형식) |

### 2.12 Ⅳ. AI 기반 운영계획 수립 (LLM 결과)

| 위치 | 항목명 | 작성안내 | 작성예시 | 비고 |
|------|--------|----------|----------|------|
| 양식 | Ⅳ-1 훈련 목표 (1×1), Ⅳ-2 AI도구 활용 계획 (6×6), Ⅳ-3 훈련 실시 계획 (가~마, 5 표), Ⅳ-4 평가 계획 (가·나) | 단일 통합 가이드 ("'훈련목표'는 훈련배경과 문제해결 목표, 성과 목표를 구체적으로 작성한다. 2. 'AI 도구 활용계획'은 …") | Ⅳ-2 (예시)단계/주요활동/AI 도구/활용 데이터/활용 목적/구체적 활용 방법 1단계~3단계, Ⅳ-3-라 시설/장비, Ⅳ-3-마 ○○○ 내부/외부 00년 ○○○ | 양식: LLM 으로 자동 채움 |
| 인터뷰 | — | — | — | 인터뷰 입력 없음 |
| 결과 | TabPBLOps · 8 SectionCard | 각 SectionCard 의 description (예: "단계별 주요활동 · AI 도구 · 데이터 · 목적 · 방법 (LLM 생성)") | — | **각 카드 LLM 결과 빈 상태에서는 RegeneratePlaceholder 만 표시 — 시각적 정돈 부족 (#14 패턴 PBL 적용)** |
| HWPX | P-16 ~ P-23 (repeat_rows + cell_fill) | — | — | LLM 결과 누락 시 빈 칸 출력 (#20 패턴) |

**결함 후보:**
- **#17(PBL)** Ⅳ-3-다 훈련 교과목 프로파일 — TabPBLOps 의 placeholder 만 표출. LLM 결과 시 양식 15×10 거대 표를 채워야 하나 결과 화면은 단일 줄 ("과정명 (총 N시간)")로만 표시. 결과 화면 vs HWPX 출력 정합성 갭.
- **#18(PBL)** Ⅳ-3 학습그룹·시설·강사 — 결과 화면이 단순 "총 N건/N명" 카운트 줄글로만 표출, 표 형태 미적용.
- **#20(PBL)** P-17~P-23 LLM 결과 빈 dict 시 HWPX 표 공란 가능 (로드맵 #20과 동일 패턴).
- **#14(PBL)** Ⅳ-3-가 훈련과정 개요·과정명/훈련기간 결과 페이지 단일 줄 표시 — 표 형태로 정돈 가능.

### 2.13 Ⅳ-4-나 결과평가 계획 (양식 고정 · UI 미렌더)

| 위치 | 항목명 | 비고 |
|------|--------|------|
| 양식 | "나. 결과평가 계획" + "□ 만족도 및 성취도 조사" 12×9 + "□ 현업적용도 조사" 13×9 (양식 고정 설문) | 양식 원문 그대로 |
| 인터뷰 | — | 입력 없음 |
| 결과 | **렌더 금지 (TabPBLOps 주석으로 명시)** | 계획서 §1.2 |
| HWPX | P-24 static (table 37, 38) | 양식 원문 출력 |

**확인됨:** 의도된 미렌더이며 코드에 명시적 주석 보존됨. 결함 아님.

### 2.14 Ⅴ. 성과분석 및 확산 전략

| 위치 | 항목명 | 작성안내 | 작성예시 | 비고 |
|------|--------|----------|----------|------|
| 양식 | Ⅴ-1 성과분석 측정 지표 (3×2 정량/정성), Ⅴ-2 성과 확산 전략 (3×2 내재화) | "1.'성과 측정 지표'는 AI훈련의 실효성을 입증하기 위해 ROI, KPI 등 정량적 성과지표를 명시하며 훈련 목표로 선택한 카테고리 …" | 정량 1. 훈련 이후 불량발생률 00% 감소 등 + 정성 + 내재화 방안 (매뉴얼/지식공유/지속학습) 양식 본문에 풍부한 예시 | 양식: 카테고리별 (기술문제 해결/공정 최적화/불량률 감소/기술 매뉴얼 개발/기타) 측정 지표 차등 |
| 인터뷰 | — | — | — | 입력 없음 |
| 결과 | TabPBLOutcomes · 2 SectionCard 모두 RegeneratePlaceholder | — | — | **현재 LLM 출력 미연결 (Task 2.10 placeholder)** — 양식 풍부한 예시 활용 부족 |
| HWPX | P-25, P-26 static | — | — | 양식 원문만 출력 (LLM 변형 없음) |

**결함 후보:**
- **PBL-자체-05** TabPBLOutcomes 가 placeholder 영구 상태 (Task 2.10 미완) → LLM 결과 연결되어도 결과 화면 표시 컴포넌트 부재. R3·R5 우선순위 검토 필요.

### 2.15 [결과보고서] (양식 고정)

| 위치 | 항목명 | 비고 |
|------|--------|------|
| 양식 | 1. 학습활동 수행일지~4. 훈련 결과 (가~바) | 양식 원문 |
| 인터뷰·결과 | **렌더 금지** | UI 미노출 |
| HWPX | P-27~P-29 static + P-28 결과 표지 메타 cell_fill (`{{pbl_result_cover_company_name}}`) | 표지 메타만 자동 |

**확인됨:** 의도된 미렌더. 결함 아님.

---

## 3. 로드맵 검수 결함의 PBL 적용 매트릭스

| findings 번호 | 로드맵 결함 요약 | PBL 동일 결함 존재? | 위치 | 차이 상세 |
|---|---|---|---|---|
| **#5** | Ⅱ-2 작성안내 누락 ("기업의 내부전문가와 면담 …" 문구) | **예** (광범위) | PBL Ⅱ-1-가, Ⅱ-1-나, Ⅱ-2, Ⅱ-3-나, Ⅲ-1, Ⅲ-2-가, Ⅲ-3-나 다수 Step | 양식 작성가이드 핵심 문장이 코드 ExampleAccordion 에 미반영. 코드는 자체 의역·요약으로 대체. 매트릭스 §2.2~2.10 에 항목별 누락 문구 명시 |
| **#10** | Ⅱ-3 첨부 항목명 오기 ("분석 노트 추가 첨부" → "추가 내부 자료") | **부분 적용** | PBL Ⅱ-3-가 (HRD이음 PDF 첨부 항목 자체) | PBL 양식 항목명 "기업HRD이음컨설팅 결과(전산 자동 표출)" vs 코드 "HRD이음 컨설팅 결과 PDF 첨부" — 의미 차이 (자동표출 ↔ 사용자 첨부). PBL 양식에서 직접 대응되는 "추가 내부 자료" 항목은 없음. **PBL 의 Ⅱ-3-가 항목명 자체를 "기업HRD이음컨설팅 결과 (PDF 첨부)" 등으로 보정 검토 필요** |
| **#12** | Ⅱ-4 항목명 오기 ("훈련대상 과업 선정" → "훈련대상 과업(Task)·워크플로우 선정") | **부분 적용** | PBL Step 9 (`Ⅲ-3·4 훈련대상·AI수준`) | PBL 양식 정확 명칭 = "Ⅲ-3 훈련대상 업무 선정 및 분석" / 코드 = "훈련대상 업무 (가·나·다)". 양식에 (Task)·(워크플로우) 부기 없음 → 직접 적용 불요. **단 PBL Step 단축명 "Ⅲ-3·4" 가 양식상 두 섹션을 합성 표기 — UX 모호 가능** |
| **#14** | Ⅰ-3 결과 표 정돈 필요 (디스플레이 정돈) | **유사 적용** | PBL TabPBLOverview · TabPBLOps Ⅳ-3-가/다 | TabPBLOverview 는 이미 8행 FormTable 사용 OK. **TabPBLOps 의 Ⅳ-3-가 (단일 줄 텍스트) · Ⅳ-3-나 (요약 카운트) · Ⅳ-3-다 (단일 줄)는 양식 표 정합성 부족 → 표 형태로 정돈 후보** |
| **#15** | Ⅲ-2 수준 영문 표기 (BASIC/EXPLORER/USER/LEADER → 초급/중급/고급) | **확인 필요 (대응 가능성 있음)** | PBL Ⅲ-4 AiLevel4Check 위젯 | 코드 PBL_AI_LEVEL_LABEL_MAP 에 한글 라벨 정의됨 (AI기초형·AI탐구형·AI활용형·AI선도형 + 기초/초급/중급/고급). **AiLevel4Check 컴포넌트 내부에서 실제로 한글 라벨로 표시하는지 위젯 코드 검수 필요** (본 매트릭스에서 위젯 미열람) |
| **#17** | Ⅲ-4 교과목 세부 내용 빈약 (단순 기재) | **예 (현재는 placeholder)** | PBL TabPBLOps Ⅳ-3-다 훈련 교과목 프로파일 | 현재 Task 2.10 placeholder — LLM 결과 시 양식 15×10 정형 표 정합 필요. **결과 페이지가 결과 dict 일부만 보여주는 단순 줄 → 머리기호 분리·표 형태 적용 필요 (#17·#18 패턴 통합)** |
| **#18** | Ⅲ-4 교과목 줄글 표시 (표 형태로) | **예 (현재는 placeholder)** | PBL TabPBLOps Ⅳ-3-나/다/라/마 | training_plan 내 4 하위 섹션이 결과 화면에서 표 미사용 — 카운트·과정명만 텍스트로 노출. 표 형태 도입 필요 |
| **#20** | Ⅱ-3 HWPX 매핑 누락 (직무·현행방식·문제점 등 공란) | **예 (다수 잠재)** | PBL P-05 (Ⅱ-2 6 셀 분배 로직 부재), P-09 (impact 누락), P-13 (max_items=2 제한), P-17 ~ P-23 (LLM 결과 빈 시) | **§2.4 Ⅱ-2 가장 위험** — 자유서술 1개 → HWPX 6 셀 분배 fallback 미정의. **§2.13 Ⅳ-3-라/마는 max_items=2 → 시설·강사 3건 이상 시 누락**. **§2.8 problems 의 impact 필드 HWPX 매핑 부재** |
| **#21** | Ⅱ-4 HWPX 누락 (전 항목 빠짐) | **예 (다수 잠재)** | PBL P-09 impact·P-13 max_items=2 등 위와 동일 | 양식·인터뷰 데이터 vs HWPX 출력 항목 갯수 불일치 — 매트릭스 항목별로 검증한 갭 |
| **공통-A** | 작성안내·작성예시 양식 정합성 | **예 (광범위)** | PBL 9 Step 전반 | 양식의 "작성 가이드" 박스 + "(작성 예시)" 인용문이 ExampleAccordion 에 누락 또는 의역됨. 특히 §2.10-나 Ⅲ-3-나 의 명시적 인용 예시("훈련대상 업무는 영상 데이터 수집…")는 코드에 미반영 — 작성예시 게재 필요 |

---

## 4. PBL 자체 결함 (양식 vs 코드, 로드맵 결함 패턴 외)

R0 검수 중 PBL 흐름에서 신규 식별된 양식·코드 정합성 갭. **findings.md 의 §"추가 발견 사항"에 PBL- 접두사로 추가 권장.**

### PBL-자체-01 — Ⅰ. 훈련과정 개요 결과 페이지 신청서 자동표출 7필드 미렌더

- **위치**: TabPBLOverview (`src/app/(dashboard)/consultant/projects/[id]/pbl/_components/result-v2/TabPBLOverview.tsx`)
- **증상**: HWPX P-02 cell_fill 18키 vs 결과 페이지 8행 FormTable — 사업장관리번호·업종·업종코드·주소·훈련실시주소·관할 지부·담당자(직위/성명/연락처/email) 결과 페이지에 미노출
- **기대**: 양식 15×5 표 ↔ HWPX 18키 ↔ 결과 페이지 정합. 신청서 자동표출 영역도 결과 페이지에 (읽기 전용) 표출하여 사용자가 HWPX 출력 전 확인 가능하도록
- **발견 라운드**: R0 (매트릭스 산출)

### PBL-자체-02 — Ⅱ-2 훈련환경 분석 양식 12×7 표 → 자유서술 1개 박스 단순화

- **위치**: `StepTrainingEnv.tsx` + TabPBLAnalysis · Ⅱ-2 카드
- **증상**: 양식은 12×7 정형 표 (적정 훈련시간/장소/사내강사/직위·이름·직무경력·인적특성/외부장소 등). 코드는 단일 LargeTextBox 자유서술. HWPX P-05 는 6 셀 분배(`internal_status`/`external_status`/...) 로직 — 자유서술 → 6 셀 매핑이 어떻게 이루어지는지 코드상 명시 부재
- **기대**: 정형 표 입력으로 복원 또는 HWPX 6 셀 fallback 명시 (별도 작성 불요 등)
- **영향**: HWPX 다운로드 시 P-05 6 셀 모두 공란 가능 (#20 패턴)
- **발견 라운드**: R0

### PBL-자체-03 — Ⅲ-1 수행활동 양식 차수당 4행 → 코드 차수당 1행 단순화

- **위치**: `StepActivities.tsx` + TabPBLTasks · Ⅲ-1 카드 + HWPX P-08
- **증상**: 양식 13×6 = 차수당 4행 (PM/외부전문가/기업내부전문가/능력개발전담주치의) 별 일자/내용/방법 분리. 코드는 차수당 1행 + participants 4 person dict — 4 역할의 일자·내용·방법이 동일 가정
- **기대**: 양식 정합 위해 차수×역할 행으로 입력 모델 확장 또는 HWPX fill 시 4행 동일값으로 자동 확장 명시 (Python `_fill_table_pbl_*` 검증)
- **발견 라운드**: R0

### PBL-자체-04 — Ⅲ-2-가 양식 정형 4 항목 (배경/핵심/범위/제약) → 코드 자유 problems[] 의미 충돌

- **위치**: `StepProblems.tsx` 첫 블록 + TabPBLTasks · Ⅲ-2-가 + HWPX P-09
- **증상**: 양식 5×2 "문제 정의서" 표는 정형 4 항목 (문제 배경/핵심 문제/문제 범위/제약 조건)을 단일 세트로 받음. 코드는 problems[] 동적 행 (title/description/impact). HWPX P-09 max_items=4 → 양식 4 정형 행에 매핑되나 의미가 흐려짐 — title 자유 입력이 양식 "구분" 라벨을 대체
- **기대**: 양식 4 정형 행과 정합되도록 입력 폼 보강 또는 HWPX 출력 시 양식 4 행 라벨 보존 매핑 추가
- **참고**: problems[].impact 필드는 HWPX 매핑 자체 누락 (#10·#21 패턴)
- **발견 라운드**: R0

### PBL-자체-05 — Ⅴ. 성과분석 결과 페이지 영구 placeholder 상태

- **위치**: TabPBLOutcomes (`src/app/(dashboard)/consultant/projects/[id]/pbl/_components/result-v2/TabPBLOutcomes.tsx`)
- **증상**: Task 2.10 placeholder 주석 — pbl_content 에 Ⅴ 필드 추가될 예정이나 결과 표시 컴포넌트 미구현. HWPX P-25/P-26 도 static (양식 원문) 처리
- **기대**: LLM 결과 (성과 측정 지표·내재화 방안) 표 형태 표시 + HWPX cell_fill 매핑 추가
- **발견 라운드**: R0

### PBL-자체-06 — Step 9 단축명 `Ⅲ-3·4` 가 양식상 두 섹션 합성 표기

- **위치**: `PBLInterviewClient.tsx` PBL_STEPS 배열 Step 9
- **증상**: 양식 Ⅲ-3 (훈련대상 업무) + Ⅲ-4 (AI수준 진단) 가 단일 Step 으로 통합. 단축명 "Ⅲ-3·4" 는 양식 정확 명칭이 아님. #12 와 유사 패턴
- **기대**: Step 분리 또는 단축명 재설계 (예: "Ⅲ-3" 단일 표기 + Ⅲ-4 별도 Step 분리)
- **발견 라운드**: R0

### PBL-자체-07 — Step 부제 "AI PBL 인터뷰 (양식 2:1 정합)" 가 사용자 노출 — #1 패턴

- **위치**: `PBLInterviewClient.tsx` PageHeader title
- **증상**: 로드맵 #1 ("AI훈련로드맵 인터뷰 (양식 1:1 정합)") 와 동일 패턴 — 내부 개발 라벨이 사용자 화면에 노출
- **기대**: "AI PBL 인터뷰" 로 수정 (양식 2:1 정합) 부제 삭제. **#1(PBL) 동등 적용**
- **발견 라운드**: R0
- **관련 findings**: #1 (R2 PR1 단순 일괄)

---

## 5. 수정 권장 체크리스트

> 본 문서는 사용자가 직접 ☑ → ☑ (수정 진행) 또는 ☒ (유지) 로 편집해 R3 입력으로 사용한다. 별도 파일·슬롯 없음.

### 5.1 로드맵 결함의 PBL 적용

- ☑ **#1(PBL)** — Step 부제 "AI PBL 인터뷰 (양식 2:1 정합)" → "AI PBL 인터뷰" — `PBLInterviewClient.tsx` PageHeader (R2 동등 적용)
- ☑ **#5(PBL)** — 작성 안내 누락 (광범위) — Ⅱ-1-가, Ⅱ-1-나, Ⅱ-2, Ⅱ-3-나, Ⅲ-1, Ⅲ-2-가, Ⅲ-3-나 ExampleAccordion 양식 핵심 문장 보강
- ☑ **#10(PBL)** — 첨부/항목명 오기 — Ⅱ-3-가 항목명 "HRD이음 컨설팅 결과 PDF 첨부" → "기업HRD이음컨설팅 결과 (PDF 첨부)" 보정 검토
- ☑ **#12(PBL)** — 항목명 오기 — Step 9 단축명 "Ⅲ-3·4" 재설계 (PBL-자체-06 과 통합 검토)
- ☑ **#14(PBL)** — 결과 페이지 표 형태 정돈 — TabPBLOps Ⅳ-3-가/나/다 표 형태 적용
- ☑ **#15(PBL)** — 수준 한글 표기 — AiLevel4Check 위젯 내부 한글 라벨 표시 검수 (PBL_AI_LEVEL_LABEL_MAP 정의는 OK)
- ☑ **#17(PBL)** — 교과목 세부내용 머리기호 분리 — TabPBLOps Ⅳ-3-다 LLM 결과 시 머리기호 적용
- ☑ **#18(PBL)** — 교과목 표 형태 표시 — TabPBLOps Ⅳ-3-나/다/라/마 표 형태 도입
- ☑ **#20(PBL)** — HWPX 표 매핑 누락 — P-05 6 셀 fallback / P-09 impact / P-13 max_items / P-17~P-23 LLM 빈 dict 처리
- ☑ **#21(PBL)** — HWPX 섹션 누락 — P-09 impact 매핑 추가, P-13 max_items 확대
- ☑ **공통-A(PBL)** — 작성안내·작성예시 양식 정합성 일괄 — Ⅲ-3-나 명시적 작성 예시 인용 등 양식 (작성 예시) 박스 코드 게재

### 5.2 PBL 자체 신규 결함

- ☑ **PBL-자체-01** — Ⅰ. 훈련과정 개요 결과 페이지 신청서 자동표출 7필드 추가 표출
- ☑ **PBL-자체-02** — Ⅱ-2 훈련환경 분석 정형 표 입력 / HWPX P-05 6 셀 fallback 명시
- ☑ **PBL-자체-03** — Ⅲ-1 수행활동 차수×역할 4행 모델 확장 또는 HWPX 자동 확장 명시
- ☑ **PBL-자체-04** — Ⅲ-2-가 양식 4 정형 항목 (배경/핵심/범위/제약) 입력 모델 보강
- ☑ **PBL-자체-05** — Ⅴ. 성과분석 결과 페이지 LLM 결과 연결 + HWPX cell_fill 추가 (Task 2.10 완료)
- ☑ **PBL-자체-06** — Step 9 단축명 "Ⅲ-3·4" 재설계 (#12(PBL) 와 통합)
- ☑ **PBL-자체-07** — Step 부제 사용자 라벨 정돈 (#1(PBL) 와 통합)

---

## 6. 관련 파일 절대 경로

### 양식 원본
- `/Users/baekkyunshin/Desktop/AI-roadmap-dashboard/docs/references/2.AI PBL 과정개발보고서 및 결과보고서(양식).hwpx`
- `/Users/baekkyunshin/Desktop/AI-roadmap-dashboard/docs/references/2.AI PBL 과정개발보고서 및 결과보고서(양식).pdf`
- `/Users/baekkyunshin/Desktop/AI-roadmap-dashboard/docs/references/hwpx-structure-pbl.md`

### 인터뷰 입력
- `/Users/baekkyunshin/Desktop/AI-roadmap-dashboard/src/app/(dashboard)/consultant/projects/[id]/interview/page.tsx`
- `/Users/baekkyunshin/Desktop/AI-roadmap-dashboard/src/app/(dashboard)/consultant/projects/[id]/interview/_components/pbl/PBLInterviewClient.tsx`
- `/Users/baekkyunshin/Desktop/AI-roadmap-dashboard/src/app/(dashboard)/consultant/projects/[id]/interview/_components/pbl/StepOverview.tsx`
- `/Users/baekkyunshin/Desktop/AI-roadmap-dashboard/src/app/(dashboard)/consultant/projects/[id]/interview/_components/pbl/StepCompanyIssues.tsx`
- `/Users/baekkyunshin/Desktop/AI-roadmap-dashboard/src/app/(dashboard)/consultant/projects/[id]/interview/_components/pbl/StepOrganization.tsx`
- `/Users/baekkyunshin/Desktop/AI-roadmap-dashboard/src/app/(dashboard)/consultant/projects/[id]/interview/_components/pbl/StepTrainingEnv.tsx`
- `/Users/baekkyunshin/Desktop/AI-roadmap-dashboard/src/app/(dashboard)/consultant/projects/[id]/interview/_components/pbl/StepHrdReportPdf.tsx`
- `/Users/baekkyunshin/Desktop/AI-roadmap-dashboard/src/app/(dashboard)/consultant/projects/[id]/interview/_components/pbl/StepCourseNecessity.tsx`
- `/Users/baekkyunshin/Desktop/AI-roadmap-dashboard/src/app/(dashboard)/consultant/projects/[id]/interview/_components/pbl/StepActivities.tsx`
- `/Users/baekkyunshin/Desktop/AI-roadmap-dashboard/src/app/(dashboard)/consultant/projects/[id]/interview/_components/pbl/StepProblems.tsx`
- `/Users/baekkyunshin/Desktop/AI-roadmap-dashboard/src/app/(dashboard)/consultant/projects/[id]/interview/_components/pbl/StepTargetAndLevel.tsx`

### 결과 페이지
- `/Users/baekkyunshin/Desktop/AI-roadmap-dashboard/src/app/(dashboard)/consultant/projects/[id]/pbl/_components/result-v2/PBLResultClient.tsx`
- `/Users/baekkyunshin/Desktop/AI-roadmap-dashboard/src/app/(dashboard)/consultant/projects/[id]/pbl/_components/result-v2/TabPBLOverview.tsx`
- `/Users/baekkyunshin/Desktop/AI-roadmap-dashboard/src/app/(dashboard)/consultant/projects/[id]/pbl/_components/result-v2/TabPBLAnalysis.tsx`
- `/Users/baekkyunshin/Desktop/AI-roadmap-dashboard/src/app/(dashboard)/consultant/projects/[id]/pbl/_components/result-v2/TabPBLTasks.tsx`
- `/Users/baekkyunshin/Desktop/AI-roadmap-dashboard/src/app/(dashboard)/consultant/projects/[id]/pbl/_components/result-v2/TabPBLOps.tsx`
- `/Users/baekkyunshin/Desktop/AI-roadmap-dashboard/src/app/(dashboard)/consultant/projects/[id]/pbl/_components/result-v2/TabPBLOutcomes.tsx`
- `/Users/baekkyunshin/Desktop/AI-roadmap-dashboard/src/app/(dashboard)/consultant/projects/[id]/pbl/_components/result-v2/types.ts`

### HWPX 매핑
- `/Users/baekkyunshin/Desktop/AI-roadmap-dashboard/api/hwpx/_placeholders_pbl.py`
- `/Users/baekkyunshin/Desktop/AI-roadmap-dashboard/docs/references/hwpx-placeholders.json` (P-01 ~ P-29)
- `/Users/baekkyunshin/Desktop/AI-roadmap-dashboard/templates/hwpx/pbl.hwpx`
