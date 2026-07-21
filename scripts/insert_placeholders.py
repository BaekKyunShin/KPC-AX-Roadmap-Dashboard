#!/usr/bin/env python3
"""SSOT 기반 HWPX 마커 삽입기 (빌드 타임 · 1회 실행).

`docs/references/hwpx-placeholders.json` 의 location 좌표를 읽어 산인공 정본 양식
셀에 `{{키}}` 마커를 심고, `templates/hwpx/*.hwpx` 템플릿을 생성한다.

**좌표는 이 스크립트에서만 쓰인다.** 런타임(`api/hwpx/generate.py`)은 좌표를 전혀
모른 채 마커만 치환하므로, 앞으로 양식의 표가 추가·삭제돼도 런타임이 깨지지 않는다.

사용:
    .venv-hwpx/bin/python3 scripts/insert_placeholders.py roadmap
    .venv-hwpx/bin/python3 scripts/insert_placeholders.py --check roadmap   # 삽입 없이 검증만
"""
import argparse
import copy
import json
import sys
from pathlib import Path

from hwpx import HwpxDocument

ROOT = Path(__file__).resolve().parent.parent
SSOT_PATH = ROOT / "docs" / "references" / "hwpx-placeholders.json"

# 트랙별 (정본 원본, 출력 템플릿)
TRACKS = {
    "roadmap": (
        ROOT / "docs" / "references" / "1.AI훈련로드맵 보고서(양식).hwpx",
        ROOT / "templates" / "hwpx" / "roadmap.hwpx",
    ),
    "pbl": (
        ROOT
        / "docs"
        / "references"
        / "2.문제해결형(PBL) AI+직무 훈련과정 개발 및 결과보고서(양식).hwpx",
        ROOT / "templates" / "hwpx" / "pbl.hwpx",
    ),
}


def collect_tables(doc):
    """generate.py::_collect_tables 와 동일 (shallow: top-level paragraph 의 표만)."""
    return [t for para in doc.paragraphs for t in para.tables]


_HP_NS = "{http://www.hancom.co.kr/hwpml/2011/paragraph}"


def consolidate_checkbox_fwspace(doc) -> int:
    """체크박스 라벨 run 의 <hp:fwSpace/> 를 제거해 텍스트를 단일 노드로 통합.

    양식 일부 체크박스 라벨(예: 교과목 프로파일 '방법' 셀의 '□ 작업장 평가')은
    '□ ' + fwSpace + '작업장 평가' 구조라, 런타임 텍스트 치환('□ X'→'☑ X') 시
    fwSpace tail 이 남아 라벨이 중복 렌더된다. 빌드 단계에서 fwSpace 를 없애고
    텍스트를 합쳐 원천 차단한다(체크박스 글자 □/☑/☐ 포함 <hp:t> 만 대상).
    """
    count = 0
    for para in doc.paragraphs:
        for tbl in para.tables:
            for ri in range(tbl.row_count):
                for ci in range(tbl.column_count):
                    try:
                        cell = tbl.cell(ri, ci)
                    except Exception:
                        continue
                    for t in cell.element.iter(f"{_HP_NS}t"):
                        children = list(t)
                        if not any(c.tag == f"{_HP_NS}fwSpace" for c in children):
                            continue
                        full = (t.text or "") + "".join(c.tail or "" for c in children)
                        if not any(g in full for g in ("□", "☑", "☐")):
                            continue
                        for c in children:
                            t.remove(c)
                        t.text = full
                        count += 1
    return count


