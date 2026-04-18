# 양식 2번 (AI PBL 과정개발보고서 및 결과보고서) HWPX 구조 분석

> **원본:** `docs/references/2.AI PBL 과정개발보고서 및 결과보고서(양식).hwpx`
> **분석 스크립트:** `.claude/skills/hwpx-docgen/scripts/analyze_template.py` + 커스텀 순회
> **대상:** Step 10 (OFA-10) 템플릿 제작
> **작성일:** 2026-04-18

## 개요

- 섹션: 1개
- 단락(paragraph): 205개
- 표: **52개** (과정개발보고서 42 + 결과보고서 10)

## 전체 섹션 골격

| 장 | 제목 | 본 Step 치환 대상 |
|---|---|---|
| 표지(개발) | (맞춤개발)AI+문제해결형 훈련 과정개발보고서 + 서명 표 | ✅ |
| 목차 | 고정 | ❌ |
| Ⅰ. 훈련과정 개요 | 기업정보·NCS·AI역량(4등급)·훈련목표(5종 체크) | ✅ |
| Ⅱ. 훈련 요구 분석 | 1 기업 현황(이슈·조직도) / 2 훈련환경(훈련여건·AI 인프라·기대효과) / 3 HRD이음·과정개발 필요성 | ✅ |
| Ⅲ. AI기반 훈련과제 도출 | 1 수행활동(4역할 참석자) / 2 문제정의·우선순위 / 3 훈련대상 업무 선정·세부내용 / 4 AI역량 진단 | ✅ |
| Ⅳ. AI 기반 운영계획 수립 | 1 훈련 목표 / 2 AI 도구 활용 / 3 훈련 실시(학습그룹·프로파일·시설·강사) / 4 평가 계획 | ✅ |
| Ⅴ. 성과분석 및 확산 전략 | 1 측정지표(정량·정성) / 2 확산(내재화·전사) | ✅ |
| 표지(결과) | AI+문제해결형 훈련 결과보고서 + 서명 표 | ✅ (회사명/날짜만) |
| 1 학습활동 수행일지 | 훈련과정명·기간 + 일자별 수행내용 (훈련 실시 전 공란) | ✅ (공란 유지) |
| 2 과정평가 결과 | 훈련 후 재평가 (공란 유지) | ✅ (공란) |
| 3 수행 결과물 | 훈련 후 첨부 (공란) | ✅ (공란) |
| 4 훈련 결과 | 경영이슈·개선·미해결·정량정성·확산·향후 (공란) | ✅ (공란) |

## 표 인덱스 ↔ 양식 섹션 매핑 (shallow traversal 기준)

