"""
HWPX 생성 엔드포인트 (Step 3 PoC + Step 7 로드맵 템플릿).

POST body:
    { "track": "ROADMAP" | "PBL", "data": { ... }, "fileName": "..." }

track 분기:
    - ROADMAP → templates/hwpx/roadmap.hwpx 기반 치환 (Step 7)
    - PBL     → templates/hwpx/pbl.hwpx 기반 치환 (Step 10, 미구현)

하위 호환: { "title": "..." } 만 보내면 Step 3 PoC 최소 HWPX 반환.

보안:
- 내부 공유 시크릿 X-HWPX-Secret 헤더를 Vercel 환경변수 HWPX_API_SECRET과
  비교하여 불일치/누락 시 401 반환. 공개 URL이므로 절대 생략 금지.
"""
from http.server import BaseHTTPRequestHandler
import io
import json
import os
import sys
import tempfile
import urllib.parse

# Vercel Python Functions는 동일 디렉터리 모듈만 직접 import 가능.
_DIR = os.path.dirname(os.path.abspath(__file__))
if _DIR not in sys.path:
    sys.path.insert(0, _DIR)


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        # 1) 시크릿 검증
        expected = os.environ.get("HWPX_API_SECRET")
        provided = self.headers.get("X-HWPX-Secret")
        if not expected or provided != expected:
            self._error(401, "unauthorized")
            return

        # 2) 요청 바디 파싱
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            raw = self.rfile.read(content_length) if content_length else b""
            body = json.loads(raw or b"{}")
        except json.JSONDecodeError:
            self._error(400, "invalid json")
            return

        track = body.get("track")
        file_name = body.get("fileName") or "document.hwpx"

        # 3) 분기
        try:
            # 진단용 모드 — 한글이 파일을 거부하는 단계를 격리하기 위한 테스트.
            # diag=passthrough  → 원본 템플릿 zip을 그대로 반환 (python-hwpx open/save 없음)
            # diag=roundtrip    → 원본 템플릿을 open 후 변경 없이 save만 (python-hwpx save 영향 확인)
            diag = body.get("diag")
            if diag == "passthrough":
                with open(ROADMAP_TEMPLATE, "rb") as rf:
                    hwpx_bytes = rf.read()
                file_name = "diag-passthrough.hwpx"
            elif diag == "roundtrip":
                from hwpx import HwpxDocument
                doc = HwpxDocument.open(ROADMAP_TEMPLATE)
                with tempfile.NamedTemporaryFile(delete=False, suffix=".hwpx") as tmp:
                    path = tmp.name
                try:
                    doc.save_to_path(path)
                    with open(path, "rb") as rf:
                        hwpx_bytes = rf.read()
                finally:
                    if os.path.exists(path):
                        os.unlink(path)
                file_name = "diag-roundtrip.hwpx"
            elif track == "ROADMAP":
                data = body.get("data") or {}
                hwpx_bytes = _generate_roadmap(data)
            elif track == "PBL":
                self._error(501, "PBL track not implemented (Step 10)")
                return
            elif "title" in body and track is None:
                # Step 3 PoC: 최소 HWPX
                hwpx_bytes = _generate_minimal(body.get("title", "테스트 문서"))
                file_name = "test.hwpx"
            else:
                self._error(400, f"unknown track: {track!r}")
                return
        except Exception as e:
            self._error(500, f"generation failed: {e}")
            return

        # 4) 응답
        # Content-Disposition 헤더는 HTTP 1.1 표준상 latin-1 인코딩 제약이 있어
        # 한글 파일명을 그대로 넣으면 UnicodeEncodeError 발생.
        # RFC 5987: `filename*=UTF-8''<percent-encoded>` 형식 + ASCII fallback(filename=)
        # 함께 제공하면 모든 브라우저가 UTF-8 파일명을 올바르게 인식.
        encoded_name = urllib.parse.quote(file_name, safe="")
        ascii_fallback = file_name.encode("ascii", "ignore").decode("ascii") or "document.hwpx"
        self.send_response(200)
        self.send_header("Content-Type", "application/vnd.hancom.hwpx")
        self.send_header(
            "Content-Disposition",
            f"attachment; filename=\"{ascii_fallback}\"; filename*=UTF-8''{encoded_name}",
        )
        self.send_header("Content-Length", str(len(hwpx_bytes)))
        self.end_headers()
        self.wfile.write(hwpx_bytes)

    def _error(self, code: int, msg: str):
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.end_headers()
        self.wfile.write(json.dumps({"error": msg}).encode("utf-8"))


