"""
Placeholder 매핑 단위 테스트 (TDD RED → GREEN).

build_placeholder_map(data) — 로드맵 데이터 dict → {{key}} → value 평문 dict
build_table_rows(data, key) — 각 반복 표의 행 dict 배열
"""
import pytest

from _placeholders_roadmap import (
    build_placeholder_map,
    build_table_rows,
    NCS_METHODOLOGY_FALLBACK,
    NCS_DERIVATION_FALLBACK,
    HRD_REPORT_EMPTY_FALLBACK,
)


# ---------------------------------------------------------------
# 1. 단순 플레이스홀더 매핑
# ---------------------------------------------------------------


def test_build_placeholder_map_basic_fields():
    data = {
        "company_name": "테스트(주)",
        "report_date": "2026. 04. 17.",
        "pm_affiliation": "KPC",
        "pm_name": "홍길동",
        "internal_expert_affiliation": "테스트(주)",
        "internal_expert_name": "김영희",
        "establishment_necessity": "AI 도입 필요성 설명 5줄.",
        "selected_tasks_text": "품질검사 자동화",
        "roadmap_summary": "요약 본문",
        "company_status": "제조업 현황",
        "main_problems": "수동 검사 비효율",
        "push_willingness": "경영진 강한 의지",
        "expected_outcomes": "불량률 30% 감소",
        "analysis_notes_text": "분석 노트",
        "training_structure_method": "수립 방법 설명",
        "annual_plan_usage": "연간 활용방안",
        "hrd_report_attachment": "https://example.com/hrd.pdf",
    }
    result = build_placeholder_map(data)
    assert result["{{company_name}}"] == "테스트(주)"
    assert result["{{report_date}}"] == "2026. 04. 17."
    assert result["{{pm_name}}"] == "홍길동"
    assert result["{{establishment_necessity}}"] == "AI 도입 필요성 설명 5줄."
    assert result["{{hrd_report_attachment}}"] == "https://example.com/hrd.pdf"


def test_build_placeholder_map_missing_fields_are_empty_strings():
    data = {"company_name": "회사명만"}
    result = build_placeholder_map(data)
    assert result["{{company_name}}"] == "회사명만"
    # 나머지는 모두 빈 문자열
    assert result["{{pm_name}}"] == ""
    assert result["{{establishment_necessity}}"] == ""
    assert result["{{analysis_notes_text}}"] == ""
    # HRD 보고서가 비어 있으면 fallback 메시지
    assert result["{{hrd_report_attachment}}"] == HRD_REPORT_EMPTY_FALLBACK


# ---------------------------------------------------------------
# 2. AI 역량 수준 체크박스 토글
# ---------------------------------------------------------------


def test_ai_competency_level_beginner_checks_only_first():
    data = {"ai_competency_level": "BEGINNER"}
    r = build_placeholder_map(data)
    assert r["{{level_beginner_check}}"] == "☑"
    assert r["{{level_intermediate_check}}"] == "☐"
    assert r["{{level_advanced_check}}"] == "☐"


def test_ai_competency_level_intermediate_checks_middle():
    data = {"ai_competency_level": "INTERMEDIATE"}
    r = build_placeholder_map(data)
    assert r["{{level_beginner_check}}"] == "☐"
    assert r["{{level_intermediate_check}}"] == "☑"
    assert r["{{level_advanced_check}}"] == "☐"


def test_ai_competency_level_advanced_checks_last():
    data = {"ai_competency_level": "ADVANCED"}
    r = build_placeholder_map(data)
    assert r["{{level_beginner_check}}"] == "☐"
    assert r["{{level_intermediate_check}}"] == "☐"
    assert r["{{level_advanced_check}}"] == "☑"


def test_ai_competency_level_unknown_keeps_all_unchecked():
    data = {}
    r = build_placeholder_map(data)
    assert r["{{level_beginner_check}}"] == "☐"
    assert r["{{level_intermediate_check}}"] == "☐"
    assert r["{{level_advanced_check}}"] == "☐"


# ---------------------------------------------------------------
# 3. NCS 조건부 박스 (ncs_used)
# ---------------------------------------------------------------


def test_ncs_used_true_fills_methodology_and_fallback_for_derivation():
    data = {
        "ncs_used": True,
        "ncs_methodology": "NCS 능력단위 참조 후 기업 특성 맞춤.",
        "ncs_derivation_method": "",
    }
    r = build_placeholder_map(data)
    assert r["{{ncs_methodology}}"] == "NCS 능력단위 참조 후 기업 특성 맞춤."
    assert r["{{ncs_derivation_method}}"] == NCS_DERIVATION_FALLBACK


def test_ncs_used_false_fills_derivation_and_fallback_for_methodology():
    data = {
        "ncs_used": False,
        "ncs_methodology": "",
        "ncs_derivation_method": "자체 분석으로 도출.",
    }
    r = build_placeholder_map(data)
    assert r["{{ncs_methodology}}"] == NCS_METHODOLOGY_FALLBACK
    assert r["{{ncs_derivation_method}}"] == "자체 분석으로 도출."


def test_ncs_used_missing_defaults_to_false():
    data = {"ncs_derivation_method": "기본 분석"}
    r = build_placeholder_map(data)
    assert r["{{ncs_methodology}}"] == NCS_METHODOLOGY_FALLBACK
    assert r["{{ncs_derivation_method}}"] == "기본 분석"


