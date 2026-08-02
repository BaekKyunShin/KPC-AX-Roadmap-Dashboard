-- ============================================
-- 081: AI 산출물 저장·상태 전이 원자화 RPC 3종 (P6 2차)
--
-- 배경: 로드맵·PBL·매칭 추천은 산출물 INSERT 후 projects.status UPDATE 라는
--   2단계로 나뉘어 있어, 뒷단계만 실패하면 산출물은 DB 에 남고 목록 상태는 이전
--   단계에 머무는 desync 가 생긴다. 1차(PR #138)는 error 로깅만 추가해 사후 추적만
--   가능하게 했을 뿐 어긋남 자체를 막지 못했다. 특히 로드맵 경로는 전이 실패와
--   무관하게 로드맵 초안 생성 관리자 알림을 보내므로 알림과 목록이 모순된다.
--
-- 설계: 036(finalize_roadmap) 패턴 계승 — SECURITY INVOKER + search_path = ''
--   + FOR UPDATE + jsonb 반환({success, error} 판별 유니온). 호출은 admin
--   client(service_role) 전용이라 RLS 변경 불필요(076 헤더와 동일 판단).
--   전이 규칙의 단일 출처는 TypeScript(ALLOWED_STATUS_TRANSITIONS)에 그대로 둔다:
--   호출부가 전이 여부를 판단해 p_transition_to_status 로 넘기고(NULL 이면 미전이),
--   함수는 자기 목표 상태와 일치하는지만 방어적으로 확인한다. SQL 에 전이 규칙을
--   복제하지 않아 규칙이 두 곳으로 갈리지 않는다.
--   상태 UPDATE 에는 036 과 동일한 멱등 가드(현재 상태와 다를 때만 UPDATE)를 둔다.
--
-- 구성: save_roadmap_draft · save_pbl_draft · save_matching_recommendations.
--   신규 테이블·컬럼·enum 없음.
-- 함수명 컨벤션(엄수, 061 헤더와 동일): 이름에 atomic 을 넣지 않는다. 파일명에만 쓴다.
--   supabase CLI 마이그레이션 파서가 함수명 안의 atomic 을 PostgreSQL 14+ 의
--   BEGIN ATOMIC 함수 본문으로 오인해 statement 분할에 실패하고, 파일 전체를 한 개
--   구문으로 보내 cannot insert multiple commands 오류를 낸다(로컬 실측).
-- ============================================

-- -------- 1) 로드맵 버전 저장 + 상태 전이 --------
CREATE OR REPLACE FUNCTION public.save_roadmap_draft(
  p_project_id UUID,
  p_version_number INT,
  p_consultant_profile_snapshot JSONB,
  p_diagnosis_summary TEXT,
  p_roadmap_matrix JSONB,
  p_pbl_course JSONB,
  p_courses JSONB,
  p_revision_prompt TEXT,
  p_created_by UUID,
  p_transition_to_status TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_current_status TEXT;
  v_roadmap_id UUID;
BEGIN
  -- 1. 프로젝트 잠금 (동시 생성 직렬화 — 036 패턴)
  SELECT status::TEXT
  INTO v_current_status
  FROM public.projects
  WHERE id = p_project_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', '프로젝트를 찾을 수 없습니다.');
  END IF;

  -- 2. 전이 대상 방어 검증 (전이 가능 여부 판단 자체는 호출부 책임)
  IF p_transition_to_status IS NOT NULL AND p_transition_to_status != 'ROADMAP_DRAFTED' THEN
    RETURN jsonb_build_object('success', FALSE, 'error', '허용되지 않은 상태 전이입니다.');
  END IF;

  -- 3. 로드맵 버전 저장
  INSERT INTO public.roadmap_versions (
    project_id,
    version_number,
    status,
    consultant_profile_snapshot,
    diagnosis_summary,
    roadmap_matrix,
    pbl_course,
    courses,
    revision_prompt,
    free_tool_validated,
    time_limit_validated,
    created_by
  ) VALUES (
    p_project_id,
    p_version_number,
    'DRAFT'::public.roadmap_version_status,
    COALESCE(p_consultant_profile_snapshot, '{}'::JSONB),
    COALESCE(p_diagnosis_summary, ''),
    COALESCE(p_roadmap_matrix, '[]'::JSONB),
    COALESCE(p_pbl_course, '{}'::JSONB),
    COALESCE(p_courses, '[]'::JSONB),
    p_revision_prompt,
    TRUE,
    TRUE,
    p_created_by
  )
  RETURNING id INTO v_roadmap_id;

  -- 4. 상태 전이 (같은 트랜잭션 — 여기서 실패하면 3번 INSERT 도 함께 롤백된다)
  IF p_transition_to_status IS NOT NULL THEN
    UPDATE public.projects
    SET status = p_transition_to_status::public.project_status
    WHERE id = p_project_id
      AND status::TEXT != p_transition_to_status;
  END IF;

  RETURN jsonb_build_object('success', TRUE, 'roadmap_id', v_roadmap_id);
END;
$$;

COMMENT ON FUNCTION public.save_roadmap_draft IS
  '원자적 로드맵 DRAFT 생성. roadmap_versions INSERT 와 projects.status 전이를 단일 트랜잭션으로 실행해 산출물·상태 desync 를 차단합니다. p_transition_to_status 가 NULL 이면 상태 전이를 건너뜁니다.';

-- -------- 2) PBL DRAFT 저장 + 상태 전이 --------
CREATE OR REPLACE FUNCTION public.save_pbl_draft(
  p_project_id UUID,
  p_version_number INT,
  p_consultant_profile_snapshot JSONB,
  p_diagnosis_summary TEXT,
  p_pbl_content JSONB,
  p_revision_prompt TEXT,
  p_created_by UUID,
  p_transition_to_status TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_current_status TEXT;
  v_report_id UUID;
  v_report JSONB;
BEGIN
  SELECT status::TEXT
  INTO v_current_status
  FROM public.projects
  WHERE id = p_project_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', '프로젝트를 찾을 수 없습니다.');
  END IF;

  IF p_transition_to_status IS NOT NULL AND p_transition_to_status != 'PBL_DRAFTED' THEN
    RETURN jsonb_build_object('success', FALSE, 'error', '허용되지 않은 상태 전이입니다.');
  END IF;

  INSERT INTO public.pbl_reports (
    project_id,
    version_number,
    status,
    consultant_profile_snapshot,
    diagnosis_summary,
    pbl_content,
    free_tool_validated,
    time_limit_validated,
    revision_prompt,
    created_by
  ) VALUES (
    p_project_id,
    p_version_number,
    'DRAFT'::public.pbl_report_status,
    COALESCE(p_consultant_profile_snapshot, '{}'::JSONB),
    COALESCE(p_diagnosis_summary, ''),
    COALESCE(p_pbl_content, '{}'::JSONB),
    TRUE,
    TRUE,
    p_revision_prompt,
    p_created_by
  )
  RETURNING id INTO v_report_id;

  IF p_transition_to_status IS NOT NULL THEN
    UPDATE public.projects
    SET status = p_transition_to_status::public.project_status
    WHERE id = p_project_id
      AND status::TEXT != p_transition_to_status;
  END IF;

  -- 호출부(createDraftVersion)가 기존과 동일한 row 를 반환할 수 있도록 전체 행을 돌려준다.
  SELECT to_jsonb(r) INTO v_report
  FROM public.pbl_reports r
  WHERE r.id = v_report_id;

  RETURN jsonb_build_object('success', TRUE, 'report', v_report);
END;
$$;

COMMENT ON FUNCTION public.save_pbl_draft IS
  '원자적 PBL DRAFT 생성. pbl_reports INSERT 와 projects.status 전이를 단일 트랜잭션으로 실행합니다. p_transition_to_status 가 NULL 이면 상태 전이를 건너뜁니다.';

-- -------- 3) 매칭 추천 교체 + 상태 전이 --------
-- 기존 코드는 DELETE 후 INSERT 를 별도 쿼리로 수행해, INSERT 가 실패하면 기존
-- 추천이 사라진 채로 남는 문제가 있었다. 단일 트랜잭션으로 묶어 함께 해소한다.
CREATE OR REPLACE FUNCTION public.save_matching_recommendations(
  p_project_id UUID,
  p_recommendations JSONB,
  p_transition_to_status TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_current_status TEXT;
  v_inserted INT := 0;
BEGIN
  SELECT status::TEXT
  INTO v_current_status
  FROM public.projects
  WHERE id = p_project_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', FALSE, 'error', '프로젝트를 찾을 수 없습니다.');
  END IF;

  IF p_transition_to_status IS NOT NULL AND p_transition_to_status != 'MATCH_RECOMMENDED' THEN
    RETURN jsonb_build_object('success', FALSE, 'error', '허용되지 않은 상태 전이입니다.');
  END IF;

  DELETE FROM public.matching_recommendations
  WHERE project_id = p_project_id;

  IF p_recommendations IS NOT NULL AND jsonb_array_length(p_recommendations) > 0 THEN
    INSERT INTO public.matching_recommendations (
      project_id,
      candidate_user_id,
      total_score,
      score_breakdown,
      rationale,
      rank
    )
    SELECT
      p_project_id,
      (rec->>'candidate_user_id')::UUID,
      (rec->>'total_score')::NUMERIC,
      COALESCE(rec->'score_breakdown', '[]'::JSONB),
      -- rationale 은 TEXT 컬럼이고 애플리케이션은 객체를 넣는다.
      -- ->> 는 객체를 JSON 텍스트로 추출하므로 기존 저장 형태와 동일하다.
      rec->>'rationale',
      (rec->>'rank')::INT
    FROM jsonb_array_elements(p_recommendations) AS rec;

    GET DIAGNOSTICS v_inserted = ROW_COUNT;
  END IF;

  IF p_transition_to_status IS NOT NULL THEN
    UPDATE public.projects
    SET status = p_transition_to_status::public.project_status
    WHERE id = p_project_id
      AND status::TEXT != p_transition_to_status;
  END IF;

  RETURN jsonb_build_object('success', TRUE, 'inserted_count', v_inserted);
END;
$$;

COMMENT ON FUNCTION public.save_matching_recommendations IS
  '원자적 매칭 추천 교체. 기존 추천 DELETE + 신규 INSERT + projects.status 전이를 단일 트랜잭션으로 실행합니다. p_transition_to_status 가 NULL 이면(재계산 경로) 상태 전이를 건너뜁니다.';
