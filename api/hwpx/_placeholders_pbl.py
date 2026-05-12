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

# V2 PBLAILevel ENUM (BASIC/EXPLORER/USER/LEADER) → 한글 라벨 매핑.
# `interview-pbl.ts` 의 `PBL_AI_LEVEL_LABEL` 과 1:1 정합.
AI_LEVEL_ENUM_TO_LABEL: dict[str, str] = {
    "BASIC": "AI기초형",
    "EXPLORER": "AI탐구형",
    "USER": "AI활용형",
    "LEADER": "AI선도형",
}

# 4 등급 영문 키 → SSOT v2 placeholder 영문 키 매핑 (체크박스 4 셀)
AI_LEVEL_ENUM_TO_CHECK_KEY: dict[str, str] = {
    "BASIC": "basic",
    "EXPLORER": "explorer",
    "USER": "user",
    "LEADER": "leader",
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
    # V2 신규
    "company_issues",  # Ⅱ-1-가 자유서술
    "course_necessity",  # Ⅱ-3-나 자유서술 (V1 course_development_necessity 와 동일 의미)
    "hrd_report_attachment",  # Ⅱ-3-가 PDF 첨부 안내 (URL/파일명 또는 fallback)
    "training_target_label",  # Ⅰ trainingTarget (직무·인원 자유서술)
    "training_form",  # Ⅰ trainingForm
    "training_period",  # Ⅰ trainingPeriod (자유서술 — Ⅳ-3-가 와 다른 위치)
    # Ⅲ. AI기반 훈련과제 도출
    "problem_background",
    "problem_core",
    "problem_scope",
    "problem_constraints",
    "target_tasks_selection_reason",
    "current_ai_level_label",  # AI탐구형(초급) 형식 — 향상도 표 현행/향후
    "expected_ai_level_label",
    "ai_improvement_reason",
    "target_necessity",  # V2 P-12: 훈련대상 업무 AI기반 문제해결 필요성
    "expected_ai_level_note",  # V2 P-15: 향상도 사유
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


# SSOT v2 (`docs/references/hwpx-placeholders.json`) 의 PBL 단일 placeholder ↔
# V1 짧은 키 1:1 매핑. build_pbl_placeholder_map 끝부분에서 V2 긴 키 alias 출력.
# repeat_rows (P-04/P-08/P-09/P-10/P-13/P-17/P-19/P-21/P-22) 는 build_pbl_table_rows
# 영역이므로 본 alias 에는 포함되지 않는다.
_V1_TO_V2_ALIAS: tuple[tuple[str, str], ...] = (
    # P-01 표지 — V1 키와 동일한 값을 SSOT v2 긴 키로 alias.
    # subtitle/external_expert_*/doctor_*/confirmation_stamp 는 D-5 가 별도 출력.
    ("company_name", "pbl_cover_company_name"),
    ("course_name", "pbl_cover_course_name"),
    ("report_date", "pbl_cover_report_date"),
    # P-02 Ⅰ. 훈련과정 개요 (cell_fill 18 키)
    ("company_name", "pbl_overview_company_name"),
    ("business_registration_no", "pbl_overview_business_no"),
    ("industry_main", "pbl_overview_industry"),
    ("industry_code", "pbl_overview_industry_code"),
    ("address", "pbl_overview_address"),
    ("training_address", "pbl_overview_training_address"),
    ("jurisdiction_office", "pbl_overview_branch"),
    ("contact_position", "pbl_overview_contact_position"),
    ("contact_name", "pbl_overview_contact_name"),
    ("contact_phone", "pbl_overview_contact_phone"),
    ("contact_email", "pbl_overview_contact_email"),
    ("course_name", "pbl_overview_course_name"),
    ("ncs_code", "pbl_overview_ncs_code"),
    ("training_hours", "pbl_overview_training_hours"),
    ("training_target_label", "pbl_overview_training_target"),
    ("training_form", "pbl_overview_training_form"),
    ("training_period", "pbl_overview_training_period"),
    ("business_issues", "pbl_overview_business_issues"),
    # P-03/P-07 Ⅱ-1-가/Ⅱ-3-나 (single)
    ("company_issues", "pbl_analysis_company_issues"),
    ("course_necessity", "pbl_analysis_course_necessity"),
    # P-06 Ⅱ-3-가 HRD이음 PDF (pdf_attach)
    ("hrd_report_attachment", "pbl_analysis_hrd_report_attachment"),
    # P-12 Ⅲ-3-나 AI기반 문제해결 필요성 (single)
    ("target_necessity", "pbl_tasks_target_necessity"),
    # P-16 Ⅳ-1 훈련 목표 (single)
    ("training_goal", "pbl_ops_training_goal"),
    # P-18 Ⅳ-3-가 훈련과정 개요 (cell_fill)
    ("training_plan_course_name", "pbl_ops_course_name"),
    ("training_period", "pbl_ops_training_period"),
    # P-20 Ⅳ-3-다 훈련 교과목 프로파일 상단 (cell_fill)
    ("subject_profile_course_name", "pbl_ops_subject_course_name"),
    ("total_training_hours", "pbl_ops_subject_total_hours"),
    ("subject_training_goals", "pbl_ops_subject_training_goals"),
    ("subject_ai_tools", "pbl_ops_subject_ai_tools"),
    ("subject_utilized_data", "pbl_ops_subject_utilized_data"),
    ("subject_analysis_method", "pbl_ops_subject_analysis_method"),
    ("subject_total_sum_hours", "pbl_ops_subject_total_sum_hours"),
    # P-23 Ⅳ-4-가 과정평가 계획 상단 (cell_fill)
    ("course_eval_course_name", "pbl_ops_eval_course_name"),
    ("course_eval_target", "pbl_ops_eval_target"),
    ("course_eval_date", "pbl_ops_eval_date"),
    ("course_eval_criteria", "pbl_ops_eval_criteria"),
    ("course_eval_result", "pbl_ops_eval_result"),
    ("course_eval_overall_comment", "pbl_ops_eval_overall_comment"),
    # P-28 [결과보고서] 표지 메타
    ("company_name", "pbl_result_cover_company_name"),
)


def build_pbl_placeholder_map(data: dict) -> dict[str, str]:
    """data dict → `{{key}}` → 텍스트 dict.

    누락 필드는 빈 문자열로 안전 처리.
    SSOT v2 의 `{{pbl_*}}` 긴 키도 함께 출력 (V1 짧은 키와 1:1 alias).
    HRD이음 보고서 attachment 가 URL 형이면 안내문구로 치환 (raw URL 회피).
    """
    from _placeholders_roadmap import _hrd_attachment_text

    result: dict[str, str] = {}
    for key in _SIMPLE_KEYS:
        result[f"{{{{{key}}}}}"] = _str_or_empty(data.get(key))

    # HRD이음 보고서 — _SIMPLE_KEYS 의 raw 출력을 URL/empty fallback 으로 덮어쓰기.
    # _V1_TO_V2_ALIAS 는 result.get("{{hrd_report_attachment}}") 를 참조하므로
    # alias 출력 시점 이전에 fallback 이 적용되도록 본 위치에서 처리한다.
    result["{{hrd_report_attachment}}"] = _hrd_attachment_text(
        data.get("hrd_report_attachment")
    )

    # V2 P-14 현재 AI역량 수준 4등급 체크박스 (BASIC/EXPLORER/USER/LEADER)
    current_level_enum = (data.get("current_ai_level") or "").upper()
    for enum_val, check_key in AI_LEVEL_ENUM_TO_CHECK_KEY.items():
        result[f"{{{{pbl_tasks_current_ai_level_{check_key}_check}}}}"] = (
            "☑" if current_level_enum == enum_val else "☐"
        )

    # V2 P-15 향후 AI역량 수준 향상도 (현행/향후/사유) — cell_fill, 4 등급 체크박스 아님
    expected_level_enum = (data.get("expected_ai_level") or "").upper()

    def _label_with_grade(enum_val: str) -> str:
        label = AI_LEVEL_ENUM_TO_LABEL.get(enum_val, "")
        if not label:
            return ""
        grade = AI_LEVEL_GRADE.get(label, "")
        return f"{label}({grade})" if grade else label

    result["{{pbl_tasks_expected_ai_level_current_label}}"] = _label_with_grade(
        current_level_enum
    )
    result["{{pbl_tasks_expected_ai_level_expected_label}}"] = _label_with_grade(
        expected_level_enum
    )
    result["{{pbl_tasks_expected_ai_level_note}}"] = _str_or_empty(
        data.get("expected_ai_level_note")
    )

    # SSOT v2 긴 키 alias 출력 (V1 짧은 키와 같은 값 복제)
    for v1_key, v2_key in _V1_TO_V2_ALIAS:
        result[f"{{{{{v2_key}}}}}"] = result.get(f"{{{{{v1_key}}}}}", "")

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
        # 두 가지 입력 형태 지원:
        #  (a) V1/D-5 flatten — [{department_name, tasks[]}]: 그대로 사용
        #  (b) V2 raw — {orgTree[], mainWork[]}: orgTree 의 부서명을 단순화하고
        #      mainWork[] 의 dept/role 별로 description 행을 풀어쓴다.
        org = data.get("organization")
        if isinstance(org, list):
            return [
                {
                    "department_name": _str_or_empty(i.get("department_name")),
                    "tasks": "\n".join(
                        _str_or_empty(t)
                        for t in (i.get("tasks") or [])
                        if _str_or_empty(t)
                    ),
                }
                for i in org
            ]
        if isinstance(org, dict):
            # V2 raw — flatten 처리
            grouped: dict[str, list[str]] = {}
            order: list[str] = []
            for item in org.get("mainWork") or []:
                if not isinstance(item, dict):
                    continue
                dept = _str_or_empty(item.get("dept"))
                role = _str_or_empty(item.get("role"))
                desc = _str_or_empty(item.get("description"))
                key_dept = dept or "(미지정)"
                if key_dept not in grouped:
                    grouped[key_dept] = []
                    order.append(key_dept)
                line = " · ".join([s for s in (role, desc) if s])
                if line:
                    grouped[key_dept].append(line)
            return [
                {
                    "department_name": dept,
                    "tasks": "\n".join(grouped[dept]),
                }
                for dept in order
            ]
        return []

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

    # ----------------------- V2 신규 데이터 구조 -----------------------

    if key == "problems":
        # V2 P-09: problems[] {title, description, impact} (max 4).
        # 양식 표는 5x2 (구분/내용) 2열 고정이라 impact 별도 셀이 없음.
        # → description 셀에 impact 를 결합 출력해 정보 손실을 막는다 (#20 PBL).
        items = data.get("problems") or []
        rows: list[dict] = []
        for i in items:
            description = _str_or_empty(i.get("description"))
            impact = _str_or_empty(i.get("impact"))
            if impact:
                description = (
                    f"{description}\n[영향] {impact}".strip()
                    if description
                    else f"[영향] {impact}"
                )
            rows.append(
                {
                    "title": _str_or_empty(i.get("title")),
                    "description": description,
                    # impact 도 행 dict 에 보존 — 향후 별도 placeholder 매핑 시 사용
                    "impact": _str_or_empty(i.get("impact")),
                }
            )
        return rows

    if key == "priorities":
        # V2 P-10: priority.items[] {problem, score(1-5), rank}.
        # rank == 1 → selected (☑), 그 외는 미선정 (☐).
        items = data.get("priorities") or []
        rows: list[dict] = []
        for i in items:
            try:
                score = int(i.get("score") or 0)
            except (TypeError, ValueError):
                score = 0
            try:
                rank = int(i.get("rank") or 0)
            except (TypeError, ValueError):
                rank = 0
            rows.append(
                {
                    "problem": _str_or_empty(i.get("problem")),
                    "score": score,
                    "rank": rank,
                    "selected": rank == 1,
                }
            )
        return rows

    if key == "target_single":
        # V2 P-11: 단일 target {name, code?, scope, necessity, necessity_score?, details[]}
        # → row 1 한 항목. necessity_score (1~5) 는 양식 col 1~5 점수 체크칸.
        target = data.get("target") or {}
        if not target:
            return []
        try:
            score = int(target.get("necessity_score") or 0)
        except (TypeError, ValueError):
            score = 0
        return [
            {
                "name": _str_or_empty(target.get("name")),
                "code": _str_or_empty(target.get("code")),
                "scope": _str_or_empty(target.get("scope")),
                "necessity": _str_or_empty(target.get("necessity")),
                "necessity_score": score,
            }
        ]

    if key == "target_details_v2":
        # V2 PR #7: details[] 5 필드 (title/as_is/to_be/required_knowledge/required_skill).
        # 양식 PDF Ⅲ-3-다 표 4×5 의 col 0~4 1:1 정합.
        # V1 호환: description 만 있는 기존 row 는 as_is 로 자동 이전.
        target = data.get("target") or {}
        items = target.get("details") if isinstance(target, dict) else None
        if items is None:
            items = data.get("target_details") or []
        rows = []
        for i in items:
            if not isinstance(i, dict):
                continue
            # V1 → V2 마이그레이션: description 값을 as_is 로 이전 (as_is 미정의 시).
            as_is = i.get("as_is")
            if as_is is None and i.get("description") is not None:
                as_is = i.get("description")
            rows.append(
                {
                    "title": _str_or_empty(i.get("title")),
                    "as_is": _str_or_empty(as_is),
                    "to_be": _str_or_empty(i.get("to_be")),
                    "required_knowledge": _str_or_empty(i.get("required_knowledge")),
                    "required_skill": _str_or_empty(i.get("required_skill")),
                }
            )
        return rows

    if key == "activities":
        # 양식 P-08 Ⅲ-1 수행활동 — 양식 13×6 = 차수당 4 역할 (PM/외부/내부/주치의).
        # 두 입력 schema 지원:
        #   (A) V2 평면 배열 (PR #84 Phase E, `PBLActivityRowSchema`):
        #       `{round, role, personName, date, content, method}` 항목들이
        #       4 role × N round 으로 평면 분배. `role` enum 키 감지로 분기.
        #   (B) Legacy dict participants 통합 형식 (fixture·이전 V1):
        #       `{round, date, content, method, participants: {pm, ...}}`.
        # 결과 row 는 항상 (B) 형식으로 정규화 — `_fill_pbl_performance_activities`
        # 는 round 당 1 row + dict participants 4 person 을 기대.
        items = data.get("activities") or []

        # V2 평면 감지: 첫 항목에 `role` 키 존재
        is_v2_flat = bool(items) and isinstance(items[0], dict) and "role" in items[0]

        if is_v2_flat:
            # round 별 그룹핑 + role → participants 매핑
            role_to_key = {
                "PM": "pm",
                "EXTERNAL_EXPERT": "external_expert",
                "INTERNAL_EXPERT": "internal_expert",
                "JURISDICTION_MANAGER": "jurisdiction_manager",
            }
            by_round: dict[int, dict] = {}
            for item in items:
                round_num = item.get("round")
                if round_num is None:
                    continue
                if round_num not in by_round:
                    by_round[round_num] = {
                        "round": round_num,
                        "date": _str_or_empty(item.get("date")),
                        "content": _str_or_empty(item.get("content")),
                        "method": _str_or_empty(item.get("method")),
                        "participants": {
                            "pm": "",
                            "external_expert": "",
                            "internal_expert": "",
                            "jurisdiction_manager": "",
                        },
                    }
                else:
                    # 같은 round 의 빈 메타 (date/content/method) 를 다른 항목이
                    # 보유한 경우 채움 — round 단위 단일 값 보장.
                    grp = by_round[round_num]
                    for meta_key in ("date", "content", "method"):
                        if not grp[meta_key]:
                            grp[meta_key] = _str_or_empty(item.get(meta_key))
                role_key = role_to_key.get(item.get("role", ""))
                person = _str_or_empty(item.get("personName") or item.get("person_name"))
                if role_key and person:
                    by_round[round_num]["participants"][role_key] = person
            # round 번호 순으로 정렬 + 라벨화
            normalized = []
            for round_num in sorted(by_round.keys()):
                entry = by_round[round_num]
                entry["round"] = f"{round_num}차"
                normalized.append(entry)
            return normalized

        # Legacy dict participants 형식
        rows = []
        for i in items:
            raw_round = i.get("round")
            round_label = f"{raw_round}차" if raw_round is not None else ""
            participants = i.get("participants") or {}
            if isinstance(participants, str):
                participants = {
                    "pm": participants,
                    "external_expert": "",
                    "internal_expert": "",
                    "jurisdiction_manager": "",
                }
            elif not isinstance(participants, dict):
                participants = {}
            rows.append(
                {
                    "round": round_label,
                    "date": _str_or_empty(i.get("date")),
                    "content": _str_or_empty(i.get("content")),
                    "method": _str_or_empty(i.get("method")),
                    "participants": {
                        "pm": _str_or_empty(participants.get("pm")),
                        "external_expert": _str_or_empty(
                            participants.get("external_expert")
                        ),
                        "internal_expert": _str_or_empty(
                            participants.get("internal_expert")
                        ),
                        "jurisdiction_manager": _str_or_empty(
                            participants.get("jurisdiction_manager")
                        ),
                    },
                }
            )
        return rows

    return []
