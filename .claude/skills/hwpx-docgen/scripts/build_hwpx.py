#!/usr/bin/env python3
"""템플릿 + 콘텐츠 JSON으로 HWPX 문서를 조립. python-hwpx API만 사용.

사용법:
  # 템플릿 기반 (플레이스홀더 치환 + 추가 콘텐츠)
  python build_hwpx.py --template gonmun --content content.json --output out.hwpx

  # 빈 문서에서 콘텐츠로 생성
  python build_hwpx.py --content content.json --output out.hwpx

콘텐츠 JSON 형식:
  {
    "placeholders": {"{{발신기관}}": "한국생산성본부", ...},
    "paragraphs": [
      {"type": "heading", "level": 1, "text": "제목"},
      {"type": "text", "text": "본문 내용"},
      {"type": "table", "rows": 3, "cols": 4, "data": [["a","b","c","d"], ...]}
    ]
  }
"""
import argparse
import json
import os
import sys

from hwpx import HwpxDocument

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
TEMPLATE_DIR = os.path.join(os.path.dirname(SCRIPT_DIR), "templates")

TEMPLATE_NAMES = {"base", "gonmun", "report", "minutes", "proposal"}


def _resolve_template(name_or_path):
    """템플릿 이름 또는 경로를 .hwpx 파일 경로로 해석."""
    if os.path.isfile(name_or_path):
        return name_or_path
    if name_or_path in TEMPLATE_NAMES:
        hwpx_path = os.path.join(TEMPLATE_DIR, f"{name_or_path}.hwpx")
        if os.path.isfile(hwpx_path):
            return hwpx_path
    # 디렉터리 경로 (레거시 호환)
    if os.path.isdir(name_or_path):
        print(
            f"WARNING: 디렉터리 템플릿은 더 이상 지원하지 않습니다. "
            f"'python generate_templates.py'로 .hwpx 템플릿을 생성하세요.",
            file=sys.stderr,
        )
        sys.exit(2)
    print(f"ERROR: 템플릿을 찾을 수 없음: {name_or_path}", file=sys.stderr)
    sys.exit(2)


def _add_content_items(doc, items):
    """콘텐츠 JSON의 paragraphs 항목을 문서에 추가."""
    for item in items:
        item_type = item.get("type", "text")

        if item_type == "heading":
            level = item.get("level", 1)
            # Skeleton 기반: charPr id 매핑은 문서마다 다를 수 있으므로
            # ensure_run_style 대신 기본 스타일 사용
            doc.add_paragraph(item.get("text", ""))

        elif item_type == "text":
            doc.add_paragraph(item.get("text", ""))

        elif item_type == "table":
            rows = item.get("rows", 2)
            cols = item.get("cols", 2)
            data = item.get("data")
            merge = item.get("merge")

            tbl = doc.add_table(rows, cols)

            if data:
                for ri, row in enumerate(data):
                    for ci, cell_text in enumerate(row):
                        if ri < rows and ci < cols:
                            cell = tbl.cell(ri, ci)
                            paras = cell.paragraphs
                            if paras and paras[0].runs:
                                paras[0].runs[0].text = str(cell_text)

            if merge:
                for m in merge:
                    sr, sc = m["row"], m["col"]
                    er = sr + m.get("rowSpan", 1) - 1
                    ec = sc + m.get("colSpan", 1) - 1
                    if er > sr or ec > sc:
                        tbl.merge_cells(sr, sc, er, ec)


def _replace_placeholders(doc, placeholders):
    """본문 + 표 셀 내 플레이스홀더를 모두 치환.

    python-hwpx의 replace_text_in_runs()는 표 셀 내부 runs를
    순회하지 않으므로, 표 셀도 별도로 처리합니다.
    """
    for old_text, new_text in placeholders.items():
        new_text = str(new_text)

        # 1) 본문 runs 치환
        doc.replace_text_in_runs(old_text, new_text)

        # 2) 표 셀 내부 runs 치환
        for para in doc.paragraphs:
            for tbl in para.tables:
                for ri in range(tbl.row_count):
                    for ci in range(tbl.column_count):
                        cell = tbl.cell(ri, ci)
                        for cp in cell.paragraphs:
                            for run in cp.runs:
                                if run.text and old_text in run.text:
                                    run.text = run.text.replace(
                                        old_text, new_text
                                    )


def build(template, content_json, output_path):
    """메인 빌드 함수."""
    # 문서 열기/생성
    if template:
        tpl_path = _resolve_template(template)
        doc = HwpxDocument.open(tpl_path)
    else:
        doc = HwpxDocument.new()

    # 플레이스홀더 치환
    placeholders = content_json.get("placeholders", {})
    if placeholders:
        _replace_placeholders(doc, placeholders)

    # 추가 콘텐츠 삽입
    paragraphs = content_json.get("paragraphs", [])
    if paragraphs:
        _add_content_items(doc, paragraphs)

    doc.save_to_path(output_path)
    print(f"OK: {output_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="python-hwpx 기반 HWPX 문서 빌드"
    )
    parser.add_argument(
        "--template",
        help="템플릿 이름(gonmun/report/minutes/proposal/base) 또는 .hwpx 경로",
    )
    parser.add_argument("--content", required=True, help="콘텐츠 JSON 파일")
    parser.add_argument("--output", required=True, help="출력 .hwpx 파일 경로")
    args = parser.parse_args()

    with open(args.content, "r", encoding="utf-8") as f:
        content = json.load(f)

    build(args.template, content, args.output)
