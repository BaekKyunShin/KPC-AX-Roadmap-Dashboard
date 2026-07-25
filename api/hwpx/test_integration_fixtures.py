"""
Phase E: fixture 기반 통합 테스트.

- fixture (roadmap-full/empty, pbl-full/empty) 입력으로 generate.py 의
  _generate_roadmap / _generate_pbl 을 직접 호출.
- 출력 bytes 가 ZIP 매직 (PK\\x03\\x04) 으로 시작하는지 (HWPX = OpenXML zip 컨테이너).
- python-hwpx 로 다시 열어 본문 텍스트에 fixture 의 핵심 값이 포함되는지 (full),
  또는 잔존 fixture 값·플레이스홀더가 없는지 (empty) 검증.

PBL 은 v2 부터 로드맵과 동일한 {{플레이스홀더}} 치환 방식 (`_build_pbl_markers`).
"""
import json
import os
import sys
import tempfile

_DIR = os.path.dirname(os.path.abspath(__file__))
if _DIR not in sys.path:
    sys.path.insert(0, _DIR)

import pytest  # noqa: E402

# generate.py 가 templates/hwpx/{roadmap,pbl}.hwpx 를 읽으므로, 템플릿이 실제 존재할 때만 테스트.
ROADMAP_TEMPLATE = os.path.normpath(
    os.path.join(_DIR, "..", "..", "templates", "hwpx", "roadmap.hwpx")
)
PBL_TEMPLATE = os.path.normpath(
    os.path.join(_DIR, "..", "..", "templates", "hwpx", "pbl.hwpx")
)
FIXTURE_DIR = os.path.join(_DIR, "__fixtures__")


def _load_fixture(name: str) -> dict:
    path = os.path.join(FIXTURE_DIR, name)
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _is_zip_bytes(b: bytes) -> bool:
    return len(b) >= 4 and b[:4] == b"PK\x03\x04"


def _extract_all_text(out: bytes) -> str:
    """HWPX bytes → 본문·표 셀 (nested 표 포함) 텍스트를 한 문자열로 합쳐 반환."""
    from hwpx import HwpxDocument

    with tempfile.NamedTemporaryFile(suffix=".hwpx", delete=True) as tmp:
        tmp.write(out)
        tmp.flush()
        doc = HwpxDocument.open(tmp.name)
        chunks: list[str] = []

        def _walk_table(tbl):
            for ri in range(tbl.row_count):
                for ci in range(tbl.column_count):
                    try:
                        cell = tbl.cell(ri, ci)
                    except Exception:
                        continue
                    for cp in cell.paragraphs:
                        for r in cp.runs:
                            if r.text:
                                chunks.append(r.text)
                        for ntbl in cp.tables:
                            _walk_table(ntbl)

        for para in doc.paragraphs:
            for run in para.runs:
                if run.text:
                    chunks.append(run.text)
            for tbl in para.tables:
                _walk_table(tbl)
        return "\n".join(chunks)


def _open_doc(out: bytes):
    """HWPX bytes → HwpxDocument (임시 파일 경유, 호출자 컨텍스트 내 사용)."""
    from hwpx import HwpxDocument

    tmp = tempfile.NamedTemporaryFile(suffix=".hwpx", delete=True)
    tmp.write(out)
    tmp.flush()
    # tmp 를 반환해 GC 로 삭제되지 않도록 doc 과 함께 보관
    return HwpxDocument.open(tmp.name), tmp


def _cell_text(tbl, row: int, col: int) -> str:
    try:
        cell = tbl.cell(row, col)
    except Exception:
        return ""
    parts = []
    for p in cell.paragraphs:
        for r in p.runs:
            if r.text:
                parts.append(r.text)
    return "".join(parts).strip()


# ===============================================================
# 로드맵 fixture (변경 없음)
# ===============================================================


