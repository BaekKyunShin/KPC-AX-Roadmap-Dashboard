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
