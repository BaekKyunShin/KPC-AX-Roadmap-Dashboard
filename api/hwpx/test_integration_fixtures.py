"""
Phase E: fixture 기반 통합 테스트.

- fixture 4개 (roadmap-full/empty, pbl-full/empty) 입력으로 generate.py 의
  _generate_roadmap / _generate_pbl 을 직접 호출.
- 출력 bytes 가 ZIP 매직 (PK\\x03\\x04) 으로 시작하는지 (HWPX = OpenXML zip 컨테이너).
- python-hwpx 로 다시 열어 본문 텍스트에 fixture 의 핵심 값이 포함되는지 (full 케이스),
  또는 본문 텍스트에 잔존 fixture 값이 없는지 (empty 케이스) 검증.

DoD #6 재정의 (셀별 텍스트 검증 — payload TS ↔ SSOT 동기화는 vitest 가 별도 검증).
"""
import json
import os
import sys

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
        # empty 케이스도 템플릿 그대로 출력되므로 크기는 비슷
        assert len(out) > 100_000

    def test_roadmap_full_contains_company_name_in_text(self):
        """full fixture 의 회사명이 출력 본문에 등장."""
        from hwpx import HwpxDocument
        from generate import _generate_roadmap
        import tempfile

        data = _load_fixture("roadmap-full.json")
        out = _generate_roadmap(data)
        with tempfile.NamedTemporaryFile(suffix=".hwpx", delete=False) as tmp:
            tmp.write(out)
            tmp_path = tmp.name
        try:
            doc = HwpxDocument.open(tmp_path)
            # 본문 + 표 셀 텍스트 모두 합쳐 검증
            all_text = []
            for para in doc.paragraphs:
                for run in para.runs:
                    if run.text:
                        all_text.append(run.text)
                for tbl in para.tables:
                    for ri in range(tbl.row_count):
                        for ci in range(tbl.column_count):
                            cell = tbl.cell(ri, ci)
                            for cp in cell.paragraphs:
                                for r in cp.runs:
                                    if r.text:
                                        all_text.append(r.text)
            joined = "\n".join(all_text)
            assert "㈜AI산업자동화" in joined, "회사명이 출력에 없음"
            assert "홍길동" in joined or "12345-67890" in joined, (
                "PM 이름 또는 고용보험사업장관리번호가 출력에 없음"
            )
        finally:
            os.unlink(tmp_path)

    def test_roadmap_hrd_url_replaced_with_attach_notice(self):
        """R-08 PR #5: hrd_report_attachment URL 이 본문에 raw 노출되지 않고
        별첨 PDF 안내문구로 치환된다.
        """
        from generate import _generate_roadmap

        data = _load_fixture("roadmap-full.json")
        # fixture 는 https://x.example/hrd-report.pdf 를 사용 — URL fallback 검증
        out = _generate_roadmap(data)
        text = _extract_all_text(out)
        assert data["hrd_report_attachment"].startswith("http"), "fixture 가 URL 형이 아님"
        assert "https://x.example" not in text, "HRD URL 이 본문에 raw 노출됨"
        assert "별첨 페이지 참조" in text, "URL fallback 안내문구 누락"

    def test_roadmap_cover_replaces_company_name_and_date(self):
        """R-01: 표지 본문 패턴 `(기업명)`·`202x. 00. 00.` 가 회사명·일자로 치환된다.

        신규 정본 (84d1e67) 의 표지 paragraph 3 = `AI훈련로드맵 컨설팅 보고서(기업명)`,
        paragraph 8 = `202x. 00. 00.` — 정본에 placeholder 없으므로 본문 텍스트 패턴
        직접 치환이 필요하다.
        """
        from generate import _generate_roadmap

        data = _load_fixture("roadmap-full.json")
        out = _generate_roadmap(data)
        text = _extract_all_text(out)
        assert "(기업명)" not in text, (
            "표지 placeholder `(기업명)` 가 raw 노출 — 회사명 본문 치환 누락"
        )
        assert "202x. 00. 00." not in text, (
            "표지 일자 placeholder `202x. 00. 00.` 가 raw 노출 — 일자 본문 치환 누락"
        )
        assert "㈜AI산업자동화" in text
        assert "2026.04.30." in text, "일자 fixture 값 미노출"


