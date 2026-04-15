# hwpx-docgen

> **AI 분석용 안내**: 이 문서는 AI가 이 스킬의 목적·구조·사용법을 빠르게 파악하기 위한 이정표입니다. 실행 매뉴얼은 [SKILL.md](SKILL.md)를 참조하세요.

---

## 한 줄 요약

HWPX(한컴오피스 XML) 한글 문서를 자연어 요청만으로 생성·편집·분석하는 Claude Code 스킬.

---

## 무엇을 할 수 있는가

| 기능 | 입력 예시 | 출력 |
|---|---|---|
| **템플릿 기반 생성** | "공문 만들어줘. 발신: KPC, 수신: 삼육대" | `output.hwpx` |
| **사용자 양식 채우기** | "내양식.hwpx에 이름 홍길동 채워줘" | 양식 그대로 + 내용 채워진 `.hwpx` |
| **자유 생성** | "회의록 만들어줘. 안건: ..., 결정: ..." | `output.hwpx` |
| **표 생성** | "3행 4열 표 만들어줘. 데이터: ..." | 표 포함 `.hwpx` |
| **텍스트 추출** | "이 문서 분석해줘" | 본문 텍스트 (plain/markdown/json) |
| **구조 검증** | "이 문서 검증해줘" | PASS/WARN/FAIL 보고 |

---

## 핵심 설계 원칙

1. **모든 HWPX 조작은 python-hwpx API를 통해서만 수행** — XML 직접 편집 절대 금지 (OWPML 구조 깨짐 방지)
2. **`HwpxDocument.new()`** — Skeleton 기반으로 한컴오피스 호환 문서 생성
3. **`HwpxDocument.open()`** — 기존 .hwpx 파일을 안전하게 열기
4. **표 셀 내부 플레이스홀더도 치환** — `replace_text_in_runs()`가 누락하는 부분을 별도 순회로 보강

---

## 폴더 구조

```
hwpx-docgen/
├── SKILL.md                          # [핵심] Claude가 읽는 워크플로우 매뉴얼
├── README.md                         # 이 파일 (AI/사람 분석용)
│
├── templates/                        # 내장 .hwpx 템플릿 5종
│   ├── base.hwpx                        빈 문서
│   ├── gonmun.hwpx                      공문 (발신·수신·제목·본문)
│   ├── report.hwpx                      보고서 (장·절 구조)
│   ├── minutes.hwpx                     회의록 (메타 표 + 안건·결정)
│   └── proposal.hwpx                    제안서 (개요·예산·기대효과)
│
├── scripts/                          # Python 도구 (8개)
│   ├── build_hwpx.py                    템플릿 + JSON → .hwpx 빌드
│   ├── zip_replace_all.py               플레이스홀더 치환 (본문 + 표)
│   ├── validate_hwpx.py                 문서 구조 검증
│   ├── extract_text.py                  텍스트 추출 (plain/markdown/json)
│   ├── analyze_template.py              문서 구조 분석
│   ├── generate_templates.py            템플릿 재생성 도구
│   ├── table_gen.py                     독립 표 생성
│   └── page_guard.py                    페이지 수 추정
│
├── references/                       # 참조 문서
│   ├── owpml-format.md                  OWPML XML 규격
│   ├── table-xml-spec.md                표 XML 구조
│   └── api.md                           스크립트 API 레퍼런스
│
└── examples/
    └── sample-queries.md             # 테스트용 샘플 쿼리 5종
```

---

## 의존성

- Python 3.8+
- `python-hwpx` (HWPX 조작 라이브러리, 내장 Skeleton 활용)
- `lxml` (python-hwpx 내부 의존성)

설치: `pip install python-hwpx lxml`

---

## 동작 플로우

```
사용자 자연어 요청
    │
    ▼
Claude가 SKILL.md 의사결정 트리 따라 워크플로우 선택
    │
    ├─ Workflow 1: 문서 생성   → build_hwpx.py 또는 직접 Python
    ├─ Workflow 2: 문서 편집   → zip_replace_all.py
    ├─ Workflow 3: 문서 분석   → extract_text.py + analyze_template.py
    ├─ Workflow 4: 표 생성     → table_gen.py 또는 add_table()
    └─ Workflow 5: 템플릿 관리 → templates/*.hwpx
    │
    ▼
python-hwpx API 호출 → .hwpx 파일 생성/수정
    │
    ▼
validate_hwpx.py로 검증 → 결과 사용자에게 반환
```

---

## 제약 사항

| 항목 | 내용 |
|---|---|
| **지원 형식** | `.hwpx`만 지원. `.hwp`(구버전 바이너리)는 한컴오피스에서 변환 필요 |
| **XML 직접 편집** | 금지. python-hwpx API만 사용 (OWPML 구조 보호) |
| **레거시 워크플로우** | `unpack→edit→pack` 경로 폐기됨 |
| **플레이스홀더 형식** | `{{이중중괄호}}` 권장 |

---

## 실제 사용 사례

| 상황 | 입력 명령 | 결과 |
|---|---|---|
| 공문 발송 | "공문 만들어줘. 발신: KPC, 수신: 삼육대학교, 제목: 협조 요청" | 서명란·발신자 정보까지 포함된 완성된 공문 `.hwpx` |
| 강사 이력서 | "강사프로필양식.hwpx에 이름 홍길동, 소속 ABC회사로 채워줘" | 양식 그대로 + 지정 필드만 채워진 문서 |
| 회의록 작성 | "회의록 만들어줘. 회의명: 정기회의, 안건: ..., 결정: ..." | 메타 표 + 4섹션(안건/논의/결정/후속)이 구성된 문서 |
| 제안서 초안 | "제안서 만들어줘. 제목: AI 도입, 예산: 5억, 기간: 12개월" | 6섹션(개요/목적/일정/예산/기대효과) 제안서 |
| 데이터 보고서 | "3행 4열 표 포함 보고서. 데이터: 프로젝트별 진행률..." | 제목·서문·표·결론이 포함된 완성 보고서 |
| 기존 문서 분석 | "document.hwpx 텍스트 추출하고 구조 분석해줘" | 마크다운/JSON 텍스트 + 단락/표/스타일 통계 |

---

## 트리거 키워드

다음 키워드가 사용자 요청에 포함되면 Claude가 이 스킬을 자동 호출합니다:

`한글 문서`, `HWPX`, `hwpx 생성`, `hwpx 편집`, `hwpx 분석`, `표 만들기`

---

## 더 알아보기

- 실행 매뉴얼: [SKILL.md](SKILL.md)
- 스크립트 API: [references/api.md](references/api.md)
- OWPML 규격: [references/owpml-format.md](references/owpml-format.md)
- 사용 예시: [examples/sample-queries.md](examples/sample-queries.md)