# ===============================================================
# Step 3 PoC — 최소 HWPX 생성 (하위 호환 유지)
# ===============================================================


def _generate_minimal(title: str) -> bytes:
    from hwpx import HwpxDocument

    doc = HwpxDocument.new()
    doc.add_paragraph(title)
    with tempfile.NamedTemporaryFile(delete=False, suffix=".hwpx") as tmp:
        path = tmp.name
    try:
        doc.save_to_path(path)
        with open(path, "rb") as f:
            return f.read()
    finally:
        if os.path.exists(path):
            os.unlink(path)


# ===============================================================
# Step 7 — 로드맵 템플릿 기반 치환
# ===============================================================


ROADMAP_TEMPLATE = os.path.join(
    _DIR, "..", "..", "templates", "hwpx", "roadmap.hwpx"
)
# api/hwpx/ 기준 상위 2단계 = 프로젝트 루트
ROADMAP_TEMPLATE = os.path.normpath(ROADMAP_TEMPLATE)


def _generate_roadmap(data: dict) -> bytes:
    """로드맵 데이터를 산인공 양식 1번 HWPX로 변환."""
    from hwpx import HwpxDocument

    from _placeholders_roadmap import build_placeholder_map, build_table_rows
    from _hwpx_helpers import (
        find_all_tables,
        get_cell_by_addr,
        get_table,
        get_trs,
        get_tcs,
        ensure_row_count,
        replace_placeholders_in_element,
        set_cell_text,
        set_cell_multiline,
    )

    doc = HwpxDocument.open(ROADMAP_TEMPLATE)
    section = doc.sections[0]
    root = section.element

    placeholders = build_placeholder_map(data)

    # --- 1) 단순 플레이스홀더 치환 ---
    replace_placeholders_in_element(root, placeholders)

    # --- 2) AI 역량 수준 체크박스 토글 (Table 7 row0 cells 1-3) ---
    level = (data.get("ai_competency_level") or "").upper()
    level_map = {
        "BEGINNER": ("□ 초급", "☑ 초급"),
        "INTERMEDIATE": ("□ 중급", "☑ 중급"),
        "ADVANCED": ("□ 고급", "☑ 고급"),
    }
    if level in level_map:
        src, dst = level_map[level]
        replace_placeholders_in_element(root, {src: dst})

    # --- 3) 표별 렌더링 ---
    _render_table_1_expert_roster(root, data)          # 표지 (이미 Task 3에서 플레이스홀더 삽입)
    _render_table_3_establishment_necessity(root, data)
    _render_table_5_performance_activities(root, data, build_table_rows)
    _render_table_7_outcome_summary(root, data)
    _render_table_12_hrd_report(root, data)
    _render_table_14_company_requirements(root, data)
    _render_table_16_task_workflow(root, data, build_table_rows)
    _render_table_18_analysis_notes(root, data)
    _render_table_20_training_target(root, data)
    _render_table_23_competencies(root, data, build_table_rows)
    _render_table_24_ncs_methodology(root, data)
    _render_table_25_ncs_derivation(root, data)
    _render_table_27_training_structure(root, data, build_table_rows)
    _render_table_29_training_structure_method(root, data)
    _render_table_31_annual_plan(root, data, build_table_rows)
    _render_table_33_annual_plan_usage(root, data)
    _render_course_spec_tables(root, data, build_table_rows)  # Tables 35, 36, 37
    _render_table_39_performance_journal(root, data, build_table_rows)

    # --- 4) 섹션 변경 반영 + 직렬화 ---
    section.mark_dirty()
    with tempfile.NamedTemporaryFile(delete=False, suffix=".hwpx") as tmp:
        path = tmp.name
    try:
        doc.save_to_path(path)
        with open(path, "rb") as f:
            return f.read()
    finally:
        if os.path.exists(path):
            os.unlink(path)


# ---------------------------------------------------------------
# 표별 렌더 함수
# ---------------------------------------------------------------


