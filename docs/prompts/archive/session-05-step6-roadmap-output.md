# Session 05 — Step 6: 로드맵 산출물 양식 정렬

## 세션 목표
마스터 계획서 §4의 **Step 6** (L, 16 Task) 수행. LLM 프롬프트·생성 로직·UI·PDF/XLSX 내보내기를 산인공 문서 1번 Ⅲ장(역량모델링/훈련체계도/연간계획/명세서) 구조에 맞춰 정렬.

## 사전 조건
- Step 5 PR 머지 완료 (로드맵 인터뷰 신규 스키마 사용 가능).
- `feature/official-form-alignment` 최신.
- 기존 로드맵 서비스 위치 확인 (`src/lib/services/roadmap/*.ts`), `RoadmapMatrix.tsx`, `CoursesList.tsx`, `ConsultantRoadmapClient.tsx` 등 회귀 테스트 대상 인지.

## 실행 모드
**subagent-driven-development** — 16 Task. LLM 프롬프트(prompt-engineer 서브에이전트)·UI 컴포넌트 5개·PDF/XLSX 동기화·E2E가 분리.

## 호출 스킬·MCP·서브에이전트
- `superpowers:subagent-driven-development`
- `prompt-engineer` 서브에이전트 (Task 4: 신규 LLM 프롬프트)
- `check-server-action`, `frontend-guide`, `composition-patterns`, `react-best-practices`, `refactoring`
- `serena` MCP (대규모 리팩터링 시 심볼 탐색·rename)
- `superpowers:test-driven-development`

## 예상 소요
**6~8시간** (테스트 갱신·E2E 포함)

## 성공 지표
- [ ] `roadmap-types.ts` 확장 (4개 신규 타입: Competency·StructureItem·AnnualPlanItem·CourseSpec).
- [ ] `roadmap-validator.ts` Zod 스키마 갱신, `pbl_course` 필드 제거.
- [ ] `roadmap-prompts.ts` 신규 프롬프트 (prompt-engineer 결과 반영).
- [ ] `roadmap-generator.ts`·`roadmap-matrix-builder.ts` 신규 구조로 동작.
- [ ] `roadmap-crud.ts`에서 `pbl_course` 코드 참조 제거 (DB 컬럼 drop은 Step 12).
- [ ] 신규 UI 컴포넌트 3종(`CompetencyModelingTable`, `AnnualTrainingPlanTable`, `CourseSpecCard`) + 기존 `RoadmapMatrix.tsx` 갱신 (총 4 컴포넌트 작업).
- [ ] `ConsultantRoadmapClient.tsx`·`OpsRoadmapClient.tsx` 6섹션 구조 재구성 (개요·요구분석·역량모델링·훈련체계도·연간계획·명세서).
- [ ] `RoadmapExportData` 타입 확장 + `prepareExportData` 함수 갱신 + PDF/XLSX 신규 구조 출력.
- [ ] 기존 8개 테스트 파일 신규 타입에 맞춰 재작성 (회귀 0).
- [ ] `e2e/consultant/consultant-roadmap.spec.ts` 갱신 통과.
- [ ] PR `feat(ofa-06): 로드맵 산출물 양식 정렬` 생성.

## 다음 세션 이동 조건
- PR 머지 완료. 다음 → **`session-05b-step6.5-form-compliance.md`** (로드맵 양식 정합성 보강 — Ⅰ장 인터뷰 + NCS 박스 + 수립 방법 등. Step 7 선행 조건).

---

## 복사용 프롬프트

