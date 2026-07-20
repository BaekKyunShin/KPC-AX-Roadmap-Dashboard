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


class TestSpecGoalContentLeftAligned:
    def test_training_goal_and_main_content_left_aligned(self):
        """명세서 훈련목표[5,1]·주요 훈련 내용[6,1] 좌측정렬(LEFT paraPr 11)."""
        doc = _open_bytes(_generate_roadmap({
            "course_specs": [{
                "training_goal": "학습자가 모델을 스스로 학습시킬 수 있다",
                "main_content": "실전 프로젝트로 산출물을 완성한다.",
            }],
        }))
        t = _tables(doc)[22]  # 명세서1
        goal_p = t.cell(5, 1).paragraphs[0]
        main_p = t.cell(6, 1).paragraphs[0]
        assert goal_p.para_pr_id_ref == "11", f"훈련목표 LEFT 실패: paraPr={goal_p.para_pr_id_ref}"
        assert main_p.para_pr_id_ref == "11", f"주요내용 LEFT 실패: paraPr={main_p.para_pr_id_ref}"

    def test_outcome_summary_row_stays_centered(self):
        """Ⅰ-3 수립 주요 결과 요약[표8, (2,1)]은 CENTER 유지 — 좌측화 오적용 방지."""
        doc = _open_bytes(_generate_roadmap({"roadmap_summary": "핵심 결과를 도출하였다."}))
        t = _tables(doc)[8]  # Ⅰ-3 수립 주요 결과 (3×4)
        p = t.cell(2, 1).paragraphs[0]
        assert p.para_pr_id_ref != "11", f"Ⅰ-3 요약이 잘못 좌측화됨: paraPr={p.para_pr_id_ref}"


class TestSentencePeriod:
    def test_helper_adds_period_to_declarative(self):
        from generate import _ensure_sentence_period
        assert _ensure_sentence_period("학습시킬 수 있다") == "학습시킬 수 있다."
        assert _ensure_sentence_period("역량을 강화한다") == "역량을 강화한다."
        assert _ensure_sentence_period("데이터가 미비하다") == "데이터가 미비하다."

    def test_helper_skips_noun_and_existing_terminal(self):
        from generate import _ensure_sentence_period
        assert _ensure_sentence_period("개념 강의") == "개념 강의"
        assert _ensure_sentence_period("역량 확보") == "역량 확보"
        assert _ensure_sentence_period("확인됨") == "확인됨"  # 개조식 무변경
        assert _ensure_sentence_period("완성한다.") == "완성한다."  # 이중온점 방지
        assert _ensure_sentence_period("") == ""

    def test_helper_per_line_multiline(self):
        from generate import _ensure_sentence_period
        assert (
            _ensure_sentence_period("배포할 수 있다\n구성할 수 있다")
            == "배포할 수 있다.\n구성할 수 있다."
        )
        # 명사형 줄은 무변경, 서술형 줄만 온점
        assert (
            _ensure_sentence_period("▪ 개념 강의\n▪ 모델을 배포한다")
            == "▪ 개념 강의\n▪ 모델을 배포한다."
        )

    def test_roadmap_training_goal_gets_period(self):
        doc = _open_bytes(_generate_roadmap({
            "course_specs": [{"training_goal": "모델을 스스로 학습시킬 수 있다"}],
        }))
        cell = _tables(doc)[22].cell(5, 1)
        txt = "".join(r.text or "" for p in cell.paragraphs for r in p.runs)
        assert txt.endswith("있다."), f"훈련목표 온점 실패: {txt!r}"

    def test_roadmap_remarks_declarative_period(self):
        doc = _open_bytes(_generate_roadmap({"company_status_remarks": "인프라가 미비하다"}))
        assert "미비하다." in _all_text(doc)

    def test_existing_period_not_doubled(self):
        doc = _open_bytes(_generate_roadmap({
            "course_specs": [{"main_content": "산출물을 완성한다."}],
        }))
        text = _all_text(doc)
        assert "완성한다." in text
        assert "완성한다.." not in text

    def test_pbl_subject_goals_each_line_period(self):
        doc = _open_bytes(_generate_pbl({
            "subject_training_goals": "모델을 배포할 수 있다\n파이프라인을 구성할 수 있다",
        }))
        text = _all_text(doc)
        assert "배포할 수 있다." in text
        assert "구성할 수 있다." in text


class TestPblRoadmapSummary:
    def test_summary_cell_filled_from_roadmap_summary(self):
        """Ⅱ-1-나 표(10) 요약 셀[2,1]이 roadmap_summary 로 채워짐(+온점)."""
        doc = _open_bytes(_generate_pbl({
            "roadmap_summary": "로드맵 수립 결과를 한 장으로 요약하였다",
        }))
        cell = _tables(doc)[10].cell(2, 1)
        txt = "".join(r.text or "" for p in cell.paragraphs for r in p.runs)
        assert "요약하였다." in txt, f"PBL 요약 미채움: {txt!r}"

    def test_summary_cell_empty_when_unlinked(self):
        """연계 로드맵 없으면(요약 미공급) 요약 셀은 빈 값 유지(폴백)."""
        doc = _open_bytes(_generate_pbl({}))
        cell = _tables(doc)[10].cell(2, 1)
        txt = "".join(r.text or "" for p in cell.paragraphs for r in p.runs)
        assert "{{" not in txt, f"마커 잔존: {txt!r}"


class TestTaskTableUnmerged:
    """과업 표 직무 열 병합 해제 — 서로 다른 직무가 각 행에 정확(품질 소실 없음)."""

    def test_roadmap_job_per_row_no_misalign(self):
        doc = _open_bytes(_generate_roadmap({
            "task_workflow_items": [
                {"job": "생산", "task": "외관검사"},
                {"job": "품질", "task": "불량분류"},
                {"job": "설비", "task": "설비점검"},
            ],
        }))
        t = _tables(doc)[16]  # Ⅱ-3 과업·워크플로우 분석표
        jobs = [(t.cell(r, 0).paragraphs[0].runs[0].text or "") for r in (1, 2, 3)]
        assert jobs == ["생산", "품질", "설비"], f"직무 어긋남: {jobs}"

    def test_pbl_selection_job_per_row_no_misalign(self):
        doc = _open_bytes(_generate_pbl({
            "roadmap_task_selections": [
                {"job": "생산", "task": "외관검사"},
                {"job": "품질", "task": "불량분류"},
                {"job": "설비", "task": "설비점검"},
            ],
        }))
        t = _tables(doc)[23]  # Ⅲ-3-가 훈련대상 업무 선정
        jobs = [(t.cell(r, 0).paragraphs[0].runs[0].text or "") for r in (1, 2, 3)]
        assert jobs == ["생산", "품질", "설비"], f"직무 어긋남: {jobs}"
