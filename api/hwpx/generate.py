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
import re
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


_ROADMAP_KEEP_BLUE = {"106"}  # 표지 제목 부제 '(기업명 – 대상 과업)'
_PBL_KEEP_BLUE = {"151"}      # 표지(과정개발) 제목 '㈜기업명'
_BLUE_TEXT_COLORS = {"#0000FF", "#2E74B5", "#3057B9"}


def _normalize_colors(hwpx_bytes: bytes, keep_blue_ids: set) -> bytes:
    """생성 HWPX 의 파랑 계열 charPr textColor 를 검정으로 정규화.

    양식이 파랑으로 세팅돼 있어도 채워지는 모든 텍스트를 검정 통일(사용자 요구).
    단 표지 제목 기업명 charPr(keep_blue_ids)만 파랑 유지. 흰색(헤더 배경)·
    빨강·회색 form 스타일은 보존.

    python-hwpx 에 charPr 색 setter 가 없어(RunStyle 읽기 전용) 저장된 zip 의
    header.xml textColor 속성만 직접 치환한다 — 구조 무변경(요소 추가·삭제 없이
    속성값만 변경)이므로 `_set_cell_text` 의 cell.element.set 과 동일 안전 범주.
    """
    import io
    import zipfile

    from lxml import etree

    head = "{http://www.hancom.co.kr/hwpml/2011/head}"
    zin = zipfile.ZipFile(io.BytesIO(hwpx_bytes))
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zout:
        for info in zin.infolist():
            data = zin.read(info.filename)
            if info.filename.endswith("header.xml"):
                root = etree.fromstring(data)
                for ch in root.iter(f"{head}charPr"):
                    tc = (ch.get("textColor") or "").upper()
                    if tc in _BLUE_TEXT_COLORS and ch.get("id") not in keep_blue_ids:
                        ch.set("textColor", "#000000")
                data = etree.tostring(
                    root, xml_declaration=True, encoding="UTF-8", standalone=True
                )
            zout.writestr(info, data)
    return buf.getvalue()


def _generate_roadmap(data: dict) -> bytes:
    """로드맵 HWPX 생성 — {{플레이스홀더}} 치환 방식 (산인공 양식 v2).

    **표 순번·셀 좌표를 전혀 참조하지 않는다.** 템플릿에 이미 심겨 있는 마커를
    값으로 바꿀 뿐이므로, 앞으로 양식에 표가 추가·삭제돼도 이 함수는 깨지지 않는다.
    좌표는 빌드 타임(`scripts/insert_placeholders.py`)에서만 쓰이며, 템플릿↔SSOT
    마커 정합은 `scripts/verify_hwpx_placeholders.py` 가 CI 에서 보증한다.
    """
    from hwpx import HwpxDocument

    doc = HwpxDocument.open(ROADMAP_TEMPLATE)
    _apply_markers(doc, _build_roadmap_markers(data))

    # 마커로 표현하기 어려운 텍스트 치환 (분할 run·문단·색 보존):
    #   1) 표지 제목 부제 '(기업명 – 대상 과업)' — cp106(파랑) 단일 run in-place
    #   2) AI 역량수준 3단계 체크박스 — 양식 '□ X'(cp8)/'(...)'(cp9) 2문단, 선택만 토글
    pairs: list[tuple[str, str]] = []
    company = _s(data.get("company_name"))
    target = _s(data.get("cover_target_task"))
    if company or target:
        pairs.append(("(기업명 – 대상 과업)", f"({company} – {target})"))
    level = _s(data.get("ai_competency_level")).upper()
    for label in ("초급", "중급", "고급"):
        pairs.append((f"☑ {label}", f"□ {label}"))
    selected = {"BEGINNER": "초급", "INTERMEDIATE": "중급", "ADVANCED": "고급"}.get(level)
    if selected:
        pairs.append((f"□ {selected}", f"☑ {selected}"))
    _replace_many_in_all_runs(doc, pairs)

    with tempfile.NamedTemporaryFile(delete=False, suffix=".hwpx") as tmp:
        path = tmp.name
    try:
        doc.save_to_path(path)
        with open(path, "rb") as f:
            raw = f.read()
    finally:
        if os.path.exists(path):
            os.unlink(path)
    return _normalize_colors(raw, _ROADMAP_KEEP_BLUE)


_MARKER_RE = re.compile(r"\{\{[^}]*\}\}")

# 양식 구조 상수 (SSOT: docs/references/hwpx-placeholders.json)
_RM_MAX_ACTIVITIES = 3   # Ⅰ-2 수행활동 차수
_RM_MAX_TASKS = 6        # Ⅱ-3 과업 분석표 행
_RM_MAX_COURSES = 6      # Ⅲ  훈련과정 명세서 표
_RM_MAX_SUBJECTS = 3     # Ⅲ  명세서당 교과목 행
# Ⅱ-3 직무 열의 (1,0) 셀은 rowSpan=2 병합 → 과업 0·1 이 같은 셀을 공유한다.
# 과업 1 의 직무 마커는 템플릿에 존재하지 않으므로 값도 만들지 않는다.
_RM_TASK_JOB_SKIP = {1}


def _s(v) -> str:
    """None-safe 문자열 변환."""
    return "" if v is None else str(v)


def _ensure_sentence_period(text: str) -> str:
    """서술형(종결어미 '다') 줄 끝에 온점(.) 보정 — 줄 단위.

    각 줄을 rstrip 후 '다'로 끝나면 온점을 부가한다. 명사형·개조식
    (강의/실습/확보/필요/~됨/~함/~음)은 '다'로 끝나지 않아 자동 무변경이며,
    이미 종결부호(., !, ? 등)로 끝난 줄은 '다' 미종결이라 이중 온점이 생기지 않는다.
    """
    out = []
    for line in text.split("\n"):
        stripped = line.rstrip()
        if stripped.endswith("다"):
            out.append(stripped + ".")
        else:
            out.append(line)
    return "\n".join(out)


