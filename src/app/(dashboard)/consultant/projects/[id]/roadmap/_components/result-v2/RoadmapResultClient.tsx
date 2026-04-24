'use client';

import { useMemo, useState } from 'react';

import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/ui/page-header';
import { VersionSelector } from '@/components/common/VersionSelector';
import { VersionStatusBadge } from '@/components/common/VersionStatusBadge';
import {
  DownloadButtonGroup,
  type DownloadType,
} from '@/components/result/DownloadButtonGroup';
import { ResultTabs, type ResultTabItem } from '@/components/result/ResultTabs';
import { RegenerateAccordion } from '@/components/roadmap/RegenerateAccordion';
import RoadmapLoadingOverlay from '@/components/roadmap/RoadmapLoadingOverlay';
import { ShareToggle } from '@/components/gallery/ShareToggle';
import type { RoadmapVersionUI } from '@/types/roadmap-ui';

import { TabOverview } from './TabOverview';
import { TabRequirements } from './TabRequirements';
import { TabTraining } from './TabTraining';
import type { RoadmapResultEditPayload, ResultInterviewSnapshot } from './types';

/**
 * Task 2.11-a — 로드맵 결과 화면 role-aware 통합 Client.
 *
 * Consultant V2 (편집·재생성·확정) 와 Ops 읽기 전용을 하나의 Client 로 통합.
 * role prop 단일 분기 + capabilities 테이블로 가시성 제어 (boolean prop 증식 회피).
 */

export type RoadmapResultClientRole = 'CONSULTANT' | 'OPS';

interface RoleCapabilities {
  canEdit: boolean;
  showRegenerate: boolean;
  showShareToggleWhenFinal: boolean;
}

const ROLE_CAPABILITIES: Record<RoadmapResultClientRole, RoleCapabilities> = {
  CONSULTANT: {
    canEdit: true,
    showRegenerate: true,
    showShareToggleWhenFinal: false,
  },
  OPS: {
    canEdit: false,
    showRegenerate: false,
    showShareToggleWhenFinal: true,
  },
};

export interface RoadmapResultClientProps {
  /** 뷰어 역할 — 편집·재생성·공유 토글 가시성 제어. */
  role: RoadmapResultClientRole;
  projectId: string;
  /** 버전 목록 (desc 정렬 권장). 비어 있으면 빈 상태 UI 표출. */
  versions: RoadmapVersionUI[];
  /** 현재 선택 버전. null 이면 "아직 생성된 로드맵이 없습니다" 상태. */
  selectedVersion: RoadmapVersionUI | null;
  /** 인터뷰 입력값 snapshot (Ⅰ·Ⅱ·Ⅲ-1 의 읽기 전용 원본). */
  interview?: Partial<ResultInterviewSnapshot>;
  /** 버전 변경 시 호출. 상위가 fetch → state 업데이트 책임. */
  onSelectVersion: (versionId: string) => void | Promise<void>;
  /** 섹션 편집 patch. OPS role 에서는 호출되지 않음(optional 로 허용). */
  onEdit?: (patch: RoadmapResultEditPayload) => Promise<void>;
  /** 새 버전 생성. OPS role 에서는 호출되지 않음. */
  onGenerate?: (revisionPrompt?: string) => Promise<void>;
  /** 다운로드 (PDF/XLSX/HWPX). */
  onDownload: (type: DownloadType) => Promise<void>;
  isGenerating?: boolean;
  isGenerationComplete?: boolean;
  onCancelGenerate?: () => void;
  companyName?: string;
}

type TabValue = 'overview' | 'requirements' | 'training';

const NOOP_EDIT: (patch: RoadmapResultEditPayload) => Promise<void> = async () => {};
const NOOP_GENERATE: (revisionPrompt?: string) => Promise<void> = async () => {};

