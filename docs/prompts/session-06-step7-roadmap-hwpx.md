# Session 06 — Step 7: 로드맵 HWPX 템플릿 + 내보내기 연결

## 세션 목표
마스터 계획서 §4의 **Step 7** (M, 11 Task) 수행. 산인공 양식 1번 HWPX 원본을 템플릿화하고 로드맵 데이터 → 템플릿 → HWPX 다운로드 파이프라인 완성. **양식 1번 3~12p 모든 섹션 1:1 매칭 필수**.

## 사전 조건
- Step 3 (HWPX PoC) PR 머지 — `api/hwpx/generate.py` 동작 + `HWPX_API_SECRET` 환경변수 등록 완료.
- Step 6 (로드맵 산출물) PR 머지 — `roadmap-types.ts` 4섹션 타입 + `RoadmapExportData` 확장 + 신규 UI 동작.
- **Step 6.5 (양식 정합성 보강) PR 머지 필수** — `setup_necessity`·`outcome_summary`·`training_structure_method`·루트 NCS 박스 필드·`buildTrainingStructureTable()` 변환 함수·인터뷰 `overview` 필드 모두 존재.
- `feature/official-form-alignment` 최신.
- 로컬 Python 가상환경 활성화 가능 (`source .venv/bin/activate`).
- `docs/references/1.AI훈련로드맵 컨설팅 보고서(양식).hwpx` 원본 파일 존재.

## 실행 모드
**subagent-driven-development** — 11 Task. 템플릿 분석·Python 매핑·Node 클라이언트·UI 다운로드·E2E 분리.

## 호출 스킬·MCP·서브에이전트
- `superpowers:subagent-driven-development`
- `hwpx-docgen` (프로젝트 로컬 `.claude/skills/hwpx-docgen/scripts/` 활용)
- `check-server-action`
- `serena` MCP (Step 10에서 함수 리네임 영향 받는 호출부)
- `superpowers:test-driven-development`

## 예상 소요
**4~6시간** (HWPX 템플릿 수동 편집 시간 포함)

## 성공 지표
- [ ] `templates/hwpx/roadmap.hwpx` 템플릿 (양식 1번 **3~12p 전 섹션 + 별첨 수행일지** 플레이스홀더 + 표 반복 앵커 완비).
- [ ] `api/hwpx/generate.py` 템플릿 치환 로직 + `_placeholders_roadmap.py` 매핑 모듈 + pytest 통과.
- [ ] `src/lib/services/export/hwpx/hwpx-client.ts` (`generateHwpx` — 시크릿 헤더 포함) + `hwpx-payload-roadmap.ts` (`buildRoadmapHwpxPayload`) + 단위 테스트.
- [ ] Server Action `exportRoadmapAsHwpxAction` — 5단계 패턴 + base64 반환 + `createAuditLog({ action: 'ROADMAP_HWPX_EXPORTED', ... })`.
- [ ] `src/hooks/useHwpxDownload.ts` 신규 (Step 10에서 PBL 재사용 예정).
- [ ] `src/components/roadmap/DownloadButton.tsx`에 HWPX 항목 추가 + 토스트.
- [ ] **양식 1번 체크리스트 100% 통과** (계획서 §4 Step 12 "양식 1번 QA 체크리스트" 전 항목 — Ⅰ장 3필드, Ⅱ장 4섹션, Ⅲ장 4섹션 + 수립 방법 + NCS 박스, 별첨 수행일지).
- [ ] 훈련체계도는 `buildTrainingStructureTable()` 결과(6열 단순 표)로 HWPX에 삽입 (매트릭스 UI 아님).
- [ ] Vercel Preview에서 로드맵 1건 생성 → HWPX 다운로드 → 한글 프로그램에서 양식 그대로 열림 + `{{` 잔존 0.
- [ ] PR `feat(ofa-07): 로드맵 HWPX 템플릿 + 내보내기` 생성.

## 다음 세션 이동 조건
- PR 머지 완료. 다음 → `session-07-step8-pbl-interview.md`.

---

## 복사용 프롬프트

