# HWPX 한글 오피스 실물 검증 (DoD #7)

> **PR #4 의 사용자 협업 단계.** 8 개 fixture 로 HWPX 를 생성·다운로드하여 한글 오피스에서 실물 확인 후 본 디렉토리에 스크린샷을 보존한다.

## 검증 대상 (8 fixture)

| fixture | 케이스 | 검증 포커스 |
|---|---|---|
| `roadmap-full.json` | 풀필 | 4 행 수행일지·역량 모델링·교과목 명세서 max |
| `roadmap-empty.json` | 최소 | 빈 fallback (체크박스 모두 □) |
| `roadmap-max-length.json` | 최대 길이 | 한국어 2000~5000 자 단락 |
| `roadmap-special-chars.json` | 특수문자 | <, >, &, 따옴표, 백슬래시, emoji |
| `pbl-full.json` | 풀필 | V2 신규 데이터 (problems/priorities/target/AI 레벨) |
| `pbl-empty.json` | 최소 | V2 빈 객체 |
| `pbl-max-length.json` | 최대 길이 | V2 problems 4 건 + ai_tool_usage_plan 4 단계 |
| `pbl-special-chars.json` | 특수문자 | 동일 패턴 |

## 검증 절차

### 옵션 1 — 직접 fixture 로 HWPX 생성 (권장, 빠름)

```bash
# 최초 1 회: Python venv + python-hwpx 설치
npm run dev:hwpx:setup

# 8 fixture 별 HWPX 생성 → 본 디렉토리에 저장
source .venv-hwpx/bin/activate

mkdir -p docs/screenshots/2026-04-24/hwpx-hancom

for f in roadmap-full roadmap-empty roadmap-max-length roadmap-special-chars; do
  python -c "
import sys, json
sys.path.insert(0, 'api/hwpx')
from generate import _generate_roadmap
data = json.load(open('api/hwpx/__fixtures__/${f}.json'))
out = _generate_roadmap(data)
open('docs/screenshots/2026-04-24/hwpx-hancom/${f}.hwpx', 'wb').write(out)
print('${f}.hwpx', len(out), 'bytes')
"
done

for f in pbl-full pbl-empty pbl-max-length pbl-special-chars; do
  python -c "
import sys, json
sys.path.insert(0, 'api/hwpx')
from generate import _generate_pbl
data = json.load(open('api/hwpx/__fixtures__/${f}.json'))
out = _generate_pbl(data)
open('docs/screenshots/2026-04-24/hwpx-hancom/${f}.hwpx', 'wb').write(out)
print('${f}.hwpx', len(out), 'bytes')
"
done
```

8 개 `.hwpx` 파일이 생성되면 한글 오피스에서 차례로 열어 검증.

### 옵션 2 — 브리지 서버 + 실제 앱 워크플로우 (테스트 데이터 의존)

```bash
# 터미널 A
npm run dev:hwpx

# 터미널 B
npm run dev:with-hwpx

# 브라우저: 결과 화면 진입 후 HWPX 다운로드 버튼 클릭
```

## 검증 항목 (각 fixture × 8)

- [ ] ① 한컴오피스 정상 열기 (오류 팝업 없음)
- [ ] ② 표 병합 구조 (rowspan/colspan) 양식 PDF 와 동일
- [ ] ③ 체크박스 (`☐` / `☑`) 토글 정상
- [ ] ④ 차수별 수행일지·역량 모델링·교과목 표 등 반복 행 정상
- [ ] ⑤ NCS 활용 XOR · HRD이음 PDF 첨부 등 조건부 박스 정상
- [ ] ⑥ 폰트·줄간격 사용자 서식 수정본 그대로
- [ ] ⑦ 특수문자 (`<`, `>`, `&`, 따옴표, emoji) 환원 OK
- [ ] ⑧ 잔존 `{{...}}` 0 건

## 스크린샷 보존

`{fixture}-{section}.png` 형식으로 저장 (예: `roadmap-full-cover.png`, `pbl-special-chars-problems.png`):

```
docs/screenshots/2026-04-24/hwpx-hancom/
├── README.md (본 파일)
├── roadmap-full.hwpx
├── roadmap-full-cover.png
├── roadmap-full-overview.png
├── roadmap-full-training.png
├── ...
└── pbl-special-chars-problems.png
```

검증 완료 후 `docs/reports/2026-04-24-form-parity-report.md` §5.4 표를 ✅ 로 갱신.

## 자동 검증 보강 (사전 입증)

본 fixture 들은 다음 자동 검증으로 출력 정합성을 사전에 입증한다 (DoD #6 / 옵션 B 재정의):

- `pytest api/hwpx/test_integration_fixtures.py` — 12/12 PASS (4분 27초)
- `node scripts/verify-mapping-completeness.mjs` — 94 unique placeholders, 누락 0 건
- ZIP 매직 (`PK\x03\x04`) 검증 모든 fixture 통과
- `{{...}}` 잔존 0 건 (TestNoPlaceholderResidue)
- 특수문자 환원 (회사명·산업코드·이모지) 검증 PASS

따라서 한글 오피스 실물 검증은 **표 병합·체크박스·반복 행·조건부 박스의 시각적 정합성** 만 확인하면 된다.
