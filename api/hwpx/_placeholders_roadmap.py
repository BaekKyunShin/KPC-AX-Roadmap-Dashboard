"""
로드맵 HWPX 플레이스홀더 매핑.

입력: Node.js 측 `buildRoadmapHwpxPayload` 결과 (dict)
출력:
- `build_placeholder_map(data)` : {{key}} → 단순 텍스트 dict
- `build_table_rows(data, key)` : 반복 표의 행 dict 배열

Python 함수는 순수하게 데이터 변환만 수행한다. 실제 HWPX OXML 조작은
`generate.py`에서 이 결과를 사용해 수행한다.
"""
from typing import Any

# 조건부 NCS 박스 fallback (양쪽 박스 유지 + 비활성 쪽에 "해당 없음" 명시)
NCS_METHODOLOGY_FALLBACK = "해당 없음 (NCS 미활용 선택)"
NCS_DERIVATION_FALLBACK = "해당 없음 (NCS 활용 선택)"

# HRD이음 보고서 미첨부 fallback
HRD_REPORT_EMPTY_FALLBACK = "별도 작성 불요 (HRD이음 보고서 미첨부)"


# 단순 플레이스홀더 — 입력 key와 플레이스홀더 key가 1:1 대응
_SIMPLE_KEYS = (
    "company_name",
    "report_date",
    "pm_affiliation",
    "pm_name",
    "internal_expert_affiliation",
    "internal_expert_name",
    "establishment_necessity",
    "selected_tasks_text",
    "roadmap_summary",
    "company_status",
    "main_problems",
    "push_willingness",
    "expected_outcomes",
    "analysis_notes_text",
    "training_structure_method",
    "annual_plan_usage",
)

# 훈련대상 과업 (Ⅱ-4) — 첫 항목만 양식에 노출
_TRAINING_TARGET_KEYS = (
    ("task_name", "training_target_name"),
    ("selection_reason", "training_target_selection_reason"),
    ("as_is", "training_target_as_is"),
    ("to_be", "training_target_to_be"),
)


def _str_or_empty(v: Any) -> str:
    if v is None:
        return ""
    return str(v)


def build_placeholder_map(data: dict) -> dict[str, str]:
    """데이터 dict → {{key}} → 텍스트 dict 변환.

    누락 필드는 빈 문자열로 안전 처리.
    AI 역량 수준은 체크박스 토글(`☑`/`☐`)로 변환.
    NCS 박스는 `ncs_used` 플래그에 따라 활성/비활성 쪽에 fallback 문구 삽입.
    HRD이음 보고서가 비어 있으면 fallback 안내 문구 삽입.
    """
    result: dict[str, str] = {}

    for key in _SIMPLE_KEYS:
        result[f"{{{{{key}}}}}"] = _str_or_empty(data.get(key))

    # HRD 보고서 fallback
    hrd = _str_or_empty(data.get("hrd_report_attachment")).strip()
    result["{{hrd_report_attachment}}"] = hrd if hrd else HRD_REPORT_EMPTY_FALLBACK

    # AI 역량 수준 체크박스
    level = (data.get("ai_competency_level") or "").upper()
    result["{{level_beginner_check}}"] = "☑" if level == "BEGINNER" else "☐"
    result["{{level_intermediate_check}}"] = "☑" if level == "INTERMEDIATE" else "☐"
    result["{{level_advanced_check}}"] = "☑" if level == "ADVANCED" else "☐"

    # NCS 조건부 박스
    ncs_used = bool(data.get("ncs_used", False))
    ncs_methodology = _str_or_empty(data.get("ncs_methodology")).strip()
    ncs_derivation = _str_or_empty(data.get("ncs_derivation_method")).strip()
    if ncs_used:
        result["{{ncs_methodology}}"] = (
            ncs_methodology if ncs_methodology else NCS_METHODOLOGY_FALLBACK
        )
        result["{{ncs_derivation_method}}"] = NCS_DERIVATION_FALLBACK
    else:
        result["{{ncs_methodology}}"] = NCS_METHODOLOGY_FALLBACK
        result["{{ncs_derivation_method}}"] = (
            ncs_derivation if ncs_derivation else NCS_DERIVATION_FALLBACK
        )

    # 훈련대상 과업 (Ⅱ-4) — 첫 항목만
    tt = data.get("training_target") or {}
    for src, dst in _TRAINING_TARGET_KEYS:
        result[f"{{{{{dst}}}}}"] = _str_or_empty(tt.get(src))

    return result