```
=== 컨텍스트 ===
- 프로젝트: KPC AI 훈련 로드맵 대시보드 (/Users/baekkyunshin/Desktop/AI-roadmap-dashboard)
- 마스터 계획서: docs/plans/2026-04-14-official-form-alignment.md
- OFA 프로젝트 **여섯 번째 세션** — Step 1·2·3·4·5·6·**6.5** 모두 머지된 상태
  - Step 3: HWPX PoC (api/hwpx/ping·generate, X-HWPX-Secret 검증)
  - Step 6: 로드맵 Ⅲ장 4섹션 신구조 (역량모델링·훈련체계도·연간계획·명세서)
  - Step 6.5: Ⅰ장 인터뷰 + 결과물 NCS 박스·수립 방법·부제 라벨 + `buildTrainingStructureTable()` 변환 함수
- 본 세션: Step 7 (M, 11 Task) — 산인공 양식 1번 **3~12p + 별첨 수행일지** HWPX 템플릿화 + 데이터 → 템플릿 → 다운로드 파이프라인 완성. 양식 1:1 매칭 필수

=== 사전 검증 (반드시 첫 번째로 실행) ===
1. cd /Users/baekkyunshin/Desktop/AI-roadmap-dashboard
2. git fetch origin && git checkout feature/official-form-alignment && git pull
3. git log --oneline -10           → ofa-03·ofa-06·**ofa-06.5** 머지 커밋 확인
4. ls api/hwpx/ping.py api/hwpx/generate.py api/hwpx/requirements.txt vercel.json  → Step 3 산출물
5. ls docs/decisions/2026-04-14-hwpx-infrastructure.md  → Step 3 ADR
6. ls src/lib/services/roadmap/roadmap-types.ts  → Step 6·6.5 신규 타입
7. grep -E "setup_necessity|training_structure_method|ncs_methodology" src/lib/services/roadmap/roadmap-types.ts  → **Step 6.5 필드 존재 확인 필수**
8. grep -E "buildTrainingStructureTable" src/lib/services/roadmap/roadmap-matrix-builder.ts  → **Step 6.5 변환 함수 확인 필수**
9. grep -E "overviewSchema|establishment_necessity" src/lib/schemas/interview-roadmap.ts  → **Step 6.5 인터뷰 Ⅰ장 확인 필수**
10. ls docs/references/1.AI훈련로드맵*.hwpx       → 양식 1번 원본
11. ls .claude/skills/hwpx-docgen/scripts/        → 분석·검증 스크립트
12. ls -d .venv/                                  → uv 가상환경 (Step 3에서 생성)
13. source .venv/bin/activate && python -c "import hwpx; print(hwpx.__version__)"  → python-hwpx 동작 확인
14. echo $HWPX_API_SECRET 또는 vercel env ls      → Step 3에서 등록된 환경변수 확인
15. npm run validate                               → baseline pass

검증 실패 시 즉시 중단. Step 3 PoC 또는 Step 6·**6.5** 미머지면 차단.

=== 필수 사전 정독 ===
> 계획서 해당 섹션의 정확한 줄 위치는 `grep -n '^## 0\.\|^### 3-4\.\|^### Step 3:\|^### Step 7:' docs/plans/2026-04-14-official-form-alignment.md` 로 헤더 재확인.

- 계획서 §0: 안전장치
- 계획서 §3-4: UI/UX 재사용 원칙 (DownloadButton 적용)
- 계획서 §4 Step 3: "보안 원칙" 블록 (X-HWPX-Secret) — 본 Step에서 그대로 따름
- 계획서 §4 Step 7: 본 세션 11 Task + Server Action base64 반환 패턴
- src/hooks/useRoadmapDownload.ts — 기존 PDF/XLSX 다운로드 훅 (HWPX는 신규 useHwpxDownload — 별개)

=== 핵심 자산 요약 ===
- api/hwpx/generate.py에 X-HWPX-Secret 검증 필수. Node 클라이언트도 헤더에 포함
- Server Action은 Buffer/Blob 직접 반환 금지 (Next.js 직렬화 제약) → base64 문자열로 변환
- 반환 타입: ActionResult<{ fileName: string; contentBase64: string; mimeType: string }>
- 클라이언트(useHwpxDownload 훅, src/hooks/useHwpxDownload.ts 신규)에서 atob → Uint8Array → Blob → a.download
- 기존 useRoadmapDownload(PDF/XLSX 전용)는 건드리지 않음
- 본 Step에서 생성한 useHwpxDownload는 Step 10에서 PBL DownloadButton에서도 재사용
- **양식 1번 섹션별 데이터 출처 (반드시 숙지):**
  - Ⅰ-1 수립 필요성 → 인터뷰 `overview.establishment_necessity` (Step 6.5)
  - Ⅰ-2 주요 활동 표 → 수행일지 자동집계 (**본 Step에서 interviews 관련 로그를 차수별로 수집**)
  - Ⅰ-3 AI 역량 수준 체크 → `outcome_summary.ai_competency_level` (Step 6.5)
  - Ⅰ-3 선정 과업·수립 주요내용 요약 → `outcome_summary.selected_tasks` / `outcome_summary.main_content`
  - Ⅱ-1 HRD이음 보고서 → `overview.hrd_report_attachment_url` (Step 6.5, 선택)
  - Ⅱ-2 기업 요구분석 4필드 → 인터뷰 `company_requirements` (Step 5)
  - Ⅱ-3 과업·워크플로우 분석표 + 분석내용 → `task_workflow_items` + `analysis_notes` (Step 5)
  - Ⅱ-4 훈련대상 과업 선정 → `training_targets` (Step 5)
  - Ⅲ-1 역량 모델링 표 (부제 라벨 포함) → LLM `competencies` (Step 6)
  - Ⅲ-1 NCS 박스 2개 (활용/도출) → 루트 `ncs_used`·`ncs_methodology`·`ncs_derivation_method` (Step 6.5). **`ncs_used=true`면 활용 방법 박스만 / false면 도출 방법 박스만 렌더** (템플릿에 조건부 앵커)
  - Ⅲ-2 훈련체계도 6열 표 → `buildTrainingStructureTable(competencies, training_structure)` 결과 (Step 6.5). **매트릭스 UI를 그대로 넣지 말 것**
  - Ⅲ-2 훈련체계 수립 방법 → 루트 `training_structure_method` (Step 6.5)
  - Ⅲ-3 연간 훈련계획 목록 + 활용방안 → `annual_plan.items` + `annual_plan.usage_plan` (Step 6)
  - Ⅲ-4 훈련과정 명세서 (각 과정) → `course_specs[]` (Step 6). 교과목 표 부제 "세부 내용(단원, 과제명)"은 템플릿에 고정 텍스트로 존재하므로 값만 채움
  - 별첨 수행일지 → 인터뷰 차수·참석자·수행 내용 기반 자동 집계 (Task 7 payload 빌더에서 생성)

진행 원칙:
1. feature/ofa-07-hwpx-roadmap 브랜치 + uv .venv 활성화
2. Task 2: hwpx-docgen scripts/analyze_template.py로 양식 1번 구조 분석 → docs/references/hwpx-structure-roadmap.md 출력. **양식 1번 3~12p 전 섹션과 별첨 수행일지까지 포함하는지 검증**
3. Task 3: 템플릿 수동 제작 (templates/hwpx/roadmap.hwpx). **계획서 §4 Step 7 플레이스홀더 매핑 표**(Ⅰ·Ⅱ·Ⅲ장 + 별첨, Step 6.5 신규 필드 포함)를 그대로 반영. `{{ncs_methodology}}`·`{{ncs_derivation_method}}`는 조건부 섹션 앵커로 처리
4. Task 4~5: Python 측 generate.py + _placeholders_roadmap.py. pytest 단위 테스트. **NCS 조건부 렌더(ncs_used에 따라 활용 박스 or 도출 박스만 남기고 다른 쪽 섹션은 제거) 구현 필수**. 훈련체계도는 `buildTrainingStructureTable` 결과를 Python 쪽 표 add_row로 렌더
5. Task 6~7: TS 측 hwpx-client.ts + hwpx-payload-roadmap.ts. TDD. **buildRoadmapHwpxPayload(inputs)에 Step 6.5 신규 필드 매핑 완비 — setup_necessity, outcome_summary, training_structure_method, ncs_* 모두 포함**. 매트릭스 데이터는 `buildTrainingStructureTable()`로 변환 후 payload에 삽입. 수행일지는 inputs.interview의 차수별 데이터를 Ⅰ-2 표 행 배열로 변환
6. Task 8: Server Action exportRoadmapAsHwpxAction (5단계 패턴, base64 반환, createAuditLog ROADMAP_HWPX_EXPORTED)
7. Task 9: useHwpxDownload 훅 신규 작성 (src/hooks/useHwpxDownload.ts) + DownloadButton.tsx에 HWPX 항목 추가. 기존 useRoadmapDownload는 건드리지 않음 (PDF/XLSX 전용)
8. Task 10: Preview 스모크 — 양식 1번 QA 체크리스트(계획서 §4 Step 12) 전 항목을 **실물 한글 파일과 양식 PDF로 겹쳐 확인**. `{{` 잔존 0 확인. NCS 조건부 섹션이 ncs_used 값에 따라 올바르게 하나만 렌더되는지 검증

=== 자동 진행 vs 승인 요청 경계 ===
- 자동 진행: 11 Task 전체. 템플릿 제작·Python 매핑·Node 클라이언트·UI 자율.
- 승인 요청 (즉시 중단):
  - 산인공 양식 표 구조가 python-hwpx로 처리 어려운 케이스 발생 시 (예: 복잡한 셀 병합)
  - Preview 다운로드가 Vercel Function timeout(300s) 또는 메모리 한계에 걸릴 때
  - 한글 프로그램에서 양식이 깨질 때 (조판·표·이미지)
  - 템플릿 분석 결과 플레이스홀더 매핑 표가 계획서 본문과 크게 다를 때
  - **NCS 조건부 렌더(ncs_used 값에 따라 Ⅲ-1 활용 박스 또는 도출 박스 중 하나만 남기는 로직)가 python-hwpx에서 직접 지원 어려울 때**
    - **fallback 옵션**: 양쪽 박스를 템플릿에 둔 채 비활성 쪽 박스에 "해당 없음 (NCS 미활용 선택)" 또는 역으로 "해당 없음 (NCS 활용 선택)" 텍스트만 삽입 — 양식 의도는 유지되나 박스 자체는 제거되지 않음. 사용자 승인 필요.

=== Task 종료 보고 양식 ===
✅ Task N 완료
- 신규/변경 파일: 1~3개
- 검증: 단위 테스트 / pytest / curl / 한글 프로그램 렌더 결과
- 다음 Task

=== 금지 사항 ===
- X-HWPX-Secret 검증 생략 (Step 3 보안 원칙)
- Server Action에서 Buffer/Blob 직접 반환 (Next.js 직렬화 실패)
- useRoadmapDownload 훅을 HWPX로 확장 (별개 useHwpxDownload 신규)
- 템플릿 원본 .hwpx를 손상 (먼저 복사 후 편집)

=== 종료 시 ===
1. superpowers:verification-before-completion
2. Preview에서 한글 프로그램 양식 검증 결과 보고 ({{ 잔존 0 확인)
3. gh pr create --base feature/official-form-alignment --title "feat(ofa-07): 로드맵 HWPX 템플릿 + 내보내기"
4. PR URL 보고. 자동 머지 금지.

=== 사용자에게 전달할 검증 안내 (세션 종료 시 반드시 출력) ===
────────────────────────────────────────
✅ Step 7 완료. PR URL: <url>, Vercel Preview URL: <preview-url>

**사용자가 확인할 것** (예상 15분, 한글 프로그램 필수):

⚠️ HWPX는 Vercel Preview에서만 동작합니다 (Python Functions가 localhost에 없음).

1. **Vercel Preview URL** 접속 (GitHub PR 페이지 코멘트에 링크)
2. 컨설턴트로 로그인 → 로드맵 1건 → **HWPX 다운로드** 버튼 클릭
3. 다운받은 `.hwpx` 파일을 **한글 프로그램에서 열기**
4. 확인:
   - 산인공 양식 1번 구조 그대로 (역량 모델링·훈련체계도·연간계획·명세서)
   - 기업명·인터뷰 데이터 정확히 채워짐
   - **`{{` 같은 치환 안 된 플레이스홀더 0**
   - 체크박스·표·한글 텍스트 정상 표시
5. 파일명: `{기업명}_로드맵_v{버전}.hwpx` 형식

**저에게 질문으로 대체 가능**:
> "Step 7 HWPX 파이프라인이 올바르게 동작하는지 검증해줘"

한글 파일 OK면 → PR Squash and Merge → 새 세션 session-07.
────────────────────────────────────────
```