@pytest.mark.skipif(
    not os.path.exists(PBL_TEMPLATE),
    reason="templates/hwpx/pbl.hwpx 미존재",
)
class TestPblFixtures:
    def test_pbl_full_generates_valid_hwpx(self):
        from generate import _generate_pbl

        data = _load_fixture("pbl-full.json")
        out = _generate_pbl(data)
        assert _is_zip_bytes(out)
        assert len(out) > 50_000

    def test_pbl_empty_generates_valid_hwpx(self):
        from generate import _generate_pbl

        data = _load_fixture("pbl-empty.json")
        out = _generate_pbl(data)
        assert _is_zip_bytes(out)
        assert len(out) > 50_000

    def test_pbl_target_necessity_score_renders_in_priority_column(self):
        """P-11 PR #5: V2 target.necessity_score (1~5) 가 양식 idx 19 의
        col 1~5 점수 체크칸에 √ 표시 + col 6 = ☑ 선정.
        """
        from hwpx import HwpxDocument
        from generate import _generate_pbl
        import tempfile

        data = _load_fixture("pbl-full.json")
        score = data["target"]["necessity_score"]
        assert 1 <= score <= 5, "fixture necessity_score 가 1~5 범위 아님"
        out = _generate_pbl(data)
        with tempfile.NamedTemporaryFile(suffix=".hwpx", delete=True) as tmp:
            tmp.write(out)
            tmp.flush()
            doc = HwpxDocument.open(tmp.name)
            idx = 0
            target = None
            for para in doc.paragraphs:
                for tbl in para.tables:
                    if idx == 19:
                        target = tbl
                        break
                    idx += 1
                if target:
                    break
            assert target is not None, "idx 19 표 미존재"
            # row 1 col `score` = √
            cell = target.cell(1, score)
            score_text = "".join(r.text or "" for p in cell.paragraphs for r in p.runs)
            assert "√" in score_text, (
                f"necessity_score={score} 위치 (1,{score}) 에 √ 미표시 — text={score_text!r}"
            )
            # row 1 col 6 = ☑
            selected_cell = target.cell(1, 6)
            selected_text = "".join(
                r.text or "" for p in selected_cell.paragraphs for r in p.runs
            )
            assert "☑" in selected_text, "선정 ☑ 미표시"

    def test_pbl_target_necessity_no_orphan_bullet(self):
        """P-12 PR #5: Ⅲ-3-나 AI기반 문제해결 필요성 (idx 20, 1×1) 의 1 줄 입력에
        머리기호가 1 개만 표시되어야 한다. 빈 paragraph 의 paraPrIDRef 를 기본
        단락 (0) 으로 reset 하여 자동 머리기호 회피.
        """
        from hwpx import HwpxDocument
        from generate import _generate_pbl
        import tempfile

        data = _load_fixture("pbl-full.json")
        out = _generate_pbl(data)
        with tempfile.NamedTemporaryFile(suffix=".hwpx", delete=True) as tmp:
            tmp.write(out)
            tmp.flush()
            doc = HwpxDocument.open(tmp.name)
            # idx 20 의 cell(0,0) paragraph 검사
            idx = 0
            target = None
            for para in doc.paragraphs:
                for tbl in para.tables:
                    if idx == 20:
                        target = tbl
                        break
                    idx += 1
                if target:
                    break
            assert target is not None, "idx 20 표 미존재"
            cell = target.cell(0, 0)
            # 텍스트가 있는 paragraph 와 빈 paragraph 의 paraPrIDRef 검사.
            # 빈 paragraph 는 paraPrIDRef='0' (기본 단락 — 머리기호 없음) 이어야.
            empty_paras_with_bullet_style = []
            for pi, p in enumerate(cell.paragraphs):
                final_text = "".join(r.text or "" for r in p.runs)
                if not final_text:
                    pidref = p.para_pr_id_ref or "None"
                    if pidref != "0":
                        empty_paras_with_bullet_style.append((pi, pidref))
            assert not empty_paras_with_bullet_style, (
                f"빈 paragraph 의 paraPrIDRef 가 기본 단락(0) 으로 reset 되지 않음: "
                f"{empty_paras_with_bullet_style}"
            )

    def test_pbl_renders_company_issues_in_section_2_1_a(self):
        """P-03 PR #5: Ⅱ-1-가 기업 경영 이슈 (idx 3, 1×1) 셀에 fixture 의
        company_issues 텍스트가 정확히 출력된다.

        기존 _fill_simple_box(idx, 0, 1, ...) 는 1×1 표에서 col 1 미존재로
        silent skip 되었다. _fill_pbl_simple_content 로 (0,0) 좌표 사용.
        """
        from generate import _generate_pbl

        data = _load_fixture("pbl-full.json")
        out = _generate_pbl(data)
        text = _extract_all_text(out)
        assert data["company_issues"] in text, "Ⅱ-1-가 company_issues 미출력"

    def test_pbl_renders_course_necessity_in_section_2_3_b(self):
        """P-07 PR #5: Ⅱ-3-나 AI훈련과정 개발 필요성 (idx 11, 1×1) 셀에
        course_necessity 가 정확히 출력된다.
        """
        from generate import _generate_pbl

        data = _load_fixture("pbl-full.json")
        out = _generate_pbl(data)
        text = _extract_all_text(out)
        assert data["course_necessity"] in text, "Ⅱ-3-나 course_necessity 미출력"

    def test_pbl_hrd_url_not_leaked_to_body(self):
        """P-06 PR #5: PBL 정본은 placeholder 가 없고 양식 원본 표 (idx 9·10) 가
        그대로 유지되므로 fixture 의 hrd_report_attachment URL 이 본문에 raw 노출 0건.

        (URL fallback 안내문구는 placeholder 치환 경로가 없어 본문에 등장하지 않으나,
        unit 단계의 build_pbl_placeholder_map 결과는 fallback 으로 치환됨 —
        test_pbl_hrd_report_filename_kept_as_is 등에서 unit 검증.)
        """
        from generate import _generate_pbl

        data = _load_fixture("pbl-full.json")
        assert data["hrd_report_attachment"].startswith("http"), "fixture 가 URL 형이 아님"
        out = _generate_pbl(data)
        text = _extract_all_text(out)
        assert "https://x.example" not in text, "PBL HRD URL 이 본문에 raw 노출됨"

    def test_pbl_cover_renders_pm_external_internal_doctor(self):
        """P-01: PBL 표지 nested 8×5 에 PM/외부전문가/내부전문가/주치의 소속·성명 노출.

        신규 정본 paragraph 0 의 shallow_table[0] (2x2) 의 cell(1,0) 과 cell(1,1) 안에
        nested 8x5 표 (구분/소속/성명/-/기업체확인) 가 두 번 들어 있다.
        cover 객체의 PM(1) + external(2) + internal(2) + doctor(2) 가 row 1~7 에 채워진다.
        """
        from generate import _generate_pbl

        data = _load_fixture("pbl-full.json")
        out = _generate_pbl(data)
        text = _extract_all_text(out)
        cover = data.get("cover") or {}
        pm = (cover.get("pm") or {})
        ext = ((cover.get("external_experts") or [{}])[0])
        intl = ((cover.get("internal_experts") or [{}])[0])
        doc = ((cover.get("doctors") or [{}])[0])
        assert pm.get("affiliation") and pm["affiliation"] in text, "PM 소속 미노출"
        assert pm.get("name") and pm["name"] in text, "PM 성명 미노출"
        assert ext.get("affiliation") and ext["affiliation"] in text, "외부전문가 소속 미노출"
        assert ext.get("name") and ext["name"] in text, "외부전문가 성명 미노출"
        assert intl.get("affiliation") and intl["affiliation"] in text, "내부전문가 소속 미노출"
        assert intl.get("name") and intl["name"] in text, "내부전문가 성명 미노출"
        assert doc.get("affiliation") and doc["affiliation"] in text, "주치의 소속 미노출"
        assert doc.get("name") and doc["name"] in text, "주치의 성명 미노출"

    def test_pbl_overview_renders_trainee_job_and_goal_checkboxes(self):
        """P-02 PR #5: Ⅰ. 훈련과정 개요 (idx 1) 의 훈련생·훈련직무·훈련목표 모두 출력.

        - row 11 col 1 = training_target_label (예: "QA 인력 5명")
        - row 12 col 1 = training_job (예: "AI 비전 기반 QA 검사 자동화")
        - row 14 (훈련 목표) col 1~4 = training_goals 배열 → 체크박스 ☑ 토글
        """
        from generate import _generate_pbl

        data = _load_fixture("pbl-full.json")
        out = _generate_pbl(data)
        text = _extract_all_text(out)
        # 훈련생
        assert data["training_target_label"] in text, "training_target_label 누락"
        # 훈련 직무
        assert data["training_job"] in text, "training_job 누락"
        # 훈련 목표 체크박스 — selected goals 가 ☑ 로 토글됐는지
        for goal in data["training_goals"]:
            # ☑ 또는 ☐ 가 라벨 앞에 붙음 — selected 는 ☑
            assert f"☑ {goal}" in text or f"☑{goal}" in text, (
                f"training_goal '{goal}' 체크박스 ☑ 미토글"
            )

    def test_pbl_full_contains_v2_data_in_text(self):
        """full fixture 의 V2 신규 데이터가 출력에 등장."""
        from hwpx import HwpxDocument
        from generate import _generate_pbl
        import tempfile

        data = _load_fixture("pbl-full.json")
        out = _generate_pbl(data)
        with tempfile.NamedTemporaryFile(suffix=".hwpx", delete=False) as tmp:
            tmp.write(out)
            tmp_path = tmp.name
        try:
            doc = HwpxDocument.open(tmp_path)
            all_text = []
            for para in doc.paragraphs:
                for run in para.runs:
                    if run.text:
                        all_text.append(run.text)
                for tbl in para.tables:
                    for ri in range(tbl.row_count):
                        for ci in range(tbl.column_count):
                            cell = tbl.cell(ri, ci)
                            for cp in cell.paragraphs:
                                for r in cp.runs:
                                    if r.text:
                                        all_text.append(r.text)
            joined = "\n".join(all_text)
            # V2 신규 키 cover 검증
            assert "AI 비전 자동검사 PBL 과정" in joined, "course_name 없음"
            assert "검사 정확도 8% 미달" in joined, "V2 problems[0].title 없음"
            assert "AI 비전 자동검사" in joined, "V2 target.name 없음"
            # AI 레벨 라벨 (V2 BASIC/EXPLORER/USER/LEADER → 한글)
            assert "AI탐구형" in joined, "current_ai_level 한글 라벨 (EXPLORER) 없음"
            assert "AI활용형" in joined, "expected_ai_level 한글 라벨 (USER) 없음"
        finally:
            os.unlink(tmp_path)


