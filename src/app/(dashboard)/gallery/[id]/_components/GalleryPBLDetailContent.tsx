'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { LikeButton } from '@/components/gallery/LikeButton';
import { ResultTabContentSkeleton } from '@/components/ui/Skeleton';
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

// 탭 본문 5종 코드 분할 — 한 번에 한 탭만 보이는데 전 탭 코드가 초기 청크에 들어 있었다.
// `ssr: false` 는 쓰지 않는다 (첫 화면 탭이 서버 HTML 에서 빠져 스켈레톤이 번쩍인다).
// 탭 전환이 지금처럼 즉시 이뤄지도록 마운트 직후 유휴 시점에 나머지를 프리페치한다(아래 useEffect).
const PBLOverview = dynamic(
  () => import('@/components/pbl/PBLOverview').then((m) => ({ default: m.PBLOverview })),
  { loading: () => <ResultTabContentSkeleton /> }
);
const PBLTrainingTargets = dynamic(
  () =>
    import('@/components/pbl/PBLTrainingTargets').then((m) => ({
      default: m.PBLTrainingTargets,
    })),
  { loading: () => <ResultTabContentSkeleton /> }
);
const PBLToolUsagePlan = dynamic(
  () => import('@/components/pbl/PBLToolUsagePlan').then((m) => ({ default: m.PBLToolUsagePlan })),
  { loading: () => <ResultTabContentSkeleton /> }
);
// 타입은 `PBLTrainingPlanT` / `PBLEvaluationPlanT` 로 alias 돼 있어 컴포넌트명과 충돌하지 않는다.
const PBLTrainingPlan = dynamic(
  () => import('@/components/pbl/PBLTrainingPlan').then((m) => ({ default: m.PBLTrainingPlan })),
  { loading: () => <ResultTabContentSkeleton /> }
);
const PBLEvaluationPlan = dynamic(
  () =>
    import('@/components/pbl/PBLEvaluationPlan').then((m) => ({
      default: m.PBLEvaluationPlan,
    })),
  { loading: () => <ResultTabContentSkeleton /> }
);

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

  // 첫 화면(Ⅰ 개요)이 그려진 뒤 유휴 시점에 나머지 탭 청크를 미리 받아둔다.
  // 초기 로딩은 가벼워지고 탭 전환은 종전처럼 즉시 이뤄진다 —
  // 이미 로드된 모듈은 dynamic 이 서스펜드 없이 해결하므로 스켈레톤이 뜨지 않는다.
  useEffect(() => {
    const prefetch = () => {
      void import('@/components/pbl/PBLTrainingTargets');
      void import('@/components/pbl/PBLToolUsagePlan');
      void import('@/components/pbl/PBLTrainingPlan');
      void import('@/components/pbl/PBLEvaluationPlan');
    };

    if (typeof window.requestIdleCallback !== 'function') {
      const timeoutId = window.setTimeout(prefetch, 200);
      return () => window.clearTimeout(timeoutId);
    }

    const handle = window.requestIdleCallback(prefetch, { timeout: 2000 });
    return () => window.cancelIdleCallback(handle);
  }, []);

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
        courseName:
          content.overview_summary.courseName ??
          operationPlan?.training_plan?.subject_profile?.course_name ??
          '',
        trainingHours:
          content.overview_summary.trainingHours ??
          operationPlan?.training_plan?.subject_profile?.total_hours ??
          0,
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

  const toolUsagePlan: PBLAIToolUsagePlanItem[] = operationPlan?.ai_tool_usage_plan ?? [];

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
            <Copy className="h-4 w-4" />이 PBL 사용하기
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
          {activeTab === 'overview' && <PBLOverview value={overviewSummary} />}
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