| T# | r×c | 매핑 섹션 | 치환 전략 |
|---:|---:|---|---|
| 0 | 2×2 | 표지 서식 + 날짜 | 셀 치환 (`{{company_name_with_course}}`, `{{report_date}}`) |
| **1** | **15×5** | **Ⅰ. 훈련과정 개요 (대형)** | 고정 행 셀 치환 + AI역량 4체크 + 훈련목표 5체크 |
| 2 | 2×2 | Ⅰ 작성 가이드 | 고정 |
| **3** | **1×1** | **Ⅱ-1-가 기업 경영 이슈 박스** | `{{business_issues}}` |
| 4 | 2×2 | 작성안내 | 고정 |
| **5** | **6×3** | **Ⅱ-1-나 조직도** (부서명/업무명, 예시 3행·샘플 3행) | 상단 3행 데이터 치환 + 초과 truncate |
| 6 | 2×2 | 작성 가이드 | 고정 |
| **7** | **12×7** | **Ⅱ-2 기업 훈련환경 분석** (훈련여건/사내강사/대상/인프라/요구분석/기대효과) | 고정 행 셀 치환 + 사내/사외·예/아니오 체크박스 토글 |
| 8 | 2×2 | 작성 가이드 | 고정 |
| **9** | **8×8** | **Ⅱ-3-가 HRD이음 결과** (훈련이력·지원이력) | 상단 3행/3행 치환 |
| **10** | **4×4** | **Ⅱ-3-가 추천훈련사업·HRD제안** | 1행 데이터 치환 |
| **11** | **1×1** | **Ⅱ-3-나 AI훈련과정 개발 필요성** | `{{course_development_necessity}}` |
| 12 | 2×2 | 작성 가이드 | 고정 |
| **13** | **13×6** | **Ⅲ-1 수행활동 표** (수행차수·일자·내용·방법·참석자 4역할) | 3차수 × 4역할 = 12 데이터 행 치환 (헤더 1) |
| 14 | 2×2 | 작성 가이드 | 고정 |
| **15** | **5×2** | **Ⅲ-2-가 문제 정의서** (배경/핵심/범위/제약) | 4행 고정 치환 |
| 16 | 2×2 | 작성 가이드 | 고정 |
| **17** | **6×7** | **Ⅲ-2-나 문제 우선순위** (5행 반복 + 체크박스 우선순위 1~5) | 반복 행 치환 + 선정여부 ☑ |
| 18 | 2×2 | 작성 가이드 | 고정 |
| **19** | **6×7** | **Ⅲ-3-가 훈련대상 업무 선정** (5행 반복) | 반복 행 치환 + ☑ |
| **20** | **1×1** | **Ⅲ-3-나 AI기반 문제해결 필요성** | `{{target_tasks_selection_reason}}` |
| 21 | 2×2 | 작성 가이드 | 고정 |
| **22** | **4×5** | **Ⅲ-3-다 훈련대상 업무 세부내용** (3행 데이터) | 반복 행 치환 (업무명/세부내용/지식·기술/AS-IS/TO-BE) |
| 23 | 2×2 | 작성 가이드 | 고정 |
| **24** | **5×3** | **Ⅲ-4-가 현재 AI역량 수준** (4등급 체크 + 주요내용) | 4행 체크박스 토글 |
| **25** | **2×3** | **Ⅲ-4-나 훈련 이후 향상도** | 1 데이터 행 치환 (현행/향후/사유) |
| 26 | 2×2 | 작성 가이드 | 고정 |
| **27** | **1×1** | **Ⅳ-1 훈련 목표** | `{{training_goal}}` |
| **28** | **6×6** | **Ⅳ-2 AI 도구 활용 계획** (5단계 행) | 반복 행 치환 (단계/주요활동/AI도구/데이터/목적/방법) |
| 29 | 2×2 | 작성 가이드 | 고정 |
| **30** | **2×2** | **Ⅳ-3-가 훈련과정 개요** | 2행 고정 치환 (과정명/훈련기간) |
| **31** | **6×6** | **Ⅳ-3-나 학습그룹 구성** (강사 외부·내부 + 훈련생 3명) | 고정 행 치환 |
| **32** | **15×10** | **Ⅳ-3-다 훈련 교과목 프로파일** (복합) | 상단 고정 치환 + 훈련내용 3행 반복 + 평가방법 3행 고정 |
| 33 | 2×2 | 작성 가이드 | 고정 |
| **34** | **3×5** | **Ⅳ-3-라 시설·장비** | 반복 행 치환 |
| **35** | **3×5** | **Ⅳ-3-마 훈련강사** | 반복 행 치환 |
| **36** | **16×9** | **Ⅳ-4-가 과정평가 계획** | 상단 고정 + 체크리스트 7행 반복 + 총평 + 척도 고정 |
| **37** | **12×9** | **Ⅳ-4-나 만족도·성취도 조사** (고정 문항) | 고정 문항 유지 (점수 공란) |
| **38** | **13×9** | **Ⅳ-4-나 외부전문가·현업적용도** (고정 문항) | 고정 문항 유지 (점수 공란) |
| **39** | **3×2** | **Ⅴ-1 정량·정성 지표** | 2행 치환 |
| **40** | **3×2** | **Ⅴ-2 내재화·전사 확산** | 2행 치환 |
| 41 | 2×2 | 작성 가이드 | 고정 |
| **42** | **2×2** | **결과보고서 표지** | 서식 + 날짜 치환 (개발보고서 T0과 동일 패턴) |
| 43 | 9×3 | 학습활동 수행일지 | **공란 유지** (훈련 실시 후 데이터) |
| 44 | 15×9 | 과정평가 결과 | **공란 유지** |
| 45 | 5×3 | 수행 결과물 | **공란 유지** |
| 46~51 | 1×1 × 6 | 훈련 결과 6개 박스 | **공란 유지** |

## 핵심 플레이스홀더 맵 (Python `_placeholders_pbl.py` → 치환)

