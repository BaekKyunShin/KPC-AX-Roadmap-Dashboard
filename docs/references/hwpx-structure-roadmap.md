# 양식 1번 (AI훈련로드맵 컨설팅 보고서) HWPX 구조 분석

> **원본:** `docs/references/1.AI훈련로드맵 컨설팅 보고서(양식).hwpx`
> **분석 스크립트:** `.claude/skills/hwpx-docgen/scripts/analyze_template.py`
> **대상:** Step 7 (OFA-07) 템플릿 제작
> **작성일:** 2026-04-17

## 개요

- 섹션: 1개
- 단락(paragraph): 133개
- 표: **49개** (본문 38 + 별첨 수행일지 1 + 참고자료 10)

## 전체 섹션 골격

| 장 | 제목 | 본 Step에서 치환 대상? |
|---|---|---|
| 표지 | AI훈련로드맵 컨설팅 보고서 (기업명·PM·내부전문가) | ✅ |
| 목차 | 고정 | ❌ 그대로 |
| Ⅰ. 개요 | 1 수립 필요성 · 2 주요 활동 · 3 수립 주요 결과 | ✅ |
| Ⅱ. AI 도입·활용 요구분석 | 1 AI 역량 수준 · 2 기업 요구분석 · 3 과업·워크플로우 분석 · 4 훈련대상 과업 선정 | ✅ |
| Ⅲ. 훈련체계 수립 | 1 역량 모델링 · 2 훈련체계도 · 3 연간 훈련계획 · 4 훈련과정 상세 | ✅ |
| [별첨] | 컨설팅 수행일지 | ✅ (차수별 반복) |
| [참고자료] | AI 역량 수준 진단모형 (진단영역·문항·결과 예시) | ❌ 고정 |

## 표 인덱스 ↔ 양식 섹션 매핑

