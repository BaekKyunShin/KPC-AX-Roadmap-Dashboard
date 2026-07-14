# HWPX 신규 양식(v2) 적용 구현 계획

> **For Claude:** REQUIRED SUB-SKILL: `superpowers:executing-plans` 로 태스크 단위 실행.
> 최종 저장 위치: `docs/plans/2026-07-13-hwpx-v2-template-migration.md` (승인 후 이동)

**Goal:** 개정된 산인공 정본 양식(로드맵 v2 / PBL v2)을 적용하고, HWPX 값 주입을 표 좌표 하드코딩에서 `{{플레이스홀더}}` 치환으로 전환한다.

**Architecture:** SSOT JSON(`hwpx-placeholders.json`)이 "마커 좌표(빌드 타임)"와 "치환 키(런타임)"를 모두 보유한다. 빌드 타임 스크립트가 정본 양식에 마커를 심어 `templates/hwpx/*.hwpx` 를 생성하고, 런타임(`generate.py`)은 좌표를 전혀 모른 채 마커만 치환한다. 표가 추가·삭제돼도 런타임이 깨지지 않는다.

**Tech Stack:** python-hwpx / Vercel Python Function / Next.js Server Actions / Zod / Vitest·pytest·Playwright

---

## Context — 왜 이 작업을 하는가

산인공이 두 보고서 양식을 개정했다(`~/Downloads/로드맵 ver2.hwpx`, `~/Downloads/PBL ver2.hwpx`, 2026-07-13). 단순 문구 수정이 아니라 **보고서 구조 재설계**다.

- **로드맵**: 표 44 → **29개**. Ⅲ장 "훈련체계 수립"(역량 모델링·NCS·훈련체계도·연간 훈련계획)이 통째로 삭제되고 **Ⅲ. 훈련실시 계획 제안 = 훈련과정 명세서 하나**로 대체.
- **PBL**: 표 52 → **54개**. Ⅱ장에 로드맵과 동일한 요구분석 절이 신설되고, Ⅴ장(성과분석 및 확산 전략)이 삭제.

현재 `api/hwpx/generate.py`(1,813줄)는 **N번째 표의 (행,열)** 좌표로 값을 꽂는다(`_fill_table_journal(tables, idx=38)`). 로드맵은 29개뿐이라 `idx=38`이 존재하지 않는다. **템플릿 파일만 교체하면 전 항목이 깨지고, CI에 HWPX 테스트가 없어 초록불로 통과한다.**

동시에 인터뷰 입력 항목·LLM 생성 범위·결과 화면이 양식과 어긋나므로, 전 계층을 양식에 맞춰 재정렬한다.

**그리고 세 번째 축이 있다.** 신규 PBL 양식의 작성 안내문이 _"AI훈련 로드맵 컨설팅 보고서 내용 자동 연계"_, _"로드맵 보고서의 과업·워크플로우 분석표를 자동으로 불러온 값 중 훈련으로 선정"_ 이라고 명시한다. 업무 규칙상 **로드맵을 실시한 기업만 PBL이 가능**하므로 선행 로드맵이 항상 존재한다. 그런데 현재 시스템은 두 트랙이 완전히 분리돼 있어 이 연계가 불가능하다 → **프로젝트 간 연결 고리를 신설**한다.

---

## 확정된 의사결정 (사용자 승인 완료)

| #   | 결정                                                                                                                                                                      |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **로드맵/PBL은 별개 과업**이지만 **로드맵을 실시한 기업만 PBL이 가능**하다 → PBL 프로젝트는 **선행 로드맵 프로젝트를 참조**해 Ⅱ장을 자동 표출한다 (인터뷰 중복 입력 금지) |
| 2   | 연결 방식: **기업명·사업장관리번호로 자동 추천 + 운영관리자 수동 확정**                                                                                                   |
| 3   | 참조 대상: **FINAL 확정본 로드맵만**                                                                                                                                      |
| 4   | 기존 PBL 프로젝트(연결 없음) 존재 → FK 는 **nullable**, 운영관리자가 사후 보정. 미연결 시 Ⅱ장은 빈 양식 출력                                                              |
| 5   | 로드맵 Ⅲ장 삭제 항목(역량 모델링·NCS·훈련체계도·연간계획)은 **인터뷰·LLM·화면에서 모두 제거**                                                                             |
| 6   | 출력처가 사라진 3종(**예상 AI역량 수준 / 문제 우선순위 / 성과 확산 전략**) **전부 제거**                                                                                  |
| 7   | **기업 경영 이슈**(PBL Step 2)도 과정개발보고서에서 출력처를 잃었으나 → **인터뷰 유지 · LLM 입력 전용**으로 남긴다 (Ⅳ 운영계획 생성의 핵심 맥락)                          |
| 8   | PBL AI 역량 등급 **4단계 → 3단계 통일**(AI활용형+AI선도형 → 고급)                                                                                                         |
| 9   | HWPX 값 주입을 **`{{플레이스홀더}}` 방식으로 전환**                                                                                                                       |
| 10  | **main 직접 작업 금지** — 워크트리/브랜치에서 작업, 로컬 검증 후 머지                                                                                                     |

---

## 데이터 출처 3분류 (양식 전수 대조로 검증 완료)

**로드맵** — 출처는 둘뿐이다.

| 출처            | 양식 구간                                                                                                                                            |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **인터뷰 입력** | Ⅰ-1 수립 배경 · Ⅰ-2 주요 활동 · Ⅰ-3 중 _기업 AI 역량 수준·선정 과업_ · Ⅱ-1 역량수준 진단(HRD이음 PDF) · Ⅱ-2 기업 요구분석 · Ⅱ-3 과업·워크플로우 선정 |
| **LLM 생성**    | Ⅰ-3 중 _AI훈련로드맵 수립 주요내용(요약)_ · **Ⅲ 훈련과정 명세서 (6개)**                                                                              |

**PBL** — 여기에 **자동 연계**가 추가돼 셋이 된다.

