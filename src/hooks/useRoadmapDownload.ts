'use client';

import { useState, useCallback } from 'react';
import { prepareExportData, logDownload } from '@/lib/actions/roadmap-export';

type DownloadFormat = 'PDF' | 'XLSX';

interface UseRoadmapDownloadResult {
  isDownloading: DownloadFormat | null;
  error: string | null;
  success: string | null;
  downloadPDF: (roadmapId: string) => Promise<void>;
  downloadXLSX: (roadmapId: string) => Promise<void>;
  clearMessages: () => void;
}

/**
 * 로드맵 다운로드 기능을 위한 커스텀 훅
 */
export function useRoadmapDownload(): UseRoadmapDownloadResult {
  const [isDownloading, setIsDownloading] = useState<DownloadFormat | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const clearMessages = useCallback(() => {
    setError(null);
    setSuccess(null);
  }, []);

  const downloadPDF = useCallback(async (roadmapId: string) => {
    setIsDownloading('PDF');
    setError(null);
    setSuccess(null);

    try {
      const result = await prepareExportData(roadmapId);
      if (!result.success || !result.data) {
        setError(result.error || 'PDF 준비에 실패했습니다.');
        return;
      }

      const { generatePDF } = await import('@/lib/services/export-pdf');
      const blob = await generatePDF(result.data);

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `roadmap_${result.data.companyName}_v${result.data.versionNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      await logDownload(roadmapId, 'PDF');
      setSuccess('PDF 다운로드가 완료되었습니다.');
    } catch (err) {
      console.error('[PDF Download Error]', err);
      setError('PDF 생성에 실패했습니다.');
    } finally {
      setIsDownloading(null);
    }
  }, []);

  const downloadXLSX = useCallback(async (roadmapId: string) => {
    setIsDownloading('XLSX');
    setError(null);
    setSuccess(null);

    try {
      const result = await prepareExportData(roadmapId);
      if (!result.success || !result.data) {
        setError(result.error || 'XLSX 준비에 실패했습니다.');
        return;
      }

      const { downloadXLSX: downloadExcel } = await import('@/lib/services/export-xlsx');
      downloadExcel(result.data, `roadmap_${result.data.companyName}_v${result.data.versionNumber}.xlsx`);

      await logDownload(roadmapId, 'XLSX');
      setSuccess('Excel 다운로드가 완료되었습니다.');
    } catch (err) {
      console.error('[XLSX Download Error]', err);
      setError('Excel 생성에 실패했습니다.');
    } finally {
      setIsDownloading(null);
    }
  }, []);

  return {
    isDownloading,
    error,
    success,
    downloadPDF,
    downloadXLSX,
    clearMessages,
  };
}