| table idx | rows×cols | para | 매핑 섹션 | 데이터 출처 | 치환 전략 |
|---:|---:|---:|---|---|---|
| 0 | 1×1 | 3 | 표지(상단 서식) | 고정 | ❌ |
| 1 | 3×3 | 14 | 표지: 컨설팅 책임자·기업 내부전문가 | `pm_*`, `internal_expert_*` | 셀 단순 치환 |
| 2 | 2×2 | 49 | Ⅰ장 작성 안내 | 고정 | ❌ |
| **3** | 1×1 | 52 | **Ⅰ-1 수립 필요성 박스** | `overview.establishment_necessity` | `{{establishment_necessity}}` |
| 4 | 2×2 | 53 | Ⅰ-1 작성 안내 | 고정 | ❌ |
| **5** | 7×6 | 56 | **Ⅰ-2 주요 활동 표** (수행차수·수행일시·수행 내용·수행 방법·참석자 2칸) | 수행일지 차수별 자동집계 | **행 반복 (템플릿 앵커 행 복제)** |
| 6 | 2×2 | 57 | Ⅰ-2 작성 안내 | 고정 | ❌ |
| **7** | 3×4 | 59 | **Ⅰ-3 AI훈련로드맵 수립 주요 결과** (역량 수준 체크박스 + 선정 과업 + 요약) | `outcome_summary.*` | 셀 치환 + `☑`/`☐` 토글 |
| 8 | 2×2 | 60 | Ⅰ-3 작성 안내 | 고정 | ❌ |
| 9–10 | — | 61 | ◆ AI역량 수준별 훈련내용 예시 | 참고자료 | ❌ 고정 |
| 11 | 2×2 | 64 | Ⅱ장 작성 안내 | 고정 | ❌ |
| **12** | 1×1 | 67 | **Ⅱ-1 HRD이음 보고서 첨부 박스** | `overview.hrd_report_attachment_url` | `{{hrd_report_attachment}}` (빈 값이면 "별도 작성 불요") |
| 13 | 2×2 | 68 | Ⅱ-1 작성 안내 | 고정 | ❌ |
| **14** | 5×3 | 70 | **Ⅱ-2 기업 요구분석** (4행: 기업현황·주요문제·추진의지·기대성과) | `company_requirements.*` | 고정 행 셀 치환 |
| 15 | 2×2 | 71 | Ⅱ-2 작성 안내 | 고정 | ❌ |
| **16** | 6×6 | 75 | **Ⅱ-3 과업·워크플로우 분석표** (직무·과업·As-Is·문제점·데이터·필요도) | `task_workflow_items[]` | **행 반복** |
| 17 | 2×2 | 77 | Ⅱ-3 작성 안내 | 고정 | ❌ |
| **18** | 1×2 | 79 | **Ⅱ-3 분석내용 박스** | `analysis_notes` | `{{analysis_notes_text}}` |
| 19 | 2×2 | 80 | Ⅱ-3 작성 안내 (2차) | 고정 | ❌ |
| **20** | 4×3 | 85 | **Ⅱ-4 훈련대상 과업 선정** (과업명·선정사유·기대효과 As-Is/To-Be) | `training_targets[0]` | 고정 행 셀 치환 (첫 항목) |
| 21 | 2×2 | 86 | Ⅱ-4 작성 안내 | 고정 | ❌ |
| 22 | 2×2 | 89 | Ⅲ장 작성 안내 | 고정 | ❌ |
| **23** | 5×3* | 92 | **Ⅲ-1 역량 모델링 표** (역량명·역량정의·지식·기술·태도 — 필요 KSA가 3칸 병합 헤더) | `competencies[]` | **행 반복** (*실제 표 시각은 5열이지만 OXML 상 3셀 병합으로 5×3) |
| **24** | 1×2 | 93 | **Ⅲ-1 NCS 활용 방법 박스** | `ncs_methodology` (`ncs_used=true`) | `{{ncs_methodology}}` (조건부) |
| **25** | 1×2 | 94 | **Ⅲ-1 역량별 도출 방법 박스** | `ncs_derivation_method` (`ncs_used=false`) | `{{ncs_derivation_method}}` (조건부) |
| 26 | 2×2 | 95 | Ⅲ-1 작성 안내 | 고정 | ❌ |
| **27** | 5×6 | 100 | **Ⅲ-2 훈련체계도 표** (역량명·훈련수준·훈련내용·훈련대상·훈련방법·훈련목표) | `buildTrainingStructureTable()` 결과 | **행 반복** |
| 28 | 2×2 | 101 | Ⅲ-2 작성 안내 | 고정 | ❌ |
| **29** | 1×2 | 103 | **Ⅲ-2 훈련체계 수립 방법 박스** | `training_structure_method` | `{{training_structure_method}}` |
| 30 | 2×2 | 104 | Ⅲ-2 작성 안내 (2차) | 고정 | ❌ |
| **31** | 4×5 | 108 | **Ⅲ-3 훈련과정 목록** (구분·과정명·훈련형태·훈련시간·비고) | `annual_plan.items[]` | **행 반복** |
| 32 | 2×2 | 109 | Ⅲ-3 작성 안내 | 고정 | ❌ |
| **33** | 1×2 | 112 | **Ⅲ-3 활용방안 박스** | `annual_plan.usage_plan` | `{{annual_plan_usage}}` |
| 34 | 2×2 | 113 | Ⅲ-3 작성 안내 (2차) | 고정 | ❌ |
| **35, 36, 37** | 11×4 ×3 | 116~117 | **Ⅲ-4 훈련과정 명세서 3개 블록** (과정명·훈련형태·추천훈련사업·훈련목표·주요훈련내용·훈련대상 6행 + 교과목 표 헤더 + 4행) | `course_specs[0..2]` | 고정 셀 치환 + **교과목 행 반복** (각 블록 4행 고정) |
| 38 | 2×2 | 118 | Ⅲ-4 작성 안내 | 고정 | ❌ |
| **39** | 13×5 | 121 | **[별첨] 수행일지** (기업명·고용보험 + 수행일시·차수·방법·운영방식 + 참석자 3행 + 수행내용 + 별첨자료) | 인터뷰 차수별 자동집계 | **단일 차수 치환 + 추후 확장 고려** (본 Step은 1차 기본) |
| 40~48 | — | 124~131 | [참고자료] AI 역량 진단모형 | 고정 참고자료 | ❌ |

## 핵심 플레이스홀더 매핑 (Task 3에서 템플릿에 삽입)

