'use client';

import { useState, useMemo, useCallback, useRef, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, AlertCircle, RefreshCw, Sparkles } from 'lucide-react';
import ManualAssignmentForm from './ManualAssignmentForm';
import {
  AlertMessage,
  TabNavigation,
  TAB_DESCRIPTIONS,
  DEFAULT_TOP_N,
} from './assignment';
import type { TabType } from './assignment';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// ============================================================================
// 상수
// ============================================================================

/** 표시 개수 상한 */
const DISPLAY_COUNTS = {
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

/** 에러 메시지 */
const ERROR_MESSAGES = {
  MATCHING_FAILED: '매칭을 실행할 수 없습니다. 잠시 후 다시 시도해주세요.',
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

/** LLM 기반 매칭 추천 근거 */
interface LLMRationaleData {
  analysis: string;
  strengths: string[];
  considerations: string[];
}

/** 매칭 추천 */
interface Recommendation {
  id: string;
  candidate_user_id: string;
  total_score: number;
  score_breakdown?: unknown[]; // 레거시 지원
  rationale?: string | RationaleData | LLMRationaleData | null;
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

/** 파싱된 추천 근거 (LLM 형식 지원) */
interface ParsedRationale {
  analysis?: string;         // LLM 분석 텍스트
  strengths: string[];
  notes: string[];           // considerations 또는 improvements
}

/** DB에 저장된 rationale JSON 구조 (레거시) */
interface RationaleData {
  strengths?: string[];
  improvements?: string[];
  consultantNote?: string;
}

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

/** SelectableCard Props */
interface SelectableCardProps {
  recommendation: ValidRecommendation;
  isSelected: boolean;
  onSelect: () => void;
}

// ============================================================================
// 유틸리티 함수
// ============================================================================

/** 점수에 따른 색상 반환 */
function getScoreColorClass(score: number): string {
  if (score >= SCORE_THRESHOLDS.HIGH) return 'text-emerald-600';
  if (score >= SCORE_THRESHOLDS.MEDIUM) return 'text-gray-900';
  return 'text-orange-500';
}

/** 점수에 따른 게이지 색상 반환 (hex) */
function getScoreGaugeColor(score: number): string {
  if (score >= SCORE_THRESHOLDS.HIGH) return '#10b981';
  if (score >= SCORE_THRESHOLDS.MEDIUM) return '#6b7280';
  return '#f97316';
}

/** 추천 근거를 구조화된 데이터로 파싱 (LLM 형식 및 레거시 지원) */
function parseRationale(rationale: string | RationaleData | LLMRationaleData | null | undefined): ParsedRationale {
  if (!rationale) {
    return { strengths: [], notes: [] };
  }

  // rationale이 이미 객체인 경우 (DB에서 JSON으로 저장된 경우)
  if (typeof rationale === 'object') {
    // LLM 형식 체크 (analysis 필드 존재 여부)
    if ('analysis' in rationale) {
      const llmData = rationale as LLMRationaleData;
      return {
        analysis: llmData.analysis,
        strengths: (llmData.strengths || []).slice(0, DISPLAY_COUNTS.MAX_STRENGTHS),
        notes: (llmData.considerations || []).slice(0, DISPLAY_COUNTS.MAX_NOTES),
      };
    }
    // 레거시 형식
    const data = rationale as RationaleData;
    return {
      strengths: (data.strengths || []).slice(0, DISPLAY_COUNTS.MAX_STRENGTHS),
      notes: (data.improvements || []).slice(0, DISPLAY_COUNTS.MAX_NOTES),
    };
  }

  // rationale이 JSON 문자열인 경우 파싱 시도
  if (typeof rationale === 'string') {
    try {
      const parsed = JSON.parse(rationale);
      // LLM 형식 체크
      if ('analysis' in parsed) {
        return {
          analysis: parsed.analysis,
          strengths: (parsed.strengths || []).slice(0, DISPLAY_COUNTS.MAX_STRENGTHS),
          notes: (parsed.considerations || []).slice(0, DISPLAY_COUNTS.MAX_NOTES),
        };
      }
      // 레거시 형식
      return {
        strengths: (parsed.strengths || []).slice(0, DISPLAY_COUNTS.MAX_STRENGTHS),
        notes: (parsed.improvements || []).slice(0, DISPLAY_COUNTS.MAX_NOTES),
      };
    } catch {
      // JSON 파싱 실패 시 기존 문자열 파싱 로직 사용
    }
  }

  // 일반 문자열인 경우 기존 로직
  const sentences = String(rationale)
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
  const [, startTransition] = useTransition();

  // 카드 상단으로 스크롤하기 위한 ref
  const cardRef = useRef<HTMLDivElement>(null);
  // API 호출 성공 여부를 추적하여 recommendations 변화 시 로딩 해제
  const isWaitingForDataRef = useRef(false);
  // 이전 recommendations의 첫 번째 ID를 저장 (재계산 시 변화 감지용)
  const prevRecommendationIdRef = useRef<string | null>(null);
  // API 호출 취소를 위한 AbortController
  const abortControllerRef = useRef<AbortController | null>(null);

  // candidate 정보가 있는 추천만 필터링
  const validRecommendations = useMemo(
    () => recommendations.filter((r): r is ValidRecommendation => !!r.candidate),
    [recommendations]
  );

  const hasRecommendations = validRecommendations.length > 0;
  const currentFirstId = validRecommendations[0]?.id ?? null;

  // recommendations가 업데이트되면 로딩 상태 해제
  useEffect(() => {
    if (isWaitingForDataRef.current) {
      // 첫 생성: recommendations가 생김
      // 재계산: 첫 번째 ID가 변경됨
      const isNewData = hasRecommendations && currentFirstId !== prevRecommendationIdRef.current;

      if (isNewData) {
        isWaitingForDataRef.current = false;
        prevRecommendationIdRef.current = currentFirstId;
        // startTransition으로 감싸서 캐스케이딩 렌더링 방지
        startTransition(() => {
          setIsGenerating(false);
        });
      }
    } else {
      // 대기 상태가 아닐 때는 현재 ID만 업데이트
      prevRecommendationIdRef.current = currentFirstId;
    }
  }, [hasRecommendations, currentFirstId]);

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

  // API 호출 (타임아웃 없음, AbortController로 취소 가능)
  const callMatchingAPI = useCallback(
    async (preserveStatus: boolean): Promise<{ success: boolean; error?: string; cancelled?: boolean }> => {
      // 새 AbortController 생성
      abortControllerRef.current = new AbortController();

      try {
        const response = await fetch('/api/matching/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId, topN: DEFAULT_TOP_N, preserveStatus }),
          signal: abortControllerRef.current.signal,
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          return { success: false, error: result.error || ERROR_MESSAGES.MATCHING_FAILED };
        }

        return { success: true };
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return { success: false, cancelled: true };
        }

        return { success: false, error: ERROR_MESSAGES.NETWORK };
      } finally {
        abortControllerRef.current = null;
      }
    },
    [projectId]
  );

  // 매칭 취소
  const handleCancelMatching = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsGenerating(false);
      isWaitingForDataRef.current = false;
    }
  }, []);

  // 카드 상단으로 스크롤
  const scrollToCard = useCallback(() => {
    if (cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  // 매칭 실행 공통 로직
  const executeMatching = useCallback(
    async (preserveStatus: boolean) => {
      setIsGenerating(true);
      setGenerateError(null);

      // 로딩 시작 시 카드 상단으로 스크롤
      scrollToCard();

      const result = await callMatchingAPI(preserveStatus);

      if (result.success) {
        // 데이터 새로고침 대기 상태로 설정
        isWaitingForDataRef.current = true;
        router.refresh();
        // recommendations가 업데이트될 때 useEffect에서 isGenerating을 false로 설정
      } else if (result.cancelled) {
        // 사용자가 취소한 경우 - 에러 메시지 없이 종료
        setIsGenerating(false);
      } else {
        setGenerateError(result.error || ERROR_MESSAGES.DEFAULT);
        setIsGenerating(false);
      }
    },
    [callMatchingAPI, router, scrollToCard]
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

    // 로딩 중 - AI 분석 화면
    if (isGenerating) {
      return <AIMatchingLoader onCancel={handleCancelMatching} />;
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

/** AI 매칭 로딩 화면 */
function AIMatchingLoader({ onCancel }: { onCancel: () => void }) {
  return (
    <div className="py-12 px-4">
      <div className="max-w-sm mx-auto text-center">
        {/* AI 아이콘 애니메이션 */}
        <div className="relative w-20 h-20 mx-auto mb-6">
          {/* 외부 원 - 회전 */}
          <div className="absolute inset-0 rounded-full border-2 border-purple-200 border-t-purple-500 animate-spin" />
          {/* 내부 원 - 펄스 */}
          <div className="absolute inset-2 rounded-full bg-gradient-to-br from-purple-100 to-purple-50 flex items-center justify-center">
            <Sparkles className="h-8 w-8 text-purple-500 animate-pulse" />
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
          <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '300ms' }} />
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
// 추천 결과 (3열 그리드 + 선택 기능)
// ============================================================================

interface RecommendationResultsProps {
  recommendations: ValidRecommendation[];
  projectId: string;
  isGenerating: boolean;
  generateError: string | null;
  onDismissError: () => void;
  onRecalculate: () => void;
  hasAssignedConsultant: boolean;
}

function RecommendationResults({
  recommendations,
  projectId,
  isGenerating,
  generateError,
  onDismissError,
  onRecalculate,
  hasAssignedConsultant,
}: RecommendationResultsProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleAssign = async () => {
    if (!selectedId || reason.length < 10) return;

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('projectId', projectId);
      formData.append('consultantId', selectedId);
      formData.append('reason', reason);

      const { assignConsultant } = await import('@/app/(dashboard)/ops/projects/actions');
      const result = await assignConsultant(formData);

      if (result.success) {
        router.refresh();
      } else {
        alert(result.error || '배정에 실패했습니다.');
      }
    } catch {
      alert('배정에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      {generateError && <AlertMessage message={generateError} onDismiss={onDismissError} />}

      {/* 3열 그리드 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        {recommendations.map((rec) => (
          <SelectableCard
            key={rec.id}
            recommendation={rec}
            isSelected={selectedId === rec.candidate_user_id}
            onSelect={() => setSelectedId(rec.candidate_user_id)}
          />
        ))}
      </div>

      {/* 배정 사유 입력 (선택 시 표시) */}
      {selectedId && (
        <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-4 mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            배정 사유 <span className="text-gray-400 font-normal">(10자 이상)</span>
          </label>
          <div className="relative">
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="해당 컨설턴트를 배정하는 사유를 입력해주세요."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              rows={2}
            />
            <div className="absolute right-2 bottom-2">
              <span className={cn('text-xs', reason.length >= 10 ? 'text-gray-400' : 'text-orange-500')}>
                {reason.length}/500{reason.length < 10 && ` (${10 - reason.length}자 더)`}
              </span>
            </div>
          </div>
          <div className="flex justify-end mt-3">
            <button
              onClick={handleAssign}
              disabled={isSubmitting || reason.length < 10}
              className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg transition-all duration-200 hover:bg-blue-600 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-200 active:translate-y-0 active:shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
            >
              {isSubmitting ? '배정 중...' : '배정하기'}
            </button>
          </div>
        </div>
      )}

      {/* 재계산 버튼 */}
      <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
        <button
          onClick={onRecalculate}
          disabled={isGenerating}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', isGenerating && 'animate-spin')} />
          매칭 재계산
        </button>
        {hasAssignedConsultant && (
          <span className="text-xs text-gray-400">현재 배정은 변경되지 않습니다</span>
        )}
      </div>
    </div>
  );
}

/** 선택 가능한 컨설턴트 카드 (LLM 매칭용) */
function SelectableCard({ recommendation, isSelected, onSelect }: SelectableCardProps) {
  // LLM은 이미 0-100 점수를 반환하므로 직접 사용 (정수로 반올림)
  const score = Math.round(Math.max(0, Math.min(100, recommendation.total_score)));
  const isTopRank = recommendation.rank === 1;
  const parsedRationale = recommendation.rationale ? parseRationale(recommendation.rationale) : null;
  const scoreColor = getScoreColorClass(score);
  const gaugeColor = getScoreGaugeColor(score);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full h-full text-left p-4 rounded-xl border-2 transition-all duration-200 ease-out',
        'flex flex-col',
        'hover:-translate-y-0.5 hover:shadow-lg',
        'active:translate-y-0 active:shadow-md active:scale-[0.99]',
        isSelected && 'border-blue-500 shadow-lg shadow-blue-100/50 hover:border-blue-500 bg-white',
        !isSelected && isTopRank && 'border-emerald-300 bg-emerald-50/30 hover:border-emerald-400',
        !isSelected && !isTopRank && 'border-gray-200 bg-white hover:border-gray-300'
      )}
    >
      {/* 헤더: 순위 + 이름 + 추천 뱃지 + 점수 */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span
            className={cn(
              'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
              isSelected ? 'bg-blue-500 text-white' : isTopRank ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-600'
            )}
          >
            {recommendation.rank}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-gray-900 truncate">{recommendation.candidate.name}</span>
              {isTopRank && (
                <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-medium whitespace-nowrap">
                  AI 추천
                </span>
              )}
            </div>
            <span className="text-xs text-gray-500 truncate block">{recommendation.candidate.email}</span>
          </div>
        </div>
        {/* 점수 표시 (원형 게이지) */}
        <div className="shrink-0 flex flex-col items-center">
          <div
            className="relative w-12 h-12 rounded-full flex items-center justify-center"
            style={{ background: `conic-gradient(${gaugeColor} ${score * 3.6}deg, #f3f4f6 0deg)` }}
          >
            <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center">
              <span className={cn('text-base font-bold', scoreColor)}>{score}</span>
            </div>
          </div>
          <span className="text-[10px] text-gray-400 mt-0.5">점</span>
        </div>
      </div>

      {/* AI 분석 텍스트 */}
      {parsedRationale?.analysis && (
        <p className="text-sm text-gray-700 leading-relaxed mb-3">
          {parsedRationale.analysis}
        </p>
      )}

      {/* 강점 / 고려사항 */}
      <div className="space-y-3 mb-4">
        {parsedRationale?.strengths && parsedRationale.strengths.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {parsedRationale.strengths.map((strength, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-emerald-50 text-emerald-700 rounded-full"
              >
                <span className="text-emerald-500">✓</span>
                {strength}
              </span>
            ))}
          </div>
        )}
        {parsedRationale?.notes && parsedRationale.notes.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {parsedRationale.notes.map((note, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-orange-50 text-orange-700 rounded-full"
              >
                <span className="text-orange-400">!</span>
                {note}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 선택 인디케이터 - mt-auto로 항상 하단 고정 */}
      <div
        className={cn(
          'mt-auto pt-3 border-t text-center text-xs font-medium transition-all',
          isSelected ? 'text-blue-600 border-blue-100 bg-blue-50/50 -mx-4 -mb-4 px-4 pb-3 rounded-b-xl' : 'text-gray-400 border-gray-100'
        )}
      >
        {isSelected ? '✓ 선택됨' : '이 컨설턴트 선택하기'}
      </div>
    </button>
  );
}
