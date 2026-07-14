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
