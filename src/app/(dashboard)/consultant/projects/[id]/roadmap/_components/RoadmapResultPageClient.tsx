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

import { VersionSwitchOverlay } from '@/components/common/VersionSwitchOverlay';

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
import { handleActionResult, handleSimpleActionResult } from '@/lib/utils/action-result-toast';
import { isCancelledError } from '@/lib/services/llm';
import type { RoadmapVersionUI } from '@/types/roadmap-ui';

import { RoadmapResultClient } from './result-v2/RoadmapResultClient';
import type { ResultInterviewSnapshot, RoadmapResultEditPayload } from './result-v2/types';

export interface RoadmapResultPageClientProps {
  projectId: string;
  companyName: string;
  initialVersions: RoadmapVersionUI[];
  initialSelected: RoadmapVersionUI | null;
  initialInterview: Partial<ResultInterviewSnapshot>;
  /** #013 fix — EmptyState 가드 강화용. */
  initialSelfAssessmentExists: boolean;
  initialProjectStatus: string;
  /** 행정 종결 여부 — 종결 시 편집·생성·확정 잠금 + 배너 표시 (기본 false) */
  initialProjectClosed?: boolean;
}

export default function RoadmapResultPageClient({
  projectId,
  companyName,
  initialVersions,
  initialSelected,
  initialInterview,
  initialSelfAssessmentExists,
  initialProjectStatus,
  initialProjectClosed = false,
}: RoadmapResultPageClientProps) {
  const [versions, setVersions] = useState<RoadmapVersionUI[]>(initialVersions);
  const [selectedVersion, setSelectedVersion] = useState<RoadmapVersionUI | null>(initialSelected);
  const [interview, setInterview] = useState<Partial<ResultInterviewSnapshot>>(initialInterview);
  const [selfAssessmentExists, setSelfAssessmentExists] = useState<boolean>(
    initialSelfAssessmentExists
  );
  const [projectStatus, setProjectStatus] = useState<string>(initialProjectStatus);
  const [projectClosed, setProjectClosed] = useState<boolean>(initialProjectClosed);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGenerationComplete, setIsGenerationComplete] = useState(false);
  const [isSwitchingVersion, setIsSwitchingVersion] = useState(false);

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
      setSelfAssessmentExists(result.data.selfAssessmentExists);
      setProjectStatus(result.data.projectStatus);
      setProjectClosed(result.data.projectClosed);
    }
  }

  async function handleSelectVersion(versionId: string) {
    if (versionId === selectedVersion?.id) return;
    setIsSwitchingVersion(true);
    try {
      await refreshPageData(versionId);
    } finally {
      setIsSwitchingVersion(false);
    }
  }

  async function handleGenerate(revisionPrompt?: string) {
    setIsGenerating(true);
    setIsGenerationComplete(false);
    const result = await createRoadmapV2(projectId, revisionPrompt);
    // #013 fix — handleActionResult 가 result.error falsy 여도 errorFallback 으로
    // 토스트 보장 + isCancelledError true 시 silent.
    const ok = await handleActionResult(result, {
      successMessage: { title: '로드맵 생성 완료', description: '로드맵이 생성되었습니다.' },
      errorTitle: '로드맵 생성 실패',
      errorFallback: '로드맵 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
      isSilent: isCancelledError,
    });
    if (ok) {
      await refreshPageData();
      setIsGenerationComplete(true);
      setTimeout(() => {
        setIsGenerating(false);
        setIsGenerationComplete(false);
      }, COMPLETION_DELAY_MS);
      return;
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
    const ok = await handleActionResult(result, {
      errorTitle: '저장 실패',
      errorFallback: '변경사항 저장에 실패했습니다.',
    });
    if (ok) {
      await refreshPageData(selectedVersion.id);
    }
  }

  async function handleFinalize(versionId: string) {
    const result = await confirmFinalRoadmapV2(versionId);
    const ok = await handleSimpleActionResult(result, {
      successMessage: { title: '로드맵이 최종 확정되었습니다.' },
      errorTitle: '최종 확정 실패',
      errorFallback: '로드맵 최종 확정에 실패했습니다.',
    });
    if (ok) {
      await refreshPageData(versionId);
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

  // hook 이 내부 상태로 표시를 관리하므로 본 wrapper 는 loading 전달만 담당.
  void isDownloading;
  void isHwpxDownloading;

  return (
    <>
      <RoadmapResultClient
        role="CONSULTANT"
        projectId={projectId}
        versions={versions}
        selectedVersion={selectedVersion}
        interview={interview}
        selfAssessmentExists={selfAssessmentExists}
        projectStatus={projectStatus}
        projectClosed={projectClosed}
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
      <VersionSwitchOverlay open={isSwitchingVersion} />
    </>
  );
}