def center_signature_columns(doc, table_index: int = 2, columns=(1, 2)) -> int:
    """표지 서명표의 소속/성명 열 값 셀을 헤더와 동일한 CENTER paraPr 로 재지정.

    값 셀은 기본 JUSTIFY(좌측 정렬처럼 보임)라, 사용자 요구대로 소속·성명 열을
    가운데 정렬한다. 헤더행(0)의 소속 열 paraPr(=CENTER)를 데이터 행 col1/col2 에
    재사용한다(트랙 무관: 하드코딩 id 대신 헤더 paraPr 추종).
    """
    tables = collect_tables(doc)
    if table_index >= len(tables):
        return 0
    tbl = tables[table_index]
    try:
        center_pid = tbl.cell(0, columns[0]).paragraphs[0].para_pr_id_ref
    except Exception:
        return 0
    count = 0
    for r in range(1, tbl.row_count):
        for c in columns:
            try:
                cell = tbl.cell(r, c)
            except Exception:
                continue
            for p in cell.paragraphs:
                if p.para_pr_id_ref != center_pid:
                    p.para_pr_id_ref = center_pid
                    count += 1
    return count


def left_align_spec_details(doc, left_pid: str = "11") -> int:
    """세부 내용 셀을 좌측 정렬(LEFT paraPr)로 재지정 — 로드맵·PBL 공통.

    로드맵 훈련과정 명세서 세부내용 마커 '{{roadmap_course_i_subject_j_details}}'
    (양식 CENTER paraPr 21) 와 PBL 교과목 프로파일 세부내용 마커
    '{{pbl_ops_content_i_detail}}' (양식 LEFT+자동글머리 paraPr) 를 모두 식별해
    LEFT no-bullet paraPr 로 통일한다. 글머리(▪)는 generate.py 가 값에 부여하므로
    양식 자동 글머리(중복 방지)를 쓰지 않고 정렬만 LEFT 로 맞춘다. paraPr 11(LEFT)은
    여백·간격이 동일하고 정렬만 다르므로 시각 변화 최소.
    """
    count = 0
    for para in doc.paragraphs:
        for tbl in para.tables:
            for ri in range(tbl.row_count):
                for ci in range(tbl.column_count):
                    try:
                        cell = tbl.cell(ri, ci)
                    except Exception:
                        continue
                    txt = "".join(r.text or "" for p in cell.paragraphs for r in p.runs)
                    is_spec = "_subject_" in txt and "_details}}" in txt
                    is_profile = "_content_" in txt and "_detail}}" in txt
                    if is_spec or is_profile:
                        for p in cell.paragraphs:
                            if p.para_pr_id_ref != left_pid:
                                p.para_pr_id_ref = left_pid
                                count += 1
    return count


def left_align_spec_goal_content(doc, left_pid: str = "11") -> int:
    """로드맵 명세서 훈련목표·주요 훈련 내용 셀을 좌측 정렬(LEFT paraPr)로 재지정.

    명세서 마커 '{{roadmap_course_i_training_goal}}'[5,1] 와
    '{{roadmap_course_i_main_content}}'[6,1] (양식 CENTER paraPr 21) 을 LEFT 로 통일한다.
    '_course_' 접두를 스코프로 걸어 Ⅰ-3 수립 주요 결과 요약
    '{{roadmap_outcome_main_content}}' 와 PBL '{{pbl_roadmap_main_content}}'
    (둘 다 CENTER 유지)를 제외한다. paraPr 11(LEFT)은 여백·간격이 동일하고 정렬만 다르다.
    """
    count = 0
    for para in doc.paragraphs:
        for tbl in para.tables:
            for ri in range(tbl.row_count):
                for ci in range(tbl.column_count):
                    try:
                        cell = tbl.cell(ri, ci)
                    except Exception:
                        continue
                    txt = "".join(r.text or "" for p in cell.paragraphs for r in p.runs)
                    if "_course_" in txt and (
                        "_training_goal}}" in txt or "_main_content}}" in txt
                    ):
                        for p in cell.paragraphs:
                            if p.para_pr_id_ref != left_pid:
                                p.para_pr_id_ref = left_pid
                                count += 1
    return count