### 표지 (Table 0, 1)
| 플레이스홀더 | 출처 |
|---|---|
| `{{company_name}}` | `project.company_name` (표지 제목 "AI훈련로드맵 컨설팅 보고서(기업명)"의 (기업명) 치환) |
| `{{report_date}}` | "202x. 00. 00." → 최종화 일자 |
| `{{pm_affiliation}}`, `{{pm_name}}` | 컨설턴트 스냅샷 |
| `{{internal_expert_affiliation}}`, `{{internal_expert_name}}` | 인터뷰 수집 |

### Ⅰ. 개요
| 플레이스홀더 | 출처 |
|---|---|
| `{{establishment_necessity}}` | `roadmap.overview.establishment_necessity` (Step 6.5 신규) |
| `{{level_beginner_check}}` | `outcome_summary.ai_competency_level === 'BEGINNER'` ? `☑` : `☐` |
| `{{level_intermediate_check}}` | `=== 'INTERMEDIATE'` ? `☑` : `☐` |
| `{{level_advanced_check}}` | `=== 'ADVANCED'` ? `☑` : `☐` |
| `{{selected_tasks_text}}` | `outcome_summary.selected_tasks` |
| `{{roadmap_summary}}` | `outcome_summary.main_content` |

### Ⅰ-2 주요 활동 표 (반복 행)
| 컬럼 | 출처 |
|---|---|
| 수행차수 | `{round}차` |
| 수행일시 | `{YY.MM.DD} {HH:MM}~{HH:MM}` |
| 수행 내용 | 회의 주제/내용 요약 |
| 수행 방법 | 대면(인터뷰)/비대면(화상회의)/대면(워크숍) |
| 참석자 (2칸) | 구분/성명 (PM·내부전문가) |

### Ⅱ. 요구분석
| 플레이스홀더 | 출처 |
|---|---|
| `{{hrd_report_attachment}}` | `overview.hrd_report_attachment_url` (빈 값이면 "별도 작성 불요") |
| `{{company_status}}` | `company_requirements.company_status` |
| `{{main_problems}}` | `company_requirements.main_problems` |
| `{{push_willingness}}` | `company_requirements.push_willingness` |
| `{{expected_outcomes}}` | `company_requirements.expected_outcomes` |
| `{{analysis_notes_text}}` | `analysis_notes` |

### Ⅱ-3 과업·워크플로우 분석표 (반복 행 — Table 16)
| 컬럼 | 출처 |
|---|---|
| 직무 | `task_workflow_items[].job` |
| 과업(Task) | `.task` |
| 현행 방식(As-Is) | `.as_is` |
| 문제점 | `.problem` |
| 데이터 발생 시점 | `.data_availability` |
| AI도입·활용필요도 | `.ai_necessity_score` (1~5) |

### Ⅱ-4 훈련대상 과업 (Table 20 — 고정 4행)
| 셀 | 출처 |
|---|---|
| 훈련대상 과업 | `training_targets[0].task_name` |
| 선정사유 | `.selection_reason` |
| 기대효과 As-Is | `.as_is` |
| 기대효과 To-Be | `.to_be` |

### Ⅲ-1 역량 모델링 (반복 행 — Table 23)
| 컬럼 | 출처 |
|---|---|
| 역량명 | `competencies[].name` |
| 역량 정의(수행준거) | `.definition_performance_criteria` |
| 지식(학술, 업무지식) | `.knowledge` |
| 기술(기능) | `.skill` |
| 태도 | `.attitude` |

### Ⅲ-1 NCS 박스 (조건부 — Tables 24/25)
- `ncs_used === true` → Table 24 채움, Table 25 내용셀을 "해당 없음 (NCS 활용 선택)"로 교체
- `ncs_used === false` → Table 25 채움, Table 24 내용셀을 "해당 없음 (NCS 미활용 선택)"로 교체

> **설계 결정:** python-hwpx로 표 자체를 제거하는 것은 복잡(paragraph 구조 훼손 위험)하므로 **양쪽 박스 유지 + 비활성 쪽에 "해당 없음" 텍스트** 전략을 채택. 양식 의도(두 개 중 하나만 내용 있음)는 유지됨.

