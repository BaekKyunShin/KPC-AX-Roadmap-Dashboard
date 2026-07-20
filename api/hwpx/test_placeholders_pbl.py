"""
PBL HWPX 마커 매핑 단위 테스트 (v2 — {{플레이스홀더}} 방식).

payload → {{마커}} 값 변환(`generate._build_pbl_markers`)의 핵심 계약:
- 표지·개요 단순 키 + 조합 셀(업종·주소·시간)
- 로드맵 자동 연계(수립 활동·AI역량 3단계 체크박스·요구분석·과업 분석·선정)
- PBL 인터뷰(문제 정의서·세부내용·HRD fallback)
- 운영계획 LLM(반복 표·교과목 자동 합산·체크리스트 √)
- 누락(None/미존재) → 빈 문자열 안전 처리
"""
import os
import sys

_DIR = os.path.dirname(os.path.abspath(__file__))
if _DIR not in sys.path:
    sys.path.insert(0, _DIR)

import pytest  # noqa: E402

from generate import _build_pbl_markers  # noqa: E402
from _placeholders_pbl import (  # noqa: E402
    COURSE_EVALUATION_METHODS,
    TRAINING_GOAL_LABELS,
)


# ---------------------------------------------------------------
# 상수·헬퍼
# ---------------------------------------------------------------


class TestConstantsAndHelpers:
    def test_training_goal_labels(self):
        assert TRAINING_GOAL_LABELS == (
            "기술문제 해결", "공정 최적화", "불량률 감소", "기술 매뉴얼 개발", "기타",
        )

    def test_course_evaluation_methods(self):
        assert COURSE_EVALUATION_METHODS == ("포트폴리오", "문제해결시나리오", "작업장 평가")


# ---------------------------------------------------------------
# 표지 + 개요
# ---------------------------------------------------------------


class TestCoverAndOverview:
    def test_cover_signers(self):
        m = _build_pbl_markers({
            "pm_affiliation": "KPC", "pm_name": "홍PM",
            "external_expert_affiliation": "외부소", "external_expert_name": "김외부",
            "internal_expert_affiliation": "㈜테스트", "internal_expert_name": "박내부",
            "doctor_affiliation": "센터", "doctor_name": "이주치",
            "report_date": "2026. 05. 20.",
        })
        assert m["{{pbl_cover_pm_affiliation}}"] == "KPC"
        assert m["{{pbl_cover_pm_name}}"] == "홍PM"
        assert m["{{pbl_cover_external_expert_name}}"] == "김외부"
        assert m["{{pbl_cover_internal_expert_affiliation}}"] == "㈜테스트"
        assert m["{{pbl_cover_doctor_name}}"] == "이주치"
        assert m["{{pbl_cover_report_date}}"] == "2026. 05. 20."

    def test_overview_simple_keys(self):
        m = _build_pbl_markers({
            "company_name": "㈜테스트", "business_registration_no": "123-45-67890",
            "jurisdiction_office": "서울지부", "contact_position": "부장",
            "contact_name": "최담당", "contact_phone": "010-0000-0000",
            "contact_email": "a@b.com", "course_name": "AI 과정", "ncs_code": "200107",
            "training_target_label": "QA 5명", "training_job": "검사 자동화",
        })
        assert m["{{pbl_overview_company_name}}"] == "㈜테스트"
        assert m["{{pbl_overview_business_no}}"] == "123-45-67890"
        assert m["{{pbl_overview_branch}}"] == "서울지부"
        assert m["{{pbl_overview_contact_email}}"] == "a@b.com"
        assert m["{{pbl_overview_training_target}}"] == "QA 5명"
        assert m["{{pbl_overview_training_job}}"] == "검사 자동화"

    def test_overview_industry_composed(self):
        m = _build_pbl_markers({"industry_code": "C26", "industry_main": "전자부품 제조"})
        assert m["{{pbl_overview_industry}}"] == "업종코드: C26  주업종: 전자부품 제조"

    def test_overview_industry_main_only(self):
        m = _build_pbl_markers({"industry_main": "전자부품 제조"})
        assert m["{{pbl_overview_industry}}"] == "전자부품 제조"

    def test_overview_address_block_combines_training_address(self):
        # 주소·훈련실시주소 값 셀은 rowSpan 병합(1 셀) → 조합
        m = _build_pbl_markers({"address": "서울 강남구", "training_address": "본사 3층"})
        assert m["{{pbl_overview_address}}"] == "서울 강남구\n(훈련실시: 본사 3층)"

    def test_overview_address_no_dup_when_same(self):
        m = _build_pbl_markers({"address": "서울 강남구", "training_address": "서울 강남구"})
        assert m["{{pbl_overview_address}}"] == "서울 강남구"

    def test_overview_hours_suffix(self):
        assert _build_pbl_markers({"training_hours": 40})["{{pbl_overview_training_hours}}"] == "40 시간"
        assert _build_pbl_markers({})["{{pbl_overview_training_hours}}"] == ""