@pytest.mark.skipif(
    not os.path.exists(ROADMAP_TEMPLATE),
    reason="templates/hwpx/roadmap.hwpx 미존재",
)
class TestRoadmapFixtures:
    def test_roadmap_full_generates_valid_hwpx(self):
        from generate import _generate_roadmap

        data = _load_fixture("roadmap-full.json")
        out = _generate_roadmap(data)
        assert _is_zip_bytes(out), "출력 bytes 가 ZIP 매직으로 시작하지 않음"
        assert len(out) > 100_000, f"출력 크기가 너무 작음: {len(out)} bytes"

    def test_roadmap_empty_generates_valid_hwpx(self):
        from generate import _generate_roadmap

        data = _load_fixture("roadmap-empty.json")
        out = _generate_roadmap(data)
        assert _is_zip_bytes(out)
        assert len(out) > 100_000

    def test_roadmap_full_contains_company_name_in_text(self):
        from generate import _generate_roadmap

        data = _load_fixture("roadmap-full.json")
        out = _generate_roadmap(data)
        text = _extract_all_text(out)
        assert "㈜AI산업자동화" in text, "회사명이 출력에 없음"
        assert "홍길동" in text or "12345-67890" in text, (
            "PM 이름 또는 고용보험사업장관리번호가 출력에 없음"
        )

    def test_roadmap_hrd_url_replaced_with_attach_notice(self):
        from generate import _generate_roadmap

        data = _load_fixture("roadmap-full.json")
        out = _generate_roadmap(data)
        text = _extract_all_text(out)
        assert data["hrd_report_attachment"].startswith("http"), "fixture 가 URL 형이 아님"
        assert "https://x.example" not in text, "HRD URL 이 본문에 raw 노출됨"
        assert "별첨 페이지 참조" in text, "URL fallback 안내문구 누락"

    def test_roadmap_cover_replaces_company_name_and_date(self):
        from generate import _generate_roadmap

        data = _load_fixture("roadmap-full.json")
        out = _generate_roadmap(data)
        text = _extract_all_text(out)
        assert "(기업명)" not in text
        assert "202x. 00. 00." not in text
        assert "㈜AI산업자동화" in text
        assert "2026. 04. 30." in text, "일자 fixture 값 미노출"


# ===============================================================
# PBL fixture (v2 마커 방식)
# ===============================================================


