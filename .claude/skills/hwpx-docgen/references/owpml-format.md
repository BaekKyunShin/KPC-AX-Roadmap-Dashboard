# OWPML 포맷 레퍼런스

HWPX 문서의 OWPML XML 규격 요약. python-hwpx 내장 Skeleton 기반.

> **중요**: 이 레퍼런스는 참고 문서입니다. 실제 문서 생성/편집은 반드시 python-hwpx API를 통해 수행하세요. XML을 직접 작성하지 마세요.

---

## 1. ZIP 구조

HWPX = ZIP 컨테이너. python-hwpx Skeleton 기본 구조:

```
mimetype                     # 첫 번째 엔트리, ZIP_STORED, 값: application/hwp+zip
version.xml                  # OWPML 버전
settings.xml                 # 앱 설정 (캐럿 위치 등)
Contents/
  content.hpf                # OPF 패키지 매니페스트 (header, section 참조)
  header.xml                 # 스타일 정의 (fontfaces, charPr, paraPr, borderFill 등)
  section0.xml               # 본문 (단락, 표, 이미지)
META-INF/
  container.xml              # OPC 루트 참조
  manifest.xml               # 매니페스트
  container.rdf              # RDF 메타데이터
Preview/
  PrvText.txt                # 미리보기 텍스트
  PrvImage.png               # 미리보기 이미지
```

**mimetype 규칙**: 반드시 ZIP의 첫 번째 엔트리, `ZIP_STORED` (압축 없음). 위반 시 한컴오피스에서 열리지 않음.

---

## 2. 네임스페이스 (실제 URI)

```
http://www.hancom.co.kr/hwpml/2011/paragraph   (hp)  — 단락, 텍스트, 표
http://www.hancom.co.kr/hwpml/2011/section     (hs)  — section XML 루트
http://www.hancom.co.kr/hwpml/2011/head        (hh)  — header.xml 루트
http://www.hancom.co.kr/hwpml/2011/core        (hc)  — 공통 속성
http://www.hancom.co.kr/hwpml/2011/app         (ha)  — 앱 설정
http://www.hancom.co.kr/hwpml/2016/paragraph   (hp10) — 확장 요소
http://www.hancom.co.kr/hwpml/2011/history     (hhs) — 변경 이력
http://www.hancom.co.kr/hwpml/2011/master-page (hm)  — 마스터 페이지
http://www.hancom.co.kr/schema/2011/hpf        (hpf) — 패키지 스키마
http://www.idpf.org/2007/opf/                  (opf) — OPF 패키지
urn:oasis:names:tc:opendocument:xmlns:container (ocf) — OPC 컨테이너
```

---

## 3. header.xml 구조 (스타일 정의)

header.xml은 `<hh:head>` 루트 아래 `<hh:refList>`에 모든 스타일을 정의합니다.

```xml
<hh:head version="1.5" secCnt="1">
  <hh:beginNum page="1" footnote="1" endnote="1" pic="1" tbl="1" equation="1"/>
  <hh:refList>
    <hh:fontfaces>       <!-- 폰트 정의 (언어별) -->
    <hh:borderFills>     <!-- 테두리/채움 정의 -->
    <hh:charProperties>  <!-- 문자 속성 (크기, 색상, 굵기 등) -->
    <hh:tabProperties>   <!-- 탭 속성 -->
    <hh:numberingList>   <!-- 번호 매기기 -->
    <hh:paraProperties>  <!-- 단락 속성 (정렬, 줄간격, 여백) -->
    <hh:styleList>       <!-- 스타일 정의 -->
    <!-- ... -->
  </hh:refList>
</hh:head>
```

### fontfaces (폰트 정의)
```xml
<hh:fontfaces>
  <hh:fontface lang="HANGUL">
    <hh:font id="0" face="함초롬돋움" type="TTF"/>
    <hh:font id="1" face="함초롬바탕" type="TTF"/>
  </hh:fontface>
  <hh:fontface lang="LATIN">...</hh:fontface>
  <!-- HANJA, JAPANESE, OTHER, SYMBOL, USER -->
</hh:fontfaces>
```

### charProperties (문자 속성)
```xml
<hh:charPr id="0" height="1000" textColor="#000000" borderFillIDRef="2">
  <hh:fontRef hangul="1" latin="1" .../>  <!-- fontface 내 font id 참조 -->
  <hh:bold val="1"/>                       <!-- 굵게 (없으면 기본=안굵게) -->
  <hh:italic val="1"/>                     <!-- 기울임 -->
  <hh:underline type="BOTTOM" shape="SOLID" color="#000000"/>
</hh:charPr>
```

