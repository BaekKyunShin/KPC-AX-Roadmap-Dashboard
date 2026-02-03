'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AssignmentForm from './AssignmentForm';
import ManualAssignmentForm from './ManualAssignmentForm';
import {
  AlertMessage,
  TabNavigation,
  TAB_DESCRIPTIONS,
  SpinnerIcon,
  RefreshIcon,
  API_TIMEOUT_MS,
  DEFAULT_TOP_N,
} from './assignment';
import type { TabType } from './assignment';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

// ============================================================================
// 타입 정의
// ============================================================================

interface ScoreBreakdown {
  criteria: string;
  score: number;
  maxScore: number;
  explanation: string;
}

interface ConsultantProfile {
  expertise_domains?: string[];
  available_industries?: string[];
  skill_tags?: string[];
  years_of_experience?: number;
}

interface Recommendation {
  id: string;
  candidate_user_id: string;
  total_score: number;
  score_breakdown?: ScoreBreakdown[];
  rationale?: string;
  rank: number;
  candidate?: {
    id: string;
    name: string;
    email: string;
    consultant_profile?: ConsultantProfile[] | Record<string, unknown>;
  };
}

interface AssignmentTabSectionProps {
  projectData: {
    assigned_consultant?: {
      id: string;
      name: string;
      email: string;
    } | null;
    status: string;
  };
  projectId: string;
  recommendations: Recommendation[];
  latestAssignment?: {
    assignment_reason: string;
  };
  hasSelfAssessment: boolean;
}

