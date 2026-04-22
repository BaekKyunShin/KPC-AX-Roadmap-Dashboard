'use client';

import { useMemo, useState } from 'react';
import { Download, FileText, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { RegenerateAccordion } from '@/components/roadmap/RegenerateAccordion';
import { usePBLDownload } from '@/hooks/usePBLDownload';
import { useHwpxDownload } from '@/hooks/useHwpxDownload';
import { PBLOperationGoal } from '@/components/pbl/PBLOperationGoal';
import { PBLOverview } from '@/components/pbl/PBLOverview';
import { PBLTrainingTargets } from '@/components/pbl/PBLTrainingTargets';
import { PBLToolUsagePlan } from '@/components/pbl/PBLToolUsagePlan';
import { PBLTrainingPlan } from '@/components/pbl/PBLTrainingPlan';
import { PBLEvaluationPlan } from '@/components/pbl/PBLEvaluationPlan';
import { PBLPerformanceMetrics } from '@/components/pbl/PBLPerformanceMetrics';
import { PBLVersionSelector } from '@/components/pbl/PBLVersionSelector';
import { showErrorToast, showSuccessToast } from '@/lib/utils/toast';
import { isCancelledError } from '@/lib/services/llm';
import type {
  PBLAIToolUsagePlanItem,
  PBLContent,
  PBLEvaluationPlan as PBLEvaluationPlanType,
  PBLPerformanceAnalysis,
  PBLReportRow,
  PBLTrainingPlan as PBLTrainingPlanType,
} from '@/lib/services/pbl';
import type { AILevel, TrainingGoal } from '@/lib/schemas/interview-pbl';
import {
  cancelPBLGeneration,
  deletePBLAction,
  exportPBLAsHwpxAction,
  fetchPBLReport,
  fetchPBLVersions,
  finalizePBLAction,
  generatePBLAction,
  savePBLDraftAction,
  togglePBLShareAction,
} from '../actions';

interface PBLInterviewOverviewSummary {
  companyName: string;
  courseName: string;
  trainingHours: number;
  traineeCount: number;
  trainingJob: string;
  aiLevel: AILevel;
  trainingGoals: TrainingGoal[];
}

interface PBLInterviewTargetSummary {
  trainingNeedsAnalysis: string;
  selectionReason: string;
  details: Array<{
    id: string;
    task_name: string;
    as_is: string;
    to_be: string;
    required_knowledge: string;
    required_skill: string;
  }>;
}

export interface ConsultantPBLClientProps {
  projectId: string;
  companyName: string;
  initialVersions: PBLReportRow[];
  initialSelected: PBLReportRow | null;
  interviewOverview: PBLInterviewOverviewSummary | null;
  interviewTargets: PBLInterviewTargetSummary | null;
}

export default function ConsultantPBLClient({
  projectId,
  companyName,
  initialVersions,
  initialSelected,
  interviewOverview,
  interviewTargets,
}: ConsultantPBLClientProps) {
  const [versions, setVersions] = useState<PBLReportRow[]>(initialVersions);
  const [selected, setSelected] = useState<PBLReportRow | null>(initialSelected);
  const [revisionPrompt, setRevisionPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isShareUpdating, setIsShareUpdating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { isDownloading, downloadPDF, downloadXLSX } = usePBLDownload();
  const { download: downloadHwpx, isLoading: isHwpxDownloading } = useHwpxDownload({
    action: () => exportPBLAsHwpxAction(selected?.id ?? ''),
    successMessage: 'PBL HWPX 다운로드 완료',
    errorTitle: 'PBL HWPX 다운로드 실패',
  });
  const handleDownloadHwpx = () => {
    if (selected) void downloadHwpx();
  };

  const canEdit = selected?.status === 'DRAFT';

  const handleGenerate = async () => {
    setIsGenerating(true);
    const result = await generatePBLAction(projectId, revisionPrompt || undefined);
    if (result.success) {
      showSuccessToast('PBL 보고서 생성', '초안이 생성되었습니다.');
      setRevisionPrompt('');
      const [fresh, latest] = await Promise.all([
        fetchPBLVersions(projectId),
        fetchPBLReport(result.data.pblId),
      ]);
      setVersions(fresh);
      if (latest) setSelected(latest);
    } else if (!isCancelledError(result.error)) {
      showErrorToast('PBL 보고서 생성 실패', result.error);
    }
    setIsGenerating(false);
  };

  const handleCancelGenerate = async () => {
    setIsGenerating(false);
    await cancelPBLGeneration();
  };

  const handleSelect = async (versionId: string) => {
    const row = await fetchPBLReport(versionId);
    if (row) setSelected(row);
  };

  const handleFinalize = async () => {
    if (!selected) return;
    if (!confirm('이 PBL 보고서를 최종 확정하시겠습니까? 기존 확정본은 이전 확정본으로 변경됩니다.')) {
      return;
    }
    setIsFinalizing(true);
    const result = await finalizePBLAction(selected.id);
    if (result.success) {
      showSuccessToast('최종 확정 완료', 'PBL 보고서가 최종 확정되었습니다.');
      const fresh = await fetchPBLVersions(projectId);
      setVersions(fresh);
      const updated = fresh.find((v) => v.id === selected.id);
      if (updated) setSelected(updated);
    } else {
      showErrorToast('최종 확정 실패', result.error ?? '확정에 실패했습니다.');
    }
    setIsFinalizing(false);
  };

  const handleDelete = async () => {
    if (!selected) return;
    if (!confirm('이 DRAFT 버전을 삭제하시겠습니까?')) return;
    setIsDeleting(true);
    const result = await deletePBLAction(selected.id);
    if (result.success) {
      showSuccessToast('DRAFT 삭제 완료', '해당 버전이 삭제되었습니다.');
      const fresh = await fetchPBLVersions(projectId);
      setVersions(fresh);
      setSelected(fresh[0] ?? null);
    } else {
      showErrorToast('DRAFT 삭제 실패', result.error ?? '삭제에 실패했습니다.');
    }
    setIsDeleting(false);
  };

  const handleToggleShare = async (next: boolean) => {
    if (!selected) return;
    setIsShareUpdating(true);
    const result = await togglePBLShareAction(selected.id, next);
    if (result.success) {
      showSuccessToast(next ? '갤러리에 공유되었습니다' : '갤러리 공유가 해제되었습니다');
      const fresh = await fetchPBLVersions(projectId);
      setVersions(fresh);
      const updated = fresh.find((v) => v.id === selected.id);
      if (updated) setSelected(updated);
    } else {
      showErrorToast('공유 설정 실패', result.error ?? '공유 설정에 실패했습니다.');
    }
    setIsShareUpdating(false);
  };

  // ───── 섹션 편집 (낙관적 업데이트) ─────

  const runContentUpdate = async (next: PBLContent) => {
    if (!selected) return;
    const prev = selected;
    const optimistic: PBLReportRow = { ...prev, pbl_content: next };
    setSelected(optimistic);
    setVersions((vs) => vs.map((v) => (v.id === optimistic.id ? optimistic : v)));

    setIsSaving(true);
    const result = await savePBLDraftAction(prev.id, { pbl_content: next });
    setIsSaving(false);

    if (!result.success) {
      setSelected(prev);
      setVersions((vs) => vs.map((v) => (v.id === prev.id ? prev : v)));
      showErrorToast('저장 실패', result.error ?? '변경 사항을 저장하지 못했습니다.');
    }
  };

  const content = selected?.pbl_content;

  const handleTrainingGoalChange = (nextGoal: string) => {
    if (!content) return;
    runContentUpdate({
      ...content,
      operation_plan: { ...content.operation_plan, training_goal: nextGoal },
    });
  };

  const handleToolPlanChange = (nextPlan: PBLAIToolUsagePlanItem[]) => {
    if (!content) return;
    runContentUpdate({
      ...content,
      operation_plan: { ...content.operation_plan, ai_tool_usage_plan: nextPlan },
    });
  };

  const handleTrainingPlanChange = (nextPlan: PBLTrainingPlanType) => {
    if (!content) return;
    runContentUpdate({
      ...content,
      operation_plan: { ...content.operation_plan, training_plan: nextPlan },
    });
  };

  const handleEvaluationPlanChange = (nextPlan: PBLEvaluationPlanType) => {
    if (!content) return;
    runContentUpdate({
      ...content,
      operation_plan: { ...content.operation_plan, evaluation_plan: nextPlan },
    });
  };

  const handlePerformanceChange = (nextPerformance: PBLPerformanceAnalysis) => {
    if (!content) return;
    runContentUpdate({ ...content, performance_analysis: nextPerformance });
  };

  const hasAny = versions.length > 0;
  const headerActions = useMemo(() => {
    if (!selected) {
      return (
        <Button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="bg-primary text-primary-foreground"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              생성 중…
            </>
          ) : (
            'PBL 보고서 생성'
          )}
        </Button>
      );
    }
    return (
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => selected && downloadPDF(selected.id)}
          disabled={isDownloading !== null}
        >
          {isDownloading === 'PDF' ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-1" />
          )}
          PDF
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => selected && downloadXLSX(selected.id)}
          disabled={isDownloading !== null}
        >
          {isDownloading === 'XLSX' ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-1" />
          )}
          Excel
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownloadHwpx}
          disabled={isDownloading !== null || isHwpxDownloading}
        >
          {isHwpxDownloading ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-1" />
          )}
          HWPX
        </Button>
        {canEdit && (
          <Button
            onClick={handleFinalize}
            disabled={isFinalizing}
            className="bg-green-600 hover:bg-green-700 text-white text-sm"
          >
            {isFinalizing ? '처리 중...' : '최종 확정'}
          </Button>
        )}
        {canEdit && (
          <Button
            variant="outline"
            className="text-destructive border-destructive/30 hover:bg-destructive/10"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            DRAFT 삭제
          </Button>
        )}
        {selected.status === 'FINAL' && (
          <Button
            variant={selected.is_shared ? 'outline' : 'default'}
            disabled={isShareUpdating}
            onClick={() => handleToggleShare(!selected.is_shared)}
          >
            {isShareUpdating
              ? '처리 중...'
              : selected.is_shared
              ? '갤러리 공유 해제'
              : '갤러리 공유'}
          </Button>
        )}
      </div>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, isGenerating, isFinalizing, isDeleting, isShareUpdating, canEdit, isDownloading, isHwpxDownloading]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${companyName} · PBL 보고서`}
        description="산업인력공단 PBL 양식 2번 Ⅳ·Ⅴ장 기반. LLM 초안을 편집 후 최종 확정하세요."
        backLink={{
          href: `/consultant/projects/${projectId}`,
          label: '프로젝트로 돌아가기',
          useBack: true,
        }}
        actions={headerActions}
      />

      {hasAny && (
        <div className="bg-background border border-border rounded-lg p-3 flex items-center justify-between gap-3 flex-wrap">
          {/* PBLVersionSelector 내부에 이미 상태 배지가 포함돼 있어 외부 배지는 두지 않는다 (중복 방지). */}
          <PBLVersionSelector
            versions={versions}
            selectedId={selected?.id}
            onSelect={handleSelect}
          />
          {isSaving && (
            <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> 저장 중…
            </span>
          )}
        </div>
      )}

      {/* 수정 요청 아코디언 — 버전이 있을 때만 노출 (빈 상태에서는 큰 생성 버튼 단독 노출) */}
      {hasAny && (
        <RegenerateAccordion
          value={revisionPrompt}
          onChange={setRevisionPrompt}
          onSubmit={handleGenerate}
          isLoading={isGenerating}
        />
      )}

      {isGenerating && (
        <div className="flex items-center justify-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-sm text-primary">
            AI가 PBL 보고서 초안을 작성 중입니다. 최대 30초 정도 소요될 수 있습니다.
          </span>
          <Button variant="outline" size="sm" onClick={handleCancelGenerate}>
            취소
          </Button>
        </div>
      )}

      {!selected && (
        <div className="bg-white shadow rounded-lg p-12 text-center">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-base font-semibold text-gray-900">
            아직 생성된 PBL 보고서가 없습니다
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            인터뷰가 완료되면 AI가 산인공 양식 2번 Ⅳ·Ⅴ장 기반으로 PBL 보고서를 생성합니다.
          </p>
          <Button
            type="button"
            size="lg"
            className="mt-6"
            onClick={handleGenerate}
            disabled={isGenerating}
            data-testid="empty-pbl-generate-btn"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> 생성 중…
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" /> AI PBL 보고서 생성
              </>
            )}
          </Button>
        </div>
      )}

      {selected && content && (
        <div className="space-y-4">
          {interviewOverview && <PBLOverview value={interviewOverview} />}
          {interviewTargets && (
            <PBLTrainingTargets
              trainingNeedsAnalysis={interviewTargets.trainingNeedsAnalysis}
              selectionReason={interviewTargets.selectionReason}
              details={interviewTargets.details}
            />
          )}
          <PBLOperationGoal
            canEdit={canEdit}
            value={content.operation_plan.training_goal}
            onChange={handleTrainingGoalChange}
          />
          <PBLToolUsagePlan
            canEdit={canEdit}
            value={content.operation_plan.ai_tool_usage_plan}
            onChange={handleToolPlanChange}
          />
          <PBLTrainingPlan
            canEdit={canEdit}
            value={content.operation_plan.training_plan}
            onChange={handleTrainingPlanChange}
          />
          <PBLEvaluationPlan
            canEdit={canEdit}
            value={content.operation_plan.evaluation_plan}
            onChange={handleEvaluationPlanChange}
          />
          <PBLPerformanceMetrics
            canEdit={canEdit}
            value={content.performance_analysis}
            onChange={handlePerformanceChange}
          />
        </div>
      )}
    </div>
  );
}
