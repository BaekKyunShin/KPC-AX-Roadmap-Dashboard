"""이슈 #2 회귀 테스트 — _set_cell_text paragraph 동적 추가.

원인: 템플릿의 paragraph 개수보다 데이터 줄 수가 많을 때, 마지막 paragraph
하나에 모든 잉여 줄을 '\\n' 으로 join 해 넣으면 lineWrap="SQUEEZE" 속성에
의해 좁은 셀 안에서 글자가 압축 렌더되어 겹쳐 보임 (역량 모델링 표·훈련
과정 상세 표에서 보고됨).

해결: 줄 수 > paragraph 수 인 경우 `cell.add_paragraph(...)` 로 부족한
paragraph 를 동적으로 추가해 1 줄 == 1 paragraph 의 1:1 매핑을 보장한다.
"""
import os

from hwpx import HwpxDocument
from generate import _set_cell_text


HERE = os.path.dirname(os.path.abspath(__file__))
ROADMAP_TEMPLATE = os.path.normpath(
    os.path.join(HERE, "..", "..", "templates", "hwpx", "roadmap.hwpx")
)


def _open_template():
    return HwpxDocument.open(ROADMAP_TEMPLATE)


def _gather_tables(doc):
    out = []
    for para in doc.paragraphs:
        for tbl in para.tables:
            out.append(tbl)
    return out


def _cell_paragraphs_text(tbl, row: int, col: int):
    cell = tbl.cell(row, col)
    return [
        (p.runs[0].text if p.runs else "") for p in cell.paragraphs
    ]


def test_set_cell_text_dynamic_paragraph_add_three_lines():
    """역량 모델링 표 — knowledge 셀(template paragraph=1)에 3 줄 데이터.

    paragraph 가 3 개로 늘어나고 각 줄이 1:1 매핑되어야 한다.
    """
    doc = _open_template()
    tables = _gather_tables(doc)
    tbl = tables[22]  # Ⅲ-1 역량 모델링
    cell = tbl.cell(2, 2)  # knowledge 셀
    assert len(list(cell.paragraphs)) == 1, "전제: knowledge 셀은 1 paragraph"

    _set_cell_text(tbl, 2, 2, "• 머신러닝 개념\n• 딥러닝 기초\n• 프롬프트 엔지니어링")

    paragraphs_text = _cell_paragraphs_text(tbl, 2, 2)
    assert len(paragraphs_text) == 3, (
        f"3 줄 데이터는 3 paragraph 로 펼쳐져야 함, 실제={len(paragraphs_text)}"
    )
    assert paragraphs_text[0] == "• 머신러닝 개념"
    assert paragraphs_text[1] == "• 딥러닝 기초"
    assert paragraphs_text[2] == "• 프롬프트 엔지니어링"


def test_set_cell_text_dynamic_paragraph_add_five_lines():
    """더 많은 줄(5 줄)도 5 paragraph 로 펼쳐진다."""
    doc = _open_template()
    tables = _gather_tables(doc)
    tbl = tables[22]
    text = "\n".join([f"• 항목{i}" for i in range(1, 6)])
    _set_cell_text(tbl, 2, 3, text)  # skill 셀

    paragraphs_text = _cell_paragraphs_text(tbl, 2, 3)
    assert len(paragraphs_text) == 5
    for i, t in enumerate(paragraphs_text, start=1):
        assert t == f"• 항목{i}"


def test_set_cell_text_single_line_keeps_paragraph_count():
    """1 줄 데이터는 추가 paragraph 가 만들어지지 않는다 (회귀 방지)."""
    doc = _open_template()
    tables = _gather_tables(doc)
    tbl = tables[22]
    cell = tbl.cell(2, 2)
    initial_count = len(list(cell.paragraphs))
    assert initial_count == 1

    _set_cell_text(tbl, 2, 2, "단일 라인")

    paragraphs_text = _cell_paragraphs_text(tbl, 2, 2)
    assert len(paragraphs_text) == 1, "1 줄 데이터에는 추가 paragraph 없음"
    assert paragraphs_text[0] == "단일 라인"


def test_set_cell_text_empty_text_keeps_paragraph_count():
    """빈 문자열은 paragraph 추가 없이 모든 paragraph 를 비운다."""
    doc = _open_template()
    tables = _gather_tables(doc)
    tbl = tables[22]
    cell = tbl.cell(2, 2)
    initial_count = len(list(cell.paragraphs))

    _set_cell_text(tbl, 2, 2, "")

    after_count = len(list(cell.paragraphs))
    assert after_count == initial_count
    paragraphs_text = _cell_paragraphs_text(tbl, 2, 2)
    assert all(t == "" for t in paragraphs_text)


# ---------------------------------------------------------------
# 기본 동작 회귀 (Phase E — 자동 분할 비활성, 줄바꿈 보존)
# ---------------------------------------------------------------


