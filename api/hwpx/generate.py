"""
HWPX 생성 엔드포인트 (Step 3 PoC + Step 7 로드맵 템플릿).

POST body:
    { "track": "ROADMAP" | "PBL", "data": { ... }, "fileName": "..." }

track 분기:
    - ROADMAP → templates/hwpx/roadmap.hwpx 기반 치환 (Step 7)
    - PBL     → templates/hwpx/pbl.hwpx 기반 치환 (Step 10, 미구현)

하위 호환: { "title": "..." } 만 보내면 Step 3 PoC 최소 HWPX 반환.

핵심 원칙 (hwpx-docgen 스킬):
- 모든 HWPX 조작은 python-hwpx API를 통해서만 수행한다.
- XML/lxml을 직접 편집하지 않는다 (과거 이 원칙을 어긴 코드가
  한컴오피스에서 "알 수 없는 오류"로 거부된 문제 발생).

보안:
- 내부 공유 시크릿 X-HWPX-Secret 헤더를 Vercel 환경변수 HWPX_API_SECRET과
  비교하여 불일치/누락 시 401 반환. 공개 URL이므로 절대 생략 금지.
"""
from http.server import BaseHTTPRequestHandler
import json
import os
import sys
import tempfile
import urllib.parse

_DIR = os.path.dirname(os.path.abspath(__file__))
if _DIR not in sys.path:
    sys.path.insert(0, _DIR)


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        expected = os.environ.get("HWPX_API_SECRET")
        provided = self.headers.get("X-HWPX-Secret")
        if not expected or provided != expected:
            self._error(401, "unauthorized")
            return

        try:
            content_length = int(self.headers.get("Content-Length", 0))
            raw = self.rfile.read(content_length) if content_length else b""
            body = json.loads(raw or b"{}")
        except json.JSONDecodeError:
            self._error(400, "invalid json")
            return

        track = body.get("track")
        file_name = body.get("fileName") or "document.hwpx"

        try:
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
                hwpx_bytes = _generate_minimal(body.get("title", "테스트 문서"))
                file_name = "test.hwpx"
            else:
                self._error(400, f"unknown track: {track!r}")
                return
        except Exception as e:
            self._error(500, f"generation failed: {e}")
            return

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


ROADMAP_TEMPLATE = os.path.normpath(
    os.path.join(_DIR, "..", "..", "templates", "hwpx", "roadmap.hwpx")
)


# ===============================================================
# 로드맵 HWPX 생성 — python-hwpx 공식 API만 사용
# ===============================================================
#
# 설계 원칙 (hwpx-docgen 스킬 준수):
# - lxml 직접 OXML 편집 금지
# - `doc.replace_text_in_runs()` 로 본문 플레이스홀더 치환
# - 표 셀은 `para.tables` → `tbl.cell(ri, ci)` → `cell.paragraphs[0].runs[0].text`
#   로 접근하여 값 설정 (zip_replace_all.py 공식 패턴과 동일)
# - 표 행 복제·병합·OXML 구조 변형은 수행하지 않는다.
#   데이터가 템플릿 행 수를 초과하면 초과분은 생략(truncate)한다.
#   (행 복제는 cellAddr/id/linesegarray 중복을 유발해 한컴오피스가 거부)
# ===============================================================


