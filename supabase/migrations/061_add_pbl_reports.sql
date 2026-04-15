-- ============================================================
-- 061_add_pbl_reports.sql
-- 목적: PBL 트랙 산출물(pbl_reports) + 좋아요(pbl_likes) + audit_action 확장 + finalize_pbl RPC
-- OFA 개편 Step 2
-- ============================================================

-- ------------------------------------------------------------
-- audit_action ENUM 확장 — Step 4·7·8·9·10에서 사용할 모든 신규 값 일괄 선언
-- 이유: 각 Step 시작 시점에 DB에 해당 enum 값이 이미 존재해야
--       createAuditLog가 실패하지 않는다. Step 12로 미루면 Step 4~10 실행 불가.
-- ------------------------------------------------------------
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'NOTICE_CREATED';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'NOTICE_UPDATED';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'NOTICE_DELETED';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'ROADMAP_HWPX_EXPORTED';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'PBL_INTERVIEW_SAVED';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'PBL_REPORT_CREATED';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'PBL_REPORT_FINALIZED';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'PBL_REPORT_SHARED';
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'PBL_HWPX_EXPORTED';

-- ------------------------------------------------------------
-- PBL 보고서 상태 ENUM (roadmap_version_status와 동일 값이지만 독립 ENUM으로 유지해
-- PBL 상태 확장 시 로드맵 테이블에 영향 없도록 한다)
-- ------------------------------------------------------------
CREATE TYPE pbl_report_status AS ENUM ('DRAFT', 'FINAL', 'ARCHIVED');

-- ------------------------------------------------------------
-- pbl_reports 테이블 (roadmap_versions 패턴 준용)
-- ------------------------------------------------------------
CREATE TABLE pbl_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  status pbl_report_status NOT NULL DEFAULT 'DRAFT',

  -- 컨설턴트 프로필 스냅샷 (roadmap_versions 패턴 동일: NOT NULL + DEFAULT '{}')
  consultant_profile_snapshot JSONB NOT NULL DEFAULT '{}',
  diagnosis_summary TEXT NOT NULL DEFAULT '',
  -- PBL 보고서 본문 — JSONB. 도메인 타입은 Step 9의 src/lib/services/pbl/pbl-types.ts (PBLContent),
  -- LLM 출력 검증은 src/lib/services/pbl/pbl-validator.ts에서 처리.
  pbl_content JSONB NOT NULL DEFAULT '{}',

  free_tool_validated BOOLEAN NOT NULL DEFAULT false,
  time_limit_validated BOOLEAN NOT NULL DEFAULT false,
  revision_prompt TEXT,
  is_shared BOOLEAN NOT NULL DEFAULT false,
  like_count INTEGER NOT NULL DEFAULT 0,  -- 비정규화 캐시, 아래 트리거로 자동 갱신

  -- roadmap_versions 패턴: created_by는 NOT NULL + ON DELETE RESTRICT
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  finalized_by UUID REFERENCES users(id) ON DELETE SET NULL,
  finalized_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (project_id, version_number)
);

CREATE INDEX idx_pbl_reports_project_id ON pbl_reports (project_id);
CREATE INDEX idx_pbl_reports_status_final ON pbl_reports (project_id) WHERE status = 'FINAL';
-- 갤러리 조회 최적화: is_shared=true AND status='FINAL' 복합 인덱스(마이그 055 패턴)
CREATE INDEX idx_pbl_reports_shared_final
  ON pbl_reports (is_shared, status, created_at DESC)
  WHERE is_shared = true AND status = 'FINAL';
CREATE INDEX idx_pbl_reports_like_count ON pbl_reports (like_count DESC);

-- JSONB 크기 제한 (기존 050 패턴 준용: octet_length(col::TEXT))
-- 500KB ≒ roadmap_versions.pbl_course(1MB)의 절반. PBL 보고서 본문은 LLM 생성 JSON 1개이므로 500KB로 충분.
ALTER TABLE pbl_reports
  ADD CONSTRAINT chk_pbl_content_size
    CHECK (octet_length(pbl_content::TEXT) < 524288);

COMMENT ON CONSTRAINT chk_pbl_content_size ON pbl_reports IS 'JSONB 크기 제한: 512KB';

