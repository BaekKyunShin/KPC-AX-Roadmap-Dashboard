#!/usr/bin/env python3
"""페이지 수 모니터링. python-hwpx 기반."""
import argparse
import sys

from hwpx import HwpxDocument


def estimate_pages(hwpx_path: str) -> int:
    """단락·표 수 기반 페이지 추정 (근사치)."""
    doc = HwpxDocument.open(hwpx_path)

    para_count = len(doc.paragraphs)
    table_count = 0
    try:
        for para in doc.paragraphs:
            table_count += len(para.tables)
    except Exception:
        pass

    # 줄간격 160%, 10pt 기준, A4 본문 높이 약 247mm
    # 한 페이지에 약 30줄, 표는 5줄분으로 가산
    lines = para_count + (table_count * 5)
    estimated = max(1, (lines + 29) // 30)
    return estimated


def guard(hwpx_path: str, ref_pages: int):
    estimated = estimate_pages(hwpx_path)
    diff = abs(estimated - ref_pages)

    if diff == 0:
        print(f"PASS: 예상 {estimated}페이지 = 기준 {ref_pages}페이지")
        return 0
    elif diff <= 1:
        print(f"WARN: 예상 {estimated}페이지 ≠ 기준 {ref_pages}페이지 (±1 이내)")
        print("  주의: 추정치는 근사값입니다.")
        return 0
    else:
        print(f"WARN: 예상 {estimated}페이지 ≠ 기준 {ref_pages}페이지 (차이: {diff})")
        print("  레이아웃이 크게 변경되었을 수 있습니다.")
        return 0  # 경고만


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="HWPX 페이지 수 모니터링 (python-hwpx)")
    parser.add_argument("hwpx_path", help=".hwpx 파일 경로")
    parser.add_argument("--ref-pages", type=int, required=True, help="기준 페이지 수")
    args = parser.parse_args()
    sys.exit(guard(args.hwpx_path, args.ref_pages))
