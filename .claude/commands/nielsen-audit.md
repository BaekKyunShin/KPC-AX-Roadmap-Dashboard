---
description: Nielsen 10가지 사용성 휴리스틱 기준으로 본 프로젝트 UX/UI를 감사하고 docs/reports/에 5단 포맷 보고서를 작성한다.
argument-hint: [영역명?]
---

`nielsen-audit` 스킬을 호출하여 **$ARGUMENTS** 영역(미지정 시 전수)에 대해 Nielsen 10가지 사용성 휴리스틱 기반 UX/UI 감사를 수행하고, `docs/reports/YYYY-MM-DD-nielsen-heuristics-audit.md` 에 보고서를 작성한다.

요구사항:

- 같은 날짜에 동일 보고서가 이미 존재하면 `-v2`, `-v3` … 접미사 자동 부여 (덮어쓰기 금지)
- 한 세션 내(≈ 3시간) 해결 가능한 가장 크리티컬한 5~8개 이슈만 선별
- 각 이슈는 **5단 포맷** 으로 기재:
  1. 위치 (메뉴 경로 + 파일 경로)
  2. 사용자 시나리오 (페르소나·동선·체감 결함, 비개발자 톤)
  3. 위배 원칙 (H1~H10)
  4. 사용자 관점 개선 후 (구체 라벨·메시지·플로우 변화)
  5. 개발자 구현 노트 (코드 변경 위치·재사용 자산·짧은 예시)
- 기존 자산(`EmptyState`, `AlertDialog`, `showSuccessToast` 등) 재사용을 우선
- 모범 보고서: `docs/reports/2026-04-30-nielsen-heuristics-audit.md` 참조

자세한 절차·템플릿·휴리스틱 정의는 `.claude/skills/nielsen-audit/SKILL.md` 에 있다.