def _generate_roadmap(data: dict) -> bytes:
    from hwpx import HwpxDocument
    from _placeholders_roadmap import build_placeholder_map, build_table_rows

    doc = HwpxDocument.open(ROADMAP_TEMPLATE)

    # --- 1) 본문 + 표 셀 내부 플레이스홀더 치환 ---
    # replace_text_in_runs는 표 셀 내부를 탐색하지 않으므로 zip_replace_all.py의
    # 공식 패턴(모든 표 셀의 paragraphs→runs 순회)을 함께 사용한다.
    placeholders = build_placeholder_map(data)
    for key, value in placeholders.items():
        _replace_in_all_runs(doc, key, str(value or ""))

    # --- 2) AI 역량 수준 체크박스 토글 (Table 7) ---
    level = (data.get("ai_competency_level") or "").upper()
    level_map = {
        "BEGINNER": ("□ 초급", "☑ 초급"),
        "INTERMEDIATE": ("□ 중급", "☑ 중급"),
        "ADVANCED": ("□ 고급", "☑ 고급"),
    }
    if level in level_map:
        src, dst = level_map[level]
        _replace_in_all_runs(doc, src, dst)

    # --- 3) 표 셀 데이터 채우기 (공식 API만 사용) ---
    # 인덱스는 shallow traversal 기준 (중첩 참고자료 표 제외).
    tables = _collect_tables(doc)
    _fill_table_cover(tables, data, idx=1)                          # 표지 PM 표 (3x3)
    _fill_simple_cell(tables, idx=3, row=0, col=0, text=data.get("establishment_necessity"))  # Ⅰ-1
    _fill_table_performance_activities(tables, data, build_table_rows, idx=5)  # Ⅰ-2 (7x6)
    _fill_table_outcome(tables, data, idx=7)                        # Ⅰ-3 (3x4)
    _fill_table_hrd_report(tables, data, idx=11)                    # Ⅱ-1 (1x1)
    _fill_table_company_requirements(tables, data, idx=13)          # Ⅱ-2 (5x3)
    _fill_table_task_workflow(tables, data, build_table_rows, idx=15)  # Ⅱ-3 (6x6)
    _fill_simple_box(tables, 17, data.get("analysis_notes_text"))   # 분석내용
    _fill_table_training_target(tables, data, idx=19)               # Ⅱ-4 (4x3)
    _fill_table_competencies(tables, data, build_table_rows, idx=22)  # Ⅲ-1 (6x5)
    _fill_ncs_boxes(tables, data, methodology_idx=23, derivation_idx=24)
    _fill_table_training_structure(tables, data, build_table_rows, idx=26)  # Ⅲ-2 (5x6)
    _fill_simple_box(tables, 28, data.get("training_structure_method"))
    _fill_table_annual_plan(tables, data, build_table_rows, idx=30)  # Ⅲ-3 (4x5)
    _fill_simple_box(tables, 32, data.get("annual_plan_usage"))
    _fill_course_spec_tables(tables, data, build_table_rows, indices=(34, 35, 36))
    _fill_table_journal(tables, data, build_table_rows, idx=38)     # [별첨] (13x5)

    # --- 4) 저장 ---
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
# 공식 API 헬퍼 — python-hwpx Paragraph/Table/Cell 기반
# ---------------------------------------------------------------


def _collect_tables(doc):
    """문서 최상위 paragraph의 표만 수집 (shallow traversal).

    이 양식은 top-level paragraph에 모든 편집 대상 표가 있고, 중첩 표(참고자료
    내부 표)는 편집 대상이 아니다. 재귀 수집을 하면 참고자료 중첩 표가 중복
    수집되어 인덱스가 shift되므로 shallow로 제한한다.

    shallow 인덱스 → 양식 섹션 매핑:
      1=표지 PM 표 / 3=Ⅰ-1 수립 필요성 / 5=Ⅰ-2 주요활동 / 7=Ⅰ-3 결과
      11=Ⅱ-1 HRD / 13=Ⅱ-2 요구분석 / 15=Ⅱ-3 과업분석 / 17=분석내용
      19=Ⅱ-4 훈련대상 / 22=Ⅲ-1 역량 / 23=NCS 활용 / 24=NCS 도출
      26=Ⅲ-2 훈련체계도 / 28=훈련체계 수립 방법 / 30=Ⅲ-3 연간계획
      32=활용방안 / 34,35,36=Ⅲ-4 명세서 3블록 / 38=별첨 수행일지
    """
    tables = []
    for para in doc.paragraphs:
        for tbl in para.tables:
            tables.append(tbl)
    return tables


def _set_cell_text(tbl, row: int, col: int, text: str) -> None:
    """표 셀의 값을 설정 (첫 paragraph의 첫 run에 기록).

    공식 API만 사용. lxml·OXML 직접 편집 금지.

    주의: placeholder 글자 겹침(Ⅰ-2 수행일시 등)을 막으려면 값을 쓰기 전에
    **모든 run의 text를 무조건 비워야** 한다. `if r.text:` 조건부 비움은
    run.text getter가 일부 `<hp:t>` 노드를 놓칠 때 잔존 placeholder를
    남길 수 있다. 아래 순서(전체 비움 → 첫 run에 쓰기)가 안전.
    """
    if row < 0 or row >= tbl.row_count or col < 0 or col >= tbl.column_count:
        return
    try:
        cell = tbl.cell(row, col)
    except Exception:
        return
    if not cell.paragraphs:
        return
    # Step 1: 셀 내부 모든 run의 text 무조건 비움 (placeholder 흔적 제거)
    for p in cell.paragraphs:
        for r in p.runs:
            r.text = ""
    # Step 2: 첫 paragraph의 첫 run에 새 값 기록
    first_p = cell.paragraphs[0]
    if first_p.runs:
        first_p.runs[0].text = text


