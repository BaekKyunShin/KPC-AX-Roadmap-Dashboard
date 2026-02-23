'use client';

import { useState } from 'react';
import { prepareExportData, logDownload } from '@/lib/actions/roadmap-export';
import { showSuccessToast, showErrorToast } from '@/lib/utils/toast';

type DownloadFormat = 'PDF' | 'XLSX';

interface UseRoadmapDownloadResult {
  isDownloading: DownloadFormat | null;
  downloadPDF: (roadmapId: string) => Promise<void>;
  downloadXLSX: (roadmapId: string) => Promise<void>;
}

/**
 * 로드맵 다운로드 기능을 위한 커스텀 훅
 * 성공/실패 메시지는 토스트로 표시
 */
export function useRoadmapDownload(): UseRoadmapDownloadResult {
  const [isDownloading, setIsDownloading] = useState<DownloadFormat | null>(null);

  const downloadPDF = async (roadmapId: string) => {
    setIsDownloading('PDF');

    try {
      const result = await prepareExportData(roadmapId);
      if (!result.success) {
        showErrorToast('PDF 다운로드 실패', result.error);
        return;
      }

      const exportData = result.data;
      const { generatePDF } = await import('@/lib/services/export-pdf');
      const blob = await generatePDF(exportData);

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `roadmap_${exportData.companyName}_v${exportData.versionNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      await logDownload(roadmapId, 'PDF');
      showSuccessToast('PDF 다운로드 완료');
    } catch (err) {
      console.error('[PDF Download Error]', err);
      showErrorToast('PDF 다운로드 실패', 'PDF 생성에 실패했습니다.');
    } finally {
      setIsDownloading(null);
    }
  };

  const downloadXLSX = async (roadmapId: string) => {
    setIsDownloading('XLSX');

    try {
      const result = await prepareExportData(roadmapId);
      if (!result.success) {
        showErrorToast('Excel 다운로드 실패', result.error);
        return;
      }

      const exportData = result.data;
      const { downloadXLSX: downloadExcel } = await import('@/lib/services/export-xlsx');
      await downloadExcel(exportData, `roadmap_${exportData.companyName}_v${exportData.versionNumber}.xlsx`);

      await logDownload(roadmapId, 'XLSX');
      showSuccessToast('Excel 다운로드 완료');
    } catch (err) {
      console.error('[XLSX Download Error]', err);
      showErrorToast('Excel 다운로드 실패', 'Excel 생성에 실패했습니다.');
    } finally {
      setIsDownloading(null);
    }
  };

  return {
    isDownloading,
    downloadPDF,
    downloadXLSX,
  };
}
