"""
PBL HWPX 플레이스홀더 매핑 단위 테스트.

data dict → placeholder map / table rows 변환 로직의 핵심 계약:
- 체크박스 토글 (AI역량 4등급 · 훈련목표 5종 · 사내/사외 · 과정평가 3종)
- 누락 필드 안전 처리 (None → "")
- 반복 표 데이터 정규화 (수행활동 · 조직도 · 문제우선순위 · 훈련대상업무 · AI도구5단계 · 교과목내용 · 체크리스트 등)
"""
import os
import sys

# generate.py와 동일한 경로 삽입 (상대 임포트 지원)
_DIR = os.path.dirname(os.path.abspath(__file__))
if _DIR not in sys.path:
    sys.path.insert(0, _DIR)

import pytest  # noqa: E402

from _placeholders_pbl import (  # noqa: E402
    AI_LEVEL_DESCRIPTIONS,
    build_pbl_placeholder_map,
    build_pbl_table_rows,
)


# ---------------------------------------------------------------
# build_pbl_placeholder_map
# ---------------------------------------------------------------


class TestPlaceholderMap:
    def test_cover_and_overview_simple_keys(self):
        data = {
            "company_name": "㈜테스트",
            "course_name": "AI 자동화 과정",
            "report_date": "2026. 04. 18.",
            "business_registration_no": "123-45-67890",
            "industry_code": "C26",
            "industry_main": "전자부품 제조",
            "address": "서울 강남구",
            "training_address": "본사 3층",
            "jurisdiction_office": "서울지부",
            "contact_position": "부장",
            "contact_name": "김담당",
            "contact_phone": "010-1234-5678",
            "contact_email": "foo@bar.com",
            "ncs_code": "200107 인공지능",
            "training_hours": 40,
            "trainee_count": 10,
            "training_job": "데이터 분석",
        }
        m = build_pbl_placeholder_map(data)
        assert m["{{company_name}}"] == "㈜테스트"
        assert m["{{course_name}}"] == "AI 자동화 과정"
        assert m["{{report_date}}"] == "2026. 04. 18."
        assert m["{{contact_email}}"] == "foo@bar.com"
        assert m["{{training_hours}}"] == "40"
        assert m["{{trainee_count}}"] == "10"

    def test_missing_values_empty_string(self):
        m = build_pbl_placeholder_map({})
        assert m["{{company_name}}"] == ""
        assert m["{{training_hours}}"] == ""

    def test_none_values_empty_string(self):
        m = build_pbl_placeholder_map({"course_name": None, "ncs_code": None})
        assert m["{{course_name}}"] == ""
        assert m["{{ncs_code}}"] == ""

    def test_business_issues_and_core_texts(self):
        m = build_pbl_placeholder_map(
            {
                "business_issues": "수작업 공정 비효율",
                "course_development_necessity": "AI 도입 필요",
                "target_tasks_selection_reason": "매출 기여도 높음",
                "training_goal": "AI 역량 확보",
            }
        )
        assert m["{{business_issues}}"] == "수작업 공정 비효율"
        assert m["{{course_development_necessity}}"] == "AI 도입 필요"
        assert m["{{target_tasks_selection_reason}}"] == "매출 기여도 높음"
        assert m["{{training_goal}}"] == "AI 역량 확보"

    def test_ai_level_description_mapping(self):
        # 4등급 라벨 → 설명이 양식 원본과 매핑
        assert AI_LEVEL_DESCRIPTIONS["AI기초형"].startswith("AI 및 디지털 기술 도입에 대한 인식")
        assert "초급" in AI_LEVEL_DESCRIPTIONS["AI탐구형"] or "AI 및 디지털" in AI_LEVEL_DESCRIPTIONS["AI탐구형"]
        assert AI_LEVEL_DESCRIPTIONS["AI활용형"]
        assert AI_LEVEL_DESCRIPTIONS["AI선도형"]


