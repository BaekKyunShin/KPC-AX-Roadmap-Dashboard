#!/usr/bin/env python3
"""HWPX 문서 내 플레이스홀더 치환. python-hwpx API 사용.

이전 버전은 XML 파일을 직접 문자열 치환했지만,
이 버전은 python-hwpx의 replace_text_in_runs()를 사용해
OWPML 구조를 안전하게 유지합니다.

사용법:
  python zip_replace_all.py input.hwpx --mapping mapping.json --output output.hwpx
  python zip_replace_all.py input.hwpx --mapping mapping.json  # 원본 덮어쓰기
"""
import argparse
import json
import sys

from hwpx import HwpxDocument


def replace_all(input_path, mapping, output_path=None):
    """HWPX 파일의 플레이스홀더를 치환 (본문 + 표 셀)."""
    doc = HwpxDocument.open(input_path)

    replaced = 0
    for old_text, new_text in mapping.items():
        new_text = str(new_text)

        # 1) 본문 runs 치환
        count = doc.replace_text_in_runs(old_text, new_text)
        replaced += count

        # 2) 표 셀 내부 runs 치환 (replace_text_in_runs가 커버하지 않음)
        table_count = 0
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
                                    table_count += 1
        replaced += table_count
        total = count + table_count
        if total:
            print(f"  {old_text} → {new_text} ({total}건)")

    save_path = output_path or input_path
    doc.save_to_path(save_path)

    if replaced:
        print(f"치환 완료: {replaced}건 → {save_path}")
    else:
        print("치환 대상 없음")
    return replaced


def load_mapping(json_path):
    with open(json_path, "r", encoding="utf-8") as f:
        return json.load(f)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="HWPX 플레이스홀더 치환 (python-hwpx API)")
    parser.add_argument("input", help="입력 .hwpx 파일")
    parser.add_argument("--mapping", required=True, help='JSON 매핑 파일 (예: {"{{이름}}": "홍길동"})')
    parser.add_argument("--output", help="출력 .hwpx 파일 (미지정 시 원본 덮어쓰기)")
    args = parser.parse_args()

    mapping = load_mapping(args.mapping)
    replace_all(args.input, mapping, args.output)
