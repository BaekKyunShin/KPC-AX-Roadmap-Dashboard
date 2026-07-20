"""커밋2 렌더 서식 수정 회귀 테스트 (한컴 육안 검증 반영).

- 표지 제목 2문단 보존 + 기업명/대상과업 in-place (분할 run·색 보존)
- AI 역량수준 체크박스 2문단·2폰트(초급 cp8 / (AI기초형) cp9) 보존 + 선택 토글
- Ⅲ-1 수행차수 '...차' → '3차'
- 색상 정규화 (파랑→검정, 표지 제목 기업명 예외)
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


def _all_text(doc) -> str:
    chunks = []

    def walk(tbl):
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
                    for nt in cp.tables:
                        walk(nt)

    for para in doc.paragraphs:
        for run in para.runs:
            if run.text:
                chunks.append(run.text)
        for tbl in para.tables:
            walk(tbl)
    return "\n".join(chunks)


class TestRoadmapTitle:
    def test_title_two_paragraphs_with_company_and_target(self):
        doc = _open_bytes(_generate_roadmap({
            "company_name": "㈜테스트", "cover_target_task": "AI검사자동화",
        }))
        cell = _tables(doc)[1].cell(0, 0)
        paras = list(cell.paragraphs)
        assert len(paras) == 2, f"제목 2문단 유지 실패: {len(paras)}"
        assert paras[0].runs[0].text == "AI훈련로드맵 보고서"
        subtitle = "".join(r.text or "" for r in paras[1].runs)
        assert "㈜테스트" in subtitle and "AI검사자동화" in subtitle
        assert "{{" not in subtitle and "기업명" not in subtitle


class TestRoadmapLevel:
    def test_level_two_fonts_preserved_and_selected_toggled(self):
        doc = _open_bytes(_generate_roadmap({"ai_competency_level": "INTERMEDIATE"}))
        cell = _tables(doc)[8].cell(0, 2)  # 중급
        paras = list(cell.paragraphs)
        assert len(paras) == 2, f"레벨 2문단 유지 실패: {len(paras)}"
        assert paras[0].runs[0].text == "☑ 중급"
        assert paras[1].runs[0].text == "(AI탐구형)"
        assert paras[0].runs[0].char_pr_id_ref != paras[1].runs[0].char_pr_id_ref

    def test_unselected_level_stays_unchecked(self):
        doc = _open_bytes(_generate_roadmap({"ai_competency_level": "INTERMEDIATE"}))
        cell = _tables(doc)[8].cell(0, 1)  # 초급 (미선택)
        assert list(cell.paragraphs)[0].runs[0].text == "□ 초급"


_BLUES = {"#0000FF", "#2E74B5", "#3057B9"}


class TestColorNormalization:
    def test_roadmap_blue_becomes_black_title_stays_blue(self):
        doc = _open_bytes(_generate_roadmap({
            "company_name": "㈜테스트", "cover_target_task": "AI검사",
            "ai_competency_level": "BEGINNER",
        }))
        cps = doc.char_properties
        assert (cps["106"].text_color() or "").upper() == "#0000FF", "표지 제목 부제 파랑 유지 실패"
        remaining = [
            cid for cid, rs in cps.items()
            if cid != "106" and (rs.text_color() or "").upper() in _BLUES
        ]
        assert remaining == [], f"파랑 잔존(검정화 실패): {remaining}"

    def test_pbl_blue_becomes_black_title_stays_blue(self):
        doc = _open_bytes(_generate_pbl({"company_name": "㈜테스트"}))
        cps = doc.char_properties
        assert (cps["151"].text_color() or "").upper() == "#0000FF", "표지 제목 기업명 파랑 유지 실패"
        remaining = [
            cid for cid, rs in cps.items()
            if cid != "151" and (rs.text_color() or "").upper() in _BLUES
        ]
        assert remaining == [], f"파랑 잔존(검정화 실패): {remaining}"


class TestEvalMethodNoDuplication:
    def test_workplace_eval_not_duplicated_in_any_cell(self):
        """평가방법 '방법' 셀에서 '작업장 평가' 가 셀당 1회 (fwSpace tail 중복 방지)."""
        doc = _open_bytes(_generate_pbl({
            "course_evaluation_methods": ["포트폴리오", "작업장 평가"],
        }))
        for tbl in _tables(doc):
            for ri in range(tbl.row_count):
                for ci in range(tbl.column_count):
                    try:
                        cell = tbl.cell(ri, ci)
                    except Exception:
                        continue
                    txt = "".join(r.text or "" for p in cell.paragraphs for r in p.runs)
                    if "작업장 평가" in txt and "포트폴리오" in txt:
                        assert txt.count("작업장 평가") == 1, f"작업장 평가 중복: {txt!r}"
                        assert txt.count("문제해결시나리오") == 1, f"문제해결시나리오 중복: {txt!r}"


class TestSignatureColumnCentered:
    def test_pbl_affiliation_name_columns_centered(self):
        """표지 서명표 소속(col1)/성명(col2) 값 셀이 헤더와 동일 CENTER paraPr."""
        doc = _open_bytes(_generate_pbl({"pm_affiliation": "㈜테스트", "pm_name": "홍길동"}))
        t2 = _tables(doc)[2]
        header_pid = t2.cell(0, 1).paragraphs[0].para_pr_id_ref  # '소  속' 헤더 = CENTER
        for r in range(1, t2.row_count):
            for c in (1, 2):
                for p in t2.cell(r, c).paragraphs:
                    assert p.para_pr_id_ref == header_pid, (
                        f"소속/성명 ({r},{c}) 미정렬 paraPr={p.para_pr_id_ref} (헤더={header_pid})"
                    )


class TestSpecSubjectDetails:
    def test_details_bulleted_per_item(self):
        """명세서 세부내용: 각 항목에 글머리(▪) 부여."""
        doc = _open_bytes(_generate_roadmap({
            "course_specs": [{
                "subjects": [{"subject_name": "AI 이해", "details": ["개념 강의", "실습 워크숍"]}],
            }],
        }))
        cell = _tables(doc)[22].cell(8, 2)  # 명세서1 subject0 세부내용
        lines = [("".join(r.text or "" for r in p.runs)).strip() for p in cell.paragraphs]
        lines = [ln for ln in lines if ln]
        assert lines == ["▪ 개념 강의", "▪ 실습 워크숍"], f"글머리/항목 불일치: {lines}"


class TestPblPerfRound:
    def test_third_round_label_is_3cha(self):
        doc = _open_bytes(_generate_pbl({
            "roadmap_perf_activities": [
                {"date": "26.01.01"}, {"date": "26.02.02"}, {"date": "26.03.03"},
            ],
        }))
        text = _all_text(doc)
        assert "3차" in text, "수행차수 3행이 '3차' 여야 함"
        assert "...차" not in text, "'...차' 리터럴 잔존"
