'use client';

/**
 * Consultant Roadmap 결과 페이지의 Client wrapper (Task 2.11-b).
 *
 * 역할 분리:
 * - page.tsx (server component): 초기 데이터 server-side fetch.
 * - 본 wrapper: state 관리 + V2 Server Action 호출 + V2 Client 에 콜백 주입.
 * - {@link RoadmapResultClient}: 순수 프레젠테이션 (role-aware 가시성 제어).
 */

import { useState } from 'react';

import {
  cancelRoadmapGeneration,
  confirmFinalRoadmapV2,
  createRoadmapV2,
  editRoadmapV2,
  exportRoadmapHwpxV2,
  fetchRoadmapPageDataV2,
} from '../actions';
import { useRoadmapDownload } from '@/hooks/useRoadmapDownload';
import { useHwpxDownload } from '@/hooks/useHwpxDownload';
import { COMPLETION_DELAY_MS } from '@/components/roadmap/RoadmapLoadingOverlay';
import type { DownloadType } from '@/components/result/DownloadButtonGroup';
import { showErrorToast, showSuccessToast } from '@/lib/utils/toast';
import { isCancelledError } from '@/lib/services/llm';
import type { RoadmapVersionUI } from '@/types/roadmap-ui';

import { RoadmapResultClient } from './result-v2/RoadmapResultClient';
import type {
  ResultInterviewSnapshot,
  RoadmapResultEditPayload,
} from './result-v2/types';

export interface RoadmapResultPageClientProps {
  projectId: string;
  companyName: string;
  initialVersions: RoadmapVersionUI[];
  initialSelected: RoadmapVersionUI | null;
  initialInterview: Partial<ResultInterviewSnapshot>;
}

export default function RoadmapResultPageClient({
  projectId,
  companyName,
  initialVersions,
  initialSelected,
  initialInterview,
}: RoadmapResultPageClientProps) {
  const [versions, setVersions] = useState<RoadmapVersionUI[]>(initialVersions);
  const [selectedVersion, setSelectedVersion] = useState<RoadmapVersionUI | null>(
    initialSelected,
  );
  const [interview, setInterview] =
    useState<Partial<ResultInterviewSnapshot>>(initialInterview);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGenerationComplete, setIsGenerationComplete] = useState(false);

  const { isDownloading, downloadPDF, downloadXLSX } = useRoadmapDownload();
  const { download: downloadHwpx, isLoading: isHwpxDownloading } = useHwpxDownload({
    action: () => exportRoadmapHwpxV2(selectedVersion?.id ?? ''),
    successMessage: 'HWPX 다운로드 완료',
    errorTitle: 'HWPX 다운로드 실패',
  });

  async function refreshPageData(versionId?: string) {
    const result = await fetchRoadmapPageDataV2(projectId, versionId);
    if (result.success) {
      setVersions(result.data.versions);
      setSelectedVersion(result.data.selectedVersion);
      setInterview(result.data.interview);
    }
  }

  async function handleSelectVersion(versionId: string) {
    await refreshPageData(versionId);
  }

  async function handleGenerate(revisionPrompt?: string) {
    setIsGenerating(true);
    setIsGenerationComplete(false);
    const result = await createRoadmapV2(projectId, revisionPrompt);
    if (result.success) {
      showSuccessToast('로드맵 생성 완료', '로드맵이 생성되었습니다.');
      await refreshPageData();
      setIsGenerationComplete(true);
      setTimeout(() => {
        setIsGenerating(false);
        setIsGenerationComplete(false);
      }, COMPLETION_DELAY_MS);
      return;
    }
    if (!isCancelledError(result.error)) {
      showErrorToast('로드맵 생성 실패', result.error);
    }
    setIsGenerating(false);
  }

  async function handleCancelGenerate() {
    setIsGenerating(false);
    setIsGenerationComplete(false);
    await cancelRoadmapGeneration();
  }

  async function handleEdit(patch: RoadmapResultEditPayload) {
    if (!selectedVersion) return;
    const result = await editRoadmapV2(selectedVersion.id, patch);
    if (!result.success) {
      showErrorToast('저장 실패', result.error || '변경사항 저장에 실패했습니다.');
      return;
    }
    await refreshPageData(selectedVersion.id);
  }

  async function handleFinalize(versionId: string) {
    const result = await confirmFinalRoadmapV2(versionId);
    if (!result.success) {
      showErrorToast(
        '최종 확정 실패',
        result.error || '로드맵 최종 확정에 실패했습니다.',
      );
      return;
    }
    showSuccessToast('로드맵이 최종 확정되었습니다.');
    await refreshPageData(versionId);
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

  // hook 이 내부 상태로 표시를 관리하므로 본 wrapper 는 loading 전달만 담당.
  void isDownloading;
  void isHwpxDownloading;

  return (
    <RoadmapResultClient
      role="CONSULTANT"
      projectId={projectId}
      versions={versions}
      selectedVersion={selectedVersion}
      interview={interview}
      onSelectVersion={handleSelectVersion}
      onEdit={handleEdit}
      onGenerate={handleGenerate}
      onFinalize={handleFinalize}
      onDownload={handleDownload}
      isGenerating={isGenerating}
      isGenerationComplete={isGenerationComplete}
      onCancelGenerate={handleCancelGenerate}
      companyName={companyName}
    />
  );
}
