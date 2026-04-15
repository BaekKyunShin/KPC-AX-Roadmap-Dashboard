#!/usr/bin/env python3
"""HWPX 호환 표 생성. python-hwpx 기반."""
import argparse
import json
import sys

from hwpx import HwpxDocument


def create_table_in_doc(doc: HwpxDocument, rows: int, cols: int,
                        data: list = None, merge: list = None,
                        border_fill_id: int = None):
    """문서에 표를 추가하고 내용·병합을 적용."""
    kwargs = {}
    if border_fill_id is not None:
        kwargs["border_fill_id_ref"] = border_fill_id

    tbl = doc.add_table(rows, cols, **kwargs)

    # 셀 내용 채우기
    if data:
        for ri, row in enumerate(data):
            for ci, cell_text in enumerate(row):
                if ri < rows and ci < cols:
                    tbl.set_cell_text(ri, ci, str(cell_text))

    # 셀 병합
    if merge:
        for m in merge:
            sr, sc = m["row"], m["col"]
            er = sr + m.get("rowSpan", 1) - 1
            ec = sc + m.get("colSpan", 1) - 1
            if er > sr or ec > sc:
                tbl.merge_cells(sr, sc, er, ec)

    return tbl


def create_table_document(rows: int, cols: int, data: list = None,
                          merge: list = None, output_path: str = None):
    """표가 포함된 새 HWPX 문서를 생성."""
    doc = HwpxDocument.new()
    create_table_in_doc(doc, rows, cols, data, merge)

    if output_path:
        doc.save_to_path(output_path)
        print(f"OK: {output_path}")
    else:
        # stdout으로 마크다운 표 미리보기 출력
        if data:
            for ri, row in enumerate(data):
                print("| " + " | ".join(str(c) for c in row) + " |")
                if ri == 0:
                    print("| " + " | ".join(["---"] * len(row)) + " |")
        print(f"\n(표: {rows}행 x {cols}열)")

    return doc


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="HWPX 표 생성 (python-hwpx)")
    parser.add_argument("--rows", type=int, required=True, help="행 수")
    parser.add_argument("--cols", type=int, required=True, help="열 수")
    parser.add_argument("--data", help="JSON 2D 배열 (셀 내용)")
    parser.add_argument("--merge", help="JSON 병합 명세 [{row, col, rowSpan, colSpan}]")
    parser.add_argument("--output", help="출력 .hwpx 파일 (생략 시 미리보기)")
    args = parser.parse_args()

    data = json.loads(args.data) if args.data else None
    merge = json.loads(args.merge) if args.merge else None

    create_table_document(args.rows, args.cols, data, merge, args.output)
