# hwpx-docgen 스크립트 API 레퍼런스

모든 스크립트는 `scripts/` 디렉터리에 있으며 **python-hwpx** 기반입니다.

**사전 설치**: `pip install python-hwpx lxml`

---

## 일반 규칙

- 종료 코드: `0` 성공, `1` 검증 실패, `2` 치명적 오류
- 모든 스크립트는 `.hwpx` 파일을 직접 입출력
- 네임스페이스는 python-hwpx가 내부 관리

---

## 스크립트 목록 (8개)

### build_hwpx.py
```
python scripts/build_hwpx.py --template <name_or_hwpx> --content <json> --output <output.hwpx>
python scripts/build_hwpx.py --content <json> --output <output.hwpx>  # 템플릿 없이 신규
```
`HwpxDocument.open()` 또는 `.new()`로 문서 생성. 플레이스홀더 치환 + heading/text/table 추가. 표 셀 내부 플레이스홀더도 치환.

### generate_templates.py
```
python scripts/generate_templates.py              # 전체 템플릿 재생성
python scripts/generate_templates.py gonmun        # 특정 템플릿만
```
python-hwpx Skeleton 기반 프로페셔널 `.hwpx` 템플릿 생성. 커스텀 charPr(폰트/크기/굵기), paraPr(정렬) 적용.

### table_gen.py
```
python scripts/table_gen.py --rows <n> --cols <m> --data '<json>' [--merge '<json>'] [--output <file.hwpx>]
```
`doc.add_table()` → `tbl.set_cell_text()` → `tbl.merge_cells()`로 표 생성. 출력 생략 시 마크다운 미리보기.

### extract_text.py
```
python scripts/extract_text.py <file.hwpx> --format <plain|markdown|json>
```
`doc.export_text()`, `doc.export_markdown()` 또는 구조화 JSON으로 추출.

### validate_hwpx.py
```
python scripts/validate_hwpx.py <file.hwpx>
```
`doc.validate()` 내장 검증. PASS/WARN/FAIL 보고.

### analyze_template.py
```
python scripts/analyze_template.py <file.hwpx>
```
문서 메타데이터 분석: 단락/표 수, 스타일, 플레이스홀더 `{{...}}` 자동 탐지.

### zip_replace_all.py
```
python scripts/zip_replace_all.py <input.hwpx> --mapping <json_file> [--output <output.hwpx>]
```
`doc.replace_text_in_runs()` + 표 셀 내부 순회로 플레이스홀더 치환. OWPML 구조 안전 유지.

### page_guard.py
```
python scripts/page_guard.py <file.hwpx> --ref-pages <n>
```
단락/표 수 기반 페이지 추정. 경고만 출력 (차단 안 함).