# ---------------------------------------------------------------
# 로드맵 자동 연계
# ---------------------------------------------------------------


class TestRoadmapLinkage:
    def test_setup_background_and_selected_task(self):
        m = _build_pbl_markers({
            "roadmap_setup_background": "AI 도입 배경",
            "roadmap_selected_task": "검사 자동화",
        })
        assert m["{{pbl_roadmap_setup_background}}"] == "AI 도입 배경"
        assert m["{{pbl_roadmap_selected_task}}"] == "검사 자동화"

    @pytest.mark.parametrize("level,expected", [
        ("BEGINNER", ("☑", "□", "□")),
        ("INTERMEDIATE", ("□", "☑", "□")),
        ("ADVANCED", ("□", "□", "☑")),
        ("", ("□", "□", "□")),
        ("UNKNOWN", ("□", "□", "□")),
    ])
    def test_ai_level_3state_checkbox(self, level, expected):
        m = _build_pbl_markers({"roadmap_ai_level": level})
        got = (
            m["{{cb_pbl_roadmap_level_beginner}}"],
            m["{{cb_pbl_roadmap_level_intermediate}}"],
            m["{{cb_pbl_roadmap_level_advanced}}"],
        )
        assert got == expected

    def test_setup_activities_pm_and_expert_rows(self):
        m = _build_pbl_markers({
            "roadmap_setup_activities": [
                {"date": "2026-04-01", "content": "킥오프", "method": "대면",
                 "pm_name": "홍PM", "expert_name": "박내부"},
            ],
        })
        assert m["{{pbl_roadmap_activity_0_date}}"] == "2026-04-01"
        assert m["{{pbl_roadmap_activity_0_content}}"] == "킥오프"
        assert m["{{pbl_roadmap_activity_0_pm_name}}"] == "홍PM"
        assert m["{{pbl_roadmap_activity_0_expert_name}}"] == "박내부"
        # 미공급 차수는 빈 문자열
        assert m["{{pbl_roadmap_activity_2_pm_name}}"] == ""

    def test_requirements(self):
        m = _build_pbl_markers({
            "roadmap_req_company_status": "현황", "roadmap_req_main_problems": "문제",
            "roadmap_req_push_willingness": "의지", "roadmap_req_expected_outcomes": "성과",
        })
        assert m["{{pbl_req_company_status}}"] == "현황"
        assert m["{{pbl_req_main_problems}}"] == "문제"
        assert m["{{pbl_req_push_willingness}}"] == "의지"
        assert m["{{pbl_req_expected_outcomes}}"] == "성과"

    def test_task_analysis_rows(self):
        m = _build_pbl_markers({
            "roadmap_task_analysis": [
                {"job": "생산", "task": "검사", "as_is": "육안", "improvement": "AI"},
            ],
        })
        assert m["{{pbl_task_0_job}}"] == "생산"
        assert m["{{pbl_task_0_task}}"] == "검사"
        assert m["{{pbl_task_0_as_is}}"] == "육안"
        assert m["{{pbl_task_0_improvement}}"] == "AI"
        assert m["{{pbl_task_4_job}}"] == ""  # max 5 rows, 미공급 빈 문자열

    def test_target_task(self):
        m = _build_pbl_markers({
            "roadmap_target_task": {"name": "검사 자동화", "reason": "불량 감소",
                                    "as_is": "육안", "to_be": "AI 비전"},
        })
        assert m["{{pbl_target_task_name}}"] == "검사 자동화"
        assert m["{{pbl_target_task_reason}}"] == "불량 감소"
        assert m["{{pbl_target_task_as_is}}"] == "육안"
        assert m["{{pbl_target_task_to_be}}"] == "AI 비전"

    def test_perf_activities_pm_expert(self):
        m = _build_pbl_markers({
            "roadmap_perf_activities": [
                {"date": "2026-04-01", "content": "킥오프", "method": "대면",
                 "pm_name": "홍PM", "expert_name": "박내부"},
            ],
        })
        assert m["{{pbl_perf_0_pm_name}}"] == "홍PM"
        assert m["{{pbl_perf_0_expert_name}}"] == "박내부"
        assert m["{{pbl_perf_0_content}}"] == "킥오프"

    def test_task_selections_with_checkbox_and_job_skip(self):
        m = _build_pbl_markers({
            "roadmap_task_selections": [
                {"job": "생산", "task": "검사", "as_is": "육안", "improvement": "AI",
                 "ai_necessity": "높음", "training_selected": True},
                {"job": "품질", "task": "분류", "as_is": "수기", "improvement": "자동",
                 "ai_necessity": "중간", "training_selected": False},
            ],
        })
        assert m["{{pbl_selection_0_job}}"] == "생산"
        assert m["{{pbl_selection_0_ai_necessity}}"] == "높음"
        assert m["{{pbl_selection_0_training_selected}}"] == "☑"
        assert m["{{pbl_selection_1_training_selected}}"] == "☐"
        # 직무 col 은 i=1 병합 skip → 마커 미생성 (템플릿에도 없음)
        assert "{{pbl_selection_1_job}}" not in m
        assert m["{{pbl_selection_1_task}}"] == "분류"