def _apply_sentence_periods(m: dict) -> None:
    """마커 값 전체에 서술형 온점 보정(제자리). 샘플·production 공통 단일 지점.

    체크박스(☑/□)·날짜·라벨·명사형 값은 '다'로 끝나지 않아 무변경이므로
    화이트리스트 없이 전 값에 적용해도 안전하다(자기조정형).
    """
    for k, v in m.items():
        if isinstance(v, str) and v:
            m[k] = _ensure_sentence_period(v)


def _build_roadmap_markers(data: dict) -> dict:
    """payload → {{마커}}: 값 매핑."""
    m: dict = {}

    # ── 표지
    m["{{roadmap_cover_company_name}}"] = _s(data.get("company_name"))
    m["{{roadmap_cover_target_task}}"] = _s(data.get("cover_target_task"))
    m["{{roadmap_cover_report_date}}"] = _s(data.get("report_date"))
    m["{{roadmap_cover_pm_affiliation}}"] = _s(data.get("pm_affiliation"))
    m["{{roadmap_cover_pm_name}}"] = _s(data.get("pm_name"))
    m["{{roadmap_cover_internal_expert_affiliation}}"] = _s(
        data.get("internal_expert_affiliation")
    )
    m["{{roadmap_cover_internal_expert_name}}"] = _s(data.get("internal_expert_name"))

    # ── Ⅰ-1 수립 배경
    m["{{roadmap_overview_establishment_necessity}}"] = _s(
        data.get("establishment_necessity")
    )

    # ── Ⅰ-2 주요 활동 (차수당 PM·내부전문가 2행)
    acts = data.get("performance_activities") or []
    for i in range(_RM_MAX_ACTIVITIES):
        a = acts[i] if i < len(acts) else {}
        m[f"{{{{roadmap_overview_performance_{i}_date}}}}"] = _s(a.get("date"))
        m[f"{{{{roadmap_overview_performance_{i}_content}}}}"] = _s(a.get("content"))
        m[f"{{{{roadmap_overview_performance_{i}_method}}}}"] = _s(a.get("method"))
        parts = a.get("participants") or []
        pm = next((p.get("name") for p in parts if "PM" in _s(p.get("role"))), "")
        expert = next(
            (p.get("name") for p in parts if "내부" in _s(p.get("role"))), ""
        )
        m[f"{{{{roadmap_overview_performance_{i}_pm_name}}}}"] = _s(pm)
        m[f"{{{{roadmap_overview_performance_{i}_expert_name}}}}"] = _s(expert)

    # ── Ⅰ-3 수립 주요 결과 (체크박스 + 선정 과업 + 요약)
    level = _s(data.get("ai_competency_level")).upper()
    for key, want in (
        ("beginner", "BEGINNER"),
        ("intermediate", "INTERMEDIATE"),
        ("advanced", "ADVANCED"),
    ):
        m[f"{{{{cb_roadmap_level_{key}}}}}"] = "☑" if level == want else "□"
    m["{{roadmap_outcome_selected_tasks}}"] = _s(data.get("selected_tasks_text"))
    m["{{roadmap_outcome_main_content}}"] = _s(data.get("roadmap_summary"))

    # ── Ⅱ-1 HRD이음 진단 보고서 (URL 은 본문 노출 금지 → 별첨 안내로 대체)
    hrd = _s(data.get("hrd_report_attachment"))
    m["{{roadmap_requirements_hrd_report}}"] = (
        "※ HRD이음 진단 보고서는 별첨 페이지 참조" if hrd.startswith("http") else hrd
    )

    # ── Ⅱ-2 기업 요구분석
    for field in (
        "company_status",
        "main_problems",
        "push_willingness",
        "expected_outcomes",
    ):
        m[f"{{{{roadmap_requirements_{field}}}}}"] = _s(data.get(field))
        m[f"{{{{roadmap_requirements_{field}_remarks}}}}"] = _s(
            data.get(f"{field}_remarks")
        )

    # ── Ⅱ-3 과업·워크플로우 분석표
    tasks = data.get("task_workflow_items") or []
    for i in range(_RM_MAX_TASKS):
        t = tasks[i] if i < len(tasks) else {}
        if i not in _RM_TASK_JOB_SKIP:
            m[f"{{{{roadmap_task_{i}_job}}}}"] = _s(t.get("job"))
        m[f"{{{{roadmap_task_{i}_task}}}}"] = _s(t.get("task"))
        m[f"{{{{roadmap_task_{i}_as_is}}}}"] = _s(t.get("as_is"))
        m[f"{{{{roadmap_task_{i}_improvement}}}}"] = _s(t.get("improvement"))

    # ── Ⅱ-3 AI 적용 대상 과업 선정
    tt = data.get("training_target") or {}
    m["{{roadmap_target_task_name}}"] = _s(tt.get("task_name"))
    m["{{roadmap_target_selection_reason}}"] = _s(tt.get("selection_reason"))
    m["{{roadmap_target_as_is}}"] = _s(tt.get("as_is"))
    m["{{roadmap_target_to_be}}"] = _s(tt.get("to_be"))

    # ── Ⅲ 훈련실시 계획 제안 — 훈련과정 명세서 6개
    specs = data.get("course_specs") or []
    for i in range(_RM_MAX_COURSES):
        s = specs[i] if i < len(specs) else {}
        for field in (
            "training_period",
            "training_level",
            "course_name",
            "training_method",
            "recommended_program",
            "training_target",
            "training_goal",
            "main_content",
        ):
            m[f"{{{{roadmap_course_{i}_{field}}}}}"] = _s(s.get(field))

        subjects = s.get("subjects") or []
        for j in range(_RM_MAX_SUBJECTS):
            subj = subjects[j] if j < len(subjects) else {}
            details = subj.get("details")
            # details 는 리스트(줄 단위) 또는 문자열 — 항목마다 글머리(▪)를 부여하고
            # 줄바꿈으로 셀에 분배(세부내용 셀은 좌측 정렬 — insert_placeholders 지정).
            if isinstance(details, list):
                items = [_s(d) for d in details if _s(d).strip()]
            else:
                items = [ln for ln in _s(details).split("\n") if ln.strip()]
            details_text = "\n".join(f"▪ {it}" for it in items)
            base = f"{{{{roadmap_course_{i}_subject_{j}_"
            m[base + "subject_name}}"] = _s(subj.get("subject_name"))
            m[base + "details}}"] = details_text
            m[base + "hours}}"] = _s(subj.get("hours"))

    _apply_sentence_periods(m)
    return m


