'use client';

import { useState } from 'react';

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
import type { RoadmapVersionUI } from '@/types/roadmap-ui';

import { TabOverview } from './TabOverview';
import { TabRequirements } from './TabRequirements';
import { TabTraining } from './TabTraining';
import type { RoadmapResultEditPayload, ResultInterviewSnapshot } from './types';

/**
 * PR #2 Task 2.5 — 로드맵 결과 화면 V2 (3탭 재구현).
 *
 * 탭 구성:
 *  - Ⅰ. 개요         : 인터뷰 입력값 (수립 필요성 / 주요 활동 / 주요 결과)
 *  - Ⅱ. 요구분석     : 인터뷰 입력값 (HRD PDF / 기업 요구분석 / 과업 분석 / 훈련대상 과업)
 *  - Ⅲ. 훈련체계     : Ⅲ-1 인터뷰 역량 + Ⅲ-2~Ⅲ-4 LLM 결과 (placeholder: Task 2.9)
 *
 * props 외주 패턴 — Server Action 호출은 상위 페이지가 담당. 본 Client 는 UI 만
 * 구성하며, `onSelectVersion` / `onGenerate` / `onEdit` / `onDownload` 을 통해 상위에
 * 위임한다 (PR #2 인터뷰 V2 Client 와 동일 전략).
 *
 * 라우트 연결은 **Task 2.11 이월**. 본 파일은 V2 파일만 신설 · 라우트 미연결 상태.
 */

export interface ConsultantRoadmapClientV2Props {
  projectId: string;
  /** 버전 목록 (desc 정렬 권장). 비어 있으면 빈 상태 UI 표출. */
  versions: RoadmapVersionUI[];
  /** 현재 선택 버전. null 이면 "아직 생성된 로드맵이 없습니다" 상태. */
  selectedVersion: RoadmapVersionUI | null;
  /** 인터뷰 입력값 snapshot (Ⅰ·Ⅱ·Ⅲ-1 의 읽기 전용 원본). */
  interview?: Partial<ResultInterviewSnapshot>;
  /** 버전 변경 시 호출. 상위가 fetch → state 업데이트 책임. */
  onSelectVersion: (versionId: string) => void | Promise<void>;
  /** 섹션 편집 patch 적용. editRoadmapManually 등 Server Action 래핑. */
  onEdit: (patch: RoadmapResultEditPayload) => Promise<void>;
  /** 새 버전 생성 (LLM 호출). 상위가 RegenerateAccordion prompt 와 함께 호출. */
  onGenerate: (revisionPrompt?: string) => Promise<void>;
  /** 다운로드 (PDF/XLSX/HWPX). 상위가 파일 스트리밍 책임. */
  onDownload: (type: DownloadType) => Promise<void>;
  /** 생성 중 (LoadingOverlay 표시). 상위가 cancel 도 관리하므로 onCancelGenerate 를 같이 주입할 수 있다. */
  isGenerating?: boolean;
  /** 생성 완료 (LoadingOverlay 100% 애니메이션). */
  isGenerationComplete?: boolean;
  /** 생성 취소 콜백 (LoadingOverlay 우상단 X). 미주입 시 취소 버튼 숨김. */
  onCancelGenerate?: () => void;
  /** LoadingOverlay 안내 메시지에 사용할 기업명. */
  companyName?: string;
}

type TabValue = 'overview' | 'requirements' | 'training';

export function ConsultantRoadmapClientV2({
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
}: ConsultantRoadmapClientV2Props) {
  const [downloadLoading, setDownloadLoading] = useState<DownloadType | null>(null);
  const [revisionPrompt, setRevisionPrompt] = useState('');

  const isDraft = selectedVersion?.status === 'DRAFT';
  const hasVersions = versions.length > 0;

  async function handleDownload(type: DownloadType) {
    setDownloadLoading(type);
    try {
      await onDownload(type);
    } finally {
      setDownloadLoading(null);
    }
  }

  async function handleRegenerate() {
    await onGenerate(revisionPrompt || undefined);
    setRevisionPrompt('');
  }

  const commonTabProps = {
    version: selectedVersion,
    interview,
    readOnly: !isDraft,
    onEdit,
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

        {/* 버전 셀렉터 + 상태 배지 + 다운로드 버튼 그룹 */}
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
          </div>
          <DownloadButtonGroup
            onDownload={handleDownload}
            loading={downloadLoading}
            disabled={!selectedVersion}
          />
        </div>

        {/* 새 버전 생성 (모든 상태에서 노출) */}
        <RegenerateAccordion
          value={revisionPrompt}
          onChange={setRevisionPrompt}
          onSubmit={handleRegenerate}
          isLoading={isGenerating}
        />

        {selectedVersion ? (
          <ResultTabs tabs={tabs} defaultValue="overview" />
        ) : (
          <EmptyState />
        )}
      </PageContainer>

      {isGenerating && (
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

/** 버전이 없을 때 — 인터뷰 완료 후 "새 버전 생성" 으로 첫 로드맵을 만들도록 안내. */
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