-- ------------------------------------------------------------
-- RLS
-- 실제 프로젝트 기존 헬퍼 함수 활용 (모두 인자 없음 또는 project_id UUID 하나):
--   is_assigned_to_project(p_project_id UUID)  — 프로젝트 배정 여부 (projects.assigned_consultant_id 기반)
--   is_ops_admin_or_higher()                   — OPS_ADMIN + SYSTEM_ADMIN 포괄
--   is_approved_consultant()                   — 승인된 컨설턴트 여부
-- 모든 정책에서 auth.uid()는 (SELECT auth.uid()) 래핑 금지: 헬퍼 함수가 이미 내부에서 래핑함(마이그 048).
-- ------------------------------------------------------------
ALTER TABLE pbl_reports ENABLE ROW LEVEL SECURITY;

-- 컨설턴트는 자신에게 배정된 프로젝트의 PBL만 조회 + ops + 갤러리 공유 조건
CREATE POLICY pbl_reports_select ON pbl_reports
  FOR SELECT USING (
    is_assigned_to_project(pbl_reports.project_id)
    OR is_ops_admin_or_higher()
    -- 갤러리 공유 조건: FINAL이고 is_shared=true일 때만 로그인 사용자 전체 열람
    OR (is_shared = true AND status = 'FINAL' AND (SELECT auth.uid()) IS NOT NULL)
  );

-- 마이그 033 교훈 준수: 배정 확인과 승인 상태를 반드시 AND로 결합.
-- USER_PENDING이 assigned_consultant_id에 등록된 엣지 케이스 차단.
CREATE POLICY pbl_reports_insert_consultant ON pbl_reports
  FOR INSERT WITH CHECK (
    is_approved_consultant()
    AND is_assigned_to_project(pbl_reports.project_id)
  );

CREATE POLICY pbl_reports_update_consultant ON pbl_reports
  FOR UPDATE USING (
    is_approved_consultant()
    AND is_assigned_to_project(pbl_reports.project_id)
    AND status != 'ARCHIVED'
  );

-- ops admin(= OPS_ADMIN + SYSTEM_ADMIN)은 모든 권한
CREATE POLICY pbl_reports_ops_all ON pbl_reports
  FOR ALL USING (is_ops_admin_or_higher())
  WITH CHECK (is_ops_admin_or_higher());

-- ============================================================
-- pbl_likes 테이블 + 트리거 (roadmap_likes / 마이그 024·056 패턴 복제)
-- like_count 캐시 컬럼을 자동 증감하기 위한 구조.
-- ============================================================
CREATE TABLE pbl_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pbl_report_id UUID NOT NULL REFERENCES pbl_reports(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (user_id, pbl_report_id)
);

CREATE INDEX idx_pbl_likes_report ON pbl_likes (pbl_report_id);
CREATE INDEX idx_pbl_likes_user ON pbl_likes (user_id);

ALTER TABLE pbl_likes ENABLE ROW LEVEL SECURITY;

-- 조회: 모든 로그인 사용자 (roadmap_likes와 동일)
CREATE POLICY pbl_likes_select_authenticated ON pbl_likes
  FOR SELECT USING ((SELECT auth.uid()) IS NOT NULL);

-- 추가: 본인 좋아요만
CREATE POLICY pbl_likes_insert_own ON pbl_likes
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

-- 삭제: 본인 좋아요만
CREATE POLICY pbl_likes_delete_own ON pbl_likes
  FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- like_count 자동 증감 트리거 (마이그 056 패턴 + 026의 search_path = '' 보안 강화)
CREATE OR REPLACE FUNCTION public.increment_pbl_like_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  UPDATE public.pbl_reports
    SET like_count = like_count + 1
    WHERE id = NEW.pbl_report_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.decrement_pbl_like_count()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  UPDATE public.pbl_reports
    SET like_count = GREATEST(like_count - 1, 0)
    WHERE id = OLD.pbl_report_id;
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_increment_pbl_like_count
  AFTER INSERT ON pbl_likes
  FOR EACH ROW EXECUTE FUNCTION public.increment_pbl_like_count();

CREATE TRIGGER trg_decrement_pbl_like_count
  AFTER DELETE ON pbl_likes
  FOR EACH ROW EXECUTE FUNCTION public.decrement_pbl_like_count();