def set_cell(tbl, row: int, col: int, text: str) -> bool:
    """셀의 모든 run 을 비우고 첫 run 에 마커를 기입."""
    if row < 0 or row >= tbl.row_count or col < 0 or col >= tbl.column_count:
        return False
    try:
        cell = tbl.cell(row, col)
    except Exception:
        return False
    if not cell.paragraphs or not cell.paragraphs[0].runs:
        return False
    for p in cell.paragraphs:
        for r in p.runs:
            r.text = ""
    cell.paragraphs[0].runs[0].text = text
    return True


def expand(template: str, **kw) -> str:
    """placeholder_template 전개: "{{a_{i}_{field}}}" → "{{a_0_name}}" """
    out = template
    for k, v in kw.items():
        out = out.replace("{" + k + "}", str(v))
    return out


def unmerge_rowspan2_col(tbl, col: int) -> bool:
    """직무 열의 rowSpan=2 세로 병합을 해제 — 매 데이터 행이 독립 직무 셀을 갖게 한다.

    양식이 첫 직무 셀을 2행 병합(과업 0·1 공유)해 둬, 직무별 과업 개수가 다르면
    직무 라벨이 어긋나거나 흡수돼 사라지던 것을 근본 해소한다. 병합 앵커의
    rowSpan 을 1 로 줄이고, 기존 형제(rowSpan=1) 셀을 deepcopy 해 빈 텍스트로
    다음 행에 삽입한다(borderFill·charPr·paraPr·margin 보존, 문단 id 유일화).
    python-hwpx 가 lxml 변경을 즉시 반영하므로(실측) 이후 insert 루프가 새 셀에
    마커를 정상 기입한다. 셀을 추가하지만 형제 구조를 그대로 복제하므로 OWPML 유효.
    """
    hp = _HP_NS
    try:
        tbl_el = tbl.cell(0, col).element.getparent().getparent()
    except Exception:
        return False

    def col_tc(tr):
        for tc in tr.findall(f"{hp}tc"):
            a = tc.find(f"{hp}cellAddr")
            if a is not None and a.get("colAddr") == str(col):
                return tc
        return None

    trs = tbl_el.findall(f"{hp}tr")
    anchor = sibling = None
    anchor_row = None
    for tr in trs:
        tc = col_tc(tr)
        if tc is None:
            continue
        span = tc.find(f"{hp}cellSpan")
        rs = span.get("rowSpan") if span is not None else "1"
        row = int(tc.find(f"{hp}cellAddr").get("rowAddr"))
        if rs == "2" and anchor is None:
            anchor = tc
            anchor_row = row
        # 형제는 앵커 '아래'의 내용 셀만 — 헤더행(위·회색 borderFill·헤더 charPr)을
        # 잘못 복제해 삽입 셀이 회색 음영으로 나오던 것을 방지.
        elif rs == "1" and anchor is not None and row > anchor_row and sibling is None:
            sibling = tc
    if anchor is None or sibling is None or anchor_row is None:
        return False

    # ① 앵커 rowSpan 2→1, 높이를 형제와 동일하게
    anchor.find(f"{hp}cellSpan").set("rowSpan", "1")
    a_sz, s_sz = anchor.find(f"{hp}cellSz"), sibling.find(f"{hp}cellSz")
    if a_sz is not None and s_sz is not None:
        a_sz.set("height", s_sz.get("height"))

    # ② 형제 복제 → rowAddr=anchor+1, 텍스트 비움, 문단 id 유일화
    clone = copy.deepcopy(sibling)
    clone.find(f"{hp}cellAddr").set("rowAddr", str(anchor_row + 1))
    for tnode in clone.iter(f"{hp}t"):
        tnode.text = ""
    max_pid = 0
    for p in tbl_el.iter(f"{hp}p"):
        try:
            max_pid = max(max_pid, int(p.get("id") or 0))
        except (TypeError, ValueError):
            pass
    for p in clone.iter(f"{hp}p"):
        max_pid += 1
        p.set("id", str(max_pid))

    # colAddr 순서 유지: col 보다 큰 첫 tc 앞(없으면 맨 뒤)에 삽입
    target_tr = trs[anchor_row + 1]
    tcs = target_tr.findall(f"{hp}tc")
    insert_at = len(tcs)
    for idx, tc in enumerate(tcs):
        a = tc.find(f"{hp}cellAddr")
        if a is not None and int(a.get("colAddr")) > col:
            insert_at = idx
            break
    target_tr.insert(insert_at, clone)
    return True


