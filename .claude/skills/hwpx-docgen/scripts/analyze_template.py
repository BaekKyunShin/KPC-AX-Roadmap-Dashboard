#!/usr/bin/env python3
"""HWPX 템플릿 심층 분석. python-hwpx 기반."""
import argparse
import re
import sys

from hwpx import HwpxDocument, TextExtractor


def analyze(hwpx_path: str):
    """문서 구조를 분석하고 보고."""
    doc = HwpxDocument.open(hwpx_path)

    # 기본 정보
    sections = doc.sections
    paragraphs = doc.paragraphs
    char_props = doc.char_properties
    para_props = doc.paragraph_properties
    styles_list = doc.styles
    border_fills = doc.border_fills

    print("=" * 50)
    print("HWPX 템플릿 분석 보고서")
    print("=" * 50)

    print(f"\n[섹션] {len(sections)}개")
    print(f"[단락] {len(paragraphs)}개")

    # 표 개수
    try:
        table_map = doc.get_table_map()
        table_count = len(table_map)
    except Exception:
        table_count = 0
    print(f"[표] {table_count}개")

    # 문자 속성
    print(f"\n[문자 속성] {len(char_props)}개")
    for i, cp in enumerate(char_props):
        print(f"  - id={i}: {cp}")

    # 단락 속성
    print(f"\n[단락 속성] {len(para_props)}개")
    for i, pp in enumerate(para_props):
        print(f"  - id={i}: {pp}")

    # 스타일
    print(f"\n[스타일] {len(styles_list)}개")
    for i, st in enumerate(styles_list):
        print(f"  - id={i}: {st}")

    # borderFill
    print(f"\n[테두리/채움] {len(border_fills)}개")

    # 플레이스홀더 탐지
    text = doc.export_text()
    placeholders = re.findall(r"\{\{[^}]+\}\}", text)
    if placeholders:
        unique = sorted(set(placeholders))
        print(f"\n[플레이스홀더] {len(unique)}개")
        for ph in unique:
            print(f"  - {ph}")

    # 검증
    print("\n[검증]")
    try:
        report = doc.validate()
        if hasattr(report, "errors") and report.errors:
            for err in report.errors:
                print(f"  FAIL: {err}")
        elif hasattr(report, "warnings") and report.warnings:
            for warn in report.warnings:
                print(f"  WARN: {warn}")
        else:
            print("  PASS")
    except Exception as e:
        print(f"  ERROR: {e}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="HWPX 템플릿 분석 (python-hwpx)")
    parser.add_argument("hwpx_path", help=".hwpx 파일 경로")
    args = parser.parse_args()
    analyze(args.hwpx_path)
