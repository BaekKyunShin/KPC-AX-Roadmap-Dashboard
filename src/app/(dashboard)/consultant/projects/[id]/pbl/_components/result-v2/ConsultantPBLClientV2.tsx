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
import type { PBLReportRow } from '@/lib/services/pbl/pbl-crud';

import { TabPBLOverview } from './TabPBLOverview';
import { TabPBLAnalysis } from './TabPBLAnalysis';
import { TabPBLTasks } from './TabPBLTasks';
import { TabPBLOps } from './TabPBLOps';
import { TabPBLOutcomes } from './TabPBLOutcomes';
import type { PBLResultEditPayload, ResultPBLInterviewSnapshot } from './types';

/**
 * PR #2 Task 2.6 — PBL 결과 화면 V2 (5탭 재구현).
 *
 * 탭 구성:
 *  - Ⅰ. 개요           : 인터뷰 입력값 (훈련과정 개요)
 *  - Ⅱ. 요구분석       : 인터뷰 입력값 (경영이슈 · 조직도 · 훈련환경 · HRD이음 PDF · 개발 필요성)
 *  - Ⅲ. 훈련과제 도출  : 인터뷰 입력값 (수행활동 · 문제 · 우선순위 · 훈련대상 업무 · AI 수준)
 *  - Ⅳ. 운영계획       : LLM 결과 placeholder (Task 2.10 담당)
 *      · Ⅳ-4-나 결과평가 계획 [고정 양식·결과 화면 제외] — 렌더 금지
 *  - Ⅴ. 성과분석       : LLM 결과 placeholder (Task 2.10 담당)
 *
 * 제외 (양식·결과 화면 제외 항목):
 *  - [결과물 표지] 양식 첫 페이지 표지 — 렌더 금지
 *  - [결과보고서] 섹션 (P-27~P-29) — 렌더 금지 (별첨 수행일지·참고자료)
 *  - Ⅳ-4-나 결과평가 계획 [고정 양식·결과 화면 제외] — 렌더 금지
 *
 * props 외주 패턴 — Server Action 호출은 상위 페이지가 담당. 본 Client 는 UI 만
 * 구성하며, `onSelectVersion` / `onGenerate` / `onEdit` / `onDownload` 를 통해 상위에
 * 위임한다 (로드맵 결과 V2 / PBL 인터뷰 V2 와 동일 전략).
 *
 * 라우트 연결은 **Task 2.11 이월**. 본 파일은 V2 파일만 신설 · 라우트 미연결 상태.
 */

export interface ConsultantPBLClientV2Props {
  projectId: string;
  /** 버전 목록 (desc 정렬 권장). 비어 있으면 빈 상태 UI 표출. */
  versions: PBLReportRow[];
  /** 현재 선택 버전. null 이면 "아직 생성된 PBL 보고서가 없습니다" 상태. */
  selectedVersion: PBLReportRow | null;
  /** 인터뷰 입력값 snapshot (Ⅰ·Ⅱ·Ⅲ 의 읽기 전용 원본). */
  interview?: Partial<ResultPBLInterviewSnapshot>;
  /** 버전 변경 시 호출. 상위가 fetch → state 업데이트 책임. */
  onSelectVersion: (versionId: string) => void | Promise<void>;
  /** 섹션 편집 patch 적용. editPBLManually 등 Server Action 래핑. */
  onEdit: (patch: PBLResultEditPayload) => Promise<void>;
  /** 새 버전 생성 (LLM 호출). 상위가 RegenerateAccordion prompt 와 함께 호출. */
  onGenerate: (revisionPrompt?: string) => Promise<void>;
  /** 다운로드 (PDF/XLSX/HWPX). 상위가 파일 스트리밍 책임. */
  onDownload: (type: DownloadType) => Promise<void>;
  /** 생성 중 (LoadingOverlay 표시). 상위가 cancel 도 관리. */
  isGenerating?: boolean;
  /** 생성 완료 (LoadingOverlay 100% 애니메이션). */
  isGenerationComplete?: boolean;
  /** 생성 취소 콜백 (LoadingOverlay 우상단 X). 미주입 시 취소 버튼 숨김. */
  onCancelGenerate?: () => void;
  /** LoadingOverlay 안내 메시지에 사용할 기업명. */
  companyName?: string;
}

export function ConsultantPBLClientV2({
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
}: ConsultantPBLClientV2Props) {
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
      value: 'overview',
      label: 'Ⅰ. 개요',
      content: <TabPBLOverview {...commonTabProps} />,
    },
    {
      value: 'analysis',
      label: 'Ⅱ. 요구분석',
      content: <TabPBLAnalysis {...commonTabProps} />,
    },
    {
      value: 'tasks',
      label: 'Ⅲ. 훈련과제 도출',
      content: <TabPBLTasks {...commonTabProps} />,
    },
    {
      value: 'ops',
      label: 'Ⅳ. 운영계획',
      content: <TabPBLOps {...commonTabProps} />,
    },
    {
      value: 'outcomes',
      label: 'Ⅴ. 성과분석',
      content: <TabPBLOutcomes {...commonTabProps} />,
    },
  ];

  return (
    <>
      <PageContainer>
        <PageHeader
          title="AI PBL 과정개발 결과"
          description="산인공 공식 양식 2번 기반 5섹션 구조 (개요 / 요구분석 / 훈련과제 도출 / 운영계획 / 성과분석)"
        />

        {/* 버전 셀렉터 + 상태 배지 + 다운로드 버튼 그룹 */}
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

/** 버전이 없을 때 — 인터뷰 완료 후 "새 버전 생성" 으로 첫 PBL 보고서를 만들도록 안내. */
function EmptyState() {
  return (
    <div className="rounded-lg border bg-card p-12 text-center">
      <h3 className="text-base font-semibold">아직 생성된 PBL 보고서가 없습니다</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        인터뷰가 완료되면 상단 &quot;새 버전 생성&quot; 을 눌러 AI PBL 보고서를
        생성하세요.
      </p>
    </div>
  );
}