@pytest.mark.skipif(
    not os.path.exists(PBL_TEMPLATE),
    reason="templates/hwpx/pbl.hwpx 미존재",
)
class TestPblFixtures:
    def test_pbl_full_generates_valid_hwpx(self):
        from generate import _generate_pbl

        out = _generate_pbl(_load_fixture("pbl-full.json"))
        assert _is_zip_bytes(out)
        assert len(out) > 50_000

    def test_pbl_empty_generates_valid_hwpx(self):
        from generate import _generate_pbl

        out = _generate_pbl(_load_fixture("pbl-empty.json"))
        assert _is_zip_bytes(out)
        assert len(out) > 50_000

    def test_pbl_cover_signers_render(self):
        """표지 서명표 (T2) 에 PM/외부/내부/주치의 소속·성명 노출."""
        from generate import _generate_pbl

        data = _load_fixture("pbl-full.json")
        text = _extract_all_text(_generate_pbl(data))
        for key in (
            "pm_name", "external_expert_name", "internal_expert_name", "doctor_name",
            "pm_affiliation", "external_expert_affiliation", "doctor_affiliation",
        ):
            assert data[key] in text, f"cover {key}={data[key]!r} 미노출"

    def test_pbl_cover_title_and_company_replaced(self):
        """표지 제목 (훈련과정명)·㈜기업명 기재 가 값으로 치환 (마커 미사용, 본문 치환)."""
        from generate import _generate_pbl

        data = _load_fixture("pbl-full.json")
        text = _extract_all_text(_generate_pbl(data))
        assert "(훈련과정명)" not in text, "표지 (훈련과정명) 미치환"
        assert "㈜기업명 기재" not in text, "표지 ㈜기업명 기재 미치환"
        assert data["course_name"] in text
        assert data["company_name"] in text

    def test_pbl_overview_renders(self):
        """Ⅰ. 개요 — 기업명·사업장번호·연락처·훈련직무·훈련생 노출."""
        from generate import _generate_pbl

        data = _load_fixture("pbl-full.json")
        text = _extract_all_text(_generate_pbl(data))
        for key in (
            "business_registration_no", "contact_name", "contact_email",
            "ncs_code", "training_target_label", "training_job",
        ):
            assert data[key] in text, f"overview {key}={data[key]!r} 미노출"

    def test_pbl_roadmap_setup_section_renders(self):
        """Ⅱ-1-나 로드맵 수립 — 배경·주요 활동(PM/내부전문가)·선정 과업."""
        from generate import _generate_pbl

        data = _load_fixture("pbl-full.json")
        text = _extract_all_text(_generate_pbl(data))
        assert data["roadmap_setup_background"] in text, "수립 배경 미노출"
        assert data["roadmap_selected_task"] in text, "선정 과업 미노출"
        act = data["roadmap_setup_activities"][0]
        assert act["content"] in text and act["pm_name"] in text, "주요 활동 미노출"

    def test_pbl_ai_level_checkbox_toggle(self):
        """Ⅱ-1-나 AI역량 3단계 체크박스 — 2문단·2폰트 보존 + roadmap_ai_level 토글."""
        from generate import _collect_tables, _generate_pbl

        data = _load_fixture("pbl-full.json")  # INTERMEDIATE
        assert data["roadmap_ai_level"] == "INTERMEDIATE"
        doc, tmp = _open_doc(_generate_pbl(data))
        try:
            t10 = _collect_tables(doc)[10]
            # 체크박스 라인(p0)과 유형 라벨(p1)이 별도 문단으로 보존(2폰트), 중급만 ☑
            for col, cb, label in (
                (1, "□ 초급", "(AI기초형)"),
                (2, "☑ 중급", "(AI탐구형)"),
                (3, "□ 고급", "(AI활용형·선도형)"),
            ):
                paras = list(t10.cell(0, col).paragraphs)
                assert len(paras) == 2, f"col{col} 2문단 유지 실패: {len(paras)}"
                assert paras[0].runs[0].text == cb
                assert paras[1].runs[0].text == label
        finally:
            tmp.close()

    def test_pbl_requirements_and_task_analysis_render(self):
        """Ⅱ-2 요구분석 5×3 + 과업 분석표 6×4 (로드맵 연계)."""
        from generate import _generate_pbl

        data = _load_fixture("pbl-full.json")
        text = _extract_all_text(_generate_pbl(data))
        assert data["roadmap_req_company_status"] in text
        assert data["roadmap_req_expected_outcomes"] in text
        for t in data["roadmap_task_analysis"]:
            assert t["task"] in text, f"과업 {t['task']!r} 미노출"

    def test_pbl_target_task_cell_coords(self):
        """Ⅱ-2 훈련대상 과업 (T16 4×3) — name/reason/as_is/to_be 가 col 2 에 정확히."""
        from generate import _collect_tables, _generate_pbl

        data = _load_fixture("pbl-full.json")
        tt = data["roadmap_target_task"]
        doc, tmp = _open_doc(_generate_pbl(data))
        try:
            t16 = _collect_tables(doc)[16]
            assert _cell_text(t16, 0, 2) == tt["name"]
            assert _cell_text(t16, 1, 2) == tt["reason"]
            assert _cell_text(t16, 2, 2) == tt["as_is"]
            assert _cell_text(t16, 3, 2) == tt["to_be"]
        finally:
            tmp.close()

    def test_pbl_perf_activities_4role_pm_and_internal_only(self):
        """Ⅲ-1 수행활동 (T19 13×6) — 차수당 PM(offset0)·기업내부전문가(offset2) 만 채움."""
        from generate import _collect_tables, _generate_pbl

        data = _load_fixture("pbl-full.json")
        act = data["roadmap_perf_activities"][0]
        out = _generate_pbl(data)
        doc, tmp = _open_doc(out)
        try:
            t19 = _collect_tables(doc)[19]
            assert _cell_text(t19, 1, 5) == act["pm_name"], "PM 성명 (row1 col5) 미노출"
            assert _cell_text(t19, 3, 5) == act["expert_name"], "기업내부전문가 (row3 col5) 미노출"
            # 외부전문가(row2)·주치의(row4) 는 로드맵 미연계 → 공란
            assert _cell_text(t19, 2, 5) == "", "외부전문가 행이 채워짐 (공란이어야)"
            assert _cell_text(t19, 4, 5) == "", "주치의 행이 채워짐 (공란이어야)"
        finally:
            tmp.close()
        # 4 역할 라벨은 양식 원본 유지
        text = _extract_all_text(out)
        for label in ("컨설팅책임자(PM)", "외부전문가(직무,HRD)",
                      "기업내부전문가", "능력개발전담주치의"):
            assert label in text, f"역할 라벨 {label!r} 미노출"

    def test_pbl_task_selections_render_with_checkbox_and_job_merge(self):
        """Ⅲ-3-가 훈련대상 업무 선정 (T23 6×6) — 4열 로드맵 + AI필요도·훈련선정(☑/☐)."""
        from generate import _collect_tables, _generate_pbl

        data = _load_fixture("pbl-full.json")
        sels = data["roadmap_task_selections"]
        doc, tmp = _open_doc(_generate_pbl(data))
        try:
            t23 = _collect_tables(doc)[23]
            assert _cell_text(t23, 1, 0) == sels[0]["job"], "직무(row1 col0) 미노출"
            assert _cell_text(t23, 1, 4) == sels[0]["ai_necessity"], "AI필요도 미노출"
            # training_selected: item0=True → ☑, item1=False → ☐
            assert _cell_text(t23, 1, 5) == "☑"
            assert _cell_text(t23, 2, 5) == "☐"
        finally:
            tmp.close()

    def test_pbl_problem_definition_sheet_cells(self):
        """Ⅲ-2-가 문제 정의서 (T21 5×2) — 배경/핵심/범위/제약 col 1 정확히."""
        from generate import _collect_tables, _generate_pbl

        data = _load_fixture("pbl-full.json")
        sheet = data["problem_definition_sheet"]
        doc, tmp = _open_doc(_generate_pbl(data))
        try:
            t21 = _collect_tables(doc)[21]
            assert _cell_text(t21, 1, 1) == sheet["background"]
            assert _cell_text(t21, 2, 1) == sheet["core"]
            assert _cell_text(t21, 3, 1) == sheet["scope"]
            assert _cell_text(t21, 4, 1) == sheet["constraints"]
        finally:
            tmp.close()

    def test_pbl_target_details_5_columns(self):
        """Ⅲ-3-다 훈련대상 업무 세부내용 (T26 4×5) — 5 컬럼 1:1 (row 2~3)."""
        from generate import _collect_tables, _generate_pbl

        data = _load_fixture("pbl-full.json")
        details = data["target_details"]
        doc, tmp = _open_doc(_generate_pbl(data))
        try:
            t26 = _collect_tables(doc)[26]
            cols = ("title", "as_is", "to_be", "required_knowledge", "required_skill")
            for i in range(min(2, len(details))):
                for c, key in enumerate(cols):
                    assert _cell_text(t26, 2 + i, c) == details[i][key], (
                        f"detail row {2 + i} col {c} ({key}) 매핑 실패"
                    )
        finally:
            tmp.close()

    def test_pbl_ops_sections_render(self):
        """Ⅳ 운영계획 — AI도구·학습그룹·시설·강사·과정평가 노출."""
        from generate import _generate_pbl

        data = _load_fixture("pbl-full.json")
        text = _extract_all_text(_generate_pbl(data))
        assert data["training_goal"] in text
        assert data["ai_tool_usage_plan"][0]["stage"] in text
        for ins in data["learning_group"]["instructors"]:
            assert ins["name"] in text, f"강사 {ins['name']!r} 미노출"
        for tr in data["learning_group"]["trainees"]:
            assert tr["name"] in text, f"훈련생 {tr['name']!r} 미노출"
        for f in data["facilities"]:
            assert f["name"] in text, f"시설 {f['name']!r} 미노출"
        for ins in data["training_instructors"]:
            assert ins["name"] in text and ins["work_name"] in text

    def test_pbl_subject_profile_auto_sum(self):
        """Ⅳ-4-다 교과목 프로파일 (T35) — 훈련내용 + 전체시간·강사시간 자동 합산."""
        from generate import _collect_tables, _generate_pbl

        data = _load_fixture("pbl-full.json")
        contents = data["training_contents"]
        exp_total = sum(int(c["training_hours"]) for c in contents)
        exp_ext = sum(int(c["instructor_hours"]["external"]) for c in contents)
        exp_int = sum(int(c["instructor_hours"]["internal"]) for c in contents)
        doc, tmp = _open_doc(_generate_pbl(data))
        try:
            t35 = _collect_tables(doc)[35]
            assert _cell_text(t35, 7, 1) == contents[0]["unit_name"], "훈련내용 row7 미노출"
            # ver3 열 병합 조정으로 시간 열이 col 6 → col 7 이동 (col 6 은 '전체시간' 라벨)
            assert _cell_text(t35, 10, 7) == str(exp_total), "전체시간 자동합산 실패"
            assert _cell_text(t35, 10, 8) == str(exp_ext), "외부 강사시간 합산 실패"
            assert _cell_text(t35, 10, 9) == str(exp_int), "내부 강사시간 합산 실패"
        finally:
            tmp.close()

    def test_pbl_performance_checklist_level_check(self):
        """Ⅳ-5-가 수행 체크리스트 (T39) — performance_level 열에 √."""
        from generate import _collect_tables, _generate_pbl

        data = _load_fixture("pbl-full.json")
        checklist = data["performance_checklist"]
        doc, tmp = _open_doc(_generate_pbl(data))
        try:
            t39 = _collect_tables(doc)[39]
            for i, c in enumerate(checklist):
                row = 7 + i
                assert _cell_text(t39, row, 0) == c["unit_name"]
                lvl = c["performance_level"]
                assert _cell_text(t39, row, 3 + lvl) == "√", (
                    f"checklist row {row} level {lvl} √ 미표시"
                )
        finally:
            tmp.close()

    def test_pbl_training_goals_checkbox_toggle(self):
        """훈련목표 5종 체크박스 — training_goals 배열이 ☑ 로 토글 (Ⅰ개요·Ⅳ-2 공통)."""
        from generate import _generate_pbl

        data = _load_fixture("pbl-full.json")
        text = _extract_all_text(_generate_pbl(data))
        for goal in data["training_goals"]:
            assert f"☑ {goal}" in text, f"훈련목표 {goal!r} ☑ 미토글"

    def test_pbl_course_evaluation_methods_checkbox(self):
        """과정평가 방법 체크박스 — course_evaluation_methods 가 ☑ 로 토글."""
        from generate import _generate_pbl

        data = _load_fixture("pbl-full.json")
        text = _extract_all_text(_generate_pbl(data))
        for method in data["course_evaluation_methods"]:
            assert f"☑ {method}" in text, f"평가방법 {method!r} ☑ 미토글"

    def test_pbl_hrd_url_not_leaked(self):
        """HRD이음 attachment URL 이 본문에 raw 노출되지 않는다 (fallback 치환)."""
        from generate import _generate_pbl

        data = _load_fixture("pbl-full.json")
        assert data["hrd_report_attachment"].startswith("http")
        text = _extract_all_text(_generate_pbl(data))
        assert "https://x.example" not in text