### 표지 (T0, T42)
| 키 | 출처 |
|---|---|
| `{{cover_course_name}}` | 훈련과정명 (과정명) |
| `{{company_name}}` | 기업명 |
| `{{report_date}}` | 최종화 일자 |

### Ⅰ. 훈련과정 개요 (T1)
| 키 | 출처 |
|---|---|
| `{{company_name}}`, `{{business_registration_no}}` | courseOverview |
| `{{industry_code}}`, `{{industry_main}}` | courseOverview |
| `{{address}}`, `{{training_address}}`, `{{jurisdiction_office}}` | courseOverview |
| `{{contact_position}}`, `{{contact_name}}`, `{{contact_phone}}`, `{{contact_email}}` | courseOverview.contact |
| `{{course_name}}`, `{{ncs_code}}`, `{{training_hours}}`, `{{trainee_count}}`, `{{training_job}}` | courseOverview |
| AI역량 4등급 체크박스 | `□ AI기초형` → `☑ AI기초형` (선택된 등급) |
| 훈련목표 5종 체크박스 | `□ 기술문제 해결` → `☑ 기술문제 해결` (선택된 항목) |

### Ⅱ. 훈련 요구 분석
| 키 | 출처 | 표 |
|---|---|---|
| `{{business_issues}}` | companyStatus.business_issues | T3 |
| 조직도 행 (부서명/업무명) | companyStatus.organization | T5 |
| `{{proper_training_hours}}`, `{{training_place_location}}`, `{{training_place_special_notes}}` | trainingEnvironment | T7 |
| 훈련장소 체크박스 (사내/사외) | trainingEnvironment.training_place.types 배열 | T7 |
| 사내강사 예/아니오 체크박스, 이름, 직책 | trainingEnvironment.internal_instructor | T7 |
| `{{target_count}}`, `{{target_career}}`, `{{target_level}}` | trainingEnvironment | T7 |
| `{{ai_tools_status}}`, `{{network_status}}`, `{{pc_count}}`, `{{etc_equipment}}` | ai_infrastructure | T7 |
| `{{training_needs_analysis}}` | trainingEnvironment | T7 |
| `{{expectation_as_is}}`, `{{expectation_to_be}}` | trainingEnvironment.expectation | T7 |
| 훈련이력 3행 반복 | hrdNecessity.training_history | T9 |
| 지원이력 3행 반복 | hrdNecessity.support_history | T9 |
| 추천훈련사업 3종 | hrdNecessity.recommendations | T10 |
| `{{course_development_necessity}}` | hrdNecessity | T11 |

### Ⅲ. AI기반 훈련과제 도출
| 키 | 출처 | 표 |
|---|---|---|
| 수행활동 3차수 × 4역할 | performanceActivities.performance_activities | T13 |
| 문제정의 4행 | problemDefinition.problem_definition | T15 |
| 문제 우선순위 5행 + 체크박스 | problemDefinition.problem_priorities | T17 |
| 훈련대상 업무 선정 5행 + 체크박스 | targetTasks.target_tasks (necessity·selected) | T19 |
| `{{target_tasks_selection_reason}}` | targetTasks | T20 |
| 훈련대상 업무 세부내용 3행 | targetTasks.target_task_details | T22 |
| AI역량 4등급 체크박스 + 주요내용 | aiLevelDiagnosis.current_ai_level + AI_LEVEL_OPTIONS | T24 |
| 향상도 1행 | aiLevelDiagnosis (current/expected/reason) | T25 |

### Ⅳ. AI 기반 운영계획 수립
| 키 | 출처 | 표 |
|---|---|---|
| `{{training_goal}}` | operation_plan.training_goal | T27 |
| AI도구 활용 계획 5단계 | operation_plan.ai_tool_usage_plan | T28 |
| 과정개요 2행 | training_plan.overview | T30 |
| 학습그룹 구성 5행 | training_plan.learning_group | T31 |
| 교과목 프로파일 상단 + 훈련내용 3행 | subject_profile | T32 |
| 시설·장비 2행 | facilities | T34 |
| 훈련강사 2행 | training_instructors | T35 |
| 과정평가 상단 + 체크리스트 7행 + 총평 | course_evaluation | T36 |
| `{{total_sum_hours}}` | subject_profile.total_sum_hours (자동합) | T32 |

### Ⅴ. 성과분석 및 확산 전략
| 키 | 출처 | 표 |
|---|---|---|
| 훈련목표 5종 체크박스 (본문 paragraph) | training_goal_categories | 본문 |
| 정량·정성 지표 | performance_analysis | T39 |
| 내재화·전사 확산 | performance_analysis | T40 |