# ---------------------------------------------------------------
# 반복 표
# ---------------------------------------------------------------


class TestTableRows:
    def test_organization_rows(self):
        data = {
            "organization": [
                {"department_name": "생산팀", "tasks": ["제품 생산", "품질 관리"]},
                {"department_name": "영업팀", "tasks": ["고객 응대"]},
            ]
        }
        rows = build_pbl_table_rows(data, "organization")
        assert len(rows) == 2
        assert rows[0]["department_name"] == "생산팀"
        assert "제품 생산" in rows[0]["tasks"]
        assert "품질 관리" in rows[0]["tasks"]

    def test_performance_activities_rows(self):
        data = {
            "performance_activities": [
                {
                    "round": 1,
                    "date": "25/04/10",
                    "content": "킥오프 회의",
                    "method": "대면(회의)",
                    "participants": {
                        "pm": "이PM",
                        "external_expert": "박전문가",
                        "internal_expert": "최내부",
                        "jurisdiction_manager": "김주치의",
                    },
                },
                {
                    "round": 2,
                    "date": "25/04/15",
                    "content": "문제 정의 워크숍",
                    "method": "비대면(화상)",
                    "participants": {
                        "pm": "이PM",
                        "external_expert": "",
                        "internal_expert": "최내부",
                        "jurisdiction_manager": "",
                    },
                },
            ]
        }
        rows = build_pbl_table_rows(data, "performance_activities")
        assert len(rows) == 2
        assert rows[0]["round"] == "1차"
        assert rows[0]["participants"]["pm"] == "이PM"
        assert rows[1]["participants"]["jurisdiction_manager"] == ""

    def test_problem_priorities_rows(self):
        data = {
            "problem_priorities": [
                {"problem_name": "PLC 데이터 구조 이해", "priority": 5, "selected": True},
                {"problem_name": "설비 이상 탐지", "priority": 4, "selected": False},
            ]
        }
        rows = build_pbl_table_rows(data, "problem_priorities")
        assert len(rows) == 2
        assert rows[0]["priority"] == 5
        assert rows[0]["selected"] is True
        assert rows[1]["selected"] is False

    def test_target_tasks_rows(self):
        data = {
            "target_tasks": [
                {"task_name": "센서 데이터 수집", "necessity": 5, "selected": True},
                {"task_name": "업무B", "necessity": 3, "selected": False},
            ]
        }
        rows = build_pbl_table_rows(data, "target_tasks")
        assert rows[0]["task_name"] == "센서 데이터 수집"
        assert rows[0]["necessity"] == 5
        assert rows[0]["selected"] is True

    def test_target_task_details_rows(self):
        data = {
            "target_task_details": [
                {
                    "task_name": "센서 데이터 수집",
                    "as_is": "수작업",
                    "to_be": "자동화",
                    "required_knowledge": "데이터베이스",
                    "required_skill": "Python",
                }
            ]
        }
        rows = build_pbl_table_rows(data, "target_task_details")
        assert rows[0]["as_is"] == "수작업"
        assert rows[0]["to_be"] == "자동화"

    def test_ai_tool_usage_plan_rows(self):
        data = {
            "ai_tool_usage_plan": [
                {
                    "stage": "1단계",
                    "main_activity": "훈련실시",
                    "ai_tools": ["ChatGPT", "Lovable"],
                    "utilized_data": "제품 데이터",
                    "purpose": "역량 강화",
                    "specific_method": "프로토타입 제작",
                },
                {
                    "stage": "2단계",
                    "main_activity": "피드백",
                    "ai_tools": ["Google Forms"],
                    "utilized_data": "설문 데이터",
                    "purpose": "개선",
                    "specific_method": "분석",
                },
            ]
        }
        rows = build_pbl_table_rows(data, "ai_tool_usage_plan")
        assert len(rows) == 2
        # ai_tools 배열은 줄바꿈 결합
        assert "ChatGPT" in rows[0]["ai_tools"] and "Lovable" in rows[0]["ai_tools"]

    def test_training_history_rows(self):
        data = {
            "training_history": [
                {"seq": 1, "program": "직무개발", "course_name": "Python 기초", "method": "집체", "duration_days": 3},
            ]
        }
        rows = build_pbl_table_rows(data, "training_history")
        assert rows[0]["seq"] == "1"
        assert rows[0]["program"] == "직무개발"

    def test_recommendations_rows(self):
        data = {
            "recommendations": [
                {"rank": 1, "program": "S-OJT", "proposal": "체계적 현장훈련"},
                {"rank": 2, "program": "사업주훈련", "proposal": "기업 자체 훈련"},
            ]
        }
        rows = build_pbl_table_rows(data, "recommendations")
        assert len(rows) == 2
        assert rows[0]["rank"] == 1
        assert rows[0]["program"] == "S-OJT"

    def test_learning_group_rows(self):
        data = {
            "learning_group": {
                "instructors": [
                    {"type": "외부", "role": "팀원", "affiliation": "A컨설팅", "position": "대표", "name": "홍전문"},
                    {"type": "내부", "role": "팀장", "affiliation": "㈜테스트", "position": "팀장", "name": "이팀장"},
                ],
                "trainees": [
                    {"role": "팀원", "affiliation": "㈜테스트", "position": "사원", "name": "김훈련"},
                    {"role": "팀원", "affiliation": "㈜테스트", "position": "대리", "name": "박훈련"},
                ],
            }
        }
        rows = build_pbl_table_rows(data, "learning_group")
        # instructors(2) + trainees(2) 총 4행
        assert len(rows) == 4
        # 강사 먼저, 훈련생 다음 순서
        assert rows[0]["category"] == "훈련 강사"
        assert rows[0]["type"] == "외부"
        assert rows[2]["category"] == "훈련생"

    def test_training_contents_rows(self):
        data = {
            "training_contents": [
                {
                    "unit_name": "데이터 수집",
                    "detail": "센서 데이터 정제",
                    "training_hours": 8,
                    "instructor_hours": {"external": 5, "internal": 3},
                }
            ]
        }
        rows = build_pbl_table_rows(data, "training_contents")
        assert rows[0]["unit_name"] == "데이터 수집"
        assert rows[0]["training_hours"] == "8"
        assert rows[0]["external_hours"] == "5"
        assert rows[0]["internal_hours"] == "3"

    def test_facilities_rows(self):
        data = {
            "facilities": [
                {"seq": 1, "category": "시설", "name": "교육장 A", "spec": "30석", "location": "본사 3층"}
            ]
        }
        rows = build_pbl_table_rows(data, "facilities")
        assert rows[0]["category"] == "시설"
        assert rows[0]["location"] == "본사 3층"

    def test_training_instructors_rows(self):
        data = {
            "training_instructors": [
                {
                    "name": "홍전문",
                    "internal_external": "외부",
                    "career_years": 10,
                    "work_name": "AI 컨설팅",
                    "detailed_training_content": ["ML 기초", "MLOps 개요"],
                }
            ]
        }
        rows = build_pbl_table_rows(data, "training_instructors")
        assert rows[0]["career_years"] == "10"
        assert "ML 기초" in rows[0]["detailed_training_content"]

    def test_performance_checklist_rows(self):
        data = {
            "performance_checklist": [
                {"unit_name": "데이터 수집", "evaluation_criteria": "10건 이상", "performance_level": 4},
                {"unit_name": "분석", "evaluation_criteria": "보고서 1건", "performance_level": 5},
            ]
        }
        rows = build_pbl_table_rows(data, "performance_checklist")
        assert len(rows) == 2
        assert rows[0]["performance_level"] == 4

    def test_unknown_key_empty_list(self):
        assert build_pbl_table_rows({}, "unknown_key") == []
