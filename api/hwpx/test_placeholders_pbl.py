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


# ---------------------------------------------------------------
# V2 — SSOT 단일 키 cover (`{{pbl_*}}` 긴 키)
# ---------------------------------------------------------------
# Phase D-2: SSOT v2 (`docs/references/hwpx-placeholders.json`) 의 PBL placeholder
# 명명 규칙 준수 — 옵션 B 채택으로 generate.py 는 V1 키를 사용하지만 (no-op),
# build_pbl_placeholder_map 출력 dict에 SSOT 의 긴 키들도 함께 포함시킨다.


class TestSSOTv2PblKeys:
    def test_cover_v2_keys(self):
        data = {
            "company_name": "㈜테스트",
            "course_name": "AI 자동화 과정",
            "report_date": "2026.04.26",
        }
        m = build_pbl_placeholder_map(data)
        assert m["{{pbl_cover_company_name}}"] == "㈜테스트"
        assert m["{{pbl_cover_course_name}}"] == "AI 자동화 과정"
        assert m["{{pbl_cover_report_date}}"] == "2026.04.26"
        # V1 키도 보존
        assert m["{{company_name}}"] == "㈜테스트"

    def test_overview_v2_keys(self):
        data = {
            "company_name": "㈜테스트",
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
            "course_name": "AI 자동화 과정",
            "ncs_code": "200107 인공지능",
            "training_hours": 40,
            "training_target_label": "데이터 분석 직무 5명",
            "training_form": "사내 집체",
            "training_period": "2026.04.01 ~ 2026.05.31",
            "business_issues": "수작업 비효율",
        }
        m = build_pbl_placeholder_map(data)
        assert m["{{pbl_overview_company_name}}"] == "㈜테스트"
        assert m["{{pbl_overview_business_no}}"] == "123-45-67890"
        assert m["{{pbl_overview_industry_code}}"] == "C26"
        assert m["{{pbl_overview_industry}}"] == "전자부품 제조"
        assert m["{{pbl_overview_address}}"] == "서울 강남구"
        assert m["{{pbl_overview_training_address}}"] == "본사 3층"
        assert m["{{pbl_overview_branch}}"] == "서울지부"
        assert m["{{pbl_overview_contact_position}}"] == "부장"
        assert m["{{pbl_overview_contact_name}}"] == "김담당"
        assert m["{{pbl_overview_contact_phone}}"] == "010-1234-5678"
        assert m["{{pbl_overview_contact_email}}"] == "foo@bar.com"
        assert m["{{pbl_overview_course_name}}"] == "AI 자동화 과정"
        assert m["{{pbl_overview_ncs_code}}"] == "200107 인공지능"
        assert m["{{pbl_overview_training_hours}}"] == "40"
        assert m["{{pbl_overview_training_target}}"] == "데이터 분석 직무 5명"
        assert m["{{pbl_overview_training_form}}"] == "사내 집체"
        assert m["{{pbl_overview_training_period}}"] == "2026.04.01 ~ 2026.05.31"
        assert m["{{pbl_overview_business_issues}}"] == "수작업 비효율"

    def test_analysis_v2_keys(self):
        from _placeholders_roadmap import HRD_REPORT_URL_FALLBACK

        data = {
            "company_issues": "경영 이슈 본문",
            "course_necessity": "AI 도입 필요성 본문",
            "hrd_report_attachment": "https://x/y.pdf",
        }
        m = build_pbl_placeholder_map(data)
        assert m["{{pbl_analysis_company_issues}}"] == "경영 이슈 본문"
        assert m["{{pbl_analysis_course_necessity}}"] == "AI 도입 필요성 본문"
        # PR #5: URL 형은 fallback 안내문구로 치환
        assert m["{{pbl_analysis_hrd_report_attachment}}"] == HRD_REPORT_URL_FALLBACK
        # raw 출력 단일 키도 동일하게 fallback
        assert m["{{hrd_report_attachment}}"] == HRD_REPORT_URL_FALLBACK

    def test_pbl_hrd_report_filename_kept_as_is(self):
        """파일명·자유텍스트 형 attachment 는 raw 그대로 출력."""
        m = build_pbl_placeholder_map({"hrd_report_attachment": "hrd-pbl.pdf"})
        assert m["{{pbl_analysis_hrd_report_attachment}}"] == "hrd-pbl.pdf"
        assert m["{{hrd_report_attachment}}"] == "hrd-pbl.pdf"

    def test_pbl_hrd_report_empty_uses_empty_fallback(self):
        """빈 attachment 는 미첨부 안내 fallback."""
        from _placeholders_roadmap import HRD_REPORT_EMPTY_FALLBACK

        m = build_pbl_placeholder_map({})
        assert m["{{pbl_analysis_hrd_report_attachment}}"] == HRD_REPORT_EMPTY_FALLBACK
        assert m["{{hrd_report_attachment}}"] == HRD_REPORT_EMPTY_FALLBACK

    def test_current_ai_level_basic_check(self):
        data = {"current_ai_level": "BASIC"}
        m = build_pbl_placeholder_map(data)
        assert m["{{pbl_tasks_current_ai_level_basic_check}}"] == "☑"
        assert m["{{pbl_tasks_current_ai_level_explorer_check}}"] == "☐"
        assert m["{{pbl_tasks_current_ai_level_user_check}}"] == "☐"
        assert m["{{pbl_tasks_current_ai_level_leader_check}}"] == "☐"

    def test_current_ai_level_user_check(self):
        data = {"current_ai_level": "USER"}
        m = build_pbl_placeholder_map(data)
        assert m["{{pbl_tasks_current_ai_level_basic_check}}"] == "☐"
        assert m["{{pbl_tasks_current_ai_level_explorer_check}}"] == "☐"
        assert m["{{pbl_tasks_current_ai_level_user_check}}"] == "☑"
        assert m["{{pbl_tasks_current_ai_level_leader_check}}"] == "☐"

    def test_current_ai_level_unknown_unchecked(self):
        data = {}
        m = build_pbl_placeholder_map(data)
        for k in (
            "{{pbl_tasks_current_ai_level_basic_check}}",
            "{{pbl_tasks_current_ai_level_explorer_check}}",
            "{{pbl_tasks_current_ai_level_user_check}}",
            "{{pbl_tasks_current_ai_level_leader_check}}",
        ):
            assert m[k] == "☐"

    def test_expected_ai_level_v2_cell_fill(self):
        # P-15 양식 2x3 (현행/향후/사유). 4등급 체크박스가 아닌 cell_fill.
        data = {
            "current_ai_level": "BASIC",
            "expected_ai_level": "USER",
            "expected_ai_level_note": "AI 도구 도입 후 6개월 내 활용형 진입",
        }
        m = build_pbl_placeholder_map(data)
        assert m["{{pbl_tasks_expected_ai_level_current_label}}"] == "AI기초형(기초)"
        assert m["{{pbl_tasks_expected_ai_level_expected_label}}"] == "AI활용형(중급)"
        assert (
            m["{{pbl_tasks_expected_ai_level_note}}"]
            == "AI 도구 도입 후 6개월 내 활용형 진입"
        )

    def test_target_necessity_v2_key(self):
        data = {"target_necessity": "AI 기반 자동화 필요성"}
        m = build_pbl_placeholder_map(data)
        assert m["{{pbl_tasks_target_necessity}}"] == "AI 기반 자동화 필요성"

    def test_ops_v2_keys(self):
        data = {
            "training_goal": "AI 활용 역량 확보",
            "training_plan_course_name": "AI 자동화 과정",
            "training_period": "2026.04.01 ~ 2026.05.31",
            "subject_profile_course_name": "AI 자동화 과정",
            "total_training_hours": "40",
            "subject_training_goals": "기술문제 해결",
            "subject_ai_tools": "ChatGPT",
            "subject_utilized_data": "센서 데이터",
            "subject_analysis_method": "예측 모델",
            "subject_total_sum_hours": "40",
            "course_eval_course_name": "AI 자동화 과정",
            "course_eval_target": "데이터 분석",
            "course_eval_date": "2026.05.31",
            "course_eval_criteria": "포트폴리오",
            "course_eval_result": "Pass",
            "course_eval_overall_comment": "모두 우수 통과",
        }
        m = build_pbl_placeholder_map(data)
        assert m["{{pbl_ops_training_goal}}"] == "AI 활용 역량 확보"
        assert m["{{pbl_ops_course_name}}"] == "AI 자동화 과정"
        assert m["{{pbl_ops_training_period}}"] == "2026.04.01 ~ 2026.05.31"
        assert m["{{pbl_ops_subject_course_name}}"] == "AI 자동화 과정"
        assert m["{{pbl_ops_subject_total_hours}}"] == "40"
        assert m["{{pbl_ops_subject_total_sum_hours}}"] == "40"
        assert m["{{pbl_ops_eval_course_name}}"] == "AI 자동화 과정"
        assert m["{{pbl_ops_eval_target}}"] == "데이터 분석"
        assert m["{{pbl_ops_eval_date}}"] == "2026.05.31"
        assert m["{{pbl_ops_eval_criteria}}"] == "포트폴리오"
        assert m["{{pbl_ops_eval_result}}"] == "Pass"
        assert m["{{pbl_ops_eval_overall_comment}}"] == "모두 우수 통과"

    def test_result_cover_v2_key(self):
        data = {"company_name": "㈜테스트"}
        m = build_pbl_placeholder_map(data)
        assert m["{{pbl_result_cover_company_name}}"] == "㈜테스트"


