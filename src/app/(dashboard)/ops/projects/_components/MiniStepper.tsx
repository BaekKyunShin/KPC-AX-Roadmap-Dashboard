'use client';

import type { ProjectStatus } from '@/types/database';
import {
  PROJECT_WORKFLOW_STEPS,
  PROJECT_STALL_THRESHOLDS,
  getWorkflowStepIndex,
  getWorkflowStepLabel,
} from '@/lib/constants/status';
import { cn } from '@/lib/utils';
import { AlertTriangle } from 'lucide-react';

interface MiniStepperProps {
  status: ProjectStatus;
  daysInCurrentStatus?: number;
  showLabel?: boolean;
  showDays?: boolean;
}

export default function MiniStepper({
  status,
  daysInCurrentStatus = 0,
  showLabel = true,
  showDays = true,
}: MiniStepperProps) {
  const currentIndex = getWorkflowStepIndex(status);
  const isFinalized = status === 'FINALIZED';
  const isStalled = daysInCurrentStatus >= PROJECT_STALL_THRESHOLDS.WARNING && !isFinalized;
  const isSeverelyStalled = daysInCurrentStatus >= PROJECT_STALL_THRESHOLDS.SEVERE && !isFinalized;

  return (
    <div className="flex flex-col gap-1 items-center">
      {/* 스텝퍼 시각화 */}
      <div className="flex items-center gap-0.5">
        {PROJECT_WORKFLOW_STEPS.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isLast = index === PROJECT_WORKFLOW_STEPS.length - 1;

          return (
            <div key={step.key} className="flex items-center">
              {/* 원형 단계 표시 */}
              <div
                className={cn(
                  'h-2.5 w-2.5 rounded-full transition-colors',
                  isCompleted && 'bg-emerald-500',
                  isCurrent && !isCompleted && 'bg-blue-500',
                  !isCompleted && !isCurrent && 'bg-gray-200'
                )}
                title={step.label}
              />
              {/* 연결선 */}
              {!isLast && (
                <div
                  className={cn(
                    'h-0.5 w-2',
                    index < currentIndex ? 'bg-emerald-500' : 'bg-gray-200'
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* 상태 라벨 및 경과일 */}
      {(showLabel || showDays) && (
        <div className="flex items-center gap-1.5 text-xs whitespace-nowrap">
          {showLabel && (
            <span className="text-muted-foreground">
              {getWorkflowStepLabel(status)}
            </span>
          )}
          {showDays && !isFinalized && daysInCurrentStatus > 0 && (
            <span
              className={cn(
                'flex items-center gap-0.5',
                isSeverelyStalled && 'text-red-600 font-medium',
                isStalled && !isSeverelyStalled && 'text-amber-600',
                !isStalled && 'text-muted-foreground'
              )}
            >
              {isStalled && <AlertTriangle className="h-3 w-3" />}
              ({daysInCurrentStatus}일 경과)
            </span>
          )}
          {isFinalized && showDays && (
            <span className="text-emerald-600 font-medium">(완료)</span>
          )}
        </div>
      )}
    </div>
  );
}