| 출처                          | 양식 구간                                                                                                                        |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **인터뷰 입력**               | Ⅰ 훈련과정 개요 · Ⅱ-1-다 과정개발 필요성 · Ⅱ-3 훈련환경 · Ⅲ-1 수행활동 · Ⅲ-2 문제 도출 · **Ⅲ-3-가 중 AI필요도·훈련선정 2컬럼만** |
| **★ 로드맵 자동 연계**        | **Ⅱ-1-나 AI훈련 로드맵 수립** · **Ⅱ-2 AI 도입·활용 요구분석** · **Ⅲ-3-가 과업 목록(읽기 전용)**                                  |
| **LLM 생성**                  | **Ⅳ 운영계획 1~5** (Ⅳ-2 성과분석 측정 지표 포함 — v1 Ⅴ장에서 이동)                                                               |
| **인터뷰 입력 · 양식 미출력** | **기업 경영 이슈** — v2 과정개발보고서에서 출력처 소멸. 인터뷰는 유지하되 **LLM 입력 전용**으로만 쓴다                           |

---

## 양식 변경 상세 (전수 대조 완료)

### 로드맵 (표 44 → 29)

| 영역              | 변경                                                                                                                                                                     |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 표지              | `AI훈련로드맵 **컨설팅** 보고서 (기업명)` → `AI훈련로드맵 보고서 (기업명 **– 대상 과업**)`. "서식 5" 헤더 신설. 역할명 `컨설팅 책임자(PM)` → `컨설팅 책임자(AI훈련코치)` |
| Ⅱ-3 과업분석표    | 6열 → **4열**. `문제점`·`데이터 발생 시점`·`AI도입·활용 필요도` 3열이 **`개선점 및 AI 적용 가능성(데이터 발생 여부 또는 보유현황)`** 1열로 통합. 데이터 행 5 → 6         |
| Ⅱ-3 / Ⅱ-4         | 두 절이 **Ⅱ-3 하나로 통합**. 라벨 `훈련대상 과업` → **`AI 적용 대상 과업`**                                                                                              |
| **Ⅲ장**           | **훈련체계 수립 → 훈련실시 계획 제안**. 역량 모델링·NCS 박스·훈련체계도·연간 훈련계획·활용방안·분석내용 박스 **전부 삭제**(문서 전문 검색 0건)                           |
| Ⅲ 훈련과정 명세서 | 11×4 **3개** → 11×6 **6개**. **`훈련시기`·`훈련수준` 행 신설**, `훈련 형태` → `훈련방법`, 세부내용 3칸 병합, 교과목 데이터 행 4 → 3                                      |
| 별첨              | 수행일지 표(13×5) 삭제 → "서식 4" 외부 문서 참조. 참고자료 표 4개 삭제                                                                                                   |

**신규 `RoadmapCourseSpec` 구조** (6개):
`training_period`(훈련시기, 신규) · `training_level`(훈련수준, 신규) · `course_name` · `training_method`(구 format) · `recommended_program` · `target_audience` · `goal` · `main_content` · `subjects[]{name, details, hours}` × 3행

**앵커 영향:** 로드맵 표지 앵커 `(기업명)` **소실**(→ `(기업명 – 대상 과업)`). 체크박스 `□ 초급/중급/고급`은 생존. PBL 앵커는 전부 생존.

### PBL (표 52 → 54)

| 영역         | 변경                                                                                                                                                               |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 표지         | `서식 3-2` / S-OJT 명칭. **8×5 서명란 신설**(PM·외부전문가×2·내부전문가×2·**능력개발전담주치의**×2 + 기업체 대표 날인). 기존엔 nested 표였으나 top-level 로 승격   |
| Ⅰ 개요       | AI역량 수준 **4단계 → 3단계**: `□AI기초형 □AI탐구형 □AI활용형 □AI선도형` → `□(초급)AI기초형 □(중급)AI탐구형 □(고급)AI활용형, AI선도형`                             |
| **Ⅱ-1-나**   | **`AI훈련 로드맵 수립` 절 신설** — 수립 배경(1×1) · 주요 활동(7×6) · 수립 주요 결과(3×4) → **로드맵 Ⅰ장과 동일 구조**                                              |
| **Ⅱ-2**      | **`AI 도입·활용 요구분석` 절 신설** — 역량수준 진단(1×1) · 기업 요구분석(5×3) · 과업·워크플로우 분석표(6×4) · 훈련대상 과업 선정(4×3) → **로드맵 Ⅱ장과 동일 구조** |
| Ⅱ-3 훈련환경 | 12×7 **변경 없음**                                                                                                                                                 |
| Ⅲ-2-나       | **문제 우선순위 매트릭스(6×7) 삭제**. 문제 정의서(5×2)는 유지                                                                                                      |
| Ⅲ-3-가       | 업무 우선순위 매트릭스(6×7) → **과업 기반 선정표(6×6)** 로 교체: 직무·과업·현행방식·개선점및AI적용가능성·**AI도입·활용 필요도**·**훈련 선정(☑)**                   |
| Ⅲ-4          | **AI역량 수준 진단 삭제**(현행/향후/향상 사유 표 2개) → Ⅱ-2-가로 이동                                                                                              |
| Ⅳ-2          | **성과분석 측정 지표**가 Ⅴ장에서 이동해 옴 (정량/정성 3×2)                                                                                                         |
| Ⅳ-3 AI도구   | 6행 → **4행** (데이터 행 5 → 3)                                                                                                                                    |
| **Ⅴ장**      | **삭제**. `성과 확산 전략` 출력처 소멸                                                                                                                             |

> ⚠️ **과업 데이터가 트랙마다 다르다**: 로드맵은 4필드(직무·과업·현행방식·개선점), PBL은 6필드(+ AI도입·활용 필요도 + 훈련 선정). 로드맵에서만 `aiScore` 가 사라진다.

---

## 아키텍처 — `{{플레이스홀더}}` 전환

**현재(문제):** `generate.py` 가 표를 순서대로 세어 `idx=22` 의 `(row, col)` 셀에 값을 꽂는다. 표가 하나 추가/삭제되면 이후 인덱스가 전부 밀리고, **CI에 HWPX 테스트가 없어 초록불로 통과한다**.

**전환 후:** 좌표는 **빌드 타임에만** 쓰이고, 런타임은 좌표를 전혀 모른다.

