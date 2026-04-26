#!/usr/bin/env python3
"""
로드맵 HWPX 플레이스홀더 이식 스크립트 (2026-04-23).

배경:
    기존 templates/hwpx/roadmap.hwpx 는 6개 플레이스홀더({{company_name}},
    {{report_date}}, {{pm_affiliation}}, {{pm_name}},
    {{internal_expert_affiliation}}, {{internal_expert_name}}) 가 이미
    런(run) 단위로 정확히 배치돼 있는 "작동하는 구버전 서식" 이다.

    신 서식 docs/references/1.AI훈련로드맵 컨설팅 보고서(양식).hwpx 는
    서식만 업데이트된 버전으로 플레이스홀더가 0개. 단순 복사하면 Python 측
    `_replace_in_all_runs` 가 치환 대상을 찾지 못해 표지가 공란이 된다.

    나머지 약 55개 데이터 지점은 `api/hwpx/generate.py` 가 셀 좌표 기반
    (예: `_set_cell_text(tbl, 1, 1, pm_affiliation)`) 으로 채우므로
    플레이스홀더가 불필요하다. 두 파일의 44개 표 구조(row x col) 는
    완전 동일함이 사전 검증됐다.

이식 대상 (6개):
    1. 표 0 (표지 제목, 1x1) 셀 (0,0) — 본문 "기업명" → "{{company_name}}"
    2. paragraph 8 (표지 날짜 단락) — 본문 "202x. 00. 00." → "{{report_date}}"
    3. 표 1 (표지 PM 표, 3x3) 셀 (1,1) — 공란 → "{{pm_affiliation}}"
    4. 표 1 셀 (1,2) — 공란 → "{{pm_name}}"
    5. 표 1 셀 (2,1) — 공란 → "{{internal_expert_affiliation}}"
    6. 표 1 셀 (2,2) — 공란 → "{{internal_expert_name}}"

처리 전략:
    - python-hwpx 공식 API (`paragraph.runs[i].text`) 만 사용
    - 표지 제목 "기업명" 은 기존 run 의 특정 부분만 replace
    - paragraph 8 은 run text 전체 치환
    - 표 1 의 4개 공란 셀은 `_set_cell_text` 와 동일 패턴으로 단일 run text 설정

산출물: /tmp/roadmap-ported.hwpx (검증용, 실제 교체는 별도 단계)
"""
import sys
import shutil
from pathlib import Path

# Python venv 의 hwpx 라이브러리 사용
from hwpx import HwpxDocument  # noqa: E402


OLD_TEMPLATE = Path(
    '/Users/baekkyunshin/Desktop/AI-roadmap-dashboard/templates/hwpx/roadmap.hwpx'
)
NEW_SOURCE = Path(
    '/Users/baekkyunshin/Desktop/AI-roadmap-dashboard/docs/references/'
    '1.AI훈련로드맵 컨설팅 보고서(양식).hwpx'
)
OUTPUT = Path('/tmp/roadmap-ported.hwpx')


def port_placeholders() -> None:
    """신 서식에 플레이스홀더 6개 삽입 후 저장."""
    assert NEW_SOURCE.exists(), f'NEW_SOURCE missing: {NEW_SOURCE}'
    doc = HwpxDocument.open(str(NEW_SOURCE))

    # --- 이식 1: 표 0 (표지 제목 1x1) 셀 (0,0) ---
    #   현재 신 서식: "AI훈련로드맵 컨설팅 보고서(기업명)"
    #   목표       : "AI훈련로드맵 컨설팅 보고서({{company_name}})"
    tables = []
    for para in doc.paragraphs:
        for tbl in para.tables:
            tables.append(tbl)
    assert len(tables) >= 2, f'Expected >=2 top-level tables, got {len(tables)}'

    cover_title_tbl = tables[0]
    assert cover_title_tbl.row_count == 1 and cover_title_tbl.column_count == 1
    _replace_in_cell(
        cover_title_tbl, 0, 0,
        old_substr='(기업명)',
        new_substr='({{company_name}})',
    )

    # --- 이식 2: paragraph 8 (표지 날짜) ---
    #   현재 신 서식: "202x. 00. 00."
    #   목표       : "{{report_date}}"
    date_para = doc.paragraphs[8]
    _replace_run_text_exact(
        date_para,
        old_text='202x. 00. 00.',
        new_text='{{report_date}}',
    )

    # --- 이식 3~6: 표 1 (표지 PM 표 3x3) 4개 공란 셀 ---
    cover_pm_tbl = tables[1]
    assert cover_pm_tbl.row_count == 3 and cover_pm_tbl.column_count == 3
    # 구 템플릿 동일 위치에서 확인: (1,1)=pm_affiliation, (1,2)=pm_name,
    #                              (2,1)=internal_expert_affiliation, (2,2)=internal_expert_name
    _set_empty_cell_text(cover_pm_tbl, 1, 1, '{{pm_affiliation}}')
    _set_empty_cell_text(cover_pm_tbl, 1, 2, '{{pm_name}}')
    _set_empty_cell_text(cover_pm_tbl, 2, 1, '{{internal_expert_affiliation}}')
    _set_empty_cell_text(cover_pm_tbl, 2, 2, '{{internal_expert_name}}')

    # --- 저장 ---
    doc.save_to_path(str(OUTPUT))
    print(f'[OK] saved → {OUTPUT}')


