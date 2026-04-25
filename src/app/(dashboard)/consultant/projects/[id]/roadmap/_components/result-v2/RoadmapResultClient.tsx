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
import { Button } from '@/components/ui/button';
import { Plus, CheckCircle2 } from 'lucide-react';
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
  /**
   * DRAFT → FINAL 확정. CONSULTANT + DRAFT 상태일 때만 "최종 확정" 버튼이 노출되고
   * 클릭 시 호출된다. OPS role 또는 provider 미지정 시 버튼을 숨긴다.
   */
  onFinalize?: (versionId: string) => Promise<void>;
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
  onFinalize,
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

  async function handleFinalize() {
    if (!selectedVersion || !onFinalize) return;
    if (
      typeof window !== 'undefined' &&
      !window.confirm('이 버전을 최종 확정하시겠습니까? 이전 확정본은 아카이브됩니다.')
    ) {
      return;
    }
    await onFinalize(selectedVersion.id);
  }

  async function handleEmptyStateGenerate() {
    // EmptyState 의 큰 "AI 로드맵 생성" 버튼 — 아코디언의 수정 prompt 없이 즉시 생성.
    await (onGenerate ?? NOOP_GENERATE)();
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
              <>
                {/**
                 * 선택된 버전 식별 헤딩. 접근성·테스트 안정성 목적으로 "버전 N"
                 * 을 고정 h2 로 유지한다 (레거시 ConsultantRoadmapClient 와 동일 semantic).
                 */}
                <h2
                  className="text-sm font-semibold text-foreground"
                  data-testid="selected-version-heading"
                >
                  버전 {selectedVersion.version_number}
                </h2>
                <VersionStatusBadge
                  status={selectedVersion.status}
                  versionNumber={selectedVersion.version_number}
                />
              </>
            )}
            {/* Consultant 전용: DRAFT 선택 시 "최종 확정" 버튼 노출 */}
            {capabilities.canEdit &&
              isDraft &&
              selectedVersion &&
              onFinalize && (
                <Button
                  type="button"
                  size="sm"
                  variant="default"
                  onClick={() => void handleFinalize()}
                  data-testid="finalize-roadmap-button"
                >
                  <CheckCircle2 className="mr-1 size-4" aria-hidden="true" />
                  최종 확정
                </Button>
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

        {/**
         * RegenerateAccordion 은 versions > 0 일 때만 노출 (이미 생성된 로드맵의 "수정본"
         * 생성용). versions=0 일 때는 EmptyState 안의 큰 버튼으로 최초 생성 흐름을 유도.
         */}
        {capabilities.showRegenerate && hasVersions && (
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
          <EmptyState
            canGenerate={capabilities.showRegenerate}
            onGenerate={handleEmptyStateGenerate}
            isGenerating={isGenerating}
          />
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

interface EmptyStateProps {
  /** CONSULTANT 역할일 때만 생성 버튼이 노출된다. */
  canGenerate: boolean;
  onGenerate: () => void | Promise<void>;
  isGenerating: boolean;
}

function EmptyState({ canGenerate, onGenerate, isGenerating }: EmptyStateProps) {
  return (
    <div className="rounded-lg border bg-card p-12 text-center">
      <h3 className="text-base font-semibold">아직 생성된 로드맵이 없습니다</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        인터뷰가 완료된 후 아래 버튼을 눌러 AI 훈련 로드맵을 생성하세요.
      </p>
      {canGenerate && (
        <div className="mt-6">
          <Button
            type="button"
            size="lg"
            onClick={() => void onGenerate()}
            disabled={isGenerating}
            data-testid="empty-state-generate-roadmap"
          >
            <Plus className="mr-1.5 size-4" aria-hidden="true" />
            {isGenerating ? 'AI 생성 중…' : 'AI 로드맵 생성'}
          </Button>
        </div>
      )}
    </div>
  );
}
