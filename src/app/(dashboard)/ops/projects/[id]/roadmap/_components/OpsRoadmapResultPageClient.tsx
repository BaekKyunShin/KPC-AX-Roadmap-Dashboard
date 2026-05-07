'use client';

/**
 * Ops Roadmap 결과 페이지의 Client wrapper (Task 2.11-b).
 *
 * OPS_ADMIN / SYSTEM_ADMIN 의 읽기 전용 뷰. V2 Client 의 role="OPS" 로
 * 편집·재생성·ShareToggle(FINAL) 가시성을 제어한다.
 *
 * V2 Server Action 은 컨설턴트 라우트에 정의되어 있으나 역할 가드가
 * OPS/SYSTEM_ADMIN 을 허용하므로 (`fetchRoadmapPageDataV2` · `exportRoadmapHwpxV2`)
 * 그대로 재사용한다.
 */

import { useState } from 'react';

import { VersionSwitchOverlay } from '@/components/common/VersionSwitchOverlay';
import {
  exportRoadmapHwpxV2,
  fetchRoadmapPageDataV2,
} from '@/app/(dashboard)/consultant/projects/[id]/roadmap/actions';
import { RoadmapResultClient } from '@/app/(dashboard)/consultant/projects/[id]/roadmap/_components/result-v2/RoadmapResultClient';
import type {
  ResultInterviewSnapshot,
} from '@/app/(dashboard)/consultant/projects/[id]/roadmap/_components/result-v2/types';
import { useRoadmapDownload } from '@/hooks/useRoadmapDownload';
import { useHwpxDownload } from '@/hooks/useHwpxDownload';
import type { DownloadType } from '@/components/result/DownloadButtonGroup';
import type { RoadmapVersionUI } from '@/types/roadmap-ui';

export interface OpsRoadmapResultPageClientProps {
  projectId: string;
  initialVersions: RoadmapVersionUI[];
  initialSelected: RoadmapVersionUI | null;
  initialInterview: Partial<ResultInterviewSnapshot>;
}

export default function OpsRoadmapResultPageClient({
  projectId,
  initialVersions,
  initialSelected,
  initialInterview,
}: OpsRoadmapResultPageClientProps) {
  const [versions, setVersions] = useState<RoadmapVersionUI[]>(initialVersions);
  const [selectedVersion, setSelectedVersion] = useState<RoadmapVersionUI | null>(
    initialSelected,
  );
  const [interview, setInterview] =
    useState<Partial<ResultInterviewSnapshot>>(initialInterview);
  const [isSwitchingVersion, setIsSwitchingVersion] = useState(false);

  const { isDownloading, downloadPDF, downloadXLSX } = useRoadmapDownload();
  const { download: downloadHwpx, isLoading: isHwpxDownloading } = useHwpxDownload({
    action: () => exportRoadmapHwpxV2(selectedVersion?.id ?? ''),
    successMessage: '로드맵 HWPX 다운로드 완료',
    errorTitle: '로드맵 HWPX 다운로드 실패',
  });

  async function handleSelectVersion(versionId: string) {
    if (versionId === selectedVersion?.id) return;
    setIsSwitchingVersion(true);
    try {
      const result = await fetchRoadmapPageDataV2(projectId, versionId);
      if (result.success) {
        setVersions(result.data.versions);
        setSelectedVersion(result.data.selectedVersion);
        setInterview(result.data.interview);
      }
    } finally {
      setIsSwitchingVersion(false);
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
    <>
      <RoadmapResultClient
        role="OPS"
        projectId={projectId}
        versions={versions}
        selectedVersion={selectedVersion}
        interview={interview}
        onSelectVersion={handleSelectVersion}
        onDownload={handleDownload}
      />
      <VersionSwitchOverlay open={isSwitchingVersion} />
    </>
  );
}
