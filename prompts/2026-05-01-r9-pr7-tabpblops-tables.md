TabPBLOps Ⅳ-3 표 변환 PR 진행해줘.

## 입력
- docs/plans/2026-04-29-roadmap-review-findings.md
- docs/plans/2026-04-29-pbl-form-matrix.md (R0 산출 — 4중 정합성 비교)

## 공통 진행 규칙
1. 시작 시 findings.md + pbl-form-matrix.md 를 먼저 읽고 본 라운드 범위 + 이미 [해결됨] 표시된 항목 + 다른 라운드 메모 확인
2. 작업 중 신규 결함 발견 시 findings.md 의 "## 추가 발견 사항" 섹션에 추가
3. 작업 중 다른 라운드 항목에 영향 주는 사실 발견 시 해당 항목에 "> 메모(YYYY-MM-DD, R9로부터 발견): 내용" 추가
4. PR 머지 직전: 본 PR 이 닫는 항목에 [해결됨][PR #N] YYYY-MM-DD 표기 + findings.md 변경 같은 PR 에 포함
5. 머지는 사용자 명시 승인 후에만 진행

## 본 라운드 (R9) 범위
R8 PR #48 에서 후속 PR 로 분리한 #14·#17·#18(PBL) — TabPBLOps Ⅳ-3 표 변환.
LLM 결과 데이터 구조에 의존하는 작업이라 R5 PR4 (#46) 의 PBL 프롬프트 출력 형태 검증 후 진행.

### 5.1-#14·#17·#18(PBL) — TabPBLOps Ⅳ-3 표 변환
- 현재: `TabPBLOps.tsx` 의 5 SectionCard (Ⅳ-3-가/나/다/라/마) 가 LLM 결과를 단순 줄글/카운트로만 표시
  - Ⅳ-3-가 훈련과정 개요: "과정명 (총 N시간)" 단일 줄
  - Ⅳ-3-나 학습그룹 구성: "총 N건/N명" 카운트만
  - Ⅳ-3-다 훈련 교과목 프로파일: 단일 줄 (양식은 15×10 정형 표)
  - Ⅳ-3-라 시설·장비: 텍스트
  - Ⅳ-3-마 훈련강사: 텍스트
- 양식 기준: 정형 표 (시설 명단·강사 명단·교과목 프로파일 등)
- 처리 단계:
  1. R5 PR (#46) 의 `pbl-prompts.ts` 출력 키 (`subject_profile.training_contents` / `facilities[]` / `training_instructors[]`) 확인 + 실제 LLM 결과 fixture 수집
  2. `TabPBLOps.tsx` 의 5 SectionCard 줄글 → `FormTable` 변환 (양식 컬럼·행 1:1 정합)
  3. Ⅳ-3-다 details 머리기호 분리 (#17 PBL — `splitByUnit` 재사용 / 한 셀에 5 항목 줄바꿈)
  4. 단위 테스트 (`TabPBLOps.test.tsx`) — 5 SectionCard 모두 FormTable 렌더 + LLM 결과 fixture 활용

## 브랜치/PR
- 브랜치: feat/tabpblops-iv3-tables
- PR 제목: feat: TabPBLOps Ⅳ-3 5 섹션 표 형태 변환 (#14·#17·#18 PBL)
- PR 본문에 닫는 검수 항목 번호 명시 (#14(PBL)·#17(PBL)·#18(PBL))

## 절차
- TDD 전면 적용 (TabPBLOps 표 렌더 단위 테스트)
- frontend-guide / react-best-practices 스킬 호출
- HWPX 검증은 npm run dev:hwpx + npm run dev:with-hwpx 브리지 서버로 로컬 확인 (Ⅳ-3 5 placeholder P-18~P-22 표 정합)
- 분기 커버리지 83% 이상 유지 (R8 에서 도달한 threshold)
- 모든 check (Lint & Typecheck · Unit Test · Build · E2E · Vercel) pass → findings.md 업데이트 → 머지 대기

## 참고
- R8 PR #48 머지 완료 (3462f45) — PBL-자체-01·02·03·04·05 5건 닫힘
- 마이그 071 (projects 5컬럼) 적용 완료 — `business_reg_no` / `industry_code` / `training_address` / `jurisdiction_branch` / `contact_position`
- 본 라운드는 PBL 검수 항목 마지막 잔여분이라 R9 종료 후 PBL 측 findings.md 모든 항목 [해결됨] 마감