def _replace_in_all_runs(doc, old: str, new: str) -> None:
    """본문 + 표 셀 내부 모든 run에서 문자열 치환 (zip_replace_all 패턴)."""
    doc.replace_text_in_runs(old, new)
    for para in doc.paragraphs:
        for tbl in para.tables:
            for ri in range(tbl.row_count):
                for ci in range(tbl.column_count):
                    cell = tbl.cell(ri, ci)
                    for cp in cell.paragraphs:
                        for run in cp.runs:
                            if run.text and old in run.text:
                                run.text = run.text.replace(old, new)


# ---------------------------------------------------------------
# 표별 렌더 함수
# ---------------------------------------------------------------


def _fill_simple_cell(tables, idx: int, row: int, col: int, text):
    if idx >= len(tables):
        return
    _set_cell_text(tables[idx], row, col, text or "")


def _fill_table_cover(tables, data, idx: int = 1):
    """표지 컨설팅 책임자·내부전문가 (3x3).

    row 0 헤더, row 1 PM, row 2 내부전문가.
    cells (1,1)=소속, (1,2)=성명, (2,1)=소속, (2,2)=성명.
    """
    if idx >= len(tables):
        return
    tbl = tables[idx]
    _set_cell_text(tbl, 1, 1, data.get("pm_affiliation") or "")
    _set_cell_text(tbl, 1, 2, data.get("pm_name") or "")
    _set_cell_text(tbl, 2, 1, data.get("internal_expert_affiliation") or "")
    _set_cell_text(tbl, 2, 2, data.get("internal_expert_name") or "")


def _fill_table_performance_activities(tables, data, build_table_rows, idx: int = 5):
    """Ⅰ-2 주요 활동 (7x6).

    row 0 = 헤더, 이후 차수당 2행 (PM/내부전문가).
    최대 3차까지 수용. 초과분은 truncate.
    """
    if idx >= len(tables):
        return
    tbl = tables[idx]
    rows = build_table_rows(data, "performance_activities")
    header_rows = 1
    max_rounds = (tbl.row_count - header_rows) // 2  # = 3

    # 기존 데이터 셀 모두 비움 (샘플 텍스트 제거)
    for r in range(header_rows, tbl.row_count):
        for c in range(tbl.column_count):
            _set_cell_text(tbl, r, c, "")

    for i, act in enumerate(rows[:max_rounds]):
        main_row = header_rows + i * 2
        sub_row = main_row + 1
        _set_cell_text(tbl, main_row, 0, act.get("round", ""))
        _set_cell_text(tbl, main_row, 1, act.get("date", ""))
        _set_cell_text(tbl, main_row, 2, act.get("content", ""))
        _set_cell_text(tbl, main_row, 3, act.get("method", ""))
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
        _set_cell_text(tbl, main_row, 4, (pm or {}).get("role") or "컨설팅책임자(PM)")
        _set_cell_text(tbl, main_row, 5, (pm or {}).get("name") or "")
        # sub_row 는 col 0~3이 병합 셀이므로 col 4(역할)/5(이름)에만 기록
        _set_cell_text(tbl, sub_row, 4, (internal or {}).get("role") or "기업 내부전문가")
        _set_cell_text(tbl, sub_row, 5, (internal or {}).get("name") or "")


def _fill_table_outcome(tables, data, idx: int = 7):
    """Ⅰ-3 수립 주요 결과 (3x4).

    row 0 = 체크박스 (이미 replace로 처리)
    row 1, col 1 = 선정 과업
    row 2, col 1 = 요약
    """
    if idx >= len(tables):
        return
    tbl = tables[idx]
    _set_cell_text(tbl, 1, 1, data.get("selected_tasks_text") or "")
    _set_cell_text(tbl, 2, 1, data.get("roadmap_summary") or "")


def _fill_table_hrd_report(tables, data, idx: int = 11):
    if idx >= len(tables):
        return
    from _placeholders_roadmap import HRD_REPORT_EMPTY_FALLBACK
    attachment = (data.get("hrd_report_attachment") or "").strip()
    text = attachment if attachment else HRD_REPORT_EMPTY_FALLBACK
    _set_cell_text(tables[idx], 0, 0, text)


def _fill_table_company_requirements(tables, data, idx: int = 13):
    """Ⅱ-2 기업 요구분석 (5x3).

    row 0 헤더, row 1~4 = 기업현황/주요문제/추진의지/기대성과.
    """
    if idx >= len(tables):
        return
    tbl = tables[idx]
    mapping = [
        (1, data.get("company_status")),
        (2, data.get("main_problems")),
        (3, data.get("push_willingness")),
        (4, data.get("expected_outcomes")),
    ]
    for r, text in mapping:
        _set_cell_text(tbl, r, 1, text or "")


