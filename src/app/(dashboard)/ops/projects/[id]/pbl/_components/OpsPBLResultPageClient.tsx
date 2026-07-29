'use client';

/**
 * Ops PBL 결과 페이지의 Client wrapper (Task 2.11-b).
 *
 * OPS_ADMIN / SYSTEM_ADMIN 의 읽기 전용 뷰. V2 Client 의 role="OPS" 로
 * 편집·재생성 차단. V2 Server Action 은 컨설턴트 라우트에 정의되어 있으나
 * 역할 가드가 OPS/SYSTEM_ADMIN 을 허용하므로 (`fetchPBLPageDataV2` ·
 * `exportPBLHwpxV2`) 그대로 재사용한다.
 */

import { useState } from 'react';

import { VersionSwitchOverlay } from '@/components/common/VersionSwitchOverlay';
import {
  exportPBLHwpxV2,
  fetchPBLPageDataV2,
} from '@/app/(dashboard)/consultant/projects/[id]/pbl/actions';
import { PBLResultClient } from '@/app/(dashboard)/consultant/projects/[id]/pbl/_components/result-v2/PBLResultClient';
import type { ResultPBLInterviewSnapshot } from '@/app/(dashboard)/consultant/projects/[id]/pbl/_components/result-v2/types';
import { usePBLDownload } from '@/hooks/usePBLDownload';
import { useHwpxDownload } from '@/hooks/useHwpxDownload';
import type { DownloadType } from '@/components/result/DownloadButtonGroup';
import type { PBLReportRow } from '@/lib/services/pbl';

export interface OpsPBLResultPageClientProps {
  projectId: string;
  initialVersions: PBLReportRow[];
  initialSelected: PBLReportRow | null;
  initialInterview: Partial<ResultPBLInterviewSnapshot>;
  /** 방어 — EmptyState 가 OPS 에게 엉뚱한 안내(인터뷰 유도 등)를 하지 않도록 전달 */
  initialHasInterview?: boolean;
  initialProjectStatus?: string;
  /** 행정 종결 여부 — 종결 배너 일관 표출 (OPS 는 canEdit=false 라 잠금 로직 무영향) */
  initialProjectClosed?: boolean;
}

export default function OpsPBLResultPageClient({
  projectId,
  initialVersions,
  initialSelected,
  initialInterview,
  initialHasInterview = false,
  initialProjectStatus = '',
  initialProjectClosed = false,
}: OpsPBLResultPageClientProps) {
  const [versions, setVersions] = useState<PBLReportRow[]>(initialVersions);
  const [selectedVersion, setSelectedVersion] = useState<PBLReportRow | null>(initialSelected);
  const [interview, setInterview] = useState<Partial<ResultPBLInterviewSnapshot>>(initialInterview);
  const [hasInterview, setHasInterview] = useState<boolean>(initialHasInterview);
  const [projectStatus, setProjectStatus] = useState<string>(initialProjectStatus);
  const [projectClosed, setProjectClosed] = useState<boolean>(initialProjectClosed);
  const [isSwitchingVersion, setIsSwitchingVersion] = useState(false);

  const { isDownloading, downloadPDF, downloadXLSX } = usePBLDownload();
  const { download: downloadHwpx, isLoading: isHwpxDownloading } = useHwpxDownload({
    action: () => exportPBLHwpxV2(selectedVersion?.id ?? ''),
    successMessage: 'PBL HWPX 다운로드 완료',
    errorTitle: 'PBL HWPX 다운로드 실패',
  });

  async function handleSelectVersion(versionId: string) {
    if (versionId === selectedVersion?.id) return;
    setIsSwitchingVersion(true);
    try {
      const result = await fetchPBLPageDataV2(projectId, versionId);
      if (result.success) {
        setVersions(result.data.versions);
        setSelectedVersion(result.data.selectedVersion);
        setInterview(result.data.interview);
        setHasInterview(result.data.hasInterview);
        setProjectStatus(result.data.projectStatus);
        setProjectClosed(result.data.projectClosed);
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
      <PBLResultClient
        role="OPS"
        projectId={projectId}
        versions={versions}
        selectedVersion={selectedVersion}
        interview={interview}
        hasInterview={hasInterview}
        projectStatus={projectStatus}
        projectClosed={projectClosed}
        onSelectVersion={handleSelectVersion}
        onDownload={handleDownload}
      />
      <VersionSwitchOverlay open={isSwitchingVersion} />
    </>
  );
}