def _render_table_1_expert_roster(root, data):
    """표지 PM·내부전문가 3행 3열 표.

    이미 Task 3에서 플레이스홀더 `{{pm_name}}` 등이 삽입되어 있으므로
    단순 치환(replace_placeholders_in_element)만으로 처리된다. no-op.
    """
    return


def _render_table_3_establishment_necessity(root, data):
    """Ⅰ-1 수립 필요성 박스 (1행 1열)."""
    from _hwpx_helpers import get_table, get_cell_by_addr, set_cell_multiline

    tbl = get_table(root, 3)
    text = data.get("establishment_necessity") or ""
    c = get_cell_by_addr(tbl, 0, 0)
    if c is not None:
        set_cell_multiline(c, text.splitlines() or [""])


def _render_table_12_hrd_report(root, data):
    """Ⅱ-1 기업 AI 역량 수준 진단 - HRD이음 보고서 첨부 박스 (1행 1열)."""
    from _hwpx_helpers import get_table, get_cell_by_addr, set_cell_multiline
    from _placeholders_roadmap import HRD_REPORT_EMPTY_FALLBACK

    tbl = get_table(root, 12)
    attachment = (data.get("hrd_report_attachment") or "").strip()
    text = attachment if attachment else HRD_REPORT_EMPTY_FALLBACK
    c = get_cell_by_addr(tbl, 0, 0)
    if c is not None:
        set_cell_multiline(c, text.splitlines() or [""])


def _render_table_5_performance_activities(root, data, build_table_rows):
    """Ⅰ-2 주요 활동 표 (7행 6열).

    구조:
    - row0: 헤더 (6칸)
    - 이후 차수당 2행 (PM 행 + 내부전문가 행)
    - 샘플: 3차수 × 2행 = 6행

    performance_activities[]의 각 차수를 2행 쌍으로 렌더.
    데이터 부족 시 나머지 행은 비움.
    """
    from _hwpx_helpers import get_table, get_trs, get_tcs, set_cell_text

    tbl = get_table(root, 5)
    rows = build_table_rows(data, "performance_activities")
    trs = get_trs(tbl)
    header_rows = 1  # row0
    # 템플릿 기준 샘플 차수 수 = (len(trs) - header_rows) / 2 = 3
    # 데이터 차수가 더 많으면 행 추가, 적으면 나머지 차수 행 셀 비우기

    # 먼저 모든 데이터 차수 셀 비우기
    for tr_idx in range(header_rows, len(trs)):
        tr = trs[tr_idx]
        for tc in get_tcs(tr):
            set_cell_text(tc, "")

    # 데이터 채우기
    for i, act in enumerate(rows):
        main_row_idx = header_rows + i * 2
        sub_row_idx = main_row_idx + 1
        if main_row_idx >= len(trs) or sub_row_idx >= len(trs):
            break
        main_tr = trs[main_row_idx]
        sub_tr = trs[sub_row_idx]
        main_tcs = get_tcs(main_tr)
        sub_tcs = get_tcs(sub_tr)
        # main_tcs: [수행차수, 수행일시, 수행내용, 수행방법, 참석자(PM구분), 참석자(PM성명)]
        if len(main_tcs) >= 6:
            set_cell_text(main_tcs[0], act.get("round", ""))
            set_cell_text(main_tcs[1], act.get("date", ""))
            set_cell_text(main_tcs[2], act.get("content", ""))
            set_cell_text(main_tcs[3], act.get("method", ""))
            participants = act.get("participants", [])
            pm = next(
                (p for p in participants if "PM" in (p.get("role") or "")
                 or "책임자" in (p.get("role") or "")),
                None,
            )
            internal = next(
                (p for p in participants if "내부" in (p.get("role") or "")),
                None,
            )
            set_cell_text(main_tcs[4], pm.get("role") if pm else "컨설팅책임자(PM)")
            set_cell_text(main_tcs[5], (pm.get("name") if pm else "") or "")
        # sub_tcs: [참석자(내부전문가 구분), 참석자(내부전문가 성명)] — 2칸만
        if len(sub_tcs) >= 2:
            set_cell_text(
                sub_tcs[0],
                (internal.get("role") if internal else "기업 내부전문가"),
            )
            set_cell_text(
                sub_tcs[1],
                (internal.get("name") if internal else "") or "",
            )


