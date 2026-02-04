'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, AlertCircle, RefreshCw, Sparkles, Briefcase, Award } from 'lucide-react';
import AssignmentForm from './AssignmentForm';
import ManualAssignmentForm from './ManualAssignmentForm';
import {
  AlertMessage,
  TabNavigation,
  TAB_DESCRIPTIONS,
  API_TIMEOUT_MS,
  DEFAULT_TOP_N,
} from './assignment';
import type { TabType } from './assignment';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// ============================================================================
// 상수
// ============================================================================

/** 카드/스켈레톤 표시 개수 */
const DISPLAY_COUNTS = {
  RECOMMENDATION_CARDS: 3,
  SCORE_BREAKDOWN_ITEMS: 5,
  EXPERTISE_TAGS: 3,
  MAX_EXPERTISE_DOMAINS: 4,
  MAX_INDUSTRIES: 2,
  MAX_STRENGTHS: 3,
  MAX_NOTES: 2,
} as const;

/** 점수 색상 임계값 (퍼센트) */
const SCORE_THRESHOLDS = {
  HIGH: 80,
  MEDIUM: 50,
} as const;

/** 추천 근거 파싱용 키워드 */
const NOTE_KEYWORDS = ['부족', '없', '미흡', '제한', '주의', '다만', '그러나', '하지만', '진행 중'] as const;