def _fill_table_task_workflow(tables, data, build_table_rows, idx: int = 15):
    """Ⅱ-3 과업·워크플로우 (6x6).

    row 0 헤더, row 1~5 데이터. 초과 시 truncate.
    """
    if idx >= len(tables):
        return
    tbl = tables[idx]
    items = build_table_rows(data, "task_workflow")
    max_rows = tbl.row_count - 1

    # 기존 데이터 행 모두 비움
    for r in range(1, tbl.row_count):
        for c in range(tbl.column_count):
            _set_cell_text(tbl, r, c, "")

    fields = ["job", "task", "as_is", "problem", "data_availability", "ai_necessity_score"]
    for i, item in enumerate(items[:max_rows]):
        for j, f in enumerate(fields):
            if j < tbl.column_count:
                _set_cell_text(tbl, 1 + i, j, item.get(f, ""))


def _fill_simple_box(tables, idx, text):
    if len(tables) <= idx:
        return
    tbl = tables[idx]
    # 박스 구조: 1행 2열 (row 0: label | value)
    _set_cell_text(tbl, 0, 1, text or "")


def _fill_table_training_target(tables, data, idx: int = 19):
    """Ⅱ-4 훈련대상 과업 (4x3)."""
    if idx >= len(tables):
        return
    tbl = tables[idx]
    tt = data.get("training_target") or {}
    _set_cell_text(tbl, 0, 2, tt.get("task_name") or "")
    _set_cell_text(tbl, 1, 2, tt.get("selection_reason") or "")
    _set_cell_text(tbl, 2, 2, tt.get("as_is") or "")
    _set_cell_text(tbl, 3, 2, tt.get("to_be") or "")


def _fill_table_competencies(tables, data, build_table_rows, idx: int = 22):
    """Ⅲ-1 역량 모델링 (6x5).

    row 0, 1 헤더 (병합), row 2~5 데이터 4행. 초과 시 truncate.
    """
    if idx >= len(tables):
        return
    tbl = tables[idx]
    items = build_table_rows(data, "competency")
    header_rows = 2
    max_rows = tbl.row_count - header_rows

    for r in range(header_rows, tbl.row_count):
        for c in range(tbl.column_count):
            _set_cell_text(tbl, r, c, "")

    fields = ["name", "definition_performance_criteria", "knowledge", "skill", "attitude"]
    for i, item in enumerate(items[:max_rows]):
        for j, f in enumerate(fields):
            if j < tbl.column_count:
                _set_cell_text(tbl, header_rows + i, j, item.get(f, ""))


def _fill_ncs_boxes(tables, data, methodology_idx: int = 23, derivation_idx: int = 24):
    """Ⅲ-1 하단 NCS 활용/도출 방법 박스 — 조건부 렌더."""
    from _placeholders_roadmap import NCS_METHODOLOGY_FALLBACK, NCS_DERIVATION_FALLBACK
    ncs_used = bool(data.get("ncs_used", False))
    methodology = (data.get("ncs_methodology") or "").strip()
    derivation = (data.get("ncs_derivation_method") or "").strip()

    if methodology_idx < len(tables):
        text = methodology if (ncs_used and methodology) else NCS_METHODOLOGY_FALLBACK
        _set_cell_text(tables[methodology_idx], 0, 1, text)
    if derivation_idx < len(tables):
        if ncs_used:
            text = NCS_DERIVATION_FALLBACK
        else:
            text = derivation if derivation else NCS_DERIVATION_FALLBACK
        _set_cell_text(tables[derivation_idx], 0, 1, text)


def _fill_table_training_structure(tables, data, build_table_rows, idx: int = 26):
    """Ⅲ-2 훈련체계도 (5x6). row 0 헤더, row 1~4 데이터."""
    if idx >= len(tables):
        return
    tbl = tables[idx]
    items = build_table_rows(data, "training_structure")
    max_rows = tbl.row_count - 1

    for r in range(1, tbl.row_count):
        for c in range(tbl.column_count):
            _set_cell_text(tbl, r, c, "")

    fields = [
        "competency_name", "training_level", "training_content",
        "training_target", "training_method", "training_goal",
    ]
    for i, item in enumerate(items[:max_rows]):
        for j, f in enumerate(fields):
            if j < tbl.column_count:
                _set_cell_text(tbl, 1 + i, j, item.get(f, ""))