```
docs/references/*.hwpx        ← 산인공 정본 (무가공, 해시 보존)
        │
        │  scripts/insert_placeholders.py   (빌드 타임 · 1회 실행)
        │  ↑ SSOT 의 location{table_index, cell/data_row_start} 좌표를 읽어
        │    해당 셀에 {{키}} 마커를 심는다
        ▼
templates/hwpx/*.hwpx         ← 마커가 심긴 템플릿 (git 커밋 대상)
        │
        │  api/hwpx/generate.py             (런타임 · 매 요청)
        │  ↑ 좌표 없음. doc 전체를 순회하며 {{키}} → 값 치환만 한다
        ▼
       HWPX 산출물
```

**재사용 자산 (이미 존재 — 신규 설계 불필요):**

- `docs/references/hwpx-placeholders.json` — SSOT. 전략 분류(`single`/`cell_fill`/`repeat_rows`/`checkbox_toggle`/`conditional_box`/`pdf_attach`/`static`), `location{table_index, cell, data_row_start, rows_per_item, max_items}`, `row_columns[{col, field, format}]` 을 이미 보유
- 반복 행 마커 규칙도 이미 정의됨: `placeholder_template: "{{roadmap_overview_performance_{i}_{field}}}"` → 전개 시 `{{roadmap_overview_performance_0_round}}` …
- `scripts/verify-mapping-completeness.mjs` — SSOT 유효성 검증기 (id 중복·키 형식 `^\{\{[a-z][a-z0-9_]+\}\}$`·전략 taxonomy)
- `scripts/dump_hwpx_structure.py` — 구조 재분석기
- `api/hwpx/generate.py` 의 `_replace_in_all_runs()` (본문+표 셀 전체 순회 치환), `_set_cell_text()` (`lineWrap=BREAK` 로 글자 겹침 해결 — **반드시 유지**)

**체크박스도 마커화:** 현재는 `"□ 초급"` → `"☑ 초급"` 문자열 치환이라 양식의 공백 하나만 바뀌어도 깨진다. `{{cb_roadmap_level_beginner}} 초급 (AI기초형)` 형태로 심고 런타임에 `☑`/`□` 만 치환한다.

**행 복제 금지 원칙 유지:** 데이터가 템플릿 행 수를 초과하면 truncate 한다(행 복제는 `cellAddr`/`id` 중복을 유발해 한컴오피스가 파일을 거부). 마커는 템플릿 행 수만큼만 심는다. 초과분은 `log` 로 경고.

**CI 가드 (신설 — 이번 작업의 핵심 안전망):**

1. `verify-mapping-completeness.mjs` 확장 → **템플릿 파일에 SSOT의 모든 마커가 실제로 존재하는지** 대조 (마커 누락 = 빌드 실패)
2. **런타임 치환 후 `{{` 잔존 검사** → 미치환 마커가 산출물에 남으면 테스트 실패
3. `.github/workflows/` 에 **pytest 실행 추가** (현재 HWPX 테스트 118건이 로컬 전용)

---

## 인터뷰 재설계

### 로드맵: 9스텝 → 8스텝

| Step                  | 변경                                                                                                             |
| --------------------- | ---------------------------------------------------------------------------------------------------------------- |
| 1 Ⅰ-1 수립 필요성     | 유지 (라벨만 "수립 배경")                                                                                        |
| 2 Ⅰ-2 주요 활동       | 유지                                                                                                             |
| 3 Ⅰ-3 수립 주요 결과  | 유지 (`aiLevel`, `selectedTask`) — **`selectedTask` 가 표지 "대상 과업"으로도 출력**                             |
| 4 Ⅱ-1 HRD이음 PDF     | 유지                                                                                                             |
| 5 Ⅱ-2 기업 요구분석   | 유지                                                                                                             |
| 6 Ⅱ-3 과업·워크플로우 | **컬럼 축소**: `problem`+`dataTiming`+`aiScore` → **`improvement`** 1필드. **`taskAnalysisNote`(분석내용) 삭제** |
| 7 Ⅱ-4 훈련대상 과업   | 라벨 → **"AI 적용 대상 과업"** (필드 구조 동일)                                                                  |
| ~~8 Ⅲ-1 역량 모델링~~ | **스텝 통째 삭제** (역량·NCS 전부)                                                                               |
| 9 → 8 STT 첨부        | 번호만 이동                                                                                                      |

### PBL: 10스텝 → **9스텝 (감소)**

양식 Ⅱ-1-나·Ⅱ-2 는 **인터뷰 입력이 아니라 선행 로드맵 프로젝트에서 자동 연계**된다. 신규 스텝이 필요 없고, 오히려 삭제분 때문에 줄어든다.

| Step                          | 변경                                                                                                                                     |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 1 Ⅰ 훈련과정 개요             | **AI역량 4단계 → 3단계**                                                                                                                 |
| 2 기업 경영 이슈              | 유지. ⚠️ **v2 양식에서 출력처 소멸** → **LLM 입력 전용**으로 존치 (HWPX 미출력)                                                          |
| 3 Ⅱ-1-다 과정개발 필요성      | 유지 (기존 Step 6)                                                                                                                       |
| 4~5 Ⅱ-3 훈련환경              | 유지 (기존 Step 3·4)                                                                                                                     |
| 6 Ⅲ-1 수행활동                | 유지. ⚠️ 양식 안내문은 _"기 작성한 '컨설팅 수행일지'를 자동 불러옴, 수정 불가"_ → **로드맵 수행활동 연계로 전환 검토**(아래 미해결 §4)   |
| 7 Ⅲ-2 문제 도출               | **`priority`(우선순위 items + method) 삭제** → 문제 정의서만                                                                             |
| 8 Ⅲ-3 훈련대상 업무           | **로드맵 과업 목록을 읽기 전용으로 불러와**, 각 행에 **`AI도입·활용 필요도` 입력 + `훈련 선정` 체크**만 한다. **`expectedAiLevel` 삭제** |
| 9 STT 첨부                    | 유지                                                                                                                                     |
| ~~Ⅱ-1-나 로드맵 수립~~        | **인터뷰 아님** — 자동 연계 (읽기 전용 표시)                                                                                             |
| ~~Ⅱ-2 AI 도입·활용 요구분석~~ | **인터뷰 아님** — 자동 연계 (읽기 전용 표시)                                                                                             |

### ★ DRY — 로드맵 Step 컴포넌트를 **읽기 전용 뷰**로 재사용

