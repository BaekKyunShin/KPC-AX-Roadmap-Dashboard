'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchProjectTimeline, type ProjectTimeline as ProjectTimelineData } from '../actions';
import { PROJECT_WORKFLOW_STEPS, getWorkflowStepIndex } from '@/lib/constants/status';
import type { ProjectStatus } from '@/types/database';
import { cn } from '@/lib/utils';
import { Clock, CheckCircle2, Circle, MapPin } from 'lucide-react';

interface ProjectTimelineProps {
  projectId: string;
}

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
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            진행 타임라인
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {PROJECT_WORKFLOW_STEPS.map((step) => (
              <div key={step.key} className="flex gap-4">
                <div className="h-6 w-6 rounded-full bg-gray-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-gray-200 rounded" />
                  <div className="h-3 w-24 bg-gray-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!timeline) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            진행 타임라인
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">타임라인을 불러올 수 없습니다.</p>
        </CardContent>
      </Card>
    );
  }

  const currentStepIndex = getWorkflowStepIndex(timeline.currentStatus as ProjectStatus);

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-blue-600" />
          진행 타임라인
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 상단 가로 스텝퍼 */}
        <div className="relative">
          <div className="flex items-center justify-between">
            {PROJECT_WORKFLOW_STEPS.map((step, index) => {
              const isCompleted = index < currentStepIndex;
              const isCurrent = index === currentStepIndex;
              const isFuture = index > currentStepIndex;

              return (
                <div
                  key={step.key}
                  className="flex flex-col items-center"
                  style={{ width: `${100 / PROJECT_WORKFLOW_STEPS.length}%` }}
                >
                  {/* 원형 표시 */}
                  <div
                    className={cn(
                      'relative z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors',
                      isCompleted && 'border-emerald-500 bg-emerald-500 text-white',
                      isCurrent && 'border-blue-500 bg-blue-500 text-white',
                      isFuture && 'border-gray-300 bg-white text-gray-400'
                    )}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : isCurrent ? (
                      <Circle className="h-4 w-4 fill-current" />
                    ) : (
                      <Circle className="h-4 w-4" />
                    )}
                  </div>
                  {/* 라벨 */}
                  <span
                    className={cn(
                      'mt-2 text-xs text-center',
                      isCompleted && 'text-emerald-600 font-medium',
                      isCurrent && 'text-blue-600 font-medium',
                      isFuture && 'text-gray-400'
                    )}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
          {/* 연결선 */}
          <div className="absolute top-4 left-0 right-0 -z-0 mx-auto h-0.5 bg-gray-200" style={{ width: '85%', marginLeft: '7.5%' }}>
            <div
              className="h-full bg-emerald-500 transition-all"
              style={{
                width: `${(currentStepIndex / (PROJECT_WORKFLOW_STEPS.length - 1)) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* 세로 타임라인 상세 */}
        <div className="relative ml-4 border-l-2 border-gray-200 pl-6 pt-4">
          {timeline.steps.map((step) => {
            const isCompleted = step.isCompleted && !step.isCurrent;
            const isCurrent = step.isCurrent;

            return (
              <div key={step.step} className="relative pb-6 last:pb-0">
                {/* 타임라인 포인트 */}
                <div
                  className={cn(
                    'absolute -left-[31px] flex h-5 w-5 items-center justify-center rounded-full border-2 bg-white',
                    isCompleted && 'border-emerald-500 bg-emerald-500',
                    isCurrent && 'border-blue-500 bg-blue-50',
                    !isCompleted && !isCurrent && 'border-gray-300'
                  )}
                >
                  {isCompleted && (
                    <CheckCircle2 className="h-3 w-3 text-white" />
                  )}
                  {isCurrent && (
                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                  )}
                </div>

                {/* 컨텐츠 */}
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h4
                      className={cn(
                        'font-medium',
                        isCompleted && 'text-emerald-700',
                        isCurrent && 'text-blue-700',
                        !isCompleted && !isCurrent && 'text-gray-400'
                      )}
                    >
                      {step.label}
                    </h4>
                    {isCurrent && (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                        현재
                      </span>
                    )}
                  </div>

                  {step.date ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      <span>
                        {new Date(step.date).toLocaleDateString('ko-KR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                        {' '}
                        {new Date(step.date).toLocaleTimeString('ko-KR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">
                      {step.isCompleted ? '-' : '예정'}
                    </p>
                  )}

                  {step.detail && (
                    <p className="text-sm text-muted-foreground">{step.detail}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
