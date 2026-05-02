# 2026-04-19 OFA Step 12 Task 3.5 — HWPX 양식 자동 QA 리포트

## 컨텍스트

계획서 Task 3.5 원문 지시는 "Session 09 한글 프로그램 검증 피드백 일괄 반영". 사용자 취침으로 실제 피드백 목록을 받을 수 없어, 자동 QA 가능한 항목만 점검했다.

## 자동 QA 결과

### 1. Python placeholder 테스트 (pytest)

```
.venv-hwpx/bin/pytest api/hwpx/
→ 38 passed in 0.02s
```

구체 통과 시나리오:

**로드맵 (18 tests)** `api/hwpx/test_placeholders_roadmap.py`
- 기본 필드 매핑
- 누락 필드 → 빈 문자열
- AI 역량 수준 체크박스 (BEGINNER/INTERMEDIATE/ADVANCED/미지정) 4 케이스
- NCS 사용/미사용 분기 + 폴백 (3 케이스)
- 교육 대상자 placeholder
- 반복 표 (수행 활동 / 과업 흐름 / 역량 / 교육 구조 / 연간 계획) 5종
- 알 수 없는 키 → 예외
- 교육 과정 목록 추출

**PBL (20 tests)** `api/hwpx/test_placeholders_pbl.py`
- 표지 + 개요 필드
- 비즈니스 이슈 + 핵심 텍스트
- AI 수준 설명 매핑
- None/미지정 값 → 빈 문자열
- 반복 표 14종 (조직도, 성과 활동, 문제 우선순위, 대상 업무, 업무 상세, AI 도구 활용, 교육 이력, 권고, 학습 그룹, 교육 내용, 시설, 강사, 성과 체크리스트, 알 수 없는 키)

### 2. Node ↔ Python 계약 일관성

- 로드맵: `src/lib/services/export/hwpx/hwpx-payload-roadmap.ts` 의 payload 필드가 `api/hwpx/_placeholders_roadmap.py` 의 `build_placeholder_map`·`build_table_rows` 에서 대응됨 (pytest 18 / ts-test 별도 확인).
- PBL: `hwpx-payload-pbl.ts` ↔ `_placeholders_pbl.py` 마찬가지 대응.

### 3. 파일 사이즈 기준 baseline

- `templates/hwpx/roadmap.hwpx` = 412,011 bytes
- `templates/hwpx/pbl.hwpx` = 156,401 bytes

생성 산출물은 ZIP 매직 넘버(`504b 0304`) 포함 확인은 실제 다운로드 시 Playwright MCP 회귀 감사(Task 3.6) 에서 수행.

## 자동 QA 로 잡히지 않는 영역 (사용자 시각 검수 필수)

다음은 한글 프로그램에서 파일을 열고 직접 확인해야 한다 (본 세션 범위 밖):

1. **조판 품질** — 표 셀 내부 줄바꿈, 빈 줄, 폰트, 글자 크기, 밑줄/강조
2. **산인공 양식 픽셀 일치도** — 양식 1번(3~12p) · 양식 2번(3~17p + 결과보고서) PDF 와 겹쳐 비교
3. **긴 텍스트 오버플로** — 50 자 이상 사용자 입력이 셀 밖으로 넘어가는지
4. **체크박스 심볼 렌더링** — `☑`/`☐` 가 한글에서 깨지지 않는지
5. **한국어 자음 분리** — UTF-8 NFD 입력 시 조합 파괴 여부
6. **표지·결재란 · 페이지 번호** — 템플릿 마스터 요소 정상 출력

## 권고

- 본 PR 머지 전 Preview 배포에서 실제 기업 샘플 데이터로 HWPX 3건 이상 생성해 한글 프로그램으로 확인.
- 발견되는 시각 이슈는 별도 hotfix PR 로 처리 (본 PR 이 최종 관문이어도 시각 검수 결과에 따라 추가 조정 가능).

## 참고

- `api/hwpx/generate.py` (2.5 K 라인)
- `api/hwpx/_placeholders_roadmap.py`, `api/hwpx/_placeholders_pbl.py`
- `src/lib/services/export/hwpx/*`
- `templates/hwpx/roadmap.hwpx`, `templates/hwpx/pbl.hwpx`