def _replace_in_cell(tbl, row: int, col: int, *, old_substr: str, new_substr: str) -> None:
    """표 셀 내부 run text 에서 부분 문자열 치환."""
    cell = tbl.cell(row, col)
    replaced = False
    for p in cell.paragraphs:
        for run in p.runs:
            if run.text and old_substr in run.text:
                run.text = run.text.replace(old_substr, new_substr)
                replaced = True
                print(f'  [cell ({row},{col})] {old_substr!r} → {new_substr!r}')
                return
    if not replaced:
        # 런이 쪼개진 경우 fallback: 첫 paragraph 의 모든 run text 를 모아 replace
        for p in cell.paragraphs:
            concat = ''.join(r.text or '' for r in p.runs)
            if old_substr in concat:
                new_concat = concat.replace(old_substr, new_substr)
                # 첫 번째 run 에만 기록, 나머지는 비움
                if p.runs:
                    p.runs[0].text = new_concat
                    for r in p.runs[1:]:
                        r.text = ''
                    print(f'  [cell ({row},{col}) merged-runs] {old_substr!r} → {new_substr!r}')
                    return
        raise ValueError(
            f'  ! cell ({row},{col}): substring {old_substr!r} not found'
        )


def _replace_run_text_exact(para, *, old_text: str, new_text: str) -> None:
    """paragraph 의 단일 run 전체 텍스트를 치환."""
    # 1) 단일 run 매칭
    for run in para.runs:
        if run.text == old_text:
            run.text = new_text
            print(f'  [para] {old_text!r} → {new_text!r}')
            return
    # 2) 쪼개진 run 여러 개 concat 이 old_text 와 동일
    concat = ''.join(r.text or '' for r in para.runs)
    if concat == old_text:
        if para.runs:
            para.runs[0].text = new_text
            for r in para.runs[1:]:
                r.text = ''
            print(f'  [para merged-runs] {old_text!r} → {new_text!r}')
            return
    # 3) 포함 치환
    if old_text in concat:
        new_concat = concat.replace(old_text, new_text)
        para.runs[0].text = new_concat
        for r in para.runs[1:]:
            r.text = ''
        print(f'  [para substring] {old_text!r} → {new_text!r}')
        return
    raise ValueError(f'  ! paragraph: text {old_text!r} not found (got {concat!r})')


def _set_empty_cell_text(tbl, row: int, col: int, text: str) -> None:
    """공란 셀에 플레이스홀더 텍스트 삽입.

    셀 내부 첫 paragraph 의 첫 run text 에 기록.
    run 이 없거나 paragraph 가 없는 경우 python-hwpx 공식 API 로 추가.
    """
    cell = tbl.cell(row, col)
    assert cell.paragraphs, f'cell ({row},{col}) has no paragraphs'
    p = cell.paragraphs[0]
    if not p.runs:
        raise RuntimeError(
            f'cell ({row},{col}) paragraph has no runs — '
            f'need to create a new run via HwpxDocument API'
        )
    # 기존 모든 run text 비우고 첫 run 에 플레이스홀더 넣음
    for r in p.runs:
        r.text = ''
    p.runs[0].text = text
    # 추가 paragraph 가 있으면 모두 공란 유지
    for extra_p in cell.paragraphs[1:]:
        for r in extra_p.runs:
            r.text = ''
    print(f'  [cell ({row},{col}) empty→filled] {text!r}')


if __name__ == '__main__':
    port_placeholders()
