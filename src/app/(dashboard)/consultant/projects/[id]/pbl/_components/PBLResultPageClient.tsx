'use client';

/**
 * Consultant PBL 결과 페이지의 Client wrapper (Task 2.11-b).
 *
 * 역할 분리:
 * - page.tsx (server component): 초기 데이터 server-side fetch.
 * - 본 wrapper: state 관리 + V2 Server Action 호출 + V2 Client 에 콜백 주입.
 * - {@link PBLResultClient}: 순수 프레젠테이션 (role-aware 가시성 제어).
 */

import { useState } from 'react';

import {
  cancelPBLGeneration,
  createPBLV2,
  editPBLV2,
  exportPBLHwpxV2,
  fetchPBLPageDataV2,
} from '../actions';
import { usePBLDownload } from '@/hooks/usePBLDownload';
import { useHwpxDownload } from '@/hooks/useHwpxDownload';
import type { DownloadType } from '@/components/result/DownloadButtonGroup';
import { showErrorToast, showSuccessToast } from '@/lib/utils/toast';
import { handleActionResult, handleSimpleActionResult } from '@/lib/utils/action-result-toast';
import { isCancelledError } from '@/lib/services/llm';
import type { PBLReportRow } from '@/lib/services/pbl';

import { PBLResultClient } from './result-v2/PBLResultClient';
import type {
  PBLResultEditPayload,
  ResultPBLInterviewSnapshot,
} from './result-v2/types';

export interface PBLResultPageClientProps {
  projectId: string;
  companyName: string;
  initialVersions: PBLReportRow[];
  initialSelected: PBLReportRow | null;
  initialInterview: Partial<ResultPBLInterviewSnapshot>;
  /** #013 fix — EmptyState 가드 강화용. */
  initialHasInterview: boolean;
  initialProjectStatus: string;
}

export default function PBLResultPageClient({
  projectId,
  companyName,
  initialVersions,
  initialSelected,
  initialInterview,
  initialHasInterview,
  initialProjectStatus,
}: PBLResultPageClientProps) {
  const [versions, setVersions] = useState<PBLReportRow[]>(initialVersions);
  const [selectedVersion, setSelectedVersion] = useState<PBLReportRow | null>(
    initialSelected,
  );
  const [interview, setInterview] =
    useState<Partial<ResultPBLInterviewSnapshot>>(initialInterview);
  const [hasInterview, setHasInterview] = useState<boolean>(initialHasInterview);
  const [projectStatus, setProjectStatus] = useState<string>(initialProjectStatus);
  const [isGenerating, setIsGenerating] = useState(false);

  const { isDownloading, downloadPDF, downloadXLSX } = usePBLDownload();
  const { download: downloadHwpx, isLoading: isHwpxDownloading } = useHwpxDownload({
    action: () => exportPBLHwpxV2(selectedVersion?.id ?? ''),
    successMessage: 'PBL HWPX 다운로드 완료',
    errorTitle: 'PBL HWPX 다운로드 실패',
  });

  async function refreshPageData(versionId?: string) {
    const result = await fetchPBLPageDataV2(projectId, versionId);
    if (result.success) {
      setVersions(result.data.versions);
      setSelectedVersion(result.data.selectedVersion);
      setInterview(result.data.interview);
      setHasInterview(result.data.hasInterview);
      setProjectStatus(result.data.projectStatus);
    }
  }

  async function handleSelectVersion(versionId: string) {
    await refreshPageData(versionId);
  }

  async function handleGenerate(revisionPrompt?: string) {
    setIsGenerating(true);
    const result = await createPBLV2(projectId, revisionPrompt);
    // #013 fix — handleActionResult 가 result.error falsy 여도 errorFallback 으로
    // 토스트 보장 + isCancelledError true 시 silent.
    await handleActionResult(result, {
      successMessage: { title: 'PBL 보고서 생성', description: '초안이 생성되었습니다.' },
      errorTitle: 'PBL 보고서 생성 실패',
      errorFallback: 'PBL 보고서 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
      isSilent: isCancelledError,
      onSuccess: async (data) => {
        await refreshPageData(data.pblId);
      },
    });
    setIsGenerating(false);
  }

  async function handleCancelGenerate() {
    setIsGenerating(false);
    await cancelPBLGeneration();
  }

  async function handleEdit(patch: PBLResultEditPayload) {
    if (!selectedVersion) return;
    const result = await editPBLV2(selectedVersion.id, patch);
    const ok = await handleSimpleActionResult(result, {
      errorTitle: '저장 실패',
      errorFallback: '변경 사항을 저장하지 못했습니다.',
    });
    if (ok) {
      await refreshPageData(selectedVersion.id);
    }
  }

  async function handleDownload(type: DownloadType) {
    if (!selectedVersion) return;
    if (type === 'PDF') {
      await downloadPDF(selectedVersion.id);
    } else if (type === 'XLSX') {
      await downloadXLSX(selectedVersion.id);
    } else {
      await downloadHwpx();
    }
  }

  void isDownloading;
  void isHwpxDownloading;

  return (
    <PBLResultClient
      role="CONSULTANT"
      projectId={projectId}
      versions={versions}
      selectedVersion={selectedVersion}
      interview={interview}
      hasInterview={hasInterview}
      projectStatus={projectStatus}
      onSelectVersion={handleSelectVersion}
      onEdit={handleEdit}
      onGenerate={handleGenerate}
      onDownload={handleDownload}
      isGenerating={isGenerating}
      onCancelGenerate={handleCancelGenerate}
      companyName={companyName}
    />
  );
}