# ===============================================================
# 잔존 플레이스홀더 0 건 (no-leftover 가드)
# ===============================================================


@pytest.mark.skipif(
    not (os.path.exists(ROADMAP_TEMPLATE) and os.path.exists(PBL_TEMPLATE)),
    reason="템플릿 미존재",
)
class TestNoPlaceholderResidue:
    def test_roadmap_no_placeholder_braces(self):
        from generate import _generate_roadmap

        text = _extract_all_text(_generate_roadmap(_load_fixture("roadmap-full.json")))
        assert "{{" not in text, f"잔존 placeholder: {text[:200]}"
        assert "}}" not in text

    def test_pbl_no_placeholder_braces(self):
        from generate import _generate_pbl

        text = _extract_all_text(_generate_pbl(_load_fixture("pbl-full.json")))
        assert "{{" not in text, f"잔존 placeholder: {text[:200]}"
        assert "}}" not in text

    def test_pbl_empty_no_placeholder_braces(self):
        """빈 fixture 여도 미매핑 마커가 모두 빈 문자열로 지워진다."""
        from generate import _generate_pbl

        text = _extract_all_text(_generate_pbl(_load_fixture("pbl-empty.json")))
        assert "{{" not in text
        assert "}}" not in text


# ===============================================================
# 1-paragraph 셀 + 긴 단일 문장 글자 겹침 회귀 (lineWrap=BREAK)
# ===============================================================