# ---------------------------------------------------------------
# PBL 인터뷰
# ---------------------------------------------------------------


class TestPblInterview:
    def test_course_necessity(self):
        m = _build_pbl_markers({"course_necessity": "AI 내재화 필요"})
        assert m["{{pbl_analysis_course_necessity}}"] == "AI 내재화 필요"

    def test_hrd_url_fallback(self):
        from _placeholders_roadmap import HRD_REPORT_URL_FALLBACK
        m = _build_pbl_markers({"hrd_report_attachment": "https://x/y.pdf"})
        assert m["{{pbl_analysis_hrd_report_attachment}}"] == HRD_REPORT_URL_FALLBACK

    def test_hrd_filename_kept(self):
        m = _build_pbl_markers({"hrd_report_attachment": "hrd.pdf"})
        assert m["{{pbl_analysis_hrd_report_attachment}}"] == "hrd.pdf"

    def test_hrd_empty_fallback(self):
        from _placeholders_roadmap import HRD_REPORT_EMPTY_FALLBACK
        m = _build_pbl_markers({})
        assert m["{{pbl_analysis_hrd_report_attachment}}"] == HRD_REPORT_EMPTY_FALLBACK

    def test_problem_definition_sheet(self):
        m = _build_pbl_markers({
            "problem_definition_sheet": {"background": "배경", "core": "핵심",
                                         "scope": "범위", "constraints": "제약"},
        })
        assert m["{{pbl_problem_background}}"] == "배경"
        assert m["{{pbl_problem_core}}"] == "핵심"
        assert m["{{pbl_problem_scope}}"] == "범위"
        assert m["{{pbl_problem_constraints}}"] == "제약"

    def test_target_necessity(self):
        m = _build_pbl_markers({"target_necessity": "병목 해소"})
        assert m["{{pbl_tasks_target_necessity}}"] == "병목 해소"

    def test_target_details_5_columns(self):
        m = _build_pbl_markers({
            "target_details": [
                {"title": "수집", "as_is": "수기", "to_be": "자동",
                 "required_knowledge": "구조", "required_skill": "Python"},
            ],
        })
        assert m["{{pbl_detail_0_title}}"] == "수집"
        assert m["{{pbl_detail_0_as_is}}"] == "수기"
        assert m["{{pbl_detail_0_to_be}}"] == "자동"
        assert m["{{pbl_detail_0_required_knowledge}}"] == "구조"
        assert m["{{pbl_detail_0_required_skill}}"] == "Python"


