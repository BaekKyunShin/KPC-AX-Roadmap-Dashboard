# 표 XML 구조 레퍼런스

HWPX 문서 내 표의 OWPML 구조. python-hwpx API 사용 시 참고용.

> **중요**: 표 생성은 `doc.add_table(rows, cols)` API를 사용합니다. XML을 직접 작성하지 마세요.

---

## 1. python-hwpx 표 API

```python
from hwpx import HwpxDocument

doc = HwpxDocument.new()

# 표 생성
tbl = doc.add_table(3, 4)   # 3행 4열

# 셀 내용 채우기
cell = tbl.cell(0, 0)       # 0행 0열
cell.paragraphs[0].runs[0].text = "내용"

# 셀 병합
tbl.merge_cells(0, 0, 0, 1)  # (0,0)~(0,1) 가로 병합

doc.save_to_path("output.hwpx")
```

---

## 2. 표 XML 구조 (참고)

네임스페이스: `http://www.hancom.co.kr/hwpml/2011/paragraph` (hp)

```xml
<hp:p>
  <hp:run charPrIDRef="0">
    <hp:tbl id="..." rowCnt="3" colCnt="4" cellSpacing="0"
            borderFillIDRef="0" noAdjust="0">
      <hp:sz width="..." height="..." widthRelTo="ABSOLUTE"
             heightRelTo="ABSOLUTE" protect="0"/>
      <hp:pos treatAsChar="1" .../>
      <hp:tr>
        <hp:tc name="" header="0" borderFillIDRef="0">
          <hp:subList textDirection="HORIZONTAL" vertAlign="CENTER">
            <hp:p paraPrIDRef="0" styleIDRef="0">
              <hp:run charPrIDRef="0">
                <hp:t>셀 내용</hp:t>
              </hp:run>
            </hp:p>
          </hp:subList>
          <hp:cellAddr colAddr="0" rowAddr="0"/>
          <hp:cellSpan colSpan="1" rowSpan="1"/>
          <hp:cellSz width="..." height="..."/>
        </hp:tc>
      </hp:tr>
    </hp:tbl>
  </hp:run>
</hp:p>
```

---

## 3. 셀 병합

python-hwpx `tbl.merge_cells(start_row, start_col, end_row, end_col)` 사용.

내부 XML 동작:
- 주 셀: `colSpan`/`rowSpan` 값이 병합 범위만큼 증가
- 흡수 셀: `colSpan="0"` 또는 `rowSpan="0"` (비활성화)

---

## 4. 크기 계산

- **A4 본문 영역 너비**: 42520 hwpunit (≈150mm)
- **표 기본 너비**: 본문 영역 전체 (42520)
- **열 너비**: `표 너비 / 열 수` (균등 분할 기본)
- **셀 기본 높이**: 1800 hwpunit
- **1mm = 283.46 hwpunit**

---

## 5. borderFill (표 테두리)

python-hwpx는 표 생성 시 자동으로 기본 borderFill을 할당합니다.
`header.ensure_basic_border_fill()`로 커스텀 테두리 추가 가능.

실제 OWPML 구조 (참고):
```xml
<hh:borderFill id="2" threeD="0" shadow="0" centerLine="NONE">
  <hh:leftBorder type="SOLID" width="0.12 mm" color="#000000"/>
  <hh:rightBorder type="SOLID" width="0.12 mm" color="#000000"/>
  <hh:topBorder type="SOLID" width="0.12 mm" color="#000000"/>
  <hh:bottomBorder type="SOLID" width="0.12 mm" color="#000000"/>
</hh:borderFill>
```
