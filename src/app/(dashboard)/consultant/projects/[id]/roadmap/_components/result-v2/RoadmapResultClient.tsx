'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

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
import { Plus, CheckCircle2, FileText } from 'lucide-react';
import type { RoadmapVersionUI } from '@/types/roadmap-ui';
import { ROADMAP_ELIGIBLE_STATUSES } from '@/lib/constants/status';
import type { ProjectStatus } from '@/types/database';

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
  /**
   * #013 fix — EmptyState 가드 강화용. 자가진단 row 가 존재해야 LLM 호출 시
   * roadmap-generator.ts:285 의 `자가진단 결과가 없습니다.` throw 회피.
   * server-side 에서 조회 후 prop drill.
   */
  selfAssessmentExists?: boolean;
  /**
   * #013 fix — 프로젝트 status. ROADMAP_ELIGIBLE_STATUSES (INTERVIEWED 이상)
   * 가 아니면 EmptyState 의 "AI 로드맵 생성" 버튼을 차단해 사전 검증.
   */
  projectStatus?: string;
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
  projectId,
  versions,
  selectedVersion,
  interview,
  selfAssessmentExists = false,
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
}: RoadmapResultClientProps) {
  const [downloadLoading, setDownloadLoading] = useState<DownloadType | null>(null);
  const [revisionPrompt, setRevisionPrompt] = useState('');
  // #2 — 최종 확정 AlertDialog 노출 상태. window.confirm 대체.
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // #5 H2·H4·H7 — 검토 페이지 「새 버전 생성」 클릭 시 ?regenerate=open 으로 진입.
  // 결과 페이지가 쿼리를 감지해 RegenerateAccordion 자동 펼침 + textarea 포커스 + 부드러운 스크롤.
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const isRegenerateRequested = searchParams?.get('regenerate') === 'open';
  const accordionRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (isRegenerateRequested && accordionRef.current) {
      accordionRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // URL cleanup — 새로고침 시 또 펼치지 않게 쿼리 제거 (히스토리 누적 방지).
      router.replace(pathname);
    }
  }, [isRegenerateRequested, router, pathname]);

  const capabilities = useMemo(() => ROLE_CAPABILITIES[role], [role]);

  const isDraft = selectedVersion?.status === 'DRAFT';
  const isFinal = selectedVersion?.status === 'FINAL';
  const isArchived = selectedVersion?.status === 'ARCHIVED';
  const hasVersions = versions.length > 0;
  // #002 — 인터뷰 snapshot 이 비어있으면 EmptyState 에서 생성 버튼을 사전 차단.
  // ROADMAP_ELIGIBLE_STATUSES 가 'INTERVIEWED' 이상을 통과시키지만, 실제 interviews
  // 행이 없는 케이스가 존재하므로 클라이언트에서 한 번 더 가드.
  const hasInterview = !!interview && Object.keys(interview).length > 0;
  // #013 fix — status·자가진단 사전 가드. server-side 검증 fail 후 silent fail
  // 의 generic 토스트 (`오류가 발생했습니다.`) 대신 클릭 자체를 차단해 사용자가
  // 다음 단계를 명확히 알 수 있게 한다.
  const isStatusEligible =
    !!projectStatus &&
    (ROADMAP_ELIGIBLE_STATUSES as readonly string[]).includes(projectStatus as ProjectStatus);
  const canGenerateRoadmap = hasInterview && selfAssessmentExists && isStatusEligible;
  // PR5 (R6 spec) — DRAFT/FINAL 모두 편집 허용. ARCHIVED 만 차단.
  // FINAL in-place 수정은 동일 version_number 유지, 변경 이력은 audit_logs 기록.
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

  async function handleFinalize() {
    // #2 — window.confirm 대신 shadcn AlertDialog 노출. 실제 onFinalize 는
    // confirmFinalize() 에서 호출.
    if (!selectedVersion || !onFinalize) return;
    setIsConfirmOpen(true);
  }

  async function confirmFinalize() {
    if (!selectedVersion || !onFinalize) return;
    setIsConfirmOpen(false);
    await onFinalize(selectedVersion.id);
  }

  async function handleEmptyStateGenerate() {
    // EmptyState 의 큰 "AI 로드맵 생성" 버튼 — 아코디언의 수정 prompt 없이 즉시 생성.
    await (onGenerate ?? NOOP_GENERATE)();
  }

  // #13 fix — 매 렌더 새 객체/배열 생성 차단. commonTabProps 가 stable 하면
  // tabs 도 stable 하고, 자식 Tab* 컴포넌트들의 React reconciliation 비용이 줄어든다.
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
    ],
    [commonTabProps],
  );

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
          <div ref={accordionRef}>
            <RegenerateAccordion
              value={revisionPrompt}
              onChange={setRevisionPrompt}
              onSubmit={handleRegenerate}
              isLoading={isGenerating}
              defaultOpen={isRegenerateRequested}
              autoFocus={isRegenerateRequested}
            />
          </div>
        )}

        {/* PR5 (R6 spec) — FINAL in-place 수정 안내 배너 */}
        {selectedVersion && isFinal && capabilities.canEdit && (
          <div
            className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
            data-testid="final-edit-warning-banner"
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
            onGenerate={handleEmptyStateGenerate}
            isGenerating={isGenerating}
            hasInterview={hasInterview}
            selfAssessmentExists={selfAssessmentExists}
            isStatusEligible={isStatusEligible}
            canGenerateRoadmap={canGenerateRoadmap}
            projectId={projectId}
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

      {/* #2 — 최종 확정 확인 AlertDialog (window.confirm 대체). */}
      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>로드맵을 최종 확정하시겠습니까?</AlertDialogTitle>
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
  onGenerate: () => void | Promise<void>;
  isGenerating: boolean;
  /** #002 가드 — 인터뷰 부재 시 안내 + 인터뷰 페이지 CTA. */
  hasInterview: boolean;
  /** #013 가드 — 자가진단 row 존재 여부. */
  selfAssessmentExists: boolean;
  /** #013 가드 — 프로젝트 status 가 ROADMAP_ELIGIBLE_STATUSES 에 속하는지. */
  isStatusEligible: boolean;
  /** #013 가드 — 위 3 조건 종합 (true 일 때만 클릭 enabled). */
  canGenerateRoadmap: boolean;
  /** 인터뷰 페이지 링크 생성용. */
  projectId: string;
}

function EmptyState({
  canGenerate,
  onGenerate,
  isGenerating,
  hasInterview,
  selfAssessmentExists,
  isStatusEligible,
  canGenerateRoadmap,
  projectId,
}: EmptyStateProps) {
  // CONSULTANT 이고 인터뷰 부재 — 안내 + CTA 우선 노출 (생성 버튼 disabled)
  if (canGenerate && !hasInterview) {
    return (
      <div className="rounded-lg border bg-card p-12 text-center">
        <FileText
          className="mx-auto h-12 w-12 text-amber-500"
          aria-hidden="true"
        />
        <h3 className="mt-4 text-base font-semibold">
          현장 인터뷰를 먼저 완료해주세요
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          AI 로드맵 생성에는 현장 인터뷰 데이터가 필요합니다.
        </p>
        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href={`/consultant/projects/${projectId}/interview`}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
          >
            <FileText className="size-4" aria-hidden="true" />
            인터뷰 입력하러 가기
          </Link>
          <Button
            type="button"
            size="lg"
            variant="outline"
            disabled
            data-testid="empty-state-generate-roadmap"
          >
            <Plus className="mr-1.5 size-4" aria-hidden="true" />
            AI 로드맵 생성
          </Button>
        </div>
      </div>
    );
  }

  // #013 fix — 인터뷰는 있으나 자가진단/status 가 안 맞는 경우 명확한 안내.
  const guideMessage = !selfAssessmentExists
    ? '자가진단 결과가 없습니다. 자가진단을 먼저 완료해주세요.'
    : !isStatusEligible
      ? '인터뷰는 작성됐지만 아직 최종 제출 전입니다. 인터뷰 페이지 하단의 "최종 제출" 버튼을 눌러주세요.'
      : '인터뷰가 완료된 후 아래 버튼을 눌러 AI 훈련 로드맵을 생성하세요.';

  return (
    <div className="rounded-lg border bg-card p-12 text-center">
      <h3 className="text-base font-semibold">아직 생성된 로드맵이 없습니다</h3>
      <p className="mt-2 text-sm text-muted-foreground">{guideMessage}</p>
      {canGenerate && (
        <div className="mt-6">
          <Button
            type="button"
            size="lg"
            onClick={() => void onGenerate()}
            disabled={isGenerating || !canGenerateRoadmap}
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
