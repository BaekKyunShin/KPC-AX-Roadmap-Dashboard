#!/usr/bin/env python3
"""템플릿 ↔ SSOT 마커 대조 검증 (CI 가드).

`{{플레이스홀더}}` 방식은 좌표 의존을 없애는 대신, "SSOT 에 선언한 마커가 템플릿에
실제로 심겨 있는가" 를 보증해야 한다. 이 스크립트가 그 안전망이다.

검사 항목:
  1. SSOT 가 선언한 마커가 템플릿에 **전부** 존재하는가 (누락 = 데이터 유실)
  2. 템플릿에 있는 마커가 SSOT 에 **전부** 선언돼 있는가 (잉여 = 미치환 잔존 위험)

사용:
    .venv-hwpx/bin/python3 scripts/verify_hwpx_placeholders.py roadmap
    .venv-hwpx/bin/python3 scripts/verify_hwpx_placeholders.py --all
exit 0 = 일치, exit 1 = 불일치
"""
import argparse
import json
import re
import sys
from pathlib import Path

from hwpx import HwpxDocument

ROOT = Path(__file__).resolve().parent.parent
SSOT_PATH = ROOT / "docs" / "references" / "hwpx-placeholders.json"
TEMPLATES = {
    "roadmap": ROOT / "templates" / "hwpx" / "roadmap.hwpx",
    "pbl": ROOT / "templates" / "hwpx" / "pbl.hwpx",
}
MARKER_RE = re.compile(r"\{\{[^}]+\}\}")


def expand(template: str, **kw) -> str:
    out = template
    for k, v in kw.items():
        out = out.replace("{" + k + "}", str(v))
    return out


def expected_markers(entries) -> set[str]:
    """SSOT 선언 → 실제 전개된 마커 집합."""
    out: set[str] = set()
    for e in entries:
        if e.get("strategy", "").strip() == "static":
            continue
        loc = e.get("location", {}) or {}
        out.update(e.get("placeholders", []) or [])

        tpl = e.get("placeholder_template")
        if tpl and "repeat_tables" in e.get("strategy", ""):
            cells = loc.get("cells", {})
            subj = loc.get("subject_rows", {})
            subj_tpl = e.get("subject_placeholder_template")
            for i in range(len(loc.get("table_indices", []))):
                for field in cells:
                    out.add(expand(tpl, i=i, field=field))
                if subj and subj_tpl:
                    for j in range(subj["max_items"]):
                        for field in subj["cols"]:
                            out.add(expand(subj_tpl, i=i, j=j, field=field))
        elif tpl:
            for i in range(loc.get("max_items", 0)):
                for rc in e.get("row_columns", []) or []:
                    # 세로 병합으로 앞 항목과 셀을 공유하는 인덱스는 마커가 없다
                    if i in (rc.get("skip_items") or []):
                        continue
                    out.add(expand(tpl, i=i, field=rc["field"]))
    return out


def template_markers(path: Path) -> set[str]:
    doc = HwpxDocument.open(str(path))
    return set(MARKER_RE.findall(doc.export_text()))


def verify(track: str) -> int:
    ssot = json.loads(SSOT_PATH.read_text(encoding="utf-8"))
    path = TEMPLATES[track]
    if not path.is_file():
        print(f"FAIL [{track}] 템플릿 없음: {path}", file=sys.stderr)
        return 1

    want = expected_markers(ssot[track])
    have = template_markers(path)

    missing = sorted(want - have)
    extra = sorted(have - want)

    print(f"[{track}] SSOT 선언 {len(want)}개 / 템플릿 {len(have)}개", file=sys.stderr)

    if missing:
        print(f"  FAIL 템플릿에 누락된 마커 {len(missing)}개 (데이터가 출력되지 않음):", file=sys.stderr)
        for m in missing:
            print(f"    - {m}", file=sys.stderr)
    if extra:
        print(f"  FAIL SSOT 에 없는 마커 {len(extra)}개 (미치환 잔존 위험):", file=sys.stderr)
        for m in extra:
            print(f"    + {m}", file=sys.stderr)

    if not missing and not extra:
        print(f"  PASS [{track}] 마커 완전 일치", file=sys.stderr)
        return 0
    return 1


def main() -> int:
    ap = argparse.ArgumentParser(description="템플릿 ↔ SSOT 마커 대조")
    ap.add_argument("track", nargs="?", choices=sorted(TEMPLATES))
    ap.add_argument("--all", action="store_true")
    args = ap.parse_args()

    tracks = sorted(TEMPLATES) if args.all else [args.track or "roadmap"]
    # PBL 은 아직 v1 (좌표 방식) — 마커가 없으므로 검증 대상에서 제외
    tracks = [t for t in tracks if t != "pbl"]

    rc = 0
    for t in tracks:
        rc |= verify(t)
    return rc


if __name__ == "__main__":
    raise SystemExit(main())
