# PR #3 — HWPX 템플릿 재구축 (착수 프롬프트)

> 새 세션에서 이 작업을 진행할 때 아래 프롬프트를 그대로 복사해 사용하세요.

---

KPC AI 훈련 로드맵 대시보드의 HWPX 템플릿 재구축 작업(PR #3)을 진행해줘.

## 배경

KPC AI 훈련 로드맵 대시보드(B2B 내부 도구)는 산인공 공식 양식(로드맵 1번·PBL 2번)
과 1:1 정합하는 결과물을 생성한다. 4개 화면(로드맵/PBL × 인터뷰/결과)은 이미 V2
양식으로 재설계 완료(PR #28, sha c44fbde, 2026-04-25 머지). 이번 PR은 이 V2 데이터를
**HWPX 한글 문서**로 1:1 출력하는 템플릿·치환 로직을 전면 재구축한다.

## 단일 원천 문서 (반드시 통독)

1. **`docs/prompts/archive/2026-04-24-interview-result-screens-redesign.md`** —
   원본 요구사항. "⚠️ HWPX 템플릿 재구축" 섹션(라인 90~150)이 이번 PR 의 핵심 명세.
2. **`docs/plans/archive/2026-04-24-interview-result-screens-redesign.md`** —
   승인된 계획서. §5 (HWPX 템플릿 재구축 9단계, 라인 449~558) + §6 (플레이스홀더 전수
   매핑 표, 라인 558~650) 가 이번 PR 의 작업 목록.
3. **`docs/references/2026-04-23-current-fields-inventory.md`** — 산인공 공식 양식의
   대제목(Ⅰ~Ⅴ) → 중제목 → 소제목 계층 + 표/박스/체크박스/블록 타입을 모두 분해한
   기준 문서. 매핑 표 cross-check 의 정본.
4. **`docs/references/1.AI훈련로드맵 컨설팅 보고서(양식).hwpx`** — 사용자가 서식
   수정한 정본. 항목·내용은 기존과 동일, 폰트·줄간격만 다름.
5. **`docs/references/2.AI PBL 과정개발보고서 및 결과보고서(양식).hwpx`** — 동일.
6. **`docs/references/1.AI훈련로드맵 컨설팅 보고서(양식).pdf`** /
   **`2.AI PBL 과정개발보고서 및 결과보고서(양식).pdf`** — PDF 정본 (시각 비교용).
7. **`api/hwpx/generate.py`** — Python 치환 로직 본체 (1411 줄). 전면 갱신 대상.
8. **`api/hwpx/_placeholders_roadmap.py`** / **`_placeholders_pbl.py`** — 매핑 dict
   생성 헬퍼. 전면 재작성 대상.

## 현재 상태 (2026-04-25)

- main 브랜치는 PR #28 머지 직후 (sha c44fbde)
- 4개 화면 V2 컴포넌트 + V2 Server Action + 새 인터뷰·결과 스키마 완비
- LLM 프롬프트 재설계 완료 (로드맵 Ⅲ장 + PBL Ⅳ·Ⅴ장)
- 그러나 HWPX 출력은 아직 V1 템플릿 + V1 치환 로직 — V2 데이터와 불일치
- DoD #5 (전수 매핑) · #6 (`{{...}}` 0건) · #7 (한글 오피스 실물 검증) 미충족 상태

## 작업 범위 (계획서 §5 9-단계 그대로)

1. **원본 교체 확인** — `docs/references/*.hwpx` 가 사용자 서식 수정본인지 hash 확인.
   `docs/references/archive/` 에 이전 버전 백업 여부 체크.
2. **템플릿 복사** — 새 정본을 `templates/hwpx/roadmap.hwpx` ·
   `templates/hwpx/pbl.hwpx` 로 복사 (이전 버전은 archive/ 로 이동).
3. **구조 재분석** — `hwpx-docgen` 스킬의 `.claude/skills/hwpx-docgen/scripts/
   analyze_template.py` 로 두 템플릿의 표 인덱스·셀 좌표·paragraph 번호 전수 분석.
   결과 → `docs/references/hwpx-structure-roadmap.md` ·
   `hwpx-structure-pbl.md` 로 저장.
4. **플레이스홀더 매핑 표 cross-check** — 계획서 §6 의 표를 §3 분석 결과로 채움.
   기준 문서 47 섹션 모두 대응 확인. 누락 0건까지 확장.
5. **플레이스홀더 삽입 스크립트** — `scripts/insert_placeholders.py` 신규 작성.
   매핑 JSON(`docs/references/hwpx-placeholders.json`)을 읽어 템플릿에 `{{...}}`
   삽입. **runs 분리 방지**: 서식 덩어리 단위로 작성. TDD 로 grep count == 기대치
   검증.
6. **치환 로직 전면 재작성** — `_placeholders_roadmap.py` · `_placeholders_pbl.py`
   를 V2 camelCase 입력 → snake_case `{{...}}` 매핑으로 재구현. AI 역량 4등급
   체크박스(현재/향후 × 4 = 8 박스) · NCS XOR 박스 · HRD이음 PDF 첨부 분기 등 모든
   조건부 로직 포함.
7. **체크박스·반복 행·조건부 박스 규칙 재정의** — 양식의 `□ → ☑` 토글, 차수별
   수행일지(최대 3차)·역량 모델링·교과목 표 반복, NCS 활용/미활용 XOR 박스 모두
   기준 문서와 1:1 일치.
8. **샘플 fixture 출력 검증** —
   - `src/lib/services/roadmap/__fixtures__/sample-llm-response.json` (기존)
   - `src/lib/services/pbl/__fixtures__/sample-llm-response.json` (기존)
   를 사용해 HWPX 생성 → 한글 오피스에서 직접 열어 확인:
   ① 서식(폰트·줄간격) 유지 ② 표 병합 양식 PDF 동일 ③ 체크박스·반복 행·조건부
   박스 정상 토글 ④ **치환되지 않은 `{{...}}` 0건** (grep 검증 스크립트 포함)
   ⑤ HWPX → PDF 변환 후 양식 PDF 와 픽셀 수준 비교
9. **누락 회귀 테스트** — 모든 인터뷰·결과 필드에 "빈 값 / 최대 길이 / 특수문자 /
   긴 한국어" 4 조합 Vitest + Pytest. CI 상시 검증.

## 로컬 테스트 환경

`api/hwpx/generate.py` 는 **Vercel Python Function** 이라 `next dev` 로 못 띄움.
브리지 서버 방식 사용:

```bash
npm run dev:hwpx:setup       # 최초 1회: Python venv + python-hwpx 설치
npm run dev:hwpx             # 터미널 A: HWPX 브리지 서버 (port 3010)
npm run dev:with-hwpx        # 터미널 B: Next.js dev + HWPX 프록시 (port 3000)
```

Preview 배포(git push)에서도 검증 가능. 자세한 가이드는 `CLAUDE.md` 의 "HWPX
다운로드 로컬 테스트 규칙" 섹션 참조.

## 사용 스킬·MCP·서브에이전트 (계획서 §11.1~11.4)

- **`hwpx-docgen` 스킬** — HWPX 편집·표 구성·검증 전반에 필수
- **`superpowers:writing-plans`** → **`superpowers:executing-plans`** — 9단계가 크므로
  단계별 계획서 + subagent dispatch 권장
- **`superpowers:test-driven-development`** — 매핑 스크립트·치환 로직 모두 TDD
- **`superpowers:verification-before-completion`** — 머지 전 필수
- **`mcp__supabase`** — DB 영향 없으나 fixture 검증 시 활용 가능
- **`puppeteer`** — HWPX → PDF 변환 비교 자동화 시 사용

## DoD (이 PR 에서 ✅ 만들어야 하는 항목)

- [ ] DoD #5: 매핑 표 cross-check 누락 0건
- [ ] DoD #6: HWPX 출력에 `{{...}}` 0건 (Preview + 브리지 서버 양쪽 검증)
- [ ] DoD #7: 한글 오피스 실물 확인 (스크린샷 첨부)
- [ ] DoD #9·#10: validate + build + CI 전체 pass

## 진행 방식

1. 계획서 §5·§6 통독 후 PlanMode 진입 — 9단계를 세분화한 step 계획 작성
2. 사용자 승인 후 구현 시작
3. 단계별 커밋 (한국어 메시지: chore/feat/refactor/test/docs)
4. 머지 전 verification-before-completion 호출

## 참고 — 이미 사용 가능한 재료

- 두 fixture (`__fixtures__/sample-llm-response.json` × 2) 가 양식 1:1 정합 정본.
  HWPX 출력 검증의 기준 데이터로 그대로 사용 가능.
- 12 장 스크린샷(`docs/screenshots/2026-04-24/`) 이 V2 UI 의 시각적 정본.
- PR #4 (PDF 1:1 대조 리포트 + 한글 오피스 실물 검증) 는 별도 PR. 이 PR 은 HWPX
  출력 정합까지만 책임지면 됨.

진행해줘.