def test_set_cell_text_existing_newline_preserved():
    """\\n 포함된 multi-line 텍스트 → 줄 그대로 paragraph 분배."""
    doc = _open_template()
    tables = _gather_tables(doc)
    tbl = tables[22]  # 역량 모델링 셀

    multiline = "A 단락\nB 단락\nC 단락"
    _set_cell_text(tbl, 2, 2, multiline)
    paragraphs_text = _cell_paragraphs_text(tbl, 2, 2)
    assert paragraphs_text[:3] == ["A 단락", "B 단락", "C 단락"], (
        f"\\n 분할 회귀: {paragraphs_text}"
    )


def test_set_cell_text_short_single_line_kept_as_one_paragraph():
    """짧은 단일 줄 → 자동 분할 없이 paragraph[0] 에 그대로 기입."""
    doc = _open_template()
    tables = _gather_tables(doc)
    tbl = tables[22]
    short_text = "짧은 한 줄"
    _set_cell_text(tbl, 2, 2, short_text)
    paragraphs_text = _cell_paragraphs_text(tbl, 2, 2)
    assert paragraphs_text[0] == short_text
    # 나머지 paragraph 는 빈 채 유지
    assert all(t == "" for t in paragraphs_text[1:])


# ---------------------------------------------------------------
# 폰트 상속 회귀 (Phase D — _set_cell_text 가 동적 추가하는 paragraph 가
# 첫 paragraph 의 paraPrIDRef·styleIDRef·charPrIDRef 를 상속해야 한컴오피스
# 렌더링에서 줄 사이 폰트가 통일된다. python-hwpx 의 Cell.add_paragraph 는
# inherit_style 옵션이 없고 None 전달 시 paraPrIDRef 미설정 +
# charPrIDRef="0" 로 폴백하므로 명시 전달 필수.)
# ---------------------------------------------------------------


def test_set_cell_text_added_paragraph_inherits_para_pr_id_ref():
    """동적 추가된 paragraph 는 첫 paragraph 의 paraPrIDRef 를 상속한다."""
    doc = _open_template()
    tbl = _gather_tables(doc)[22]  # 역량 모델링 — knowledge 셀은 1 paragraph
    first_id = tbl.cell(2, 2).paragraphs[0].para_pr_id_ref

    _set_cell_text(tbl, 2, 2, "줄 1\n줄 2\n줄 3")

    paragraphs = list(tbl.cell(2, 2).paragraphs)
    assert len(paragraphs) == 3
    for i, p in enumerate(paragraphs[1:], start=1):
        assert p.para_pr_id_ref == first_id, (
            f"paragraph[{i}].para_pr_id_ref={p.para_pr_id_ref!r} ≠ "
            f"template paragraph[0].para_pr_id_ref={first_id!r}"
        )


def test_set_cell_text_added_paragraph_inherits_char_pr_id_ref():
    """동적 추가된 paragraph 의 run.char_pr_id_ref 가 paragraph[0].runs[0].char_pr_id_ref 와 일치."""
    doc = _open_template()
    tbl = _gather_tables(doc)[22]
    first_run_id = tbl.cell(2, 2).paragraphs[0].runs[0].char_pr_id_ref

    _set_cell_text(tbl, 2, 2, "A\nB\nC")

    for i, p in enumerate(list(tbl.cell(2, 2).paragraphs)[1:], start=1):
        if not p.runs:
            continue
        assert p.runs[0].char_pr_id_ref == first_run_id, (
            f"paragraph[{i}].runs[0].char_pr_id_ref={p.runs[0].char_pr_id_ref!r} ≠ "
            f"template paragraph[0].runs[0].char_pr_id_ref={first_run_id!r}"
        )


def test_set_cell_text_multiline_added_paragraphs_inherit_style():
    """`\\n` 으로 추가된 multi-paragraph 가 모두 첫 paragraph 의 paraPrIDRef 를 상속."""
    doc = _open_template()
    tbl = _gather_tables(doc)[22]
    first_id = tbl.cell(2, 2).paragraphs[0].para_pr_id_ref

    _set_cell_text(tbl, 2, 2, "줄 1\n줄 2\n줄 3\n줄 4")

    paragraphs = list(tbl.cell(2, 2).paragraphs)
    assert len(paragraphs) == 4
    for i, p in enumerate(paragraphs[1:], start=1):
        assert p.para_pr_id_ref == first_id, (
            f"새 paragraph[{i}].para_pr_id_ref={p.para_pr_id_ref!r} ≠ {first_id!r}"
        )


# ---------------------------------------------------------------
# Phase E — _smart_wrap 제거 + 셀 lineWrap=BREAK 동적 설정 회귀
#
# 사용자가 시각 검증으로 발견: _smart_wrap 이 한국어 문장의 의미 단위·번호
# 매김 (①②③)·어미 무시하고 공백 어절 경계로 강제 분할 → 문장 중간 끊김 광범위.
# 해결: 자동 분할 비활성화 + 셀의 OWPML lineWrap 속성을 BREAK 로 설정해
# 한컴오피스가 셀 폭에서 단어 단위 자연 wrap 하도록 함.
# ---------------------------------------------------------------


_HP_NS = "{http://www.hancom.co.kr/hwpml/2011/paragraph}"