### 결과보고서 (T42~T51)
| 키 | 값 |
|---|---|
| 표지 (T42): `{{result_cover_course_name}}`, `{{company_name}}`, `{{report_date}}` | 동일 |
| T43~T51 | **공란 유지** (훈련 실시 후 데이터) |

## 체크박스 토글 규칙

### AI역량 4등급 (T1, T24)
양식 원본 4등급: `□ AI기초형    □ AI탐구형    □ AI활용형    □AI선도형` (공백 주의)

치환:
- 현재 등급: `□ {level}` → `☑ {level}` (정확한 공백·라벨 일치)
- T24는 `구분` 열(row 1~4, col 0)에 `□` 단일 문자만 있음 → 선택 등급 행만 `☑`로 교체

### 훈련 목표 5종 (T1, Ⅴ-1 본문)
양식 원본: `□ 기술문제 해결 □ 공정 최적화 ☐ 불량률 감소 □ 기술 매뉴얼 개발 □ 기타`
(주의: 불량률 감소는 `☐` U+2610 로 다름)

치환:
- 선택된 카테고리만 해당 박스를 `☑`로 교체
- 미선택은 그대로 유지

### 사내/사외 (T7)
양식 원본: `☑ 사내`(default) / `□ 사외`
치환: `training_place.types` 배열 기준
- '사내' 포함 → `☑ 사내`, 미포함 → `□ 사내`
- '사외' 포함 → `☑ 사외`, 미포함 → `□ 사외`

### 사내강사 예/아니오 (T7)
양식 원본: `□ 예` / `□ 아니오` (초기 상태 가변)
- `internal_instructor.used=true` → `☑ 예` / `□ 아니오`
- `used=false` → `□ 예` / `☑ 아니오`

### 과정평가 방법 3종 (T36, T44)
양식 원본: `□ 포트폴리오` / `□ 문제해결시나리오` / `□ 작업장 평가`
- `course_evaluation.evaluation_methods` 배열 각 항목을 `☑`로 교체

## 반복 행 설계

템플릿에 **최대 행 수만큼 빈 행을 미리 준비**하고, 데이터가 적으면 빈 셀은 공란, 많으면 초과분 truncate.
(행 복제는 roadmap에서 확인된 한컴 "알 수 없는 오류" 이슈가 있어 금지.)

| 대상 | 템플릿 최대 행 | 비고 |
|---|---:|---|
| 조직도 (T5) | 3 | 6행이지만 상단 3 + 안내 3 구조 |
| 훈련이력 (T9) | 3 | |
| 지원이력 (T9) | 3 | |
| 추천훈련사업 (T10) | 3 | 1-2-3순위 |
| 수행활동 (T13) | 3차수 (12 데이터 행) | 각 차수 4역할 |
| 문제 우선순위 (T17) | 5 | |
| 훈련대상 업무 (T19) | 5 | |
| 훈련대상 업무 세부내용 (T22) | 3 | |
| AI도구 활용 5단계 (T28) | 5 | |
| 학습그룹 훈련생 (T31) | 3 | 훈련강사 외부·내부 각 1 + 훈련생 3 |
| 교과목 훈련내용 (T32) | 3 | |
| 시설·장비 (T34) | 2 | |
| 훈련강사 (T35) | 2 | |
| 과정평가 체크리스트 (T36) | 7 | |

## 치환 흐름 (generate.py `_generate_pbl`)

1. **본문 + 표 셀 내부 플레이스홀더 일괄 치환** — `doc.replace_text_in_runs()` + `_replace_in_all_runs` 로 `{{key}}` 패턴 치환 + 체크박스 심볼 치환
2. **표 셀 반복 데이터** — `tables = _collect_tables(doc)` 후 표 인덱스별 `_fill_table_pbl_*` 헬퍼 호출
3. **저장** — `doc.save_to_path()` → bytes

## 주의 사항

- 행 복제·OXML 직접 편집 금지 (roadmap 경험)
- 각 플레이스홀더는 runs 내에서 한 덩어리로 존재해야 치환 성공 → 템플릿 편집 시 서식 분리 방지
- 결과보고서(T43~T51)는 **공란 유지**: pbl_content에 해당 데이터가 없음