로드맵 Step 컴포넌트는 `RoadmapStepProps<V> = { value: V; onChange: (v: V) => void; readOnly?: boolean }` 순수 props다 (`interview/_components/roadmap/types.ts:17`). **이미 `readOnly` 플래그를 갖고 있으므로**, PBL 의 연계 구간(Ⅱ-1-나·Ⅱ-2)은 같은 컴포넌트에 `readOnly` 로 로드맵 데이터를 흘려보내면 된다. **PBL 용 신규 폼을 새로 만들지 않는다.**

→ `_components/roadmap/` 의 `StepNecessity` · `StepPerformanceActivities` · `StepMainResult` · `StepCompanyRequirements` · `StepTaskAnalysis` · `StepTargetTask` 를 **`_components/shared/`** 로 이동.

공유 폼 부품(`src/components/forms/`: `FormSection`·`FormTable`·`LargeTextBox`·`PdfUploadField`·`ExampleAccordion`)도 그대로 활용.

---

## ★ 로드맵 → PBL 자동 연계 (신규 설계)

**전제:** 로드맵과 PBL은 별개 과업이지만 **로드맵을 실시한 기업만 PBL이 가능**하다. 따라서 PBL 프로젝트에는 선행 로드맵이 **항상 존재**하고, 양식의 _"AI훈련 로드맵 컨설팅 보고서 내용 자동 연계"_ 지시가 그대로 성립한다.

### 양식이 자동 연계를 명시한 구간

| 양식 위치                 | 안내문                                                                                                    |
| ------------------------- | --------------------------------------------------------------------------------------------------------- |
| Ⅱ-1 기업 현황 분석        | "기업HRD이음컨설팅 및 **AI훈련 로드맵 컨설팅 보고서 내용 자동 연계**"                                     |
| Ⅲ-1 수행활동              | "기 작성한 '**컨설팅 수행일지**'의 주요 내용을 기준으로 자동 불러옴, **수정 불가**"                       |
| Ⅲ-3-가 훈련대상 업무 선정 | "**로드맵 보고서에서 작성한 과업·워크플로우 분석표를 자동으로 불러온 값** 중 훈련으로 선정할 과업을 선정" |
| Ⅲ-3-다 업무 세부내용      | "'업무명'은 **선정된 업무를 자동 불러옴**, 수정 불가"                                                     |

### 연결 고리 — `projects.roadmap_project_id`

`projects` 는 `company_id` 없이 `company_name` 텍스트만 갖는 비정규화 구조다(`060_add_project_track.sql:15` 주석에 명시). 기업명 자동 매칭만으로는 표기 흔들림(`(주)OO` vs `㈜OO`)에 취약하므로 **명시적 FK + 자동 추천**을 함께 쓴다.

```sql
-- 마이그레이션 1개 (이번 작업의 유일한 DDL)
ALTER TABLE projects ADD COLUMN roadmap_project_id UUID REFERENCES projects(id) ON DELETE SET NULL;
CREATE INDEX idx_projects_roadmap_project_id ON projects (roadmap_project_id)
  WHERE roadmap_project_id IS NOT NULL;
```

- **nullable** — 기존 PBL 프로젝트는 연결이 없으므로 NOT NULL 강제 불가. 운영관리자가 사후 보정
- 미연결 PBL 은 Ⅱ장을 **빈 양식으로 출력** (오류가 아니라 정상 폴백)
- 자기참조 FK 이므로 `track='PBL'` 인 행만 값을 갖는다 (애플리케이션 레벨 검증)

### 선택 UI (운영관리자)

`ops/projects/actions/crud.ts:50-68` 의 프로젝트 생성/수정 폼에서 `track=PBL` 선택 시 **선행 로드맵 드롭다운**을 노출한다.

- **자동 추천**: `business_reg_no` 일치 → `company_name` 일치 순으로 후보를 상단 정렬
- **수동 확정**: 최종 선택은 운영관리자가 한다
- **후보 조건**: `track='ROADMAP'` **AND `roadmap_versions.status='FINAL'` 이 존재하는 프로젝트만**

### 데이터 흐름

```
PBL 프로젝트
  └─ roadmap_project_id ──► 로드맵 프로젝트
                              ├─ roadmap_versions (status=FINAL)  → Ⅰ-3 수립 주요 결과
                              └─ interviews                        → Ⅰ-1 수립배경 · Ⅰ-2 수행활동
                                                                     Ⅱ-2 기업 요구분석
                                                                     Ⅱ-3 과업·워크플로우 분석표
                                                                     Ⅱ-4 AI 적용 대상 과업
        ▼
  PBL 보고서 Ⅱ-1-나 / Ⅱ-2  (읽기 전용 자동 표출)
  PBL 보고서 Ⅲ-3-가         (로드맵 과업 목록 + PBL 입력: AI필요도·훈련선정)
```

**과업 데이터의 트랙 간 차이 (중요):**

- 로드맵 과업표 = 4열 (직무 · 과업 · 현행방식 · 개선점및AI적용가능성)
- PBL Ⅲ-3-가 = **6열** = 위 4열(로드맵 연계, 읽기 전용) + **AI도입·활용 필요도**(PBL 입력) + **훈련 선정 ☑**(PBL 입력)

즉 PBL 인터뷰는 과업을 **새로 입력하지 않고**, 로드맵이 준 목록에 **2개 컬럼만 덧붙인다.**

### 구현 지점

- 조회 헬퍼 신규: `src/lib/services/pbl/pbl-roadmap-link.ts` — `fetchLinkedRoadmapData(pblProjectId)` → `{ roadmap: RoadmapVersion | null, interview: Interview | null }`
- `hwpx-payload-pbl.ts` 의 `PBLHwpxPayloadInputs` 에 `linkedRoadmap` 추가 → Ⅱ장 키 매핑
- PBL 결과 페이지 Ⅱ탭에 연계 데이터 읽기 전용 렌더 (`readOnly` 로드맵 컴포넌트 재사용)
- 미연결 시 안내 배너: "선행 로드맵 프로젝트가 연결되지 않아 Ⅱ장이 비어 있습니다" + 운영관리자 연결 유도

---

## LLM · 데이터 모델 재설계

### 로드맵 — `LLMRoadmapResult` (`src/lib/services/roadmap/roadmap-types.ts`)

