'use client';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { GuideNote } from '@/components/ui/guide-note';
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
            Ⅱ-4. 훈련대상 과업(Task)·워크플로우 선정
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            AI도입·활용 필요도가 높은 과업 중 실제 훈련대상으로 선정할
            과업과 선정사유, 기대효과(As-Is → To-Be)를 기록하세요.
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
              <FormField label="훈련대상 과업" htmlFor={`tt-name-${item.id}`} required>
                <Input
                  id={`tt-name-${item.id}`}
                  value={item.task_name}
                  onChange={(e) => updateItem(index, 'task_name', e.target.value)}
                  placeholder="예) 외관 검사 AI 자동화"
                />
              </FormField>
              <FormField label="선정사유" htmlFor={`tt-reason-${item.id}`} required>
                <Textarea
                  id={`tt-reason-${item.id}`}
                  rows={5}
                  value={item.selection_reason}
                  onChange={(e) => updateItem(index, 'selection_reason', e.target.value)}
                  placeholder="예) AI도입·활용 필요도 5점. 데이터 2년치 확보. 경영진 최우선 과제"
                  className="break-keep"
                />
              </FormField>
              <fieldset className="rounded-md border border-border/70 p-3 bg-background/60">
                <legend className="px-1 text-sm font-medium text-foreground">
                  기대효과 <span className="text-destructive">*</span>
                </legend>
                <p className="text-xs text-muted-foreground mb-3">
                  해당 과업의 현행 수행방식(As-Is)과 AI를 도입·활용하기 위한 훈련실시 후 개선(To-Be)되는 사항을 기록합니다.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField label="현행 (As-Is)" htmlFor={`tt-asis-${item.id}`} required>
                    <Textarea
                      id={`tt-asis-${item.id}`}
                      rows={6}
                      value={item.as_is}
                      onChange={(e) => updateItem(index, 'as_is', e.target.value)}
                      placeholder="예) 검사원 2명 육안 검사 / 평균 12초"
                      className="break-keep"
                    />
                  </FormField>
                  <FormField label="개선 (To-Be)" htmlFor={`tt-tobe-${item.id}`} required>
                    <Textarea
                      id={`tt-tobe-${item.id}`}
                      rows={6}
                      value={item.to_be}
                      onChange={(e) => updateItem(index, 'to_be', e.target.value)}
                      placeholder="예) 비전 AI 1차 스크리닝 + 검사원 최종 판정 / 평균 3초"
                      className="break-keep"
                    />
                  </FormField>
                </div>
              </fieldset>
            </div>
          </div>
        ))}
      </div>

      <GuideNote
        items={[
          '위의 분석표에서 제시한 과업 중 AI훈련로드맵을 수립하기 위한 훈련대상 과업 선정 및 선정사유 작성',
          '해당 과업의 현행 수행방식(As-Is)과 AI를 도입·활용하기 위한 훈련실시 후 개선(To-Be)되는 사항을 기대효과 항목으로 제시',
        ]}
      />
    </div>
  );
}
