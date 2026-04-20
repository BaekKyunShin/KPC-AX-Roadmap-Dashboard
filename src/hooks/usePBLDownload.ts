'use client';

import { useState } from 'react';
import { logPBLDownload, preparePBLExportData } from '@/lib/actions/pbl-export';
import { showErrorToast, showSuccessToast } from '@/lib/utils/toast';

type DownloadFormat = 'PDF' | 'XLSX';

interface UsePBLDownloadResult {
  isDownloading: DownloadFormat | null;
  downloadPDF: (pblId: string) => Promise<void>;
  downloadXLSX: (pblId: string) => Promise<void>;
}

export function usePBLDownload(): UsePBLDownloadResult {
  const [isDownloading, setIsDownloading] = useState<DownloadFormat | null>(null);

  const downloadPDF = async (pblId: string) => {
    setIsDownloading('PDF');
    try {
      const result = await preparePBLExportData(pblId);
      if (!result.success) {
        showErrorToast('PDF 다운로드 실패', result.error);
        return;
      }

      const data = result.data;
      const { generatePBLPDF } = await import('@/lib/services/export/pdf');
      const blob = await generatePBLPDF(data);

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pbl_${data.companyName}_v${data.versionNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      await logPBLDownload(pblId, 'PDF');
      showSuccessToast('PDF 다운로드 완료');
    } catch (err) {
      console.error('[PBL PDF Download Error]', err);
      showErrorToast('PDF 다운로드 실패', 'PDF 생성 중 오류가 발생했습니다.');
    } finally {
      setIsDownloading(null);
    }
  };

  const downloadXLSX = async (pblId: string) => {
    setIsDownloading('XLSX');
    try {
      const result = await preparePBLExportData(pblId);
      if (!result.success) {
        showErrorToast('Excel 다운로드 실패', result.error);
        return;
      }

      const data = result.data;
      const { generatePBLXLSX, downloadPBLXLSX } = await import('@/lib/services/export/xlsx');
      const bytes = await generatePBLXLSX({
        ...data,
        pblContent: data.pblContent,
      });
      downloadPBLXLSX(bytes, `pbl_${data.companyName}_v${data.versionNumber}.xlsx`);

      await logPBLDownload(pblId, 'XLSX');
      showSuccessToast('Excel 다운로드 완료');
    } catch (err) {
      console.error('[PBL XLSX Download Error]', err);
      showErrorToast('Excel 다운로드 실패', 'Excel 생성 중 오류가 발생했습니다.');
    } finally {
      setIsDownloading(null);
    }
  };

  return { isDownloading, downloadPDF, downloadXLSX };
}
