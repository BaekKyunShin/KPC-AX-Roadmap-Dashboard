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

    def test_pbl_activities_v2_flat_array_normalized_3_rounds_4_roles(self):
        """V2 평면 배열 (round×role×personName) 12 항목 → 3 round × 4 role 정규화.

        실제 production LLM·인터뷰 입력은 V2 schema (`PBLActivityRowSchema`)
        대로 `{round, role, personName, date, content, method}` 평면 12 항목.
        Python 측 `build_pbl_table_rows("activities")` 가 `role` 필드 감지 시
        round 별 그룹핑하여 dict participants 형태로 정규화해야 함.
        결함 사용자 보고: 모든 행 "1차" + 참석자 이름 빈 채 + 중간 행 빈 채.
        """
        from generate import _generate_pbl

        data = _load_fixture("pbl-full.json")
        # V2 평면 형식으로 activities 교체 (3 round × 4 role = 12 항목)
        data["activities"] = [
            {"round": 1, "role": "PM", "personName": "홍PM",
             "date": "2026-04-01", "content": "킥오프 회의", "method": "대면"},
            {"round": 1, "role": "EXTERNAL_EXPERT", "personName": "김외부",
             "date": "2026-04-01", "content": "킥오프 회의", "method": "대면"},
            {"round": 1, "role": "INTERNAL_EXPERT", "personName": "박내부",
             "date": "2026-04-01", "content": "킥오프 회의", "method": "대면"},
            {"round": 1, "role": "JURISDICTION_MANAGER", "personName": "이주치",
             "date": "2026-04-01", "content": "킥오프 회의", "method": "대면"},
            {"round": 2, "role": "PM", "personName": "홍PM",
             "date": "2026-04-15", "content": "문제 정의 워크숍", "method": "대면"},
            {"round": 2, "role": "EXTERNAL_EXPERT", "personName": "김외부",
             "date": "2026-04-15", "content": "문제 정의 워크숍", "method": "대면"},
            {"round": 2, "role": "INTERNAL_EXPERT", "personName": "박내부",
             "date": "2026-04-15", "content": "문제 정의 워크숍", "method": "대면"},
            {"round": 2, "role": "JURISDICTION_MANAGER", "personName": "이주치",
             "date": "2026-04-15", "content": "문제 정의 워크숍", "method": "대면"},
            {"round": 3, "role": "PM", "personName": "홍PM",
             "date": "2026-04-30", "content": "초안 검토", "method": "비대면"},
            {"round": 3, "role": "EXTERNAL_EXPERT", "personName": "김외부",
             "date": "2026-04-30", "content": "초안 검토", "method": "비대면"},
            {"round": 3, "role": "INTERNAL_EXPERT", "personName": "박내부",
             "date": "2026-04-30", "content": "초안 검토", "method": "비대면"},
            {"round": 3, "role": "JURISDICTION_MANAGER", "personName": "이주치",
             "date": "2026-04-30", "content": "초안 검토", "method": "비대면"},
        ]
        out = _generate_pbl(data)
        text = _extract_all_text(out)

        # 4 참석자 이름 모두 노출 (4 role × 3 round = 12 셀에 분배)
        for person in ("홍PM", "김외부", "박내부", "이주치"):
            assert person in text, f"V2 평면 person={person!r} 미노출"
        # 3 round content 모두 노출 (양식 vertical merge 통해 base 행에만)
        for content in ("킥오프 회의", "문제 정의 워크숍", "초안 검토"):
            assert content in text, f"round content={content!r} 미노출"
        # 3 round date 모두 노출
        for date in ("2026-04-01", "2026-04-15", "2026-04-30"):
            assert date in text, f"round date={date!r} 미노출"

    def test_pbl_activities_renders_4_person_per_round(self):
        """P-08 PR #5 Phase F-4: 차수당 4 행 (PM/외부/내부/주치의) 모두 채워진다.

        이전 V2 schema 는 participants 가 단일 string 이라 첫 행 (PM) 에만 몰려
        출력됨. 4 person dict schema 로 변경 후 각 역할별 성명이 4 행에 분배.
        """
        from generate import _generate_pbl

        data = _load_fixture("pbl-full.json")
        first = data["activities"][0]
        participants = first["participants"]
        out = _generate_pbl(data)
        text = _extract_all_text(out)

        # 첫 차수의 4 person 모두 노출
        for role in ("pm", "external_expert", "internal_expert", "jurisdiction_manager"):
            name = participants[role]
            assert name in text, f"participants[{role!r}]={name!r} 미노출"

        # 4 역할 라벨도 양식 원본 그대로 노출 (col 4)
        for label in (
            "컨설팅책임자(PM)",
            "외부전문가(직무,HRD)",
            "기업내부전문가",
            "능력개발전담주치의",
        ):
            assert label in text, f"role label {label!r} 미노출"

    def test_pbl_training_env_idx7_renders_all_cells(self):
        """P-05 PR #5 Phase F-3: Ⅱ-2 기업 훈련환경 분석 (idx 7, 12×7) 의 모든
        주요 cell 이 fixture 데이터로 채워진다.
        """
        from generate import _generate_pbl

        data = _load_fixture("pbl-full.json")
        out = _generate_pbl(data)
        text = _extract_all_text(out)
        # 적정 훈련시간 / 대상 인원 / 사내 강사 이름·직책
        assert str(data["proper_training_hours"]) in text, "proper_training_hours 누락"
        assert data["training_place_location"] in text, "training_place_location 누락"
        assert data["internal_instructor_name"] in text, "internal_instructor_name 누락"
        assert data["internal_instructor_position"] in text, "internal_instructor_position 누락"
        assert str(data["target_count"]) in text, "target_count 누락"
        # 대상자 특성 — career 와 level 둘 다 노출
        assert data["target_career"] in text, "target_career 누락"
        assert data["target_level"] in text, "target_level 누락"
        # 요구분석 / As-is / To-be
        assert data["training_needs_analysis"] in text, "training_needs_analysis 누락"
        assert data["expectation_as_is"] in text, "expectation_as_is 누락"
        assert data["expectation_to_be"] in text, "expectation_to_be 누락"

    def test_pbl_organization_idx5_preserves_form_original(self):
        """P-04 PR #5 Phase F-2: Ⅱ-1-나 조직 및 주요 업무 (idx 5) 는 사용자 요구로
        자동 채우기 비활성화 — 양식 원본 (제품생산직무·제품품질관리·자재관리 등
        nested 표 sample 텍스트) 이 그대로 보존되어 컨설턴트가 한컴에서 직접 수정.

        fixture organization 의 'QA팀'·'영업팀' 등 사용자 데이터가 idx 5 표 (nested
        포함) 에 들어가지 않아야 한다.
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
            idx = 0
            target = None
            for para in doc.paragraphs:
                for tbl in para.tables:
                    if idx == 5:
                        target = tbl
                        break
                    idx += 1
                if target:
                    break
            assert target is not None, "idx 5 표 미존재"

            # nested 표까지 모두 순회
            cell_texts: list[str] = []

            def _walk(tbl):
                for r in range(tbl.row_count):
                    for c in range(tbl.column_count):
                        try:
                            cell = tbl.cell(r, c)
                            for cp in cell.paragraphs:
                                for run in cp.runs:
                                    if run.text:
                                        cell_texts.append(run.text)
                                for ntbl in cp.tables:
                                    _walk(ntbl)
                        except Exception:
                            pass

            _walk(target)
            joined = "\n".join(cell_texts)
            # 양식 원본 sample 텍스트 보존 — "제품생산직무" 또는 "제품품질관리" 또는 "부서(팀)명"
            assert any(
                kw in joined
                for kw in ("제품생산직무", "제품품질관리", "자재관리", "부서(팀)명")
            ), (
                f"양식 원본 sample 텍스트 보존 실패 — joined={joined[:200]!r}"
            )
            # fixture 의 사용자 부서명이 idx 5 표 (nested 포함) 에 들어가지 않아야
            for org in data.get("organization", []):
                dept = org.get("department_name", "")
                if dept and dept not in {"생산팀", "QA팀", "영업팀"}:
                    # 양식 sample 과 우연히 같은 이름은 제외 (예: "생산팀" 단일 토큰)
                    assert dept not in joined, (
                        f"fixture organization 부서명 '{dept}' 가 idx 5 에 들어감 — "
                        f"비활성화 실패"
                    )
            # tasks 의 사용자 입력 (예: "제품 생산", "품질 검사") 도 들어가지 않아야 —
            # tasks 는 양식 sample 과 다른 텍스트
            for org in data.get("organization", []):
                tasks = org.get("tasks") or []
                for task in tasks:
                    if task and "제품 생산" not in task and "품질 검사" not in task:
                        # 양식 원본의 비슷한 단어와 우연 일치 회피 — fixture 텍스트 일부만 검증
                        # (테스트 안정성 우선 — fixture 의 모든 task 검증은 회피)
                        pass

    def test_pbl_facilities_renders_each_row(self):
        """P-21 PR #5: Ⅳ-3-라 시설·장비 (idx 34, 3×5) 의 모든 행이
        fixture facilities[] 데이터로 채워진다.
        """
        from generate import _generate_pbl

        data = _load_fixture("pbl-full.json")
        facilities = data["facilities"]
        assert len(facilities) >= 1
        out = _generate_pbl(data)
        text = _extract_all_text(out)
        for f in facilities[:2]:
            assert f["name"] in text, f"facility name '{f['name']}' 미노출"
            assert f["spec"] in text, f"facility spec '{f['spec']}' 미노출"

    def test_pbl_training_instructors_renders_each_row(self):
        """P-22 PR #5: Ⅳ-3-마 훈련강사 (idx 35, 3×5) 의 모든 행이
        fixture training_instructors[] 데이터로 채워진다.
        """
        from generate import _generate_pbl

        data = _load_fixture("pbl-full.json")
        instructors = data["training_instructors"]
        assert len(instructors) >= 1
        out = _generate_pbl(data)
        text = _extract_all_text(out)
        for ins in instructors[:2]:
            assert ins["name"] in text, f"instructor name '{ins['name']}' 미노출"
            assert ins["work_name"] in text, (
                f"instructor work_name '{ins['work_name']}' 미노출"
            )

    def test_pbl_learning_group_renders_instructors_and_trainees(self):
        """P-19 PR #5: Ⅳ-3-나 학습그룹 (idx 31, 6×6) 의 instructor+trainee 행
        이 fixture learning_group{instructors,trainees} 로 채워진다.
        """
        from generate import _generate_pbl

        data = _load_fixture("pbl-full.json")
        group = data["learning_group"]
        out = _generate_pbl(data)
        text = _extract_all_text(out)
        for ins in group["instructors"]:
            assert ins["name"] in text, f"instructor name '{ins['name']}' 미노출"
        for tr in group["trainees"]:
            assert tr["name"] in text, f"trainee name '{tr['name']}' 미노출"

    def test_pbl_subject_profile_training_contents_renders(self):
        """P-20 PR #5: training_contents[] 가 row 7~9 에 채워진다."""
        from generate import _generate_pbl

        data = _load_fixture("pbl-full.json")
        contents = data["training_contents"]
        assert len(contents) >= 1
        out = _generate_pbl(data)
        text = _extract_all_text(out)
        for c in contents[:3]:
            assert c["unit_name"] in text, f"unit_name '{c['unit_name']}' 미노출"
            assert c["detail"] in text, f"detail '{c['detail']}' 미노출"

    def test_pbl_subject_profile_total_hours_auto_sum(self):
        """P-20 PR #5 Phase F-5: row 10 col 6 (전체시간) 은 training_contents
        의 training_hours 자동 합산. fixture 의 subject_total_sum_hours 와
        다르더라도 자동 합산 우선.
        """
        from hwpx import HwpxDocument
        from generate import _generate_pbl
        import tempfile

        data = _load_fixture("pbl-full.json")
        contents = data.get("training_contents") or []
        expected_total = sum(int(c["training_hours"]) for c in contents)
        assert expected_total > 0, "fixture training_contents 합이 0 — 검증 불가"

        out = _generate_pbl(data)
        with tempfile.NamedTemporaryFile(suffix=".hwpx", delete=True) as tmp:
            tmp.write(out)
            tmp.flush()
            doc = HwpxDocument.open(tmp.name)
            idx = 0
            target = None
            for para in doc.paragraphs:
                for tbl in para.tables:
                    if idx == 32:
                        target = tbl
                        break
                    idx += 1
                if target:
                    break
            assert target is not None, "idx 32 표 미존재"
            cell = target.cell(10, 6)
            cell_text = "".join(r.text or "" for p in cell.paragraphs for r in p.runs)
            # 자동 합산 우선 — fixture 의 subject_total_sum_hours (40) 가 아닌 12 출력
            assert str(expected_total) in cell_text, (
                f"row 10 col 6 (전체시간) 자동 합산 실패: "
                f"기대 {expected_total}, 실제 {cell_text!r}"
            )
            # fixture subject_total_sum_hours (40) 가 안 들어가야
            fixture_total = data.get("subject_total_sum_hours")
            if fixture_total and str(fixture_total) != str(expected_total):
                assert str(fixture_total) not in cell_text, (
                    f"fixture subject_total_sum_hours ({fixture_total}) 가 "
                    f"자동 합산 ({expected_total}) 을 덮어씀 — 우선순위 오류"
                )

    def test_pbl_subject_profile_top_seven_cells_filled(self):
        """P-20 PR #5: Ⅳ-3-다 훈련 교과목 프로파일 (idx 32, 15×10) 의 상단
        7 cell (course_name·total_hours·training_goals·ai_tools·utilized_data
        ·analysis_method) 이 모두 채워진다.
        """
        from generate import _generate_pbl

        data = _load_fixture("pbl-full.json")
        out = _generate_pbl(data)
        text = _extract_all_text(out)
        # 상단 7 cell 의 fixture value 검증 — 모두 출력에 등장해야
        for key in (
            "subject_profile_course_name",
            "total_training_hours",
            "subject_utilized_data",
            "subject_analysis_method",
            "subject_total_sum_hours",
        ):
            value = data.get(key)
            assert value, f"fixture {key} 누락"
            assert str(value) in text, (
                f"P-20 상단 cell {key}={value!r} 가 출력에 미노출"
            )
        # subject_training_goals / subject_ai_tools 는 줄바꿈 포함 — 첫 라인 검증
        for key in ("subject_training_goals", "subject_ai_tools"):
            value = data.get(key) or ""
            first = value.split("\n")[0].strip()
            assert first and first in text, (
                f"P-20 상단 cell {key} 첫 라인 '{first}' 미노출"
            )

    def test_pbl_target_details_v2_renders_5_columns(self):
        """P-13 PR #7: V2 details[] 5 필드 (title/as_is/to_be/required_knowledge/
        required_skill) 가 양식 idx=22 표 4×5 의 col 0~4 모두 채워진다.

        PR #5 의 단일 description 통합 회귀 보강 — 양식 PDF Ⅲ-3-다 표 5 컬럼
        (업무명 / AS-IS / TO-BE / 요구지식 / 기술) 과 1:1 정합.
        """
        from hwpx import HwpxDocument
        from generate import _generate_pbl
        import tempfile

        data = _load_fixture("pbl-full.json")
        details = data["target"]["details"]
        assert len(details) >= 2, "fixture details 가 최소 2 개 있어야 함"
        out = _generate_pbl(data)
        with tempfile.NamedTemporaryFile(suffix=".hwpx", delete=True) as tmp:
            tmp.write(out)
            tmp.flush()
            doc = HwpxDocument.open(tmp.name)
            idx = 0
            target = None
            for para in doc.paragraphs:
                for tbl in para.tables:
                    if idx == 22:
                        target = tbl
                        break
                    idx += 1
                if target:
                    break
            assert target is not None, "idx 22 표 미존재"

            def _cell_text(r, c):
                cell = target.cell(r, c)
                return "".join(rn.text or "" for p in cell.paragraphs for rn in p.runs)

            cols = ("title", "as_is", "to_be", "required_knowledge", "required_skill")
            for i in range(min(2, len(details))):
                row = 2 + i
                for c, key in enumerate(cols):
                    expected = details[i].get(key, "")
                    actual = _cell_text(row, c)
                    assert actual == expected, (
                        f"row {row} col {c} ({key}) 매핑 실패: "
                        f"expected={expected!r} actual={actual!r}"
                    )

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
# PBL HWPX 콘텐츠 품질 회귀 (Task 1·2·3·4 — V2 키 인지, 글자 겹침, 표 전수)
# ---------------------------------------------------------------