type ValidRecommendation = Recommendation & {
  candidate: { id: string; name: string; email: string };
};

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
  const router = useRouter();
  const [showReassignForm, setShowReassignForm] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('auto');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // candidate 정보가 있는 추천만 필터링
  const validRecommendations = useMemo(
    () => recommendations.filter((r): r is ValidRecommendation => !!r.candidate),
    [recommendations]
  );

  const hasRecommendations = validRecommendations.length > 0;

  // 탭 설정
  const tabs = useMemo(
    () => [
      { id: 'auto' as TabType, label: '자동 매칭', badge: hasRecommendations ? validRecommendations.length : undefined },
      { id: 'manual' as TabType, label: '수동 매칭' },
    ],
    [hasRecommendations, validRecommendations.length]
  );

  // ============================================================================
  // API 호출 함수
  // ============================================================================

  const callMatchingAPI = useCallback(
    async (preserveStatus: boolean): Promise<{ success: boolean; error?: string }> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

      try {
        const response = await fetch('/api/matching/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId,
            topN: DEFAULT_TOP_N,
            preserveStatus,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const result = await response.json();

        if (!response.ok || !result.success) {
          return { success: false, error: result.error || '매칭을 실행할 수 없습니다. 잠시 후 다시 시도해주세요.' };
        }

        return { success: true };
      } catch (err) {
        clearTimeout(timeoutId);

        if (err instanceof Error && err.name === 'AbortError') {
          return { success: false, error: '요청 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.' };
        }

        return { success: false, error: '네트워크 연결을 확인해주세요.' };
      }
    },
    [projectId]
  );

  // 매칭 추천 생성
  const handleGenerateMatching = useCallback(async () => {
    setIsGenerating(true);
    setGenerateError(null);

    const result = await callMatchingAPI(!!projectData.assigned_consultant);

    if (result.success) {
      router.refresh();
    } else {
      setGenerateError(result.error || '잠시 후 다시 시도해주세요.');
    }

    setIsGenerating(false);
  }, [callMatchingAPI, projectData.assigned_consultant, router]);

  // 매칭 재계산
  const handleRecalculate = useCallback(async () => {
    if (
      projectData.assigned_consultant &&
      !confirm(
        '이미 컨설턴트가 배정되어 있습니다.\n매칭 추천만 재계산되며, 현재 배정은 변경되지 않습니다.\n계속하시겠습니까?'
      )
    ) {
      return;
    }

    setIsGenerating(true);
    setGenerateError(null);

    const result = await callMatchingAPI(true);

    if (result.success) {
      router.refresh();
    } else {
      setGenerateError(result.error || '잠시 후 다시 시도해주세요.');
    }

    setIsGenerating(false);
  }, [callMatchingAPI, projectData.assigned_consultant, router]);

  // 에러 메시지 닫기
  const handleDismissError = useCallback(() => setGenerateError(null), []);

  // ============================================================================
  // 렌더링 헬퍼
  // ============================================================================

  // 자동 매칭 탭 컨텐츠
  const renderAutoMatchingContent = () => {
    // 자가진단 미완료
    if (!hasSelfAssessment) {
      return (
        <div className="text-center py-8">
          {generateError && <AlertMessage message={generateError} onDismiss={handleDismissError} />}
          <p className="text-gray-500 mb-2">자동 매칭을 사용하려면 자가진단을 먼저 완료해야 합니다.</p>
          <p className="text-sm text-gray-400">자가진단 결과를 기반으로 적합한 컨설턴트를 추천합니다.</p>
        </div>
      );
    }

    // 매칭 추천 미실행
    if (!hasRecommendations) {
      return (
        <div className="text-center py-8">
          {generateError && <AlertMessage message={generateError} onDismiss={handleDismissError} />}
          <p className="text-gray-500 mb-4">아직 자동 매칭이 실행되지 않았습니다.</p>
          <button
            onClick={handleGenerateMatching}
            disabled={isGenerating}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <SpinnerIcon className="-ml-1 mr-2 h-4 w-4 text-white" />
                매칭 중...
              </>
            ) : (
              '컨설턴트 자동 매칭'
            )}
          </button>
        </div>
      );
    }

    // 매칭 추천 결과 표시
    return (
      <div>
        {generateError && <AlertMessage message={generateError} onDismiss={handleDismissError} />}

        {/* 추천 목록 */}
        <div className="mb-6 space-y-4">
          {validRecommendations.map((rec) => (
            <RecommendationCard key={rec.id} recommendation={rec} />
          ))}
        </div>

        {/* 재계산 버튼 */}
        <div className="mb-6 pt-4 border-t border-gray-200">
          <button
            onClick={handleRecalculate}
            disabled={isGenerating}
            className="inline-flex items-center px-3 py-1.5 text-sm border border-purple-300 text-purple-700 rounded hover:bg-purple-50 disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <SpinnerIcon className="-ml-1 mr-2 h-4 w-4 text-purple-700" />
                재계산 중...
              </>
            ) : (
              <>
                <RefreshIcon className="-ml-0.5 mr-1.5 h-4 w-4" />
                매칭 재계산
              </>
            )}
          </button>
          {projectData.assigned_consultant && (
            <p className="mt-2 text-xs text-gray-500">
              * 자가진단 수정 시 매칭 추천을 재계산할 수 있습니다. 현재 배정은 변경되지 않습니다.
            </p>
          )}
        </div>

        {/* 배정 폼 */}
        <div className="pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-3">추천 컨설턴트 중 선택하여 배정</h4>
          <AssignmentForm projectId={projectId} recommendations={validRecommendations} />
        </div>
      </div>
    );
  };

  // 탭 컨텐츠 렌더링
  const renderTabContent = () => (
    <>
      <p className="text-sm text-gray-500 mb-4">{TAB_DESCRIPTIONS[activeTab]}</p>
      {activeTab === 'auto' ? renderAutoMatchingContent() : <ManualAssignmentForm projectId={projectId} />}
    </>
  );

  // ============================================================================
  // 메인 렌더링
  // ============================================================================

  // 이미 배정된 경우
  if (projectData.assigned_consultant) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">컨설턴트 배정</CardTitle>
        </CardHeader>
        <CardContent>
          <CurrentAssignmentInfo
            consultant={projectData.assigned_consultant}
            assignmentReason={latestAssignment?.assignment_reason}
            canReassign={!['FINALIZED'].includes(projectData.status)}
            showReassignForm={showReassignForm}
            onToggleReassign={() => setShowReassignForm(!showReassignForm)}
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
    <Card>
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
// 하위 컴포넌트
// ============================================================================

interface CurrentAssignmentInfoProps {
  consultant: { id: string; name: string; email: string };
  assignmentReason?: string;
  canReassign: boolean;
  showReassignForm: boolean;
  onToggleReassign: () => void;
}