# ---------------------------------------------------------------
# 4. 훈련대상 과업 (Ⅱ-4) — 첫 항목만
# ---------------------------------------------------------------


def test_training_target_placeholders():
    data = {
        "training_target": {
            "task_name": "품질검사",
            "selection_reason": "불량률 높음",
            "as_is": "수동 검사",
            "to_be": "AI 자동 검사",
        }
    }
    r = build_placeholder_map(data)
    assert r["{{training_target_name}}"] == "품질검사"
    assert r["{{training_target_selection_reason}}"] == "불량률 높음"
    assert r["{{training_target_as_is}}"] == "수동 검사"
    assert r["{{training_target_to_be}}"] == "AI 자동 검사"


def test_training_target_missing_defaults_empty():
    data = {}
    r = build_placeholder_map(data)
    assert r["{{training_target_name}}"] == ""
    assert r["{{training_target_selection_reason}}"] == ""


# ---------------------------------------------------------------
# 5. build_table_rows — 각 반복 표
# ---------------------------------------------------------------


def test_table_rows_performance_activities():
    data = {
        "performance_activities": [
            {
                "round": 1,
                "date": "26.04.01 10:00~12:00",
                "content": "1차 인터뷰",
                "method": "대면(인터뷰)",
                "participants": [
                    {"role": "컨설팅책임자(PM)", "name": "홍길동"},
                    {"role": "기업 내부전문가", "name": "김영희"},
                ],
            },
            {
                "round": 2,
                "date": "26.04.08 14:00~16:00",
                "content": "2차 워크숍",
                "method": "비대면(화상회의)",
                "participants": [],
            },
        ]
    }
    rows = build_table_rows(data, "performance_activities")
    assert len(rows) == 2
    assert rows[0]["round"] == "1차"
    assert rows[0]["date"] == "26.04.01 10:00~12:00"
    assert rows[0]["method"] == "대면(인터뷰)"
    assert rows[0]["participants"] == [
        {"role": "컨설팅책임자(PM)", "name": "홍길동"},
        {"role": "기업 내부전문가", "name": "김영희"},
    ]
    assert rows[1]["round"] == "2차"


def test_table_rows_task_workflow():
    data = {
        "task_workflow_items": [
            {
                "job": "생산",
                "task": "품질검사",
                "as_is": "수동",
                "problem": "오탐",
                "data_availability": "센서 데이터 보유",
                "ai_necessity_score": 5,
            }
        ]
    }
    rows = build_table_rows(data, "task_workflow")
    assert len(rows) == 1
    r = rows[0]
    assert r["job"] == "생산"
    assert r["task"] == "품질검사"
    assert r["ai_necessity_score"] == "5"


def test_table_rows_competencies():
    data = {
        "competencies": [
            {
                "name": "AI 기초 이해",
                "definition_performance_criteria": "AI 개념 설명 가능",
                "knowledge": "머신러닝 기본",
                "skill": "도구 사용",
                "attitude": "학습 의지",
            }
        ]
    }
    rows = build_table_rows(data, "competency")
    assert len(rows) == 1
    assert rows[0]["name"] == "AI 기초 이해"
    assert rows[0]["skill"] == "도구 사용"


def test_table_rows_training_structure():
    data = {
        "training_structure_rows": [
            {
                "competency_name": "AI 기초 이해",
                "training_level": "초급",
                "training_content": "AI 개념",
                "training_target": "전 임직원",
                "training_method": "사내 집체",
                "training_goal": "AI 이해",
            }
        ]
    }
    rows = build_table_rows(data, "training_structure")
    assert len(rows) == 1
    assert rows[0]["training_level"] == "초급"


def test_table_rows_annual_plan():
    data = {
        "annual_plan_items": [
            {
                "competency_name": "AI 실무",
                "course_name": "생성형 AI 업무 활용",
                "training_type": "사내 집체",
                "training_hours": "16",
                "remarks": "2분기 실시",
            }
        ]
    }
    rows = build_table_rows(data, "annual_plan")
    assert len(rows) == 1
    assert rows[0]["course_name"] == "생성형 AI 업무 활용"


def test_table_rows_empty_input_returns_empty_list():
    assert build_table_rows({}, "task_workflow") == []
    assert build_table_rows({"competencies": []}, "competency") == []


def test_table_rows_unknown_key_raises():
    with pytest.raises(ValueError):
        build_table_rows({}, "unknown_table")


# ---------------------------------------------------------------
# 6. 훈련과정 명세서 (course_specs)
# ---------------------------------------------------------------


def test_course_specs_extraction():
    data = {
        "course_specs": [
            {
                "course_name": "AI 리터러시",
                "training_type": "사내 집체",
                "recommended_program": "사업주훈련",
                "training_goal": "AI 이해도 향상",
                "main_content": "기본 개념",
                "training_target": "전 임직원",
                "subjects": [
                    {"subject_name": "AI 개론", "details": "1단원: 기초", "hours": "4"},
                ],
            }
        ]
    }
    specs = build_table_rows(data, "course_specs")
    assert len(specs) == 1
    assert specs[0]["course_name"] == "AI 리터러시"
    assert len(specs[0]["subjects"]) == 1
    assert specs[0]["subjects"][0]["subject_name"] == "AI 개론"
