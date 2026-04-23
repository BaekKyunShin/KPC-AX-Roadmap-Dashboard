'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { LikeButton } from '@/components/gallery/LikeButton';
import { PBLOverview } from '@/components/pbl/PBLOverview';
import { PBLTrainingTargets } from '@/components/pbl/PBLTrainingTargets';
import { PBLToolUsagePlan } from '@/components/pbl/PBLToolUsagePlan';
import { PBLTrainingPlan } from '@/components/pbl/PBLTrainingPlan';
import { PBLEvaluationPlan } from '@/components/pbl/PBLEvaluationPlan';
import { Copy } from 'lucide-react';
import type { PBLReportDetailView } from '../../actions';
import type {
  PBLContent,
  PBLAIToolUsagePlanItem,
  PBLTrainingPlan as PBLTrainingPlanT,
  PBLEvaluationPlan as PBLEvaluationPlanT,
} from '@/lib/services/pbl/pbl-types';
import type { PBLTrainingTargetDetail } from '@/components/pbl/PBLTrainingTargets';
import type { AILevel, TrainingGoal } from '@/lib/schemas/interview-pbl';

// ============================================================================
// PBL 갤러리 상세 (읽기 전용) — 양식 2번 Ⅰ~Ⅳ장 재사용
//   - 모든 PBL 컴포넌트 canEdit=false
//   - onChange는 noop
// ============================================================================

const TAB_KEYS = [
  { key: 'overview', label: 'Ⅰ 개요' },
  { key: 'targets', label: 'Ⅱ·Ⅲ 요구분석/훈련대상' },
  { key: 'tools', label: 'Ⅳ-2 AI 도구 활용' },
  { key: 'training', label: 'Ⅳ-3 훈련 실시 계획' },
  { key: 'evaluation', label: 'Ⅳ-4 평가 계획' },
] as const;

type TabKey = (typeof TAB_KEYS)[number]['key'];

const noop = () => {};

interface GalleryPBLDetailContentProps {
  detail: PBLReportDetailView;
  isConsultant: boolean;
}

export function GalleryPBLDetailContent({ detail, isConsultant }: GalleryPBLDetailContentProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');

  // pbl_content JSONB → 구조화된 타입
  const content = (detail.pblContent ?? {}) as Partial<PBLContent> & {
    overview_summary?: {
      companyName?: string;
      courseName?: string;
      trainingHours?: number;
      traineeCount?: number;
      trainingJob?: string;
      aiLevel?: AILevel;
      trainingGoals?: TrainingGoal[];
    };
    targets_summary?: {
      trainingNeedsAnalysis?: string;
      selectionReason?: string;
      details?: PBLTrainingTargetDetail[];
    };
  };

  const operationPlan = content.operation_plan;

  // Ⅰ장 개요: pbl_content.overview_summary가 있으면 우선, 없으면 operation_plan에서 합성
  const overviewSummary = content.overview_summary
    ? {
        companyName: content.overview_summary.companyName ?? detail.companyName,
        courseName: content.overview_summary.courseName ?? operationPlan?.training_plan?.subject_profile?.course_name ?? '',
        trainingHours: content.overview_summary.trainingHours ?? operationPlan?.training_plan?.subject_profile?.total_hours ?? 0,
        traineeCount: content.overview_summary.traineeCount ?? 0,
        trainingJob: content.overview_summary.trainingJob ?? '',
        aiLevel: (content.overview_summary.aiLevel ?? 'AI기초형') as AILevel,
        trainingGoals: (content.overview_summary.trainingGoals ?? []) as TrainingGoal[],
      }
    : {
        companyName: detail.companyName,
        courseName: operationPlan?.training_plan?.subject_profile?.course_name ?? '',
        trainingHours: operationPlan?.training_plan?.subject_profile?.total_hours ?? 0,
        traineeCount: 0,
        trainingJob: '',
        aiLevel: 'AI기초형' as AILevel,
        trainingGoals: [] as TrainingGoal[],
      };

  const targetsSummary = content.targets_summary
    ? {
        trainingNeedsAnalysis: content.targets_summary.trainingNeedsAnalysis ?? '',
        selectionReason: content.targets_summary.selectionReason ?? '',
        details: content.targets_summary.details ?? [],
      }
    : null;

  const toolUsagePlan: PBLAIToolUsagePlanItem[] =
    operationPlan?.ai_tool_usage_plan ?? [];

  return (
    <>
      {/* 액션 바 */}
      <div className="flex items-center gap-3">
        <LikeButton
          roadmapVersionId={detail.id}
          track="PBL"
          initialLiked={detail.isLiked}
          initialCount={detail.likeCount}
          size="default"
        />
        {isConsultant && (
          <Button className="gap-1.5" disabled title="PBL 사용하기는 곧 추가됩니다.">
            <Copy className="h-4 w-4" />
            이 PBL 사용하기
          </Button>
        )}
      </div>

      {/* 진단 요약 */}
      {detail.diagnosisSummary && (
        <div className="rounded-lg border bg-gray-50 px-4 py-3">
          <p className="text-sm text-gray-700">{detail.diagnosisSummary}</p>
        </div>
      )}

      {/* 탭 */}
      <div className="bg-white shadow rounded-lg">
        <div className="border-b">
          <nav className="flex -mb-px overflow-x-auto">
            {TAB_KEYS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-5 py-3 text-sm font-medium border-b-2 whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6 space-y-6">
          {activeTab === 'overview' && (
            <PBLOverview value={overviewSummary} />
          )}
          {activeTab === 'targets' && (
            <PBLTrainingTargets
              trainingNeedsAnalysis={targetsSummary?.trainingNeedsAnalysis ?? ''}
              selectionReason={targetsSummary?.selectionReason ?? ''}
              details={targetsSummary?.details ?? []}
            />
          )}
          {activeTab === 'tools' && (
            <PBLToolUsagePlan canEdit={false} value={toolUsagePlan} onChange={noop} />
          )}
          {activeTab === 'training' && operationPlan?.training_plan && (
            <PBLTrainingPlan
              canEdit={false}
              value={operationPlan.training_plan as PBLTrainingPlanT}
              onChange={noop}
            />
          )}
          {activeTab === 'evaluation' && operationPlan?.evaluation_plan && (
            <PBLEvaluationPlan
              canEdit={false}
              value={operationPlan.evaluation_plan as PBLEvaluationPlanT}
              onChange={noop}
            />
          )}
        </div>
      </div>
    </>
  );
}