def _apply_markers(doc, markers: dict) -> None:
    """문서 전체(본문 + 표 셀)의 마커를 값으로 치환.

    표 셀은 `_set_cell_text` 로 기입하여 줄바꿈이 paragraph 로 분배되고
    lineWrap=BREAK 가 적용되도록 한다(글자 겹침 방지). 값이 매핑되지 않은
    잔존 마커는 빈 문자열로 지워 산출물에 `{{...}}` 가 남지 않게 한다.
    """
    for para in doc.paragraphs:
        for tbl in para.tables:
            for ri in range(tbl.row_count):
                for ci in range(tbl.column_count):
                    try:
                        cell = tbl.cell(ri, ci)
                    except Exception:
                        continue
                    text = "".join(
                        run.text or "" for p in cell.paragraphs for run in p.runs
                    )
                    if "{{" not in text:
                        continue
                    for key, value in markers.items():
                        if key in text:
                            text = text.replace(key, value)
                    text = _MARKER_RE.sub("", text)
                    _set_cell_text(tbl, ri, ci, text)

    # 본문 단락 (표지 일자 등)
    for para in doc.paragraphs:
        for run in para.runs:
            if not run.text or "{{" not in run.text:
                continue
            text = run.text
            for key, value in markers.items():
                if key in text:
                    text = text.replace(key, value)
            run.text = _MARKER_RE.sub("", text)


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


_HP_NS = "{http://www.hancom.co.kr/hwpml/2011/paragraph}"


def _approx_text_width(s: str) -> int:
    """텍스트의 렌더 폭 근사(HWPX 단위). CJK/전각 기호 ≈ 1000, ASCII ≈ 550,
    공백 ≈ 400. 셀 폭(cellSz.width)과 비교해 SQUEEZE 로 한 줄에 담을 수 있는지
    판정한다(정확한 폰트 메트릭 대신 근사 — lineWrap 결정용으로 충분)."""
    width = 0
    for ch in s:
        if ch in (" ", "\t"):
            width += 400
        elif ch.isascii():
            width += 550
        else:
            width += 1000
    return width


def _set_cell_text(tbl, row: int, col: int, text: str) -> None:
    """표 셀의 값을 설정 (multi-line = paragraph 분배).

    공식 API 우선. 셀의 subList lineWrap 속성은 OWPML attribute setter 로
    BREAK 로 변경 (한컴오피스의 셀 폭 끝 단어 단위 자동 wrap 활성).

    핵심 원칙:
    1. 셀 내부 모든 paragraph 의 모든 run text 를 무조건 비움 (placeholder 흔적 완전 제거).
    2. text 를 '\n' 기준으로 분할. 각 줄을 paragraph[i].runs[0] 에 1:1 매핑.
       자동 분할 (구 `_smart_wrap`) 은 한국어 의미 단위·번호 매김·어미 무시
       하고 강제 분할하여 문장 중간 끊김을 일으켰으므로 제거. 대신 셀 내부
       subList 의 lineWrap 을 BREAK 로 설정해 한컴오피스가 셀 폭 끝에서 단어
       단위 자연 wrap 하도록 위임.
    3. **줄 수 > 템플릿 paragraph 수** 인 경우 `cell.add_paragraph(...)` 로
       부족한 paragraph 를 동적 추가 + 첫 paragraph 의 paraPrIDRef·
       styleIDRef·charPrIDRef 를 명시 전달 (한컴오피스 폰트 일관성 보장 —
       python-hwpx Cell.add_paragraph 는 None 전달 시 기본 글꼴로 폴백).
    4. 줄 수 < 템플릿 paragraph 수 인 경우 잉여 paragraph 를 제거(트림)하여
       하단 빈 문단 여백·자동 글머리(BULLET) 고정 개수를 방지 (최소 1 유지).
    5. (Phase E) 셀의 subList lineWrap 을 BREAK 로 설정. 양식 원본이 SQUEEZE
       또는 누락 상태이면 한컴오피스가 셀 폭 초과 텍스트를 압축 렌더해 글자
       겹침이 발생하므로, 단어 wrap 으로 강제 전환.
    """
    if row < 0 or row >= tbl.row_count or col < 0 or col >= tbl.column_count:
        return
    try:
        cell = tbl.cell(row, col)
    except Exception:
        return
    if not cell.paragraphs:
        return

    # Step 1: 기존 paragraph 의 모든 run text 무조건 비움
    for p in cell.paragraphs:
        for r in p.runs:
            r.text = ""

    # Step 2: 입력 텍스트 정규화 + 줄바꿈 분할 (자동 분할 비활성)
    text = text if text is not None else ""
    lines = text.split("\n") if text else [""]

    # Step 3: 줄 수가 paragraph 수보다 많으면 부족분을 동적 추가
    #   첫 paragraph 의 paraPrIDRef·styleIDRef·charPrIDRef 를 명시 전달하여
    #   한컴오피스 렌더링에서 같은 셀 안 줄별 폰트가 통일되도록 한다.
    existing_paragraphs = list(cell.paragraphs)
    first_p = existing_paragraphs[0]
    first_para_id = first_p.para_pr_id_ref
    first_style_id = first_p.style_id_ref
    first_char_id = first_p.runs[0].char_pr_id_ref if first_p.runs else None
    while len(existing_paragraphs) < len(lines):
        new_p = cell.add_paragraph(
            "",
            para_pr_id_ref=first_para_id,
            style_id_ref=first_style_id,
            char_pr_id_ref=first_char_id,
        )
        existing_paragraphs.append(new_p)

    # Step 4: 각 줄을 각 paragraph.runs[0] 에 1:1 기입
    for i, p in enumerate(existing_paragraphs):
        if not p.runs:
            continue
        p.runs[0].text = lines[i] if i < len(lines) else ""

    # Step 4.5: 잉여 문단 트림 — 내용 줄 수보다 많은 문단 제거 (하단 여백·자동
    #   글머리 고정 개수 방지). split 결과는 항상 ≥1 이므로 최소 1 문단 유지.
    for p in list(cell.paragraphs)[len(lines):]:
        parent = p.element.getparent()
        if parent is not None:
            parent.remove(p.element)

    # Step 5: 셀 폭 기반 lineWrap 결정.
    #   양식은 셀마다 lineWrap 을 다르게 설계한다 — 짧은 고정 셀(일시·방법·차수)은
    #   SQUEEZE(자간 압축해 한 줄), 긴 자유텍스트 셀은 BREAK(줄바꿈). 무조건 BREAK 로
    #   덮으면 '14:00~17:00' 같은 짧은 값이 셀 폭을 넘겨 마지막 글자가 다음 줄로 깨진다.
    #   → 내용이 셀 폭(SQUEEZE 압축 여유 25% 포함)에 들어가면 양식 원본 lineWrap 을
    #     유지하고, 넘칠 때만 BREAK 로 전환해 긴 내용의 글자 겹침을 막는다.
    #   python-hwpx 에 공식 setter 가 없어 OWPML subList/cellSz element 를 직접 참조.
    try:
        cell._ensure_sublist()
        sublist_elem = cell.element.find(f"{_HP_NS}subList")
        if sublist_elem is not None:
            csz = cell.element.find(f"{_HP_NS}cellSz")
            cw = csz.get("width") if csz is not None else None
            cell_w = int(cw) if cw and cw.isdigit() else 0
            max_line_w = max((_approx_text_width(ln) for ln in lines), default=0)
            overflow = (
                max_line_w > cell_w * 1.25
                if cell_w
                else max((len(ln) for ln in lines), default=0) > 22
            )
            if overflow and sublist_elem.get("lineWrap") != "BREAK":
                sublist_elem.set("lineWrap", "BREAK")
    except Exception:
        pass


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
# PBL HWPX 생성 (Step 10) — {{플레이스홀더}} 치환 방식 (산인공 양식 v2)
# ===============================================================
#
# 로드맵과 동일한 패턴을 따른다 (PR 1):
# - 표 순번·셀 좌표를 전혀 참조하지 않는다. 템플릿에 이미 심긴 마커를 값으로
#   바꿀 뿐이므로, 양식에 표가 추가·삭제돼도 이 함수는 깨지지 않는다.
# - 좌표는 빌드 타임(scripts/insert_placeholders.py)에서만 쓰이며, 템플릿↔SSOT
#   마커 정합은 scripts/verify_hwpx_placeholders.py 가 CI 에서 보증한다.
# - 셀은 `_set_cell_text`(lineWrap=BREAK) 로 기입한다(글자 겹침 방지).
#
# 마커로 표현하기 어려운 두 부류는 본문/셀 텍스트 직접 치환으로 처리한다:
#   1) 표지 제목·기업명 — T1/T42 셀 내부가 여러 run·paragraph 로 분할돼 있어
#      마커 삽입 시 서식이 깨진다. `(훈련과정명)`·`㈜기업명 기재` 부분 문자열만 치환.
#   2) 양식 고정 인라인 체크박스 — 훈련목표 5종(Ⅰ-개요·Ⅳ-2 동일 문자열)·
#      과정평가 방법 3종. `□ 라벨` → `☑ 라벨` 텍스트 치환.
# ===============================================================