# ---------------------------------------------------------------
# placeholder 잔존 검증 (옵션 B 채택 — 사용자 정본에 placeholder 가 없으므로 0)
# ---------------------------------------------------------------


@pytest.mark.skipif(
    not (os.path.exists(ROADMAP_TEMPLATE) and os.path.exists(PBL_TEMPLATE)),
    reason="템플릿 미존재",
)
class TestNoPlaceholderResidue:
    def test_roadmap_no_placeholder_braces(self):
        from generate import _generate_roadmap
        from hwpx import HwpxDocument
        import tempfile

        data = _load_fixture("roadmap-full.json")
        out = _generate_roadmap(data)
        with tempfile.NamedTemporaryFile(suffix=".hwpx", delete=False) as tmp:
            tmp.write(out)
            tmp_path = tmp.name
        try:
            doc = HwpxDocument.open(tmp_path)
            joined = []
            for para in doc.paragraphs:
                for run in para.runs:
                    if run.text:
                        joined.append(run.text)
                for tbl in para.tables:
                    for ri in range(tbl.row_count):
                        for ci in range(tbl.column_count):
                            cell = tbl.cell(ri, ci)
                            for cp in cell.paragraphs:
                                for r in cp.runs:
                                    if r.text:
                                        joined.append(r.text)
            text = "\n".join(joined)
            assert "{{" not in text, f"잔존 placeholder 발견: {text[:200]}"
            assert "}}" not in text
        finally:
            os.unlink(tmp_path)

    def test_pbl_no_placeholder_braces(self):
        from generate import _generate_pbl
        from hwpx import HwpxDocument
        import tempfile

        data = _load_fixture("pbl-full.json")
        out = _generate_pbl(data)
        with tempfile.NamedTemporaryFile(suffix=".hwpx", delete=False) as tmp:
            tmp.write(out)
            tmp_path = tmp.name
        try:
            doc = HwpxDocument.open(tmp_path)
            joined = []
            for para in doc.paragraphs:
                for run in para.runs:
                    if run.text:
                        joined.append(run.text)
                for tbl in para.tables:
                    for ri in range(tbl.row_count):
                        for ci in range(tbl.column_count):
                            cell = tbl.cell(ri, ci)
                            for cp in cell.paragraphs:
                                for r in cp.runs:
                                    if r.text:
                                        joined.append(r.text)
            text = "\n".join(joined)
            assert "{{" not in text
            assert "}}" not in text
        finally:
            os.unlink(tmp_path)


