'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { usePBLDownload } from '@/hooks/usePBLDownload';
import { useHwpxDownload } from '@/hooks/useHwpxDownload';
import { exportPBLAsHwpxAction } from '@/app/(dashboard)/consultant/projects/[id]/pbl/actions';
import { PBLOperationGoal } from '@/components/pbl/PBLOperationGoal';
import { PBLOverview } from '@/components/pbl/PBLOverview';
import { PBLTrainingTargets } from '@/components/pbl/PBLTrainingTargets';
import { PBLVersionSelector } from '@/components/pbl/PBLVersionSelector';
import { PBLToolUsagePlan } from '@/components/pbl/PBLToolUsagePlan';
import { PBLTrainingPlan } from '@/components/pbl/PBLTrainingPlan';
import { PBLEvaluationPlan } from '@/components/pbl/PBLEvaluationPlan';
import { showErrorToast } from '@/lib/utils/toast';
import type { PBLReportRow } from '@/lib/services/pbl';
import type { PBLTrainingTargetDetail } from '@/components/pbl/PBLTrainingTargets';
import type { AILevel, TrainingGoal } from '@/lib/schemas/interview-pbl';
import { fetchPBLForOps } from '../actions';

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
  details: PBLTrainingTargetDetail[];
}

interface OpsPBLClientProps {
  projectId: string;
  initialVersions: PBLReportRow[];
  initialSelected: PBLReportRow | null;
  interviewOverview: PBLInterviewOverviewSummary | null;
  interviewTargets: PBLInterviewTargetSummary | null;
}

export default function OpsPBLClient({
  projectId,
  initialVersions,
  initialSelected,
  interviewOverview,
  interviewTargets,
}: OpsPBLClientProps) {
  const [versions] = useState<PBLReportRow[]>(initialVersions);
  const [selected, setSelected] = useState<PBLReportRow | null>(initialSelected);
  const { isDownloading, downloadPDF, downloadXLSX } = usePBLDownload();
  const { download: downloadHwpx, isLoading: isHwpxLoading } = useHwpxDownload({
    action: () => exportPBLAsHwpxAction(selected?.id ?? ''),
    successMessage: 'PBL HWPX 다운로드 완료',
    errorTitle: 'PBL HWPX 다운로드 실패',
  });

  const handleSelect = async (versionId: string) => {
    try {
      const row = await fetchPBLForOps(versionId);
      if (row) setSelected(row);
    } catch {
      showErrorToast('PBL 버전 조회 실패', '네트워크 오류가 발생했습니다.');
    }
  };

  const content = selected?.pbl_content;

  return (
    <div className="space-y-6">
      <PageHeader
        title="PBL 보고서 (감사 열람)"
        description="품질 관리 및 감사 목적으로 열람합니다."
        backLink={{
          href: `/ops/projects/${projectId}`,
          label: '프로젝트로 돌아가기',
          useBack: true,
        }}
        actions={
          selected ? (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadPDF(selected.id)}
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
                onClick={() => downloadXLSX(selected.id)}
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
                onClick={() => downloadHwpx()}
                disabled={isHwpxLoading || isDownloading !== null}
              >
                {isHwpxLoading ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-1" />
                )}
                HWPX
              </Button>
            </div>
          ) : undefined
        }
      />
      {versions.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/20 p-8 text-center text-sm text-muted-foreground">
          이 프로젝트에는 아직 PBL 보고서가 없습니다.
        </div>
      ) : (
        <>
          <div className="bg-background border border-border rounded-lg p-3 flex items-center gap-2 flex-wrap">
            {/* 상태 배지는 PBLVersionSelector 내부에 포함됨 — 외부 중복 제거 */}
            <PBLVersionSelector
              versions={versions}
              selectedId={selected?.id}
              onSelect={handleSelect}
            />
          </div>

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
                canEdit={false}
                value={content.operation_plan.training_goal}
                onChange={() => {}}
              />
              <PBLToolUsagePlan
                canEdit={false}
                value={content.operation_plan.ai_tool_usage_plan}
                onChange={() => {}}
              />
              <PBLTrainingPlan
                canEdit={false}
                value={content.operation_plan.training_plan}
                onChange={() => {}}
              />
              <PBLEvaluationPlan
                canEdit={false}
                value={content.operation_plan.evaluation_plan}
                onChange={() => {}}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