def _generate_pbl(data: dict) -> bytes:
    """PBL HWPX 생성 — {{플레이스홀더}} 치환 방식 (산인공 PBL 양식 v2).

    로드맵(`_generate_roadmap`)과 동일하게 표 순번·셀 좌표를 참조하지 않는다.
    """
    from hwpx import HwpxDocument
    from _placeholders_pbl import TRAINING_GOAL_LABELS, COURSE_EVALUATION_METHODS

    doc = HwpxDocument.open(PBL_TEMPLATE)

    # 1) 마커 일괄 치환 (본문 단락 + 표 셀)
    _apply_markers(doc, _build_pbl_markers(data))

    # 2) 마커로 표현하기 어려운 텍스트 치환을 1 회 순회로 일괄 적용:
    #    - 표지 제목·기업명 (T1/T42 셀 내부 분할 run)
    #    - 훈련목표 5종 (Ⅰ-개요 r14 + Ⅳ-2 본문, 동일 문자열) + 과정평가 방법 3종 체크박스
    #    체크박스는 "리셋(☑/☐→□) 전부 → 선택 토글(□→☑)" 순서로 pairs 를 쌓아
    #    한 run 안에서 순차 적용돼도 정확히 동작한다.
    pairs: list[tuple[str, str]] = []
    course_name = _s(data.get("course_name"))
    company_name = _s(data.get("company_name"))
    if course_name:
        pairs.append(("(훈련과정명)", f"({course_name})"))
    if company_name:
        pairs.append(("㈜기업명 기재", company_name))
    for label in TRAINING_GOAL_LABELS:
        pairs.append((f"☑ {label}", f"□ {label}"))
        pairs.append((f"☐ {label}", f"□ {label}"))
    for label in COURSE_EVALUATION_METHODS:
        pairs.append((f"☑ {label}", f"□ {label}"))
    for label in set(data.get("training_goals") or []):
        if label in TRAINING_GOAL_LABELS:
            pairs.append((f"□ {label}", f"☑ {label}"))
    for label in set(data.get("course_evaluation_methods") or []):
        if label in COURSE_EVALUATION_METHODS:
            pairs.append((f"□ {label}", f"☑ {label}"))
    # AI 역량수준 3단계 체크박스 (Ⅱ-1-나 T10) — 양식 '□ X'/'(...)'2문단 보존, 선택만 토글
    level = _s(data.get("roadmap_ai_level")).upper()
    for label in ("초급", "중급", "고급"):
        pairs.append((f"☑ {label}", f"□ {label}"))
    selected = {"BEGINNER": "초급", "INTERMEDIATE": "중급", "ADVANCED": "고급"}.get(level)
    if selected:
        pairs.append((f"□ {selected}", f"☑ {selected}"))
    # Ⅲ-1 수행차수 3행 양식 리터럴 '...차' → '3차'
    pairs.append(("...차", "3차"))
    _replace_many_in_all_runs(doc, pairs)

    # 3) 저장
    with tempfile.NamedTemporaryFile(delete=False, suffix=".hwpx") as tmp:
        path = tmp.name
    try:
        doc.save_to_path(path)
        with open(path, "rb") as f:
            raw = f.read()
    finally:
        if os.path.exists(path):
            os.unlink(path)
    return _normalize_colors(raw, _PBL_KEEP_BLUE)