def _render_table_7_outcome_summary(root, data):
    """Ⅰ-3 AI훈련로드맵 수립 주요 결과 (3행 4열).

    - row0: 체크박스 (이미 level_map으로 처리됨)
    - row1: col1(colSpan=3) = 선정 과업
    - row2: col1(colSpan=3) = 요약 본문
    """
    from _hwpx_helpers import get_table, get_cell_by_addr, set_cell_multiline

    tbl = get_table(root, 7)
    selected_tasks = data.get("selected_tasks_text") or ""
    summary = data.get("roadmap_summary") or ""

    # row1 col1 (colAddr=1)
    c_tasks = get_cell_by_addr(tbl, row_addr=1, col_addr=1)
    if c_tasks is not None:
        set_cell_multiline(c_tasks, selected_tasks.splitlines() or [""])
    # row2 col1
    c_summary = get_cell_by_addr(tbl, row_addr=2, col_addr=1)
    if c_summary is not None:
        set_cell_multiline(c_summary, summary.splitlines() or [""])


def _render_table_14_company_requirements(root, data):
    """Ⅱ-2 기업 요구분석 (5행 3열).

    - row0: 헤더
    - row1~4: 기업현황/주요문제/추진의지/기대성과
    """
    from _hwpx_helpers import get_table, get_cell_by_addr, set_cell_multiline

    tbl = get_table(root, 14)
    mapping = [
        (1, data.get("company_status") or ""),
        (2, data.get("main_problems") or ""),
        (3, data.get("push_willingness") or ""),
        (4, data.get("expected_outcomes") or ""),
    ]
    for row_addr, text in mapping:
        c = get_cell_by_addr(tbl, row_addr=row_addr, col_addr=1)
        if c is not None:
            set_cell_multiline(c, text.splitlines() or [""])


def _render_table_16_task_workflow(root, data, build_table_rows):
    """Ⅱ-3 과업·워크플로우 분석표 (6행 6열).

    - row0: 헤더
    - row1~3: 샘플 (ex) 생산/품질/설비)
    - row4~5: 빈 행

    예시 행(ex)/품질/설비)을 모두 비우고 items로 채운다.
    부족 시 행 추가, 초과 시 무시(또는 행 복제).
    """
    from _hwpx_helpers import (
        get_table, get_trs, get_tcs,
        ensure_row_count, set_cell_text,
    )

    tbl = get_table(root, 16)
    items = build_table_rows(data, "task_workflow")

    # 먼저 기존 행 (row1~5) 모두 비움 (예시 텍스트 제거)
    trs = get_trs(tbl)
    for tr_idx in range(1, len(trs)):
        for tc in get_tcs(trs[tr_idx]):
            set_cell_text(tc, "")

    # items 수 확보 (최소 5, 더 필요하면 복제)
    ensure_row_count(tbl, header_rows=1, required_data_rows=max(len(items), 5))
    trs = get_trs(tbl)

    fields = ["job", "task", "as_is", "problem", "data_availability", "ai_necessity_score"]
    for i, item in enumerate(items):
        tr = trs[1 + i]
        tcs = get_tcs(tr)
        for j, f in enumerate(fields):
            if j < len(tcs):
                set_cell_text(tcs[j], item.get(f, ""))


def _render_table_18_analysis_notes(root, data):
    """Ⅱ-3 분석내용 박스 (1행 2열)."""
    from _hwpx_helpers import get_table, get_cell_by_addr, set_cell_multiline

    tbl = get_table(root, 18)
    text = data.get("analysis_notes_text") or ""
    c = get_cell_by_addr(tbl, row_addr=0, col_addr=1)
    if c is not None:
        set_cell_multiline(c, text.splitlines() or [""])


def _render_table_20_training_target(root, data):
    """Ⅱ-4 훈련대상 과업 선정 (4행 3열)."""
    from _hwpx_helpers import get_table, get_cell_by_addr, set_cell_multiline

    tbl = get_table(root, 20)
    tt = data.get("training_target") or {}

    # row0 col2 = 훈련대상 과업
    c = get_cell_by_addr(tbl, 0, 2)
    if c is not None:
        set_cell_multiline(c, (tt.get("task_name") or "").splitlines() or [""])
    # row1 col2 = 선정사유
    c = get_cell_by_addr(tbl, 1, 2)
    if c is not None:
        set_cell_multiline(c, (tt.get("selection_reason") or "").splitlines() or [""])
    # row2 col2 = As-Is
    c = get_cell_by_addr(tbl, 2, 2)
    if c is not None:
        set_cell_multiline(c, (tt.get("as_is") or "").splitlines() or [""])
    # row3 col2 = To-Be
    c = get_cell_by_addr(tbl, 3, 2)
    if c is not None:
        set_cell_multiline(c, (tt.get("to_be") or "").splitlines() or [""])


