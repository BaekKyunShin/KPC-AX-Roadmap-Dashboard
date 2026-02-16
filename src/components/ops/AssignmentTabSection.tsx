'use client';

import { useState } from 'react';
import { CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import ManualAssignmentForm from './ManualAssignmentForm';
import {
  AlertMessage,
  TabNavigation,
  TAB_DESCRIPTIONS,
} from './assignment';
import type { TabType } from './assignment';
import RecommendationResults from './assignment/RecommendationResults';
import useAssignmentMatching from './assignment/useAssignmentMatching';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { ConsultantInfo, Recommendation, ValidRecommendation } from './assignment/utils';

// ============================================================================
// 타입
// ============================================================================

/** 메인 컴포넌트 Props */
interface AssignmentTabSectionProps {
  projectData: {
    assigned_consultant?: ConsultantInfo | null;
    status: string;
  };
  projectId: string;
  recommendations: Recommendation[];
  latestAssignment?: {
    assignment_reason: string;
  };
  hasSelfAssessment: boolean;
}

/** EmptyState Props */
interface EmptyStateProps {
  icon: React.ReactNode;
  iconBgColor: string;
  title: string;
  description?: string;
  error?: string | null;
  onDismissError?: () => void;
  action?: React.ReactNode;
}

/** CurrentAssignmentInfo Props */
interface CurrentAssignmentInfoProps {
  consultant: ConsultantInfo;
  assignmentReason?: string;
  canReassign: boolean;
  showReassignForm: boolean;
  onToggleReassign: () => void;
}

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export default function AssignmentTabSection({
  projectData,
  projectId,
  recommendations,
  latestAssignment,
  hasSelfAssessment,
}: AssignmentTabSectionProps) {
  const [showReassignForm, setShowReassignForm] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('auto');

  // candidate 정보가 있는 추천만 필터링
  const validRecommendations = recommendations.filter((r): r is ValidRecommendation => !!r.candidate);

  const hasRecommendations = validRecommendations.length > 0;

  const {
    cardRef,
    isGenerating,
    generateError,
    handleGenerateMatching,
    handleRecalculate,
    handleCancelMatching,
    handleDismissError,
  } = useAssignmentMatching({
    projectId,
    validRecommendations,
    hasAssignedConsultant: !!projectData.assigned_consultant,
  });

  // 탭 설정
  const tabs = [
    {
      id: 'auto' as TabType,
      label: '자동 매칭',
      badge: hasRecommendations ? validRecommendations.length : undefined,
    },
    { id: 'manual' as TabType, label: '수동 매칭' },
  ];

  const handleToggleReassign = () => setShowReassignForm((prev) => !prev);

  // 자동 매칭 탭 컨텐츠
  const renderAutoMatchingContent = () => {
    // 자가진단 미완료
    if (!hasSelfAssessment) {
      return (
        <EmptyState
          icon={<AlertCircle className="h-6 w-6 text-gray-400" />}
          iconBgColor="bg-gray-100"
          title="자동 매칭을 사용하려면 자가진단을 먼저 완료해야 합니다."
          description="자가진단 결과를 기반으로 적합한 컨설턴트를 추천합니다."
          error={generateError}
          onDismissError={handleDismissError}
        />
      );
    }

    // 로딩 중 - AI 분석 화면
    if (isGenerating) {
      return <AIMatchingLoader onCancel={handleCancelMatching} />;
    }

    // 매칭 추천 미실행
    if (!hasRecommendations) {
      return (
        <EmptyState
          icon={<Sparkles className="h-6 w-6 text-blue-500" />}
          iconBgColor="bg-blue-100"
          title="아직 자동 매칭이 실행되지 않았습니다."
          error={generateError}
          onDismissError={handleDismissError}
          action={
            <button
              onClick={handleGenerateMatching}
              disabled={isGenerating}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
            >
              <Sparkles className="h-4 w-4" />
              컨설턴트 자동 매칭
            </button>
          }
        />
      );
    }

    // 매칭 추천 결과
    return (
      <RecommendationResults
        recommendations={validRecommendations}
        projectId={projectId}
        isGenerating={isGenerating}
        generateError={generateError}
        onDismissError={handleDismissError}
        onRecalculate={handleRecalculate}
        hasAssignedConsultant={!!projectData.assigned_consultant}
      />
    );
  };

  const renderTabContent = () => (
    <>
      <p className="text-sm text-gray-500 mb-4">{TAB_DESCRIPTIONS[activeTab]}</p>
      {activeTab === 'auto' ? renderAutoMatchingContent() : <ManualAssignmentForm projectId={projectId} />}
    </>
  );

  // 이미 배정된 경우
  if (projectData.assigned_consultant) {
    return (
      <Card ref={cardRef}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">컨설턴트 배정</CardTitle>
        </CardHeader>
        <CardContent>
          <CurrentAssignmentInfo
            consultant={projectData.assigned_consultant}
            assignmentReason={latestAssignment?.assignment_reason}
            canReassign={!['FINALIZED'].includes(projectData.status)}
            showReassignForm={showReassignForm}
            onToggleReassign={handleToggleReassign}
          />

          {showReassignForm && (
            <div className="border-t pt-4">
              <p className="text-sm text-orange-600 mb-4">
                다른 컨설턴트로 재배정합니다. 기존 배정은 이력으로 보관됩니다.
              </p>
              <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} tabs={tabs} />
              {renderTabContent()}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // 아직 배정되지 않은 경우
  return (
    <Card ref={cardRef}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">컨설턴트 배정</CardTitle>
      </CardHeader>
      <CardContent>
        <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} tabs={tabs} />
        {renderTabContent()}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// 로컬 UI 컴포넌트 (이 파일에서만 사용)
// ============================================================================

/** 빈 상태 표시 컴포넌트 */
function EmptyState({
  icon,
  iconBgColor,
  title,
  description,
  error,
  onDismissError,
  action,
}: EmptyStateProps) {
  return (
    <div className="text-center py-8">
      {error && onDismissError && <AlertMessage message={error} onDismiss={onDismissError} />}
      <div className={cn('inline-flex items-center justify-center w-12 h-12 rounded-full mb-4', iconBgColor)}>
        {icon}
      </div>
      <p className="text-gray-600 mb-2">{title}</p>
      {description && <p className="text-sm text-gray-400">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/** AI 매칭 로딩 화면 */
function AIMatchingLoader({ onCancel }: { onCancel: () => void }) {
  return (
    <div className="py-12 px-4">
      <div className="max-w-sm mx-auto text-center">
        {/* AI 아이콘 애니메이션 */}
        <div className="relative w-20 h-20 mx-auto mb-6">
          {/* 외부 원 - 회전 */}
          <div className="absolute inset-0 rounded-full border-2 border-blue-200 border-t-blue-500 animate-spin" />
          {/* 내부 원 - 펄스 */}
          <div className="absolute inset-2 rounded-full bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center">
            <Sparkles className="h-8 w-8 text-blue-500 animate-pulse" />
          </div>
        </div>

        {/* 메시지 */}
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          AI 매칭 분석 중
        </h3>
        <p className="text-sm text-gray-500 mb-6 leading-relaxed">
          등록된 컨설턴트 프로필을 분석하여<br />
          최적의 3명을 추천합니다
        </p>

        {/* 진행 상태 표시 */}
        <div className="flex items-center justify-center gap-1.5 mb-6">
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>

        {/* 취소 버튼 */}
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          취소
        </button>
      </div>
    </div>
  );
}

/** 현재 배정 정보 */
function CurrentAssignmentInfo({
  consultant,
  assignmentReason,
  canReassign,
  showReassignForm,
  onToggleReassign,
}: CurrentAssignmentInfoProps) {
  return (
    <div className="p-4 bg-emerald-50 rounded-lg mb-4 border border-emerald-100">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-100 shrink-0">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="min-w-0">
            <p className="text-emerald-800 font-medium truncate">{consultant.name}</p>
            <p className="text-sm text-emerald-600 truncate">{consultant.email}</p>
            {assignmentReason && (
              <p className="text-sm text-emerald-600 mt-1 line-clamp-2">배정 사유: {assignmentReason}</p>
            )}
          </div>
        </div>
        {canReassign && (
          <button
            type="button"
            onClick={onToggleReassign}
            className="px-3 py-1.5 text-sm border border-orange-200 text-orange-600 rounded-lg hover:bg-orange-50 transition-colors shrink-0 self-start sm:self-center"
          >
            {showReassignForm ? '취소' : '재배정'}
          </button>
        )}
      </div>
    </div>
  );
}