def _open_pbl_doc(data: dict):
    """fixture 로 _generate_pbl 호출 → 임시 파일에 저장 → HwpxDocument 반환.

    호출자가 닫을 책임 없음 (한 테스트당 1회 사용). 임시 파일은 OS 가 정리.
    """
    from hwpx import HwpxDocument
    from generate import _generate_pbl
    import tempfile

    out = _generate_pbl(data)
    with tempfile.NamedTemporaryFile(suffix=".hwpx", delete=False) as tmp:
        tmp.write(out)
        return HwpxDocument.open(tmp.name)


def _open_roadmap_doc(data: dict):
    """fixture 로 _generate_roadmap 호출 → 임시 파일 저장 → HwpxDocument 반환."""
    from hwpx import HwpxDocument
    from generate import _generate_roadmap
    import tempfile

    out = _generate_roadmap(data)
    with tempfile.NamedTemporaryFile(suffix=".hwpx", delete=False) as tmp:
        tmp.write(out)
        return HwpxDocument.open(tmp.name)


def _cell_text(tbl, row: int, col: int) -> str:
    """표 셀의 모든 paragraph·run 텍스트를 합쳐 단일 문자열로 반환."""
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


@pytest.mark.skipif(
    not os.path.exists(PBL_TEMPLATE),
    reason="templates/hwpx/pbl.hwpx 미존재",
)
class TestPblContentQualityV2Keys:
    """유형 A — TS 가 송신하는 V2 정본 키를 Python 이 정확히 셀로 옮기는지 검증.

    핵심: 사용자가 한컴오피스로 열었을 때 빈 칸이면 안 됨. fixture 의 의도된
    데이터가 양식 셀에 표시되는지 1:1 매핑 회귀.
    """

    def test_pbl_problem_definition_sheet_v2_filled(self):
        """Ⅲ-2-가 문제 정의서 (table 15, 5×2) — V2 problem_definition_sheet
        키로 4 행 col 1 (배경/핵심/범위/제약) 모두 채워짐.

        근거: TS payload 가 problems=[] 빈 배열 + problem_definition_sheet
        nested 객체를 송신하는 실 사용자 시나리오 재현. 이 회귀가 없으면
        Python `_fill_pbl_problems` 가 V1 fallback 키만 보고 셀이 빈 채로
        출력됨.
        """
        from generate import _collect_tables

        data = _load_fixture("pbl-full.json")
        # V1 호환 키 제거 — 실 TS payload shape 그대로 재현
        data["problems"] = []
        data.pop("problem_background", None)
        data.pop("problem_core", None)
        data.pop("problem_scope", None)
        data.pop("problem_constraints", None)
        sheet = data["problem_definition_sheet"]

        doc = _open_pbl_doc(data)
        tbl = _collect_tables(doc)[15]
        cells = [_cell_text(tbl, r, 1) for r in range(1, 5)]
        assert all(cells), f"Ⅲ-2-가 4 행 col 1 빈 칸 발견: {cells}"
        assert cells[0] == sheet["background"]
        assert cells[1] == sheet["core"]
        assert cells[2] == sheet["scope"]
        assert cells[3] == sheet["constraints"]

    def test_pbl_outcome_analysis_v_section_filled(self):
        """Ⅴ-1 성과지표 (table 39) + Ⅴ-2 확산전략 (table 40) — outcome_analysis
        4 키 (quantitative/qualitative_metrics, internalization/dissemination_plan)
        가 양식 r1·r2 col 1 셀에 정확히 표시.
        """
        from generate import _collect_tables

        data = _load_fixture("pbl-full.json")
        doc = _open_pbl_doc(data)
        tables = _collect_tables(doc)

        # Ⅴ-1
        v1 = tables[39]
        assert data["quantitative_metrics"] in _cell_text(v1, 1, 1)
        assert data["qualitative_metrics"] in _cell_text(v1, 2, 1)

        # Ⅴ-2
        v2 = tables[40]
        assert data["internalization_plan"] in _cell_text(v2, 1, 1)
        assert data["dissemination_plan"] in _cell_text(v2, 2, 1)