def build_table_rows(data: dict, key: str) -> list[dict]:
    """반복 표의 행 데이터 추출.

    반환되는 dict는 generate.py의 OXML 조작이 셀 좌표별로 채워 넣을 값을 담는다.
    모든 값은 문자열로 정규화(표 렌더링에 바로 사용 가능).
    """
    if key == "performance_activities":
        items = data.get("performance_activities") or []
        rows = []
        for item in items:
            rows.append(
                {
                    "round": f"{item.get('round', '')}차" if item.get("round") is not None else "",
                    "date": _str_or_empty(item.get("date")),
                    "content": _str_or_empty(item.get("content")),
                    "method": _str_or_empty(item.get("method")),
                    "participants": item.get("participants") or [],
                }
            )
        return rows

    if key == "task_workflow":
        items = data.get("task_workflow_items") or []
        return [
            {
                "job": _str_or_empty(i.get("job")),
                "task": _str_or_empty(i.get("task")),
                "as_is": _str_or_empty(i.get("as_is")),
                "problem": _str_or_empty(i.get("problem")),
                "data_availability": _str_or_empty(i.get("data_availability")),
                "ai_necessity_score": _str_or_empty(i.get("ai_necessity_score")),
            }
            for i in items
        ]

    if key == "competency":
        items = data.get("competencies") or []
        return [
            {
                "name": _str_or_empty(i.get("name")),
                "definition_performance_criteria": _str_or_empty(
                    i.get("definition_performance_criteria")
                ),
                "knowledge": _str_or_empty(i.get("knowledge")),
                "skill": _str_or_empty(i.get("skill")),
                "attitude": _str_or_empty(i.get("attitude")),
            }
            for i in items
        ]

    if key == "training_structure":
        items = data.get("training_structure_rows") or []
        return [
            {
                "competency_name": _str_or_empty(i.get("competency_name")),
                "training_level": _str_or_empty(i.get("training_level")),
                "training_content": _str_or_empty(i.get("training_content")),
                "training_target": _str_or_empty(i.get("training_target")),
                "training_method": _str_or_empty(i.get("training_method")),
                "training_goal": _str_or_empty(i.get("training_goal")),
            }
            for i in items
        ]

    if key == "annual_plan":
        items = data.get("annual_plan_items") or []
        return [
            {
                "competency_name": _str_or_empty(i.get("competency_name")),
                "course_name": _str_or_empty(i.get("course_name")),
                "training_type": _str_or_empty(i.get("training_type")),
                "training_hours": _str_or_empty(i.get("training_hours")),
                "remarks": _str_or_empty(i.get("remarks")),
            }
            for i in items
        ]

    if key == "course_specs":
        items = data.get("course_specs") or []
        rows = []
        for i in items:
            subjects = i.get("subjects") or []
            rows.append(
                {
                    "course_name": _str_or_empty(i.get("course_name")),
                    "training_type": _str_or_empty(i.get("training_type")),
                    "recommended_program": _str_or_empty(i.get("recommended_program")),
                    "training_goal": _str_or_empty(i.get("training_goal")),
                    "main_content": _str_or_empty(i.get("main_content")),
                    "training_target": _str_or_empty(i.get("training_target")),
                    "subjects": [
                        {
                            "subject_name": _str_or_empty(s.get("subject_name")),
                            "details": _str_or_empty(s.get("details")),
                            "hours": _str_or_empty(s.get("hours")),
                        }
                        for s in subjects
                    ],
                }
            )
        return rows

    raise ValueError(f"Unknown table key: {key!r}")
