# AI훈련로드맵 양식 정합성 매트릭스 (R0)

- **작성일**: 2026-04-29
- **목적**: 양식 ↔ 인터뷰 ↔ 결과 ↔ HWPX 4중 정합성 비교 → R3 PR2(양식 정합성) 입력 자료
- **단일 진실 원천**: `docs/plans/2026-04-29-roadmap-review-findings.md`
- **대상 항목**: #5, #10, #12, #14, #15, #17, #18, #20, #21, 공통-A

---

## 0. 작업 방법

| 비교 위치 | 출처 |
|---|---|
| ① 양식 원본 | `docs/references/1.AI훈련로드맵 컨설팅 보고서(양식).pdf` (pdftotext 추출) + `docs/references/hwpx-structure-roadmap.md` (49개 표 인벤토리) |
| ② 인터뷰 입력 | `src/app/(dashboard)/consultant/projects/[id]/interview/_components/roadmap/Step*.tsx` 7개 컴포넌트 |
| ③ 결과 페이지 | `src/app/(dashboard)/consultant/projects/[id]/roadmap/_components/result-v2/Tab*.tsx` 3개 컴포넌트 |
| ④ HWPX 매핑 | `api/hwpx/_placeholders_roadmap.py` + `api/hwpx/generate.py` (`_fill_table_*` 함수군) + `docs/references/hwpx-placeholders.json` SSOT v2 + 페이로드 빌더 `src/lib/services/export/hwpx/hwpx-payload-roadmap.ts` |

- 양식 추출 도구: `pdftotext "docs/references/1.AI훈련로드맵 컨설팅 보고서(양식).pdf" -` 사용 (HWPX 직접 추출은 보조).
- 작성 시각: 2026-04-29.

---

## 1. 전체 섹션 매핑 개요

| 양식 (목차) | 인터뷰 컴포넌트 | 결과 페이지 섹션 | HWPX 표 idx / 플레이스홀더 prefix |
|---|---|---|---|
| Ⅰ-1 수립 필요성 | `StepNecessity.tsx` | `TabOverview` Ⅰ-1 카드 | tbl[4] / `roadmap_overview_establishment_necessity` |
| Ⅰ-2 주요 활동 | `StepPerformanceActivities.tsx` | `TabOverview` Ⅰ-2 카드 | tbl[5] (7×6) / `roadmap_overview_performance_{i}_*` |
| Ⅰ-3 수립 주요 결과 | `StepMainResult.tsx` | `TabOverview` Ⅰ-3 카드 | tbl[7] (3×4) / `roadmap_overview_ai_level_*_check`, `selected_task`, `main_summary` |
| Ⅱ-1 기업 AI 역량 수준 진단 (HRD이음 PDF) | `StepHrdReportPdf.tsx` | `TabRequirements` Ⅱ-1 카드 | tbl[13] / `roadmap_requirements_hrd_report_attachment` |
| Ⅱ-2 기업 요구분석 | `StepCompanyRequirements.tsx` | `TabRequirements` Ⅱ-2 카드 | tbl[14] (5×3) / `roadmap_requirements_{company_status, main_problems, push_willingness, expected_outcomes}` |
| Ⅱ-3 과업·워크플로우 분석 | `StepTaskAnalysis.tsx` | `TabRequirements` Ⅱ-3 카드 | tbl[15] 표 (6×6) + tbl[18] 분석내용 박스 / `roadmap_requirements_task_analysis_{i}_*`, `_note`, `_attachment` |
| Ⅱ-4 훈련대상 과업·워크플로우 선정 | `StepTargetTask.tsx` | `TabRequirements` Ⅱ-4 카드 | tbl[19] (4×3) + tbl[20] / `roadmap_requirements_target_task_*` |
| Ⅲ-1 역량 모델링 | `StepCompetencyModeling.tsx` | `TabTraining` Ⅲ-1 카드 | tbl[22] (6×5) + NCS 박스 tbl[23/24] / `roadmap_training_competency_{i}_*`, `ncs_methodology`, `ncs_derivation_method` |
| Ⅲ-2 훈련체계도 도출 | (LLM 자동 — 인터뷰 입력 없음) | `TabTraining` Ⅲ-2 카드 | tbl[26] (5×6) + tbl[28] 수립방법 박스 / `roadmap_training_structure_{i}_*`, `_method` |
| Ⅲ-3 연간 훈련계획 | (LLM 자동) | `TabTraining` Ⅲ-3 카드 | tbl[30] (4×5) + tbl[32] 활용방안 박스 / `roadmap_training_plan_{i}_*`, `_utilization` |
| Ⅲ-4 훈련과정 상세 | (LLM 자동) | `TabTraining` Ⅲ-4 카드 | tbl[34/35/36] (각 11×4) / `roadmap_training_spec_{j}_*`, `_subject_{k}_*` |

> 결과 페이지 V2 (`result-v2`) 는 [고정 참고자료]·표지·별첨을 의도적으로 제외 (코드 주석 명시).

---

## 2. 항목별 4중 비교 매트릭스

### 2.1 Ⅰ-1 수립 필요성