class TestSSOTv2PblTableRows:
    """V2 신규 데이터 구조 (problems/priorities/target/details V2 + activities V2)."""

    def test_problems_v2(self):
        data = {
            "problems": [
                {"title": "문제1", "description": "설명1", "impact": "영향1"},
                {"title": "문제2", "description": "설명2", "impact": "영향2"},
                {"title": "문제3", "description": "설명3", "impact": "영향3"},
                {"title": "문제4", "description": "설명4", "impact": "영향4"},
            ]
        }
        rows = build_pbl_table_rows(data, "problems")
        assert len(rows) == 4
        assert rows[0]["title"] == "문제1"
        assert rows[0]["description"] == "설명1"
        assert rows[3]["title"] == "문제4"

    def test_priorities_v2(self):
        # V2 priority.items[] (problem/score/rank). rank=1 → selected
        data = {
            "priorities": [
                {"problem": "문제1", "score": 5, "rank": 1},
                {"problem": "문제2", "score": 3, "rank": 2},
            ]
        }
        rows = build_pbl_table_rows(data, "priorities")
        assert len(rows) == 2
        assert rows[0]["problem"] == "문제1"
        assert rows[0]["score"] == 5
        assert rows[0]["rank"] == 1
        assert rows[0]["selected"] is True
        assert rows[1]["selected"] is False

    def test_target_single_v2(self):
        # V2 단일 target {name, scope, necessity, details[]} → row 1 구성
        data = {
            "target": {
                "name": "센서 데이터 수집",
                "code": "0204020107",
                "scope": "생산팀 5명",
                "necessity": "수동 측정 비효율 개선",
                "details": [
                    {"title": "데이터 수집", "description": "PLC에서 자동 수집"},
                ],
            }
        }
        rows = build_pbl_table_rows(data, "target_single")
        assert len(rows) == 1
        assert rows[0]["name"] == "센서 데이터 수집"
        assert rows[0]["scope"] == "생산팀 5명"
        assert rows[0]["necessity"] == "수동 측정 비효율 개선"

    def test_target_details_v2(self):
        # V2 PR #7: details[] 5 필드 (title/as_is/to_be/required_knowledge/required_skill)
        data = {
            "target_details": [
                {
                    "title": "데이터 수집",
                    "as_is": "수동 측정",
                    "to_be": "PLC 자동 수집",
                    "required_knowledge": "센서 데이터 구조",
                    "required_skill": "Python pandas",
                },
                {
                    "title": "분석",
                    "as_is": "Excel 수기 집계",
                    "to_be": "ML 모델 자동 분류",
                    "required_knowledge": "통계·ML 기초",
                    "required_skill": "scikit-learn 실습",
                },
            ]
        }
        rows = build_pbl_table_rows(data, "target_details_v2")
        assert len(rows) == 2
        assert rows[0]["title"] == "데이터 수집"
        assert rows[0]["as_is"] == "수동 측정"
        assert rows[0]["to_be"] == "PLC 자동 수집"
        assert rows[0]["required_knowledge"] == "센서 데이터 구조"
        assert rows[0]["required_skill"] == "Python pandas"
        assert rows[1]["title"] == "분석"
        assert rows[1]["as_is"] == "Excel 수기 집계"

    def test_target_details_v2_v1_fallback(self):
        # V1 호환: description 만 있는 기존 row → as_is 로 자동 이전, 나머지 빈 문자열
        data = {
            "target_details": [
                {"title": "데이터 수집", "description": "PLC 자동 수집"},
            ]
        }
        rows = build_pbl_table_rows(data, "target_details_v2")
        assert len(rows) == 1
        assert rows[0]["title"] == "데이터 수집"
        assert rows[0]["as_is"] == "PLC 자동 수집"  # description → as_is fallback
        assert rows[0]["to_be"] == ""
        assert rows[0]["required_knowledge"] == ""
        assert rows[0]["required_skill"] == ""

    def test_activities_v2(self):
        # V2 participants 는 4 person dict (PR #5 Phase F-4 schema 변경).
        # build_pbl_table_rows 가 dict / string / null 입력을 모두 정규화한다.
        data = {
            "activities": [
                {
                    "round": 1,
                    "date": "26.04.10",
                    "content": "킥오프",
                    "method": "대면",
                    "participants": {
                        "pm": "홍길동",
                        "external_expert": "김전문",
                        "internal_expert": "박관리",
                        "jurisdiction_manager": "이주치",
                    },
                },
                {
                    "round": 2,
                    "date": "26.04.17",
                    "content": "문제 정의",
                    "method": "대면",
                    # 기존 string 데이터 호환 — PM 에 통째로 채움
                    "participants": "PM 홍길동",
                },
            ]
        }
        rows = build_pbl_table_rows(data, "activities")
        assert len(rows) == 2
        assert rows[0]["round"] == "1차"
        # dict 입력 — 4 person 모두 정상 노출
        assert rows[0]["participants"]["pm"] == "홍길동"
        assert rows[0]["participants"]["external_expert"] == "김전문"
        assert rows[0]["participants"]["internal_expert"] == "박관리"
        assert rows[0]["participants"]["jurisdiction_manager"] == "이주치"
        # string 입력 → PM 으로 정규화
        assert rows[1]["round"] == "2차"
        assert rows[1]["participants"]["pm"] == "PM 홍길동"
        assert rows[1]["participants"]["external_expert"] == ""
        assert rows[1]["participants"]["internal_expert"] == ""
        assert rows[1]["participants"]["jurisdiction_manager"] == ""

    def test_activities_v2_null_participants_normalized(self):
        # PR #5 Phase F-4: participants 가 null/missing 인 경우 빈 dict 로 정규화.
        data = {
            "activities": [
                {
                    "round": 1,
                    "date": "26.04.10",
                    "content": "킥오프",
                    "method": "대면",
                    "participants": None,
                }
            ]
        }
        rows = build_pbl_table_rows(data, "activities")
        assert rows[0]["participants"] == {
            "pm": "",
            "external_expert": "",
            "internal_expert": "",
            "jurisdiction_manager": "",
        }

    def test_organization_v2_with_main_work(self):
        # V2 organization 은 V1 의 organization 행 구조와 호환되는 형태로 D-5 가 출력
        # — orgTree 는 부서명 컬럼에 flatten, mainWork 는 별도 행으로 추가 (output 측 책임)
        data = {
            "organization": [
                {"department_name": "생산팀", "tasks": ["품질 검사", "데이터 수집"]},
                {"department_name": "영업팀", "tasks": ["고객 응대"]},
            ]
        }
        rows = build_pbl_table_rows(data, "organization")
        assert len(rows) == 2
        assert rows[0]["department_name"] == "생산팀"
        assert "품질 검사" in rows[0]["tasks"]

    def test_organization_v2_raw_dict_flatten(self):
        # V2 raw {orgTree, mainWork} 형태도 처리: dept 별 grouping, role+description 통합.
        data = {
            "organization": {
                "orgTree": [],
                "mainWork": [
                    {"dept": "생산팀", "role": "팀장", "description": "공정 관리"},
                    {"dept": "생산팀", "role": "팀원", "description": "품질 검사"},
                    {"dept": "영업팀", "role": "팀장", "description": "고객 응대"},
                ],
            }
        }
        rows = build_pbl_table_rows(data, "organization")
        assert len(rows) == 2
        assert rows[0]["department_name"] == "생산팀"
        assert "팀장 · 공정 관리" in rows[0]["tasks"]
        assert "팀원 · 품질 검사" in rows[0]["tasks"]
        assert rows[1]["department_name"] == "영업팀"
