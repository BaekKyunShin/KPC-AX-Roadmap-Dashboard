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
                data = body.get("data") or {}
                hwpx_bytes = _generate_pbl(data)
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

PBL_TEMPLATE = os.path.normpath(
    os.path.join(_DIR, "..", "..", "templates", "hwpx", "pbl.hwpx")
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

    # --- 0) 표지 본문 텍스트 직접 치환 (정본 placeholder 미존재 대응) ---
    # 신규 정본 (84d1e67) 표지 paragraph 3 = "AI훈련로드맵 컨설팅 보고서(기업명)",
    # paragraph 8 = "202x. 00. 00." 의 raw 텍스트를 회사명·일자로 직접 치환한다.
    # _replace_in_all_runs 는 표 셀 nested 까지 모두 순회하므로 표지 외 영역도 안전.
    company_name = data.get("company_name") or ""
    report_date = data.get("report_date") or ""
    if company_name:
        _replace_in_all_runs(doc, "(기업명)", f"({company_name})")
    if report_date:
        _replace_in_all_runs(doc, "202x. 00. 00.", report_date)

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
    """표 셀의 값을 설정 (multi-line = paragraph 분배).

    공식 API만 사용. lxml·OXML 직접 편집 금지.

    핵심 원칙:
    1. 셀 내부 모든 paragraph의 모든 run text를 무조건 비움
       (placeholder 흔적 완전 제거)
    2. text 를 '\n' 기준으로 분할, 각 줄을 paragraph[i].runs[0] 에 기록
       — 템플릿이 paragraph 2~3개로 설계된 셀(Ⅰ-2 수행일시: 날짜/시간 2줄,
       Ⅰ-1 주요 훈련내용 등)에서 한 줄로 이어붙이면 `lineWrap="SQUEEZE"`
       속성에 의해 좁은 셀 안에서 글자가 눌려 겹쳐 렌더되는 문제가 있음.
    3. 줄 수가 template paragraph 개수보다 많으면 마지막 paragraph에 join.
       줄 수가 적으면 남은 paragraph는 빈 상태 유지.
    """
    if row < 0 or row >= tbl.row_count or col < 0 or col >= tbl.column_count:
        return
    try:
        cell = tbl.cell(row, col)
    except Exception:
        return
    if not cell.paragraphs:
        return

    paragraphs = list(cell.paragraphs)

    # Step 1: 모든 paragraph의 모든 run text 무조건 비움
    for p in paragraphs:
        for r in p.runs:
            r.text = ""

    # Step 2: text 를 '\n' 기준으로 분할해 각 paragraph에 기록
    text = text if text is not None else ""
    lines = text.split("\n") if text else [""]
    p_count = len(paragraphs)

    for i, p in enumerate(paragraphs):
        if not p.runs:
            continue
        if i < p_count - 1:
            p.runs[0].text = lines[i] if i < len(lines) else ""
        else:
            # 마지막 paragraph = 남은 모든 줄을 '\n' 대신 공백으로 join
            # (단일 paragraph 셀에서 원래 동작 유지)
            remainder = "\n".join(lines[i:]) if i < len(lines) else ""
            p.runs[0].text = remainder


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
        # position 키워드(PM/책임자/내부) 매칭 시도 → 실패 시 입력 순서대로 할당
        pm_matched = next(
            (p for p in participants if "PM" in (p.get("role") or "")
             or "책임자" in (p.get("role") or "")),
            None,
        )
        internal_matched = next(
            (p for p in participants if "내부" in (p.get("role") or "")),
            None,
        )
        # fallback: 매칭 실패 시 참석자 입력 순서대로 첫 번째=PM, 두 번째=내부전문가
        pm = pm_matched or (participants[0] if participants else None)
        internal = internal_matched or (
            participants[1] if len(participants) > 1 and pm is not participants[1] else None
        )
        if pm_matched is None and pm is not None and internal_matched is not None:
            # pm 은 순서 fallback 이고 internal 이 매칭 성공이라면 pm 재할당
            # (internal 과 동일한 참석자를 PM 으로 쓰지 않도록)
            if pm is internal:
                pm = participants[0] if participants and participants[0] is not internal else None
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
    """Ⅱ-1 HRD이음 보고서 — 1×1 셀.

    URL 형 attachment 는 raw 노출 회피 fallback (별첨 PDF 페이지 참조 안내) 로 치환.
    """
    if idx >= len(tables):
        return
    from _placeholders_roadmap import _hrd_attachment_text
    _set_cell_text(tables[idx], 0, 0, _hrd_attachment_text(data.get("hrd_report_attachment")))


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


# ===============================================================
# PBL HWPX 생성 (Step 10) — python-hwpx 공식 API만 사용
# ===============================================================
#
# 설계 원칙 (hwpx-docgen 스킬 준수):
# - lxml 직접 OXML 편집 금지
# - `_set_cell_text` / `_replace_in_all_runs` 공용 헬퍼(로드맵 렌더러 정의) 재사용
# - 표 행 복제 금지 — 템플릿 행 수 초과 데이터는 truncate
# - 체크박스는 본문 텍스트 치환(`□ 라벨` → `☑ 라벨`)로 처리
# ===============================================================


def _generate_pbl(data: dict) -> bytes:
    """PBL HWPX 생성 — 과정개발보고서 + 결과보고서(공란 유지).

    shallow 표 인덱스 매핑:
      0=표지 / 1=Ⅰ 개요(15x5) / 3=Ⅱ-1-가 이슈 / 5=Ⅱ-1-나 조직도 /
      7=Ⅱ-2 훈련환경(12x7) / 9=Ⅱ-3-가 HRD이음(8x8) / 10=추천훈련사업(4x4) /
      11=Ⅱ-3-나 필요성 / 13=Ⅲ-1 수행활동(13x6) / 15=Ⅲ-2-가 문제정의(5x2) /
      17=Ⅲ-2-나 우선순위(6x7) / 19=Ⅲ-3-가 훈련대상(6x7) / 20=Ⅲ-3-나 사유 /
      22=Ⅲ-3-다 세부내용(4x5) / 24=Ⅲ-4-가 현재 AI역량(5x3) /
      25=Ⅲ-4-나 향상도(2x3) / 27=Ⅳ-1 훈련목표 / 28=Ⅳ-2 AI도구5단계(6x6) /
      30=Ⅳ-3-가 과정개요(2x2) / 31=Ⅳ-3-나 학습그룹(6x6) /
      32=Ⅳ-3-다 교과목 프로파일(15x10) / 34=Ⅳ-3-라 시설장비(3x5) /
      35=Ⅳ-3-마 훈련강사(3x5) / 36=Ⅳ-4-가 과정평가(16x9) /
      37=만족도·성취도(고정) / 38=외부·현업적용도(고정) /
      42=결과 표지 / 43~51=결과보고서(공란 유지).
      (Ⅴ장 성과분석·확산전략 표 39, 40은 사용자 양식 요구사항에 따라 공란 유지)
    """
    from hwpx import HwpxDocument
    from _placeholders_pbl import (
        AI_LEVEL_ENUM_TO_LABEL,
        AI_LEVEL_GRADE,
        AI_LEVEL_LABELS,
        COURSE_EVALUATION_METHODS,
        TRAINING_GOAL_LABELS,
        build_pbl_placeholder_map,
        build_pbl_table_rows,
    )

    doc = HwpxDocument.open(PBL_TEMPLATE)

    # --- 0) 표지 고정 텍스트 치환 (원본 양식 자리표시어) ---
    company_name = data.get("company_name") or ""
    course_name = data.get("course_name") or ""
    report_date = data.get("report_date") or ""
    if course_name:
        _replace_in_all_runs(doc, "(훈련과정명)", f"({course_name})")
    if company_name:
        _replace_in_all_runs(doc, "㈜기업명 기재", company_name)
    if report_date:
        _replace_in_all_runs(doc, "202 .   .  ", report_date)

    # --- 0.5) 표지 nested 8×5 표 (PM/외부/내부/주치의 소속·성명) ---
    _fill_pbl_cover_nested(doc, data)

    # --- 1) 본문·표 내부 {{key}} 플레이스홀더 일괄 치환 ---
    placeholders = build_pbl_placeholder_map(data)
    for key, value in placeholders.items():
        _replace_in_all_runs(doc, key, str(value or ""))

    # --- 2) AI역량 4등급 체크박스 (T1, T24는 별도) ---
    # V2: data.get("current_ai_level") 은 영문 enum (BASIC/EXPLORER/USER/LEADER).
    # 한글 라벨 ("AI기초형" 등) 로 변환 후 본문 체크박스 패턴에 사용.
    current_level_enum = (data.get("current_ai_level") or "").upper()
    current_level = AI_LEVEL_ENUM_TO_LABEL.get(current_level_enum, "")
    # T1 본문 체크박스 패턴 — 전역 reset 후 선택 등급만 ☑
    for label in AI_LEVEL_LABELS:
        # "□ AI기초형" 또는 "☑ AI기초형" → "□ AI기초형" reset
        _replace_in_all_runs(doc, f"☑ {label}", f"□ {label}")
        # T1 원본에는 공백 2개 변형도 존재 ("□AI선도형")
        _replace_in_all_runs(doc, f"☑{label}", f"□{label}")
    if current_level in AI_LEVEL_LABELS:
        _replace_in_all_runs(doc, f"□ {current_level}", f"☑ {current_level}")
        _replace_in_all_runs(doc, f"□{current_level}", f"☑{current_level}")

    # --- 3) 훈련목표 5종 체크박스 ---
    selected_goals = set(data.get("training_goals") or [])
    for label in TRAINING_GOAL_LABELS:
        # 원본에 U+2610 (☐) 변형 포함 — 모두 □ 로 정규화 후 처리
        _replace_in_all_runs(doc, f"☑ {label}", f"□ {label}")
        _replace_in_all_runs(doc, f"☐ {label}", f"□ {label}")
    for label in selected_goals:
        if label in TRAINING_GOAL_LABELS:
            _replace_in_all_runs(doc, f"□ {label}", f"☑ {label}")

    # --- 4) 훈련장소 사내/사외 체크박스 (T7) ---
    place_types = set(data.get("training_place_types") or [])
    _replace_in_all_runs(doc, "☑ 사내", "□ 사내")
    _replace_in_all_runs(doc, "☑ 사외", "□ 사외")
    if "사내" in place_types:
        _replace_in_all_runs(doc, "□ 사내", "☑ 사내")
    if "사외" in place_types:
        _replace_in_all_runs(doc, "□ 사외", "☑ 사외")

    # --- 5) 사내강사 예/아니오 체크박스 (T7) ---
    internal_used = bool(data.get("internal_instructor_used"))
    _replace_in_all_runs(doc, "☑ 예", "□ 예")
    _replace_in_all_runs(doc, "☑ 아니오", "□ 아니오")
    if internal_used:
        _replace_in_all_runs(doc, "□ 예", "☑ 예")
    else:
        _replace_in_all_runs(doc, "□ 아니오", "☑ 아니오")

    # --- 6) 과정평가 방법 3종 체크박스 (T36 상단) ---
    selected_methods = set(data.get("course_evaluation_methods") or [])
    for label in COURSE_EVALUATION_METHODS:
        _replace_in_all_runs(doc, f"☑ {label}", f"□ {label}")
    for label in selected_methods:
        if label in COURSE_EVALUATION_METHODS:
            _replace_in_all_runs(doc, f"□ {label}", f"☑ {label}")

    # --- 7) 표 셀 반복 데이터 (V2 매핑) ---
    # V2 인터뷰 정본 (PR #28) 기준. V1 키는 fallback 으로만 사용.
    tables = _collect_tables(doc)
    _fill_pbl_overview(tables, data, idx=1)                           # Ⅰ
    # Ⅱ-1-가 (idx=3, 1×1): V2 P-03 = company_issues. V1 호환 위해 business_issues 도 fallback.
    # 1×1 표라 _fill_simple_box (col 1) 가 silent skip → _fill_pbl_simple_content (col 0) 사용.
    _fill_pbl_simple_content(
        tables, 3, data.get("company_issues") or data.get("business_issues")
    )
    _fill_pbl_organization(tables, build_pbl_table_rows, data, idx=5)
    _fill_pbl_training_env(tables, data, idx=7)                       # Ⅱ-2
    # Ⅱ-3-가 HRD이음 (idx=9, 10): V2 에서는 PDF 첨부로 대체. 표는 양식 그대로 유지
    # (한글 오피스에서 사용자가 직접 PDF 첨부 또는 placeholder 안내 fallback 으로 전환).
    # V1 호환: training_history/support_history/recommendations 데이터가 있으면 채움.
    if data.get("training_history") or data.get("support_history"):
        _fill_pbl_hrd_history(tables, build_pbl_table_rows, data, idx=9)
    if data.get("recommendations"):
        _fill_pbl_recommendations(tables, build_pbl_table_rows, data, idx=10)
    # Ⅱ-3-나 (idx=11, 1×1): V2 P-07 = course_necessity. V1 호환 fallback.
    # 1×1 표라 _fill_simple_box (col 1) 가 silent skip → _fill_pbl_simple_content (col 0) 사용.
    _fill_pbl_simple_content(
        tables,
        11,
        data.get("course_necessity") or data.get("course_development_necessity"),
    )
    _fill_pbl_performance_activities(tables, build_pbl_table_rows, data, idx=13)
    _fill_pbl_problems(tables, build_pbl_table_rows, data, idx=15)    # Ⅲ-2-가 V2
    _fill_pbl_problem_priorities(tables, build_pbl_table_rows, data, idx=17)  # V2 priorities key
    _fill_pbl_target_tasks(tables, build_pbl_table_rows, data, idx=19)  # V2 target_single key
    # Ⅲ-3-나 (idx=20): V2 P-12 = target_necessity (target.necessity 자유서술).
    _fill_pbl_simple_content(
        tables,
        20,
        data.get("target_necessity") or data.get("target_tasks_selection_reason"),
    )
    _fill_pbl_target_task_details(tables, build_pbl_table_rows, data, idx=22)  # V2 details
    _fill_pbl_ai_level_current(tables, current_level, AI_LEVEL_LABELS, AI_LEVEL_GRADE, idx=24)
    _fill_pbl_ai_level_improvement(tables, data, AI_LEVEL_ENUM_TO_LABEL, AI_LEVEL_GRADE, idx=25)
    _fill_pbl_simple_content(tables, 27, data.get("training_goal"))
    _fill_pbl_ai_tool_usage(tables, build_pbl_table_rows, data, idx=28)
    _fill_pbl_course_overview(tables, data, idx=30)
    _fill_pbl_learning_group(tables, build_pbl_table_rows, data, idx=31)
    _fill_pbl_subject_profile(tables, build_pbl_table_rows, data, selected_methods, idx=32)
    _fill_pbl_facilities(tables, build_pbl_table_rows, data, idx=34)
    _fill_pbl_training_instructors(tables, build_pbl_table_rows, data, idx=35)
    _fill_pbl_course_evaluation(tables, build_pbl_table_rows, data, idx=36)
    # Ⅴ-1, Ⅴ-2 표(idx=39, 40)는 사용자 요구사항에 따라 공란 유지
    # (이전 `_fill_pbl_performance_metrics` / `_fill_pbl_dissemination` 호출 제거됨)

    # --- 8) 저장 ---
    with tempfile.NamedTemporaryFile(delete=True, suffix=".hwpx") as tmp:
        doc.save_to_path(tmp.name)
        with open(tmp.name, "rb") as f:
            return f.read()


# ---------------------------------------------------------------
# PBL 표별 렌더 함수
# ---------------------------------------------------------------


def _fill_pbl_simple_content(tables, idx: int, text):
    """1×1 단일 셀 박스 (예: 훈련 목표, 사유, 필요성).

    1 줄 입력에 양식 paragraph 가 여러 개 있는 셀의 경우, 사용되지 않는
    빈 paragraph 의 `paraPrIDRef` 가 머리기호 스타일 (예: 76 번) 이면
    한컴오피스에서 빈 줄에도 머리기호 (∙·□ 등) 가 자동 표시되어 사용자
    검증에서 "1 항목에 머리기호 2 개" 회귀로 보고됐다 (P-12).

    해결: 텍스트가 모두 비어있는 paragraph 의 paraPrIDRef 를 기본 단락
    스타일 ("0", PBL 정본에서 65 회 사용 — 가장 일반적 ID) 로 reset 하여
    자동 머리기호를 회피한다.
    """
    if idx >= len(tables):
        return
    tbl = tables[idx]
    if tbl.row_count < 1 or tbl.column_count < 1:
        return
    _set_cell_text(tbl, 0, 0, text or "")
    # 빈 paragraph 의 머리기호 회피 — paraPrIDRef "0" (기본 단락) 으로 reset
    try:
        cell = tbl.cell(0, 0)
    except Exception:
        return
    for p in cell.paragraphs:
        if all(not (r.text or "") for r in p.runs):
            try:
                p.para_pr_id_ref = "0"
            except Exception:
                pass


def _fill_pbl_cover_nested(doc, data):
    """PBL 표지 nested 8×5 표 (PM/외부전문가/내부전문가/주치의) 채움.

    paragraph 0 의 outer 2×2 표의 cell(1,0) 과 cell(1,1) 안에 각각 nested 8×5
    표 (구분/소속/성명/-/기업체확인) 가 있다 (좌·우 표지 양면). 동일 cover
    데이터를 양쪽에 채운다.

    nested 8×5 row 매핑 (실제 OXML 구조 — col 1·2 수직 병합):
      row 0 = 헤더
      row 1 = 컨설팅책임자(PM)                     [단일]
      row 2~3 = 외부전문가(직무,HRD)               [col 1·2 수직 병합 — 1 슬롯]
      row 4~5 = 기업 내부전문가                    [col 1·2 수직 병합 — 1 슬롯]
      row 6~7 = 능력개발전담주치의                 [col 1·2 수직 병합 — 1 슬롯]
    각 row 의 col 1 = 소속, col 2 = 성명.

    NOTE: 양식 row 2~3 등은 col 0 만 분리되어 있고 col 1·2 가 수직 병합되어 있어
    데이터는 row 2 (대표 row) 에만 1 회 채운다. row 3 에 별도 데이터를 채우면
    같은 병합 cell 이 덮어쓰여진다.

    cover 객체 (data["cover"]):
      {pm: {affiliation, name},
       external_experts: [{affiliation, name}],   # 양식상 1 슬롯
       internal_experts: [{affiliation, name}],   # 1 슬롯
       doctors: [{affiliation, name}]}            # 1 슬롯
    """
    cover = data.get("cover") or {}
    pm = cover.get("pm") or {}
    externals = cover.get("external_experts") or []
    internals = cover.get("internal_experts") or []
    doctors = cover.get("doctors") or []

    role_rows = [
        (1, pm),
        (2, externals[0] if len(externals) > 0 else {}),
        (4, internals[0] if len(internals) > 0 else {}),
        (6, doctors[0] if len(doctors) > 0 else {}),
    ]

    if not doc.paragraphs:
        return
    para0 = doc.paragraphs[0]
    if not para0.tables:
        return
    outer = para0.tables[0]
    if outer.row_count < 2:
        return

    # outer 2×2 의 cell(1,0) 와 cell(1,1) 각각에 nested 8×5 (좌·우 표지)
    for outer_col in range(min(2, outer.column_count)):
        try:
            outer_cell = outer.cell(1, outer_col)
        except Exception:
            continue
        for inner_para in outer_cell.paragraphs:
            for nested in inner_para.tables:
                if nested.row_count == 8 and nested.column_count == 5:
                    for row_idx, person in role_rows:
                        if row_idx >= nested.row_count:
                            break
                        try:
                            _set_cell_text(
                                nested, row_idx, 1,
                                str(person.get("affiliation") or "") if person else "",
                            )
                            _set_cell_text(
                                nested, row_idx, 2,
                                str(person.get("name") or "") if person else "",
                            )
                        except Exception:
                            # 셀 좌표 이상 시 silent skip — 한컴오피스가 OXML 구조
                            # 이상으로 거부하지 않도록 fail-soft.
                            pass


def _fill_pbl_overview(tables, data, idx: int = 1):
    """Ⅰ. 훈련과정 개요 — 15×5 복합 표.

    양식은 label/value가 불규칙하게 배치돼 셀 좌표로 직접 채운다.
    shallow traversal과 template 원본 셀 구조 기준:
      row 0 = 기업명 | 값 | 사업장관리번호 | 값 | (분리)
      row 1 = 주요 업종 ...
    정확한 좌표는 원본 row/col 구조를 따른다.
    """
    if idx >= len(tables):
        return
    tbl = tables[idx]

    # 셀 좌표는 실제 템플릿 T1(15x5) 구조 기준 (병합 다수):
    #   row 0: [0,0]=기업명 / [0,1..2]=값 / [0,3]=사업장관리번호 / [0,4]=값
    #   row 1: [1,0..2]=주요 업종 라벨 (병합) / [1,3..4]=라벨 연장
    #   row 2: [2,0]=주요 업종 / [2,1..4]=업종코드·주업종 placeholder
    #   row 3: [3,0]=주소 / [3,1..4]=값
    #   row 4: [4,0]=훈련실시주소 / [4,1..4]=값
    #   row 5: [5,0]=훈련실시주소 / [5,3]=관할 지부·지사 / [5,4]=값
    #   row 6: [6,0]=담당자연락처 / [6,1]=직 위 / [6,2]=값 / [6,3]=성 명 / [6,4]=값
    #   row 7: [7,0]=담당자연락처 / [7,1]=연락처 / [7,2]=값 / [7,3]=e-mail / [7,4]=값
    #   row 8: [8,0]=훈련과정명 / [8,1..4]=값
    #   row 9: [9,0]=NCS 분류 / [9,1..4]=값
    #   row 10: [10,0]=훈련시간 / [10,1..4]=값
    #   row 11: [11,0]=훈련생 / [11,1..4]=값
    #   row 12: [12,0]=훈련 직무 / [12,1..4]=값
    #   row 13: AI역량 체크박스 (문자열 replace)
    #   row 14: 훈련 목표 체크박스 (문자열 replace)
    industry_text = data.get("industry_main") or data.get("industry_code") or ""
    if data.get("industry_code") and data.get("industry_main"):
        industry_text = f"업종코드: {data['industry_code']}  주업종: {data['industry_main']}"
    # 주소/훈련실시주소가 수직 병합이면 한 셀만 남으므로 줄바꿈으로 합쳐서 표시.
    address_value = data.get("address") or ""
    training_address = data.get("training_address") or ""
    address_block = address_value
    if training_address and training_address != address_value:
        address_block = (
            f"{address_value}\n(훈련실시: {training_address})".strip()
            if address_value
            else f"훈련실시: {training_address}"
        )
    # row 11 훈련생 — V2 우선 (training_target_label), V1 fallback (trainee_count → "N 명")
    trainee_text = (
        data.get("training_target_label")
        or _format_trainees(data.get("trainee_count"))
        or ""
    )
    mapping = [
        (0, 1, data.get("company_name")),
        (0, 4, data.get("business_registration_no")),
        (2, 1, industry_text),  # 업종 placeholder가 row 2에 존재
        (3, 1, address_block),
        (5, 4, data.get("jurisdiction_office")),
        (6, 2, data.get("contact_position")),
        (6, 4, data.get("contact_name")),
        (7, 2, data.get("contact_phone")),
        (7, 4, data.get("contact_email")),
        (8, 1, data.get("course_name")),
        (9, 1, data.get("ncs_code")),
        (10, 1, _format_hours(data.get("training_hours"))),
        (11, 1, trainee_text),
        (12, 1, data.get("training_job")),
    ]
    for r, c, text in mapping:
        try:
            _set_cell_text(tbl, r, c, text or "")
        except Exception:
            pass


def _format_hours(v):
    if v is None or v == "":
        return ""
    return f"{v} 시간"


def _format_trainees(v):
    if v is None or v == "":
        return ""
    return f"{v} 명"


def _fill_pbl_organization(tables, build_pbl_table_rows, data, idx: int = 5):
    """Ⅱ-1-나 조직도 (6×3) — 최대 3행 데이터 치환."""
    if idx >= len(tables):
        return
    tbl = tables[idx]
    rows = build_pbl_table_rows(data, "organization")
    max_rows = min(3, tbl.row_count - 1)  # 첫 행은 헤더 아니지만 예시 보존
    # 전체 데이터 영역 reset
    for r in range(tbl.row_count):
        for c in range(tbl.column_count):
            _set_cell_text(tbl, r, c, "")
    for i, row in enumerate(rows[:max_rows]):
        _set_cell_text(tbl, i, 1, row.get("department_name", ""))
        _set_cell_text(tbl, i, 2, row.get("tasks", ""))


def _fill_pbl_training_env(tables, data, idx: int = 7):
    """Ⅱ-2 훈련환경 분석 — 12×7.

    양식 row 매핑 (대략):
      row 0 헤더(구분/내용) / row 1~2 훈련여건 시간/장소 / row 3 사내강사 /
      row 4 대상인원 / row 5 대상자특성 / row 6 AI인프라 / row 7 요구분석 /
      row 8 기대효과 / row 9 작성 가이드 영역
    """
    if idx >= len(tables):
        return
    tbl = tables[idx]

    # 실제 T7(12x7) 구조:
    #   row 1 적정 훈련시간 [1,2..6]=값
    #   row 2 적정 훈련장소 사내 [2,2]=체크박스, [2,3..6]=location
    #   row 3 적정 훈련장소 사외 [3,2]=체크박스, [3,3..6]=special_notes
    #   row 4 사내강사 [4,2]=□예, [4,3]=이름, [4,4..5]=값, [4,6]=□아니오
    #   row 5 사내강사 [5,3]=직책, [5,4..5]=값
    #   row 6 대상 인원 [6,2..6]=값
    #   row 7 대상자 특성 [7,2..6]=값
    #   row 8 AI활용 가능 인프라 [8,2..6]=값
    #   row 9 AI훈련 요구분석 결과 [9,2..6]=값
    #   row 10 기대효과 헤더
    #   row 11 기대효과 [11,2..4]=As-is, [11,5..6]=To-be
    mapping = [
        (1, 2, _str_hours(data.get("proper_training_hours"))),
        (2, 3, data.get("training_place_location")),
        (3, 3, data.get("training_place_special_notes")),
        (4, 4, data.get("internal_instructor_name")),
        (5, 4, data.get("internal_instructor_position")),
        (6, 2, _str_count(data.get("target_count"))),
        (7, 2, _str_characteristics(data)),
        (8, 2, _compose_ai_infra(data)),
        (9, 2, data.get("training_needs_analysis")),
        (11, 2, data.get("expectation_as_is")),
        (11, 5, data.get("expectation_to_be")),
    ]
    for r, c, text in mapping:
        try:
            _set_cell_text(tbl, r, c, text or "")
        except Exception:
            pass


def _str_hours(v):
    return f"{v} 시간" if v else ""


def _str_count(v):
    return f"{v} 명" if v else ""


def _str_characteristics(data):
    career = data.get("target_career") or ""
    level = data.get("target_level") or ""
    lines = []
    if career:
        lines.append(f"(업무 경력) {career}")
    if level:
        lines.append(f"(수준) {level}")
    return "\n".join(lines)


def _compose_ai_infra(data):
    tools = data.get("ai_tools_status") or ""
    network = data.get("network_status") or ""
    pc = data.get("pc_count")
    etc = data.get("etc_equipment") or ""
    lines = []
    if tools:
        lines.append(f"AI 도구 사용 가능 환경: {tools}")
    if network:
        lines.append(f"네트워크 환경: {network}")
    if pc is not None and pc != "":
        lines.append(f"PC 보유 현황: {pc} 대")
    if etc:
        lines.append(f"기타 장비: {etc}")
    return "\n".join(lines)


def _fill_pbl_hrd_history(tables, build_pbl_table_rows, data, idx: int = 9):
    """Ⅱ-3-가 HRD이음 결과 — 8×8.

    이 표는 훈련이력 3행 + 지원이력 3행 구조이며 좌표가 복잡해 **최선 best-effort**로
    중요 필드만 채운다. 원본 예시 텍스트는 reset 후 덮어쓴다.
    """
    if idx >= len(tables):
        return
    tbl = tables[idx]

    # 훈련이력 상단 3행 (row 1~3 가정)
    training = build_pbl_table_rows(data, "training_history")
    for i, row in enumerate(training[:3]):
        base_row = 1 + i
        try:
            _set_cell_text(tbl, base_row, 2, _str_or_empty_local(row.get("seq")))
            _set_cell_text(tbl, base_row, 3, _str_or_empty_local(row.get("program")))
            _set_cell_text(tbl, base_row, 4, _str_or_empty_local(row.get("course_name")))
            _set_cell_text(tbl, base_row, 5, _str_or_empty_local(row.get("method")))
            _set_cell_text(tbl, base_row, 6, _str_or_empty_local(row.get("duration_days")))
        except Exception:
            pass

    # 지원이력 하단 3행 (row 5~7 가정)
    support = build_pbl_table_rows(data, "support_history")
    for i, row in enumerate(support[:3]):
        base_row = 5 + i
        try:
            _set_cell_text(tbl, base_row, 2, _str_or_empty_local(row.get("year")))
            _set_cell_text(tbl, base_row, 3, _str_or_empty_local(row.get("annual_limit")))
            _set_cell_text(tbl, base_row, 4, _str_or_empty_local(row.get("supported")))
            _set_cell_text(tbl, base_row, 5, _str_or_empty_local(row.get("ratio")))
        except Exception:
            pass


def _str_or_empty_local(v):
    return "" if v is None else str(v)


def _fill_pbl_recommendations(tables, build_pbl_table_rows, data, idx: int = 10):
    """Ⅱ-3-가 추천훈련사업·HRD제안 — 4×4.

    row 0 헤더(추천훈련사업 | 1순위 | 2순위 | 3순위)
    row 1 데이터 (사업명 3개)
    row 2 HRD 제안
    """
    if idx >= len(tables):
        return
    tbl = tables[idx]
    recommendations = build_pbl_table_rows(data, "recommendations")

    # 예시 텍스트 reset
    for r in range(1, tbl.row_count):
        for c in range(1, tbl.column_count):
            _set_cell_text(tbl, r, c, "")

    # recommendations 정렬: rank 1, 2, 3
    by_rank = {r.get("rank"): r for r in recommendations if r.get("rank") in (1, 2, 3)}
    for rank in (1, 2, 3):
        rec = by_rank.get(rank)
        if rec:
            try:
                _set_cell_text(tbl, 1, rank, rec.get("program", ""))
            except Exception:
                pass

    # HRD 제안 (row 2 전체 merge 되어있을 수 있음 — col 1 사용)
    proposal = " / ".join(
        f"{r.get('rank')}순위: {r.get('proposal')}" for r in recommendations if r.get("proposal")
    )
    try:
        _set_cell_text(tbl, 2, 1, proposal)
    except Exception:
        pass


def _fill_pbl_performance_activities(tables, build_pbl_table_rows, data, idx: int = 13):
    """Ⅲ-1 수행활동 — 13×6 (V2 activities[] 또는 V1 performance_activities[]).

    row 0 헤더 / 이후 차수당 4행 (PM / 외부전문가 / 내부전문가 / 능력개발전담주치의).
    최대 3차 = 12 데이터 행. 초과 truncate.

    V2 activities[] = [{round, date, content, method, participants (string)}]
      → participants 가 단일 string 이므로 첫 행 (PM) col 5 에 표시,
        2~4행은 라벨만 유지 (이름 빈칸).
    V1 performance_activities[] = participants 가 dict (pm/external_expert/...).
    """
    if idx >= len(tables):
        return
    tbl = tables[idx]
    # V2 activities key 우선
    rows = build_pbl_table_rows(data, "activities")
    is_v2 = bool(rows)
    if not is_v2:
        rows = build_pbl_table_rows(data, "performance_activities")
    header_rows = 1
    rows_per_round = 4
    max_rounds = (tbl.row_count - header_rows) // rows_per_round  # = 3

    # 데이터 영역 reset (원본 예시 텍스트 제거)
    for r in range(header_rows, tbl.row_count):
        for c in range(tbl.column_count):
            _set_cell_text(tbl, r, c, "")

    roles = (
        ("컨설팅책임자(PM)", "pm"),
        ("외부전문가(직무,HRD)", "external_expert"),
        ("기업내부전문가", "internal_expert"),
        ("능력개발전담주치의", "jurisdiction_manager"),
    )

    for ri, row in enumerate(rows[:max_rounds]):
        base = header_rows + ri * rows_per_round
        _set_cell_text(tbl, base, 0, row.get("round", ""))
        _set_cell_text(tbl, base, 1, row.get("date", ""))
        _set_cell_text(tbl, base, 2, row.get("content", ""))
        method_text = row.get("method", "")
        if not is_v2 and row.get("operation_mode"):
            method_text = f"{method_text} ({row['operation_mode']})".strip()
        _set_cell_text(tbl, base, 3, method_text)

        if is_v2:
            # V2: participants 가 단일 string. 4 역할 라벨 모두 채우되,
            # 이름은 첫 행 (PM) 에만 string 그대로 표시.
            participants_str = row.get("participants", "")
            for role_i, (role_label, _role_key) in enumerate(roles):
                r = base + role_i
                if r < tbl.row_count:
                    _set_cell_text(tbl, r, 4, role_label)
                    _set_cell_text(tbl, r, 5, participants_str if role_i == 0 else "")
        else:
            participants = row.get("participants") or {}
            if not isinstance(participants, dict):
                participants = {}
            for role_i, (role_label, role_key) in enumerate(roles):
                r = base + role_i
                if r < tbl.row_count:
                    _set_cell_text(tbl, r, 4, role_label)
                    _set_cell_text(tbl, r, 5, participants.get(role_key, ""))


def _fill_pbl_problems(tables, build_pbl_table_rows, data, idx: int = 15):
    """Ⅲ-2-가 문제 정의 — 5×2 (V2: problems[] 4 항목).

    양식 5x2 (구분/내용) — row 0 헤더, row 1~4 데이터 (max_items=4).
    V2 problems[] = [{title, description, impact}]
      → col 0 = title, col 1 = description.

    V1 호환: data.get("problems") 가 비어 있으면 V1 problem_background/core/
    scope/constraints 4 cell_fill 로 fallback.
    """
    if idx >= len(tables):
        return
    tbl = tables[idx]
    problems = build_pbl_table_rows(data, "problems")
    if problems:
        max_rows = min(4, tbl.row_count - 1)
        for i, row in enumerate(problems[:max_rows]):
            target_row = 1 + i
            _set_cell_text(tbl, target_row, 0, row.get("title", ""))
            _set_cell_text(tbl, target_row, 1, row.get("description", ""))
        return
    # V1 fallback
    mapping = [
        (1, 1, data.get("problem_background")),
        (2, 1, data.get("problem_core")),
        (3, 1, data.get("problem_scope")),
        (4, 1, data.get("problem_constraints")),
    ]
    for r, c, text in mapping:
        _set_cell_text(tbl, r, c, text or "")


# 하위 호환 alias (기존 호출자 보호)
_fill_pbl_problem_definition = _fill_pbl_problems


def _fill_pbl_problem_priorities(tables, build_pbl_table_rows, data, idx: int = 17):
    """Ⅲ-2-나 문제 우선순위 — 6×7 (V2 priority.items[]).

    row 0 헤더 / row 1~5 데이터.
    col 0 = 문제명 / col 1~5 = score 1~5 (선택 시 √) / col 6 = 선정여부 (rank=1 ☑).

    V2 priority.items[] = [{problem, score(1-5), rank}] (rank=1 → selected).
    V1 호환: priorities 가 비어 있으면 problem_priorities (V1 형식) fallback.
    """
    if idx >= len(tables):
        return
    tbl = tables[idx]
    rows = build_pbl_table_rows(data, "priorities")
    if not rows:
        # V1 호환 (problem_name/priority/selected)
        v1_rows = build_pbl_table_rows(data, "problem_priorities")
        rows = [
            {
                "problem": r.get("problem_name", ""),
                "score": r.get("priority", 0),
                "rank": 1 if r.get("selected") else 0,
                "selected": r.get("selected", False),
            }
            for r in v1_rows
        ]
    max_rows = min(5, tbl.row_count - 1)

    for r in range(1, tbl.row_count):
        for c in range(tbl.column_count):
            _set_cell_text(tbl, r, c, "")

    for i, row in enumerate(rows[:max_rows]):
        target_row = 1 + i
        _set_cell_text(tbl, target_row, 0, row.get("problem", ""))
        # 점수 1~5: 선택된 칼럼에 √ 표시
        try:
            score = int(row.get("score") or 0)
        except (TypeError, ValueError):
            score = 0
        if 1 <= score <= 5:
            _set_cell_text(tbl, target_row, score, "√")
        # rank=1 → selected ☑
        if row.get("selected"):
            _set_cell_text(tbl, target_row, 6, "☑")


def _fill_pbl_target_tasks(tables, build_pbl_table_rows, data, idx: int = 19):
    """Ⅲ-3-가 훈련대상 업무 선정 — 6×7 (V2 단일 target).

    양식 6x7 — row 0 헤더, row 1 = target 한 항목 (V2 단일 객체).
    col 0 = name, col 1~5 = 점수 (V2 schema 는 자유서술이므로 비움), col 6 = ☑.

    V1 호환: target_tasks (배열) 도 처리.
    """
    if idx >= len(tables):
        return
    tbl = tables[idx]
    rows = build_pbl_table_rows(data, "target_single")
    if not rows:
        # V1 호환 — target_tasks (배열) 사용
        v1_rows = build_pbl_table_rows(data, "target_tasks")
        rows = [
            {
                "name": r.get("task_name", ""),
                "necessity_score": r.get("necessity", 0),
                "selected": r.get("selected", False),
            }
            for r in v1_rows
        ]
    max_rows = min(5, tbl.row_count - 1)

    for r in range(1, tbl.row_count):
        for c in range(tbl.column_count):
            _set_cell_text(tbl, r, c, "")

    for i, row in enumerate(rows[:max_rows]):
        target_row = 1 + i
        _set_cell_text(tbl, target_row, 0, row.get("name", ""))
        # V1 호환: necessity_score 가 1~5 정수인 경우만 √ 처리
        try:
            score = int(row.get("necessity_score") or 0)
        except (TypeError, ValueError):
            score = 0
        if 1 <= score <= 5:
            _set_cell_text(tbl, target_row, score, "√")
        # V2 target_single 은 single 항목이므로 항상 ☑
        if row.get("selected", True):
            _set_cell_text(tbl, target_row, 6, "☑")


def _fill_pbl_target_task_details(tables, build_pbl_table_rows, data, idx: int = 22):
    """Ⅲ-3-다 훈련대상 업무 세부내용 — 4×5 (V2 details[] title/description).

    양식 4x5 — row 0~1 헤더, row 2~3 데이터 (max_items=2).
    V2 details[] = [{title, description}] (V1 의 as_is/to_be/required_* 통합).
      → col 0 = title, col 1~4 = description (단일 텍스트로 통합).

    V1 호환: target_task_details (V1 형식) 가 있으면 그대로 사용.
    """
    if idx >= len(tables):
        return
    tbl = tables[idx]
    rows = build_pbl_table_rows(data, "target_details_v2")
    use_v2 = bool(rows)
    if not use_v2:
        rows = build_pbl_table_rows(data, "target_task_details")
    max_rows = min(2, tbl.row_count - 2)

    for r in range(2, tbl.row_count):
        for c in range(tbl.column_count):
            _set_cell_text(tbl, r, c, "")

    for i, row in enumerate(rows[:max_rows]):
        target_row = 2 + i
        if use_v2:
            _set_cell_text(tbl, target_row, 0, row.get("title", ""))
            _set_cell_text(tbl, target_row, 1, row.get("description", ""))
        else:
            _set_cell_text(tbl, target_row, 0, row.get("task_name", ""))
            _set_cell_text(tbl, target_row, 1, row.get("as_is") or "")
            _set_cell_text(tbl, target_row, 2, row.get("to_be") or "")
            _set_cell_text(tbl, target_row, 3, row.get("required_knowledge", ""))
            _set_cell_text(tbl, target_row, 4, row.get("required_skill", ""))


def _fill_pbl_ai_level_current(tables, current_level, labels, grade_map, idx: int = 24):
    """Ⅲ-4-가 현재 AI역량 수준 — 5×3.

    row 0 헤더(구분/수준(등급)/주요내용)
    row 1~4 = AI기초형/AI탐구형/AI활용형/AI선도형
    col 0 = 체크박스, col 1 = 라벨(등급), col 2 = 설명.
    """
    if idx >= len(tables):
        return
    tbl = tables[idx]
    descriptions = {
        "AI기초형": "AI 및 디지털 기술 도입에 대한 인식은 있으나, 실제 활용은 거의 없거나 매우 제한적",
        "AI탐구형": "AI 및 디지털 기술에 대해 학습하고, 내부 탐색 또는 외부 파일럿 검토를 준비(검토) 중인 단계",
        "AI활용형": "생성형 AI나 기타 AI기술이 특정 단위업무나 부서에서 활용되고 있으며, 데이터 기반 개선이 나타나기 시작한 단계",
        "AI선도형": "AI가 조직 전반에 내재화되어 있으며, 조직 AX 전환 및 전 프로세스 AI 기술 적용, 신사업과 혁신적 활용까지 이루어진 단계",
    }
    for i, label in enumerate(labels):
        r = 1 + i
        if r >= tbl.row_count:
            break
        checkbox = "☑" if label == current_level else "□"
        _set_cell_text(tbl, r, 0, checkbox)
        grade = grade_map.get(label, "")
        _set_cell_text(tbl, r, 1, f"{label}({grade})")
        _set_cell_text(tbl, r, 2, descriptions.get(label, ""))


def _fill_pbl_ai_level_improvement(tables, data, enum_to_label, grade_map, idx: int = 25):
    """Ⅲ-4-나 훈련 이후 AI역량 수준 향상도 — 2×3 (V2 enum + note).

    row 0 헤더(현행/향후/사유) / row 1 = 데이터 (cell_fill, 4 등급 체크박스 아님).

    V2: data.get("current_ai_level") / data.get("expected_ai_level") 는 영문 enum
    (BASIC/EXPLORER/USER/LEADER). 한글 라벨 + 등급으로 변환.
    V2: data.get("expected_ai_level_note") = 사유.
    V1 호환: ai_current_level/ai_expected_level (한글) + ai_improvement_reason.
    """
    if idx >= len(tables):
        return
    tbl = tables[idx]

    # V2 enum 우선
    current_enum = (data.get("current_ai_level") or "").upper()
    expected_enum = (data.get("expected_ai_level") or "").upper()
    current_label = enum_to_label.get(current_enum) or data.get("ai_current_level") or ""
    expected_label = enum_to_label.get(expected_enum) or data.get("ai_expected_level") or ""
    reason = (
        data.get("expected_ai_level_note")
        or data.get("ai_improvement_reason")
        or ""
    )

    def _fmt(label: str) -> str:
        if not label:
            return ""
        grade = grade_map.get(label, "")
        return f"{label}({grade})" if grade else label

    if tbl.row_count >= 2:
        _set_cell_text(tbl, 1, 0, _fmt(current_label))
        _set_cell_text(tbl, 1, 1, _fmt(expected_label))
        _set_cell_text(tbl, 1, 2, reason)


def _fill_pbl_ai_tool_usage(tables, build_pbl_table_rows, data, idx: int = 28):
    """Ⅳ-2 AI 도구 활용 계획 — 6×6.

    row 0 헤더 / row 1~5 = 데이터 5단계.
    col: 0=단계, 1=주요활동, 2=AI도구, 3=활용데이터, 4=활용목적, 5=구체적방법.
    """
    if idx >= len(tables):
        return
    tbl = tables[idx]
    rows = build_pbl_table_rows(data, "ai_tool_usage_plan")
    max_rows = min(5, tbl.row_count - 1)

    for r in range(1, tbl.row_count):
        for c in range(tbl.column_count):
            _set_cell_text(tbl, r, c, "")

    for i, row in enumerate(rows[:max_rows]):
        target_row = 1 + i
        _set_cell_text(tbl, target_row, 0, row.get("stage", ""))
        _set_cell_text(tbl, target_row, 1, row.get("main_activity", ""))
        _set_cell_text(tbl, target_row, 2, row.get("ai_tools", ""))
        _set_cell_text(tbl, target_row, 3, row.get("utilized_data", ""))
        _set_cell_text(tbl, target_row, 4, row.get("purpose", ""))
        _set_cell_text(tbl, target_row, 5, row.get("specific_method", ""))


def _fill_pbl_course_overview(tables, data, idx: int = 30):
    """Ⅳ-3-가 훈련과정 개요 — 2×2 (과정명/훈련기간)."""
    if idx >= len(tables):
        return
    tbl = tables[idx]
    _set_cell_text(tbl, 0, 1, data.get("training_plan_course_name") or "")
    _set_cell_text(tbl, 1, 1, data.get("training_period") or "")


def _fill_pbl_learning_group(tables, build_pbl_table_rows, data, idx: int = 31):
    """Ⅳ-3-나 학습그룹 구성 — 6×6.

    row 0 헤더 / row 1~2 훈련강사(외부/내부) / row 3~5 훈련생.
    col: 0=구분 / 1=역할(강사/훈련생 or 팀원/팀장) / 2=역할상세 /
         3=소속(부서) / 4=직위 / 5=성명.
    """
    if idx >= len(tables):
        return
    tbl = tables[idx]
    rows = build_pbl_table_rows(data, "learning_group")
    # 데이터 영역 reset
    for r in range(1, tbl.row_count):
        for c in range(tbl.column_count):
            _set_cell_text(tbl, r, c, "")

    max_rows = tbl.row_count - 1
    for i, row in enumerate(rows[:max_rows]):
        target_row = 1 + i
        _set_cell_text(tbl, target_row, 0, row.get("category", ""))
        _set_cell_text(tbl, target_row, 1, row.get("type", ""))
        _set_cell_text(tbl, target_row, 2, row.get("role", ""))
        _set_cell_text(tbl, target_row, 3, row.get("affiliation", ""))
        _set_cell_text(tbl, target_row, 4, row.get("position", ""))
        _set_cell_text(tbl, target_row, 5, row.get("name", ""))


def _fill_pbl_subject_profile(tables, build_pbl_table_rows, data, selected_methods, idx: int = 32):
    """Ⅳ-3-다 훈련 교과목 프로파일 — 15×10 (복합).

    row 0~1 헤더 / row 2~4 상단 고정(과정명·총훈련시간·훈련목표·AI도구·분석방법)
    row 5~8 훈련내용 3~4행 반복
    row 9 전체시간
    row 10~14 평가방법 (고정 양식 유지)
    """
    if idx >= len(tables):
        return
    tbl = tables[idx]
    # 플레이스홀더 치환으로 상단은 처리됐으므로 여기서는 주로 training_contents 반복 행 처리.
    contents = build_pbl_table_rows(data, "training_contents")
    # 데이터 행 위치는 원본 구조 기준 row 5~8로 가정, 최대 3행.
    data_start = 5
    max_rows = 3
    for offset in range(max_rows):
        r = data_start + offset
        if r >= tbl.row_count:
            break
        if offset < len(contents):
            row = contents[offset]
            try:
                _set_cell_text(tbl, r, 0, row.get("unit_name", ""))
                _set_cell_text(tbl, r, 1, row.get("detail", ""))
                _set_cell_text(tbl, r, 2, row.get("training_hours", ""))
                _set_cell_text(tbl, r, 3, row.get("external_hours", ""))
                _set_cell_text(tbl, r, 4, row.get("internal_hours", ""))
            except Exception:
                pass
        else:
            for c in range(min(5, tbl.column_count)):
                try:
                    _set_cell_text(tbl, r, c, "")
                except Exception:
                    pass


def _fill_pbl_facilities(tables, build_pbl_table_rows, data, idx: int = 34):
    """Ⅳ-3-라 시설·장비 — 3×5 (row 0 헤더 + row 1~2 데이터)."""
    if idx >= len(tables):
        return
    tbl = tables[idx]
    rows = build_pbl_table_rows(data, "facilities")
    max_rows = min(2, tbl.row_count - 1)

    for r in range(1, tbl.row_count):
        for c in range(tbl.column_count):
            _set_cell_text(tbl, r, c, "")

    for i, row in enumerate(rows[:max_rows]):
        target_row = 1 + i
        _set_cell_text(tbl, target_row, 0, row.get("seq", ""))
        _set_cell_text(tbl, target_row, 1, row.get("category", ""))
        _set_cell_text(tbl, target_row, 2, row.get("name", ""))
        _set_cell_text(tbl, target_row, 3, row.get("spec", ""))
        _set_cell_text(tbl, target_row, 4, row.get("location", ""))


def _fill_pbl_training_instructors(tables, build_pbl_table_rows, data, idx: int = 35):
    """Ⅳ-3-마 훈련강사 — 3×5."""
    if idx >= len(tables):
        return
    tbl = tables[idx]
    rows = build_pbl_table_rows(data, "training_instructors")
    max_rows = min(2, tbl.row_count - 1)

    for r in range(1, tbl.row_count):
        for c in range(tbl.column_count):
            _set_cell_text(tbl, r, c, "")

    for i, row in enumerate(rows[:max_rows]):
        target_row = 1 + i
        _set_cell_text(tbl, target_row, 0, row.get("name", ""))
        _set_cell_text(tbl, target_row, 1, row.get("internal_external", ""))
        _set_cell_text(tbl, target_row, 2, row.get("career_years", ""))
        _set_cell_text(tbl, target_row, 3, row.get("work_name", ""))
        _set_cell_text(tbl, target_row, 4, row.get("detailed_training_content", ""))


def _fill_pbl_course_evaluation(tables, build_pbl_table_rows, data, idx: int = 36):
    """Ⅳ-4-가 과정평가 계획 — 16×9 (복합).

    상단 row 0~2 = 과정명/평가대상/일자·기준/결과 — 플레이스홀더로 치환됨.
    중간 row 4~10 = 수행 체크리스트 7행 (업무단원명/평가기준/수준 1~5 체크 + √)
    row 11 총평 / row 12~15 = 척도 고정.
    """
    if idx >= len(tables):
        return
    tbl = tables[idx]
    checklist = build_pbl_table_rows(data, "performance_checklist")
    data_start = 4
    max_rows = min(7, tbl.row_count - data_start)

    # 체크리스트 영역 reset
    for r in range(data_start, data_start + 7):
        if r >= tbl.row_count:
            break
        for c in range(min(8, tbl.column_count)):
            try:
                _set_cell_text(tbl, r, c, "")
            except Exception:
                pass

    for i, row in enumerate(checklist[:max_rows]):
        r = data_start + i
        if r >= tbl.row_count:
            break
        _set_cell_text(tbl, r, 0, row.get("unit_name", ""))
        _set_cell_text(tbl, r, 1, row.get("evaluation_criteria", ""))
        level = int(row.get("performance_level") or 0)
        if 1 <= level <= 5:
            _set_cell_text(tbl, r, 1 + level, "√")


def _fill_pbl_performance_metrics(tables, data, idx: int = 39):
    """Ⅴ-1 성과분석 측정 지표 — 3×2 (row 0 헤더 / row 1 정량 / row 2 정성)."""
    if idx >= len(tables):
        return
    tbl = tables[idx]
    from _placeholders_pbl import _bulletize  # type: ignore
    _set_cell_text(tbl, 1, 1, _bulletize(data.get("quantitative_metrics")))
    _set_cell_text(tbl, 2, 1, _bulletize(data.get("qualitative_metrics")))


def _fill_pbl_dissemination(tables, data, idx: int = 40):
    """Ⅴ-2 성과 확산 전략 — 3×2 (row 1 내재화 / row 2 전사확산)."""
    if idx >= len(tables):
        return
    tbl = tables[idx]
    from _placeholders_pbl import _bulletize  # type: ignore
    _set_cell_text(tbl, 1, 1, _bulletize(data.get("internalization_plan")))
    _set_cell_text(tbl, 2, 1, _bulletize(data.get("dissemination_plan")))
