'use client';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import {
  createEmptyTrainingTarget,
  type TrainingTarget,
} from '@/lib/schemas/interview-roadmap';

interface StepTrainingTargetsProps {
  items: TrainingTarget[];
  onChange: (next: TrainingTarget[]) => void;
}

export default function StepTrainingTargets({ items, onChange }: StepTrainingTargetsProps) {
  const updateItem = <K extends keyof TrainingTarget>(
    index: number,
    key: K,
    value: TrainingTarget[K],
  ) => {
    const next = items.map((item, i) => (i === index ? { ...item, [key]: value } : item));
    onChange(next);
  };

  const addItem = () => {
    onChange([...items, createEmptyTrainingTarget()]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            훈련대상 과업(Task)·워크플로우 선정
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            산업인력공단 AI 훈련로드맵 양식 Ⅱ-4. AI도입·활용 필요도가 높은 과업 중 실제 훈련대상으로 선정할
            과업과 선정사유, 기대효과(As-Is → To-Be)를 기록해주세요.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addItem}>
          <Plus className="w-4 h-4 mr-1" />
          훈련대상 추가
        </Button>
      </div>

      <div className="space-y-4">
        {items.map((item, index) => (
          <div key={item.id} className="border border-border rounded-lg p-4 bg-muted/30">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-foreground flex items-center">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center mr-2">
                  {index + 1}
                </span>
                훈련대상 {index + 1}
              </h3>
              {items.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`행 삭제: 훈련대상 ${index + 1}`}
                  onClick={() => removeItem(index)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  삭제
                </Button>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor={`tt-name-${item.id}`}>
                  훈련대상 과업 <span className="text-destructive">*</span>
                </Label>
                <Input
                  id={`tt-name-${item.id}`}
                  value={item.task_name}
                  onChange={(e) => updateItem(index, 'task_name', e.target.value)}
                  placeholder="예) 외관 검사 AI 자동화"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor={`tt-reason-${item.id}`}>
                  선정사유 <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id={`tt-reason-${item.id}`}
                  rows={2}
                  value={item.selection_reason}
                  onChange={(e) => updateItem(index, 'selection_reason', e.target.value)}
                  placeholder="예) AI도입·활용 필요도 5점. 데이터 2년치 확보. 경영진 최우선 과제"
                  className="mt-1 break-keep"
                />
              </div>
              <fieldset className="rounded-md border border-border/70 p-3 bg-background/60">
                <legend className="px-1 text-sm font-medium text-foreground">
                  기대효과 <span className="text-destructive">*</span>
                </legend>
                <p className="text-xs text-muted-foreground mb-3">
                  현행(As-Is) 수행 방식과 AI 도입·활용 훈련 실시 후 개선(To-Be)되는 사항을 기록합니다.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor={`tt-asis-${item.id}`}>
                      현행 (As-Is) <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      id={`tt-asis-${item.id}`}
                      rows={3}
                      value={item.as_is}
                      onChange={(e) => updateItem(index, 'as_is', e.target.value)}
                      placeholder="예) 검사원 2명 육안 검사 / 평균 12초"
                      className="mt-1 break-keep"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`tt-tobe-${item.id}`}>
                      개선 (To-Be) <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      id={`tt-tobe-${item.id}`}
                      rows={3}
                      value={item.to_be}
                      onChange={(e) => updateItem(index, 'to_be', e.target.value)}
                      placeholder="예) 비전 AI 1차 스크리닝 + 검사원 최종 판정 / 평균 3초"
                      className="mt-1 break-keep"
                    />
                  </div>
                </div>
              </fieldset>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
