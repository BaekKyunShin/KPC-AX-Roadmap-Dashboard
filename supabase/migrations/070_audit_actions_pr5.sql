-- ============================================
-- 070: PR5 (R6 spec) — audit_action ENUM 4 종 확장
-- 배경:
--   R6 라운드 spec (`docs/plans/2026-04-29-interview-review-and-result-edit-spec.md`)
--   §3.1 — 결과 페이지 직접 수정 + 인터뷰 검토 페이지 도입에 따라 신규 4 종 추가.
--   - ROADMAP_RESULT_EDITED          : 로드맵 결과 페이지 직접 수정
--   - PBL_REPORT_EDITED              : PBL 결과 페이지 직접 수정
--   - INTERVIEW_FIELD_EDITED         : 인터뷰 검토 페이지 단일 필드 patch
--   - RESULT_REGENERATED_FROM_REVIEW : 검토 페이지 배너 → 결과 재생성 트리거
-- 패턴: 마이그 061 / 067 와 동일 (`ALTER TYPE ... ADD VALUE IF NOT EXISTS`).
-- 주의: ENUM ADD VALUE 는 동일 트랜잭션 내 즉시 사용 불가 — 본 마이그 적용 후
--       후속 마이그/Server Action 에서 사용해야 한다.
-- ============================================

ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'ROADMAP_RESULT_EDITED';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'PBL_REPORT_EDITED';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'INTERVIEW_FIELD_EDITED';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'RESULT_REGENERATED_FROM_REVIEW';