def _replace_many_in_all_runs(doc, pairs) -> None:
    """여러 (old, new) 치환을 본문 + 표 셀(중첩 포함) 전체에 1 회 순회로 적용.

    `_replace_in_all_runs` 를 pair 수만큼 반복하면 매번 전 표를 순회해 느리다
    (양식 표 54개 × 셀). 체크박스·표지 치환을 한 번의 순회로 묶어 처리한다.
    pairs 는 순서대로 각 run 텍스트에 적용된다(리셋→토글 순서 보존).
    """
    if not pairs:
        return

    def _apply(text: str) -> str:
        for old, new in pairs:
            if old in text:
                text = text.replace(old, new)
        return text

    def _walk_table(tbl) -> None:
        for ri in range(tbl.row_count):
            for ci in range(tbl.column_count):
                try:
                    cell = tbl.cell(ri, ci)
                except Exception:
                    continue
                for cp in cell.paragraphs:
                    for run in cp.runs:
                        if run.text:
                            nt = _apply(run.text)
                            if nt != run.text:
                                run.text = nt
                    for ntbl in cp.tables:
                        _walk_table(ntbl)

    for para in doc.paragraphs:
        for run in para.runs:
            if run.text:
                nt = _apply(run.text)
                if nt != run.text:
                    run.text = nt
        for tbl in para.tables:
            _walk_table(tbl)


# 양식 구조 상수 (SSOT: docs/references/hwpx-placeholders.json)
_PBL_MAX_SETUP_ACTS = 3    # Ⅱ-1-나 주요 활동 차수 (T9)
_PBL_MAX_PERF_ACTS = 3     # Ⅲ-1 수행활동 차수 (T19)
_PBL_MAX_TASKS = 5         # Ⅱ-2-다 과업 분석표 행 (T15)
_PBL_MAX_SELECTIONS = 5    # Ⅲ-3-가 훈련대상 업무 선정 행 (T23)
_PBL_MAX_DETAILS = 2       # Ⅲ-3-다 세부내용 행 (T26)
_PBL_MAX_TOOLS = 3         # Ⅳ-3 AI도구 활용 계획 행 (T31)
_PBL_MAX_GROUP = 5         # Ⅳ-4-나 학습그룹 행 (T34)
_PBL_MAX_CONTENTS = 3      # Ⅳ-4-다 훈련내용 행 (T35 r7~9)
_PBL_MAX_FACILITIES = 2    # Ⅳ-4-라 시설·장비 행 (T37)
_PBL_MAX_INSTRUCTORS = 2   # Ⅳ-4-마 훈련강사 행 (T38)
_PBL_MAX_CHECKLIST = 7     # Ⅳ-5-가 수행 체크리스트 행 (T39 r7~13)

# Ⅲ-3-가 직무 열(col 0)의 (1,0) 셀은 rowSpan=2 병합 → 과업 0·1 이 같은 셀을 공유.
# 과업 1 의 직무 마커는 템플릿에 없으므로 값도 만들지 않는다(로드맵 R-10 동일).
_PBL_SELECTION_JOB_SKIP = {1}


def _to_int(v):
    """숫자 문자열/실수 → int (실패 시 None)."""
    if v is None or str(v).strip() == "":
        return None
    try:
        return int(float(str(v)))
    except (TypeError, ValueError):
        return None


def _join_list(v) -> str:
    """리스트 → 줄바꿈 결합 (문자열은 그대로)."""
    if isinstance(v, (list, tuple)):
        return "\n".join(_s(x) for x in v if _s(x).strip())
    return _s(v)


def _pbl_industry(data: dict) -> str:
    code = _s(data.get("industry_code"))
    main = _s(data.get("industry_main"))
    if code and main:
        return f"업종코드: {code}  주업종: {main}"
    return main or code


def _pbl_address_block(data: dict) -> str:
    """주소·훈련실시주소 값 셀은 rowSpan=2 병합(1 셀) → 한 셀에 조합."""
    addr = _s(data.get("address"))
    training = _s(data.get("training_address"))
    if training and training != addr:
        return f"{addr}\n(훈련실시: {training})".strip() if addr else f"훈련실시: {training}"
    return addr


def _pbl_hours(v) -> str:
    s = _s(v).strip()
    return f"{s} 시간" if s else ""


def _pbl_count(v) -> str:
    s = _s(v).strip()
    return f"{s} 명" if s else ""


def _pbl_characteristics(data: dict) -> str:
    career = _s(data.get("target_career"))
    level = _s(data.get("target_level"))
    lines = []
    if career:
        lines.append(f"(업무 경력) {career}")
    if level:
        lines.append(f"(수준) {level}")
    return "\n".join(lines)


def _pbl_ai_infra(data: dict) -> str:
    tools = _s(data.get("ai_tools_status"))
    network = _s(data.get("network_status"))
    pc = data.get("pc_count")
    etc = _s(data.get("etc_equipment"))
    lines = []
    if tools:
        lines.append(f"AI 도구 사용 가능 환경: {tools}")
    if network:
        lines.append(f"네트워크 환경: {network}")
    if pc is not None and _s(pc).strip() != "":
        lines.append(f"PC 보유 현황: {pc} 대")
    if etc:
        lines.append(f"기타 장비: {etc}")
    return "\n".join(lines)