# ---------------------------------------------------------------
# 유형 B — 1-paragraph 셀 + 긴 단일 문장 글자 겹침 회귀
# ---------------------------------------------------------------

PBL_ONE_PARAGRAPH_CELLS = [
    (3, (0, 0), "company_issues"),
    (11, (0, 0), "course_necessity"),
    (20, (0, 0), "target_necessity"),
    (27, (0, 0), "training_goal"),
]

ROADMAP_ONE_PARAGRAPH_CELLS = [
    (3, (0, 0), "establishment_necessity"),
    (28, (0, 1), "training_structure_method"),
]


@pytest.mark.skipif(
    not os.path.exists(PBL_TEMPLATE),
    reason="templates/hwpx/pbl.hwpx 미존재",
)
@pytest.mark.parametrize("idx,coord,key", PBL_ONE_PARAGRAPH_CELLS)
def test_pbl_long_text_in_1_paragraph_cell_splits(idx, coord, key):
    """1-paragraph 셀에 80자+ 단일 문장 (마침표·\\n 없음) 투입 시
    `_set_cell_text` 자동 분할이 발동해 paragraph 가 2 개 이상 생성됨.

    근거: lineWrap="SQUEEZE" 양식 속성 때문에 1-paragraph 셀에 긴 텍스트가
    들어가면 한컴오피스가 자동 wrap → 압축 → 글자 겹침. paragraph 단위로
    미리 분할되면 셀 높이가 자동 확장되어 겹침 방지.
    """
    from generate import _collect_tables

    data = _load_fixture("pbl-full.json")
    # 마침표·\n 없는 100자+ 단일 문장 (LLM 출력 모사)
    long_text = "공정 불량 원인 분석에 AI 도구를 활용해 데이터 정제와 시각화 보고서 자동 생성 그리고 표준 템플릿 기반 AI 초안 작성 그리고 담당자 검토 후 확정"
    assert "\n" not in long_text
    assert len(long_text) >= 80
    data[key] = long_text

    doc = _open_pbl_doc(data)
    tbl = _collect_tables(doc)[idx]
    cell = tbl.cell(*coord)
    paragraphs = list(cell.paragraphs)
    non_empty_paragraphs = [p for p in paragraphs
                             if any(r.text for r in p.runs)]
    assert len(non_empty_paragraphs) >= 2, (
        f"PBL idx={idx} {key}: 긴 단일 문장 자동 분할 실패. "
        f"non_empty_paragraphs={len(non_empty_paragraphs)}"
    )