```
=== 컨텍스트 ===
- 프로젝트: KPC AI 훈련 로드맵 대시보드 (/Users/baekkyunshin/Desktop/AI-roadmap-dashboard)
- 마스터 계획서: docs/plans/archive/2026-04-14-official-form-alignment.md
- OFA 프로젝트 **다섯 번째 세션** — Step 1·2·3·4·5 모두 머지된 상태
  - Step 5: 로드맵 인터뷰 5스텝 신규 (interview-roadmap.ts, RoadmapInterviewClient, useInterviewAutoSave 추출 완료)
- 본 세션: Step 6 (L, 16 Task) — LLM 출력 구조·UI·PDF/XLSX를 산인공 양식 1번 Ⅲ장에 정렬
- 가장 침습적인 Step — 기존 로드맵 코드 다수 변경 + 기존 8개 테스트 파일 갱신

=== 사전 검증 (반드시 첫 번째로 실행) ===
1. cd /Users/baekkyunshin/Desktop/AI-roadmap-dashboard
2. git fetch origin && git checkout feature/official-form-alignment && git pull
3. git log --oneline -10           → ofa-05 머지 커밋 확인
4. ls src/lib/schemas/interview-roadmap.ts                                  → Step 5 결과
5. ls src/app/\(dashboard\)/consultant/projects/\[id\]/interview/_components/RoadmapInterviewClient.tsx  → Step 5 결과
6. ls src/app/\(dashboard\)/consultant/projects/\[id\]/interview/_hooks/useInterviewAutoSave.ts  → Step 5 결과
7. ls src/lib/services/roadmap/                                              → 기존 서비스 파일들 (수정 대상)
8. ls src/lib/services/export/pdf/pdf-generator.ts src/lib/services/export/xlsx/xlsx-generator.ts  → 수정 대상
9. ls src/lib/actions/roadmap-export.ts                                      → prepareExportData 수정 대상
10. grep -l "pbl_course" src/                                                → 삭제 대상 코드 위치 (DB drop은 Step 12)
11. npm run validate                                                         → baseline pass

검증 실패 시 즉시 중단. Step 5 미머지면 차단.

=== 필수 사전 정독 ===
> 계획서 해당 섹션의 정확한 줄 위치는 `grep -n '^## 0\.\|^### 3-4\.\|^### Step 6:' docs/plans/archive/2026-04-14-official-form-alignment.md` 로 헤더 재확인.

- 계획서 §0: 안전장치
- 계획서 §3-4: UI/UX 재사용 원칙 (UI 4개 컴포넌트가 준수)
- 계획서 §4 Step 6: 본 세션 16 Task + "프로젝트 기존 자산 준수" 블록
- docs/references/1.AI훈련로드맵 컨설팅 보고서(양식).pdf — Ⅲ장 구조 (역량모델링·훈련체계도·연간계획·명세서)
- src/lib/services/roadmap/roadmap-types.ts·validator.ts·prompts.ts·generator.ts·crud.ts·matrix-builder.ts — 본 세션에서 모두 수정

=== 핵심 자산 요약 ===
- src/lib/services/export/pdf/, export/xlsx/는 신규 정렬 위치 (legacy export-*.ts는 re-export 파일 — Step 12에서 deprecate)
- generatePDF(data: RoadmapExportData), generateXLSX(data: RoadmapExportData) 시그니처 **유지** (외부 회귀 방지) — RoadmapExportData를 확장해 신규 필드 수용
- 로드맵 서비스 파일은 이미 분리(roadmap-prompts·generator·crud·validator·types)
- RoadmapStatusBadge.tsx 재사용
- pbl_course 코드 참조만 제거. DB 컬럼 DROP은 Step 12 마이그 065

진행 원칙:
1. feature/ofa-06-output-roadmap 브랜치 생성
2. Task 2~3 (타입·validator)을 먼저 TDD로 작성. 신규 4타입(Competency·StructureItem·AnnualPlanItem·CourseSpec)
3. Task 4: Agent(subagent_type:"prompt-engineer", ...) 디스패치. 계획서 본문의 프롬프트 그대로 사용. 결과를 roadmap-prompts.ts에 반영
4. Task 5~7 (generator·matrix·crud) 순차 갱신. roadmap-crud.ts에서 pbl_course 코드 제거하되 DB DROP COLUMN은 Step 12 마이그 065
5. Task 8~11 (UI 컴포넌트 4종) — 각 컴포넌트는 fresh subagent + frontend-guide·composition-patterns 호출
6. Task 12: ConsultantRoadmapClient/OpsRoadmapClient에 5섹션 구조 적용. 기존 RTL 테스트 갱신
7. Task 13: PDF/XLSX 동기화 — RoadmapExportData 확장 → prepareExportData 매핑 갱신 → renderer 분할(pdf-competency-renderer 등)
   - serena MCP로 export-pdf.ts/xlsx-generator.ts 심볼 탐색 후 안전 수정
   - generatePDF·generateXLSX 함수명·시그니처 유지 (외부 회귀 방지)
8. Task 14: 8개 기존 테스트 파일 재작성 (RoadmapMatrix·CoursesList·ConsultantRoadmapClient·OpsRoadmapClient·CourseEditModal·DownloadButton·VersionHistoryList·roadmap-*.test)
9. Task 15: e2e/consultant/consultant-roadmap.spec.ts 갱신
10. 모든 UI Task는 §3-4 공통 UI/UX 재사용 원칙 준수

=== 자동 진행 vs 승인 요청 경계 ===
- 자동 진행: 16 Task 전체. TDD·UI·테스트 갱신 자율.
- 승인 요청 (즉시 중단):
  - prompt-engineer 결과가 산인공 양식 일부 필드를 누락한다고 판단될 때
  - pbl_course 제거가 예상보다 광범위해 별도 PR(ofa-06a/ofa-06b) 분리가 나을 때
  - RoadmapExportData 확장이 backward-compatible하지 않을 때 (외부 호출자에 영향)
  - 8개 테스트 갱신 중 회귀 발견 시 (어떤 테스트가 깨지는지 보고 후 결정)
  - generatePDF·generateXLSX 시그니처 변경이 불가피할 때 (외부 회귀 위험)

=== Task 종료 보고 양식 ===
✅ Task N 완료
- 변경 파일: 1~3개 + 동반 테스트
- TDD/회귀: 신규 테스트 PASS, 기존 테스트 회귀 0
- 다음 Task

=== 금지 사항 ===
- generatePDF·generateXLSX 함수명·기본 시그니처 변경 (확장만 OK)
- pbl_course DB 컬럼 DROP (Step 12)
- 마이그레이션 신규 추가
- legacy export-*.ts 파일 삭제 (Step 12)

=== 종료 시 ===
1. superpowers:verification-before-completion (npm run validate && npm run build && npm run test:e2e)
2. 8개 갱신 테스트 결과 보고
3. gh pr create --base feature/official-form-alignment --title "feat(ofa-06): 로드맵 산출물 양식 정렬"
4. PR URL 보고. 자동 머지 금지.

=== 사용자에게 전달할 검증 안내 (세션 종료 시 반드시 출력) ===
────────────────────────────────────────
✅ Step 6 완료. PR URL: <url>

**사용자가 확인할 것** (예상 15분, localhost):

1. `npm run dev` → http://localhost:3000
2. 컨설턴트로 로그인 → Step 5에서 제출한 인터뷰가 있는 프로젝트 → 로드맵 생성 버튼
3. **로드맵 6섹션 구조** 화면 확인:
   - Ⅰ. 개요
   - Ⅱ. 요구분석 (인터뷰 반영)
   - Ⅲ. 역량 모델링 (표)
   - Ⅳ. 훈련체계도 (매트릭스)
   - Ⅴ. 연간 훈련계획 (표)
   - Ⅵ. 훈련과정 명세서 (최소 3개 카드)
4. 섹션별 편집(행 추가·수정) 동작
5. 최종 확정 → PDF·XLSX 다운로드 → 파일 정상 열림
6. 운영자 뷰(읽기 전용)에서도 6섹션 모두 보임

**저에게 질문으로 대체 가능**:
> "Step 6 PR이 로드맵 신구조를 올바르게 반영했는지 검증해줘"

localhost 동작 OK면 → PR Squash and Merge → 새 세션 session-06.
────────────────────────────────────────
```