def insert_entry(tables, doc, entry, inserted: list[str], warnings: list[str]) -> None:
    strategy = entry.get("strategy", "")
    parts = [s.strip() for s in strategy.split("+")]
    loc = entry.get("location", {}) or {}
    eid = entry.get("id", "?")

    if "static" in parts:
        return

    # ── 본문 단락 앵커 → 마커 (표지 일자 등)
    anchor = loc.get("paragraph_anchor")
    if anchor:
        marker = entry["placeholders"][0]
        hit = False
        for para in doc.paragraphs:
            for run in para.runs:
                if run.text and anchor in run.text:
                    run.text = run.text.replace(anchor, marker)
                    hit = True
        if hit:
            inserted.append(marker)
        else:
            warnings.append(f"{eid}: 본문 앵커 {anchor!r} 를 찾지 못함")
        return

    # ── 표 자체가 반복 (훈련과정 명세서 6개)
    if "repeat_tables" in parts:
        tpl = entry["placeholder_template"]
        subj_tpl = entry.get("subject_placeholder_template")
        cells = loc.get("cells", {})
        subj = loc.get("subject_rows", {})
        for i, ti in enumerate(loc.get("table_indices", [])):
            if ti >= len(tables):
                warnings.append(f"{eid}: 표 인덱스 {ti} 초과 (총 {len(tables)})")
                continue
            tbl = tables[ti]
            for field, (r, c) in cells.items():
                m = expand(tpl, i=i, field=field)
                if set_cell(tbl, r, c, m):
                    inserted.append(m)
                else:
                    warnings.append(f"{eid}: T{ti}({r},{c}) 기입 실패 — {m}")
            if subj and subj_tpl:
                start = subj["data_row_start"]
                for j in range(subj["max_items"]):
                    for field, c in subj["cols"].items():
                        m = expand(subj_tpl, i=i, j=j, field=field)
                        if set_cell(tbl, start + j, c, m):
                            inserted.append(m)
                        else:
                            warnings.append(f"{eid}: T{ti}({start+j},{c}) 기입 실패 — {m}")
        return

    ti = loc.get("table_index")
    if ti is None or ti >= len(tables):
        warnings.append(f"{eid}: 표 인덱스 {ti} 없음/초과")
        return
    tbl = tables[ti]

    # ── 체크박스: 셀 텍스트 전체를 템플릿으로 교체 ("□ 초급" → "{{cb_...}} 초급")
    if "checkbox_toggle" in parts:
        for marker, (r, c) in (loc.get("checkbox_cells") or {}).items():
            text = (entry.get("checkbox_templates") or {}).get(marker, marker)
            if set_cell(tbl, r, c, text):
                inserted.append(marker)
            else:
                warnings.append(f"{eid}: T{ti}({r},{c}) 체크박스 기입 실패 — {marker}")

    # ── 행 반복 (수행활동 · 과업 분석표)
    if "repeat_rows" in parts:
        tpl = entry["placeholder_template"]
        start = loc["data_row_start"]
        per = loc.get("rows_per_item", 1)
        # 직무 열 세로 병합 해제(지정 col) → 데이터 분포와 무관하게 매 행 직무 셀 확보
        for rc in entry.get("row_columns", []):
            if rc.get("unmerge_rowspan2"):
                unmerge_rowspan2_col(tbl, rc["col"])
        for i in range(loc["max_items"]):
            for rc in entry.get("row_columns", []):
                # skip_items: 세로 병합으로 앞 항목과 셀을 공유하는 인덱스는 건너뛴다.
                # (심으면 앞서 심은 마커를 덮어써 데이터가 조용히 유실된다)
                if i in (rc.get("skip_items") or []):
                    continue
                r = start + i * per + rc.get("row_offset", 0)
                c = rc["col"]
                m = expand(tpl, i=i, field=rc["field"])
                if set_cell(tbl, r, c, m):
                    inserted.append(m)
                else:
                    warnings.append(f"{eid}: T{ti}({r},{c}) 기입 실패 — {m}")
        return

    # ── 단일 셀 (cell_template 이 있으면 문장 전체를 심음)
    if "single" in parts or "pdf_attach" in parts:
        cell_rc = loc.get("cell")
        if cell_rc:
            text = entry.get("cell_template") or entry["placeholders"][0]
            if set_cell(tbl, cell_rc[0], cell_rc[1], text):
                inserted.extend(entry["placeholders"])
            else:
                warnings.append(f"{eid}: T{ti}{tuple(cell_rc)} 기입 실패")

    # ── 다중 셀 (마커 → 좌표 매핑)
    if "cell_fill" in parts:
        for marker, (r, c) in (loc.get("cells") or {}).items():
            if set_cell(tbl, r, c, marker):
                inserted.append(marker)
            else:
                warnings.append(f"{eid}: T{ti}({r},{c}) 기입 실패 — {marker}")