COMMENT ON TABLE pbl_reports IS 'PBL 트랙 프로젝트의 산출물(문제해결형 AI+직무 훈련과정 개발보고서). roadmap_versions와 평행 구조.';
COMMENT ON TABLE pbl_likes IS 'PBL 갤러리 좋아요. roadmap_likes와 평행 구조.';

-- ============================================================
-- finalize_pbl RPC — 마이그 036(public.finalize_roadmap)와 정확히 동일한 패턴
-- 함수명 컨벤션: 실제 함수 이름은 atomic 접두사 없이 finalize_pbl (파일명에는 atomic)
-- 반환: JSONB ({success, error, project_id, version_number})
-- 보안: SECURITY INVOKER + search_path = '' (마이그 026·030·036 컨벤션)
-- 잠금: FOR UPDATE로 동시 요청 직렬화
-- 검증: 컨설턴트 배정 + DRAFT 상태 + 트랙=PBL 모두 함수 내부에서
-- 부수 효과: pbl_reports FINAL/ARCHIVED 전환 + projects.status를 FINALIZED로 함께 전환
-- 본 RPC를 Step 9 Task 6의 finalizePBL이 호출. Step 12로 미루면 Step 9 실행 불가.
-- ============================================================
CREATE OR REPLACE FUNCTION public.finalize_pbl(
  p_pbl_report_id UUID,
  p_actor_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_project_id UUID;
  v_version_number INT;
  v_assigned_consultant_id UUID;
  v_pbl_status TEXT;
  v_track TEXT;
BEGIN
  -- 1. PBL 보고서 + 프로젝트 조회 (FOR UPDATE로 동시 요청 직렬화)
  SELECT pr.project_id, pr.version_number, p.assigned_consultant_id, pr.status::TEXT, p.track::TEXT
  INTO v_project_id, v_version_number, v_assigned_consultant_id, v_pbl_status, v_track
  FROM public.pbl_reports pr
  INNER JOIN public.projects p ON p.id = pr.project_id
  WHERE pr.id = p_pbl_report_id
  FOR UPDATE OF pr;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'PBL 보고서를 찾을 수 없습니다.'
    );
  END IF;

  -- 2. 트랙 검증 (잘못된 트랙으로 finalize 시도 차단)
  IF v_track != 'PBL' THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'PBL 트랙 프로젝트의 보고서만 finalize_pbl로 확정할 수 있습니다.'
    );
  END IF;

  -- 3. DRAFT 상태만 확정 가능
  IF v_pbl_status != 'DRAFT' THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'DRAFT 상태의 PBL 보고서만 최종 확정할 수 있습니다.'
    );
  END IF;

  -- 4. 배정된 컨설턴트 확인
  IF v_assigned_consultant_id != p_actor_user_id THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', '배정된 컨설턴트만 최종 확정할 수 있습니다.'
    );
  END IF;

  -- 5. 기존 FINAL → ARCHIVED (같은 트랜잭션 내)
  UPDATE public.pbl_reports
  SET status = 'ARCHIVED',
      updated_at = NOW()
  WHERE project_id = v_project_id
    AND status = 'FINAL';

  -- 6. 현재 PBL → FINAL
  UPDATE public.pbl_reports
  SET status = 'FINAL',
      finalized_by = p_actor_user_id,
      finalized_at = NOW(),
      updated_at = NOW()
  WHERE id = p_pbl_report_id;

  -- 7. 프로젝트 상태 → FINALIZED (이미 FINALIZED면 불필요한 UPDATE 방지)
  UPDATE public.projects
  SET status = 'FINALIZED'
  WHERE id = v_project_id
    AND status != 'FINALIZED';

  RETURN jsonb_build_object(
    'success', TRUE,
    'project_id', v_project_id,
    'version_number', v_version_number
  );
END;
$$;

COMMENT ON FUNCTION public.finalize_pbl IS
  '원자적 PBL 보고서 확정. 기존 FINAL→ARCHIVED + 현재→FINAL + 프로젝트 FINALIZED를 단일 트랜잭션으로 실행. 마이그 036 finalize_roadmap과 동일 패턴.';
