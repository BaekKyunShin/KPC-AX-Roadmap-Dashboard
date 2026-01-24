/**
 * 로드맵 파일 스토리지 서비스
 * FINAL 버전의 PDF/XLSX 파일 관리
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { generateXLSX } from './export-xlsx';
import type { RoadmapExportData } from './export-pdf';

const BUCKET_NAME = 'roadmap-exports';

/**
 * 스토리지 버킷 초기화 (필요시)
 */
export async function ensureBucketExists(): Promise<void> {
  const supabase = createAdminClient();

  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = buckets?.some(b => b.name === BUCKET_NAME);

  if (!exists) {
    await supabase.storage.createBucket(BUCKET_NAME, {
      public: false,
      fileSizeLimit: 10485760, // 10MB
    });
  }
}

/**
 * FINAL 버전의 XLSX 파일 저장
 */
export async function saveFinalXLSX(
  roadmapId: string,
  caseId: string,
  exportData: RoadmapExportData
): Promise<string | null> {
  try {
    const supabase = createAdminClient();
    await ensureBucketExists();

    // XLSX 생성
    const xlsxBuffer = generateXLSX(exportData);

    // 파일 경로: projects/{caseId}/roadmap_final.xlsx
    const filePath = `projects/${caseId}/roadmap_final.xlsx`;

    // 기존 파일 삭제 (있으면)
    await supabase.storage.from(BUCKET_NAME).remove([filePath]);

    // 새 파일 업로드
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, xlsxBuffer, {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        upsert: true,
      });

    if (error) {
      console.error('[saveFinalXLSX] Upload error:', error);
      return null;
    }

    // DB에 파일 경로 저장
    await supabase
      .from('roadmap_versions')
      .update({ storage_path_xlsx: filePath })
      .eq('id', roadmapId);

    return filePath;
  } catch (error) {
    console.error('[saveFinalXLSX] Error:', error);
    return null;
  }
}

/**
 * 이전 FINAL 버전의 스토리지 파일 삭제
 */
export async function cleanupOldFinalFiles(caseId: string): Promise<void> {
  try {
    const supabase = createAdminClient();

    // 이전 FINAL의 파일 경로 조회
    const { data: oldFinal } = await supabase
      .from('roadmap_versions')
      .select('storage_path_xlsx, storage_path_pdf')
      .eq('project_id', caseId)
      .eq('status', 'FINAL')
      .single();

    if (oldFinal) {
      const filesToDelete: string[] = [];
      if (oldFinal.storage_path_xlsx) filesToDelete.push(oldFinal.storage_path_xlsx);
      if (oldFinal.storage_path_pdf) filesToDelete.push(oldFinal.storage_path_pdf);

      if (filesToDelete.length > 0) {
        await supabase.storage.from(BUCKET_NAME).remove(filesToDelete);
      }
    }
  } catch (error) {
    console.error('[cleanupOldFinalFiles] Error:', error);
  }
}

/**
 * 스토리지에서 FINAL XLSX 다운로드 URL 생성
 */
export async function getFinalXLSXUrl(caseId: string): Promise<string | null> {
  try {
    const supabase = createAdminClient();

    const { data: roadmap } = await supabase
      .from('roadmap_versions')
      .select('storage_path_xlsx')
      .eq('project_id', caseId)
      .eq('status', 'FINAL')
      .single();

    if (!roadmap?.storage_path_xlsx) {
      return null;
    }

    const { data } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(roadmap.storage_path_xlsx, 3600); // 1시간 유효

    return data?.signedUrl || null;
  } catch (error) {
    console.error('[getFinalXLSXUrl] Error:', error);
    return null;
  }
}

/**
 * 내보내기 데이터 준비 (서버 사이드)
 */
export async function prepareExportDataServer(roadmapId: string): Promise<RoadmapExportData | null> {
  try {
    const supabase = createAdminClient();

    const { data: roadmap } = await supabase
      .from('roadmap_versions')
      .select('*, projects!inner(company_name)')
      .eq('id', roadmapId)
      .single();

    if (!roadmap) {
      return null;
    }

    const projectData = roadmap.projects as { company_name: string };

    return {
      companyName: projectData.company_name,
      caseId: roadmap.project_id,
      versionNumber: roadmap.version_number,
      status: roadmap.status,
      diagnosisSummary: roadmap.diagnosis_summary,
      roadmapMatrix: roadmap.roadmap_matrix,
      pblCourse: roadmap.pbl_course,
      courses: roadmap.courses,
      createdAt: roadmap.created_at,
      finalizedAt: roadmap.finalized_at,
    };
  } catch (error) {
    console.error('[prepareExportDataServer] Error:', error);
    return null;
  }
}
