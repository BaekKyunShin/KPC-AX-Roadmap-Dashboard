# HWPX 템플릿 유지보수 가이드

> **이 문서는 상시 참조 가이드다.** 새 산인공 정본 양식이 주어졌을 때 반복 시행착오
> 없이 그대로 적용할 수 있도록 파이프라인의 **원리·절차·체크리스트**를 집약한다.
>
> **SSOT(단일 진실 공급원)는 코드와 `docs/references/hwpx-placeholders.json` 이다.**
> 본 문서는 그 위에서 "왜 이렇게 하는가"를 설명할 뿐, 값·좌표의 정본이 아니다.
> 코드와 본 문서가 어긋나면 **코드가 옳다** — 발견 즉시 본 문서를 갱신한다.
> 코드 라인 번호는 변하므로 본문은 **함수명**으로 참조한다.

관련 문서: 구현 계획(시점형) `docs/plans/2026-07-13-hwpx-v2-template-migration.md` ·
양식 구조 인벤토리 `docs/references/hwpx-structure-roadmap.md` /
`docs/references/hwpx-structure-pbl.md` · SSOT `docs/references/hwpx-placeholders.json`.

## 목차

1. [개요·목적](#1-개요목적)
2. [파이프라인 흐름](#2-파이프라인-흐름)
3. [python-hwpx 한계·안전 규칙](#3-python-hwpx-한계안전-규칙) — **3-1. 대원칙: 고칠 때 기존 것 유지**
4. [셀 서식 원리표](#4-셀-서식-원리표)
5. [비파괴 치환 패턴](#5-비파괴-치환-패턴)
6. [글머리·날짜·온점 규칙](#6-글머리날짜온점-규칙)
7. [정렬 결정표](#7-정렬-결정표)
8. [insert_placeholders.py 후처리 헬퍼 목록](#8-insert_placeholderspy-후처리-헬퍼-목록)
9. [새 양식 적용 체크리스트](#9-새-양식-적용-체크리스트)
10. [육안 검증 체크리스트](#10-육안-검증-체크리스트)
11. [시행착오 로그(요약)](#11-시행착오-로그요약)
12. [작성 가이드 콘텐츠 제약](#12-작성-가이드-콘텐츠-제약)

---

## 1. 개요·목적

산인공은 로드맵/PBL 두 보고서 양식을 주기적으로 개정한다. 개정 때마다 표 순번·셀
좌표·서식이 바뀌므로, 무작정 템플릿 파일만 교체하면 값 주입이 전부 깨진다. 이
파이프라인은 그 위험을 두 축으로 차단한다.

- **좌표는 빌드 타임에만 산다.** 런타임(`generate.py`)은 표 순번·셀 좌표를 전혀
  모른 채 `{{마커}}`만 값으로 치환한다. 양식에 표가 추가·삭제돼도 런타임은 안 깨진다.
- **좌표의 정본은 SSOT JSON 하나다.** 빌드 스크립트가 SSOT를 읽어 정본 양식에
  마커를 심어 템플릿을 만들고, CI(`ci.yml`의 **HWPX Verify** job)가 두 verify
  스크립트 + pytest 전건을 PR마다 실행해 템플릿↔SSOT 정합을 보증한다.

따라서 새 양식 적용은 "코드 여기저기 좌표 고치기"가 아니라 **SSOT 갱신 → 재생성 →
검증 → 서식 로직 보강**의 정형 절차다. 본 문서는 그 절차와, 실물(한컴 육안)로만
드러나는 서식 함정들의 원리를 기록한다.

---

## 2. 파이프라인 흐름

```text
정본 양식.hwpx  ──(빌드)──▶  templates/hwpx/{roadmap,pbl}.hwpx  ──(런타임)──▶  최종 HWPX
   │                              │                                    │
docs/references/           scripts/insert_placeholders.py         api/hwpx/generate.py
1.AI훈련로드맵…(양식).hwpx   (SSOT hwpx-placeholders.json 읽어         (좌표 無, {{마커}}만
2.문제해결형(PBL)…(양식).hwpx  셀에 {{마커}} 삽입 + 후처리 서식)          payload 값으로 치환)
```

| 단계      | 파일                                                                                                 | 좌표 인지          | 역할                                                  |
| --------- | ---------------------------------------------------------------------------------------------------- | ------------------ | ----------------------------------------------------- |
| 정본 원본 | `docs/references/1.AI훈련로드맵 보고서(양식).hwpx`, `docs/references/2.문제해결형(PBL) …(양식).hwpx` | —                  | 산인공 개정 양식 원문                                 |
| SSOT      | `docs/references/hwpx-placeholders.json`                                                             | ✅ 유일            | 마커명·셀 좌표·strategy 정본                          |
| 빌드      | `scripts/insert_placeholders.py`                                                                     | ✅ (SSOT에서 읽음) | 정본에 마커 삽입 + 서식 후처리 → 템플릿 생성          |
| 템플릿    | `templates/hwpx/roadmap.hwpx`, `templates/hwpx/pbl.hwpx`                                             | 마커 보유          | **수동 편집 금지 — 항상 재생성**                      |
| 런타임    | `api/hwpx/generate.py`                                                                               | ❌                 | payload → `{{마커}}` 치환, 색상 정규화, 체크박스 토글 |

**재생성 명령** (HWPX 전용 venv `.venv-hwpx` 는 `npm run dev:hwpx:setup` 로 최초 1회 생성):

```bash
.venv-hwpx/bin/python3 scripts/insert_placeholders.py roadmap   # → templates/hwpx/roadmap.hwpx
.venv-hwpx/bin/python3 scripts/insert_placeholders.py pbl       # → templates/hwpx/pbl.hwpx
.venv-hwpx/bin/python3 scripts/insert_placeholders.py --check roadmap  # 저장 없이 검증만
```

**검증 스크립트 2종** (새 양식 적용 시 반드시 통과 — CI `HWPX Verify` job이 pytest와 함께 PR마다 자동 실행):

```bash
.venv-hwpx/bin/python3 scripts/verify_hwpx_placeholders.py     # 템플릿↔SSOT 마커 정합
node scripts/verify-mapping-completeness.mjs                    # 매핑 완전성(payload↔마커)
```

> **shallow 인덱싱 주의:** SSOT의 `table_index` 는 `generate.py::_collect_tables()` /
> `insert_placeholders.py::collect_tables()` 와 동일한 **shallow traversal**(top-level
> paragraph의 표만, 중첩 표 제외) 기준이다. python-hwpx `doc.get_table_map()` 의
> table_index 는 nested 표 포함이라 값이 다르다. **SSOT 인덱스가 정본**이다.

---

## 3. python-hwpx 한계·안전 규칙

python-hwpx로 양식을 편집할 때 **구조 편집과 속성 편집을 엄격히 구분**한다.

| 편집 종류                                                    | 안전성      | 근거                                                                                                                                     |
| ------------------------------------------------------------ | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| **구조 편집** (XML 노드 추가·삭제·병합, 행/열 복제, 표 생성) | ❌ **금지** | 한컴오피스가 파일을 거부(`알 수 없는 오류`). SSOT `repeat_rows` 도 표를 복제하지 않고 **미리 있는 행에 마커만** 심는다(초과분 truncate). |
| **속성 편집** (기존 노드의 attribute 값만 변경)              | ✅ 안전     | 노드 개수 불변. 아래 3종이 실사용됨.                                                                                                     |

**안전한 속성 편집 3종:**

1. **문단 정렬 paraPr** — `paragraph.para_pr_id_ref` **setter가 persist**된다.
   `left_align_spec_details` / `center_signature_columns` 가 이 방식.
2. **셀 lineWrap** — 셀 `subList` 요소의 `lineWrap` 속성. python-hwpx에 공식 setter가
   없어 OWPML element를 직접 `.set("lineWrap", "BREAK")`. `_set_cell_text` Step 5.
3. **charPr 색상** — python-hwpx **API로는 불가**(아래 함정). 저장된 ZIP 안
   `header.xml` 의 charPr `textColor` 속성을 직접 치환. `_normalize_colors`.

**⚠️ charPr 색상 함정 (반드시 기억):**

- `RunStyle` 은 **읽기 전용** — 색 setter가 없다.
- `ensure_char_property` / `_char_properties_element` 는 **기존 charPr에 반영되지
  않는다**(새 정의를 만들 뿐, 이미 렌더되는 run의 charPrIDRef를 바꾸지 못함).
- → 유일한 방법은 `doc.save_to_path()` 로 저장한 뒤 **ZIP의 `header.xml` 을 lxml로
  열어 charPr `textColor` 속성만 치환**하는 것(`_normalize_colors`). 노드 추가·삭제가
  없으므로 `_set_cell_text` 의 `cell.element.set` 과 동일한 안전 범주다.

### 3-1. 🔑 대원칙 — **고칠 때는 기존에 반영된 것을 반드시 그대로 유지한다**

이 파이프라인의 서식은 **과거 한컴 육안 검증으로 하나씩 쌓아 올린 자산**이다(§11 로그).
새 기능을 넣으면서 그 축적을 무심코 되돌리면, 단위 테스트는 통과하는데 실물만 깨진다.
**가장 흔한 회귀 경로이므로 기능 추가 전후로 아래를 반드시 지킨다.**

**① 복제는 반드시 "기존 노드 deepcopy"로** — 새 XML을 지어내지 말 것.
`unmerge_rowspan2_col`(셀)·`_expand_activity_rows`(행) 둘 다 **한컴이 만든 형제 노드를
통째로 deepcopy** 하므로 `borderFill`·`charPr`·`paraPr`·`cellSz`·병합·lineWrap 이
자동으로 승계된다. 직접 조립하면 이 중 하나는 반드시 빠진다.

> 실제 사고: 첫 시도(`1f290f3`)가 **헤더 행을 형제로 잘못 복제**해 삽입 셀이 회색
> 음영으로 나옴 → `8a7729f` 후속 수정 필요. 복제 대상은 "**앵커 아래의 내용 셀**"이어야 한다.

**② 검증은 "원본 vs 신규" 대조로** — 신규만 보면 판단할 수 없다.
확장·복제한 행과 **원래 있던 행의 구조를 나란히 찍어 비교**한다. 문단수·lineWrap·
charPr·borderFill 이 **같으면 코드는 정상**, 다르면 복제 로직 결함이다.

```python
for label, r in (('원본', 1), ('확장', 7)):
    cell = tbl.cell(r, 1)
    paras = [''.join(run.text or '' for run in p.runs) for p in cell.paragraphs]
    sub = cell.element.find(f'{_HP_NS}subList')
    print(label, len(paras), sub.get('lineWrap'), paras)   # 두 줄이 같아야 정상
```

**③ 샘플 데이터는 운영 payload 형식을 그대로 쓸 것** — 임의 값은 오진을 부른다.
날짜·수행방법은 양식 셀 폭에 맞춘 **2줄 문자열**이 정상이다
(`26.04.10\n14:00~17:00`, `대면\n(인터뷰)` — `formatActivityDate` + 괄호 앞 줄바꿈).
이를 한 줄(`26.04.10 14:00~17:00`)로 넣으면 셀 폭을 넘겨 **서식이 깨진 것처럼 보이지만
코드는 멀쩡**하다. fixture(`api/hwpx/__fixtures__/*.json`)의 실제 값을 기준으로 삼는다.

> 실제 사고: 차수 확장 샘플을 한 줄 날짜로 만들어 "확장 때문에 깨졌나?" 오진 →
> ②의 원본 대조로 **원본 행도 동일하게 깨져 있음**을 확인하고 데이터 문제로 판별.

---

## 4. 셀 서식 원리표

| 서식 축                     | 결정 주체(시점)                        | 규칙                                                                                                           | 관련 코드                                                                        |
| --------------------------- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| **lineWrap**                | `generate.py` (런타임)                 | 셀 폭 대비 텍스트 폭 **자동** 판정. 들어가면 양식 원본(대개 SQUEEZE) 유지, overflow일 때만 BREAK.              | `_approx_text_width`, `_set_cell_text` (Step 5)                                  |
| **문단 정렬 paraPr**        | `insert_placeholders.py` 후처리 (빌드) | `para_pr_id_ref` 재지정. 여백·간격 동일, 정렬만 다른 id 선택.                                                  | `left_align_spec_*`, `center_signature_columns`                                  |
| **charPr 색상**             | `generate.py` ZIP 후처리 (런타임)      | 파랑 3종→검정 정규화. 표지 기업명 charPr만 파랑 유지.                                                          | `_normalize_colors`, `_BLUE_TEXT_COLORS`, `_ROADMAP_KEEP_BLUE`, `_PBL_KEEP_BLUE` |
| **폰트 크기 charPr height** | 양식 원본 charPr 보존                  | `_set_cell_text` 가 첫 문단 `charPrIDRef` 를 복제해 줄별 폰트 통일. 2폰트 셀은 in-place 토글로 원 charPr 유지. | `_set_cell_text` (Step 3), `_replace_many_in_all_runs`                           |

### 4-1. lineWrap — SQUEEZE vs BREAK (폭 기반 자동)

양식은 셀마다 lineWrap을 다르게 설계한다. **무조건 BREAK로 덮으면** `14:00~17:00`
같은 짧은 값이 셀 폭을 넘겨 마지막 글자가 다음 줄로 깨진다. 그래서 `_set_cell_text`
는 **넘칠 때만** BREAK로 전환하고, 들어가면 양식 원본 lineWrap을 그대로 둔다.

| 값 유형        | 예                                                               | lineWrap                     | 이유                                                  |
| -------------- | ---------------------------------------------------------------- | ---------------------------- | ----------------------------------------------------- |
| 짧은 고정 셀   | 수행일시 `26.03.14`, 방법 `대면`, 차수 `1차`, 시간 `14:00~17:00` | **SQUEEZE** (양식 원본 유지) | 폭에 들어감. BREAK 강제 시 끝 글자가 줄바꿈으로 깨짐. |
| 긴 자유서술 셀 | 수립 배경, 기업 요구분석, 세부내용                               | **BREAK** (overflow 시 전환) | 셀 폭 초과 → 단어 단위 자연 wrap, 글자 겹침 방지.     |

**폭 판정** — `_approx_text_width`: CJK/전각 ≈ **1000**, ASCII ≈ **550**, 공백/탭 ≈ **400**.
overflow 조건: 셀 폭(`cellSz.width`) 알면 `최대 줄 폭 > 셀 폭 × 1.25`(SQUEEZE 압축
여유 25% 포함), 셀 폭 모르면 `최대 줄 길이 > 22자`. overflow일 때만 BREAK로 set하고,
SQUEEZE로 되돌리는 로직은 없다(양식 원본 존중).

### 4-2. paraPr 정렬 id — 양식마다 재부여될 수 있음

로드맵/PBL `header.xml` 기준 대표값: **11 = LEFT(무글머리)**, **21 = CENTER**(로드맵),
**0~10 = JUSTIFY**. 단, CENTER는 셀마다 다른 id로도 존재한다(예: 로드맵 Ⅰ-3 요약 셀은
para65 CENTER, PBL 교과목 프로파일 훈련목표는 para111 LEFT).

> **원칙:** paraPr id 는 정본을 다시 export하면 **재부여될 수 있다**. `21` 같은 값을
> 하드코딩하지 말고, ① LEFT는 안정적인 `11` 사용, ② CENTER는
> `center_signature_columns` 처럼 **올바르게 정렬된 이웃 셀(헤더행)의 paraPr를 추종**
> 하는 방식을 우선한다. 새 양식에서 `11`/헤더 정렬이 바뀌면 그때만 조정.

### 4-3. charPr 색상 — 파랑→검정, 기업명만 예외

- 정규화 대상 파랑: `_BLUE_TEXT_COLORS = {#0000FF, #2E74B5, #3057B9}` → `#000000`.
- **예외(파랑 유지):** 표지 제목 기업명 charPr.
  - 로드맵: charPr **id 106**(SSOT 표기 cp106) — 부제 `(기업명 – 대상 과업)`. `_ROADMAP_KEEP_BLUE = {"106"}`.
  - PBL: charPr **id 151**(cp151) — 표지 `㈜기업명`. `_PBL_KEEP_BLUE = {"151"}`.
- **보존(무변경):** 흰색 `#FFFFFF`(헤더 배경 글자)·빨강·회색 form 스타일.
- 새 양식에서는 기업명 charPr id 와 파랑 색상값이 달라질 수 있다 → §9 체크리스트로 재확인.

### 4-4. 폰트 크기 — 2폰트 셀 보존

charPr `height` 는 1/100pt 단위. **2폰트 셀**(예: AI역량수준 체크박스 — 레벨명
`□ 초급`(cp8) vs 유형명 `(AI기초형)`(cp9)가 서로 다른 charPr)은 값을 통째로 덮으면
폰트가 붕괴된다. → 마커 치환 대신 **in-place 토글**(`_replace_many_in_all_runs`)로
`□`↔`☑` 글자만 바꿔 원 charPr을 유지한다.

---

## 5. 비파괴 치환 패턴

멀티런·멀티문단으로 짜인 셀(표지 제목, 2폰트 체크박스)은 **run.text만 부분 치환**해
문단·폰트·색 구조를 보존해야 한다.

| 함수                                    | 방식                                                                                       | 용도                                                                                                                                                   |
| --------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `_replace_many_in_all_runs(doc, pairs)` | 본문+표 셀(중첩 포함) 전체를 **1회 순회**하며 각 run.text에 `pairs` 순서대로 `str.replace` | 표지 제목 2줄, AI역량 레벨 체크박스(2폰트), PBL 표지 제목·훈련목표/평가방법 체크박스. **리셋→토글 순서**로 pairs를 쌓아 한 run에서 순차 적용돼도 정확. |
| `_replace_in_all_runs(doc, old, new)`   | 단일 (old,new)를 전체 run에 치환                                                           | 단건 문자열 치환.                                                                                                                                      |
| `_apply_markers(doc, markers)`          | 표 셀은 `_set_cell_text`(줄→문단 분배·lineWrap), 본문은 run.text 치환                      | `{{마커}}` 일괄 치환. 잔존 마커는 빈 문자열로 제거.                                                                                                    |

**지양할 파괴적 방식:** 셀의 모든 run을 비우고 첫 run에 텍스트를 몰아넣으면 문단
구조·2폰트·자동 서식이 붕괴된다. `_set_cell_text` 는 이를 피해 **첫 문단의
`paraPrIDRef`·`styleIDRef`·`charPrIDRef` 를 복제**해 부족한 문단을 추가하고 줄별로
1:1 분배한다(잉여 문단은 트림). 빌드 타임 `set_cell`(마커 삽입용)은 빈 셀에 마커만
심는 용도라 예외적으로 첫 run 몰기를 쓴다.

**SSOT strategy 조합:** 마커로 표현하기 어려운 셀(표지 제목·체크박스)은 SSOT에서
`strategy:"static"` 으로 두어 마커를 심지 않고, `generate.py` 가 위 비파괴 치환으로
직접 처리한다. 값 채우기 셀은 `cell_fill`(좌표:마커 매핑)로 마커를 심는다.

---

## 6. 글머리·날짜·온점 규칙

### 6-1. 글머리 — 리터럴 `▪ ` vs 양식 자동 BULLET (택일)

한 셀에서 두 방식을 섞으면 글머리가 이중으로 찍힌다. 셀마다 **하나만** 쓴다.

| 방식                               | 대상 마커                                                                                                                | 처리                                                                                                                     |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| 리터럴 `▪ ` + LEFT 무글머리 paraPr | 로드맵 명세서 세부내용 `{{roadmap_course_i_subject_j_details}}`, PBL 교과목 훈련내용 세부 `{{pbl_ops_content_i_detail}}` | `generate.py` 가 줄마다 `▪ ` 부착 + `left_align_spec_details` 가 LEFT **무글머리** paraPr로(양식 자동 글머리 중복 방지). |
| 양식 자동 글머리(BULLET paraPr)    | PBL 훈련강사 세부훈련내용 `{{pbl_ops_instructor_i_detailed_training_content}}`                                           | 값에 리터럴 미부착, 양식 BULLET paraPr에 위임.                                                                           |

### 6-2. 날짜 서식 — 표지 vs 활동 일시

`src/lib/services/export/hwpx/hwpx-date.ts` 의 두 포맷터. 둘 다 로케일·타임존 비의존
(저장값의 UTC 성분을 문자열 조립 — 운영 서버 UTC 출력과 동일, 자정 경계 하루 밀림 방지).

| 포맷터               | 출력                            | 대상                                  | 이유                                                                        |
| -------------------- | ------------------------------- | ------------------------------------- | --------------------------------------------------------------------------- |
| `formatReportDate`   | `YYYY. MM. DD.`                 | 표지 보고서 일자                      | 넓은 셀, 4자리 연도.                                                        |
| `formatActivityDate` | `YY.MM.DD` (2자리 연도, 컴팩트) | Ⅰ-2 주요활동·Ⅱ-1-나·Ⅲ-1 **수행 일시** | 셀 폭이 좁아 `YYYY. MM. DD.` 를 넣으면 wrap이 깨짐. 파싱 불가 시 원본 반환. |

### 6-3. 서술형 온점 — `_ensure_sentence_period` (v2 라운드 신설)

서술형(`~이다/하다/한다/있다`) 문장 끝 온점(.)이 LLM·인터뷰 입력에 따라 들쭉날쭉해,
샘플/production 유일 합류점인 `generate.py` 에서 **결정론적으로 보정**한다.

- `_ensure_sentence_period(text)`: **줄 단위**로 `rstrip` 후 종결어미 **'다'로 끝나는
  줄**에 `.` 부가. 이미 종결부호(`. ! ? … 。`)로 끝나면 무변경.
- **자기조정형(화이트리스트 불필요):** 명사형·개조식(`강의`/`실습`/`확보`/`필요`/`~됨`
  /`~함`)은 '다'로 끝나지 않아 자동으로 온점이 붙지 않는다. 체크박스(☑/□)·날짜·라벨도
  '다' 미종결이라 안전.
- 적용: 공통 헬퍼 `_apply_sentence_periods(m)` 로 `_build_roadmap_markers` /
  `_build_pbl_markers` **반환 직전** 마커 값 전체에 일괄 적용 → fixture와 production을
  단일 지점에서 커버. **프롬프트·fixture의 온점은 건드리지 않는다**(이중 관리·LLM
  비결정성 회피).

---

## 7. 정렬 결정표

| 위치                               | 대표 마커                                | 정렬                     | 담당                                        |
| ---------------------------------- | ---------------------------------------- | ------------------------ | ------------------------------------------- |
| 로드맵 명세서 **훈련목표**         | `{{roadmap_course_i_training_goal}}`     | LEFT (para11)            | `left_align_spec_goal_content` (v2 신설)    |
| 로드맵 명세서 **주요 훈련내용**    | `{{roadmap_course_i_main_content}}`      | LEFT (para11)            | `left_align_spec_goal_content` (v2 신설)    |
| 로드맵 명세서 **세부내용**         | `{{roadmap_course_i_subject_j_details}}` | LEFT (para11)            | `left_align_spec_details`                   |
| 로드맵 **Ⅰ-3 수립 주요 결과 요약** | `{{roadmap_outcome_main_content}}`       | **CENTER 유지**          | 좌측화 대상 아님 — `_course_` 스코프로 제외 |
| 표지 **서명표 소속/성명**          | 서명표 값 셀([1,1]·[1,2]·[2,1]·[2,2])    | CENTER                   | `center_signature_columns`                  |
| PBL **교과목 프로파일 훈련목표**   | `{{pbl_ops_subject_training_goals}}`     | LEFT (양식 기본 para111) | 후처리 불필요                               |
| PBL **교과목 훈련내용 세부**       | `{{pbl_ops_content_i_detail}}`           | LEFT (para11)            | `left_align_spec_details`                   |

> **⚠️ 좌측화 스코프 주의(핵심 회귀 위험):** `left_align_spec_goal_content` 는
> 셀 텍스트에 `_course_` **AND** (`_training_goal}}` **OR** `_main_content}}`) 가
> 있을 때만 LEFT로 바꾼다. `_course_` 접두 가드가 없으면 **Ⅰ-3 요약**
> (`roadmap_outcome_main_content` — `_course_` 없음)과 **PBL** `{{pbl_roadmap_main_content}}`
> 가 잘못 좌측화된다. 전용 회귀 테스트로 방어할 것.

---

## 8. insert_placeholders.py 후처리 헬퍼 목록

빌드 타임(`insert_placeholders.py`)의 서식 후처리. 대부분 속성(paraPr·fwSpace)
편집이나, `unmerge_rowspan2_col` 은 예외적으로 **구조 편집**(셀 병합 해제)이다 —
단 기존 형제 셀을 deepcopy 해 복제하므로 OWPML 유효(한컴 열림 확인).

| 헬퍼                                                             | 역할                                                                                                                                                                                                                                                                                                 |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `consolidate_checkbox_fwspace(doc)`                              | 체크박스 라벨 run의 `<hp:fwSpace/>` 제거 → 텍스트 단일 노드 통합. 런타임 `□ X`→`☑ X` 치환 시 fwSpace tail이 남아 라벨이 중복 렌더되는 것을 원천 차단(□/☑/☐ 포함 `<hp:t>` 만 대상).                                                                                                                   |
| `center_signature_columns(doc, table_index=2, columns=(1,2))`    | 표지 서명표 소속/성명 열 값 셀을 **헤더행(0)의 paraPr**(=CENTER)로 재지정(하드코딩 id 대신 헤더 추종).                                                                                                                                                                                               |
| `left_align_spec_details(doc, left_pid="11")`                    | 세부내용 셀(`_subject_…_details}}`, `_content_…_detail}}`)을 LEFT 무글머리 paraPr로. 글머리 `▪` 는 값에 부여되므로 양식 자동 글머리를 안 씀.                                                                                                                                                         |
| `left_align_spec_goal_content(doc, left_pid="11")` **(v2 신설)** | 명세서 훈련목표/주요내용(`_course_` AND `_training_goal}}`/`_main_content}}`)을 LEFT로. `_course_` 스코프로 Ⅰ-3 요약·PBL 요약 제외(§7 경고).                                                                                                                                                         |
| `unmerge_rowspan2_col(tbl, col)` **(v2 신설)**                   | 과업 표 직무 열의 rowSpan=2 세로 병합 해제 — 앵커 rowSpan 2→1 + 형제 셀 deepcopy(빈 텍스트, rowAddr+1, 문단 id 유일화) 삽입. `insert_entry` 의 `repeat_rows` 처리에서 SSOT `unmerge_rowspan2:true` col 에 대해 **채움 루프 직전** 호출. 이후 skip 없이 매 행 직무 채움 → 직무별 과업 개수 무관 정확. |

**후처리 위치**: `consolidate_checkbox_fwspace`·`center_signature_columns`·
`left_align_spec_details`·`left_align_spec_goal_content` 는 `main()` 삽입 루프
**이후** 순서대로 호출(→ `doc.save`). `unmerge_rowspan2_col` 은 삽입 루프 **안**
(repeat_rows 채움 직전, python-hwpx 가 새 셀을 즉시 인식하므로 곧바로 마커 채움).

### 런타임(생성 시점) 구조 헬퍼 — `api/hwpx/generate.py`

| 헬퍼                                                                                                                 | 역할                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `_expand_activity_rows(doc, table_index, rows_per_item, base_items, needed, marker_prefix, max_items)` **(v2 신설)** | 수행활동 표의 **차수 행 동적 확장**. 양식은 3차분만 보유하며 입력이 이를 넘을 때만 **마지막 차수 블록(`rows_per_item` 개 `<hp:tr>`)을 deepcopy** 해 append. 복제본은 마커 인덱스만 `{prefix}2_`→`{prefix}{i}_` 치환하고 차수 라벨(col 0, 마커 없음)은 텍스트 기입 → 이어지는 `_apply_markers` 가 기존 경로대로 값을 채운다. `rowAddr` 재부여·문단 `id` 유일화·`rowCnt`·`sz.height` 갱신 포함. **`needed ≤ base_items` 면 즉시 return(구조 편집 0회)** 이라 대부분의 문서는 양식 원형 그대로. |

**적용 대상 3표**: 로드맵 Ⅰ-2(T6, 2행/차수) · PBL Ⅱ-1-나(T9, 2행/차수) · PBL Ⅲ-1(T19, **4행/차수**).
**호출 위치**: `_generate_roadmap`/`_generate_pbl` 의 `_apply_markers` **직전**(마커 치환 전이어야 복제본 마커가 값으로 치환됨).
**SSOT 는 3차 원형 유지** — 템플릿에는 3차분 마커만 존재하므로 `verify_hwpx_placeholders.py` 는 그대로 통과한다(상한 상수 `_RM_MAX_ACTIVITIES`/`_PBL_MAX_*_ACTS` = 15 는 마커 dict 크기일 뿐, 행 없는 인덱스의 마커는 문서에 없어 무해).

---

## 9. 새 양식 적용 체크리스트

새 산인공 정본이 오면 아래 순서를 그대로 따른다(단계마다 검증 통과 확인).

1. **양식 배치·구조 분석** — 정본 `.hwpx` 를 `docs/references/` 에 배치(파일명은
   `TRACKS` 딕셔너리 경로와 일치시킬 것). 구조를 재분석해
   `docs/references/hwpx-structure-{roadmap,pbl}.md` 의 표 인벤토리·셀 좌표를 갱신.
   1-1. **⚠️ 표 배치 속성 신구 대조 (필수 — 텍스트·좌표 diff 에 안 잡힌다)**
   개정이 표 내용·좌표는 그대로 두고 **배치 속성만** 바꾸는 경우가 있다(§11-14:
   로드맵 ver3 — 표 12개의 `treatAsChar` 1→0, `pageBreak` CELL→TABLE). 마커 좌표·
   병합 구조·charPr id 대조를 전부 통과해도 속성 변경은 보이지 않으므로, 신·구
   정본의 `<hp:tbl>`·`<hp:pos>` 속성을 표 순서대로 전수 대조한다. **무엇이 바뀌었는지
   알아야** 표적 육안 검증(예: `pageBreak=TABLE` 전환 시 장문 셀 페이지 경계)이 가능하다.

   ```bash
   # 신·구 정본에 각각 실행해 출력을 diff (pageBreak/repeatHeader/treatAsChar/flowWithText)
   .venv-hwpx/bin/python3 - "docs/references/<정본>.hwpx" <<'EOF'
   import sys, zipfile
   from lxml import etree
   HP = "{http://www.hancom.co.kr/hwpml/2011/paragraph}"
   root = etree.fromstring(zipfile.ZipFile(sys.argv[1]).read("Contents/section0.xml"))
   for i, t in enumerate(root.iter(f"{HP}tbl")):
       pos = t.find(f"{HP}pos")
       print(i, t.get("pageBreak"), t.get("repeatHeader"),
             pos.get("treatAsChar"), pos.get("flowWithText"))
   EOF
   ```

2. **SSOT 갱신** — `hwpx-placeholders.json` 의 마커명·좌표(**shallow** `table_index`
   — §2 주의)·`strategy` 를 새 구조에 맞춰 수정. 신규 셀은 `cell_fill`/`repeat_rows`
   등 taxonomy에 따라 추가, 마커 없는 셀은 `static`.
3. **템플릿 재생성** — `insert_placeholders.py roadmap|pbl` 실행.
   **`templates/hwpx/*.hwpx` 수동 편집 절대 금지 — 항상 스크립트로 재생성.** 이때
   서식 예외를 재확인: paraPr **LEFT=11** 유효 여부, `keep_blue` charPr **id**
   (`_ROADMAP_KEEP_BLUE`/`_PBL_KEEP_BLUE`), 파랑 색상값(`_BLUE_TEXT_COLORS`),
   `center_signature_columns` 의 `table_index`.
   3-1. **⚠️ charPr id 밀림 확인 (신규 필수 — 놓치면 색·기울임이 조용히 깨진다)**
   양식을 개정하면 `header.xml` 의 charPr **id 가 통째로 밀린다**. 하드코딩된
   `_PBL_KEEP_BLUE`·`_ROADMAP_KEEP_BLUE`·`strip_italic_ids` 가 **다른 charPr 을 가리키게 되어**
   표지 기업명 파랑이 사라지거나 기울임이 남는다. **신·구 정본의 id 집합을 대조**해 갱신할 것.

   > 실사례(PBL ver3): id **118 이상이 전부 −1 이동** → 표지 기업명 파랑 `151`→`150`.
   > `strip_italic_ids={"106"}` 은 117 이하라 그대로였다.

   ```bash
   # 파랑 charPr id 신구 대조 (italic 은 '#0000FF' 대신 '<hh:italic' 로 바꿔 실행)
   for f in "docs/references/<신규정본>.hwpx" "docs/references/archive/<구정본>.hwpx"; do
     unzip -p "$f" '*header.xml' \
       | grep -o '<hh:charPr[^>]*id="[0-9]*"[^>]*textColor="#0000FF"' \
       | grep -o 'id="[0-9]*"' | tr '\n' ' '; echo "  <- $f"
   done
   ```

4. **verify 2종 통과** — `verify_hwpx_placeholders.py --all`(**`--all` 필수 — 기본값은
   roadmap 만 검사해 PBL 이 조용히 누락된다**) + `verify-mapping-completeness.mjs`(payload↔마커 완전성).
   ⚠️ verify 는 "마커가 삽입됐는가"만 본다. **엉뚱한 셀에 들어가도 통과**하므로,
   좌표를 고쳤다면 §3-1 ②대로 **재생성된 템플릿에서 마커의 실제 (row,col) 을 덤프해 대조**할 것.
5. **generate.py 갱신 + pytest** — `_build_roadmap_markers`/`_build_pbl_markers` 에
   신규 마커 배선, 서식 로직(lineWrap·색상·체크박스·온점) 점검. 신규 값은 payload
   배선(`src/lib/services/export/hwpx/hwpx-payload-*.ts`)까지 연결. `api/hwpx/` pytest 전건.
6. **샘플 생성·육안** — fixture(`api/hwpx/__fixtures__/*.json`) 갱신 → 브리지 서버
   (`npm run dev:hwpx` + `npm run dev:with-hwpx`)로 로드맵·PBL 샘플 생성 → §10 한컴
   육안. **마커 잔존 0** 확인(`unzip -p *.hwpx | grep '{{'` 결과 없음).
   서버 없이 쓰는 간편 대안 — `_generate_roadmap`/`_generate_pbl` 을 fixture 로 직접 호출:

   ```bash
   .venv-hwpx/bin/python3 - <<'EOF'
   import json, os, sys
   sys.path.insert(0, "api/hwpx"); os.chdir("api/hwpx")
   from generate import _generate_roadmap  # PBL 은 _generate_pbl + pbl fixture
   data = json.load(open("__fixtures__/roadmap-full.json", encoding="utf-8"))
   out = os.path.expanduser("~/Desktop/roadmap-sample.hwpx")
   open(out, "wb").write(_generate_roadmap(data))
   print(out)
   EOF
   ```

   장문 셀 페이지 경계·overflow 검증에는 `roadmap-max-length.json` fixture 를 쓴다.

---

## 10. 육안 검증 체크리스트

한컴오피스에서 실물을 열어 항목별로 확인(자동 테스트로 안 잡히는 결함).

- [ ] **정렬** — 명세서 훈련목표/주요내용/세부내용 LEFT, Ⅰ-3 요약 CENTER, 서명표 소속/성명 CENTER.
- [ ] **폰트** — 2폰트 셀(체크박스 레벨명+유형명) 폰트 유지, 셀 내 줄별 폰트 통일.
- [ ] **색상** — 본문 파랑 글씨 없음(검정), 표지 기업명만 파랑 유지, 헤더 흰 글자 보존.
- [ ] **lineWrap 줄바꿈** — 짧은 셀(일시·방법·차수·시간) 한 줄, 긴 셀 단어 단위 자연 wrap, 글자 겹침 없음.
- [ ] **글머리** — 세부내용 `▪` 이중 글머리 없음.
- [ ] **온점** — 서술형 문장 끝 온점, 명사형·개조식엔 없음, 이중 온점 없음.
- [ ] **날짜 서식** — 표지 `YYYY. MM. DD.`, 수행 일시 `YY.MM.DD`.
- [ ] **빈칸** — 값이 있어야 할 셀이 빈칸이 아님(마커 누락·payload 미배선 점검).
- [ ] **기존 서식 유지(§3-1)** — 이번 변경이 **과거 검증분을 되돌리지 않았는지**. 행·셀을
      복제·확장했다면 **원본 행과 신규 행을 대조**해 문단수·lineWrap·음영·병합이 동일한지 확인.
- [ ] **샘플 데이터 형식(§3-1 ③)** — 검증 샘플의 날짜·수행방법이 운영과 같은 **2줄 문자열**인지
      (한 줄이면 서식이 깨져 보여 오진). fixture 값 기준으로 생성.

---

## 11. 시행착오 로그(요약)

이번 v2 세션에서 **실물(한컴 육안)로만** 드러난 서식 결함들. 새 양식에서도 같은
계열의 함정이 재현되므로 원인·해결을 각 한 줄로 남긴다.

| #   | 결함(증상)                               | 근본원인                                                                                                                                                                       | 해결                                                                                                                                                                                |
| --- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 표지 제목 2줄 붕괴                       | 2문단 제목 셀에 마커 삽입 시 문단·색 구조 붕괴                                                                                                                                 | SSOT `static` + `_replace_many_in_all_runs` in-place 치환(비파괴)                                                                                                                   |
| 2   | 본문 파란 글씨                           | 양식 charPr가 파랑으로 세팅                                                                                                                                                    | `_normalize_colors` 파랑→검정, 기업명 charPr(cp106/cp151)만 예외                                                                                                                    |
| 3   | 활동 일시 날짜 wrap 깨짐                 | 좁은 셀에 `YYYY. MM. DD.` 4자리 넣어 폭 초과                                                                                                                                   | `formatActivityDate` `YY.MM.DD` 컴팩트                                                                                                                                              |
| 4   | 짧은 셀 줄바꿈 깨짐                      | lineWrap을 무조건 BREAK로 강제                                                                                                                                                 | `_set_cell_text` 폭 기반 자동 — overflow일 때만 BREAK, 들어가면 SQUEEZE 유지                                                                                                        |
| 5   | 서술형 온점 들쭉날쭉                     | 온점 강제 로직 전무                                                                                                                                                            | `_ensure_sentence_period`(신설) 줄 단위 '다'-종결 온점                                                                                                                              |
| 6   | 명세서 목표/주요내용 CENTER              | 양식 원본 para21(CENTER) 상속, 좌측화 함수 부재                                                                                                                                | `left_align_spec_goal_content`(신설) LEFT 재지정(`_course_` 스코프)                                                                                                                 |
| 7   | PBL Ⅱ-1-나 요약 셀 빈칸                  | `{{pbl_roadmap_main_content}}` 마커 자체가 미존재 + payload 미배선                                                                                                             | SSOT 마커 신설 + `_build_pbl_markers` 배선 + TS payload 연계                                                                                                                        |
| 8   | 과업 표 직무 라벨 어긋남/소실            | 직무 열 '첫 직무 2행 고정 병합' → 직무별 과업 수 다르면 라벨 흡수·소실                                                                                                         | `unmerge_rowspan2_col`(신설) 병합 해제 + SSOT skip 제거 + generate skip 비움                                                                                                        |
| 9   | PBL 사내강사 예/아니오 미체크            | 데이터(usage/used)는 있으나 `_generate_pbl` 이 토글 미소비                                                                                                                     | `_generate_pbl` 에 `□ 예`→`☑ 예`/`☑ 아니오` 리셋+토글 추가                                                                                                                          |
| 10  | PBL 성과 '정량' 행 기울임                | 양식 charPr 106 에 `<hh:italic/>` 박힘(유일 사용)                                                                                                                              | `_normalize_colors(strip_italic_ids={"106"})` 로 PBL 경로만 italic 제거                                                                                                             |
| 11  | 수행활동 4차 이상 미출력                 | 양식이 3차 고정(마커·행 3차분) — 화면은 5차까지 입력 가능해 초과분 소실                                                                                                        | `_expand_activity_rows`(신설) 생성 시 초과 차수만 블록 deepcopy 확장. 대안(정본 15행 고정)은 3차만 쓰는 보통 문서에 빈 행이 12차분 남아 폐기                                        |
| 12  | PBL ver3 교체 시 값이 라벨 칸으로 밀림   | T35 열 병합 폭 조정(값 셀 `c6`→`c7`, 활용데이터만 `c7`→`c6`) — 표 크기·텍스트는 그대로라 눈에 안 띔                                                                            | 병합 구조(`colAddr`/`colSpan`) **전수 대조**로 탐지 → SSOT P-23·P-24 좌표 4곳 수정. 텍스트 대조만으로는 **빈 값 셀끼리 차이가 안 드러나** 놓친다                                    |
| 13  | PBL ver3 표지 기업명 파랑 소실           | 양식 개정으로 charPr **id 118 이상이 −1 이동** → `_PBL_KEEP_BLUE={"151"}` 가 검정 charPr 을 가리킴                                                                             | `{"150"}` 으로 갱신 + §9-3-1 에 신구 id 대조 절차 명문화. `strip_italic_ids={"106"}` 은 117 이하라 무영향                                                                           |
| 14  | 로드맵 ver3 교체 — 변경점 육안 식별 불가 | 개정이 표 12개 배치 속성만 변경(`treatAsChar` 1→0, `pageBreak` CELL→TABLE) — 텍스트·셀 좌표·병합·charPr id 전부 불변. 한/글 12 저장본이라 manifest fallback 경고 발생하나 무해 | 표 속성(`tbl`·`pos`) **전수 대조**로 변경 국한 확인 → SSOT·코드 무변경, 정본 교체+재생성만으로 적용. `pageBreak=TABLE` 전환분은 장문 셀 페이지 경계를 max-length 샘플 육안으로 확인 |

---

## 12. 작성 가이드 콘텐츠 제약

양식 각 섹션 '작성 안내/가이드'가 요구하는 콘텐츠 제약. fixture·LLM 프롬프트가 이를
준수해야 한다(런타임 서식이 아니라 **콘텐츠 품질** 규칙 — 위반 시 육안으로만 드러남).

| 항목                   | 제약                             | 대응 필드/마커                                   | 강제 위치                                     |
| ---------------------- | -------------------------------- | ------------------------------------------------ | --------------------------------------------- |
| 로드맵 수립 배경       | 5줄 내외로 간단히                | `establishment_necessity`(인터뷰 복사)           | 입력 폼(사람)                                 |
| 로드맵 Ⅰ-3 요약        | 1장 이내 요약                    | `roadmap_summary`(=outcome_summary.main_content) | `roadmap-prompts.ts`(1문단 요약)              |
| 로드맵 훈련과정 명세서 | 최소 3개 과정                    | `course_specs[]`(0~5)                            | 로드맵 결과 구조                              |
| PBL 교과목 세부내용    | 명사 형태로 끝맺음(예: ~수집)    | `pbl_ops_content_i_detail`                       | `pbl-prompts.ts` + 온점 규칙(명사형=온점없음) |
| PBL AI도구 활용        | 추상 표현 금지, 구체 도구명·방법 | `pbl_ops_tool_i_*`                               | `pbl-prompts.ts`                              |
| PBL 시설·장비          | 반드시 기재(seq~location)        | `pbl_ops_facility_i_*`                           | `pbl-prompts.ts`                              |
| PBL 세부내용 항목      | 30~80자, 3~5개                   | `pbl_ops_content_i_detail`                       | `pbl-prompts.ts`                              |

> **점검 팁:** fixture(`api/hwpx/__fixtures__/*.json`)가 위 제약을 만족하는지 스크립트로
> 확인(줄수·과정 수·명사형 종결·도구명 유무). '자동 불러옴/수정 불가' 필드(신청서·수행일지
> 연계)는 콘텐츠 제약 대상이 아니라 원문 유지/치환 대상이다(§9 구분).
