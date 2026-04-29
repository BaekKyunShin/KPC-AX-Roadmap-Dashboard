로드맵·PBL 양식 정합성 매트릭스를 산출해줘. 코드는 절대 수정하지 말고 문서만 만들어.

## 입력
- docs/plans/2026-04-29-roadmap-review-findings.md (검수 결과 21건 + 공통 3건, 단일 진실 원천)
- 양식 원본:
  - docs/references/1.AI훈련로드맵 컨설팅 보고서(양식).hwpx
  - docs/references/2.AI PBL 과정개발보고서 및 결과보고서(양식).hwpx
- 비교 대상 코드:
  - 인터뷰 입력: src/app/(dashboard)/consultant/projects/[id]/interview/
  - 결과 페이지: src/app/(dashboard)/consultant/projects/[id]/{roadmap,pbl}/
  - HWPX 플레이스홀더: api/hwpx/_placeholders_{roadmap,pbl}.py
  - HWPX 템플릿: templates/hwpx/{roadmap,pbl}.hwpx

## 공통 진행 규칙 (이번 라운드 및 이후 모든 라운드 공통)
1. 시작 시 findings.md 를 먼저 읽고 본 라운드 범위 항목 + 이미 [해결됨] 표시된 항목 + 다른 라운드 메모 확인
2. 작업 중 신규 결함 발견 시 findings.md 의 마지막 "## 추가 발견 사항" 섹션(없으면 신설)에 #NN 형식으로 추가 (페이지·증상·기대·발견 라운드 포함)
3. 작업 중 다른 라운드 항목에 영향 주는 사실 발견 시 해당 항목 본문 끝에 "> 메모(YYYY-MM-DD, R0로부터 발견): 내용" 한 줄 추가
4. PR 머지 직전: 본 PR 이 닫는 항목 모두에 [해결됨][PR #N] YYYY-MM-DD 표기 + 같은 PR diff 안에 findings.md 변경 포함
5. 머지는 사용자 명시 승인("머지해") 후에만 진행

## 본 라운드 (R0) 범위
- 양식 원본 ↔ 인터뷰 입력 ↔ 결과 페이지 ↔ HWPX 플레이스홀더 4중 비교
- general-purpose 에이전트 2개 병렬 디스패치 (로드맵 / PBL)
- 텍스트 추출은 .venv-hwpx/bin/hwpx-text-extract 또는 pdftotext 사용

## 항목별 비교 5가지
① 항목명 (양식 vs 인터뷰 vs 결과 vs HWPX 4 위치 모두)
② 작성안내 (양식 누락 문구)
③ 작성예시 (양식엔 있으나 코드엔 없는 것)
④ HWPX 플레이스홀더 매핑 (#20·#21 관련)
⑤ 결과 페이지 표시 구조 (#14·#17·#18 관련)

검수 21건 + 공통 3건 중 매트릭스 대상(#5, #10, #12, #14, #15, #17, #18, #20, #21, 공통-A) 매핑.

## 산출물
- docs/plans/2026-04-29-roadmap-form-matrix.md
- docs/plans/2026-04-29-pbl-form-matrix.md
- 각 문서 끝에 "수정 권장 체크리스트" 섹션:
  - 머리말 한 줄: "본 문서는 사용자가 직접 ☐ → ☑(수정 진행) 또는 ☒(유지) 로 편집해 R3 입력으로 사용한다. 별도 파일·슬롯 없음."
  - 모든 항목을 ☐ 로 시작하는 체크박스 리스트 형식
  - 항목별로 #NN 검수 번호 + 한 줄 요약 + 양식↔코드 차이 한 줄

## 종료 조건
- 코드 변경 없음. PR 만들지 마. 브랜치 만들지 마.
- main 작업트리에서 문서 2개만 생성.
- 끝나면 산출 파일 경로와 핵심 차이 요약 5줄로 보고.