function CurrentAssignmentInfo({
  consultant,
  assignmentReason,
  canReassign,
  showReassignForm,
  onToggleReassign,
}: CurrentAssignmentInfoProps) {
  return (
    <div className="p-4 bg-green-50 rounded-lg mb-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-green-800">
            현재 배정: <span className="font-bold">{consultant.name}</span>
          </p>
          <p className="text-sm text-green-600">{consultant.email}</p>
          {assignmentReason && (
            <p className="text-sm text-green-600 mt-1">배정 사유: {assignmentReason}</p>
          )}
        </div>
        {canReassign && (
          <button
            type="button"
            onClick={onToggleReassign}
            className="px-3 py-1.5 text-sm border border-orange-300 text-orange-700 rounded-md hover:bg-orange-50"
          >
            {showReassignForm ? '취소' : '재배정'}
          </button>
        )}
      </div>
    </div>
  );
}

interface RecommendationCardProps {
  recommendation: ValidRecommendation;
}

function RecommendationCard({ recommendation }: RecommendationCardProps) {
  const profile = Array.isArray(recommendation.candidate.consultant_profile)
    ? (recommendation.candidate.consultant_profile[0] as ConsultantProfile | undefined)
    : null;
  const scorePercentage = Math.round(recommendation.total_score * 100);

  return (
    <div
      className={`border rounded-lg p-4 ${
        recommendation.rank === 1 ? 'border-purple-500 bg-purple-50' : 'border-gray-200'
      }`}
    >
      {/* 헤더 */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="flex items-center">
            <RankBadge rank={recommendation.rank} />
            <h3 className="text-lg font-semibold text-gray-900">{recommendation.candidate.name}</h3>
          </div>
          <p className="text-sm text-gray-500 mt-1">{recommendation.candidate.email}</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-purple-600">{scorePercentage}점</div>
          <div className="text-xs text-gray-500">/ 100점</div>
        </div>
      </div>

      {/* 프로필 요약 */}
      {profile && <ProfileSummary profile={profile} />}

      {/* 점수 상세 */}
      {recommendation.score_breakdown && recommendation.score_breakdown.length > 0 && (
        <ScoreBreakdownGrid breakdown={recommendation.score_breakdown} />
      )}

      {/* 추천 근거 */}
      {recommendation.rationale && (
        <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
          <strong>추천 근거:</strong> {recommendation.rationale}
        </div>
      )}
    </div>
  );
}

function RankBadge({ rank }: { rank: number }) {
  const colorClass =
    rank === 1
      ? 'bg-purple-600 text-white'
      : rank === 2
        ? 'bg-gray-400 text-white'
        : 'bg-gray-300 text-gray-700';

  return (
    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold mr-2 ${colorClass}`}>
      {rank}
    </span>
  );
}

function ProfileSummary({ profile }: { profile: ConsultantProfile }) {
  const expertiseDomains = profile.expertise_domains || [];
  const availableIndustries = profile.available_industries || [];
  const yearsOfExperience = profile.years_of_experience || 0;

  return (
    <div className="mb-3 text-sm">
      {expertiseDomains.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {expertiseDomains.slice(0, 3).map((domain) => (
            <span key={domain} className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">
              {domain}
            </span>
          ))}
          {expertiseDomains.length > 3 && (
            <span className="text-gray-400 text-xs">+{expertiseDomains.length - 3}</span>
          )}
        </div>
      )}
      <p className="text-gray-600">
        {yearsOfExperience}년 경력
        {availableIndustries.length > 0 && <> | {availableIndustries.join(', ')}</>}
      </p>
    </div>
  );
}

function ScoreBreakdownGrid({ breakdown }: { breakdown: ScoreBreakdown[] }) {
  return (
    <div className="grid grid-cols-5 gap-2 mb-3">
      {breakdown.map((item) => (
        <div key={item.criteria} className="text-center">
          <div className="text-xs text-gray-500">{item.criteria}</div>
          <div className="font-semibold">
            {item.score}/{item.maxScore}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
            <div
              className="bg-purple-600 h-1.5 rounded-full"
              style={{ width: `${(item.score / item.maxScore) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
