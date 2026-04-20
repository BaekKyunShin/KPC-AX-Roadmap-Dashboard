#!/usr/bin/env python3
"""HWPX 구조 검증. python-hwpx validate() + 커스텀 체크."""
import argparse
import os
import sys

from hwpx import HwpxDocument


def check_zip_structure(dir_path: str) -> list:
    """필수 파일 존재 여부 확인 (디렉터리 모드에서만)."""
    issues = []
    required = ["mimetype", "META-INF/container.xml",
                "Contents/content.hpf", "Contents/header.xml",
                "Contents/section0.xml"]
    for f in required:
        if not os.path.isfile(os.path.join(dir_path, f)):
            issues.append(("FAIL", f"필수 파일 누락: {f}"))

    mt_path = os.path.join(dir_path, "mimetype")
    if os.path.isfile(mt_path):
        with open(mt_path, "r") as fh:
            content = fh.read().strip()
        if content != "application/hwp+zip":
            issues.append(("FAIL", f"mimetype 값 오류: '{content}'"))
    return issues


def validate(hwpx_path: str):
    """python-hwpx 내장 검증 + 커스텀 체크."""
    all_issues = []

    # 1. python-hwpx 내장 검증
    try:
        doc = HwpxDocument.open(hwpx_path)
        report = doc.validate()
        if report.issues:
            for issue in report.issues:
                all_issues.append(("WARN", str(issue)))
        if not report.ok:
            all_issues.append(("FAIL", "python-hwpx validate() 실패"))
    except Exception as e:
        all_issues.append(("FAIL", f"문서 로드 실패: {e}"))
        for severity, msg in all_issues:
            print(f"{severity}: {msg}")
        return 1

    # 2. 디렉터리 구조 체크 (디렉터리인 경우)
    if os.path.isdir(hwpx_path):
        all_issues.extend(check_zip_structure(hwpx_path))

    if not all_issues:
        print("PASS: 모든 검증 통과")
        return 0

    has_fail = any(s == "FAIL" for s, _ in all_issues)
    for severity, msg in all_issues:
        print(f"{severity}: {msg}")

    if has_fail:
        print(f"\n결과: FAIL ({len(all_issues)}개 이슈)")
        return 1
    else:
        print(f"\n결과: WARN ({len(all_issues)}개 경고)")
        return 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="HWPX 구조 검증 (python-hwpx)")
    parser.add_argument("path", help=".hwpx 파일 또는 언팩된 디렉터리")
    args = parser.parse_args()
    sys.exit(validate(args.path))
