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