def _render_table_23_competencies(root, data, build_table_rows):
    """Ⅲ-1 역량 모델링 표 (6행 5열).

    - row0-1: 헤더 (병합 구조)
    - row2-5: 데이터 4행
    """
    from _hwpx_helpers import (
        get_table, get_trs, get_tcs,
        ensure_row_count, set_cell_text,
    )

    tbl = get_table(root, 23)
    items = build_table_rows(data, "competency")
    header_rows = 2

    # 데이터 행 모두 비움
    trs = get_trs(tbl)
    for tr_idx in range(header_rows, len(trs)):
        for tc in get_tcs(trs[tr_idx]):
            set_cell_text(tc, "")

    ensure_row_count(tbl, header_rows=header_rows, required_data_rows=max(len(items), 4))
    trs = get_trs(tbl)

    fields = ["name", "definition_performance_criteria", "knowledge", "skill", "attitude"]
    for i, item in enumerate(items):
        tr = trs[header_rows + i]
        tcs = get_tcs(tr)
        for j, f in enumerate(fields):
            if j < len(tcs):
                set_cell_text(tcs[j], item.get(f, ""))


def _render_table_24_ncs_methodology(root, data):
    """Ⅲ-1 NCS 활용 방법 박스 (1행 2열).

    `{{ncs_methodology}}` 플레이스홀더로 이미 치환되었어야 하지만,
    템플릿에는 셀이 비어 있으므로 직접 기입.
    """
    from _hwpx_helpers import get_table, get_cell_by_addr, set_cell_multiline
    from _placeholders_roadmap import NCS_METHODOLOGY_FALLBACK

    tbl = get_table(root, 24)
    ncs_used = bool(data.get("ncs_used", False))
    ncs_methodology = (data.get("ncs_methodology") or "").strip()
    if ncs_used:
        text = ncs_methodology or NCS_METHODOLOGY_FALLBACK
    else:
        text = NCS_METHODOLOGY_FALLBACK

    c = get_cell_by_addr(tbl, 0, 1)
    if c is not None:
        set_cell_multiline(c, text.splitlines() or [""])


def _render_table_25_ncs_derivation(root, data):
    """Ⅲ-1 역량별 도출 방법 박스 (1행 2열)."""
    from _hwpx_helpers import get_table, get_cell_by_addr, set_cell_multiline
    from _placeholders_roadmap import NCS_DERIVATION_FALLBACK

    tbl = get_table(root, 25)
    ncs_used = bool(data.get("ncs_used", False))
    ncs_derivation = (data.get("ncs_derivation_method") or "").strip()
    if ncs_used:
        text = NCS_DERIVATION_FALLBACK
    else:
        text = ncs_derivation or NCS_DERIVATION_FALLBACK

    c = get_cell_by_addr(tbl, 0, 1)
    if c is not None:
        set_cell_multiline(c, text.splitlines() or [""])


def _render_table_27_training_structure(root, data, build_table_rows):
    """Ⅲ-2 훈련체계도 표 (5행 6열).

    - row0: 헤더
    - row1: 샘플 ("초급 / 중급 / 고급" 예시 포함)
    - row2-4: 빈 행
    """
    from _hwpx_helpers import (
        get_table, get_trs, get_tcs,
        ensure_row_count, set_cell_text,
    )

    tbl = get_table(root, 27)
    items = build_table_rows(data, "training_structure")
    header_rows = 1

    # 데이터 행 비움 (샘플 제거)
    trs = get_trs(tbl)
    for tr_idx in range(header_rows, len(trs)):
        for tc in get_tcs(trs[tr_idx]):
            set_cell_text(tc, "")

    ensure_row_count(tbl, header_rows=header_rows, required_data_rows=max(len(items), 4))
    trs = get_trs(tbl)

    fields = [
        "competency_name", "training_level", "training_content",
        "training_target", "training_method", "training_goal",
    ]
    for i, item in enumerate(items):
        tr = trs[header_rows + i]
        tcs = get_tcs(tr)
        for j, f in enumerate(fields):
            if j < len(tcs):
                set_cell_text(tcs[j], item.get(f, ""))


