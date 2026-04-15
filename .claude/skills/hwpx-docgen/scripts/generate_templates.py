#!/usr/bin/env python3
"""python-hwpx Skeleton 기반 프로페셔널 .hwpx 템플릿 생성.

모든 템플릿은 HwpxDocument.new()로 시작해 올바른 OWPML 구조를 보장합니다.
lxml 직접 접근으로 charPr(폰트/크기/굵기), paraPr(정렬) 커스터마이징.
"""
import os
import sys
from lxml import etree
from hwpx import HwpxDocument

NS_HH = "http://www.hancom.co.kr/hwpml/2011/head"
NS_HP = "http://www.hancom.co.kr/hwpml/2011/paragraph"

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
TEMPLATE_DIR = os.path.join(os.path.dirname(SCRIPT_DIR), "templates")

# === 스타일 설정 ===
# fontRef id: 0=함초롬돋움, 1=함초롬바탕  (Skeleton 기본)
STYLES = {
    # name:      (height, font_id, bold)
    "title":     (1600, 0, True),   # 16pt 함초롬돋움 굵게
    "subtitle":  (1400, 0, True),   # 14pt 함초롬돋움 굵게
    "heading":   (1200, 0, True),   # 12pt 함초롬돋움 굵게
    "body":      (1000, 1, False),  # 10pt 함초롬바탕
    "body_bold": (1000, 1, True),   # 10pt 함초롬바탕 굵게
    "small":     (900, 1, False),   # 9pt 함초롬바탕
    "tbl_head":  (1000, 0, True),   # 10pt 함초롬돋움 굵게 (표 헤더)
    "tbl_body":  (1000, 1, False),  # 10pt 함초롬바탕 (표 본문)
}

# paraPr alignment 매핑: Skeleton의 paraPr ID를 사용하거나 수정
# Skeleton 기본: 0~10 JUSTIFY, 11~15 LEFT, 16~19 JUSTIFY
ALIGN_CENTER_ID = "1"   # paraPr[1]을 CENTER로 변경해 사용
ALIGN_RIGHT_ID = "2"    # paraPr[2]를 RIGHT로 변경해 사용
ALIGN_JUSTIFY_ID = "0"  # 기본 양쪽정렬
ALIGN_LEFT_ID = "11"    # 기존 LEFT 정렬


def setup_styles(doc):
    """문서에 프로페셔널 스타일 세팅. charPr ID 딕셔너리 반환."""
    hdr = doc.headers[0]
    style_ids = {}

    for name, (height, font_id, bold) in STYLES.items():
        def make_predicate(h, f, b):
            def predicate(el):
                if el.get("height") != str(h):
                    return False
                fontref = el.find(f"{{{NS_HH}}}fontRef")
                if fontref is not None and fontref.get("hangul") != str(f):
                    return False
                bold_el = el.find(f"{{{NS_HH}}}bold")
                is_bold = bold_el is not None and bold_el.get("val") == "1"
                return is_bold == b
            return predicate

        def make_modifier(h, f, b):
            def modifier(el):
                el.set("height", str(h))
                fontref = el.find(f"{{{NS_HH}}}fontRef")
                if fontref is not None:
                    for lang in ["hangul", "latin", "hanja", "japanese",
                                 "other", "symbol", "user"]:
                        fontref.set(lang, str(f))
                if b:
                    bold_el = el.find(f"{{{NS_HH}}}bold")
                    if bold_el is None:
                        bold_el = etree.SubElement(el, f"{{{NS_HH}}}bold")
                    bold_el.set("val", "1")
            return modifier

        cp = hdr.ensure_char_property(
            predicate=make_predicate(height, font_id, bold),
            modifier=make_modifier(height, font_id, bold),
        )
        style_ids[name] = cp.get("id")

    # paraPr alignment 수정
    para_props_el = hdr._para_properties_element()
    for pp_el in para_props_el:
        pp_id = pp_el.get("id")
        align_el = pp_el.find(f"{{{NS_HH}}}align")
        if align_el is None:
            continue
        if pp_id == ALIGN_CENTER_ID:
            align_el.set("horizontal", "CENTER")
        elif pp_id == ALIGN_RIGHT_ID:
            align_el.set("horizontal", "RIGHT")

    return style_ids


def add_table_border_fill(doc):
    """표 셀용 borderFill 추가. (id 반환)"""
    hdr = doc.headers[0]
    bf_id = hdr.ensure_basic_border_fill()
    return str(bf_id)


def p(doc, text, style="body", align="justify"):
    """단축 함수: 스타일+정렬로 단락 추가."""
    char_id = doc._style_ids.get(style, doc._style_ids.get("body", "0"))
    para_id = {
        "center": ALIGN_CENTER_ID,
        "right": ALIGN_RIGHT_ID,
        "justify": ALIGN_JUSTIFY_ID,
        "left": ALIGN_LEFT_ID,
    }.get(align, ALIGN_JUSTIFY_ID)
    return doc.add_paragraph(text, char_pr_id_ref=char_id, para_pr_id_ref=para_id)


# === 템플릿 빌더 ===

def build_base(output_path):
    """기본 빈 문서 템플릿."""
    doc = HwpxDocument.new()
    doc._style_ids = setup_styles(doc)
    doc.save_to_path(output_path)
    return output_path


