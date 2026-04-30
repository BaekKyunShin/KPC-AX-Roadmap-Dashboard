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
import type { PBLReportRow } from '@/lib/services/pbl/pbl-crud';
import { PBL_ELIGIBLE_STATUSES } from '@/lib/constants/status';
import type { ProjectStatus } from '@/types/database';

import { TabPBLOverview } from './TabPBLOverview';
import { TabPBLAnalysis } from './TabPBLAnalysis';
import { TabPBLTasks } from './TabPBLTasks';
import { TabPBLOps } from './TabPBLOps';
import { TabPBLOutcomes } from './TabPBLOutcomes';
import type { PBLResultEditPayload, ResultPBLInterviewSnapshot } from './types';

/**
 * Task 2.11-a — PBL 결과 화면 role-aware 통합 Client.
 *
 * Consultant V2 (편집·재생성·확정) 와 Ops 읽기 전용을 하나의 Client 로 통합.
 * role prop 단일 분기 + capabilities 테이블로 가시성 제어 (boolean prop 증식 회피).
 *
 * 탭 구성(5): Ⅰ 개요 / Ⅱ 요구분석 / Ⅲ 훈련과제 도출 / Ⅳ 운영계획 / Ⅴ 성과분석.
 * OPS role: 편집·재생성 차단. ShareToggle 은 PBL 도메인에 노출 않음 (OpsPBLClient 기존 동작과 일치).
 */

export type PBLResultClientRole = 'CONSULTANT' | 'OPS';

interface RoleCapabilities {
  canEdit: boolean;
  showRegenerate: boolean;
}

const ROLE_CAPABILITIES: Record<PBLResultClientRole, RoleCapabilities> = {
  CONSULTANT: {
    canEdit: true,
    showRegenerate: true,
  },
  OPS: {
    canEdit: false,
    showRegenerate: false,
  },
};

export interface PBLResultClientProps {
  /** 뷰어 역할 — 편집·재생성 가시성 제어. */
  role: PBLResultClientRole;
  projectId: string;
  /** 버전 목록 (desc 정렬 권장). 비어 있으면 빈 상태 UI 표출. */
  versions: PBLReportRow[];
  /** 현재 선택 버전. null 이면 "아직 생성된 PBL 보고서가 없습니다" 상태. */
  selectedVersion: PBLReportRow | null;
  /** 인터뷰 입력값 snapshot (Ⅰ·Ⅱ·Ⅲ 의 읽기 전용 원본). */
  interview?: Partial<ResultPBLInterviewSnapshot>;
  /** #013 fix — interviews row 존재 여부. EmptyState/RegenerateAccordion 가드용. */
  hasInterview?: boolean;
  /** #013 fix — 프로젝트 status. PBL_ELIGIBLE_STATUSES 가드용. */
  projectStatus?: string;
  /** 버전 변경 시 호출. 상위가 fetch → state 업데이트 책임. */
  onSelectVersion: (versionId: string) => void | Promise<void>;
  /** 섹션 편집 patch. OPS role 에서는 호출되지 않음(optional 로 허용). */
  onEdit?: (patch: PBLResultEditPayload) => Promise<void>;
  /** 새 버전 생성. OPS role 에서는 호출되지 않음. */
  onGenerate?: (revisionPrompt?: string) => Promise<void>;
  /** 다운로드 (PDF/XLSX/HWPX). */
  onDownload: (type: DownloadType) => Promise<void>;
  isGenerating?: boolean;
  isGenerationComplete?: boolean;
  onCancelGenerate?: () => void;
  companyName?: string;
}

type TabValue = 'overview' | 'analysis' | 'tasks' | 'ops' | 'outcomes';

const NOOP_EDIT: (patch: PBLResultEditPayload) => Promise<void> = async () => {};
const NOOP_GENERATE: (revisionPrompt?: string) => Promise<void> = async () => {};