| 위치 | 항목명 | 작성안내 | 작성예시 | 비고 |
|---|---|---|---|---|
| 양식 | `1. 수립 필요성` | "컨설팅 대상 기업의 경영진 또는 담당자(내부전문가)와 인터뷰 등을 통해 파악한 AI훈련로드맵 수립을 위해 해당 과업(또는 워크플로우) 선정 이유 및 AI 적용의 필요성 작성 (5줄 내외로 간단히 기술)" | (없음) | — |
| 인터뷰 | `Ⅰ-1 수립 필요성` | description: "AI 훈련로드맵 수립을 위해 해당 과업(또는 워크플로우) 선정 이유 및 AI 적용의 필요성 작성 (5줄 내외로 간단히 기술)" + Accordion: ① 컨설팅 대상 기업의 경영진 또는 담당자(내부전문가) 와 인터뷰 등을 통해 파악한 AI 훈련 로드맵 수립 이유. ② 5줄 내외로 간단히 기술. | (없음) | 양식 vs 코드 정합 OK (자모 표기 미세 차이만 존재) |
| 결과 | `Ⅰ-1. 수립 필요성` `InlineEditField` (multiline) | description: "인터뷰 입력값 — 5줄 내외 자유 서술" | — | OK |
| HWPX | `{{establishment_necessity}}` / `{{roadmap_overview_establishment_necessity}}` | — | — | 매핑 OK |

### 2.2 Ⅰ-2 주요 활동

