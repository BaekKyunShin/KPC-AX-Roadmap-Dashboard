'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { usePBLDownload } from '@/hooks/usePBLDownload';
import { PBLStatusBadge } from '@/components/pbl/PBLStatusBadge';
import { PBLVersionSelector } from '@/components/pbl/PBLVersionSelector';
import { PBLToolUsagePlan } from '@/components/pbl/PBLToolUsagePlan';
import { PBLTrainingPlan } from '@/components/pbl/PBLTrainingPlan';
import { PBLEvaluationPlan } from '@/components/pbl/PBLEvaluationPlan';
import { PBLPerformanceMetrics } from '@/components/pbl/PBLPerformanceMetrics';
import { showErrorToast } from '@/lib/utils/toast';
import type { PBLReportRow } from '@/lib/services/pbl';
import { fetchPBLForOps } from '../actions';

interface OpsPBLClientProps {
  projectId: string;
  initialVersions: PBLReportRow[];
  initialSelected: PBLReportRow | null;
}

export default function OpsPBLClient({
  projectId,
  initialVersions,
  initialSelected,
}: OpsPBLClientProps) {
  const [versions] = useState<PBLReportRow[]>(initialVersions);
  const [selected, setSelected] = useState<PBLReportRow | null>(initialSelected);
  const { isDownloading, downloadPDF, downloadXLSX } = usePBLDownload();

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
            <PBLVersionSelector
              versions={versions}
              selectedId={selected?.id}
              onSelect={handleSelect}
            />
            {selected && (
              <PBLStatusBadge
                status={selected.status}
                versionNumber={selected.version_number}
              />
            )}
          </div>

          {selected && content && (
            <div className="space-y-4">
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
              <PBLPerformanceMetrics
                canEdit={false}
                value={content.performance_analysis}
                onChange={() => {}}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