```ts
// 삭제
competencies: RoadmapCompetency[];              // Ⅲ-1 역량 모델링
ncs_used / ncs_methodology / ncs_derivation_method;
training_structure: RoadmapTrainingStructureItem[];  // Ⅲ-2 훈련체계도
training_structure_method: string;
annual_plan: RoadmapAnnualPlan;                 // Ⅲ-3 연간계획

// 유지 + 확장
course_specs: RoadmapCourseSpec[];              // 3개 → 6개
  + training_period: string;   // 훈련시기 (신규)
  + training_level: TrainingLevel;  // 훈련수준 (신규 — 삭제된 훈련체계도에 있던 값이 여기로)
  format → training_method     // 명칭 변경
```

**남는 구조:** `diagnosis_summary` · `setup_necessity` · `outcome_summary` · `course_specs[6]` — LLM 출력이 절반 이하로 줄어 프롬프트·검증·재시도 비용이 모두 감소한다.

연쇄 수정: `roadmap-prompts.ts`(출력 JSON 스키마 + few-shot) · `roadmap-validator.ts` · `schemas/roadmap.ts` · **`roadmap-storage-mapper.ts` 의 `toRoadmapVersionColumns`/`fromRoadmapVersionColumns` 양방향** · `types/roadmap-ui.ts` · `roadmap-generator.ts` 의 `fillMissingRoadmapFields`

> ⚠️ `roadmap_versions` 의 컬럼명은 내용과 무관한 레거시명이다: `roadmap_matrix`=training_structure, `pbl_course`={competencies, annual_plan, …}, `courses`=course_specs. 매핑 정본은 `roadmap-storage-mapper.ts:36-56`.

### PBL — `PBLContent` (`src/lib/services/pbl/pbl-types.ts`)

```ts
// 삭제
outcome_analysis.diffusion_strategy;   // 성과 확산 전략 (Ⅴ장 소멸)

// 이동 — 양식 Ⅳ-2 에 맞춰 operation_plan 안으로
operation_plan.outcome_metrics: PBLOutcomeMetrics;  // 정량·정성 지표 + selected_goals

// 결과: PBLContent = { operation_plan: { training_goal, outcome_metrics, ai_tool_usage_plan,
//                                        training_plan, evaluation_plan } }
```

### AI 역량 등급 3단계 통일

로드맵 `TrainingLevel = 'BEGINNER'|'INTERMEDIATE'|'ADVANCED'` 로 **양 트랙 통일**.
PBL 기존 `'BASIC'|'EXPLORER'|'USER'|'LEADER'` → 병합 규칙: `BASIC→BEGINNER`, `EXPLORER→INTERMEDIATE`, **`USER`·`LEADER`→`ADVANCED`**.
`AiLevel4Check` 컴포넌트(`src/components/charts/`)는 3단계 버전으로 교체하거나 로드맵의 3단계 UI를 재사용.

### 결과 화면

- **로드맵 Tab Ⅲ**: 4개 섹션(역량·체계도·연간계획·명세서) → **훈련과정 명세서 1개** (6개 과정 표시)
- **PBL**: 5탭 → **4탭** (Ⅴ 성과분석 탭 삭제, 측정 지표는 Ⅳ 탭으로 편입)
- **갤러리·데모**: `src/components/roadmap/`·`src/components/pbl/` 레거시 컴포넌트가 별도 렌더 표면이므로 함께 정리

---

## 실행 계획

### PR 분할 원칙 — **계층별이 아니라 트랙별 수직 완결**

타입 하나를 바꾸면 인터뷰·LLM·화면·내보내기가 동시에 깨진다. 따라서 "타입 PR → 화면 PR" 식 계층 분할은 **각 PR이 `npm run validate` 조차 통과하지 못한다.** 대신 **로드맵 전 계층 → PBL 전 계층** 순으로 수직 완결한다. 각 PR은 그 자체로 배포 가능한 상태다.

`generate.py` 는 PR 1 동안 **로드맵=마커 방식 / PBL=기존 좌표 방식**으로 잠시 공존하고, PR 2에서 좌표 코드를 완전히 제거한다.

---

### PR 0 — 준비 (워크트리 · 양식 배치)

```bash
git worktree add ../ai-roadmap-hwpx-v2 -b feat/hwpx-v2-roadmap   # main 직접 작업 금지
```

**파일이 놓이는 곳은 네 군데다.** 플레이스홀더 전환 후 `templates/hwpx/*.hwpx` 는 **마커가 심긴 가공본**이 되므로, 무가공 정본을 `docs/references/` 에 따로 보존해야 나중에 마커를 다시 심거나 정본과 대조할 수 있다. (현재는 둘이 sha256 까지 동일 — 무가공을 그대로 쓰고 있기 때문)

| 대상                      | 위치                                                                       |
| ------------------------- | -------------------------------------------------------------------------- |
| 신규 정본 (무가공)        | `docs/references/`                                                         |
| 기존 정본                 | `docs/references/archive/`                                                 |
| 신규 템플릿 (마커 삽입본) | `templates/hwpx/{roadmap,pbl}.hwpx` ← **PR 1 의 스크립트가 정본에서 생성** |
| 기존 템플릿               | `templates/hwpx/archive/{roadmap,pbl}.pre-2026-07-13.hwpx`                 |

```bash
# ① 기존 템플릿 → archive (네이밍 규칙: <name>.pre-YYYY-MM-DD.hwpx)
git mv templates/hwpx/roadmap.hwpx templates/hwpx/archive/roadmap.pre-2026-07-13.hwpx
git mv templates/hwpx/pbl.hwpx     templates/hwpx/archive/pbl.pre-2026-07-13.hwpx

# ② 기존 정본 → archive
git mv "docs/references/1.AI훈련로드맵 컨설팅 보고서(양식).hwpx" docs/references/archive/
git mv "docs/references/2.AI PBL 과정개발보고서 및 결과보고서(양식).hwpx" docs/references/archive/

# ③ 신규 정본 배치 (양식 제목 변경 반영 — "컨설팅" 삭제, PBL 은 서식 3-2)
cp "$HOME/Downloads/로드맵 ver2.hwpx" "docs/references/1.AI훈련로드맵 보고서(양식).hwpx"
cp "$HOME/Downloads/PBL ver2.hwpx"    "docs/references/2.문제해결형(PBL) AI+직무 훈련과정 개발 및 결과보고서(양식).hwpx"

# ④ 임시로 정본을 템플릿에 복사 (PR 1 에서 마커 삽입본으로 대체됨)
cp "docs/references/1.AI훈련로드맵 보고서(양식).hwpx" templates/hwpx/roadmap.hwpx
cp "docs/references/2.문제해결형(PBL) AI+직무 훈련과정 개발 및 결과보고서(양식).hwpx" templates/hwpx/pbl.hwpx

# ⑤ 구조 문서 재생성
.venv-hwpx/bin/python3 scripts/dump_hwpx_structure.py templates/hwpx/roadmap.hwpx -o docs/references/hwpx-structure-roadmap.md
.venv-hwpx/bin/python3 scripts/dump_hwpx_structure.py templates/hwpx/pbl.hwpx     -o docs/references/hwpx-structure-pbl.md
```