| 위치 | 항목명 | 작성안내 | 작성예시 | 비고 |
|---|---|---|---|---|
| 양식 | `2. 주요 활동` | "컨설팅 수행일지의 주요내용을 반영하여 시스템에서 자동생성 예정(별도 작성 불요)" | 1·2·3차 prefill 표 (수행일시 26.00.00 / 수행 방법 대면(인터뷰)·비대면(화상회의)·대면(워크숍)) | — |
| 인터뷰 | `Ⅰ-2 주요 활동` | description: "컨설팅 수행 차수별 일시·내용·방법과 참석자(PM · 기업 내부전문가)를 입력합니다." + Accordion 3 bullet | 양식의 "별도 작성 불요" 안내가 누락됨 — 코드는 사용자가 직접 입력하는 흐름 | (참고: #4 — 차수 추가 무동작 결함은 R4 PR3) |
| 결과 | `Ⅰ-2. 주요 활동` `FormTable` (수행 차수/일시/내용/방법/PM/내부전문가 6열) | "(인터뷰 입력값, 읽기 전용)" | — | OK |
| HWPX | tbl[5] (7×6) `_fill_table_performance_activities` / `roadmap_overview_performance_{i}_{field}` | — | — | OK |

### 2.3 Ⅰ-3 수립 주요 결과 — **#14 대상**

| 위치 | 항목명 | 작성안내 | 작성예시 | 비고 |
|---|---|---|---|---|
| 양식 | `3. AI훈련로드맵 수립 주요 결과` | "뒤쪽에서 작성된 훈련요구 분석 및 로드맵 수립 결과를 한 번에 확인할 수 있도록 1장 이내로 요약하여 작성" | 표 형태: 행1 `기업 AI 역량 수준 (□초급/□중급/□고급)`, 행2 `선정 과업`, 행3 `AI훈련로드맵 수립 주요내용 (요약)` | — |
| 인터뷰 | `Ⅰ-3 수립 주요 결과` description: "기업의 AI 역량 수준과 컨설팅을 통해 선정된 과업(또는 워크플로우)을 작성합니다." | (양식의 "1장 이내 요약" 문구 누락) — Accordion: ① AI 역량 수준은 1개 선택, ② 선정 과업은 양식 Ⅱ-4 와 일관 | "AI 역량 수준별 훈련내용 예시" 참고표는 의도적으로 제외 (양식 ◆ 표) | OK 다만 안내문 부족 |
| 결과 | `Ⅰ-3. 수립 주요 결과` — `<dl>` 그리드 + `InlineEditField` (요약) | "기업 AI 역량 수준 · 선정 과업 · AI훈련로드맵 수립 주요내용 요약" | — | **#14 결함**: 양식은 표 형태(3행)이지만 결과 페이지는 dl/dt/dd grid + 별도 multiline 영역. 양식과 시각 일관성 미흡 |
| HWPX | `{{level_beginner_check}}` `{{level_intermediate_check}}` `{{level_advanced_check}}` (☑/☑ 토글) + `{{selected_tasks_text}}` + `{{roadmap_summary}}` | — | — | OK |

> **#14 영향**: 결과 페이지 디스플레이만 변경 (양식·HWPX·인터뷰는 영향 없음).

### 2.4 Ⅱ-1 HRD이음 진단 보고서 PDF

| 위치 | 항목명 | 작성안내 | 작성예시 | 비고 |
|---|---|---|---|---|
| 양식 | `1. 기업 AI 역량 수준 진단` | "기업HRD이음컨설팅 보고서의 AI역량 진단 결과 내용 첨부(별도 작성 불요) - (초급) AI기초형 / (중급) AI탐구형 / (고급) AI활용형·AI선도형 ※ [별첨] 중소기업 AI역량 측정 진단도구 내용 참조" | (없음) | — |
| 인터뷰 | `Ⅱ-1 HRD이음 진단 보고서 PDF 첨부` description: "훈련수요 진단 보고서(PDF) 를 업로드하면 본문이 자동 추출되어 LLM 분석에 활용됩니다." Accordion: PDF 1건만, 자동 추출, 최대 10MB | (양식 안내 ① "별도 작성 불요" 문구 누락 ② "(초급) AI기초형 ..." 등급 매핑 안내 누락) | (양식 항목명: `1. 기업 AI 역량 수준 진단` ↔ 코드: `Ⅱ-1 HRD이음 진단 보고서 PDF 첨부` — 항목명 자체가 양식과 다름. 단 양식의 § 1 자체가 PDF 첨부만 하면 되는 구조이므로 의도적 변형으로 보임 → **공통-A 검토 대상**) |
| 결과 | `Ⅱ-1. HRD이음 진단 보고서` 카드 (파일 메타 + 미리보기 iframe) | "훈련수요 진단 보고서 PDF 첨부 (인터뷰에서 업로드, LLM 내부 분석용)" | — | 양식 § 1 항목명과 다름 |
| HWPX | `{{hrd_report_attachment}}` / `{{roadmap_requirements_hrd_report_attachment}}` (URL → fallback 안내) | — | — | OK |

### 2.5 Ⅱ-2 기업 요구분석 — **#5, 공통-A 대상**

| 위치 | 항목명 | 작성안내 | 작성예시 | 비고 |
|---|---|---|---|---|
| 양식 | `2. 기업 요구분석` (4행 × 3열, "구분 / 확인 내용 / 비고") | √ "**기업의 내부전문가와 면담을 통해 현재 기업의 현황과 AI 도입·활용에 대한 요구를 구조적으로 도출**" + "요구분석에서 우선적으로 AI도입·활용이 필요한 과업(또는 워크플로우)은 필수적으로 파악해야 함. 본 내용은 훈련대상 과업 선정의 논리적 근거가 됨" + "추가로 필요한 내용은 별첨의 내부환경 부분에 제시" | 비고 칸: ex) 업종, 생산품, AI 도입·활용 현황, 훈련 이력 등 / 현행 공정 프로세스, 설비 관리 등의 문제점 파악 / AI 도입·활용 및 훈련 실시 의지 파악 / AI 도입·활용 훈련으로 인한 개선 목표 등 | — |
| 인터뷰 | `Ⅱ-2 기업 요구분석` description: "기업의 내부전문가와 면담을 통해 현재 기업의 현황과 AI 도입·활용에 대한 요구를 **구조적으로 도출합니다**." Accordion: ① 우선 AI 도입·활용이 필요한 과업을 필수 파악, ② 훈련대상 과업 선정 근거, ③ 추가 내용은 별첨 내부환경에 제시 | 표의 비고 컬럼에 양식과 동일 작성예시 4건 제공 ("ex)" prefix 제거하고 본문만) | **#5 결함 — 부분 해결 상태**: 양식의 첫 번째 작성안내 문구는 description 으로 들어가 있지만 prompts/findings 에서는 누락이라고 보고됨. 실제로는 description 형태로 존재하나 양식 √ 안내 영역 톤 (□ 형식) 과 위치가 다름. **결론: 양식 √ 안내 블록 3개 모두 코드 어딘가에 분산되어 있으나, "기업의 내부전문가와 면담을 통해..." 첫 문장이 작성안내 자리(Accordion guide)가 아니라 상단 description 으로 옮겨 있어 사용자 입장에서는 누락처럼 보임** |
| 결과 | `Ⅱ-2. 기업 요구분석` `FormTable` 4행 (구분 / 입력값) | "기업 현황 · 주요 문제 · 추진 의지 · 기대 성과" | — | (참고: #6 — 비고 칸 입력 불가는 R4 PR3) |
| HWPX | `{{company_status}}` `{{main_problems}}` `{{push_willingness}}` `{{expected_outcomes}}` | — | — | OK |

> **#5 영향**: 인터뷰 페이지 description/Accordion 재배치 → 양식의 √ 작성 안내 영역에 첫 문장 명시.

### 2.6 Ⅱ-3 과업·워크플로우 분석 — **#10, #20 대상**

| 위치 | 항목명 | 작성안내 | 작성예시 | 비고 |
|---|---|---|---|---|
| 양식 | `3. 과업(Task)·워크플로우 분석` → `□ 과업·워크플로우 분석표` (직무 / 과업(Task) / 현행 방식(As-Is) / 문제점 / 데이터 발생 시점(또는 데이터 보유현황) / AI도입·활용필요도 1~5점 척도) + `분석내용` 박스 + (`추가 업로드 자료 예시) 공정 분석`) | √ 분석표 안내: "기업 내부전문가와의 인터뷰를 통해... AI 도입·활용이 필요하다고 판단되는 과업 분석 ※ 기업의 전체 과업을 대상으로 분석할 필요는 없으며..." + "현행 수행방식과 문제점을 파악하고, AI 도입·활용이 가능한 데이터 발생(또는 보유) 여부 등을 감안하여 AI도입·활용 필요도를 1점(낮음)~5점(높음) 척도로 점수 부여" / √ 분석내용 안내: "과업(또는 워크플로우) 분석 과정 및 방법에 대한 내용 기술 / 작성한 내용 외에 제시해야 할 파일이 있는 경우 첨부파일로 업로드" | "(추가 업로드 자료 예시) 공정 분석" | — |
| 인터뷰 | `Ⅱ-3 과업·워크플로우 분석` description: "직무별 주요 과업을 식별하고 현행 수행방식·문제점·AI 도입 필요도를 구조적으로 분석합니다." Accordion 3 bullet (식별 5개 내외, 1~5 정수, PDF 첨부 선택) + 분석내용 LargeTextBox + 첨부 항목명 `**분석 노트 추가 첨부**` | placeholder 정도만 (양식의 "ex) 생산/품질/설비" 등 직무 예시 없음) | **#10 결함**: 첨부 항목명 `분석 노트 추가 첨부` ↔ 양식 (양식엔 "분석 노트" 라는 표현 자체가 없음. 양식은 `(추가 업로드 자료 예시) 공정 분석` 만 표시 → findings 의 기대값은 `추가 내부 자료`). 헤더 컬럼명 `데이터 발생 시점 / 보유 현황` ↔ 양식 `데이터 발생 시점(또는 데이터 보유현황)` (미세 표기 차이, 의미 동일) |
| 결과 | `Ⅱ-3. 과업·워크플로우 분석` `FormTable` (직무/과업/As-Is/문제점/데이터 발생·보유/AI 필요도 6열) + 분석내용 InlineEdit + 첨부 링크 | "직무별 과업 As-Is / 문제점 / 데이터 보유 / AI 필요도 (1~5) + 분석 메모" | — | OK |
| HWPX | tbl[15] (6×6) `_fill_table_task_workflow` 채움 + `{{analysis_notes_text}}` + `{{roadmap_requirements_task_analysis_attachment}}` | — | — | **#20 결함**: tbl[15] 6열을 채우는 `taskWorkflowItems` 가 페이로드 빌더에서 `typedInterview?.job_tasks` 를 참조함 (`hwpx-payload-roadmap.ts:130`). 그러나 V2 인터뷰 스키마는 `taskAnalysis[]` 키를 사용 (`StepTaskAnalysis.tsx`). **Node.js 페이로드 빌더가 잘못된 키를 읽고 있어 표가 빈 값으로 출력됨** → 모든 6열 (직무/현행/문제점/데이터/AI필요도) 공란 |

> **#10 영향**: 인터뷰 페이지 항목명만 (`분석 노트 추가 첨부` → `추가 내부 자료`). 결과 페이지·HWPX 무관.
> **#20 영향**: HWPX 페이로드 빌더(`src/lib/services/export/hwpx/hwpx-payload-roadmap.ts:130, 242-249`) — `job_tasks` → `taskAnalysis` (혹은 `roadmap_task_analysis_items`) 로 키 교체 필요.

### 2.7 Ⅱ-4 훈련대상 과업 선정 — **#12, #21 대상**

| 위치 | 항목명 | 작성안내 | 작성예시 | 비고 |
|---|---|---|---|---|
| 양식 | `4. 훈련대상 과업(Task)·워크플로우 선정` (4행 × 3열, 훈련대상 과업 / 선정사유 / 기대효과 [현행(As-Is)/개선(To-Be)]) | "위의 분석표에서 제시한 과업 중 AI훈련로드맵을 수립하기 위한 훈련대상 과업 선정 및 선정사유 작성" + "해당 과업의 현행 수행방식(As-Is)과 AI를 도입·활용하기 위한 훈련실시 후 개선(To-Be)되는 사항을 기대효과 항목으로 제시" | (없음) | — |
| 인터뷰 | `Ⅱ-4 훈련대상 과업 선정` description: "Ⅱ-3 분석표에서 식별한 과업 중 AI훈련로드맵 수립 대상 과업을 선정하고, 선정 사유와 기대 효과를 기술합니다." Accordion: 양식 √ 안내 두 문장 거의 그대로 | (없음) | **#12 결함**: 항목명 `Ⅱ-4 훈련대상 과업 선정` ↔ 양식 `Ⅱ-4 훈련대상 과업(Task)·워크플로우 선정` (`(Task)·워크플로우` 누락) |
| 결과 | `Ⅱ-4. 훈련대상 과업 선정` `FormTable` 4행 | "선정 과업명 · 사유 · 기대효과 (현행 → 개선)" | — | 양식 항목명 미반영 |
| HWPX | tbl[19] (4×3) `_fill_table_training_target` + `{{training_target_*}}` 4종 | — | — | **#21 결함**: `trainingTarget` 이 페이로드 빌더에서 `typedInterview?.improvement_goals[0]` 을 참조 (`hwpx-payload-roadmap.ts:131, 153-161`). V2 인터뷰는 `targetTask` (단일 객체) 사용 (`StepTargetTask.tsx`). **잘못된 키 → 4셀 모두 공란** |

> **#12 영향**: 인터뷰 + 결과 페이지 + HWPX 표(타이틀) 항목명 일괄 수정.
> **#21 영향**: HWPX 페이로드 빌더 (`src/lib/services/export/hwpx/hwpx-payload-roadmap.ts:131, 152-161`) — `improvement_goals` → `targetTask` 로 소스 키 교체.

### 2.8 Ⅲ-1 역량 모델링

| 위치 | 항목명 | 작성안내 | 작성예시 | 비고 |
|---|---|---|---|---|
| 양식 | `1. 역량 모델링` (6×5 표 + NCS 활용/도출 박스) | "선정된 과업에 AI 도입·활용을 위해 요구되는 역량을 구분하여 정의하고, 해당 역량을 위해 필요한 지식·기술·태도를 파악하여..." + "(NCS 활용 시) 능력단위·요소를 참고하되 기업 특성에 맞게 수정한 내용 기술 / (NCS 미활용 시) 역량 분류·지식·기술·태도 도출에 검토한 내용 기술" | (참고자료) NCS 능력단위요소별 지식·기술·태도 예시 — 코드는 의도 제외 | — |
| 인터뷰 | `Ⅲ-1 역량 모델링` description: "선정된 과업에 AI 도입·활용을 위해 요구되는 역량을 정의하고, 지식·기술·태도를 작성합니다." NCS XOR 토글 박스 (활용/미활용) + Accordion 3 bullet | (없음) | OK (양식 √ 안내 그대로 반영) |
| 결과 | `Ⅲ-1. 역량 모델링` `FormTable` 5열 + NCS 박스 (조건부) | "인터뷰에서 정의된 역량(...). LLM 확장 없이 사용자 입력값을 그대로 사용합니다." | — | OK |
| HWPX | tbl[22] (6×5) `_fill_table_competencies` (header 2행) + `{{ncs_methodology}}` `{{ncs_derivation_method}}` (조건부 fallback) | — | — | OK |

### 2.9 Ⅲ-2 훈련체계도 — **#15 대상**

| 위치 | 항목명 | 작성안내 | 작성예시 | 비고 |
|---|---|---|---|---|
| 양식 | `2. 훈련체계도 도출` → `□ 훈련체계도` (5×6 표: 구분(역량명) / 훈련수준 / 훈련내용 / 훈련대상 / 훈련방법 / 훈련목표; **훈련수준 = 초급 / 중급 / 고급 한글**) + `□ 훈련체계 수립 방법` 박스 | "위에서 도출한 역량을 향상시키기 위한 훈련내용 및 훈련대상, 방법, 목표 등을 설정하여, 훈련과정 도출 및 연간 훈련계획 수립 시 활용..." + "훈련체계도 도출 시 고려했던 사항, 방법 등의 훈련체계도 도출 관련 내용을 훈련체계 수립 방법란에 기술" | "초급 / 중급 / 고급" | — |
| 인터뷰 | (LLM 자동 생성 — 인터뷰 입력 없음) | — | — | — |
| 결과 | `Ⅲ-2. 훈련체계도` `FormTable` 6열 (역량명/수준/훈련 내용/훈련 대상/훈련 방법/훈련 목표) + 수립 방법 InlineEdit | "역량 × 초·중·고급 수준별 훈련 내용 (LLM 생성 결과...)" | — | **#15 결함**: 표의 `수준` 컬럼 값이 LLM 결과(`t.level`)를 그대로 표시. LLM 출력이 영문(`BEGINNER` / `INTERMEDIATE` / `ADVANCED`)일 가능성. 결과 페이지에서 한글 라벨(초급/중급/고급)로 변환 필요 (`AI_COMPETENCY_LEVEL_LABEL` 같은 매핑 활용) |
| HWPX | tbl[26] (5×6) `_fill_table_training_structure` (`training_level` 컬럼) + tbl[28] 수립방법 박스 | — | — | 페이로드 빌더 `structureRows` 의 `training_level` 은 `r.level_label` 을 사용하여 한글로 미리 변환됨 (`hwpx-payload-roadmap.ts:145`). HWPX 출력에서는 한글 OK. **결과 페이지만 영문** |

> **#15 영향**: 결과 페이지 V2 `TabTraining.tsx` Ⅲ-2 표의 `수준` 셀 — `t.level` 직접 출력 → 한글 매핑 후 출력.

### 2.10 Ⅲ-3 연간 훈련계획 (참고)

| 위치 | 항목명 | 작성안내 | 작성예시 | 비고 |
|---|---|---|---|---|
| 양식 | `3. 연간 훈련계획 수립` → `□ 훈련과정 목록` (4×5: 구분(역량명)/훈련과정명/훈련형태/훈련시간/비고) + `□ 활용방안` 박스 | "훈련체계도에서 도출한 역량별 훈련내용에 적합한 훈련과정을 매칭하여 목록으로 제시" + "훈련과정 목록으로 제시한 과정의 훈련시기 및 과정별 훈련실시 순서, 해당 훈련과정 시행을 위해 참여할 훈련사업, 정부지원 사업 등 활용방안 작성" | (없음) | — |
| 인터뷰 | (LLM 자동) | — | — | — |
| 결과 | `Ⅲ-3. 연간 훈련계획` `FormTable` 5열 + 활용방안 박스 | "역량별 훈련과정 · 훈련형태 · 시간 · 활용방안 (LLM 생성 결과...)" | — | (참고: #16 — 비고 칸 오용은 R5 PR4 LLM 프롬프트) |
| HWPX | tbl[30] (4×5) `_fill_table_annual_plan` + tbl[32] 활용방안 박스 | — | — | OK |

### 2.11 Ⅲ-4 훈련과정 명세서 — **#17, #18 대상**

| 위치 | 항목명 | 작성안내 | 작성예시 | 비고 |
|---|---|---|---|---|
| 양식 | `4. 훈련과정 상세` → `□ 훈련과정 명세서` (각 11×4 표 3개) — 셀 구성: 과정명 / 훈련형태 / 추천 훈련사업 / 훈련 목표 / 주요훈련내용 / 훈련 대상 / **훈련 내용 (교과목명·세부 내용(단원, 과제명)·훈련시간) 표** | "훈련과정 목록으로 제시한 과정을 대상으로 훈련을 실시할 수 있도록 과정별 명세서를 제시하며, 개발이 필요한 과정의 경우 과정개발..." | 표 헤더 자체가 양식의 가장 핵심 형식 — 교과목별 세부 내용·단원·과제명을 행 단위로 분리 | — |
| 인터뷰 | (LLM 자동) | — | — | — |
| 결과 | `Ⅲ-4. 훈련과정 명세서` 카드 — 카드별 `<dl>` (과정명/훈련형태/추천 훈련사업/훈련목표/주요 훈련내용/훈련대상) + 교과목 `<ul>` (subjects 배열을 단순 list 로 표시: "name — details (hours)") | "주요 훈련과정(3개 이상) 상세 — 과정명·목표·주요내용·훈련대상·교과목 (LLM 생성 결과...)" | — | **#17 결함**: 교과목 details 가 한 줄(string)로 결합되어 표시됨 (LLM 출력이 줄글 1개로 들어옴). 양식 기준 교과목당 세부 내용 2~5개 항목 분리 필요 → LLM 프롬프트(`subjects[].details`) 가 string[] 형 또는 줄바꿈 분리된 string 으로 산출되도록 수정 + 결과 페이지 렌더가 머리기호 분리해 표시. **#18 결함**: 줄글 list 형태(`<ul>` 단일행) → 양식 처럼 표 형태(교과목명 / 세부 내용 / 훈련시간 3열) 로 변경 |
| HWPX | tbl[34/35/36] (각 11×4) `_fill_course_spec_tables` — row 0~5 col1, row 7~10 (subject_name/details/hours) | — | — | HWPX 측은 이미 표 구조 (3열 교과목 영역) 를 가지므로 OK. **결과 페이지만 양식·HWPX 와 시각 형태가 다름** |

> **#17, #18 영향**: 결과 페이지 V2 `TabTraining.tsx` Ⅲ-4 카드 — 교과목 list → 표(`FormTable`) 변경 + LLM 프롬프트 측 (R5 PR4) `subjects[].details` 다항목 출력.

---

## 3. 검수 항목별 요약

### #5 — Ⅱ-2 작성 안내 누락

- **현재 상태(코드)**: `StepCompanyRequirements.tsx` description 에 "기업의 내부전문가와 면담을 통해... 구조적으로 도출**합니다**." 가 있으나, Accordion guide 영역에는 양식 √ 안내의 두번째·세번째 문장만 노출.
- **양식 기준**: √ 작성 안내 영역 첫 문장 = "기업의 내부전문가와 면담을 통해 현재 기업의 현황과 AI 도입·활용에 대한 요구를 구조적으로 도출".
- **차이**: description 톤(서술형) ≠ 양식 √ 안내 톤(명사절). 사용자는 √ 안내 영역에 첫 문장이 보이지 않아 누락으로 판단.
- **영향 범위**: 인터뷰만 (결과/HWPX 무관).

### #10 — Ⅱ-3 첨부 항목명 오기 + 양식 전수 검토

- **현재 상태**: `StepTaskAnalysis.tsx` 첨부 항목 라벨 = `분석 노트 추가 첨부`.
- **양식 기준**: 양식엔 별도 명시 항목명이 없고 본문 텍스트로 `(추가 업로드 자료 예시) 공정 분석` 만 존재. findings 기대값 = `추가 내부 자료`.
- **차이**: 코드의 `분석 노트 추가 첨부` 는 양식·기대 모두와 다름.
- **영향 범위**: 인터뷰만.
- **추가 검토(전수)**: Ⅱ-1 항목명 `1. 기업 AI 역량 수준 진단` ↔ 코드 `Ⅱ-1 HRD이음 진단 보고서 PDF 첨부` 가 양식과 형식이 다름 (의도 변형 — PDF 첨부 1건만 받는 흐름). 양식 텍스트 일치 여부는 사용자 결정 필요.

### #12 — Ⅱ-4 항목명 오기

- **현재 상태**: 인터뷰 `Ⅱ-4 훈련대상 과업 선정` / 결과 `Ⅱ-4. 훈련대상 과업 선정` / 코드 description "Ⅱ-3 분석표에서 식별한 과업 중...".
- **양식 기준**: `4. 훈련대상 과업(Task)·워크플로우 선정`.
- **차이**: `(Task)·워크플로우` 키워드 누락.
- **영향 범위**: 인터뷰 (FormSection title) + 결과 (SectionCard title) + HWPX 표 헤더 텍스트 (양식 그대로 유지되므로 본 PR 에서는 코드만 변경).

### #14 — Ⅰ-3 결과 페이지 디스플레이 정돈

- **현재 상태**: `TabOverview.tsx` Ⅰ-3 카드 = `<dl>` grid 2열 (역량 수준/선정 과업) + 별도 multiline 영역 (요약).
- **양식 기준**: 3행 표 (역량 수준 체크박스 / 선정 과업 / 주요내용 요약).
- **차이**: 표 형태 미구현.
- **영향 범위**: 결과 페이지만.

### #15 — Ⅲ-2 수준 영문 표기

- **현재 상태**: `TabTraining.tsx` Ⅲ-2 `FormTable` 의 `수준` 셀에 `t.level` 직접 출력 → LLM 영문 출력(BEGINNER/INTERMEDIATE/ADVANCED)이 그대로 노출.
- **양식 기준**: 초급 / 중급 / 고급.
- **차이**: 한글 매핑 미적용.
- **영향 범위**: 결과 페이지만 (HWPX 페이로드는 `level_label` 로 한글 변환됨).

### #17 — Ⅲ-4 교과목 세부 내용 빈약

- **현재 상태**: `TabTraining.tsx` 교과목 `<ul>` — `subjects[].details` 가 단일 string 으로 한 줄 표시.
- **양식 기준**: 교과목당 세부 내용 2~5 머리기호 분리.
- **차이**: 다항목 분리 미구현.
- **영향 범위**: 결과 페이지 (UI) + LLM 프롬프트 (R5 PR4 — 결과물 형식 변경).

### #18 — Ⅲ-4 교과목 표 형태

- **현재 상태**: 교과목이 `<ul>` 단일 list 행.
- **양식 기준**: 표 (교과목명 / 세부 내용 / 훈련시간).
- **차이**: 표 컴포넌트 미사용.
- **영향 범위**: 결과 페이지만.

### #20 — Ⅱ-3 표 데이터 HWPX 매핑 누락

- **현재 상태**: `hwpx-payload-roadmap.ts:130` `jobTasks = typedInterview?.job_tasks ?? []` — 인터뷰 V2 스키마는 `taskAnalysis[]` 키. `job_tasks` 는 PBL 인터뷰 또는 V1 키. 결과적으로 `task_workflow_items` 가 항상 빈 배열 → HWPX tbl[15] 6×6 표 모든 데이터 행 공란.
- **양식 기준**: 표 셀 채워짐 (직무/과업/As-Is/문제점/데이터/AI 점수).
- **차이**: 페이로드 키 미스매치.
- **영향 범위**: HWPX 페이로드 빌더 (`src/lib/services/export/hwpx/hwpx-payload-roadmap.ts`) — V2 인터뷰 키(`taskAnalysis`)에서 읽도록 수정.

### #21 — Ⅱ-4 데이터 HWPX 매핑 누락

- **현재 상태**: `hwpx-payload-roadmap.ts:131, 153` `improvementGoals = typedInterview?.improvement_goals ?? []`, `firstTarget = improvementGoals[0]` — V2 인터뷰는 `targetTask` 단일 객체 사용. `improvement_goals` 는 다른 스키마 키. 결과: `training_target` 4 필드 모두 빈 문자열 → HWPX tbl[19] 4×3 모든 셀 공란.
- **양식 기준**: 4 셀 채워짐 (훈련대상 과업/선정사유/As-Is/To-Be).
- **차이**: 페이로드 키 미스매치.
- **영향 범위**: HWPX 페이로드 빌더만 — `improvement_goals[0]` → `targetTask` 객체 직접 매핑.

### 공통-A — 작성안내·작성예시 양식 정합성

- **현재 상태**: 각 Step 컴포넌트에서 `description` (FormSection top) + `<ExampleAccordion guide={...}>` 두 영역에 양식 √ 작성 안내를 분산 배치. 일부는 description 톤(서술형)으로 다듬여 양식 √ 톤(명사절·□ 시작)과 다름. 작성예시는 Ⅱ-2 표의 비고 컬럼에만 일부 노출. Ⅰ-2 (1·2·3차 prefill 예시), Ⅱ-3 ("ex) 생산/품질/설비") 등은 양식엔 있으나 코드엔 누락.
- **양식 기준**: 모든 √ 작성 안내 + ◆/◇ 작성 예시는 본문에 그대로 노출.
- **차이**: 톤 변형 + 일부 작성예시 누락.
- **영향 범위**: 인터뷰 (전 Step) — `ExampleAccordion guide` 영역에 양식 원문을 그대로 넣고, 작성예시는 별도 섹션(`<ExampleAccordion example={...}>`)으로 노출.

---

## 4. 신규 발견 사항

R0 검토 중 발견된 결함으로, 기존 #1~#21 외 별도 항목으로 등록 권고.

### #22 — HWPX 페이로드 빌더의 V1/V2 키 불일치 (#20·#21 의 근본 원인)

- **페이지**: HWPX 다운로드 (서버 측 페이로드 빌더)
- **증상**: `src/lib/services/export/hwpx/hwpx-payload-roadmap.ts` 가 V1 인터뷰 스키마 키(`job_tasks`, `improvement_goals`, `participants`) 를 참조하지만 현재 V2 인터뷰는 `taskAnalysis`, `targetTask`, `performanceActivities` 등 다른 키를 사용. 결과적으로 #20 (Ⅱ-3 표 6열 공란), #21 (Ⅱ-4 4셀 공란) 외에 **Ⅰ-2 주요활동·Ⅱ-2 4행·Ⅲ-1 역량 모델링 등**도 인터뷰 결과 컬럼이 누락될 잠재 위험.
- **기대**: `interview as InterviewLike` 의 InterviewLike 타입을 V2 스키마(`RoadmapInterviewStrict`)에 맞게 갱신하고, 모든 매핑 키를 V2 키로 통일.
- **발견 라운드**: R0
- **영향 범위**: HWPX 페이로드 빌더 (단일 파일 ~330 LOC).

### #23 — Ⅰ-3 결과 페이지의 LLM 요약과 인터뷰 입력 분리

- **페이지**: AI훈련로드맵 결과 페이지 Ⅰ-3
- **증상**: `TabOverview.tsx` 가 `version.outcome_summary.main_content` (LLM 자동 요약) 만 표시. 그러나 양식 √ 안내는 "1장 이내로 요약하여 작성" 으로 사용자가 직접 작성하는 영역으로 의도된 것으로 해석 가능. 현재는 LLM 자동 생성 후 InlineEdit 으로만 수정 가능.
- **기대**: 의도(LLM 자동) 가 맞다면 Ⅰ-3 SectionCard description 에 "LLM 자동 생성 — 직접 수정 가능" 을 명시. 사용자 직접 작성 의도라면 인터뷰 페이지 Ⅰ-3 에 본 입력칸 추가.
- **발견 라운드**: R0
- **영향 범위**: 결과 페이지 (UI 라벨링) 또는 인터뷰 페이지 (필드 추가). 사용자 의도 확인 필요.

> 위 항목들은 findings.md 의 `## 추가 발견 사항` 섹션에 #22, #23 으로 추가될 후보. 해당 섹션이 없을 경우 신설 후 등록.

---

## 5. 수정 권장 체크리스트

> 본 문서는 사용자가 직접 ☑ → ☑(수정 진행) 또는 ☒(유지) 로 편집해 R3 입력으로 사용한다. 별도 파일·슬롯 없음.

- ☑ **#5** — Ⅱ-2 작성 안내 누락 — 양식 √ 안내 첫 문장 "기업의 내부전문가와 면담을 통해 현재 기업의 현황과 AI 도입·활용에 대한 요구를 구조적으로 도출" 을 `StepCompanyRequirements.tsx` Accordion guide 영역(또는 √ 안내 전용 섹션)에 양식 톤 그대로 노출.
- ☑ **#10** — Ⅱ-3 첨부 항목명 오기 — `StepTaskAnalysis.tsx` 의 `분석 노트 추가 첨부` → `추가 내부 자료` 로 변경.
- ☑ **#12** — Ⅱ-4 항목명 오기 — `StepTargetTask.tsx`, `TabRequirements.tsx` 의 `훈련대상 과업 선정` → `훈련대상 과업(Task)·워크플로우 선정` 로 일괄 변경.
- ☑ **#14** — Ⅰ-3 결과 페이지 표 형태 정돈 — `TabOverview.tsx` Ⅰ-3 카드의 `<dl>` 그리드 → 양식 3행 표(기업 AI 역량 수준 / 선정 과업 / AI훈련로드맵 수립 주요내용(요약)) 로 재구성.
- ☑ **#15** — Ⅲ-2 수준 한글 표기 — `TabTraining.tsx` Ⅲ-2 `FormTable` 의 `t.level` 출력 → `AI_COMPETENCY_LEVEL_LABEL[t.level]` 매핑 (또는 LLM 결과를 사전 정규화).
- ☑ **#17** — Ⅲ-4 교과목 세부 내용 머리기호 분리 — LLM 프롬프트(R5 PR4) 에서 `subjects[].details` 를 `string[]` (또는 `\n` 분리 string) 으로 출력하도록 수정 + `TabTraining.tsx` 가 `<ul>` 머리기호로 렌더.
- ☑ **#18** — Ⅲ-4 교과목 표 형태 — `TabTraining.tsx` 교과목 `<ul>` → `FormTable` (교과목명 / 세부 내용 / 훈련시간 3열) 변경.
- ☑ **#20** — Ⅱ-3 표 데이터 HWPX 매핑 누락 — `src/lib/services/export/hwpx/hwpx-payload-roadmap.ts:130, 242` `typedInterview.job_tasks` → V2 인터뷰 `taskAnalysis[]` 매핑으로 교체. `InterviewLike` 타입도 V2 키로 갱신.
- ☑ **#21** — Ⅱ-4 데이터 HWPX 매핑 누락 — `hwpx-payload-roadmap.ts:131, 152-161` `improvement_goals[0]` → `targetTask` (단일 객체) 매핑으로 교체.
- ☑ **공통-A** — 작성안내·작성예시 양식 정합성 — Step 7개 (`StepNecessity`, `StepPerformanceActivities`, `StepMainResult`, `StepHrdReportPdf`, `StepCompanyRequirements`, `StepTaskAnalysis`, `StepTargetTask`, `StepCompetencyModeling`) 의 description / Accordion guide 를 양식 √ 안내 원문 톤으로 통일하고, 양식의 ◆ 작성 예시 (Ⅰ-2 차수 prefill, Ⅱ-3 직무 ex) 등) 를 별도 예시 영역으로 노출.
- ☑ **#22 (신규)** — HWPX 페이로드 빌더 V1→V2 키 일괄 정합 — `hwpx-payload-roadmap.ts` 의 모든 매핑 키를 V2 인터뷰 스키마 (`RoadmapInterviewStrict`) 에 맞게 갱신.
- ☑ **#23 (신규)** — Ⅰ-3 LLM 요약 vs 사용자 작성 의도 명확화 — `TabOverview.tsx` Ⅰ-3 SectionCard description 에 데이터 출처/편집 가능 여부 명시 (또는 인터뷰 페이지 Ⅰ-3 에 직접 입력 필드 추가).

---

## 부록: 참고 파일 경로

| 분류 | 절대 경로 |
|---|---|
| findings (SoT) | `/Users/baekkyunshin/Desktop/AI-roadmap-dashboard/docs/plans/2026-04-29-roadmap-review-findings.md` |
| 양식 PDF | `/Users/baekkyunshin/Desktop/AI-roadmap-dashboard/docs/references/1.AI훈련로드맵 컨설팅 보고서(양식).pdf` |
| 양식 HWPX | `/Users/baekkyunshin/Desktop/AI-roadmap-dashboard/docs/references/1.AI훈련로드맵 컨설팅 보고서(양식).hwpx` |
| HWPX 구조 분석 | `/Users/baekkyunshin/Desktop/AI-roadmap-dashboard/docs/references/hwpx-structure-roadmap.md` |
| 플레이스홀더 SSOT | `/Users/baekkyunshin/Desktop/AI-roadmap-dashboard/docs/references/hwpx-placeholders.json` |
| 인터뷰 컴포넌트 | `/Users/baekkyunshin/Desktop/AI-roadmap-dashboard/src/app/(dashboard)/consultant/projects/[id]/interview/_components/roadmap/` |
| 결과 페이지 V2 | `/Users/baekkyunshin/Desktop/AI-roadmap-dashboard/src/app/(dashboard)/consultant/projects/[id]/roadmap/_components/result-v2/` |
| HWPX 매핑 (Python) | `/Users/baekkyunshin/Desktop/AI-roadmap-dashboard/api/hwpx/_placeholders_roadmap.py` |
| HWPX 표 채움 (Python) | `/Users/baekkyunshin/Desktop/AI-roadmap-dashboard/api/hwpx/generate.py` |
| HWPX 페이로드 (Node.js) | `/Users/baekkyunshin/Desktop/AI-roadmap-dashboard/src/lib/services/export/hwpx/hwpx-payload-roadmap.ts` |
