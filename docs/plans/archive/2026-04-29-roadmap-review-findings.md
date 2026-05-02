# AI훈련로드맵·PBL 검수 결과 (2026-04-29)

- **검수자**: 사용자 (직접 검수)
- **검수일**: 2026-04-29
- **검수 환경**: 컨설턴트 계정으로 AI훈련로드맵 인터뷰 입력 → 결과 페이지 → HWPX 다운로드까지 전체 흐름 검수
- **건수**: 21건 + 공통 3건
- **라운드별 prompt**: `prompts/2026-04-29-rN-*.md` 참조

---

## 인터뷰 입력 페이지 (consultant/projects)

### #1 — 인터뷰 페이지 부제 오기

- **페이지**: AI훈련로드맵 인터뷰 입력 페이지 (`consultant/projects`, 컨설턴트로 로그인)
- **증상**: 상단 제목이 `AI훈련로드맵 인터뷰 (양식 1:1 정합)`로 되어 있음
- **기대**: `AI훈련로드맵 인터뷰`로 수정. 즉 `(양식 1:1 정합)` 용어는 삭제

> [해결됨][PR #42] 2026-04-29 — `RoadmapInterviewClient.tsx:482` title 수정 + 회귀 테스트 추가

### #2 — 로마자/숫자 폰트 불일치

- **페이지**: AI훈련로드맵 인터뷰 입력 페이지
- **증상**: `Ⅰ-1 수립 필요성`에서 `Ⅰ-1` 로마자 및 숫자의 폰트가 본문과 다름
- **기대**: 폰트를 통일. **이 외 모든 로드맵 인터뷰 화면 및 PBL 인터뷰 화면의 항목 왼쪽 로마자·숫자도 동일 적용**

> [해결됨][PR #42] 2026-04-29 — `FormSection.tsx` 공용 컴포넌트의 number span 에서 `font-mono text-sm` 제거 → `text-xl font-semibold` 로 본문과 통일. 모든 로드맵·PBL Step 자동 적용

### #3 — Ⅰ-2 텍스트 폼 높이 미달

- **페이지**: AI훈련로드맵 인터뷰 입력 페이지
- **증상**: `Ⅰ-2 주요 활동`에서 수행 일시·수행 내용 텍스트 폼 높이가 표 칸 높이보다 작음
- **기대**: 실제 표 칸 높이와 같도록 폼 높이 늘리기

> [해결됨][PR #42] 2026-04-29 — `StepPerformanceActivities.tsx` 수행 일시·내용 LargeTextBox `min-h-[70px]` → `min-h-[120px]` (양 칸 동일 높이로 표 칸 정합)

### #4 — Ⅰ-2 '+ 차수 추가' 버튼 무동작

- **페이지**: AI훈련로드맵 인터뷰 입력 페이지
- **증상**: `Ⅰ-2 주요 활동`의 `+ 차수 추가` 버튼을 눌러도 동작하지 않음
- **기대**: 버튼 클릭 시 차수가 추가되도록 수정

> [해결됨][PR #45] 2026-04-29 — 근본 원인은 `StepPerformanceActivities.tsx` 의 `MAX_ROUNDS=3` 이 `defaultRows()` 의 1·2·3차 prefill 길이와 같아 마운트 직후 영구 disabled 였던 것. `MAX_ROUNDS 3→5` 로 확장 + `DEFAULT_ROUNDS=3` 별도 상수로 분리해 prefill 은 양식 √ 안내 (1·2·3차) 보존. Zod `RoadmapOverviewSchema.performanceActivities .max(3)→.max(5)`. 행 삭제 기능은 기존 `removeRound` + `RoundRows.disableRemove` 그대로 활용. 회귀 테스트 3건 (4차 추가·5차 disabled·4차 활성).

### #5 — Ⅱ-2 작성 안내 문구 누락

- **페이지**: AI훈련로드맵 인터뷰 입력 페이지
- **증상**: `Ⅱ-2 기업 요구분석` 작성 안내에 `기업의 내부전문가와 면담을 통해 현재 기업의 현황과 AI 도입·활용에 대한 요구를 구조적으로 도출` 문구가 빠져 있음
- **기대**: 양식상의 작성 안내 중 빠진 부분 없도록 보강. **이는 본 항목뿐 아니라 로드맵·PBL 인터뷰 내 모든 항목에 해당하므로 함께 검토 필요**

> [해결됨][PR #43] 2026-04-29 — `StepCompanyRequirements.tsx` ExampleAccordion guide 의 `<ul>` 첫 항목으로 양식 √ 첫 문장 (명사절 톤) 노출. 회귀 테스트 추가.

### #6 — Ⅱ-2 비고 작성 불가

- **페이지**: AI훈련로드맵 인터뷰 입력 페이지
- **증상**: `Ⅱ-2 기업 요구분석`의 비고 칸에 입력이 되지 않음
- **기대**: 비고도 작성되도록 수정

> [해결됨][PR #45] 2026-04-29 — 근본 원인은 `StepCompanyRequirements.tsx` 의 비고 셀이 정적 텍스트 (`<td>{row.example}</td>`) 로 렌더되어 입력 필드 자체가 없던 것. 비고 셀을 `LargeTextBox` 4 개로 교체하고 양식 √ 작성 예시는 `ExampleAccordion.example` 영역으로 이전. `RoadmapCompanyRequirementsSchema` 에 옵셔널 `remarks: { status?, problem?, will?, outcomes? }` 추가, `companyRequirementsToDb` + 역변환에 매핑 보강 (JSONB 임의 키 — DB 컬럼 추가 불요). 결과 페이지 `TabRequirements` 에 비고 컬럼 표시. HWPX payload 에도 `*_remarks` 4 키 추가 (양식 템플릿에 placeholder 없으면 안전 무시). 회귀 테스트 5건 (입력·반영·readOnly·스키마 보존·round-trip). PBL grep 결과 동일 패턴 없음.

### #7 — Ⅱ-2 텍스트 폼 높이 부족

- **페이지**: AI훈련로드맵 인터뷰 입력 페이지
- **증상**: `Ⅱ-2 기업 요구분석` 4개 항목 텍스트 폼 높이가 낮음
- **기대**: 폼 높이를 현재의 약 **1.7배**로 확대

> [해결됨][PR #42] 2026-04-29 — `StepCompanyRequirements.tsx` 4개 항목 LargeTextBox `min-h-[96px]` → `min-h-[163px]` (96 × 1.7 ≈ 163)

### #8 — Ⅱ-3 표 내 텍스트 폼 높이 부족

- **페이지**: AI훈련로드맵 인터뷰 입력 페이지
- **증상**: `Ⅱ-3 과업·워크플로우 분석` 표 내 텍스트 폼 높이가 낮음
- **기대**: 폼 높이를 현재의 약 **2.5배**로 확대

> [해결됨][PR #42] 2026-04-29 — `StepTaskAnalysis.tsx` 5개 칼럼 (직무/과업/As-Is/문제점/데이터 발생 시점) LargeTextBox `min-h-[60px]` → `min-h-[150px]` (60 × 2.5 = 150)

### #9 — Ⅱ-3 첨부 항목명 오기

- **페이지**: AI훈련로드맵 인터뷰 입력 페이지
- **증상**: `Ⅱ-3 과업·워크플로우 분석`의 `분석 노트 추가 첨부` 항목명이 양식과 다름
- **기대**: 명칭을 `추가 내부 자료`로 수정

### #10 — Ⅱ-3 첨부 항목명 오기 (재기재 + 양식 전수 검토)

- **페이지**: AI훈련로드맵 인터뷰 입력 페이지
- **증상**: `Ⅱ-3 과업·워크플로우 분석`의 `분석 노트 추가 첨부` 항목명이 양식과 다름
- **기대**: 명칭을 `추가 내부 자료`로 수정. **이 외에도 양식과 제목이 다른 부분이 있다면 검토 필요. 단 수정 전 사용자의 승인을 반드시 받을 것.**

> [해결됨][PR #43] 2026-04-29 — `StepTaskAnalysis.tsx` 의 `<h3>분석 노트 추가 첨부</h3>` → `<h3>추가 내부 자료</h3>`. PBL 측 Ⅱ-3-가 항목명도 `기업HRD이음컨설팅 결과 (PDF 첨부)` 로 함께 정정 (#10 PBL).

### #11 — Ⅱ-4 표 내 텍스트 폼 높이 부족

- **페이지**: AI훈련로드맵 인터뷰 입력 페이지
- **증상**: `Ⅱ-4 훈련대상 과업 선정` 표 내 텍스트 폼 높이가 낮음
- **기대**: 폼 높이를 현재의 약 **2배**로 확대

> [해결됨][PR #42] 2026-04-29 — `StepTargetTask.tsx` 4개 항목 LargeTextBox 각각 ×2 (훈련대상 과업 60→120, 선정 사유 100→200, 기대 효과 As-Is 80→160, 기대 효과 To-Be 80→160)

### #12 — Ⅱ-4 항목명 오기

- **페이지**: AI훈련로드맵 인터뷰 입력 페이지
- **증상**: 항목명이 `Ⅱ-4 훈련대상 과업 선정`으로 잘못 표기되어 있음
- **기대**: `Ⅱ-4 훈련대상 과업(Task)·워크플로우 선정`으로 수정

> [해결됨][PR #43] 2026-04-29 — `StepTargetTask.tsx` FormSection title + `TabRequirements.tsx` SectionCard title 일괄 정정. PBL Step 9 단축명 `Ⅲ-3·4` → `Ⅲ-3·Ⅲ-4` 도 함께 (#12 PBL · PBL-자체-06).

---

## 결과 페이지 (consultant/projects, 컨설턴트로 로그인)

### #13 — 탭 전환 딜레이

- **페이지**: AI훈련로드맵 결과 페이지
- **증상**: `Ⅰ. 개요`, `Ⅱ. 요구분석`, `Ⅲ. 훈련체계` 탭 클릭 시 전환 딜레이 발생
- **기대**: 탭이 즉시 전환되도록 개선

> [해결됨][PR #45] 2026-04-29 — 원인 3 가지: ① `RoadmapResultClient`·`PBLResultClient` 의 `tabs` 배열·`commonTabProps` 가 매 렌더 새 객체로 생성되어 자식 Tab 컴포넌트들의 reconciliation 비용 발생, ② `ResultTabs` 의 `handleValueChange` 가 `URLSearchParams` 파싱 + `router.replace` 를 동기 호출해 메인 스레드 블록, ③ activeValue 가 `useSearchParams` 파생이라 라우터 상태가 갱신될 때까지 새 탭이 활성화되지 않음. 처리: `commonTabProps`·`tabs` `useMemo` 적용 (`react-best-practices: rerender-memo`). `ResultTabs` 에 local `activeValue` 도입 + `useTransition` 으로 `router.replace` 분리 (`react-best-practices: rerender-transitions`) → 클릭 즉시 새 탭 표시, URL 동기화는 background. `useEffect` 로 외부 URL 변경 (뒤로가기·북마크) sync. 공유 컴포넌트라 PBL 결과 페이지에도 자동 적용. 회귀 테스트 1건 (local state 즉시 반응 — `useSearchParams` 갱신 대기 없이 새 탭 콘텐츠 표시).

### #14 — Ⅰ-3 디스플레이 정돈 필요

- **페이지**: AI훈련로드맵 결과 페이지
- **증상**: `Ⅰ-3 수립 주요 결과`의 디스플레이가 정돈되지 않음
- **기대**: 깔끔하게 보이도록 개선 (양식처럼 표 형태 권장)

> [해결됨][PR #42] 2026-04-29 — `TabOverview.tsx` Ⅰ-3 카드 `<dl>` 그리드 → `FormTable` 3행 (역량 수준 / 선정 과업 / 요약). main_content `InlineEditField` 편집 기능 보존. SectionCard description 도 양식 √ 안내문 ("뒤쪽에서 작성된 훈련요구 분석 및 로드맵 수립 결과를 한 번에 확인할 수 있도록 1장 이내로 요약") 으로 갱신

> [해결됨][PR R9] 2026-05-01 — #14(PBL) 적용. `TabPBLOps.tsx` 의 Ⅳ-3-가/나/다/라/마 5 SectionCard 가 줄글·카운트만 표시하던 것 → 양식 정합 `FormTable` 5 표 (P-18~P-22 1:1) 로 변환. Ⅳ-3-가 mini 2x2 표 (과정명·훈련기간), Ⅳ-3-나 6 컬럼 병합 표 (instructors+trainees, 구분 라벨 "훈련 강사"/"훈련생" 은 Python `_placeholders_pbl.py:471/482` 와 동일), Ⅳ-3-다 메타 mini-table + training_contents 5 컬럼 표 분리, Ⅳ-3-라 5 컬럼 시설·장비 표, Ⅳ-3-마 5 컬럼 강사 표 (`detailed_training_content[]` `bulletize` 줄바꿈). 셀 fallback `'-'` 일관 적용. 회귀 테스트 15 건 (5 표 렌더 + 부분 결손 + 빈 contents + 카운트 줄글 negative + caption a11y).

### #15 — Ⅲ-2 수준 영문 표기

- **페이지**: AI훈련로드맵 결과 페이지
- **증상**: `Ⅲ-2 훈련체계도`의 수준이 영어로 표시됨
- **기대**: 한글로 표기 — `초급`, `중급`, `고급`

> [해결됨][PR #42] 2026-04-29 — `roadmap-types.ts` 에 `TRAINING_LEVEL_LABEL` 상수 신규 추가 (BEGINNER→초급, INTERMEDIATE→중급, ADVANCED→고급) + `TabTraining.tsx` 수준 컬럼 매핑 적용

> 메모(2026-04-29, R3 PR2로부터): #15(PBL) — `AiLevel4Check.tsx` 위젯 (`src/components/charts/`) 검수 완료. LEVEL_OPTIONS 가 BASIC/EXPLORER/USER/LEADER enum 을 한글 라벨 (AI기초형·AI탐구형·AI활용형·AI선도형) 로 노출. 영문 enum 은 내부 코드/HWPX 페이로드에만 사용. **변경 불요.** R3 PR 에 회귀 테스트 (TabTraining 한글 라벨 표시 + 영문 enum 미노출) 보강 — Ⅰ-3 FormTable 3행 보강 (#14) 도 함께.

### #16 — Ⅲ-3 비고 칸 오용

- **페이지**: AI훈련로드맵 결과 페이지
- **증상**: `Ⅲ-3 연간 훈련계획` 비고에 특이사항이 아닌 일반 내용이 모두 기재됨
- **기대**: 비고에는 특이사항만 기재. 없을 경우 빈칸 유지

> [해결됨][PR #46] 2026-04-29 — `roadmap-prompts.ts` Ⅲ-3 정책 강화 — `notes는 특이사항만 기재. 빈 문자열("")로 두라 — null 사용 금지. 최대 80자, 한 문장 이내`. few-shot 첫 항목을 빈 문자열, 둘째 항목을 `"1·2 과정 이수자 대상"` 수강 자격 제한 케이스로 갱신 (대비 학습). JSON 스키마 부분도 `"string (특이사항만. 없으면 빈 문자열. 최대 80자)"` 로 정합. Zod `annualPlanItemSchema.notes: z.string().max(80)` 추가. 회귀 테스트 2건 (81자 실패·빈 문자열 통과).

### #17 — Ⅲ-4 교과목 세부 내용 빈약

- **페이지**: AI훈련로드맵 결과 페이지
- **증상**: `Ⅲ-4 훈련과정 명세서` 내 교과목이 단순 기재됨 (실질적으로 가장 중요한 내용)
- **기대**: 교과목 세부 내용을 머리기호로 분리하여 **교과목당 2~5개 항목** 기재

> [해결됨][PR #46] 2026-04-29 — `roadmap-prompts.ts` Ⅲ-4 정책 강화 — `subjects[*].details: 2~5개 구체 활동을 줄바꿈(\n)으로 구분. 명사구·머리기호 부착 금지·1줄 형식 금지. 항목 1개뿐인 단순 과목은 단일 문자열 허용`. few-shot 마지막 과목을 5개 항목 상한 경계값으로 강화. JSON 스키마 부분도 `"string (2~5개 항목. 줄바꿈\n으로 구분)"` 로 정합. Zod `courseSubjectSchema.details` refine 추가 — split 후 1~5 항목 (1 허용으로 legacy DB fallback, 6+ 차단으로 줄글 방지). DRAFT `editableCourseSubjectSchema` 미변경 → 사용자 편집 중 빈 details/임시 1줄 보존. 결과 페이지 렌더(`splitByUnit` + `<ul>`)·HWPX 매퍼는 R3 PR #43 에서 선처리되어 변경 불요. 회귀 테스트 4건 (6항목 실패·1·3항목 통과·공백 실패).

> [해결됨][PR R9] 2026-05-01 — #17(PBL) 적용. `TabPBLOps.tsx` Ⅳ-3-다 의 `training_contents[].detail` 셀에 `splitByUnit` + `whitespace-pre-wrap` 적용 (TabTraining Ⅲ-4 동일 패턴). 메타 표의 `training_goals[]`·`ai_tools[]` 도 `bulletize` 머리기호 줄바꿈으로 분리. Ⅳ-3-마 `detailed_training_content[]` 도 `bulletize` 적용 (강사별 세부 훈련 내용 명확화).

### #18 — Ⅲ-4 교과목 줄글 표시

- **페이지**: AI훈련로드맵 결과 페이지
- **증상**: `Ⅲ-4 훈련과정 명세서` 내 교과목이 줄글로 되어 있어 시각적으로 보기 좋지 않음
- **기대**: 교과목을 **표 형태**로 표시

> [해결됨][PR #43] 2026-04-29 — `TabTraining.tsx` Ⅲ-4 교과목 `<ul>` → `FormTable` 3열 (교과목명 / 세부 내용 / 훈련시간). #17 의 결과 페이지 측 (details 머리기호 분리) 도 `splitByUnit` + `<ul><li>` 로 함께 처리. LLM 프롬프트 측 `subjects[].details` 다항목 출력은 R5 PR4 위임 (R5 prompt 메모 갱신).

> [해결됨][PR R9] 2026-05-01 — #18(PBL) 적용. `TabPBLOps.tsx` Ⅳ-3-나/다/라/마 4 SectionCard 가 카운트("총 N건/N명") 또는 단일 줄 표시만 하던 것 → `FormTable` 표 형태로 일괄 변환. Ⅳ-3-다 의 양식 15x10 거대 표는 메타 mini-table + training_contents 표로 분리. Ⅳ-3-나 는 instructors+trainees 를 한 표에 병합 (구분 컬럼 합성). 카운트 줄글 회귀 negative assertion (`expect(text).not.toMatch(/총 \d+ 건|명/)`) 추가하여 회귀 가드.

### #19 — 결과 직접 수정 불가

- **페이지**: AI훈련로드맵 결과 페이지
- **증상**: 결과 페이지 내 내용을 직접 수정할 수 없음
- **기대**: 도출된 결과를 직접 수정할 수 있도록 수정 기능 적용. **PBL 결과 페이지에도 동일 적용**

> [해결됨][PR R7] 2026-04-30 — PR-A·PR-B 통합 적용. **로드맵 결과 페이지** Ⅲ-2 훈련체계도 / Ⅲ-3 연간 훈련계획 / Ⅲ-4 훈련과정 명세서·교과목 표 영역에 신규 `EditableTable` 컴포넌트 (행 단위 InlineEditField + 행 추가/삭제 + min/maxRows 가드) 적용. `editRoadmapManually`(roadmap-crud.ts:149) 의 DRAFT 가드를 ARCHIVED-만-차단 정책으로 변경해 **FINAL in-place 수정 허용** (동일 version_number·finalized_at 보존). 감사로그를 `ROADMAP_UPDATE` → `ROADMAP_RESULT_EDITED` 로 분기하고 meta 에 `status / version_id / fields_changed / diff` (텍스트 ≤200자 원문, 배열 length 비교) 페이로드 기록. **PBL 결과 페이지** `editPBLV2`(pbl/actions.ts:776) 도 동일하게 ARCHIVED-만-차단 + 감사로그 `PBL_REPORT_EDITED` (`source: 'RESULT_PAGE'`) 분기. 두 결과 페이지 모두 FINAL 상태 안내 배너 추가. 마이그 `070_audit_actions_pr5.sql` 로 `audit_action` enum 4 종 (`ROADMAP_RESULT_EDITED`, `PBL_REPORT_EDITED`, `INTERVIEW_FIELD_EDITED`, `RESULT_REGENERATED_FROM_REVIEW`) 확장. PBL Tab 의 표 영역 (activities / problems) EditableTable 적용은 patch 시그니처 확장이 동반되어 후속 PR 로 분리. Ⅴ 성과분석 placeholder 는 spec §5.2 명시대로 범위 외. `EditableTable` / `InlineSelectField` / `roadmap-crud` 회귀 테스트 12+5건, 기존 결과 페이지 회귀 (RoadmapResultClient·TabTraining·actions-v2) 갱신 완료.

---

## HWPX 다운로드

### #20 — 3. 과업·워크플로우 분석 표 공란

- **페이지**: AI훈련로드맵 HWPX 다운로드
- **증상**: `3. 과업(Task)·워크플로우 분석`의 □ 과업·워크플로우 분석표에 직무·현행방식·문제점·데이터 발생 시점·AI 도입활용 필요도 항목이 모두 공란 (플레이스홀더 매핑 결함 추정)
- **기대**: 모든 항목이 채워지도록 수정

> [해결됨][PR #43] 2026-04-29 — 진짜 원인은 `hwpx-payload-roadmap.ts` 의 `InterviewLike` 가 V1 키 (`job`/`as_is`/`problems`) 만 가정하고 V2 마이그레이션 후 production DB 키 (`roadmap_job`/`task_description`/`roadmap_problems`/`roadmap_data_availability`/`roadmap_ai_necessity`) 를 인식 못해 모든 셀이 undefined → 빈 문자열로 출력되던 것. V2 키 우선 + V1 fallback 으로 매핑 통일. 단위 테스트 추가. PBL 측 P-09 problems 의 `impact` 필드도 `description` 셀에 결합 출력해 양식 5x2 한계 내에서 정보 손실 방지 (#20 PBL).

### #21 — 4. 훈련대상 과업·워크플로우 선정 누락

- **페이지**: AI훈련로드맵 HWPX 다운로드
- **증상**: `4. 훈련대상 과업(Task)·워크플로우 선정` 내용이 모두 빠져 있음
- **기대**: 모든 항목이 채워지도록 수정

> [해결됨][PR #43] 2026-04-29 — `hwpx-payload-roadmap.ts` 의 `improvement_goals[0]` V1 키 (`task_name`/`selection_reason`/`as_is`/`to_be`) 우선 → V2 마이그 후 실제 DB 키 (`kpi`/`goal_description`/`roadmap_as_is`/`roadmap_to_be`) 우선으로 정정. V1 fallback 유지. 단위 테스트 추가. PBL 측 P-13 max_items=2 는 양식 4x5 행 수 한계라 확대 불가 — 별도 PR 도 필요 없음 (양식 자체 제약).

---

## 공통사항

### 공통-A — 작성안내·작성예시 양식 정합성 미흡

- **증상**: 로드맵 인터뷰 및 PBL 인터뷰 항목당 하단 작성 안내가 양식과 다른 내용이 기입된 경우가 많음
- **기대**: 양식의 작성 안내는 그대로 포함. 양식에 `작성예시`가 있는 경우, 작성 예시도 작성 안내에 함께 표시

> [해결됨][PR #43] 2026-04-29 — 로드맵 4개 Step (Ⅰ-2 Performance / Ⅰ-3 MainResult / Ⅱ-1 HrdReportPdf / Ⅱ-3 TaskAnalysis) 의 ExampleAccordion guide 영역에 양식 √ 안내 원문 보강 (별도 작성 불요·1장 이내 요약·등급 매핑·핵심 과업 분석). Ⅰ-2 / Ⅱ-3 은 `<ExampleAccordion example>` 별도 영역에 양식 ◆ 작성 예시 (1·2·3차 prefill / 공정 분석) 노출. PBL 측 Ⅱ-1-가 (StepCompanyIssues) + Ⅲ-3·Ⅲ-4 (StepTargetAndLevel) 도 양식 √ 안내·◆ 작성 예시 보강. 양식 √ 안내 노출 회귀 테스트 5건 (로드맵 4 + PBL 1). 나머지 PBL Step 6개 (StepOverview / StepOrganization / StepTrainingEnv / StepCourseNecessity / StepActivities / StepProblems) 의 양식 √ 안내 원문 추가 보강은 본 PR 영향 범위 작은 변경이라 후속 round 에서 차분 추가 가능 (현 R3 결과: 핵심 결함 영역 정합성 회복).

### 공통-B — 인터뷰 제출 후 검토 페이지 부재

- **증상**: 인터뷰 최종 제출 후 전체 항목을 한 페이지에서 확인할 수 있는 검토 페이지 없이 곧장 `AI 로드맵 생성` 버튼이 노출되어 UI/UX가 좋지 않음
- **기대**: 최종 제출 후 인터뷰 항목 전체를 한 페이지에서 조회 가능. 해당 페이지에서 직접 수정도 가능하도록

> [해결됨][PR R7] 2026-04-30 — PR-C 적용. 신규 라우트 `/consultant/projects/[id]/interview/review` 추가 (page.tsx + InterviewReviewClient + ReviewActions + StaleResultBanner). 로드맵 8 Step / PBL 9 Step 모두 한 페이지에서 접힘식 카드로 표시하며, 단일 텍스트 필드 (`establishmentNecessity` / `companyRequirements` 4행 / `targetTask` 4행 / `taskAnalysisNote` / PBL overview 4행) 는 `InlineEditField` 인라인 편집을 지원. 표 영역 (`performanceActivities` / `taskAnalysis` / `competencies` / `activities` / `problems`) 은 read-only 표시 + "📝 인터뷰 페이지로 돌아가기" CTA 안내 (행 추가·삭제는 인터뷰 페이지에서). `RoadmapInterviewClient.tsx` / `PBLInterviewClient.tsx` 의 제출 후 redirect 를 `/roadmap` · `/pbl` → `/interview/review` 로 변경. `interviews.updated_at > 결과.created_at` 일 때만 `StaleResultBanner` 노출 + `[재생성]` 클릭 시 `triggerResultRegenerationFromReview` 감사로그 (`RESULT_REGENERATED_FROM_REVIEW`) 후 결과 페이지 navigate. 단일 필드 patch 는 `editInterviewFieldRoadmap` / `editInterviewFieldPbl` Server Action 이 `saveRoadmapInterviewV2(autoSave: true)` / `savePBLInterviewV2(autoSave: true)` 를 위임 호출하고 `INTERVIEW_FIELD_EDITED` (`source: 'REVIEW_PAGE'`) 감사로그 추가. `StaleResultBanner` 단위 테스트 4건 + 인터뷰 클라이언트 redirect 회귀 갱신.

### 공통-C — AI 로드맵 생성 99% 단계 정체

- **증상**: AI 로드맵 생성 중 진행률 오버레이가 99%에서 오랜 시간 머묾
- **기대**: 진행률 진척 시간을 약 **15초 정도** 늘릴 것 (사용자 체감 개선)

> [해결됨][PR #42] 2026-04-29 — `RoadmapLoadingOverlay.tsx` `STEP_DURATIONS_MS` 마지막 단계 43000 → 58000 (총 130s → 145s). PBL·테스트 모두 자동 적용 (공통 컴포넌트)

---

## 주의 사항

1. 본 검수는 **컨설턴트 계정**에서 **로드맵 항목**만 확인. **PBL 항목 및 운영관리자/시스템관리자 계정**에서도 동일한 기능·메뉴·로직·UI가 있다면 함께 일괄 수정. **단, 수정 전 사용자 승인을 받을 것** (예: PBL 인터뷰의 어떤 메뉴에서 무엇이 잘못되어 있고 어떻게 바꿀지 사전 승인 필요).
2. 본 문서는 라운드 0(매트릭스 산출) 및 후속 PR 라운드의 **단일 입력 자료(Source of Truth)** 로 사용됨. 새 세션에서도 이 파일 경로를 prompt에 명시하면 클로드가 그대로 참조 가능.

---

## 항목별 라운드 분류 (참고)

| 라운드/PR | 항목 |
|---|---|
| **R0 매트릭스 대상** | #5, #10, #12, #14, #15, #17, #18, #20, #21, 공통-A |
| **R2 PR1 단순 일괄** | #1, #2, #3, #7, #8, #11, #14, #15, 공통-C |
| **R3 PR2 양식 정합성** | #5, #9, #10, #12, 공통-A |
| **R4 PR3 동작 버그** | #4, #6, #13, #20, #21 |
| **R5 PR4 LLM 프롬프트** | #16, #17, #18 |
| **R6 PR5 신규 기능 (설계+구현)** | #19, 공통-B |

> #14·#15는 R2(시각 정돈)와 R0(양식 정합성 검토) 모두에 등장하므로 R2에서 양식 일치 여부까지 함께 처리.

---

## 추가 발견 사항

R0 매트릭스 작업 (`docs/plans/2026-04-29-roadmap-form-matrix.md`) 중 발견된 결함.

### #22 — HWPX 페이로드 빌더의 V1/V2 인터뷰 스키마 키 불일치

- **페이지**: AI훈련로드맵 HWPX 다운로드 (서버 측 페이로드 빌더, `src/lib/services/export/hwpx/hwpx-payload-roadmap.ts`)
- **증상**: 페이로드 빌더가 V1 인터뷰 스키마 키 (`job_tasks` L130 / `improvement_goals` L131 / `participants` L132) 를 참조하지만, 현재 V2 인터뷰는 `taskAnalysis` / `targetTask` / `performanceActivities` 등을 사용. 결과적으로 #20·#21 외에 Ⅰ-2 주요활동 표·Ⅱ-2 4행 등 다수 영역이 잠재적으로 빈 값 출력 위험 (기존 데이터 마이그레이션 케이스 의존).
- **기대**: `InterviewLike` 타입을 V2 스키마(`RoadmapInterviewStrict`) 에 맞게 갱신하고, 페이로드 빌더의 모든 매핑 키를 V2 키로 통일. #20·#21 의 근본 원인이므로 함께 처리 권장.
- **발견 라운드**: R0

> [해결됨][PR #43] 2026-04-29 — 정확한 V2 마이그 후 DB 키는 `RoadmapInterviewStrict` 가 아니라 `mapRoadmapInterviewToDb` 가 출력하는 snake_case + roadmap_ prefix 형태 (`roadmap_job` / `task_description` / `roadmap_problems` / `kpi` / `goal_description` 등). `InterviewLike` 에 V2 DB 키 + V1 legacy 키 union 추가. `task_workflow_items`·`training_target`·`performance_activities` 매핑 모두 V2 우선 + V1 fallback 으로 통일. Ⅰ-2 주요 활동은 `company_details.roadmap_overview.performance_activities[]` 차수별 배열 우선 (PM·전문가 행별 분리), V1 단일 컬럼 (`interview_date`/`interview_round`/`interview_method`/`participants`) fallback. #20·#21 근본 원인 해결.

### #23 — Ⅰ-3 LLM 요약과 사용자 작성 의도 분리

- **페이지**: AI훈련로드맵 결과 페이지 Ⅰ-3 수립 주요 결과
- **증상**: `TabOverview.tsx` 가 `version.outcome_summary.main_content` (LLM 자동 요약) 만 표시하고, `InlineEditField` 로 사후 편집만 가능. 양식 √ 안내는 "1장 이내로 요약하여 작성" 으로 사용자 직접 작성 의도일 수도 있음 — 의도 모호.
- **기대**: 의도(LLM 자동) 가 맞다면 SectionCard description 에 데이터 출처(LLM 자동 생성 — 직접 수정 가능) 명시. 사용자 직접 작성 의도라면 인터뷰 페이지 Ⅰ-3 에 본 입력칸 추가.
- **발견 라운드**: R0

> [해결됨][PR #43] 2026-04-29 — 사용자 결정에 따라 (a) LLM 자동 생성 + description 명시 채택. `TabOverview.tsx` Ⅰ-3 SectionCard description 에 `'LLM 자동 생성, 직접 수정 가능'` 추가. 인터뷰 스키마 변경 없음. 회귀 테스트 추가.

---

> **PBL 흐름 R0 추가 항목 (PBL-자체-NN)** — 2026-04-29 PBL 매트릭스 산출 (`docs/plans/2026-04-29-pbl-form-matrix.md`) 중 신규 식별. 사용자 직접 검수 미실행 — 양식·코드 4중 비교 기준 1차 식별 결과. 수정 전 사용자 승인 필요.

### PBL-자체-01 — Ⅰ. 훈련과정 개요 결과 페이지 신청서 자동표출 7필드 미렌더

- **페이지**: AI PBL 결과 페이지 · Ⅰ 개요 탭 (`TabPBLOverview.tsx`)
- **증상**: HWPX P-02 cell_fill 18키 vs 결과 페이지 8행 FormTable — 사업장관리번호·업종·업종코드·주소·훈련실시주소·관할 지부·담당자(직위/성명/연락처/email) 결과 페이지에 미노출
- **기대**: 양식 15×5 표 ↔ HWPX 18키 ↔ 결과 페이지 정합. 신청서 자동표출 영역도 결과 페이지에 (읽기 전용) 표출하여 사용자가 HWPX 출력 전 확인 가능
- **발견 라운드**: R0

> 메모(2026-04-29, R3 PR2로부터): 본격 데이터 바인딩은 `PBLResultClient` prop chain 변경 + server 측 project 메타 fetch + `TabPBLCommonProps` 확장이 필요해 R3 양식 정합성 정정 PR 범위 초과. **R7+ 별도 PR 권고.** R3 에서는 임시로 `TabPBLOverview` SectionCard description 에 "신청서 자동표출 항목(사업장관리번호·업종·주소·관할 지부·담당자)은 HWPX 다운로드 시 자동 채워집니다" 안내만 추가 [PR #43].

> [해결됨][PR R8] 2026-04-30 — 마이그 071 로 `projects` 테이블에 5컬럼 추가 (`business_reg_no` / `industry_code` / `training_address` / `jurisdiction_branch` / `contact_position`, 모두 NULL 허용). `Project` 인터페이스 + `createProjectSchema` 5필드 옵셔널 확장. `ops/projects/new` 폼에 fieldset (5 입력 필드 — 모두 선택 입력) 추가. `fetchPBLProjectInfo` 가 `PBLProjectMeta` 7필드 (기존 4 + 신규 3 + companyName) 반환. `PBLResultPageClient` → `PBLResultClient` → `TabPBLCommonProps.projectMeta` prop chain 으로 결과 페이지에 전달. `TabPBLOverview` 에 신청서 자동표출 SectionCard 신설 (양식 안내문 "수정 불가" + 모든 필드 NULL 시 안내 문구). HWPX P-02 18키 매핑 — `project` 객체에서 5 신규 + 4 기존 필드 직접 override (인터뷰 입력값보다 project 가 우선 — 양식 의도 "신청서 자동표출 = 수정 불가" 일치). 회귀 테스트 4건 (TabPBLOverview projectMeta 표출 / 안내 문구 / "수정 불가" 라벨 / hwpx-payload-pbl P-02 매핑).

### PBL-자체-02 — Ⅱ-2 훈련환경 분석 양식 12×7 표 → 자유서술 1개 박스 단순화

- **페이지**: AI PBL 인터뷰 입력 (`StepTrainingEnv.tsx`) · 결과 Ⅱ 요구분석 탭
- **증상**: 양식은 12×7 정형 표 (적정 훈련시간/장소/사내강사/직위·이름·직무경력·인적특성/외부장소 등). 코드는 단일 LargeTextBox 자유서술. HWPX P-05 는 6 셀 분배 — 자유서술 → 6 셀 매핑 fallback 미정의 → HWPX 다운로드 시 6 셀 모두 공란 가능 (#20 패턴)
- **기대**: 정형 표 입력 복원 또는 HWPX 6 셀 fallback 명시
- **발견 라운드**: R0

> 메모(2026-04-29, R3 PR2로부터): 인터뷰 스키마 (`PBLAnalysis.trainingEnv`) + Step UI + HWPX P-05 매퍼 모두 신설하는 대규모 모델 변경. R3 양식 정합성 정정 범위 초과. **R7+ 별도 PR 권고.**

> [해결됨][PR R8] 2026-04-30 — `PBLAnalysisSchema.trainingEnv: string → PBLTrainingEnv` 정형 객체 6 영역 (적정훈련시간 / 사내장소 / 사외장소 / 사내강사 표 / 외부강사 표 / AI인프라). `PBLInstructorRow` 신규 (직위/이름/경력/인적특성). `StepTrainingEnv` UI 재작성 — 6 영역 입력 + 강사 표 행 추가/삭제 (max 5). `TabPBLAnalysis` Ⅱ-2 SectionCard 재구조화 (시간/장소/AI인프라 + 사내·외부강사 표 분리). HWPX P-05 6 셀 매핑 정형화 (`internal_status` ← 시간+사내장소 / `external_status` ← 사외장소 / `internal_capability` ← 사내강사 dump / `external_capability` ← 외부강사 dump / `internal_facility` ← AI인프라 / `external_facility` ← 빈 fallback). `pbl-export buildRequirementsFromV2` 도 6 영역 줄바꿈 결합 dump 로 갱신. 회귀 테스트 5건 (StepTrainingEnv 라벨·편집·강사 추가·readOnly).

### PBL-자체-03 — Ⅲ-1 수행활동 양식 차수당 4행 → 코드 차수당 1행 단순화

- **페이지**: AI PBL 인터뷰 입력 (`StepActivities.tsx`) · 결과 Ⅲ 훈련과제 탭 · HWPX P-08
- **증상**: 양식 13×6 = 차수당 4행 (PM/외부전문가/기업내부전문가/능력개발전담주치의) 별 일자/내용/방법 분리. 코드는 차수당 1행 + participants 4 person dict — 4 역할의 일자·내용·방법이 동일 가정
- **기대**: 양식 정합 위해 차수×역할 행으로 입력 모델 확장 또는 HWPX fill 시 4행 동일값 자동 확장 명시
- **발견 라운드**: R0

> 메모(2026-04-29, R3 PR2로부터): `PBLActivityItem` 스키마 (`participants` → 차수×역할 행 모델) 변경 + Step UI 변경 + HWPX P-08 매퍼 변경. **R7+ 별도 PR 권고.**

> [해결됨][PR R8] 2026-04-30 — 옵션 B (평면 4행 배열) 채택. `PBLActivityRow {round, role, personName, date, content, method}` 평면 배열로 신규 정의 (`PBLActivities = PBLActivityRow[]`). `PBL_ACTIVITY_ROLE` enum 4종 (PM/EXTERNAL_EXPERT/INTERNAL_EXPERT/JURISDICTION_MANAGER) + `PBL_ACTIVITY_ROLE_LABEL` 한글 라벨 맵. `PBLActivitiesSchema.superRefine` 으로 차수당 정확히 4 역할 행 강제 (양식 13×6 정형). `StepActivities` UI 재작성 — 차수 카드 안 4 역할 자동 렌더, 차수 추가/삭제 시 4 행 단위 (사용자가 행 단위 추가 못 함). `TabPBLTasks` Ⅲ-1 6 컬럼 표 (차수/역할/성명/일자/내용/방법). HWPX P-08 매핑 평면 4행 그대로 출력 (Python 측은 row[].role 로 양식 차수×역할 행 분배). pbl-export · fixture · converters · test-pbl 일괄 갱신. 회귀 테스트 6건 (StepActivities prefill·차수 추가/삭제·4 역할 입력 + Schema superRefine 차수당 4 역할 강제·빈 배열 통과).

### PBL-자체-04 — Ⅲ-2-가 양식 정형 4 항목(배경/핵심/범위/제약) → 코드 자유 problems[] 의미 충돌

- **페이지**: AI PBL 인터뷰 입력 (`StepProblems.tsx` 첫 블록) · 결과 Ⅲ 훈련과제 탭 · HWPX P-09
- **증상**: 양식 5×2 "문제 정의서" 표는 정형 4 항목 (문제 배경/핵심 문제/문제 범위/제약 조건) 단일 세트. 코드는 problems[] 동적 행 (title/description/impact). HWPX P-09 max_items=4 매핑되나 양식 정형 라벨 의미 손실. impact 필드는 HWPX 매핑 자체 누락
- **기대**: 양식 4 정형 행 라벨 보존 매핑 또는 입력 폼을 정형 4 항목으로 보강. impact 필드 HWPX 매핑 추가
- **발견 라운드**: R0

> 메모(2026-04-29, R3 PR2로부터): impact 매핑은 R3 에서 **`description` 셀에 결합 출력** 으로 임시 처리 (양식 5×2 한계 내). 정형 4 항목 (배경/핵심/범위/제약) 라벨 보존 매핑은 `PBLProblemItem` 스키마 변경 필요. **R7+ 별도 PR 권고.** [PR #43]

> [해결됨][PR R8] 2026-04-30 — 옵션 C (신규 단독 모델 + 개발 단계 데이터 폐기) 채택. `PBLProblemDefinitionSheet {background, core, scope, constraints}` 단일 객체 신규 정의 (V1 wrapper `PBLProblemDefinition` 와 충돌 회피 위해 Sheet 접미사). 기존 `PBLProblemItem` + `problems[]` 동적 행 폐기. `StepProblems` UI 재작성 — 4 정형 라벨 고정 LargeTextBox + "+ 문제 추가" 버튼 제거 (양식 단일 세트). `TabPBLTasks` Ⅲ-2-가 5×2 표 (구분/내용 4 행) + InlineEditField 편집. HWPX `problem_definition_sheet` 4 키 매핑 (양식 4 라벨 1:1 정합). impact 임시 결합 출력 코드 제거. 회귀 테스트 7건 (StepProblems 4 정형 라벨·추가 버튼 부재·각 필드 편집·우선순위 분리 + Schema 빈 세트·전체 채움 통과·필드 누락 실패).

### PBL-자체-05 — Ⅴ. 성과분석 결과 페이지 영구 placeholder 상태

- **페이지**: AI PBL 결과 페이지 · Ⅴ 성과분석 탭 (`TabPBLOutcomes.tsx`)
- **증상**: Task 2.10 placeholder 주석 — pbl_content 에 Ⅴ 필드 추가 예정이나 결과 표시 컴포넌트 미구현. HWPX P-25/P-26 도 static (양식 원문) 처리
- **기대**: LLM 결과 (성과 측정 지표·내재화 방안) 표 형태 표시 + HWPX cell_fill 매핑 추가
- **발견 라운드**: R0

> 메모(2026-04-29, R3 PR2로부터): pbl_content Ⅴ 필드 신설 + LLM 프롬프트 + 결과 컴포넌트 + HWPX cell_fill 매퍼 모두 신설 (Task 2.10 미완 영역). **R7+ 별도 PR 권고.**

> [해결됨][PR R8] 2026-04-30 — Task 2.10 완료. `PBLOutcomeAnalysis` 타입 (이미 `pbl-types.ts:223` 에 정의됨) 활용. LLM 프롬프트 (`pbl-prompts.ts:255~265`) 의 `outcome_analysis` JSON 스키마는 R5 PR4 에서 이미 정의되어 있어 추가 변경 불요. `hwpx-payload-pbl` 4 키 매핑 신설 (`quantitative_metrics` / `qualitative_metrics` / `internalization_plan` / `dissemination_plan`) — buildDataFromV2 + buildDataFromV1 양쪽. `api/hwpx/generate.py:799` 의 주석 처리되었던 `_fill_pbl_performance_metrics` / `_fill_pbl_dissemination` 호출 복구 (idx 39·40 양식 표 채움). `TabPBLOutcomes` placeholder → 본격 구현 — Ⅴ-1 SectionCard (선택 훈련목표 카테고리 + 정량/정성 2행 FormTable) + Ⅴ-2 SectionCard (내재화/전사 확산 2행 FormTable). LLM 결과가 없으면 RegeneratePlaceholder 폴백 유지. 회귀 테스트 — outcome_analysis 채움 시 결과 페이지 4 필드 노출 + HWPX P-25/P-26 cell_fill (전체 5841 테스트 통과).

### PBL-자체-06 — Step 9 단축명 `Ⅲ-3·4` 가 양식상 두 섹션 합성 표기

- **페이지**: AI PBL 인터뷰 입력 (`PBLInterviewClient.tsx` PBL_STEPS Step 9)
- **증상**: 양식 Ⅲ-3 (훈련대상 업무) + Ⅲ-4 (AI수준 진단) 가 단일 Step 으로 통합. 단축명 "Ⅲ-3·4" 는 양식 정확 명칭 아님 (#12 와 유사 패턴)
- **기대**: Step 분리 또는 단축명 재설계 (예: Ⅲ-3 단일 표기 + Ⅲ-4 별도 Step 분리)
- **발견 라운드**: R0

> [해결됨][PR #43] 2026-04-29 — 단축명 재설계 채택 (Step 분리는 모델 변경이라 R3 외). `'Ⅲ-3·4'` → `'Ⅲ-3·Ⅲ-4'`. #12(PBL) 과 통합 처리.

### PBL-자체-07 — Step 부제 "AI PBL 인터뷰 (양식 2:1 정합)" 사용자 노출 (#1 패턴 PBL 적용)

- **페이지**: AI PBL 인터뷰 입력 페이지 (`PBLInterviewClient.tsx` PageHeader)
- **증상**: 로드맵 #1 ("AI훈련로드맵 인터뷰 (양식 1:1 정합)") 동일 패턴 — 내부 개발 라벨이 사용자 화면에 노출
- **기대**: "AI PBL 인터뷰" 로 수정. (양식 2:1 정합) 부제 삭제. **#1(PBL) 동등 적용**
- **발견 라운드**: R0
- **관련**: #1 (R2 PR1 단순 일괄)

> [해결됨][PR #42] 2026-04-29 — `PBLInterviewClient.tsx:431` title 수정 + 회귀 테스트 추가 (#1 와 동일 PR 내 동등 적용)
