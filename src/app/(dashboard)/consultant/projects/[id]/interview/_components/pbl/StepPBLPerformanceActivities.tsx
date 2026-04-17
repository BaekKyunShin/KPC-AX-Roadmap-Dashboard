'use client';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import {
  createEmptyPerformanceActivity,
  type PBLPerformanceActivities,
  type OperationMode,
} from '@/lib/schemas/interview-pbl';

interface StepPBLPerformanceActivitiesProps {
  value: PBLPerformanceActivities;
  onChange: (next: PBLPerformanceActivities) => void;
}

type PerformanceActivityItem =
  PBLPerformanceActivities['performance_activities'][number];

const OPERATION_MODE_OPTIONS: OperationMode[] = ['대면', '비대면'];

const PARTICIPANT_LABELS: Record<
  keyof PerformanceActivityItem['participants'],
  string
> = {
  pm: '컨설팅책임자(PM)',
  external_expert: '외부전문가(직무·HRD)',
  internal_expert: '기업내부전문가',
  jurisdiction_manager: '능력개발전담주치의',
};

export default function StepPBLPerformanceActivities({
  value,
  onChange,
}: StepPBLPerformanceActivitiesProps) {
  const activities = value.performance_activities;

  const updateActivity = <K extends keyof PerformanceActivityItem>(
    index: number,
    key: K,
    next: PerformanceActivityItem[K],
  ) => {
    const nextList = activities.map((item, i) =>
      i === index ? { ...item, [key]: next } : item,
    );
    onChange({ performance_activities: nextList });
  };

  const updateParticipant = (
    index: number,
    key: keyof PerformanceActivityItem['participants'],
    next: string,
  ) => {
    const nextList = activities.map((item, i) =>
      i === index
        ? { ...item, participants: { ...item.participants, [key]: next } }
        : item,
    );
    onChange({ performance_activities: nextList });
  };

  const addActivity = () => {
    const nextRound =
      activities.length > 0
        ? Math.max(...activities.map((a) => a.round || 0)) + 1
        : 1;
    const newActivity = {
      ...createEmptyPerformanceActivity(),
      round: nextRound,
    };
    onChange({
      performance_activities: [...activities, newActivity],
    });
  };

  const removeActivity = (index: number) => {
    if (activities.length <= 1) return;
    onChange({
      performance_activities: activities.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Ⅲ-1. 훈련과제 도출 수행활동
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            산인공 양식 Ⅲ-1. 훈련과제 도출을 위해 수행한 회의·워크숍·토론 등
            차수별 활동 내용과 참석자를 기록하세요.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addActivity}>
          <Plus className="w-4 h-4 mr-1" />
          차수 추가
        </Button>
      </div>

      {activities.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          아직 등록된 수행활동이 없습니다. 차수를 추가하여 수행활동을 입력하세요.
        </p>
      ) : (
        <div className="space-y-4">
          {activities.map((activity, index) => (
            <div
              key={activity.id}
              className="border border-border rounded-lg p-4 bg-muted/30"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-foreground flex items-center">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center mr-2">
                    {index + 1}
                  </span>
                  차수 {index + 1}
                </h3>
                {activities.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={`차수 ${index + 1} 삭제`}
                    onClick={() => removeActivity(index)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    삭제
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor={`pa-round-${activity.id}`}>
                    수행 차수 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id={`pa-round-${activity.id}`}
                    type="number"
                    min={1}
                    value={activity.round || ''}
                    onChange={(e) =>
                      updateActivity(index, 'round', Number(e.target.value) || 0)
                    }
                    placeholder="예: 1"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor={`pa-date-${activity.id}`}>
                    수행 일자 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id={`pa-date-${activity.id}`}
                    type="date"
                    value={activity.date}
                    onChange={(e) =>
                      updateActivity(index, 'date', e.target.value)
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor={`pa-method-${activity.id}`}>
                    수행 방법 <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id={`pa-method-${activity.id}`}
                    value={activity.method}
                    onChange={(e) =>
                      updateActivity(index, 'method', e.target.value)
                    }
                    placeholder="예: 회의 / 워크숍 / 토론 / 기타"
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="mt-4">
                <Label htmlFor={`pa-content-${activity.id}`}>
                  수행 내용 <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id={`pa-content-${activity.id}`}
                  rows={3}
                  value={activity.content}
                  onChange={(e) =>
                    updateActivity(index, 'content', e.target.value)
                  }
                  placeholder="예) 훈련과제 후보 브레인스토밍 및 우선순위 토의"
                  className="mt-1 break-keep"
                />
              </div>

              <div className="mt-4">
                <fieldset>
                  <legend className="text-sm font-medium text-foreground mb-2">
                    운영 방식 <span className="text-destructive">*</span>
                  </legend>
                  <div
                    role="radiogroup"
                    aria-label="운영 방식"
                    className="flex flex-wrap gap-2"
                  >
                    {OPERATION_MODE_OPTIONS.map((mode) => {
                      const checked = activity.operation_mode === mode;
                      const radioId = `pa-mode-${activity.id}-${mode}`;
                      return (
                        <label
                          key={mode}
                          htmlFor={radioId}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm cursor-pointer transition-colors ${
                            checked
                              ? 'border-primary bg-primary/10 text-primary font-medium'
                              : 'border-border hover:bg-muted'
                          }`}
                        >
                          <input
                            id={radioId}
                            type="radio"
                            role="radio"
                            name={`pa-mode-${activity.id}`}
                            value={mode}
                            checked={checked}
                            onChange={() =>
                              updateActivity(index, 'operation_mode', mode)
                            }
                            className="sr-only"
                            aria-label={mode}
                          />
                          <span>{mode}</span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              </div>

              <div className="mt-4">
                <h4 className="text-sm font-medium text-foreground mb-2">
                  참석자
                </h4>
                <p className="text-xs text-muted-foreground mb-3">
                  양식 Ⅲ-1 참석자 4역할. 각 역할별 인원 수 또는 성명을 입력하세요.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(
                    Object.keys(PARTICIPANT_LABELS) as Array<
                      keyof PerformanceActivityItem['participants']
                    >
                  ).map((role) => (
                    <div key={role}>
                      <Label htmlFor={`pa-part-${activity.id}-${role}`}>
                        {PARTICIPANT_LABELS[role]}
                      </Label>
                      <Input
                        id={`pa-part-${activity.id}-${role}`}
                        value={activity.participants[role]}
                        onChange={(e) =>
                          updateParticipant(index, role, e.target.value)
                        }
                        placeholder="예: 홍길동 외 1명"
                        className="mt-1"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
