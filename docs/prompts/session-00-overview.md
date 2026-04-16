# OFA 세션별 실행 프롬프트 가이드 (개요)

> **OFA = Official Form Alignment** = 산인공 공식 양식 정렬 프로젝트
> 마스터 계획서: [`docs/plans/2026-04-14-official-form-alignment.md`](../plans/2026-04-14-official-form-alignment.md)

본 디렉터리(`docs/prompts/`)는 OFA 프로젝트를 새 세션에서 단계별로 실행하기 위한 **복사·붙여넣기용 프롬프트**를 모아둔 공간입니다. 각 파일은 **자체 포함**되어 있어 새 세션을 열어 해당 파일의 "복사용 프롬프트" 블록만 붙여넣으면 작업이 시작됩니다.

---

## 진행 표

| # | 파일 | 다루는 Step | 규모 | 의존 | 세션 모드 |
|---|---|---|---|---|---|
| 1 | [session-01-step1-setup.md](session-01-step1-setup.md) | Step 1 (메인 브랜치 + 스킬 설치 + 계획서 커밋) | XS (4 Task) | — | inline |
| 2 | [session-02-step2-db-foundation.md](session-02-step2-db-foundation.md) | Step 2 (DB 스키마 기반) | M (15 Task) | Step 1 | subagent-driven |
| 3 | [session-03-step3-4-parallel.md](session-03-step3-4-parallel.md) | Step 3 + Step 4 (병렬 — HWPX PoC + 공지 게시판) | S(12) + M(10) | Step 2 | dispatching-parallel-agents |
| 4 | [session-04-step5-roadmap-interview.md](session-04-step5-roadmap-interview.md) | Step 5 (로드맵 인터뷰 산인공 양식) | L (13 Task) | Step 2 | subagent-driven |
| 5 | [session-05-step6-roadmap-output.md](session-05-step6-roadmap-output.md) | Step 6 (로드맵 산출물 양식 정렬) | L (16 Task) | Step 5 | subagent-driven |
| 5b | [session-05b-step6.5-form-compliance.md](session-05b-step6.5-form-compliance.md) | **Step 6.5 (로드맵 양식 정합성 보강 — Ⅰ장 인터뷰·NCS 박스·수립 방법)** | M (12 Task) | Step 5·6 | subagent-driven |
| 6 | [session-06-step7-roadmap-hwpx.md](session-06-step7-roadmap-hwpx.md) | Step 7 (로드맵 HWPX 템플릿·내보내기) | M (11 Task) | Step 3·6·**6.5** | subagent-driven |
| 7 | [session-07-step8-pbl-interview.md](session-07-step8-pbl-interview.md) | Step 8 (PBL 인터뷰 신규 — 9스텝 양식 2번 Ⅰ~Ⅲ장 1:1) | L (19 Task) | Step 2·5 | subagent-driven |
| 8 | [session-08-step9-pbl-output.md](session-08-step9-pbl-output.md) | Step 9 (PBL 산출물 신규 — 양식 2번 Ⅳ·Ⅴ장 1:1) | XL (20 Task) | Step 8 | subagent-driven |
| 9 | [session-09-step10-pbl-hwpx.md](session-09-step10-pbl-hwpx.md) | Step 10 (PBL HWPX 템플릿·내보내기) | M (11 Task) | Step 3·9 | subagent-driven |
| 10 | [session-10-step11-gallery.md](session-10-step11-gallery.md) | Step 11 (갤러리 트랙 + PBL 테스트 페이지) | M (10 Task) | Step 6.5·9 | subagent-driven |
| 11 | [session-11-step12-final-qa.md](session-11-step12-final-qa.md) | Step 12 (최종 QA·문서·배포 점검 + 양식 1·2번 1:1 검증) | M (10 Task) | 전부 | subagent-driven |

**합계**: 13 Step (Step 6.5 포함) / 153 Task / 12 세션.

---

## 세션 운용 원칙

1. **한 세션 = 한 PR**. 세션이 끝나면 해당 서브 브랜치를 `feature/official-form-alignment`로 PR 생성 + 사람 승인 후 머지.
2. **새 세션 = 새 컨텍스트**. 매 세션 시작 시 해당 파일의 프롬프트만 붙여넣으면 됨. 이전 세션의 대화 흐름을 기억할 필요 없음.
3. **모든 세션에 자동 적용되는 보장사항** (마스터 계획서 §0 안전장치):
   - (a) 서브 PR base = `feature/official-form-alignment` (절대 main 직접 X)
   - (b) main 머지는 Step 12 완료 후 1회만
   - (c) 서브 브랜치 푸시는 Vercel Preview만 생성 (Production = main 단일 고정)
   - (d) 사람 승인 없이 자동 머지·force push 금지
4. **TDD Iron Law** (마스터 계획서 상단): 모든 프로덕션 코드는 RED → Verify RED → GREEN → Verify GREEN → REFACTOR. 예외는 설정 파일·DDL·HWPX 템플릿·정적 자산만.
5. **체크포인트 승인**: 각 Task가 끝나면 다음 Task로 넘어가도 되는지 확인. 다만 통상적인 진행은 자율 진행하고, **분기 결정·아키텍처 변경·실패 발생 시에만 사용자 승인 요청**.

---

## 사용 방법

1. 새 세션을 연다 (`claude` CLI 또는 Claude Code).
2. 진행 표에서 다음 세션 파일을 선택.
3. 해당 파일의 **"복사용 프롬프트"** 블록을 통째로 복사해 붙여넣는다.
4. Claude가 마스터 계획서를 읽고 `subagent-driven-development` 또는 `executing-plans` 스킬로 진행.
5. 종료 시 Claude가 **"사용자에게 전달할 검증 안내"** 블록을 출력 — 거기에 적힌 대로만 확인하면 됨.
6. PR 머지 후 다음 세션으로.

## 사용자 검토 원칙 (중요)

각 세션 종료 시 Claude가 **"사용자가 localhost에서 X·Y·Z만 확인하세요"**라고 안내합니다. 그대로 따르면 됩니다.

- **화면으로 보이는 것**: 사용자가 localhost에서 직접 확인 (Step별 5~20분)
- **DB·보안·성능 등 비시각적 영역**: Claude에게 "검증해줘" 한 줄로 위임
- **HWPX 한글 파일**: Step 7·10·12에서 Vercel Preview URL로 다운받아 한글 프로그램에서 열어보기 (이것만은 사람이 직접)

복잡한 검토는 Claude가 대신합니다. 사용자는 "눈에 보이는 것"만 확인하면 충분합니다.

---

## 비상 절차

- **PoC 실패** (Step 3에서 Vercel Python Function 미작동): session-03을 중단하고 마스터 계획서 §6 리스크 매트릭스의 "(B) 별도 마이크로서비스 선회" 옵션 검토. 세션 종료 후 사용자와 아키텍처 결정 재논의.
- **마이그레이션 실패** (Step 2): Supabase MCP 브랜치 DB만 영향. `mcp__supabase__delete_branch`로 브랜치 삭제 후 재시도.
- **세션 중 컨텍스트 초과**: 현재 진행 상황을 PR 코멘트로 기록 후 새 세션에서 동일 프롬프트로 재진입(미완료 Task부터 자동 계속).
