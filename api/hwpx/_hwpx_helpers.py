"""
HWPX OXML 조작 공통 헬퍼.

Step 7 (로드맵) · Step 10 (PBL) 양쪽에서 공유.
python-hwpx의 `replace_text_in_runs`는 표 내부 셀을 탐색하지 않으므로
직접 lxml로 OXML을 조작한다.

핵심 원칙:
- 셀(<hp:tc>) 수정 후 반드시 `section.mark_dirty()` 호출 필요
- 셀 paragraph 구조를 보존하며 <hp:t> 텍스트만 교체
- 행 복제는 원본 <hp:tr>를 deepcopy하고 <hp:cellAddr>의 rowAddr를 갱신
"""
from copy import deepcopy
from typing import Iterable

from lxml import etree as ET

HP = "http://www.hancom.co.kr/hwpml/2011/paragraph"
HP_NS = f"{{{HP}}}"


# ---------------------------------------------------------------
# 기본 탐색
# ---------------------------------------------------------------


def find_all_tables(section_element) -> list:
    """섹션 요소에서 모든 <hp:tbl>을 문서 순서대로 반환."""
    return section_element.findall(f".//{HP_NS}tbl")


def get_table(section_element, index: int):
    tables = find_all_tables(section_element)
    if index < 0 or index >= len(tables):
        raise IndexError(f"table index {index} out of range ({len(tables)})")
    return tables[index]


def get_trs(tbl) -> list:
    return tbl.findall(f"{HP_NS}tr")


def get_tcs(tr) -> list:
    return tr.findall(f"{HP_NS}tc")


def get_cell_by_addr(tbl, row_addr: int, col_addr: int):
    """cellAddr 기반으로 셀을 찾는다 (병합 고려).

    병합된 셀은 해당 rowAddr/colAddr를 가진 tc가 실제로 있는 행에만 존재한다.
    """
    for tr in get_trs(tbl):
        for tc in get_tcs(tr):
            addr = tc.find(f"{HP_NS}cellAddr")
            if addr is None:
                continue
            r = int(addr.get("rowAddr", -1))
            c = int(addr.get("colAddr", -1))
            if r == row_addr and c == col_addr:
                return tc
    return None


# ---------------------------------------------------------------
# 셀 텍스트 조작
# ---------------------------------------------------------------


def get_cell_texts(tc) -> list[str]:
    return [t.text or "" for t in tc.findall(f".//{HP_NS}t")]


def _first_p(tc):
    sublist = tc.find(f"{HP_NS}subList")
    if sublist is None:
        return None
    return sublist.find(f"{HP_NS}p")


def _paragraph_text_elements(p):
    return p.findall(f"{HP_NS}run/{HP_NS}t")


def set_cell_text(tc, text: str) -> None:
    """셀 내용을 단일 텍스트로 치환.

    - 첫 paragraph는 유지 (스타일 보존)
    - 첫 paragraph의 첫 <hp:run>의 첫 <hp:t>에 텍스트 설정
    - 첫 paragraph의 나머지 <hp:t>는 비움
    - 첫 paragraph 이후의 다른 paragraph는 제거

    이렇게 하면 원본 글꼴·문단 스타일을 유지하면서 내용만 바뀐다.
    """
    sublist = tc.find(f"{HP_NS}subList")
    if sublist is None:
        return
    ps = sublist.findall(f"{HP_NS}p")
    if not ps:
        return
    # 첫 paragraph만 남기고 제거
    for p in ps[1:]:
        sublist.remove(p)
    first_p = ps[0]
    # 첫 run에 텍스트 설정, 나머지 run의 t 비움
    runs = first_p.findall(f"{HP_NS}run")
    if not runs:
        return
    first_run = runs[0]
    t = first_run.find(f"{HP_NS}t")
    if t is None:
        t = ET.SubElement(first_run, f"{HP_NS}t")
    t.text = text
    # 기타 run의 t 비우기 (run 자체는 스타일 보존 위해 유지)
    for r in runs[1:]:
        for t_el in r.findall(f"{HP_NS}t"):
            t_el.text = ""
    # 첫 run 내 여러 t가 있을 수 있으므로 첫 t만 유지하고 나머지 비움
    ts = first_run.findall(f"{HP_NS}t")
    for t_el in ts[1:]:
        t_el.text = ""