def _render_table_29_training_structure_method(root, data):
    """Ⅲ-2 훈련체계 수립 방법 박스 (1행 2열)."""
    from _hwpx_helpers import get_table, get_cell_by_addr, set_cell_multiline

    tbl = get_table(root, 29)
    text = data.get("training_structure_method") or ""
    c = get_cell_by_addr(tbl, 0, 1)
    if c is not None:
        set_cell_multiline(c, text.splitlines() or [""])


def _render_table_31_annual_plan(root, data, build_table_rows):
    """Ⅲ-3 연간 훈련계획 (4행 5열)."""
    from _hwpx_helpers import (
        get_table, get_trs, get_tcs,
        ensure_row_count, set_cell_text,
    )

    tbl = get_table(root, 31)
    items = build_table_rows(data, "annual_plan")
    header_rows = 1

    trs = get_trs(tbl)
    for tr_idx in range(header_rows, len(trs)):
        for tc in get_tcs(trs[tr_idx]):
            set_cell_text(tc, "")

    ensure_row_count(tbl, header_rows=header_rows, required_data_rows=max(len(items), 3))
    trs = get_trs(tbl)

    fields = [
        "competency_name", "course_name",
        "training_type", "training_hours", "remarks",
    ]
    for i, item in enumerate(items):
        tr = trs[header_rows + i]
        tcs = get_tcs(tr)
        for j, f in enumerate(fields):
            if j < len(tcs):
                set_cell_text(tcs[j], item.get(f, ""))


def _render_table_33_annual_plan_usage(root, data):
    """Ⅲ-3 활용방안 박스 (1행 2열)."""
    from _hwpx_helpers import get_table, get_cell_by_addr, set_cell_multiline

    tbl = get_table(root, 33)
    text = data.get("annual_plan_usage") or ""
    c = get_cell_by_addr(tbl, 0, 1)
    if c is not None:
        set_cell_multiline(c, text.splitlines() or [""])


def _render_course_spec_tables(root, data, build_table_rows):
    """Ⅲ-4 훈련과정 명세서 3개 블록 (Tables 35, 36, 37).

    각 블록 11행 4열:
    - row0: 과정명 (col0=라벨, col1 colSpan=3)
    - row1: 훈련 형태
    - row2: 추천 훈련사업
    - row3: 훈련 목표
    - row4: 주요 훈련 내용
    - row5: 훈련 대상
    - row6: 교과목 헤더 (col0 rowSpan=5, col1=교과목명, col2=세부내용, col3=훈련시간)
    - row7~10: 교과목 데이터 4행
    """
    from _hwpx_helpers import (
        get_table, get_trs, get_tcs,
        set_cell_text, set_cell_multiline,
    )

    specs = build_table_rows(data, "course_specs")
    table_indices = [35, 36, 37]

    for i, tbl_idx in enumerate(table_indices):
        tbl = get_table(root, tbl_idx)
        trs = get_trs(tbl)

        if i < len(specs):
            spec = specs[i]
            # 각 info 행의 col1 (colSpan=3) 채움
            info_fields = [
                (0, spec.get("course_name", "")),
                (1, spec.get("training_type", "")),
                (2, spec.get("recommended_program", "")),
                (3, spec.get("training_goal", "")),
                (4, spec.get("main_content", "")),
                (5, spec.get("training_target", "")),
            ]
            for row_idx, text in info_fields:
                if row_idx < len(trs):
                    tcs = get_tcs(trs[row_idx])
                    if len(tcs) >= 2:
                        set_cell_multiline(
                            tcs[1],
                            text.splitlines() if text else [""],
                        )
            # 교과목 데이터 4행 (row7~10)
            subjects = spec.get("subjects", [])
            for j in range(4):
                row_idx = 7 + j
                if row_idx >= len(trs):
                    break
                tr = trs[row_idx]
                tcs = get_tcs(tr)
                if j < len(subjects) and len(tcs) >= 3:
                    subj = subjects[j]
                    # row7 이후부터는 rowSpan 없이 col1,2,3 존재
                    set_cell_text(tcs[0], subj.get("subject_name", ""))
                    set_cell_text(tcs[1], subj.get("details", ""))
                    set_cell_text(tcs[2], subj.get("hours", ""))
                else:
                    # 데이터 없으면 공란
                    for tc in tcs:
                        set_cell_text(tc, "")
        else:
            # 과정 데이터 부족 — 블록 전체 "(작성 없음)" 표시
            for row_idx in range(6):
                if row_idx < len(trs):
                    tcs = get_tcs(trs[row_idx])
                    if len(tcs) >= 2:
                        set_cell_text(tcs[1], "(작성 없음)" if row_idx == 0 else "")
            # 교과목 행 공란
            for j in range(4):
                row_idx = 7 + j
                if row_idx < len(trs):
                    for tc in get_tcs(trs[row_idx]):
                        set_cell_text(tc, "")


