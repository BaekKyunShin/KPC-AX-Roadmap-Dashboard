# PR #4 — PDF 대조 리포트 + 최종 검증 (착수 프롬프트)

> 새 세션에서 이 작업을 진행할 때 아래 프롬프트를 그대로 복사해 사용하세요.
> **선행 조건**: PR #3 (HWPX 템플릿 재구축) 머지 완료.

---

KPC AI 훈련 로드맵 대시보드의 PDF 1:1 대조 리포트 + 최종 회귀 테스트 작업(PR #4)을
진행해줘.

## 배경

KPC AI 훈련 로드맵 대시보드(B2B 내부 도구)는 4개 화면(로드맵/PBL × 인터뷰/결과)을
산인공 공식 양식과 1:1 정합하도록 재설계 중. 진행 상태:

- ✅ PR #1 (sha 76f4eda): Foundation — 공통 UI 레이어 + Tailwind 토큰
- ✅ PR #2 (sha c44fbde): 4개 화면 V2 양식 1:1 재설계
- ✅ PR #3 (sha __직접 확인__): HWPX 템플릿 재구축 + 치환 로직 — 머지된 sha 를 git log 로 확인
- 🚧 **PR #4 (이 작업)**: PDF 1:1 대조 리포트 + 한글 오피스 실물 검증 + 누락 회귀
  테스트 + 최종 DoD 종결

이 PR 이 본 재설계의 **마지막 PR** 이며 머지 후 모든 DoD 11개를 ✅ 로 종결한다.

## 단일 원천 문서 (반드시 통독)

1. **`docs/prompts/2026-04-24-interview-result-screens-redesign.md`** —
   원본 요구사항. **DoD 11개** (라인 184~201) 가 이 PR 의 종결 기준.
2. **`docs/plans/2026-04-24-interview-result-screens-redesign.md`** —
   승인된 계획서. §8 (PDF 1:1 대조 검증 프로토콜) + §9 (HWPX 출력 물리 검증 프로토콜)
   + §12 (DoD 11개) 가 이 PR 의 작업 목록.
3. **`docs/references/2026-04-23-current-fields-inventory.md`** — 산인공 양식 분해
   기준 문서. PDF 대조의 reference.
4. **`docs/references/1.AI훈련로드맵 컨설팅 보고서(양식).pdf`** (15p + 별첨)
   /  **`2.AI PBL 과정개발보고서 및 결과보고서(양식).pdf`** (20p) — PDF 정본.
5. **`docs/screenshots/2026-04-24/`** — V2 UI 4 화면 × 3 해상도 12장 스크린샷
   (PR #2 산출물).
6. **`templates/hwpx/roadmap.hwpx`** / **`pbl.hwpx`** — PR #3 에서 재구축한 정본
   템플릿.
7. **`api/hwpx/generate.py`** + 헬퍼 — PR #3 에서 갱신된 치환 로직.
8. **`scripts/snapshot-4-screens.ts`** — 4개 화면 스크린샷 그리드 생성 스크립트
   (PR #2 산출물). 필요 시 재실행해 최신 UI 캡처.

## 현재 상태 확인 (작업 시작 전)

```bash
git log --oneline -5
# c44fbde feat(interview-result): 로드맵·PBL 4개 화면 V2 양식 1:1 재설계 (#28)
# (PR #3 머지 sha 가 그 위에 있어야 함)

# 만약 PR #3 가 아직 머지 전이면 이 PR 작업 보류. PR #3 부터 완료할 것.
```

## 작업 범위 (계획서 §8·§9·§12)

### Step 1. PDF 1:1 대조 검증 + 리포트 (DoD #3)

**계획서 §8 프로토콜:**

1. **체크리스트 작성** — `docs/references/2026-04-23-current-fields-inventory.md`
   의 모든 섹션(로드맵 Ⅰ~Ⅲ + 별첨/참고자료, PBL Ⅰ~Ⅴ + 결과보고서)을 ✅/⚠️/❌
   상태로 기록할 양식 마련.
2. **시각 비교** — 다음 3 종을 각 섹션별로 나란히 비교:
   - 산인공 PDF (`docs/references/*.pdf`)
   - V2 UI 스크린샷 (`docs/screenshots/2026-04-24/*.png`, 필요 시 재캡처)
   - HWPX → PDF 변환본 (PR #3 산출물 fixture 기반)
3. **불일치 0건이 될 때까지 반복** — 발견된 차이는 fix 또는 사유 기록.
4. **대조 리포트 작성**:
   `docs/reports/2026-04-24-form-parity-report.md` 신규 작성. 양식:

   ```markdown
   ## 로드맵 양식 1번 (15p + 별첨)
   ### Ⅰ. 개요
   - Ⅰ-1 수립 필요성 — ✅ (UI/HWPX/PDF 일치, 스크린샷 첨부)
   - Ⅰ-2 주요 활동 — ⚠️ 차수 행 기본 3개 vs 양식 PDF 4개. PR #2 합의 사항 (계획서 §1.4 참조)
   ...
   ```

   - 각 항목마다 스크린샷 또는 캡처 첨부
   - 47 섹션 모두 명시. 누락 금지.

### Step 2. HWPX 한글 오피스 실물 검증 (DoD #7)

**계획서 §9 프로토콜:**

1. fixture 기반 HWPX 생성 — PR #3 의 fixture (`__fixtures__/sample-llm-response.json` × 2) 사용
2. **한글 오피스에서 실제로 열어** 다음 확인 (사용자에게 실물 검증 의뢰):
   - 표 병합 구조 양식 PDF 와 동일
   - 체크박스 토글 정상 (`☐` / `☑`)
   - 반복 행 (수행일지 차수, 역량 모델링, 교과목 등) 정상
   - 조건부 박스 (NCS XOR, HRD이음 PDF 첨부 등) 정상
   - 폰트·줄간격 사용자 서식 수정본 그대로
3. 한글 오피스 스크린샷을 대조 리포트에 첨부

### Step 3. 누락 회귀 테스트 (DoD #6 보강)

**계획서 §5 Step 9:**

모든 인터뷰·결과 필드에 대해 다음 4 조합 테스트 작성:

- **빈 값** — empty string, null, undefined
- **최대 길이** — 한국어 5000자 등
- **특수문자** — emoji, 따옴표, 백슬래시, 줄바꿈
- **긴 한국어** — 2000자 단락

### Step 4. 최종 DoD 11개 전수 종결

`docs/prompts/2026-04-24-interview-result-screens-redesign.md` 라인 184~201 의 11개를
**증거 기반** 으로 ✅ 마킹. 대조 리포트 마지막에 DoD 종결 표 첨부:

| # | 항목 | 상태 | 증거 |
|---|---|---|---|
| 1 | 4개 화면 라벨 규칙 | ✅ | (PR #2, 단위 테스트 X 건) |
| 2 | 제외 라벨 0건 렌더 | ✅ | (PR #2, assertion Y 건) |
| 3 | PDF 1:1 대조 검증 | ✅ | (이 PR, `docs/reports/...md`) |
| ... | ... | ... | ... |
| 11 | verification-before-completion | ✅ | (이 PR 머지 직전 호출) |

### Step 5. CI 전체 pass + 머지

- `npm run validate && npm run build` 통과
- `gh pr checks <PR#>` Lint·Typecheck·Unit·Build·**E2E**·Vercel 모두 pass
- `superpowers:requesting-code-review` 호출 + 리뷰 반영
- 머지 직전 `superpowers:verification-before-completion` 스킬 호출 — 증거 기반 최종 검증

## 사용 스킬·MCP·서브에이전트

- **`superpowers:verification-before-completion`** — 머지 전 필수 (DoD #11)
- **`superpowers:writing-plans`** — Step 1~4 세분화
- **`puppeteer`** — UI 스크린샷 자동 캡처 (필요 시 `scripts/snapshot-4-screens.ts`
  재실행)
- **`hwpx-docgen` 스킬** — HWPX 검증 도구
- **`test-automator` 서브에이전트** — Step 3 회귀 테스트 작성 위임 가능

## 주의 사항

- **사용자 실물 검증 필요** — Step 2 의 한글 오피스 검증은 macOS 에 한컴오피스가
  없으면 사용자에게 실물 확인 요청. fixture HWPX 파일을 사용자에게 전달 후
  스크린샷·피드백 받기.
- **대조 리포트 누락 금지** — 47 섹션 모두 ✅/⚠️/❌ 표기. 한 줄도 빠지면 PR 머지
  보류.
- **Preview 배포 + 브리지 서버 양쪽 검증** — DoD #6 의 명시 요건.
- **이 PR 머지 후 메인 브랜치 정리** — 후속 작업 없음. 4개 화면 재설계 본 시리즈 종결.

## 진행 방식

1. PR #3 머지 확인 (git log) — 미완료 시 보류
2. 위 문서 8 종 통독
3. PlanMode 로 Step 1~5 세분화 계획 작성
4. 사용자 승인 후 구현
5. 한글 오피스 검증 단계에서 사용자에게 실물 확인 의뢰
6. 머지 직전 verification-before-completion 호출

진행해줘.
