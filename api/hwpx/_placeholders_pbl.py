"""
PBL HWPX 플레이스홀더 매핑 (Step 10).

입력: Node.js 측 `buildPBLHwpxPayload` 결과 (dict).
출력:
- `build_pbl_placeholder_map(data)` : `{{key}}` → 단순 텍스트 dict (표지·개요·박스 공통)
- `build_pbl_table_rows(data, key)` : 반복 표의 행 dict 배열 (조직도·수행활동·문제우선순위·훈련대상·AI도구·학습그룹·교과목·시설·강사·체크리스트·훈련이력·지원이력·추천훈련사업)

Python 함수는 순수 데이터 변환만 수행한다. 실제 HWPX OXML 조작은 `generate.py`의
`_generate_pbl` 및 `_fill_table_pbl_*` 헬퍼가 이 결과를 사용해 수행한다.
"""
from typing import Any

# ---------------------------------------------------------------
# 고정 상수
# ---------------------------------------------------------------

AI_LEVEL_LABELS: tuple[str, ...] = ("AI기초형", "AI탐구형", "AI활용형", "AI선도형")

AI_LEVEL_GRADE: dict[str, str] = {
    "AI기초형": "기초",
    "AI탐구형": "초급",
    "AI활용형": "중급",
    "AI선도형": "고급",
}

AI_LEVEL_DESCRIPTIONS: dict[str, str] = {
    "AI기초형": (
        "AI 및 디지털 기술 도입에 대한 인식은 있으나, 실제 활용은 "
        "거의 없거나 매우 제한적"
    ),
    "AI탐구형": (
        "AI 및 디지털 기술에 대해 학습하고, 내부 탐색 또는 외부 "
        "파일럿 검토를 준비(검토) 중인 단계"
    ),
    "AI활용형": (
        "생성형 AI나 기타 AI기술이 특정 단위업무나 부서에서 "
        "활용되고 있으며, 데이터 기반 개선이 나타나기 시작한 단계"
    ),
    "AI선도형": (
        "AI가 조직 전반에 내재화되어 있으며, 조직 AX 전환 및 "
        "전 프로세스 AI 기술 적용, 신사업과 혁신적 활용까지 이루어진 단계"
    ),
}

TRAINING_GOAL_LABELS: tuple[str, ...] = (
    "기술문제 해결",
    "공정 최적화",
    "불량률 감소",
    "기술 매뉴얼 개발",
    "기타",
)

COURSE_EVALUATION_METHODS: tuple[str, ...] = (
    "포트폴리오",
    "문제해결시나리오",
    "작업장 평가",
)

# 단순 플레이스홀더 — 입력 key와 플레이스홀더 key가 1:1 대응
_SIMPLE_KEYS = (
    # 표지
    "company_name",
    "course_name",
    "report_date",
    # Ⅰ. 훈련과정 개요
    "business_registration_no",
    "industry_code",
    "industry_main",
    "address",
    "training_address",
    "jurisdiction_office",
    "contact_position",
    "contact_name",
    "contact_phone",
    "contact_email",
    "ncs_code",
    "training_hours",
    "trainee_count",
    "training_job",
    # Ⅱ. 훈련 요구 분석
    "business_issues",
    "proper_training_hours",
    "training_place_location",
    "training_place_special_notes",
    "internal_instructor_name",
    "internal_instructor_position",
    "target_count",
    "target_career",
    "target_level",
    "ai_tools_status",  # 가능/제한적/불가능
    "network_status",  # 양호/보통/개선필요
    "pc_count",
    "etc_equipment",
    "training_needs_analysis",
    "expectation_as_is",
    "expectation_to_be",
    "course_development_necessity",
    # Ⅲ. AI기반 훈련과제 도출
    "problem_background",
    "problem_core",
    "problem_scope",
    "problem_constraints",
    "target_tasks_selection_reason",
    "current_ai_level_label",  # AI탐구형(초급) 형식 — 향상도 표 현행/향후
    "expected_ai_level_label",
    "ai_improvement_reason",
    # Ⅳ. AI 기반 운영계획 수립
    "training_goal",
    "training_plan_course_name",
    "training_period",  # "2026.04.01 ~ 2026.05.31"
    # 교과목 프로파일 상단 고정
    "subject_profile_course_name",
    "total_training_hours",
    "subject_training_goals",  # 줄바꿈 bullet
    "subject_ai_tools",  # 줄바꿈 bullet
    "subject_utilized_data",
    "subject_analysis_method",
    "subject_total_sum_hours",
    # 과정평가 상단
    "course_eval_course_name",
    "course_eval_target",
    "course_eval_date",
    "course_eval_criteria",
    "course_eval_result",  # Pass / Fail / 예정
    "course_eval_overall_comment",
)