# ---------------------------------------------------------------
# max-length / special-chars 회귀 (DoD #6 — 4 조합 보강)
# ---------------------------------------------------------------


def _extract_all_text(out: bytes) -> str:
    """HWPX bytes → 본문·표 셀 (nested 표 포함) 텍스트를 한 문자열로 합쳐 반환.

    표지 nested 8×5 표 (PM/외부전문가/내부전문가/주치의) 같은 nested 구조도
    재귀로 순회하여 텍스트에 포함시킨다. PBL 표지 cell 내부 nested 표를
    검증할 수 있도록 PR #5 에서 보강.
    """
    from hwpx import HwpxDocument
    import tempfile

    with tempfile.NamedTemporaryFile(suffix=".hwpx", delete=False) as tmp:
        tmp.write(out)
        tmp_path = tmp.name
    try:
        doc = HwpxDocument.open(tmp_path)
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
                        # nested 표 재귀
                        for ntbl in cp.tables:
                            _walk_table(ntbl)

        for para in doc.paragraphs:
            for run in para.runs:
                if run.text:
                    chunks.append(run.text)
            for tbl in para.tables:
                _walk_table(tbl)
        return "\n".join(chunks)
    finally:
        os.unlink(tmp_path)


@pytest.mark.skipif(
    not (os.path.exists(ROADMAP_TEMPLATE) and os.path.exists(PBL_TEMPLATE)),
    reason="템플릿 미존재",
)
class TestRegressionMaxLengthAndSpecialChars:
    def test_roadmap_max_length_generates_and_preserves_repeated_rows(self):
        """긴 한국어 단락 + 수행일지 반복 행 + 명세서가 출력에 보존된다.

        검증 전략:
          - 긴 단일 단락은 셀 폭에 의해 시각적 줄바꿈이 발생하므로 시작 키워드 검증
          - performance_activities 는 Ⅰ-2 표 합의 (R-04 ⚠️) 에 따라 max 3 행
          - course_specs 는 양식 max 3 블록 — 2 번째 강의 보존
        """
        from generate import _generate_roadmap

        data = _load_fixture("roadmap-max-length.json")
        out = _generate_roadmap(data)
        assert _is_zip_bytes(out)
        assert len(out) > 100_000
        text = _extract_all_text(out)
        # 긴 단락의 시작부 키워드 — establishment_necessity 첫 문장
        assert "수동 품질 검사 공정" in text, "establishment_necessity 시작부 누락"
        # 수행일지 — 양식 합의 max 3 차수 보존
        assert "1차 인터뷰" in text, "performance_activities[0] 누락"
        assert "3차 검토" in text, "performance_activities[2] 누락"
        # 명세서 2 건 — 두 번째 강의 (심화 과정) 보존
        assert "심화 과정" in text, "course_specs[1] 누락"

    def test_roadmap_special_chars_escapes_xml_unsafe_payload(self):
        """<>&\"' 특수문자가 raw 로 노출되지 않고 정상 텍스트로 환원된다.

        python-hwpx 가 XML 파싱 후 텍스트로 환원하므로 텍스트 단계에서는 원래 형태로 보임.
        검증 핵심: ZIP 매직 + 회사명 페이로드 환원 + XML 이스케이프 깨짐 0 건.
        """
        from generate import _generate_roadmap

        data = _load_fixture("roadmap-special-chars.json")
        out = _generate_roadmap(data)
        assert _is_zip_bytes(out)
        text = _extract_all_text(out)
        # 특수문자 환원 검증 — 회사명 원문 그대로
        assert "㈜<특수>&\"문자'테스트\\회사" in text, (
            "특수문자 회사명이 환원되지 않음 — 이스케이프/언이스케이프 정합성 깨짐"
        )
        # XML 이스케이프 누수 확인 — "&amp;amp;" 가 raw 텍스트로 보이면 이중 이스케이프
        assert "&amp;amp;" not in text, "이중 이스케이프 발생 (XML 파싱 깨짐)"
        # 이모지 환원
        assert "😀" in text, "emoji 누락"

    def test_pbl_max_length_generates_valid_hwpx(self):
        """V2 PBL max-length fixture 가 정상 ZIP 으로 생성되고 핵심 데이터가 보존된다."""
        from generate import _generate_pbl

        data = _load_fixture("pbl-max-length.json")
        out = _generate_pbl(data)
        assert _is_zip_bytes(out)
        assert len(out) > 50_000
        text = _extract_all_text(out)
        # 회사명 max-length 보존
        assert "주식회사 매우매우긴회사명" in text, "company_name max-length 누락"
        # V2 problems 첫 항목 — title 부분 시작 키워드 (HWPX 셀 폭에 의한 줄바꿈 회피)
        assert "검사 정확도 8% 미달" in text, "V2 problems[0].title 누락"
        # ai_tool_usage_plan 1단계 stage 라벨 보존
        assert "1단계" in text, "ai_tool_usage_plan stage 누락"

    def test_pbl_special_chars_escapes_v2_payload(self):
        """V2 problems / target / activities 의 특수문자가 안전하게 환원된다."""
        from generate import _generate_pbl

        data = _load_fixture("pbl-special-chars.json")
        out = _generate_pbl(data)
        assert _is_zip_bytes(out)
        text = _extract_all_text(out)
        # 회사명 특수문자 환원 (cover 영역)
        assert "㈜<특수>&\"문자'테스트\\회사" in text, "company_name 특수문자 누락"
        # 산업코드 / 주업종 특수문자 환원
        assert "전자 <부품>" in text, "industry_main 특수문자 누락"
        # 담당자 emoji 환원
        assert "😀" in text, "contact_name emoji 누락"
        # 이중 이스케이프 누수 0건
        assert "&amp;amp;" not in text, "이중 이스케이프 발생"
        # 잔존 placeholder 0건
        assert "{{" not in text and "}}" not in text
