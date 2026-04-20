-- ============================================================
-- 065_add_interview_attachments.sql
-- 인터뷰 단계에서 사용하는 첨부파일용 Storage 버킷
-- - 1차 사용처: 산인공 양식 1번 Ⅱ-1 "기업 AI 역량 수준 진단"
--   (기업HRD이음컨설팅 보고서 PDF 등)
-- - 향후 분석 노트(analysis_notes.attachment_urls) 첨부도 동일 버킷 사용 가능
-- - 경로 규칙: <project_id>/<random>-<filename>
--
-- 주의:
-- - DB 테이블/컬럼은 추가하지 않는다 (interview-roadmap 스키마의 jsonb 필드만 사용)
-- - storage.buckets 등록 + storage.objects RLS 정책만 정의
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'interview-attachments',
  'interview-attachments',
  false,
  20971520, -- 20MB (HRD이음 보고서가 보통 1~5MB라 충분)
  ARRAY[
    'application/pdf',
    'application/vnd.hancom.hwpx',
    'application/x-hwp',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
)
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ============================================================
-- RLS: storage.objects
--   - 조회: 운영자(OPS_ADMIN+) 전체, 컨설턴트는 자신이 배정된 프로젝트의 첨부만
--   - 업로드/수정/삭제: 컨설턴트는 자신이 배정된 프로젝트만, 운영자는 전체
--
-- 경로 첫 세그먼트가 project_id (UUID) 라고 가정.
-- (storage.foldername(name)[1] = project_id)
-- ============================================================

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
            AND p.assigned_consultant_id = auth.uid()
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
            AND p.assigned_consultant_id = auth.uid()
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
            AND p.assigned_consultant_id = auth.uid()
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
            AND p.assigned_consultant_id = auth.uid()
        )
      )
    )
  );