def build_gonmun(output_path):
    """공문 템플릿 — 비즈니스 공식 문서."""
    doc = HwpxDocument.new()
    doc._style_ids = setup_styles(doc)

    p(doc, "{{발신기관}}", "title", "center")
    p(doc, "")
    p(doc, "수신: {{수신}}", "body", "left")
    p(doc, "(경유)", "small", "left")
    p(doc, "")
    p(doc, "제목: {{제목}}", "heading", "left")
    p(doc, "")
    p(doc, "{{본문}}", "body", "justify")
    p(doc, "")
    p(doc, "붙임  {{붙임}}", "body", "left")
    p(doc, "")
    p(doc, "{{날짜}}", "body", "center")
    p(doc, "")
    p(doc, "{{발신자}}", "subtitle", "center")
    p(doc, "")
    p(doc, "담당자: {{담당자}}  /  전화: {{전화}}  /  팩스: {{팩스}}", "small", "center")

    doc.save_to_path(output_path)
    return output_path


def build_report(output_path):
    """보고서 템플릿 — 기업 내부 보고용."""
    doc = HwpxDocument.new()
    doc._style_ids = setup_styles(doc)

    p(doc, "{{제목}}", "title", "center")
    p(doc, "")
    p(doc, "작성일: {{작성일}}  |  작성자: {{작성자}}  |  부서: {{부서}}", "small", "right")
    p(doc, "")

    for i in range(1, 4):
        p(doc, f"{{{{장{i}_제목}}}}", "heading", "left")
        p(doc, "")
        p(doc, f"{{{{장{i}_본문}}}}", "body", "justify")
        p(doc, "")

    p(doc, "{{결론}}", "heading", "left")
    p(doc, "")
    p(doc, "{{결론_본문}}", "body", "justify")

    doc.save_to_path(output_path)
    return output_path


def build_minutes(output_path):
    """회의록 템플릿 — 메타 표 + 안건·논의·결정·후속."""
    doc = HwpxDocument.new()
    doc._style_ids = setup_styles(doc)

    p(doc, "회 의 록", "title", "center")
    p(doc, "")

    # 메타 정보 표 (4행 2열)
    tbl = doc.add_table(4, 2)
    meta = [
        ["회의명", "{{회의명}}"],
        ["일  시", "{{일시}}"],
        ["장  소", "{{장소}}"],
        ["참석자", "{{참석자}}"],
    ]
    for ri, row in enumerate(meta):
        for ci, txt in enumerate(row):
            cell = tbl.cell(ri, ci)
            paras = cell.paragraphs
            if paras and paras[0].runs:
                paras[0].runs[0].text = txt

    p(doc, "")
    p(doc, "1. 안건", "heading", "left")
    p(doc, "")
    p(doc, "{{안건}}", "body", "justify")
    p(doc, "")
    p(doc, "2. 논의 사항", "heading", "left")
    p(doc, "")
    p(doc, "{{논의사항}}", "body", "justify")
    p(doc, "")
    p(doc, "3. 결정 사항", "heading", "left")
    p(doc, "")
    p(doc, "{{결정사항}}", "body", "justify")
    p(doc, "")
    p(doc, "4. 후속 조치", "heading", "left")
    p(doc, "")
    p(doc, "{{후속조치}}", "body", "justify")
    p(doc, "")
    p(doc, "작성자: {{작성자}}", "body", "right")

    doc.save_to_path(output_path)
    return output_path


def build_proposal(output_path):
    """제안서 템플릿 — 사업 제안서."""
    doc = HwpxDocument.new()
    doc._style_ids = setup_styles(doc)

    p(doc, "{{제목}}", "title", "center")
    p(doc, "{{부제}}", "subtitle", "center")
    p(doc, "")
    p(doc, "{{기관명}}", "heading", "center")
    p(doc, "{{날짜}}", "body", "center")
    p(doc, "")

    sections = [
        ("1. 개요", "{{개요}}"),
        ("2. 목적", "{{목적}}"),
        ("3. 세부 내용", "{{세부내용}}"),
        ("4. 추진 일정", "{{추진일정}}"),
        ("5. 예산", "{{예산}}"),
        ("6. 기대 효과", "{{기대효과}}"),
    ]
    for title, placeholder in sections:
        p(doc, title, "heading", "left")
        p(doc, "")
        p(doc, placeholder, "body", "justify")
        p(doc, "")

    doc.save_to_path(output_path)
    return output_path


BUILDERS = {
    "base": build_base,
    "gonmun": build_gonmun,
    "report": build_report,
    "minutes": build_minutes,
    "proposal": build_proposal,
}


def main():
    os.makedirs(TEMPLATE_DIR, exist_ok=True)
    targets = sys.argv[1:] if len(sys.argv) > 1 else list(BUILDERS.keys())

    for name in targets:
        if name not in BUILDERS:
            print(f"SKIP: unknown template '{name}'", file=sys.stderr)
            continue
        out = os.path.join(TEMPLATE_DIR, f"{name}.hwpx")
        BUILDERS[name](out)
        size = os.path.getsize(out)
        print(f"OK: {out} ({size:,} bytes)")


if __name__ == "__main__":
    main()