⑥ 착수 전 확인 쿼리 실행 (아래 "DB" 절) — 기존 PBL 프로젝트·FINAL 확정본 존재 여부 파악

---

### PR 1 — 로드맵 전 계층 + 플레이스홀더 인프라 ★ 최대 난이도

**(a) 플레이스홀더 인프라 (공통 자산 — PBL도 재사용)**

- `docs/references/hwpx-placeholders.json` 재작성 (로드맵 파트)
- `scripts/insert_placeholders.py` **신규** — SSOT 좌표 → 마커 삽입 → `templates/hwpx/roadmap.hwpx` 생성
- `api/hwpx/generate.py` 의 `_generate_roadmap` **재작성** — 좌표 제거, 마커 치환만. `_set_cell_text` 의 `lineWrap=BREAK` **유지 필수**(글자 겹침 해결책)
- `scripts/verify-mapping-completeness.mjs` 확장 — 템플릿↔SSOT 마커 대조
- `.github/workflows/` 에 **pytest + verify 추가** (현재 HWPX 테스트 118건이 로컬 전용 → CI 안전망 신설)

**(b) 로드맵 데이터 계층**

- `roadmap-types.ts` — 4종 삭제, `RoadmapCourseSpec` 확장
- `schemas/interview-roadmap.ts` (+ **AutoSave 스키마** + **labels 사전** 동반 수정 — 누락 시 자동저장 무음 실패)
- `converters.ts` — **`mapRoadmapInterviewToDb`·`mapDbToRoadmapInterview`·`DbRoadmapInterviewRow`·`RoadmapInterviewDbUpdate` 4곳 전부**. 3필드→`improvement` 통합은 `promoteLegacyNcs()` 패턴 복제
- `roadmap-storage-mapper.ts` — 양방향 + `promoteLegacyNcs` 제거
- `roadmap-prompts.ts` / `roadmap-validator.ts` / `roadmap-generator.ts`(`fillMissingRoadmapFields`)

**(c) 로드맵 UI · 내보내기**

- 인터뷰: Step 8 삭제(9→8) · Step 6 컬럼 통합 · Step 7 라벨 변경
- 결과 Tab Ⅲ 재구성 · **`extractRoadmapFieldsFromPayload`/`extractInterviewFieldsFromPayload` 키 추가**(누락 시 저장이 조용히 유실 — 실제 회귀 이력 있음)
- `hwpx-payload-roadmap.ts` · PDF · XLSX · 갤러리/데모 레거시 컴포넌트

---

### PR 2 — 로드맵 → PBL 연계 인프라

```bash
git worktree add ../ai-roadmap-hwpx-v2-link -b feat/pbl-roadmap-link
```

PBL 개편의 **전제**이므로 먼저 독립 PR로 낸다 (PBL 양식 변경 없이도 배포 가능).

- **마이그레이션 1개**: `projects.roadmap_project_id` FK + 부분 인덱스 → **DB 적용까지 원자적 완료**
- `src/types/database.ts` 의 `Project` 에 필드 **수동 추가**
- 운영관리자 프로젝트 생성/수정 폼에 **선행 로드맵 선택 UI** (자동 추천 + 수동 확정, FINAL 만 후보)
- 조회 헬퍼 `src/lib/services/pbl/pbl-roadmap-link.ts` 신규
- **TDD**: 미연결 PBL → `null` 반환 · FINAL 없는 로드맵은 후보 제외 · 자기참조 순환 방지

---

### PR 3 — PBL 전 계층

```bash
git worktree add ../ai-roadmap-hwpx-v2-pbl -b feat/hwpx-v2-pbl
```

**(a) 공유 컴포넌트 승격** — `_components/roadmap/` 의 6개 Step → `_components/shared/`. **로드맵 회귀 테스트 필수**

**(b) PBL 데이터 계층**

- `pbl-types.ts` — `diffusion_strategy` 삭제, `outcome_metrics` 를 `operation_plan` 으로 이동
- `schemas/interview-pbl.ts` — AI 등급 3단계 + **`z.preprocess` 어댑터**(4→3 병합), `priority`·`expectedAiLevel` 제거
- `pbl-prompts.ts` — 출력 스키마 축소. **연계된 로드맵 데이터를 LLM 입력 섹션에 주입**(Ⅳ 운영계획 생성 품질 향상)

**(c) PBL UI · 내보내기**

- 인터뷰 Ⅲ-3: **로드맵 과업 목록(읽기 전용) + AI필요도·훈련선정 2컬럼 입력**으로 교체
- 결과 페이지 Ⅱ탭: 연계 데이터 읽기 전용 렌더 + 미연결 안내 배너
- 5탭 → 4탭 · `editPBLV2` 병합 분기
- `hwpx-payload-pbl.ts` — `PBLHwpxPayloadInputs` 에 `linkedRoadmap` 추가, `buildDataFromV2` 재작성, **V1 fallback 경로 제거**
- `generate.py` 의 `_generate_pbl` 마커 전환 → **좌표 코드 완전 삭제**
- `AiLevel4Check` → 3단계 컴포넌트 교체, `TabPBLTasks.tsx:35-36` 하드코딩 기본값(`'BASIC'`/`'USER'`) 수정

---

### PR 4 — 최종 검증 · 정리

- E2E 전면 · 실물 한컴오피스 시각 검증
- `src/types/database.ts` 정리 · 문서 동기화(`ARCHITECTURE.md`, `DECISIONS.md`, `RLS.md`)

---

## DB — 마이그레이션 **1개** (FK 추가만)

