# Session 09 — Step 10: PBL HWPX 템플릿 + 내보내기 연결 (양식 2번 1:1)

## 세션 목표
마스터 계획서 §4의 **Step 10** (M, 11 Task) 수행. 산인공 **양식 2번 3~17p + 결과보고서(학습활동 수행일지)** HWPX 템플릿화 + Python `generate.py` type 분기 일반화 + Node 측 PBL 클라이언트 + UI 다운로드. 양식 필드 1:1 매칭 필수.

## 사전 조건
- Step 3 (HWPX PoC) + Step 7 (로드맵 HWPX) 머지 — Python 인프라·hwpx-client·useHwpxDownload 훅 동작.
- Step 9 (PBL 산출물) 머지 — `pbl_reports` 데이터 + UI 동작.
- `feature/official-form-alignment` 최신.
- `docs/references/2.AI PBL 과정개발보고서 및 결과보고서(양식).hwpx` 원본 존재.

## 실행 모드
**subagent-driven-development** — 11 Task. 템플릿 분석·Python 매핑·Node 클라이언트·UI 다운로드 분리.

## 호출 스킬·MCP·서브에이전트
- `superpowers:subagent-driven-development`
- `hwpx-docgen` (프로젝트 로컬 스킬)
- `check-server-action`
- `serena` MCP (Step 7의 `generateHwpx` → `generateRoadmapHwpx` 리네임 영향 받는 호출부 안전 수정)
- `superpowers:test-driven-development`

## 예상 소요
**4~6시간**

## 성공 지표
- [ ] `templates/hwpx/pbl.hwpx` 템플릿 (양식 2번 **3~18p 전 섹션 + 결과보고서(19~20p 학습활동 수행일지)** 플레이스홀더 + 표 반복 앵커 완비).
- [ ] `api/hwpx/_placeholders_pbl.py` + pytest 통과. **결과평가 4종 설문 문항 수 고정(5/3/5/4) + 훈련목표 체크박스 5종 + AI역량 수준 체크박스 4종 모두 매핑**.
- [ ] `api/hwpx/generate.py` `type` 파라미터 분기 + 공통 헬퍼 `_hwpx_helpers.py` 추출.
- [ ] `hwpx-client.ts` 리팩터: `postToPythonGenerate` 공통 헬퍼 + `generateRoadmapHwpx` (리네임) + `generatePBLHwpx` 신규. **호출부(Step 7 Server Action 등) 함께 갱신.**
- [ ] `hwpx-payload-pbl.ts` (`buildPBLHwpxPayload(): PBLHwpxPayload`) + 단위 테스트. **교과목 프로파일 강사투입시간 합 검증·결과평가 미응답("예정") 표시·훈련목표 체크박스 변환 로직 포함.**
- [ ] Server Action `exportPBLAsHwpxAction` (5단계 패턴, base64 반환, `createAuditLog({ action: 'PBL_HWPX_EXPORTED', ... })`).
- [ ] `src/components/pbl/DownloadButton.tsx`에 HWPX 항목 추가 + `useHwpxDownload` 훅 재사용 (Step 7 신규).
- [ ] **양식 2번 QA 체크리스트 100% 통과** (계획서 §4 Step 12 "양식 2번 QA 체크리스트" 전 항목).
- [ ] Vercel Preview에서 PBL HWPX 다운로드 → 한글 프로그램 양식 그대로 + `{{` 잔존 0.
- [ ] PR `feat(ofa-10): PBL HWPX 템플릿 + 내보내기` 생성.

## 다음 세션 이동 조건
- PR 머지 완료. 다음 → `session-10-step11-gallery.md`.

---

## 복사용 프롬프트

