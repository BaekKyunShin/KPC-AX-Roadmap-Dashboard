# PR #5 — HWPX 서식 정본 갱신 + 누락 항목 11 종 보강 (PR #4 Follow-up)

항상 한국어로 답변할 것.

## 배경

KPC AI 훈련 로드맵 대시보드의 4 화면 양식 1:1 정합 재설계 시리즈는 PR #1~#4 로 종결됐다 (2026-04-26 머지, main sha `eefad0d`). 그러나 PR #4 머지 후 사용자의 한컴오피스 실물 검증 (DoD #7) 에서 다음 회귀가 발견됐다:

1. **서식 추가 수정** — 사용자가 정본 HWPX 의 서식만 추가 수정 (자간·줄바꿈 등)
2. **데이터 누락 11 종** — HWPX 출력에 인터뷰/결과 데이터 일부가 채워지지 않음

이 PR (#5) 은 본 회귀를 보강하는 follow-up 이다.

## 단일 원천 문서 (반드시 통독)

1. **`docs/references/2026-04-23-current-fields-inventory.md`** — 산인공 양식 분해 기준 (1717 줄)
2. **`docs/references/1.AI훈련로드맵 컨설팅 보고서(양식).pdf`** (15p) / **`2.AI PBL 과정개발보고서 및 결과보고서(양식).pdf`** (20p) — 양식 정본 PDF
3. **`docs/references/1.AI훈련로드맵 컨설팅 보고서(양식).hwpx`** / **`2.AI PBL 과정개발보고서 및 결과보고서(양식).hwpx`** — **사용자 신규 서식 수정본** (2026-04-27 갱신, hash `84d1e67…` / `8952576…`)
4. **`docs/references/hwpx-placeholders.json`** — SSOT v2 (94 placeholders, 79 entries)
5. **`docs/references/hwpx-structure-{roadmap,pbl}.md`** — PR #3 의 표 인덱스·셀 좌표 분석본 (재분석 필요)
6. **`templates/hwpx/{roadmap,pbl}.hwpx`** — 파이프라인 입력 (이전 정본, hash `3cff053…` / `d6fbfbc…` — **교체 대상**)
7. **`api/hwpx/generate.py`** + `api/hwpx/_placeholders_{roadmap,pbl}.py` — 치환 로직 (PR #3 산출물, 누락 보강 대상)
8. **`api/hwpx/__fixtures__/`** — 8 fixture (PR #4 산출물, 그대로 재사용)
9. **`docs/reports/2026-04-25-form-parity-report.md`** — PR #3 진행 보고서 (Phase A·B 절차 참조)
10. **`docs/reports/2026-04-24-form-parity-report.md`** — PR #4 최종 보고서 (47 섹션 대조 표)
11. **`docs/plans/archive/2026-04-24-interview-result-screens-redesign.md`** §5 (HWPX 9 단계) + §6 (매핑 표) — 절차 가이드

## 사용자 한컴 검증 결과 (Follow-up 작업 명세)

### 양식 1. AI 훈련로드맵 컨설팅 보고서

**1 page (표지)**
- ❌ **표지에 기업명·날짜 미기재** — `roadmap_cover_company_name`, `roadmap_cover_report_date` placeholder 가 채워지지 않음

**5 page**
- ❌ **`https://x.example/hrd-report.pdf` 같은 URL 이 본문에 노출** — `hrd_report_attachment` (URL 형) 데이터가 raw URL 로 출력됨. PDF 첨부 처리로 fallback 안내 텍스트만 노출하거나 빈 문자열 처리 필요

**전체적으로**
- ❌ **자간이 지나치게 좁혀져 글씨가 겹쳐 보임** — 셀 폭 초과 시 자간 압축 대신 줄바꿈으로 처리해야 함 (HWPX 의 `auto-spacing` 또는 `wordwrap` 속성 검토)

### 양식 2. AI PBL 과정개발보고서 및 결과보고서

**1 page (표지)**
- ❌ **표지에 기업명 미기재** — `pbl_cover_company_name` 등 cover placeholder 누락
- ❌ **소속·성명 미기재** — PM·내부전문가 cover 영역 누락

**3 page**
- ❌ **훈련생·훈련직무·훈련목표 내용 누락** — Ⅰ. 훈련과정 개요 (table_index 1, P-02) 에서 일부 셀이 비어 있음

**4 page**
- ❌ **`가. 기업 경영 이슈` 누락** — Ⅱ-1-가 (`company_issues`, P-03) 출력 누락
- ⚠️ **`나. 조직 및 주요 업무` 건드리지 말 것** — 표 형태로 컨설턴트가 직접 수정할 영역 (P-04 자동 채우기 비활성화 검토)

**5 page**
- ❌ **`2. 기업 훈련환경 분석` 모든 내용 누락** — Ⅱ-2 (P-05, table_index 7) 모든 셀 누락

**6 page**
- ❌ **`나. AI훈련과정 개발 필요성` 내용 누락** — Ⅱ-3-나 (`course_necessity`, P-07) 출력 누락

**9 page**
- ❌ **`가. 훈련대상 업무 선정` 의 AI훈련과정 개발 필요성 체크 누락** — Ⅲ-3-가 (P-11, table_index 19) 의 필요성 체크박스 (1~5점) 미렌더
- ❌ **`나. AI기반 문제해결의 필요성` 항목 1 개에 머리기호 2 개** — P-12 출력에서 항목 카운트와 머리기호 카운트 불일치. 빈 항목에 머리기호 자동 삽입 로직 점검

**10 page**
- ❌ **`다. 훈련대상 업무 세부내용` 빠진 칸** — Ⅲ-3-다 (P-13, table_index 22) 의 일부 셀 채움 누락 (`details[].title`/`description` 매핑 실패 가능성)

**13 page**
- ❌ **`다. 훈련 교과목 프로파일` 거의 다 누락** — Ⅳ-3-다 (P-20, table_index 32, 15×10 대형 표) 의 cell_fill 7 개 + repeat training_contents 거의 미렌더

**14 page**
- ❌ **`라. 시설·장비`, `마. 훈련강사` 모두 누락** — P-21 (`facilities`), P-22 (`instructors`) 출력 누락

## 작업 범위 (Phase A → D 재실행 + 검증)

### Phase A. 서식 정본 갱신 + 백업

1. **백업** — 기존 `templates/hwpx/{roadmap,pbl}.hwpx` (hash `3cff053…` / `d6fbfbc…`) → `templates/hwpx/archive/{roadmap,pbl}.pre-2026-04-27.hwpx` 로 이동
2. **교체** — 새 정본 (`docs/references/{1,2}.AI*.hwpx`, hash `84d1e67…` / `8952576…`) → `templates/hwpx/{roadmap,pbl}.hwpx` 로 복사
3. **백업 검증** — `docs/references/archive/` 의 이전 백업과 hash cross-check (계획서 §A.2 패턴)

### Phase B. 표 인덱스 재분석 + SSOT 갱신

1. `scripts/dump_hwpx_structure.py` 실행 → `docs/references/hwpx-structure-{roadmap,pbl}.md` 갱신 — **shallow traversal 인덱스 기준** (PR #3 Phase B.7 v2 정정 참조)
2. 변경된 표 인덱스가 있으면 SSOT JSON (`hwpx-placeholders.json`) 의 `location.table_index` 갱신
3. `scripts/verify-mapping-completeness.mjs` 실행 → 누락 0 건 cross-check
4. `templates/hwpx/{roadmap,pbl}.hwpx` 의 신규 hash 를 `docs/reports/2026-04-25-form-parity-report.md` Phase A.2 표에 추가 commit

### Phase C. 누락 항목 보강 (위 11 종 + 서식 처리)

각 누락 항목별 systematic-debugging:

#### Cover 영역 (R-01, P-01)
- `_placeholders_roadmap.py` / `_placeholders_pbl.py` 의 cover 셀 매핑 검증 — `cover` 객체가 `data` 에 전달되는지 확인
- `generate.py` 의 `_fill_*_cover` 함수가 cover dict 를 1:1 매핑하는지 검증
- fixture 의 cover 데이터가 SSOT placeholder 키와 일치하는지 cross-check

#### URL Raw 노출 (R-08 hrd_report_attachment)
- `generate.py` 에서 `hrd_report_attachment` 가 URL 인 경우 raw 출력 대신 placeholder 안내 문구 (`(첨부 PDF: 별첨 페이지 참조)`) 로 치환
- 또는 빈 문자열 처리 (사용자 선호 확인)

#### Cell Fill 누락 (P-02, P-05, P-07, P-08, P-11, P-13, P-19, P-20, P-21, P-22)
- 각 entry 의 `_fill_pbl_*` 함수 호출 흐름 추적
- payload TS (`hwpx-payload-pbl.ts`) → Python (`generate.py`) → 셀 채움 단계 별 데이터 누수 확인
- V2 데이터 구조 (PR #3 Phase D-3b 적응) 가 모든 entry 에서 정상 처리되는지

#### 우선순위 체크박스 누락 (P-11)
- Ⅲ-3-가 의 AI훈련과정 개발 필요성 1~5 점 체크박스 (`☐` / `☑`) 토글 로직 검증
- `target.necessity_score` 값에 따른 체크박스 N (1~5) 활성

#### 머리기호 1:N 불일치 (P-12)
- Ⅲ-3-나 의 항목 카운트와 머리기호 카운트 정합성 — 빈 항목에 자동 삽입되는 머리기호 제거

#### 자간·줄바꿈 (전체)
- HWPX run 의 `auto-spacing` / `wordwrap` 속성 검토 — 셀 폭 초과 시 자간 압축 대신 줄바꿈 강제

### Phase D. fixture 검증 + 통합 테스트

1. `pytest api/hwpx/test_integration_fixtures.py -v` 실행 — 12/12 PASS 유지
2. 신규 케이스 추가 — 11 종 누락 보강을 검증할 회귀 테스트 (예: `test_pbl_full_contains_company_issues`, `test_roadmap_full_renders_cover_company_name`)
3. fixture 8 개 HWPX 재생성 → `docs/screenshots/2026-04-24/hwpx-hancom/` 갱신
4. 사용자 측 한컴오피스 재검증 의뢰

### Phase E. 보고서 갱신 + PR + CI + 머지

1. `docs/reports/2026-04-24-form-parity-report.md` §5.4 표 갱신 — 한컴 검증 결과 ✅
2. 추가 보고서: `docs/reports/2026-04-27-hwpx-form-fixes-report.md` 신규 — Phase A~D 결과 누적
3. `npm run validate && npm run build` 통과
4. PR 생성 → `gh pr checks` Lint·Typecheck·Unit·Build·**E2E**·Vercel 전수 pass
5. `superpowers:requesting-code-review` 호출 + 리뷰 반영
6. `superpowers:verification-before-completion` 머지 직전 호출
7. 사용자 승인 후 squash merge

## Definition of Done (모두 충족)

1. **서식 정본 갱신** — `templates/hwpx/{roadmap,pbl}.hwpx` 가 `docs/references/{1,2}.AI*.hwpx` 와 hash 일치
2. **표 인덱스 SSOT 정합** — `hwpx-placeholders.json` 의 `location.table_index` 가 신규 정본 shallow traversal 과 일치
3. **누락 11 종 모두 출력 정상** — 위 사용자 검증 결과 항목 모두 fixture 출력에 정상 표시
4. **자간·줄바꿈 회귀 없음** — 신규 HWPX 출력에 자간 압축으로 인한 글씨 겹침 0 건
5. **회귀 테스트** — pytest 통합 테스트 75+ → 80+ 케이스로 보강 (11 종 누락 cover)
6. **`npm run validate && npm run build`** 통과
7. **PR CI 전체 pass** — Lint·Typecheck·Unit·Build·E2E·Vercel
8. **사용자 한컴 재검증** — 신규 HWPX 8 개 모두 정상 (자간·줄바꿈 포함)
9. **`verification-before-completion`** 호출 후 완료 선언

## 진행 방식

1. PR #4 머지 확인 (`git log --oneline -1` → `eefad0d`) — 미완료 시 보류
2. 위 문서 11 종 통독
3. PlanMode 로 Phase A~E 세분화 계획 작성 (`docs/plans/archive/2026-04-27-hwpx-form-fixes.md` 신규)
4. 사용자 승인 후 구현
5. fixture 재생성 후 사용자 측 한컴 재검증 의뢰
6. 머지 직전 verification-before-completion 호출

## 주의 사항

- **셀 인덱스 변경 가능성** — 새 서식이 자간 외 표 구조를 건드렸다면 SSOT 의 `table_index` 가 시프트될 수 있음. PR #3 Phase B.7 의 v2 정정 (shallow traversal) 패턴을 그대로 적용
- **cover 영역 재분석 필수** — 표지 누락은 cover 매핑 함수의 cell 좌표가 신규 정본과 다를 가능성. 신규 정본의 표지 표 (table_index 1) 를 우선 분석
- **사용자 정본의 자간 압축 회피** — HWPX 의 `<hp:t>` element 의 자간 속성 직접 수정보다는, 텍스트 길이가 긴 셀에 강제 줄바꿈 (`\n`) 을 삽입하는 방식 검토. 단, 양식 PDF 의 시각적 일관성 우선
- **미사용 V1 함수** — `_fill_pbl_recommendations`/`_fill_pbl_dissemination`/`_fill_pbl_performance_metrics`/`_fill_pbl_hrd_history` 는 V2 conditional 로 이미 처리. 누락 보강 시 새 함수 추가 vs 기존 함수 확장 결정 필요

## 사용 스킬·MCP·서브에이전트

- `superpowers:systematic-debugging` — 11 종 누락 root cause 분석 (각 항목별 Phase 1)
- `superpowers:writing-plans` — Phase A~E 세분화
- `superpowers:test-driven-development` — Phase D 회귀 테스트 (RED → GREEN)
- `superpowers:requesting-code-review` / `superpowers:receiving-code-review` — Phase E
- `superpowers:verification-before-completion` — 머지 직전 필수
- `hwpx-docgen` 스킬 — HWPX 구조 분석·표 편집
- `serena` MCP — 기존 코드 심볼 탐색·치환
- `sequential-thinking` MCP — 복잡한 셀 좌표 매핑 추론
- `puppeteer` / `claude-in-chrome` MCP — 결과 화면 다운로드 시뮬레이션

진행해줘.