### Ⅲ-2 훈련체계도 (반복 행 — Table 27)
`buildTrainingStructureTable(competencies, training_structure)` 결과:
| 컬럼 | 출처 |
|---|---|
| 구분(역량명) | `row.competency_name` |
| 훈련수준 | `row.training_level` (초급/중급/고급) |
| 훈련내용 | `row.training_content` |
| 훈련대상 | `row.training_target` |
| 훈련방법 | `row.training_method` |
| 훈련목표 | `row.training_goal` |

### Ⅲ-2 훈련체계 수립 방법 박스 (Table 29)
- `{{training_structure_method}}` ← `root.training_structure_method`

### Ⅲ-3 연간 훈련계획 목록 (반복 행 — Table 31)
| 컬럼 | 출처 |
|---|---|
| 구분(역량명) | `annual_plan.items[].competency_name` |
| 훈련과정명 | `.course_name` |
| 훈련형태 | `.training_type` |
| 훈련시간 | `.training_hours` |
| 비고 | `.remarks` |

### Ⅲ-3 활용방안 박스 (Table 33)
- `{{annual_plan_usage}}` ← `annual_plan.usage_plan`

### Ⅲ-4 훈련과정 명세서 (Tables 35/36/37 — course_specs[0..2])
각 블록 고정 셀:
| 셀 | 출처 |
|---|---|
| 과정명 | `course_specs[i].course_name` |
| 훈련 형태 | `.training_type` |
| 추천 훈련사업 | `.recommended_program` |
| 훈련 목표 | `.training_goal` |
| 주요훈련 내용 | `.main_content` |
| 훈련 대상 | `.training_target` |

각 블록의 교과목 표 (4행 고정):
| 교과목명 | 세부 내용(단원, 과제명) | 훈련시간 |
| `.subjects[j].subject_name` | `.subjects[j].details` | `.subjects[j].hours` |

**처리 전략:** `course_specs[0..min(2, len)]`만 사용. 4개 이상은 Step 12에서 확장 판단. 과정 수가 3 미만이면 사용하지 않은 블록의 기본 플레이스홀더를 "(작성 없음)"로 치환.

### [별첨] 수행일지 (Table 39)
1차 수행 기본 값으로 치환 (Step 7 기본). 차수별 반복은 Step 12에서 검토.
| 셀 | 출처 |
|---|---|
| 기업명 | `project.company_name` |
| 고용보험관리번호 | `company_requirements.employment_insurance_no` 또는 빈 값 |
| 수행일시 | `interview.conducted_at` |
| 수행 차수 | 기본 "1차" |
| 수행 방법 | "회의/워크숍/FGI" 중 적절값 |
| 운영 방식 | "대면" / "비대면" |
| 참석자 (PM·내부전문가·기타) | 3행 |
| 수행내용 | 회의 주제·내용 요약 |
| 별첨자료 | 첨부 목록 (없으면 "없음") |

## 처리 전략 요약

1. **단순 텍스트 필드:** `replace_text_in_runs('{{key}}', value)` — 48개 플레이스홀더
2. **고정 행 셀 치환** (Tables 1, 7, 14, 20, 24, 25, 29, 33, 35~37, 39): 셀 좌표(row, col)로 접근하여 paragraph.add_run(text)
3. **반복 행 표** (Tables 5, 16, 23, 27, 31): 템플릿의 마지막 데이터 행을 기준으로 deepcopy → 셀 텍스트 채움 → 원본 행 앞에 insert. 샘플 행은 최종 삭제.
4. **조건부 NCS 박스** (Tables 24/25): `ncs_used` 플래그에 따라 한쪽 박스의 내용 셀에 "해당 없음 (xxx 선택)" 텍스트 삽입, 반대쪽에 실제 값.
5. **체크박스 토글** (Table 7): `☐`↔`☑` 문자 치환.

## 다음 단계 (Task 3)

- [ ] 원본 HWPX를 `templates/hwpx/roadmap.hwpx`로 복사 (원본 손상 금지)
- [ ] python-hwpx로 위 표 49개 중 **치환 대상 표의 해당 셀**에 플레이스홀더 `{{...}}` 삽입
- [ ] 고정 참고자료(Tables 10, 40~48) 및 작성 안내 박스(2, 4, 6, 8, 11, 13, 15, 17, 19, 21, 22, 26, 28, 30, 32, 34, 38)는 **건드리지 않음**
- [ ] `validate_hwpx.py`로 구조 보존 검증
