로드맵 결과 출력 품질을 향상시키는 PR (LLM 프롬프트 수정) 진행해줘.

## 입력
- docs/plans/2026-04-29-roadmap-review-findings.md

## 공통 진행 규칙
1. 시작 시 findings.md 를 먼저 읽고 본 라운드 범위 + 이미 [해결됨] 표시된 항목 + 다른 라운드 메모 확인
2. 작업 중 신규 결함 발견 시 findings.md 의 "## 추가 발견 사항" 섹션에 추가
3. 작업 중 다른 라운드 항목에 영향 주는 사실 발견 시 해당 항목에 "> 메모(YYYY-MM-DD, R5로부터 발견): 내용" 추가
4. PR 머지 직전: 본 PR 이 닫는 항목에 [해결됨][PR #N] YYYY-MM-DD 표기 + findings.md 변경 같은 PR 에 포함
5. 머지는 사용자 명시 승인 후에만 진행

## 본 라운드 (R5) 범위
- #16 Ⅲ-3 비고: 특이사항 없으면 빈칸
- #17 Ⅲ-4 교과목 세부내용 머리기호, 교과목당 2~5 항목
  > 메모(2026-04-29, R3 PR2로부터): 결과 페이지 렌더(splitByUnit + ul 머리기호 분리)는 R3 PR2 에서 선처리됨. R5 는 LLM 프롬프트 측 `subjects[].details` 다항목 출력 (string → string[] 또는 줄바꿈 분리 string) 만 담당.
- ~~#18 Ⅲ-4 교과목 표 형태 출력~~ — **R3 PR2 (양식 정합성 정정) 에서 결과 페이지 ul → FormTable 3열 (교과목명 / 세부 내용 / 훈련시간) 변경으로 처리 완료. R5 범위에서 제외.**

## 브랜치/PR
- 브랜치: feat/roadmap-prompt-improvement
- PR 제목: feat: 로드맵 결과 출력 품질 향상 (비고·교과목 명세서)
- PR 본문에 닫는 검수 항목 번호 명시

## 절차
- prompt-engineer 서브에이전트 활용
- src/lib/services/roadmap/ 프롬프트 모듈 수정
- 출력 형식 Zod 스키마 검증 강화
- LLM 호출 비용 보호 위해 통합 테스트는 모킹
- 모든 check pass → findings.md 업데이트 → 머지 대기
