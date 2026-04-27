# 2026-04-27 HWPX 양식 보강 리포트 (PR #5)

> **작성일:** 2026-04-27
> **PR:** `#5` — `chore/pr5-hwpx-form-fixes` (PR #4 follow-up)
> **상위:** PR #4 (eefad0d, 2026-04-26 머지) — 4 화면 양식 1:1 정합 재설계 시리즈
> **계획서:** `docs/plans/2026-04-27-hwpx-form-fixes.md`
> **prompt:** `docs/prompts/2026-04-27-hwpx-form-fixes-followup.md`

본 리포트는 PR #4 머지 후 사용자의 한컴오피스 실물 검증 (DoD #7) 에서 발견된 회귀 11 종 + 자간 압축 회귀를 보강한 follow-up PR 의 종결 보고서이다.

---

## 1. 요약

| 카테고리 | 결과 |
|---|---|
| 표 인덱스 시프트 | ❌ **없음** (사전 진단으로 SSOT JSON 갱신 불필요 확인) |
| 11 종 누락 보강 | ✅ 모두 해결 (각 항목별 통합 테스트로 회귀 보장) |
| 자간·줄바꿈 회귀 | ✅ 신규 정본 (84d1e67·8952576) 교체로 자동 해결 |
| 신규 schema 추가 | ✅ `PBLTargetSchema.necessity_score` (1~5) — UI + Zod + payload + generate.py 완전 통합 |
| pytest 회귀 | ✅ 75 → 94 PASS (+19 신규 테스트) |
| vitest 회귀 | ✅ 339 files / 5630 tests PASS |
| npm validate / build | ✅ typecheck·lint·test·build 모두 PASS |
| 사용자 한컴 재검증 | ⏳ 대기 (8 fixture HWPX 8 종 재생성 완료) |

---

## 2. Phase A — 정본 백업 + 템플릿 교체

| 항목 | hash | 상태 |
|---|---|---|
| **로드맵** 신규 정본 | `84d1e67…` | ✅ 적용 |
| **로드맵** 이전 정본 (백업) | `3cff053…` | ✅ `templates/hwpx/archive/roadmap.pre-2026-04-27.hwpx` |
| **PBL** 신규 정본 | `8952576…` | ✅ 적용 |
| **PBL** 이전 정본 (백업) | `d6fbfbc…` | ✅ `templates/hwpx/archive/pbl.pre-2026-04-27.hwpx` |

```bash
# 검증 명령
shasum -a 256 templates/hwpx/{roadmap,pbl}.hwpx \
  templates/hwpx/archive/{roadmap,pbl}.pre-2026-04-27.hwpx
```

---

## 3. Phase B — SSOT 정합 검증

- shallow traversal 인덱스 진단 결과 신규 정본·기존 정본 완전 일치 (R 0~43, P 0~51)
- `docs/references/hwpx-structure-{roadmap,pbl}.md` dump 재실행 — diff 없음
- `node scripts/verify-mapping-completeness.mjs` PASS (94 unique placeholders, 누락 0)

→ SSOT JSON `location.table_index` 갱신 불요.

---

## 4. Phase C — 11 종 누락 보강 (TDD 적용)

| # | ID | 양식 위치 | Root cause | 해결 (commit) |
|---|---|---|---|---|
| C-1 | R-01 | 표지 회사명·일자 | `_fill_table_cover` 가 PM 표만 채움 — paragraph 3 `(기업명)`·paragraph 8 `202x. 00. 00.` 본문 텍스트 미치환 | `_replace_in_all_runs` 2 줄 추가 (dd476ba) |
| C-2 | P-01 | 표지 PM/외부/내부/주치의 | shallow 인덱스에서 잡히지 않는 nested 8×5 표 — `_fill_pbl_cover_nested` 미존재 | nested 8×5 row 1·2·4·6 col 1·2 채움 신규 함수. row 2~3·4~5·6~7 col 1·2 수직 병합 구조 검증 (282f5d6) |
| C-3 | R-08·P-06 | HRD이음 PDF | URL 패턴 분기 없이 raw 출력 | `_hrd_attachment_text` 헬퍼 — http(s):// 감지 시 `(첨부 PDF: 별첨 페이지 참조)` (2f4b90d) |
| C-4 | P-02 | Ⅰ. 훈련과정 개요 | 훈련생 (`training_target_label`) 매핑 누락 + fixture 데이터 부재 | row 11 매핑 보강 + fixture training_job/training_goals 추가 (c62d9e1) |
| C-5 | P-03·P-07 | Ⅱ-1-가·Ⅱ-3-나 | `_fill_simple_box(0, 1, ...)` — 1×1 표는 col 1 미존재 → silent skip | `_fill_pbl_simple_content(0, 0, ...)` 로 교체 (63b7c18) |
| C-6 | P-12 | Ⅲ-3-나 머리기호 1:N | 빈 paragraph 의 `paraPrIDRef='76'` (머리기호 스타일) 그대로 — 1 줄 입력에 머리기호 2 개 자동 표시 | `_fill_pbl_simple_content` 가 비어있는 paragraph 의 `paraPrIDRef` 를 `"0"` (기본 단락) 으로 reset (3aadb65) |
| C-7 | P-11 | Ⅲ-3-가 점수 1~5 | V2 schema 에 점수 필드 없음 (PR #4 마이그 시 V1 → V2 변환 과정에서 유실) | **schema·payload·generate·UI 통합** — `PBLTargetSchema.necessity_score: z.number().int().min(1).max(5).default(3)` + UI Step 9 input + Python 분배 (cd63909) |
| C-8 | P-13 | Ⅲ-3-다 빠진 칸 | V2 schema 가 V1 의 4 컬럼 (as_is/to_be/required_*) 를 description 단일에 통합 | 회귀 테스트로 col 0=title·col 1=description·col 2~4=빈 매핑 명시 (749cb11) |
| C-9 | P-20 | Ⅳ-3-다 거의 누락 | 함수가 placeholder 치환에만 의존 — 정본 placeholder 0 개 + 이전 코드는 `data_start=5` (헤더 행) 에 잘못 채움 | 상단 7 cell 직접 좌표 매핑 + 반복 행 위치 row 7~9 으로 정정 (5708fd6) |
| C-10 | P-19·P-21·P-22·P-20 반복 행 | 학습그룹·시설·강사·교과목 | fixture 자체 데이터 부재 (`facilities[]`/`training_instructors[]`/`training_contents[]`/`learning_group{}`) | 3 fixture (full·max-length·special-chars) 보강 + cover 객체 + necessity_score 추가 (7be2bf5) |

### 4.1 시각적 효과 (사용자 한컴 재검증 시 확인)

| Page | Before (PR #4) | After (PR #5) |
|---|---|---|
| 로드맵 1p (표지) | `(기업명)` raw | `(㈜AI산업자동화)` |
| 로드맵 5p | `https://x.example/hrd-report.pdf` raw | `(첨부 PDF: 별첨 페이지 참조)` |
| 전체 자간 | 글씨 겹침 (자간 압축) | 정상 |
| PBL 1p (표지) | 회사명·소속·성명 빈 | PM·외부·내부·주치의 모두 노출 |
| PBL 3p (Ⅰ) | 훈련생·훈련직무·훈련목표 빈 | 훈련생 "QA 인력 5명" + 훈련 직무 + 훈련목표 ☑ |
| PBL 4p (Ⅱ-1-가) | "기업 경영 이슈" 빈 | `company_issues` 본문 |
| PBL 5p (Ⅱ-2) | 모두 빈 | `_fill_pbl_training_env` 매핑 12 cell |
| PBL 6p (Ⅱ-3-나) | "AI훈련과정 개발 필요성" 빈 | `course_necessity` 본문 |
| PBL 9p (Ⅲ-3-가) | 점수 체크칸 빈 | 1~5 중 `necessity_score` 위치에 √ + col 6 ☑ |
| PBL 9p (Ⅲ-3-나) | 머리기호 2 개 (1 항목) | 머리기호 1 개 (정합) |
| PBL 10p (Ⅲ-3-다) | 일부 셀 빈 | title col 0 + description col 1 (V2 schema 정합, col 2~4 의도적 빈) |
| PBL 13p (Ⅳ-3-다) | 거의 다 빈 | 상단 7 cell + 반복 행 모두 채움 |
| PBL 14p (Ⅳ-3-라·마) | 모두 빈 | facilities·training_instructors fixture 데이터로 채움 |

---

## 5. Phase D — 회귀 테스트 + fixture 재생성

### 5.1 pytest

| 모듈 | PR #4 | PR #5 | 신규 |
|---|---|---|---|
| `test_placeholders_roadmap.py` | 27 | 30 | +3 (URL fallback 2 + filename 1) |
| `test_placeholders_pbl.py` | 36 | 38 | +2 (URL filename·empty) |
| `test_integration_fixtures.py` | 12 | 26 | +14 (cover·HRD·점수·머리기호·subject·facilities·instructors·learning_group·details 등) |
| **합계** | **75** | **94** | **+19** |

소요 시간: 14 분 5 초 (fixture 8 종 × 통합 케이스 다수, 매번 generate 호출)

### 5.2 vitest

```
Test Files  339 passed (339)
Tests       5630 passed (5630)
Duration    23s
```

신규 테스트:
- `interview-pbl.test.ts` 66 → 69 (+3 — `necessity_score` default·range·integer 검증)
- `StepTargetAndLevel.test.tsx` 5 → 7 (+2 — 점수 input 렌더 + reject 검증)
- 기존 8 곳 (target 객체 사용처) 의 `necessity_score: N` 명시

### 5.3 build / typecheck / lint

| 검증 | 결과 |
|---|---|
| `tsc --noEmit` | ✅ 0 errors |
| `next lint` | ✅ 0 errors / 10 pre-existing warnings |
| `next build` | ✅ Compiled successfully in 4.7s |
| `node scripts/verify-mapping-completeness.mjs` | ✅ 94 unique, 누락 0 |

### 5.4 fixture HWPX 8 종 재생성

```
docs/screenshots/2026-04-24/hwpx-hancom/
├── roadmap-empty.hwpx       411,754 B  ZIP magic OK
├── roadmap-full.hwpx        412,899 B  ZIP magic OK
├── roadmap-max-length.hwpx  416,815 B  ZIP magic OK
├── roadmap-special-chars.hwpx 413,489 B ZIP magic OK
├── pbl-empty.hwpx           117,912 B  ZIP magic OK
├── pbl-full.hwpx            119,263 B  ZIP magic OK
├── pbl-max-length.hwpx      123,003 B  ZIP magic OK
└── pbl-special-chars.hwpx   119,948 B  ZIP magic OK
```

---

## 6. P-11 점수 schema 마이그레이션 (C-7 상세)

본 PR 의 가장 큰 단일 변경 — V2 schema 누락 점수 필드 복원.

### 6.1 변경 파일 (9 곳)

| 파일 | 변경 내용 |
|---|---|
| `src/lib/schemas/interview-pbl.ts` | `PBLTargetSchema.necessity_score: z.number().int().min(1).max(5).default(3)` 추가 |
| `src/lib/services/export/hwpx/hwpx-payload-pbl.ts` | empty target 에 `necessity_score: 3` |
| `api/hwpx/_placeholders_pbl.py` | `build_pbl_table_rows("target_single")` 출력에 score 포함 |
| `api/hwpx/__fixtures__/pbl-{full,max-length,special-chars}.json` | `target.necessity_score: 5/4` 추가 |
| `src/.../StepTargetAndLevel.tsx` | 점수 input (`type="number"` min=1 max=5) + emptyTarget default(3) |
| `src/.../PBLInterviewClient.tsx` | targetAndLevel step value `necessity_score: 3` |
| `src/lib/fixtures/pbl-interview-sample.ts` | sample target `necessity_score: 5` |
| `src/.../{actions-v2,PBLInterviewClient,PBLResultClient,TabPBLTasks,converters,TestPBLClient}` 6 개 | `target` 객체 사용처 6 곳에 `necessity_score: N` 명시 (TS strict input 호환) |

### 6.2 동작 검증

- Zod default(3): 기존 DB JSONB 데이터에 점수 필드가 없어도 strict parse 가 자동 채움 → 데이터 마이그레이션 불요
- generate.py 의 기존 score → √ 표시 로직이 자동 활성화 (V1 호환 분기와 동일 코드)
- UI Step 9 의 점수 input 은 1~5 범위 외 값 입력 시 reject 후 기존 값 보존

---

## 7. Definition of Done (PR prompt 기준)

| # | 항목 | 상태 | 증거 |
|---|---|---|---|
| 1 | 서식 정본 갱신 | ✅ | hash `84d1e67…/8952576…` 적용 (Phase A) |
| 2 | 표 인덱스 SSOT 정합 | ✅ | 시프트 없음 사전 진단 + verify-mapping-completeness PASS |
| 3 | 누락 11 종 모두 출력 | ✅ | pytest 통합 테스트 26 케이스 PASS |
| 4 | 자간·줄바꿈 회귀 | ✅ | 신규 정본 교체로 자동 해결 (사용자 한컴 시각 재검증 대기) |
| 5 | 회귀 테스트 보강 | ✅ | 75 → 94 (+19) |
| 6 | npm validate && build | ✅ | typecheck 0 errors / vitest 5630 / build 4.7s |
| 7 | PR CI 전체 pass | ⏳ | PR 생성 후 모니터링 |
| 8 | 사용자 한컴 재검증 | ⏳ | 8 fixture HWPX 재생성 완료 — 사용자 측 검증 대기 |
| 9 | verification-before-completion | ⏳ | 머지 직전 호출 예정 |

---

## 8. 제약 사항 / 후속 검토

- **사용자 한컴 재검증**: 머지 전 사용자 측 8 fixture 검증 (DoD #8) 필수. 실패 시 추가 PR 로 fix.
- **P-13 V2 schema 한계**: V2 details 의 description 단일 필드가 양식의 col 1·2·3·4 (AS-IS/TO-BE/요구지식/기술) 4 컬럼에 분배되지 않음. 양식 의도와 V2 schema 의도 충돌 — 별도 follow-up 검토 필요 (PR #5 범위 외).
- **`_set_cell_text` 머리기호 회피의 일반화**: 현재 `_fill_pbl_simple_content` 1×1 단일 셀 한정. 다른 다단락 cell 에서 같은 회귀가 발견되면 일반화 필요.
- **fixture 통합 테스트 시간**: 8 fixture × 통합 케이스 26 = 14 분 — CI 에서 병목. fixture 한 번 생성 + 캐시 또는 작은 단위로 분리 검토.

---

## 9. 다음 단계

1. **PR 생성** (`gh pr create`) — `chore/pr5-hwpx-form-fixes` → main
2. **CI 모니터링** — Lint·Typecheck·Unit·Build·E2E·Vercel 6 check 전수 PASS
3. **사용자 한컴 재검증** — 8 fixture HWPX 검증 + 시각적 회귀 0 건 확인
4. **`superpowers:requesting-code-review`** 호출 + 리뷰 반영
5. **`superpowers:verification-before-completion`** 머지 직전 호출
6. **사용자 승인 후 squash merge** — main sha 갱신 + 시리즈 종결 선언
