#!/usr/bin/env python3
"""
로드맵 HWPX 템플릿의 Ⅰ-3 입력 셀 정렬을 왼쪽으로 교정 (2026-04-23).

배경:
    사용자가 양식 원본 기준 "왼쪽 정렬" 을 의도했으나, 구 템플릿·신 양식 모두
    Ⅰ-3 "선정 과업" · "수립 주요내용" 입력 셀 paragraph 가
    paraPrIDRef="21" (horizontal=CENTER) 로 설정되어 있어 가운데 정렬로 렌더됨.

    paraPr 21 을 전역 수정하면 169개 사용처에 영향이 있으므로 안전하지 않음.
    대신 **paraPr 21 을 복제한 새 paragraph 속성 (id=최대id+1, horizontal=LEFT)**
    을 header.xml 에 추가하고, Ⅰ-3 입력 셀 paragraph 만 이 새 ID 로 교체한다.

처리 대상:
    - tbl[7] (Ⅰ-3 수립 주요 결과 3x4): (1,1) "선정 과업" 입력 · (2,1) "주요내용" 입력
    - 기존 셀 paragraph paraPrIDRef 가 21 (CENTER) 인 것을 새 LEFT ID 로 교체

원칙:
    - header.xml 전역 paraPr 는 건드리지 않고, **새 id 만 추가**
    - section0.xml 에서 정확히 2개 paragraph 만 교체 (tbl[7] 안의 입력 셀)
    - ZIP 내부 XML 편집은 python-hwpx API 로 불가능 (paraPrIDRef 미노출) —
      zipfile + 문자열 치환으로 처리

산출물: templates/hwpx/roadmap.hwpx 를 직접 갱신 (in-place 수정)
"""
from __future__ import annotations
import re
import shutil
import sys
import tempfile
import zipfile
from pathlib import Path

TEMPLATE = Path(
    '/Users/baekkyunshin/Desktop/AI-roadmap-dashboard/templates/hwpx/roadmap.hwpx'
)


def fix_alignment() -> None:
    assert TEMPLATE.exists(), f'template missing: {TEMPLATE}'

    # 원본 파일 → 임시 디렉터리에 풀고 수정 후 재압축
    with tempfile.TemporaryDirectory() as td:
        tmp_dir = Path(td)
        with zipfile.ZipFile(TEMPLATE, 'r') as zin:
            zin.extractall(tmp_dir)

        header_path = tmp_dir / 'Contents' / 'header.xml'
        section_path = tmp_dir / 'Contents' / 'section0.xml'

        header = header_path.read_text(encoding='utf-8')
        section = section_path.read_text(encoding='utf-8')

        # 1) 기존 최대 paraPr id 찾기
        ids = [int(m.group(1)) for m in re.finditer(r'<hh:paraPr id="(\d+)"', header)]
        new_id = max(ids) + 1
        print(f'new paraPr id = {new_id} (기존 최대 {max(ids)})')

        # 2) paraPr 21 전체 정의 찾기
        m = re.search(r'<hh:paraPr id="21"[^>]*>.*?</hh:paraPr>', header, re.DOTALL)
        if not m:
            raise RuntimeError('paraPr id=21 not found in header.xml')
        paraPr21 = m.group(0)

        # 3) 복제 + id 변경 + horizontal=LEFT 교체
        paraPr_new = paraPr21.replace(
            'id="21"',
            f'id="{new_id}"',
            1,
        ).replace(
            'horizontal="CENTER"',
            'horizontal="LEFT"',
            1,
        )
        assert paraPr_new != paraPr21, 'replace failed'
        # header 의 </hh:paraPrs> 태그 직전에 삽입 (한컴 XML 은 hh:paraPrs 로 감싸짐)
        if '</hh:paraPrs>' in header:
            new_header = header.replace('</hh:paraPrs>', paraPr_new + '</hh:paraPrs>', 1)
        else:
            # fallback: paraPr 21 바로 뒤에 삽입
            new_header = header.replace(paraPr21, paraPr21 + paraPr_new, 1)
        header_path.write_text(new_header, encoding='utf-8')
        print(f'  header.xml: paraPr id={new_id} (LEFT) 추가')

        # 4) section0.xml 의 Ⅰ-3 입력 셀 paragraph 교체
        #    "선정 과업" 라벨 셀 이후 가장 가까운 paraPrIDRef="21" 의 빈 paragraph → new_id
        #    "수립 주요내용" 라벨 셀 이후 가장 가까운 paraPrIDRef="21" 의 빈 paragraph → new_id
        replacements = 0
        for anchor_label in ['선정 과업', '수립 주요내용']:
            label_idx = section.find(anchor_label)
            if label_idx < 0:
                print(f'  [WARN] 라벨 못 찾음: {anchor_label!r}')
                continue
            # 라벨 텍스트 이후 섹션에서 첫 번째 "빈 셀 paragraph (paraPrIDRef=21 + <hp:run .../> 외 내용 없음)"
            after = section[label_idx:]
            # 빈 paragraph 매칭: <hp:p ... paraPrIDRef="21" ...><hp:run ...><hp:lineSegArray/></hp:run></hp:p>
            # 구체적으로는 <hp:t> 태그가 없는 paragraph
            pattern = re.compile(
                r'(<hp:p [^>]*paraPrIDRef=")21("[^>]*>((?!</hp:p>|<hp:t).)*?</hp:p>)',
                re.DOTALL,
            )
            m = pattern.search(after)
            if m is None:
                # 빈 paragraph 매칭 실패 — 단순 첫 번째 paraPrIDRef="21" 교체
                simple_pattern = re.compile(r'(<hp:p [^>]*paraPrIDRef=")21("[^>]*>)')
                m2 = simple_pattern.search(after)
                if m2 is None:
                    print(f'  [WARN] 빈 paragraph 매칭 실패 for {anchor_label!r}')
                    continue
                abs_start = label_idx + m2.start()
                abs_end = label_idx + m2.end()
                new_frag = m2.group(1) + str(new_id) + m2.group(2)
                section = section[:abs_start] + new_frag + section[abs_end:]
                replacements += 1
                print(
                    f'  [OK] {anchor_label!r} 다음 paragraph paraPrIDRef 21→{new_id} '
                    f'(simple match, abs pos={abs_start})'
                )
            else:
                abs_start = label_idx + m.start()
                abs_end = label_idx + m.end()
                new_frag = m.group(1) + str(new_id) + m.group(2)
                section = section[:abs_start] + new_frag + section[abs_end:]
                replacements += 1
                print(
                    f'  [OK] {anchor_label!r} 다음 빈 paragraph paraPrIDRef 21→{new_id} '
                    f'(abs pos={abs_start})'
                )
        section_path.write_text(section, encoding='utf-8')
        print(f'  section0.xml: {replacements}개 paragraph 교체')

        # 5) 재압축 (원본 덮어쓰기)
        tmp_out = tmp_dir / 'out.hwpx'
        with zipfile.ZipFile(tmp_out, 'w', zipfile.ZIP_DEFLATED) as zout:
            for entry in (tmp_dir.rglob('*')):
                if entry.is_file() and entry != tmp_out:
                    rel = entry.relative_to(tmp_dir)
                    zout.write(entry, arcname=str(rel))

        # 안전 교체: 백업 없이 덮어쓰기 (git 으로 되돌릴 수 있음)
        shutil.copy(str(tmp_out), str(TEMPLATE))
        print(f'[DONE] {TEMPLATE}')


if __name__ == '__main__':
    fix_alignment()
