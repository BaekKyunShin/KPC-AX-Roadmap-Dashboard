-- 082: 코드가 사용하지만 DB 에 없는 enum 값 보충
--
-- 배경 (2026-08-21 발견)
--  1) `src/types/database.ts` 는 수동 관리 파일이라 DB enum 과 어긋나도 타입 검사를 통과한다.
--     아래 6개 audit_action 값은 타입과 코드에만 있고 마이그레이션이 없었다.
--     `createAuditLog` 가 insert 실패를 삼키므로 감사 기록이 조용히 유실돼 왔다.
--       · PROJECT_DELETE      — 프로젝트 영구 삭제 (실제로 6건이 기록 없이 수행됨)
--       · TEMPLATE_CREATE / TEMPLATE_UPDATE / TEMPLATE_ACTIVATE — 진단 템플릿 관리
--       · TEST_ROADMAP_CREATE / TEST_ROADMAP_REVISE            — /test-roadmap 하네스
--
--  2) 마이그 013 의 두 문장(`user_status.WITHDRAWN`, `audit_action.USER_WITHDRAW`)이
--     운영 DB 에 적용되지 않은 채 남아 있었다. WITHDRAWN 부재로 **회원 탈퇴가 실패**한다.
--     CLAUDE.md 규칙대로 멱등 패치(IF NOT EXISTS)로 재등록한다.
--
-- 주의: PostgreSQL 은 enum 값 삭제를 지원하지 않으므로 이 마이그는 되돌릴 수 없다.
--       `ALTER TYPE ... ADD VALUE` 는 추가된 값을 같은 트랜잭션 안에서 사용할 수 없으니
--       이 파일에서는 값 추가만 하고, 값을 쓰는 DML 은 두지 않는다.

-- 1. 감사로그 액션 — 코드에서 이미 사용 중인 값
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'PROJECT_DELETE';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'TEMPLATE_CREATE';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'TEMPLATE_UPDATE';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'TEMPLATE_ACTIVATE';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'TEST_ROADMAP_CREATE';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'TEST_ROADMAP_REVISE';

-- 2. 마이그 013 재등록 (멱등)
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'USER_WITHDRAW';
ALTER TYPE user_status ADD VALUE IF NOT EXISTS 'WITHDRAWN';