def _fill_table_annual_plan(tables, data, build_table_rows, idx: int = 30):
    """Ⅲ-3 연간 훈련계획 (4x5)."""
    if idx >= len(tables):
        return
    tbl = tables[idx]
    items = build_table_rows(data, "annual_plan")
    max_rows = tbl.row_count - 1

    for r in range(1, tbl.row_count):
        for c in range(tbl.column_count):
            _set_cell_text(tbl, r, c, "")

    fields = ["competency_name", "course_name", "training_type", "training_hours", "remarks"]
    for i, item in enumerate(items[:max_rows]):
        for j, f in enumerate(fields):
            if j < tbl.column_count:
                _set_cell_text(tbl, 1 + i, j, item.get(f, ""))


def _fill_course_spec_tables(tables, data, build_table_rows, indices=(34, 35, 36)):
    """Ⅲ-4 훈련과정 명세서 3개 블록 (각 11x4).

    각 블록:
      row 0~5: col 1 (colSpan=3) = 과정명/훈련형태/추천훈련사업/훈련목표/주요훈련내용/훈련대상
      row 6: 교과목 표 헤더
      row 7~10: 교과목 데이터 (col 1=교과목명, col 2=세부내용, col 3=훈련시간)
    """
    specs = build_table_rows(data, "course_specs")

    for i, tbl_idx in enumerate(indices):
        if tbl_idx >= len(tables):
            continue
        tbl = tables[tbl_idx]
        info_fields = (
            ("course_name", "training_type", "recommended_program",
             "training_goal", "main_content", "training_target")
        )

        # 전체 데이터 셀 비움 (샘플 텍스트 제거)
        for r in range(tbl.row_count):
            # row 0~5의 col 1만, row 7~10의 col 1/2/3만 의미있음
            if r < 6:
                _set_cell_text(tbl, r, 1, "")
            elif r >= 7:
                for c in range(1, 4):
                    if c < tbl.column_count:
                        _set_cell_text(tbl, r, c, "")

        if i < len(specs):
            spec = specs[i]
            for row_idx, field in enumerate(info_fields):
                _set_cell_text(tbl, row_idx, 1, spec.get(field, ""))

            subjects = spec.get("subjects", [])
            for j in range(min(4, len(subjects))):
                subj = subjects[j]
                r = 7 + j
                _set_cell_text(tbl, r, 1, subj.get("subject_name", ""))
                _set_cell_text(tbl, r, 2, subj.get("details", ""))
                _set_cell_text(tbl, r, 3, subj.get("hours", ""))
        else:
            # 과정 부족 시 첫 행에 안내만 남기고 나머지 공란
            _set_cell_text(tbl, 0, 1, "(작성 없음)")


def _fill_table_journal(tables, data, build_table_rows, idx: int = 38):
    """[별첨] 수행일지 (13x5). 1차 인터뷰 기본 데이터로 채운다."""
    if idx >= len(tables):
        return
    tbl = tables[idx]
    _set_cell_text(tbl, 0, 1, data.get("company_name") or "")
    _set_cell_text(tbl, 0, 3, data.get("employment_insurance_no") or "")

    activities = build_table_rows(data, "performance_activities")
    first = activities[0] if activities else {}
    _set_cell_text(tbl, 1, 1, first.get("date", ""))
    _set_cell_text(tbl, 1, 3, first.get("round", "1차"))
    _set_cell_text(tbl, 2, 1, first.get("method", ""))
    mode = "대면" if "대면" in (first.get("method") or "") else "비대면"
    _set_cell_text(tbl, 2, 3, mode if first else "대면")

    participants = first.get("participants") or []
    pm = next((p for p in participants if "PM" in (p.get("role") or "") or "책임자" in (p.get("role") or "")), None)
    internal = next((p for p in participants if "내부" in (p.get("role") or "")), None)
    others = [p for p in participants if p is not pm and p is not internal]

    def _fill_participant(row_addr, person):
        if not person:
            return
        _set_cell_text(tbl, row_addr, 2, person.get("hrd4u_id") or person.get("id") or "")
        _set_cell_text(tbl, row_addr, 4, person.get("name") or "")

    _fill_participant(4, pm)
    _fill_participant(5, internal)
    _fill_participant(6, others[0] if others else None)

    content = first.get("content") or ""
    _set_cell_text(tbl, 7, 1, content[:200] if content else "")

    attachments = data.get("journal_attachments") or ""
    _set_cell_text(tbl, 11, 1, attachments or "없음")