- `height`: 폰트 크기 (pt × 100). 10pt = 1000, 12pt = 1200, 16pt = 1600
- `fontRef`: fontfaces의 font id를 참조 (0=함초롬돋움, 1=함초롬바탕)
- `bold`: val="1"이면 굵게

### paraProperties (단락 속성)
```xml
<hh:paraPr id="0" textDir="LTR">
  <hh:align horizontal="JUSTIFY" vertical="BASELINE"/>
  <hh:margin>
    <hc:left value="0" unit="HWPUNIT"/>
    <hc:right value="0" unit="HWPUNIT"/>
    <hc:indent value="0" unit="HWPUNIT"/>
  </hh:margin>
  <hh:lineSpacing type="PERCENT" value="160" unit="HWPUNIT"/>
</hh:paraPr>
```

- `align horizontal`: JUSTIFY, CENTER, LEFT, RIGHT
- `lineSpacing type`: PERCENT (줄간격 %), FIXED (고정)

### borderFills (테두리/채움)
```xml
<hh:borderFill id="1" threeD="0" shadow="0" centerLine="NONE">
  <hh:leftBorder type="NONE" width="0.1 mm" color="#000000"/>
  <hh:rightBorder type="NONE" width="0.1 mm" color="#000000"/>
  <hh:topBorder type="NONE" width="0.1 mm" color="#000000"/>
  <hh:bottomBorder type="NONE" width="0.1 mm" color="#000000"/>
</hh:borderFill>
```

---

## 4. section0.xml 구조 (본문)

```xml
<hs:sec>
  <!-- 첫 번째 단락: secPr (섹션 속성) 필수 -->
  <hp:p id="..." paraPrIDRef="0" styleIDRef="0">
    <hp:run charPrIDRef="0">
      <hp:secPr textDirection="HORIZONTAL" ...>
        <hp:pagePr landscape="WIDELY" width="59528" height="84186">
          <hp:margin header="4252" footer="4252" gutter="0"
                     left="8504" right="8504" top="5668" bottom="4252"/>
        </hp:pagePr>
        <!-- footNotePr, endNotePr, pageBorderFill 등 -->
      </hp:secPr>
      <hp:ctrl>
        <hp:colPr type="NEWSPAPER" layout="LEFT" colCount="1"/>
      </hp:ctrl>
    </hp:run>
  </hp:p>

  <!-- 이후 본문 단락들 -->
  <hp:p paraPrIDRef="0" styleIDRef="0">
    <hp:run charPrIDRef="0">
      <hp:t>본문 텍스트</hp:t>
    </hp:run>
  </hp:p>
</hs:sec>
```

### 스타일 참조 시스템

```
header.xml에 정의    →  section0.xml에서 참조
─────────────────────────────────────────────
charPr  (id=1)       →  hp:run  charPrIDRef="1"
paraPr  (id=1)       →  hp:p    paraPrIDRef="1"
style   (id=1)       →  hp:p    styleIDRef="1"
borderFill (id=1)    →  hp:tbl / hp:tc  borderFillIDRef="1"
```

---

## 5. 단위 환산

- **hwpunit**: 1mm = 283.46 hwpunit
- **A4 용지**: width=59528, height=84186 (≈210mm × 297mm)
- **기본 여백**: top=5668(20mm), bottom=4252(15mm), left=8504(30mm), right=8504(30mm)
- **본문 영역 너비**: 59528 - 8504 - 8504 = 42520 hwpunit (≈150mm)

---

## 6. python-hwpx API 요약

```python
from hwpx import HwpxDocument

# 생성
doc = HwpxDocument.new()           # Skeleton 기반 빈 문서
doc = HwpxDocument.open("f.hwpx")  # 기존 문서 열기

# 단락
doc.add_paragraph("텍스트", char_pr_id_ref="0", para_pr_id_ref="0")

# 표
tbl = doc.add_table(rows, cols)
tbl.cell(r, c).paragraphs[0].runs[0].text = "내용"
tbl.merge_cells(sr, sc, er, ec)

# 텍스트 치환
doc.replace_text_in_runs("{{키}}", "값")

# 추출
doc.export_text()
doc.export_markdown()

# 검증
doc.validate()

# 저장
doc.save_to_path("output.hwpx")
```