def main() -> int:
    ap = argparse.ArgumentParser(description="SSOT 기반 HWPX 마커 삽입")
    ap.add_argument("track", choices=sorted(TRACKS))
    ap.add_argument("--check", action="store_true", help="저장하지 않고 검증만")
    args = ap.parse_args()

    ssot = json.loads(SSOT_PATH.read_text(encoding="utf-8"))
    entries = ssot[args.track]
    src, dst = TRACKS[args.track]

    if not src.is_file():
        print(f"ERROR: 정본 없음 — {src}", file=sys.stderr)
        return 1

    doc = HwpxDocument.open(str(src))
    tables = collect_tables(doc)
    print(f"정본: {src.name} (shallow 표 {len(tables)}개)", file=sys.stderr)

    inserted: list[str] = []
    warnings: list[str] = []
    for entry in entries:
        insert_entry(tables, doc, entry, inserted, warnings)

    fw_fixed = consolidate_checkbox_fwspace(doc)
    if fw_fixed:
        print(f"체크박스 fwSpace 통합: {fw_fixed}개", file=sys.stderr)

    sig_centered = center_signature_columns(doc)
    if sig_centered:
        print(f"서명표 소속/성명 가운데정렬: {sig_centered}개", file=sys.stderr)

    detail_left = left_align_spec_details(doc)
    if detail_left:
        print(f"명세서 세부내용 좌측정렬: {detail_left}개", file=sys.stderr)

    goal_content_left = left_align_spec_goal_content(doc)
    if goal_content_left:
        print(f"명세서 목표·주요내용 좌측정렬: {goal_content_left}개", file=sys.stderr)

    for w in warnings:
        print(f"  WARN {w}", file=sys.stderr)

    dupes = {m for m in inserted if inserted.count(m) > 1}
    if dupes:
        print(f"  WARN 중복 마커: {sorted(dupes)}", file=sys.stderr)

    print(f"삽입 마커: {len(inserted)}개 (고유 {len(set(inserted))}개)", file=sys.stderr)

    if args.check:
        print("(--check: 저장 생략)", file=sys.stderr)
        return 1 if warnings else 0

    doc.save(str(dst))
    print(f"WROTE: {dst}", file=sys.stderr)
    return 1 if warnings else 0


if __name__ == "__main__":
    raise SystemExit(main())