PBL_ONE_PARAGRAPH_CELLS = [
    (8, (0, 0), "roadmap_setup_background"),   # Ⅱ-1-나 수립 배경
    (11, (0, 0), "course_necessity"),          # Ⅱ-1-다 개발 필요성
    (24, (0, 0), "target_necessity"),          # Ⅲ-3-나 필요성
    (28, (0, 0), "training_goal"),             # Ⅳ-1 훈련 목표
]

ROADMAP_ONE_PARAGRAPH_CELLS = [
    (3, (0, 0), "establishment_necessity"),
    (28, (0, 1), "training_structure_method"),
]

_LONG_TEXT = (
    "공정 불량 원인 분석에 AI 도구를 활용해 데이터 정제와 시각화 보고서 자동 생성 "
    "그리고 표준 템플릿 기반 AI 초안 작성 그리고 담당자 검토 후 확정"
)


@pytest.mark.skipif(
    not os.path.exists(PBL_TEMPLATE),
    reason="templates/hwpx/pbl.hwpx 미존재",
)
@pytest.mark.parametrize("idx,coord,key", PBL_ONE_PARAGRAPH_CELLS)
def test_pbl_long_text_keeps_one_paragraph_with_line_wrap_break(idx, coord, key):
    """80자+ 단일 문장(마침표·\\n 없음) 투입 시 1 paragraph 유지 + lineWrap=BREAK."""
    from generate import _collect_tables, _generate_pbl

    assert "\n" not in _LONG_TEXT and len(_LONG_TEXT) >= 80
    data = _load_fixture("pbl-full.json")
    data[key] = _LONG_TEXT

    doc, tmp = _open_doc(_generate_pbl(data))
    try:
        cell = _collect_tables(doc)[idx].cell(*coord)
        non_empty = [p for p in cell.paragraphs if any(r.text for r in p.runs)]
        assert len(non_empty) == 1, (
            f"PBL idx={idx} {key}: 1 paragraph 유지 기대, got {len(non_empty)}"
        )
        hp = "{http://www.hancom.co.kr/hwpml/2011/paragraph}"
        sublist = cell.element.find(f"{hp}subList")
        assert sublist is not None, f"PBL idx={idx} {key}: subList 부재"
        assert sublist.get("lineWrap") == "BREAK", (
            f"PBL idx={idx} {key}: lineWrap 이 BREAK 아님: {sublist.get('lineWrap')!r}"
        )
    finally:
        tmp.close()