def set_cell_multiline(tc, lines: list[str]) -> None:
    """여러 줄 텍스트를 셀에 설정.

    첫 paragraph를 유지하며 각 줄을 별도 paragraph로 복제 삽입.
    원본 첫 paragraph의 스타일을 보존하기 위해 deepcopy 사용.
    """
    sublist = tc.find(f"{HP_NS}subList")
    if sublist is None:
        return
    ps = sublist.findall(f"{HP_NS}p")
    if not ps:
        return
    first_p = ps[0]
    # 기존 paragraph 모두 제거
    for p in ps:
        sublist.remove(p)
    # 최소 1줄은 써야 paragraph 구조가 존재
    if not lines:
        lines = [""]
    for i, line in enumerate(lines):
        p_copy = deepcopy(first_p)
        # 첫 run의 첫 t에 텍스트 설정
        run = p_copy.find(f"{HP_NS}run")
        if run is not None:
            t = run.find(f"{HP_NS}t")
            if t is None:
                t = ET.SubElement(run, f"{HP_NS}t")
            t.text = line
            # 나머지 t 비움
            for t_el in run.findall(f"{HP_NS}t")[1:]:
                t_el.text = ""
            # 나머지 run의 t 비움
            for r in p_copy.findall(f"{HP_NS}run")[1:]:
                for t_el in r.findall(f"{HP_NS}t"):
                    t_el.text = ""
        sublist.append(p_copy)


# ---------------------------------------------------------------
# 행 복제·제거
# ---------------------------------------------------------------


def clone_tr(tbl, src_tr: ET._Element) -> ET._Element:
    """원본 행을 deepcopy하고 src_tr 바로 뒤에 삽입.

    반환: 새로 삽입된 <hp:tr>.
    주의: cellAddr의 rowAddr는 이 함수에서 갱신하지 않는다.
    (한글 프로그램이 렌더링 시 실제 위치 기반으로 무시하지만,
     동일 문서 내 다른 참조에 영향 주지 않도록 후처리에서
     renumber_row_addrs()를 호출할 것.)
    """
    new_tr = deepcopy(src_tr)
    # 모든 셀의 텍스트 비움
    for tc in get_tcs(new_tr):
        clear_cell(tc)
    src_tr.addnext(new_tr)
    return new_tr


def clear_cell(tc) -> None:
    """셀 텍스트를 모두 비움 (paragraph 구조는 유지)."""
    set_cell_text(tc, "")


def renumber_row_addrs(tbl) -> None:
    """표 내 모든 tc의 cellAddr/rowAddr를 실제 tr 순서대로 재부여."""
    for ri, tr in enumerate(get_trs(tbl)):
        for tc in get_tcs(tr):
            addr = tc.find(f"{HP_NS}cellAddr")
            if addr is not None:
                addr.set("rowAddr", str(ri))


def remove_tr(tr) -> None:
    """행 제거."""
    parent = tr.getparent()
    if parent is not None:
        parent.remove(tr)


# ---------------------------------------------------------------
# 플레이스홀더 치환
# ---------------------------------------------------------------


def replace_placeholders_in_element(root, mapping: dict[str, str]) -> int:
    """루트 요소 아래 모든 <hp:t>에서 {{key}} 치환.

    반환: 교체된 t 엘리먼트 수.
    """
    count = 0
    for t in root.findall(f".//{HP_NS}t"):
        if t.text is None:
            continue
        original = t.text
        changed = False
        for key, value in mapping.items():
            if key in t.text:
                t.text = t.text.replace(key, value or "")
                changed = True
        if changed:
            count += 1
    return count


# ---------------------------------------------------------------
# 행 수 보장
# ---------------------------------------------------------------


def ensure_row_count(tbl, header_rows: int, required_data_rows: int) -> None:
    """표의 데이터 행 수가 `required_data_rows` 이상이 되도록 보장.

    `header_rows`: 헤더 행 개수 (복제 대상 아님).
    마지막 데이터 행을 복제해 확장한다. 이미 충분하면 no-op.

    복제 후 반드시 `renumber_row_addrs`를 호출해 cellAddr.rowAddr를 재부여한다.
    이를 생략하면 HWPX 규격상 각 행의 rowAddr가 중복되어 한컴오피스(한글)가
    "알 수 없는 오류"로 파일을 거부한다. (python-hwpx는 관대하게 열 수 있음)
    """
    trs = get_trs(tbl)
    data_rows = len(trs) - header_rows
    if data_rows >= required_data_rows:
        return
    to_add = required_data_rows - data_rows
    src_idx = len(trs) - 1 if data_rows > 0 else header_rows - 1
    if src_idx < 0:
        return
    for _ in range(to_add):
        trs = get_trs(tbl)
        src_tr = trs[-1]
        clone_tr(tbl, src_tr)
    # 복제 후 cellAddr 재부여 — HWPX 규격 준수 (한컴오피스 엄격 검증 대응)
    renumber_row_addrs(tbl)


def trim_excess_rows(tbl, header_rows: int, desired_data_rows: int) -> None:
    """데이터 행 중 남은 것을 비우거나 제거하지 않고, 초과 행을 제거."""
    trs = get_trs(tbl)
    data_rows = len(trs) - header_rows
    if data_rows <= desired_data_rows:
        return
    # 뒤에서부터 제거
    for tr in trs[header_rows + desired_data_rows:]:
        remove_tr(tr)