def _build_pbl_markers(data: dict) -> dict:
    """payload → {{마커}}: 값 매핑 (로드맵 `_build_roadmap_markers` 미러)."""
    m: dict = {}

    # ── 표지 서명표 (T2) + 일자 (본문 앵커)
    m["{{pbl_cover_pm_affiliation}}"] = _s(data.get("pm_affiliation"))
    m["{{pbl_cover_pm_name}}"] = _s(data.get("pm_name"))
    m["{{pbl_cover_external_expert_affiliation}}"] = _s(data.get("external_expert_affiliation"))
    m["{{pbl_cover_external_expert_name}}"] = _s(data.get("external_expert_name"))
    m["{{pbl_cover_internal_expert_affiliation}}"] = _s(data.get("internal_expert_affiliation"))
    m["{{pbl_cover_internal_expert_name}}"] = _s(data.get("internal_expert_name"))
    m["{{pbl_cover_doctor_affiliation}}"] = _s(data.get("doctor_affiliation"))
    m["{{pbl_cover_doctor_name}}"] = _s(data.get("doctor_name"))
    m["{{pbl_cover_report_date}}"] = _s(data.get("report_date"))

    # ── Ⅰ. 훈련과정 개요 (T4)
    m["{{pbl_overview_company_name}}"] = _s(data.get("company_name"))
    m["{{pbl_overview_business_no}}"] = _s(data.get("business_registration_no"))
    m["{{pbl_overview_industry}}"] = _pbl_industry(data)
    m["{{pbl_overview_address}}"] = _pbl_address_block(data)
    m["{{pbl_overview_branch}}"] = _s(data.get("jurisdiction_office"))
    m["{{pbl_overview_contact_position}}"] = _s(data.get("contact_position"))
    m["{{pbl_overview_contact_name}}"] = _s(data.get("contact_name"))
    m["{{pbl_overview_contact_phone}}"] = _s(data.get("contact_phone"))
    m["{{pbl_overview_contact_email}}"] = _s(data.get("contact_email"))
    m["{{pbl_overview_course_name}}"] = _s(data.get("course_name"))
    m["{{pbl_overview_ncs_code}}"] = _s(data.get("ncs_code"))
    m["{{pbl_overview_training_hours}}"] = _pbl_hours(data.get("training_hours"))
    m["{{pbl_overview_training_target}}"] = _s(data.get("training_target_label"))
    m["{{pbl_overview_training_job}}"] = _s(data.get("training_job"))

    # ── Ⅱ-1-나 AI훈련 로드맵 수립 (T8 배경 / T9 주요 활동 / T10 결과)
    m["{{pbl_roadmap_setup_background}}"] = _s(data.get("roadmap_setup_background"))
    setup_acts = data.get("roadmap_setup_activities") or []
    for i in range(_PBL_MAX_SETUP_ACTS):
        a = setup_acts[i] if i < len(setup_acts) else {}
        m[f"{{{{pbl_roadmap_activity_{i}_date}}}}"] = _s(a.get("date"))
        m[f"{{{{pbl_roadmap_activity_{i}_content}}}}"] = _s(a.get("content"))
        m[f"{{{{pbl_roadmap_activity_{i}_method}}}}"] = _s(a.get("method"))
        m[f"{{{{pbl_roadmap_activity_{i}_pm_name}}}}"] = _s(a.get("pm_name"))
        m[f"{{{{pbl_roadmap_activity_{i}_expert_name}}}}"] = _s(a.get("expert_name"))
    level = _s(data.get("roadmap_ai_level")).upper()
    for key, want in (("beginner", "BEGINNER"), ("intermediate", "INTERMEDIATE"), ("advanced", "ADVANCED")):
        m[f"{{{{cb_pbl_roadmap_level_{key}}}}}"] = "☑" if level == want else "□"
    m["{{pbl_roadmap_selected_task}}"] = _s(data.get("roadmap_selected_task"))

    # ── Ⅱ-1-다 AI훈련과정 개발 필요성 (T11)
    m["{{pbl_analysis_course_necessity}}"] = _s(data.get("course_necessity"))

    # ── Ⅱ-2-가 기업 AI 역량 수준 진단 — HRD이음 (T13, URL fallback)
    from _placeholders_roadmap import _hrd_attachment_text
    m["{{pbl_analysis_hrd_report_attachment}}"] = _hrd_attachment_text(
        data.get("hrd_report_attachment")
    )

    # ── Ⅱ-2-나 기업 요구분석 (T14)
    m["{{pbl_req_company_status}}"] = _s(data.get("roadmap_req_company_status"))
    m["{{pbl_req_main_problems}}"] = _s(data.get("roadmap_req_main_problems"))
    m["{{pbl_req_push_willingness}}"] = _s(data.get("roadmap_req_push_willingness"))
    m["{{pbl_req_expected_outcomes}}"] = _s(data.get("roadmap_req_expected_outcomes"))

    # ── Ⅱ-2-다 과업·워크플로우 분석표 (T15)
    tasks = data.get("roadmap_task_analysis") or []
    for i in range(_PBL_MAX_TASKS):
        t = tasks[i] if i < len(tasks) else {}
        m[f"{{{{pbl_task_{i}_job}}}}"] = _s(t.get("job"))
        m[f"{{{{pbl_task_{i}_task}}}}"] = _s(t.get("task"))
        m[f"{{{{pbl_task_{i}_as_is}}}}"] = _s(t.get("as_is"))
        m[f"{{{{pbl_task_{i}_improvement}}}}"] = _s(t.get("improvement"))

    # ── Ⅱ-2 훈련대상 과업 선정 (T16)
    tt = data.get("roadmap_target_task") or {}
    m["{{pbl_target_task_name}}"] = _s(tt.get("name"))
    m["{{pbl_target_task_reason}}"] = _s(tt.get("reason"))
    m["{{pbl_target_task_as_is}}"] = _s(tt.get("as_is"))
    m["{{pbl_target_task_to_be}}"] = _s(tt.get("to_be"))

    # ── Ⅱ-3 기업 훈련환경 분석 (T17)
    m["{{pbl_env_proper_hours}}"] = _pbl_hours(data.get("proper_training_hours"))
    m["{{pbl_env_place_location}}"] = _s(data.get("training_place_location"))
    m["{{pbl_env_place_special}}"] = _s(data.get("training_place_special_notes"))
    m["{{pbl_env_instructor_name}}"] = _s(data.get("internal_instructor_name"))
    m["{{pbl_env_instructor_position}}"] = _s(data.get("internal_instructor_position"))
    m["{{pbl_env_target_count}}"] = _pbl_count(data.get("target_count"))
    m["{{pbl_env_target_characteristics}}"] = _pbl_characteristics(data)
    m["{{pbl_env_ai_infra}}"] = _pbl_ai_infra(data)
    m["{{pbl_env_needs_analysis}}"] = _s(data.get("training_needs_analysis"))
    m["{{pbl_env_expectation_as_is}}"] = _s(data.get("expectation_as_is"))
    m["{{pbl_env_expectation_to_be}}"] = _s(data.get("expectation_to_be"))

    # ── Ⅲ-1 훈련과제 도출 수행활동 (T19) — 로드맵 PM(offset0)/기업내부전문가(offset2)
    perf = data.get("roadmap_perf_activities") or []
    for i in range(_PBL_MAX_PERF_ACTS):
        a = perf[i] if i < len(perf) else {}
        # Ⅲ-1 수행활동은 일자만 표기 (양식) — 로드맵 연계 date 의 시간 줄 제거
        m[f"{{{{pbl_perf_{i}_date}}}}"] = _s(a.get("date")).split("\n", 1)[0]
        m[f"{{{{pbl_perf_{i}_content}}}}"] = _s(a.get("content"))
        m[f"{{{{pbl_perf_{i}_method}}}}"] = _s(a.get("method"))
        m[f"{{{{pbl_perf_{i}_pm_name}}}}"] = _s(a.get("pm_name"))
        m[f"{{{{pbl_perf_{i}_expert_name}}}}"] = _s(a.get("expert_name"))

    # ── Ⅲ-2-가 문제 정의서 (T21)
    sheet = data.get("problem_definition_sheet") or {}
    m["{{pbl_problem_background}}"] = _s(sheet.get("background"))
    m["{{pbl_problem_core}}"] = _s(sheet.get("core"))
    m["{{pbl_problem_scope}}"] = _s(sheet.get("scope"))
    m["{{pbl_problem_constraints}}"] = _s(sheet.get("constraints"))

    # ── Ⅲ-3-가 훈련대상 업무 선정 (T23) — 직무 col 은 i=1 병합 skip
    sels = data.get("roadmap_task_selections") or []
    for i in range(_PBL_MAX_SELECTIONS):
        s = sels[i] if i < len(sels) else {}
        if i not in _PBL_SELECTION_JOB_SKIP:
            m[f"{{{{pbl_selection_{i}_job}}}}"] = _s(s.get("job"))
        m[f"{{{{pbl_selection_{i}_task}}}}"] = _s(s.get("task"))
        m[f"{{{{pbl_selection_{i}_as_is}}}}"] = _s(s.get("as_is"))
        m[f"{{{{pbl_selection_{i}_improvement}}}}"] = _s(s.get("improvement"))
        m[f"{{{{pbl_selection_{i}_ai_necessity}}}}"] = _s(s.get("ai_necessity"))
        m[f"{{{{pbl_selection_{i}_training_selected}}}}"] = (
            "☑" if s.get("training_selected") else "☐"
        )

    # ── Ⅲ-3-나 AI기반 문제해결의 필요성 (T24)
    m["{{pbl_tasks_target_necessity}}"] = _s(data.get("target_necessity"))

    # ── Ⅲ-3-다 훈련대상 업무 세부내용 (T26)
    details = data.get("target_details") or []
    for i in range(_PBL_MAX_DETAILS):
        d = details[i] if i < len(details) else {}
        m[f"{{{{pbl_detail_{i}_title}}}}"] = _s(d.get("title"))
        m[f"{{{{pbl_detail_{i}_as_is}}}}"] = _s(d.get("as_is"))
        m[f"{{{{pbl_detail_{i}_to_be}}}}"] = _s(d.get("to_be"))
        m[f"{{{{pbl_detail_{i}_required_knowledge}}}}"] = _s(d.get("required_knowledge"))
        m[f"{{{{pbl_detail_{i}_required_skill}}}}"] = _s(d.get("required_skill"))

    # ── Ⅳ-1 훈련 목표 (T28)
    m["{{pbl_ops_training_goal}}"] = _s(data.get("training_goal"))

    # ── Ⅳ-2 성과분석 측정 지표 (T29)
    m["{{pbl_ops_quantitative_metrics}}"] = _s(data.get("quantitative_metrics"))
    m["{{pbl_ops_qualitative_metrics}}"] = _s(data.get("qualitative_metrics"))

    # ── Ⅳ-3 AI도구 활용 계획 (T31)
    tools = data.get("ai_tool_usage_plan") or []
    for i in range(_PBL_MAX_TOOLS):
        t = tools[i] if i < len(tools) else {}
        m[f"{{{{pbl_ops_tool_{i}_stage}}}}"] = _s(t.get("stage"))
        m[f"{{{{pbl_ops_tool_{i}_main_activity}}}}"] = _s(t.get("main_activity"))
        m[f"{{{{pbl_ops_tool_{i}_ai_tools}}}}"] = _join_list(t.get("ai_tools"))
        m[f"{{{{pbl_ops_tool_{i}_utilized_data}}}}"] = _s(t.get("utilized_data"))
        m[f"{{{{pbl_ops_tool_{i}_purpose}}}}"] = _s(t.get("purpose"))
        m[f"{{{{pbl_ops_tool_{i}_specific_method}}}}"] = _s(t.get("specific_method"))

    # ── Ⅳ-4-가 훈련과정 개요 (T33)
    m["{{pbl_ops_course_name}}"] = _s(data.get("training_plan_course_name"))
    m["{{pbl_ops_training_period}}"] = _s(data.get("training_period"))

    # ── Ⅳ-4-나 학습그룹 구성 (T34) — 강사→훈련생 순, 소속/직위/성명만 (구분·역할 양식 고정)
    group = data.get("learning_group") or {}
    lg_rows = []
    for ins in (group.get("instructors") or []):
        lg_rows.append(ins if isinstance(ins, dict) else {})
    for tr in (group.get("trainees") or []):
        lg_rows.append(tr if isinstance(tr, dict) else {})
    for i in range(_PBL_MAX_GROUP):
        r = lg_rows[i] if i < len(lg_rows) else {}
        m[f"{{{{pbl_ops_group_{i}_affiliation}}}}"] = _s(r.get("affiliation"))
        m[f"{{{{pbl_ops_group_{i}_position}}}}"] = _s(r.get("position"))
        m[f"{{{{pbl_ops_group_{i}_name}}}}"] = _s(r.get("name"))

    # ── Ⅳ-4-다 훈련 교과목 프로파일 상단 (T35)
    m["{{pbl_ops_subject_course_name}}"] = _s(data.get("subject_profile_course_name"))
    m["{{pbl_ops_subject_total_hours}}"] = _s(data.get("total_training_hours"))
    m["{{pbl_ops_subject_training_goals}}"] = _s(data.get("subject_training_goals"))
    m["{{pbl_ops_subject_ai_tools}}"] = _s(data.get("subject_ai_tools"))
    m["{{pbl_ops_subject_utilized_data}}"] = _s(data.get("subject_utilized_data"))
    m["{{pbl_ops_subject_analysis_method}}"] = _s(data.get("subject_analysis_method"))
    # 훈련내용 반복 행 (T35 r7~9) + 전체시간·강사시간 자동 합산
    contents = data.get("training_contents") or []
    sum_h = sum_ext = sum_int = 0
    has_h = has_ext = has_int = False
    for i in range(_PBL_MAX_CONTENTS):
        c = contents[i] if i < len(contents) else {}
        ih = c.get("instructor_hours") or {}
        th, ext, intl = c.get("training_hours"), ih.get("external"), ih.get("internal")
        m[f"{{{{pbl_ops_content_{i}_unit_name}}}}"] = _s(c.get("unit_name"))
        # 세부내용 항목마다 글머리(▪) — 로드맵 명세서 세부내용과 동일 방식.
        # \n 분리된 항목별로 부착(세부내용 셀은 좌측 정렬 — insert_placeholders 지정).
        _det_items = [ln for ln in _s(c.get("detail")).split("\n") if ln.strip()]
        m[f"{{{{pbl_ops_content_{i}_detail}}}}"] = "\n".join(f"▪ {it}" for it in _det_items)
        m[f"{{{{pbl_ops_content_{i}_training_hours}}}}"] = _s(th)
        m[f"{{{{pbl_ops_content_{i}_external_hours}}}}"] = _s(ext)
        m[f"{{{{pbl_ops_content_{i}_internal_hours}}}}"] = _s(intl)
        iv = _to_int(th)
        if iv is not None:
            sum_h += iv
            has_h = True
        iv = _to_int(ext)
        if iv is not None:
            sum_ext += iv
            has_ext = True
        iv = _to_int(intl)
        if iv is not None:
            sum_int += iv
            has_int = True
    m["{{pbl_ops_subject_sum_hours}}"] = (
        str(sum_h) if has_h else _s(data.get("subject_total_sum_hours"))
    )
    m["{{pbl_ops_subject_sum_external}}"] = str(sum_ext) if has_ext else ""
    m["{{pbl_ops_subject_sum_internal}}"] = str(sum_int) if has_int else ""

    # ── Ⅳ-4-라 시설·장비 (T37)
    facs = data.get("facilities") or []
    for i in range(_PBL_MAX_FACILITIES):
        f = facs[i] if i < len(facs) else {}
        m[f"{{{{pbl_ops_facility_{i}_seq}}}}"] = _s(f.get("seq"))
        m[f"{{{{pbl_ops_facility_{i}_category}}}}"] = _s(f.get("category"))
        m[f"{{{{pbl_ops_facility_{i}_name}}}}"] = _s(f.get("name"))
        m[f"{{{{pbl_ops_facility_{i}_spec}}}}"] = _s(f.get("spec"))
        m[f"{{{{pbl_ops_facility_{i}_location}}}}"] = _s(f.get("location"))

    # ── Ⅳ-4-마 훈련강사 (T38)
    instrs = data.get("training_instructors") or []
    for i in range(_PBL_MAX_INSTRUCTORS):
        ins = instrs[i] if i < len(instrs) else {}
        m[f"{{{{pbl_ops_instructor_{i}_name}}}}"] = _s(ins.get("name"))
        m[f"{{{{pbl_ops_instructor_{i}_internal_external}}}}"] = _s(ins.get("internal_external"))
        m[f"{{{{pbl_ops_instructor_{i}_career_years}}}}"] = _s(ins.get("career_years"))
        m[f"{{{{pbl_ops_instructor_{i}_work_name}}}}"] = _s(ins.get("work_name"))
        # 글머리는 양식 자동 글머리(BULLET paraPr)에 위임 — 값엔 리터럴 '•' 미부착
        m[f"{{{{pbl_ops_instructor_{i}_detailed_training_content}}}}"] = _join_list(
            ins.get("detailed_training_content")
        )

    # ── Ⅳ-5-가 과정평가 계획 상단 (T39)
    m["{{pbl_ops_eval_course_name}}"] = _s(data.get("course_eval_course_name"))
    m["{{pbl_ops_eval_target}}"] = _s(data.get("course_eval_target"))
    m["{{pbl_ops_eval_date}}"] = _s(data.get("course_eval_date"))
    m["{{pbl_ops_eval_criteria}}"] = _s(data.get("course_eval_criteria"))
    m["{{pbl_ops_eval_result}}"] = _s(data.get("course_eval_result"))
    m["{{pbl_ops_eval_overall_comment}}"] = _s(data.get("course_eval_overall_comment"))
    # 수행 체크리스트 (T39 r7~13) — performance_level 열에 √
    checklist = data.get("performance_checklist") or []
    for i in range(_PBL_MAX_CHECKLIST):
        c = checklist[i] if i < len(checklist) else {}
        m[f"{{{{pbl_ops_checklist_{i}_unit_name}}}}"] = _s(c.get("unit_name"))
        m[f"{{{{pbl_ops_checklist_{i}_evaluation_criteria}}}}"] = _s(c.get("evaluation_criteria"))
        lvl = _to_int(c.get("performance_level")) or 0
        for L in range(1, 6):
            m[f"{{{{pbl_ops_checklist_{i}_level_{L}_check}}}}"] = "√" if lvl == L else ""

    _apply_sentence_periods(m)
    return m