# ---------------------------------------------------------------
# 운영계획 (LLM)
# ---------------------------------------------------------------


class TestOperationPlan:
    def test_training_goal_and_metrics(self):
        m = _build_pbl_markers({
            "training_goal": "역량 확보",
            "quantitative_metrics": "50% 감소", "qualitative_metrics": "만족도 향상",
        })
        assert m["{{pbl_ops_training_goal}}"] == "역량 확보"
        assert m["{{pbl_ops_quantitative_metrics}}"] == "50% 감소"
        assert m["{{pbl_ops_qualitative_metrics}}"] == "만족도 향상"

    def test_ai_tool_usage_list_join(self):
        m = _build_pbl_markers({
            "ai_tool_usage_plan": [
                {"stage": "1단계", "main_activity": "수집", "ai_tools": ["Roboflow", "LabelImg"],
                 "utilized_data": "이미지", "purpose": "구축", "specific_method": "라벨링"},
            ],
        })
        assert m["{{pbl_ops_tool_0_stage}}"] == "1단계"
        assert m["{{pbl_ops_tool_0_ai_tools}}"] == "Roboflow\nLabelImg"
        assert m["{{pbl_ops_tool_0_specific_method}}"] == "라벨링"

    def test_course_overview(self):
        m = _build_pbl_markers({
            "training_plan_course_name": "AI 과정", "training_period": "05.01 ~ 06.30",
        })
        assert m["{{pbl_ops_course_name}}"] == "AI 과정"
        assert m["{{pbl_ops_training_period}}"] == "05.01 ~ 06.30"

    def test_learning_group_instructors_then_trainees(self):
        m = _build_pbl_markers({
            "learning_group": {
                "instructors": [{"affiliation": "외부소", "position": "책임", "name": "김강사"}],
                "trainees": [{"affiliation": "㈜테스트", "position": "사원", "name": "훈련A"}],
            },
        })
        # 강사가 먼저(row 0), 훈련생 다음(row 1)
        assert m["{{pbl_ops_group_0_name}}"] == "김강사"
        assert m["{{pbl_ops_group_0_affiliation}}"] == "외부소"
        assert m["{{pbl_ops_group_1_name}}"] == "훈련A"

    def test_subject_profile_and_auto_sum(self):
        m = _build_pbl_markers({
            "subject_profile_course_name": "AI 과정", "total_training_hours": 40,
            "subject_ai_tools": "PyTorch",
            "training_contents": [
                {"unit_name": "수집", "detail": "라벨링", "training_hours": 8,
                 "instructor_hours": {"external": 5, "internal": 3}},
                {"unit_name": "학습", "detail": "CNN", "training_hours": 16,
                 "instructor_hours": {"external": 10, "internal": 6}},
            ],
        })
        assert m["{{pbl_ops_subject_course_name}}"] == "AI 과정"
        assert m["{{pbl_ops_content_0_unit_name}}"] == "수집"
        assert m["{{pbl_ops_content_0_external_hours}}"] == "5"
        # 자동 합산: 훈련시간 8+16=24, 외부 5+10=15, 내부 3+6=9
        assert m["{{pbl_ops_subject_sum_hours}}"] == "24"
        assert m["{{pbl_ops_subject_sum_external}}"] == "15"
        assert m["{{pbl_ops_subject_sum_internal}}"] == "9"

    def test_subject_sum_falls_back_when_no_numeric(self):
        m = _build_pbl_markers({"subject_total_sum_hours": 40, "training_contents": []})
        assert m["{{pbl_ops_subject_sum_hours}}"] == "40"

    def test_facilities(self):
        m = _build_pbl_markers({
            "facilities": [{"seq": 1, "category": "시설", "name": "실습실",
                            "spec": "20석", "location": "3층"}],
        })
        assert m["{{pbl_ops_facility_0_name}}"] == "실습실"
        assert m["{{pbl_ops_facility_0_location}}"] == "3층"

    def test_training_instructors_detail_no_literal_bullet(self):
        """훈련강사 세부내용 — 양식 자동 글머리가 렌더하므로 값엔 리터럴 '•' 없이 줄바꿈만."""
        m = _build_pbl_markers({
            "training_instructors": [{"name": "김강사", "internal_external": "외부",
                                      "career_years": 10, "work_name": "컨설팅",
                                      "detailed_training_content": ["기초", "실습"]}],
        })
        assert m["{{pbl_ops_instructor_0_name}}"] == "김강사"
        assert m["{{pbl_ops_instructor_0_career_years}}"] == "10"
        assert m["{{pbl_ops_instructor_0_detailed_training_content}}"] == "기초\n실습"
        assert "•" not in m["{{pbl_ops_instructor_0_detailed_training_content}}"]

    def test_perf_activity_date_is_date_only(self):
        """Ⅲ-1 수행활동(T19) date 마커는 일자만 (시간 제거)."""
        m = _build_pbl_markers({
            "roadmap_perf_activities": [
                {"round": 1, "date": "2026-04-01\n10:00~12:00", "content": "킥오프"},
            ],
        })
        assert m["{{pbl_perf_0_date}}"] == "2026-04-01"
        assert "\n" not in m["{{pbl_perf_0_date}}"]
        assert ":" not in m["{{pbl_perf_0_date}}"]

    def test_setup_activity_date_keeps_time(self):
        """Ⅱ-1-나 주요활동(T9) date 마커는 일자+시간 2줄 유지 (Ⅲ-1 과 대비)."""
        m = _build_pbl_markers({
            "roadmap_setup_activities": [
                {"round": 1, "date": "2026-04-01\n10:00~12:00", "content": "킥오프"},
            ],
        })
        assert m["{{pbl_roadmap_activity_0_date}}"] == "2026-04-01\n10:00~12:00"

    def test_course_eval(self):
        m = _build_pbl_markers({
            "course_eval_course_name": "AI 과정", "course_eval_target": "5명",
            "course_eval_date": "06.30", "course_eval_criteria": "8개 이상",
            "course_eval_result": "예정", "course_eval_overall_comment": "우수",
        })
        assert m["{{pbl_ops_eval_course_name}}"] == "AI 과정"
        assert m["{{pbl_ops_eval_result}}"] == "예정"
        assert m["{{pbl_ops_eval_overall_comment}}"] == "우수"

    def test_performance_checklist_level_check(self):
        m = _build_pbl_markers({
            "performance_checklist": [
                {"unit_name": "수집", "evaluation_criteria": "100건", "performance_level": 4},
            ],
        })
        assert m["{{pbl_ops_checklist_0_unit_name}}"] == "수집"
        assert m["{{pbl_ops_checklist_0_level_4_check}}"] == "√"
        assert m["{{pbl_ops_checklist_0_level_3_check}}"] == ""
        assert m["{{pbl_ops_checklist_0_level_5_check}}"] == ""


# ---------------------------------------------------------------
# 안전 처리
# ---------------------------------------------------------------


class TestSafety:
    def test_empty_dict_all_str(self):
        m = _build_pbl_markers({})
        assert all(isinstance(v, str) for v in m.values())
        # 281 고유 마커 전부 생성 (템플릿 정합 — verify_hwpx_placeholders 가 보증)
        assert len(m) == 281

    def test_none_values_empty_string(self):
        m = _build_pbl_markers({"company_name": None, "roadmap_setup_background": None})
        assert m["{{pbl_overview_company_name}}"] == ""
        assert m["{{pbl_roadmap_setup_background}}"] == ""