**필요한 DDL은 `projects.roadmap_project_id` FK 신설 하나뿐이다** (위 "로드맵 → PBL 연계" 참조). 나머지 데이터 모델 변경(필드 삭제·3필드 통합·AI등급 4→3 축소)은 **전부 JSONB 내부라 DDL 불필요**하다.

> ⚠️ CLAUDE.md 엄수 규칙: 마이그레이션 파일 작성 시 **같은 작업 내에 DB 적용까지 완료**한다 (`mcp__supabase__apply_migration` → `list_migrations` 검증). 파일만 만들고 끝내지 않는다. 적용 후 `src/types/database.ts` 의 `Project` 인터페이스에 `roadmap_project_id?: string` **수동 추가** (gen types 금지).

### JSONB 변경분에 DDL이 불필요한 근거 (조사 완료)

| 확인 항목                               | 결과                                                                                                                                          |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| PBL AI 등급(BASIC/EXPLORER/USER/LEADER) | **Postgres enum 아님.** Zod enum(`interview-pbl.ts:491`) + `pbl_data` JSONB 문자열 → `ALTER TYPE` 대상 없음                                   |
| 로드맵 AI 등급                          | 동일하게 JSONB 문자열. ⚠️ 동명의 `education_level` enum 이 있으나 **`users.teaching_levels`(강사 강의 가능 레벨) 전용 — 절대 건드리지 말 것** |
| CHECK 제약 6개                          | 전부 `octet_length` 크기만 검사. 필드 **제거**는 크기를 줄이므로 위반 불가                                                                    |
| GIN 인덱스                              | 대상 컬럼에 **0건** (유일한 GIN은 `stt_insights`)                                                                                             |
| RLS 정책                                | JSONB 키 연산자(`->`, `->>`) 사용 **0건**. 전부 스칼라 컬럼 기반                                                                              |
| RPC (`finalize_roadmap`·`finalize_pbl`) | JSONB 컬럼 **미참조** (status/id만 갱신)                                                                                                      |

**이 프로젝트의 확립된 정책**: `roadmap-storage-mapper.ts:10-34` 주석 — _"jsonb 컬럼명을 변경하지 않고 **(마이그 신설 금지)** 내부 구조만 확장한다"_. 과거 `pbl_course` DROP COLUMN 시도는 destructive 하다는 이유로 **철회**된 선례가 있다(`docs/decisions/2026-04-19-ofa-12-pbl-course-decision.md`, `066_ofa_cleanup.sql:10-11`).

### 재사용할 기존 패턴 (신규 발명 금지)

| 이번 변경                                                        | 재사용할 선례                                                                                                                                                           |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| **AI 등급 4→3 병합** (값 domain 축소 → 기존 row parse 실패 위험) | **`z.preprocess`** — `interview-pbl.ts:792-814` (`description`→`as_is` 이전). `{BASIC→BEGINNER, EXPLORER→INTERMEDIATE, USER                                             | LEADER→ADVANCED}` 매핑 후 새 enum parse. **SQL 0개** |
| 과업 3필드 → `improvement` 통합                                  | **`promoteLegacyNcs()`** — `roadmap-storage-mapper.ts:159-220` (구 키 분산 → 신 키 승격 + 경고 로그). 그대로 복제                                                       |
| 신규 필드(`training_period`·`training_level`)                    | **`.default()` backfill** — `interview-pbl.ts:818-826` (`necessity_score` default(3))                                                                                   |
| 삭제된 키가 DB에 잔존                                            | **방어적 파싱** — `fromRoadmapVersionColumns()` (`roadmap-storage-mapper.ts:222-262`)가 orphan 키를 자동 무시. **삭제 SQL 없이도 앱 정상 동작**, 다음 저장 시 자연 수렴 |

### `src/types/database.ts` (수동 파일 — gen types 금지)

조사 결과 **이미 실제 스키마와 어긋나 있고 실사용이 1곳뿐**이다(`test-roadmap/actions.ts:23`). 삭제 대상 필드(`roadmap_competency_models`·`roadmap_problems`·`diffusion_strategy` 등)는 **애초에 이 파일에 선언조차 없다.**
→ 필요한 수정은 `CourseDetail`(306-319)에 `training_period`/`training_level` 추가 정도. `RoadmapVersion`·`RoadmapCell`·`PBLCourse` 는 사문화 타입이므로 deprecated 정리 권장.

### 착수 전 1회 실행할 확인 쿼리

FINAL 확정본 유무 → 어댑터 계층 필수 여부. 기존 PBL 프로젝트 수 → 연결 보정 작업량.

```sql
-- ① 확정본 존재 여부 (있으면 z.preprocess 어댑터 필수 — 데이터 파괴 금지)
SELECT status, COUNT(*) FROM public.roadmap_versions GROUP BY 1;
SELECT status, COUNT(*) FROM public.pbl_reports GROUP BY 1;

-- ② 기존 PBL 프로젝트 수 (roadmap_project_id 사후 보정 대상)
SELECT track, COUNT(*) FROM public.projects GROUP BY 1;

-- ③ PBL AI 등급 4단계 분포 (USER/LEADER → ADVANCED 병합 규모)
SELECT pbl_data #>> '{currentAiLevel,level}' AS lvl, COUNT(*)
FROM public.interviews WHERE pbl_data ? 'currentAiLevel' GROUP BY 1;

-- ④ 기업명이 겹치는 ROADMAP/PBL 쌍 (자동 추천 매칭률 사전 확인)
SELECT p.company_name, p.business_reg_no,
       COUNT(*) FILTER (WHERE p.track = 'ROADMAP') AS roadmap_cnt,
       COUNT(*) FILTER (WHERE p.track = 'PBL')     AS pbl_cnt
FROM public.projects p GROUP BY 1, 2 HAVING COUNT(DISTINCT p.track) > 1;
```

→ `mcp__supabase__execute_sql` 로 실행. FINAL 이 0건이면 어댑터 없이 스키마만 교체해도 안전.

---

## 영향 범위 (전수 조사 완료) — **파일 132개**

| 영역                             | 전체삭제 | 부분수정 |
| -------------------------------- | -------: | -------: |
| PDF 내보내기                     |        3 |        3 |
| XLSX 내보내기                    |        0 |        1 |
| 갤러리·데모·랜딩 레거시 컴포넌트 |        5 |        6 |
| 프로덕션 result-v2 · 인터뷰 화면 |        1 |       12 |
| E2E 스펙                         |        0 |        7 |
| 단위 테스트                      |        9 |       45 |
| Fixtures · Sample                |        1 |       13 |
| 스키마 · 서비스 · 액션           |        0 |       26 |
| **합계**                         |   **19** |  **113** |

