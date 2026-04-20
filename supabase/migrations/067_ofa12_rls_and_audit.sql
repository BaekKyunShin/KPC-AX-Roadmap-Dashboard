-- ============================================
-- 067: OFA-12 후속 정리 — RLS initplan 래핑 + 감사 enum 확장
-- 배경:
--   (1) 마이그 065 의 interview-attachments storage 정책 4개가 `auth.uid()` 를
--       `(SELECT auth.uid())` 로 래핑하지 않아 초기 계획(initplan) 최적화를 놓치고
--       row-by-row 재평가가 발생한다. 048 공식 패턴 위반.
--   (2) 갤러리 `toggleShare` / 컨설턴트 `toggleRoadmapShare` 감사로그용 ENUM 값이 없다.
--       운영 감사 추적을 위해 `ROADMAP_SHARED` 추가.
-- ============================================

-- ────────────────────────────────────────────
-- 1. audit_action ENUM 확장 — ROADMAP_SHARED
--    (ENUM ADD VALUE 는 트랜잭션 내 사용을 피하려고 별도 블록으로 실행)
-- ────────────────────────────────────────────
ALTER TYPE audit_action ADD VALUE IF NOT EXISTS 'ROADMAP_SHARED';

-- ────────────────────────────────────────────
-- 2. interview-attachments storage RLS — auth.uid() initplan 래핑
-- ────────────────────────────────────────────
DROP POLICY IF EXISTS "interview_attachments_select" ON storage.objects;
CREATE POLICY "interview_attachments_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'interview-attachments'
    AND (
      is_ops_admin_or_higher()
      OR (
        is_approved_consultant()
        AND EXISTS (
          SELECT 1
          FROM public.projects p
          WHERE p.id::text = (storage.foldername(name))[1]
            AND p.assigned_consultant_id = (SELECT auth.uid())
        )
      )
    )
  );

DROP POLICY IF EXISTS "interview_attachments_insert" ON storage.objects;
CREATE POLICY "interview_attachments_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'interview-attachments'
    AND (
      is_ops_admin_or_higher()
      OR (
        is_approved_consultant()
        AND EXISTS (
          SELECT 1
          FROM public.projects p
          WHERE p.id::text = (storage.foldername(name))[1]
            AND p.assigned_consultant_id = (SELECT auth.uid())
        )
      )
    )
  );

DROP POLICY IF EXISTS "interview_attachments_update" ON storage.objects;
CREATE POLICY "interview_attachments_update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'interview-attachments'
    AND (
      is_ops_admin_or_higher()
      OR (
        is_approved_consultant()
        AND EXISTS (
          SELECT 1
          FROM public.projects p
          WHERE p.id::text = (storage.foldername(name))[1]
            AND p.assigned_consultant_id = (SELECT auth.uid())
        )
      )
    )
  );

DROP POLICY IF EXISTS "interview_attachments_delete" ON storage.objects;
CREATE POLICY "interview_attachments_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'interview-attachments'
    AND (
      is_ops_admin_or_higher()
      OR (
        is_approved_consultant()
        AND EXISTS (
          SELECT 1
          FROM public.projects p
          WHERE p.id::text = (storage.foldername(name))[1]
            AND p.assigned_consultant_id = (SELECT auth.uid())
        )
      )
    )
  );