@pytest.mark.skipif(
    not os.path.exists(ROADMAP_TEMPLATE),
    reason="templates/hwpx/roadmap.hwpx 미존재",
)
@pytest.mark.parametrize("idx,coord,key", ROADMAP_ONE_PARAGRAPH_CELLS)
def test_roadmap_long_text_keeps_one_paragraph_with_line_wrap_break(idx, coord, key):
    """Roadmap 양식 동일 회귀 (_set_cell_text 공유 헬퍼)."""
    from generate import _collect_tables, _generate_roadmap

    data = _load_fixture("roadmap-full.json")
    data[key] = _LONG_TEXT

    doc, tmp = _open_doc(_generate_roadmap(data))
    try:
        cell = _collect_tables(doc)[idx].cell(*coord)
        non_empty = [p for p in cell.paragraphs if any(r.text for r in p.runs)]
        assert len(non_empty) == 1
        hp = "{http://www.hancom.co.kr/hwpml/2011/paragraph}"
        sublist = cell.element.find(f"{hp}subList")
        assert sublist is not None
        assert sublist.get("lineWrap") == "BREAK"
    finally:
        tmp.close()


# ===============================================================
# max-length / special-chars 회귀
# ===============================================================


@pytest.mark.skipif(
    not (os.path.exists(ROADMAP_TEMPLATE) and os.path.exists(PBL_TEMPLATE)),
    reason="템플릿 미존재",
)
class TestRegressionMaxLengthAndSpecialChars:
    def test_roadmap_max_length_preserves_repeated_rows(self):
        from generate import _generate_roadmap

        data = _load_fixture("roadmap-max-length.json")
        out = _generate_roadmap(data)
        assert _is_zip_bytes(out)
        assert len(out) > 100_000
        text = _extract_all_text(out)
        assert "수동 품질 검사 공정" in text
        assert "1차 인터뷰" in text
        assert "3차 검토" in text
        assert "심화 과정" in text

    def test_roadmap_special_chars_escapes(self):
        from generate import _generate_roadmap

        out = _generate_roadmap(_load_fixture("roadmap-special-chars.json"))
        assert _is_zip_bytes(out)
        text = _extract_all_text(out)
        assert "㈜<특수>&\"문자'테스트\\회사" in text
        assert "&amp;amp;" not in text
        assert "😀" in text

    def test_pbl_max_length_generates_valid_hwpx(self):
        from generate import _generate_pbl

        data = _load_fixture("pbl-max-length.json")
        out = _generate_pbl(data)
        assert _is_zip_bytes(out)
        assert len(out) > 50_000
        text = _extract_all_text(out)
        assert "주식회사 매우매우긴회사명" in text
        assert data["ai_tool_usage_plan"][0]["stage"] in text
        assert "{{" not in text and "}}" not in text

    def test_pbl_special_chars_escapes(self):
        from generate import _generate_pbl

        out = _generate_pbl(_load_fixture("pbl-special-chars.json"))
        assert _is_zip_bytes(out)
        text = _extract_all_text(out)
        assert "㈜<특수>&\"문자'테스트\\회사" in text, "company_name 특수문자 누락"
        assert "전자 <부품> & 제조" in text, "industry_main 특수문자 누락"
        assert "😀" in text, "emoji 누락"
        assert "&amp;amp;" not in text, "이중 이스케이프 발생"
        assert "{{" not in text and "}}" not in text
