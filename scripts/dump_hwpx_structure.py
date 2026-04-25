#!/usr/bin/env python3
"""HWPX 템플릿 전수 분석.

PR #3 의 SSOT JSON (`docs/references/hwpx-placeholders.json`) 을 채우기 위한
입력 자료 생성기. 표 인덱스·행/열 수·셀 (0,0) 미리보기·paragraph 인덱스를
마크다운 보고서로 출력한다.

사용:
    .venv/bin/python scripts/dump_hwpx_structure.py templates/hwpx/roadmap.hwpx \\
        --output docs/references/hwpx-structure-roadmap.md
"""
import argparse
import re
import sys
from pathlib import Path

from hwpx import HwpxDocument


def _cell_text(cell) -> str:
    """cell may be either a string (preview) or dict (full)."""
    if isinstance(cell, str):
        text = cell
    elif isinstance(cell, dict):
        parts = cell.get("paragraphs") or []
        text = " ".join(
            p.get("text", "") if isinstance(p, dict) else str(p) for p in parts
        )
        if not text:
            text = cell.get("text") or ""
    else:
        text = str(cell)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _row_preview(cells, max_cols: int = 8) -> str:
    out = []
    for c in cells[:max_cols]:
        t = _cell_text(c)
        if len(t) > 24:
            t = t[:24] + "…"
        out.append(t or "·")
    if len(cells) > max_cols:
        out.append(f"… (+{len(cells) - max_cols})")
    return " | ".join(out)


def analyze(path: Path) -> str:
    doc = HwpxDocument.open(str(path))
    table_map = doc.get_table_map()
    tables = table_map.get("tables", [])
    paragraphs = doc.paragraphs

    # body paragraph preview
    para_preview = []
    for i, p in enumerate(paragraphs):
        text = ""
        try:
            text = p.export_text()
        except Exception:
            try:
                text = p.text  # type: ignore[attr-defined]
            except Exception:
                text = ""
        text = re.sub(r"\s+", " ", text).strip()
        if len(text) > 80:
            text = text[:80] + "…"
        para_preview.append((i, text))

    placeholders = sorted(set(re.findall(r"\{\{[^}]+\}\}", doc.export_text())))

    lines: list[str] = []
    lines.append(f"# HWPX 구조 분석: `{path.name}`")
    lines.append("")
    lines.append(f"- 총 단락: **{len(paragraphs)}**")
    lines.append(f"- 총 표 (전체, nested 포함): **{len(tables)}**")
    lines.append(f"- 기존 플레이스홀더: **{len(placeholders)}**")
    lines.append("")

    if placeholders:
        lines.append("## 기존 플레이스홀더 목록")
        for ph in placeholders:
            lines.append(f"- `{ph}`")
        lines.append("")

    lines.append("## 표 인벤토리")
    lines.append("")
    lines.append("| idx | paragraph_idx | rows × cols | header_text | row[0] preview |")
    lines.append("|---|---|---|---|---|")
    for info in tables:
        idx = info.get("table_index")
        pidx = info.get("paragraph_index")
        rows = info.get("rows")
        cols = info.get("cols")
        header = (info.get("header_text") or "").strip()
        if len(header) > 40:
            header = header[:40] + "…"
        first_row = info.get("first_row_preview") or []
        if isinstance(first_row, list) and first_row:
            preview = _row_preview(first_row)
        else:
            preview = ""
        lines.append(
            f"| {idx} | {pidx} | {rows}×{cols} | {header or '·'} | {preview or '·'} |"
        )
    lines.append("")

    lines.append("## 본문 단락 미리보기")
    lines.append("")
    lines.append("| paragraph_idx | text |")
    lines.append("|---|---|")
    for i, text in para_preview:
        if not text:
            text = "(빈 단락)"
        lines.append(f"| {i} | {text} |")
    lines.append("")

    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description="HWPX 템플릿 전수 분석 (마크다운 출력)")
    parser.add_argument("hwpx_path", type=Path, help=".hwpx 파일 경로")
    parser.add_argument(
        "--output",
        "-o",
        type=Path,
        help="결과 마크다운 저장 경로 (생략 시 stdout)",
    )
    args = parser.parse_args()

    if not args.hwpx_path.is_file():
        print(f"ERROR: {args.hwpx_path} not found", file=sys.stderr)
        return 1

    md = analyze(args.hwpx_path)

    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(md, encoding="utf-8")
        print(f"WROTE: {args.output} ({len(md):,} chars)", file=sys.stderr)
    else:
        sys.stdout.write(md)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