export function PBLResultClient({
  role,
  projectId: _projectId,
  versions,
  selectedVersion,
  interview,
  hasInterview = false,
  projectStatus = '',
  onSelectVersion,
  onEdit,
  onGenerate,
  onDownload,
  isGenerating = false,
  isGenerationComplete = false,
  onCancelGenerate,
  companyName = '',
}: PBLResultClientProps) {
  const [downloadLoading, setDownloadLoading] = useState<DownloadType | null>(null);
  const [revisionPrompt, setRevisionPrompt] = useState('');

  const capabilities = useMemo(() => ROLE_CAPABILITIES[role], [role]);

  const isDraft = selectedVersion?.status === 'DRAFT';
  const isFinal = selectedVersion?.status === 'FINAL';
  const isArchived = selectedVersion?.status === 'ARCHIVED';
  const hasVersions = versions.length > 0;
  // #013 fix — 인터뷰 row + 프로젝트 status 사전 가드. server-side 검증 fail 후
  // generic 토스트 ("오류가 발생했습니다.") 대신 클릭 자체를 차단해 사용자가 다음
  // 단계를 명확히 알 수 있게 한다.
  const isStatusEligible =
    !!projectStatus &&
    (PBL_ELIGIBLE_STATUSES as readonly string[]).includes(projectStatus as ProjectStatus);
  const canGeneratePbl = hasInterview && isStatusEligible;
  // PR5 (R6 spec) — DRAFT/FINAL 모두 편집 허용. ARCHIVED 만 차단.
  const tabReadOnly = isArchived || !capabilities.canEdit;

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

  // #13 fix — 매 렌더 새 객체/배열 생성 차단 (RoadmapResultClient 와 동일 패턴).
  const commonTabProps = useMemo(
    () => ({
      version: selectedVersion,
      interview,
      readOnly: tabReadOnly,
      onEdit: onEdit ?? NOOP_EDIT,
    }),
    [selectedVersion, interview, tabReadOnly, onEdit],
  );

  const tabs: ResultTabItem[] = useMemo(
    () => [
      {
        value: 'overview' satisfies TabValue,
        label: 'Ⅰ. 개요',
        content: <TabPBLOverview {...commonTabProps} />,
      },
      {
        value: 'analysis' satisfies TabValue,
        label: 'Ⅱ. 요구분석',
        content: <TabPBLAnalysis {...commonTabProps} />,
      },
      {
        value: 'tasks' satisfies TabValue,
        label: 'Ⅲ. 훈련과제 도출',
        content: <TabPBLTasks {...commonTabProps} />,
      },
      {
        value: 'ops' satisfies TabValue,
        label: 'Ⅳ. 운영계획',
        content: <TabPBLOps {...commonTabProps} />,
      },
      {
        value: 'outcomes' satisfies TabValue,
        label: 'Ⅴ. 성과분석',
        content: <TabPBLOutcomes {...commonTabProps} />,
      },
    ],
    [commonTabProps],
  );

  return (
    <>
      <PageContainer>
        <PageHeader
          title="AI PBL 과정개발 결과"
          description="산인공 공식 양식 2번 기반 5섹션 구조 (개요 / 요구분석 / 훈련과제 도출 / 운영계획 / 성과분석)"
        />

        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <VersionSelector<PBLReportRow>
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
            disabled={!canGeneratePbl}
          />
        )}

        {/* PR5 (R6 spec) — FINAL in-place 수정 안내 배너 */}
        {selectedVersion && isFinal && capabilities.canEdit && (
          <div
            className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
            data-testid="pbl-final-edit-warning-banner"
          >
            <strong>확정된 PBL 결과를 수정합니다.</strong> 동일 버전(v
            {selectedVersion.version_number})에 그대로 반영되며, 수정 이력은 감사로그에
            기록됩니다.
          </div>
        )}

        {selectedVersion ? (
          <ResultTabs tabs={tabs} defaultValue="overview" />
        ) : (
          <EmptyState
            hasInterview={hasInterview}
            isStatusEligible={isStatusEligible}
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
  hasInterview: boolean;
  isStatusEligible: boolean;
}

function EmptyState({ hasInterview, isStatusEligible }: EmptyStateProps) {
  // #013 fix — 인터뷰/status 부재 케이스를 안내 문구로 명확히 구분
  const guideMessage = !hasInterview
    ? '인터뷰가 완료되지 않았습니다. 인터뷰 입력을 먼저 완료해주세요.'
    : !isStatusEligible
      ? '프로젝트가 인터뷰 완료 상태가 아닙니다. 인터뷰 입력의 "최종 제출" 을 완료해주세요.'
      : '인터뷰가 완료되었습니다. 상단 "새 버전 생성" 을 눌러 AI PBL 보고서를 생성하세요.';

  return (
    <div className="rounded-lg border bg-card p-12 text-center">
      <h3 className="text-base font-semibold">아직 생성된 PBL 보고서가 없습니다</h3>
      <p className="mt-2 text-sm text-muted-foreground">{guideMessage}</p>
    </div>
  );
}
