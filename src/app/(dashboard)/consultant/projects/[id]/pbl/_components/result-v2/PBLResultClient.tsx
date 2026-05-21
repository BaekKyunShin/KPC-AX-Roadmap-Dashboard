'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, Loader2, Plus } from 'lucide-react';

import { PageContainer } from '@/components/layout/PageContainer';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
  /** PBL 양식 Ⅰ. 신청서 자동표출 7필드 (마이그 071) — TabPBLOverview 표출용. */
  projectMeta?: import('./types').PBLProjectMetaSnapshot;
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
  onFinalize,
  onDownload,
  isGenerating = false,
  isGenerationComplete = false,
  onCancelGenerate,
  companyName = '',
  projectMeta,
}: PBLResultClientProps) {
  const [downloadLoading, setDownloadLoading] = useState<DownloadType | null>(null);
  const [revisionPrompt, setRevisionPrompt] = useState('');
  // 최종 확정 AlertDialog 노출 상태 (window.confirm 대체). 로드맵 패턴과 일치.
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  // 확정 진행 중 대기 스피너 표시. RPC + refresh 까지 await 하는 동안 시각적 피드백.
  const [isFinalizing, setIsFinalizing] = useState(false);

  // #5 H2·H4·H7 — 검토 페이지 「새 버전 생성」 클릭 시 ?regenerate=open 으로 진입.
  // RegenerateAccordion 자동 펼침 + textarea 포커스 + 부드러운 스크롤. ROADMAP 트랙과 동일 패턴.
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const isRegenerateRequested = searchParams?.get('regenerate') === 'open';
  const accordionRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (isRegenerateRequested && accordionRef.current) {
      accordionRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // URL cleanup. scrollIntoView 가 잡은 위치를 보존하기 위해 scroll: false 명시.
      router.replace(pathname, { scroll: false });
    }
  }, [isRegenerateRequested, router, pathname]);

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

  function handleFinalize() {
    // window.confirm 대신 shadcn AlertDialog 노출. 실제 onFinalize 는 confirmFinalize() 에서 호출.
    if (!selectedVersion || !onFinalize) return;
    setIsConfirmOpen(true);
  }

  async function confirmFinalize() {
    if (!selectedVersion || !onFinalize) return;
    setIsConfirmOpen(false);
    setIsFinalizing(true);
    try {
      await onFinalize(selectedVersion.id);
    } finally {
      setIsFinalizing(false);
    }
  }

  // #13 fix — 매 렌더 새 객체/배열 생성 차단 (RoadmapResultClient 와 동일 패턴).
  const commonTabProps = useMemo(
    () => ({
      version: selectedVersion,
      interview,
      projectMeta,
      readOnly: tabReadOnly,
      onEdit: onEdit ?? NOOP_EDIT,
    }),
    [selectedVersion, interview, projectMeta, tabReadOnly, onEdit],
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
            {/* Consultant 전용: DRAFT 선택 시 "최종 확정" 버튼 노출 (로드맵 패턴 동일) */}
            {capabilities.canEdit && isDraft && selectedVersion && onFinalize && (
              <Button
                type="button"
                size="sm"
                variant="default"
                onClick={() => handleFinalize()}
                disabled={isFinalizing}
                data-testid="finalize-pbl-button"
              >
                {isFinalizing ? (
                  <Loader2 className="mr-1 size-4 animate-spin" aria-hidden="true" />
                ) : (
                  <CheckCircle2 className="mr-1 size-4" aria-hidden="true" />
                )}
                {isFinalizing ? '확정 중...' : '최종 확정'}
              </Button>
            )}
          </div>
          <DownloadButtonGroup
            onDownload={handleDownload}
            loading={downloadLoading}
            disabled={!selectedVersion}
          />
        </div>

        {/**
         * 로드맵과 동일 패턴 — RegenerateAccordion 은 versions > 0 일 때만 노출
         * (이미 생성된 PBL의 "수정본" 생성용). versions=0 일 때는 EmptyState 안의
         * 큰 버튼으로 최초 생성 흐름을 유도해 사용자 혼란 차단.
         */}
        {capabilities.showRegenerate && hasVersions && (
          <div ref={accordionRef}>
            <RegenerateAccordion
              value={revisionPrompt}
              onChange={setRevisionPrompt}
              onSubmit={handleRegenerate}
              isLoading={isGenerating}
              disabled={downloadLoading !== null}
              defaultOpen={isRegenerateRequested}
              autoFocus={isRegenerateRequested}
            />
          </div>
        )}

        {/* PR5 (R6 spec) — FINAL in-place 수정 안내 배너 */}
        {selectedVersion && isFinal && capabilities.canEdit && (
          <div
            className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
            data-testid="pbl-final-edit-warning-banner"
          >
            <strong>최종 확정된 v{selectedVersion.version_number}입니다.</strong> 여기서 항목을
            직접 편집하면 새 버전 없이 v{selectedVersion.version_number}이 덮어써집니다.
          </div>
        )}

        {selectedVersion ? (
          <ResultTabs tabs={tabs} defaultValue="overview" />
        ) : (
          <EmptyState
            canGenerate={capabilities.showRegenerate}
            isGenerating={isGenerating}
            hasInterview={hasInterview}
            isStatusEligible={isStatusEligible}
            canGeneratePbl={canGeneratePbl}
            onGenerate={() => void handleRegenerate()}
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

      {/* 최종 확정 확인 AlertDialog (window.confirm 대체). 로드맵 패턴 동일. */}
      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>PBL 보고서를 최종 확정하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              확정하면 프로젝트 상태가 &lsquo;최종 확정&rsquo;으로 바뀌고, 이전 확정본은 자동
              아카이브됩니다.
              <br />
              확정 후에도 항목을 직접 수정할 수 있습니다(같은 버전에 반영).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmFinalize}>
              최종 확정
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

interface EmptyStateProps {
  /** CONSULTANT 역할일 때만 생성 버튼이 노출된다. */
  canGenerate: boolean;
  isGenerating: boolean;
  hasInterview: boolean;
  isStatusEligible: boolean;
  /** 인터뷰 + status 가 모두 충족돼야 생성 버튼이 enabled. */
  canGeneratePbl: boolean;
  onGenerate: () => void;
}

function EmptyState({
  canGenerate,
  isGenerating,
  hasInterview,
  isStatusEligible,
  canGeneratePbl,
  onGenerate,
}: EmptyStateProps) {
  // #013 fix — 인터뷰/status 부재 케이스를 안내 문구로 명확히 구분
  const guideMessage = !hasInterview
    ? '아직 인터뷰 입력이 없습니다. 인터뷰 페이지에서 입력을 진행해주세요.'
    : !isStatusEligible
      ? '인터뷰는 작성됐지만 아직 최종 제출 전입니다. 인터뷰 페이지 하단의 "최종 제출" 버튼을 눌러주세요.'
      : '인터뷰가 완료된 후 아래 버튼을 눌러 AI PBL 보고서를 생성하세요.';

  return (
    <div className="rounded-lg border bg-card p-12 text-center">
      <h3 className="text-base font-semibold">아직 생성된 PBL 보고서가 없습니다</h3>
      <p className="mt-2 text-sm text-muted-foreground">{guideMessage}</p>
      {canGenerate && (
        <div className="mt-6">
          <Button
            type="button"
            size="lg"
            onClick={onGenerate}
            disabled={isGenerating || !canGeneratePbl}
            data-testid="empty-state-generate-pbl"
          >
            <Plus className="mr-1.5 size-4" aria-hidden="true" />
            {isGenerating ? 'AI 생성 중…' : 'AI PBL 보고서 생성'}
          </Button>
        </div>
      )}
    </div>
  );
}