export function RoadmapResultClient({
  role,
  projectId: _projectId,
  versions,
  selectedVersion,
  interview,
  onSelectVersion,
  onEdit,
  onGenerate,
  onDownload,
  isGenerating = false,
  isGenerationComplete = false,
  onCancelGenerate,
  companyName = '',
}: RoadmapResultClientProps) {
  const [downloadLoading, setDownloadLoading] = useState<DownloadType | null>(null);
  const [revisionPrompt, setRevisionPrompt] = useState('');

  const capabilities = useMemo(() => ROLE_CAPABILITIES[role], [role]);

  const isDraft = selectedVersion?.status === 'DRAFT';
  const isFinal = selectedVersion?.status === 'FINAL';
  const hasVersions = versions.length > 0;
  // DRAFT + 편집 가능 역할일 때만 인라인 편집 활성
  const tabReadOnly = !isDraft || !capabilities.canEdit;

  async function handleDownload(type: DownloadType) {
    setDownloadLoading(type);
    try {
      await onDownload(type);
    } finally {
      setDownloadLoading(null);
    }
  }

  async function handleRegenerate() {
    await (onGenerate ?? NOOP_GENERATE)(revisionPrompt || undefined);
    setRevisionPrompt('');
  }

  const commonTabProps = {
    version: selectedVersion,
    interview,
    readOnly: tabReadOnly,
    onEdit: onEdit ?? NOOP_EDIT,
  } as const;

  const tabs: ResultTabItem[] = [
    {
      value: 'overview' satisfies TabValue,
      label: 'Ⅰ. 개요',
      content: <TabOverview {...commonTabProps} />,
    },
    {
      value: 'requirements' satisfies TabValue,
      label: 'Ⅱ. 요구분석',
      content: <TabRequirements {...commonTabProps} />,
    },
    {
      value: 'training' satisfies TabValue,
      label: 'Ⅲ. 훈련체계',
      content: <TabTraining {...commonTabProps} />,
    },
  ];

  return (
    <>
      <PageContainer>
        <PageHeader
          title="AI훈련로드맵 결과"
          description="산인공 공식 양식 1번 기반 3섹션 구조 (개요 / 요구분석 / 훈련체계)"
        />

        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <VersionSelector<RoadmapVersionUI>
              versions={versions}
              selectedId={selectedVersion?.id}
              onSelect={(id) => void onSelectVersion(id)}
              placeholder={hasVersions ? '버전 선택' : '생성된 버전 없음'}
            />
            {selectedVersion && (
              <VersionStatusBadge
                status={selectedVersion.status}
                versionNumber={selectedVersion.version_number}
              />
            )}
            {/* Ops 전용: FINAL 상태에서만 ShareToggle 노출 (갤러리 공유 감사 목적) */}
            {capabilities.showShareToggleWhenFinal && isFinal && selectedVersion && (
              <ShareToggle
                roadmapVersionId={selectedVersion.id}
                initialShared={selectedVersion.is_shared ?? false}
              />
            )}
          </div>
          <DownloadButtonGroup
            onDownload={handleDownload}
            loading={downloadLoading}
            disabled={!selectedVersion}
          />
        </div>

        {capabilities.showRegenerate && (
          <RegenerateAccordion
            value={revisionPrompt}
            onChange={setRevisionPrompt}
            onSubmit={handleRegenerate}
            isLoading={isGenerating}
          />
        )}

        {selectedVersion ? (
          <ResultTabs tabs={tabs} defaultValue="overview" />
        ) : (
          <EmptyState />
        )}
      </PageContainer>

      {isGenerating && capabilities.showRegenerate && (
        <RoadmapLoadingOverlay
          isTestMode={false}
          companyName={companyName}
          profileHref="/consultant/profile"
          onCancel={onCancelGenerate}
          isCompleted={isGenerationComplete}
        />
      )}
    </>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border bg-card p-12 text-center">
      <h3 className="text-base font-semibold">아직 생성된 로드맵이 없습니다</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        인터뷰가 완료되면 상단 &quot;새 버전 생성&quot; 을 눌러 AI 로드맵을 생성하세요.
      </p>
    </div>
  );
}
