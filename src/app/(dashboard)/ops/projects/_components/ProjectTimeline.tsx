'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  fetchProjectTimeline,
  type ProjectTimeline as ProjectTimelineData,
} from '../actions';
import { cn } from '@/lib/utils';
import { Check, MapPin } from 'lucide-react';

// ============================================================================
// 상수 정의
// ============================================================================

/** 프로젝트 워크플로우 단계 수 */
const WORKFLOW_STEP_COUNT = 6;

/** 스켈레톤 색상 */
const SKELETON_COLORS = {
  primary: 'bg-gray-200',
  secondary: 'bg-gray-100',
  border: 'border-gray-100',
} as const;

// ============================================================================
// 타입 정의
// ============================================================================

interface ProjectTimelineProps {
  projectId: string;
}

// ============================================================================
// 하위 컴포넌트
// ============================================================================

/** 타임라인 카드 공통 헤더 */
function TimelineCardHeader() {
  return (
    <CardHeader className="pb-3">
      <CardTitle className="flex items-center gap-2 text-base">
        <MapPin className="h-4 w-4 text-blue-600" />
        진행 타임라인
      </CardTitle>
    </CardHeader>
  );
}

/** 타임라인 스켈레톤 (로딩 상태) */
function TimelineSkeleton() {
  const lastStepIndex = WORKFLOW_STEP_COUNT - 1;

  return (
    <Card>
      <TimelineCardHeader />
      <CardContent>
        {/* 데스크톱: 가로 타임라인 */}
        <div className="hidden md:block animate-pulse">
          <div className="flex">
            {Array.from({ length: WORKFLOW_STEP_COUNT }, (_, i) => (
              <div key={i} className="flex-1 relative">
                {i < lastStepIndex && (
                  <div className={`absolute top-5 left-1/2 w-full h-0.5 ${SKELETON_COLORS.primary} -translate-y-1/2`} />
                )}
                <div className="flex justify-center">
                  <div className={`relative z-10 h-10 w-10 rounded-full ${SKELETON_COLORS.primary} border-2 ${SKELETON_COLORS.border}`} />
                </div>
                <div className="mt-3 flex flex-col items-center">
                  <div className={`h-3 w-16 ${SKELETON_COLORS.primary} rounded`} />
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* 모바일: 세로 타임라인 */}
        <div className="md:hidden animate-pulse">
          <div className="relative pl-8">
            <div className={`absolute left-[15px] top-0 bottom-0 w-0.5 ${SKELETON_COLORS.primary}`} />
            {Array.from({ length: WORKFLOW_STEP_COUNT }, (_, i) => (
              <div key={i} className="relative pb-6 last:pb-0">
                <div className={`absolute left-0 h-8 w-8 rounded-full ${SKELETON_COLORS.primary} border-2 ${SKELETON_COLORS.border}`} />
                <div className="ml-2">
                  <div className={`h-4 w-24 ${SKELETON_COLORS.primary} rounded`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// 메인 컴포넌트
// ============================================================================

export default function ProjectTimeline({ projectId }: ProjectTimelineProps) {
  const [timeline, setTimeline] = useState<ProjectTimelineData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjectTimeline(projectId).then((data) => {
      setTimeline(data);
      setLoading(false);
    });
  }, [projectId]);

  if (loading) {
    return <TimelineSkeleton />;
  }

  if (!timeline) {
    return (
      <Card>
        <TimelineCardHeader />
        <CardContent>
          <p className="text-sm text-muted-foreground text-center">타임라인을 불러올 수 없습니다.</p>
        </CardContent>
      </Card>
    );
  }

  // 다음 해야 할 단계 (isCurrent가 true인 단계)
  const nextStepIndex = timeline.steps.findIndex((s) => s.isCurrent);

  // 마지막으로 완료된 단계 (연결선 표시용)
  // isCurrent가 있으면 그 직전까지, 없으면 (모두 완료) 마지막 단계까지
  const lastCompletedIndex = nextStepIndex >= 0 ? nextStepIndex - 1 : timeline.steps.length - 1;

  return (
    <Card>
      <TimelineCardHeader />
      <CardContent>
        {/* 데스크톱: 가로 타임라인 */}
        <div className="hidden md:block">
          <div className="flex">
            {timeline.steps.map((step, index) => {
              const isCompleted = step.isCompleted;
              const isCurrent = step.isCurrent;
              const isLast = index === timeline.steps.length - 1;
              // 완료된 단계까지의 연결선은 녹색
              const isPast = index <= lastCompletedIndex;

              return (
                <div key={step.step} className="flex-1 relative">
                  {/* 연결선 - 원의 중심 높이에 배치 (마지막 제외) */}
                  {!isLast && (
                    <div
                      className={cn(
                        'absolute top-5 left-1/2 w-full h-0.5 -translate-y-1/2',
                        isPast ? 'bg-emerald-400' : 'bg-gray-200'
                      )}
                    />
                  )}

                  {/* 원형 아이콘 - 항상 중앙 */}
                  <div className="flex justify-center">
                    <div
                      className={cn(
                        'relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 bg-white transition-all',
                        isCompleted && 'border-emerald-500 bg-emerald-500',
                        isCurrent && 'border-blue-500 bg-blue-500 shadow-lg shadow-blue-200',
                        !isCompleted && !isCurrent && 'border-gray-200 bg-white'
                      )}
                    >
                      {isCompleted && <Check className="h-5 w-5 text-white" />}
                      {isCurrent && (
                        <div className="h-2.5 w-2.5 rounded-full bg-white animate-pulse" />
                      )}
                      {!isCompleted && !isCurrent && (
                        <span className="text-sm text-gray-400 font-medium">{index + 1}</span>
                      )}
                    </div>
                  </div>

                  {/* 라벨 - 항상 중앙 */}
                  <div className="mt-3 text-center">
                    <p
                      className={cn(
                        'text-xs font-medium leading-tight',
                        isCompleted && 'text-emerald-700',
                        isCurrent && 'text-blue-700',
                        !isCompleted && !isCurrent && 'text-gray-400'
                      )}
                    >
                      {step.label}
                    </p>
                    {isCurrent && (
                      <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full bg-blue-100 text-[10px] font-semibold text-blue-700">
                        현재 단계
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 모바일: 세로 타임라인 */}
        <div className="md:hidden">
          <div className="relative pl-8">
            {/* 세로 연결선 */}
            <div className="absolute left-[15px] top-0 bottom-0 w-0.5 bg-gray-200" />
            {/* 완료된 단계까지 녹색 연결선 */}
            {lastCompletedIndex >= 0 && (
              <div
                className="absolute left-[15px] top-0 w-0.5 bg-emerald-400 transition-all"
                style={{
                  // 완료된 마지막 단계의 중간까지 녹색 표시
                  height: `${((lastCompletedIndex + 0.5) / timeline.steps.length) * 100}%`,
                }}
              />
            )}

            {timeline.steps.map((step, index) => {
              const isCompleted = step.isCompleted;
              const isCurrent = step.isCurrent;

              return (
                <div key={step.step} className="relative pb-6 last:pb-0">
                  {/* 원형 아이콘 */}
                  <div
                    className={cn(
                      'absolute left-0 flex h-8 w-8 items-center justify-center rounded-full border-2 bg-white',
                      isCompleted && 'border-emerald-500 bg-emerald-500',
                      isCurrent && 'border-blue-500 bg-blue-500',
                      !isCompleted && !isCurrent && 'border-gray-300'
                    )}
                  >
                    {isCompleted && <Check className="h-4 w-4 text-white" />}
                    {isCurrent && <div className="h-2 w-2 rounded-full bg-white animate-pulse" />}
                    {!isCompleted && !isCurrent && (
                      <span className="text-xs text-gray-400">{index + 1}</span>
                    )}
                  </div>

                  {/* 라벨 */}
                  <div className="ml-2">
                    <p
                      className={cn(
                        'text-sm font-medium',
                        isCompleted && 'text-emerald-700',
                        isCurrent && 'text-blue-700',
                        !isCompleted && !isCurrent && 'text-gray-400'
                      )}
                    >
                      {step.label}
                    </p>
                    {isCurrent && (
                      <span className="inline-block mt-0.5 text-xs text-blue-600 font-medium">현재 단계</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