def _str_or_empty(v: Any) -> str:
    if v is None:
        return ""
    return str(v)


def _bulletize(items: Any) -> str:
    """문자열 배열 → "• a\n• b" 형식, 이미 문자열이면 그대로."""
    if not items:
        return ""
    if isinstance(items, str):
        return items
    if isinstance(items, (list, tuple)):
        return "\n".join(f"• {str(i)}" for i in items if _str_or_empty(i).strip())
    return _str_or_empty(items)


# ---------------------------------------------------------------
# build_pbl_placeholder_map
# ---------------------------------------------------------------


def build_pbl_placeholder_map(data: dict) -> dict[str, str]:
    """data dict → `{{key}}` → 텍스트 dict.

    누락 필드는 빈 문자열로 안전 처리.
    """
    result: dict[str, str] = {}
    for key in _SIMPLE_KEYS:
        result[f"{{{{{key}}}}}"] = _str_or_empty(data.get(key))

    return result


# ---------------------------------------------------------------
# build_pbl_table_rows
# ---------------------------------------------------------------


def build_pbl_table_rows(data: dict, key: str) -> list[dict]:
    """반복 표의 행 데이터 추출.

    generate.py가 셀 좌표별로 사용할 값들을 dict로 반환한다.
    알 수 없는 key는 빈 리스트 반환.
    """
    if key == "organization":
        items = data.get("organization") or []
        return [
            {
                "department_name": _str_or_empty(i.get("department_name")),
                "tasks": "\n".join(
                    _str_or_empty(t) for t in (i.get("tasks") or []) if _str_or_empty(t)
                ),
            }
            for i in items
        ]

    if key == "performance_activities":
        items = data.get("performance_activities") or []
        rows = []
        for item in items:
            raw_round = item.get("round")
            round_label = f"{raw_round}차" if raw_round is not None else ""
            participants = item.get("participants") or {}
            if not isinstance(participants, dict):
                participants = {}
            rows.append(
                {
                    "round": round_label,
                    "date": _str_or_empty(item.get("date")),
                    "content": _str_or_empty(item.get("content")),
                    "method": _str_or_empty(item.get("method")),
                    "operation_mode": _str_or_empty(item.get("operation_mode")),
                    "participants": {
                        "pm": _str_or_empty(participants.get("pm")),
                        "external_expert": _str_or_empty(participants.get("external_expert")),
                        "internal_expert": _str_or_empty(participants.get("internal_expert")),
                        "jurisdiction_manager": _str_or_empty(
                            participants.get("jurisdiction_manager")
                        ),
                    },
                }
            )
        return rows

    if key == "problem_priorities":
        items = data.get("problem_priorities") or []
        return [
            {
                "problem_name": _str_or_empty(i.get("problem_name")),
                "priority": int(i.get("priority") or 0),
                "selected": bool(i.get("selected")),
            }
            for i in items
        ]

    if key == "target_tasks":
        items = data.get("target_tasks") or []
        return [
            {
                "task_name": _str_or_empty(i.get("task_name")),
                "necessity": int(i.get("necessity") or 0),
                "selected": bool(i.get("selected")),
            }
            for i in items
        ]

    if key == "target_task_details":
        items = data.get("target_task_details") or []
        return [
            {
                "task_name": _str_or_empty(i.get("task_name")),
                "as_is": _str_or_empty(i.get("as_is")),
                "to_be": _str_or_empty(i.get("to_be")),
                "required_knowledge": _str_or_empty(i.get("required_knowledge")),
                "required_skill": _str_or_empty(i.get("required_skill")),
            }
            for i in items
        ]

    if key == "ai_tool_usage_plan":
        items = data.get("ai_tool_usage_plan") or []
        return [
            {
                "stage": _str_or_empty(i.get("stage")),
                "main_activity": _str_or_empty(i.get("main_activity")),
                "ai_tools": "\n".join(
                    _str_or_empty(t) for t in (i.get("ai_tools") or []) if _str_or_empty(t)
                ),
                "utilized_data": _str_or_empty(i.get("utilized_data")),
                "purpose": _str_or_empty(i.get("purpose")),
                "specific_method": _str_or_empty(i.get("specific_method")),
            }
            for i in items
        ]

    if key == "training_history":
        items = data.get("training_history") or []
        return [
            {
                "seq": _str_or_empty(i.get("seq")),
                "program": _str_or_empty(i.get("program")),
                "course_name": _str_or_empty(i.get("course_name")),
                "method": _str_or_empty(i.get("method")),
                "duration_days": _str_or_empty(i.get("duration_days")),
            }
            for i in items
        ]

    if key == "support_history":
        items = data.get("support_history") or []
        return [
            {
                "year": _str_or_empty(i.get("year")),
                "annual_limit": _str_or_empty(i.get("annual_limit")),
                "supported": _str_or_empty(i.get("supported")),
                "ratio": _str_or_empty(i.get("ratio")),
            }
            for i in items
        ]

    if key == "recommendations":
        items = data.get("recommendations") or []
        return [
            {
                "rank": int(i.get("rank") or 0),
                "program": _str_or_empty(i.get("program")),
                "proposal": _str_or_empty(i.get("proposal")),
            }
            for i in items
        ]

    if key == "learning_group":
        group = data.get("learning_group") or {}
        instructors = group.get("instructors") or []
        trainees = group.get("trainees") or []
        rows: list[dict] = []
        for ins in instructors:
            rows.append(
                {
                    "category": "훈련 강사",
                    "type": _str_or_empty(ins.get("type")),  # 외부/내부
                    "role": _str_or_empty(ins.get("role")),  # 팀원/팀장
                    "affiliation": _str_or_empty(ins.get("affiliation")),
                    "position": _str_or_empty(ins.get("position")),
                    "name": _str_or_empty(ins.get("name")),
                }
            )
        for tr in trainees:
            rows.append(
                {
                    "category": "훈련생",
                    "type": "내부",
                    "role": _str_or_empty(tr.get("role")),
                    "affiliation": _str_or_empty(tr.get("affiliation")),
                    "position": _str_or_empty(tr.get("position")),
                    "name": _str_or_empty(tr.get("name")),
                }
            )
        return rows

    if key == "training_contents":
        items = data.get("training_contents") or []
        return [
            {
                "unit_name": _str_or_empty(i.get("unit_name")),
                "detail": _str_or_empty(i.get("detail")),
                "training_hours": _str_or_empty(i.get("training_hours")),
                "external_hours": _str_or_empty(
                    (i.get("instructor_hours") or {}).get("external")
                ),
                "internal_hours": _str_or_empty(
                    (i.get("instructor_hours") or {}).get("internal")
                ),
            }
            for i in items
        ]

    if key == "facilities":
        items = data.get("facilities") or []
        return [
            {
                "seq": _str_or_empty(i.get("seq")),
                "category": _str_or_empty(i.get("category")),
                "name": _str_or_empty(i.get("name")),
                "spec": _str_or_empty(i.get("spec")),
                "location": _str_or_empty(i.get("location")),
            }
            for i in items
        ]

    if key == "training_instructors":
        items = data.get("training_instructors") or []
        return [
            {
                "name": _str_or_empty(i.get("name")),
                "internal_external": _str_or_empty(i.get("internal_external")),
                "career_years": _str_or_empty(i.get("career_years")),
                "work_name": _str_or_empty(i.get("work_name")),
                "detailed_training_content": _bulletize(i.get("detailed_training_content")),
            }
            for i in items
        ]

    if key == "performance_checklist":
        items = data.get("performance_checklist") or []
        return [
            {
                "unit_name": _str_or_empty(i.get("unit_name")),
                "evaluation_criteria": _str_or_empty(i.get("evaluation_criteria")),
                "performance_level": int(i.get("performance_level") or 0),
            }
            for i in items
        ]

    return []