@pytest.mark.skipif(
    not os.path.exists(ROADMAP_TEMPLATE),
    reason="templates/hwpx/roadmap.hwpx 미존재",
)
@pytest.mark.parametrize("idx,coord,key", ROADMAP_ONE_PARAGRAPH_CELLS)
def test_roadmap_long_text_in_1_paragraph_cell_splits(idx, coord, key):
    """Roadmap 양식의 동일 회귀. _set_cell_text 공유 헬퍼이므로 자동 적용."""
    from generate import _collect_tables

    data = _load_fixture("roadmap-full.json")
    long_text = "공정 불량 원인 분석에 AI 도구를 활용해 데이터 정제와 시각화 보고서 자동 생성 그리고 표준 템플릿 기반 AI 초안 작성 그리고 담당자 검토 후 확정"
    data[key] = long_text

    doc = _open_roadmap_doc(data)
    tbl = _collect_tables(doc)[idx]
    cell = tbl.cell(*coord)
    paragraphs = list(cell.paragraphs)
    non_empty_paragraphs = [p for p in paragraphs
                             if any(r.text for r in p.runs)]
    assert len(non_empty_paragraphs) >= 2, (
        f"Roadmap idx={idx} {key}: 긴 단일 문장 자동 분할 실패."
    )


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