```
=== 컨텍스트 ===
- 프로젝트: KPC AI 훈련 로드맵 대시보드 (/Users/baekkyunshin/Desktop/AI-roadmap-dashboard)
- 마스터 계획서: docs/plans/2026-04-14-official-form-alignment.md
- OFA 프로젝트 **아홉 번째 세션** — Step 1~9 모두 머지된 상태
  - Step 3: HWPX PoC + 보안 원칙 (X-HWPX-Secret)
  - Step 7: 로드맵 HWPX 다운로드 동작 (generateHwpx, useHwpxDownload, exportRoadmapAsHwpxAction)
  - Step 9: pbl_reports 데이터 + UI + PDF/XLSX 동작
- 본 세션: Step 10 (M, 11 Task) — PBL HWPX 다운로드 파이프라인 완성
- Step 7 hwpx-client.ts 리팩터 동반 (generateHwpx → generateRoadmapHwpx 리네임 + 공통 헬퍼 추출)

=== 사전 검증 (반드시 첫 번째로 실행) ===
1. cd /Users/baekkyunshin/Desktop/AI-roadmap-dashboard
2. git fetch origin && git checkout feature/official-form-alignment && git pull
3. git log --oneline -10           → ofa-07·ofa-09 머지 커밋 확인
4. ls api/hwpx/generate.py api/hwpx/_placeholders_roadmap.py  → Step 3·7 결과
5. ls templates/hwpx/roadmap.hwpx  → Step 7 템플릿
6. ls src/lib/services/export/hwpx/hwpx-client.ts src/lib/services/export/hwpx/hwpx-payload-roadmap.ts  → Step 7 결과
7. ls src/hooks/useHwpxDownload.ts  → Step 7 신규 훅
8. ls src/lib/services/pbl/  → Step 9 결과 (6 파일)
9. ls src/components/pbl/DownloadButton.tsx  → Step 9 결과
10. ls docs/references/2.AI*PBL*.hwpx  → 양식 2번 원본
11. source .venv/bin/activate && python -c "import hwpx"  → Python 환경
12. echo $HWPX_API_SECRET || vercel env ls  → Step 3 환경변수
13. npm run validate              → baseline pass

검증 실패 시 즉시 중단. Step 7·9 미머지면 차단.

=== 필수 사전 정독 ===
> 계획서 해당 섹션의 정확한 줄 위치는 `grep -n '^## 0\.\|^### Step 7:\|^### Step 10:' docs/plans/2026-04-14-official-form-alignment.md` 로 헤더 재확인.

- 계획서 §0: 안전장치
- 계획서 §4 Step 7: Step 7에서 만든 hwpx-client·useHwpxDownload 패턴 — 본 세션에서 일부 리팩터
- 계획서 §4 Step 10: 본 세션 11 Task + type 분기 + 공통 헬퍼 추출
- src/lib/services/export/hwpx/hwpx-client.ts — Step 7 작성, 본 세션에서 리팩터
- src/app/(dashboard)/consultant/projects/[id]/roadmap/actions.ts — exportRoadmapAsHwpxAction 호출부 (rename 영향)

=== 핵심 자산 요약 ===
- Step 7 hwpx-client.ts를 본 Step에서 리팩터:
  - 공통 헬퍼 postToPythonGenerate({type, data}) 추출
  - generateHwpx → generateRoadmapHwpx 리네임 (Step 7의 호출부 함께 rename)
  - generatePBLHwpx 신규
- serena MCP로 호출부 안전 rename
- useHwpxDownload 훅(Step 7 신규)을 그대로 재사용 — 신규 작성 금지
- generate.py에 type='pbl' 분기 추가, 공통 _hwpx_helpers.py 추출
- audit_action 'PBL_HWPX_EXPORTED'는 Step 2 마이그 061에서 추가됨

진행 원칙:
1. feature/ofa-10-hwpx-pbl 브랜치 + uv .venv 활성화
2. Task 2: hwpx-docgen scripts/analyze_template.py로 양식 2번 분석 → docs/references/hwpx-structure-pbl.md
3. Task 3: 템플릿 수동 제작 (templates/hwpx/pbl.hwpx). 결과보고서 파트도 포함. 플레이스홀더 매핑 표는 계획서 본문 그대로
4. Task 4~5 (Python): _placeholders_pbl.py + generate.py type 분기 + _hwpx_helpers.py 공통 추출
5. Task 6 (hwpx-payload-pbl.ts): buildPBLHwpxPayload(pbl, project, interview): PBLHwpxPayload
6. Task 7 (hwpx-client.ts 리팩터):
   - 공통 헬퍼 postToPythonGenerate({type, data}) 추출
   - 기존 generateHwpx → generateRoadmapHwpx 리네임 (시크릿 헤더 처리도 헬퍼 안으로)
   - 신규 generatePBLHwpx 추가
   - serena MCP로 호출부 함께 rename (Step 7의 exportRoadmapAsHwpxAction이 generateHwpx 호출함)
   - hwpx-client.test.ts·hwpx-payload-roadmap.test.ts도 함께 갱신
7. Task 8 (Server Action exportPBLAsHwpxAction): 5단계 + base64 + createAuditLog action: 'PBL_HWPX_EXPORTED' (Step 2 마이그 061에서 enum 추가됨)
8. Task 9 (DownloadButton.tsx): src/hooks/useHwpxDownload 재사용. 파일명 {company}_PBL_v{version}.hwpx
9. Task 10: Preview 스모크 (한글 프로그램 검증, {{ 잔존 0)

=== 자동 진행 vs 승인 요청 경계 ===
- 자동 진행: 11 Task. 템플릿·Python 매핑·Node 클라이언트 리팩터·UI 자율.
- 승인 요청 (즉시 중단):
  - 양식 2번의 결과보고서 파트가 템플릿화 어려운 케이스 발생 시
  - generateHwpx → generateRoadmapHwpx 리네임으로 깨지는 호출부가 예상보다 많을 때
  - Python type 분기로 generate.py가 너무 복잡해질 때 (별도 generate_roadmap.py·generate_pbl.py 분리 검토)
  - useHwpxDownload 훅이 PBL 케이스에서 인터페이스 변경을 요구할 때
  - Preview에서 한글 프로그램 양식이 깨질 때

=== Task 종료 보고 양식 ===
✅ Task N 완료
- 신규/변경 파일: 1~3개
- 검증: 단위 테스트 / pytest / curl / 한글 프로그램 렌더
- 다음 Task

=== 금지 사항 ===
- X-HWPX-Secret 검증 생략
- Server Action에서 Buffer/Blob 직접 반환
- useRoadmapDownload·useHwpxDownload(Step 7) 인터페이스 변경
- 양식 원본 .hwpx 파일 손상

=== 종료 시 ===
0. **[필수] 전체 회귀 테스트 수행** — 모든 구현이 끝난 뒤 기존 기능 회귀 방지를 위해 반드시 실행. 건너뛰기 금지.
   - `npm run validate` (typecheck + lint + unit test 전체)
   - `npm run build` (프로덕션 빌드)
   - `npm run test:e2e` (E2E 전체)
   - pytest (Python 측 테스트)
   - 실패 시 원인 분석·수정 후 재실행. 우회·skip 금지.
1. superpowers:verification-before-completion
2. Preview에서 PBL HWPX 다운로드 + 한글 프로그램 양식 검증 보고
3. gh pr create --base feature/official-form-alignment --title "feat(ofa-10): PBL HWPX 템플릿 + 내보내기"
4. PR URL 보고. 자동 머지 금지.

=== 사용자에게 전달할 검증 안내 (세션 종료 시 반드시 출력) ===
────────────────────────────────────────
✅ Step 10 완료. PR URL: <url>, Vercel Preview URL: <preview-url>

**사용자가 확인할 것** (예상 15분, 한글 프로그램 필수):

⚠️ HWPX는 Vercel Preview에서만 동작 (localhost 불가).

1. **Vercel Preview URL** 접속
2. 컨설턴트로 로그인 → Step 9에서 만든 PBL 보고서 1건 → **HWPX 다운로드** 버튼 클릭
3. 다운받은 `.hwpx` 파일을 **한글 프로그램에서 열기**
4. 확인 (양식 2번 PDF와 1:1 겹쳐 비교):
   - Ⅰ. 훈련과정 개요 (사업장관리번호·NCS·AI역량 4등급 체크·훈련목표 5종 체크 모두 반영)
   - Ⅱ. 훈련 요구 분석 (기업현황·훈련환경·HRD 제안·과정개발 필요성)
   - Ⅲ. AI기반 훈련과제 도출 (수행활동 표 4역할·문제정의서·우선순위·훈련대상 업무·AI수준 진단)
   - Ⅳ. AI 기반 운영계획 수립 (훈련 목표·AI 도구 활용 계획 3단계·훈련 실시 계획 — **교과목 프로파일 강사투입시간 외부/내부 합=훈련시간 확인**·평가 계획 과정평가/결과평가)
   - Ⅴ. 성과분석 및 확산 전략 (정량·정성·내재화·전사 확산)
   - 결과보고서 학습활동 수행일지 (훈련 실시 전이면 빈 표)
   - **`{{` 같은 치환 안 된 플레이스홀더 0**
   - 체크박스·표·한글 텍스트 정상 표시
5. 파일명: `{기업명}_PBL_v{버전}.hwpx` 형식
6. 로드맵 HWPX(Step 7)도 여전히 동작하는지 1건 확인 (리팩터 회귀 체크)

**저에게 질문으로 대체 가능**:
> "Step 10 PBL HWPX가 올바르게 동작하는지 + Step 7 로드맵 HWPX 회귀 없는지 검증해줘"

한글 파일 OK면 → PR Squash and Merge → 새 세션 session-10.
────────────────────────────────────────
```
