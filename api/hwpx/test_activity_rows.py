"""차수 동적 행 확장 테스트 (⑥ Ⅰ-2 주요 활동 15차 확장).

정본 양식은 3차분 행만 보유한다. 입력 차수가 3을 넘으면 생성 시점에 마지막
차수 블록을 deepcopy 복제해 행을 추가한다(≤3차는 구조 편집 없음 = 양식 원형).

- 로드맵 Ⅰ-2 (T6): 헤더 1행 + 차수당 2행  → 3차=7행, 5차=11행, 15차=31행
- PBL  Ⅱ-1-나 (T9): 동일 구조             → 5차=11행
- PBL  Ⅲ-1   (T19): 차수당 4행            → 3차=13행, 5차=21행
"""
import os
import sys
import tempfile

_DIR = os.path.dirname(os.path.abspath(__file__))
if _DIR not in sys.path:
    sys.path.insert(0, _DIR)

from hwpx import HwpxDocument  # noqa: E402
from generate import _generate_roadmap, _generate_pbl  # noqa: E402


def _open_bytes(b: bytes):
    tmp = tempfile.NamedTemporaryFile(suffix=".hwpx", delete=False)
    tmp.write(b)
    tmp.flush()
    tmp.close()
    return HwpxDocument.open(tmp.name)


def _tables(doc):
    return [t for para in doc.paragraphs for t in para.tables]


def _cell_text(tbl, r: int, c: int) -> str:
    try:
        cell = tbl.cell(r, c)
    except Exception:
        return ""
    return "".join(
        run.text or "" for p in cell.paragraphs for run in p.runs
    )


def _table_text(tbl) -> str:
    return " ".join(
        _cell_text(tbl, r, c)
        for r in range(tbl.row_count)
        for c in range(tbl.column_count)
    )


def _acts(n: int) -> list:
    """n 차수 분량의 수행활동 payload (로드맵 — participants 배열)."""
    return [
        {
            "round": f"{i + 1}차",
            "date": f"26.01.{i + 1:02d}",
            "content": f"{i + 1}차 수행내용",
            "method": "대면(인터뷰)",
            "participants": [
                {"role": "컨설팅책임자(PM)", "name": f"PM{i + 1}"},
                {"role": "기업 내부전문가", "name": f"내부{i + 1}"},
            ],
        }
        for i in range(n)
    ]


def _pbl_acts(n: int) -> list:
    """n 차수 분량의 Ⅱ-1-나 로드맵 수립 활동 payload (T9 — 평면 pm_name/expert_name)."""
    return [
        {
            "round": f"{i + 1}차",
            "date": f"26.01.{i + 1:02d}",
            "content": f"{i + 1}차 수행내용",
            "method": "대면(인터뷰)",
            "pm_name": f"PM{i + 1}",
            "expert_name": f"내부{i + 1}",
        }
        for i in range(n)
    ]


def _pbl_perf_acts(n: int) -> list:
    """n 차수 분량의 Ⅲ-1 수행활동 payload (T19 — PBL 자체 입력, 참석자 4역할)."""
    return [
        {
            "round": f"{i + 1}차",
            "date": f"25/04/{i + 1:02d}",
            "content": f"{i + 1}차 수행내용",
            "method": "대면(인터뷰)",
            "pm_name": f"PM{i + 1}",
            "external_expert_name": f"외부{i + 1}",
            "internal_expert_name": f"내부{i + 1}",
            "jurisdiction_manager_name": f"주치의{i + 1}",
        }
        for i in range(n)
    ]


# ---------------------------------------------------------------- 로드맵 Ⅰ-2


def test_roadmap_3rounds_keeps_original_7rows():
    """3차 이하는 구조 편집 없음 — 양식 원형 7행 유지."""
    doc = _open_bytes(_generate_roadmap({"performance_activities": _acts(3)}))
    assert _tables(doc)[6].row_count == 7


def test_roadmap_1round_keeps_original_7rows():
    """1차만 입력해도 행을 줄이지 않는다(양식 원형 유지)."""
    doc = _open_bytes(_generate_roadmap({"performance_activities": _acts(1)}))
    assert _tables(doc)[6].row_count == 7


def test_roadmap_5rounds_expands_to_11rows_and_renders_values():
    """5차 입력 → 11행(헤더1 + 5×2) + 4·5차 값이 실제로 렌더된다."""
    doc = _open_bytes(_generate_roadmap({"performance_activities": _acts(5)}))
    tbl = _tables(doc)[6]
    assert tbl.row_count == 11
    text = _table_text(tbl)
    assert "4차 수행내용" in text
    assert "5차 수행내용" in text
    assert "PM5" in text
    assert "내부5" in text


def test_roadmap_15rounds_expands_to_31rows():
    doc = _open_bytes(_generate_roadmap({"performance_activities": _acts(15)}))
    tbl = _tables(doc)[6]
    assert tbl.row_count == 31
    assert "15차 수행내용" in _table_text(tbl)


def test_roadmap_expanded_rows_have_no_leftover_markers():
    """확장된 행에 미치환 마커가 남지 않는다."""
    doc = _open_bytes(_generate_roadmap({"performance_activities": _acts(7)}))
    assert "{{" not in _table_text(_tables(doc)[6])


def test_roadmap_round_label_filled_for_expanded_rows():
    """확장 행의 차수 라벨(col 0)이 4차·5차로 채워진다."""
    doc = _open_bytes(_generate_roadmap({"performance_activities": _acts(5)}))
    tbl = _tables(doc)[6]
    # 차수 블록 시작행 = 1 + i*2
    assert "4차" in _cell_text(tbl, 7, 0)
    assert "5차" in _cell_text(tbl, 9, 0)


# ------------------------------------------------------------------- PBL


def test_pbl_setup_activity_5rounds_expands_to_11rows():
    """PBL Ⅱ-1-나 로드맵 수립 주요 활동(T9) — 차수당 2행."""
    doc = _open_bytes(_generate_pbl({"roadmap_setup_activities": _pbl_acts(5)}))
    tbl = _tables(doc)[9]
    assert tbl.row_count == 11
    assert "5차 수행내용" in _table_text(tbl)


def test_pbl_perf_3rounds_keeps_original_13rows():
    """PBL Ⅲ-1(T19) 차수당 4행 — 3차는 원형 13행."""
    doc = _open_bytes(_generate_pbl({"pbl_perf_activities": _pbl_perf_acts(3)}))
    assert _tables(doc)[19].row_count == 13


def test_pbl_perf_5rounds_expands_to_21rows():
    """PBL Ⅲ-1(T19) 5차 → 1 + 5×4 = 21행."""
    doc = _open_bytes(_generate_pbl({"pbl_perf_activities": _pbl_perf_acts(5)}))
    tbl = _tables(doc)[19]
    assert tbl.row_count == 21
    assert "5차 수행내용" in _table_text(tbl)


def test_pbl_perf_expanded_rows_fill_all_four_roles():
    """확장된 차수도 참석자 4역할이 모두 채워진다 (기존 결함: 2역할만 채움)."""
    doc = _open_bytes(_generate_pbl({"pbl_perf_activities": _pbl_perf_acts(5)}))
    text = _table_text(_tables(doc)[19])
    for role in ("PM5", "외부5", "내부5", "주치의5"):
        assert role in text, f"확장 행에 {role} 누락"