/** 점수 등급별 색상 클래스 */
const SCORE_COLOR_CLASSES = {
  high: {
    text: 'text-emerald-600',
    bg: 'bg-emerald-50',
    bar: 'bg-emerald-500',
    badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
  medium: {
    text: 'text-amber-600',
    bg: 'bg-amber-50',
    bar: 'bg-amber-500',
    badge: 'bg-amber-100 text-amber-700 border-amber-200',
  },
  low: {
    text: 'text-red-600',
    bg: 'bg-red-50',
    bar: 'bg-red-500',
    badge: 'bg-red-100 text-red-700 border-red-200',
  },
} as const;

/** 순위별 뱃지 스타일 */
const RANK_BADGE_STYLES: Record<number, string> = {
  1: 'bg-purple-600 text-white',
  2: 'bg-gray-500 text-white',
  3: 'bg-gray-400 text-white',
};

/** shimmer 애니메이션 딜레이 클래스 */
const SHIMMER_DELAY_CLASSES: Record<number, string> = {
  0: '',
  1: 'animate-shimmer-delay-1',
  2: 'animate-shimmer-delay-2',
};

/** RationaleBox 색상 스키마 */
const RATIONALE_COLOR_SCHEMES = {
  emerald: {
    container: 'bg-emerald-50 border-emerald-100',
    header: 'text-emerald-700',
    text: 'text-emerald-800',
    bullet: 'text-emerald-400',
  },
  amber: {
    container: 'bg-amber-50 border-amber-100',
    header: 'text-amber-700',
    text: 'text-amber-800',
    bullet: 'text-amber-400',
  },
} as const;

/** 에러 메시지 */
const ERROR_MESSAGES = {
  MATCHING_FAILED: '매칭을 실행할 수 없습니다. 잠시 후 다시 시도해주세요.',
  TIMEOUT: '요청 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.',
  NETWORK: '네트워크 연결을 확인해주세요.',
  DEFAULT: '잠시 후 다시 시도해주세요.',
} as const;

// ============================================================================
// 타입
// ============================================================================

/** 컨설턴트 기본 정보 */
interface ConsultantInfo {
  id: string;
  name: string;
  email: string;
}

/** 컨설턴트 프로필 */
interface ConsultantProfile {
  expertise_domains?: string[];
  available_industries?: string[];
  skill_tags?: string[];
  years_of_experience?: number;
}

/** 점수 상세 항목 */
interface ScoreBreakdownItem {
  criteria: string;
  score: number;
  maxScore: number;
  explanation: string;
}

/** 매칭 추천 */
interface Recommendation {
  id: string;
  candidate_user_id: string;
  total_score: number;
  score_breakdown?: ScoreBreakdownItem[];
  rationale?: string;
  rank: number;
  candidate?: ConsultantInfo & {
    consultant_profile?: ConsultantProfile[] | Record<string, unknown>;
  };
}

/** 유효한 추천 (candidate 필수) */
type ValidRecommendation = Recommendation & {
  candidate: ConsultantInfo & {
    consultant_profile?: ConsultantProfile[] | Record<string, unknown>;
  };
};

/** 파싱된 추천 근거 */
interface ParsedRationale {
  strengths: string[];
  notes: string[];
}

/** 점수 색상 클래스 */
type ScoreColorClass = (typeof SCORE_COLOR_CLASSES)[keyof typeof SCORE_COLOR_CLASSES];

/** RationaleBox 색상 스키마 키 */
type RationaleColorScheme = keyof typeof RATIONALE_COLOR_SCHEMES;

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

/** RationaleBox Props */
interface RationaleBoxProps {
  icon: React.ReactNode;
  title: string;
  items: string[];
  colorScheme: RationaleColorScheme;
}

// ============================================================================
// 유틸리티 함수
// ============================================================================

/** 점수 퍼센트에 따른 색상 클래스 반환 */
function getScoreColorClass(percentage: number): ScoreColorClass {
  if (percentage >= SCORE_THRESHOLDS.HIGH) return SCORE_COLOR_CLASSES.high;
  if (percentage >= SCORE_THRESHOLDS.MEDIUM) return SCORE_COLOR_CLASSES.medium;
  return SCORE_COLOR_CLASSES.low;
}

/** 추천 근거 문자열을 구조화된 데이터로 파싱 */
function parseRationale(rationale: string): ParsedRationale {
  const sentences = rationale
    .split(/[.。]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const strengths: string[] = [];
  const notes: string[] = [];

  for (const sentence of sentences) {
    const isNote = NOTE_KEYWORDS.some((keyword) => sentence.includes(keyword));
    if (isNote) {
      notes.push(sentence);
    } else if (sentence.length > 5) {
      strengths.push(sentence);
    }
  }

  // 강점이 없으면 첫 문장을 강점으로 사용
  if (strengths.length === 0 && sentences.length > 0) {
    strengths.push(sentences[0]);
  }

  return {
    strengths: strengths.slice(0, DISPLAY_COUNTS.MAX_STRENGTHS),
    notes: notes.slice(0, DISPLAY_COUNTS.MAX_NOTES),
  };
}

/** shimmer 딜레이 클래스 반환 */
function getShimmerDelayClass(delayIndex: number): string {
  return SHIMMER_DELAY_CLASSES[delayIndex] || '';
}

/** 점수를 0-100 범위로 정규화 */
function normalizeScore(score: number, maxScore: number): number {
  if (maxScore <= 0) return 0;
  const percentage = Math.round((score / maxScore) * 100);
  return Math.max(0, Math.min(100, percentage));
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
      {
        id: 'auto' as TabType,
        label: '자동 매칭',
        badge: hasRecommendations ? validRecommendations.length : undefined,
      },
      { id: 'manual' as TabType, label: '수동 매칭' },
    ],
    [hasRecommendations, validRecommendations.length]
  );

  // API 호출
  const callMatchingAPI = useCallback(
    async (preserveStatus: boolean): Promise<{ success: boolean; error?: string }> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

      try {
        const response = await fetch('/api/matching/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId, topN: DEFAULT_TOP_N, preserveStatus }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        const result = await response.json();

        if (!response.ok || !result.success) {
          return { success: false, error: result.error || ERROR_MESSAGES.MATCHING_FAILED };
        }

        return { success: true };
      } catch (err) {
        clearTimeout(timeoutId);

        if (err instanceof Error && err.name === 'AbortError') {
          return { success: false, error: ERROR_MESSAGES.TIMEOUT };
        }

        return { success: false, error: ERROR_MESSAGES.NETWORK };
      }
    },
    [projectId]
  );

  // 매칭 실행 공통 로직
  const executeMatching = useCallback(
    async (preserveStatus: boolean) => {
      setIsGenerating(true);
      setGenerateError(null);

      const result = await callMatchingAPI(preserveStatus);

      if (result.success) {
        router.refresh();
      } else {
        setGenerateError(result.error || ERROR_MESSAGES.DEFAULT);
      }

      setIsGenerating(false);
    },
    [callMatchingAPI, router]
  );

  // 매칭 추천 생성
  const handleGenerateMatching = useCallback(() => {
    executeMatching(!!projectData.assigned_consultant);
  }, [executeMatching, projectData.assigned_consultant]);

  // 매칭 재계산
  const handleRecalculate = useCallback(() => {
    if (
      projectData.assigned_consultant &&
      !confirm(
        '이미 컨설턴트가 배정되어 있습니다.\n매칭 추천만 재계산되며, 현재 배정은 변경되지 않습니다.\n계속하시겠습니까?'
      )
    ) {
      return;
    }

    executeMatching(true);
  }, [executeMatching, projectData.assigned_consultant]);

  const handleDismissError = useCallback(() => setGenerateError(null), []);
  const handleToggleReassign = useCallback(() => setShowReassignForm((prev) => !prev), []);

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

    // 로딩 중
    if (isGenerating) {
      return (
        <div className="py-4">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Sparkles className="h-5 w-5 text-purple-500 animate-pulse" />
            <span className="text-sm font-medium text-gray-600">최적의 컨설턴트를 찾고 있습니다</span>
          </div>
          <div className="space-y-4">
            {Array.from({ length: DISPLAY_COUNTS.RECOMMENDATION_CARDS }).map((_, index) => (
              <RecommendationCardSkeleton key={index} rank={index + 1} delayIndex={index} />
            ))}
          </div>
        </div>
      );
    }

    // 매칭 추천 미실행
    if (!hasRecommendations) {
      return (
        <EmptyState
          icon={<Sparkles className="h-6 w-6 text-purple-500" />}
          iconBgColor="bg-purple-100"
          title="아직 자동 매칭이 실행되지 않았습니다."
          error={generateError}
          onDismissError={handleDismissError}
          action={
            <button
              onClick={handleGenerateMatching}
              disabled={isGenerating}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 transition-colors shadow-sm"
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
      <div>
        {generateError && <AlertMessage message={generateError} onDismiss={handleDismissError} />}

        <div className="flex items-center gap-2 mb-4">
          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          <span className="text-sm font-medium text-gray-700">
            {validRecommendations.length}명의 컨설턴트를 추천합니다
          </span>
        </div>

        <div className="space-y-4 mb-6">
          {validRecommendations.map((rec) => (
            <RecommendationCard key={rec.id} recommendation={rec} />
          ))}
        </div>

        <div className="mb-6 pt-4 border-t border-gray-100">
          <button
            onClick={handleRecalculate}
            disabled={isGenerating}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={cn('h-4 w-4', isGenerating && 'animate-spin')} />
            {isGenerating ? '재계산 중...' : '매칭 재계산'}
          </button>
          {projectData.assigned_consultant && (
            <p className="mt-2 text-xs text-gray-400">
              * 자가진단 수정 시 매칭 추천을 재계산할 수 있습니다. 현재 배정은 변경되지 않습니다.
            </p>
          )}
        </div>

        <div className="pt-4 border-t border-gray-100">
          <h4 className="text-sm font-medium text-gray-700 mb-3">추천 컨설턴트 중 선택하여 배정</h4>
          <AssignmentForm projectId={projectId} recommendations={validRecommendations} />
        </div>
      </div>
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
// 공통 UI 컴포넌트
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

/** Shimmer 스켈레톤 바 */
function ShimmerBar({ className, delayIndex = 0 }: { className: string; delayIndex?: number }) {
  return <div className={cn('rounded animate-shimmer', getShimmerDelayClass(delayIndex), className)} />;
}

/** 순위 뱃지 */
function RankBadge({ rank }: { rank: number }) {
  return (
    <span
      className={cn(
        'w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shrink-0',
        RANK_BADGE_STYLES[rank] || 'bg-gray-300 text-gray-700'
      )}
    >
      {rank}
    </span>
  );
}

// ============================================================================
// 현재 배정 정보
// ============================================================================

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

// ============================================================================
// 추천 카드
// ============================================================================

function RecommendationCard({ recommendation }: { recommendation: ValidRecommendation }) {
  const profile = Array.isArray(recommendation.candidate.consultant_profile)
    ? (recommendation.candidate.consultant_profile[0] as ConsultantProfile | undefined)
    : null;

  // total_score는 0-1 범위이므로 100을 곱해 퍼센트로 변환, 범위 검증 포함
  const scorePercentage = normalizeScore(recommendation.total_score, 1);
  const scoreColors = getScoreColorClass(scorePercentage);
  const isTopRank = recommendation.rank === 1;
  const parsedRationale = recommendation.rationale ? parseRationale(recommendation.rationale) : null;

  return (
    <div
      className={cn(
        'border rounded-xl overflow-hidden transition-shadow',
        isTopRank
          ? 'border-purple-200 bg-gradient-to-br from-purple-50 to-white shadow-sm'
          : 'border-gray-200 bg-white hover:shadow-sm'
      )}
    >
      {isTopRank && (
        <div className="bg-purple-600 text-white text-xs font-medium px-3 py-1.5 flex items-center gap-1.5">
          <Award className="h-3.5 w-3.5" />
          최적 매칭
        </div>
      )}

      <div className="p-4">
        {/* 헤더 */}
        <div className="flex justify-between items-start gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <RankBadge rank={recommendation.rank} />
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-gray-900 truncate">{recommendation.candidate.name}</h3>
              <p className="text-sm text-gray-500 truncate">{recommendation.candidate.email}</p>
            </div>
          </div>
          <ScoreDisplay score={scorePercentage} colorClass={scoreColors.text} />
        </div>

        {profile && <ProfileSummary profile={profile} />}

        {recommendation.score_breakdown && recommendation.score_breakdown.length > 0 && (
          <ScoreBreakdownGrid breakdown={recommendation.score_breakdown} />
        )}

        {parsedRationale && (parsedRationale.strengths.length > 0 || parsedRationale.notes.length > 0) && (
          <RationaleSection strengths={parsedRationale.strengths} notes={parsedRationale.notes} />
        )}
      </div>
    </div>
  );
}

/** 점수 표시 */
function ScoreDisplay({ score, colorClass }: { score: number; colorClass: string }) {
  return (
    <div className="text-right shrink-0">
      <div className={cn('text-2xl font-bold', colorClass)}>{score}</div>
      <div className="text-xs text-gray-400">/ 100점</div>
    </div>
  );
}

/** 프로필 요약 */
function ProfileSummary({ profile }: { profile: ConsultantProfile }) {
  const expertiseDomains = profile.expertise_domains || [];
  const availableIndustries = profile.available_industries || [];
  const yearsOfExperience = profile.years_of_experience || 0;

  return (
    <div className="mb-4">
      {expertiseDomains.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {expertiseDomains.slice(0, DISPLAY_COUNTS.MAX_EXPERTISE_DOMAINS).map((domain) => (
            <Badge
              key={domain}
              variant="secondary"
              className="text-xs font-normal bg-blue-50 text-blue-700 border-blue-100"
            >
              {domain}
            </Badge>
          ))}
          {expertiseDomains.length > DISPLAY_COUNTS.MAX_EXPERTISE_DOMAINS && (
            <span className="text-xs text-gray-400 self-center">
              +{expertiseDomains.length - DISPLAY_COUNTS.MAX_EXPERTISE_DOMAINS}
            </span>
          )}
        </div>
      )}
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <Briefcase className="h-3.5 w-3.5 text-gray-400" />
        <span>{yearsOfExperience}년 경력</span>
        {availableIndustries.length > 0 && (
          <>
            <span className="text-gray-300">|</span>
            <span className="text-gray-500">
              {availableIndustries.slice(0, DISPLAY_COUNTS.MAX_INDUSTRIES).join(', ')}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

/** 점수 상세 그리드 */
function ScoreBreakdownGrid({ breakdown }: { breakdown: ScoreBreakdownItem[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
      {breakdown.map((item) => {
        // maxScore가 0인 경우 방어 처리
        const percentage = normalizeScore(item.score, item.maxScore);
        const colors = getScoreColorClass(percentage);

        return (
          <div key={item.criteria} className="text-center">
            <div className="text-xs text-gray-500 mb-1 truncate" title={item.criteria}>
              {item.criteria}
            </div>
            <div className={cn('text-sm font-semibold mb-1', colors.text)}>
              {item.score}/{item.maxScore}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all', colors.bar)}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// 추천 근거 섹션
// ============================================================================

function RationaleSection({ strengths, notes }: ParsedRationale) {
  return (
    <div className="space-y-3">
      {strengths.length > 0 && (
        <RationaleBox
          icon={<CheckCircle2 className="h-3.5 w-3.5" />}
          title="강점"
          items={strengths}
          colorScheme="emerald"
        />
      )}
      {notes.length > 0 && (
        <RationaleBox
          icon={<AlertCircle className="h-3.5 w-3.5" />}
          title="참고사항"
          items={notes}
          colorScheme="amber"
        />
      )}
    </div>
  );
}

/** 추천 근거 박스 (강점/참고사항 공통) */
function RationaleBox({ icon, title, items, colorScheme }: RationaleBoxProps) {
  const colors = RATIONALE_COLOR_SCHEMES[colorScheme];

  return (
    <div className={cn('rounded-lg p-3 border', colors.container)}>
      <div className={cn('flex items-center gap-1.5 text-xs font-medium mb-2', colors.header)}>
        {icon}
        {title}
      </div>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className={cn('text-sm flex items-start gap-2', colors.text)}>
            <span className={cn('mt-1.5', colors.bullet)}>•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ============================================================================
// 스켈레톤
// ============================================================================

function RecommendationCardSkeleton({ rank, delayIndex }: { rank: number; delayIndex: number }) {
  const isTopRank = rank === 1;

  return (
    <div
      className={cn(
        'border rounded-xl overflow-hidden',
        isTopRank ? 'border-purple-200 bg-purple-50/50' : 'border-gray-200'
      )}
    >
      {isTopRank && <div className="h-8 bg-purple-200 animate-shimmer" />}

      <div className="p-4">
        {/* 헤더 */}
        <div className="flex justify-between items-start gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <RankBadge rank={rank} />
            <div className="min-w-0 flex-1">
              <ShimmerBar className="h-5 w-28 max-w-full mb-1" delayIndex={delayIndex} />
              <ShimmerBar className="h-4 w-36 max-w-full" delayIndex={delayIndex} />
            </div>
          </div>
          <div className="text-right shrink-0">
            <ShimmerBar className="h-8 w-14 ml-auto mb-1" delayIndex={delayIndex} />
            <ShimmerBar className="h-3 w-10 ml-auto" delayIndex={delayIndex} />
          </div>
        </div>

        {/* 프로필 요약 */}
        <div className="mb-4">
          <div className="flex flex-wrap gap-1.5 mb-2">
            {Array.from({ length: DISPLAY_COUNTS.EXPERTISE_TAGS }).map((_, i) => (
              <ShimmerBar key={i} className="h-6 w-16 rounded-full" delayIndex={delayIndex} />
            ))}
          </div>
          <ShimmerBar className="h-4 w-32" delayIndex={delayIndex} />
        </div>

        {/* 점수 상세 */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3 mb-4 p-3 bg-gray-50 rounded-lg">
          {Array.from({ length: DISPLAY_COUNTS.SCORE_BREAKDOWN_ITEMS }).map((_, i) => (
            <div key={i} className="text-center">
              <ShimmerBar className="h-3 w-full mb-1.5" delayIndex={delayIndex} />
              <ShimmerBar className="h-5 w-8 mx-auto mb-1.5" delayIndex={delayIndex} />
              <ShimmerBar className="h-1.5 w-full rounded-full" delayIndex={delayIndex} />
            </div>
          ))}
        </div>

        {/* 추천 근거 */}
        <div className="rounded-lg bg-gray-50 p-3">
          <ShimmerBar className="h-4 w-16 mb-2" delayIndex={delayIndex} />
          <ShimmerBar className="h-3 w-full mb-1.5" delayIndex={delayIndex} />
          <ShimmerBar className="h-3 w-4/5" delayIndex={delayIndex} />
        </div>
      </div>
    </div>
  );
}