def _render_table_39_performance_journal(root, data, build_table_rows):
    """[별첨] 수행일지 (13행 5열).

    Step 7 기본: 첫 차수(performance_activities[0]) 데이터로 채움.
    (차수별 반복은 Step 12에서 검토.)
    """
    from _hwpx_helpers import get_table, get_cell_by_addr, set_cell_text, set_cell_multiline

    tbl = get_table(root, 39)
    company_name = data.get("company_name") or ""
    employment_no = data.get("employment_insurance_no") or ""

    # row0: 기업명 col1, 고용보험관리번호 col3
    c = get_cell_by_addr(tbl, 0, 1)
    if c is not None:
        set_cell_text(c, company_name)
    c = get_cell_by_addr(tbl, 0, 3)
    if c is not None:
        set_cell_text(c, employment_no)

    activities = build_table_rows(data, "performance_activities")
    first = activities[0] if activities else {}

    # row1: 수행일시 col1, 수행차수 col3
    c = get_cell_by_addr(tbl, 1, 1)
    if c is not None:
        set_cell_text(c, first.get("date", ""))
    c = get_cell_by_addr(tbl, 1, 3)
    if c is not None:
        set_cell_text(c, first.get("round", "1차"))
    # row2: 수행방법 col1, 운영방식 col3
    c = get_cell_by_addr(tbl, 2, 1)
    if c is not None:
        set_cell_text(c, first.get("method", ""))
    c = get_cell_by_addr(tbl, 2, 3)
    if c is not None:
        operation_mode = "대면" if "대면" in (first.get("method") or "") else "비대면"
        set_cell_text(c, operation_mode if first else "대면")

    # 참석자: row4/5/6 col2(HRD4U ID) col4(성명)
    participants = first.get("participants") or []
    pm = next(
        (p for p in participants if "PM" in (p.get("role") or "")
         or "책임자" in (p.get("role") or "")),
        None,
    )
    internal = next(
        (p for p in participants if "내부" in (p.get("role") or "")),
        None,
    )
    others = [
        p for p in participants
        if p is not pm and p is not internal
    ]

    def _set_participant(row_addr, person):
        if not person:
            return
        c_id = get_cell_by_addr(tbl, row_addr, 2)
        c_name = get_cell_by_addr(tbl, row_addr, 4)
        if c_id is not None:
            set_cell_text(c_id, person.get("hrd4u_id") or person.get("id") or "")
        if c_name is not None:
            set_cell_text(c_name, person.get("name") or "")

    _set_participant(4, pm)
    _set_participant(5, internal)
    _set_participant(6, others[0] if others else None)

    # row7~10: 수행내용 col1 (colSpan=4)
    content = first.get("content") or ""
    lines = content.splitlines() or [""]
    c = get_cell_by_addr(tbl, 7, 1)
    if c is not None:
        set_cell_multiline(c, lines[:4])  # 최대 4줄
    # row8~10은 필요 시 추가 줄 (현 구현: row7에 전체 다 담음)

    # row11: 별첨자료 col1 (colSpan=4)
    attachments = data.get("journal_attachments") or ""
    c = get_cell_by_addr(tbl, 11, 1)
    if c is not None:
        set_cell_text(c, attachments or "없음")