※ 위 집계는 **양식 변경분 기준**이다. 여기에 PR 2(로드맵→PBL 연계 인프라)의 **신규 파일 6~8개**가 더해진다: 마이그레이션 SQL · `pbl-roadmap-link.ts` + 테스트 · 운영관리자 선행 로드맵 선택 UI + 테스트 · `database.ts` Project 필드 · PBL 결과 Ⅱ탭 연계 렌더.
반대로 **PBL 인터뷰 신규 2스텝은 취소**되어(자동 연계로 대체) 그만큼 줄어든다.

### 파생 축소 (양식 변경의 연쇄 효과)

- **로드맵 PDF: 5페이지 → 2페이지** (표지 + 명세서). `pdf-competency-renderer.ts`·`pdf-structure-renderer.ts`·`pdf-annual-renderer.ts` **전체삭제**
- **로드맵 XLSX: 5시트 → 2시트** (개요 + 명세서). ⚠️ `xlsx-generator.test.ts:130` 이 시트명 배열을 하드코딩 단언 중
- **PBL PDF/XLSX는 영향 없음** — 둘 다 `operation_plan` 만 렌더하므로 삭제 3필드가 애초에 안 나간다. PBL 삭제의 내보내기 영향은 **HWPX 한정**
- `roadmap-matrix-builder.ts`(`buildTrainingStructureTable`) — 소비자 전멸 → **전체삭제 후보**

### 덤으로 정리되는 죽은 코드 (이번 삭제와 무관하게 이미 import 0건)

`src/components/roadmap/NcsMethodologyBox.tsx` · `RoadmapOverviewSummary.tsx`

### ⚠️ 별도 승인이 필요한 UI 변경

**`src/components/landing/sections/DemoSection.tsx`** — 랜딩 자동재생 캐러셀의 `DEMO_SLIDES` 4개가 로드맵 4탭과 1:1 대응한다. 탭이 1개(명세서)만 남으면 **캐러셀이 1슬라이드가 되어 자동재생·네비게이션이 무의미해진다.** 랜딩은 외부 노출 화면이므로 구현 착수 전 **사용자 관점 mockup + 워딩 승인**을 별도로 받는다.

### 최고 위험 파일 3종 (수정 밀도 기준)

1. `roadmap-storage-mapper.ts` — 테스트 매치 128라인. DB legacy 컬럼 매핑의 심장부
2. `converters.ts` (675줄) — 인터뷰 camelCase ↔ DB snake_case 양방향
3. `DemoSection.tsx` — 위 UX 이슈

### 놓치기 쉬운 하드코딩 (grep 필수)

- `schemas/roadmap.ts:86` `.min(3, '훈련과정 명세서는 최소 3개…')` → **`.min(6)`**
- `roadmap-validator.ts:43-45` `course_specs.length < 3` → **`< 6`**
- `roadmap-prompts.ts:69` `"최소 3개 생성하라"` → **6개**
- `TabPBLTasks.tsx:35-36` `level: 'BASIC'` / `'USER'` 하드코딩 기본값
- `interview-roadmap-labels.ts:37-40, 49-58` / `interview-pbl-labels.ts:62-66, 84-85` — **라벨 사전 누락 시 에러 토스트에 raw path 노출**

---

## 검증 (Verification)

각 PR 필수:

```bash
npm run validate && npm run build          # typecheck + lint + unit test
.venv-hwpx/bin/python3 -m pytest api/hwpx/ -v   # HWPX 118건
node scripts/verify-mapping-completeness.mjs    # SSOT ↔ 템플릿 마커 대조
```

**실물 검증 (PR 1·3·4 필수)** — 자동 테스트로는 셀 정렬·글자 겹침을 못 잡는다:

```bash
npm run dev:hwpx        # 터미널 A — 브리지 서버 (3010)
npm run dev:with-hwpx   # 터미널 B — Next.js (3000)
```

→ 로드맵/PBL 결과 페이지에서 HWPX 다운로드 → **한컴오피스로 직접 열어** 6개 과정 명세서·8×5 서명란·체크박스·표 셀 줄바꿈 육안 확인.

**E2E**: `npx playwright test e2e/consultant/interview-roadmap.spec.ts e2e/consultant/interview-pbl.spec.ts` — aria-label·heading 으로 셀렉트하므로 라벨 변경 시 동반 수정 필수.

**사전 grep (CLAUDE.md 엄수 규칙)**: 라벨·시그니처·prop·enum 변경 직후 `src/` + `e2e/` 전수 grep.

---

## 미해결 / 구현 중 확인할 항목

1. **PBL Ⅱ-1-가 (기업 훈련 현황 8×8 · 추천훈련사업 4×4)** — v1에서도 채우지 않던 표(payload 의 `training_history`·`recommendations` 가 빈 배열). HRD이음 시스템 데이터라 우리 시스템에 원천이 없음 → **v2 에서도 빈 양식 출력 유지**로 간다 (변경 없음).
2. **로드맵 표지 "대상 과업"** — 인터뷰 `selectedTask` 를 그대로 쓸지, 별도 짧은 라벨을 받을지. 기본은 `selectedTask` 재사용.
3. **훈련과정 6개 미만일 때** — LLM이 3개만 생성하면 나머지 3개 표는 빈 채로 출력 (truncate 원칙과 동일).
4. **PBL Ⅲ-1 수행활동의 연계 여부** — 양식 안내문은 _"기 작성한 '컨설팅 수행일지'를 자동 불러옴, 수정 불가"_ 라고 지시하지만, 현재 PBL 인터뷰는 수행활동(차수×4역할)을 **별도로 입력**받는다. 로드맵 수행활동으로 대체할지, PBL 자체 입력을 유지할지 **구현 착수 시 사용자 확인**. (로드맵 수행활동은 PM·내부전문가 2역할, PBL은 PM·외부전문가·내부전문가·주치의 4역할로 **구조가 달라** 단순 대체가 어려울 수 있음)
5. **랜딩 데모 캐러셀** — 위 "별도 승인이 필요한 UI 변경" 참조.