def _cell_line_wrap(tbl, row: int, col: int) -> str | None:
    """셀 내부 subList element 의 lineWrap 속성을 반환."""
    cell = tbl.cell(row, col)
    sublist = cell.element.find(f"{_HP_NS}subList")
    return sublist.get("lineWrap") if sublist is not None else None


def test_set_cell_text_long_single_line_keeps_one_paragraph_with_line_wrap_break():
    """60+ 자 단일 줄 → 자동 분할 안 함, 1 paragraph 유지 + 셀 lineWrap=BREAK.

    회귀: _smart_wrap 알고리즘이 한국어 문장의 의미 단위를 무시하고 강제
    분할하여 문장 중간 끊김 발생. 해결로 단일 paragraph 유지하고 한컴오피스
    가 셀 폭에서 단어 단위 자연 wrap 하도록 lineWrap=BREAK 설정.
    """
    doc = _open_template()
    tbl = _gather_tables(doc)[22]  # 역량 모델링 — 1-paragraph 셀
    long_text = (
        "ChatGPT, Claude, Notebook 도구로 데이터 분석·보고 자동화 루틴을 "
        "조직 내부에 내재화하는 것을 목표로 한다."
    )
    assert len(long_text) > 60, f"전제: 60자 초과 ({len(long_text)})"

    _set_cell_text(tbl, 2, 2, long_text)

    paragraphs = list(tbl.cell(2, 2).paragraphs)
    assert len(paragraphs) == 1, (
        f"단일 paragraph 유지 실패 (강제 분할 됨): {len(paragraphs)}개"
    )
    assert paragraphs[0].runs[0].text == long_text, (
        f"텍스트 손실: {paragraphs[0].runs[0].text!r}"
    )
    assert _cell_line_wrap(tbl, 2, 2) == "BREAK", (
        f"셀 lineWrap 이 BREAK 아님: {_cell_line_wrap(tbl, 2, 2)!r}"
    )


def test_set_cell_text_existing_newline_creates_paragraphs_with_line_wrap_break():
    """\\n 다수 → multi-paragraph 유지 + 모든 paragraph 의 셀 lineWrap=BREAK.

    `\\n` 분할은 의도된 줄바꿈이므로 그대로 paragraph 분배. 셀 lineWrap 은
    BREAK 로 설정하여 각 paragraph 가 셀 폭 초과 시 자연 단어 wrap.
    """
    doc = _open_template()
    tbl = _gather_tables(doc)[22]
    multiline = "첫 줄 텍스트\n둘째 줄 텍스트\n셋째 줄 텍스트"

    _set_cell_text(tbl, 2, 2, multiline)

    paragraphs = list(tbl.cell(2, 2).paragraphs)
    assert len(paragraphs) == 3, f"3 줄 multi-paragraph 분배 실패: {len(paragraphs)}"
    texts = [p.runs[0].text if p.runs else "" for p in paragraphs]
    assert texts == ["첫 줄 텍스트", "둘째 줄 텍스트", "셋째 줄 텍스트"]
    assert _cell_line_wrap(tbl, 2, 2) == "BREAK"


# ---------------------------------------------------------------
# 잉여 문단 트림 (사용자 육안 검증 — 수행방법 하단 여백·글머리 고정 개수)
#
# 이전: 내용 줄 수 < 템플릿 문단 수 이면 남은 문단을 빈 채 유지 → 셀 하단에
# 빈 문단 여백이 남고, 자동 글머리(BULLET) 문단은 항상 고정 개수로 렌더됨.
# 해결: 내용 줄 수에 맞춰 잉여 문단을 제거(트림). 글머리는 내용 항목 수만큼.
# ---------------------------------------------------------------


def test_set_cell_text_trims_surplus_paragraphs_to_one():
    """2+ 문단 셀에 1 줄 내용 → 1 문단으로 트림 (잉여 빈 문단 제거)."""
    doc = _open_template()
    tbl = _gather_tables(doc)[6]  # Ⅰ-2 주요 활동 — 값 셀은 2 paragraph
    cell = tbl.cell(2, 3)
    assert len(list(cell.paragraphs)) >= 2, "전제: 2+ paragraph 셀"

    _set_cell_text(tbl, 2, 3, "대면(인터뷰)")

    paragraphs = list(tbl.cell(2, 3).paragraphs)
    assert len(paragraphs) == 1, (
        f"1 줄 내용은 1 문단으로 트림돼야 함, 실제={len(paragraphs)}"
    )
    assert paragraphs[0].runs[0].text == "대면(인터뷰)"


def test_set_cell_text_trim_never_below_one_on_empty():
    """빈 문자열이어도 최소 1 문단은 유지 (HWPX 셀 문단 ≥1)."""
    doc = _open_template()
    tbl = _gather_tables(doc)[6]
    _set_cell_text(tbl, 2, 3, "")
    paragraphs = list(tbl.cell(2, 3).paragraphs)
    assert len(paragraphs) == 1
    assert (paragraphs[0].runs[0].text if paragraphs[0].runs else "") == ""
